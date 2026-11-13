// Gemalte Figuren: wo sie in den Bildbögen liegen, wie groß sie in der Welt sind und wie sie sich bewegen.

/**
 * @typedef {'hop'|'waddle'|'scurry'|'trot'|'fly'|'hopSlow'|'lope'|'lumber'} MotionId
 * @typedef {{ sheet: 'helden'|'gegner', x: number, y: number, w: number, h: number, heightM: number, motion: MotionId,
 *   footOffset: number }} SpriteDef
 *   Pixelrechteck der Figur im Bogen (x, y von links oben; enge Umrandung plus 6 px Rand), Höhe in Weltmetern,
 *   footOffset: Höhe des Standpunkts (Mitte der Fußsohlen in der Schrägansicht) über der Bildunterkante in Metern
 *   (bei heightM); dieser Punkt steht auf der Bodenposition, über Bodenschatten und Heldenring.
 * @typedef {{ freq: number, bob: number, tilt: number, squash: number, tiltRate?: number }} MotionDef
 *   freq Schrittzyklen je Sekunde, bob Hubhöhe (m), tilt Neigung (rad), squash Stauchung (Anteil),
 *   tiltRate Neigungsfrequenz relativ zu freq.
 */

/** Bildbögen, relativ zu index.html. */
export const SHEETS = { helden: 'assets/figuren/helden.webp', gegner: 'assets/figuren/gegner.webp' };

/**
 * Hintergrundentfernung: Farbabstand zu Weiß (RGB, 0…441), unter `threshold` gilt als Hintergrund,
 * bis `threshold + feather` als weicher Rand; `featherRings` Pixel tief; freistehende Flecken unter
 * `minSpeck` Pixeln fallen weg; `bleed` Pixel Farbauffüllung um die Figur für saubere Mipmaps.
 */
export const BACKGROUND = { threshold: 28, feather: 60, featherRings: 2, minSpeck: 40, bleed: 8 };

/**
 * Darstellung der Bildtafeln in der Welt: Neigung nach hinten zur Kamera (Grad), Alpha-Schwelle,
 * Helligkeitsfaktor (die Figuren sind unbeleuchtet), Bodenschatten (Deckkraft, Breite und Tiefe relativ
 * zur Bildbreite), Kippschwelle der Blickrichtung des Helden.
 */
export const BILLBOARD = {
  tiltDeg: 35,
  alphaTest: 0.4,
  shade: 0.92,
  shadowOpacity: 0.32,
  shadowWidth: 0.42,
  shadowDepth: 0.2,
  flipHysteresis: 0.2,
};

const HERO_HEIGHT = 1.6;

/** @type {Record<string, SpriteDef>} Schlüssel `<tier>-<klasse>` */
export const HERO_SPRITES = {
  'hase-krieger': { sheet: 'helden', x: 113, y: 8, w: 279, h: 411, heightM: HERO_HEIGHT, motion: 'hop', footOffset: 0.08 },
  'hase-magier': { sheet: 'helden', x: 493, y: 8, w: 272, h: 410, heightM: HERO_HEIGHT, motion: 'hop', footOffset: 0.08 },
  'hase-dieb': { sheet: 'helden', x: 908, y: 12, w: 258, h: 408, heightM: HERO_HEIGHT, motion: 'hop', footOffset: 0.08 },
  'ente-krieger': { sheet: 'helden', x: 70, y: 445, w: 283, h: 374, heightM: HERO_HEIGHT, motion: 'waddle', footOffset: 0.07 },
  'ente-magier': { sheet: 'helden', x: 493, y: 417, w: 295, h: 407, heightM: HERO_HEIGHT, motion: 'waddle', footOffset: 0.07 },
  'ente-dieb': { sheet: 'helden', x: 904, y: 458, w: 287, h: 366, heightM: HERO_HEIGHT, motion: 'waddle', footOffset: 0.07 },
  'waschbaer-krieger': { sheet: 'helden', x: 45, y: 822, w: 379, h: 410, heightM: HERO_HEIGHT, motion: 'scurry', footOffset: 0.06 },
  'waschbaer-magier': { sheet: 'helden', x: 441, y: 826, w: 352, h: 407, heightM: HERO_HEIGHT, motion: 'scurry', footOffset: 0.06 },
  'waschbaer-dieb': { sheet: 'helden', x: 863, y: 825, w: 342, h: 408, heightM: HERO_HEIGHT, motion: 'scurry', footOffset: 0.06 },
};

/** @type {Record<string, SpriteDef>} */
export const ENEMY_SPRITES = {
  ratte: { sheet: 'gegner', x: 10, y: 281, w: 382, h: 316, heightM: 0.6, motion: 'scurry', footOffset: 0.04 },
  wildschwein: { sheet: 'gegner', x: 421, y: 185, w: 416, h: 419, heightM: 1.3, motion: 'trot', footOffset: 0.06 },
  kraehe: { sheet: 'gegner', x: 831, y: 94, w: 414, h: 492, heightM: 0.8, motion: 'fly', footOffset: 0 },
  giftkroete: { sheet: 'gegner', x: 16, y: 863, w: 397, h: 278, heightM: 0.8, motion: 'hopSlow', footOffset: 0.06 },
  wolf: { sheet: 'gegner', x: 408, y: 774, w: 438, h: 380, heightM: 1.3, motion: 'lope', footOffset: 0.07 },
  baer: { sheet: 'gegner', x: 869, y: 620, w: 376, h: 554, heightM: 3.2, motion: 'lumber', footOffset: 0.12 },
};

/** Flughöhe der Krähe über dem Boden (m, Unterkante des Bildes). */
export const CROW_FLIGHT_HEIGHT = 1.2;

/** Tempo (m/s), ab dem eine Gangart voll ausgeprägt ist. */
export const MOTION_FULL_SPEED = 3;

/** Atmen im Stand: Frequenz (Hz), Hub (m), Streckung (Anteil). */
export const IDLE = { freq: 0.45, bob: 0.015, stretch: 0.018 };

/** Ausfall beim Angriff: Weg nach vorn (m), Neigung nach vorn (rad). */
export const ATTACK = { lunge: 0.18, tilt: 0.22 };

/** Wie lange (s) der Held nach dem Einsatz einer zielenden Fähigkeit zum Ziel blickt, bevor er wieder in Laufrichtung schaut. */
export const AIM_TURN_DURATION = 0.3;

/** Hoppeln: Rückneigung beim Fallen als Anteil der Vorneigung beim Steigen. */
export const HOP_BACK_LEAN = 0.5;

/** @type {Record<MotionId, MotionDef>} */
export const MOTION = {
  hop: { freq: 2.4, bob: 0.3, tilt: 0.14, squash: 0.08 },
  waddle: { freq: 2.6, bob: 0.06, tilt: 0.16, squash: 0.04 },
  scurry: { freq: 4.5, bob: 0.07, tilt: 0.06, squash: 0.05, tiltRate: 1 },
  trot: { freq: 3, bob: 0.08, tilt: 0.05, squash: 0.04, tiltRate: 2 },
  fly: { freq: 2.2, bob: 0.25, tilt: 0.12, squash: 0.12 },
  hopSlow: { freq: 0.9, bob: 0.3, tilt: 0.2, squash: 0.12 },
  lope: { freq: 2.4, bob: 0.12, tilt: 0.1, squash: 0.05, tiltRate: 1 },
  lumber: { freq: 1.1, bob: 0.1, tilt: 0.07, squash: 0.03, tiltRate: 1 },
};

/** Treffer am Helden: Dauer (ms) und Farbfaktor (RGB, multipliziert das Bild) des roten Aufblitzens. */
export const HERO_FLASH = { ms: 120, color: [1, 0.22, 0.22] };

/** Kamerawackeln bei einem Treffer: Ausschlag in Welteinheiten und Dauer in Sekunden. */
export const SHAKE = { amount: 0.08, seconds: 0.15 };

/** Sterbender Held: Neigung beim Umfallen (rad, bei Neigung 1). */
export const DYING_TILT = 1.35;

/** Unter diesem Lebensanteil pulsiert der rote Bildrand. */
export const LOW_HEALTH_FRACTION = 0.25;

/**
 * Kameralage und wie weit die Kamera hochkant zurückrückt.
 * - `fovDeg`: senkrechter Blickwinkel, `tiltDeg`: Höhenwinkel über dem Boden
 * - `landscapeDistance`: Abstand zum Zielpunkt im Querformat
 * - `minHalfWidth`: so viel Welt soll zu beiden Seiten des Helden sichtbar sein (zusammen 9 Einheiten);
 *   hochkant rückt die Kamera dafür zurück
 * - `maxDistance`: weiter als das nie, sonst wird der Held zu klein
 */
export const CAMERA_FIT = { fovDeg: 45, tiltDeg: 55, landscapeDistance: 15, minHalfWidth: 4.5, maxDistance: 40 };
