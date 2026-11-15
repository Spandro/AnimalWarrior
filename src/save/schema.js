import { ANIMALS } from '../data/animals.js';
import { META } from '../data/meta.js';
import { ENEMIES } from '../data/enemies.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { ITEMS } from '../data/items.js';
import { UNLOCKS } from '../data/tavern.js';
import { MATERIALS } from '../data/adventure.js';
import { isValidPair, animalUnlocked } from '../core/roster.js';

/**
 * @typedef {{ bestTime: number, wins: number, runs: number }} SurvivorRecord
 * @typedef {{ id: string, name: string, animal: string, class: string, createdAt: number, survivor: SurvivorRecord,
 *   adventure: import('./adventure.js').AdventureRecord | null }} Hero
 * @typedef {{ volume: number, quality: 'high' | 'low', buttonSide: 'left' | 'right' }} Settings
 * @typedef {import('../data/achievements.js').LifetimeStats} LifetimeStats
 * @typedef {{ version: number, heroes: Hero[], gold: number, metaUpgrades: Record<string, number>, settings: Settings,
 *   achievements: Record<string, number>, stats: LifetimeStats, inventory: string[], seenItems: string[], unlocks: string[],
 *   itemLevels: Record<string, number>, materials: Record<string, number> }} Save
 *   `achievements`: Erfolgs-Id → Zeitpunkt der Freischaltung (ms); `stats`: lebenslange Zähler für alle Helden;
 *   `inventory`: Kennungen der gefundenen Gegenstände (jede höchstens einmal); `seenItems`: davon in der Truhe schon
 *   angesehene; `unlocks`: Freischaltungen des Spielstands (z. B. 'duo'); `itemLevels`: Verbesserungsstufe beim Schmied
 *   (fehlt = 0); `materials`: Material für den Schmied. Der Abenteuer-Teil wird vor der Prüfung ausgebessert
 *   (`repairSave` in src/save/adventure.js).
 */

export const SAVE_VERSION = 6;
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
    settings: { volume: 70, quality: 'high', buttonSide: 'right' },
    achievements: {},
    stats: { kills: {}, runs: 0, wins: 0, winsByAnimal: {}, shadowsRouted: 0, tavernRounds: 0, hiLoBestStreak: 0, campfireRests: 0, bubbleKills: 0 },
    inventory: [],
    seenItems: [],
    unlocks: [],
    itemLevels: {},
    materials: {},
  };
}

const countOf = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);

/**
 * Migrationsschritte: Version n → n + 1; sie ändern ihre Eingabe nicht.
 * 1 → 2: Erfolge und lebenslange Zähler; Durchgänge, Siege und Siege je Tier stammen aus den Helden, der Rest beginnt bei null.
 * 2 → 3: Taverne – leere Truhe und Freischaltungen, Zähler für Runden und Trefferserie bei null; alles andere bleibt.
 * 3 → 4: Abenteuer – kein Held hat ein Abenteuer, keine Verbesserungen, kein Material, Knöpfe rechts, Rastzähler null.
 * 4 → 5: Unterklassen – jedes vorhandene Abenteuer bekommt `subclass: null` und `passives: {}`; Stammstufen bleiben.
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
  2: (data) => ({
    ...data,
    version: 3,
    stats: { ...data.stats, tavernRounds: 0, hiLoBestStreak: 0 },
    inventory: [],
    seenItems: [],
    unlocks: [],
  }),
  3: (data) => ({
    ...data,
    version: 4,
    heroes: Array.isArray(data.heroes) ? data.heroes.map((h) => (h && typeof h === 'object' ? { ...h, adventure: null } : h)) : data.heroes,
    settings: data.settings && typeof data.settings === 'object' ? { ...data.settings, buttonSide: 'right' } : data.settings,
    stats: { ...data.stats, campfireRests: 0 },
    itemLevels: {},
    materials: {},
  }),
  4: (data) => ({
    ...data,
    version: 5,
    heroes: Array.isArray(data.heroes)
      ? data.heroes.map((h) => (h && typeof h === 'object' && h.adventure && typeof h.adventure === 'object'
        ? { ...h, adventure: { ...h.adventure, subclass: null, passives: {} } } : h))
      : data.heroes,
  }),
  // Etappe 3, Kapitel 3: Zustand der Schleusen je Held (leer = Ausgangszustand der Karte) und Zähler für „Blubb“.
  5: (data) => ({
    ...data,
    version: 6,
    heroes: Array.isArray(data.heroes)
      ? data.heroes.map((h) => (h && typeof h === 'object' && h.adventure && typeof h.adventure === 'object'
        ? { ...h, adventure: { ...h.adventure, switches: {} } } : h))
      : data.heroes,
    stats: { ...data.stats, bubbleKills: 0 },
  }),
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

/** Liste bekannter, nicht doppelter Kennungen. */
const isIdList = (list, known) =>
  Array.isArray(list) && new Set(list).size === list.length && list.every((id) => typeof id === 'string' && known(id));

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
  if (!isIdList(data.inventory, (id) => Object.hasOwn(ITEMS, id))) return fail('Ungültige Truhe');
  if (!isIdList(data.seenItems, (id) => data.inventory.includes(id))) return fail('Ungültige angesehene Gegenstände');
  if (!isIdList(data.unlocks, (id) => UNLOCKS.includes(id))) return fail('Ungültige Freischaltungen');
  const ids = new Set();
  for (const h of data.heroes) {
    if (!isObject(h)) return fail('Ungültiger Held');
    if (typeof h.id !== 'string' || h.id === '' || ids.has(h.id)) return fail('Ungültige Helden-Id');
    ids.add(h.id);
    if (typeof h.name !== 'string' || h.name.length < 1 || h.name.length > MAX_NAME_LENGTH) return fail('Ungültiger Heldenname');
    if (!isValidPair(h.animal, h.class)) return fail('Ungültige Kombination aus Tier und Klasse');
    if (!animalUnlocked(data, h.animal)) return fail('Tier nicht freigeschaltet');
    if (typeof h.createdAt !== 'number' || !Number.isFinite(h.createdAt)) return fail('Ungültiges Erstellungsdatum');
    const s = h.survivor;
    if (!isObject(s) || !isNonNegNumber(s.bestTime) || !isNonNegNumber(s.wins) || !isNonNegNumber(s.runs)) {
      return fail('Ungültige Heldenwerte');
    }
    if (h.adventure != null && !isObject(h.adventure)) return fail('Ungültiges Abenteuer');
    if (h.adventure) {
      const eq = Object.values(h.adventure.equipment || {});
      if (eq.some((id) => id !== null && !data.inventory.includes(id))) return fail('Angelegter Gegenstand fehlt in der Truhe');
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
  if (st.buttonSide !== 'left' && st.buttonSide !== 'right') return fail('Ungültige Knopfseite');
  if (!isObject(data.itemLevels)) return fail('Verbesserungen fehlen');
  for (const [id, l] of Object.entries(data.itemLevels)) {
    if (!data.inventory.includes(id) || !Number.isInteger(l) || l < 1 || l > 5) return fail('Ungültige Verbesserung');
  }
  if (!isObject(data.materials)) return fail('Material fehlt');
  for (const [id, n] of Object.entries(data.materials)) if (!Object.hasOwn(MATERIALS, id) || !Number.isInteger(n) || n < 0) return fail('Ungültiges Material');
  if (!isObject(data.achievements)) return fail('Erfolge fehlen');
  for (const [id, at] of Object.entries(data.achievements)) {
    if (!ACHIEVEMENTS.some((a) => a.id === id)) return fail('Unbekannter Erfolg');
    if (!isNonNegNumber(at)) return fail('Ungültiger Freischaltzeitpunkt');
  }
  const stats = data.stats;
  if (!isObject(stats)) return fail('Statistik fehlt');
  for (const key of ['runs', 'wins', 'shadowsRouted', 'tavernRounds', 'hiLoBestStreak', 'campfireRests', 'bubbleKills']) {
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
