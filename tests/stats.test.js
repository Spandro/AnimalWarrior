import { test, assertClose, assertEqual, assertTrue, assertThrows } from './runner.js';
import { computeStats } from '../src/core/stats.js';
import { ANIMALS } from '../src/data/animals.js';
import { CLASSES } from '../src/data/classes.js';
import { isValidPair } from '../src/core/roster.js';

test('stats: Hase Krieger', () => {
  const s = computeStats('hase', 'krieger');
  assertClose(s.maxHp, 104); assertClose(s.armor, 2); assertClose(s.dodge, 0.15);
});
test('stats: Ente Magier', () => {
  const s = computeStats('ente', 'magier');
  assertClose(s.maxHp, 110.5); assertClose(s.cooldown, 0.9); assertClose(s.area, 1.15); assertClose(s.hpRegen, 1);
});
test('stats: Waschbär Dieb', () => {
  const s = computeStats('waschbaer', 'dieb');
  assertClose(s.critChance, 0.25); assertClose(s.critDamage, 1.75);
  assertClose(s.moveSpeed, 5.72); assertClose(s.pickupRadius, 3.5); assertClose(s.goldGain, 1.2);
});
test('stats: fest vor prozentual', () => {
  const s = computeStats('hase', 'krieger', [{ stat: 'maxHp', flat: 20 }, { stat: 'maxHp', pct: 0.2 }]);
  assertClose(s.maxHp, (80 + 20) * 1.5);
});
test('stats: Deckelungen', () => {
  const s = computeStats('hase', 'magier', [{ stat: 'dodge', flat: 0.9 }, { stat: 'cooldown', pct: -0.9 }]);
  assertClose(s.dodge, 0.6); assertClose(s.cooldown, 0.4);
});
test('stats: Giraffe & Erdmännchen als Hochstapler', () => {
  const s = computeStats('giraffe', 'hochstapler');
  assertClose(s.maxHp, 115 * 1.15);
  assertClose(s.armor, 1);
  assertClose(s.pickupRadius, 2.5 * 1.3);
  assertClose(s.xpGain, 1.1);
  assertClose(s.area, 1.1);
  assertClose(s.moveSpeed, 5.0);
});
test('stats: alle gültigen Kombinationen ergeben endliche positive Werte', () => {
  const positive = ['maxHp', 'moveSpeed', 'damage', 'cooldown', 'area', 'critDamage', 'pickupRadius', 'xpGain', 'goldGain'];
  let combos = 0;
  for (const a of Object.keys(ANIMALS)) {
    for (const c of Object.keys(CLASSES)) {
      if (!isValidPair(a, c)) continue;
      combos++;
      const s = computeStats(a, c);
      for (const [key, value] of Object.entries(s)) {
        assertTrue(Number.isFinite(value), `${a}/${c}: ${key} nicht endlich`);
      }
      for (const key of positive) assertTrue(s[key] > 0, `${a}/${c}: ${key} nicht positiv`);
    }
  }
  assertEqual(combos, 10, 'neun Grundkombinationen plus das Duo');
});
test('stats: unbekannte Ids werfen', () => {
  assertThrows(() => computeStats('drache', 'krieger'));
  assertThrows(() => computeStats('hase', 'barde'));
});
