import { test, assertEqual, assertTrue, assertClose } from './runner.js';
import { createWorld, stepWorld, spawnEnemy, damageEnemy, damageHero } from '../src/core/world.js';
import { castAbility, abilityParams } from '../src/core/abilities.js';
import { SIGNATURE_RULES } from '../src/data/adventure.js';

const NONE = { moveX: 0, moveZ: 0 };

/** Welt ohne Hindernisse (Abenteuer-artig), Held bei (0, 0), Rüstung und Ausweichen 0. */
function world(classId = 'krieger', animalId = 'ente') {
  const w = createWorld({ seed: 7, animalId, classId, terrain: { obstaclesNear: () => [] } });
  w.hero.stats.armor = 0; w.hero.stats.dodge = 0; w.hero.stats.critChance = 0; w.hero.stats.hpRegen = 0;
  w.hero.abilities = [];
  return w;
}
/** Zäher Gegner, der sich nicht rührt, ohne Berührungsschaden. */
function dummy(w, x, z, type = 'ratte', opts = {}) {
  const e = spawnEnemy(w, type, x, z, { hpMul: 1000, ...opts });
  e.passive = true; // ruht ohne Ort: bewegt sich nicht, keine Berührungstreffer
  return e;
}
const hitSum = (w) => w.events.filter((e) => e.type === 'hit').reduce((s, e) => s + e.amount, 0);

test('signatures: Raserei – bei vollem Leben kein Bonus, bei 25 % Leben voller Bonus (+60 %)', () => {
  const full = world();
  const e1 = dummy(full, 1.5, 0);
  castAbility(full, 'roteruebe', 1);
  castAbility(full, 'letzterunde', 1);
  const base = hitSum(full);
  const low = world();
  const e2 = dummy(low, 1.5, 0);
  low.hero.hp = low.hero.stats.maxHp * SIGNATURE_RULES.rageFullAtHp;
  castAbility(low, 'roteruebe', 1);
  castAbility(low, 'letzterunde', 1);
  assertEqual(hitSum(low), Math.round(30 * 1.6));
  assertEqual(base, 30);
  assertTrue(e1.hp > 0 && e2.hp > 0);
  assertEqual(low.hero.stats.armor, 0, 'keine Verteidigung');
});

test('signatures: Schild aus 30 % des höchsten Lebens, ersetzt sich beim Neuauslösen', () => {
  const w = world();
  castAbility(w, 'breiteskreuz', 1);
  assertClose(w.hero.shield.hp, w.hero.stats.maxHp * 0.3);
  damageHero(w, 10);
  castAbility(w, 'breiteskreuz', 1);
  assertClose(w.hero.shield.hp, w.hero.stats.maxHp * 0.3);
  stepWorld(w, 8.1, NONE);
  assertEqual(w.hero.shield, null);
});

test('signatures: Heilzone heilt nur im Topf, schadet Gegnern darin', () => {
  const w = world();
  const e = dummy(w, 1, 0);
  w.hero.hp = 50;
  castAbility(w, 'eintopf', 1);
  for (let i = 0; i < 10; i++) stepWorld(w, 0.1, NONE);
  assertClose(w.hero.hp, 50 + w.hero.stats.maxHp * 0.03, 0.05);
  assertTrue(e.hp < e.maxHp);
  const hp = w.hero.hp;
  w.hero.x = 10;
  for (let i = 0; i < 10; i++) stepWorld(w, 0.1, NONE);
  assertClose(w.hero.hp, hp);
});

test('signatures: Gewitterwolke folgt dem Helden und trifft je Takt genau einen Gegner in 7 m', () => {
  const w = world('magier');
  dummy(w, 3, 0); dummy(w, -3, 0); dummy(w, 0, 3);
  castAbility(w, 'gewitterwolke', 1);
  assertEqual(w.followers.length, 1);
  let strikes = 0;
  for (let i = 0; i < 30; i++) { stepWorld(w, 0.1, NONE); strikes += w.events.filter((e) => e.type === 'hit').length; }
  assertEqual(strikes, 3);
  w.hero.x = 40;
  stepWorld(w, 0.1, NONE);
  assertTrue(Math.abs(w.followers[0].x - 40) < 2, 'folgt');
  for (let i = 0; i < 80; i++) stepWorld(w, 0.1, NONE);
  assertEqual(w.followers.length, 0);
});

test('signatures: Frostbeule friert verlangsamte Gegner ein, andere nur verlangsamt, Bosse nie eingefroren', () => {
  const w = world('magier');
  const slowed = dummy(w, 2, 0), fresh = dummy(w, -2, 0), boss = dummy(w, 0, 2.5, 'baer');
  slowed.slowUntil = 5; slowed.slowFactor = 0.3;
  boss.slowUntil = 5; boss.slowFactor = 0.2;
  castAbility(w, 'frostbeule', 1);
  assertClose(slowed.stunnedUntil, 2);
  assertEqual(fresh.stunnedUntil, 0);
  assertTrue(fresh.slowUntil > 0);
  assertEqual(boss.stunnedUntil, 0);
  assertTrue(boss.slowUntil >= 5);
});

test('signatures: Wundertüte ist je Seed gleich und wirkt eine von drei Wirkungen', () => {
  const run = (seed) => {
    const w = world('magier');
    w.rng = createRngFor(seed);
    dummy(w, 4, 0);
    castAbility(w, 'wundertuete', 1);
    const kinds = [];
    for (let i = 0; i < 20; i++) { stepWorld(w, 0.1, NONE); for (const e of w.events) if (e.type === 'potionSplash') kinds.push(e.kind); }
    return kinds;
  };
  const a = run(3), b = run(3);
  assertEqual(a.length, 1);
  assertEqual(a, b);
  const seen = new Set();
  for (let s = 1; s < 30; s++) seen.add(run(s)[0]);
  assertEqual([...seen].sort(), ['feuer', 'glueck', 'schleim']);
});

test('signatures: Lange Finger – Gold nur bis 30 je Auslösung, Tötungen tragen doppelte Beutechance', () => {
  const w = world('dieb');
  const e = dummy(w, 1, 0);
  castAbility(w, 'langefinger', 1);
  let gold = 0;
  for (let i = 0; i < 400; i++) {
    damageEnemy(w, e, { amount: 1, crit: false }, 'wurfdolche');
    gold += w.events.filter((x) => x.type === 'stealGold').reduce((s, x) => s + x.value, 0);
    w.events = [];
  }
  assertEqual(gold, 30);
  const weak = spawnEnemy(w, 'ratte', 2, 0);
  damageEnemy(w, weak, { amount: 9999, crit: false }, 'wurfdolche');
  assertTrue(w.events.some((x) => x.type === 'kill' && x.doubleLoot === true));
  w.time = 100;
  const later = spawnEnemy(w, 'ratte', 2, 0);
  w.events = [];
  damageEnemy(w, later, { amount: 9999, crit: false }, 'wurfdolche');
  assertTrue(!w.events.some((x) => x.type === 'kill' && x.doubleLoot));
});

test('signatures: Unsichtbarkeit – Gegner verlieren das Ziel, Bosse greifen an, erster Treffer kritisch und beendet sie', () => {
  const w = world('dieb');
  const rat = spawnEnemy(w, 'ratte', 1, 0);
  rat.damage = 50;
  castAbility(w, 'hierwarniemand', 1);
  const hp = w.hero.hp;
  for (let i = 0; i < 10; i++) stepWorld(w, 0.1, NONE);
  assertEqual(w.hero.hp, hp, 'keine Berührungstreffer');
  const boss = spawnEnemy(w, 'baer', 0.5, 0);
  boss.damage = 5;
  for (let i = 0; i < 10; i++) stepWorld(w, 0.1, NONE);
  assertTrue(w.hero.hp < hp, 'Boss trifft');
  w.events = [];
  const target = dummy(w, 6, 6);
  castAbility(w, 'griffindietasche', 1, { x: 6, z: 6 });
  w.hero.x = 5.5; w.hero.z = 5.5;
  castAbility(w, 'griffindietasche', 1, { x: 6, z: 6 });
  const hits = w.events.filter((e) => e.type === 'hit');
  assertTrue(hits.length >= 1 && hits[0].crit, 'kritisch');
  assertTrue(!(w.hero.stealthUntil > w.time), 'beendet');
  assertTrue(target.hp < target.maxHp);
});

test('signatures: höchstens 3 Fallen, ein Gegner löst aus (Schaden, Betäubung), Falle verbraucht, hält 30 s', () => {
  const w = world('dieb');
  for (let i = 0; i < 5; i++) { w.hero.x = i * 3; castAbility(w, 'baerenfalle', 1); }
  assertEqual(w.traps.length, 3);
  assertEqual(w.traps.map((t) => t.x), [6, 9, 12]);
  const e = dummy(w, 9, 0);
  stepWorld(w, 0.05, NONE);
  assertTrue(e.hp < e.maxHp);
  assertClose(e.stunnedUntil, w.time + 1.5 - 0.0, 0.06);
  assertEqual(w.traps.length, 2);
  w.enemies = [];
  stepWorld(w, 30, NONE);
  assertEqual(w.traps.length, 0);
});

test('signatures: Applaus verlängert je Tötung um 1 s, höchstens 20 s gesamt', () => {
  const w = world('hochstapler', 'giraffe');
  castAbility(w, 'applaus', 1);
  const buff = () => w.hero.buffs.find((b) => b.abilityId === 'applaus');
  assertClose(buff().timeLeft, 8);
  for (let i = 0; i < 3; i++) damageEnemy(w, spawnEnemy(w, 'ratte', 2, 0), { amount: 9999, crit: false }, 'halsschwinger');
  assertClose(buff().timeLeft, 11);
  for (let i = 0; i < 30; i++) damageEnemy(w, spawnEnemy(w, 'ratte', 2, 0), { amount: 9999, crit: false }, 'halsschwinger');
  assertClose(buff().timeLeft, 20);
  stepWorld(w, 5, NONE);
  damageEnemy(w, spawnEnemy(w, 'ratte', 2, 0), { amount: 9999, crit: false }, 'halsschwinger');
  assertClose(buff().timeLeft, 15, 1e-6);
});

test('signatures: Erdmännchen greift den nächsten Gegner an, ist nicht angreifbar und verschwindet nach Ablauf', () => {
  const w = world('hochstapler', 'giraffe');
  const e = dummy(w, 5, 0);
  castAbility(w, 'erdmaennchen', 1);
  assertEqual(w.followers.length, 1);
  assertEqual(w.enemies.length, 1, 'kein Gegner');
  for (let i = 0; i < 30; i++) stepWorld(w, 0.1, NONE);
  assertTrue(e.hp < e.maxHp);
  for (let i = 0; i < 130; i++) stepWorld(w, 0.1, NONE);
  assertEqual(w.followers.length, 0);
});

test('signatures: Da drüben! markiert bis zu 5 Gegner in 12 m: +40 % Schaden, Bosse nur +20 %', () => {
  const w = world('hochstapler', 'giraffe');
  const near = [1, 2, 3, 4, 5, 6].map((d) => dummy(w, d, 0));
  const far = dummy(w, 30, 0);
  const boss = dummy(w, 0, -4, 'baer');
  castAbility(w, 'dadrueben', 1);
  const marked = w.enemies.filter((e) => e.markedUntil > w.time);
  assertEqual(marked.length, 5);
  assertTrue(!(far.markedUntil > 0));
  assertTrue(boss.markedUntil > 0, 'Boss ist unter den nächsten fünf');
  w.events = [];
  damageEnemy(w, near[0], { amount: 100, crit: false }, 'x');
  assertEqual(hitSum(w), 140);
  w.events = [];
  damageEnemy(w, boss, { amount: 100, crit: false }, 'x');
  assertEqual(hitSum(w), 120);
  w.time = 20;
  w.events = [];
  damageEnemy(w, near[0], { amount: 100, crit: false }, 'x');
  assertEqual(hitSum(w), 100);
});

test('signatures: Dauer-Boni auf Besonderheiten wirken nur auf ihre Form, allgemeine auf alle', () => {
  const stats = { cooldown: 1, area: 1 };
  const manual = { damageMul: 1, cooldownMul: 1, minCooldown: 0, orbitSeconds: 8, orbitCooldown: 16, buffSeconds: 8,
    specials: [{ special: 'shieldPct', value: 0.1, shape: 'shield' }, { special: 'jumps', value: 2 }, { special: 'slowDuration', value: 0.6 },
      { special: 'damage', value: 0.3, mode: 'pct', shape: 'trap' }, { special: 'duration', value: 2, shape: ['buff', 'applause'] }] };
  assertClose(abilityParams('breiteskreuz', 1, stats, manual).shieldPct, 0.4);
  assertEqual(abilityParams('kugelblitz', 1, stats, manual).jumps, 9);
  assertEqual(abilityParams('kettenblitz', 1, stats, manual).jumps, 6);
  assertClose(abilityParams('hausverbot', 1, stats, manual).slowDuration, 3.6);
  assertEqual(abilityParams('wirbelschlag', 1, stats, manual).slowDuration, 0, 'ohne Verlangsamung kein Zuschlag');
  assertClose(abilityParams('baerenfalle', 1, stats, manual).damage, 39);
  assertEqual(abilityParams('letzterunde', 1, stats, manual).damage, 30);
  assertEqual(abilityParams('selbstversuch', 1, stats, manual).duration, 10);
  assertEqual(abilityParams('applaus', 1, stats, manual).duration, 10);
});

test('signatures: Hockerwurf stößt zurück, Glatteis bremst, Familientreffen ruft drei', () => {
  const w = world('krieger');
  const e = dummy(w, 4, 0);
  castAbility(w, 'hockerwurf', 1);
  for (let i = 0; i < 10; i++) stepWorld(w, 0.05, NONE);
  assertTrue(e.x > 4.5, 'zurückgestoßen');
  const m = world('magier');
  const s = dummy(m, 6, 0);
  castAbility(m, 'glatteis', 1);
  assertTrue(s.slowUntil > 0);
  const d = world('hochstapler', 'giraffe');
  castAbility(d, 'familientreffen', 1);
  assertEqual(d.summons.length, 3);
});

import { createRng } from '../src/core/rng.js';
function createRngFor(seed) { return createRng(seed); }

// ---------------------------------------------------------------- Gesamtprüfung: Befunde

import { computeStats } from '../src/core/stats.js';
import { SUBCLASSES, PASSIVES } from '../src/data/subclasses.js';
import { ABILITIES } from '../src/data/abilities.js';
import { MANUAL } from '../src/data/adventure.js';

test('signatures: Schutz-Besonderheiten auf Stufe 5 mit vollen Dauer-Boni haben Abklingzeit ≥ 1,25 × Dauer', () => {
  for (const sub of Object.values(SUBCLASSES)) {
    const def = ABILITIES[sub.signature];
    if (!['shield', 'stealth', 'healzone'].includes(def.shape)) continue;
    const mods = sub.passives.filter((p) => p.perRank.stat).map((p) => ({ stat: p.perRank.stat, flat: p.perRank.flat && p.perRank.flat * 3, pct: p.perRank.pct && p.perRank.pct * 3 }));
    const animal = sub.classId === 'hochstapler' ? 'giraffe' : 'hase';
    const stats = computeStats(animal, sub.classId, mods);
    const specials = sub.passives.filter((p) => p.perRank.special).map((p) => ({ ...p.perRank, value: p.perRank.value * 3 }));
    const p = abilityParams(def.id, 5, stats, { ...MANUAL, specials });
    assertTrue(p.cooldown >= 1.25 * p.duration, `${def.id}: Abklingzeit ${p.cooldown.toFixed(2)} s, Dauer ${p.duration} s`);
  }
});

test('signatures: Erdmännchen sucht Ziele nur in Reichweite des Helden und kehrt sonst zurück', () => {
  const w = world('hochstapler', 'giraffe');
  const far = dummy(w, 20, 0);
  castAbility(w, 'erdmaennchen', 1);
  w.followers[0].x = 10;
  for (let i = 0; i < 20; i++) stepWorld(w, 0.1, NONE);
  assertEqual(far.hp, far.maxHp, 'Gegner 20 m vom Helden bleibt unberührt');
  assertTrue(Math.hypot(w.followers[0].x, w.followers[0].z) < 3, 'kehrt zum Helden zurück');
});
