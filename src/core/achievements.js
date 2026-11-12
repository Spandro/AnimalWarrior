import { ACHIEVEMENTS } from '../data/achievements.js';

/**
 * Reine Logik der Erfolge, ohne Anzeige.
 * @typedef {import('../data/achievements.js').AchievementContext} AchievementContext
 * @typedef {import('../data/achievements.js').LifetimeStats} LifetimeStats
 * @typedef {import('../data/achievements.js').RunFacts} RunFacts
 */

/**
 * Ids der Erfolge, deren Bedingung jetzt erfüllt ist und die noch nicht freigeschaltet sind, in Datenreihenfolge.
 * @param {AchievementContext} ctx
 * @param {Set<string>} alreadyUnlocked
 * @returns {string[]}
 */
export function evaluateAchievements(ctx, alreadyUnlocked) {
  return ACHIEVEMENTS.filter((a) => !alreadyUnlocked.has(a.id) && a.check(ctx)).map((a) => a.id);
}

function addCounts(target, source) {
  for (const [key, n] of Object.entries(source)) target[key] = (target[key] || 0) + n;
}

/**
 * Addiert die Zahlen eines beendeten Durchgangs auf die lebenslangen Zähler (mutiert und gibt `stats` zurück).
 * @param {LifetimeStats} stats
 * @param {RunFacts} facts
 * @returns {LifetimeStats}
 */
export function applyRunToStats(stats, facts) {
  addCounts(stats.kills, facts.killsByType);
  stats.runs++;
  if (facts.won) {
    stats.wins++;
    stats.winsByAnimal[facts.animalId] = (stats.winsByAnimal[facts.animalId] || 0) + 1;
  }
  stats.shadowsRouted += facts.shadowsRouted;
  return stats;
}

/**
 * Zähler für die Prüfung mitten im Durchgang: gespeicherte Zahlen plus Tötungen und vertriebene Schatten
 * des laufenden Durchgangs. Durchgänge und Siege zählen erst nach dem Ende. Verändert `stats` nicht.
 * @param {LifetimeStats} stats
 * @param {RunFacts} facts
 * @returns {LifetimeStats}
 */
export function liveStats(stats, facts) {
  const copy = structuredClone(stats);
  addCounts(copy.kills, facts.killsByType);
  copy.shadowsRouted += facts.shadowsRouted;
  return copy;
}

/**
 * Schaltet Erfolge frei: trägt nicht vorhandene Ids mit Zeitpunkt ein und bucht ihr Gold auf den Spielstand.
 * Bereits freigeschaltete und unbekannte Ids ändern nichts.
 * @param {{ gold: number, achievements: Record<string, number> }} save
 * @param {string[]} ids
 * @param {number} nowMs
 * @returns {{ gold: number }} das gebuchte Gold
 */
export function unlock(save, ids, nowMs) {
  let gold = 0;
  for (const id of ids) {
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (!def || Object.hasOwn(save.achievements, id)) continue;
    save.achievements[id] = nowMs;
    save.gold += def.gold;
    gold += def.gold;
  }
  return { gold };
}
