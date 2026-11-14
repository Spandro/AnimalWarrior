import { test, assertEqual, assertTrue, assertClose } from './runner.js';
import { xpToNextAdventure, gainXp, spendPoint, setButton, adventureModifiers, enemyMultipliers } from '../src/core/adventureHero.js';
import { castManual, abilityParams } from '../src/core/abilities.js';
import { createWorld, stepWorld, spawnEnemy } from '../src/core/world.js';
import { newAdventure } from '../src/save/adventure.js';
import { defaultSave, addHero } from '../src/save/store.js';
import { ADVENTURE_LEVEL, MANUAL, ADVENTURE_BALANCE } from '../src/data/adventure.js';
import { MAPS } from '../src/data/maps/index.js';
import { ENEMIES, ELITE } from '../src/data/enemies.js';
import { QUESTS } from '../src/data/quests.js';

function hero(animal = 'hase', cls = 'krieger') {
  const save = defaultSave();
  const h = addHero(save, { name: 'Hoppel', animal, class: cls }, { now: 1, id: 'h1' });
  h.adventure = newAdventure(h);
  return { save, h, a: h.adventure };
}

test('adventureHero: Level-up gibt Punkt, Fähigkeiten frei mit 2/4/6/8, neue landen auf leeren Knöpfen', () => {
  const { a } = hero();
  assertEqual(ADVENTURE_LEVEL.unlockAt, [2, 4, 6, 8]);
  const r = gainXp(a, xpToNextAdventure(1), 'krieger');
  assertEqual([r.levels, a.level, a.skillPoints, r.unlocked], [1, 2, 1, ['wirbelschlag']]);
  assertEqual(a.buttons, ['wirbelschlag', null, null]);
  let total = 0;
  for (let l = 2; l < 8; l++) total += xpToNextAdventure(l);
  gainXp(a, total, 'krieger');
  assertEqual(a.level, 8);
  assertEqual(a.buttons, ['wirbelschlag', 'schildstoss', 'kriegsschrei']);
  assertTrue(Object.hasOwn(a.abilities, 'erdspalter'));
  assertEqual(a.skillPoints, 7);
});

test('adventureHero: Punkte heben Stufen bis 5, nur für freie Fähigkeiten', () => {
  const { a } = hero();
  a.skillPoints = 10;
  assertTrue(!spendPoint(a, 'wirbelschlag'));
  for (let i = 0; i < 4; i++) assertTrue(spendPoint(a, 'schwerthieb'));
  assertTrue(!spendPoint(a, 'schwerthieb'));
  assertEqual([a.abilities.schwerthieb, a.skillPoints], [5, 6]);
  a.skillPoints = 0;
  a.abilities.wirbelschlag = 1;
  assertTrue(!spendPoint(a, 'wirbelschlag'));
});

test('adventureHero: Knöpfe belegen, verschieben statt doppeln, Startfähigkeit nie', () => {
  const { a } = hero();
  a.abilities.wirbelschlag = 1; a.abilities.schildstoss = 1;
  assertTrue(setButton(a, 0, 'wirbelschlag'));
  assertTrue(setButton(a, 2, 'wirbelschlag'));
  assertEqual(a.buttons, [null, null, 'wirbelschlag']);
  assertTrue(!setButton(a, 1, 'schwerthieb'));
  assertTrue(!setButton(a, 1, 'erdspalter'));
  assertTrue(setButton(a, 2, null));
  assertEqual(a.buttons, [null, null, null]);
});

test('adventureHero: Werte aus Level, Ausrüstung mit Verbesserung und Dauerboni', () => {
  const { save, h, a } = hero();
  save.inventory.push('helm_zuversicht');
  a.equipment.kopf = 'helm_zuversicht';
  save.itemLevels.helm_zuversicht = 5;
  save.metaUpgrades = { ruestung: 2, wiederbelebung: 1 };
  a.level = 3;
  const mods = adventureModifiers(save, h);
  const sum = (stat, kind) => mods.filter((m) => m.stat === stat).reduce((s, m) => s + (m[kind] || 0), 0);
  assertClose(sum('armor', 'flat'), 2 + 2);
  assertClose(sum('maxHp', 'pct'), ADVENTURE_BALANCE.heroHpMul + 2 * ADVENTURE_LEVEL.perLevel.maxHp);
  assertClose(sum('damage', 'pct'), 2 * ADVENTURE_LEVEL.perLevel.damage);
  save.itemLevels.helm_zuversicht = 1;
  assertClose(adventureModifiers(save, h).filter((m) => m.stat === 'armor').reduce((s, m) => s + m.flat, 0), 1 + 2);
});

function arena(classId = 'krieger', abilities) {
  const world = createWorld({ seed: 5, animalId: 'hase', classId });
  world.abilityMods = MANUAL;
  world.hero.abilities = abilities;
  return world;
}

test('abilities: Grundattacke mit Gate schlägt nur mit Gegner in Reichweite', () => {
  const world = arena('krieger', [{ id: 'schwerthieb', level: 1, cooldownLeft: 0, gate: 'engage' }]);
  const far = spawnEnemy(world, 'ratte', 12, 0);
  stepWorld(world, 1 / 60, { moveX: 0, moveZ: 0 });
  assertEqual(world.events.filter((e) => e.type === 'cast').length, 0);
  far.x = 2;
  stepWorld(world, 1 / 60, { moveX: 0, moveZ: 0 });
  assertEqual(world.events.filter((e) => e.type === 'cast').length, 1);
});

test('abilities: castManual ohne Ziel scheitert ohne Abklingzeit, mit Ziel stärker und langsamer', () => {
  const world = arena('magier', [{ id: 'feuerball', level: 1, cooldownLeft: 0 }, { id: 'kettenblitz', level: 1, cooldownLeft: 0, manual: true }]);
  assertTrue(!castManual(world, 'kettenblitz'));
  assertEqual(world.hero.abilities[1].cooldownLeft, 0);
  spawnEnemy(world, 'dachs', 4, 0);
  assertTrue(castManual(world, 'kettenblitz'));
  const plain = abilityParams('kettenblitz', 1, world.hero.stats);
  const manual = abilityParams('kettenblitz', 1, world.hero.stats, MANUAL);
  assertClose(manual.damage, plain.damage * MANUAL.damageMul);
  assertClose(world.hero.abilities[1].cooldownLeft, Math.max(MANUAL.minCooldown, plain.cooldown * MANUAL.cooldownMul));
  assertTrue(!castManual(world, 'kettenblitz'));
  assertTrue(!castManual(world, 'feuerball'));
  stepWorld(world, 1, { moveX: 0, moveZ: 0 });
  assertClose(world.hero.abilities[1].cooldownLeft, Math.max(MANUAL.minCooldown, plain.cooldown * MANUAL.cooldownMul) - 1, 1e-6);
});

test('abilities: Umlauf von Hand endet nach orbitSeconds', () => {
  const world = arena('magier', [{ id: 'arkankugeln', level: 1, cooldownLeft: 0, manual: true }]);
  assertTrue(castManual(world, 'arkankugeln'));
  assertTrue(world.orbitals.length > 0);
  assertClose(world.hero.abilities[0].cooldownLeft, MANUAL.orbitCooldown);
  for (let i = 0; i < MANUAL.orbitSeconds * 10 + 2; i++) stepWorld(world, 0.1, { moveX: 0, moveZ: 0 });
  assertEqual(world.orbitals.length, 0);
});

test('adventureHero: nicht unter 20 s in einer Gruppe aus 6 Helmfischen seiner Stufe', () => {
  const { save, h, a } = hero('hase', 'magier');
  a.level = 5;
  const world = createWorld({ seed: 9, animalId: 'hase', classId: 'magier', modifiers: adventureModifiers(save, h) });
  world.hero.abilities = [];
  world.contactInterval = ADVENTURE_BALANCE.contactInterval;
  const m = enemyMultipliers(5);
  for (let i = 0; i < 6; i++) spawnEnemy(world, 'helmfisch', Math.cos(i) * 2, Math.sin(i) * 2, { hpMul: m.hpMul, dmgMul: m.dmgMul });
  for (let i = 0; i < 20 * 30; i++) stepWorld(world, 1 / 30, { moveX: 0, moveZ: 0 });
  assertTrue(world.hero.hp > 0, `Leben ${world.hero.hp}`);
});

test('adventureHero: Kapitel 1 bringt ohne Wiederholen etwa Level 9 bis 11', () => {
  let xp = 0;
  for (const p of MAPS.kapitel1.packs) {
    for (const [type, n] of Object.entries(p.enemies)) xp += ENEMIES[type].xp * n * enemyMultipliers(p.level).xpMul;
    if (p.elite) xp += ENEMIES[p.elite].xp * (ELITE.xpMul - 1) * enemyMultipliers(p.level).xpMul;
  }
  for (const b of MAPS.kapitel1.bosses) xp += ENEMIES[b.type].xp * enemyMultipliers(b.level).xpMul;
  for (const q of Object.values(QUESTS)) xp += q.reward.xp;
  const a = newAdventure({ class: 'krieger' });
  gainXp(a, xp, 'krieger');
  assertTrue(a.level >= 9 && a.level <= 11, `Level ${a.level} bei ${Math.round(xp)} Erfahrung`);
});
