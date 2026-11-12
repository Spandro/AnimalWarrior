/**
 * @typedef {Object} Rng
 * @property {() => number} next      Zufallszahl in [0,1)
 * @property {(min:number, max:number) => number} range  Zahl in [min,max)
 * @property {(min:number, max:number) => number} int    Ganzzahl in [min,max], inklusiv
 * @property {(p:number) => boolean} chance  true mit Wahrscheinlichkeit p
 * @property {<T>(array:T[]) => T} pick      zufälliges Element
 */

/**
 * Deterministischer Zufallsgenerator (mulberry32).
 * @param {number} seed
 * @returns {Rng}
 */
export function createRng(seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (array) => array[Math.floor(next() * array.length)],
  };
}
