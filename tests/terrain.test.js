import { test, assertEqual, assertTrue } from './runner.js';
import { obstaclesInCell, obstaclesNear } from '../src/core/terrain.js';
import { TERRAIN_CELL, MAX_OBSTACLES_PER_CELL, START_CLEAR_RADIUS } from '../src/data/terrain.js';

test('terrain: gleiche Eingabe liefert gleiche Hindernisse', () => {
  assertEqual(obstaclesInCell(42, 3, -2), obstaclesInCell(42, 3, -2));
  assertEqual(obstaclesInCell(42, 3, -2), JSON.parse(JSON.stringify(obstaclesInCell(42, 3, -2))));
});

test('terrain: Zelle (0,0) ist leer, andere Zellen haben 0 bis 3 Hindernisse innerhalb der Zelle', () => {
  for (const seed of [1, 2, 99]) assertEqual(obstaclesInCell(seed, 0, 0), []);
  let total = 0;
  for (let cx = -5; cx <= 5; cx++) for (let cz = -5; cz <= 5; cz++) {
    const list = obstaclesInCell(7, cx, cz);
    assertTrue(list.length <= MAX_OBSTACLES_PER_CELL);
    total += list.length;
    for (const o of list) {
      assertTrue(o.x >= cx * TERRAIN_CELL && o.x < (cx + 1) * TERRAIN_CELL);
      assertTrue(o.z >= cz * TERRAIN_CELL && o.z < (cz + 1) * TERRAIN_CELL);
      assertTrue(o.kind === 'tree' || o.kind === 'rock');
    }
  }
  assertTrue(total > 0);
});

test('terrain: verschiedene Seeds ergeben verschiedenes Gelände', () => {
  assertTrue(JSON.stringify(obstaclesNear(1, 50, 50, 40)) !== JSON.stringify(obstaclesNear(2, 50, 50, 40)));
});

test('terrain: obstaclesNear liefert nur Hindernisse im Bereich und alle davon', () => {
  const seed = 5, x = 20, z = -10, range = 12;
  const near = obstaclesNear(seed, x, z, range);
  assertTrue(near.length > 0);
  for (const o of near) assertTrue(Math.hypot(o.x - x, o.z - z) <= range + o.radius);
  // Gegenprobe: alle Hindernisse der umliegenden Zellen, die im Bereich liegen, sind enthalten
  let expected = 0;
  for (let cx = -3; cx <= 4; cx++) for (let cz = -4; cz <= 3; cz++) {
    for (const o of obstaclesInCell(seed, cx, cz)) if (Math.hypot(o.x - x, o.z - z) <= range + o.radius) expected++;
  }
  assertEqual(near.length, expected);
});

test('terrain: kein Hindernis ragt in den Startradius um den Ursprung', () => {
  for (const seed of [1, 2, 3, 7, 42, 99, 1234, 98765]) {
    for (const o of obstaclesNear(seed, 0, 0, START_CLEAR_RADIUS + 5)) {
      assertTrue(Math.hypot(o.x, o.z) - o.radius >= START_CLEAR_RADIUS);
    }
  }
});
