/**
 * Klänge als Daten: Ereignistyp → Stimmen, die zusammen erklingen. Alles wird mit Oszillatoren und
 * Rauschen erzeugt, es gibt keine Audiodateien.
 *
 * @typedef {{ kind: 'tone', wave: 'sine'|'square'|'triangle'|'sawtooth', freq: [number, number], dur: number, gain: number,
 *   delay?: number, attack?: number }} ToneVoice
 *   Ton: Frequenz gleitet von freq[0] nach freq[1] (Hz), Dauer dur (s), Lautstärke gain (0…1), Beginn nach delay (s).
 * @typedef {{ kind: 'noise', filter: 'lowpass'|'highpass'|'bandpass', freq: [number, number], dur: number, gain: number,
 *   delay?: number, attack?: number }} NoiseVoice
 *   Rauschen durch einen Filter, dessen Grenzfrequenz von freq[0] nach freq[1] gleitet.
 * @typedef {ToneVoice | NoiseVoice} Voice
 */

/** Gesamtlautstärke bei Regler 100 (Faktor auf die Stimmen). */
export const MASTER_GAIN = 0.5;

/** Lautstärke-Regler (0…100) → Verstärkung. Quadratisch, damit die Mitte des Reglers deutlich leiser ist; 0 ist stumm. */
export function volumeToGain(volume) {
  const v = Math.max(0, Math.min(100, Math.round(Number(volume) || 0))) / 100;
  return v * v * MASTER_GAIN;
}

/**
 * Höchstzahl je Sekunde für Typen, die in Massen auftreten. Typen ohne Eintrag sind nicht gedrosselt.
 * @type {Record<string, number>}
 */
export const SFX_LIMITS = { hit: 12, pickup: 15, heroHit: 8 };

/** Tonfolge als Stimmen: je Note ein Ton, `step` Sekunden Abstand. */
const arpeggio = (wave, notes, step, dur, gain) =>
  notes.map((f, i) => ({ kind: 'tone', wave, freq: [f, f], dur, gain, delay: i * step }));

/**
 * Klang je Ereignistyp (`run.events`); `click` ist für Menüknöpfe, `achievement` für freigeschaltete Erfolge (kein Ereignis, wird direkt gespielt).
 * @type {Record<string, Voice[]>}
 */
export const SFX = {
  hit: [
    { kind: 'noise', filter: 'bandpass', freq: [1800, 700], dur: 0.06, gain: 0.35 },
    { kind: 'tone', wave: 'square', freq: [260, 120], dur: 0.06, gain: 0.12 },
  ],
  pickup: [
    { kind: 'tone', wave: 'sine', freq: [880, 1320], dur: 0.09, gain: 0.22 },
  ],
  levelup: arpeggio('triangle', [523, 659, 784, 1047], 0.09, 0.22, 0.3),
  bossSpawn: [
    { kind: 'tone', wave: 'sawtooth', freq: [90, 45], dur: 1.2, gain: 0.4, attack: 0.05 },
    { kind: 'noise', filter: 'lowpass', freq: [400, 80], dur: 1.0, gain: 0.5, attack: 0.1 },
  ],
  heroHit: [
    { kind: 'tone', wave: 'sawtooth', freq: [170, 70], dur: 0.2, gain: 0.35 },
    { kind: 'noise', filter: 'lowpass', freq: [1500, 300], dur: 0.15, gain: 0.4 },
  ],
  death: [
    { kind: 'tone', wave: 'sawtooth', freq: [420, 50], dur: 1.3, gain: 0.35, attack: 0.02 },
    { kind: 'tone', wave: 'square', freq: [210, 40], dur: 1.3, gain: 0.15, attack: 0.02 },
  ],
  victory: [
    ...arpeggio('triangle', [523, 659, 784, 1047, 784, 1047, 1319], 0.14, 0.4, 0.3),
    ...arpeggio('sine', [262, 330, 392, 523], 0.28, 0.6, 0.2),
  ],
  chest: [
    ...arpeggio('sine', [1175, 1568, 2093], 0.07, 0.25, 0.22),
    { kind: 'noise', filter: 'highpass', freq: [6000, 3000], dur: 0.3, gain: 0.12 },
  ],
  // Dein Schatten: tiefes, schwebendes Rauschen beim Erscheinen, ein abfallendes Wimmern bei der Flucht,
  // ein leises Verwehen beim Auflösen.
  shadowAppear: [
    { kind: 'tone', wave: 'triangle', freq: [110, 220], dur: 0.9, gain: 0.28, attack: 0.25 },
    { kind: 'tone', wave: 'sine', freq: [116, 233], dur: 0.9, gain: 0.2, attack: 0.25 },
    { kind: 'noise', filter: 'bandpass', freq: [300, 1200], dur: 0.8, gain: 0.25, attack: 0.2 },
  ],
  shadowFlee: [
    { kind: 'tone', wave: 'square', freq: [660, 180], dur: 0.45, gain: 0.12 },
    { kind: 'noise', filter: 'highpass', freq: [2500, 600], dur: 0.35, gain: 0.15 },
  ],
  shadowVanish: [
    { kind: 'noise', filter: 'bandpass', freq: [1400, 250], dur: 0.7, gain: 0.22, attack: 0.05 },
    { kind: 'tone', wave: 'sine', freq: [330, 110], dur: 0.7, gain: 0.12, attack: 0.05 },
  ],
  // Erfolg freigeschaltet: kleine helle Fanfare, nicht so lang wie der Sieg.
  achievement: [
    ...arpeggio('triangle', [784, 988, 1175, 1568], 0.08, 0.3, 0.26),
    { kind: 'noise', filter: 'highpass', freq: [7000, 4000], dur: 0.25, gain: 0.08, delay: 0.24 },
  ],
  click: [
    { kind: 'tone', wave: 'triangle', freq: [660, 440], dur: 0.05, gain: 0.18 },
  ],
};
