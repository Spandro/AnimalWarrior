// Bilder eines späteren Kapitels nachladen (Bögen aus `CHAPTER_SHEETS`, Kacheln aus `CHAPTER_TILES`): erst wenn der Held
// das Kapitel betritt oder das Kapitel davor abgeschlossen hat. Bis dahin und wenn ein Bild fehlt, bleibt es bei den
// Stellvertretern.
import { CHAPTER_SHEETS } from '../data/sprites.js';
import { CHAPTER_TILES } from '../data/environment.js';
import { addSheet, loadImage } from './sprites.js';
import { loadTrailTiles } from './environment.js';

/**
 * Kapitel, deren Bilder jetzt gebraucht werden: das der Karte, auf der der Held steht, und jedes, dessen Vorgänger
 * abgeschlossen ist (dorthin kann er als Nächstes gehen). Nur Kapitel mit eigenen Bildern.
 * @param {{ chapterDone: number[] }} record Fortschritt des Helden im Abenteuer
 * @param {{ chapter: number }} map Karte, auf der er steht
 * @returns {number[]} aufsteigend
 */
export function chaptersToLoad(record, map) {
  const wanted = new Set([map.chapter, ...record.chapterDone.map((c) => c + 1)]);
  return [...wanted].filter((c) => CHAPTER_SHEETS[c] || CHAPTER_TILES[c]).sort((a, b) => a - b);
}

/** Laufendes (Promise) oder fertiges (`'done'`) Laden je Kachel-Objekt und Kapitel, damit jedes Kapitel nur einmal geholt wird. */
const attempted = new WeakMap();

/**
 * Ist das Laden der Bilder des Kapitels für dieses `tiles`-Objekt abgeschlossen (geladen oder als fehlend vermerkt)?
 * @param {import('./environment.js').TrailTiles} tiles
 * @param {number} chapter
 */
export function chapterImagesDone(tiles, chapter) {
  return attempted.get(tiles)?.get(chapter) === 'done';
}

/**
 * Lädt die Bögen des Kapitels in dieselben `sprites` ({@link addSheet}) und seine Kacheln in dasselbe `tiles`-Objekt.
 * Wirft nie: Fehlt ein Bild, bleibt sein Eintrag leer (Bogen) bzw. `null` (Kachel).
 * @param {import('./sprites.js').SpriteSheets} sprites
 * @param {import('./environment.js').TrailTiles} tiles
 * @param {number} chapter
 * @param {{ load?: (url: string) => Promise<HTMLImageElement>, prepare?: Function }} [source] in Tests ersetzbar
 * @returns {Promise<void>}
 */
export function loadChapterImages(sprites, tiles, chapter, { load = loadImage, prepare } = {}) {
  let byChapter = attempted.get(tiles);
  if (!byChapter) { byChapter = new Map(); attempted.set(tiles, byChapter); }
  if (!byChapter.has(chapter)) {
    const sheets = (CHAPTER_SHEETS[chapter] ?? []).map((id) => addSheet(sprites, id, prepare ? { load, prepare } : { load }));
    const keys = CHAPTER_TILES[chapter] ?? [];
    const tileLoad = keys.length ? loadTrailTiles({ load, keys }).then((t) => { Object.assign(tiles, t); }) : Promise.resolve();
    byChapter.set(chapter, Promise.all([...sheets, tileLoad]).then(() => { byChapter.set(chapter, 'done'); }));
  }
  const state = byChapter.get(chapter);
  return state === 'done' ? Promise.resolve() : state;
}
