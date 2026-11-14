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
