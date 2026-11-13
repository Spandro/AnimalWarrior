import { test, assertEqual, assertTrue } from './runner.js';
import { ANIMALS } from '../src/data/animals.js';
import { CLASSES } from '../src/data/classes.js';
import { defaultSave } from '../src/save/store.js';
import { isValidPair, classesFor, animalUnlocked, selectableAnimals } from '../src/core/roster.js';

test('roster: alle neun Paare aus den vorhandenen Tieren und Klassen sind gültig', () => {
  for (const a of ['hase', 'ente', 'waschbaer']) {
    for (const c of ['krieger', 'magier', 'dieb']) assertTrue(isValidPair(a, c), `${a}/${c}`);
  }
});

test('roster: das Duo gehört nur zu Hochstapler, und Hochstapler nur zum Duo', () => {
  assertTrue(isValidPair('giraffe', 'hochstapler'));
  assertEqual(isValidPair('giraffe', 'krieger'), false);
  assertEqual(isValidPair('giraffe', 'magier'), false);
  assertEqual(isValidPair('giraffe', 'dieb'), false);
  for (const a of ['hase', 'ente', 'waschbaer']) assertEqual(isValidPair(a, 'hochstapler'), false, a);
});

test('roster: unbekannte Tiere und Klassen sind nie gültig', () => {
  assertEqual(isValidPair('drache', 'krieger'), false);
  assertEqual(isValidPair('hase', 'barde'), false);
  assertEqual(isValidPair('toString', 'krieger'), false);
  assertEqual(isValidPair('hase', 'constructor'), false);
});

test('roster: classesFor liefert für ein Tier ohne feste Klasse die drei Grundklassen, für das Duo nur Hochstapler', () => {
  for (const a of ['hase', 'ente', 'waschbaer']) assertEqual(classesFor(a), ['krieger', 'magier', 'dieb'], a);
  assertEqual(classesFor('giraffe'), ['hochstapler']);
  assertEqual(classesFor('drache'), []);
  assertTrue(!Object.keys(CLASSES).every((c) => classesFor('hase').includes(c)), 'Hochstapler gehört nicht zu den Klassen des Hasen');
});

test('roster: das Duo hat die feste Klasse und die Freischaltung in den Daten', () => {
  assertEqual(ANIMALS.giraffe.fixedClass, 'hochstapler');
  assertEqual(ANIMALS.giraffe.unlock, 'duo');
  assertEqual(CLASSES.hochstapler.animalOnly, 'giraffe');
});

test('roster: animalUnlocked – Tiere ohne Freischaltung sind immer frei, das Duo erst mit „duo“', () => {
  const save = defaultSave();
  for (const id of ['hase', 'ente', 'waschbaer']) assertTrue(animalUnlocked(save, id), id);
  assertEqual(animalUnlocked(save, 'giraffe'), false);
  save.unlocks.push('duo');
  assertTrue(animalUnlocked(save, 'giraffe'));
  assertEqual(animalUnlocked(save, 'drache'), false);
});

test('roster: selectableAnimals folgt der Reihenfolge der Tiere, das Duo ist gesperrt, bis „duo“ freigeschaltet ist', () => {
  const save = defaultSave();
  const before = selectableAnimals(save);
  assertEqual(before.map((e) => e.id), ['hase', 'ente', 'waschbaer', 'giraffe']);
  assertEqual(before.map((e) => e.locked), [false, false, false, true]);
  save.unlocks.push('duo');
  assertEqual(selectableAnimals(save).map((e) => e.locked), [false, false, false, false]);
});
