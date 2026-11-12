/**
 * @typedef {{ baseDamage: number, damage: number, critChance: number, critDamage: number }} AttackStats
 * @typedef {{ armor: number, dodge: number }} DefenseStats
 * @typedef {{ dodged: boolean, crit: boolean, amount: number }} HitResult
 */

/**
 * Löst einen Treffer auf. Zufallszüge in fester Reihenfolge: erst Ausweichen, dann kritisch.
 * @param {{ chance(p: number): boolean }} rng
 * @param {AttackStats} attack
 * @param {DefenseStats} defense
 * @returns {HitResult}
 */
export function resolveHit(rng, attack, defense) {
  if (rng.chance(defense.dodge)) return { dodged: true, crit: false, amount: 0 };
  const crit = rng.chance(attack.critChance);
  const raw = Math.round(attack.baseDamage * attack.damage * (crit ? attack.critDamage : 1));
  return { dodged: false, crit, amount: Math.max(1, raw - defense.armor) };
}
