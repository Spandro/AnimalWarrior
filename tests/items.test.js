import { test, assertEqual, assertTrue } from './runner.js';
import { ITEMS, RARITIES, SLOT_NAMES } from '../src/data/items.js';
import { BASE_STATS } from '../src/data/animals.js';
import { rollItem } from '../src/core/tavern.js';
import { createRng } from '../src/core/rng.js';

const list = Object.values(ITEMS);

test('items: 24 Gegenstände, 12/8/4 je Seltenheit, icon 0–23 je einmal, Kennungen eindeutig', () => {
  assertEqual(list.length, 24);
  for (const [key, item] of Object.entries(ITEMS)) assertEqual(item.id, key);
  assertEqual(new Set(list.map((i) => i.id)).size, 24);
  assertEqual(list.filter((i) => i.rarity === 'gewoehnlich').length, 12);
  assertEqual(list.filter((i) => i.rarity === 'selten').length, 8);
  assertEqual(list.filter((i) => i.rarity === 'legendaer').length, 4);
  assertEqual(list.map((i) => i.icon), Array.from({ length: 24 }, (_, n) => n));
  assertEqual(Object.keys(RARITIES), ['gewoehnlich', 'selten', 'legendaer']);
  assertEqual(Object.keys(SLOT_NAMES), ['kopf', 'koerper', 'fuesse', 'waffe', 'schmuck']);
  for (const item of list) assertTrue(item.line.length > 0, item.id);
});

test('items: jede Waffe hat weaponKind, sonst keins; jeder Modifikator nennt einen bekannten Wert aus BASE_STATS oder maxHp/moveSpeed', () => {
  const known = new Set([...Object.keys(BASE_STATS), 'maxHp', 'moveSpeed']);
  for (const item of list) {
    assertTrue(item.slot in SLOT_NAMES, item.id);
    assertTrue(item.rarity in RARITIES, item.id);
    if (item.slot === 'waffe') assertTrue(['nahkampf', 'zauber', 'wurf'].includes(item.weaponKind), item.id);
    else assertEqual(item.weaponKind, undefined);
    assertTrue(item.modifiers.length > 0, item.id);
    for (const m of item.modifiers) {
      assertTrue(known.has(m.stat), `${item.id}: ${m.stat}`);
      assertTrue(m.flat !== undefined || m.pct !== undefined, item.id);
    }
  }
});

test('items: Stichproben', () => {
  assertEqual(ITEMS.helm_zuversicht.name, 'Helm der mäßigen Zuversicht');
  assertEqual(ITEMS.helm_zuversicht.modifiers, [{ stat: 'armor', flat: 1 }]);
  const last = list.find((i) => i.icon === 23);
  assertEqual(last.name, 'Ring der unverschämten Glückssträhne');
  assertEqual(last.rarity, 'legendaer');
  assertEqual(RARITIES.selten.name, 'Selten');
  assertEqual(RARITIES.selten.weight, 25);
  assertEqual(RARITIES.selten.resale, 30);
  assertEqual(RARITIES.gewoehnlich.resale, 10);
  assertEqual(RARITIES.legendaer.resale, 100);
});

test('items: rollItem gleicher Startwert gleiches Ergebnis', () => {
  const a = createRng(7);
  const b = createRng(7);
  for (let n = 0; n < 50; n++) assertEqual(rollItem(a), rollItem(b));
});

test('items: rollItem über 20.000 Würfe', () => {
  const rng = createRng(12345);
  const counts = {};
  const byRarity = { gewoehnlich: 0, selten: 0, legendaer: 0 };
  const N = 20000;
  for (let n = 0; n < N; n++) {
    const id = rollItem(rng);
    assertTrue(id in ITEMS, id);
    counts[id] = (counts[id] ?? 0) + 1;
    byRarity[ITEMS[id].rarity]++;
  }
  assertTrue(Math.abs(byRarity.gewoehnlich / N - 0.70) <= 0.015, 'gewoehnlich');
  assertTrue(Math.abs(byRarity.selten / N - 0.25) <= 0.015, 'selten');
  assertTrue(Math.abs(byRarity.legendaer / N - 0.05) <= 0.015, 'legendaer');
  for (const id of Object.keys(ITEMS)) assertTrue(counts[id] > 0, `${id} nie gewürfelt`);
});
