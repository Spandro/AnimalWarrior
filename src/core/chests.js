import { createRng } from './rng.js';
import { obstaclesNear } from './terrain.js';
import { TERRAIN_CELL } from '../data/terrain.js';
import { MAP_CHESTS } from '../data/chests.js';

/** @typedef {{ id: string, x: number, z: number, kind: 'gold'|'heal'|'upgrade', gold: number }} Chest */

/** Eigener Zufallsstrom je Zelle, unabhängig von dem der Hindernisse (andere Konstanten). */
function chestSeed(seed, cx, cz) {
  let h = Math.imul(seed | 0, 0x2545F491) ^ Math.imul(cx | 0, 0x68E31DA4) ^ Math.imul(cz | 0, 0xB5297A4D);
  h ^= h >>> 15; h = Math.imul(h, 0x2C1B3C6D);
  h ^= h >>> 12; h = Math.imul(h, 0x297A2D39);
  h ^= h >>> 15;
  return h >>> 0;
}

const cache = new Map();
const CACHE_LIMIT = 4000;

/**
 * Die Kiste einer Gelände-Zelle oder null; fest aus (seed, cx, cz), unabhängig von der Besuchsreihenfolge
 * und von `world.rng`. Keine Kiste im Startbereich und keine, deren Kreis ein Hindernis berührt.
 * @param {number} seed
 * @param {number} cx
 * @param {number} cz
 * @returns {Chest|null}
 */
export function chestInCell(seed, cx, cz) {
  const key = seed + ',' + cx + ',' + cz;
  let hit = cache.get(key);
  if (hit === undefined) {
    if (cache.size > CACHE_LIMIT) cache.clear();
    cache.set(key, hit = generate(seed, cx, cz));
  }
  return hit;
}

function generate(seed, cx, cz) {
  const rng = createRng(chestSeed(seed, cx, cz));
  if (!rng.chance(MAP_CHESTS.chancePerCell)) return null;
  const x = (cx + rng.range(0.1, 0.9)) * TERRAIN_CELL;
  const z = (cz + rng.range(0.1, 0.9)) * TERRAIN_CELL;
  const total = MAP_CHESTS.table.reduce((s, t) => s + t.weight, 0);
  let r = rng.next() * total;
  let entry = MAP_CHESTS.table[MAP_CHESTS.table.length - 1];
  for (const t of MAP_CHESTS.table) { r -= t.weight; if (r < 0) { entry = t; break; } }
  const gold = entry.gold ? rng.int(entry.gold[0], entry.gold[1]) : 0;
  if (Math.hypot(x, z) < MAP_CHESTS.clearRadius) return null;
  if (obstaclesNear(seed, x, z, MAP_CHESTS.radius).length > 0) return null;
  return { id: cx + ':' + cz, x, z, kind: entry.kind, gold };
}

/**
 * Alle Kisten, deren Mitte höchstens `range` von (x, z) entfernt ist.
 * @param {number} seed
 * @param {number} x
 * @param {number} z
 * @param {number} range
 * @returns {Chest[]}
 */
export function chestsNear(seed, x, z, range) {
  const x0 = Math.floor((x - range) / TERRAIN_CELL), x1 = Math.floor((x + range) / TERRAIN_CELL);
  const z0 = Math.floor((z - range) / TERRAIN_CELL), z1 = Math.floor((z + range) / TERRAIN_CELL);
  const out = [];
  for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
    const c = chestInCell(seed, cx, cz);
    if (c && (c.x - x) ** 2 + (c.z - z) ** 2 <= range * range) out.push(c);
  }
  return out;
}

/**
 * Die nächste noch nicht geöffnete Kiste innerhalb von `range` um den Helden, sonst null.
 * @param {import('./world.js').World} world
 * @param {number} range
 * @returns {Chest|null}
 */
export function nearestUnopenedChest(world, range) {
  const { x, z } = world.hero;
  let best = null, bestD = Infinity;
  for (const c of chestsNear(world.seed, x, z, range)) {
    if (world.openedChests.has(c.id)) continue;
    const d = (c.x - x) ** 2 + (c.z - z) ** 2;
    if (d < bestD) { best = c; bestD = d; }
  }
  return best;
}
