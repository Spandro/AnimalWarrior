import { test, assertEqual, assertTrue, assertClose } from './runner.js';
import { createWorld, stepWorld, spawnEnemy, enemySpeed, flowAt } from '../src/core/world.js';
import { buildMapGrid, mapTerrain, cellAt, CELL } from '../src/core/mapGrid.js';
import { TERRAIN } from '../src/data/adventure.js';
import { ENEMIES } from '../src/data/enemies.js';

const still = { moveX: 0, moveZ: 0 };

// ---------------------------------------------------------------- Strömung (Task 1)

/** Fluss: erst nach Osten (z = 0), dann ab x = 20 nach Süden; Wasser nördlich bei z = −12, Steg quer bei x = −20. */
const RIVER = {
  id: 'fluss', bounds: { minX: -40, maxX: 40, minZ: -40, maxZ: 40 }, paths: [], clearings: [{ x: 0, z: 0, r: 30 }],
  water: [{ points: [[-30, -12], [30, -12]], width: 6 }], bridges: [], obstacles: [],
  currents: [{ points: [[-30, 0], [20, 0], [20, 30]], width: 8 }],
  boardwalks: [{ points: [[-20, -5], [-20, 5]], width: 3 }],
  gates: [{ id: 'tor', kind: 'barrier', points: [[10, -4], [10, 4]] }],
};

function riverWorld(x, z, { gateClosed = false } = {}) {
  const grid = buildMapGrid(RIVER);
  const w = createWorld({ seed: 3, animalId: 'hase', classId: 'krieger', terrain: mapTerrain(RIVER, grid, () => gateClosed) });
  w.hero.abilities = [];
  w.hero.x = x; w.hero.z = z;
  return w;
}

test('dam: Strömung im Raster mit Richtung je Abschnitt; Steg darüber ohne Schub', () => {
  assertEqual(CELL.current, 5);
  const grid = buildMapGrid(RIVER);
  assertEqual(cellAt(grid, 0, 2), CELL.current);
  assertEqual(cellAt(grid, -20, 0), CELL.bridge);
  const t = mapTerrain(RIVER, grid, () => false);
  assertEqual(t.flowAt(0, 30), null);
  assertEqual(t.flowAt(-20, 0), null);
  const east = t.flowAt(0, 1);
  assertClose(east.x, TERRAIN.currentSpeed); assertClose(east.z, 0);
  const south = t.flowAt(21, 20);
  assertClose(south.x, 0); assertClose(south.z, TERRAIN.currentSpeed);
  assertTrue(t.walkable(0, 1, 'walk'));
  assertEqual(t.speedFactor(0, 1, 'walk'), 1);
  assertEqual(TERRAIN.currentSpeed, 2.5);
});

test('dam: stiller Held treibt mit min(2,5, Tempo − 1) ab', () => {
  const w = riverWorld(-10, 0);
  const speed = w.hero.stats.moveSpeed;
  for (let i = 0; i < 30; i++) stepWorld(w, 1 / 30, still);
  assertClose(w.hero.x + 10, Math.min(2.5, speed - TERRAIN.heroHeadway), 1e-6);
  assertClose(w.hero.z, 0, 1e-9);
});

test('dam: gebremster Held kommt gegen die Strömung mit mindestens 1 m/s voran', () => {
  const w = riverWorld(0, 0);
  w.hero.stats.moveSpeed = 2.2;
  w.hero.slowUntil = 99; w.hero.slowFactor = 0.4; // 1,32 m/s wirksam
  for (let i = 0; i < 60; i++) stepWorld(w, 1 / 60, { moveX: -1, moveZ: 0 });
  assertClose(w.hero.x, -TERRAIN.heroHeadway, 1e-6);
  // noch langsamer als 1 m/s: kein Schub, er kommt mit eigenem Tempo voran
  const v = riverWorld(0, 0);
  v.hero.stats.moveSpeed = 0.8;
  for (let i = 0; i < 60; i++) stepWorld(v, 1 / 60, { moveX: -1, moveZ: 0 });
  assertClose(v.hero.x, -0.8, 1e-6);
});

test('dam: Strömung schiebt nicht durch ein geschlossenes Tor und nicht ins Wasser', () => {
  const w = riverWorld(7, 0, { gateClosed: true });
  for (let i = 0; i < 180; i++) stepWorld(w, 1 / 60, still);
  assertTrue(w.hero.x < 10, `x ${w.hero.x}`);
  const grid = buildMapGrid(RIVER);
  const v = riverWorld(15, 0);
  const e = spawnEnemy(v, 'krebs', 19, 25);
  for (let i = 0; i < 600; i++) stepWorld(v, 1 / 60, still);
  for (const p of [v.hero, e]) assertTrue(cellAt(grid, p.x, p.z) !== CELL.water && cellAt(grid, p.x, p.z) !== CELL.blocked, `${p.x},${p.z}`);
});

test('dam: Flieger und Schwimmer treibt die Strömung nicht ab, Schwimmer sind darin schneller', () => {
  const w = riverWorld(-35, 30);
  const lib = spawnEnemy(w, 'libelle', -10, 0);
  lib.passive = true;
  const krebs = spawnEnemy(w, 'krebs', -12, 2);
  krebs.passive = true;
  stepWorld(w, 1, still);
  assertTrue(Math.abs(lib.x + 10) < 1.5, 'Libelle bleibt (nur eigenes Umherstreifen)');
  assertClose(krebs.x + 12, TERRAIN.currentSpeed * 1, 0.5);
  const fake = { id: 'fisch', ...ENEMIES.helmfisch, swimmer: { speedMul: 1.6 } };
  ENEMIES.__schwimmer = fake;
  try {
    const s = spawnEnemy(w, '__schwimmer', -5, 0);
    s.passive = true;
    assertClose(enemySpeed(w, s), fake.speed * 1.6);
    const x0 = s.x;
    stepWorld(w, 0.5, still);
    assertTrue(Math.abs(s.x - x0) < 0.5, 'nicht geschoben');
    s.x = 0; s.z = 30;
    assertClose(enemySpeed(w, s), fake.speed);
  } finally { delete ENEMIES.__schwimmer; }
});

test('dam: Geschosse fliegen gerade über die Strömung', () => {
  const w = riverWorld(-35, 30);
  w.enemyProjectiles.push({ x: 0, z: -3, dirX: 0, dirZ: 1, speed: 6, radius: 0.3, damage: 1, timeLeft: 2 });
  stepWorld(w, 1, still);
  assertClose(w.enemyProjectiles[0].x, 0); assertClose(w.enemyProjectiles[0].z, 3);
});

test('dam: gedrehte Strömung wirkt nur im Kreis, auch dort mit mindestens 1 m/s Vorankommen', () => {
  const w = riverWorld(-10, 0);
  w.flowTurned = { x: -10, z: 0, r: 5 };
  assertClose(flowAt(w, -10, 0).x, -TERRAIN.currentSpeed);
  assertClose(flowAt(w, 0, 0).x, TERRAIN.currentSpeed);
  assertEqual(flowAt(w, 0, 30), null);
  w.hero.stats.moveSpeed = 1.5;
  for (let i = 0; i < 30; i++) stepWorld(w, 1 / 60, { moveX: 1, moveZ: 0 });
  assertClose(w.hero.x + 10, 0.5 * TERRAIN.heroHeadway, 1e-6);
});

test('dam: Geländequelle ohne flowAt schiebt nichts', () => {
  const w = createWorld({ seed: 3, animalId: 'hase', classId: 'krieger' });
  assertEqual(flowAt(w, 0, 0), null);
});
