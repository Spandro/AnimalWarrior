import { test, assertEqual, assertClose, assertTrue, assertThrows } from './runner.js';
import { createRng } from '../src/core/rng.js';
import { ITEMS, RARITIES } from '../src/data/items.js';
import { TAVERN, DICE, WHEEL, HILO, HOSTS, TABLE_HOST } from '../src/data/tavern.js';
import {
  playDice, spinWheel, hiLoFactor, hiLoStart, hiLoGuess, hiLoCashOut,
  diceReturn, wheelReturn, hiLoStepReturn,
} from '../src/core/tavern.js';

/** Rng mit festen Werten für `next`, damit einzelne Ausgänge gezielt entstehen. */
function scripted(values) {
  let i = 0;
  const next = () => values[Math.min(i++, values.length - 1)];
  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (p) => next() < p,
    pick: (array) => array[Math.floor(next() * array.length)],
  };
}

test('tavern: Daten – Einsätze, Rad-Felder, Wirte', () => {
  assertEqual(TAVERN, {
    stakes: [10, 50, 100, 500], lootMinStake: 100, duoPrice: 20000,
    brokeLine: 'Ohne Gold kein Spiel. Verdien dir erst ein paar Münzen im Wellen-Modus, ab {min} Gold bist du dabei.',
  });
  assertEqual(DICE, { winMul: 2, tieMul: 0.5 });
  assertEqual(WHEEL.fields.length, 20);
  assertEqual(HILO.ranks, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  assertEqual(HILO.rankLabels, { 11: 'B', 12: 'D', 13: 'K', 14: 'A' });
  assertEqual(HOSTS.affe.name, 'Kasimir');
  assertEqual(HOSTS.elster.name, 'Madame Funkel');
  assertEqual(TABLE_HOST, { dice: 'affe', wheel: 'elster', hilo: 'affe' });
  for (const lines of [HOSTS.affe.lines.dice, HOSTS.affe.lines.hilo, HOSTS.elster.lines.wheel]) {
    assertTrue(lines.length >= 6 && lines.length <= 8);
    for (const l of lines) assertTrue(typeof l === 'string' && l.length > 0);
  }
});

test('tavern: Würfel-Quote', () => {
  assertClose(diceReturn(), 0.944, 0.001);
  // Gleichstand bei 10 zahlt 5: erster Fund über viele Startwerte
  let tie = null;
  for (let seed = 1; seed < 500 && !tie; seed++) {
    const r = playDice(createRng(seed), 10);
    if (r.outcome === 'tie') tie = r;
  }
  assertTrue(tie !== null, 'Gleichstand gefunden');
  assertEqual(tie.payout, 5);
  assertEqual(tie.player[0] + tie.player[1], tie.host[0] + tie.host[1]);
});

test('tavern: Würfel – Gewinn, Niederlage, Sechserpasch', () => {
  for (let seed = 1; seed < 300; seed++) {
    const r = playDice(createRng(seed), 50);
    const p = r.player[0] + r.player[1];
    const h = r.host[0] + r.host[1];
    for (const d of [...r.player, ...r.host]) assertTrue(d >= 1 && d <= 6 && Number.isInteger(d));
    if (p > h) { assertEqual(r.outcome, 'win'); assertEqual(r.payout, 100); }
    else if (p < h) { assertEqual(r.outcome, 'lose'); assertEqual(r.payout, 0); }
    else { assertEqual(r.outcome, 'tie'); assertEqual(r.payout, 25); }
  }
  // Sechserpasch: Spieler 6,6, Wirt 1,1; Beute ab 100, auch bei Gewinn
  const r = playDice(scripted([0.99, 0.99, 0.0, 0.0, 0.5]), 100);
  assertEqual(r.player, [6, 6]);
  assertEqual(r.host, [1, 1]);
  assertEqual(r.outcome, 'win');
  assertEqual(r.payout, 200);
  assertTrue(r.loot in ITEMS);
  const low = playDice(scripted([0.99, 0.99, 0.0, 0.0, 0.5]), 50);
  assertEqual(low.loot, null);
});

test('tavern: Rad hat 20 Felder in der Verteilung der Spec', () => {
  const f = WHEEL.fields;
  assertEqual(f.filter((x) => x.kind === 'niete').length, 10);
  assertEqual(f.filter((x) => x.kind === 'loot').length, 1);
  const mults = f.filter((x) => x.kind === 'mult').map((x) => x.mul).sort((a, b) => a - b);
  assertEqual(mults, [1, 1, 1, 1, 2, 2, 2, 3, 5]);
  // Nieten nicht in einem Block: nie drei Nieten hintereinander (zyklisch)
  for (let i = 0; i < 20; i++) {
    assertTrue(!(f[i].kind === 'niete' && f[(i + 1) % 20].kind === 'niete' && f[(i + 2) % 20].kind === 'niete'));
  }
  assertClose(wheelReturn(100), 0.9, 1e-12);
  assertClose(wheelReturn(500), 0.9, 1e-12);
  assertClose(wheelReturn(50), 0.95, 1e-12);
  assertClose(wheelReturn(10), 0.95, 1e-12);
});

test('tavern: Rad zahlt Einsatz mal Faktor, Beutefeld je nach Einsatz', () => {
  const seen = new Set();
  for (let seed = 1; seed < 600; seed++) {
    const r = spinWheel(createRng(seed), 50);
    const field = WHEEL.fields[r.index];
    seen.add(r.index);
    assertEqual(r.loot, null);
    if (field.kind === 'niete') assertEqual(r.payout, 0);
    else if (field.kind === 'mult') assertEqual(r.payout, 50 * field.mul);
    else assertEqual(r.payout, 50);
  }
  assertEqual(seen.size, 20);
  const lootIndex = WHEEL.fields.findIndex((x) => x.kind === 'loot');
  const r = spinWheel(scripted([(lootIndex + 0.5) / 20, 0.5, 0.5]), 100);
  assertEqual(r.index, lootIndex);
  assertEqual(r.payout, 0);
  assertTrue(r.loot in ITEMS);
});

test('tavern: Faktoren', () => {
  assertEqual(hiLoFactor(8, 'up'), 2.0);
  assertEqual(hiLoFactor(8, 'down'), 2.0);
  assertEqual(hiLoFactor(4, 'up'), 1.2);
  assertEqual(hiLoFactor(4, 'down'), 6.0);
  assertEqual(hiLoFactor(14, 'up'), 0);
  assertEqual(hiLoFactor(2, 'down'), 0);
  assertEqual(hiLoFactor(2, 'up'), 1.0);
  assertEqual(hiLoStepReturn(14, 'up'), 0);
});

test('tavern: Höher oder tiefer – für jede Karte liegt die bessere Wahl zwischen 0,88 und 0,95, keine Wahl über 0,95', () => {
  for (const card of HILO.ranks) {
    const rets = ['up', 'down'].map((dir) => {
      const n = dir === 'up' ? 14 - card : card - 2;
      return (n / 13) * hiLoFactor(card, dir);
    });
    const best = Math.max(...rets);
    assertTrue(best >= 0.88 && best <= 0.95, `Karte ${card}: ${best}`);
    for (const r of rets) assertTrue(r <= 0.95, `Karte ${card}: ${r}`);
    for (const dir of ['up', 'down']) {
      assertTrue(hiLoStepReturn(card, dir) < 0.97, `Joker Karte ${card} ${dir}`);
    }
  }
});

/** Mittlerer Gegenwert einer Beute, wenn jeder Fund ein Doppelter ist: 0,7 · 10 + 0,25 · 30 + 0,05 · 100. */
function resalePerLoot() {
  const all = Object.values(RARITIES);
  const weight = all.reduce((sum, r) => sum + r.weight, 0);
  return all.reduce((sum, r) => sum + (r.weight / weight) * r.resale, 0);
}

/** Rng, dessen `int`-Würfe der Reihe nach `ints` liefern (danach den letzten); übrige Würfe wie `scripted`. */
function ints(values) {
  let i = 0;
  return { ...scripted([0.5]), int: () => values[Math.min(i++, values.length - 1)] };
}

test('tavern: mit dem Gegenwert der Doppelten bleibt jede Runde unter 97 %', () => {
  const resale = resalePerLoot();
  assertClose(resale, 19.5, 1e-12);
  // Würfelbecher: Beute gibt es genau bei einem von 36 Würfen des Spielers (Sechserpasch).
  for (const stake of [100, 500]) {
    let loot = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (playDice(ints([a, b, 1, 1]), stake).loot) loot++;
    assertEqual(loot, 1, `Würfel ${stake}`);
    const total = diceReturn() + (loot / 36) * resale / stake;
    assertClose(total, { 100: 0.9490895061728395, 500: 0.9447561728395062 }[stake], 1e-12);
    assertTrue(total < 0.97, `Würfel ${stake}: ${total}`);
  }
  // Glücksrad: ein Beutefeld von 20.
  for (const stake of [100, 500]) {
    let loot = 0;
    for (let i = 0; i < WHEEL.fields.length; i++) if (spinWheel(ints([i]), stake).loot) loot++;
    assertEqual(loot, 1, `Rad ${stake}`);
    const total = wheelReturn(stake) + (loot / WHEEL.fields.length) * resale / stake;
    assertClose(total, { 100: 0.90975, 500: 0.90195 }[stake], 1e-12);
    assertTrue(total < 0.97, `Rad ${stake}: ${total}`);
  }
  // Höher oder tiefer: der Joker bringt die Beute. Der Topf ist nie kleiner als der Einsatz (Faktoren ≥ 1),
  // also ist der Gegenwert beim kleinsten Einsatz mit Beute am größten.
  for (const card of HILO.ranks) {
    for (const dir of ['up', 'down']) {
      if (hiLoFactor(card, dir) === 0) continue;
      assertTrue(hiLoFactor(card, dir) >= 1, `Faktor Karte ${card} ${dir}`);
      const total = hiLoStepReturn(card, dir) + HILO.jokerChance * resale / TAVERN.lootMinStake;
      assertTrue(total < 0.97, `Karte ${card} ${dir}: ${total}`);
    }
  }
  assertClose(hiLoStepReturn(8, 'up') + HILO.jokerChance * resale / TAVERN.lootMinStake, 0.98 * (6 / 13) * 2.0 + 0.02 + 0.0039, 1e-12);
});

test('tavern: Beute nur ab 100', () => {
  let dice100 = false;
  let wheel100 = false;
  for (let seed = 1; seed < 3000; seed++) {
    assertEqual(playDice(createRng(seed), 50).loot, null);
    assertEqual(spinWheel(createRng(seed), 50).loot, null);
    if (playDice(createRng(seed), 100).loot) dice100 = true;
    if (spinWheel(createRng(seed), 100).loot) wheel100 = true;
  }
  assertTrue(dice100, 'Würfel-Beute bei 100');
  assertTrue(wheel100, 'Rad-Beute bei 100');
});

test('tavern: gleicher Startwert gleiches Ergebnis', () => {
  assertEqual(playDice(createRng(42), 100), playDice(createRng(42), 100));
  assertEqual(spinWheel(createRng(42), 100), spinWheel(createRng(42), 100));
  const a = createRng(42);
  const b = createRng(42);
  const sa = hiLoStart(a, 100);
  const sb = hiLoStart(b, 100);
  assertEqual(sa, sb);
  const dir = hiLoFactor(sa.card, 'up') >= hiLoFactor(sa.card, 'down') ? 'up' : 'down';
  assertEqual(hiLoGuess(sa, dir, a), hiLoGuess(sb, dir, b));
});

test('tavern: hiLoGuess – Treffer rundet ab, fünf Treffer, Deckelung, Fehler', () => {
  // Start: Karte 8, Einsatz 10; Tipp höher, kein Joker, Karte 14 -> Treffer ×2,0
  const start = hiLoStart(scripted([6 / 13 + 0.01]), 10);
  assertEqual(start, { stake: 10, pot: 10, card: 8, hits: 0, done: false, result: null });
  const hit = hiLoGuess(start, 'up', scripted([0.5, 12 / 13 + 0.01]));
  assertEqual(hit.drawn, 14);
  assertEqual(hit.state, { stake: 10, pot: 20, card: 14, hits: 1, done: false, result: null });
  assertEqual(start.pot, 10); // kein Mutieren
  // Abrunden: Topf 15 × 1,2 = 18
  const s4 = { stake: 10, pot: 15, card: 4, hits: 1, done: false, result: null };
  const r4 = hiLoGuess(s4, 'up', scripted([0.5, 8 / 13 + 0.01])); // Karte 10
  assertEqual(r4.state.pot, 18);
  assertEqual(r4.state.card, 10);
  // Topf 7 × 1,7 (Karte 7 hoch) = 11,9 -> 11
  const s7 = { stake: 10, pot: 7, card: 7, hits: 1, done: false, result: null };
  assertEqual(hiLoGuess(s7, 'up', scripted([0.5, 12 / 13 + 0.01])).state.pot, 11);
  // Fünf Treffer -> max
  const four = { stake: 10, pot: 10, card: 2, hits: 4, done: false, result: null };
  const fifth = hiLoGuess(four, 'up', scripted([0.5, 12 / 13 + 0.01]));
  assertEqual(fifth.state.hits, 5);
  assertEqual(fifth.state.done, true);
  assertEqual(fifth.state.result, 'max');
  // Deckelung bei 50 × Einsatz
  const big = { stake: 10, pot: 400, card: 4, hits: 2, done: false, result: null };
  const capped = hiLoGuess(big, 'down', scripted([0.5, 0.0])); // Karte 2: ×6,0 -> 2400 -> 500
  assertEqual(capped.state.pot, 500);
  assertEqual(capped.state.done, true);
  assertEqual(capped.state.result, 'max');
  assertEqual(capped.state.hits, 3);
  // Fehltipp, auch bei gleichem Wert
  const miss = hiLoGuess(s7, 'up', scripted([0.5, 5 / 13 + 0.01])); // Karte 7 = gleich
  assertEqual(miss.drawn, 7);
  assertEqual(miss.state.done, true);
  assertEqual(miss.state.result, 'miss');
  assertEqual(miss.state.pot, 0);
  assertEqual(miss.state.hits, 1);
  const lower = hiLoGuess(s7, 'up', scripted([0.5, 0.0])); // Karte 2
  assertEqual(lower.state.result, 'miss');
});

test('tavern: hiLoGuess – Ausnahmen', () => {
  const done = { stake: 10, pot: 20, card: 5, hits: 1, done: true, result: 'cashout' };
  assertThrows(() => hiLoGuess(done, 'up', createRng(1)));
  const ace = { stake: 10, pot: 10, card: 14, hits: 0, done: false, result: null };
  assertThrows(() => hiLoGuess(ace, 'up', createRng(1)));
  const two = { stake: 10, pot: 10, card: 2, hits: 0, done: false, result: null };
  assertThrows(() => hiLoGuess(two, 'down', createRng(1)));
  assertThrows(() => hiLoCashOut(two));
  assertThrows(() => hiLoCashOut({ ...two, hits: 1, done: true }));
  const out = hiLoCashOut({ ...two, hits: 1, pot: 13 });
  assertEqual(out.done, true);
  assertEqual(out.result, 'cashout');
  assertEqual(out.pot, 13);
});

test('tavern: Joker kommt nie als Startkarte und zählt nicht als Treffer', () => {
  for (let seed = 1; seed < 500; seed++) {
    const s = hiLoStart(createRng(seed), 100);
    assertTrue(typeof s.card === 'number' && s.card >= 2 && s.card <= 14);
    assertEqual(s.pot, 100);
    assertEqual(s.hits, 0);
    assertEqual(s.done, false);
  }
  const state = { stake: 100, pot: 240, card: 8, hits: 2, done: false, result: null };
  const j = hiLoGuess(state, 'up', scripted([0.0, 0.5, 0.5]));
  assertEqual(j.drawn, 'joker');
  assertEqual(j.state, { stake: 100, pot: 240, card: 8, hits: 2, done: true, result: 'joker' });
  assertTrue(j.loot in ITEMS);
  const cheap = hiLoGuess({ ...state, stake: 50 }, 'up', scripted([0.0, 0.5, 0.5]));
  assertEqual(cheap.loot, null);
  // Jokerhäufigkeit ungefähr 2 %
  let jokers = 0;
  const rng = createRng(7);
  for (let i = 0; i < 5000; i++) {
    if (hiLoGuess({ ...state }, 'up', rng).drawn === 'joker') jokers++;
  }
  assertTrue(jokers > 50 && jokers < 160, `Joker: ${jokers}`);
});
