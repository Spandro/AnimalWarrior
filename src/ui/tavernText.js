// Reine Texte und Listen für Taverne und Truhe. Kein Zugriff auf `document`, damit sich alles testen lässt.
import { TAVERN, HILO } from '../data/tavern.js';
import { ITEMS, RARITIES, SLOT_NAMES } from '../data/items.js';

const factorFormat = new Intl.NumberFormat('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/**
 * Alle Einsatzstufen, die mit dem Gold bezahlbar sind, sind freigegeben.
 * @param {number} gold
 * @returns {{ stake: number, enabled: boolean }[]}
 */
export function stakeOptions(gold) {
  return TAVERN.stakes.map((stake) => ({ stake, enabled: gold >= stake }));
}

/**
 * Faktor auf dem Knopf bei Höher oder tiefer, z. B. „×1,2“ oder „×12,0“.
 * @param {number} f
 * @returns {string}
 */
export function formatFactor(f) {
  return `×${factorFormat.format(f)}`;
}

/**
 * Die 24 Plätze der Truhe in Reihenfolge des Bildbogens. Nicht gefundene tragen keine Kennung, damit die
 * Truhe nichts über sie verrät. „Neu“ gilt, bis der Gegenstand angesehen wurde.
 * @param {{ inventory: string[], seenItems: string[] }} save
 * @returns {{ id: string | null, icon: number, found: boolean, isNew: boolean }[]}
 */
export function chestSlots(save) {
  const byIcon = Object.values(ITEMS).sort((a, b) => a.icon - b.icon);
  return byIcon.map((def) => {
    const found = save.inventory.includes(def.id);
    return {
      id: found ? def.id : null,
      icon: def.icon,
      found,
      isNew: found && !save.seenItems.includes(def.id),
    };
  });
}

/**
 * Wie viele der 24 Gegenstände in der Truhe liegen.
 * @param {{ inventory: string[] }} save
 * @returns {number}
 */
export function foundCount(save) {
  return Object.keys(ITEMS).filter((id) => save.inventory.includes(id)).length;
}

const WEAPON_KIND_NAMES = { nahkampf: 'Nahkampf', zauber: 'Zauber', wurf: 'Wurf' };

/**
 * Art und Seltenheit eines Gegenstands in einer Zeile, z. B. „Waffe (Nahkampf) · Legendär“.
 * @param {import('../data/items.js').ItemDef} def
 * @returns {string}
 */
export function itemKindLabel(def) {
  const slot = SLOT_NAMES[def.slot];
  const kind = def.weaponKind ? ` (${WEAPON_KIND_NAMES[def.weaponKind]})` : '';
  return `${slot}${kind} · ${RARITIES[def.rarity].name}`;
}

/**
 * Beschriftung einer Karte: 2 bis 10, B, D, K, A.
 * @param {number} rank
 * @returns {string}
 */
export function cardLabel(rank) {
  return HILO.rankLabels[rank] ?? String(rank);
}
