import { test, assertEqual, assertTrue } from './runner.js';
import { MAPS } from '../src/data/maps/index.js';
import { ENEMIES } from '../src/data/enemies.js';
import { buildMapGrid, mapTerrain } from '../src/core/mapGrid.js';

const KINDS = ['campfires', 'npcs', 'spots', 'chests', 'packs', 'bosses', 'exits', 'gates', 'areas'];
const grids = Object.fromEntries(Object.values(MAPS).map((m) => [m.id, buildMapGrid(m)]));

function stripLength(points) {
  let n = 0;
  for (let i = 0; i + 1 < points.length; i++) n += Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
  return n;
}

/** Breitensuche über begehbare Zellen; liefert eine Funktion „erreichbar?“. */
function reachable(map, from, closed) {
  const grid = grids[map.id], terrain = mapTerrain(map, grid, closed);
  const seen = new Uint8Array(grid.cols * grid.rows);
  const toCell = (x, z) => [Math.floor((x - grid.minX) / grid.cell), Math.floor((z - grid.minZ) / grid.cell)];
  const [c0, r0] = toCell(from.x, from.z);
  const queue = [r0 * grid.cols + c0];
  seen[queue[0]] = 1;
  while (queue.length) {
    const i = queue.pop(), c = i % grid.cols, r = (i - c) / grid.cols;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr, j = nr * grid.cols + nc;
      if (nc < 0 || nr < 0 || nc >= grid.cols || nr >= grid.rows || seen[j]) continue;
      if (!terrain.walkable(grid.minX + (nc + 0.5) * grid.cell, grid.minZ + (nr + 0.5) * grid.cell, 'walk')) continue;
      seen[j] = 1; queue.push(j);
    }
  }
  return (p) => { const [c, r] = toCell(p.x, p.z); return seen[r * grid.cols + c] === 1; };
}

test('maps: Dorf und Kapitel 1, Kennungen je Art eindeutig', () => {
  assertEqual(Object.keys(MAPS), ['dorf', 'kapitel1']);
  for (const [key, map] of Object.entries(MAPS)) {
    assertEqual(map.id, key);
    for (const kind of KINDS) {
      const ids = (map[kind] || []).map((e) => e.id);
      assertEqual(new Set(ids).size, ids.length, `${key}.${kind}`);
    }
  }
});

test('maps: Feuer, Leute, Fundorte, Kisten, Gruppen und Bosse liegen auf begehbarer Fläche', () => {
  for (const map of Object.values(MAPS)) {
    const terrain = mapTerrain(map, grids[map.id], () => false);
    for (const kind of ['campfires', 'npcs', 'spots', 'chests', 'packs', 'bosses']) {
      for (const e of map[kind] || []) assertTrue(terrain.walkable(e.x, e.z, 'walk'), `${map.id}.${kind}.${e.id}`);
    }
  }
});

test('maps: mit offenen Toren ist alles vom Start aus erreichbar, mit Barrikade nicht die Quelle', () => {
  for (const map of Object.values(MAPS)) {
    const start = map.campfires.find((c) => c.id === map.start.campfire);
    const can = reachable(map, start, () => false);
    for (const kind of ['campfires', 'npcs', 'spots', 'chests', 'packs', 'bosses', 'exits']) {
      for (const e of map[kind] || []) assertTrue(can(e), `${map.id}.${kind}.${e.id}`);
    }
  }
  const k1 = MAPS.kapitel1;
  const start = k1.campfires.find((c) => c.id === k1.start.campfire);
  const blocked = reachable(k1, start, (id) => id === 'barrikade');
  assertTrue(!blocked(k1.campfires.find((c) => c.id === 'k1_quelle')));
  assertTrue(blocked(k1.campfires.find((c) => c.id === 'k1_bruecke')));
});

test('maps: Hauptweg von Kapitel 1 ist 1.200 bis 1.500 m lang, mindestens zwei Seitenwege', () => {
  const k1 = MAPS.kapitel1;
  const len = stripLength(k1.paths[0].points);
  assertTrue(len >= 1200 && len <= 1500, `Länge ${Math.round(len)}`);
  assertTrue(k1.paths.length >= 3);
});

test('maps: Gruppen mit bekannten Gegnern, 3 bis 8 Tiere, Stufe 1 bis 10; Ausgänge auf bekannte Ziele', () => {
  for (const map of Object.values(MAPS)) {
    for (const p of map.packs) {
      const n = Object.values(p.enemies).reduce((a, b) => a + b, 0);
      assertTrue(n >= 3 && n <= 8, p.id);
      assertTrue(p.level >= 1 && p.level <= 10, p.id);
      for (const type of Object.keys(p.enemies)) assertTrue(Object.hasOwn(ENEMIES, type), `${p.id}: ${type}`);
      if (p.elite) assertTrue(Object.hasOwn(p.enemies, p.elite), p.id);
    }
    for (const x of map.exits) {
      assertTrue(Object.hasOwn(MAPS, x.to.map), x.id);
      assertTrue(MAPS[x.to.map].campfires.some((c) => c.id === x.to.campfire), x.id);
    }
  }
});

test('maps: Kapitel 1 hat die vereinbarten Orte', () => {
  const k1 = MAPS.kapitel1, ids = (kind) => k1[kind].map((e) => e.id);
  assertEqual(ids('areas'), ['bachufer', 'krebslager', 'alte_bruecke', 'muehlenwiese', 'tiefer_wald', 'quellteich']);
  assertEqual(ids('campfires'), ['k1_ufer', 'k1_bruecke', 'k1_wald', 'k1_quelle']);
  assertEqual(ids('bosses'), ['graete', 'zwickzwack']);
  assertEqual(ids('spots').sort(), ['hammer', 'nuss_1', 'nuss_2', 'nuss_3', 'nuss_4', 'nuss_5']);
  assertTrue(ids('npcs').includes('amsel'));
  assertEqual(MAPS.dorf.npcs.map((n) => n.id).sort(), ['grabowski', 'kruemel', 'nussa', 'panzerla', 'pieps']);
  assertEqual(MAPS.dorf.packs.length, 0);
});
