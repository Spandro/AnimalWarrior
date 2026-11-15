import { DORF } from './dorf.js';
import { KAPITEL1 } from './kapitel1.js';
import { KAPITEL2 } from './kapitel2.js';

/**
 * Kartenbeschreibungen des Abenteuers (Spec §6.1). Kennungen werden nie umbenannt oder gelöscht.
 * @typedef {[number, number]} Pt
 * @typedef {{ points: Pt[], width: number }} Strip
 * @typedef {{ id: string, name: string, chapter: number, bounds: { minX: number, maxX: number, minZ: number, maxZ: number },
 *   paths: Strip[], clearings: { x: number, z: number, r: number }[], water: Strip[], bridges: Strip[],
 *   mud?: Strip[], boardwalks?: Strip[],
 *   obstacles: import('../../core/terrain.js').Obstacle[],
 *   gates: { id: string, kind: 'arena'|'barrier', points: Pt[], opensOn?: { boss: string } | { quest: string, step: number } }[],
 *   areas: { id: string, name: string, x: number, z: number, r: number }[],
 *   campfires: { id: string, x: number, z: number }[], npcs: { id: string, x: number, z: number, faceX: number }[],
 *   spots: { id: string, kind: string, x: number, z: number }[],
 *   chests: { id: string, x: number, z: number, gold: number, item?: string, pearls?: number }[],
 *   packs: { id: string, x: number, z: number, level: number, enemies: Record<string, number>, elite?: string }[],
 *   bosses: { id: string, type: string, level: number, x: number, z: number, arena: { x: number, z: number, r: number }, gate: string,
 *     bubbleArena?: boolean }[],
 *   exits: { id: string, x: number, z: number, r: number, to: { map: string, campfire: string }, requires?: { chapterDone: number } }[],
 *   props: { kind: string, x: number, z: number, faceX?: number }[], start: { campfire: string },
 *   hazards?: { bubbles?: { level: number } } }} MapDef
 *   Der erste Eintrag in `paths` ist der Hauptweg. Tore: `arena` schließt sich im Bosskampf, `barrier` ist zu, bis
 *   `opensOn` erfüllt ist. Ein Ausgang mit `requires` ist erst offen (sichtbar und benutzbar), wenn das Kapitel abgeschlossen ist. Ein Gebiet ist das kleinste, dessen Kreis den Helden enthält. `hazards.bubbles`: Moorblasen auf
 *   dem Schlamm dieser Karte, Gegner-Schaden nach Stufe `level`; `bubbleArena`: Moorblasen auch in dieser Bossarena.
 */

/** @type {Record<'dorf'|'kapitel1'|'kapitel2', MapDef>} */
export const MAPS = { dorf: DORF, kapitel1: KAPITEL1, kapitel2: KAPITEL2 };
