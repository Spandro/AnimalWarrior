import { test, assertEqual, assertTrue } from './runner.js';
import { ITEMS } from '../src/data/items.js';
import { rollAdventureItem } from '../src/core/loot.js';
import { rollItem } from '../src/core/tavern.js';
import { createRng } from '../src/core/rng.js';

test('loot: Taverne würfelt nur Taverne-Gegenstände, das Abenteuer nur Kapitel-1-Gegenstände', () => {
  const rng = createRng(11);
  for (let i = 0; i < 2000; i++) {
    assertEqual(ITEMS[rollItem(rng)].source, 'taverne');
    assertEqual(ITEMS[rollAdventureItem(rng, 'kapitel1')].source, 'kapitel1');
  }
});

test('loot: mindestens selten würfelt nie gewöhnlich', () => {
  const rng = createRng(12);
  for (let i = 0; i < 2000; i++) assertTrue(ITEMS[rollAdventureItem(rng, 'kapitel1', 'selten')].rarity !== 'gewoehnlich');
});

test('loot: Seltenheiten im Abenteuer 70/25/5 (±2 Prozentpunkte über 10.000 Würfe)', () => {
  const rng = createRng(13), n = 10000, count = { gewoehnlich: 0, selten: 0, legendaer: 0 };
  for (let i = 0; i < n; i++) count[ITEMS[rollAdventureItem(rng, 'kapitel1')].rarity]++;
  assertTrue(Math.abs(count.gewoehnlich / n - 0.70) < 0.02, `${count.gewoehnlich}`);
  assertTrue(Math.abs(count.selten / n - 0.25) < 0.02, `${count.selten}`);
  assertTrue(Math.abs(count.legendaer / n - 0.05) < 0.02, `${count.legendaer}`);
});
