import { test, assertEqual, assertTrue, assertClose } from './runner.js';
import { xpToNextAdventure, gainXp, spendPoint, setButton, adventureModifiers, enemyMultipliers,
  pointsSpent, chooseSubclass, unlockBranch, spendPassive, specialBonus } from '../src/core/adventureHero.js';
import { castManual, abilityParams } from '../src/core/abilities.js';
import { createWorld, stepWorld, spawnEnemy } from '../src/core/world.js';
import { newAdventure, respecAdventure } from '../src/save/adventure.js';
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

/** Erfahrung eines Kapitels ohne Wiederholen: alle Gruppen, Bosse und Aufträge mit einem Schritt auf seiner Karte. */
function chapterXp(mapId) {
  let xp = 0;
  for (const p of MAPS[mapId].packs) {
    for (const [type, n] of Object.entries(p.enemies)) xp += ENEMIES[type].xp * n * enemyMultipliers(p.level).xpMul;
    if (p.elite) xp += ENEMIES[p.elite].xp * (ELITE.xpMul - 1) * enemyMultipliers(p.level).xpMul;
  }
  for (const b of MAPS[mapId].bosses) xp += ENEMIES[b.type].xp * enemyMultipliers(b.level).xpMul;
  for (const q of Object.values(QUESTS)) if ((q.chapter ?? 1) === MAPS[mapId].chapter) xp += q.reward.xp;
  return xp;
}

test('adventureHero: Kapitel 1 bringt ohne Wiederholen etwa Level 9 bis 11', () => {
  const xp = chapterXp('kapitel1');
  const a = newAdventure({ class: 'krieger' });
  gainXp(a, xp, 'krieger');
  assertTrue(a.level >= 9 && a.level <= 11, `Level ${a.level} bei ${Math.round(xp)} Erfahrung`);
});

test('adventureHero: Kapitel 2 bringt ohne Wiederholen von Level 10 etwa auf Level 15 bis 17', () => {
  const a = newAdventure({ class: 'krieger' });
  let need = 0;
  for (let l = 1; l < 10; l++) need += xpToNextAdventure(l);
  gainXp(a, need, 'krieger');
  assertEqual(a.level, 10);
  const xp = chapterXp('kapitel2');
  gainXp(a, xp, 'krieger');
  assertTrue(a.level >= 15 && a.level <= 17, `Level ${a.level} bei ${Math.round(xp)} Erfahrung`);
});

test('adventureHero: itemDelta vergleicht angelegtes und neues Stück mit Verbesserung', async () => {
  const { itemDelta, scaledModifiers } = await import('../src/core/adventureHero.js');
  assertEqual(scaledModifiers('helm_zuversicht', 5), [{ stat: 'armor', flat: 2 }]);
  assertEqual(itemDelta('helm_zuversicht', 'taucherhelm_beute', {}), [{ stat: 'armor', kind: 'flat', from: 1, to: 2 }]);
  assertEqual(itemDelta(null, 'helm_zuversicht', {}), [{ stat: 'armor', kind: 'flat', from: 0, to: 1 }]);
  assertEqual(itemDelta('helm_zuversicht', 'helm_zuversicht', { helm_zuversicht: 5 }), [{ stat: 'armor', kind: 'flat', from: 2, to: 2 }]);
  assertEqual(itemDelta('topf_kinnriemen', 'helm_zuversicht', {}),
    [{ stat: 'maxHp', kind: 'pct', from: 0.05, to: 0 }, { stat: 'armor', kind: 'flat', from: 0, to: 1 }]);
});

// ---------------------------------------------------------------- Etappe 2: Fähigkeitenbaum

/** Held mit Level `level`, alle Stammfähigkeiten frei, Punkte wie aus gainXp. */
function leveled(level, cls = 'krieger') {
  const x = hero(cls === 'hochstapler' ? 'giraffe' : 'hase', cls);
  if (cls === 'hochstapler') x.save.unlocks.push('duo');
  let need = 0;
  for (let l = 1; l < level; l++) need += xpToNextAdventure(l);
  gainXp(x.a, need, cls);
  return x;
}
const invariant = (a, cls = 'krieger') => assertEqual(pointsSpent(a, cls) + a.skillPoints, a.level - 1, 'Punkte-Summe');

test('adventureHero: Unterklasse erst ab Level 10, nur passende, nur einmal', () => {
  const { a } = leveled(9);
  assertTrue(!chooseSubclass(a, 'krieger', 'tuersteher'), 'Level 9');
  const b = leveled(10).a;
  assertTrue(!chooseSubclass(b, 'krieger', 'wetterfrosch'), 'fremde Klasse');
  assertTrue(!chooseSubclass(b, 'krieger', 'gibtsnicht'));
  assertTrue(chooseSubclass(b, 'krieger', 'tuersteher'));
  assertEqual(b.subclass, 'tuersteher');
  assertTrue(!chooseSubclass(b, 'krieger', 'kochstelle'), 'schon gewählt');
});

test('adventureHero: Wahl gibt alle Punkte zurück, Stamm auf 1, Knöpfe bleiben', () => {
  const { a } = leveled(12);
  spendPoint(a, 'schwerthieb'); spendPoint(a, 'schwerthieb'); spendPoint(a, 'wirbelschlag');
  const buttons = [...a.buttons];
  assertEqual(a.skillPoints, 8);
  assertTrue(chooseSubclass(a, 'krieger', 'kneipenschlaeger'));
  assertEqual(a.skillPoints, 11);
  assertTrue(Object.entries(a.abilities).every(([, l]) => l === 1));
  assertEqual(a.buttons, buttons);
  assertEqual(a.passives, {});
  invariant(a);
});

test('adventureHero: Astfähigkeit freischalten kostet 1 Punkt, nur eigener Ast, dann ausbauen und auf Knopf', () => {
  const { a } = leveled(10);
  chooseSubclass(a, 'krieger', 'tuersteher');
  assertTrue(!unlockBranch(a, 'roteruebe'), 'fremder Ast');
  assertTrue(!unlockBranch(a, 'schwerthieb'), 'Stamm');
  assertTrue(!setButton(a, 0, 'breiteskreuz'), 'noch gesperrt');
  assertTrue(unlockBranch(a, 'breiteskreuz'));
  assertEqual([a.abilities.breiteskreuz, a.skillPoints], [1, 8]);
  assertTrue(!unlockBranch(a, 'breiteskreuz'), 'schon frei');
  assertTrue(spendPoint(a, 'breiteskreuz'));
  assertEqual([a.abilities.breiteskreuz, a.skillPoints], [2, 7]);
  assertTrue(setButton(a, 0, 'breiteskreuz'));
  assertEqual(a.buttons[0], 'breiteskreuz');
  a.skillPoints = 0;
  assertTrue(!unlockBranch(a, 'ausweisbitte'), 'ohne Punkt');
  const fresh = leveled(10).a;
  assertTrue(!unlockBranch(fresh, 'breiteskreuz'), 'ohne Unterklasse');
});

test('adventureHero: Dauer-Boni bis Stufe 3, nur eigene; allgemeine wirken auf Werte, besondere über specialBonus', () => {
  const { save, h, a } = leveled(14);
  chooseSubclass(a, 'krieger', 'kneipenschlaeger');
  assertTrue(!spendPassive(a, 'dickehaut'), 'fremder Dauer-Bonus');
  const before = adventureModifiers(save, h).filter((m) => m.stat === 'damage').reduce((s, m) => s + (m.pct ?? 0), 0);
  for (let i = 0; i < 3; i++) assertTrue(spendPassive(a, 'wucht'));
  assertTrue(!spendPassive(a, 'wucht'), 'über 3');
  assertEqual(a.passives.wucht, 3);
  const after = adventureModifiers(save, h).filter((m) => m.stat === 'damage').reduce((s, m) => s + (m.pct ?? 0), 0);
  assertClose(after - before, 0.12);
  spendPassive(a, 'zapfhahn'); spendPassive(a, 'zapfhahn');
  assertClose(specialBonus(a, 'lifesteal'), 0.04);
  assertEqual(specialBonus(a, 'shieldPct'), 0);
  assertEqual(a.skillPoints, 13 - 5);
  invariant(a);
});

test('adventureHero: Punkte-Summe bleibt bei Wahl → Ausbau → Umlernen → Wahl', () => {
  const { save, h, a } = leveled(15);
  save.gold = 2000;
  invariant(a);
  spendPoint(a, 'schwerthieb'); spendPoint(a, 'erdspalter');
  invariant(a);
  chooseSubclass(a, 'krieger', 'tuersteher');
  invariant(a);
  unlockBranch(a, 'breiteskreuz'); unlockBranch(a, 'hausverbot'); spendPoint(a, 'breiteskreuz'); spendPassive(a, 'dickehaut'); spendPoint(a, 'wirbelschlag');
  setButton(a, 0, 'breiteskreuz'); setButton(a, 1, 'wirbelschlag');
  invariant(a);
  assertEqual(respecAdventure(save, h.id), { ok: true });
  invariant(a);
  assertEqual([a.subclass, a.passives, a.skillPoints, save.gold], [null, {}, 14, 1500]);
  assertTrue(!Object.hasOwn(a.abilities, 'breiteskreuz') && !Object.hasOwn(a.abilities, 'hausverbot'));
  assertTrue(Object.values(a.abilities).every((l) => l === 1));
  assertEqual(a.buttons, [null, 'wirbelschlag', 'kriegsschrei']);
  assertTrue(chooseSubclass(a, 'krieger', 'kochstelle'));
  unlockBranch(a, 'eintopf'); spendPassive(a, 'grossertopf');
  invariant(a);
});

test('adventureHero: Umlernen kostet 500 Gold, ohne Gold, ohne Unterklasse oder unter Level 10 abgelehnt', () => {
  const { save, h, a } = leveled(10);
  save.gold = 499;
  assertEqual(respecAdventure(save, h.id), { ok: false, reason: 'none' });
  chooseSubclass(a, 'krieger', 'tuersteher');
  assertEqual(respecAdventure(save, h.id), { ok: false, reason: 'gold' });
  assertEqual([a.subclass, save.gold], ['tuersteher', 499]);
  save.gold = 500;
  assertEqual(respecAdventure(save, h.id), { ok: true });
  assertEqual(save.gold, 0);
  const low = leveled(9);
  low.save.gold = 900;
  low.a.subclass = 'tuersteher';
  assertEqual(respecAdventure(low.save, low.h.id), { ok: false, reason: 'level' });
});
