import { test, assertEqual, assertTrue } from './runner.js';
import { ITEMS, RARITIES, SLOT_NAMES, TAVERN_ITEMS, itemSheet } from '../src/data/items.js';
import { BASE_STATS } from '../src/data/animals.js';
import { rollItem } from '../src/core/tavern.js';
import { createRng } from '../src/core/rng.js';

const list = Object.values(ITEMS).filter((i) => i.source === 'taverne');

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
  for (const id of Object.keys(TAVERN_ITEMS)) assertTrue(counts[id] > 0, `${id} nie gewürfelt`);
});

// ---------------------------------------------------------------- Abenteuer: Gegenstände aus Kapitel 1

const k1 = Object.values(ITEMS).filter((i) => i.source === 'kapitel1');

test('items: 30 Gegenstände aus Kapitel 1, 15/10/5, icon 0–29, jede Kennung hat eine Quelle', () => {
  assertEqual(k1.length, 30);
  assertEqual(Object.values(ITEMS).length, 70);
  for (const item of Object.values(ITEMS)) assertTrue(['taverne', 'kapitel1', 'kapitel2', 'kapitel3'].includes(item.source), item.id);
  assertEqual(k1.filter((i) => i.rarity === 'gewoehnlich').length, 15);
  assertEqual(k1.filter((i) => i.rarity === 'selten').length, 10);
  assertEqual(k1.filter((i) => i.rarity === 'legendaer').length, 5);
  assertEqual(k1.map((i) => i.icon).sort((a, b) => a - b), Array.from({ length: 30 }, (_, n) => n));
  for (const slot of Object.keys(SLOT_NAMES)) assertTrue(k1.some((i) => i.slot === slot), slot);
  for (const kind of ['nahkampf', 'zauber', 'wurf']) assertTrue(k1.filter((i) => i.weaponKind === kind).length >= 2, kind);
});

test('items: itemSheet und TAVERN_ITEMS trennen die Bögen und die Truhe der Taverne', () => {
  assertEqual(itemSheet(ITEMS.helm_zuversicht), 'beute');
  assertEqual(itemSheet(k1[0]), 'beute1');
  assertEqual(Object.keys(TAVERN_ITEMS).length, 24);
  assertTrue(Object.values(TAVERN_ITEMS).every((i) => i.source === 'taverne'));
});

test('items: Kapitel 2 – acht Gegenstände, stärker als die aus Kapitel 1, noch ohne Bild', () => {
  const k2 = Object.values(ITEMS).filter((i) => i.source === 'kapitel2');
  assertEqual(k2.length, 8);
  assertEqual(k2.map((i) => i.icon).sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7]);
  assertTrue(k2.some((i) => i.rarity === 'selten') && k2.some((i) => i.rarity === 'legendaer'));
  for (const kind of ['nahkampf', 'zauber', 'wurf']) assertTrue(k2.some((i) => i.weaponKind === kind), kind);
  for (const item of k2) {
    assertEqual(itemSheet(item), null, item.id);
    for (const m of item.modifiers) {
      const kind = 'pct' in m ? 'pct' : 'flat';
      const same = k1.filter((i) => i.rarity === item.rarity).flatMap((i) => i.modifiers).filter((x) => x.stat === m.stat && kind in x);
      const best = Math.max(0, ...same.map((x) => Math.abs(x[kind])));
      assertTrue(Math.abs(m[kind]) >= best, `${item.id}: ${m.stat} ${m[kind]} < ${best}`);
    }
  }
});

test('items: Kapitel 3 – acht Gegenstände, mindestens so stark wie die aus Kapitel 2, noch ohne Bild', () => {
  const k2 = Object.values(ITEMS).filter((i) => i.source === 'kapitel2');
  const k3 = Object.values(ITEMS).filter((i) => i.source === 'kapitel3');
  assertEqual(k3.length, 8);
  assertEqual(k3.map((i) => i.icon).sort((a, b) => a - b), [0, 1, 2, 3, 4, 5, 6, 7]);
  assertTrue(k3.some((i) => i.rarity === 'selten') && k3.some((i) => i.rarity === 'legendaer'));
  for (const kind of ['nahkampf', 'zauber', 'wurf']) assertTrue(k3.some((i) => i.weaponKind === kind), kind);
  for (const item of k3) {
    assertEqual(itemSheet(item), null, item.id);
    for (const m of item.modifiers) {
      const kind = 'pct' in m ? 'pct' : 'flat';
      const same = [...k1, ...k2].filter((i) => i.rarity === item.rarity).flatMap((i) => i.modifiers).filter((x) => x.stat === m.stat && kind in x);
      const best = Math.max(0, ...same.map((x) => Math.abs(x[kind])));
      assertTrue(Math.abs(m[kind]) >= best, `${item.id}: ${m.stat} ${m[kind]} < ${best}`);
    }
  }
});
