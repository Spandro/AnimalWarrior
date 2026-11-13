import { ANIMALS } from '../data/animals.js';
import { CLASSES } from '../data/classes.js';

/**
 * Paar-Regeln für Tier und Klasse, ohne Anzeige. Liest die optionalen Felder generisch:
 * `fixedClass` und `unlock` an Tieren, `animalOnly` an Klassen (das Duo ergänzt sie in den Daten).
 * @typedef {{ unlocks: string[] }} UnlockSource
 */

/**
 * Ob Tier und Klasse zusammen einen Helden ergeben: unbekannte Kennungen nie; ein Tier mit `fixedClass` nur mit
 * dieser Klasse; eine Klasse mit `animalOnly` nur mit diesem Tier; sonst jedes Paar aus Tieren × Klassen.
 * @param {string} animalId
 * @param {string} classId
 * @returns {boolean}
 */
export function isValidPair(animalId, classId) {
  if (!Object.hasOwn(ANIMALS, animalId) || !Object.hasOwn(CLASSES, classId)) return false;
  const animal = /** @type {any} */ (ANIMALS[animalId]);
  const cls = /** @type {any} */ (CLASSES[classId]);
  if (animal.fixedClass && animal.fixedClass !== classId) return false;
  if (cls.animalOnly && cls.animalOnly !== animalId) return false;
  return true;
}

/**
 * Die wählbaren Klassen eines Tiers in der Reihenfolge von CLASSES (leer bei unbekanntem Tier).
 * @param {string} animalId
 * @returns {string[]}
 */
export function classesFor(animalId) {
  return Object.keys(CLASSES).filter((classId) => isValidPair(animalId, classId));
}

/**
 * Ob das Tier gewählt werden darf: Tiere mit `unlock` brauchen diese Freischaltung im Spielstand.
 * @param {UnlockSource} save
 * @param {string} animalId
 * @returns {boolean}
 */
export function animalUnlocked(save, animalId) {
  if (!Object.hasOwn(ANIMALS, animalId)) return false;
  const unlock = /** @type {any} */ (ANIMALS[animalId]).unlock;
  return !unlock || save.unlocks.includes(unlock);
}

/**
 * Alle Tiere in der Reihenfolge von ANIMALS, gesperrte markiert.
 * @param {UnlockSource} save
 * @returns {{ id: string, locked: boolean }[]}
 */
export function selectableAnimals(save) {
  return Object.keys(ANIMALS).map((id) => ({ id, locked: !animalUnlocked(save, id) }));
}
