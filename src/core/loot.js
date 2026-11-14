import { ITEMS, RARITIES } from '../data/items.js';

/**
 * Beutewurf des Abenteuers: erst die Seltenheit nach `RARITIES.weight` (Seltenheiten unter `minRarity` zählen nicht),
 * dann ein Gegenstand dieser Seltenheit aus der Quelle mit gleicher Chance.
 * @param {import('./rng.js').Rng} rng
 * @param {import('../data/items.js').ItemSource} source
 * @param {import('../data/items.js').Rarity} [minRarity]
 * @returns {string} Kennung
 */
export function rollAdventureItem(rng, source, minRarity) {
  const order = Object.keys(RARITIES);
  const allowed = order.slice(minRarity ? order.indexOf(minRarity) : 0)
    .filter((r) => Object.values(ITEMS).some((i) => i.source === source && i.rarity === r));
  const total = allowed.reduce((sum, r) => sum + RARITIES[r].weight, 0);
  let roll = rng.next() * total, rarity = allowed[allowed.length - 1];
  for (const r of allowed) {
    if (roll < RARITIES[r].weight) { rarity = r; break; }
    roll -= RARITIES[r].weight;
  }
  return rng.pick(Object.values(ITEMS).filter((i) => i.source === source && i.rarity === rarity)).id;
}
