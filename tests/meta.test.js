import { test, assertEqual, assertClose, assertTrue } from './runner.js';
import { defaultSave } from '../src/save/schema.js';
import { metaPrice, buyMeta, metaModifiers, hasRevive } from '../src/save/meta.js';
import { META } from '../src/data/meta.js';
import { computeStats } from '../src/core/stats.js';
import { effectText } from '../src/ui/metaShop.js';

test('meta: Preise', () => {
  assertEqual(metaPrice('leben', 0), 50);
  assertEqual(metaPrice('leben', 4), 800);
  assertEqual(metaPrice('wiederbelebung', 0), 500);
});

test('meta: Daten entsprechen der Vorgabe', () => {
  assertEqual(Object.keys(META).length, 8);
  assertEqual(META.wiederbelebung.maxLevel, 1);
  assertEqual(META.wiederbelebung.modifier, undefined);
  assertEqual(META.ruestung.modifier, { stat: 'armor', flat: 1 });
});

test('meta: buyMeta ohne genug Gold ändert nichts', () => {
  const s = defaultSave();
  s.gold = 49;
  assertEqual(buyMeta(s, 'leben'), { ok: false, reason: 'gold' });
  assertEqual(s.gold, 49);
  assertEqual(s.metaUpgrades, {});
});

test('meta: buyMeta auf Höchststufe und unbekannte Id', () => {
  const s = defaultSave();
  s.gold = 10000;
  s.metaUpgrades.leben = 5;
  assertEqual(buyMeta(s, 'leben'), { ok: false, reason: 'max' });
  assertEqual(buyMeta(s, 'drache'), { ok: false, reason: 'unknown' });
  assertEqual(s.gold, 10000);
});

test('meta: buyMeta zieht den Preis ab und erhöht die Stufe', () => {
  const s = defaultSave();
  s.gold = 200;
  assertEqual(buyMeta(s, 'leben'), { ok: true });
  assertEqual(buyMeta(s, 'leben'), { ok: true });
  assertEqual(s.gold, 50);
  assertEqual(s.metaUpgrades.leben, 2);
  s.gold = 500;
  assertEqual(buyMeta(s, 'wiederbelebung'), { ok: true });
  assertEqual(s.gold, 0);
  assertEqual(buyMeta(s, 'wiederbelebung'), { ok: false, reason: 'max' });
});

test('meta: metaModifiers multipliziert je Stufe und überspringt Stufe 0 und Wiederbelebung', () => {
  const s = defaultSave();
  s.metaUpgrades = { leben: 3, schaden: 0, wiederbelebung: 1 };
  assertEqual(metaModifiers(s), [{ stat: 'maxHp', pct: 0.15 }]);
  s.metaUpgrades = { ruestung: 2 };
  assertEqual(metaModifiers(s), [{ stat: 'armor', flat: 2 }]);
  assertEqual(metaModifiers(defaultSave()), []);
});

test('meta: Modifikatoren wirken in computeStats', () => {
  const s = defaultSave();
  s.metaUpgrades = { leben: 3 };
  const stats = computeStats('hase', 'krieger', metaModifiers(s));
  assertClose(stats.maxHp, 80 * 1.45);
});

test('meta: hasRevive', () => {
  const s = defaultSave();
  assertEqual(hasRevive(s), false);
  s.metaUpgrades.wiederbelebung = 1;
  assertTrue(hasRevive(s));
});

test('meta: Laden beschreibt die Wirkung einer Stufe in Worten', () => {
  assertEqual(effectText(META.leben, 0), 'keine');
  assertEqual(effectText(META.leben, 1), '+5 %');
  assertEqual(effectText(META.leben, 3), '+15 %');
  assertEqual(effectText(META.tempo, 1), '+3 %');
  assertEqual(effectText(META.ruestung, 2), '+2');
  assertEqual(effectText(META.wiederbelebung, 0), 'nicht erworben');
  assertEqual(effectText(META.wiederbelebung, 1), 'aktiv');
});
