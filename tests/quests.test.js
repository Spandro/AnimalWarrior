import { test, assertEqual, assertTrue } from './runner.js';
import { QUESTS } from '../src/data/quests.js';
import { DIALOGUES, NPCS } from '../src/data/dialogues.js';
import { STORY } from '../src/data/story.js';
import { MAPS } from '../src/data/maps/index.js';
import { ENEMIES } from '../src/data/enemies.js';
import { ITEMS } from '../src/data/items.js';
import { npcState, talkTo, acceptQuest, questEvent, trackedQuest, questTarget } from '../src/core/quests.js';

const MAIN = ['nasse_pfoten', 'schmied_ohne_hammer', 'bruecke_zu', 'flugblaetter', 'zwickzwack'];
const SIDE = ['verbuddelt', 'post_amsel', 'hamsterkauf'];

test('quests: fünf Haupt- und drei Nebenaufträge mit bekannten Zielen', () => {
  assertEqual(Object.keys(QUESTS), [...MAIN, ...SIDE]);
  const places = new Set(Object.values(MAPS).flatMap((m) => m.areas.map((a) => a.id)));
  const bosses = new Set(Object.values(MAPS).flatMap((m) => m.bosses.map((b) => b.id)));
  const spots = new Set(Object.values(MAPS).flatMap((m) => m.spots.map((s) => s.kind)));
  for (const q of Object.values(QUESTS)) {
    assertTrue(Object.hasOwn(NPCS, q.giver), q.id);
    if (q.reward.item) assertTrue(Object.hasOwn(ITEMS, q.reward.item), q.id);
    for (const s of q.steps) {
      if (s.type === 'talk') assertTrue(Object.hasOwn(NPCS, s.target), `${q.id}: ${s.target}`);
      if (s.type === 'reach') assertTrue(places.has(s.target), `${q.id}: ${s.target}`);
      if (s.type === 'boss') assertTrue(bosses.has(s.target), `${q.id}: ${s.target}`);
      if (s.type === 'kill') assertTrue(Object.hasOwn(ENEMIES, s.target), `${q.id}: ${s.target}`);
      if (s.type === 'collect' && s.from === 'spot') assertTrue(spots.has(s.target), `${q.id}: ${s.target}`);
      if (s.type === 'collect' && s.from !== 'spot') for (const e of s.from) assertTrue(Object.hasOwn(ENEMIES, e), `${q.id}: ${e}`);
      assertTrue(s.text.length > 0, q.id);
    }
  }
  for (const id of SIDE) assertEqual(ITEMS[QUESTS[id].reward.item].rarity, 'selten');
});

test('quests: jeder Satz in Gesprächen und Geschichte höchstens 90 Zeichen', () => {
  const all = [];
  for (const d of Object.values(DIALOGUES)) for (const group of Object.values(d)) {
    if (Array.isArray(group)) all.push(...group); else for (const lines of Object.values(group)) all.push(...lines);
  }
  for (const panel of [...STORY.intro, ...Object.values(STORY.chapterEnd)]) all.push(...panel.lines);
  assertTrue(all.length > 40);
  for (const line of all) assertTrue(typeof line === 'string' && line.length > 0 && line.length <= 90, line);
});

test('quests: Hauptauftrag wird beim Gespräch angeboten, Voraussetzungen sperren', () => {
  const log = {};
  assertEqual(npcState(log, 'panzerla'), 'offer');
  assertEqual(npcState(log, 'grabowski'), 'none');
  const t = talkTo(log, 'panzerla');
  assertEqual(t.offer, 'nasse_pfoten');
  assertEqual(t.autoAccept, true);
  assertEqual(log, {});
  assertTrue(!acceptQuest(log, 'schmied_ohne_hammer'));
  assertTrue(acceptQuest(log, 'nasse_pfoten'));
  assertTrue(!acceptQuest(log, 'nasse_pfoten'));
  assertEqual(log.nasse_pfoten, { state: 'active', step: 0, progress: 0 });
});

test('quests: jede Schrittart und Belohnung genau einmal', () => {
  const log = {};
  acceptQuest(log, 'nasse_pfoten');
  for (let i = 0; i < 5; i++) questEvent(log, { type: 'kill', enemyType: 'helmfisch' });
  questEvent(log, { type: 'kill', enemyType: 'ratte' });
  assertEqual(log.nasse_pfoten.progress, 5);
  assertEqual(questEvent(log, { type: 'kill', enemyType: 'helmfisch' }).advanced, ['nasse_pfoten']);
  assertEqual(npcState(log, 'panzerla'), 'turnIn');
  const turnIn = talkTo(log, 'panzerla');
  assertEqual(turnIn.completes, 'nasse_pfoten');
  assertEqual(questEvent(log, { type: 'talk', npc: 'panzerla' }).completed, ['nasse_pfoten']);
  assertEqual(questEvent(log, { type: 'talk', npc: 'panzerla' }).completed, []);
  assertEqual(log.nasse_pfoten.state, 'done');
  acceptQuest(log, 'schmied_ohne_hammer');
  questEvent(log, { type: 'reach', place: 'krebslager' });
  questEvent(log, { type: 'collect', thing: 'hammer' });
  assertEqual(log.schmied_ohne_hammer.step, 2);
});

test('quests: Nebenauftrag mit Wahl; talkTo ändert nichts', () => {
  const log = { nasse_pfoten: { state: 'done', step: 2, progress: 0 } };
  const t = talkTo(log, 'pieps');
  assertEqual([t.offer, t.autoAccept], ['post_amsel', false]);
  assertEqual(Object.keys(log), ['nasse_pfoten']);
  assertEqual(npcState(log, 'pieps'), 'offer');
});

test('quests: ganzer Ablauf von Kapitel 1 bis Zwickzwack', () => {
  const log = {};
  const ev = (e) => questEvent(log, e);
  acceptQuest(log, 'nasse_pfoten');
  for (let i = 0; i < 6; i++) ev({ type: 'kill', enemyType: 'helmfisch' });
  ev({ type: 'talk', npc: 'panzerla' });
  acceptQuest(log, 'schmied_ohne_hammer');
  ev({ type: 'reach', place: 'krebslager' }); ev({ type: 'collect', thing: 'hammer' }); ev({ type: 'talk', npc: 'grabowski' });
  acceptQuest(log, 'bruecke_zu');
  ev({ type: 'reach', place: 'alte_bruecke' }); ev({ type: 'boss', bossId: 'graete' }); ev({ type: 'talk', npc: 'panzerla' });
  acceptQuest(log, 'flugblaetter');
  for (let i = 0; i < 5; i++) ev({ type: 'collect', thing: 'flugblatt' });
  ev({ type: 'talk', npc: 'panzerla' });
  acceptQuest(log, 'zwickzwack');
  ev({ type: 'reach', place: 'quellteich' }); ev({ type: 'boss', bossId: 'zwickzwack' });
  assertEqual(ev({ type: 'talk', npc: 'panzerla' }).completed, ['zwickzwack']);
  for (const id of MAIN) assertEqual(log[id].state, 'done', id);
});

test('quests: verfolgter Auftrag und Ziel auf der Karte', () => {
  const log = {};
  assertEqual(trackedQuest(log, null), null);
  acceptQuest(log, 'nasse_pfoten');
  log.nasse_pfoten.step = 1;
  acceptQuest(log, 'verbuddelt');
  assertEqual(trackedQuest(log, null), 'nasse_pfoten');
  assertEqual(trackedQuest(log, 'verbuddelt'), 'verbuddelt');
  assertEqual(trackedQuest(log, 'gibtsnicht'), 'nasse_pfoten');
  const target = questTarget(log, 'nasse_pfoten', MAPS);
  const oma = MAPS.dorf.npcs.find((n) => n.id === 'panzerla');
  assertEqual(target, { map: 'dorf', x: oma.x, z: oma.z });
  const nut = questTarget(log, 'verbuddelt', MAPS, ['nuss_1']);
  assertEqual(nut.map, 'kapitel1');
  assertTrue(!(nut.x === 95 && nut.z === -1));
});
