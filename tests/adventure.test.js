import { test, assertEqual, assertTrue, assertClose } from './runner.js';
import {
  createAdventureRun, stepAdventure, useAbility, drinkPotion, interact, endTalk, setPaused, rest, travel, snapshot, clearLedger, acceptOffer,
  isGateClosed, clearSignaturesAction,
} from '../src/modes/adventure.js';
import { damageEnemy, spawnEnemy } from '../src/core/world.js';
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
  put(run, 326, 0); step(run, 2);
  return run.world.enemies.find((e) => e.type === 'hauptmann_graete');
}

test('adventure: Bosskampf schließt das Tor, Sieg öffnet Tor und Barrikade, Boss bleibt nach dem Rasten weg', () => {
  // (Bossbeute liegt seit der Gesamtprüfung direkt im Ledger, siehe unten.)
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
  assertTrue(run.ledger.items.length >= 1);
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

// ---------------------------------------------------------------- Befunde der Gesamtprüfung

test('adventure: wer über die Brücke in Grätes Arena läuft, kann danach weiter laufen', () => {
  const run = setup({ campfire: 'k1_bruecke' });
  put(run, 305, 0);
  for (let i = 0; i < 120 && !run.activeBoss; i++) stepAdventure(run, 1 / 30, { moveX: 1, moveZ: 0 });
  assertTrue(!!run.activeBoss);
  const h = run.world.hero, x0 = h.x, z0 = h.z;
  assertTrue(run.world.terrain.walkable(h.x, h.z, 'walk'), `${h.x},${h.z}`);
  run.world.enemies.forEach((e) => { e.passive = true; });
  for (let i = 0; i < 15; i++) stepAdventure(run, 1 / 30, { moveX: 0.3, moveZ: 1 });
  assertTrue(Math.hypot(h.x - x0, h.z - z0) > 1, `stand bei ${h.x},${h.z}`);
});

test('adventure: ein schon besiegter Boss überspringt seinen Auftragsschritt', () => {
  const run = setup({ campfire: 'k1_bruecke', mutate: (a) => {
    a.quests = { nasse_pfoten: { state: 'done', step: 2, progress: 0 }, schmied_ohne_hammer: { state: 'done', step: 3, progress: 0 } };
    a.bosses = ['graete'];
  } });
  acceptOffer(run, 'bruecke_zu');
  put(run, 300, 0); step(run, 2);
  assertEqual(run.record.quests.bruecke_zu.step, 2);
});

test('adventure: Rückstoß einer Fähigkeit von Hand schiebt niemanden ins Gesperrte', () => {
  const run = setup({ mutate: (a) => { a.abilities.schildstoss = 5; a.buttons[0] = 'schildstoss'; } });
  put(run, 54, 26); step(run, 2);
  const h = run.world.hero;
  const n = { x: -30 / Math.hypot(30, 66), z: 66 / Math.hypot(30, 66) }; // quer zum Weg, Richtung Rand
  h.facing = { ...n };
  for (const e of members(run, 'p_ufer_1')) { e.x = h.x + n.x * 1.5; e.z = h.z + n.z * 1.5; e.passive = true; e.hp = e.maxHp = 1000; }
  useAbility(run, 0); step(run, 2);
  for (const e of members(run, 'p_ufer_1')) assertTrue(run.world.terrain.walkable(e.x, e.z, 'walk'), `${e.x},${e.z}`);
});

test('adventure: Bossbeute (Gegenstand und Trank) geht direkt in Ledger und Tasche', () => {
  const run = setup({ campfire: 'k1_bruecke' });
  const boss = fightGraete(run);
  const potions = run.record.potions;
  damageEnemy(run.world, boss, { amount: 1e6, crit: false }, 'test'); step(run);
  assertEqual(run.ledger.items.length, 1);
  assertEqual(run.record.potions, Math.min(POTION.max, potions + 1));
  assertTrue(!run.world.pickups.some((p) => p.kind === 'item'));
});

test('adventure: ein Boss, der außerhalb des Kampfes fällt, zählt trotzdem als besiegt', () => {
  const run = setup({ campfire: 'k1_bruecke' });
  put(run, 300, 0); step(run, 2);
  const boss = run.world.enemies.find((e) => e.type === 'hauptmann_graete');
  assertTrue(!!boss && !run.activeBoss);
  damageEnemy(run.world, boss, { amount: 1e6, crit: false }, 'test'); step(run);
  assertEqual(run.record.bosses, ['graete']);
});

// ---------------------------------------------------------------- Etappe 2: Unterklassen in der Regelschicht

/** Erfahrung bis knapp unter Level 10. */
function xpTo(level) { let n = 0; for (let l = 1; l < level; l++) n += 70 + 50 * (l - 1); return n; }

test('adventure: subclassAvailable genau einmal beim Erreichen von Level 10 ohne Unterklasse', () => {
  const run = setup({ mutate: (a) => { a.xp = 0; } });
  const events = [];
  run.record.level = 9; run.record.skillPoints = 8; run.record.xp = xpTo(10) - xpTo(9) - 1;
  const rat = spawnEnemyAt(run, 'ratte');
  killAll(run, [rat]);
  step(run, 1);
  events.push(...run.events);
  for (let i = 0; i < 5; i++) { killAll(run, [spawnEnemyAt(run, 'ratte')]); step(run, 1); events.push(...run.events); }
  assertEqual(run.record.level, 10);
  assertEqual(events.filter((e) => e.type === 'subclassAvailable').length, 1);
});

test('adventure: Klauen-Gold landet im Ledger (gedeckelt), Dauer-Boni und Lebensraub wirken in der Welt', () => {
  const run = setup({ cls: 'dieb', mutate: (a) => {
    Object.assign(a, { level: 12, skillPoints: 0, subclass: 'taschendieb', abilities: { wurfdolche: 1, langefinger: 3 }, buttons: ['langefinger', null, null] });
  } });
  assertTrue(useAbility(run, 0));
  const target = spawnEnemyAt(run, 'ratte', 1e4);
  const before = run.ledger.gold;
  for (let i = 0; i < 300; i++) { damageEnemy(run.world, target, { amount: 1, crit: false }, 'wurfdolche'); step(run, 1); }
  assertEqual(run.ledger.gold - before, 30);
  const k = setup({ mutate: (a) => { Object.assign(a, { level: 12, skillPoints: 0, subclass: 'kneipenschlaeger', passives: { zapfhahn: 2 } }); } });
  assertClose(k.world.lifesteal, 0.04);
  const t = setup({ mutate: (a) => { Object.assign(a, { level: 12, skillPoints: 0, subclass: 'tuersteher', passives: { kreuzbreiter: 3 } }); } });
  assertEqual(t.world.abilityMods.specials, [{ special: 'shieldPct', value: 0.15000000000000002, shape: 'shield' }]);
});

test('adventure: nach Tod, Kartenwechsel und Rasten keine Fallen, Begleiter, Schild, Stärkungen oder Unsichtbarkeit', () => {
  const dirty = (run) => {
    const w = run.world;
    w.traps.push({ abilityId: 'baerenfalle', x: 0, z: 0, radius: 1, damage: 1, stun: 1, until: 99 });
    w.followers.push({ kind: 'pet', abilityId: 'erdmaennchen', x: 0, z: 0, until: 99 });
    w.hero.shield = { hp: 50, until: 99 };
    w.hero.stealthUntil = 99;
    w.hero.steal = { until: 99, chance: 1, min: 1, max: 1, cap: 30, given: 0 };
    w.hero.buffs.push({ abilityId: 'roteruebe', modifiers: [], timeLeft: 99, rage: 0.6 });
  };
  const clean = (run, why) => {
    const w = run.world, h = w.hero;
    assertEqual([w.traps.length, w.followers.length, h.shield, h.stealthUntil > w.time, h.steal, h.buffs.length], [0, 0, null, false, null, 0], why);
  };
  const run = setup();
  dirty(run);
  run.world.hero.hp = 0;
  step(run, Math.ceil(DEATH.seconds * 30) + 5);
  clean(run, 'Tod');
  dirty(run);
  rest(run, 'k1_ufer');
  clean(run, 'Rasten');
  dirty(run);
  const exit = run.map.exits[0];
  put(run, exit.x, exit.z);
  step(run, 1);
  clean(run, 'Kartenwechsel');
});

function spawnEnemyAt(run, type, hpMul = 1) {
  const h = run.world.hero;
  const e = spawnEnemy(run.world, type, h.x + 30, h.z + 30, { hpMul });
  e.passive = true;
  return e;
}

// ---------------------------------------------------------------- Kleinigkeiten nach Etappe 2

test('adventure: in der Sterbephase sind Besonderheiten sofort weg (Heiltopf hebt das Leben nicht über 0)', () => {
  const run = setup();
  const w = run.world;
  w.zones.push({ abilityId: 'eintopf', x: w.hero.x, z: w.hero.z, radius: 3, delayLeft: 0, timeLeft: 9, landed: true, damage: 0, tickDamage: 0, tickInterval: 0.5, tickLeft: 0, confuse: 0, healPct: 0.5 });
  w.followers.push({ kind: 'pet', abilityId: 'erdmaennchen', x: 0, z: 0, until: 99 });
  w.hero.hp = -100;
  step(run, 3);
  assertEqual(run.state, 'dying');
  assertEqual([w.zones.length, w.followers.length], [0, 0]);
  assertTrue(w.hero.hp <= 0);
});

test('adventure: clearSignaturesAction räumt laufende Besonderheiten (nach dem Umlernen)', () => {
  const run = setup();
  run.world.traps.push({ abilityId: 'baerenfalle', x: 0, z: 0, radius: 1, damage: 1, stun: 1, until: 99 });
  run.world.hero.shield = { hp: 5, until: 99 };
  clearSignaturesAction(run);
  assertEqual([run.world.traps.length, run.world.hero.shield], [0, null]);
});

test('adventure: Held ab Level 10 ohne Unterklasse bekommt beim Start einmal die Meldung', () => {
  const run = setup({ mutate: (a) => { a.level = 12; a.skillPoints = 11; } });
  step(run, 1);
  const all = [...run.events];
  step(run, 1);
  all.push(...run.events);
  assertEqual(all.filter((e) => e.type === 'subclassAvailable').length, 1);
  const chosen = setup({ mutate: (a) => { a.level = 12; a.skillPoints = 11; a.subclass = 'tuersteher'; } });
  step(chosen, 1);
  assertEqual(chosen.events.filter((e) => e.type === 'subclassAvailable').length, 0);
});

test('adventure: neue Erkundung markiert den Lauf zum Speichern', () => {
  const run = setup();
  run.dirty = false;
  put(run, run.world.hero.x + 30, run.world.hero.z);
  step(run, 1);
  assertTrue(run.dirty);
});

test('adventure: Reisen zählt als Rasten', () => {
  const run = setup({ mutate: (a) => { a.campfires.push('k1_bruecke'); } });
  const before = run.ledger.rests;
  assertTrue(travel(run, 'k1_bruecke'));
  assertEqual(run.ledger.rests, before + 1);
});

test('adventure: Ausgang in den Sumpf erst nach Kapitel 1 – unsichtbar und unbenutzbar davor', async () => {
  const { exitOpen } = await import('../src/modes/adventure.js');
  const closed = setup({ map: 'dorf', campfire: 'dorf_platz' });
  const exit = closed.map.exits.find((x) => x.id === 'nach_kapitel2');
  assertTrue(!exitOpen(closed, exit));
  assertTrue(exitOpen(closed, closed.map.exits.find((x) => x.id === 'nach_kapitel1')));
  put(closed, exit.x, exit.z); step(closed);
  assertEqual(closed.map.id, 'dorf');
  const open = setup({ map: 'dorf', campfire: 'dorf_platz', mutate: (a) => { a.chapterDone = [1]; } });
  assertTrue(exitOpen(open, exit));
  put(open, exit.x, exit.z); step(open);
  assertEqual(open.map.id, 'kapitel2');
  assertTrue(Math.hypot(open.world.hero.x - 6, open.world.hero.z - 3) < 3);
});

test('adventure: alter Stand mit abgeschlossenem Kapitel 1 sieht den Ausgang sofort', async () => {
  const { exitOpen } = await import('../src/modes/adventure.js');
  const { repairSave } = await import('../src/save/adventure.js');
  const save = defaultSave();
  const h = addHero(save, { name: 'Alt', animal: 'hase', class: 'krieger' }, { now: 1, id: 'h1' });
  h.adventure = newAdventure(h);
  h.adventure.chapterDone = [1];
  h.adventure.introSeen = true;
  repairSave(save);
  const run = createAdventureRun({ seed: 3, save, heroId: 'h1' });
  assertEqual(run.map.id, 'dorf');
  assertTrue(exitOpen(run, run.map.exits.find((x) => x.id === 'nach_kapitel2')));
});

test('adventure: Einstiegsgeschichte von Kapitel 2 einmal – solange der erste Auftrag des Kapitels noch am Anfang steht', async () => {
  const { chapterStartDue } = await import('../src/modes/adventure.js');
  const run = setup({ map: 'kapitel2', campfire: 'k2_rand', mutate: (a) => { a.chapterDone = [1]; } });
  assertTrue(!chapterStartDue(run), 'ohne Auftrag nicht');
  run.record.quests.ruf_aus_dem_sumpf = { state: 'active', step: 0, progress: 0 };
  assertTrue(chapterStartDue(run));
  step(run, 2);
  assertEqual(run.record.quests.ruf_aus_dem_sumpf.step, 1, 'Schilfrand erreicht');
  assertTrue(!chapterStartDue(run));
  const k1 = setup();
  assertTrue(!chapterStartDue(k1));
});
