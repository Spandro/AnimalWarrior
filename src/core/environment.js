// Rechnungen der gemalten Umgebung: welches Bild ein Hindernis bekommt, wo Deko steht und wann ein
// Baum den Helden verdeckt. Alles rein und ohne Browser, damit es sich prüfen lässt.
import { createRng } from './rng.js';
import { obstaclesNear } from './terrain.js';
import { TERRAIN_CELL } from '../data/terrain.js';
import { OBSTACLE_LOOK, DECO } from '../data/environment.js';

/** Deterministischer Hash eines Gitterpunkts nach [0,1). */
function hash2(seed, x, z) {
  let h = Math.imul(seed | 0, 0x27d4eb2d) ^ Math.imul(x | 0, 0x85ebca6b) ^ Math.imul(z | 0, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12; h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/**
 * Bild eines Hindernisses: Bäume wechseln fest nach ihrer Position zwischen den drei Baumarten,
 * Felsen nach ihrem Radius. Dieselbe Position ergibt immer dasselbe Bild.
 * @param {import('./terrain.js').Obstacle} obstacle
 * @returns {string} Schlüssel in ENV_SPRITES
 */
export function obstacleSprite(obstacle) {
  if (obstacle.kind !== 'tree') return obstacle.radius >= OBSTACLE_LOOK.bigRockRadius ? 'fels-gross' : 'fels-klein';
  const h = hash2(0x5eed, Math.round(obstacle.x * 100), Math.round(obstacle.z * 100));
  return OBSTACLE_LOOK.trees[Math.floor(h * OBSTACLE_LOOK.trees.length) % OBSTACLE_LOOK.trees.length];
}

/**
 * Kulisse eines Randbaums oder -felsens auf einer Karte mit eigenen Kulissen (`MAP_SCENERY`): Ein Anteil `share` wird
 * zu einem Bild aus `tree` bzw. `rock`, fest nach der Position gewählt; der Rest bleibt Baum oder Fels (`null`).
 * @param {{ x: number, z: number, kind: 'tree'|'rock' }} decor
 * @param {{ share: number, tree: string[], rock: string[] }} scenery
 * @returns {{ id: string, mirror: boolean } | null} Schlüssel in `SWAMP_SPRITES`, gespiegelt
 */
export function borderScenery(decor, scenery) {
  const x = Math.round(decor.x * 100), z = Math.round(decor.z * 100);
  if (hash2(0x5ce7e, x, z) >= scenery.share) return null;
  const list = scenery[decor.kind];
  const h = hash2(0x5ce7f, x, z);
  return { id: list[Math.floor(h * list.length) % list.length], mirror: hash2(0x5ce80, x, z) < 0.5 };
}

/** Eigener Zufallsstrom der Deko, damit er den Hindernissen nicht in die Quere kommt. */
function decoSeed(seed, cx, cz) {
  let h = Math.imul(seed | 0, 0x1b873593) ^ Math.imul(cx | 0, 0xcc9e2d51) ^ Math.imul(cz | 0, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return h >>> 0;
}

const DECO_KINDS = Object.keys(DECO.kinds);
const DECO_WEIGHT_SUM = Object.values(DECO.kinds).reduce((a, b) => a + b, 0);

/** Art nach Gewicht aus DECO.kinds. */
function pickKind(rng) {
  let r = rng.next() * DECO_WEIGHT_SUM;
  for (const id of DECO_KINDS) {
    r -= DECO.kinds[id];
    if (r < 0) return id;
  }
  return DECO_KINDS[DECO_KINDS.length - 1];
}

/**
 * Deko einer Geländezelle, deterministisch aus (seed, cx, cz). Nichts steht in einem Hindernis,
 * nichts im freien Startbereich um den Ursprung.
 * @param {number} seed Geländestartwert
 * @param {number} cx @param {number} cz Zellkoordinaten
 * @returns {{ id: string, x: number, z: number, mirror: boolean }[]}
 */
export function decoInCell(seed, cx, cz) {
  const rng = createRng(decoSeed(seed, cx, cz));
  const [min, max] = DECO.perCell;
  const count = rng.int(min, max);
  const out = [];
  for (let i = 0; i < count; i++) {
    const x = (cx + rng.range(0.05, 0.95)) * TERRAIN_CELL;
    const z = (cz + rng.range(0.05, 0.95)) * TERRAIN_CELL;
    const id = pickKind(rng);
    const mirror = rng.chance(0.5);
    if (Math.hypot(x, z) < DECO.startClear) continue;
    if (obstaclesNear(seed, x, z, 0).length > 0) continue;
    out.push({ id, x, z, mirror });
  }
  return out;
}

/**
 * Verdeckt ein Baumbild den Helden? Nur, wenn der Baum näher an der Kamera steht als der Held und
 * dessen Punkt im Bildrechteck des Baumes liegt.
 * @param {{ x: number, y: number, w: number, h: number }} treeRect Bildschirmrechteck des Baumes
 * @param {{ x: number, y: number }} heroPoint Punkt des Helden auf dem Bildschirm
 * @param {boolean} treeIsNearerToCamera
 * @returns {boolean}
 */
export function occludesHero(treeRect, heroPoint, treeIsNearerToCamera) {
  if (!treeIsNearerToCamera) return false;
  return heroPoint.x >= treeRect.x && heroPoint.x <= treeRect.x + treeRect.w
    && heroPoint.y >= treeRect.y && heroPoint.y <= treeRect.y + treeRect.h;
}
