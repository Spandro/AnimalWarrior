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

test('maps: Dorf, Kapitel 1 und 2, Kennungen je Art eindeutig (auch über alle Karten)', () => {
  assertEqual(Object.keys(MAPS), ['dorf', 'kapitel1', 'kapitel2']);
  for (const kind of ['campfires', 'spots', 'chests', 'bosses', 'packs']) {
    const ids = Object.values(MAPS).flatMap((m) => (m[kind] || []).map((e) => e.id));
    assertEqual(new Set(ids).size, ids.length, kind);
  }
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

test('maps: mit offenen Toren ist von jedem Lagerfeuer aus alles erreichbar, mit Barrikade nicht die Quelle', () => {
  for (const map of Object.values(MAPS)) {
    for (const fire of map.campfires) {
      const can = reachable(map, fire, () => false);
      for (const kind of ['campfires', 'npcs', 'spots', 'chests', 'packs', 'bosses', 'exits']) {
        for (const e of map[kind] || []) assertTrue(can(e), `${map.id} ab ${fire.id}: ${kind}.${e.id}`);
      }
      for (const b of map.bosses) assertTrue(can(b.arena), `${map.id} ab ${fire.id}: Arena ${b.id}`);
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
      const [lo, hi] = map.id === 'kapitel2' ? [10, 16] : [1, 10];
      assertTrue(p.level >= lo && p.level <= hi, p.id);
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

test('maps: Kapitel 2 „Der Sumpf“ hat die vereinbarten Orte, Gelände und Bosse', () => {
  const k2 = MAPS.kapitel2, ids = (kind) => k2[kind].map((e) => e.id);
  assertEqual([k2.name, k2.chapter], ['Der Sumpf', 2]);
  assertEqual(ids('campfires'), ['k2_rand', 'k2_froschhof', 'k2_nebel', 'k2_hecht']);
  assertEqual(ids('bosses'), ['quak', 'haudrauf']);
  const [quak, hecht] = k2.bosses;
  assertEqual([quak.type, hecht.type], ['hofmarschall_quak', 'hecht_haudrauf']);
  assertTrue(quak.level >= 11 && quak.level <= 13 && hecht.level >= 15 && hecht.level <= 16);
  assertEqual(hecht.bubbleArena, true);
  assertTrue(!quak.bubbleArena);
  assertTrue(ids('npcs').includes('quappe'));
  assertEqual(k2.hazards, { bubbles: { level: 13 } });
  assertTrue(k2.mud.length >= 3 && k2.boardwalks.length >= 3);
  assertTrue(k2.gates.some((g) => g.kind === 'barrier' && g.opensOn?.boss === 'quak'));
  for (const b of k2.bosses) assertTrue(k2.gates.some((g) => g.id === b.gate && g.kind === 'arena'), b.id);
  const len = stripLength(k2.paths[0].points);
  assertTrue(len >= 1100 && len <= 1600, `Länge ${Math.round(len)}`);
  assertTrue(k2.paths.length >= 3);
  assertTrue(k2.areas.length >= 5);
  const kinds = new Set(k2.packs.flatMap((p) => Object.keys(p.enemies)));
  for (const t of ['ochsenfrosch', 'libelle', 'blutegel', 'frosch', 'helmfisch', 'kreuzotter']) assertTrue(kinds.has(t), t);
  assertEqual(k2.exits.map((x) => x.to), [{ map: 'dorf', campfire: 'dorf_platz' }]);
  const dorfExit = MAPS.dorf.exits.find((x) => x.id === 'nach_kapitel2');
  assertEqual(dorfExit.requires, { chapterDone: 1 });
  assertEqual(dorfExit.to, { map: 'kapitel2', campfire: 'k2_rand' });
});

test('maps: Kapitel 2 – Schlamm liegt auf der Karte, Stege führen hindurch', () => {
  const k2 = MAPS.kapitel2, grid = grids.kapitel2;
  const t = mapTerrain(k2, grid, () => false);
  let mud = 0;
  for (const m of k2.mud) if (t.speedFactor(m.points[0][0], m.points[0][1]) < 1) mud++;
  assertTrue(mud >= 3, `${mud}`);
  for (const b of k2.boardwalks) {
    const [x, z] = b.points[0];
    assertTrue(t.walkable(x, z, 'walk') && t.speedFactor(x, z) === 1, `Steg ${x},${z}`);
  }
});

test('maps: Kapitel 2 – ohne Sieg über Quak kommt man nicht ins Nebelmoor', () => {
  const k2 = MAPS.kapitel2;
  const fire = (id) => k2.campfires.find((c) => c.id === id);
  const barrier = k2.gates.find((g) => g.kind === 'barrier').id;
  const blocked = reachable(k2, fire('k2_rand'), (id) => id === barrier);
  assertTrue(blocked(fire('k2_froschhof')));
  assertTrue(!blocked(fire('k2_nebel')));
  assertTrue(!blocked(fire('k2_hecht')));
});

test('maps: jede Bossarena ist mit geschlossenem Tor dicht – kein Lagerfeuer von innen erreichbar', () => {
  for (const map of Object.values(MAPS)) {
    for (const b of map.bosses) {
      // Im Kampf: sein Tor zu, Sperren ebenfalls (sie öffnen erst nach dem Sieg bzw. dem Auftrag).
      const barriers = new Set(map.gates.filter((g) => g.kind === 'barrier').map((g) => g.id));
      const inside = reachable(map, b.arena, (id) => id === b.gate || barriers.has(id));
      for (const fire of map.campfires) assertTrue(!inside(fire), `${map.id}: Arena ${b.id} erreicht ${fire.id}`);
      for (const x of map.exits) assertTrue(!inside(x), `${map.id}: Arena ${b.id} erreicht ${x.id}`);
    }
  }
});
