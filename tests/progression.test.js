import { test, assertEqual, assertClose, assertTrue } from './runner.js';
import { createWorld, recomputeHeroStats } from '../src/core/world.js';
import { xpToNext, pendingLevelUps, rollCards, applyCard, openChest } from '../src/core/progression.js';
import { CLASSES } from '../src/data/classes.js';
import { ANIMALS } from '../src/data/animals.js';
import { BONUSES, FILLER } from '../src/data/bonuses.js';
import { DROPS } from '../src/data/enemies.js';

const newWorld = (classId = 'krieger', extra = {}) => createWorld({ seed: 7, animalId: 'ente', classId, ...extra });
const key = (c) => `${c.kind}:${c.id ?? ''}`;
const KRIEGER_POOL = ['wirbelschlag', 'schildstoss', 'kriegsschrei', 'erdspalter'];

function maxEverything(w) {
  for (const id of CLASSES[w.hero.classId].abilityPool) w.hero.abilities.push({ id, level: 1, cooldownLeft: 0 });
  for (const a of w.hero.abilities) a.level = 5;
  for (const id of Object.keys(BONUSES)) w.run.bonuses[id] = 5;
}

function throws(fn) {
  try { fn(); } catch (e) { return e instanceof Error; }
  return false;
}

test('progression: xpToNext folgt der Kurve', () => {
  assertEqual(xpToNext(1), 5);
  assertEqual(xpToNext(2), 15);
  assertEqual(xpToNext(20), 195);
  assertEqual(xpToNext(21), 211);
});

test('progression: mit 25 xp auf Level 1 sind zwei Level-ups offen', () => {
  const w = newWorld();
  w.run.xp = 25;
  assertEqual(pendingLevelUps(w), 2);
  w.run.xp = 4;
  assertEqual(pendingLevelUps(w), 0);
});

test('progression: rollCards liefert drei verschiedene Karten', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const w = newWorld('magier', { seed });
    const cards = rollCards(w);
    assertEqual(cards.length, 3);
    assertEqual(new Set(cards.map(key)).size, 3);
  }
});

test('progression: mit fünf Fähigkeiten kommt nie newAbility', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const w = newWorld('krieger', { seed });
    for (const id of KRIEGER_POOL) w.hero.abilities.push({ id, level: 1, cooldownLeft: 0 });
    assertEqual(w.hero.abilities.length, 5);
    assertTrue(rollCards(w, 10).every((c) => c.kind !== 'newAbility'));
  }
});

test('progression: Fähigkeiten anderer Klassen kommen nie', () => {
  const own = new Set([CLASSES.dieb.startAbility, ...CLASSES.dieb.abilityPool]);
  for (let seed = 1; seed <= 30; seed++) {
    const w = newWorld('dieb', { seed });
    for (const c of rollCards(w, 10)) {
      if (c.kind === 'newAbility' || c.kind === 'abilityLevel') assertTrue(own.has(c.id), c.id);
    }
  }
});

test('progression: abilityLevel nur für vorhandene Fähigkeiten unter Stufe 5, mit toLevel', () => {
  const w = newWorld();
  const levels = rollCards(w, 20).filter((c) => c.kind === 'abilityLevel');
  assertEqual(levels, [{ kind: 'abilityLevel', id: 'schwerthieb', toLevel: 2 }]);
});

test('progression: sind alle Fähigkeiten und Boni auf Stufe 5, kommen nur gold und heal', () => {
  const w = newWorld();
  maxEverything(w);
  assertEqual(rollCards(w), [
    { kind: 'gold', value: FILLER.gold }, { kind: 'heal', value: FILLER.heal }, { kind: 'gold', value: FILLER.gold }]);
  assertEqual(rollCards(w, 2), [{ kind: 'gold', value: 25 }, { kind: 'heal', value: 0.3 }]);
});

test('progression: Füllkarten ergänzen nur die fehlenden Plätze', () => {
  const w = newWorld();
  maxEverything(w);
  w.run.bonuses.leben = 4;
  const cards = rollCards(w);
  assertEqual(cards[0], { kind: 'bonus', id: 'leben', toLevel: 5 });
  assertEqual(cards.slice(1).map((c) => c.kind), ['gold', 'heal']);
});

test('progression: Bonus leben erhöht maxHp um 10 % des Grundwerts und hp um dieselbe Differenz', () => {
  const w = newWorld();
  const oldMax = w.hero.stats.maxHp;
  w.hero.hp -= 10;
  const oldHp = w.hero.hp;
  applyCard(w, { kind: 'bonus', id: 'leben', toLevel: 1 }, false);
  const expectedDiff = ANIMALS.ente.base.maxHp * 0.10;
  assertClose(w.hero.stats.maxHp - oldMax, expectedDiff, 1e-9);
  assertClose(w.hero.hp - oldHp, expectedDiff, 1e-9);
  assertEqual(w.run.bonuses, { leben: 1 });
});

test('progression: Boni bleiben von Meta-Modifikatoren getrennt und überleben recompute', () => {
  const meta = [{ stat: 'armor', flat: 3 }];
  const w = newWorld('krieger', { modifiers: meta });
  const armor0 = w.hero.stats.armor;
  applyCard(w, { kind: 'bonus', id: 'ruestung', toLevel: 1 }, false);
  applyCard(w, { kind: 'bonus', id: 'ruestung', toLevel: 2 }, false);
  assertEqual(w.hero.modifiers, meta);
  assertClose(w.hero.stats.armor, armor0 + 2, 1e-9);
  recomputeHeroStats(w);
  assertClose(w.hero.stats.armor, armor0 + 2, 1e-9);
});

test('progression: newAbility hängt Fähigkeit auf Stufe 1 an', () => {
  const w = newWorld();
  applyCard(w, { kind: 'newAbility', id: 'wirbelschlag' }, false);
  assertEqual(w.hero.abilities[1], { id: 'wirbelschlag', level: 1, cooldownLeft: 0 });
});

test('progression: abilityLevel erhöht die Stufe', () => {
  const w = newWorld();
  applyCard(w, { kind: 'abilityLevel', id: 'schwerthieb', toLevel: 2 }, false);
  assertEqual(w.hero.abilities[0].level, 2);
});

test('progression: gold nutzt goldGain, heal ist auf maxHp gedeckelt', () => {
  const w = newWorld();
  applyCard(w, { kind: 'gold', value: 25 }, false);
  assertClose(w.run.gold, 25 * w.hero.stats.goldGain, 1e-9);
  w.hero.hp = w.hero.stats.maxHp - 1;
  applyCard(w, { kind: 'heal', value: 0.3 }, false);
  assertEqual(w.hero.hp, w.hero.stats.maxHp);
  w.hero.hp = 1;
  applyCard(w, { kind: 'heal', value: 0.3 }, false);
  assertClose(w.hero.hp, 1 + w.hero.stats.maxHp * 0.3, 1e-9);
});

test('progression: applyCard verbraucht bei Level-up Erfahrung und erhöht das Level', () => {
  const w = newWorld();
  w.run.xp = 7;
  applyCard(w, { kind: 'gold', value: 25 });
  assertEqual(w.run.level, 2);
  assertEqual(w.run.xp, 2);
});

test('progression: unmögliche Karten werfen und ändern nichts', () => {
  const w = newWorld();
  const apply = (card) => () => applyCard(w, card);
  assertTrue(throws(apply({ kind: 'bonus', id: 'gibtsnicht' })), 'unbekannter Bonus');
  assertTrue(throws(apply({ kind: 'newAbility', id: 'gibtsnicht' })), 'unbekannte Fähigkeit');
  assertTrue(throws(apply({ kind: 'newAbility', id: 'feuerball' })), 'Fähigkeit anderer Klasse');
  assertTrue(throws(apply({ kind: 'newAbility', id: 'schwerthieb' })), 'bereits vorhanden');
  assertTrue(throws(apply({ kind: 'abilityLevel', id: 'wirbelschlag' })), 'nicht vorhanden');
  assertTrue(throws(apply({ kind: 'nonsense' })), 'unbekannte Art');
  w.hero.abilities[0].level = 5;
  assertTrue(throws(apply({ kind: 'abilityLevel', id: 'schwerthieb' })), 'schon Stufe 5');
  w.run.bonuses.leben = 5;
  assertTrue(throws(apply({ kind: 'bonus', id: 'leben' })), 'Bonus schon Stufe 5');
  assertEqual(w.run.level, 1);
  assertEqual(w.hero.abilities.length, 1);
});

test('progression: sechste Fähigkeit wirft', () => {
  const w = newWorld();
  for (const id of KRIEGER_POOL) applyCard(w, { kind: 'newAbility', id }, false);
  assertEqual(w.hero.abilities.length, 5);
  assertTrue(throws(() => applyCard(w, { kind: 'newAbility', id: 'schwerthieb' }, false)));
  assertEqual(w.hero.abilities.length, 5);
});

test('progression: openChest verbraucht kein Level, gibt Truhengold und meldet das Ereignis', () => {
  const w = newWorld();
  w.run.xp = 3;
  const card = openChest(w);
  assertEqual(w.run.level, 1);
  assertEqual(w.run.xp, 3);
  assertTrue(w.run.gold >= DROPS.chestGold * w.hero.stats.goldGain);
  assertEqual(w.events.filter((e) => e.type === 'chest'), [{ type: 'chest', card }]);
});
