/**
 * @typedef {{ x: number, z: number, radius: number }} Circle
 */

/**
 * Einfaches Raster-Hash für Kreise.
 * @param {number} cellSize
 */
export function createGrid(cellSize) {
  /** @type {Map<string, Circle[]>} */
  const cells = new Map();
  const key = (cx, cz) => cx + ',' + cz;
  return {
    clear() { cells.clear(); },
    /** @param {Circle} e */
    insert(e) {
      const x0 = Math.floor((e.x - e.radius) / cellSize), x1 = Math.floor((e.x + e.radius) / cellSize);
      const z0 = Math.floor((e.z - e.radius) / cellSize), z1 = Math.floor((e.z + e.radius) / cellSize);
      for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
        const k = key(cx, cz);
        let list = cells.get(k);
        if (!list) cells.set(k, list = []);
        list.push(e);
      }
    },
    /** Alle Kreise, die den Kreis (x,z,r) überlappen. */
    queryCircle(x, z, r) {
      const out = new Set();
      const x0 = Math.floor((x - r) / cellSize), x1 = Math.floor((x + r) / cellSize);
      const z0 = Math.floor((z - r) / cellSize), z1 = Math.floor((z + r) / cellSize);
      for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
        const list = cells.get(key(cx, cz));
        if (!list) continue;
        for (const e of list) {
          if (out.has(e)) continue;
          const dx = e.x - x, dz = e.z - z, rr = e.radius + r;
          if (dx * dx + dz * dz <= rr * rr) out.add(e);
        }
      }
      return [...out];
    },
  };
}
