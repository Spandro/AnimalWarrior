import { MAX_ENEMIES } from './enemies.js';

export { MAX_ENEMIES };

/** Länge eines Laufs in Sekunden; dann erscheint der letzte Boss. */
export const RUN_DURATION = 900;

/** Minute, ab der ein Gegnertyp erscheint. */
export const unlockMinute = {
  ratte: 0, fuchs: 1, wildschwein: 2, igel: 3, kraehe: 4, dachs: 5, giftkroete: 6, kreuzotter: 7, uhu: 8, wolf: 9, luchs: 10,
};

/** Relative Häufigkeit der freigeschalteten Gegnertypen. */
export const weights = {
  ratte: 10, fuchs: 6, wildschwein: 3, igel: 3, kraehe: 4, dachs: 2, giftkroete: 2, kreuzotter: 3, uhu: 2, wolf: 3, luchs: 2,
};

/** Minute, ab der die Formeln nicht mehr steigen. */
export const MAX_FORMULA_MINUTE = 14;

/** @param {number} minute */
export const spawnPerSecond = (minute) => 1.5 + 0.9 * minute;
/** @param {number} minute */
export const hpMul = (minute) => 1 + 0.25 * minute;
/** @param {number} minute */
export const dmgMul = (minute) => 1 + 0.12 * minute;

/** Sekunden zwischen Elite-Gegnern (der erste bei 120 s). */
export const ELITE_INTERVAL = 120;
/** Zeitpunkte der drei Bosse. */
export const BOSS_TIMES = [300, 600, 900];
/** Lebensfaktor der Bosse je Auftritt (auf das Grundleben des jeweiligen Bosses). */
export const BOSS_HP_MUL = [1, 2.5, 5];
/** Bosse, aus denen jeder Durchgang drei verschiedene in zufälliger Reihenfolge zieht. */
export const BOSS_POOL = ['baer', 'hirsch', 'keiler', 'wisent'];
/** Wird mit dem Seed verknüpft: eigener Zufallsgeber für die Bossfolge, damit `world.rng` unberührt bleibt. */
export const BOSS_ORDER_SALT = 0x5b0551;
/** Gegner (außer Bossen) weiter als diese Strecke vom Helden werden auf den Erscheinungsring versetzt. */
export const LEASH_DISTANCE = 45;

/** Am Limit nicht gesetzte Gegner: je `batch` aufgestaute erscheint der nächste mit `hpMul`-fachem Leben. */
export const CAP_BACKLOG = { batch: 10, hpMul: 3 };
/** Wie oft ein Erscheinungswinkel neu gewürfelt wird, wenn er in einem Hindernis liegt. */
export const SPAWN_REROLLS = 5;
/** Größter Simulationsschritt in Sekunden; größere dt werden unterteilt. */
export const MAX_SUBSTEP = 1 / 30;

/** Wiederbelebung: Lebensanteil, Unverwundbarkeit (s), Radius und Strecke des Wegstoßens. */
export const REVIVE = { hpFraction: 0.5, invulnerable: 2, pushRadius: 6, pushDistance: 5 };

/** Sterbephase: Länge in realen Sekunden und Tempo der Welt (Zeitlupe) darin. */
export const DYING = { duration: 1.0, timeScale: 0.25 };

/** Sichtbereich, bis die Darstellung `setView` aufruft. */
export const DEFAULT_VIEW = { halfW: 20, halfH: 12 };

/**
 * Abstand vom Helden, in dem Gegner erscheinen: knapp außerhalb der sichtbaren Ecke.
 * @param {number} viewHalfW
 * @param {number} viewHalfH
 * @returns {number}
 */
export function spawnRadius(viewHalfW, viewHalfH) {
  return Math.hypot(viewHalfW, viewHalfH) + 3;
}

export const WAVES = {
  RUN_DURATION, MAX_ENEMIES, unlockMinute, weights, spawnPerSecond, hpMul, dmgMul,
  ELITE_INTERVAL, BOSS_TIMES, BOSS_HP_MUL, LEASH_DISTANCE,
};
