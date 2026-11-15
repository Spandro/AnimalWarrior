// Dorf Bachwinkel: kleiner Platz mit Brunnen, Häuser drumherum, Bach im Norden, Ausgang nach Osten zu Kapitel 1 und
// (nach Kapitel 1) nach Westen in den Sumpf, Kapitel 2.
// Koordinaten in Metern; x nach Osten, z nach Süden (wie in der Welt).

/** @type {import('./index.js').MapDef} */
export const DORF = {
  id: 'dorf',
  name: 'Bachwinkel',
  chapter: 0,
  bounds: { minX: -45, maxX: 65, minZ: -40, maxZ: 40 },
  paths: [
    { points: [[-30, 0], [60, 0]], width: 8 },
    { points: [[0, 0], [0, 22]], width: 6 },
  ],
  clearings: [{ x: 0, z: 0, r: 15 }, { x: 0, z: 22, r: 5 }],
  water: [{ points: [[-45, 31], [0, 30], [65, 33]], width: 6 }],
  bridges: [],
  obstacles: [{ x: 0, z: 0, radius: 1.3, kind: 'rock' }],
  gates: [],
  areas: [{ id: 'dorfplatz', name: 'Bachwinkel', x: 0, z: 0, r: 60 }],
  campfires: [{ id: 'dorf_platz', x: 3, z: 9 }],
  npcs: [
    { id: 'panzerla', x: -6, z: -10, faceX: 1 },
    { id: 'kruemel', x: 11, z: -9, faceX: -1 },
    { id: 'grabowski', x: 10, z: 8, faceX: -1 },
    { id: 'nussa', x: -12, z: 7, faceX: 1 },
    { id: 'pieps', x: -3, z: 20, faceX: 1 },
  ],
  spots: [],
  chests: [],
  packs: [],
  bosses: [],
  exits: [
    { id: 'nach_kapitel1', x: 57, z: 0, r: 3, to: { map: 'kapitel1', campfire: 'k1_ufer' } },
    { id: 'nach_kapitel2', x: -27, z: 0, r: 3, to: { map: 'kapitel2', campfire: 'k2_rand' }, requires: { chapterDone: 1 } },
  ],
  props: [
    { kind: 'haus_oma', x: -7, z: -21 },
    { kind: 'laden', x: 18, z: -18 },
    { kind: 'schmiede', x: 22, z: 17, faceX: -1 },
    { kind: 'wohnhaus', x: -20, z: 17 },
    { kind: 'wohnhaus2', x: -25, z: -14 },
    { kind: 'brunnen', x: 0, z: 0 },
    { kind: 'wegweiser', x: 46, z: -6 },
    { kind: 'zaun', x: 34, z: -7 },
    { kind: 'zaun', x: 34, z: 7 },
    { kind: 'flugblatt', x: 40, z: -6.5 },
    { kind: 'wegweiser', x: -20, z: -6, requires: { chapterDone: 1 } },
  ],
  start: { campfire: 'dorf_platz' },
};
