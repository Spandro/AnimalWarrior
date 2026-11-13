// Klangeffekte mit Web Audio: alle Klänge werden aus Oszillatoren und Rauschen erzeugt (Daten in data/sfx.js).
// Den AudioContext legt erst `resume()` an, das beim ersten Klick oder Tastendruck kommt (Browser verlangen eine
// Nutzeraktion). Ohne Web Audio tut jede Methode nichts.
import { SFX, SFX_LIMITS, volumeToGain } from '../data/sfx.js';

/**
 * Darf ein Klang dieses Typs jetzt erklingen? Unbekannte Typen nie; gedrosselte Typen höchstens
 * `limits[type]` mal je Sekunde (Mindestabstand 1000 / Grenze zum letzten Abspielen).
 * @param {string} type Ereignistyp
 * @param {number} nowMs jetzt (ms)
 * @param {number | null | undefined} lastPlayedMs wann dieser Typ zuletzt erklang (ms), sonst null
 * @param {Record<string, number>} [limits] Höchstzahl je Sekunde je Typ
 * @returns {boolean}
 */
/**
 * Klang zu einem Spielereignis (Kennung in SFX) oder null für keinen.
 * @param {{ type: string, poison?: boolean }} e
 * @returns {string|null}
 */
export function eventSound(e) {
  return e.type === 'heroHit' && e.poison ? null : e.type;
}

export function shouldPlay(type, nowMs, lastPlayedMs, limits = SFX_LIMITS) {
  if (!Object.hasOwn(SFX, type)) return false;
  const perSecond = Object.hasOwn(limits, type) ? limits[type] : 0;
  if (!(perSecond > 0) || lastPlayedMs === null || lastPlayedMs === undefined) return true;
  return nowMs - lastPlayedMs >= 1000 / perSecond;
}

const NOISE_SECONDS = 1.5;
const SILENT = 0.0001;

/**
 * @param {{ AudioContextClass?: typeof AudioContext, now?: () => number }} [options] für Tests austauschbar
 * @returns {{ setVolume(volume: number): void, handle(events: { type: string }[]): void, play(type: string): void,
 *   resume(): void, readonly volume: number, readonly context: AudioContext | null, readonly master: GainNode | null }}
 *   `context` und `master` sind nur zur Diagnose da (null, bis `resume()` lief oder wenn Web Audio fehlt).
 */
export function createSfx({ AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext, now = () => performance.now() } = {}) {
  /** @type {AudioContext | null} */
  let ctx = null;
  /** @type {GainNode | null} */
  let master = null;
  /** @type {AudioBuffer | null} */
  let noise = null;
  let volume = 70;
  let failed = !AudioContextClass;
  /** @type {Record<string, number>} */
  const lastPlayed = {};

  function ensureContext() {
    if (ctx || failed) return;
    try {
      ctx = new AudioContextClass();
      master = ctx.createGain();
      master.gain.value = volumeToGain(volume);
      master.connect(ctx.destination);
      noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * NOISE_SECONDS), ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    } catch (e) {
      failed = true;
      ctx = master = noise = null;
    }
  }

  /** Hüllkurve: kurzer Anstieg, dann abklingend bis zur Stille. */
  function envelope(param, start, dur, peak, attack) {
    const a = Math.min(attack ?? 0.005, dur / 2);
    param.setValueAtTime(SILENT, start);
    param.exponentialRampToValueAtTime(Math.max(peak, SILENT), start + a);
    param.exponentialRampToValueAtTime(SILENT, start + dur);
  }

  function voice(v, t0) {
    const start = t0 + (v.delay ?? 0);
    const gain = ctx.createGain();
    envelope(gain.gain, start, v.dur, v.gain, v.attack);
    gain.connect(master);
    let source;
    if (v.kind === 'tone') {
      source = ctx.createOscillator();
      source.type = v.wave;
      source.frequency.setValueAtTime(v.freq[0], start);
      if (v.freq[1] !== v.freq[0]) source.frequency.exponentialRampToValueAtTime(v.freq[1], start + v.dur);
      source.connect(gain);
    } else {
      source = ctx.createBufferSource();
      source.buffer = noise;
      const filter = ctx.createBiquadFilter();
      filter.type = v.filter;
      filter.frequency.setValueAtTime(v.freq[0], start);
      if (v.freq[1] !== v.freq[0]) filter.frequency.exponentialRampToValueAtTime(v.freq[1], start + v.dur);
      source.connect(filter);
      filter.connect(gain);
    }
    source.start(start);
    source.stop(start + v.dur + 0.03);
  }

  function play(type) {
    if (!ctx || !master || ctx.state !== 'running' || volume <= 0) return;
    const t = now();
    if (!shouldPlay(type, t, lastPlayed[type])) return;
    lastPlayed[type] = t;
    try {
      const t0 = ctx.currentTime + 0.005;
      for (const v of SFX[type]) voice(v, t0);
    } catch (e) {
      // Ein Klang darf das Spiel nie stören.
    }
  }

  return {
    setVolume(v) {
      volume = Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
      if (master) master.gain.value = volumeToGain(volume);
    },
    handle(events) {
      if (!ctx) return;
      for (const e of events) {
        const type = eventSound(e);
        if (type) play(type);
      }
    },
    play,
    resume() {
      ensureContext();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    get volume() { return volume; },
    get context() { return ctx; },
    get master() { return master; },
  };
}
