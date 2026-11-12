/**
 * @typedef {import('./animals.js').Modifier} Modifier
 * @typedef {{ id: string, name: string, description: string, modifier: Modifier, maxLevel: number }} BonusDef
 */

/** Maximale Stufe von Fähigkeiten und Boni. */
export const MAX_LEVEL = 5;

/** Füllkarten, wenn keine echten Karten mehr möglich sind: Gold (Wert) bzw. Heilung (Anteil der maxHp). */
export const FILLER = { gold: 25, heal: 0.3 };

/**
 * Boni der Level-up-Karten; jede Stufe wendet den Modifikator einmal an.
 * @type {Record<string, BonusDef>}
 */
export const BONUSES = {
  leben: { id: 'leben', name: 'Lebenswille', description: '+10 % maximales Leben. Pflaster inklusive.', modifier: { stat: 'maxHp', pct: 0.10 }, maxLevel: MAX_LEVEL },
  tempo: { id: 'tempo', name: 'Turnschuhe', description: '+6 % Lauftempo. Wegrennen ist auch eine Strategie.', modifier: { stat: 'moveSpeed', pct: 0.06 }, maxLevel: MAX_LEVEL },
  schaden: { id: 'schaden', name: 'Mehr Wumms', description: '+10 % Schaden. Wumms ist keine Einheit, wirkt aber.', modifier: { stat: 'damage', pct: 0.10 }, maxLevel: MAX_LEVEL },
  abklingzeit: { id: 'abklingzeit', name: 'Ungeduld', description: '-6 % Abklingzeit. Gut Ding will Weile haben, du nicht.', modifier: { stat: 'cooldown', pct: -0.06 }, maxLevel: MAX_LEVEL },
  sammelradius: { id: 'sammelradius', name: 'Lange Arme', description: '+20 % Sammelradius. Das Zeug kommt fast von allein.', modifier: { stat: 'pickupRadius', pct: 0.20 }, maxLevel: MAX_LEVEL },
  ruestung: { id: 'ruestung', name: 'Dickes Fell', description: '+1 Rüstung. Kratzer sind nur Dekoration.', modifier: { stat: 'armor', flat: 1 }, maxLevel: MAX_LEVEL },
  regeneration: { id: 'regeneration', name: 'Spucke drauf', description: '+0,5 Leben pro Sekunde. Wird schon wieder.', modifier: { stat: 'hpRegen', flat: 0.5 }, maxLevel: MAX_LEVEL },
};

/**
 * Modifikatoren aller erworbenen Boni (je Stufe einmal).
 * @param {Record<string, number>} bonuses Bonus-Id → Stufe
 * @returns {Modifier[]}
 */
export function bonusModifiers(bonuses) {
  const out = [];
  for (const [id, level] of Object.entries(bonuses)) {
    const def = BONUSES[id];
    if (!def) continue;
    for (let i = 0; i < level; i++) out.push(def.modifier);
  }
  return out;
}
