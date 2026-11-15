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
const MAIN2 = ['ruf_aus_dem_sumpf', 'froesche_verbuendet', 'hofmarschall', 'nebel_im_moor', 'hecht_haudrauf'];
const SIDE2 = ['egelplage', 'seerosen', 'libellenflug'];

test('quests: je Kapitel fünf Haupt- und drei Nebenaufträge mit bekannten Zielen', () => {
  assertEqual(Object.keys(QUESTS), [...MAIN, ...SIDE, ...MAIN2, ...SIDE2]);
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
  for (const id of [...SIDE, ...SIDE2]) if (QUESTS[id].reward.item) assertEqual(ITEMS[QUESTS[id].reward.item].rarity, 'selten', id);
});

test('quests: Kapitel 2 – Ziele liegen auf dem Sumpf, Oma gibt den ersten, genau einer beendet das Kapitel', () => {
  const k2 = MAPS.kapitel2;
  const places = new Set(k2.areas.map((a) => a.id)), bosses = new Set(k2.bosses.map((b) => b.id)), spots = new Set(k2.spots.map((x) => x.kind));
  const kinds = new Set(k2.packs.flatMap((p) => Object.keys(p.enemies)));
  for (const id of [...MAIN2, ...SIDE2]) {
    const q = QUESTS[id];
    assertEqual(q.kind, MAIN2.includes(id) ? 'main' : 'side', id);
    for (const st of q.steps) {
      if (st.type !== 'talk') assertEqual(st.map, 'kapitel2', `${id}: Karte`);
      if (st.type === 'reach') assertTrue(places.has(st.target), `${id}: ${st.target}`);
      if (st.type === 'boss') assertTrue(bosses.has(st.target), `${id}: ${st.target}`);
      if (st.type === 'kill') assertTrue(kinds.has(st.target), `${id}: ${st.target}`);
      if (st.type === 'collect' && st.from === 'spot') {
        assertTrue(spots.has(st.target), `${id}: ${st.target}`);
        assertTrue(k2.spots.filter((x) => x.kind === st.target).length >= st.count, `${id}: genug Fundorte`);
      }
      if (st.type === 'collect' && st.from !== 'spot') for (const e of st.from) assertTrue(kinds.has(e), `${id}: ${e}`);
      if (st.type === 'talk') assertTrue(st.target === 'quappe' || st.target === 'panzerla', `${id}: ${st.target}`);
    }
  }
  assertEqual(QUESTS.ruf_aus_dem_sumpf.giver, 'panzerla');
  assertEqual(QUESTS.ruf_aus_dem_sumpf.requires, ['zwickzwack']);
  for (const id of [...MAIN2.slice(1), ...SIDE2]) assertEqual(QUESTS[id].giver, 'quappe', id);
  const enders = Object.values(QUESTS).filter((q) => q.endsChapter === 2);
  assertEqual(enders.map((q) => q.id), ['hecht_haudrauf']);
  assertTrue(enders[0].steps.some((st) => st.type === 'boss' && st.target === 'haudrauf'));
});

test('quests: Gespräche – jeder Auftrag hat Angebot und Erinnerung beim Geber, Abschluss bei der letzten Person', () => {
  for (const q of Object.values(QUESTS)) {
    const d = DIALOGUES[q.giver];
    assertTrue(d.offer[q.id]?.length > 0, `${q.id}: Angebot`);
    assertTrue(d.remind[q.id]?.length > 0, `${q.id}: Erinnerung`);
    const last = q.steps[q.steps.length - 1];
    if (last.type === 'talk') assertTrue(DIALOGUES[last.target].done[q.id]?.length > 0, `${q.id}: Abschluss`);
  }
  assertTrue(DIALOGUES.quappe.idle.length >= 3);
});

test('quests: ganzer Ablauf von Kapitel 2 bis Hecht Haudrauf', () => {
  const log = Object.fromEntries(MAIN.map((id) => [id, { state: 'done', step: QUESTS[id].steps.length, progress: 0 }]));
  const ev = (e) => questEvent(log, e);
  assertEqual(talkTo(log, 'panzerla').offer, 'ruf_aus_dem_sumpf');
  acceptQuest(log, 'ruf_aus_dem_sumpf');
  ev({ type: 'reach', place: 'schilfrand' }); ev({ type: 'talk', npc: 'quappe' });
  assertEqual(talkTo(log, 'quappe').offer, 'froesche_verbuendet');
  acceptQuest(log, 'froesche_verbuendet');
  for (let i = 0; i < 6; i++) ev({ type: 'kill', enemyType: 'ochsenfrosch' });
  for (let i = 0; i < 4; i++) ev({ type: 'collect', thing: 'einladung' });
  ev({ type: 'talk', npc: 'quappe' });
  acceptQuest(log, 'hofmarschall');
  ev({ type: 'reach', place: 'froschhof' }); ev({ type: 'boss', bossId: 'quak' }); ev({ type: 'talk', npc: 'quappe' });
  acceptQuest(log, 'nebel_im_moor');
  ev({ type: 'reach', place: 'nebelmoor' });
  for (let i = 0; i < 3; i++) ev({ type: 'collect', thing: 'irrlicht' });
  ev({ type: 'talk', npc: 'quappe' });
  acceptQuest(log, 'hecht_haudrauf');
  ev({ type: 'reach', place: 'hechtloch' }); ev({ type: 'boss', bossId: 'haudrauf' });
  assertEqual(ev({ type: 'talk', npc: 'panzerla' }).completed, ['hecht_haudrauf']);
  for (const id of MAIN2) assertEqual(log[id].state, 'done', id);
});

test('quests: jeder Satz in Gesprächen und Geschichte höchstens 90 Zeichen', () => {
  const all = [];
  for (const d of Object.values(DIALOGUES)) for (const group of Object.values(d)) {
    if (Array.isArray(group)) all.push(...group); else for (const lines of Object.values(group)) all.push(...lines);
  }
  for (const panel of [...STORY.intro, ...Object.values(STORY.chapterEnd), ...Object.values(STORY.chapterStart).flat()]) all.push(...panel.lines);
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
