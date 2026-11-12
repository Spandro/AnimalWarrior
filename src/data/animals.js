/**
 * @typedef {'maxHp'|'hpRegen'|'moveSpeed'|'damage'|'cooldown'|'area'|'armor'|'critChance'|'critDamage'|'dodge'|'pickupRadius'|'xpGain'|'goldGain'} StatKey
 * @typedef {{ stat: StatKey, flat?: number, pct?: number }} Modifier
 * @typedef {{ id: string, name: string, description: string, base: { maxHp: number, moveSpeed: number }, modifiers: Modifier[] }} AnimalDef
 */

/** Grundwerte, die alle Helden teilen (maxHp und moveSpeed kommen vom Tier). */
export const BASE_STATS = {
  hpRegen: 0,
  damage: 1,
  cooldown: 1,
  area: 1,
  armor: 0,
  critChance: 0.05,
  critDamage: 1.5,
  dodge: 0,
  pickupRadius: 2.5,
  xpGain: 1,
  goldGain: 1,
};

/** @type {Record<'hase'|'ente'|'waschbaer', AnimalDef>} */
export const ANIMALS = {
  hase: {
    id: 'hase',
    name: 'Hase',
    description: 'Schnell und schwer zu treffen.',
    base: { maxHp: 80, moveSpeed: 6.0 },
    modifiers: [{ stat: 'dodge', flat: 0.15 }],
  },
  ente: {
    id: 'ente',
    name: 'Ente',
    description: 'Robust und regeneriert Leben.',
    base: { maxHp: 130, moveSpeed: 4.6 },
    modifiers: [{ stat: 'hpRegen', flat: 1 }],
  },
  waschbaer: {
    id: 'waschbaer',
    name: 'Waschbär',
    description: 'Sammelt Beute weiter und gezielter ein.',
    base: { maxHp: 100, moveSpeed: 5.2 },
    modifiers: [
      { stat: 'pickupRadius', pct: 0.4 },
      { stat: 'goldGain', pct: 0.2 },
      { stat: 'critChance', flat: 0.10 },
    ],
  },
};
