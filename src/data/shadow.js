// Dein Schatten: ein unbesiegbarer Zwischenboss, der aussieht und kämpft wie der eigene Held.

/**
 * @typedef {{ chaseTime: number, triggerRange: number, reach: number, halfAngle: number, windup: number,
 *   damageMul: number, recover: number }} ShadowMelee
 *   krieger: verfolgt `chaseTime` s; steht der Held dann höchstens `triggerRange` jenseits des Schattenrands,
 *   folgt ein Hieb mit Vorwarnung (Bogen mit Reichweite `reach` ab dem Rand, halber Öffnungswinkel `halfAngle`,
 *   Schaden × `damageMul` nach `windup` s), dann `recover` s Pause. Sonst verfolgt er weiter.
 * @typedef {{ minRange: number, maxRange: number, fireRange: number, fireInterval: number, count: number,
 *   spreadDeg: number, projectileSpeed: number, projectileLife: number, projectileRadius: number, damageMul: number }} ShadowRanged
 *   magier: hält `minRange`–`maxRange` Abstand und feuert alle `fireInterval` s eine Salve aus `count`
 *   Geschossen (Fächer über `spreadDeg` Grad), wenn der Held höchstens `fireRange` entfernt ist.
 * @typedef {{ radius: number, engageRange: number, lungeInterval: number, lungeDuration: number, lungeSpeedMul: number,
 *   count: number, spreadDeg: number, projectileSpeed: number, projectileLife: number, projectileRadius: number,
 *   damageMul: number }} ShadowSkirmish
 *   dieb: verfolgt bis `engageRange`, umkreist in `radius` Abstand, stößt alle `lungeInterval` s für
 *   `lungeDuration` s mit `lungeSpeedMul`-fachem Tempo vor und wirft am Ende des Vorstoßes `count` Dolche.
 */

export const SHADOW = {
  /** Erscheinungszeitpunkte (s); je Besuch ein Eintrag in `hpMulPerVisit`. */
  times: [210, 480, 750],
  /** So lange bleibt er (s), dann löst er sich ohne Belohnung auf. */
  duration: 45,
  baseHp: 250,
  hpPerLevel: 30,
  hpMulPerVisit: [1, 1.8, 3],
  /** Grundschaden; × dmgMul(Minute) wie bei den Wellen. Berührung macht vollen Schaden. */
  baseDamage: 10,
  /** Tempo relativ zum aktuellen Lauftempo des Helden. */
  speedFactor: 0.9,
  radius: 0.5,
  /** Flucht bei 1 Leben: so lange (s) und so schnell (× Lauftempo des Helden) läuft er weg. */
  fleeDuration: 1.5,
  fleeSpeedFactor: 1.6,
  /** @type {ShadowMelee} */
  krieger: { chaseTime: 1.5, triggerRange: 1.5, reach: 2.2, halfAngle: Math.PI / 3, windup: 0.6, damageMul: 1.5, recover: 0.6 },
  /** @type {ShadowRanged} */
  magier: {
    minRange: 6, maxRange: 9, fireRange: 13, fireInterval: 2.4, count: 3, spreadDeg: 24,
    projectileSpeed: 9, projectileLife: 2.5, projectileRadius: 0.3, damageMul: 0.8,
  },
  /** @type {ShadowSkirmish} */
  dieb: {
    radius: 5, engageRange: 7, lungeInterval: 2.6, lungeDuration: 0.45, lungeSpeedMul: 2.6,
    count: 2, spreadDeg: 16, projectileSpeed: 11, projectileLife: 2, projectileRadius: 0.25, damageMul: 0.7,
  },
};

/** Sprüche des Schattens, je Anlass einer per world.rng. */
export const SHADOW_LINES = {
  appear: ['Na, schon wieder ich.', 'Du siehst aus wie ich. Nur schlechter.', 'Ich hab dich vermisst. Also mich.'],
  flee: ['Das zählt nicht!', 'Ich lass dich nur gewinnen.', 'Autsch. Das merke ich mir.'],
  timeout: ['Wir sehen uns. Wortwörtlich.', 'Mir ist langweilig. Tschüss.', 'Bis gleich, Spiegelbild.'],
};

/**
 * Lebenspunkte des Schattens beim Besuch `visit` (0, 1, 2) auf Laufstufe `level`.
 * @param {number} level
 * @param {number} visit
 */
export function shadowMaxHp(level, visit) {
  return (SHADOW.baseHp + SHADOW.hpPerLevel * level) * SHADOW.hpMulPerVisit[visit];
}
