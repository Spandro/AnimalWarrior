import { META } from '../data/meta.js';

/**
 * @typedef {import('./schema.js').Save} Save
 * @typedef {import('../data/animals.js').Modifier} Modifier
 */

/** Preis der nächsten Stufe: basePrice × 2^aktuelleStufe. */
export function metaPrice(id, currentLevel) {
  const def = META[id];
  if (!def) throw new Error(`Unbekannter Dauerbonus: ${id}`);
  return def.basePrice * 2 ** currentLevel;
}

/**
 * Kauft die nächste Stufe; verändert den übergebenen Spielstand (gedacht für store.update).
 * @param {Save} save
 * @param {string} id
 * @returns {{ ok: boolean, reason?: 'gold' | 'max' | 'unknown' }}
 */
export function buyMeta(save, id) {
  const def = Object.hasOwn(META, id) ? META[id] : null;
  if (!def) return { ok: false, reason: 'unknown' };
  const level = save.metaUpgrades[id] || 0;
  if (level >= def.maxLevel) return { ok: false, reason: 'max' };
  const price = metaPrice(id, level);
  if (save.gold < price) return { ok: false, reason: 'gold' };
  save.gold -= price;
  save.metaUpgrades[id] = level + 1;
  return { ok: true };
}

/**
 * Ein Modifikator je erworbenem Bonus, Wert mal Stufe.
 * @param {Save} save
 * @returns {Modifier[]}
 */
export function metaModifiers(save) {
  const round = (v) => Math.round(v * 1e6) / 1e6;
  const out = [];
  for (const [id, level] of Object.entries(save.metaUpgrades)) {
    const def = Object.hasOwn(META, id) ? META[id] : null;
    if (!def || !def.modifier || !(level > 0)) continue;
    const m = { stat: def.modifier.stat };
    if (def.modifier.flat) m.flat = round(def.modifier.flat * level);
    if (def.modifier.pct) m.pct = round(def.modifier.pct * level);
    out.push(m);
  }
  return out;
}

/** @param {Save} save */
export function hasRevive(save) {
  return (save.metaUpgrades.wiederbelebung || 0) >= 1;
}
