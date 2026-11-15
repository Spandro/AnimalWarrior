import { test, assertEqual, assertTrue, assertClose } from './runner.js';
import { createWorld, stepWorld, spawnEnemy, enemySpeed } from '../src/core/world.js';
import { buildMapGrid, mapTerrain } from '../src/core/mapGrid.js';
import { ENEMIES, BOSS_MOVES, POUNCE } from '../src/data/enemies.js';

const still = { moveX: 0, moveZ: 0 };
const NEW = ['ochsenfrosch', 'libelle', 'blutegel', 'kaulquappe', 'hofmarschall_quak', 'hecht_haudrauf'];

/** Welt ohne Hindernisse; Held bei (0,0), träge Fähigkeiten aus. */
function world(seed = 5) {
  const w = createWorld({ seed, animalId: 'hase', classId: 'krieger' });
  w.terrain = { obstaclesNear: () => [], walkable: () => true };
  w.hero.abilities = [];
  w.hero.stats.dodge = 0;
  return w;
}

test('swamp: alle neuen Gegner gibt es nur im Abenteuer', async () => {
  const { unlockMinute, BOSS_POOL } = await import('../src/data/waves.js');
  for (const id of NEW) {
    assertTrue(!!ENEMIES[id], id);
    assertTrue(ENEMIES[id].adventureOnly === true, id);
    assertTrue(!Object.hasOwn(unlockMinute, id) && !BOSS_POOL.includes(id), id);
  }
  assertTrue(ENEMIES.ochsenfrosch.hp >= 1.8 * ENEMIES.frosch.hp, 'zäh');
  assertEqual(ENEMIES.libelle.flying, true);
  assertEqual(ENEMIES.libelle.behavior, 'circle');
  assertEqual(ENEMIES.blutegel.behavior, 'chase');
  assertEqual(ENEMIES.blutegel.leech, { slow: 0.4, seconds: 1.5, healPct: 0.1 });
  assertEqual(ENEMIES.hecht_haudrauf.mudproof, true);
  assertEqual(BOSS_MOVES.hofmarschall_quak.summon, { every: 20, type: 'kaulquappe', count: 4, radius: 3 });
});

test('swamp: Ochsenfrosch duckt sich schon ab seiner Sprungweite (weiter als der Frosch)', () => {
  const range = ENEMIES.ochsenfrosch.pounceRange;
  assertTrue(range > POUNCE.engageRange);
  const w = world();
  const e = spawnEnemy(w, 'ochsenfrosch', range - 0.3, 0);
  stepWorld(w, 1 / 60, still);
  assertEqual(e.ai.phase, 'crouch');
  const f = spawnEnemy(w, 'frosch', 0, range - 0.3);
  stepWorld(w, 1 / 60, still);
  assertTrue(f.ai.phase !== 'crouch');
});

test('swamp: Schlamm bremst weder Libelle noch Hecht Haudrauf, wohl aber den Blutegel', () => {
  const map = {
    id: 'm', bounds: { minX: -20, maxX: 20, minZ: -20, maxZ: 20 }, paths: [], clearings: [{ x: 0, z: 0, r: 15 }],
    water: [], bridges: [], mud: [{ points: [[-10, 0], [10, 0]], width: 10 }], obstacles: [], gates: [],
  };
  const w = createWorld({ seed: 1, animalId: 'hase', classId: 'krieger', terrain: mapTerrain(map, buildMapGrid(map), () => false) });
  const lib = spawnEnemy(w, 'libelle', 3, 0), hecht = spawnEnemy(w, 'hecht_haudrauf', -3, 0), egel = spawnEnemy(w, 'blutegel', 5, 1);
  assertClose(enemySpeed(w, lib), ENEMIES.libelle.speed);
  assertClose(enemySpeed(w, hecht), ENEMIES.hecht_haudrauf.speed);
  assertClose(enemySpeed(w, egel), ENEMIES.blutegel.speed * 0.65);
});

test('swamp: Egel-Treffer bremst den Helden 1,5 s und heilt den Egel', () => {
  const w = world();
  const e = spawnEnemy(w, 'blutegel', 0.9, 0);
  e.hp = e.maxHp / 2;
  stepWorld(w, 1 / 60, still);
  assertTrue(w.hero.hp < w.hero.stats.maxHp, 'getroffen');
  assertClose(e.hp, e.maxHp / 2 + e.maxHp * 0.1, 1e-9);
  assertClose(w.hero.slowUntil, w.time + 1.5, 1e-9);
  assertEqual(w.hero.slowFactor, 0.4);
  // Heldentempo × 0,6, solange gebremst
  w.enemies = [];
  const x0 = w.hero.x, speed = w.hero.stats.moveSpeed;
  stepWorld(w, 0.1, { moveX: -1, moveZ: 0 });
  assertClose(x0 - w.hero.x, speed * 0.6 * 0.1, 1e-9);
  w.time += 2;
  const x1 = w.hero.x;
  stepWorld(w, 0.1, { moveX: -1, moveZ: 0 });
  assertClose(x1 - w.hero.x, speed * 0.1, 1e-9);
});

test('swamp: Egel heilt höchstens bis zum vollen Leben', () => {
  const w = world();
  const e = spawnEnemy(w, 'blutegel', 0.9, 0);
  e.hp = e.maxHp - 0.5;
  stepWorld(w, 1 / 60, still);
  assertEqual(e.hp, e.maxHp);
});

test('swamp: Hofmarschall Quak ruft Kaulquappen', () => {
  const w = world();
  w.hero.hp = 1e9;
  const boss = spawnEnemy(w, 'hofmarschall_quak', 30, 0);
  let summoned = null;
  for (let i = 0; i < 21 * 30 && !summoned; i++) {
    stepWorld(w, 1 / 30, still);
    w.hero.hp = 1e9;
    summoned = w.events.find((e) => e.type === 'bossSummon') ?? null;
  }
  assertTrue(!!summoned, 'Ruf');
  assertEqual(summoned.ids.length, 4);
  assertEqual(w.enemies.filter((e) => e.type === 'kaulquappe').length, 4);
  assertTrue(boss.hp > 0);
});

test('swamp: Hecht Haudrauf kündigt 4 Moorblasen an und trifft nur im Kreis', () => {
  const run = (heroInside) => {
    const w = world(9);
    w.hero.hp = 1e6; w.hero.stats.maxHp = 1e6;
    const boss = spawnEnemy(w, 'hecht_haudrauf', 20, 0);
    boss.speed = 0;
    let tele = null;
    for (let i = 0; i < 10 * 60 && !tele; i++) {
      stepWorld(w, 1 / 60, still);
      tele = w.events.find((e) => e.type === 'bossTelegraph' && e.kind === 'bubbles') ?? null;
    }
    assertTrue(!!tele, 'Ankündigung');
    assertEqual(tele.points.length, 4);
    assertEqual(tele.radius, 1.8);
    assertClose(tele.delay, 1.2);
    for (const p of tele.points) assertTrue(Math.hypot(p.x - w.hero.x, p.z - w.hero.z) <= 5 + 1e-9);
    if (!heroInside) {
      // Held an eine Stelle, die kein Kreis erfasst
      let spot = null;
      for (let a = 0; a < 64 && !spot; a++) {
        const x = Math.cos(a) * 9, z = Math.sin(a) * 9;
        if (tele.points.every((p) => Math.hypot(p.x - x, p.z - z) > tele.radius + 0.5)) spot = { x, z };
      }
      w.hero.x = spot.x; w.hero.z = spot.z;
    } else {
      w.hero.x = tele.points[2].x; w.hero.z = tele.points[2].z;
    }
    const hp = w.hero.hp;
    for (let i = 0; i < 1.3 * 60; i++) stepWorld(w, 1 / 60, still);
    return hp - w.hero.hp;
  };
  assertTrue(run(true) > 0, 'im Kreis getroffen');
  assertEqual(run(false), 0);
});
