import { test, assertEqual, assertTrue, assertClose } from './runner.js';
import { shouldPlay, createSfx, eventSound } from '../src/audio/sfx.js';
import { SFX, SFX_LIMITS, volumeToGain } from '../src/data/sfx.js';

const limits = { hit: 12 };

test('sfx: shouldPlay lässt den ersten Treffer immer zu', () => {
  assertTrue(shouldPlay('hit', 0, null, limits));
  assertTrue(shouldPlay('hit', 5000, undefined, limits));
});

test('sfx: shouldPlay drosselt hit auf höchstens 12 je Sekunde', () => {
  assertTrue(!shouldPlay('hit', 1050, 1000, limits));
  assertTrue(!shouldPlay('hit', 1000 + 1000 / 12 - 0.5, 1000, limits));
  assertTrue(shouldPlay('hit', 1084, 1000, limits));
  // Wer alle 1 ms anfragt, bekommt in einer Sekunde genau 12 Klänge.
  let last = null, played = 0;
  for (let t = 0; t < 1000; t++) if (shouldPlay('hit', t, last, limits)) { last = t; played++; }
  assertEqual(played, 12);
});

test('sfx: shouldPlay lässt andere bekannte Typen ungedrosselt', () => {
  for (const type of Object.keys(SFX).filter((t) => t !== 'hit')) {
    assertTrue(shouldPlay(type, 1000, 1000, limits), type);
    assertTrue(shouldPlay(type, 1001, 1000, limits), type);
  }
});

test('sfx: shouldPlay spielt unbekannte Typen nie', () => {
  for (const type of ['gibtEsNicht', 'kill', 'dodge', '', 'toString', '__proto__']) {
    assertTrue(!shouldPlay(type, 1000, null, limits), type);
    assertTrue(!shouldPlay(type, 1000, null, { ...limits, [type]: 0 }), type);
  }
});

test('sfx: Daten haben alle Klänge des Spiels, hit, pickup und heroHit sind gedrosselt', () => {
  for (const type of ['hit', 'pickup', 'levelup', 'bossSpawn', 'heroHit', 'dying', 'death', 'victory', 'chest', 'mapChest']) {
    assertTrue(Array.isArray(SFX[type]) && SFX[type].length > 0, type);
  }
  assertEqual(SFX_LIMITS, { hit: 12, pickup: 15, heroHit: 8 });
});

test('sfx: Lautstärke 0 ist stumm, 100 ist am lautesten, dazwischen steigt es', () => {
  assertEqual(volumeToGain(0), 0);
  assertEqual(volumeToGain(-5), 0);
  assertTrue(volumeToGain(50) > 0 && volumeToGain(50) < volumeToGain(100));
  assertClose(volumeToGain(1000), volumeToGain(100));
});

test('sfx: ohne Web Audio sind alle Methoden harmlos', () => {
  const sfx = createSfx({ AudioContextClass: null });
  sfx.setVolume(30);
  sfx.resume();
  sfx.handle([{ type: 'hit' }, { type: 'levelup' }]);
  sfx.play('click');
  assertEqual(sfx.context, null);
  assertEqual(sfx.volume, 30);
});

/** Attrappe eines AudioContext, die zählt, was angelegt wird. */
function fakeAudio() {
  const log = { oscillators: 0, sources: 0, gains: 0 };
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ connect() {}, start() {}, stop() {} });
  class FakeContext {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; log.context = this; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    createGain() { log.gains++; return { ...node(), gain: param() }; }
    createOscillator() { log.oscillators++; return { ...node(), type: '', frequency: param() }; }
    createBufferSource() { log.sources++; return { ...node(), buffer: null }; }
    createBiquadFilter() { return { ...node(), type: '', frequency: param() }; }
    createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; }
  }
  return { FakeContext, log };
}

test('sfx: erst resume() legt den Kontext an, danach plant handle() Knoten für jeden Ereignistyp', async () => {
  const { FakeContext, log } = fakeAudio();
  let t = 0;
  const sfx = createSfx({ AudioContextClass: FakeContext, now: () => (t += 1000) });
  sfx.handle([{ type: 'levelup' }]);
  assertEqual(log.gains, 0);
  assertEqual(sfx.context, null);
  sfx.resume();
  await Promise.resolve();
  for (const type of Object.keys(SFX)) {
    const before = log.gains;
    sfx.handle([{ type }]);
    assertTrue(log.gains > before, type);
  }
  const before = log.gains;
  sfx.handle([{ type: 'kill' }, { type: 'dodge' }]);
  assertEqual(log.gains, before);
});

test('sfx: Lautstärke 0 plant nichts und setzt die Verstärkung auf 0', async () => {
  const { FakeContext, log } = fakeAudio();
  const sfx = createSfx({ AudioContextClass: FakeContext, now: () => 0 });
  sfx.resume();
  await Promise.resolve();
  sfx.setVolume(100);
  assertTrue(sfx.master.gain.value > 0);
  sfx.setVolume(0);
  assertEqual(sfx.master.gain.value, 0);
  const before = log.gains;
  sfx.handle([{ type: 'death' }]);
  assertEqual(log.gains, before);
});

test('sfx: pickup und heroHit sind auf 15 und 8 je Sekunde gedrosselt', () => {
  for (const [type, perSecond] of [['pickup', 15], ['heroHit', 8]]) {
    let last = null, played = 0;
    for (let t = 0; t < 1000; t++) if (shouldPlay(type, t, last)) { last = t; played++; }
    assertEqual(played, perSecond, type);
  }
});

test('sfx: 50 pickup-Ereignisse in einem Aufruf starten höchstens eine Stimmengruppe', async () => {
  const { FakeContext, log } = fakeAudio();
  const sfx = createSfx({ AudioContextClass: FakeContext, now: () => 5000 });
  sfx.resume();
  await Promise.resolve();
  const before = log.oscillators;
  sfx.handle(Array.from({ length: 50 }, () => ({ type: 'pickup' })));
  assertEqual(log.oscillators - before, SFX.pickup.filter((v) => v.kind === 'tone').length);
});

/** Formprüfung einer Stimme wie in data/sfx.js beschrieben. Gibt den ersten Fehler zurück oder null. */
function voiceProblem(v) {
  if (!v || typeof v !== 'object') return 'keine Stimme';
  if (v.kind === 'tone') {
    if (!['sine', 'square', 'triangle', 'sawtooth'].includes(v.wave)) return `wave ${v.wave}`;
  } else if (v.kind === 'noise') {
    if (!['lowpass', 'highpass', 'bandpass'].includes(v.filter)) return `filter ${v.filter}`;
  } else return `kind ${v.kind}`;
  if (!Array.isArray(v.freq) || v.freq.length !== 2 || !v.freq.every((f) => Number.isFinite(f) && f > 0)) return 'freq';
  if (!(Number.isFinite(v.dur) && v.dur > 0 && v.dur <= 2)) return 'dur';
  if (!(Number.isFinite(v.gain) && v.gain > 0 && v.gain <= 1)) return 'gain';
  for (const key of ['delay', 'attack']) {
    if (v[key] !== undefined && !(Number.isFinite(v[key]) && v[key] >= 0)) return key;
  }
  return null;
}

test('sfx: Taverne-Töne vorhanden und wohlgeformt', () => {
  for (const type of ['dice', 'wheelTick', 'card', 'coins', 'loot']) {
    assertTrue(Object.hasOwn(SFX, type) && Array.isArray(SFX[type]) && SFX[type].length > 0, type);
  }
  // Dieselbe Formprüfung für alle Klänge, die neuen wie die vorhandenen.
  for (const [type, voices] of Object.entries(SFX)) {
    for (const v of voices) assertEqual(voiceProblem(v), null, type);
  }
});

test('sfx: Gifttreffer spielt keinen Ton, normaler Treffer schon', () => {
  assertEqual(eventSound({ type: 'heroHit', amount: 1.5, poison: true }), null);
  assertEqual(eventSound({ type: 'heroHit', amount: 6 }), 'heroHit');
  assertEqual(eventSound({ type: 'kill' }), 'kill');
});
