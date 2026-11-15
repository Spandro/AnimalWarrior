import { ITEMS, RARITIES } from '../data/items.js';
import { TAVERN } from '../data/tavern.js';

/**
 * Spielstand-Funktionen der Taverne. Alle verändern den übergebenen Spielstand (gedacht für `app.update`),
 * wie `buyMeta`. Die Beute rollt die Oberfläche vorher aus `core/tavern.js`; hier wird nur verrechnet.
 * @typedef {import('./schema.js').Save} Save
 * @typedef {import('../core/tavern.js').HiLoState} HiLoState
 * @typedef {{ id: string, duplicate: boolean, resale: number }} GrantResult
 */

/**
 * Ob der Einsatz eine gültige Stufe ist und das Gold reicht.
 * @param {Save} save
 * @param {number} stake
 * @returns {boolean}
 */
export function canStake(save, stake) {
  return TAVERN.stakes.includes(stake) && save.gold >= stake;
}

/** @returns {'stake' | 'gold' | null} Grund, warum der Einsatz nicht geht */
function stakeProblem(save, stake) {
  if (!TAVERN.stakes.includes(stake)) return 'stake';
  if (save.gold < stake) return 'gold';
  return null;
}

/**
 * Legt einen Gegenstand in die Truhe. Ein Doppeltes wird zum Gegenwert seiner Seltenheit in Gold.
 * @param {Save} save
 * @param {string} id
 * @returns {GrantResult} `resale` ist nur bei einem Doppelten größer als 0
 */
export function grantItem(save, id) {
  const def = Object.hasOwn(ITEMS, id) ? ITEMS[id] : null;
  if (!def) throw new Error(`Unbekannter Gegenstand: ${id}`);
  if (save.inventory.includes(id)) {
    const resale = RARITIES[def.rarity].resale;
    save.gold += resale;
    return { id, duplicate: true, resale };
  }
  save.inventory.push(id);
  return { id, duplicate: false, resale: 0 };
}

/**
 * Würfel und Rad: Einsatz ab, Gewinn dazu, Beute vergeben, Runde zählen. Bei `ok: false` bleibt `save` unverändert.
 * @param {Save} save
 * @param {{ stake: number, payout: number, loot: string | null }} round
 * @returns {{ ok: true, item: GrantResult | null } | { ok: false, reason: 'stake' | 'gold' | 'payout' | 'loot' }}
 */
export function applyRound(save, { stake, payout, loot }) {
  const reason = stakeProblem(save, stake);
  if (reason) return { ok: false, reason };
  if (!Number.isFinite(payout) || payout < 0) return { ok: false, reason: 'payout' };
  if (loot && !Object.hasOwn(ITEMS, loot)) return { ok: false, reason: 'loot' };
  save.gold += Math.floor(payout) - stake;
  save.stats.tavernRounds += 1;
  return { ok: true, item: loot ? grantItem(save, loot) : null };
}

/**
 * Höher oder tiefer, Start: Einsatz ab, Runde zählt schon jetzt. Bei `ok: false` bleibt `save` unverändert.
 * @param {Save} save
 * @param {number} stake
 * @returns {{ ok: true } | { ok: false, reason: 'stake' | 'gold' }}
 */
export function startHiLoRound(save, stake) {
  const reason = stakeProblem(save, stake);
  if (reason) return { ok: false, reason };
  save.gold -= stake;
  save.stats.tavernRounds += 1;
  return { ok: true };
}

/**
 * Höher oder tiefer, Ende: schreibt den Topf gut (nicht bei einem Fehltipp), vergibt die Beute und hält die längste
 * Trefferserie. Wirft, wenn die Runde nicht beendet ist. Muss je beendeter Runde genau einmal aufgerufen werden:
 * der Spielstand merkt sich nichts, ein zweiter Aufruf mit demselben Zustand würde den Topf nochmals gutschreiben.
 * @param {Save} save
 * @param {HiLoState} state
 * @param {string | null} loot
 * @returns {{ item: GrantResult | null }}
 */
export function settleHiLoRound(save, state, loot) {
  if (!state.done) throw new Error('Die Runde ist noch nicht beendet');
  if (loot && !Object.hasOwn(ITEMS, loot)) throw new Error(`Unbekannter Gegenstand: ${loot}`);
  if (state.result !== 'miss' && !(Number.isFinite(state.pot) && state.pot >= 0)) throw new Error('Ungültiger Topf');
  if (state.result !== 'miss') save.gold += Math.floor(state.pot);
  save.stats.hiLoBestStreak = Math.max(save.stats.hiLoBestStreak, state.hits);
  return { item: loot ? grantItem(save, loot) : null };
}

/**
 * Kauft die Freischaltung des Duos.
 * @param {Save} save
 * @returns {{ ok: true } | { ok: false, reason: 'gold' | 'already' }}
 */
export function unlockDuo(save) {
  if (save.unlocks.includes('duo')) return { ok: false, reason: 'already' };
  if (save.gold < TAVERN.duoPrice) return { ok: false, reason: 'gold' };
  save.gold -= TAVERN.duoPrice;
  save.unlocks.push('duo');
  return { ok: true };
}

/**
 * Merkt Gegenstände als angesehen (für „Neu“). Nur Gegenstände aus der Truhe, jeder höchstens einmal.
 * @param {Save} save
 * @param {string[]} ids
 */
export function markItemsSeen(save, ids) {
  for (const id of ids) {
    if (save.inventory.includes(id) && !save.seenItems.includes(id)) save.seenItems.push(id);
  }
}
