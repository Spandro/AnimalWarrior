// Kapitel 2 „Der Sumpf“: vom Sumpfrand westlich des Dorfs durchs Schilf zum Froschhof (Hofmarschall Quak), durchs
// Nebelmoor über den Steg am Moorbach und den Moorwald bis zum Hechtloch (Hecht Haudrauf). Schlamm bremst, Stege sind
// schnelle Wege, im Schlamm steigen Moorblasen auf. Der erste Weg ist der Hauptweg, die übrigen sind Seitenwege.
// Koordinaten in Metern; x nach Osten, z nach Süden (wie in der Welt).

/** @type {import('./index.js').MapDef} */
export const KAPITEL2 = {
  id: 'kapitel2',
  name: 'Der Sumpf',
  chapter: 2,
  bounds: { minX: -40, maxX: 1300, minZ: -160, maxZ: 160 },
  paths: [
    { points: [[-6, 0], [50, -18], [110, 8], [170, -14], [230, 18], [290, 0], [350, -30], [420, -38], [480, -35], [540, -10],
      [600, 25], [650, 20], [705, -6], [760, -35], [830, -20], [900, 22], [970, 38], [1040, 5], [1100, -28], [1160, -22],
      [1240, -10]], width: 8 },
    { points: [[170, -14], [176, -60], [182, -100]], width: 7 },
    { points: [[600, 25], [618, 70], [636, 108]], width: 6 },
    { points: [[970, 38], [978, 90], [986, 118]], width: 6 },
  ],
  clearings: [
    { x: 4, z: 0, r: 9 },
    { x: 182, z: -112, r: 13 },
    { x: 480, z: -35, r: 14 },
    { x: 638, z: 118, r: 11 },
    { x: 988, z: 126, r: 10 },
    { x: 1240, z: -10, r: 18 },
  ],
  water: [
    { points: [[300, 44], [360, 58]], width: 14 },
    { points: [[747, -160], [747, 160]], width: 6 },
    { points: [[1080, 60], [1130, 80]], width: 16 },
  ],
  mud: [
    { points: [[80, -24], [140, 20]], width: 30 },
    { points: [[200, -128], [208, -112]], width: 8 },
    { points: [[560, -14], [700, 24]], width: 40 },
    { points: [[820, -36], [900, 36]], width: 34 },
    { points: [[1234, -10], [1246, -10]], width: 24 }, // ganz im Arenakreis (r 18), sonst läuft man ums Tor herum
  ],
  bridges: [],
  boardwalks: [
    { points: [[64, -6], [156, -4]], width: 3 },
    { points: [[738, -23.4], [756, -32.9]], width: 5 },
    { points: [[546, 4], [712, 4]], width: 3 },
    { points: [[806, -6], [914, 22]], width: 3 },
  ],
  obstacles: [
    { x: 190, z: -120, radius: 0.9, kind: 'tree' },
    { x: 486, z: -46, radius: 1.0, kind: 'rock' },
    { x: 644, z: 110, radius: 0.8, kind: 'tree' },
    { x: 1250, z: 2, radius: 1.1, kind: 'tree' },
  ],
  gates: [
    { id: 'arena_quak', kind: 'arena', points: [[465, -45], [465, -27]] },
    { id: 'sperre_quak', kind: 'barrier', points: [[497, -37], [497, -19]], opensOn: { boss: 'quak' } },
    { id: 'arena_haudrauf', kind: 'arena', points: [[1221, -21], [1221, -3]] },
  ],
  areas: [
    { id: 'schilfrand', name: 'Schilfrand', x: 120, z: 0, r: 140 },
    { id: 'unkenteich', name: 'Unkenteich', x: 182, z: -105, r: 30 },
    { id: 'froschhof', name: 'Froschhof', x: 440, z: -30, r: 120 },
    { id: 'nebelmoor', name: 'Nebelmoor', x: 690, z: 10, r: 150 },
    { id: 'seerosenbucht', name: 'Seerosenbucht', x: 638, z: 115, r: 25 },
    { id: 'moorwald', name: 'Moorwald', x: 980, z: 20, r: 170 },
    { id: 'hechtloch', name: 'Hechtloch', x: 1215, z: -12, r: 60 },
  ],
  campfires: [
    { id: 'k2_rand', x: 6, z: 3 },
    { id: 'k2_froschhof', x: 410, z: -40 },
    { id: 'k2_nebel', x: 705, z: -6 },
    { id: 'k2_hecht', x: 1150, z: -23 },
  ],
  npcs: [{ id: 'quappe', x: 186, z: -114, faceX: -1 }],
  spots: [
    { id: 'k2_seerose_1', kind: 'seerose', x: 190, z: -104 },
    { id: 'k2_seerose_2', kind: 'seerose', x: 632, z: 116 },
    { id: 'k2_seerose_3', kind: 'seerose', x: 233, z: 16 },
    { id: 'k2_seerose_4', kind: 'seerose', x: 905, z: 26 },
    { id: 'k2_irrlicht_1', kind: 'irrlicht', x: 652, z: 14 },
    { id: 'k2_irrlicht_2', kind: 'irrlicht', x: 842, z: -13 },
    { id: 'k2_irrlicht_3', kind: 'irrlicht', x: 982, z: 124 },
  ],
  chests: [
    { id: 'k2_kiste_teich', x: 176, z: -118, gold: 90 },
    { id: 'k2_kiste_bucht', x: 644, z: 122, gold: 110, pearls: 1 },
    { id: 'k2_kiste_wald', x: 992, z: 130, gold: 130, pearls: 1 },
  ],
  packs: [
    { id: 'p2_rand_1', x: 50, z: -18, level: 10, enemies: { ochsenfrosch: 2, frosch: 2 } },
    { id: 'p2_rand_2', x: 110, z: 8, level: 10, enemies: { helmfisch: 3, libelle: 2 } },
    { id: 'p2_rand_3', x: 176, z: -60, level: 11, enemies: { blutegel: 3, frosch: 2 } },
    { id: 'p2_teich', x: 230, z: 18, level: 11, enemies: { ochsenfrosch: 3, helmfisch: 2 } },
    { id: 'p2_schilf_1', x: 290, z: 0, level: 11, enemies: { libelle: 3, kreuzotter: 2 } },
    { id: 'p2_schilf_2', x: 350, z: -30, level: 12, enemies: { ochsenfrosch: 3, blutegel: 2 }, elite: 'ochsenfrosch' },
    { id: 'p2_hof_1', x: 445, z: -36, level: 12, enemies: { frosch: 3, ochsenfrosch: 2 } },
    { id: 'p2_nebel_1', x: 560, z: 2, level: 13, enemies: { blutegel: 3, libelle: 2 } },
    { id: 'p2_nebel_2', x: 600, z: 25, level: 13, enemies: { ochsenfrosch: 3, kreuzotter: 2 } },
    { id: 'p2_bucht', x: 632, z: 100, level: 13, enemies: { libelle: 4 } },
    { id: 'p2_nebel_3', x: 650, z: 20, level: 14, enemies: { helmfisch: 4, blutegel: 2 }, elite: 'blutegel' },
    { id: 'p2_nebel_4', x: 775, z: -31, level: 14, enemies: { ochsenfrosch: 3, libelle: 2 } },
    { id: 'p2_wald_1', x: 830, z: -20, level: 14, enemies: { kreuzotter: 3, frosch: 3 } },
    { id: 'p2_wald_2', x: 900, z: 22, level: 15, enemies: { ochsenfrosch: 4, blutegel: 2 } },
    { id: 'p2_wald_3', x: 978, z: 90, level: 15, enemies: { libelle: 3, kreuzotter: 2 } },
    { id: 'p2_wald_4', x: 1040, z: 5, level: 15, enemies: { helmfisch: 4, ochsenfrosch: 2 }, elite: 'ochsenfrosch' },
    { id: 'p2_hecht_1', x: 1100, z: -28, level: 16, enemies: { blutegel: 3, libelle: 3 } },
    { id: 'p2_hecht_2', x: 1185, z: -18, level: 16, enemies: { ochsenfrosch: 3, helmfisch: 3 } },
  ],
  bosses: [
    { id: 'quak', type: 'hofmarschall_quak', level: 12, x: 486, z: -35, arena: { x: 480, z: -35, r: 14 }, gate: 'arena_quak' },
    { id: 'haudrauf', type: 'hecht_haudrauf', level: 16, x: 1246, z: -10, arena: { x: 1240, z: -10, r: 18 }, gate: 'arena_haudrauf', bubbleArena: true },
  ],
  exits: [{ id: 'zum_dorf', x: -4, z: 0, r: 3, to: { map: 'dorf', campfire: 'dorf_platz' } }],
  props: [
    { kind: 'wegweiser', x: 12, z: 6 },
    { kind: 'flugblatt', x: 14, z: -6 },
    { kind: 'flugblatt', x: 470, z: -24 },
    { kind: 'kroenungsschild', x: 426, z: -45 }, // Krönungsschild der Frösche am Eingang zum Froschhof
    { kind: 'wegweiser', x: 700, z: -12 },
    { kind: 'flugblatt', x: 1205, z: -24 },
  ],
  start: { campfire: 'k2_rand' },
  hazards: { bubbles: { level: 13 } },
};
