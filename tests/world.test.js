import { test, assertEqual, assertClose, assertTrue } from './runner.js';
import { createWorld, stepWorld, spawnEnemy, damageEnemy, damageHero, recomputeHeroStats, isCurled, giveShield } from '../src/core/world.js';
import { obstaclesInCell, obstaclesNear } from '../src/core/terrain.js';
import { DROPS, ELITE, ENEMIES, CURL } from '../src/data/enemies.js';

const NONE = { moveX: 0, moveZ: 0 };
/** Seed, dessen Gelände um den Startpunkt frei ist (damit Laufstrecken nicht durch Hindernisse gestört werden). */
function clearSeed() {
  for (let s = 1; s < 1000; s++) if (obstaclesNear(s, 3, 3, 8).length === 0) return s;
  throw new Error('kein freier Seed');
}
function run(world, seconds, dt, input) {
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) stepWorld(world, dt, input);
}
/** Welt ohne Heldenfähigkeiten, damit automatisch geworfene Dolche die Bewegungstests nicht stören. */
function newWorld(extra = {}) {
  const w = createWorld({ seed: clearSeed(), animalId: 'ente', classId: 'dieb', ...extra });
  w.hero.abilities = [];
  return w;
}

test('world: createWorld liefert Held mit Startfähigkeit und vollem Leben', () => {
  const w = createWorld({ seed: 1, animalId: 'hase', classId: 'magier' });
  assertEqual(w.hero.abilities, [{ id: 'feuerball', level: 1, cooldownLeft: 0 }]);
  assertEqual(w.hero.hp, w.hero.stats.maxHp);
  assertEqual(w.run, { level: 1, xp: 0, kills: 0, gold: 0, bonuses: {}, damageByAbility: {}, revivesLeft: 0 });
  assertEqual(w.enemies, []);
});

test('world: nach 1 s nach rechts ist hero.x ungefähr moveSpeed', () => {
  const w = newWorld();
  run(w, 1, 0.1, { moveX: 1, moveZ: 0 });
  assertClose(w.hero.x, w.hero.stats.moveSpeed, 1e-6);
  assertEqual(w.hero.facing, { x: 1, z: 0 });
});

test('world: diagonale Eingabe legt dieselbe Strecke zurück', () => {
  const w = newWorld();
  run(w, 1, 0.1, { moveX: 1, moveZ: 1 });
  assertClose(Math.hypot(w.hero.x, w.hero.z), w.hero.stats.moveSpeed, 1e-6);
});

test('world: ohne Eingabe bleibt facing erhalten', () => {
  const w = newWorld();
  stepWorld(w, 0.1, { moveX: 0, moveZ: -1 });
  stepWorld(w, 0.1, NONE);
  assertEqual(w.hero.facing, { x: 0, z: -1 });
});

test('world: Held bleibt außerhalb eines Hindernisses', () => {
  let seed = 1, obstacle;
  for (; seed < 200; seed++) { obstacle = obstaclesInCell(seed, 1, 0)[0]; if (obstacle) break; }
  const w = createWorld({ seed, animalId: 'ente', classId: 'dieb' });
  w.hero.x = obstacle.x - 3; w.hero.z = obstacle.z;
  for (let i = 0; i < 60; i++) {
    stepWorld(w, 0.05, { moveX: 1, moveZ: 0 });
    assertTrue(Math.hypot(w.hero.x - obstacle.x, w.hero.z - obstacle.z) >= obstacle.radius + w.hero.radius - 1e-6);
  }
});

test('world: Ratte nähert sich dem Helden', () => {
  const w = newWorld();
  const rat = spawnEnemy(w, 'ratte', 10, 0);
  run(w, 1, 0.1, NONE);
  assertClose(rat.x, 10 - ENEMIES.ratte.speed, 1e-6);
});

test('world: spawnEnemy setzt Werte, Elite ist stärker und größer', () => {
  const w = newWorld();
  const e = spawnEnemy(w, 'wolf', 5, 5, { elite: true, hpMul: 2, dmgMul: 1.5 });
  assertEqual(e.maxHp, 45 * 2 * ELITE.hpMul);
  assertEqual(e.hp, e.maxHp);
  assertClose(e.damage, 12 * 1.5);
  assertClose(e.radius, 0.5 * ELITE.scale);
  assertTrue(e.elite && !e.boss);
  assertTrue(spawnEnemy(w, 'baer', 0, 0).boss);
  assertTrue(spawnEnemy(w, 'ratte', 0, 0).id !== e.id);
});

test('world: Berührung schadet höchstens einmal je 0,5 s', () => {
  const w = newWorld({ animalId: 'waschbaer' }); // keine Regeneration
  spawnEnemy(w, 'ratte', 0, 0);
  const hp0 = w.hero.hp;
  let hits = 0;
  for (let i = 0; i < 4; i++) { stepWorld(w, 0.25, NONE); hits += w.events.filter((e) => e.type === 'heroHit').length; }
  assertEqual(hits, 2);
  assertEqual(w.hero.hp, hp0 - 2 * ENEMIES.ratte.damage);
});

test('world: Unverwundbarkeit verhindert Heldenschaden', () => {
  const w = newWorld();
  w.hero.invulnerableUntil = 5;
  const hp0 = w.hero.hp;
  damageHero(w, 10);
  assertEqual(w.hero.hp, hp0);
  w.time = 5;
  damageHero(w, 10);
  assertEqual(w.hero.hp, hp0 - 10);
});

test('world: Ausweichen meldet dodge ohne Schaden', () => {
  const w = newWorld();
  w.hero.stats = { ...w.hero.stats, dodge: 1 };
  const hp0 = w.hero.hp;
  damageHero(w, 10);
  assertEqual(w.hero.hp, hp0);
  assertEqual(w.events, [{ type: 'dodge' }]);
});

const noDrops = () => ({ chance: () => false, int: () => 1 });

test('world: tödlicher Treffer zählt kills, legt xp ab und meldet kill', () => {
  const w = newWorld();
  w.rng = noDrops();
  const rat = spawnEnemy(w, 'ratte', 7, 8);
  damageEnemy(w, rat, { amount: 10, crit: false }, 'schwerthieb');
  assertEqual(w.run.kills, 1);
  assertEqual(w.enemies, []);
  assertEqual(w.pickups, [{ kind: 'xp', x: 7, z: 8, value: ENEMIES.ratte.xp }]);
  assertEqual(w.run.damageByAbility, { schwerthieb: 10 });
  assertEqual(w.events, [
    { type: 'hit', x: 7, z: 8, amount: 10, crit: false },
    { type: 'kill', enemyType: 'ratte', x: 7, z: 8, id: rat.id, elite: false, boss: false, packId: null, bossId: null },
  ]);
});

test('world: nicht tödlicher Treffer lässt Gegner leben', () => {
  const w = newWorld();
  const wolf = spawnEnemy(w, 'wolf', 3, 3);
  damageEnemy(w, wolf, { amount: 5, crit: true }, 'feuerball');
  assertEqual(w.enemies.length, 1);
  assertEqual(wolf.hp, 40);
  assertEqual(w.run.kills, 0);
});

test('world: Gold- und Trankdrops folgen den Wahrscheinlichkeiten', () => {
  const w = newWorld();
  w.rng = { chance: () => true, int: () => 2 };
  damageEnemy(w, spawnEnemy(w, 'ratte', 0, 0), { amount: 99, crit: false }, 'x');
  assertEqual(w.pickups.map((p) => p.kind), ['xp', 'gold', 'potion']);
  assertEqual(w.pickups[1].value, 2);
  assertEqual(w.pickups[2].value, DROPS.potionHeal);
});

test('world: getöteter Elite legt chest ab und mehr xp', () => {
  const w = newWorld();
  w.rng = noDrops();
  damageEnemy(w, spawnEnemy(w, 'ratte', 1, 1, { elite: true }), { amount: 9999, crit: false }, 'x');
  assertEqual(w.pickups.map((p) => p.kind), ['xp', 'chest']);
  assertEqual(w.pickups[0].value, ENEMIES.ratte.xp * ELITE.xpMul);
  assertEqual(w.pickups[1].value, DROPS.chestGold);
});

test('world: xp-Aufsammeln erhöht run.xp um value × xpGain', () => {
  const w = newWorld({ modifiers: [{ stat: 'xpGain', pct: 0.5 }] });
  w.pickups.push({ kind: 'xp', x: 1, z: 0, value: 4 }, { kind: 'xp', x: 50, z: 0, value: 4 });
  stepWorld(w, 0.1, NONE);
  assertClose(w.run.xp, 4 * 1.5);
  assertEqual(w.pickups.length, 1); // das ferne bleibt liegen
  assertEqual(w.events, [{ type: 'pickup', kind: 'xp', value: 4 }]);
});

test('world: Gold-Aufsammeln erhöht run.gold um value × goldGain', () => {
  const w = createWorld({ seed: clearSeed(), animalId: 'waschbaer', classId: 'dieb' });
  w.pickups.push({ kind: 'gold', x: 1, z: 0, value: 2 });
  stepWorld(w, 0.1, NONE);
  assertClose(w.run.gold, 2 * 1.2);
});

test('world: Trank heilt 20 % und nie über maxHp', () => {
  const w = newWorld();
  const max = w.hero.stats.maxHp;
  w.hero.hp = 10;
  w.pickups.push({ kind: 'potion', x: 0, z: 0, value: DROPS.potionHeal });
  stepWorld(w, 0.01, NONE);
  assertClose(w.hero.hp, 10 + max * 0.2, 0.05);
  w.hero.hp = max - 1;
  w.pickups.push({ kind: 'potion', x: 0, z: 0, value: DROPS.potionHeal });
  stepWorld(w, 0.01, NONE);
  assertTrue(w.hero.hp <= max);
  assertClose(w.hero.hp, max, 0.05);
});

test('world: Truhe wird eingesammelt und gemeldet, ohne Belohnung', () => {
  const w = newWorld();
  w.pickups.push({ kind: 'chest', x: 0, z: 0, value: 25 });
  stepWorld(w, 0.1, NONE);
  assertEqual(w.pickups, []);
  assertEqual(w.run.gold, 0);
  assertEqual(w.events, [{ type: 'pickup', kind: 'chest', value: 25 }]);
});

test('world: Ente regeneriert 1 Leben pro Sekunde, nie über maxHp', () => {
  const w = newWorld();
  w.hero.hp = 100;
  run(w, 1, 0.5, NONE);
  assertClose(w.hero.hp, 101, 1e-6);
  w.hero.hp = w.hero.stats.maxHp - 0.2;
  run(w, 1, 0.5, NONE);
  assertEqual(w.hero.hp, w.hero.stats.maxHp);
});

test('world: Stärkung läuft ab und Werte werden neu berechnet', () => {
  const w = newWorld();
  const base = w.hero.stats.moveSpeed;
  w.hero.buffs.push({ modifiers: [{ stat: 'moveSpeed', pct: 1 }], timeLeft: 0.3 });
  recomputeHeroStats(w);
  assertClose(w.hero.stats.moveSpeed, base / 1.1 * 2.1); // dieb: +10 %, Stärkung: +100 % (additiv)
  stepWorld(w, 0.1, NONE);
  assertEqual(w.hero.buffs.length, 1);
  stepWorld(w, 0.3, NONE);
  assertEqual(w.hero.buffs.length, 0);
  assertClose(w.hero.stats.moveSpeed, base);
});

test('world: recomputeHeroStats addiert maxHp-Zuwachs zu hp', () => {
  const w = newWorld();
  const max = w.hero.stats.maxHp;
  w.hero.hp = 50;
  w.hero.modifiers.push({ stat: 'maxHp', flat: 30 });
  recomputeHeroStats(w);
  assertEqual(w.hero.stats.maxHp, max + 30);
  assertEqual(w.hero.hp, 80);
});

test('world: Gegner überlappen sich nicht dauerhaft', () => {
  const w = newWorld();
  const a = spawnEnemy(w, 'ratte', 20, 0);
  const b = spawnEnemy(w, 'ratte', 20, 0);
  stepWorld(w, 0.01, NONE);
  assertTrue(Math.hypot(a.x - b.x, a.z - b.z) >= a.radius + b.radius - 1e-6);
});

test('world: Gegnerlimit von 300 wird eingehalten', () => {
  const w = newWorld();
  for (let i = 0; i < 305; i++) spawnEnemy(w, 'ratte', 30 + i, 0);
  assertEqual(w.enemies.length, 300);
});

test('world: Boss und Elite ignorieren das Gegnerlimit, reguläre Gegner nicht', () => {
  const w = newWorld();
  for (let i = 0; i < 300; i++) spawnEnemy(w, 'ratte', 30 + i, 0);
  assertEqual(spawnEnemy(w, 'ratte', 0, 40), null);
  assertTrue(spawnEnemy(w, 'baer', 0, 40).boss);
  assertTrue(spawnEnemy(w, 'wolf', 0, 40, { elite: true }).elite);
  assertEqual(w.enemies.length, 302);
});

test('world: Ratte bleibt außerhalb des Heldenkreises und trifft ihn trotzdem', () => {
  const w = newWorld({ animalId: 'waschbaer' });
  const rat = spawnEnemy(w, 'ratte', 3, 0);
  const hp0 = w.hero.hp;
  run(w, 3, 0.05, NONE);
  assertTrue(Math.hypot(rat.x - w.hero.x, rat.z - w.hero.z) >= w.hero.radius + rat.radius - 1e-6);
  assertTrue(w.hero.hp < hp0);
});

test('world: zehn Ratten dringen nicht in den Heldenkreis ein', () => {
  const w = newWorld();
  const rats = [];
  for (let i = 0; i < 10; i++) {
    const a = i / 10 * Math.PI * 2;
    rats.push(spawnEnemy(w, 'ratte', Math.cos(a) * 4, Math.sin(a) * 4));
  }
  run(w, 3, 0.05, NONE);
  for (const r of rats) {
    assertTrue(Math.hypot(r.x - w.hero.x, r.z - w.hero.z) >= w.hero.radius + r.radius - 1e-6);
  }
});

test('world: Ratte genau auf dem Helden wird hinausgeschoben, ohne NaN', () => {
  const w = newWorld();
  const rat = spawnEnemy(w, 'ratte', 0, 0);
  stepWorld(w, 0.01, NONE);
  assertTrue(Number.isFinite(rat.x) && Number.isFinite(rat.z));
  assertClose(Math.hypot(rat.x - w.hero.x, rat.z - w.hero.z), w.hero.radius + rat.radius, 1e-6);
});

test('world: Boss bleibt außerhalb des Heldenkreises', () => {
  const w = newWorld();
  const bear = spawnEnemy(w, 'baer', 5, 0);
  for (let i = 0; i < 100; i++) {
    stepWorld(w, 0.05, NONE);
    assertTrue(Math.hypot(bear.x - w.hero.x, bear.z - w.hero.z) >= w.hero.radius + bear.radius - 1e-6);
  }
});

// Igel (Einrollen)
const HIT = (amount) => ({ amount, crit: false });

test('world: Igel rollt sich nach einem Treffer ein; der auslösende Treffer zählt voll', () => {
  const w = newWorld();
  const igel = spawnEnemy(w, 'igel', 6, 0);
  assertTrue(!isCurled(w, igel));
  damageEnemy(w, igel, HIT(5), 'x');
  assertEqual(igel.hp, 15);
  assertTrue(isCurled(w, igel));
});

test('world: eingerollter Igel nimmt ein Fünftel Schaden und rollt dreimal so schnell', () => {
  const w = newWorld();
  const igel = spawnEnemy(w, 'igel', 6, 0);
  damageEnemy(w, igel, HIT(5), 'x');
  damageEnemy(w, igel, HIT(5), 'x');
  assertClose(igel.hp, 14, 1e-9);
  assertEqual(w.events.filter((e) => e.type === 'hit').map((e) => e.amount), [5, 1]);
  run(w, 0.5, 0.05, NONE);
  assertClose(6 - igel.x, CURL.speedMul * ENEMIES.igel.speed * 0.5, 0.05);
});

test('world: Igel entrollt nach 2,5 s und rollt sich 1,5 s lang nicht erneut ein', () => {
  const w = newWorld();
  const igel = spawnEnemy(w, 'igel', 6, 0);
  igel.hp = 1e6;
  const t0 = w.time;
  let recurledAt = null;
  for (let i = 0; i <= 60; i++) {
    w.time = t0 + i * 0.1;
    const before = igel.hp;
    damageEnemy(w, igel, HIT(10), 'x');
    const since = w.time - t0;
    if (since > 2.55 && since < 3.95) {
      assertTrue(!isCurled(w, igel), `eingerollt bei ${since.toFixed(1)} s`);
      assertClose(before - igel.hp, 10, 1e-9);
    }
    if (recurledAt === null && since >= 3.95 && isCurled(w, igel)) recurledAt = since;
  }
  assertClose(recurledAt, 4, 0.06);
});

test('world: Wellen-Modus unverändert – fester Durchlauf über 60 s', async () => {
  const { createSurvivorRun, stepRun, chooseCard } = await import('../src/modes/survivor.js');
  const run = createSurvivorRun({ seed: 4242, animalId: 'hase', classId: 'krieger' });
  for (let i = 0; i < 60 * 60; i++) {
    if (run.state === 'levelup') chooseCard(run, 0);
    stepRun(run, 1 / 60, { moveX: Math.cos(i / 300), moveZ: Math.sin(i / 300) });
  }
  const w = run.world;
  assertClose(w.hero.x, -16.105953975668406, 1e-9);
  assertClose(w.hero.z, 4.4388851207797675, 1e-9);
  assertEqual(w.run.kills, 12);
  assertEqual(w.enemies.length, 78);
});

// ---------------------------------------------------------------- Abenteuer: neue Gegner und Bosse

test('enemies: neue Gegner und Bosse nicht im Wellen-Modus', async () => {
  const { unlockMinute, BOSS_POOL } = await import('../src/data/waves.js');
  for (const id of ['helmfisch', 'krebs', 'frosch', 'hauptmann_graete', 'kommandant_zwickzwack']) {
    assertTrue(!Object.hasOwn(unlockMinute, id), id);
    assertTrue(!BOSS_POOL.includes(id), id);
  }
});

test('world: Rüstung eines Gegners zieht flach ab, mindestens 1 Schaden', () => {
  const world = createWorld({ seed: 1, animalId: 'hase', classId: 'krieger' });
  const krebs = spawnEnemy(world, 'krebs', 5, 0);
  const armor = 2;
  const hp = krebs.hp;
  damageEnemy(world, krebs, { amount: 10, crit: false }, 'test');
  assertClose(krebs.hp, hp - (10 - armor));
  damageEnemy(world, krebs, { amount: 1.5, crit: false }, 'test');
  assertClose(krebs.hp, hp - (10 - armor) - 1);
});

test('world: Zwickzwack ruft alle 25 s drei Krebse herbei (Ereignis bossSummon)', () => {
  const world = createWorld({ seed: 3, animalId: 'ente', classId: 'krieger' });
  world.hero.abilities = [];
  world.hero.invulnerableUntil = Infinity;
  spawnEnemy(world, 'kommandant_zwickzwack', 30, 0);
  let summons = 0;
  for (let i = 0; i < 26 * 30; i++) {
    stepWorld(world, 1 / 30, { moveX: 0, moveZ: 0 });
    summons += world.events.filter((e) => e.type === 'bossSummon').length;
  }
  assertEqual(summons, 1);
  assertEqual(world.enemies.filter((e) => e.type === 'krebs').length, 3);
});

// ---------------------------------------------------------------- Etappe 2: Schild und Lebensraub

test('world: Schild schluckt Schaden bis 0, Rest trifft das Leben, Ereignis shieldHit', () => {
  const w = createWorld({ seed: 1, animalId: 'ente', classId: 'krieger' });
  w.hero.stats.armor = 0; w.hero.stats.dodge = 0;
  const hp = w.hero.hp;
  giveShield(w, 10, 8);
  damageHero(w, 6);
  assertEqual([w.hero.hp, w.hero.shield.hp], [hp, 4]);
  assertTrue(w.events.some((e) => e.type === 'shieldHit' && e.amount === 6));
  damageHero(w, 7);
  assertEqual([w.hero.hp, w.hero.shield], [hp - 3, null]);
});

test('world: Schild läuft ab, neues Auslösen ersetzt statt zu stapeln', () => {
  const w = createWorld({ seed: 1, animalId: 'ente', classId: 'krieger' });
  giveShield(w, 10, 8);
  giveShield(w, 12, 8);
  assertEqual(w.hero.shield.hp, 12);
  stepWorld(w, 8.1, { moveX: 0, moveZ: 0 });
  assertEqual(w.hero.shield, null);
});

test('world: Lebensraub heilt einen Anteil des Schadens, höchstens bis zum höchsten Leben; ohne nichts', () => {
  const w = createWorld({ seed: 1, animalId: 'ente', classId: 'krieger' });
  const e = spawnEnemy(w, 'ratte', 5, 0, { hpMul: 100 });
  w.hero.hp = 50;
  damageEnemy(w, e, { amount: 20, crit: false }, 'schwerthieb');
  assertEqual(w.hero.hp, 50);
  w.lifesteal = 0.1;
  damageEnemy(w, e, { amount: 20, crit: false }, 'schwerthieb');
  assertClose(w.hero.hp, 52);
  w.hero.hp = w.hero.stats.maxHp - 0.5;
  damageEnemy(w, e, { amount: 20, crit: false }, 'schwerthieb');
  assertClose(w.hero.hp, w.hero.stats.maxHp);
});

test('render: Tracker blendet nach einem Weltwechsel (Zeit springt zurück) nicht von alten Positionen über', async () => {
  const { createTracker } = await import('../src/render/enemies.js');
  const t = createTracker();
  t.begin(10); t.pos(1, 0, 0, 1);
  t.begin(10.1); t.pos(1, 1, 0, 1);
  t.begin(0.033);
  const p = t.pos(1, 3, 0, 0.5);
  assertEqual([p.x, p.z], [3, 0]);
});
