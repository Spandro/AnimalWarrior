import { test, assertEqual, assertTrue } from './runner.js';
import { SUBCLASSES, subclassesFor } from '../src/data/subclasses.js';
import { ABILITIES } from '../src/data/abilities.js';
import { CLASSES } from '../src/data/classes.js';
import { SUBCLASS_RULES } from '../src/data/adventure.js';

const SIGNATURE_SHAPES = ['rage', 'shield', 'healzone', 'cloud', 'freeze', 'potion', 'steal', 'stealth', 'trap', 'applause', 'pet', 'mark'];

test('subclasses: zwölf Unterklassen, je Klasse genau drei', () => {
  assertEqual(Object.keys(SUBCLASSES).length, 12);
  for (const classId of Object.keys(CLASSES)) {
    const list = subclassesFor(classId);
    assertEqual(list.length, 3, classId);
    for (const s of list) assertEqual(s.classId, classId);
  }
  for (const id of ['kneipenschlaeger', 'tuersteher', 'kochstelle', 'wetterfrosch', 'eisheiliger', 'alchemist',
    'taschendieb', 'schattenlaeufer', 'fallensteller', 'zirkusdirektor', 'kletterkuenstler', 'ausguck']) {
    assertTrue(Object.hasOwn(SUBCLASSES, id), id);
    assertEqual(SUBCLASSES[id].id, id);
  }
});

test('subclasses: je vier Astfähigkeiten, erste ist die Besonderheit, alle in ABILITIES mit Klasse und Unterklasse', () => {
  const seen = new Set();
  const shapes = new Set();
  for (const s of Object.values(SUBCLASSES)) {
    assertEqual(s.abilities.length, 4, s.id);
    assertEqual(s.abilities[0], s.signature, s.id);
    for (const id of s.abilities) {
      assertTrue(!seen.has(id), `doppelt: ${id}`);
      seen.add(id);
      const def = ABILITIES[id];
      assertTrue(!!def, `fehlt: ${id}`);
      assertEqual(def.id, id);
      assertEqual(def.classId, s.classId, id);
      assertEqual(def.subclass, s.id, id);
      assertTrue(def.name.length > 0 && def.description.length > 0, id);
    }
    shapes.add(ABILITIES[s.signature].shape);
    for (const id of s.abilities.slice(1)) assertTrue(!SIGNATURE_SHAPES.includes(ABILITIES[id].shape), `${id} nutzt vorhandene Form`);
  }
  assertEqual(seen.size, 48);
  assertEqual([...shapes].sort(), [...SIGNATURE_SHAPES].sort());
});

test('subclasses: je vier Dauer-Boni mit höchstens 3 Stufen, Kennungen eindeutig', () => {
  const ids = new Set();
  for (const s of Object.values(SUBCLASSES)) {
    assertEqual(s.passives.length, 4, s.id);
    for (const p of s.passives) {
      assertTrue(!ids.has(p.id), `doppelt: ${p.id}`);
      ids.add(p.id);
      assertEqual(p.maxRank, 3, p.id);
      assertTrue(p.name.length > 0, p.id);
      const r = p.perRank;
      assertTrue(typeof r.stat === 'string' ? (r.pct ?? r.flat) !== undefined : typeof r.special === 'string' && r.value > 0, p.id);
    }
  }
  assertEqual(ids.size, 48);
});

test('subclasses: Namen und Sprüche nicht leer, keine Astfähigkeit im Wellen-Modus', () => {
  for (const s of Object.values(SUBCLASSES)) assertTrue(s.name.length > 0 && s.line.length > 0, s.id);
  const branch = new Set(Object.values(SUBCLASSES).flatMap((s) => s.abilities));
  for (const c of Object.values(CLASSES)) {
    assertTrue(!branch.has(c.startAbility), c.id);
    for (const id of c.abilityPool) assertTrue(!branch.has(id), id);
  }
  for (const def of Object.values(ABILITIES)) if (!branch.has(def.id)) assertEqual(def.subclass, undefined, def.id);
});

test('subclasses: Regeln Wahl ab Level 10, Freischalten 1 Punkt, Umlernen 500 Gold', () => {
  assertEqual(SUBCLASS_RULES, { chooseLevel: 10, unlockCost: 1, respecGold: 500 });
});
