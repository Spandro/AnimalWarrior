import { test, assertEqual, assertTrue, assertClose } from './runner.js';
import {
  createAdventureRun, stepAdventure, useAbility, drinkPotion, interact, endTalk, setPaused, rest, travel, snapshot, clearLedger,
  isGateClosed,
} from '../src/modes/adventure.js';
import { damageEnemy } from '../src/core/world.js';
import { defaultSave, addHero } from '../src/save/store.js';
import { newAdventure } from '../src/save/adventure.js';
import { acceptQuest } from '../src/core/quests.js';
import { DEATH, POTION } from '../src/data/adventure.js';

function setup({ map = 'kapitel1', campfire = 'k1_ufer', gold = 1000, cls = 'krieger', mutate } = {}) {
  const save = defaultSave();
  const h = addHero(save, { name: 'Hoppel', animal: 'hase', class: cls }, { now: 1, id: 'h1' });
  h.adventure = newAdventure(h);
  h.adventure.mapId = map; h.adventure.campfireId = campfire; h.adventure.introSeen = true;
  save.gold = gold;
  mutate?.(h.adventure, save);
  return createAdventureRun({ seed: 7, save, heroId: 'h1' });
}

const still = { moveX: 0, moveZ: 0 };
const step = (run, n = 1, dt = 1 / 30) => { for (let i = 0; i < n; i++) stepAdventure(run, dt, still); };
const put = (run, x, z) => { run.world.hero.x = x; run.world.hero.z = z; };
const pack = (run, id) => run.packs.find((p) => p.def.id === id);
const members = (run, id) => run.world.enemies.filter((e) => e.packId === id);
const killAll = (run, list) => { for (const e of [...list]) damageEnemy(run.world, e, { amount: 1e6, crit: false }, 'test'); };

test('adventure: am Start keine Gegner in der Welt (alle Gruppen weiter als 40 m)', () => {
  const run = setup();
  step(run);
  assertEqual(run.world.enemies.length, 0);
  assertEqual(run.map.id, 'kapitel1');
  assertTrue(Math.hypot(run.world.hero.x - 6, run.world.hero.z - 3) < 3);
});

test('adventure: Gruppe erscheint passiv und greift erst unter 10 m an', () => {
  const run = setup();
  put(run, 40, 19); step(run);
  assertTrue(members(run, 'p_ufer_1').length === 4);
  assertTrue(members(run, 'p_ufer_1').every((e) => e.passive));
  put(run, 54, 26); step(run);
  assertEqual(pack(run, 'p_ufer_1').state, 'engaged');
  assertTrue(members(run, 'p_ufer_1').every((e) => !e.passive));
});

test('adventure: Leine – wer wegläuft, lässt die Gruppe heimkehren und heilen', () => {
  const run = setup();
  put(run, 54, 26); step(run, 2);
  assertEqual(pack(run, 'p_ufer_1').state, 'engaged');
  const e = members(run, 'p_ufer_1')[0];
  e.hp = 1;
  put(run, 92, 2); step(run);
  assertEqual(pack(run, 'p_ufer_1').state, 'idle');
  assertEqual(e.hp, e.maxHp);
  assertTrue(e.passive);
});

test('adventure: besiegte Gruppe bleibt weg bis zum Rasten', () => {
  const run = setup();
  put(run, 54, 26); step(run);
  killAll(run, members(run, 'p_ufer_1')); step(run);
  assertEqual(pack(run, 'p_ufer_1').state, 'cleared');
  put(run, 6, 3); step(run); put(run, 54, 26); step(run);
  assertEqual(members(run, 'p_ufer_1').length, 0);
  rest(run, 'k1_ufer');
  put(run, 54, 26); step(run);
  assertEqual(members(run, 'p_ufer_1').length, 4);
});

/** Stellt den Helden in die Arena von Gräte. */
function fightGraete(run) {
  put(run, 322, 0); step(run, 2);
  return run.world.enemies.find((e) => e.type === 'hauptmann_graete');
}

test('adventure: Bosskampf schließt das Tor, Sieg öffnet Tor und Barrikade, Boss bleibt nach dem Rasten weg', () => {
  const run = setup({ campfire: 'k1_bruecke' });
  assertTrue(isGateClosed(run, 'barrikade'));
  const boss = fightGraete(run);
  assertTrue(!!boss);
  assertTrue(isGateClosed(run, 'arena_graete'));
  assertTrue(run.events.some((e) => e.type === 'bossStart') || run.activeBoss !== null);
  damageEnemy(run.world, boss, { amount: 1e6, crit: false }, 'test'); step(run);
  assertTrue(!isGateClosed(run, 'arena_graete'));
  assertTrue(!isGateClosed(run, 'barrikade'));
  assertEqual(run.record.bosses, ['graete']);
  assertTrue(run.world.pickups.some((p) => p.kind === 'item'));
  assertTrue((run.ledger.materials.flussperle ?? 0) >= 2);
  rest(run, 'k1_bruecke');
  put(run, 330, 0); step(run, 2);
  assertTrue(!run.world.enemies.some((e) => e.type === 'hauptmann_graete'));
});

test('adventure: Tod im Bosskampf – Held am Feuer, Tor offen, Boss voll, Gold weniger', () => {
  const run = setup({ campfire: 'k1_bruecke', gold: 1000 });
  const boss = fightGraete(run);
  boss.hp = 5;
  run.world.hero.hp = 0;
  step(run, Math.ceil(DEATH.seconds * 30) + 5);
  assertEqual(run.state, 'playing');
  assertTrue(!isGateClosed(run, 'arena_graete'));
  assertTrue(Math.hypot(run.world.hero.x - 270, run.world.hero.z + 8) < 3);
  assertEqual(run.world.hero.hp, run.world.hero.stats.maxHp);
  assertEqual(run.ledger.gold, -Math.floor(1000 * DEATH.goldPct));
  assertEqual(run.record.bosses, []);
  const again = fightGraete(run);
  assertEqual(again.hp, again.maxHp);
  const rich = setup({ gold: 100000 });
  rich.world.hero.hp = 0;
  step(rich, Math.ceil(DEATH.seconds * 30) + 5);
  assertEqual(rich.ledger.gold, -DEATH.goldMax);
});

test('adventure: Heiltrank – nicht bei vollem Leben, Sperre, Anzahl sinkt', () => {
  const run = setup();
  assertTrue(!drinkPotion(run));
  run.world.hero.hp = run.world.hero.stats.maxHp / 2;
  assertTrue(drinkPotion(run));
  assertEqual(run.record.potions, POTION.start - 1);
  assertClose(run.world.hero.hp, run.world.hero.stats.maxHp * (0.5 + POTION.heal));
  run.world.hero.hp = 1;
  assertTrue(!drinkPotion(run));
  step(run, Math.ceil(POTION.lockSeconds * 30) + 1);
  assertTrue(drinkPotion(run));
  assertTrue(!drinkPotion(run) || run.record.potions === 0);
});

test('adventure: in Pause, Gespräch und Sterbephase tut keine Aktion etwas', () => {
  const run = setup({ map: 'dorf', campfire: 'dorf_platz', mutate: (a) => { a.abilities.wirbelschlag = 1; a.buttons[0] = 'wirbelschlag'; } });
  run.world.hero.hp = 10;
  setPaused(run, true);
  assertTrue(!drinkPotion(run)); assertTrue(!useAbility(run, 0)); assertEqual(interact(run), null);
  setPaused(run, false);
  put(run, -6, -8.5); step(run);
  const talk = interact(run);
  assertEqual(talk.kind, 'talk');
  assertEqual(run.state, 'talking');
  assertTrue(!drinkPotion(run));
  endTalk(run);
  run.world.hero.hp = 0; step(run);
  assertEqual(run.state, 'dying');
  assertTrue(!drinkPotion(run)); assertEqual(interact(run), null);
});

test('adventure: Gespräch mit Oma nimmt den Hauptauftrag an, Helmfische zählen', () => {
  const run = setup({ map: 'dorf', campfire: 'dorf_platz' });
  put(run, -6, -8.5); step(run);
  assertEqual(run.interactable?.kind, 'npc');
  const t = interact(run);
  assertEqual(t.offer, 'nasse_pfoten');
  endTalk(run);
  assertEqual(run.record.quests.nasse_pfoten.state, 'active');
  assertTrue(run.dirty);
  assertTrue(!travel(run, 'k1_ufer'));
  run.record.campfires.push('k1_ufer');
  assertTrue(travel(run, 'k1_ufer'));
  put(run, 54, 26); step(run);
  put(run, 54, 26); step(run);
  killAll(run, members(run, 'p_ufer_1')); step(run);
  assertEqual(run.record.quests.nasse_pfoten.progress, 4);
});

test('adventure: Fundort Hammer bringt den Auftrag weiter', () => {
  const run = setup({ mutate: (a) => { acceptQuest(a.quests, 'nasse_pfoten'); a.quests.nasse_pfoten = { state: 'done', step: 2, progress: 0 };
    acceptQuest(a.quests, 'schmied_ohne_hammer'); a.quests.schmied_ohne_hammer.step = 1; } });
  put(run, 168, -100.5); step(run);
  assertEqual(run.interactable?.kind, 'spot');
  const r = interact(run);
  assertEqual(r.kind, 'spot');
  assertEqual(run.record.quests.schmied_ohne_hammer.step, 2);
  assertEqual(run.record.found, ['hammer']);
});

test('adventure: Ausgang wechselt die Karte, hin und zurück', () => {
  const run = setup({ map: 'dorf', campfire: 'dorf_platz' });
  put(run, 57, 0); step(run);
  assertEqual(run.map.id, 'kapitel1');
  assertTrue(run.events.some((e) => e.type === 'mapChange'));
  put(run, -4, 0); step(run);
  assertEqual(run.map.id, 'dorf');
});

test('adventure: Gold kommt ins Ledger, snapshot und clearLedger liefern es genau einmal; Erkundung wächst', () => {
  const run = setup();
  run.world.pickups.push({ kind: 'gold', x: run.world.hero.x, z: run.world.hero.z, value: 7 });
  step(run);
  assertTrue(run.ledger.gold >= 7);
  const snap = snapshot(run);
  assertTrue(snap.ledger.gold >= 7);
  assertTrue(typeof snap.record.explored.kapitel1 === 'string');
  clearLedger(run);
  assertEqual(run.ledger, { gold: 0, items: [], materials: {}, rests: 0 });
  const before = snap.record.explored.kapitel1;
  put(run, 120, -25); step(run);
  assertTrue(snapshot(run).record.explored.kapitel1 !== before);
});

test('adventure: Fähigkeit von Hand über den Knopf, ohne Ziel scheitert sie mit Ereignis', () => {
  const run = setup({ cls: 'magier', mutate: (a) => { a.abilities.kettenblitz = 1; a.buttons[1] = 'kettenblitz'; } });
  assertTrue(!useAbility(run, 0));
  assertTrue(!useAbility(run, 1));
  assertTrue(run.events.some((e) => e.type === 'abilityFail'));
  put(run, 54, 26); step(run);
  assertTrue(useAbility(run, 1));
});

test('adventure: Einstieg gesehen und Kapitel 1 geschafft stehen im Heldenstand', async () => {
  const { markIntroSeen } = await import('../src/modes/adventure.js');
  const run = setup({ map: 'dorf', campfire: 'dorf_platz', mutate: (a) => {
    for (const id of ['nasse_pfoten', 'schmied_ohne_hammer', 'bruecke_zu', 'flugblaetter']) a.quests[id] = { state: 'done', step: 9, progress: 0 };
    a.quests.zwickzwack = { state: 'active', step: 2, progress: 0 };
    a.introSeen = false;
  } });
  markIntroSeen(run);
  assertEqual(run.record.introSeen, true);
  put(run, -6, -8.5); step(run);
  interact(run);
  assertEqual(run.record.quests.zwickzwack.state, 'done');
  assertEqual(run.record.chapterDone, [1]);
  assertTrue(run.events.some((e) => e.type === 'chapterDone' && e.chapter === 1));
});

test('adventure: Erfahrung und Zählfortschritt eines Auftrags markieren den Lauf zum Speichern', () => {
  const run = setup({ mutate: (a) => { acceptQuest(a.quests, 'nasse_pfoten'); } });
  put(run, 54, 26); step(run, 2);
  run.dirty = false;
  killAll(run, members(run, 'p_ufer_1').slice(0, 1)); step(run);
  assertEqual(run.record.quests.nasse_pfoten.progress, 1);
  assertTrue(run.dirty);
});
