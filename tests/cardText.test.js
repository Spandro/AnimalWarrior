import { test, assertEqual, assertTrue } from './runner.js';
import { describeCard } from '../src/ui/cardText.js';
import { createWorld } from '../src/core/world.js';
import { ABILITIES } from '../src/data/abilities.js';
import { BONUSES } from '../src/data/bonuses.js';

const haseKrieger = () => createWorld({ seed: 1, animalId: 'hase', classId: 'krieger' });
const filled = (s) => typeof s === 'string' && s.trim() !== '' && !/undefined|NaN|null/.test(s);

test('cardText: Gold-Karte', () => {
  assertEqual(describeCard({ kind: 'gold', value: 25 }, haseKrieger()), { title: 'Goldbeutel', kind: 'Gold', text: '25 Gold' });
});

test('cardText: Heil-Karte', () => {
  assertEqual(describeCard({ kind: 'heal', value: 0.3 }, haseKrieger()), { title: 'Heiltrank', kind: 'Heilung', text: 'Heilt 30 % Leben' });
});

test('cardText: Bonus-Karte nennt Namen, Stufe und Wirkung', () => {
  const d = describeCard({ kind: 'bonus', id: 'leben', toLevel: 2 }, haseKrieger());
  assertEqual(d, { title: 'Leben', kind: 'Bonus · Stufe 2', text: BONUSES.leben.description });
});

test('cardText: neue Fähigkeit nennt Namen und Art', () => {
  const d = describeCard({ kind: 'newAbility', id: 'wirbelschlag' }, haseKrieger());
  assertEqual(d.title, 'Wirbelschlag');
  assertEqual(d.kind, 'Neue Fähigkeit');
  assertTrue(filled(d.text), d.text);
});

test('cardText: Stufenkarte nennt die geänderten Werte', () => {
  const d = describeCard({ kind: 'abilityLevel', id: 'schwerthieb', toLevel: 3 }, haseKrieger());
  assertEqual(d.title, 'Schwerthieb');
  assertEqual(d.kind, 'Fähigkeit · Stufe 3');
  assertTrue(d.text.includes('Winkel 150°'), d.text);
  assertTrue(d.text.includes('Schaden'), d.text);
});

test('cardText: jede Fähigkeit hat auf jeder Stufe 1–5 Titel und Text', () => {
  const world = haseKrieger();
  for (const id of Object.keys(ABILITIES)) {
    for (let level = 1; level <= 5; level++) {
      const card = level === 1 ? { kind: 'newAbility', id } : { kind: 'abilityLevel', id, toLevel: level };
      const d = describeCard(card, world);
      assertTrue(filled(d.title), `${id} ${level}: Titel ${d.title}`);
      assertTrue(filled(d.kind), `${id} ${level}: Art ${d.kind}`);
      assertTrue(filled(d.text), `${id} ${level}: Text ${d.text}`);
    }
  }
});

test('cardText: jeder Bonus hat Titel und Text', () => {
  for (const id of Object.keys(BONUSES)) {
    const d = describeCard({ kind: 'bonus', id, toLevel: 1 }, haseKrieger());
    assertTrue(filled(d.title) && filled(d.text), id);
  }
});
