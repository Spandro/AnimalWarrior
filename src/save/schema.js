import { ANIMALS } from '../data/animals.js';
import { CLASSES } from '../data/classes.js';
import { META } from '../data/meta.js';

/**
 * @typedef {{ bestTime: number, wins: number, runs: number }} SurvivorRecord
 * @typedef {{ id: string, name: string, animal: string, class: string, createdAt: number, survivor: SurvivorRecord }} Hero
 * @typedef {{ volume: number, quality: 'high' | 'low' }} Settings
 * @typedef {{ version: number, heroes: Hero[], gold: number, metaUpgrades: Record<string, number>, settings: Settings }} Save
 */

export const SAVE_VERSION = 1;
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
  };
}

/** Migrationsschritte: Version n → n + 1. Aktuell gibt es nur Version 1. */
const MIGRATIONS = {};

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
  return { ok: true };
}
