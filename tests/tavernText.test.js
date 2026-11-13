import { test, assertEqual, assertTrue } from './runner.js';
import { defaultSave } from '../src/save/store.js';
import { ITEMS } from '../src/data/items.js';
import { stakeOptions, formatFactor, chestSlots, foundCount, cardLabel, itemKindLabel } from '../src/ui/tavernText.js';

test('tavernText: stakeOptions gibt nur bezahlbare Einsätze frei', () => {
  const opts = stakeOptions(60);
  assertEqual(opts.map((o) => o.stake), [10, 50, 100, 500]);
  assertEqual(opts.map((o) => o.enabled), [true, true, false, false]);
  assertEqual(stakeOptions(5).every((o) => !o.enabled), true);
  assertEqual(stakeOptions(500).every((o) => o.enabled), true);
});

test('tavernText: formatFactor mit deutschem Komma und einer Nachkommastelle', () => {
  assertEqual(formatFactor(1.2), '×1,2');
  assertEqual(formatFactor(12), '×12,0');
  assertEqual(formatFactor(2), '×2,0');
});

test('tavernText: chestSlots liefert 24 Plätze in Icon-Reihenfolge und verrät nichts', () => {
  const save = { ...defaultSave(), inventory: ['opas_schwert'], seenItems: [] };
  const slots = chestSlots(save);
  assertEqual(slots.length, 24);
  assertEqual(slots.map((s) => s.icon), Array.from({ length: 24 }, (_, i) => i));
  const found = slots.filter((s) => s.found);
  assertEqual(found.length, 1);
  assertEqual(found[0].id, 'opas_schwert');
  assertEqual(found[0].icon, ITEMS.opas_schwert.icon);
  assertEqual(found[0].isNew, true);
  for (const s of slots.filter((x) => !x.found)) {
    assertEqual(s.id, null);
    assertEqual(s.isNew, false);
  }
});

test('tavernText: angesehene Gegenstände sind nicht mehr neu', () => {
  const save = { ...defaultSave(), inventory: ['helm_zuversicht', 'bumerang'], seenItems: ['helm_zuversicht'] };
  const slots = chestSlots(save);
  assertEqual(slots[ITEMS.helm_zuversicht.icon].isNew, false);
  assertEqual(slots[ITEMS.bumerang.icon].isNew, true);
});

test('tavernText: foundCount zählt gefundene Gegenstände', () => {
  assertEqual(foundCount(defaultSave()), 0);
  assertEqual(foundCount({ ...defaultSave(), inventory: ['helm_zuversicht', 'bumerang'] }), 2);
});

test('tavernText: itemKindLabel nennt Art, Waffenart und Seltenheit', () => {
  assertEqual(itemKindLabel(ITEMS.opas_schwert), 'Waffe (Nahkampf) · Legendär');
  assertEqual(itemKindLabel(ITEMS.helm_zuversicht), 'Kopf · Gewöhnlich');
  assertEqual(itemKindLabel(ITEMS.sandalen_siebenmeilen), 'Füße · Selten');
});

test('tavernText: cardLabel nennt Zahlen und Bilder', () => {
  assertEqual(cardLabel(2), '2');
  assertEqual(cardLabel(10), '10');
  assertEqual(cardLabel(11), 'B');
  assertEqual(cardLabel(12), 'D');
  assertEqual(cardLabel(13), 'K');
  assertEqual(cardLabel(14), 'A');
  assertTrue(typeof cardLabel(7) === 'string');
});
