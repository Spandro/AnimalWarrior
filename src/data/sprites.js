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
 * Bildbögen, relativ zu index.html. Beim Start geladen wird nur, was ein Eintrag in `HERO_SPRITES` oder `ENEMY_SPRITES`
 * nutzt: `duo` erst, wenn es den Eintrag `giraffe-hochstapler` gibt. Die Bögen des Abenteuers (`kapitel1`, `bewohner`,
 * `dorf`, siehe `ADVENTURE_SHEETS`) kommen erst beim Betreten des Abenteuers dazu, die eines späteren Kapitels
 * (`CHAPTER_SHEETS`) erst, wenn es gebraucht wird.
 */
export const SHEETS = {
  helden: 'assets/figuren/helden.webp',
  gegner: 'assets/figuren/gegner.webp',
  gegner2: 'assets/figuren/gegner2.webp',
  bosse: 'assets/figuren/bosse.webp',
  duo: 'assets/figuren/duo.webp',
  kapitel1: 'assets/figuren/kapitel1.webp',
  bewohner: 'assets/abenteuer/bewohner.webp',
  dorf: 'assets/abenteuer/dorf.webp',
  kapitel2: 'assets/figuren/kapitel2.webp',
  bewohner2: 'assets/abenteuer/bewohner2.webp',
  sumpf: 'assets/abenteuer/sumpf.webp',
};

/** Bögen, die das Abenteuer beim Betreten nachlädt (Gegner des Kapitels, Leute, Häuser und Gegenstände der Karten). */
export const ADVENTURE_SHEETS = ['kapitel1', 'bewohner', 'dorf'];

/**
 * Bögen eines späteren Kapitels (Gegner, Leute, Kulissen), nach Kapitelnummer. Geladen, sobald der Held auf einer Karte
 * des Kapitels steht oder das Kapitel davor abgeschlossen hat (siehe `chaptersToLoad` in `src/render/sprites.js`); bis
 * dahin und wenn ein Bild fehlt, zeigt das Spiel Stellvertreter.
 * @type {Record<number, string[]>}
 */
export const CHAPTER_SHEETS = { 2: ['kapitel2', 'bewohner2', 'sumpf'] };

/**
 * Eingeschlossenes Papierweiß je Bogen: Startpunkte (x, y von links oben), von denen das Freistellen zusätzlich
 * füllt, weil diese weißen Lücken ringsum vom Tier umschlossen sind (Gegner und Bosse ausgemessen in
 * `docs/neue-gegner-bilder.md`; Duo beim Einbau: alle umschlossenen weißen Flächen ab 20 Pixeln; Abenteuer-Bögen in
 * `docs/abenteuer-bilder.md`: alle umschlossenen weißen Flächen ab 20 Pixeln außer gemaltem Weiß wie Augenglanz,
 * Brosche, Glas und Gischt).
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
  // Froschhelm aus Wasserpflanzen (10 Lücken), zwischen den Beinen der Sänftenkrebse, an Grätes Säbelhand, zwischen
  // Frosch-, Zwickzwack- und Grätebeinen; nicht das Glas von Flossians Kugel und den Taucherhelmen
  kapitel1: [[979, 210], [1014, 188], [888, 1121], [319, 923], [1004, 463], [930, 301], [911, 312], [955, 280], [1031, 206],
    [987, 229], [967, 255], [1166, 1112], [926, 332], [508, 1177], [627, 1154], [521, 1094], [195, 1072], [978, 251]],
  // Grabowskis Zange (drei), Amsels Taschenbügel (zwei), Panzerlas Brillenglas (zwei), Schal und Beine, Krümels
  // Schürzenschleife, Nussas Tasche und Schwanz; nicht Krümels Augenglanz und Amsels Brosche
  bewohner: [[1417, 311], [1393, 307], [1427, 820], [468, 70], [474, 88], [1461, 220], [609, 270], [410, 302], [272, 428],
    [249, 747], [1439, 809], [89, 783]],
  // Brücke, Brunnen, Zaun, Netze der Barrikade, Wegweiser, Flugblatt, Schmiede und Gräser; nicht die Gischt unter der Brücke
  dorf: [[1027, 503], [119, 491], [119, 537], [769, 855], [170, 538], [289, 771], [1095, 517], [845, 902], [1110, 517],
    [227, 1130], [562, 268], [1038, 533], [894, 555], [989, 161], [1170, 508], [1055, 526], [297, 804], [1229, 616],
    [695, 870], [232, 1153], [817, 904], [313, 821], [1040, 864], [365, 263], [211, 533], [832, 903], [208, 548],
    [1203, 889], [385, 892], [821, 904], [866, 902], [249, 1167], [522, 878], [150, 555], [763, 867], [127, 1197],
    [608, 1207], [22, 310], [43, 168], [794, 904], [897, 191], [208, 563], [43, 870], [82, 113], [926, 910]],
  // Schilfhelm des Ochsenfroschs (10 Lücken), zwischen Libellenfühler und Kopf, Hechtzähne, Quaks Krone; nicht die
  // Libellenflügel (4) und ihr Augenglanz
  kapitel2: [[287, 158], [271, 160], [193, 169], [223, 175], [233, 196], [198, 239], [185, 247], [148, 258], [169, 258],
    [176, 266], [836, 288], [1206, 617], [525, 619]],
  // Frau Quappes Schal aus Wasserpflanzen (alle 20 Lücken)
  bewohner2: [[389, 314], [360, 327], [846, 353], [368, 358], [336, 374], [356, 383], [874, 384], [901, 431], [315, 492],
    [298, 533], [290, 574], [273, 589], [953, 595], [297, 672], [285, 682], [947, 709], [885, 839], [337, 878], [396, 906],
    [569, 948]],
  // Sumpf: zwischen den Halmen der Schilfbüsche, im Wasser um die Seerosen, im Gras an Moorbaum, Baumstumpf und Schild
  // (alle 59 Lücken)
  sumpf: [[205, 132], [235, 145], [209, 157], [237, 179], [305, 205], [1004, 205], [222, 221], [216, 237], [355, 255],
    [317, 294], [196, 303], [1205, 307], [304, 314], [330, 316], [320, 338], [343, 356], [317, 361], [88, 368], [288, 382],
    [331, 410], [1194, 410], [1201, 416], [342, 420], [637, 449], [336, 471], [653, 478], [640, 492], [1148, 493],
    [323, 494], [99, 496], [95, 512], [89, 514], [630, 514], [488, 525], [483, 527], [485, 578], [870, 1013], [164, 1031],
    [566, 1038], [867, 1040], [862, 1041], [582, 1045], [1126, 1053], [879, 1063], [560, 1064], [886, 1072], [111, 1080],
    [97, 1082], [375, 1082], [1167, 1089], [73, 1108], [1172, 1115], [65, 1116], [1184, 1130], [49, 1141], [396, 1144],
    [446, 1149], [523, 1154], [1027, 1202]],
};

/**
 * Bögen, deren Stücke einzeln ausgeschnitten werden, weil sich ihre Rechtecke im gelieferten Bild überschneiden
 * (Zwickzwacks Scheren ragen in die Nachbarn, die Häuser oben rechts stehen übereinander, Quaks Mantel reicht unter die
 * Kaulquappe, die Kulissen des Sumpfs stehen eng). `pieces`: Rechteck je Stück im
 * gelieferten Bild (x, y von links oben; enge Umrandung aller Pixel, die sich von Weiß abheben, plus 6 px Rand, am
 * Bildrand gekappt), `width`/`height`: Größe des gelieferten Bildes. Das Laden gibt jedem Stück nur seine eigenen Pixel
 * und legt die Stücke nebeneinander in einen neuen Bogen (`cutLayout`, wie die Phasen des Duos); in den Figuren-Einträgen
 * stehen die Rechtecke in diesem neuen Bogen.
 * @type {Record<string, { width: number, height: number, pieces: Record<string, { x: number, y: number, w: number, h: number }> }>}
 */
export const SHEET_CUTS = {
  kapitel1: {
    width: 1254,
    height: 1254,
    pieces: {
      helmfisch: { x: 18, y: 49, w: 368, h: 504 },
      krebs: { x: 422, y: 12, w: 420, h: 518 },
      frosch: { x: 821, y: 122, w: 401, h: 439 },
      hauptmann_graete: { x: 30, y: 562, w: 375, h: 653 },
      kommandant_zwickzwack: { x: 383, y: 535, w: 504, h: 679 },
      flossian: { x: 758, y: 688, w: 496, h: 496 },
    },
  },
  bewohner: {
    width: 1536,
    height: 1024,
    pieces: {
      panzerla: { x: 28, y: 49, w: 474, h: 453 },
      kruemel: { x: 573, y: 24, w: 374, h: 488 },
      grabowski: { x: 1062, y: 21, w: 463, h: 490 },
      nussa: { x: 24, y: 520, w: 441, h: 472 },
      pieps: { x: 522, y: 569, w: 482, h: 422 },
      amsel: { x: 986, y: 520, w: 492, h: 471 },
    },
  },
  dorf: {
    width: 1254,
    height: 1254,
    pieces: {
      haus_oma: { x: 4, y: 20, w: 336, h: 375 },
      laden: { x: 329, y: 45, w: 297, h: 356 },
      schmiede: { x: 609, y: 7, w: 344, h: 413 },
      wohnhaus: { x: 933, y: 7, w: 315, h: 255 },
      wohnhaus2: { x: 929, y: 231, w: 322, h: 221 },
      brunnen: { x: 9, y: 397, w: 281, h: 314 },
      feuer_aus: { x: 284, y: 509, w: 276, h: 192 },
      feuer_an: { x: 562, y: 470, w: 285, h: 237 },
      bruecke: { x: 841, y: 475, w: 408, h: 247 },
      barrikade: { x: 4, y: 709, w: 418, h: 257 },
      wegweiser: { x: 438, y: 686, w: 188, h: 296 },
      zaun: { x: 647, y: 779, w: 319, h: 194 },
      nuesse: { x: 967, y: 777, w: 280, h: 202 },
      flugblatt: { x: 109, y: 965, w: 202, h: 278 },
      truhe_zu: { x: 385, y: 1002, w: 366, h: 226 },
      truhe_offen: { x: 812, y: 968, w: 326, h: 267 },
    },
  },
  kapitel2: {
    width: 1254,
    height: 1254,
    pieces: {
      ochsenfrosch: { x: 21, y: 47, w: 427, h: 536 },
      libelle: { x: 451, y: 30, w: 400, h: 498 },
      blutegel: { x: 877, y: 100, w: 352, h: 427 },
      kaulquappe: { x: 20, y: 733, w: 346, h: 307 },
      hofmarschall_quak: { x: 298, y: 573, w: 504, h: 637 },
      hecht_haudrauf: { x: 798, y: 590, w: 439, h: 633 },
    },
  },
  sumpf: {
    width: 1254,
    height: 1254,
    pieces: {
      schilf_gross: { x: 14, y: 8, w: 432, h: 615 },
      schilf_klein: { x: 428, y: 123, w: 276, h: 498 },
      seerosen: { x: 696, y: 130, w: 551, h: 406 },
      moorbaum: { x: 22, y: 580, w: 548, h: 651 },
      stumpf: { x: 471, y: 785, w: 474, h: 439 },
      kroenungsschild: { x: 915, y: 540, w: 310, h: 688 },
    },
  },
};

/** Höchste Breite (Pixel) eines ausgeschnittenen Bogens; Stücke, die nicht mehr in die Reihe passen, kommen in die nächste. */
export const CUT_SHEET_MAX_WIDTH = 2048;

/**
 * Lage der Stücke im ausgeschnittenen Bogen: Reihe für Reihe von links nach rechts in der Reihenfolge von `pieces`,
 * eine neue Reihe, sobald ein Stück über `maxWidth` hinausginge; jede Reihe so hoch wie ihr höchstes Stück.
 * @param {Record<string, { w: number, h: number }>} pieces
 * @param {number} [maxWidth]
 * @returns {{ width: number, height: number, cells: Record<string, { x: number, y: number, w: number, h: number }> }}
 */
export function cutLayout(pieces, maxWidth = CUT_SHEET_MAX_WIDTH) {
  const cells = {};
  let x = 0, y = 0, rowH = 0, width = 0;
  for (const [name, { w, h }] of Object.entries(pieces)) {
    if (x > 0 && x + w > maxWidth) { y += rowH; x = 0; rowH = 0; }
    cells[name] = { x, y, w, h };
    x += w;
    rowH = Math.max(rowH, h);
    width = Math.max(width, x);
  }
  return { width, height: y + rowH, cells };
}

/** Ausgeschnittene Bögen: Größe und Rechteck je Stück. */
export const CUT_LAYOUTS = Object.fromEntries(Object.entries(SHEET_CUTS).map(([id, cut]) => [id, cutLayout(cut.pieces)]));

const K1 = CUT_LAYOUTS.kapitel1.cells, PEOPLE = CUT_LAYOUTS.bewohner.cells, VILLAGE = CUT_LAYOUTS.dorf.cells;
const K2 = CUT_LAYOUTS.kapitel2.cells, SWAMP = CUT_LAYOUTS.sumpf.cells;

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
 * Gegner, die es nur im Abenteuer gibt (Bögen `kapitel1` und `kapitel2`, Stücke einzeln ausgeschnitten, siehe
 * `SHEET_CUTS`; x, y, w, h hier im ausgeschnittenen Bogen). Nicht in `ENEMY_SPRITES`, damit der Wellen-Modus die Bögen
 * weder lädt noch braucht; das Abenteuer lädt sie nach (`ADVENTURE_SHEETS`, `CHAPTER_SHEETS`).
 * @type {Record<string, SpriteDef>}
 */
export const ADVENTURE_ENEMY_SPRITES = {
  helmfisch: { sheet: 'kapitel1', ...K1.helmfisch, heightM: 0.9, motion: 'scurry', footOffset: 0.04 },
  krebs: { sheet: 'kapitel1', ...K1.krebs, heightM: 0.95, motion: 'scurry', footOffset: 0.05 },
  frosch: { sheet: 'kapitel1', ...K1.frosch, heightM: 0.8, motion: 'hopSlow', footOffset: 0.05 },
  ochsenfrosch: { sheet: 'kapitel2', ...K2.ochsenfrosch, heightM: 1.25, motion: 'hopSlow', footOffset: 0.06 },
  libelle: { sheet: 'kapitel2', ...K2.libelle, heightM: 0.9, motion: 'fly', footOffset: 0 },
  blutegel: { sheet: 'kapitel2', ...K2.blutegel, heightM: 0.8, motion: 'slither', footOffset: 0.04 },
  kaulquappe: { sheet: 'kapitel2', ...K2.kaulquappe, heightM: 0.5, motion: 'scurry', footOffset: 0.03 },
  hofmarschall_quak: { sheet: 'kapitel2', ...K2.hofmarschall_quak, heightM: 2.6, motion: 'lumber', footOffset: 0.12 },
  hecht_haudrauf: { sheet: 'kapitel2', ...K2.hecht_haudrauf, heightM: 3.0, motion: 'trot', footOffset: 0.12 },
  // Kapitel 3: Stellvertreter, bis eigene Bilder kommen.
  aal: { ...ENEMY_SPRITES.kreuzotter, cell: 'kreuzotter', heightM: 0.6, footOffset: 0.03 },
  bisam: { ...ENEMY_SPRITES.ratte, cell: 'ratte', heightM: 0.7 },
  helmhecht: { sheet: 'kapitel1', ...K1.helmfisch, cell: 'helmfisch', heightM: 1.15, motion: 'scurry', footOffset: 0.05 },
  bauleiter_nagezahn: { ...ENEMY_SPRITES.dachs, cell: 'dachs', heightM: 2.5 },
  admiral_flossenbart: { sheet: 'kapitel1', ...K1.hauptmann_graete, cell: 'hauptmann_graete', heightM: 3.1, motion: 'lumber', footOffset: 0.12 },
  hauptmann_graete: { sheet: 'kapitel1', ...K1.hauptmann_graete, heightM: 2.6, motion: 'trot', footOffset: 0.1 },
  kommandant_zwickzwack: { sheet: 'kapitel1', ...K1.kommandant_zwickzwack, heightM: 2.8, motion: 'lumber', footOffset: 0.12 },
  flossian: { sheet: 'kapitel1', ...K1.flossian, heightM: 1.6, motion: 'lumber', footOffset: 0.08 },
};

/**
 * Wenn `kapitel2.webp` fehlt (oder noch lädt): gemalte Stellvertreter wie vor dem Einbau, Frösche und Hecht aus
 * kapitel1.webp in anderer Größe (`cell` nennt das ausgeschnittene Stück), Libelle und Blutegel aus den Bögen des
 * Wellen-Modus (`cell` = Gegnertyp dort). Fehlt auch deren Bogen, gilt `ADVENTURE_SPRITE_STANDIN`.
 * @type {Record<string, SpriteDef & { cell: string }>}
 */
export const ADVENTURE_SPRITE_FALLBACK = {
  ochsenfrosch: { sheet: 'kapitel1', ...K1.frosch, cell: 'frosch', heightM: 1.1, motion: 'hopSlow', footOffset: 0.07 },
  kaulquappe: { sheet: 'kapitel1', ...K1.frosch, cell: 'frosch', heightM: 0.5, motion: 'scurry', footOffset: 0.03 },
  hofmarschall_quak: { sheet: 'kapitel1', ...K1.frosch, cell: 'frosch', heightM: 2.4, motion: 'hopSlow', footOffset: 0.15 },
  hecht_haudrauf: { sheet: 'kapitel1', ...K1.hauptmann_graete, cell: 'hauptmann_graete', heightM: 2.9, motion: 'trot', footOffset: 0.11 },
  libelle: { ...ENEMY_SPRITES.kraehe, cell: 'kraehe', heightM: 0.9 },
  blutegel: { ...ENEMY_SPRITES.kreuzotter, cell: 'kreuzotter', heightM: 0.5, footOffset: 0.03 },
};

/**
 * @typedef {{ sheet: 'bewohner'|'bewohner2'|'dorf'|'sumpf', x: number, y: number, w: number, h: number, heightM: number, footOffset: number }} PanelDef
 *   Gemalte Tafel auf einer Abenteuer-Karte: Rechteck im ausgeschnittenen Bogen, Höhe in Weltmetern, Standpunkt über der
 *   Bildunterkante (m, wie bei den Figuren).
 */

/**
 * Leute im Dorf (Bogen `bewohner`) und in den Kapiteln (Frau Quappe: `bewohner2`, eine Figur, nicht ausgeschnitten;
 * Rechteck im gelieferten Bild), gemalt nach rechts blickend; `faceX` -1 in der Karte spiegelt sie.
 * @type {Record<string, PanelDef>}
 */
export const NPC_SPRITES = {
  panzerla: { sheet: 'bewohner', ...PEOPLE.panzerla, heightM: 1.35, footOffset: 0.06 },
  kruemel: { sheet: 'bewohner', ...PEOPLE.kruemel, heightM: 1.3, footOffset: 0.05 },
  grabowski: { sheet: 'bewohner', ...PEOPLE.grabowski, heightM: 1.5, footOffset: 0.06 },
  nussa: { sheet: 'bewohner', ...PEOPLE.nussa, heightM: 1.3, footOffset: 0.06 },
  pieps: { sheet: 'bewohner', ...PEOPLE.pieps, heightM: 0.95, footOffset: 0.05 },
  amsel: { sheet: 'bewohner', ...PEOPLE.amsel, heightM: 1.3, footOffset: 0.05 },
  quappe: { sheet: 'bewohner2', x: 197, y: 34, w: 819, h: 1185, heightM: 1.3, footOffset: 0.05 },
};

/**
 * Häuser und Gegenstände der Karten (Bogen `dorf`). Schlüssel wie die Arten in `map.props`; dazu Lagerfeuer
 * (`feuer_aus`/`feuer_an`, gleicher Maßstab, damit der Steinkreis beim Entzünden gleich bleibt), Kisten
 * (`truhe_zu`/`truhe_offen`, ebenso), Nussverstecke (`nuesse`) und die Barrikade (`barrikade`, entlang des Tors
 * wiederholt). Die Brücke ist ausgemessen, aber nicht im Spiel: Brücken sind von oben gesehene Stege.
 * @type {Record<string, PanelDef>}
 */
export const VILLAGE_SPRITES = {
  haus_oma: { sheet: 'dorf', ...VILLAGE.haus_oma, heightM: 5.6, footOffset: 0.4 },
  laden: { sheet: 'dorf', ...VILLAGE.laden, heightM: 4.6, footOffset: 0.4 },
  schmiede: { sheet: 'dorf', ...VILLAGE.schmiede, heightM: 5.6, footOffset: 0.4 },
  wohnhaus: { sheet: 'dorf', ...VILLAGE.wohnhaus, heightM: 3.8, footOffset: 0.35 },
  wohnhaus2: { sheet: 'dorf', ...VILLAGE.wohnhaus2, heightM: 3.4, footOffset: 0.35 },
  brunnen: { sheet: 'dorf', ...VILLAGE.brunnen, heightM: 3, footOffset: 0.25 },
  wegweiser: { sheet: 'dorf', ...VILLAGE.wegweiser, heightM: 2.2, footOffset: 0.12 },
  zaun: { sheet: 'dorf', ...VILLAGE.zaun, heightM: 1.4, footOffset: 0.1 },
  flugblatt: { sheet: 'dorf', ...VILLAGE.flugblatt, heightM: 1.7, footOffset: 0.08 },
  feuer_aus: { sheet: 'dorf', ...VILLAGE.feuer_aus, heightM: 1.0, footOffset: 0.3 },
  feuer_an: { sheet: 'dorf', ...VILLAGE.feuer_an, heightM: 1.0 * VILLAGE.feuer_an.h / VILLAGE.feuer_aus.h, footOffset: 0.3 },
  truhe_zu: { sheet: 'dorf', ...VILLAGE.truhe_zu, heightM: 0.95, footOffset: 0.08 },
  truhe_offen: { sheet: 'dorf', ...VILLAGE.truhe_offen, heightM: 0.95 * VILLAGE.truhe_offen.h / VILLAGE.truhe_zu.h, footOffset: 0.08 },
  nuesse: { sheet: 'dorf', ...VILLAGE.nuesse, heightM: 0.7, footOffset: 0.12 },
  barrikade: { sheet: 'dorf', ...VILLAGE.barrikade, heightM: 2.2, footOffset: 0.2 },
  bruecke: { sheet: 'dorf', ...VILLAGE.bruecke, heightM: 2.2, footOffset: 0.3 },
};

/**
 * Kulissen des Sumpfs (Bogen `sumpf`): Schilfbüsche, Seerosen, Moorbaum und Baumstumpf am Kartenrand (`MAP_SCENERY`),
 * das Krönungsschild der Frösche als Kleinkram (`map.props`, Art `kroenungsschild`). Die Seerosen liegen flach auf dem
 * Wasser, ihr Standpunkt ist daher die Mitte der Gruppe.
 * @type {Record<string, PanelDef>}
 */
export const SWAMP_SPRITES = {
  schilf_gross: { sheet: 'sumpf', ...SWAMP.schilf_gross, heightM: 3.0, footOffset: 0.25 },
  schilf_klein: { sheet: 'sumpf', ...SWAMP.schilf_klein, heightM: 2.2, footOffset: 0.18 },
  seerosen: { sheet: 'sumpf', ...SWAMP.seerosen, heightM: 1.3, footOffset: 0.5 },
  moorbaum: { sheet: 'sumpf', ...SWAMP.moorbaum, heightM: 6, footOffset: 0.3 },
  stumpf: { sheet: 'sumpf', ...SWAMP.stumpf, heightM: 1.7, footOffset: 0.15 },
  kroenungsschild: { sheet: 'sumpf', ...SWAMP.kroenungsschild, heightM: 2.4, footOffset: 0.12 },
};

/** Gemalter Kleinkram der Karten nach Art (`map.props`): Dorf und Sumpf. */
export const PROP_SPRITES = { ...VILLAGE_SPRITES, kroenungsschild: SWAMP_SPRITES.kroenungsschild };

/**
 * Kulissen am Kartenrand je Karte: Ein Anteil `share` der Randbäume und -felsen (`borderDecor`) wird zu einem Bild aus
 * `SWAMP_SPRITES`, fest nach seiner Position gewählt (`borderScenery` in `src/core/environment.js`); Bäume aus `tree`,
 * Felsen aus `rock` (Wiederholung = Gewicht). Fehlt der Bogen, bleibt es bei Bäumen und Felsen.
 * @type {Record<string, { sheet: 'sumpf', share: number, tree: string[], rock: string[] }>}
 */
export const MAP_SCENERY = {
  kapitel2: { sheet: 'sumpf', share: 0.6, tree: ['moorbaum', 'schilf_gross', 'schilf_gross'], rock: ['schilf_klein', 'seerosen', 'stumpf'] },
};

/** Lagerfeuer im Bild: Flackern der Flamme (Hz, Anteil der Bildhöhe). */
export const FIRE_FLICKER = { freq: 1.6, amount: 0.035 };

/**
 * Porträts im Gesprächskasten: Kopf und Schultern je Person im gelieferten `bewohner.webp` (1536 × 1024, quadratisch fürs
 * runde Porträt, x, y von links oben), wie die Wirte der Taverne; mit `sheet` aus einem anderen Bild (Frau Quappe aus
 * `bewohner2.webp`, 1254 × 1254). Wer hier fehlt, bekommt den Kreis mit Buchstaben.
 * @type {{ sheet: string, rects: Record<string, { x: number, y: number, w: number, h: number, sheet?: string }> }}
 */
export const NPC_PORTRAITS = {
  sheet: SHEETS.bewohner,
  rects: {
    panzerla: { x: 300, y: 28, w: 196, h: 196 },
    kruemel: { x: 672, y: 24, w: 210, h: 210 },
    grabowski: { x: 1196, y: 18, w: 228, h: 228 },
    nussa: { x: 270, y: 530, w: 200, h: 200 },
    pieps: { x: 730, y: 566, w: 200, h: 200 },
    amsel: { x: 1250, y: 520, w: 226, h: 226 },
    quappe: { x: 470, y: 34, w: 420, h: 420, sheet: SHEETS.bewohner2 },
  },
};

/**
 * Wenn `kapitel1.webp` fehlt (bei Kapitel 2 auch `kapitel2.webp` und der Bogen aus `ADVENTURE_SPRITE_FALLBACK`): gemalte
 * Stellvertreter aus den vorhandenen Bögen (Bildhöhe aus `ADVENTURE_ENEMY_SPRITES`), in 3D die Form eines ähnlichen Tiers.
 */
export const ADVENTURE_SPRITE_STANDIN = {
  helmfisch: 'ratte', krebs: 'igel', frosch: 'giftkroete', hauptmann_graete: 'wolf', kommandant_zwickzwack: 'dachs',
  ochsenfrosch: 'giftkroete', kaulquappe: 'giftkroete', hofmarschall_quak: 'giftkroete', hecht_haudrauf: 'wolf',
  libelle: 'kraehe', blutegel: 'kreuzotter',
  aal: 'kreuzotter', bisam: 'ratte', helmhecht: 'ratte', bauleiter_nagezahn: 'dachs', admiral_flossenbart: 'wolf',
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
/** Getroffene Gegner blitzen kurz hell auf: Dauer (Weltsekunden) und Farbfaktor. */
export const ENEMY_FLASH = { seconds: 0.1, color: [1.9, 1.75, 1.75] };

/** Vergifteter Held (Kreuzotter): Farbfaktor (RGB) seines Bildes, solange das Gift wirkt; das Aufblitzen hat Vorrang. */
export const HERO_POISON_TINT = [0.62, 1, 0.55];
/** Leuchtfarbe der vergifteten 3D-Ersatzfigur (wenn die gemalten Bilder fehlen). */
export const HERO_POISON_EMISSIVE = 0x1f5a14;

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
