/**
 * @typedef {import('./animals.js').Modifier} Modifier
 * @typedef {{ id: string, name: string, description: string, modifiers: Modifier[], startAbility: string, abilityPool: string[] }} ClassDef
 */

/** @type {Record<'krieger'|'magier'|'dieb', ClassDef>} */
export const CLASSES = {
  krieger: {
    id: 'krieger',
    name: 'Krieger',
    description: 'Viel Leben und Rüstung, kämpft im Nahkampf.',
    modifiers: [
      { stat: 'maxHp', pct: 0.3 },
      { stat: 'armor', flat: 2 },
    ],
    startAbility: 'schwerthieb',
    abilityPool: [],
  },
  magier: {
    id: 'magier',
    name: 'Magier',
    description: 'Zerbrechlich, aber mit großer Reichweite und schnellen Zaubern.',
    modifiers: [
      { stat: 'maxHp', pct: -0.15 },
      { stat: 'area', pct: 0.15 },
      { stat: 'cooldown', pct: -0.10 },
    ],
    startAbility: 'feuerball',
    abilityPool: [],
  },
  dieb: {
    id: 'dieb',
    name: 'Dieb',
    description: 'Flink und mit hoher Chance auf kritische Treffer.',
    modifiers: [
      { stat: 'moveSpeed', pct: 0.10 },
      { stat: 'critChance', flat: 0.10 },
      { stat: 'critDamage', flat: 0.25 },
    ],
    startAbility: 'wurfdolche',
    abilityPool: [],
  },
};
