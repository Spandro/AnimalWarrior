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
  leben: { id: 'leben', name: 'Leben', description: '+10 % maximales Leben', modifier: { stat: 'maxHp', pct: 0.10 }, maxLevel: MAX_LEVEL },
  tempo: { id: 'tempo', name: 'Tempo', description: '+6 % Lauftempo', modifier: { stat: 'moveSpeed', pct: 0.06 }, maxLevel: MAX_LEVEL },
  schaden: { id: 'schaden', name: 'Schaden', description: '+10 % Schaden', modifier: { stat: 'damage', pct: 0.10 }, maxLevel: MAX_LEVEL },
  abklingzeit: { id: 'abklingzeit', name: 'Abklingzeit', description: '-6 % Abklingzeit', modifier: { stat: 'cooldown', pct: -0.06 }, maxLevel: MAX_LEVEL },
  sammelradius: { id: 'sammelradius', name: 'Sammelradius', description: '+20 % Sammelradius', modifier: { stat: 'pickupRadius', pct: 0.20 }, maxLevel: MAX_LEVEL },
  ruestung: { id: 'ruestung', name: 'Rüstung', description: '+1 Rüstung', modifier: { stat: 'armor', flat: 1 }, maxLevel: MAX_LEVEL },
  regeneration: { id: 'regeneration', name: 'Regeneration', description: '+0,5 Leben pro Sekunde', modifier: { stat: 'hpRegen', flat: 0.5 }, maxLevel: MAX_LEVEL },
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
