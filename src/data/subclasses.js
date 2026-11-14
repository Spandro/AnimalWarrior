/**
 * Die zwölf Unterklassen des Abenteuers (Etappe 2, Spec §5): drei je Klasse, ab Level 10 wählbar.
 * @typedef {import('./animals.js').Modifier} Modifier
 * @typedef {{ special: string, value: number, shape?: string|string[], mode?: 'add'|'pct' }} SpecialBonus
 *   Bonus je Stufe auf einen Wert der Fähigkeiten (`special` = Name des Werts, z. B. `shieldPct`): `add` zählt
 *   `value × Stufe` dazu, `pct` vervielfacht mit `1 + value × Stufe`. Mit `shape` nur für Fähigkeiten dieser Form(en).
 *   Zwei besondere Namen sind keine Fähigkeitswerte: `lifesteal` (Anteil des Schadens heilt den Helden) und
 *   `lootChance` (Gegenstandschance × (1 + Wert)).
 * @typedef {{ id: string, name: string, maxRank: 3, perRank: Modifier | SpecialBonus }} PassiveDef
 * @typedef {{ id: string, classId: string, name: string, line: string, signature: string,
 *   abilities: [string, string, string, string], passives: PassiveDef[] }} SubclassDef
 */

const p = (id, name, perRank) => ({ id, name, maxRank: 3, perRank });

/** @type {Record<string, SubclassDef>} */
export const SUBCLASSES = {
  kneipenschlaeger: {
    id: 'kneipenschlaeger', classId: 'krieger', name: 'Kneipenschläger', line: 'Erst hauen, dann fragen. Fragen ist eh überbewertet.',
    signature: 'roteruebe', abilities: ['roteruebe', 'hockerwurf', 'thekenrutsche', 'letzterunde'],
    passives: [
      p('wucht', 'Wucht', { stat: 'damage', pct: 0.04 }),
      p('zornesfalte', 'Zornesfalte', { stat: 'critDamage', flat: 0.1 }),
      p('zapfhahn', 'Zapfhahn', { special: 'lifesteal', value: 0.02 }),
      p('kneipentour', 'Kneipentour', { stat: 'moveSpeed', pct: 0.03 }),
    ],
  },
  tuersteher: {
    id: 'tuersteher', classId: 'krieger', name: 'Türsteher', line: 'Du kommst hier nicht rein. Niemand.',
    signature: 'breiteskreuz', abilities: ['breiteskreuz', 'ausweisbitte', 'rausschmiss', 'hausverbot'],
    passives: [
      p('dickehaut', 'Dicke Haut', { stat: 'maxHp', pct: 0.04 }),
      p('lederjacke', 'Lederjacke', { stat: 'armor', flat: 1 }),
      p('kreuzbreiter', 'Noch breiteres Kreuz', { special: 'shieldPct', value: 0.05, shape: 'shield' }),
      p('feierabendbier', 'Feierabendbier', { stat: 'hpRegen', flat: 0.4 }),
    ],
  },
  kochstelle: {
    id: 'kochstelle', classId: 'krieger', name: 'Ritter von der traurigen Kochstelle', line: 'Für Ehre, Vaterland und eine warme Mahlzeit.',
    signature: 'eintopf', abilities: ['eintopf', 'pfannenschwung', 'kellenwurf', 'fliegendeteller'],
    passives: [
      p('grossertopf', 'Großer Topf', { stat: 'area', pct: 0.05 }),
      p('kraeftigebruehe', 'Kräftige Brühe', { special: 'healPct', value: 0.01, shape: 'healzone' }),
      p('nachschlag', 'Nachschlag', { stat: 'maxHp', pct: 0.04 }),
      p('vorgekocht', 'Vorgekocht', { stat: 'cooldown', pct: -0.04 }),
    ],
  },
  wetterfrosch: {
    id: 'wetterfrosch', classId: 'magier', name: 'Wetterfrosch', line: 'Morgen: heiter bis tödlich.',
    signature: 'gewitterwolke', abilities: ['gewitterwolke', 'boevonvorn', 'hagelschauer', 'kugelblitz'],
    passives: [
      p('donnerwetter', 'Donnerwetter', { stat: 'damage', pct: 0.04 }),
      p('wetterumschwung', 'Wetterumschwung', { stat: 'cooldown', pct: -0.04 }),
      p('kettenreaktion', 'Kettenreaktion', { special: 'jumps', value: 1 }),
      p('blitzmerker', 'Blitzmerker', { stat: 'critChance', flat: 0.02 }),
    ],
  },
  eisheiliger: {
    id: 'eisheiliger', classId: 'magier', name: 'Eisheiliger', line: 'Bleib cool. Bleib sehr, sehr cool.',
    signature: 'frostbeule', abilities: ['frostbeule', 'eiszapfen', 'glatteis', 'schneesturm'],
    passives: [
      p('dauerfrost', 'Dauerfrost', { special: 'slowDuration', value: 0.3 }),
      p('winterspeck', 'Winterspeck', { stat: 'maxHp', pct: 0.04 }),
      p('eispanzer', 'Eispanzer', { stat: 'armor', flat: 1 }),
      p('weitekaelte', 'Weite Kälte', { stat: 'area', pct: 0.05 }),
    ],
  },
  alchemist: {
    id: 'alchemist', classId: 'magier', name: 'Hobbyalchemist', line: 'Was soll schon passieren? Oh.',
    signature: 'wundertuete', abilities: ['wundertuete', 'stinkbombe', 'blubberndephiole', 'selbstversuch'],
    passives: [
      p('heilsamersud', 'Heilsamer Sud', { special: 'healPct', value: 0.03, shape: 'potion' }),
      p('giftschrank', 'Giftschrank', { special: 'tickDamage', value: 0.1, mode: 'pct' }),
      p('versuchsreihe', 'Versuchsreihe', { stat: 'xpGain', pct: 0.05 }),
      p('goldkochen', 'Gold kochen', { stat: 'goldGain', pct: 0.05 }),
    ],
  },
  taschendieb: {
    id: 'taschendieb', classId: 'dieb', name: 'Taschendieb', line: 'Gefunden. Also, quasi.',
    signature: 'langefinger', abilities: ['langefinger', 'griffindietasche', 'muenzwurf', 'ablenkung'],
    passives: [
      p('tiefetaschen', 'Tiefe Taschen', { stat: 'goldGain', pct: 0.05 }),
      p('spuersinn', 'Spürsinn', { special: 'lootChance', value: 0.1 }),
      p('flinkefinger', 'Flinke Finger', { stat: 'critChance', flat: 0.02 }),
      p('langerarm', 'Langer Arm', { stat: 'pickupRadius', pct: 0.1 }),
    ],
  },
  schattenlaeufer: {
    id: 'schattenlaeufer', classId: 'dieb', name: 'Schattenläufer', line: 'Du hast mich nicht gesehen. Ich dich schon.',
    signature: 'hierwarniemand', abilities: ['hierwarniemand', 'dolchindenruecken', 'schattenschritt', 'rauchvorhang'],
    passives: [
      p('hinterhalt', 'Hinterhalt', { stat: 'critDamage', flat: 0.1 }),
      p('ausweichschritt', 'Ausweichschritt', { stat: 'dodge', flat: 0.02 }),
      p('langerschatten', 'Langer Schatten', { special: 'duration', value: 0.5, shape: 'stealth' }),
      p('leisesohlen', 'Leise Sohlen', { stat: 'moveSpeed', pct: 0.03 }),
    ],
  },
  fallensteller: {
    id: 'fallensteller', classId: 'dieb', name: 'Fallensteller', line: 'Pass auf, wo du hintrittst. Nein, nicht da.',
    signature: 'baerenfalle', abilities: ['baerenfalle', 'stolperdraht', 'kraehenfuesse', 'abindiegrube'],
    passives: [
      p('scharfezaehne', 'Scharfe Zähne', { special: 'damage', value: 0.15, mode: 'pct', shape: 'trap' }),
      p('mehrfallen', 'Noch eine Falle', { special: 'maxTraps', value: 1, shape: 'trap' }),
      p('weitesnetz', 'Weites Netz', { stat: 'area', pct: 0.05 }),
      p('dickesfell', 'Dickes Fell', { stat: 'armor', flat: 1 }),
    ],
  },
  zirkusdirektor: {
    id: 'zirkusdirektor', classId: 'hochstapler', name: 'Zirkusdirektor', line: 'Manege frei! Und Deckung!',
    signature: 'applaus', abilities: ['applaus', 'peitschenknall', 'jonglage', 'grossesfinale'],
    passives: [
      p('zugabe', 'Zugabe', { special: 'duration', value: 1, shape: ['buff', 'applause', 'rage'] }),
      p('manegenglanz', 'Manegenglanz', { stat: 'damage', pct: 0.04 }),
      p('zaehetruppe', 'Zähe Truppe', { stat: 'maxHp', pct: 0.04 }),
      p('schnellerumbau', 'Schneller Umbau', { stat: 'cooldown', pct: -0.04 }),
    ],
  },
  kletterkuenstler: {
    id: 'kletterkuenstler', classId: 'hochstapler', name: 'Kletterkünstler', line: 'Das Erdmännchen kann das allein. Behauptet es.',
    signature: 'erdmaennchen', abilities: ['erdmaennchen', 'nussgewitter', 'halsrutsche', 'familientreffen'],
    passives: [
      p('scharfekrallen', 'Scharfe Krallen', { special: 'damage', value: 0.15, mode: 'pct', shape: 'pet' }),
      p('ausdauer', 'Ausdauer', { special: 'duration', value: 2, shape: 'pet' }),
      p('kletterbeine', 'Kletterbeine', { stat: 'moveSpeed', pct: 0.03 }),
      p('langearme', 'Lange Arme', { stat: 'pickupRadius', pct: 0.1 }),
    ],
  },
  ausguck: {
    id: 'ausguck', classId: 'hochstapler', name: 'Ausguck', line: 'Ich seh was, was du nicht siehst. Und es ist böse.',
    signature: 'dadrueben', abilities: ['dadrueben', 'fernglaswurf', 'langerhals', 'steinschlag'],
    passives: [
      p('adlerauge', 'Adlerauge', { stat: 'critChance', flat: 0.02 }),
      p('fiesemarkierung', 'Fiese Markierung', { special: 'markPct', value: 0.05, shape: 'mark' }),
      p('weiterblick', 'Weiter Blick', { special: 'range', value: 0.1, mode: 'pct' }),
      p('fruehaufsteher', 'Frühaufsteher', { stat: 'xpGain', pct: 0.05 }),
    ],
  },
};

/**
 * Die drei Unterklassen einer Klasse.
 * @param {string} classId
 * @returns {SubclassDef[]}
 */
export function subclassesFor(classId) {
  return Object.values(SUBCLASSES).filter((s) => s.classId === classId);
}

/** Dauer-Bonus nach Kennung (über alle Unterklassen). */
export const PASSIVES = Object.fromEntries(Object.values(SUBCLASSES).flatMap((s) => s.passives.map((d) => [d.id, { ...d, subclass: s.id }])));
