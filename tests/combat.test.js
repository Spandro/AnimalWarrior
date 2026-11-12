import { test, assertEqual, assertTrue } from './runner.js';
import { createRng } from '../src/core/rng.js';
import { resolveHit } from '../src/core/combat.js';

const attacker = { baseDamage: 10, damage: 1, critChance: 0, critDamage: 2 };
const noDefense = { armor: 0, dodge: 0 };

test('combat: Grundschaden ohne Krit und Rüstung', () => {
  assertEqual(resolveHit(createRng(1), attacker, noDefense), { dodged: false, crit: false, amount: 10 });
});
test('combat: kritischer Treffer verdoppelt Schaden', () => {
  assertEqual(resolveHit(createRng(1), { ...attacker, critChance: 1 }, noDefense), { dodged: false, crit: true, amount: 20 });
});
test('combat: Rüstung senkt Schaden, mindestens 1', () => {
  assertEqual(resolveHit(createRng(1), attacker, { armor: 50, dodge: 0 }).amount, 1);
  assertEqual(resolveHit(createRng(1), attacker, { armor: 3, dodge: 0 }).amount, 7);
});
test('combat: Ausweichen bei dodge 1', () => {
  assertEqual(resolveHit(createRng(1), { ...attacker, critChance: 1 }, { armor: 0, dodge: 1 }), { dodged: true, crit: false, amount: 0 });
});
test('combat: Ausweichquote bei dodge 0.15 liegt zwischen 0.13 und 0.17', () => {
  const rng = createRng(123);
  let dodged = 0;
  for (let i = 0; i < 10000; i++) if (resolveHit(rng, attacker, { armor: 0, dodge: 0.15 }).dodged) dodged++;
  const rate = dodged / 10000;
  assertTrue(rate >= 0.13 && rate <= 0.17, `Quote ${rate}`);
});
