import { createRng } from './rng.js';
import { TERRAIN_CELL, MAX_OBSTACLES_PER_CELL, TREE_RADIUS, ROCK_RADIUS, TREE_SHARE } from '../data/terrain.js';

/** @typedef {{ x: number, z: number, radius: number, kind: 'tree'|'rock' }} Obstacle */

function cellSeed(seed, cx, cz) {
  let h = Math.imul(seed | 0, 0x9E3779B1) ^ Math.imul(cx | 0, 0x85EBCA6B) ^ Math.imul(cz | 0, 0xC2B2AE35);
  h ^= h >>> 16; h = Math.imul(h, 0x7FEB352D);
  h ^= h >>> 15; h = Math.imul(h, 0x846CA68B);
  h ^= h >>> 16;
  return h >>> 0;
}

const cellCache = new Map();
const CACHE_LIMIT = 4000;

/**
 * Hindernisse einer Zelle, deterministisch aus (seed, cx, cz). Zelle (0,0) ist leer.
 * @returns {Obstacle[]}
 */
export function obstaclesInCell(seed, cx, cz) {
  if (cx === 0 && cz === 0) return [];
  const k = seed + "," + cx + "," + cz;
  let hit = cellCache.get(k);
  if (!hit) {
    if (cellCache.size > CACHE_LIMIT) cellCache.clear();
    cellCache.set(k, hit = generateCell(seed, cx, cz));
  }
  return hit;
}

function generateCell(seed, cx, cz) {
  const rng = createRng(cellSeed(seed, cx, cz));
  const count = rng.int(0, MAX_OBSTACLES_PER_CELL);
  const out = [];
  for (let i = 0; i < count; i++) {
    const tree = rng.chance(TREE_SHARE);
    const r = tree ? TREE_RADIUS : ROCK_RADIUS;
    const radius = rng.range(r.min, r.max);
    out.push({
      x: (cx + rng.range(0.05, 0.95)) * TERRAIN_CELL,
      z: (cz + rng.range(0.05, 0.95)) * TERRAIN_CELL,
      radius,
      kind: tree ? 'tree' : 'rock',
    });
  }
  return out;
}

/**
 * Hindernisse, deren Kreis den Kreis um (x,z) mit Radius `range` berührt.
 * @returns {Obstacle[]}
 */
export function obstaclesNear(seed, x, z, range) {
  const pad = Math.max(ROCK_RADIUS.max, TREE_RADIUS.max);
  const x0 = Math.floor((x - range - pad) / TERRAIN_CELL), x1 = Math.floor((x + range + pad) / TERRAIN_CELL);
  const z0 = Math.floor((z - range - pad) / TERRAIN_CELL), z1 = Math.floor((z + range + pad) / TERRAIN_CELL);
  const out = [];
  for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
    for (const o of obstaclesInCell(seed, cx, cz)) {
      const dx = o.x - x, dz = o.z - z, rr = range + o.radius;
      if (dx * dx + dz * dz <= rr * rr) out.push(o);
    }
  }
  return out;
}
