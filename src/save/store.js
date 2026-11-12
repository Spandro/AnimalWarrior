import { ANIMALS } from '../data/animals.js';
import { CLASSES } from '../data/classes.js';
import { RUN_DURATION } from '../data/waves.js';
import {
  SAVE_VERSION, STORAGE_KEY, BACKUP_KEY, MAX_HEROES, MAX_NAME_LENGTH,
  defaultSave, migrate, validate,
} from './schema.js';

export { SAVE_VERSION, STORAGE_KEY, BACKUP_KEY, MAX_HEROES, defaultSave, migrate, validate };

/**
 * @typedef {import('./schema.js').Save} Save
 * @typedef {import('./schema.js').Hero} Hero
 * @typedef {{ getItem(key: string): string | null, setItem(key: string, value: string): void, removeItem(key: string): void }} StorageLike
 * @typedef {'ok' | 'empty' | 'corrupt' | 'newer' | 'unavailable'} LoadStatus
 */

const isNewer = (parsed) =>
  parsed !== null && typeof parsed === 'object' && Number.isInteger(parsed.version) && parsed.version > SAVE_VERSION;

/**
 * Speicher für den Spielstand über ein injiziertes Storage-Objekt.
 * @param {StorageLike} storage
 */
export function createStore(storage) {
  /** @returns {{ data: Save, status: LoadStatus }} */
  function read() {
    let raw;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch (e) {
      return { data: defaultSave(), status: 'unavailable' };
    }
    if (raw === null || raw === undefined) return { data: defaultSave(), status: 'empty' };
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      return corrupt(raw);
    }
    if (isNewer(parsed)) return { data: defaultSave(), status: 'newer' };
    try {
      const data = migrate(parsed);
      if (!validate(data).ok) return corrupt(raw);
      return { data, status: 'ok' };
    } catch (e) {
      return corrupt(raw);
    }
  }

  /**
   * Sichert den kaputten Rohinhalt einmal unter BACKUP_KEY. Schlägt das fehl, wird
   * backupFailed gesetzt: dann darf der kaputte Inhalt nicht überschrieben werden.
   */
  function corrupt(raw) {
    let backupFailed = false;
    try {
      if (storage.getItem(BACKUP_KEY) !== raw) storage.setItem(BACKUP_KEY, raw);
    } catch (e) {
      backupFailed = true;
    }
    return { data: defaultSave(), status: 'corrupt', backupFailed };
  }

  /** @returns {{ data: Save, status: LoadStatus }} */
  function load() {
    const { data, status } = read();
    return { data, status };
  }

  function write(data) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  return {
    load,

    /**
     * Lädt frisch, wendet den Mutator an, prüft und schreibt.
     * @param {(save: Save) => void} mutator
     * @returns {{ data: Save, saved: boolean }}
     */
    update(mutator) {
      const current = read();
      if (current.status === 'newer' || current.status === 'unavailable' || current.backupFailed) {
        return { data: current.data, saved: false };
      }
      const data = current.data;
      mutator(data);
      const check = validate(data);
      if (!check.ok) throw new Error(`Ungültiger Spielstand: ${check.error}`);
      return { data, saved: write(data) };
    },

    exportJson() {
      return JSON.stringify(read().data, null, 2);
    },

    /**
     * @param {string} text
     * @returns {{ ok: boolean, data?: Save, error?: string }}
     */
    importJson(text) {
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        return { ok: false, error: 'Die Datei enthält kein gültiges JSON.' };
      }
      if (isNewer(parsed)) return { ok: false, error: 'Der Spielstand stammt aus einer neueren Spielversion.' };
      let data;
      try {
        data = migrate(parsed);
      } catch (e) {
        return { ok: false, error: 'Der Spielstand hat eine unbekannte Version.' };
      }
      const check = validate(data);
      if (!check.ok) return { ok: false, error: `Der Spielstand ist ungültig: ${check.error}.` };
      if (read().backupFailed) {
        return { ok: false, error: 'Der vorhandene beschädigte Spielstand konnte nicht gesichert werden und bleibt deshalb erhalten.' };
      }
      if (!write(data)) return { ok: false, error: 'Der Spielstand konnte nicht gespeichert werden.' };
      return { ok: true, data };
    },
  };
}

/**
 * Trimmt den Namen, kürzt auf 16 Zeichen; leer → "Held n".
 * @param {string} raw
 * @param {number} index
 */
export function normalizeHeroName(raw, index) {
  const name = String(raw ?? '').trim().slice(0, MAX_NAME_LENGTH).trim();
  return name === '' ? `Held ${index + 1}` : name;
}

/**
 * Fügt einen Helden hinzu; null bei vollen Heldenplätzen. Zeit und Id kommen vom Aufrufer.
 * @param {Save} save
 * @param {{ name: string, animal: string, class: string }} spec
 * @param {{ now: number, id: string }} ctx
 * @returns {Hero | null}
 */
export function addHero(save, spec, { now, id }) {
  if (!Object.hasOwn(ANIMALS, spec.animal)) throw new Error(`Unbekanntes Tier: ${spec.animal}`);
  if (!Object.hasOwn(CLASSES, spec.class)) throw new Error(`Unbekannte Klasse: ${spec.class}`);
  if (save.heroes.length >= MAX_HEROES) return null;
  if (typeof id !== 'string' || id === '' || save.heroes.some((h) => h.id === id)) throw new Error('Ungültige Helden-Id');
  /** @type {Hero} */
  const hero = {
    id,
    name: normalizeHeroName(spec.name, save.heroes.length),
    animal: spec.animal,
    class: spec.class,
    createdAt: now,
    survivor: { bestTime: 0, wins: 0, runs: 0 },
  };
  save.heroes.push(hero);
  return hero;
}

/**
 * @param {Save} save
 * @param {string} id
 * @returns {boolean} ob ein Held entfernt wurde
 */
export function deleteHero(save, id) {
  const i = save.heroes.findIndex((h) => h.id === id);
  if (i < 0) return false;
  save.heroes.splice(i, 1);
  return true;
}

/**
 * Verbucht einen Durchlauf (Form von getSummary) auf Gold und Heldenstatistik.
 * @param {Save} save
 * @param {string} heroId
 * @param {{ won: boolean, time: number, gold: number }} summary
 */
export function recordRun(save, heroId, summary) {
  const hero = save.heroes.find((h) => h.id === heroId);
  if (!hero) throw new Error(`Unbekannter Held: ${heroId}`);
  save.gold += Math.floor(summary.gold);
  hero.survivor.runs++;
  if (summary.won) hero.survivor.wins++;
  hero.survivor.bestTime = Math.max(hero.survivor.bestTime, Math.min(summary.time, RUN_DURATION));
}
