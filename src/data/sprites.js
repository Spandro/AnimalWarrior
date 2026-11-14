// Gemalte Figuren: wo sie in den Bildbögen liegen, wie groß sie in der Welt sind und wie sie sich bewegen.

/**
 * @typedef {'hop'|'waddle'|'scurry'|'trot'|'fly'|'hopSlow'|'lope'|'lumber'|'slither'|'stride'} MotionId
 * @typedef {{ sheet: 'helden'|'gegner'|'gegner2'|'bosse'|'duo', x: number, y: number, w: number, h: number, heightM: number, motion: MotionId,
 *   footOffset: number, frames?: Array<{ x: number, y: number, w: number, h: number }> }} SpriteDef
 *   Pixelrechteck der Figur im Bogen (x, y von links oben; enge Umrandung plus 6 px Rand), Höhe in Weltmetern,
 *   footOffset: Höhe des Standpunkts (Mitte der Fußsohlen in der Schrägansicht) über der Bildunterkante in Metern
 *   (bei heightM); dieser Punkt steht auf der Bodenposition, über Bodenschatten und Heldenring.
 *   frames: nur bei einer Bildfolge, gleich große Rechtecke je Bildposition (siehe `SHEET_FRAMES`).
 * @typedef {{ freq: number, bob: number, tilt: number, squash: number, tiltRate?: number }} MotionDef
 *   freq Schrittzyklen je Sekunde, bob Hubhöhe (m), tilt Neigung (rad), squash Stauchung (Anteil),
 *   tiltRate Neigungsfrequenz relativ zu freq.
 */

/**
 * Bildbögen, relativ zu index.html. Geladen wird nur, was ein Eintrag in `HERO_SPRITES` oder `ENEMY_SPRITES`
 * nutzt: `duo` erst, wenn es den Eintrag `giraffe-hochstapler` gibt.
 */
export const SHEETS = {
  helden: 'assets/figuren/helden.webp',
  gegner: 'assets/figuren/gegner.webp',
  gegner2: 'assets/figuren/gegner2.webp',
  bosse: 'assets/figuren/bosse.webp',
  duo: 'assets/figuren/duo.webp',
  kapitel1: 'assets/figuren/kapitel1.webp',
};

/**
 * Eingeschlossenes Papierweiß je Bogen: Startpunkte (x, y von links oben), von denen das Freistellen zusätzlich
 * füllt, weil diese weißen Lücken ringsum vom Tier umschlossen sind (Gegner und Bosse ausgemessen in
 * `docs/neue-gegner-bilder.md`; Duo beim Einbau: alle umschlossenen weißen Flächen ab 20 Pixeln).
 * @type {Record<string, Array<[number, number]>>}
 */
export const SHEET_HOLES = {
  // Otter-Schlinge, unter dem Dachskinn, zweiter Otter-Schlitz
  gegner2: [[290, 921], [753, 516], [172, 904]],
  // zwischen den Hirschbeinen, zwischen den Wisent-Vorderbeinen, zwei Lücken im Hirschgeweih
  bosse: [[198, 427], [302, 1011], [296, 165], [388, 127]],
  // Duo, Phasen 0–3: zwischen den Giraffenbeinen; dann Lücken an Erdmännchen, Schleuder und Schwanz (alle ab 20 Pixeln)
  duo: [[160, 669], [567, 674], [898, 673], [1337, 673], [340, 121], [1203, 512], [915, 499], [296, 243], [223, 191],
    [1176, 546], [241, 176], [279, 261], [1191, 530]],
};

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

/**
 * Giraffe mit Erdmännchen auf dem Kopf: Höhe des Bildes und der 3D-Ersatzfigur in Weltmetern (nur Bild;
 * Körperradius und Trefferfläche sind die der Logik).
 */
export const DUO_HEIGHT = 2.6;

/**
 * Bögen mit Bildfolge: Phasen in gleich großen Ausschnitten. `x`: linke Kante je Phase im gelieferten Bild (Pixel, von
 * links nach rechts die Bildpositionen 0–3; darf außerhalb des Bildes beginnen, dort ist es durchsichtig), `y`, `w`, `h`
 * für alle gleich. In jedem Ausschnitt steht die Giraffe an derselben Stelle (ausgemessen an Beinen, Bauch und Hufen).
 * Weil Kopf und Schwanz benachbarter Phasen in die Ausschnitte der anderen ragen, schneidet das Laden jede Phase mit nur
 * ihren eigenen Pixeln aus und legt sie nebeneinander in einen neuen Bogen (Phase k bei x = k · w, y = 0).
 * `duo.webp` (1536 × 1024): 0 Erdmännchen oben auf dem Kopf, 1 rutscht herunter, 2 klettert den Hals hinauf, 3 sitzt
 * auf dem Rücken.
 * @type {Record<string, { x: number[], y: number, w: number, h: number }>}
 */
export const SHEET_FRAMES = {
  duo: { x: [-37, 330, 703, 1093], y: 97, w: 443, h: 834 },
};

/**
 * Bildfolge des Duos (Spec 7.5); alle Zahlen sind Bildpositionen aus `SHEET_FRAMES.duo`. `order`: Abfolge im Spiel
 * (Rücken → hochklettern → oben stehen → herunterrutschen, dann von vorn), `seconds`: Dauer je Schritt von `order`,
 * `still`: Standbild in Stall und Heldenerstellung, `reducedMotion`: Phase, auf der die Figur bei „Bewegung reduzieren“
 * stehen bleibt.
 */
export const DUO_FRAMES = { order: [3, 2, 0, 1], seconds: [2.5, 1.2, 2.5, 0.8], still: 0, reducedMotion: 3 };

/** Phasen des Duos im ausgeschnittenen Bogen, nach Bildposition. */
const DUO_CELLS = SHEET_FRAMES.duo.x.map((_, k) => ({ x: k * SHEET_FRAMES.duo.w, y: 0, w: SHEET_FRAMES.duo.w, h: SHEET_FRAMES.duo.h }));

/**
 * Darstellung der Duo-Fähigkeiten: Wurfhöhe der Nüsse (m, Kopfhöhe, statt 0,9 m), Strecke (m), auf der eine Nuss auf
 * Treffhöhe sinkt, Treffhöhe (m), Nussgröße (m, Radius) und Farbe; Erdhaufen der Buddelfalle (Radius und Höhe in m,
 * Standzeit in s, Farbe und hellere Kuppe); Erdmännchen der Großfamilie (Anzahl, Abstand zur Lockstelle in m, Höhe in m).
 */
export const DUO_FX = {
  throwHeight: 2.4, dropDistance: 4, hitHeight: 0.7, nutSize: 0.13, nutColor: 0x7a4f2a,
  moundRadius: 0.7, moundHeight: 0.5, moundLife: 2.2, moundColor: 0x5e4026, moundTop: 0x8a6440,
  familyCount: 3, familySpread: 1.2, familyHeight: 0.9,
};

/**
 * @type {Record<string, SpriteDef>} Schlüssel `<tier>-<klasse>`. Das Duo (`giraffe-hochstapler`, Bogen `duo`, Gangart
 * `stride`, Höhe `DUO_HEIGHT`) hat als einziger Held eine Bildfolge (`frames`); sein eigenes Rechteck ist das
 * Standbild `DUO_FRAMES.still`. Fehlt das Bild, zeigt das Spiel die 3D-Ersatzfigur.
 */
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
  'giraffe-hochstapler': { sheet: 'duo', ...DUO_CELLS[DUO_FRAMES.still], heightM: DUO_HEIGHT, motion: 'stride', footOffset: 0.05, frames: DUO_CELLS },
};

/** @type {Record<string, SpriteDef>} */
export const ENEMY_SPRITES = {
  ratte: { sheet: 'gegner', x: 10, y: 281, w: 382, h: 316, heightM: 0.6, motion: 'scurry', footOffset: 0.04 },
  wildschwein: { sheet: 'gegner', x: 421, y: 185, w: 416, h: 419, heightM: 1.3, motion: 'trot', footOffset: 0.06 },
  kraehe: { sheet: 'gegner', x: 831, y: 94, w: 414, h: 492, heightM: 0.8, motion: 'fly', footOffset: 0 },
  giftkroete: { sheet: 'gegner', x: 16, y: 863, w: 397, h: 278, heightM: 0.8, motion: 'hopSlow', footOffset: 0.06 },
  wolf: { sheet: 'gegner', x: 408, y: 774, w: 438, h: 380, heightM: 1.3, motion: 'lope', footOffset: 0.07 },
  baer: { sheet: 'gegner', x: 869, y: 620, w: 376, h: 554, heightM: 3.2, motion: 'lumber', footOffset: 0.12 },
  fuchs: { sheet: 'gegner2', x: 9, y: 330, w: 425, h: 224, heightM: 0.75, motion: 'lope', footOffset: 0.04 },
  dachs: { sheet: 'gegner2', x: 458, y: 304, w: 359, h: 269, heightM: 0.7, motion: 'trot', footOffset: 0.04 },
  uhu: { sheet: 'gegner2', x: 831, y: 174, w: 413, h: 413, heightM: 0.9, motion: 'fly', footOffset: 0 },
  kreuzotter: { sheet: 'gegner2', x: 54, y: 707, w: 319, h: 266, heightM: 0.55, motion: 'slither', footOffset: 0.03 },
  igel: { sheet: 'gegner2', x: 441, y: 714, w: 317, h: 269, heightM: 0.5, motion: 'scurry', footOffset: 0.03 },
  luchs: { sheet: 'gegner2', x: 791, y: 683, w: 428, h: 326, heightM: 1.1, motion: 'lope', footOffset: 0.05 },
  hirsch: { sheet: 'bosse', x: 34, y: 34, w: 433, h: 538, heightM: 4.0, motion: 'trot', footOffset: 0.12 },
  keiler: { sheet: 'bosse', x: 574, y: 104, w: 416, h: 390, heightM: 2.4, motion: 'trot', footOffset: 0.1 },
  wisent: { sheet: 'bosse', x: 34, y: 684, w: 434, h: 390, heightM: 3.0, motion: 'lumber', footOffset: 0.12 },
};

/**
 * Gegner, die es nur im Abenteuer gibt (Bogen `kapitel1`, Raster 3 × 2 zu 418 × 627 Pixeln). Nicht in `ENEMY_SPRITES`,
 * damit der Wellen-Modus den Bogen weder lädt noch braucht; das Abenteuer lädt ihn bei Bedarf nach. Die Rechtecke
 * sind die Rasterzellen, bis das gelieferte Bild ausgemessen ist.
 * @type {Record<string, SpriteDef>}
 */
export const ADVENTURE_ENEMY_SPRITES = {
  helmfisch: { sheet: 'kapitel1', x: 0, y: 0, w: 418, h: 627, heightM: 0.8, motion: 'scurry', footOffset: 0.04 },
  krebs: { sheet: 'kapitel1', x: 418, y: 0, w: 418, h: 627, heightM: 0.7, motion: 'scurry', footOffset: 0.04 },
  frosch: { sheet: 'kapitel1', x: 836, y: 0, w: 418, h: 627, heightM: 0.7, motion: 'hopSlow', footOffset: 0.04 },
  hauptmann_graete: { sheet: 'kapitel1', x: 0, y: 627, w: 418, h: 627, heightM: 2.6, motion: 'trot', footOffset: 0.1 },
  kommandant_zwickzwack: { sheet: 'kapitel1', x: 418, y: 627, w: 418, h: 627, heightM: 2.8, motion: 'lumber', footOffset: 0.1 },
  flossian: { sheet: 'kapitel1', x: 836, y: 627, w: 418, h: 627, heightM: 1.6, motion: 'lumber', footOffset: 0.05 },
};

/**
 * Solange `kapitel1.webp` fehlt: gemalte Stellvertreter aus den vorhandenen Bögen (Bildhöhe aus
 * `ADVENTURE_ENEMY_SPRITES`), in 3D die Form eines ähnlichen Tiers.
 */
export const ADVENTURE_SPRITE_STANDIN = {
  helmfisch: 'ratte', krebs: 'igel', frosch: 'giftkroete', hauptmann_graete: 'wolf', kommandant_zwickzwack: 'dachs',
};

/** Aufsammelbares des Abenteuers, gezeichnet wie: Trank, Truhe (Gegenstand), Kristall (Flussperle). */
export const PICKUP_STANDIN = { potion_item: 'potion', item: 'chest', material: 'xp' };

/** Eingerollter Igel: Drehung um die Bildmitte (rad/s, in Laufrichtung) und Stauchung des Bildes. */
export const CURL_ROLL = { spin: 10, scale: 0.85 };

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
  slither: { freq: 1.6, bob: 0, tilt: 0.08, squash: 0.06 },
  stride: { freq: 1.4, bob: 0.05, tilt: 0.08, squash: 0.02, tiltRate: 1 },
};

/** Treffer am Helden: Dauer (ms) und Farbfaktor (RGB, multipliziert das Bild) des roten Aufblitzens. */
export const HERO_FLASH = { ms: 120, color: [1, 0.22, 0.22] };

/** Vergifteter Held (Kreuzotter): Farbfaktor (RGB) seines Bildes, solange das Gift wirkt; das Aufblitzen hat Vorrang. */
export const HERO_POISON_TINT = [0.62, 1, 0.55];

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
