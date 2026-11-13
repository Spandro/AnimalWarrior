import { ITEMS, RARITIES } from '../data/items.js';

/**
 * Beutewurf: erst die Seltenheit nach Gewicht, dann gleichverteilt ein Gegenstand
 * dieser Seltenheit in der Reihenfolge von ITEMS.
 * @param {import('./rng.js').Rng} rng
 * @returns {string} Kennung des Gegenstands
 */
export function rollItem(rng) {
  const rarities = Object.entries(RARITIES);
  const total = rarities.reduce((sum, [, r]) => sum + r.weight, 0);
  let roll = rng.next() * total;
  let rarity = rarities[rarities.length - 1][0];
  for (const [key, r] of rarities) {
    if (roll < r.weight) {
      rarity = key;
      break;
    }
    roll -= r.weight;
  }
  const pool = Object.values(ITEMS).filter((item) => item.rarity === rarity);
  return rng.pick(pool).id;
}
