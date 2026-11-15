import { test, assertEqual, assertTrue, assertClose } from './runner.js';
import { createBubbles, stepBubbles } from '../src/core/hazards.js';
import { createWorld, stepWorld, spawnEnemy, damageEnemy } from '../src/core/world.js';
import { createAdventureRun, stepAdventure, rest, travel } from '../src/modes/adventure.js';
import { defaultSave, addHero } from '../src/save/store.js';
import { newAdventure } from '../src/save/adventure.js';
import { acceptQuest } from '../src/core/quests.js';
import { enemyMultipliers } from '../src/core/adventureHero.js';
import { BUBBLES } from '../src/data/adventure.js';
import { ENEMIES } from '../src/data/enemies.js';
import { MAPS } from '../src/data/maps/index.js';

const still = { moveX: 0, moveZ: 0 };
const everywhere = { isMud: () => true, forbidden: () => false, enemyDamage: 10 };

function bubbleWorld(seed = 3) {
  const world = createWorld({ seed, animalId: 'hase', classId: 'krieger' });
  world.terrain = { obstaclesNear: () => [], walkable: () => true };
  world.hero.abilities = [];
  world.hero.stats.dodge = 0; world.hero.stats.armor = 0;
  return world;
}

/** Läuft `seconds` s; liefert alle Ereignisse mit Zeit. Leben des Helden wird immer aufgefüllt, wenn `heal`. */
function runBubbles(world, state, opts, seconds, { heal = true } = {}) {
  const out = [];
  for (let i = 0; i < seconds * 30; i++) {
    stepWorld(world, 1 / 30, still);
    stepBubbles(world, state, opts, 1 / 30);
    for (const e of world.events) if (e.type === 'bubbleWarn' || e.type === 'bubblePop') out.push({ ...e, t: world.time });
    if (heal) world.hero.hp = world.hero.stats.maxHp;
  }
  return out;
}

test('hazards: Startwerte der Moorblasen', () => {
  assertEqual(BUBBLES.minInterval, 3); assertEqual(BUBBLES.maxInterval, 5); assertEqual(BUBBLES.range, 14);
  assertEqual(BUBBLES.warn, 1.2); assertEqual(BUBBLES.radius, 1.8); assertEqual(BUBBLES.heroPct, 0.08);
  assertClose(BUBBLES.enemyShare, 2 / 3); assertEqual(BUBBLES.bossMaxPct, 0.05); assertEqual(BUBBLES.campfireClear, 6);
});

test('hazards: Blase kündigt sich an, platzt erst nach der Vorwarnung, im Abstand 3–5 s, im Umkreis 14 m', () => {
  const world = bubbleWorld();
  const ev = runBubbles(world, createBubbles(), everywhere, 40);
  const warns = ev.filter((e) => e.type === 'bubbleWarn'), pops = ev.filter((e) => e.type === 'bubblePop');
  assertTrue(warns.length >= 7 && warns.length <= 14, `warns ${warns.length}`);
  for (let i = 0; i < warns.length; i++) {
    const w = warns[i];
    assertEqual(w.radius, BUBBLES.radius); assertEqual(w.delay, BUBBLES.warn);
    assertTrue(Math.hypot(w.x, w.z) <= BUBBLES.range + 1e-9, 'Umkreis');
    const p = pops[i];
    if (!p) continue;
    assertEqual([p.x, p.z], [w.x, w.z]);
    assertClose(p.t - w.t, BUBBLES.warn, 1 / 30 + 1e-9);
    if (i > 0) assertTrue(w.t - warns[i - 1].t >= 3 - 1e-9 && w.t - warns[i - 1].t <= 5 + 1 / 30 + 1e-9, `Abstand ${w.t - warns[i - 1].t}`);
  }
});

test('hazards: Platzen trifft Held und Gegner im Kreis, niemanden außerhalb', () => {
  const world = bubbleWorld();
  const state = createBubbles();
  state.nextAt = 1e9;
  state.pending.push({ x: 0, z: 0, popAt: 0.5 });
  const inside = spawnEnemy(world, 'dachs', 1.2, 0);
  const outside = spawnEnemy(world, 'dachs', 3.5, 0);
  for (const e of [inside, outside]) e.passive = true;
  const hp = world.hero.hp, max = world.hero.stats.maxHp;
  runBubbles(world, state, { ...everywhere, enemyDamage: 20 }, 1, { heal: false });
  assertClose(world.hero.hp, hp - Math.round(max * BUBBLES.heroPct), 1e-9);
  assertClose(inside.hp, inside.maxHp - 20, 1e-9);
  assertEqual(outside.hp, outside.maxHp);
  assertEqual(state.pending.length, 0);
});

test('hazards: Blasen nur auf Schlamm und nie auf verbotener Fläche', () => {
  const world = bubbleWorld();
  const opts = { isMud: (x) => x > 0, forbidden: (x, z) => z < 0, enemyDamage: 1 };
  const warns = runBubbles(world, createBubbles(), opts, 120).filter((e) => e.type === 'bubbleWarn');
  assertTrue(warns.length > 10, `${warns.length}`);
  assertTrue(warns.every((w) => w.x > 0 && w.z >= 0));
});

test('hazards: ohne passenden Ort in dieser Runde keine Blase, und der Zufall läuft weiter', () => {
  const world = bubbleWorld();
  const warns = runBubbles(world, createBubbles(), { ...everywhere, isMud: () => false }, 30).filter((e) => e.type === 'bubbleWarn');
  assertEqual(warns.length, 0);
});

test('hazards: Boss nimmt höchstens 5 % seines Lebens je Blase', () => {
  const world = bubbleWorld();
  const state = createBubbles();
  state.nextAt = 1e9;
  state.pending.push({ x: 5, z: 0, popAt: 0.2 });
  const boss = spawnEnemy(world, 'hauptmann_graete', 5, 0, { hpMul: 3 });
  boss.passive = true;
  runBubbles(world, state, { ...everywhere, enemyDamage: 1e6 }, 1);
  assertClose(boss.hp, boss.maxHp * (1 - BUBBLES.bossMaxPct), 1e-6);
});

test('hazards: gleicher Seed → gleiche Blasen', () => {
  const a = runBubbles(bubbleWorld(11), createBubbles(), everywhere, 30);
  const b = runBubbles(bubbleWorld(11), createBubbles(), everywhere, 30);
  assertTrue(a.length > 0);
  assertEqual(a, b);
});

test('hazards: Tötung durch eine Blase meldet kill', () => {
  const world = bubbleWorld();
  const state = createBubbles();
  state.nextAt = 1e9;
  state.pending.push({ x: 4, z: 0, popAt: 0.1 });
  const e = spawnEnemy(world, 'ratte', 4, 0);
  e.passive = true;
  let killed = false;
  for (let i = 0; i < 10; i++) {
    stepWorld(world, 1 / 30, still);
    stepBubbles(world, state, { ...everywhere, enemyDamage: 100 }, 1 / 30);
    if (world.events.some((x) => x.type === 'kill' && x.id === e.id)) killed = true;
  }
  assertTrue(killed);
});

// ---------------------------------------------------------------- Regelschicht

/** Testkarte: Schlammweg (0,0)→(80,0), Lagerfeuer bei (5,0), Arena um (60,0) mit Boss. */
function testMap(id, bubbleArena) {
  return {
    id, name: 'Testsumpf', chapter: 2, bounds: { minX: -10, maxX: 90, minZ: -30, maxZ: 30 },
    paths: [{ points: [[0, 0], [80, 0]], width: 12 }], clearings: [{ x: 60, z: 0, r: 12 }], water: [], bridges: [],
    mud: [{ points: [[0, 0], [80, 0]], width: 12 }, { points: [[60, 0], [60, 0.1]], width: 24 }], boardwalks: [],
    obstacles: [], gates: [{ id: `${id}_tor`, kind: 'arena', points: [[47, -6], [47, 6]] }],
    areas: [{ id: `${id}_g`, name: 'Testsumpf', x: 40, z: 0, r: 80 }],
    campfires: [{ id: `${id}_feuer`, x: 5, z: 0 }], npcs: [], spots: [], chests: [], packs: [],
    bosses: [{ id: `${id}_boss`, type: 'hauptmann_graete', level: 2, x: 63, z: 0, arena: { x: 60, z: 0, r: 12 }, gate: `${id}_tor`, ...(bubbleArena ? { bubbleArena: true } : {}) }],
    exits: [], props: [], start: { campfire: `${id}_feuer` }, hazards: { bubbles: { level: 13 } },
  };
}
/** Die Testkarten stehen nur während eines Tests in MAPS (sonst prüfen die Kartentests sie mit). */
function withTestMaps(fn) {
  return () => {
    MAPS.testsumpf = testMap('testsumpf', false);
    MAPS.testsumpf2 = testMap('testsumpf2', true);
    try { fn(); } finally { delete MAPS.testsumpf; delete MAPS.testsumpf2; }
  };
}

function setupRun(map, mutate) {
  const save = defaultSave();
  const h = addHero(save, { name: 'Hoppel', animal: 'hase', class: 'krieger' }, { now: 1, id: 'h1' });
  h.adventure = newAdventure(h);
  h.adventure.mapId = map; h.adventure.campfireId = `${map}_feuer`; h.adventure.introSeen = true;
  h.adventure.campfires.push(`${map}_feuer`);
  mutate?.(h.adventure);
  return createAdventureRun({ seed: 7, save, heroId: 'h1' });
}

function runWarns(run, x, z, seconds) {
  const warns = [];
  for (let i = 0; i < seconds * 30; i++) {
    run.world.hero.x = x; run.world.hero.z = z;
    stepAdventure(run, 1 / 30, still);
    run.world.hero.hp = run.world.hero.stats.maxHp;
    for (const e of run.events) if (e.type === 'bubbleWarn') warns.push(e);
  }
  return warns;
}

test('hazards: Karte ohne hazards hat keine Blasen', () => {
  const save = defaultSave();
  const h = addHero(save, { name: 'Hoppel', animal: 'hase', class: 'krieger' }, { now: 1, id: 'h1' });
  h.adventure = newAdventure(h);
  h.adventure.mapId = 'kapitel1'; h.adventure.campfireId = 'k1_ufer'; h.adventure.introSeen = true;
  const run = createAdventureRun({ seed: 7, save, heroId: 'h1' });
  assertTrue(!run.bubbles);
  let warned = false;
  for (let i = 0; i < 30 * 30; i++) { stepAdventure(run, 1 / 30, still); if (run.events.some((e) => e.type === 'bubbleWarn')) warned = true; }
  assertTrue(!warned);
});

test('hazards: nie im Umkreis eines Lagerfeuers', withTestMaps(() => {
  const run = setupRun('testsumpf');
  const warns = runWarns(run, 9, 0, 120);
  assertTrue(warns.length > 10, `${warns.length}`);
  for (const w of warns) assertTrue(Math.hypot(w.x - 5, w.z) >= BUBBLES.campfireClear, `${w.x},${w.z}`);
}));

test('hazards: nie in einer fremden Bossarena (auch nicht mit dem Rand), wohl aber in der mit bubbleArena', withTestMaps(() => {
  const plain = runWarns(setupRun('testsumpf'), 44, 0, 150);
  assertTrue(plain.length > 10);
  // Auch der Rand der Blase (1,8 m) bleibt aus der fremden Arena heraus.
  for (const w of plain) assertTrue(Math.hypot(w.x - 60, w.z) >= 12 + BUBBLES.radius, `${w.x},${w.z}`);
  const pike = runWarns(setupRun('testsumpf2'), 44, 0, 150);
  assertTrue(pike.some((w) => Math.hypot(w.x - 60, w.z) < 12));
}));

test('hazards: Gegner-Schaden der Regelschicht = 2/3 Ochsenfrosch der Kartenstufe; Tötung zählt für Aufträge', withTestMaps(() => {
  const run = setupRun('testsumpf', (rec) => acceptQuest(rec.quests, 'nasse_pfoten'));
  const expected = BUBBLES.enemyShare * ENEMIES.ochsenfrosch.hp * enemyMultipliers(13).hpMul;
  const e = spawnEnemy(run.world, 'helmfisch', 30, 0, { hpMul: 100 });
  e.passive = true;
  run.bubbles.nextAt = 1e9;
  run.bubbles.pending.push({ x: 30, z: 0, popAt: run.world.time + 0.05 });
  for (let i = 0; i < 5; i++) { run.world.hero.x = 20; run.world.hero.z = 0; stepAdventure(run, 1 / 30, still); }
  assertClose(e.maxHp - e.hp, expected, 1e-6);
  e.hp = 1;
  run.bubbles.pending.push({ x: 30, z: 0, popAt: run.world.time + 0.05 });
  const xp = run.record.xp;
  for (let i = 0; i < 5; i++) { run.world.hero.x = 20; run.world.hero.z = 0; stepAdventure(run, 1 / 30, still); }
  assertTrue(!run.world.enemies.includes(e));
  assertEqual(run.record.quests.nasse_pfoten.progress, 1);
  assertEqual(run.ledger.bubbleKills, 1);
  assertTrue(run.record.xp > xp || run.record.level > 1);
}));

test('hazards: Rasten, Tod und Kartenwechsel leeren angekündigte Blasen', withTestMaps(() => {
  const run = setupRun('testsumpf', (rec) => { rec.campfires.push('dorf_platz'); });
  run.bubbles.pending.push({ x: 30, z: 0, popAt: 99 });
  rest(run, 'testsumpf_feuer');
  assertEqual(run.bubbles.pending.length, 0);
  run.bubbles.pending.push({ x: 30, z: 0, popAt: 99 });
  run.state = 'playing';
  run.world.hero.hp = 0;
  for (let i = 0; i < 60; i++) stepAdventure(run, 1 / 30, still);
  assertEqual(run.state, 'playing');
  assertEqual(run.bubbles.pending.length, 0);
  run.bubbles.pending.push({ x: 30, z: 0, popAt: 99 });
  travel(run, 'dorf_platz');
  assertTrue(!run.bubbles);
}));

test('hazards: Blasen-Schaden zählt nicht als Treffer des Helden – kein Lebensraub, kein Klauen, Markierung sprengt die 5 % nicht', () => {
  const world = bubbleWorld();
  const state = createBubbles();
  state.nextAt = 1e9;
  world.lifesteal = 0.5;
  world.hero.steal = { until: 1e9, chance: 1, min: 5, max: 5, cap: 100, given: 0 };
  world.hero.stats.hpRegen = 0;
  world.hero.hp = world.hero.stats.maxHp / 2;
  const hp = world.hero.hp;
  const e = spawnEnemy(world, 'dachs', 5, 0);
  const boss = spawnEnemy(world, 'hauptmann_graete', 5.5, 0, { hpMul: 3 });
  e.passive = true; boss.passive = true;
  boss.markedUntil = 1e9; boss.markPct = 0.5;
  state.pending.push({ x: 5, z: 0, popAt: 0.2 });
  let stole = false;
  for (let i = 0; i < 30; i++) {
    stepWorld(world, 1 / 30, still);
    stepBubbles(world, state, { ...everywhere, enemyDamage: 1e6 }, 1 / 30);
    if (world.events.some((x) => x.type === 'stealGold')) stole = true;
  }
  assertTrue(!world.enemies.includes(e), 'Dachs besiegt');
  assertTrue(world.hero.hp <= hp, `kein Lebensraub: ${world.hero.hp} > ${hp}`);
  assertTrue(!stole, 'kein Klauen');
  assertClose(boss.hp, boss.maxHp * (1 - BUBBLES.bossMaxPct), 1e-6);
});

test('hazards: Tötung durch Gelände trägt ihre Quelle, eine Fähigkeit nicht und zählt nicht als Blasen-Tötung', () => {
  const w = bubbleWorld();
  const a = spawnEnemy(w, 'helmfisch', 3, 0), b = spawnEnemy(w, 'helmfisch', 6, 0);
  damageEnemy(w, a, { amount: 999, crit: false }, 'moorblase', { environment: true });
  damageEnemy(w, b, { amount: 999, crit: false }, 'schwerthieb');
  const kills = w.events.filter((e) => e.type === 'kill');
  assertEqual(kills.map((k) => k.source), ['moorblase', undefined]);
});
