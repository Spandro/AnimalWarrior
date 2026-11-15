// Gemalte Umgebung: wo Bäume, Felsen, Deko, Kisten und Aufsammelbares im Bogen `objekte.webp` liegen,
// wie groß sie in der Welt sind, wie der Boden gekachelt wird und welches Landschaftsbild hinter
// welchem Menü steht. Nur Zahlen und Tabellen; die Rechnungen stehen in `src/core/environment.js`.

/**
 * @typedef {{ x: number, y: number, w: number, h: number, heightM: number, footOffset: number }} EnvSpriteDef
 *   Pixelrechteck im Bogen (x, y von links oben; enge Umrandung plus bis zu 6 px Rand, ohne Überlappung
 *   mit den Nachbarn), Höhe in Weltmetern und Höhe des Standpunkts über der Bildunterkante in Metern.
 */

/** Bildbögen der Umgebung, relativ zu index.html. */
export const ENV_SHEETS = {
  boden: 'assets/umgebung/boden.webp',
  objekte: 'assets/umgebung/objekte.webp',
  szenen: 'assets/umgebung/szenen.webp',
};

/**
 * Die 15 Bilder in `objekte.webp` (1254 × 1254). Die Rechtecke sind einmal mit einem Canvas-Skript
 * ausgemessen: enge Umrandung aller Pixel, die sich von Weiß abheben, plus 6 px Rand – dort, wo zwei
 * Bilder näher als 12 px beieinanderstehen, entsprechend weniger, damit sich keine zwei überlappen.
 * @type {Record<string, EnvSpriteDef>}
 */
export const ENV_SPRITES = {
  laubbaum: { x: 42, y: 62, w: 440, h: 545, heightM: 6, footOffset: 0.1 },
  tanne: { x: 500, y: 43, w: 312, h: 569, heightM: 6.5, footOffset: 0.1 },
  birke: { x: 830, y: 42, w: 362, h: 571, heightM: 6, footOffset: 0.1 },
  'fels-gross': { x: 12, y: 645, w: 315, h: 276, heightM: 2.2, footOffset: 0.06 },
  'fels-klein': { x: 335, y: 754, w: 179, h: 162, heightM: 1.2, footOffset: 0.05 },
  busch: { x: 523, y: 683, w: 231, h: 232, heightM: 1.3, footOffset: 0.05 },
  stumpf: { x: 755, y: 683, w: 234, h: 236, heightM: 1.1, footOffset: 0.04 },
  farn: { x: 989, y: 673, w: 254, h: 248, heightM: 0.9, footOffset: 0.03 },
  blumen: { x: 24, y: 968, w: 177, h: 222, heightM: 0.7, footOffset: 0.03 },
  pilze: { x: 215, y: 991, w: 170, h: 197, heightM: 0.5, footOffset: 0.02 },
  'truhe-zu': { x: 419, y: 1015, w: 210, h: 184, heightM: 0.9, footOffset: 0.03 },
  'truhe-offen': { x: 656, y: 983, w: 214, h: 220, heightM: 0.9, footOffset: 0.03 },
  muenze: { x: 890, y: 1075, w: 108, h: 111, heightM: 0.45, footOffset: 0.02 },
  trank: { x: 1023, y: 1016, w: 89, h: 174, heightM: 0.5, footOffset: 0.02 },
  kristall: { x: 1141, y: 1040, w: 82, h: 146, heightM: 0.45, footOffset: 0.02 },
};

/**
 * Welches Bild ein Hindernis bekommt: Bäume wechseln fest nach ihrer Position zwischen den drei Arten,
 * Felsen ab `bigRockRadius` Metern Radius sind der große Fels.
 */
export const OBSTACLE_LOOK = { trees: ['laubbaum', 'tanne', 'birke'], bigRockRadius: 1.1 };

/**
 * Deko ohne Kollision: je Geländezelle zwischen `perCell[0]` und `perCell[1]` Stück, Arten nach Gewicht
 * gezogen, nichts näher als `startClear` Meter am Startpunkt und nichts in einem Hindernis.
 */
export const DECO = {
  perCell: [0, 4],
  kinds: { busch: 2, farn: 3, blumen: 4, pilze: 2, stumpf: 1 },
  startClear: 3,
};

/** Boden: Kantenlänge einer Kachel in Metern und wie breit die Ränder für die nahtlose Kachel gemischt werden. */
export const GROUND = { tileM: 8, seamBlendPx: 48 };

/**
 * Kacheln der Abenteuer-Karten (von oben gemalt, 1254 × 1254): Erdweg und Bach, geladen beim Betreten des Abenteuers,
 * Schlamm und Stege des Sumpfs (`CHAPTER_TILES`), geladen mit den Bögen von Kapitel 2. Datei, Kantenlänge einer Kachel in
 * Metern, wie breit die Ränder für die nahtlose Kachel gemischt werden (wie beim Boden) und Deckkraft des Wassers.
 * Die Bretter in `steg.webp` laufen waagerecht; `stegTurn` dreht die Kachel, damit sie wie die gezeichneten Bretter quer
 * zu den (meist west-östlichen) Stegen und Brücken liegen. 8 Bretter je Kachel, also 0,3 m je Brett.
 */
export const TRAIL_TILES = {
  weg: 'assets/abenteuer/weg.webp',
  wasser: 'assets/abenteuer/wasser.webp',
  schlamm: 'assets/abenteuer/schlamm.webp',
  steg: 'assets/abenteuer/steg.webp',
  tileM: { weg: 5, wasser: 6, schlamm: 6, steg: 2.4 },
  stegTurn: Math.PI / 2,
  seamBlendPx: 48,
  waterOpacity: 0.94,
};

/** Kacheln eines späteren Kapitels, nach Kapitelnummer (wie `CHAPTER_SHEETS` in `src/data/sprites.js`). */
export const CHAPTER_TILES = { 2: ['schlamm', 'steg'] };

/** Spalte und Zeile jedes Motivs im 3 × 2-Raster von `szenen.webp`. */
export const SCENE_CELLS = {
  waldweg: { col: 0, row: 0 },
  bruecke: { col: 1, row: 0 },
  hoehle: { col: 2, row: 0 },
  wasserfall: { col: 0, row: 1 },
  baum: { col: 1, row: 1 },
  teich: { col: 2, row: 1 },
};

/** Welches Motiv hinter welchem Bildschirm steht. Im Spiel selbst steht kein Bild. */
export const MENU_SCENES = {
  main: 'baum',
  heroes: 'waldweg',
  createAnimal: 'waldweg',
  createClass: 'waldweg',
  createName: 'waldweg',
  mode: 'bruecke',
  metaShop: 'hoehle',
  achievements: 'wasserfall',
  settings: 'teich',
  result: 'baum',
};
