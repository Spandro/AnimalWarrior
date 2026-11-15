import { test, assertEqual, assertTrue, assertClose } from './runner.js';
import {
  buildMapGrid, cellAt, mapTerrain, borderDecor, createExplored, markExplored, encodeExplored, decodeExplored, CELL,
} from '../src/core/mapGrid.js';
import { createWorld, stepWorld, spawnEnemy, knockback } from '../src/core/world.js';

/** Kleine Testkarte: Weg (0,0)→(40,0) Breite 6, Lichtung r 8 bei (40,0), Bach quer bei x 20, Brücke bei z −2…−0.5. */
const MAP = {
  id: 'test', bounds: { minX: -10, maxX: 60, minZ: -20, maxZ: 20 },
  paths: [{ points: [[0, 0], [40, 0]], width: 6 }],
  clearings: [{ x: 40, z: 0, r: 8 }],
  water: [{ points: [[20, -20], [20, 20]], width: 4 }],
  bridges: [{ points: [[17, -1], [23, -1]], width: 2.4 }],
  obstacles: [{ x: 5, z: 1, radius: 0.7, kind: 'tree' }],
  gates: [{ id: 'tor', points: [[30, -4], [30, 4]] }],
};

const grid = buildMapGrid(MAP);

test('mapGrid: Weg, Rand, Wasser, Brücke und Lichtung im Raster', () => {
  assertEqual(cellAt(grid, 10, 0), CELL.walk);
  assertEqual(cellAt(grid, 10, 5), CELL.blocked);
  assertEqual(cellAt(grid, 20, 2), CELL.water);
  assertEqual(cellAt(grid, 20, 15), CELL.water);
  assertEqual(cellAt(grid, 20, -1), CELL.bridge);
  assertEqual(cellAt(grid, 40, 7), CELL.walk);
  assertEqual(cellAt(grid, 500, 0), CELL.blocked);
});

function heroWorld(x, z, closed = () => false) {
  const world = createWorld({ seed: 1, animalId: 'hase', classId: 'krieger', terrain: mapTerrain(MAP, grid, closed) });
  world.hero.x = x; world.hero.z = z;
  world.hero.abilities = [];
  return world;
}

test('mapGrid: Held gleitet am Wegrand entlang statt stehenzubleiben', () => {
  const world = heroWorld(10, 2.2);
  for (let i = 0; i < 30; i++) stepWorld(world, 1 / 30, { moveX: 1, moveZ: 1 });
  assertTrue(world.hero.z <= 3, `z ${world.hero.z}`);
  assertTrue(world.hero.x > 13, `x ${world.hero.x}`);
});

test('mapGrid: Wasser sperrt Laufende, die Brücke nicht', () => {
  const wet = heroWorld(16, 2);
  for (let i = 0; i < 60; i++) stepWorld(wet, 1 / 30, { moveX: 1, moveZ: 0 });
  assertTrue(wet.hero.x < 18.5, `x ${wet.hero.x}`);
  const dry = heroWorld(16, -1);
  for (let i = 0; i < 60; i++) stepWorld(dry, 1 / 30, { moveX: 1, moveZ: 0 });
  assertTrue(dry.hero.x > 24, `x ${dry.hero.x}`);
});

test('mapGrid: fliegende Gegner dürfen übers Wasser, nicht aus der Karte', () => {
  const t = mapTerrain(MAP, grid, () => false);
  assertTrue(t.walkable(20, 2, 'fly'));
  assertTrue(!t.walkable(20, 2, 'walk'));
  assertTrue(t.walkable(10, 15, 'fly'));
  assertTrue(!t.walkable(500, 0, 'fly'));
  assertTrue(t.walkable(20, 2, 'shot'));
  assertTrue(!t.walkable(10, 15, 'shot'));
});

test('mapGrid: Rückstoß schiebt keinen Gegner über den Rand', () => {
  const world = heroWorld(0, 0);
  const e = spawnEnemy(world, 'ratte', 10, 2);
  knockback(world, e, 5);
  stepWorld(world, 1 / 60, { moveX: 0, moveZ: 0 });
  assertTrue(world.terrain.walkable(e.x, e.z, 'walk'), `${e.x},${e.z}`);
});

test('mapGrid: geschlossenes Tor sperrt, offenes nicht', () => {
  let closed = true;
  const world = heroWorld(26, 0, () => closed);
  for (let i = 0; i < 60; i++) stepWorld(world, 1 / 30, { moveX: 1, moveZ: 0 });
  assertTrue(world.hero.x < 30, `x ${world.hero.x}`);
  closed = false;
  for (let i = 0; i < 60; i++) stepWorld(world, 1 / 30, { moveX: 1, moveZ: 0 });
  assertTrue(world.hero.x > 32, `x ${world.hero.x}`);
});

test('mapGrid: Hindernisse der Karte wirken wie Bäume', () => {
  const t = mapTerrain(MAP, grid, () => false);
  assertEqual(t.obstaclesNear(5, 1, 0.5).length, 1);
  assertEqual(t.obstaclesNear(15, 0, 0.5).length, 0);
});

test('mapGrid: Erkundung hin und zurück, Unsinn ergibt leer', () => {
  const bits = createExplored(grid);
  markExplored(bits, grid, 10, 0, 20);
  const text = encodeExplored(bits);
  assertEqual(Array.from(decodeExplored(text, grid)), Array.from(bits));
  assertTrue(bits.some((b) => b !== 0));
  assertTrue(decodeExplored('%%%Unsinn', grid).every((b) => b === 0));
  assertTrue(decodeExplored('', grid).every((b) => b === 0));
});

test('mapGrid: Randdeko fest je Seed und nie auf begehbaren Zellen', () => {
  const a = borderDecor(grid, 7), b = borderDecor(grid, 7);
  assertEqual(a, b);
  assertTrue(a.length > 0);
  for (const d of a) assertEqual(cellAt(grid, d.x, d.z), CELL.blocked);
});

// ---------------------------------------------------------------- Kapitel 2: Schlamm und Stege

/** Weg (0,0)→(60,0) Breite 8; Schlamm (20,0)→(40,0) Breite 8; Steg (20,−3)→(40,−3) Breite 2; Bach quer bei x 50 mit Steg. */
const MUD_MAP = {
  id: 'sumpftest', bounds: { minX: -10, maxX: 70, minZ: -20, maxZ: 20 },
  paths: [{ points: [[0, 0], [60, 0]], width: 8 }],
  clearings: [],
  water: [{ points: [[50, -20], [50, 20]], width: 4 }],
  mud: [{ points: [[20, 0], [40, 0]], width: 8 }],
  bridges: [],
  boardwalks: [{ points: [[20, -3], [55, -3]], width: 2 }],
  obstacles: [],
  gates: [],
};
const mudGrid = buildMapGrid(MUD_MAP);

function mudWorld(x, z, terrain = mapTerrain(MUD_MAP, mudGrid, () => false)) {
  const world = createWorld({ seed: 1, animalId: 'hase', classId: 'krieger', terrain });
  world.hero.x = x; world.hero.z = z;
  world.hero.abilities = [];
  return world;
}

test('mapGrid: Schlamm und Stege im Raster (Steg über Schlamm und Wasser ist Brücke)', () => {
  assertEqual(CELL.mud, 4);
  assertEqual(cellAt(mudGrid, 30, 2), CELL.mud);
  assertEqual(cellAt(mudGrid, 30, -3), CELL.bridge);
  assertEqual(cellAt(mudGrid, 50, -3), CELL.bridge);
  assertEqual(cellAt(mudGrid, 50, 2), CELL.water);
  assertEqual(cellAt(mudGrid, 10, 0), CELL.walk);
});

test('mapGrid: Schlamm begehbar, Tempo-Faktor 0,65 nur auf Schlamm und nur zu Fuß', async () => {
  const { TERRAIN } = await import('../src/data/adventure.js');
  assertEqual(TERRAIN.mudSpeed, 0.65);
  const t = mapTerrain(MUD_MAP, mudGrid, () => false);
  assertTrue(t.walkable(30, 2, 'walk'));
  assertClose(t.speedFactor(30, 2), 0.65);
  assertClose(t.speedFactor(30, 2, 'walk'), 0.65);
  assertEqual(t.speedFactor(10, 0, 'walk'), 1);
  assertEqual(t.speedFactor(30, -3, 'walk'), 1);
  assertEqual(t.speedFactor(30, 2, 'fly'), 1);
});

test('mapGrid: Held läuft im Schlamm 0,65-mal so weit, auf dem Steg normal', () => {
  const mud = mudWorld(22, 2);
  const speed = mud.hero.stats.moveSpeed;
  for (let i = 0; i < 30; i++) stepWorld(mud, 1 / 30, { moveX: 1, moveZ: 0 });
  assertClose(mud.hero.x - 22, speed * 0.65, 1e-6);
  const plank = mudWorld(22, -3);
  for (let i = 0; i < 30; i++) stepWorld(plank, 1 / 30, { moveX: 1, moveZ: 0 });
  assertClose(plank.hero.x - 22, speed, 1e-6);
});

test('mapGrid: Schlamm bremst Bodengegner, nicht Flieger und nicht „mudproof“', async () => {
  const { ENEMIES } = await import('../src/data/enemies.js');
  const { enemySpeed } = await import('../src/core/world.js');
  const world = mudWorld(0, 0);
  const ratte = spawnEnemy(world, 'ratte', 30, 2);
  const kraehe = spawnEnemy(world, 'kraehe', 30, 2);
  assertClose(enemySpeed(world, ratte), ENEMIES.ratte.speed * 0.65);
  assertClose(enemySpeed(world, kraehe), ENEMIES.kraehe.speed);
  ENEMIES.ratte.mudproof = true;
  try {
    assertClose(enemySpeed(world, ratte), ENEMIES.ratte.speed);
  } finally {
    delete ENEMIES.ratte.mudproof;
  }
});

test('mapGrid: Geländequelle ohne speedFactor → Tempo wie vorher, kein Zufall verbraucht', () => {
  const plain = mapTerrain(MUD_MAP, mudGrid, () => false);
  const noFactor = { obstaclesNear: plain.obstaclesNear, walkable: plain.walkable };
  const a = mudWorld(22, 2, noFactor);
  const speed = a.hero.stats.moveSpeed;
  for (let i = 0; i < 30; i++) stepWorld(a, 1 / 30, { moveX: 1, moveZ: 0 });
  assertClose(a.hero.x - 22, speed, 1e-6);
  const b = mudWorld(22, 2);
  for (let i = 0; i < 30; i++) stepWorld(b, 1 / 30, { moveX: 1, moveZ: 0 });
  assertEqual(a.rng.next(), b.rng.next());
});
