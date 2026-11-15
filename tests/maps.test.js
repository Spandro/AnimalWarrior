import { test, assertEqual, assertTrue } from './runner.js';
import { MAPS } from '../src/data/maps/index.js';
import { ENEMIES } from '../src/data/enemies.js';
import { buildMapGrid, mapTerrain, inSluice, cellAt, CELL } from '../src/core/mapGrid.js';

const KINDS = ['campfires', 'npcs', 'spots', 'chests', 'packs', 'bosses', 'exits', 'gates', 'areas'];
const grids = Object.fromEntries(Object.values(MAPS).map((m) => [m.id, buildMapGrid(m)]));

function stripLength(points) {
  let n = 0;
  for (let i = 0; i + 1 < points.length; i++) n += Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1]);
  return n;
}

/** Breitensuche über begehbare Zellen; liefert eine Funktion „erreichbar?“. */
function reachable(map, from, closed, grid = grids[map.id]) {
  const terrain = mapTerrain(map, grid, closed);
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

test('maps: Dorf, Kapitel 1 bis 3, Kennungen je Art eindeutig (auch über alle Karten)', () => {
  assertEqual(Object.keys(MAPS), ['dorf', 'kapitel1', 'kapitel2', 'kapitel3']);
  for (const kind of ['campfires', 'spots', 'chests', 'bosses', 'packs', 'sluices']) {
    const ids = Object.values(MAPS).flatMap((m) => (m[kind] || []).map((e) => e.id));
    assertEqual(new Set(ids).size, ids.length, kind);
  }
  for (const [key, map] of Object.entries(MAPS)) {
    assertEqual(map.id, key);
    for (const kind of [...KINDS, 'sluices']) {
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

/** Alle Kombinationen der Hebel-Schleusen einer Karte; Schleusen ohne Hebel (Biber) offen wie nach ihrer Bedingung. */
function sluiceCombos(map) {
  const levers = (map.sluices ?? []).filter((s) => s.lever), fixed = (map.sluices ?? []).filter((s) => !s.lever);
  const out = [];
  for (let bits = 0; bits < 1 << levers.length; bits++) {
    const sw = Object.fromEntries(fixed.map((s) => [s.id, 'open']));
    levers.forEach((s, i) => { sw[s.id] = bits & (1 << i) ? 'open' : 'closed'; });
    out.push(sw);
  }
  return out;
}

test('maps: in jedem Schleusenzustand ist mit offenen Toren von jedem Lagerfeuer aus alles Nötige erreichbar; Kisten und Gruppen in mindestens einem', () => {
  for (const map of Object.values(MAPS)) {
    const someChest = new Set(), somePack = new Set();
    for (const sw of sluiceCombos(map)) {
      const grid = buildMapGrid(map, sw);
      for (const fire of map.campfires) {
        const can = reachable(map, fire, () => false, grid);
        const tag = `${map.id} ${JSON.stringify(sw)} ab ${fire.id}`;
        for (const kind of ['campfires', 'npcs', 'spots', 'bosses', 'exits']) {
          for (const e of map[kind] || []) assertTrue(can(e), `${tag}: ${kind}.${e.id}`);
        }
        for (const b of map.bosses) assertTrue(can(b.arena), `${tag}: Arena ${b.id}`);
        for (const sl of map.sluices ?? []) if (sl.lever) assertTrue(can(sl.lever), `${tag}: Hebel ${sl.id}`);
        for (const c of map.chests) if (can(c)) someChest.add(c.id);
        for (const p of map.packs) if (can(p)) somePack.add(p.id);
      }
    }
    for (const c of map.chests) assertTrue(someChest.has(c.id), `${map.id}: Kiste ${c.id} nie erreichbar`);
    for (const p of map.packs) assertTrue(somePack.has(p.id), `${map.id}: Gruppe ${p.id} nie erreichbar`);
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
      const [lo, hi] = { kapitel2: [10, 16], kapitel3: [16, 22] }[map.id] ?? [1, 10];
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

// ---------------------------------------------------------------- Kapitel 3

test('maps: Kapitel 3 „Der Biberdamm“ hat die vereinbarten Orte, Gelände, Schleusen und Bosse', () => {
  const k3 = MAPS.kapitel3, ids = (kind) => k3[kind].map((e) => e.id);
  assertEqual([k3.name, k3.chapter], ['Der Biberdamm', 3]);
  assertEqual(ids('campfires'), ['k3_ufer', 'k3_muehle', 'k3_auwald', 'k3_stausee']);
  assertEqual(ids('bosses'), ['nagezahn', 'flossenbart']);
  const [nz, fb] = k3.bosses;
  assertEqual([nz.type, fb.type], ['bauleiter_nagezahn', 'admiral_flossenbart']);
  assertTrue(nz.level >= 18 && nz.level <= 20 && fb.level >= 21 && fb.level <= 22);
  for (const area of ['dammufer', 'baustelle', 'stausee']) assertTrue(ids('areas').includes(area), area);
  assertEqual(ids('npcs'), ['rinde', 'nagezahn']);
  assertEqual(k3.npcs[1].requires, { boss: 'nagezahn' });
  assertEqual(ids('sluices'), ['schleuse_nord', 'schleuse_sued', 'schleuse_altarm', 'biberschleuse']);
  const sl = Object.fromEntries(k3.sluices.map((x) => [x.id, x]));
  assertEqual([sl.schleuse_nord.open, sl.schleuse_nord.closed], ['current', 'mud']);
  assertEqual([sl.schleuse_sued.open, sl.schleuse_sued.closed], ['water', 'walk']);
  assertEqual([sl.schleuse_altarm.open, sl.schleuse_altarm.closed], ['water', 'mud']);
  assertEqual([sl.biberschleuse.lever, sl.biberschleuse.closed, sl.biberschleuse.open, sl.biberschleuse.opensOn], [undefined, 'water', 'walk', { quest: 'dammwache', step: 3 }]);
  assertTrue(k3.mud.length >= 1 && k3.currents.length >= 2);
  assertTrue(k3.gates.some((g) => g.kind === 'barrier' && g.opensOn?.boss === 'nagezahn'));
  for (const b of k3.bosses) assertTrue(k3.gates.some((g) => g.id === b.gate && g.kind === 'arena'), b.id);
  const len = stripLength(k3.paths[0].points);
  assertTrue(len >= 1100 && len <= 1600, `Länge ${Math.round(len)}`);
  assertTrue(k3.paths.length >= 3 && k3.areas.length >= 5);
  const kinds = new Set(k3.packs.flatMap((p) => Object.keys(p.enemies)));
  for (const t of ['aal', 'bisam', 'helmhecht', 'helmfisch', 'krebs', 'ochsenfrosch']) assertTrue(kinds.has(t), t);
  assertEqual(k3.exits.map((x) => x.to), [{ map: 'dorf', campfire: 'dorf_platz' }]);
  const dorfExit = MAPS.dorf.exits.find((x) => x.id === 'nach_kapitel3');
  assertEqual([dorfExit.requires, dorfExit.to], [{ chapterDone: 2 }, { map: 'kapitel3', campfire: 'k3_ufer' }]);
});

test('maps: Kapitel 3 – Strömung auf dem Hauptweg; Flossenbarts Arena hat Strömung und trockene Ufer, Nagezahns keine', () => {
  const k3 = MAPS.kapitel3, grid = grids.kapitel3;
  const main = k3.paths[0].points;
  let ford = 0;
  for (let i = 0; i + 1 < main.length; i++) {
    for (let k = 0; k <= 20; k++) {
      const x = main[i][0] + (main[i + 1][0] - main[i][0]) * k / 20, z = main[i][1] + (main[i + 1][1] - main[i][1]) * k / 20;
      if (cellAt(grid, x, z) === CELL.current) ford++;
    }
  }
  assertTrue(ford >= 10, `${ford} Proben auf Strömung`);
  const cells = (b) => {
    const n = { current: 0, dry: 0 };
    for (let x = b.arena.x - b.arena.r; x <= b.arena.x + b.arena.r; x++) for (let z = b.arena.z - b.arena.r; z <= b.arena.z + b.arena.r; z++) {
      if (Math.hypot(x - b.arena.x, z - b.arena.z) > b.arena.r - 1) continue;
      const c = cellAt(grid, x, z);
      if (c === CELL.current) n.current++; else if (c === CELL.walk) n.dry++;
    }
    return n;
  };
  const [nz, fb] = k3.bosses;
  assertEqual(cells(nz).current, 0);
  const f = cells(fb);
  assertTrue(f.current >= 60 && f.dry >= 300, JSON.stringify(f));
});

test('maps: Kapitel 3 – Feuer, Hebel, Leute, Fundorte, Ausgänge, Arenen und Gruppenmitten liegen in keiner Schleusenfläche', () => {
  for (const map of Object.values(MAPS)) {
    for (const kind of ['campfires', 'npcs', 'spots', 'exits', 'packs', 'bosses']) {
      for (const e of map[kind] || []) assertTrue(!inSluice(map, e.x, e.z), `${map.id}.${kind}.${e.id}`);
    }
    for (const b of map.bosses) {
      for (let a = 0; a < 16; a++) {
        const x = b.arena.x + Math.cos(a / 16 * Math.PI * 2) * b.arena.r, z = b.arena.z + Math.sin(a / 16 * Math.PI * 2) * b.arena.r;
        assertTrue(!inSluice(map, x, z) && !inSluice(map, b.arena.x, b.arena.z), `${map.id}: Arena ${b.id}`);
      }
    }
    for (const sl of map.sluices ?? []) if (sl.lever) assertTrue(!inSluice(map, sl.lever.x, sl.lever.z), `${map.id}: Hebel ${sl.id}`);
  }
});

test('maps: Kapitel 3 – ohne die Biber kommt man nicht zum Stausee; geschlossene Seitenschleusen sperren ihre Kisten', () => {
  const k3 = MAPS.kapitel3;
  const fire = (id) => k3.campfires.find((c) => c.id === id);
  const chest = (id) => k3.chests.find((c) => c.id === id);
  const start = { schleuse_nord: 'open', schleuse_sued: 'open', schleuse_altarm: 'open', biberschleuse: 'closed' };
  const can = reachable(k3, fire('k3_ufer'), () => false, buildMapGrid(k3, start));
  assertTrue(can(fire('k3_auwald')));
  assertTrue(!can(fire('k3_stausee')));
  assertTrue(!can(chest('k3_kiste_wiese')) && !can(chest('k3_kiste_altarm')));
  const dry = reachable(k3, fire('k3_ufer'), () => false, buildMapGrid(k3, { ...start, schleuse_sued: 'closed', schleuse_altarm: 'closed' }));
  assertTrue(dry(chest('k3_kiste_wiese')) && dry(chest('k3_kiste_altarm')));
});
