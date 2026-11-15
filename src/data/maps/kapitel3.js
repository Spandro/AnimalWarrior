// Kapitel 3 „Der Biberdamm“: vom Dammufer nördlich des Dorfs flussaufwärts am Biberbau (Biberin Rinde) vorbei zum
// Mühlgraben, über die Baustelle (Bauleiter Nagezahn) durch den Auwald bis zum Stausee am Damm (Admiral Flossenbart).
// Strömung schiebt alle, die laufen, flussabwärts (nach Westen); Schleusen mit Hebeln schalten Flächen um; die
// Biberschleuse öffnen die Biber selbst, sobald sie Verbündete sind. Der erste Weg ist der Hauptweg.
// Koordinaten in Metern; x nach Osten, z nach Süden (wie in der Welt). Strömung fließt vom ersten zum letzten Punkt.

/** @type {import('./index.js').MapDef} */
export const KAPITEL3 = {
  id: 'kapitel3',
  name: 'Der Biberdamm',
  chapter: 3,
  bounds: { minX: -40, maxX: 1300, minZ: -160, maxZ: 160 },
  paths: [
    { points: [[-6, 0], [60, -15], [120, 5], [180, -10], [240, 10], [300, 0], [360, -20], [420, -25], [480, -10], [540, 15],
      [600, 10], [660, -15], [720, -30], [790, -20], [860, 10], [930, 20], [1000, 0], [1060, -20], [1120, -25], [1180, -15],
      [1240, -10]], width: 8 },
    { points: [[180, -10], [186, -60], [192, -95]], width: 7 },
    { points: [[540, 15], [548, 60], [556, 100]], width: 6 },
    { points: [[790, -20], [796, -70], [802, -110]], width: 6 },
    { points: [[1000, 0], [1008, 70], [1014, 110]], width: 6 },
  ],
  clearings: [
    { x: 4, z: 0, r: 9 },
    { x: 192, z: -105, r: 13 },
    { x: 600, z: 10, r: 14 },
    { x: 558, z: 110, r: 10 },
    { x: 804, z: -120, r: 10 },
    { x: 1016, z: 120, r: 10 },
    { x: 1240, z: -10, r: 18 },
  ],
  water: [
    { points: [[300, 60], [380, 70]], width: 16 },
    { points: [[1180, 40], [1300, 60]], width: 30 },
  ],
  mud: [
    { points: [[100, -20], [150, 10]], width: 24 },
    { points: [[840, -10], [890, 20]], width: 26 },
  ],
  currents: [
    { points: [[300, 0], [250, 9]], width: 10 }, // Furt am Dammufer
    { points: [[960, 18], [915, 19]], width: 10 }, // Furt im Auwald
    { points: [[1246, -22], [1234, 2]], width: 8 }, // Strömungsband in Flossenbarts Arena
  ],
  bridges: [],
  boardwalks: [],
  sluices: [
    {
      id: 'schleuse_nord', name: 'Mühlgraben-Schleuse', lever: { x: 436, z: -24 }, start: 'open',
      strips: [{ points: [[450, -60], [455, 40]], width: 8 }], open: 'current', closed: 'mud',
    },
    {
      id: 'schleuse_sued', name: 'Wiesen-Schleuse', lever: { x: 528, z: 12 }, start: 'open',
      strips: [{ points: [[530, 50], [566, 50]], width: 12 }], open: 'water', closed: 'walk',
    },
    {
      id: 'schleuse_altarm', name: 'Altarm-Schleuse', lever: { x: 776, z: -24 }, start: 'open',
      strips: [{ points: [[780, -88], [822, -88]], width: 12 }], open: 'water', closed: 'mud',
    },
    {
      id: 'biberschleuse', name: 'Biberschleuse', start: 'closed',
      strips: [{ points: [[1090, -45], [1090, 5]], width: 6 }], open: 'walk', closed: 'water',
      opensOn: { quest: 'dammwache', step: 3 },
    },
  ],
  obstacles: [
    { x: 200, z: -114, radius: 0.9, kind: 'tree' },
    { x: 566, z: 116, radius: 0.8, kind: 'tree' },
    { x: 812, z: -126, radius: 0.9, kind: 'rock' },
    { x: 1250, z: 2, radius: 1.1, kind: 'tree' },
  ],
  gates: [
    { id: 'arena_nagezahn', kind: 'arena', points: [[585, 1], [585, 21]] },
    { id: 'sperre_nagezahn', kind: 'barrier', points: [[617, -6], [617, 12]], opensOn: { boss: 'nagezahn' } },
    { id: 'arena_flossenbart', kind: 'arena', points: [[1221, -21], [1221, -3]] },
  ],
  areas: [
    { id: 'dammufer', name: 'Dammufer', x: 120, z: 0, r: 140 },
    { id: 'biberbau', name: 'Biberbau', x: 192, z: -105, r: 30 },
    { id: 'muehlgraben', name: 'Mühlgraben', x: 440, z: -15, r: 110 },
    { id: 'baustelle', name: 'Baustelle', x: 600, z: 10, r: 40 },
    { id: 'wiesenrinne', name: 'Wiesenrinne', x: 556, z: 95, r: 30 },
    { id: 'auwald', name: 'Auwald', x: 860, z: 0, r: 180 },
    { id: 'altarm', name: 'Altarm', x: 802, z: -110, r: 30 },
    { id: 'stausee', name: 'Stausee', x: 1200, z: -10, r: 75 },
  ],
  campfires: [
    { id: 'k3_ufer', x: 6, z: 3 },
    { id: 'k3_muehle', x: 390, z: -22 },
    { id: 'k3_auwald', x: 700, z: -25 },
    { id: 'k3_stausee', x: 1150, z: -20 },
  ],
  npcs: [
    { id: 'rinde', x: 196, z: -108, faceX: -1 },
    { id: 'nagezahn', x: 606, z: 10, faceX: -1, requires: { boss: 'nagezahn' } },
  ],
  spots: [
    { id: 'k3_treibholz_1', kind: 'treibholz', x: 186, z: -98 },
    { id: 'k3_treibholz_2', kind: 'treibholz', x: 350, z: -18 },
    { id: 'k3_treibholz_3', kind: 'treibholz', x: 690, z: -27 },
    { id: 'k3_treibholz_4', kind: 'treibholz', x: 1020, z: 118 },
  ],
  chests: [
    { id: 'k3_kiste_bau', x: 184, z: -112, gold: 140 },
    { id: 'k3_kiste_wiese', x: 562, z: 112, gold: 160, pearls: 1 },
    { id: 'k3_kiste_altarm', x: 808, z: -122, gold: 180, pearls: 1 },
    { id: 'k3_kiste_auwald', x: 1012, z: 124, gold: 160 },
  ],
  packs: [
    { id: 'p3_ufer_1', x: 60, z: -15, level: 16, enemies: { helmfisch: 3, aal: 2 } },
    { id: 'p3_ufer_2', x: 120, z: 5, level: 16, enemies: { bisam: 3, krebs: 2 } },
    { id: 'p3_bau_1', x: 186, z: -60, level: 17, enemies: { bisam: 3, helmhecht: 2 } },
    { id: 'p3_ufer_3', x: 215, z: 2, level: 17, enemies: { helmhecht: 3, aal: 2 } },
    { id: 'p3_muehle_1', x: 360, z: -20, level: 17, enemies: { ochsenfrosch: 3, aal: 2 }, elite: 'ochsenfrosch' },
    { id: 'p3_muehle_2', x: 480, z: -10, level: 18, enemies: { helmhecht: 3, bisam: 2 } },
    { id: 'p3_muehle_3', x: 510, z: 2, level: 18, enemies: { krebs: 3, aal: 3 } },
    { id: 'p3_wiese', x: 556, z: 100, level: 18, enemies: { bisam: 4 } },
    { id: 'p3_au_1', x: 660, z: -15, level: 19, enemies: { helmhecht: 3, aal: 2 } },
    { id: 'p3_au_2', x: 750, z: -26, level: 19, enemies: { bisam: 3, ochsenfrosch: 2 }, elite: 'bisam' },
    { id: 'p3_au_3', x: 795, z: -58, level: 19, enemies: { aal: 4 } },
    { id: 'p3_au_4', x: 860, z: 10, level: 20, enemies: { krebs: 3, helmhecht: 3 } },
    { id: 'p3_au_5', x: 1008, z: 70, level: 20, enemies: { bisam: 3, aal: 2 } },
    { id: 'p3_au_6', x: 1000, z: 0, level: 21, enemies: { helmhecht: 4, krebs: 2 }, elite: 'helmhecht' },
    { id: 'p3_damm_1', x: 1060, z: -20, level: 21, enemies: { aal: 3, bisam: 3 } },
    { id: 'p3_see_1', x: 1120, z: -25, level: 22, enemies: { helmhecht: 3, ochsenfrosch: 3 } },
    { id: 'p3_see_2', x: 1185, z: -15, level: 22, enemies: { aal: 3, krebs: 3 } },
  ],
  bosses: [
    { id: 'nagezahn', type: 'bauleiter_nagezahn', level: 19, x: 606, z: 10, arena: { x: 600, z: 10, r: 14 }, gate: 'arena_nagezahn' },
    { id: 'flossenbart', type: 'admiral_flossenbart', level: 22, x: 1246, z: -10, arena: { x: 1240, z: -10, r: 18 }, gate: 'arena_flossenbart' },
  ],
  exits: [{ id: 'zum_dorf', x: -4, z: 0, r: 3, to: { map: 'dorf', campfire: 'dorf_platz' } }],
  props: [
    { kind: 'wegweiser', x: 12, z: 6 },
    { kind: 'flugblatt', x: 14, z: -6 },
    { kind: 'flugblatt', x: 575, z: 4 },
    { kind: 'wegweiser', x: 1140, z: -12 },
    { kind: 'flugblatt', x: 1205, z: -24 },
  ],
  start: { campfire: 'k3_ufer' },
};
