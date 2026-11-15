/**
 * @typedef {'arc'|'ring'|'line'|'projectile'|'chain'|'zone'|'orbit'|'buff'|'summon'|'rage'|'shield'|'healzone'|'cloud'|'freeze'|'potion'|'steal'|'stealth'|'trap'|'applause'|'pet'|'mark'} AbilityShape
 *   Die Formen ab `rage` sind die Besonderheiten der Unterklassen (nur Abenteuer).
 * @typedef {'facing'|'nearest'|'densest'|'self'} AbilityTarget
 * @typedef {{ key: string, add?: number, mul?: number }} LevelChange
 * @typedef {{ key: string, extra: number }} AbilityAim Zielreichweite einer facing-Fähigkeit: params[key] + extra
 * @typedef {{ id: string, name: string, description: string, classId: string, shape: AbilityShape, trigger: 'auto', target: AbilityTarget,
 *   aim?: AbilityAim, subclass?: string,
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
  ...branchAbilities(),
};

/**
 * Astfähigkeiten der Unterklassen (nur Abenteuer, Feld `subclass`; stehen in keinem `abilityPool`). Je Unterklasse vier,
 * die erste ist die Besonderheit mit eigener Form (Spec §6). Zahlen vor den Faktoren für Fähigkeiten von Hand
 * (`MANUAL` in src/data/adventure.js: Schaden × 2,5, Abklingzeit × 2,5, mindestens 6 s).
 * Zusätzliche Werte der neuen Formen: maxPct (Raserei), shieldPct (Schild), healPct (Heilzone je s, Glückstrank),
 * interval (Takt von Wolke und Haustier), freezeStun (Einfrieren), goldChance/goldMin/goldMax/goldCap (Klauen),
 * maxTraps (Fallen), maxDuration/perKill (Applaus), reach/speed (Haustier), maxTargets/markPct/bossMarkPct (Markieren).
 * Geschosse und Zonen dürfen zusätzlich slow/slowDuration/stun/knockback tragen, Beschwörungen count.
 * @returns {Record<string, AbilityDef>}
 */
function branchAbilities() {
  const M = AIM_MELEE_EXTRA;
  const defs = [
    // Krieger – Kneipenschläger
    { id: 'roteruebe', subclass: 'kneipenschlaeger', name: 'Rote Rübe', description: 'Je weniger Leben, desto mehr Wumms. Bis zu +60 % Schaden.', shape: 'rage', target: 'self', damageKey: null,
      base: { cooldown: 7, duration: 8, maxPct: 0.6 }, perk3: [{ key: 'duration', add: 2 }], perk5: [{ key: 'cooldown', mul: 0.8 }] },
    { id: 'hockerwurf', subclass: 'kneipenschlaeger', name: 'Hockerwurf', description: 'Ein Barhocker fliegt zum nächsten Gegner und schubst ihn weg.', shape: 'projectile', target: 'nearest',
      base: { damage: 14, cooldown: 2.5, speed: 14, explosion: 0, range: 12, count: 1, spread: 10, pierce: 1, size: 0.35, knockback: 3 }, perk3: [{ key: 'knockback', add: 2 }], perk5: [{ key: 'count', add: 1 }] },
    { id: 'thekenrutsche', subclass: 'kneipenschlaeger', name: 'Thekenrutsche', description: 'Rutscht das Unheil quer über die Theke. Alles in der Bahn bekommt was ab.', shape: 'line', target: 'facing',
      aim: { key: 'length', extra: M }, base: { damage: 16, cooldown: 3, length: 8, width: 1.8 }, perk3: [{ key: 'length', add: 2 }], perk5: [{ key: 'width', add: 0.8 }] },
    { id: 'letzterunde', subclass: 'kneipenschlaeger', name: 'Letzte Runde!', description: 'Ein gewaltiger Rundumschlag. Danach ist Feierabend.', shape: 'ring', target: 'self',
      base: { damage: 30, cooldown: 5, radius: 3.5, slow: 0, slowDuration: 0 }, perk3: [{ key: 'radius', mul: 1.2 }], perk5: [{ key: 'cooldown', mul: 0.8 }] },
    // Krieger – Türsteher
    { id: 'breiteskreuz', subclass: 'tuersteher', name: 'Breites Kreuz', description: 'Ein Schild aus 30 % des Lebens fängt Schaden ab. Neu auslösen ersetzt ihn.', shape: 'shield', target: 'self', damageKey: null,
      base: { cooldown: 7, duration: 8, shieldPct: 0.3 }, perk3: [{ key: 'duration', add: 2 }], perk5: [{ key: 'shieldPct', add: 0.05 }] },
    { id: 'ausweisbitte', subclass: 'tuersteher', name: 'Ausweis bitte!', description: 'Ein Hieb nach vorn, der Gegner kurz betäubt. Erst mal kontrollieren.', shape: 'arc', target: 'facing',
      aim: { key: 'radius', extra: M }, base: { damage: 10, cooldown: 3, radius: 2.6, angle: 100, swings: 1, knockback: 0, stun: 1 }, perk3: [{ key: 'angle', add: 40 }], perk5: [{ key: 'stun', add: 0.5 }] },
    { id: 'rausschmiss', subclass: 'tuersteher', name: 'Rausschmiss', description: 'Schiebt alles vor dir weit weg. Und tschüss.', shape: 'line', target: 'facing',
      aim: { key: 'length', extra: M }, base: { damage: 12, cooldown: 3.5, length: 7, width: 2, knockback: 6 }, perk3: [{ key: 'knockback', add: 2 }], perk5: [{ key: 'width', add: 1 }] },
    { id: 'hausverbot', subclass: 'tuersteher', name: 'Hausverbot', description: 'Eine Welle rundum, die Gegner bremst. Hier kommt keiner mehr rein.', shape: 'ring', target: 'self',
      base: { damage: 10, cooldown: 4, radius: 4, slow: 0.5, slowDuration: 3 }, perk3: [{ key: 'radius', mul: 1.2 }], perk5: [{ key: 'slowDuration', add: 1.5 }] },
    // Krieger – Ritter von der traurigen Kochstelle
    { id: 'eintopf', subclass: 'kochstelle', name: 'Eintopf der Hoffnung', description: 'Ein Topf an deinem Platz: heilt dich darin 3 % Leben je Sekunde und schadet Gegnern.', shape: 'healzone', target: 'self', damageKey: 'tickDamage',
      base: { damage: 0, cooldown: 8, radius: 3, delay: 0, duration: 6, tickDamage: 4, tickInterval: 0.5, confuse: 0, healPct: 0.03 }, perk3: [{ key: 'radius', add: 0.8 }], perk5: [{ key: 'duration', add: 2 }] },
    { id: 'pfannenschwung', subclass: 'kochstelle', name: 'Pfannenschwung', description: 'Ein breiter Schwung mit der Bratpfanne. Klingt nach Mittagessen.', shape: 'arc', target: 'facing',
      aim: { key: 'radius', extra: M }, base: { damage: 14, cooldown: 2.5, radius: 3, angle: 160, swings: 1, knockback: 1, stun: 0 }, perk3: [{ key: 'radius', add: 0.6 }], perk5: [{ key: 'swings', add: 1 }] },
    { id: 'kellenwurf', subclass: 'kochstelle', name: 'Kellenwurf', description: 'Die Suppenkelle fliegt durch mehrere Gegner hindurch.', shape: 'projectile', target: 'facing',
      aim: { key: 'range', extra: 0 }, base: { damage: 12, cooldown: 2.5, speed: 16, pierce: 4, range: 12, count: 1, spread: 10, explosion: 0, size: 0.3 }, perk3: [{ key: 'pierce', add: 2 }], perk5: [{ key: 'count', add: 1 }] },
    { id: 'fliegendeteller', subclass: 'kochstelle', name: 'Fliegende Teller', description: 'Teller kreisen um dich. Spülen fällt heute aus.', shape: 'orbit', target: 'self',
      base: { damage: 7, cooldown: 0, count: 3, orbitRadius: 2.8, hitInterval: 0.5, orbitSpeed: 3.5, size: 0.5 }, perk3: [{ key: 'count', add: 1 }], perk5: [{ key: 'count', add: 1 }] },
    // Magier – Wetterfrosch
    { id: 'gewitterwolke', subclass: 'wetterfrosch', name: 'Persönliche Gewitterwolke', description: '10 s folgt dir eine Wolke und trifft jede Sekunde einen Gegner in der Nähe.', shape: 'cloud', target: 'self',
      base: { damage: 10, cooldown: 8, duration: 10, interval: 1, range: 7 }, perk3: [{ key: 'duration', add: 3 }], perk5: [{ key: 'interval', mul: 0.75 }] },
    { id: 'boevonvorn', subclass: 'wetterfrosch', name: 'Böe von vorn', description: 'Ein Windstoß nach vorn wirft Gegner zurück.', shape: 'line', target: 'facing',
      aim: { key: 'length', extra: M }, base: { damage: 10, cooldown: 3, length: 8, width: 2.4, knockback: 4 }, perk3: [{ key: 'knockback', add: 2 }], perk5: [{ key: 'length', add: 3 }] },
    { id: 'hagelschauer', subclass: 'wetterfrosch', name: 'Hagelschauer', description: 'Hagel prasselt auf die dichteste Gruppe.', shape: 'zone', target: 'densest',
      base: { damage: 8, cooldown: 4, radius: 3, delay: 0.5, range: 12, duration: 3, tickDamage: 4, tickInterval: 0.5, confuse: 0 }, perk3: [{ key: 'radius', add: 1 }], perk5: [{ key: 'duration', add: 2 }] },
    { id: 'kugelblitz', subclass: 'wetterfrosch', name: 'Kugelblitz', description: 'Ein Blitz, der von Gegner zu Gegner springt. Und springt. Und springt.', shape: 'chain', target: 'nearest',
      base: { damage: 9, cooldown: 3, jumps: 7, jumpRange: 6, range: 11 }, perk3: [{ key: 'jumps', add: 2 }], perk5: [{ key: 'jumps', add: 3 }] },
    // Magier – Eisheiliger
    { id: 'frostbeule', subclass: 'eisheiliger', name: 'Frostbeule', description: 'Ring um dich: schon gebremste Gegner frieren 2 s ein, die anderen werden gebremst. Bosse frieren nie.', shape: 'freeze', target: 'self',
      base: { damage: 8, cooldown: 7, radius: 4, slow: 0.5, slowDuration: 2, freezeStun: 2 }, perk3: [{ key: 'radius', mul: 1.2 }], perk5: [{ key: 'freezeStun', add: 1 }] },
    { id: 'eiszapfen', subclass: 'eisheiliger', name: 'Eiszapfen', description: 'Ein spitzer Zapfen, der Gegner bremst.', shape: 'projectile', target: 'nearest',
      base: { damage: 11, cooldown: 2, speed: 16, explosion: 0, range: 13, count: 1, spread: 10, pierce: 2, size: 0.3, slow: 0.4, slowDuration: 2 }, perk3: [{ key: 'count', add: 1 }], perk5: [{ key: 'pierce', add: 2 }] },
    { id: 'glatteis', subclass: 'eisheiliger', name: 'Glatteis', description: 'Eine rutschige Fläche unter der dichtesten Gruppe bremst und zwickt.', shape: 'zone', target: 'densest', damageKey: 'tickDamage',
      base: { damage: 0, cooldown: 5, radius: 3.5, delay: 0, range: 12, duration: 4, tickDamage: 2, tickInterval: 0.5, confuse: 0, slow: 0.5, slowDuration: 1 }, perk3: [{ key: 'radius', add: 1 }], perk5: [{ key: 'duration', add: 2 }] },
    { id: 'schneesturm', subclass: 'eisheiliger', name: 'Schneesturm', description: 'Ein weiter, kalter Ring. Mütze nicht vergessen.', shape: 'ring', target: 'self',
      base: { damage: 9, cooldown: 4.5, radius: 5, slow: 0.5, slowDuration: 3 }, perk3: [{ key: 'radius', mul: 1.2 }], perk5: [{ key: 'slow', add: 0.2 }] },
    // Magier – Hobbyalchemist
    { id: 'wundertuete', subclass: 'alchemist', name: 'Wundertüte', description: 'Ein Trank fliegt zum nächsten Gegner: Feuer, Schleim oder ein Glückstrank, der dich heilt.', shape: 'potion', target: 'nearest',
      base: { damage: 22, cooldown: 6, speed: 12, range: 12, radius: 2.5, slow: 0.6, slowDuration: 3, healPct: 0.15, size: 0.35 }, perk3: [{ key: 'radius', add: 0.8 }], perk5: [{ key: 'cooldown', mul: 0.8 }] },
    { id: 'stinkbombe', subclass: 'alchemist', name: 'Stinkbombe', description: 'Giftiger Dunst, in dem Gegner die Orientierung verlieren.', shape: 'zone', target: 'densest', damageKey: 'tickDamage',
      base: { damage: 0, cooldown: 5, radius: 3, delay: 0.5, range: 12, duration: 4, tickDamage: 4, tickInterval: 0.5, confuse: 2 }, perk3: [{ key: 'radius', add: 1 }], perk5: [{ key: 'confuse', add: 1.5 }] },
    { id: 'blubberndephiole', subclass: 'alchemist', name: 'Blubbernde Phiole', description: 'Fliegt zum nächsten Gegner und explodiert. Hätte man vorher schütteln sollen?', shape: 'projectile', target: 'nearest',
      base: { damage: 14, cooldown: 3, speed: 12, explosion: 2.5, range: 12, count: 1, spread: 10, pierce: 1, size: 0.35 }, perk3: [{ key: 'explosion', add: 1 }], perk5: [{ key: 'count', add: 1 }] },
    { id: 'selbstversuch', subclass: 'alchemist', name: 'Selbstversuch', description: 'Einmal kräftig trinken: mehr Schaden und schneller. Nebenwirkungen folgen später.', shape: 'buff', target: 'self', damageKey: null,
      base: { cooldown: 14, duration: 5, damagePct: 0.25, moveSpeedPct: 0.2 }, perk3: [{ key: 'damagePct', add: 0.1 }], perk5: [{ key: 'moveSpeedPct', add: 0.1 }] },
    // Dieb – Taschendieb
    { id: 'langefinger', subclass: 'taschendieb', name: 'Lange Finger', description: '10 s lang lässt jeder Treffer manchmal Gold springen (höchstens 30), Besiegte geben doppelt Beutechance.', shape: 'steal', target: 'self', damageKey: null,
      base: { cooldown: 8, duration: 10, goldChance: 0.25, goldMin: 1, goldMax: 3, goldCap: 30 }, perk3: [{ key: 'duration', add: 2 }], perk5: [{ key: 'cooldown', mul: 0.8 }] },
    { id: 'griffindietasche', subclass: 'taschendieb', name: 'Griff in die Tasche', description: 'Ein kurzer, schneller Griff nach vorn.', shape: 'arc', target: 'facing',
      aim: { key: 'radius', extra: M }, base: { damage: 11, cooldown: 1.5, radius: 2.2, angle: 90, swings: 1, knockback: 0, stun: 0 }, perk3: [{ key: 'angle', add: 40 }], perk5: [{ key: 'swings', add: 1 }] },
    { id: 'muenzwurf', subclass: 'taschendieb', name: 'Münzwurf', description: 'Ein Fächer aus Münzen. Zurückgeben muss man sie nicht.', shape: 'projectile', target: 'facing',
      aim: { key: 'range', extra: 0 }, base: { damage: 5, cooldown: 2.5, count: 6, spread: 50, speed: 16, range: 10, pierce: 1, explosion: 0, size: 0.25 }, perk3: [{ key: 'count', add: 2 }], perk5: [{ key: 'pierce', add: 1 }] },
    { id: 'ablenkung', subclass: 'taschendieb', name: 'Ablenkungsmanöver', description: 'Ein Lockvogel zieht Gegner auf sich. Schau mal, da drüben!', shape: 'summon', target: 'self', damageKey: null,
      base: { cooldown: 12, duration: 6, lureRadius: 9, explodeDamage: 0, explodeRadius: 3 }, perk3: [{ key: 'duration', add: 2 }], perk5: [{ key: 'explodeDamage', add: 25 }] },
    // Dieb – Schattenläufer
    { id: 'hierwarniemand', subclass: 'schattenlaeufer', name: 'Hier war niemand', description: '4 s unsichtbar: Gegner verlieren dich, dein erster Treffer danach ist sicher kritisch. Bosse sehen dich trotzdem.', shape: 'stealth', target: 'self', damageKey: null,
      base: { cooldown: 8, duration: 4 }, perk3: [{ key: 'duration', add: 1 }], perk5: [{ key: 'cooldown', mul: 0.8 }] },
    { id: 'dolchindenruecken', subclass: 'schattenlaeufer', name: 'Dolch in den Rücken', description: 'Ein schneller, harter Stich nach vorn.', shape: 'line', target: 'facing',
      aim: { key: 'length', extra: M }, base: { damage: 20, cooldown: 3, length: 5, width: 1.2 }, perk3: [{ key: 'length', add: 1.5 }], perk5: [{ key: 'width', add: 0.6 }] },
    { id: 'schattenschritt', subclass: 'schattenlaeufer', name: 'Schattenschritt', description: 'Ein Schatten wirbelt um dich herum und schneidet zu.', shape: 'ring', target: 'self',
      base: { damage: 14, cooldown: 3.5, radius: 3, slow: 0, slowDuration: 0 }, perk3: [{ key: 'radius', mul: 1.2 }], perk5: [{ key: 'cooldown', mul: 0.8 }] },
    { id: 'rauchvorhang', subclass: 'schattenlaeufer', name: 'Rauchvorhang', description: 'Dichter Rauch über der größten Gruppe. Wer drin steht, ist verwirrt.', shape: 'zone', target: 'densest', damageKey: null,
      base: { damage: 0, cooldown: 6, radius: 4, delay: 0, range: 12, duration: 0, tickDamage: 0, tickInterval: 0.5, confuse: 3 }, perk3: [{ key: 'radius', add: 1.5 }], perk5: [{ key: 'confuse', add: 2 }] },
    // Dieb – Fallensteller
    { id: 'baerenfalle', subclass: 'fallensteller', name: 'Bärenfalle für Nicht-Bären', description: 'Legt eine Falle an deinen Platz: Schaden und 1,5 s Betäubung. Höchstens 3 gleichzeitig.', shape: 'trap', target: 'self',
      base: { damage: 30, cooldown: 3, radius: 1.2, stun: 1.5, duration: 30, maxTraps: 3 }, perk3: [{ key: 'radius', add: 0.4 }], perk5: [{ key: 'stun', add: 0.5 }] },
    { id: 'stolperdraht', subclass: 'fallensteller', name: 'Stolperdraht', description: 'Ein gespannter Draht nach vorn. Wer drüber läuft, liegt kurz.', shape: 'line', target: 'facing',
      aim: { key: 'length', extra: M }, base: { damage: 8, cooldown: 3, length: 8, width: 1.2, stun: 1.2 }, perk3: [{ key: 'length', add: 2 }], perk5: [{ key: 'stun', add: 0.6 }] },
    { id: 'kraehenfuesse', subclass: 'fallensteller', name: 'Krähenfüße', description: 'Spitze Dinger am Boden bremsen und piksen.', shape: 'zone', target: 'densest', damageKey: 'tickDamage',
      base: { damage: 0, cooldown: 5, radius: 3, delay: 0, range: 12, duration: 4, tickDamage: 3, tickInterval: 0.5, confuse: 0, slow: 0.4, slowDuration: 1 }, perk3: [{ key: 'radius', add: 1 }], perk5: [{ key: 'duration', add: 2 }] },
    { id: 'abindiegrube', subclass: 'fallensteller', name: 'Ab in die Grube', description: 'Der Boden gibt unter der dichtesten Gruppe nach.', shape: 'zone', target: 'densest',
      base: { damage: 40, cooldown: 6, radius: 2.5, delay: 0.8, range: 12, duration: 0, tickDamage: 0, tickInterval: 0.5, confuse: 0 }, perk3: [{ key: 'radius', add: 1 }], perk5: [{ key: 'cooldown', mul: 0.8 }] },
    // Hochstapler – Zirkusdirektor
    { id: 'applaus', subclass: 'zirkusdirektor', name: 'Applaus, Applaus', description: '8 s mehr Schaden und Tempo; jeder Sieg verlängert um 1 s, höchstens 20 s.', shape: 'applause', target: 'self', damageKey: null,
      base: { cooldown: 7, duration: 8, maxDuration: 20, perKill: 1, damagePct: 0.3, moveSpeedPct: 0.15 }, perk3: [{ key: 'damagePct', add: 0.1 }], perk5: [{ key: 'cooldown', mul: 0.8 }] },
    { id: 'peitschenknall', subclass: 'zirkusdirektor', name: 'Peitschenknall', description: 'Ein Knall nach vorn, der Gegner kurz erstarren lässt.', shape: 'arc', target: 'facing',
      aim: { key: 'radius', extra: M }, base: { damage: 10, cooldown: 2.5, radius: 3.2, angle: 70, swings: 1, knockback: 0, stun: 1 }, perk3: [{ key: 'radius', add: 0.8 }], perk5: [{ key: 'stun', add: 0.5 }] },
    { id: 'jonglage', subclass: 'zirkusdirektor', name: 'Jonglage', description: 'Nüsse kreisen um euch. Keine fällt herunter. Fast keine.', shape: 'orbit', target: 'self',
      base: { damage: 6, cooldown: 0, count: 3, orbitRadius: 2.4, hitInterval: 0.5, orbitSpeed: 4, size: 0.45 }, perk3: [{ key: 'count', add: 1 }], perk5: [{ key: 'count', add: 2 }] },
    { id: 'grossesfinale', subclass: 'zirkusdirektor', name: 'Großes Finale', description: 'Ein riesiger Rundumschlag. Vorhang!', shape: 'ring', target: 'self',
      base: { damage: 32, cooldown: 6, radius: 4, slow: 0, slowDuration: 0 }, perk3: [{ key: 'radius', mul: 1.2 }], perk5: [{ key: 'cooldown', mul: 0.8 }] },
    // Hochstapler – Kletterkünstler
    { id: 'erdmaennchen', subclass: 'kletterkuenstler', name: 'Erdmännchen auf Abwegen', description: '15 s läuft das Erdmännchen los und beißt den nächsten Gegner. Kann nicht verlieren.', shape: 'pet', target: 'self',
      base: { damage: 8, cooldown: 8, duration: 15, interval: 0.8, speed: 7, reach: 1.2, range: 12 }, perk3: [{ key: 'interval', mul: 0.8 }], perk5: [{ key: 'duration', add: 5 }] },
    { id: 'nussgewitter', subclass: 'kletterkuenstler', name: 'Nussgewitter', description: 'Ein ganzer Schwall Nüsse auf den nächsten Gegner.', shape: 'projectile', target: 'nearest',
      base: { damage: 5, cooldown: 2, speed: 14, explosion: 0, range: 12, count: 5, spread: 40, pierce: 1, size: 0.25 }, perk3: [{ key: 'count', add: 2 }], perk5: [{ key: 'pierce', add: 1 }] },
    { id: 'halsrutsche', subclass: 'kletterkuenstler', name: 'Halsrutsche', description: 'Das Erdmännchen saust den Hals hinunter, alles davor wird umgemäht.', shape: 'line', target: 'facing',
      aim: { key: 'length', extra: M }, base: { damage: 15, cooldown: 3, length: 9, width: 1.6 }, perk3: [{ key: 'length', add: 2 }], perk5: [{ key: 'width', add: 0.8 }] },
    { id: 'familientreffen', subclass: 'kletterkuenstler', name: 'Familientreffen', description: 'Gleich drei Verwandte lenken Gegner ab und platzen am Ende vor Freude.', shape: 'summon', target: 'self', damageKey: null,
      base: { cooldown: 12, duration: 5, lureRadius: 8, explodeDamage: 12, explodeRadius: 3, count: 3 }, perk3: [{ key: 'duration', add: 2 }], perk5: [{ key: 'explodeDamage', add: 20 }] },
    // Hochstapler – Ausguck
    { id: 'dadrueben', subclass: 'ausguck', name: 'Da drüben!', description: 'Markiert bis zu 5 Gegner in der Nähe für 8 s: sie nehmen 40 % mehr Schaden (Bosse 20 %).', shape: 'mark', target: 'self', damageKey: null,
      base: { cooldown: 7, duration: 8, range: 12, maxTargets: 5, markPct: 0.4, bossMarkPct: 0.2 }, perk3: [{ key: 'duration', add: 2 }], perk5: [{ key: 'cooldown', mul: 0.8 }] },
    { id: 'fernglaswurf', subclass: 'ausguck', name: 'Fernglaswurf', description: 'Wirft weit, sehr weit. Das Fernglas kommt nie zurück.', shape: 'projectile', target: 'nearest',
      base: { damage: 14, cooldown: 2, speed: 18, explosion: 0, range: 18, count: 1, spread: 10, pierce: 1, size: 0.3 }, perk3: [{ key: 'count', add: 1 }], perk5: [{ key: 'pierce', add: 2 }] },
    { id: 'langerhals', subclass: 'ausguck', name: 'Langer Hals, weiter Blick', description: 'Ein sehr langer Hieb nach vorn.', shape: 'line', target: 'facing',
      aim: { key: 'length', extra: M }, base: { damage: 13, cooldown: 3, length: 12, width: 1.4 }, perk3: [{ key: 'length', add: 3 }], perk5: [{ key: 'width', add: 0.8 }] },
    { id: 'steinschlag', subclass: 'ausguck', name: 'Steinschlag von oben', description: 'Steine fallen auf die dichteste Gruppe, auch weit weg.', shape: 'zone', target: 'densest',
      base: { damage: 26, cooldown: 5, radius: 2.8, delay: 0.7, range: 16, duration: 0, tickDamage: 0, tickInterval: 0.5, confuse: 0 }, perk3: [{ key: 'radius', add: 1 }], perk5: [{ key: 'cooldown', mul: 0.8 }] },
  ];
  const classOf = { kneipenschlaeger: 'krieger', tuersteher: 'krieger', kochstelle: 'krieger', wetterfrosch: 'magier', eisheiliger: 'magier',
    alchemist: 'magier', taschendieb: 'dieb', schattenlaeufer: 'dieb', fallensteller: 'dieb', zirkusdirektor: 'hochstapler',
    kletterkuenstler: 'hochstapler', ausguck: 'hochstapler' };
  return Object.fromEntries(defs.map((d) => [d.id, ability({ ...d, classId: classOf[d.subclass] })]));
}

/** Größte Strecke, die ein Geschoss pro Teilschritt fliegt (verhindert Durchtunneln). */
export const PROJECTILE_SUBSTEP = 0.25;
/** Zellgröße des Rasters für Trefferabfragen der Fähigkeiten. */
export const ABILITY_GRID_CELL = 4;
