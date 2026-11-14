import { ITEMS, RARITIES } from '../data/items.js';
import { TAVERN, DICE, WHEEL, HILO } from '../data/tavern.js';

/**
 * Beutewurf: erst die Seltenheit nach Gewicht, dann gleichverteilt ein Gegenstand
 * dieser Seltenheit in der Reihenfolge von ITEMS.
 * @param {import('./rng.js').Rng} rng
 * @returns {string} Kennung des Gegenstands
 */
export function rollItem(rng) {
  const rarities = Object.entries(RARITIES);
  const total = rarities.reduce((sum, [, r]) => sum + r.weight, 0);
  let roll = rng.next() * total;
  let rarity = rarities[rarities.length - 1][0];
  for (const [key, r] of rarities) {
    if (roll < r.weight) {
      rarity = key;
      break;
    }
    roll -= r.weight;
  }
  const pool = Object.values(ITEMS).filter((item) => item.rarity === rarity);
  return rng.pick(pool).id;
}

/** Beute gibt es nur ab dieser Einsatzhöhe. */
const lootAllowed = (stake) => stake >= TAVERN.lootMinStake;

/**
 * Würfelbecher: Spieler und Wirt würfeln je zwei Würfel, die höhere Summe gewinnt.
 * Ein Sechserpasch des Spielers bringt ab 100 Gold Einsatz einen Gegenstand, unabhängig vom Ausgang.
 * @param {import('./rng.js').Rng} rng
 * @param {number} stake
 * @returns {{ player: [number, number], host: [number, number], outcome: 'win'|'tie'|'lose', payout: number, loot: string|null }}
 */
export function playDice(rng, stake) {
  const player = /** @type {[number, number]} */ ([rng.int(1, 6), rng.int(1, 6)]);
  const host = /** @type {[number, number]} */ ([rng.int(1, 6), rng.int(1, 6)]);
  const p = player[0] + player[1];
  const h = host[0] + host[1];
  const outcome = p > h ? 'win' : p < h ? 'lose' : 'tie';
  const payout = outcome === 'win' ? stake * DICE.winMul : outcome === 'tie' ? Math.floor(stake * DICE.tieMul) : 0;
  const loot = player[0] === 6 && player[1] === 6 && lootAllowed(stake) ? rollItem(rng) : null;
  return { player, host, outcome, payout, loot };
}

/**
 * Glücksrad: ein Feld von 20, Auszahlung Einsatz × Faktor. Das Beutefeld gibt ab 100 Gold Einsatz einen Gegenstand
 * statt Gold, darunter den Einsatz zurück.
 * @param {import('./rng.js').Rng} rng
 * @param {number} stake
 * @returns {{ index: number, payout: number, loot: string|null }}
 */
export function spinWheel(rng, stake) {
  const index = rng.int(0, WHEEL.fields.length - 1);
  const field = WHEEL.fields[index];
  if (field.kind === 'niete') return { index, payout: 0, loot: null };
  if (field.kind === 'mult') return { index, payout: stake * field.mul, loot: null };
  if (lootAllowed(stake)) return { index, payout: 0, loot: rollItem(rng) };
  return { index, payout: stake, loot: null };
}

/** Anzahl der Werte, die echt höher (`up`) bzw. tiefer (`down`) als die Karte sind. */
function winningRanks(card, dir) {
  return HILO.ranks.filter((r) => (dir === 'up' ? r > card : r < card)).length;
}

/**
 * Faktor eines Tipps: Zielauszahlung ÷ Gewinnchance, auf eine Nachkommastelle abgerundet. Gleicher Wert ist
 * unentschieden, darum zählt die Chance nur unter den 12 Werten, die entscheiden. Nie unter 1 (ein Treffer lässt den
 * Topf nie schrumpfen), 0 ohne Gewinnchance.
 * @param {number} card
 * @param {'up'|'down'} dir
 * @returns {number}
 */
export function hiLoFactor(card, dir) {
  const n = winningRanks(card, dir);
  if (n === 0) return 0;
  // rtp ÷ (n/12) in Zehnteln; das Epsilon fängt Gleitkommafehler knapp unter einer ganzen Zahl ab.
  return Math.max(1, Math.floor(((HILO.rtp * (HILO.ranks.length - 1)) / n) * 10 + 1e-9) / 10);
}

/**
 * @typedef {{ stake: number, pot: number, card: number, hits: number, done: boolean, result: null|'miss'|'joker'|'cashout'|'max' }} HiLoState
 */

/**
 * Startet eine Runde Höher oder tiefer. Die Startkarte ist nie ein Joker, der Topf ist der Einsatz.
 * @param {import('./rng.js').Rng} rng
 * @param {number} stake
 * @returns {HiLoState}
 */
export function hiLoStart(rng, stake) {
  const card = rng.int(HILO.ranks[0], HILO.ranks[HILO.ranks.length - 1]);
  return { stake, pot: stake, card, hits: 0, done: false, result: null };
}

/**
 * Ein Tipp. Erst der Joker-Wurf, dann der Kartenwert. Gleicher Wert ist unentschieden: Topf und Treffer bleiben, die
 * Runde läuft weiter. Ein Fehltipp setzt den Topf auf 0. Ein Treffer rundet den Topf ab; fünf Treffer oder 50 × Einsatz beenden die Runde mit `max` (Topf gedeckelt). Der Joker beendet die Runde
 * mit unverändertem Topf, zählt nicht als Treffer und bringt ab 100 Gold Einsatz einen Gegenstand.
 * @param {HiLoState} state
 * @param {'up'|'down'} dir
 * @param {import('./rng.js').Rng} rng
 * @returns {{ state: HiLoState, drawn: number|'joker', loot: string|null }}
 */
export function hiLoGuess(state, dir, rng) {
  if (state.done) throw new Error('Die Runde ist schon beendet.');
  const factor = hiLoFactor(state.card, dir);
  if (factor === 0) throw new Error('Dieser Tipp kann nicht gewinnen.');
  if (rng.chance(HILO.jokerChance)) {
    const loot = lootAllowed(state.stake) ? rollItem(rng) : null;
    return { state: { ...state, done: true, result: 'joker' }, drawn: 'joker', loot };
  }
  const drawn = rng.int(HILO.ranks[0], HILO.ranks[HILO.ranks.length - 1]);
  if (drawn === state.card) return { state: { ...state }, drawn, loot: null };
  const won = dir === 'up' ? drawn > state.card : drawn < state.card;
  if (!won) return { state: { ...state, pot: 0, card: drawn, done: true, result: 'miss' }, drawn, loot: null };
  const hits = state.hits + 1;
  // Ganzzahlig rechnen: Faktor in Zehnteln, damit kein Gleitkommafehler knapp unter eine ganze Zahl fällt.
  let pot = Math.floor((state.pot * Math.round(factor * 10)) / 10);
  const cap = state.stake * HILO.potCapMul;
  const max = hits >= HILO.maxHits || pot >= cap;
  if (pot > cap) pot = cap;
  return { state: { ...state, pot, card: drawn, hits, done: max, result: max ? 'max' : null }, drawn, loot: null };
}

/**
 * Zahlt den Topf aus. Erst nach mindestens einem Treffer möglich.
 * @param {HiLoState} state
 * @returns {HiLoState}
 */
export function hiLoCashOut(state) {
  if (state.done) throw new Error('Die Runde ist schon beendet.');
  if (state.hits === 0) throw new Error('Auszahlen geht erst nach dem ersten Treffer.');
  return { ...state, done: true, result: 'cashout' };
}

/** Mittlere Auszahlung des Würfelbechers je Gold Einsatz (ohne Beute), exakt über alle 36 × 36 Ausgänge. */
export function diceReturn() {
  const counts = new Array(13).fill(0);
  for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) counts[a + b]++;
  let win = 0;
  let tie = 0;
  for (let p = 2; p <= 12; p++) {
    for (let h = 2; h <= 12; h++) {
      const ways = counts[p] * counts[h];
      if (p > h) win += ways;
      else if (p === h) tie += ways;
    }
  }
  return (win * DICE.winMul + tie * DICE.tieMul) / (36 * 36);
}

/**
 * Mittlere Auszahlung des Glücksrads je Gold Einsatz (ohne Beute); das Beutefeld zahlt unter 100 den Einsatz zurück.
 * @param {number} stake
 */
export function wheelReturn(stake) {
  const total = WHEEL.fields.reduce((sum, f) => {
    if (f.kind === 'mult') return sum + f.mul;
    if (f.kind === 'loot' && !lootAllowed(stake)) return sum + 1;
    return sum;
  }, 0);
  return total / WHEEL.fields.length;
}

/**
 * Mittlere Auszahlung eines Tipps je Gold Topf, mit Joker, bis er entschieden ist: Ein Unentschieden wiederholt den
 * Tipp, also (0,98 × p × Faktor + 0,02) ÷ (1 − 0,98 × 1/13). Ohne Gewinnchance 0.
 * @param {number} card
 * @param {'up'|'down'} dir
 */
export function hiLoStepReturn(card, dir) {
  const p = winningRanks(card, dir) / HILO.ranks.length;
  if (p === 0) return 0;
  const keep = 1 - HILO.jokerChance;
  return (keep * p * hiLoFactor(card, dir) + HILO.jokerChance) / (1 - keep / HILO.ranks.length);
}
