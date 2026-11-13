import { test, assertEqual, assertTrue } from './runner.js';
import { ANIMALS } from '../src/data/animals.js';
import { CLASSES } from '../src/data/classes.js';
import { defaultSave } from '../src/save/store.js';
import { isValidPair, classesFor, animalUnlocked, selectableAnimals } from '../src/core/roster.js';

// Nur die vorhandenen Tiere und Klassen: das Duo (Tier mit fixedClass/unlock, Klasse mit animalOnly) ergänzt Aufgabe 4.

test('roster: alle neun Paare aus den vorhandenen Tieren und Klassen sind gültig', () => {
  for (const a of ['hase', 'ente', 'waschbaer']) {
    for (const c of ['krieger', 'magier', 'dieb']) assertTrue(isValidPair(a, c), `${a}/${c}`);
  }
});

test('roster: unbekannte Tiere und Klassen sind nie gültig', () => {
  assertEqual(isValidPair('drache', 'krieger'), false);
  assertEqual(isValidPair('hase', 'barde'), false);
  assertEqual(isValidPair('toString', 'krieger'), false);
  assertEqual(isValidPair('hase', 'constructor'), false);
});

test('roster: classesFor liefert für ein Tier ohne feste Klasse alle Klassen', () => {
  assertEqual(classesFor('hase'), Object.keys(CLASSES));
  assertEqual(classesFor('hase').length, 3);
  assertEqual(classesFor('drache'), []);
});

test('roster: animalUnlocked – Tiere ohne Freischaltung sind immer frei', () => {
  const save = defaultSave();
  for (const id of Object.keys(ANIMALS)) {
    if (!ANIMALS[id].unlock) assertTrue(animalUnlocked(save, id), id);
  }
});

test('roster: selectableAnimals folgt der Reihenfolge der Tiere, im neuen Spielstand ist keines gesperrt', () => {
  const list = selectableAnimals(defaultSave());
  assertEqual(list.length, 3);
  assertEqual(list.map((e) => e.id), Object.keys(ANIMALS));
  assertEqual(list.every((e) => e.locked === false), true);
});
