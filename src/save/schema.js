import { ANIMALS } from '../data/animals.js';
import { CLASSES } from '../data/classes.js';
import { META } from '../data/meta.js';
import { ENEMIES } from '../data/enemies.js';
import { ACHIEVEMENTS } from '../data/achievements.js';

/**
 * @typedef {{ bestTime: number, wins: number, runs: number }} SurvivorRecord
 * @typedef {{ id: string, name: string, animal: string, class: string, createdAt: number, survivor: SurvivorRecord }} Hero
 * @typedef {{ volume: number, quality: 'high' | 'low' }} Settings
 * @typedef {import('../data/achievements.js').LifetimeStats} LifetimeStats
 * @typedef {{ version: number, heroes: Hero[], gold: number, metaUpgrades: Record<string, number>, settings: Settings,
 *   achievements: Record<string, number>, stats: LifetimeStats }} Save
 *   `achievements`: Erfolgs-Id → Zeitpunkt der Freischaltung (ms); `stats`: lebenslange Zähler für alle Helden.
 */

export const SAVE_VERSION = 2;
export const STORAGE_KEY = 'animalwarrior.save';
export const BACKUP_KEY = 'animalwarrior.save.corrupt';
export const MAX_HEROES = 6;
export const MAX_NAME_LENGTH = 16;

/** @returns {Save} */
export function defaultSave() {
  return {
    version: SAVE_VERSION,
    heroes: [],
    gold: 0,
    metaUpgrades: {},
    settings: { volume: 70, quality: 'high' },
    achievements: {},
    stats: { kills: {}, runs: 0, wins: 0, winsByAnimal: {}, shadowsRouted: 0 },
  };
}

const countOf = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);

/**
 * Migrationsschritte: Version n → n + 1; sie ändern ihre Eingabe nicht.
 * 1 → 2: Erfolge und lebenslange Zähler; Durchgänge, Siege und Siege je Tier stammen aus den Helden, der Rest beginnt bei null.
 */
const MIGRATIONS = {
  1: (data) => {
    const heroes = Array.isArray(data.heroes) ? data.heroes : [];
    const total = (key) => heroes.reduce((sum, h) => sum + countOf(h?.survivor?.[key]), 0);
    const winsByAnimal = {};
    for (const h of heroes) {
      const wins = h?.survivor?.wins;
      if (Object.hasOwn(ANIMALS, h?.animal) && Number.isInteger(wins) && wins > 0) {
        winsByAnimal[h.animal] = (winsByAnimal[h.animal] || 0) + wins;
      }
    }
    return {
      ...data,
      version: 2,
      achievements: {},
      stats: { kills: {}, runs: total('runs'), wins: total('wins'), winsByAnimal, shadowsRouted: 0 },
    };
  },
};

/**
 * Hebt Daten schrittweise auf die aktuelle Version. Wirft bei unbrauchbarer Version.
 * @param {any} data
 * @returns {Save}
 */
export function migrate(data) {
  if (!data || typeof data !== 'object' || !Number.isInteger(data.version) || data.version < 1) {
    throw new Error('Ungültige Version');
  }
  if (data.version > SAVE_VERSION) throw new Error('Spielstand ist neuer als dieses Spiel');
  let current = data;
  while (current.version < SAVE_VERSION) {
    const step = MIGRATIONS[current.version];
    if (!step) throw new Error('Keine Migration verfügbar');
    current = step(current);
  }
  return current;
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNonNegNumber = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;

/**
 * @param {any} data
 * @returns {{ ok: boolean, error?: string }}
 */
export function validate(data) {
  const fail = (error) => ({ ok: false, error });
  if (!isObject(data)) return fail('Spielstand ist kein Objekt');
  if (data.version !== SAVE_VERSION) return fail('Falsche Version');
  if (!Array.isArray(data.heroes)) return fail('Helden fehlen');
  if (data.heroes.length > MAX_HEROES) return fail('Zu viele Helden');
  const ids = new Set();
  for (const h of data.heroes) {
    if (!isObject(h)) return fail('Ungültiger Held');
    if (typeof h.id !== 'string' || h.id === '' || ids.has(h.id)) return fail('Ungültige Helden-Id');
    ids.add(h.id);
    if (typeof h.name !== 'string' || h.name.length < 1 || h.name.length > MAX_NAME_LENGTH) return fail('Ungültiger Heldenname');
    if (!Object.hasOwn(ANIMALS, h.animal)) return fail('Unbekanntes Tier');
    if (!Object.hasOwn(CLASSES, h.class)) return fail('Unbekannte Klasse');
    if (typeof h.createdAt !== 'number' || !Number.isFinite(h.createdAt)) return fail('Ungültiges Erstellungsdatum');
    const s = h.survivor;
    if (!isObject(s) || !isNonNegNumber(s.bestTime) || !isNonNegNumber(s.wins) || !isNonNegNumber(s.runs)) {
      return fail('Ungültige Heldenwerte');
    }
  }
  if (!Number.isInteger(data.gold) || data.gold < 0) return fail('Ungültiges Gold');
  if (!isObject(data.metaUpgrades)) return fail('Dauerboni fehlen');
  for (const [id, level] of Object.entries(data.metaUpgrades)) {
    const def = Object.hasOwn(META, id) ? META[id] : null;
    if (!def) return fail('Unbekannter Dauerbonus');
    if (!Number.isInteger(level) || level < 0 || level > def.maxLevel) return fail('Ungültige Bonusstufe');
  }
  const st = data.settings;
  if (!isObject(st)) return fail('Einstellungen fehlen');
  if (!Number.isInteger(st.volume) || st.volume < 0 || st.volume > 100) return fail('Ungültige Lautstärke');
  if (st.quality !== 'high' && st.quality !== 'low') return fail('Ungültige Qualität');
  if (!isObject(data.achievements)) return fail('Erfolge fehlen');
  for (const [id, at] of Object.entries(data.achievements)) {
    if (!ACHIEVEMENTS.some((a) => a.id === id)) return fail('Unbekannter Erfolg');
    if (!isNonNegNumber(at)) return fail('Ungültiger Freischaltzeitpunkt');
  }
  const stats = data.stats;
  if (!isObject(stats)) return fail('Statistik fehlt');
  for (const key of ['runs', 'wins', 'shadowsRouted']) {
    if (!Number.isInteger(stats[key]) || stats[key] < 0) return fail('Ungültiger Zähler');
  }
  for (const [field, known] of [['kills', ENEMIES], ['winsByAnimal', ANIMALS]]) {
    if (!isObject(stats[field])) return fail('Statistik fehlt');
    for (const [key, n] of Object.entries(stats[field])) {
      if (!Object.hasOwn(known, key)) return fail('Unbekannter Eintrag in der Statistik');
      if (!Number.isInteger(n) || n < 0) return fail('Ungültiger Zähler');
    }
  }
  return { ok: true };
}
