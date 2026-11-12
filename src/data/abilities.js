/**
 * @typedef {'arc'|'ring'|'line'|'projectile'|'chain'|'zone'|'orbit'|'buff'|'summon'} AbilityShape
 * @typedef {'facing'|'nearest'|'densest'|'self'} AbilityTarget
 * @typedef {{ key: string, add?: number, mul?: number }} LevelChange
 * @typedef {{ id: string, name: string, classId: string, shape: AbilityShape, trigger: 'auto', target: AbilityTarget,
 *   base: Record<string, number>, levels: LevelChange[][] }} AbilityDef
 *
 * Bedeutung der Werte in `base` (je nach Form):
 * - damage: Grundschaden je Treffer; cooldown: Abklingzeit in s
 * - radius, length, width, explosion, orbitRadius, lureRadius, explodeRadius: Flächenmaße (skalieren mit stats.area)
 * - angle: Winkel in Grad; swings: Anzahl Hiebe, gleichmäßig im Kreis verteilt (2 = zweiter Hieb nach hinten)
 * - knockback: Rückstoß in Einheiten; stun: Betäubung in s
 * - slow (Anteil), slowDuration: Verlangsamung; confuse: Verwirrung in s
 * - count, spread (Grad, ≥ 360 = Vollkreis), speed, range, pierce (Anzahl Gegner je Geschoss), size: Geschosse
 * - jumps (Anzahl Treffer), jumpRange: Kette; range: Suchweite für nearest/densest bzw. Flugweite
 * - delay, duration, tickDamage, tickInterval: Zonen (Aufschlag nach delay, danach duration Sekunden lang Ticks)
 * - orbitSpeed (rad/s), hitInterval: Umlauf; damagePct: Schadensbonus der Stärkung
 */

/** Maße, die mit stats.area skalieren. Winkel, Anzahlen, Tempo und Reichweiten skalieren nicht. */
export const AREA_KEYS = ['radius', 'length', 'width', 'explosion', 'orbitRadius', 'lureRadius', 'explodeRadius'];

/** Zuwachs des Grundschadens je Stufe. */
const DAMAGE_STEP = 0.2;

/**
 * Baut die Stufen 2…5: jede Stufe +20 % auf den Grundschaden (falls damageKey gesetzt), Stufe 3 und 5 mit Extras.
 * @param {string|null} damageKey
 * @param {Record<string, number>} base
 * @param {LevelChange[]} perk3
 * @param {LevelChange[]} perk5
 * @returns {LevelChange[][]}
 */
function levels(damageKey, base, perk3, perk5) {
  const step = damageKey ? [{ key: damageKey, add: base[damageKey] * DAMAGE_STEP }] : [];
  return [[...step], [...step, ...perk3], [...step], [...step, ...perk5]];
}

/**
 * @param {Omit<AbilityDef, 'levels'|'trigger'> & { damageKey?: string|null, perk3: LevelChange[], perk5: LevelChange[] }} spec
 * @returns {AbilityDef}
 */
function ability({ damageKey = 'damage', perk3, perk5, ...def }) {
  return { ...def, trigger: 'auto', levels: levels(damageKey, def.base, perk3, perk5) };
}

/** @type {Record<string, AbilityDef>} */
export const ABILITIES = {
  schwerthieb: ability({
    id: 'schwerthieb', name: 'Schwerthieb', classId: 'krieger', shape: 'arc', target: 'facing',
    base: { damage: 12, cooldown: 1.0, radius: 2.6, angle: 110, swings: 1, knockback: 0, stun: 0 },
    perk3: [{ key: 'angle', add: 40 }],
    perk5: [{ key: 'swings', add: 1 }],
  }),
  wirbelschlag: ability({
    id: 'wirbelschlag', name: 'Wirbelschlag', classId: 'krieger', shape: 'ring', target: 'self',
    base: { damage: 10, cooldown: 3.0, radius: 3.0, slow: 0, slowDuration: 0 },
    perk3: [{ key: 'radius', mul: 1.25 }],
    perk5: [{ key: 'cooldown', mul: 0.75 }],
  }),
  schildstoss: ability({
    id: 'schildstoss', name: 'Schildstoß', classId: 'krieger', shape: 'arc', target: 'facing',
    base: { damage: 5, cooldown: 4.0, radius: 2.2, angle: 90, swings: 1, knockback: 5, stun: 0 },
    perk3: [{ key: 'knockback', add: 3 }],
    perk5: [{ key: 'stun', add: 1 }],
  }),
  kriegsschrei: ability({
    id: 'kriegsschrei', name: 'Kriegsschrei', classId: 'krieger', shape: 'buff', target: 'self', damageKey: null,
    base: { cooldown: 14, duration: 5, damagePct: 0.3 },
    perk3: [{ key: 'duration', add: 2 }],
    perk5: [{ key: 'damagePct', add: 0.2 }],
  }),
  erdspalter: ability({
    id: 'erdspalter', name: 'Erdspalter', classId: 'krieger', shape: 'line', target: 'facing',
    base: { damage: 18, cooldown: 5.0, length: 9, width: 1.6 },
    perk3: [{ key: 'length', add: 3 }],
    perk5: [{ key: 'width', add: 0.8 }],
  }),
  feuerball: ability({
    id: 'feuerball', name: 'Feuerball', classId: 'magier', shape: 'projectile', target: 'nearest',
    base: { damage: 10, cooldown: 1.2, speed: 14, explosion: 1.5, range: 14, count: 1, spread: 15, pierce: 1, size: 0.3 },
    perk3: [{ key: 'count', add: 1 }],
    perk5: [{ key: 'explosion', add: 1.0 }],
  }),
  frostring: ability({
    id: 'frostring', name: 'Frostring', classId: 'magier', shape: 'ring', target: 'self',
    base: { damage: 6, cooldown: 4.0, radius: 3.5, slow: 0.4, slowDuration: 2 },
    perk3: [{ key: 'radius', mul: 1.25 }],
    perk5: [{ key: 'slow', add: 0.2 }],
  }),
  kettenblitz: ability({
    id: 'kettenblitz', name: 'Kettenblitz', classId: 'magier', shape: 'chain', target: 'nearest',
    base: { damage: 9, cooldown: 2.5, jumps: 4, jumpRange: 5, range: 10 },
    perk3: [{ key: 'jumps', add: 2 }],
    perk5: [{ key: 'jumps', add: 3 }],
  }),
  meteor: ability({
    id: 'meteor', name: 'Meteor', classId: 'magier', shape: 'zone', target: 'densest',
    base: { damage: 30, cooldown: 6.0, radius: 3.0, delay: 0.8, range: 12, duration: 0, tickDamage: 3, tickInterval: 0.5, confuse: 0 },
    perk3: [{ key: 'radius', add: 1.0 }],
    perk5: [{ key: 'duration', add: 3 }], // brennt 3 s nach: 3 Schaden je 0,5 s = 6/s
  }),
  arkankugeln: ability({
    id: 'arkankugeln', name: 'Arkankugeln', classId: 'magier', shape: 'orbit', target: 'self',
    base: { damage: 6, cooldown: 0, count: 2, orbitRadius: 2.5, hitInterval: 0.5, orbitSpeed: 3, size: 0.5 },
    perk3: [{ key: 'count', add: 1 }],
    perk5: [{ key: 'count', add: 2 }],
  }),
  wurfdolche: ability({
    id: 'wurfdolche', name: 'Wurfdolche', classId: 'dieb', shape: 'projectile', target: 'facing',
    base: { damage: 7, cooldown: 0.6, speed: 18, pierce: 2, range: 12, count: 1, spread: 10, explosion: 0, size: 0.25 },
    perk3: [{ key: 'count', add: 1 }],
    perk5: [{ key: 'pierce', add: 3 }],
  }),
  giftflaeche: ability({
    id: 'giftflaeche', name: 'Giftfläche', classId: 'dieb', shape: 'zone', target: 'self', damageKey: 'tickDamage',
    base: { damage: 0, cooldown: 5.0, radius: 2.5, delay: 0, duration: 4, tickDamage: 4, tickInterval: 0.5, confuse: 0 },
    perk3: [{ key: 'radius', add: 1.0 }],
    perk5: [{ key: 'duration', add: 2 }],
  }),
  schattenklon: ability({
    id: 'schattenklon', name: 'Schattenklon', classId: 'dieb', shape: 'summon', target: 'self', damageKey: null,
    base: { cooldown: 12, duration: 5, lureRadius: 8, explodeDamage: 0, explodeRadius: 3 },
    perk3: [{ key: 'duration', add: 2 }],
    perk5: [{ key: 'explodeDamage', add: 25 }],
  }),
  klingenfaecher: ability({
    id: 'klingenfaecher', name: 'Klingenfächer', classId: 'dieb', shape: 'projectile', target: 'facing',
    base: { damage: 6, cooldown: 2.5, count: 5, spread: 60, speed: 16, range: 9, pierce: 1, explosion: 0, size: 0.25 },
    perk3: [{ key: 'count', add: 2 }],
    perk5: [{ key: 'count', add: 2 }, { key: 'spread', add: 300 }],
  }),
  rauchbombe: ability({
    id: 'rauchbombe', name: 'Rauchbombe', classId: 'dieb', shape: 'zone', target: 'self', damageKey: null,
    base: { damage: 0, cooldown: 9, radius: 4, delay: 0, duration: 0, tickDamage: 0, tickInterval: 0.5, confuse: 3 },
    perk3: [{ key: 'radius', add: 1.5 }],
    perk5: [{ key: 'confuse', add: 2 }],
  }),
};

/** Größte Strecke, die ein Geschoss pro Teilschritt fliegt (verhindert Durchtunneln). */
export const PROJECTILE_SUBSTEP = 0.25;
/** Zellgröße des Rasters für Trefferabfragen der Fähigkeiten. */
export const ABILITY_GRID_CELL = 4;
