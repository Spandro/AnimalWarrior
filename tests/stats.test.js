import { test, assertClose, assertTrue, assertThrows } from './runner.js';
import { computeStats } from '../src/core/stats.js';
import { ANIMALS } from '../src/data/animals.js';
import { CLASSES } from '../src/data/classes.js';

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
test('stats: alle neun Kombinationen ergeben endliche positive Werte', () => {
  const positive = ['maxHp', 'moveSpeed', 'damage', 'cooldown', 'area', 'critDamage', 'pickupRadius', 'xpGain', 'goldGain'];
  let combos = 0;
  for (const a of Object.keys(ANIMALS)) {
    for (const c of Object.keys(CLASSES)) {
      combos++;
      const s = computeStats(a, c);
      for (const [key, value] of Object.entries(s)) {
        assertTrue(Number.isFinite(value), `${a}/${c}: ${key} nicht endlich`);
      }
      for (const key of positive) assertTrue(s[key] > 0, `${a}/${c}: ${key} nicht positiv`);
    }
  }
  assertTrue(combos === 9, 'erwartet 9 Kombinationen');
});
test('stats: unbekannte Ids werfen', () => {
  assertThrows(() => computeStats('drache', 'krieger'));
  assertThrows(() => computeStats('hase', 'barde'));
});
