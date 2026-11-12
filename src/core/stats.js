import { ANIMALS, BASE_STATS } from '../data/animals.js';
import { CLASSES } from '../data/classes.js';

/**
 * @typedef {import('../data/animals.js').StatKey} StatKey
 * @typedef {import('../data/animals.js').Modifier} Modifier
 * @typedef {Record<StatKey, number>} Stats
 */

const DODGE_CAP = 0.6;
const COOLDOWN_MIN = 0.4;

/**
 * Rechnet Tier, Klasse und Zusatzmodifikatoren zu Endwerten zusammen:
 * je Wert (Grundwert + Σ flat) × (1 + Σ pct), danach Deckelungen.
 * @param {string} animalId
 * @param {string} classId
 * @param {Modifier[]} [extraModifiers]
 * @returns {Stats}
 */
export function computeStats(animalId, classId, extraModifiers = []) {
  const animal = ANIMALS[animalId];
  if (!animal) throw new Error(`Unbekanntes Tier: ${animalId}`);
  const cls = CLASSES[classId];
  if (!cls) throw new Error(`Unbekannte Klasse: ${classId}`);

  /** @type {Stats} */
  const base = { ...BASE_STATS, ...animal.base };
  const flat = {}, pct = {};
  for (const m of [...animal.modifiers, ...cls.modifiers, ...extraModifiers]) {
    if (m.flat) flat[m.stat] = (flat[m.stat] || 0) + m.flat;
    if (m.pct) pct[m.stat] = (pct[m.stat] || 0) + m.pct;
  }

  /** @type {Stats} */
  const stats = {};
  for (const key of Object.keys(base)) {
    stats[key] = (base[key] + (flat[key] || 0)) * (1 + (pct[key] || 0));
  }
  stats.dodge = Math.min(stats.dodge, DODGE_CAP);
  stats.cooldown = Math.max(stats.cooldown, COOLDOWN_MIN);
  return stats;
}
