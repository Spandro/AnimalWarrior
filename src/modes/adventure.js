import { createWorld, stepWorld, spawnEnemy, recomputeHeroStats } from '../core/world.js';
import { castManual } from '../core/abilities.js';
import { createRng } from '../core/rng.js';
import { buildMapGrid, mapTerrain, decodeExplored, encodeExplored, markExplored, cellAt, CELL } from '../core/mapGrid.js';
import { createBubbles, stepBubbles } from '../core/hazards.js';
import { gainXp, adventureModifiers, enemyMultipliers, abilitySpecials, specialBonus } from '../core/adventureHero.js';
import { talkTo, acceptQuest, questEvent } from '../core/quests.js';
import { rollAdventureItem } from '../core/loot.js';
import { MAPS } from '../data/maps/index.js';
import { QUESTS, QUEST_DROP, CHAPTER_START_QUEST } from '../data/quests.js';
import { CLASSES } from '../data/classes.js';
import { ENEMIES, ELITE } from '../data/enemies.js';
import {
  MANUAL, ADVENTURE_BALANCE, PACK, DEATH, POTION, LOOT, INTERACT_RANGE, EXPLORE_RADIUS, CAMPFIRE_OFFSET, ARENA_INSET,
  SUBCLASS_RULES, BUBBLES,
} from '../data/adventure.js';

/**
 * Regelschicht des Abenteuers (Spec §5–§11). Darstellung und Oberfläche lesen `run`, ändern ihn aber nur über die
 * exportierten Aktionen. Der Lauf ändert den Spielstand nie: Was er verdient, steht im Heldenstand `run.record` und im
 * Ledger `run.ledger`; die Spielschleife überträgt beides mit `commitAdventure`, sobald `run.dirty` gesetzt ist.
 *
 * Ereignisse eines Schritts stehen in `run.events`: alle Welt-Ereignisse und `levelUp`, `abilityUnlocked`,
 * `questAccepted`, `questAdvanced`, `questCompleted`, `questItem`, `loot`, `areaEnter`, `bossStart`, `bossDefeated`,
 * `arenaClosed`, `arenaOpened`, `dying`, `wake`, `rested`, `travel`, `mapChange`, `potion`, `abilityFail`, `chapterDone`,
 * `subclassAvailable` (Level 10 erreicht ohne Unterklasse). Gold aus `stealGold` geht ins Ledger.
 *
 * @typedef {import('../save/adventure.js').AdventureRecord} AdventureRecord
 * @typedef {import('../save/adventure.js').Ledger} Ledger
 * @typedef {import('../data/maps/index.js').MapDef} MapDef
 * @typedef {{ def: MapDef['packs'][number], state: 'idle'|'engaged'|'cleared', ids: Set<number> }} PackState
 * @typedef {{ kind: 'npc'|'campfire'|'spot'|'chest', id: string, x: number, z: number }} Interactable
 * @typedef {{ world: import('../core/world.js').World, map: MapDef, grid: import('../core/mapGrid.js').MapGrid,
 *   save: import('../save/schema.js').Save, heroId: string, hero: import('../save/schema.js').Hero, record: AdventureRecord,
 *   ledger: Ledger & { rests: number }, state: 'playing'|'paused'|'talking'|'menu'|'dying', events: object[], dirty: boolean,
 *   packs: PackState[], activeBoss: { id: string, enemyId: number } | null, explored: Uint8Array, interactable: Interactable|null,
 *   area: string|null, potionLockUntil: number, dyingLeft: number, rng: import('../core/rng.js').Rng, talks: number,
 *   seed: number }} AdventureRun
 *   `save`: der gespeicherte Stand beim Start bzw. nach `refreshFromSave` – nur gelesen (Werte, Gold für den Goldverlust).
 */

const emptyLedger = () => ({ gold: 0, items: [], materials: {}, rests: 0 });

/**
 * Meldet Ereignisse. Im Schritt gehören sie zu `run.events`; aus einer Aktion zwischen zwei Schritten stehen sie sofort in
 * `run.events` und kommen zusätzlich mit dem nächsten Schritt noch einmal (für Darstellung und Ton, die nach Schritten lesen).
 */
function emit(run, ...events) {
  run.events.push(...events);
  if (!run.stepping) run.queued.push(...events);
}

/** Welt-Ereignisse, die seit dem letzten Schritt durch Aktionen entstanden sind (Treffer einer Fähigkeit von Hand). */
function absorbWorldEvents(run) {
  const fresh = run.world.events.slice(run.worldSeen);
  run.worldSeen = run.world.events.length;
  run.events.push(...fresh);
  for (const e of fresh) handleWorldEvent(run, e);
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/**
 * Startet das Abenteuer eines Helden am Lagerfeuer seines Abenteuer-Stands.
 * @param {{ seed: number, save: import('../save/schema.js').Save, heroId: string }} opts
 * @returns {AdventureRun}
 */
export function createAdventureRun({ seed, save, heroId }) {
  const hero = save.heroes.find((h) => h.id === heroId);
  if (!hero?.adventure) throw new Error('Held hat kein Abenteuer');
  const run = {
    seed, save, heroId, hero, record: structuredClone(hero.adventure), ledger: emptyLedger(),
    state: 'playing', events: [], dirty: false, packs: [], activeBoss: null, interactable: null, area: null,
    potionLockUntil: 0, dyingLeft: 0, rng: createRng(seed ^ 0xad7e), talks: 0,
    world: null, map: null, grid: null, explored: null, queued: [], stepping: false, worldSeen: 0,
  };
  enterMap(run, run.record.mapId, run.record.campfireId);
  startNextChapter(run);
  // Helden aus Etappe 1, die schon Level 10 haben, erfahren so von der Wahl.
  if (!run.record.subclass && run.record.level >= SUBCLASS_RULES.chooseLevel) emit(run, { type: 'subclassAvailable' });
  return run;
}

/** Übernimmt nach Händler, Schmied oder Ausrüstung den gespeicherten Stand (Werte, Knöpfe, Tränke). */
export function refreshFromSave(run, save) {
  run.save = save;
  run.hero = save.heroes.find((h) => h.id === run.heroId);
  run.record = structuredClone(run.hero.adventure);
  applyHeroSetup(run, false);
}

/** Kartenwechsel: Welt, Raster, Gruppen und Erkundung neu, Held am Lagerfeuer `campfireId` mit vollem Leben. */
function enterMap(run, mapId, campfireId) {
  if (run.map && run.explored) run.record.explored[run.map.id] = encodeExplored(run.explored);
  const map = MAPS[mapId];
  run.map = map;
  run.grid = buildMapGrid(map);
  run.explored = decodeExplored(run.record.explored[mapId], run.grid);
  run.activeBoss = null;
  run.area = null;
  const world = createWorld({
    seed: run.seed, animalId: run.hero.animal, classId: run.hero.class,
    terrain: mapTerrain(map, run.grid, (id) => isGateClosed(run, id)),
  });
  world.drops = 'none';
  world.contactInterval = ADVENTURE_BALANCE.contactInterval;
  run.world = world;
  run.bubbles = map.hazards?.bubbles ? createBubbles() : null;
  run.bubbleDamage = undefined;
  run.worldSeen = 0;
  applyHeroSetup(run, true);
  placeAtCampfire(run, campfireId);
  resetPacks(run);
}

/** Werte und Fähigkeiten des Helden aus Spielstand und `run.record`; `full`: Leben auffüllen. */
function applyHeroSetup(run, full) {
  const world = run.world, h = world.hero, cls = CLASSES[run.hero.class];
  const cooldowns = new Map(h.abilities.map((a) => [a.id, a.cooldownLeft]));
  h.modifiers = adventureModifiers(run.save, { ...run.hero, adventure: run.record });
  world.abilityMods = { ...MANUAL, specials: abilitySpecials(run.record) };
  world.lifesteal = specialBonus(run.record, 'lifesteal');
  h.abilities = [
    { id: cls.startAbility, level: run.record.abilities[cls.startAbility] ?? 1, cooldownLeft: 0, gate: 'engage' },
    ...run.record.buttons.filter(Boolean).map((id) => ({ id, level: run.record.abilities[id], cooldownLeft: cooldowns.get(id) ?? 0, manual: true })),
  ];
  recomputeHeroStats(world);
  if (full) h.hp = h.stats.maxHp;
}

function placeAtCampfire(run, campfireId) {
  const fire = run.map.campfires.find((c) => c.id === campfireId) ?? run.map.campfires[0];
  const h = run.world.hero;
  const spots = [[CAMPFIRE_OFFSET, 0], [-CAMPFIRE_OFFSET, 0], [0, CAMPFIRE_OFFSET], [0, -CAMPFIRE_OFFSET]];
  const ok = spots.find(([dx, dz]) => run.world.terrain.walkable(fire.x + dx, fire.z + dz, 'walk')) ?? [0, 0];
  h.x = fire.x + ok[0]; h.z = fire.z + ok[1];
}

/**
 * Beim Rasten verschwinden alle laufenden Besonderheiten (Fallen, Begleiter, Schild, Unsichtbarkeit, Klauen, Stärkungen).
 * Tod und Kartenwechsel legen ohnehin eine neue Welt an.
 */
function clearSignatures(world) {
  const h = world.hero;
  world.traps = [];
  world.followers = [];
  world.zones = [];
  world.summons = [];
  h.shield = null;
  h.stealthUntil = 0;
  h.steal = null;
  h.buffs = [];
  recomputeHeroStats(world);
}

/**
 * Aktion für die Oberfläche: laufende Besonderheiten wegräumen (nach dem Umlernen).
 * @param {AdventureRun} run
 */
export function clearSignaturesAction(run) {
  clearSignatures(run.world);
}

/** Alle Gruppen wieder da (Rasten, Tod, neue Karte); Bosskämpfe von vorn. */
function resetPacks(run) {
  run.world.enemies = [];
  run.world.enemyProjectiles = [];
  run.packs = run.map.packs.map((def) => ({ def, state: 'idle', ids: new Set(), spawned: false }));
  run.activeBoss = null;
}

/**
 * Ist ein Tor geschlossen? Arena-Tore nur im Bosskampf; Sperren, bis ihre Bedingung erfüllt ist.
 * @param {AdventureRun} run
 * @param {string} gateId
 */
export function isGateClosed(run, gateId) {
  const gate = run.map.gates.find((g) => g.id === gateId);
  if (!gate) return false;
  if (gate.kind === 'arena') return run.activeBoss !== null && run.map.bosses.some((b) => b.gate === gateId && b.id === run.activeBoss.id);
  const on = gate.opensOn;
  if (!on) return true;
  if ('boss' in on) return !run.record.bosses.includes(on.boss);
  const q = run.record.quests[on.quest];
  return !(q && (q.state === 'done' || q.step >= on.step));
}

/**
 * Ist ein Ausgang offen? Einer mit `requires.chapterDone` erst, wenn das Kapitel abgeschlossen ist (die Darstellung zeigt
 * nur offene Ausgänge).
 * @param {AdventureRun} run
 * @param {MapDef['exits'][number]} exit
 */
export function exitOpen(run, exit) {
  const need = exit.requires?.chapterDone;
  return need === undefined || run.record.chapterDone.includes(need);
}

// ---------------------------------------------------------------- Schritt

/**
 * @param {AdventureRun} run
 * @param {number} dt
 * @param {{ moveX: number, moveZ: number }} input
 */
export function stepAdventure(run, dt, input) {
  run.events = run.queued;
  run.queued = [];
  run.stepping = true;
  try {
    absorbWorldEvents(run);
    if (run.state === 'dying') stepDying(run, dt);
    else if (run.state === 'playing') stepPlaying(run, dt, input);
  } finally {
    run.stepping = false;
  }
}

function stepPlaying(run, dt, input) {
  const world = run.world;
  const full = run.record.potions >= POTION.max;
  for (const p of world.pickups) if (p.kind === 'potion_item') p.locked = full;
  stepWorld(world, dt, input);
  if (run.bubbles) stepBubbles(world, run.bubbles, bubbleRules(run), dt);
  run.worldSeen = world.events.length;
  run.events.push(...world.events);
  for (const e of world.events) handleWorldEvent(run, e);
  bankGold(run);
  updatePacks(run);
  updateBosses(run);
  updateArea(run);
  if (markExplored(run.explored, run.grid, world.hero.x, world.hero.z, EXPLORE_RADIUS)) { run.exploredChanged = true; run.dirty = true; }
  run.interactable = findInteractable(run);
  if (world.hero.hp <= 0) {
    clearSignatures(world);
    run.state = 'dying';
    run.dyingLeft = DEATH.seconds;
    emit(run, { type: 'dying' });
    return;
  }
  const exit = run.map.exits.find((x) => exitOpen(run, x) && dist(x, world.hero) <= x.r);
  if (exit) {
    enterMap(run, exit.to.map, exit.to.campfire);
    emit(run, { type: 'mapChange', map: exit.to.map });
    run.dirty = true;
  }
}

function stepDying(run, dt) {
  stepWorld(run.world, dt, { moveX: 0, moveZ: 0 }, { inert: true });
  run.worldSeen = run.world.events.length;
  run.dyingLeft -= dt;
  if (run.dyingLeft > 0) return;
  const loss = Math.min(DEATH.goldMax, Math.floor(DEATH.goldPct * Math.max(0, run.save.gold + run.ledger.gold)));
  run.ledger.gold -= loss;
  enterMap(run, run.record.mapId, run.record.campfireId);
  run.state = 'playing';
  emit(run, { type: 'wake', goldLost: loss });
  run.dirty = true;
}

/**
 * Regeln der Moorblasen auf dieser Karte: nur auf Schlamm, nie nah an einem Lagerfeuer, nie in einer Bossarena außer
 * einer mit `bubbleArena` (auch nicht mit dem Rand der Blase); Gegner-Schaden nach der Stufe der Karte.
 */
function bubbleRules(run) {
  const map = run.map;
  run.bubbleDamage ??= BUBBLES.enemyShare * ENEMIES.ochsenfrosch.hp * enemyMultipliers(map.hazards.bubbles.level).hpMul;
  return {
    isMud: (x, z) => cellAt(run.grid, x, z) === CELL.mud,
    forbidden: (x, z) => map.campfires.some((c) => Math.hypot(c.x - x, c.z - z) < BUBBLES.campfireClear)
      || map.bosses.some((b) => !b.bubbleArena && Math.hypot(b.arena.x - x, b.arena.z - z) < b.arena.r + BUBBLES.radius),
    enemyDamage: run.bubbleDamage,
  };
}

/** Gold aus aufgesammelten Münzen ins Ledger. */
function bankGold(run) {
  const w = run.world;
  if (w.run.gold > 0) { run.ledger.gold += Math.round(w.run.gold); w.run.gold = 0; run.dirty = true; }
}

function handleWorldEvent(run, e) {
  if (e.type === 'kill') onKill(run, e);
  else if (e.type === 'pickup') onPickup(run, e);
  else if (e.type === 'stealGold') { run.ledger.gold += e.value; run.dirty = true; }
}

function grantXp(run, amount) {
  if (amount > 0) run.dirty = true;
  const before = run.record.level;
  const r = gainXp(run.record, amount * run.world.hero.stats.xpGain, run.hero.class);
  if (r.levels > 0) {
    applyHeroSetup(run, true);
    emit(run, { type: 'levelUp', level: run.record.level });
    for (const id of r.unlocked) emit(run, { type: 'abilityUnlocked', abilityId: id });
    const at = SUBCLASS_RULES.chooseLevel;
    if (!run.record.subclass && before < at && run.record.level >= at) emit(run, { type: 'subclassAvailable' });
    run.dirty = true;
  }
}

function drop(run, x, z, kind, value, ref) {
  const a = run.rng.range(0, Math.PI * 2), d = run.rng.range(0.3, 1.2);
  run.world.pickups.push({ kind, x: x + Math.cos(a) * d, z: z + Math.sin(a) * d, value, ref });
}

function onKill(run, e) {
  const def = ENEMIES[e.enemyType];
  const pack = e.packId ? run.packs.find((p) => p.def.id === e.packId) : null;
  const bossDef = e.bossId ? run.map.bosses.find((b) => b.id === e.bossId) : null;
  const level = bossDef?.level ?? pack?.def.level ?? 1;
  grantXp(run, def.xp * (e.elite ? ELITE.xpMul : 1) * enemyMultipliers(level).xpMul);
  quest(run, { type: 'kill', enemyType: e.enemyType });
  for (const [id, entry] of Object.entries(run.record.quests)) {
    const step = entry.state === 'active' ? QUESTS[id].steps[entry.step] : null;
    if (step?.type === 'collect' && Array.isArray(step.from) && step.from.includes(e.enemyType) && run.rng.chance(QUEST_DROP)) {
      run.record.questItems[step.target] = (run.record.questItems[step.target] ?? 0) + 1;
      emit(run, { type: 'questItem', thing: step.target, x: e.x, z: e.z });
      quest(run, { type: 'collect', thing: step.target });
    }
  }
  if (pack) pack.ids.delete(e.id);
  if (bossDef) { onBossDefeated(run, bossDef, e); return; }
  if (run.rng.chance(LOOT.goldChance)) drop(run, e.x, e.z, 'gold', run.rng.int(LOOT.gold[0], LOOT.gold[1]));
  if (run.rng.chance(LOOT.potionChance)) drop(run, e.x, e.z, 'potion_item', 1);
  const itemChance = (e.elite ? LOOT.eliteChance : LOOT.enemyChance) * (e.doubleLoot ? 2 : 1) * (1 + specialBonus(run.record, 'lootChance'));
  if (run.rng.chance(itemChance)) drop(run, e.x, e.z, 'item', 0, rollAdventureItem(run.rng, chapterSource(run)));
  if (e.elite && run.rng.chance(LOOT.elitePearlChance)) drop(run, e.x, e.z, 'material', 1, 'flussperle');
}

function chapterSource(run) {
  return `kapitel${Math.max(1, run.map.chapter)}`;
}

function onPickup(run, e) {
  if (e.kind === 'potion_item') { run.record.potions = Math.min(POTION.max, run.record.potions + 1); emit(run, { type: 'loot', kind: 'potion' }); }
  else if (e.kind === 'item') { run.ledger.items.push(e.ref); emit(run, { type: 'loot', kind: 'item', itemId: e.ref }); }
  else if (e.kind === 'material') { run.ledger.materials[e.ref] = (run.ledger.materials[e.ref] ?? 0) + e.value; emit(run, { type: 'loot', kind: 'material', id: e.ref }); }
  else return;
  run.dirty = true;
}

function onBossDefeated(run, bossDef, e) {
  run.record.bosses.push(bossDef.id);
  run.activeBoss = null;
  emit(run, { type: 'bossDefeated', bossId: bossDef.id, name: ENEMIES[bossDef.type].name }, { type: 'arenaOpened', gate: bossDef.gate });
  // Sichere Bossbeute direkt gutschreiben: ein liegengelassener Gegenstand wäre nach Tod oder Reise für immer weg.
  const item = rollAdventureItem(run.rng, chapterSource(run), LOOT.bossMinRarity);
  run.ledger.items.push(item);
  run.record.potions = Math.min(POTION.max, run.record.potions + 1);
  emit(run, { type: 'loot', kind: 'item', itemId: item }, { type: 'loot', kind: 'potion' });
  const pearls = LOOT.bossPearls[bossDef.id] ?? 0;
  if (pearls) { run.ledger.materials.flussperle = (run.ledger.materials.flussperle ?? 0) + pearls; emit(run, { type: 'loot', kind: 'material', id: 'flussperle', count: pearls }); }
  quest(run, { type: 'boss', bossId: bossDef.id });
  run.dirty = true;
}

/**
 * Ist ein Kapitel abgeschlossen, gibt Oma gleich den ersten Auftrag des nächsten mit (sofern es gebaut ist). So läuft beim
 * ersten Betreten die Einstiegsgeschichte, und der Auftrag zeigt den Weg; auch alte Stände bekommen ihn beim Start.
 */
function startNextChapter(run) {
  for (const [ch, id] of Object.entries(CHAPTER_START_QUEST)) {
    if (!run.record.chapterDone.includes(Number(ch) - 1) || run.record.quests[id]) continue;
    acceptOffer(run, id);
  }
}

/** Ein Auftragsereignis: Fortschritt, Abschluss mit Belohnung genau einmal. */
function quest(run, event) {
  const r = questEvent(run.record.quests, event);
  if (r.changed) run.dirty = true;
  for (const id of r.advanced) { emit(run, { type: 'questAdvanced', questId: id }); run.dirty = true; }
  for (const id of r.completed) completeQuest(run, id);
  if (r.advanced.length) skipBeatenBosses(run);
}

/** Ein Bossschritt, dessen Boss schon besiegt ist (vor dem Auftrag), gilt sofort als erledigt. */
function skipBeatenBosses(run) {
  for (const [id, e] of Object.entries(run.record.quests)) {
    const s = e.state === 'active' ? QUESTS[id].steps[e.step] : null;
    if (s?.type === 'boss' && run.record.bosses.includes(s.target)) { quest(run, { type: 'boss', bossId: s.target }); return; }
  }
}

function completeQuest(run, id) {
  const q = QUESTS[id], reward = q.reward;
  run.ledger.gold += reward.gold;
  if (reward.item) run.ledger.items.push(reward.item);
  if (reward.potions) run.record.potions = Math.min(POTION.max, run.record.potions + reward.potions);
  if (q.unlocks && !run.record.unlocked.includes(q.unlocks)) run.record.unlocked.push(q.unlocks);
  if (run.record.trackedQuest === id) run.record.trackedQuest = null;
  emit(run, { type: 'questCompleted', questId: id, reward });
  if (q.endsChapter && !run.record.chapterDone.includes(q.endsChapter)) {
    run.record.chapterDone.push(q.endsChapter);
    emit(run, { type: 'chapterDone', chapter: q.endsChapter });
    startNextChapter(run);
  }
  run.dirty = true;
  grantXp(run, reward.xp / run.world.hero.stats.xpGain);
}

// ---------------------------------------------------------------- Gruppen, Bosse, Gebiete

function updatePacks(run) {
  const world = run.world, hero = world.hero;
  for (const p of run.packs) {
    if (p.state === 'cleared') continue;
    const d = dist(p.def, hero);
    if (!p.spawned) {
      if (d < PACK.active) spawnPack(run, p);
      continue;
    }
    const members = world.enemies.filter((e) => p.ids.has(e.id));
    if (members.length === 0) { p.state = 'cleared'; p.spawned = false; continue; }
    if (p.state === 'idle') {
      if (d > PACK.active + PACK.despawnPad) {
        world.enemies = world.enemies.filter((e) => !p.ids.has(e.id));
        p.ids.clear(); p.spawned = false;
        continue;
      }
      if (members.some((e) => dist(e, hero) < PACK.aggro || e.hp < e.maxHp)) {
        p.state = 'engaged';
        for (const e of members) e.passive = false;
      }
    } else if (d > PACK.leash) {
      p.state = 'idle';
      for (const e of members) { e.passive = true; e.hp = e.maxHp; }
    }
  }
}

function spawnPack(run, p) {
  const m = enemyMultipliers(p.def.level);
  const types = Object.entries(p.def.enemies).flatMap(([t, n]) => Array(n).fill(t));
  let eliteLeft = p.def.elite ? 1 : 0;
  types.forEach((type, i) => {
    const a = (i / types.length) * Math.PI * 2;
    let x = p.def.x + Math.cos(a) * PACK.spread, z = p.def.z + Math.sin(a) * PACK.spread;
    if (!run.world.terrain.walkable(x, z, ENEMIES[type].flying ? 'fly' : 'walk')) { x = p.def.x; z = p.def.z; }
    const elite = eliteLeft > 0 && type === p.def.elite;
    if (elite) eliteLeft--;
    const e = spawnEnemy(run.world, type, x, z, { elite, hpMul: m.hpMul, dmgMul: m.dmgMul });
    if (!e) return;
    e.passive = true; e.packId = p.def.id; e.home = { x: p.def.x, z: p.def.z, r: PACK.wanderRadius };
    p.ids.add(e.id);
  });
  p.spawned = true;
  p.state = 'idle';
}

function updateBosses(run) {
  const world = run.world, hero = world.hero;
  for (const b of run.map.bosses) {
    if (run.record.bosses.includes(b.id)) continue;
    let enemy = world.enemies.find((e) => e.bossId === b.id);
    const d = dist(b, hero);
    if (!enemy && d < PACK.active) {
      const m = enemyMultipliers(b.level);
      enemy = spawnEnemy(world, b.type, b.x, b.z, { hpMul: m.hpMul, dmgMul: m.dmgMul });
      enemy.bossId = b.id; enemy.passive = true; enemy.home = { x: b.x, z: b.z, r: 1 };
      enemy.summonHpMul = enemyMultipliers(b.level).hpMul; enemy.summonDmgMul = enemyMultipliers(b.level).dmgMul;
    }
    if (enemy && !run.activeBoss && dist(hero, b.arena) < b.arena.r - ARENA_INSET) {
      run.activeBoss = { id: b.id, enemyId: enemy.id };
      // Das Tor schließt erst, wenn der Held nicht mehr darin steht.
      if (!world.terrain.walkable(hero.x, hero.z, 'walk')) { run.activeBoss = null; continue; }
      enemy.passive = false;
      emit(run, { type: 'bossStart', bossId: b.id, name: ENEMIES[b.type].name }, { type: 'arenaClosed', gate: b.gate });
    }
  }
}

/** Kleinstes Gebiet, dessen Kreis den Helden enthält; beim Wechsel `areaEnter` und Auftragsereignis `reach`. */
function updateArea(run) {
  const h = run.world.hero;
  const inside = run.map.areas.filter((a) => dist(a, h) <= a.r).sort((a, b) => a.r - b.r)[0] ?? null;
  const id = inside?.id ?? null;
  if (id === run.area) return;
  run.area = id;
  if (!inside) return;
  emit(run, { type: 'areaEnter', areaId: id, name: inside.name });
  quest(run, { type: 'reach', place: id });
}

// ---------------------------------------------------------------- Aktionen

/** Fundort gehört zu einem laufenden Sammelschritt und ist noch nicht benutzt. */
function spotUseful(run, spot) {
  if (run.record.found.includes(spot.id)) return false;
  return Object.entries(run.record.quests).some(([id, e]) => {
    const s = e.state === 'active' ? QUESTS[id].steps[e.step] : null;
    return s?.type === 'collect' && s.from === 'spot' && s.target === spot.kind;
  });
}

function findInteractable(run) {
  const h = run.world.hero, m = run.map;
  const all = [
    ...m.npcs.map((n) => ({ kind: 'npc', id: n.id, x: n.x, z: n.z })),
    ...m.campfires.map((c) => ({ kind: 'campfire', id: c.id, x: c.x, z: c.z })),
    ...m.spots.filter((s) => spotUseful(run, s)).map((s) => ({ kind: 'spot', id: s.id, x: s.x, z: s.z })),
    ...m.chests.filter((c) => !run.record.chests.includes(c.id)).map((c) => ({ kind: 'chest', id: c.id, x: c.x, z: c.z })),
  ].filter((o) => dist(o, h) <= INTERACT_RANGE).sort((a, b) => dist(a, h) - dist(b, h));
  return all[0] ?? null;
}

/**
 * Sprechen, Rasten, Untersuchen, Öffnen am nächsten Ziel in Reichweite. Nur im Zustand `playing`.
 * Gespräche setzen `talking` (Ende mit {@link endTalk}), Lagerfeuer `menu` (Ende mit {@link closeMenu} oder {@link travel}).
 * @param {AdventureRun} run
 * @returns {object|null}
 */
export function interact(run) {
  if (run.state !== 'playing' || !run.interactable) return null;
  const t = run.interactable;
  if (t.kind === 'npc') return talk(run, t.id);
  if (t.kind === 'campfire') {
    rest(run, t.id);
    run.state = 'menu';
    return { kind: 'campfire', id: t.id, destinations: travelTargets(run) };
  }
  if (t.kind === 'spot') {
    const spot = run.map.spots.find((s) => s.id === t.id);
    run.record.found.push(spot.id);
    run.record.questItems[spot.kind] = (run.record.questItems[spot.kind] ?? 0) + 1;
    emit(run, { type: 'questItem', thing: spot.kind, x: spot.x, z: spot.z });
    quest(run, { type: 'collect', thing: spot.kind });
    run.dirty = true;
    return { kind: 'spot', id: spot.id, thing: spot.kind };
  }
  const chest = run.map.chests.find((c) => c.id === t.id);
  run.record.chests.push(chest.id);
  run.ledger.gold += chest.gold;
  const item = chest.item ?? rollAdventureItem(run.rng, chapterSource(run));
  run.ledger.items.push(item);
  if (chest.pearls) run.ledger.materials.flussperle = (run.ledger.materials.flussperle ?? 0) + chest.pearls;
  emit(run, { type: 'loot', kind: 'chest', chestId: chest.id, gold: chest.gold, itemId: item, pearls: chest.pearls ?? 0 });
  run.dirty = true;
  return { kind: 'chest', id: chest.id, gold: chest.gold, itemId: item, pearls: chest.pearls ?? 0 };
}

/** Gespräch: Hauptaufträge werden sofort angenommen, Gesprächsschritte sofort verrechnet. */
function talk(run, npcId) {
  const t = talkTo(run.record.quests, npcId, run.talks++);
  run.state = 'talking';
  if (t.offer && t.autoAccept) acceptOffer(run, t.offer);
  if (t.completes || t.advances) quest(run, { type: 'talk', npc: npcId });
  const shop = npcId === 'kruemel' ? 'merchant' : npcId === 'grabowski' ? 'smith' : null;
  return { kind: 'talk', npc: npcId, ...t, shop: shop && run.record.unlocked.includes(shop) ? shop : null };
}

/** Nimmt einen angebotenen Auftrag an („Mach ich!“). */
export function acceptOffer(run, questId) {
  if (!acceptQuest(run.record.quests, questId)) return false;
  emit(run, { type: 'questAccepted', questId });
  run.dirty = true;
  skipBeatenBosses(run);
  return true;
}

/**
 * Soll beim Betreten dieser Karte die Einstiegsgeschichte ihres Kapitels laufen? Ja, solange der erste Auftrag des
 * Kapitels angenommen ist und noch beim ersten Schritt steht (Spec §5.4; kein eigenes Feld).
 * @param {AdventureRun} run
 */
export function chapterStartDue(run) {
  const id = CHAPTER_START_QUEST[run.map.chapter];
  const q = id ? run.record.quests[id] : null;
  return !!q && q.state === 'active' && q.step === 0;
}

/** Die Bildergeschichte zum Einstieg ist gezeigt (oder übersprungen). */
export function markIntroSeen(run) {
  run.record.introSeen = true;
  run.dirty = true;
}

export function endTalk(run) {
  if (run.state === 'talking') run.state = 'playing';
}

export function closeMenu(run) {
  if (run.state === 'menu') run.state = 'playing';
}

/** Pause an oder aus (nur aus dem Spiel heraus bzw. zurück). */
export function setPaused(run, paused) {
  if (paused && run.state === 'playing') run.state = 'paused';
  else if (!paused && run.state === 'paused') run.state = 'playing';
}

/** Ziele zum Reisen: bekannte Feuer dieses Kapitels und das Dorf. */
function travelTargets(run) {
  const chapterOf = (fireId) => Object.values(MAPS).find((m) => m.campfires.some((c) => c.id === fireId));
  return run.record.campfires.filter((id) => {
    const m = chapterOf(id);
    return m && (m.id === 'dorf' || m.id === run.map.id || run.map.id === 'dorf');
  });
}

/**
 * Rasten am Lagerfeuer: Leben voll, Gruppen wieder da, Feuer bekannt und Ort zum Weiterspielen.
 * @param {AdventureRun} run
 * @param {string} campfireId
 */
export function rest(run, campfireId) {
  if (!run.map.campfires.some((c) => c.id === campfireId)) return false;
  run.record.mapId = run.map.id;
  run.record.campfireId = campfireId;
  if (!run.record.campfires.includes(campfireId)) run.record.campfires.push(campfireId);
  clearSignatures(run.world);
  run.world.hero.hp = run.world.hero.stats.maxHp;
  resetPacks(run);
  if (run.bubbles) run.bubbles.pending = [];
  run.ledger.rests++;
  emit(run, { type: 'rested', campfireId });
  run.dirty = true;
  return true;
}

/**
 * Reisen zu einem bekannten Lagerfeuer (Rastfenster). Zählt als Rasten dort.
 * @param {AdventureRun} run
 * @param {string} campfireId
 */
export function travel(run, campfireId) {
  const map = Object.values(MAPS).find((m) => m.campfires.some((c) => c.id === campfireId));
  if (!map || !run.record.campfires.includes(campfireId)) return false;
  enterMap(run, map.id, campfireId);
  run.record.mapId = map.id;
  run.record.campfireId = campfireId;
  run.state = 'playing';
  run.ledger.rests++;
  emit(run, { type: 'travel', campfireId, map: map.id });
  run.dirty = true;
  return true;
}

/**
 * Fähigkeit auf Knopf `slot` (0–2) auslösen. Scheitert sie (leer, Abklingzeit, kein Ziel), kommt `abilityFail`.
 * @param {AdventureRun} run
 * @param {0|1|2} slot
 */
export function useAbility(run, slot) {
  if (run.state !== 'playing') return false;
  const id = run.record.buttons[slot];
  const ok = !!id && castManual(run.world, id);
  if (!ok) emit(run, { type: 'abilityFail', slot });
  return ok;
}

/** Heiltrank trinken: nicht bei vollem Leben, nicht in der Sperre, nicht ohne Trank. */
export function drinkPotion(run) {
  const h = run.world?.hero;
  if (run.state !== 'playing' || run.record.potions <= 0 || h.hp >= h.stats.maxHp || run.world.time < run.potionLockUntil) return false;
  h.hp = Math.min(h.stats.maxHp, h.hp + h.stats.maxHp * POTION.heal);
  run.record.potions--;
  run.potionLockUntil = run.world.time + POTION.lockSeconds;
  emit(run, { type: 'potion', left: run.record.potions });
  run.dirty = true;
  return true;
}

// ---------------------------------------------------------------- Speichern

/**
 * Stand zum Übertragen (`commitAdventure`): Heldenstand mit aktueller Erkundung und das Ledger.
 * @param {AdventureRun} run
 */
export function snapshot(run) {
  run.record.explored[run.map.id] = encodeExplored(run.explored);
  return { record: run.record, ledger: run.ledger };
}

/** Leert das Ledger nach dem Übertragen. */
export function clearLedger(run) {
  run.ledger = emptyLedger();
}
