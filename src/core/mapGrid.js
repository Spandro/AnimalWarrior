import { createRng } from './rng.js';
import { MAP_CELL, GATE_HALF_WIDTH, EXPLORE_BLOCK, BORDER_DECOR } from '../data/adventure.js';

/**
 * Raster der begehbaren Fläche einer Abenteuer-Karte: für Kollision, Minikarte und Randdeko.
 * @typedef {import('./terrain.js').Obstacle} Obstacle
 * @typedef {{ points: [number, number][], width: number }} Strip Linienzug mit Breite
 * @typedef {{ id: string, bounds: { minX: number, maxX: number, minZ: number, maxZ: number }, paths: Strip[],
 *   clearings: { x: number, z: number, r: number }[], water: Strip[], bridges: Strip[], obstacles: Obstacle[],
 *   gates: { id: string, points: [number, number][] }[] }} MapShape  (Ausschnitt von MapDef, src/data/maps)
 * @typedef {{ cell: number, minX: number, minZ: number, cols: number, rows: number, cells: Uint8Array }} MapGrid
 * @typedef {'walk'|'fly'|'shot'} MoveMode  laufen; fliegen (nur innerhalb der Karte); Geschoss (über Wasser, nicht durch den Rand)
 */

/** Zellwerte. */
export const CELL = { blocked: 0, walk: 1, water: 2, bridge: 3 };

/** Abstand von (x,z) zur Strecke a–b. */
function segmentDistance(x, z, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
  return Math.hypot(x - (ax + t * dx), z - (az + t * dz));
}

function stripDistance(x, z, points) {
  let best = Infinity;
  for (let i = 0; i + 1 < points.length; i++) {
    const [ax, az] = points[i], [bx, bz] = points[i + 1];
    best = Math.min(best, segmentDistance(x, z, ax, az, bx, bz));
  }
  return points.length === 1 ? Math.hypot(x - points[0][0], z - points[0][1]) : best;
}

/** Setzt alle Zellen, deren Mitte `inside` erfüllt, im Begrenzungsrechteck auf `value`. */
function paint(grid, box, value, inside) {
  const c0 = Math.max(0, Math.floor((box.minX - grid.minX) / grid.cell));
  const c1 = Math.min(grid.cols - 1, Math.floor((box.maxX - grid.minX) / grid.cell));
  const r0 = Math.max(0, Math.floor((box.minZ - grid.minZ) / grid.cell));
  const r1 = Math.min(grid.rows - 1, Math.floor((box.maxZ - grid.minZ) / grid.cell));
  for (let r = r0; r <= r1; r++) {
    const z = grid.minZ + (r + 0.5) * grid.cell;
    for (let c = c0; c <= c1; c++) {
      if (inside(grid.minX + (c + 0.5) * grid.cell, z)) grid.cells[r * grid.cols + c] = value;
    }
  }
}

function stripBox(strip) {
  const half = strip.width / 2;
  const xs = strip.points.map((p) => p[0]), zs = strip.points.map((p) => p[1]);
  return { minX: Math.min(...xs) - half, maxX: Math.max(...xs) + half, minZ: Math.min(...zs) - half, maxZ: Math.max(...zs) + half };
}

function paintStrip(grid, strip, value) {
  paint(grid, stripBox(strip), value, (x, z) => stripDistance(x, z, strip.points) <= strip.width / 2);
}

/**
 * Raster aus der Kartenbeschreibung: erst Wege und Lichtungen, dann Wasser darüber, zuletzt Brücken.
 * @param {MapShape} map
 * @returns {MapGrid}
 */
export function buildMapGrid(map) {
  const { minX, maxX, minZ, maxZ } = map.bounds;
  const cell = MAP_CELL;
  const cols = Math.ceil((maxX - minX) / cell), rows = Math.ceil((maxZ - minZ) / cell);
  const grid = { cell, minX, minZ, cols, rows, cells: new Uint8Array(cols * rows) };
  for (const p of map.paths || []) paintStrip(grid, p, CELL.walk);
  for (const c of map.clearings || []) {
    paint(grid, { minX: c.x - c.r, maxX: c.x + c.r, minZ: c.z - c.r, maxZ: c.z + c.r }, CELL.walk,
      (x, z) => Math.hypot(x - c.x, z - c.z) <= c.r);
  }
  for (const w of map.water || []) paintStrip(grid, w, CELL.water);
  for (const b of map.bridges || []) paintStrip(grid, b, CELL.bridge);
  return grid;
}

/**
 * Zellwert an (x,z); außerhalb der Karte gesperrt.
 * @param {MapGrid} grid
 */
export function cellAt(grid, x, z) {
  const c = Math.floor((x - grid.minX) / grid.cell), r = Math.floor((z - grid.minZ) / grid.cell);
  if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows) return CELL.blocked;
  return grid.cells[r * grid.cols + c];
}

/**
 * Geländequelle einer Abenteuer-Karte für die Welt.
 * @param {MapShape} map
 * @param {MapGrid} grid
 * @param {(gateId: string) => boolean} isGateClosed
 * @returns {import('./terrain.js').Terrain}
 */
export function mapTerrain(map, grid, isGateClosed) {
  const obstacles = map.obstacles || [];
  const gates = map.gates || [];
  const inClosedGate = (x, z) => gates.some((g) => isGateClosed(g.id) && stripDistance(x, z, g.points) <= GATE_HALF_WIDTH);
  return {
    obstaclesNear(x, z, range) {
      return obstacles.filter((o) => {
        const rr = range + o.radius;
        return (o.x - x) ** 2 + (o.z - z) ** 2 <= rr * rr;
      });
    },
    walkable(x, z, mode = 'walk') {
      const c = cellAt(grid, x, z);
      if (mode === 'fly') {
        const col = Math.floor((x - grid.minX) / grid.cell), row = Math.floor((z - grid.minZ) / grid.cell);
        return col >= 0 && row >= 0 && col < grid.cols && row < grid.rows;
      }
      if (c === CELL.blocked) return false;
      if (mode === 'shot') return true;
      return c !== CELL.water && !inClosedGate(x, z);
    },
  };
}

/**
 * Feste Bäume und Felsen am Rand: auf gesperrten Zellen, die höchstens `BORDER_DECOR.reach` Zellen von begehbarer
 * Fläche entfernt sind. Nur Darstellung; die Kollision kommt aus dem Raster.
 * @param {MapGrid} grid
 * @param {number} seed
 * @returns {{ x: number, z: number, kind: 'tree'|'rock' }[]}
 */
export function borderDecor(grid, seed) {
  const rng = createRng(seed ^ 0x5eed);
  const { step, reach, chance, treeShare } = BORDER_DECOR;
  const out = [];
  const open = (c, r) => c >= 0 && r >= 0 && c < grid.cols && r < grid.rows && grid.cells[r * grid.cols + c] !== CELL.blocked;
  for (let r = 0; r < grid.rows; r += step) {
    for (let c = 0; c < grid.cols; c += step) {
      if (grid.cells[r * grid.cols + c] !== CELL.blocked) continue;
      let near = false;
      for (let dr = -reach; dr <= reach && !near; dr++) for (let dc = -reach; dc <= reach; dc++) if (open(c + dc, r + dr)) { near = true; break; }
      if (!near) continue;
      const roll = rng.next(), kind = rng.next() < treeShare ? 'tree' : 'rock';
      if (roll >= chance) continue;
      out.push({ x: grid.minX + (c + 0.5) * grid.cell, z: grid.minZ + (r + 0.5) * grid.cell, kind });
    }
  }
  return out;
}

// ---------------------------------------------------------------- Erkundung (Minikarte)

/** Blöcke der Erkundung in Spalten und Reihen. */
export function exploreSize(grid) {
  return { cols: Math.ceil((grid.cols * grid.cell) / EXPLORE_BLOCK), rows: Math.ceil((grid.rows * grid.cell) / EXPLORE_BLOCK) };
}

/** Leere Erkundung: ein Bit je Block. */
export function createExplored(grid) {
  const { cols, rows } = exploreSize(grid);
  return new Uint8Array(Math.ceil((cols * rows) / 8));
}

/** Ist der Block an (x,z) gesehen? */
export function isExplored(bits, grid, x, z) {
  const { cols, rows } = exploreSize(grid);
  const c = Math.floor((x - grid.minX) / EXPLORE_BLOCK), r = Math.floor((z - grid.minZ) / EXPLORE_BLOCK);
  if (c < 0 || r < 0 || c >= cols || r >= rows) return false;
  const i = r * cols + c;
  return (bits[i >> 3] & (1 << (i & 7))) !== 0;
}

/** Markiert alle Blöcke, deren Mitte näher als `radius` an (x,z) liegt. Liefert, ob sich etwas geändert hat. */
export function markExplored(bits, grid, x, z, radius) {
  const { cols, rows } = exploreSize(grid);
  let changed = false;
  const c0 = Math.max(0, Math.floor((x - radius - grid.minX) / EXPLORE_BLOCK)), c1 = Math.min(cols - 1, Math.floor((x + radius - grid.minX) / EXPLORE_BLOCK));
  const r0 = Math.max(0, Math.floor((z - radius - grid.minZ) / EXPLORE_BLOCK)), r1 = Math.min(rows - 1, Math.floor((z + radius - grid.minZ) / EXPLORE_BLOCK));
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
    const cx = grid.minX + (c + 0.5) * EXPLORE_BLOCK, cz = grid.minZ + (r + 0.5) * EXPLORE_BLOCK;
    if (Math.hypot(cx - x, cz - z) > radius) continue;
    const i = r * cols + c, mask = 1 << (i & 7);
    if (!(bits[i >> 3] & mask)) { bits[i >> 3] |= mask; changed = true; }
  }
  return changed;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Erkundung als Base64-Text für den Spielstand. */
export function encodeExplored(bits) {
  let out = '';
  for (let i = 0; i < bits.length; i += 3) {
    const n = (bits[i] << 16) | ((bits[i + 1] ?? 0) << 8) | (bits[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < bits.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < bits.length ? B64[n & 63] : '=');
  }
  return out;
}

/** Liest einen Erkundungstext; falsche Länge oder Zeichen ergeben eine leere Erkundung. */
export function decodeExplored(text, grid) {
  const empty = createExplored(grid);
  if (typeof text !== 'string' || text.length !== Math.ceil(empty.length / 3) * 4) return empty;
  const out = new Uint8Array(empty.length);
  for (let i = 0, o = 0; i < text.length; i += 4) {
    const v = [0, 1, 2, 3].map((k) => (text[i + k] === '=' ? 0 : B64.indexOf(text[i + k])));
    if (v.some((x) => x < 0)) return empty;
    const n = (v[0] << 18) | (v[1] << 12) | (v[2] << 6) | v[3];
    for (const b of [(n >> 16) & 255, (n >> 8) & 255, n & 255]) if (o < out.length) out[o++] = b;
  }
  return out;
}
