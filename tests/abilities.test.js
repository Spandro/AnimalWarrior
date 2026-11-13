import { test, assertEqual, assertClose, assertTrue } from './runner.js';
import { createWorld, stepWorld, spawnEnemy, enemyTarget, applyStatus } from '../src/core/world.js';
import { abilityParams, castAbility, aimDirection } from '../src/core/abilities.js';
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
  const front = dummy(w, 2, 0), back = dummy(w, -3, 0), far = dummy(w, 5, 0); // hinten weiter weg als vorn, sonst zielt der Hieb nach hinten
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
  const rat = spawnEnemy(w, 'ratte', 3.4, 0); // im Frostring, aber weit genug weg, damit sie nicht am Heldenkreis anstößt
  rat.hp = 1000;
  castAbility(w, 'frostring', 1);
  assertClose(rat.slowUntil, 2);
  assertClose(rat.slowFactor, 0.4);
  run(w, 1);
  assertClose(3.4 - rat.x, 0.6 * ENEMIES.ratte.speed, 1e-6);

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
  const rat = spawnEnemy(w, 'ratte', 0.85, 0); // genau am Heldenrand (außerhalb wird nicht hinausgeschoben)
  applyStatus(w, rat, { stun: 1 });
  const hp0 = w.hero.hp;
  run(w, 0.9);
  assertClose(rat.x, 0.85);
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
  assertEqual(Object.keys(ABILITIES).length, 20);
  for (const def of Object.values(ABILITIES)) {
    assertEqual(def.levels.length, 4, def.id);
    assertEqual(def.trigger, 'auto');
  }
  assertEqual(CLASSES.krieger.abilityPool, ['wirbelschlag', 'schildstoss', 'kriegsschrei', 'erdspalter']);
  assertEqual(CLASSES.magier.abilityPool, ['frostring', 'kettenblitz', 'meteor', 'arkankugeln']);
  assertEqual(CLASSES.dieb.abilityPool, ['giftflaeche', 'schattenklon', 'klingenfaecher', 'rauchbombe']);
  assertEqual(CLASSES.hochstapler.startAbility, 'halsschwinger');
  assertEqual(CLASSES.hochstapler.abilityPool, ['nussregen', 'stampede', 'buddelfalle', 'grossfamilie']);
  for (const cls of Object.values(CLASSES)) {
    for (const id of [cls.startAbility, ...cls.abilityPool]) assertEqual(ABILITIES[id].classId, cls.id, id);
  }
});

test('abilities: Fähigkeiten ohne Schaden verkürzen auf Stufe 2 und 4 die Abklingzeit um 12 %', () => {
  const stats = { cooldown: 1, area: 1 };
  const cooldowns = (id) => [1, 2, 3, 4, 5].map((l) => abilityParams(id, l, stats).cooldown);
  const expected = (base) => [base, base * 0.88, base * 0.88, base * 0.88 * 0.88, base * 0.88 * 0.88];
  for (const [id, base] of [['kriegsschrei', 14], ['schattenklon', 12], ['rauchbombe', 9]]) {
    cooldowns(id).forEach((c, i) => assertClose(c, expected(base)[i], 1e-9));
  }
  assertClose(abilityParams('kriegsschrei', 2, stats).cooldown, 12.32);
  assertClose(abilityParams('kriegsschrei', 4, stats).cooldown, 10.8416);
  // Stufe 3 und 5 behalten ihre eigenen Extras
  assertEqual(abilityParams('kriegsschrei', 3, stats).duration, 7);
  assertClose(abilityParams('kriegsschrei', 5, stats).damagePct, 0.5);
  // der Heldenwert wirkt danach
  assertClose(abilityParams('kriegsschrei', 2, { cooldown: 0.9, area: 1 }).cooldown, 12.32 * 0.9);
});

test('abilities: keine Stufe einer Fähigkeit ist leer', () => {
  for (const def of Object.values(ABILITIES)) {
    def.levels.forEach((changes, i) => assertTrue(changes.length > 0, `${def.id} Stufe ${i + 2}`));
  }
});

test('abilities: jede Fähigkeit hat einen Namen und eine Beschreibung', () => {
  for (const def of Object.values(ABILITIES)) {
    assertTrue(typeof def.name === 'string' && def.name.trim() !== '', def.id);
    assertTrue(typeof def.description === 'string' && def.description.trim() !== '', def.id);
  }
});

// ---------------------------------------------------------------- Das Duo (Hochstapler)

test('abilities: Halsschwinger trifft vorn in Reichweite 3,2, nicht weiter und nicht hinten', () => {
  const w = newWorld();
  const front = dummy(w, 3, 0), tooFar = dummy(w, 3.6, 0.3), back = dummy(w, -4, 0);
  castAbility(w, 'halsschwinger', 1);
  assertEqual(front.hp, 1000 - 13);
  assertTrue(!damaged(tooFar) && !damaged(back));
  assertEqual(w.events.find((e) => e.type === 'cast').shape, 'arc');
});

test('abilities: Halsschwinger – Stufe 3 weitet den Winkel auf 170°, Stufe 5 schwingt zweimal', () => {
  const stats = { cooldown: 1, area: 1 };
  assertEqual(abilityParams('halsschwinger', 1, stats).angle, 130);
  assertEqual(abilityParams('halsschwinger', 3, stats).angle, 170);
  assertEqual(abilityParams('halsschwinger', 4, stats).swings, 1);
  assertEqual(abilityParams('halsschwinger', 5, stats).swings, 2);
  const w = newWorld();
  const front = dummy(w, 2, 0), back = dummy(w, -2, 0);
  castAbility(w, 'halsschwinger', 5);
  assertTrue(damaged(front) && damaged(back));
});

test('abilities: Nussregen wirft zwei Nüsse auf den nächsten Gegner, Stufe 3 drei', () => {
  const w = newWorld([['nussregen']]);
  const near = dummy(w, 3, 0), far = dummy(w, -8, 0); // nah genug, dass beide Nüsse (Fächer von 15°) treffen
  stepWorld(w, 0.05, NONE);
  assertEqual(w.projectiles.length, 2);
  assertTrue(w.projectiles.every((p) => p.dirX > 0.9), 'beide Nüsse fliegen zum näheren Gegner');
  run(w, 0.6);
  assertEqual(near.hp, 1000 - 10); // zwei Nüsse à 5, jede durchschlägt einen Gegner
  assertTrue(!damaged(far));
  const w3 = newWorld();
  dummy(w3, 3, 0);
  castAbility(w3, 'nussregen', 3);
  assertEqual(w3.projectiles.length, 3);
});

test('abilities: Nussregen Stufe 5 durchschlägt zwei Gegner, Stufe 1 nur einen', () => {
  const row = (level) => {
    const w = newWorld();
    const enemies = [dummy(w, 3, 0), dummy(w, 4.5, 0)];
    w.hero.facing = { x: 1, z: 0 };
    castAbility(w, 'nussregen', level);
    run(w, 1);
    return enemies.map((e) => 1000 - e.hp);
  };
  const one = row(1), five = row(5);
  assertTrue(one[1] === 0 && one[0] > 0, `Stufe 1: ${one}`);
  assertTrue(five[1] > 0 && five[0] > 0, `Stufe 5: ${five}`);
});

test('abilities: Stampede wirkt als Ring, schadet rundum und bremst um 30 %', () => {
  const w = newWorld();
  const inside = dummy(w, 0, 2.8), outside = dummy(w, 0, 5);
  castAbility(w, 'stampede', 1);
  assertEqual(inside.hp, 1000 - 11);
  assertTrue(!damaged(outside));
  assertClose(inside.slowFactor, 0.3); // wie beim Frostring: der Wert ist der verlorene Anteil (30 % langsamer)
  assertClose(inside.slowUntil, 1.5);
  const stats = { cooldown: 1, area: 1 };
  assertClose(abilityParams('stampede', 3, stats).radius, 3.2 * 1.25);
  assertClose(abilityParams('stampede', 5, stats).cooldown, 3.5 * 0.75);
});

test('abilities: Buddelfalle landet in der dichtesten Gruppe, schadet nach 0,6 s und verwirrt', () => {
  const w = newWorld([['buddelfalle']]);
  const single = dummy(w, -5, 0);
  const group = [dummy(w, 8, 0), dummy(w, 9, 0), dummy(w, 8, 1)];
  stepWorld(w, 0.05, NONE);
  assertEqual(w.zones.length, 1);
  assertTrue(Math.hypot(w.zones[0].x - 8.3, w.zones[0].z - 0.3) < 1);
  run(w, 0.5);
  assertTrue(!group.some(damaged));
  run(w, 0.1);
  assertEqual(group.map((e) => 1000 - e.hp), [20, 20, 20]);
  assertTrue(group.every((e) => e.confusedUntil > w.time), 'Gegner sind verwirrt');
  assertTrue(!damaged(single));
  const stats = { cooldown: 1, area: 1 };
  assertClose(abilityParams('buddelfalle', 3, stats).radius, 3.5);
  assertClose(abilityParams('buddelfalle', 5, stats).confuse, 3);
});

test('abilities: Großfamilie lenkt Gegner im Lockradius ab, Stufe 3 verlängert, Stufe 5 explodiert am Ende', () => {
  const w = newWorld();
  const lured = dummy(w, 0, 5), farAway = dummy(w, 0, 12);
  castAbility(w, 'grossfamilie', 1);
  w.hero.x = 20;
  assertEqual(w.summons.length, 1);
  assertTrue(enemyTarget(w, lured) === w.summons[0]);
  assertTrue(enemyTarget(w, farAway) === w.hero);
  run(w, 5.05);
  assertEqual(w.summons.length, 0);
  assertTrue(enemyTarget(w, lured) === w.hero);
  const stats = { cooldown: 1, area: 1 };
  assertEqual(abilityParams('grossfamilie', 3, stats).duration, 7);
  assertEqual(abilityParams('grossfamilie', 5, stats).explodeDamage, 25);
  assertEqual(abilityParams('grossfamilie', 1, stats).explodeDamage, 0);
});

test('abilities: Großfamilie Stufe 5 explodiert zum Ende mit 25 Schaden', () => {
  const w = newWorld();
  const rat = dummy(w, 0, 2);
  w.hero.x = 20;
  castAbility(w, 'grossfamilie', 5);
  const x = w.summons[0].x, z = w.summons[0].z;
  rat.x = x + 1; rat.z = z;
  run(w, 7.1);
  assertEqual(w.summons.length, 0);
  assertEqual(1000 - rat.hp, 25);
});

test('abilities: Fähigkeiten des Duos tragen Namen und Beschreibung, die Stufenwerte folgen dem Muster', () => {
  const stats = { cooldown: 1, area: 1 };
  assertClose(abilityParams('halsschwinger', 5, stats).damage, 13 * 1.8);
  assertClose(abilityParams('nussregen', 2, stats).damage, 6);
  assertClose(abilityParams('stampede', 2, stats).damage, 13.2);
  assertClose(abilityParams('buddelfalle', 4, stats).damage, 32);
  assertClose(abilityParams('grossfamilie', 2, stats).cooldown, 12 * 0.88);
  for (const id of ['halsschwinger', 'nussregen', 'stampede', 'buddelfalle', 'grossfamilie']) {
    assertEqual(ABILITIES[id].classId, 'hochstapler', id);
  }
});

// ---------------------------------------------------------------- Auto-Zielen

const castEvent = (w) => w.events.find((e) => e.type === 'cast');

test('abilities: Schwerthieb zielt auf die Ratte hinter dem Helden und trifft sie', () => {
  const w = newWorld();
  const rat = dummy(w, -2, 0);
  castAbility(w, 'schwerthieb', 1);
  assertTrue(damaged(rat));
  assertClose(castEvent(w).dirX, -1, 1e-9);
});

test('abilities: Schwerthieb ignoriert Gegner außerhalb der Zielreichweite (Radius + 1,5)', () => {
  const w = newWorld();
  const rat = dummy(w, -6, 0);
  castAbility(w, 'schwerthieb', 1);
  assertTrue(!damaged(rat));
  assertClose(castEvent(w).dirX, 1, 1e-9);
});

test('abilities: Zielreichweite misst von Mitte zu Rand des Gegners', () => {
  // Reichweite 2,6 + 1,5 = 4,1; Ratte (Radius r) bei x = -(4,1 + r - 0,05) ist drin, bei -(4,1 + r + 0,05) nicht
  const r = ENEMIES.ratte.radius;
  const inside = newWorld();
  dummy(inside, -(4.1 + r - 0.05), 0);
  castAbility(inside, 'schwerthieb', 1);
  assertClose(castEvent(inside).dirX, -1, 1e-9);
  const outside = newWorld();
  dummy(outside, -(4.1 + r + 0.05), 0);
  castAbility(outside, 'schwerthieb', 1);
  assertClose(castEvent(outside).dirX, 1, 1e-9);
});

test('abilities: Zielwahl nimmt den nächsten von zwei Gegnern', () => {
  const w = newWorld();
  dummy(w, 0, 3);
  dummy(w, -2, 0);
  castAbility(w, 'schwerthieb', 1);
  assertClose(castEvent(w).dirX, -1, 1e-9);
  assertClose(castEvent(w).dirZ, 0, 1e-9);
});

test('abilities: unantastbarer Gegner wird nicht anvisiert', () => {
  const w = newWorld();
  const shadow = dummy(w, -1, 0);
  shadow.untargetable = true;
  dummy(w, 0, 3);
  castAbility(w, 'schwerthieb', 1);
  assertClose(castEvent(w).dirX, 0, 1e-9);
  assertClose(castEvent(w).dirZ, 1, 1e-9);
});

test('abilities: Klingenfächer zielt auf die Ratte bei (0, 5), die mittlere Klinge fliegt dorthin', () => {
  const w = newWorld();
  dummy(w, 0, 5);
  castAbility(w, 'klingenfaecher', 1);
  assertClose(castEvent(w).dirX, 0, 1e-9);
  assertClose(castEvent(w).dirZ, 1, 1e-9);
  const mid = w.projectiles[Math.floor(w.projectiles.length / 2)];
  assertClose(mid.dirX, 0, 1e-9);
  assertClose(mid.dirZ, 1, 1e-9);
});

test('abilities: Erdspalter reicht je nach Stufe weiter, Zielreichweite = Länge + 1,5', () => {
  const w3 = newWorld();
  dummy(w3, 0, -13); // außerhalb der Linie (12 + Radius), aber in Zielreichweite 13,5
  castAbility(w3, 'erdspalter', 3);
  assertClose(castEvent(w3).dirZ, -1, 1e-9);
  const w1 = newWorld();
  dummy(w1, 0, -11);
  castAbility(w1, 'erdspalter', 1);
  assertClose(castEvent(w1).dirX, 1, 1e-9);
});

test('abilities: mitgegebener Zielpunkt schlägt die automatische Zielwahl', () => {
  const w = newWorld();
  dummy(w, -2, 0);
  castAbility(w, 'schwerthieb', 1, { x: 0, z: 5 });
  assertClose(castEvent(w).dirX, 0, 1e-9);
  assertClose(castEvent(w).dirZ, 1, 1e-9);
});

test('abilities: aimDirection liefert null in leerer Welt und lässt hero.facing unverändert', () => {
  const w = newWorld();
  assertEqual(aimDirection(w, abilityParams('schwerthieb', 1, w.hero.stats), ABILITIES.schwerthieb.aim), null);
  dummy(w, -2, 0);
  const d = aimDirection(w, abilityParams('schwerthieb', 1, w.hero.stats), ABILITIES.schwerthieb.aim);
  assertClose(d.x, -1, 1e-9);
  castAbility(w, 'schwerthieb', 1);
  assertEqual([w.hero.facing.x, w.hero.facing.z], [1, 0]);
});

test('abilities: Schwerthieb Stufe 5 schlägt zum Ziel und zusätzlich in die Gegenrichtung', () => {
  const w = newWorld();
  const aimed = dummy(w, 0, 2), opposite = dummy(w, 0, -2), side = dummy(w, 2, 0);
  castAbility(w, 'schwerthieb', 5);
  assertTrue(damaged(aimed) && damaged(opposite) && !damaged(side));
});

test('abilities: Klingenfächer Stufe 5 deckt 360° ab und zentriert sich auf das Ziel', () => {
  const w = newWorld();
  dummy(w, 0, 5);
  castAbility(w, 'klingenfaecher', 5);
  assertEqual(w.projectiles.length, 9);
  assertClose(castEvent(w).dirZ, 1, 1e-9);
  assertTrue(w.projectiles.some((p) => Math.abs(p.dirX) < 1e-9 && Math.abs(p.dirZ - 1) < 1e-9));
});

test('abilities: nur die sechs facing-Fähigkeiten haben ein aim-Feld', () => {
  const withAim = Object.values(ABILITIES).filter((d) => d.aim).map((d) => d.id).sort();
  assertEqual(withAim, ['erdspalter', 'halsschwinger', 'klingenfaecher', 'schildstoss', 'schwerthieb', 'wurfdolche']);
  assertEqual(ABILITIES.halsschwinger.aim, { key: 'radius', extra: 1.5 });
  for (const d of Object.values(ABILITIES)) assertEqual(!!d.aim, d.target === 'facing', d.id);
  assertEqual(ABILITIES.wurfdolche.aim, { key: 'range', extra: 0 });
  assertEqual(ABILITIES.erdspalter.aim, { key: 'length', extra: 1.5 });
});
