/**
 * @typedef {'arc'|'ring'|'line'|'projectile'|'chain'|'zone'|'orbit'|'buff'|'summon'} AbilityShape
 * @typedef {'facing'|'nearest'|'densest'|'self'} AbilityTarget
 * @typedef {{ key: string, add?: number, mul?: number }} LevelChange
 * @typedef {{ key: string, extra: number }} AbilityAim Zielreichweite einer facing-Fähigkeit: params[key] + extra
 * @typedef {{ id: string, name: string, description: string, classId: string, shape: AbilityShape, trigger: 'auto', target: AbilityTarget,
 *   aim?: AbilityAim,
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

/** Zusatz zur Zielreichweite von Nahkampf-Fähigkeiten (m): der Held zielt etwas über die Trefferfläche hinaus. */
const AIM_MELEE_EXTRA = 1.5;

/** Maße, die mit stats.area skalieren. Winkel, Anzahlen, Tempo und Reichweiten skalieren nicht. */
export const AREA_KEYS = ['radius', 'length', 'width', 'explosion', 'orbitRadius', 'lureRadius', 'explodeRadius'];

/** Zuwachs des Grundschadens je Stufe. */
const DAMAGE_STEP = 0.2;

/** Abklingzeit-Faktor der Stufen 2 und 4 bei Fähigkeiten ohne Schaden (sonst bliebe dort nichts). */
const COOLDOWN_STEP = 0.88;

/**
 * Baut die Stufen 2…5: jede Stufe +20 % auf den Grundschaden (falls damageKey gesetzt), Stufe 3 und 5 mit Extras.
 * Ohne damageKey bringen die Stufen 2 und 4 stattdessen Abklingzeit × 0,88.
 * @param {string|null} damageKey
 * @param {Record<string, number>} base
 * @param {LevelChange[]} perk3
 * @param {LevelChange[]} perk5
 * @returns {LevelChange[][]}
 */
function levels(damageKey, base, perk3, perk5) {
  if (!damageKey) {
    const faster = [{ key: 'cooldown', mul: COOLDOWN_STEP }];
    return [faster, [...perk3], faster, [...perk5]];
  }
  const step = [{ key: damageKey, add: base[damageKey] * DAMAGE_STEP }];
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
    id: 'schwerthieb', name: 'Ordentlich Draufhauen', description: 'Ein breiter Hieb nach vorn. Diplomatie wird überschätzt.', classId: 'krieger', shape: 'arc', target: 'facing',
    aim: { key: 'radius', extra: AIM_MELEE_EXTRA },
    base: { damage: 12, cooldown: 1.0, radius: 2.6, angle: 110, swings: 1, knockback: 0, stun: 0 },
    perk3: [{ key: 'angle', add: 40 }],
    perk5: [{ key: 'swings', add: 1 }],
  }),
  wirbelschlag: ability({
    id: 'wirbelschlag', name: 'Karussell des Schmerzes', description: 'Schlägt rundherum alles, was zu nah steht. Mitfahren auf eigene Gefahr.', classId: 'krieger', shape: 'ring', target: 'self',
    base: { damage: 10, cooldown: 3.0, radius: 3.0, slow: 0, slowDuration: 0 },
    perk3: [{ key: 'radius', mul: 1.25 }],
    perk5: [{ key: 'cooldown', mul: 0.75 }],
  }),
  schildstoss: ability({
    id: 'schildstoss', name: 'Bitte Abstand halten', description: 'Stößt Gegner vor dir zurück. Höflich, aber bestimmt.', classId: 'krieger', shape: 'arc', target: 'facing',
    aim: { key: 'radius', extra: AIM_MELEE_EXTRA },
    base: { damage: 5, cooldown: 4.0, radius: 2.2, angle: 90, swings: 1, knockback: 5, stun: 0 },
    perk3: [{ key: 'knockback', add: 3 }],
    perk5: [{ key: 'stun', add: 1 }],
  }),
  kriegsschrei: ability({
    id: 'kriegsschrei', name: 'Montagmorgen-Gebrüll', description: 'Ein paar Sekunden lang mehr Schaden. Kaffee gab es keinen.', classId: 'krieger', shape: 'buff', target: 'self', damageKey: null,
    base: { cooldown: 14, duration: 5, damagePct: 0.3 },
    perk3: [{ key: 'duration', add: 2 }],
    perk5: [{ key: 'damagePct', add: 0.2 }],
  }),
  erdspalter: ability({
    id: 'erdspalter', name: 'Gartenumgraber', description: 'Reißt einen langen Graben nach vorn und trifft alles darin. Der Rasen nimmt es persönlich.', classId: 'krieger', shape: 'line', target: 'facing',
    aim: { key: 'length', extra: AIM_MELEE_EXTRA },
    base: { damage: 18, cooldown: 5.0, length: 9, width: 1.6 },
    perk3: [{ key: 'length', add: 3 }],
    perk5: [{ key: 'width', add: 0.8 }],
  }),
  feuerball: ability({
    id: 'feuerball', name: 'Heiße Angelegenheit', description: 'Fliegt zum nächsten Gegner und explodiert. Brandschutz war gestern.', classId: 'magier', shape: 'projectile', target: 'nearest',
    base: { damage: 10, cooldown: 1.2, speed: 14, explosion: 1.5, range: 14, count: 1, spread: 15, pierce: 1, size: 0.3 },
    perk3: [{ key: 'count', add: 1 }],
    perk5: [{ key: 'explosion', add: 1.0 }],
  }),
  frostring: ability({
    id: 'frostring', name: 'Kalte Schulter', description: 'Eine eisige Welle rundum schadet und bremst Gegner. Eiskalt abserviert.', classId: 'magier', shape: 'ring', target: 'self',
    base: { damage: 6, cooldown: 4.0, radius: 3.5, slow: 0.4, slowDuration: 2 },
    perk3: [{ key: 'radius', mul: 1.25 }],
    perk5: [{ key: 'slow', add: 0.2 }],
  }),
  kettenblitz: ability({
    id: 'kettenblitz', name: 'Gewitter mit Ansage', description: 'Springt von Gegner zu Gegner. Wer nass ist, hat Pech.', classId: 'magier', shape: 'chain', target: 'nearest',
    base: { damage: 9, cooldown: 2.5, jumps: 4, jumpRange: 5, range: 10 },
    perk3: [{ key: 'jumps', add: 2 }],
    perk5: [{ key: 'jumps', add: 3 }],
  }),
  meteor: ability({
    id: 'meteor', name: 'Post von oben', description: 'Schlägt in der dichtesten Gruppe ein. Eine Unterschrift ist nicht nötig.', classId: 'magier', shape: 'zone', target: 'densest',
    base: { damage: 30, cooldown: 6.0, radius: 3.0, delay: 0.8, range: 12, duration: 0, tickDamage: 3, tickInterval: 0.5, confuse: 0 },
    perk3: [{ key: 'radius', add: 1.0 }],
    perk5: [{ key: 'duration', add: 3 }], // brennt 3 s nach: 3 Schaden je 0,5 s = 6/s
  }),
  arkankugeln: ability({
    id: 'arkankugeln', name: 'Aufdringliche Glühwürmchen', description: 'Kreisen um dich und treffen, was sie berühren. Die lassen nicht locker.', classId: 'magier', shape: 'orbit', target: 'self',
    base: { damage: 6, cooldown: 0, count: 2, orbitRadius: 2.5, hitInterval: 0.5, orbitSpeed: 3, size: 0.5 },
    perk3: [{ key: 'count', add: 1 }],
    perk5: [{ key: 'count', add: 2 }],
  }),
  wurfdolche: ability({
    id: 'wurfdolche', name: 'Spitze Bemerkungen', description: 'Durchschlagende Dolche nach vorn. Kritik, die ankommt.', classId: 'dieb', shape: 'projectile', target: 'facing',
    aim: { key: 'range', extra: 0 },
    base: { damage: 7, cooldown: 0.6, speed: 18, pierce: 2, range: 12, count: 1, spread: 10, explosion: 0, size: 0.25 },
    perk3: [{ key: 'count', add: 1 }],
    perk5: [{ key: 'pierce', add: 3 }],
  }),
  giftflaeche: ability({
    id: 'giftflaeche', name: 'Verdächtige Pfütze', description: 'Eine Giftlache unter dir schadet Gegnern Takt für Takt. Bitte nicht nachfragen, woher sie kommt.', classId: 'dieb', shape: 'zone', target: 'self', damageKey: 'tickDamage',
    base: { damage: 0, cooldown: 5.0, radius: 2.5, delay: 0, duration: 4, tickDamage: 4, tickInterval: 0.5, confuse: 0 },
    perk3: [{ key: 'radius', add: 1.0 }],
    perk5: [{ key: 'duration', add: 2 }],
  }),
  schattenklon: ability({
    id: 'schattenklon', name: "Der war's!", description: 'Ein Klon lenkt die Gegner ab. Du warst es nie.', classId: 'dieb', shape: 'summon', target: 'self', damageKey: null,
    base: { cooldown: 12, duration: 5, lureRadius: 8, explodeDamage: 0, explodeRadius: 3 },
    perk3: [{ key: 'duration', add: 2 }],
    perk5: [{ key: 'explodeDamage', add: 25 }],
  }),
  klingenfaecher: ability({
    id: 'klingenfaecher', name: 'Besteckschublade', description: 'Wirft mehrere Dolche im Fächer. Einfach mal alles raus.', classId: 'dieb', shape: 'projectile', target: 'facing',
    aim: { key: 'range', extra: 0 },
    base: { damage: 6, cooldown: 2.5, count: 5, spread: 60, speed: 16, range: 9, pierce: 1, explosion: 0, size: 0.25 },
    perk3: [{ key: 'count', add: 2 }],
    perk5: [{ key: 'count', add: 2 }, { key: 'spread', add: 300 }],
  }),
  rauchbombe: ability({
    id: 'rauchbombe', name: 'Ich bin dann mal weg', description: 'Gegner in der Wolke verlieren kurz das Ziel. Man sieht sich.', classId: 'dieb', shape: 'zone', target: 'self', damageKey: null,
    base: { damage: 0, cooldown: 9, radius: 4, delay: 0, duration: 0, tickDamage: 0, tickInterval: 0.5, confuse: 3 },
    perk3: [{ key: 'radius', add: 1.5 }],
    perk5: [{ key: 'confuse', add: 2 }],
  }),
  halsschwinger: ability({
    id: 'halsschwinger', name: 'Langer Hals, kurzer Prozess', description: 'Ein weiter Schwung mit dem Hals nach vorn. Von oben sieht man eben, wo es sich lohnt.', classId: 'hochstapler', shape: 'arc', target: 'facing',
    aim: { key: 'radius', extra: AIM_MELEE_EXTRA },
    base: { damage: 13, cooldown: 1.2, radius: 3.2, angle: 130, swings: 1, knockback: 0, stun: 0 },
    perk3: [{ key: 'angle', add: 40 }],
    perk5: [{ key: 'swings', add: 1 }],
  }),
  nussregen: ability({
    id: 'nussregen', name: 'Nüsse von oben', description: 'Das Erdmännchen wirft Nüsse auf den nächsten Gegner. Für die Beute gibt es keine Quittung.', classId: 'hochstapler', shape: 'projectile', target: 'nearest',
    base: { damage: 5, cooldown: 0.9, speed: 14, explosion: 0, range: 12, count: 2, spread: 15, pierce: 1, size: 0.25 },
    perk3: [{ key: 'count', add: 1 }],
    perk5: [{ key: 'pierce', add: 1 }],
  }),
  stampede: ability({
    id: 'stampede', name: 'Stampede für Arme', description: 'Ein kräftiger Stampfer schadet rundum und bremst. Die Herde besteht aus einer Giraffe.', classId: 'hochstapler', shape: 'ring', target: 'self',
    base: { damage: 11, cooldown: 3.5, radius: 3.2, slow: 0.3, slowDuration: 1.5 },
    perk3: [{ key: 'radius', mul: 1.25 }],
    perk5: [{ key: 'cooldown', mul: 0.75 }],
  }),
  buddelfalle: ability({
    id: 'buddelfalle', name: 'Hier wurde gebuddelt', description: 'Ein Loch tut sich in der dichtesten Gruppe auf, die Gegner stolpern und verlieren kurz die Orientierung. Das Erdmännchen war es nicht.', classId: 'hochstapler', shape: 'zone', target: 'densest',
    base: { damage: 20, cooldown: 6, radius: 2.5, delay: 0.6, range: 12, duration: 0, tickDamage: 0, tickInterval: 0.5, confuse: 1.5 },
    perk3: [{ key: 'radius', add: 1.0 }],
    perk5: [{ key: 'confuse', add: 1.5 }],
  }),
  grossfamilie: ability({
    id: 'grossfamilie', name: 'Großfamilie', description: 'Die Verwandtschaft taucht auf und lenkt Gegner ab. Sie kommen unangemeldet und gehen erst nach dem Kaffee.', classId: 'hochstapler', shape: 'summon', target: 'self', damageKey: null,
    base: { cooldown: 12, duration: 5, lureRadius: 8, explodeDamage: 0, explodeRadius: 3 },
    perk3: [{ key: 'duration', add: 2 }],
    perk5: [{ key: 'explodeDamage', add: 25 }],
  }),
};

/** Größte Strecke, die ein Geschoss pro Teilschritt fliegt (verhindert Durchtunneln). */
export const PROJECTILE_SUBSTEP = 0.25;
/** Zellgröße des Rasters für Trefferabfragen der Fähigkeiten. */
export const ABILITY_GRID_CELL = 4;
