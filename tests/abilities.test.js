import { test, assertEqual, assertClose, assertTrue } from './runner.js';
import { createWorld, stepWorld, spawnEnemy, enemyTarget, applyStatus } from '../src/core/world.js';
import { abilityParams, castAbility } from '../src/core/abilities.js';
import { obstaclesNear } from '../src/core/terrain.js';
import { computeStats } from '../src/core/stats.js';
import { ABILITIES } from '../src/data/abilities.js';
import { CLASSES } from '../src/data/classes.js';
import { ENEMIES } from '../src/data/enemies.js';

const NONE = { moveX: 0, moveZ: 0 };
function clearSeed() {
  for (let s = 1; s < 1000; s++) if (obstaclesNear(s, 0, 0, 16).length === 0) return s;
  throw new Error('kein freier Seed');
}
const SEED = clearSeed();

/** Krieger-Waschbär mit neutralen Werten (damage 1, area 1, cooldown 1, keine Krits), ohne Fähigkeiten. */
function newWorld(abilities = []) {
  const w = createWorld({ seed: SEED, animalId: 'waschbaer', classId: 'krieger' });
  w.hero.stats = { ...w.hero.stats, critChance: 0, damage: 1, area: 1, cooldown: 1 };
  w.hero.abilities = abilities.map(([id, level = 1]) => ({ id, level, cooldownLeft: 0 }));
  return w;
}
/** Unbewegliche, zähe Ratte. */
function dummy(w, x, z) {
  const e = spawnEnemy(w, 'ratte', x, z);
  e.hp = e.maxHp = 1000;
  e.speed = 0;
  return e;
}
const damaged = (e) => e.hp < 1000;
function run(w, seconds, dt = 0.05) {
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) stepWorld(w, dt, NONE);
}

test('abilities: arc trifft vorn in Reichweite, nicht hinten und nicht zu weit', () => {
  const w = newWorld();
  const front = dummy(w, 2, 0), back = dummy(w, -2, 0), far = dummy(w, 5, 0);
  castAbility(w, 'schwerthieb', 1);
  assertEqual(front.hp, 1000 - 12);
  assertTrue(!damaged(back) && !damaged(far));
  const cast = w.events.find((e) => e.type === 'cast');
  assertEqual([cast.abilityId, cast.shape, cast.x, cast.z, cast.dirX, cast.dirZ], ['schwerthieb', 'arc', 0, 0, 1, 0]);
});

test('abilities: arc mit aim hinter dem Helden trifft den Gegner hinten', () => {
  const w = newWorld();
  const front = dummy(w, 2, 0), back = dummy(w, -2, 0);
  castAbility(w, 'schwerthieb', 1, { x: -5, z: 0 });
  assertTrue(damaged(back) && !damaged(front));
});

test('abilities: Schwerthieb Stufe 5 schlägt zusätzlich nach hinten', () => {
  const w = newWorld();
  const front = dummy(w, 2, 0), back = dummy(w, -2, 0), side = dummy(w, 0, 2);
  castAbility(w, 'schwerthieb', 5);
  assertTrue(damaged(front) && damaged(back) && !damaged(side));
});

test('abilities: ring trifft im Radius, außerhalb nicht', () => {
  const w = newWorld();
  const inside = dummy(w, 0, 2.5), outside = dummy(w, 0, 4);
  castAbility(w, 'wirbelschlag', 1);
  assertEqual(inside.hp, 1000 - 10);
  assertTrue(!damaged(outside));
});

test('abilities: line trifft (8,0.5), nicht (8,3)', () => {
  const w = newWorld();
  const hit = dummy(w, 8, 0.5), miss = dummy(w, 8, 3);
  castAbility(w, 'erdspalter', 1);
  assertEqual(hit.hp, 1000 - 18);
  assertTrue(!damaged(miss));
});

test('abilities: Feuerball fliegt zum näheren Gegner, Explosion trifft den Nachbarn', () => {
  const w = newWorld([['feuerball']]);
  const near = dummy(w, 4, 0), neighbour = dummy(w, 4, 1), far = dummy(w, -7, 0);
  stepWorld(w, 0.05, NONE);
  assertTrue(w.projectiles.length === 1 && w.projectiles[0].dirX > 0.99);
  run(w, 0.5);
  assertEqual(near.hp, 1000 - 10);
  assertEqual(neighbour.hp, 1000 - 10);
  assertTrue(!damaged(far));
  assertEqual(w.projectiles.length, 0);
});

test('abilities: Wurfdolche Stufe 1 durchschlägt genau zwei von drei Gegnern', () => {
  const w = newWorld();
  const row = [dummy(w, 3, 0), dummy(w, 5, 0), dummy(w, 7, 0)];
  castAbility(w, 'wurfdolche', 1);
  run(w, 1);
  assertEqual(row.map(damaged), [true, true, false]);
  assertEqual(row[1].hp, 1000 - 7);
});

test('abilities: Klingenfächer Stufe 5 wirft 9 Dolche im Vollkreis', () => {
  const w = newWorld();
  castAbility(w, 'klingenfaecher', 5);
  assertEqual(w.projectiles.length, 9);
  const angles = w.projectiles.map((p) => Math.atan2(p.dirZ, p.dirX)).sort((a, b) => a - b);
  for (let i = 1; i < angles.length; i++) assertClose(angles[i] - angles[i - 1], (2 * Math.PI) / 9, 1e-9);
});

test('abilities: Kettenblitz Stufe 1 trifft vier von fünf Gegnern, keinen doppelt', () => {
  const w = newWorld();
  const chain = [3, 6, 9, 12, 15].map((x) => dummy(w, x, 0));
  castAbility(w, 'kettenblitz', 1);
  assertEqual(chain.map((e) => 1000 - e.hp), [9, 9, 9, 9, 0]);
  assertEqual(w.events.filter((e) => e.type === 'hit').length, 4);
});

test('abilities: Meteor landet bei der Dreiergruppe und schadet erst nach 0,8 s', () => {
  const w = newWorld([['meteor']]);
  const single = dummy(w, -5, 0);
  const group = [dummy(w, 8, 0), dummy(w, 9, 0), dummy(w, 8, 1)];
  stepWorld(w, 0.05, NONE);
  assertEqual(w.zones.length, 1);
  assertTrue(Math.hypot(w.zones[0].x - 8.3, w.zones[0].z - 0.3) < 1);
  run(w, 0.7);
  assertTrue(!group.some(damaged));
  run(w, 0.1);
  assertEqual(group.map((e) => 1000 - e.hp), [30, 30, 30]);
  assertTrue(!damaged(single));
});

test('abilities: Arkankugeln treffen denselben Gegner in 1 s höchstens zweimal', () => {
  const w = newWorld([['arkankugeln']]);
  const e = dummy(w, 2.5, 0);
  e.radius = 3; // berührt die Kugeln ständig, begrenzt nur durch hitInterval
  run(w, 1);
  assertEqual(w.orbitals.length, 2);
  assertEqual(1000 - e.hp, 2 * 6);
});

test('abilities: Kriegsschrei hebt damage für 5 s auf 1.3', () => {
  const w = createWorld({ seed: SEED, animalId: 'waschbaer', classId: 'krieger' });
  w.hero.abilities = [{ id: 'kriegsschrei', level: 1, cooldownLeft: 0 }];
  stepWorld(w, 0.1, NONE);
  assertClose(w.hero.stats.damage, 1.3);
  run(w, 4.8, 0.1);
  assertClose(w.hero.stats.damage, 1.3);
  run(w, 0.3, 0.1);
  assertClose(w.hero.stats.damage, 1);
});

test('abilities: Gegner im Umkreis steuern den Klon an, nach 5 s wieder den Helden', () => {
  const w = newWorld();
  const lured = dummy(w, 0, 5), farAway = dummy(w, 0, 12);
  castAbility(w, 'schattenklon', 1);
  w.hero.x = 20;
  assertEqual(w.summons.length, 1);
  assertTrue(enemyTarget(w, lured) === w.summons[0]);
  assertTrue(enemyTarget(w, farAway) === w.hero);
  run(w, 5.05);
  assertEqual(w.summons.length, 0);
  assertTrue(enemyTarget(w, lured) === w.hero);
});

test('abilities: Gegner läuft auf den Klon zu, nicht auf den Helden', () => {
  const w = newWorld();
  const rat = spawnEnemy(w, 'ratte', 0, 5);
  castAbility(w, 'schattenklon', 1);
  w.hero.x = 20;
  run(w, 0.5);
  assertClose(rat.x, 0, 1e-9);
  assertTrue(rat.z < 5);
});

test('abilities: Rauchbombe verwirrt, Frostring verlangsamt auf 60 % Strecke', () => {
  const w = newWorld();
  const rat = spawnEnemy(w, 'ratte', 3, 0);
  rat.hp = 1000;
  castAbility(w, 'frostring', 1);
  assertClose(rat.slowUntil, 2);
  assertClose(rat.slowFactor, 0.4);
  run(w, 1);
  assertClose(3 - rat.x, 0.6 * ENEMIES.ratte.speed, 1e-6);

  const w2 = newWorld();
  const e = dummy(w2, 2, 2);
  castAbility(w2, 'rauchbombe', 1);
  assertClose(e.confusedUntil, 3);
});

test('abilities: verwirrter Gegner läuft nicht zum Helden', () => {
  const w = newWorld();
  const rat = spawnEnemy(w, 'ratte', 6, 0);
  applyStatus(w, rat, { confuse: 3 });
  run(w, 1);
  // volle Geschwindigkeit in einer festen Zufallsrichtung, nicht die Verfolgung bis (1.8, 0)
  assertClose(Math.hypot(rat.x - 6, rat.z), ENEMIES.ratte.speed, 1e-6);
  assertTrue(Math.hypot(rat.x - 1.8, rat.z) > 0.5);
});

test('abilities: betäubter Gegner bewegt sich nicht und schadet nicht', () => {
  const w = newWorld();
  const rat = spawnEnemy(w, 'ratte', 0.5, 0);
  applyStatus(w, rat, { stun: 1 });
  const hp0 = w.hero.hp;
  run(w, 0.9);
  assertClose(rat.x, 0.5);
  assertEqual(w.hero.hp, hp0);
});

test('abilities: Schildstoß stößt zurück, Stufe 5 betäubt', () => {
  const w = newWorld();
  const e = dummy(w, 1.5, 0);
  castAbility(w, 'schildstoss', 5);
  assertClose(e.x, 1.5 + 8);
  assertClose(e.stunnedUntil, 1);
});

test('abilities: Bosse sind immun gegen Betäubung, Verwirrung, Rückstoß; Verlangsamung halbiert', () => {
  const w = newWorld();
  const boss = spawnEnemy(w, 'baer', 2, 0);
  castAbility(w, 'schildstoss', 5);
  assertClose(boss.x, 2);
  applyStatus(w, boss, { stun: 2, confuse: 2, slow: 0.4, slowDuration: 2 });
  assertEqual([boss.stunnedUntil, boss.confusedUntil], [0, 0]);
  assertClose(boss.slowFactor, 0.2);
});

test('abilities: abilityParams wendet Stufen, Abklingzeit und Fläche an', () => {
  const stats = computeStats('waschbaer', 'krieger');
  const p = abilityParams('schwerthieb', 3, stats);
  assertEqual(p.angle, 150);
  assertClose(p.damage, 12 * 1.4);
  assertClose(abilityParams('schwerthieb', 3, { ...stats, cooldown: 0.9 }).cooldown, 0.9);
  assertClose(abilityParams('schwerthieb', 3, { ...stats, area: 1.15 }).radius, 2.99);
  assertClose(abilityParams('schwerthieb', 3, { ...stats, area: 1.15 }).angle, 150);
  assertClose(abilityParams('wirbelschlag', 5, stats).cooldown, 2.25);
  assertClose(abilityParams('wirbelschlag', 5, stats).radius, 3.75);
  assertEqual(abilityParams('kriegsschrei', 5, stats).damagePct, 0.5);
  assertClose(abilityParams('giftflaeche', 2, stats).tickDamage, 4.8);
});

test('abilities: bei leerer Welt lösen nearest/densest nicht aus und bleiben bereit', () => {
  const w = newWorld([['feuerball'], ['kettenblitz'], ['meteor'], ['wirbelschlag']]);
  stepWorld(w, 0.1, NONE);
  assertEqual(w.hero.abilities.map((a) => a.cooldownLeft), [0, 0, 0, 3]);
  assertEqual(w.events.filter((e) => e.type === 'cast').map((e) => e.abilityId), ['wirbelschlag']);
  const e = dummy(w, 5, 0);
  stepWorld(w, 0.1, NONE);
  assertEqual(w.events.filter((e) => e.type === 'cast').map((e) => e.abilityId), ['feuerball', 'kettenblitz', 'meteor']);
  assertTrue(damaged(e));
});

test('abilities: damageByAbility zählt unter der richtigen Kennung', () => {
  const w = newWorld();
  dummy(w, 2, 0);
  castAbility(w, 'schwerthieb', 1);
  castAbility(w, 'wirbelschlag', 1);
  castAbility(w, 'schwerthieb', 1);
  assertEqual(w.run.damageByAbility, { schwerthieb: 24, wirbelschlag: 10 });
});

test('abilities: Daten sind vollständig und abilityPool je Klasse gefüllt', () => {
  assertEqual(Object.keys(ABILITIES).length, 15);
  for (const def of Object.values(ABILITIES)) {
    assertEqual(def.levels.length, 4, def.id);
    assertEqual(def.trigger, 'auto');
  }
  assertEqual(CLASSES.krieger.abilityPool, ['wirbelschlag', 'schildstoss', 'kriegsschrei', 'erdspalter']);
  assertEqual(CLASSES.magier.abilityPool, ['frostring', 'kettenblitz', 'meteor', 'arkankugeln']);
  assertEqual(CLASSES.dieb.abilityPool, ['giftflaeche', 'schattenklon', 'klingenfaecher', 'rauchbombe']);
  for (const cls of Object.values(CLASSES)) {
    for (const id of [cls.startAbility, ...cls.abilityPool]) assertEqual(ABILITIES[id].classId, cls.id, id);
  }
});
