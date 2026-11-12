import { test, assertEqual, assertTrue } from './runner.js';
import { createRng } from '../src/core/rng.js';

test('rng: gleicher Startwert, gleiche Folge', () => {
  const a = createRng(42), b = createRng(42);
  assertEqual([a.next(), a.next(), a.next()], [b.next(), b.next(), b.next()]);
});
test('rng: Wertebereiche', () => {
  const r = createRng(7);
  for (let i = 0; i < 1000; i++) {
    const n = r.next(); assertTrue(n >= 0 && n < 1);
    const k = r.int(2, 5); assertTrue(k >= 2 && k <= 5 && Number.isInteger(k));
  }
  assertEqual(createRng(1).chance(0), false);
  assertEqual(createRng(1).chance(1), true);
});
