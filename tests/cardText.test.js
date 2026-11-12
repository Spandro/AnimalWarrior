import { test, assertEqual, assertTrue } from './runner.js';
import { describeCard } from '../src/ui/cardText.js';
import { createWorld } from '../src/core/world.js';
import { ABILITIES } from '../src/data/abilities.js';
import { BONUSES } from '../src/data/bonuses.js';
import { CLASSES } from '../src/data/classes.js';
import { abilityParams } from '../src/core/abilities.js';
import { abilityInitials } from '../src/ui/hud.js';
import { formatNumber } from '../src/ui/dom.js';

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
  assertEqual(d, { title: BONUSES.leben.name, kind: 'Bonus · Stufe 2', text: BONUSES.leben.description });
});

test('cardText: neue Fähigkeit nennt Namen und Art', () => {
  const d = describeCard({ kind: 'newAbility', id: 'wirbelschlag' }, haseKrieger());
  assertEqual(d.title, ABILITIES.wirbelschlag.name);
  assertTrue(d.text.includes(ABILITIES.wirbelschlag.description), d.text);
  assertEqual(d.kind, 'Neue Fähigkeit');
  assertTrue(filled(d.text), d.text);
});

test('cardText: Stufenkarte nennt die geänderten Werte', () => {
  const d = describeCard({ kind: 'abilityLevel', id: 'schwerthieb', toLevel: 3 }, haseKrieger());
  assertEqual(d.title, 'Ordentlich Draufhauen');
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

test('cardText: Stufen ohne Schaden nennen die verkürzte Abklingzeit statt „ohne neue Werte“', () => {
  const world = haseKrieger();
  const stats = world.hero.stats;
  const cd = (level) => abilityParams('kriegsschrei', level, stats).cooldown;
  const d2 = describeCard({ kind: 'abilityLevel', id: 'kriegsschrei', toLevel: 2 }, world);
  assertEqual(d2.title, 'Montagmorgen-Gebrüll');
  assertEqual(d2.text, `Abklingzeit ${formatNumber(cd(2), 1)} s`);
  const d4 = describeCard({ kind: 'abilityLevel', id: 'kriegsschrei', toLevel: 4 }, world);
  assertEqual(d4.text, `Abklingzeit ${formatNumber(cd(4), 1)} s`);
  assertTrue(cd(4) < cd(2) && cd(2) < cd(1), 'Abklingzeit sinkt');
  for (const id of ['kriegsschrei', 'schattenklon', 'rauchbombe']) {
    for (const toLevel of [2, 3, 4, 5]) {
      const text = describeCard({ kind: 'abilityLevel', id, toLevel }, world).text;
      assertTrue(!/Noch ohne|Keine/.test(text), `${id} ${toLevel}: ${text}`);
    }
  }
});

test('cardText: neue Fähigkeit zeigt Beschreibung und Werte', () => {
  const d = describeCard({ kind: 'newAbility', id: 'feuerball' }, haseKrieger());
  assertEqual(d.title, 'Heiße Angelegenheit');
  assertTrue(d.text.startsWith('Fliegt zum nächsten Gegner und explodiert. Brandschutz war gestern.'), d.text);
  assertTrue(d.text.includes('Schaden 10'), d.text);
});

test('cardText: Kürzel der Fähigkeiten sind je Klasse verschieden und zwei Zeichen lang', () => {
  for (const cls of Object.values(CLASSES)) {
    const ids = [cls.startAbility, ...cls.abilityPool];
    const initials = ids.map(abilityInitials);
    for (const s of initials) assertEqual(s.length, 2, s);
    assertEqual(new Set(initials).size, ids.length, initials.join(','));
  }
  assertEqual(abilityInitials('feuerball'), 'HA');
  assertEqual(abilityInitials('schattenklon'), 'DW');
  assertEqual(abilityInitials('klingenfaecher'), 'BE');
});
