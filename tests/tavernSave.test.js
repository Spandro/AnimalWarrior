import { test, assertEqual, assertTrue, assertThrows } from './runner.js';
import { defaultSave, validate } from '../src/save/store.js';
import { unlockStored } from '../src/core/achievements.js';
import {
  canStake, grantItem, applyRound, startHiLoRound, settleHiLoRound, unlockDuo, markItemsSeen,
} from '../src/save/tavern.js';

const withGold = (gold) => ({ ...defaultSave(), gold });
const clone = (v) => JSON.parse(JSON.stringify(v));
/** Zustand einer fertigen Höher-oder-tiefer-Runde. */
const done = (o) => ({ stake: 100, pot: 0, card: 8, hits: 0, done: true, result: 'miss', ...o });

test('tavernSave: canStake prüft Einsatzstufe und Gold', () => {
  assertEqual(canStake(withGold(100), 100), true);
  assertEqual(canStake(withGold(99), 100), false);
  assertEqual(canStake(withGold(1000), 30), false);
  assertEqual(canStake(withGold(1000), 0), false);
  assertEqual(canStake(withGold(1000), 500), true);
});

test('tavernSave: applyRound mit zu wenig Gold verändert nichts', () => {
  const s = withGold(99);
  const before = clone(s);
  assertEqual(applyRound(s, { stake: 100, payout: 200, loot: 'helm_zuversicht' }), { ok: false, reason: 'gold' });
  assertEqual(s, before);
});

test('tavernSave: applyRound mit ungültigem Einsatz ergibt stake und verändert nichts', () => {
  const s = withGold(1000);
  const before = clone(s);
  assertEqual(applyRound(s, { stake: 30, payout: 0, loot: null }), { ok: false, reason: 'stake' });
  assertEqual(s, before);
});

test('tavernSave: applyRound rechnet Gewinn und Verlust, zählt die Runde', () => {
  const s = withGold(1000);
  assertEqual(applyRound(s, { stake: 100, payout: 200, loot: null }), { ok: true, item: null });
  assertEqual([s.gold, s.stats.tavernRounds], [1100, 1]);
  assertEqual(applyRound(s, { stake: 500, payout: 0, loot: null }).ok, true);
  assertEqual([s.gold, s.stats.tavernRounds], [600, 2]);
  assertEqual(applyRound(s, { stake: 10, payout: 5, loot: null }).ok, true);
  assertEqual([s.gold, s.stats.tavernRounds], [595, 3]);
  assertTrue(validate(s).ok);
});

test('tavernSave: applyRound vergibt Beute neu in die Truhe', () => {
  const s = withGold(1000);
  const r = applyRound(s, { stake: 100, payout: 0, loot: 'helm_zuversicht' });
  assertEqual(r, { ok: true, item: { id: 'helm_zuversicht', duplicate: false, resale: 0 } });
  assertEqual(s.inventory, ['helm_zuversicht']);
  assertEqual(s.gold, 900);
});

test('tavernSave: doppelte Beute bringt den Verkaufswert, gewöhnlich +10', () => {
  const s = withGold(1000);
  s.inventory = ['helm_zuversicht'];
  const r = applyRound(s, { stake: 100, payout: 0, loot: 'helm_zuversicht' });
  assertEqual(r, { ok: true, item: { id: 'helm_zuversicht', duplicate: true, resale: 10 } });
  assertEqual(s.inventory, ['helm_zuversicht']);
  assertEqual(s.gold, 910);
});

test('tavernSave: grantItem – Verkaufswert nach Seltenheit, unbekannte Kennung wirft', () => {
  const s = withGold(0);
  assertEqual(grantItem(s, 'denkerkappe'), { id: 'denkerkappe', duplicate: false, resale: 0 });
  assertEqual(grantItem(s, 'denkerkappe'), { id: 'denkerkappe', duplicate: true, resale: 30 });
  assertEqual(grantItem(s, 'krone_kneipenkoenig').resale, 0);
  assertEqual(grantItem(s, 'krone_kneipenkoenig'), { id: 'krone_kneipenkoenig', duplicate: true, resale: 100 });
  assertEqual(s.gold, 130);
  assertThrows(() => grantItem(s, 'gibtEsNicht'));
  assertTrue(validate(s).ok);
});

test('tavernSave: startHiLoRound bucht den Einsatz ab und zählt die Runde', () => {
  const s = withGold(100);
  assertEqual(startHiLoRound(s, 100), { ok: true });
  assertEqual([s.gold, s.stats.tavernRounds], [0, 1]);
  const before = clone(s);
  assertEqual(startHiLoRound(s, 100), { ok: false, reason: 'gold' });
  assertEqual(startHiLoRound(s, 7), { ok: false, reason: 'stake' });
  assertEqual(s, before);
});

test('tavernSave: settleHiLoRound – Fehltipp bringt kein Gold, die Serie bleibt erhalten', () => {
  const s = withGold(0);
  assertEqual(settleHiLoRound(s, done({ result: 'miss', pot: 0, hits: 3 }), null), { item: null });
  assertEqual(s.gold, 0);
  assertEqual(s.stats.hiLoBestStreak, 3);
  // Auch wenn ein Topf stünde, zahlt ein Fehltipp nichts.
  settleHiLoRound(s, done({ result: 'miss', pot: 250, hits: 1 }), null);
  assertEqual(s.gold, 0);
  assertEqual(s.stats.hiLoBestStreak, 3, 'die Serie sinkt nie');
});

test('tavernSave: settleHiLoRound schreibt den Topf gut und hält die längste Serie', () => {
  const s = withGold(0);
  settleHiLoRound(s, done({ result: 'cashout', pot: 340, hits: 4 }), null);
  assertEqual([s.gold, s.stats.hiLoBestStreak], [340, 4]);
  settleHiLoRound(s, done({ result: 'max', pot: 1000, hits: 5 }), null);
  assertEqual([s.gold, s.stats.hiLoBestStreak], [1340, 5]);
  settleHiLoRound(s, done({ result: 'joker', pot: 100, hits: 2 }), null);
  assertEqual([s.gold, s.stats.hiLoBestStreak], [1440, 5]);
  assertTrue(validate(s).ok);
});

test('tavernSave: settleHiLoRound vergibt Beute, auch doppelte', () => {
  const s = withGold(0);
  assertEqual(settleHiLoRound(s, done({ result: 'cashout', pot: 10, hits: 1 }), 'helm_zuversicht'),
    { item: { id: 'helm_zuversicht', duplicate: false, resale: 0 } });
  assertEqual(settleHiLoRound(s, done({ result: 'cashout', pot: 10, hits: 1 }), 'helm_zuversicht').item.duplicate, true);
  assertEqual(s.inventory, ['helm_zuversicht']);
  assertEqual(s.gold, 30);
});

test('tavernSave: settleHiLoRound wirft bei einem nicht beendeten Zustand und ändert nichts', () => {
  const s = withGold(50);
  const before = clone(s);
  assertThrows(() => settleHiLoRound(s, done({ done: false, result: null, pot: 80, hits: 2 }), null));
  assertEqual(s, before);
});

test('tavernSave: unlockDuo – zu wenig Gold, dann Kauf, dann bereits freigeschaltet', () => {
  const poor = withGold(19999);
  assertEqual(unlockDuo(poor), { ok: false, reason: 'gold' });
  assertEqual([poor.gold, poor.unlocks], [19999, []]);
  const s = withGold(20000);
  assertEqual(unlockDuo(s), { ok: true });
  assertEqual([s.gold, s.unlocks], [0, ['duo']]);
  const rich = withGold(50000);
  rich.unlocks = ['duo'];
  assertEqual(unlockDuo(rich), { ok: false, reason: 'already' });
  assertEqual(rich.gold, 50000);
  assertEqual(unlockDuo(s), { ok: false, reason: 'already' });
  assertEqual(s.unlocks, ['duo']);
  assertTrue(validate(s).ok);
});

test('tavernSave: markItemsSeen merkt nur Gegenstände aus der Truhe, jeden einmal', () => {
  const s = withGold(0);
  s.inventory = ['helm_zuversicht', 'denkerkappe'];
  markItemsSeen(s, ['helm_zuversicht', 'helm_zuversicht', 'federhut', 'gibtEsNicht']);
  assertEqual(s.seenItems, ['helm_zuversicht']);
  markItemsSeen(s, ['denkerkappe', 'helm_zuversicht']);
  assertEqual(s.seenItems, ['helm_zuversicht', 'denkerkappe']);
  assertTrue(validate(s).ok);
});

test('tavernSave: eine Runde, die das Gold über 1000 hebt, löst Sparschwein aus', () => {
  const s = withGold(990);
  assertEqual(applyRound(s, { stake: 10, payout: 30, loot: null }).ok, true);
  assertEqual(s.gold, 1010);
  const ids = unlockStored(s, 0);
  assertTrue(ids.includes('sparschwein'));
  assertEqual(s.achievements.sparschwein, 0);
  assertTrue(validate(s).ok);
});
