import { test, assertEqual, assertTrue, assertClose } from './runner.js';
import { createWorld, stepWorld, spawnEnemy, enemySpeed, flowAt } from '../src/core/world.js';
import { buildMapGrid, mapTerrain, cellAt, CELL } from '../src/core/mapGrid.js';
import { TERRAIN } from '../src/data/adventure.js';
import { ENEMIES } from '../src/data/enemies.js';

const still = { moveX: 0, moveZ: 0 };

// ---------------------------------------------------------------- Strömung (Task 1)

/** Fluss: erst nach Osten (z = 0), dann ab x = 20 nach Süden; Wasser nördlich bei z = −12, Steg quer bei x = −20. */
const RIVER = {
  id: 'fluss', bounds: { minX: -40, maxX: 40, minZ: -40, maxZ: 40 }, paths: [], clearings: [{ x: 0, z: 0, r: 30 }],
  water: [{ points: [[-30, -12], [30, -12]], width: 6 }], bridges: [], obstacles: [],
  currents: [{ points: [[-30, 0], [20, 0], [20, 30]], width: 8 }],
  boardwalks: [{ points: [[-20, -5], [-20, 5]], width: 3 }],
  gates: [{ id: 'tor', kind: 'barrier', points: [[10, -4], [10, 4]] }],
};

function riverWorld(x, z, { gateClosed = false } = {}) {
  const grid = buildMapGrid(RIVER);
  const w = createWorld({ seed: 3, animalId: 'hase', classId: 'krieger', terrain: mapTerrain(RIVER, grid, () => gateClosed) });
  w.hero.abilities = [];
  w.hero.x = x; w.hero.z = z;
  return w;
}

test('dam: Strömung im Raster mit Richtung je Abschnitt; Steg darüber ohne Schub', () => {
  assertEqual(CELL.current, 5);
  const grid = buildMapGrid(RIVER);
  assertEqual(cellAt(grid, 0, 2), CELL.current);
  assertEqual(cellAt(grid, -20, 0), CELL.bridge);
  const t = mapTerrain(RIVER, grid, () => false);
  assertEqual(t.flowAt(0, 30), null);
  assertEqual(t.flowAt(-20, 0), null);
  const east = t.flowAt(0, 1);
  assertClose(east.x, TERRAIN.currentSpeed); assertClose(east.z, 0);
  const south = t.flowAt(21, 20);
  assertClose(south.x, 0); assertClose(south.z, TERRAIN.currentSpeed);
  assertTrue(t.walkable(0, 1, 'walk'));
  assertEqual(t.speedFactor(0, 1, 'walk'), 1);
  assertEqual(TERRAIN.currentSpeed, 2.5);
});

test('dam: stiller Held treibt mit min(2,5, Tempo − 1) ab', () => {
  const w = riverWorld(-10, 0);
  const speed = w.hero.stats.moveSpeed;
  for (let i = 0; i < 30; i++) stepWorld(w, 1 / 30, still);
  assertClose(w.hero.x + 10, Math.min(2.5, speed - TERRAIN.heroHeadway), 1e-6);
  assertClose(w.hero.z, 0, 1e-9);
});

test('dam: gebremster Held kommt gegen die Strömung mit mindestens 1 m/s voran', () => {
  const w = riverWorld(0, 0);
  w.hero.stats.moveSpeed = 2.2;
  w.hero.slowUntil = 99; w.hero.slowFactor = 0.4; // 1,32 m/s wirksam
  for (let i = 0; i < 60; i++) stepWorld(w, 1 / 60, { moveX: -1, moveZ: 0 });
  assertClose(w.hero.x, -TERRAIN.heroHeadway, 1e-6);
  // noch langsamer als 1 m/s: kein Schub, er kommt mit eigenem Tempo voran
  const v = riverWorld(0, 0);
  v.hero.stats.moveSpeed = 0.8;
  for (let i = 0; i < 60; i++) stepWorld(v, 1 / 60, { moveX: -1, moveZ: 0 });
  assertClose(v.hero.x, -0.8, 1e-6);
});

test('dam: Strömung schiebt nicht durch ein geschlossenes Tor und nicht ins Wasser', () => {
  const w = riverWorld(7, 0, { gateClosed: true });
  for (let i = 0; i < 180; i++) stepWorld(w, 1 / 60, still);
  assertTrue(w.hero.x < 10, `x ${w.hero.x}`);
  const grid = buildMapGrid(RIVER);
  const v = riverWorld(15, 0);
  const e = spawnEnemy(v, 'krebs', 19, 25);
  for (let i = 0; i < 600; i++) stepWorld(v, 1 / 60, still);
  for (const p of [v.hero, e]) assertTrue(cellAt(grid, p.x, p.z) !== CELL.water && cellAt(grid, p.x, p.z) !== CELL.blocked, `${p.x},${p.z}`);
});

test('dam: Flieger und Schwimmer treibt die Strömung nicht ab, Schwimmer sind darin schneller', () => {
  const w = riverWorld(-35, 30);
  const lib = spawnEnemy(w, 'libelle', -10, 0);
  lib.passive = true;
  const krebs = spawnEnemy(w, 'krebs', -12, 2);
  krebs.passive = true;
  stepWorld(w, 1, still);
  assertTrue(Math.abs(lib.x + 10) < 1.5, 'Libelle bleibt (nur eigenes Umherstreifen)');
  assertClose(krebs.x + 12, TERRAIN.currentSpeed * 1, 0.5);
  const fake = { id: 'fisch', ...ENEMIES.helmfisch, swimmer: { speedMul: 1.6 } };
  ENEMIES.__schwimmer = fake;
  try {
    const s = spawnEnemy(w, '__schwimmer', -5, 0);
    s.passive = true;
    assertClose(enemySpeed(w, s), fake.speed * 1.6);
    const x0 = s.x;
    stepWorld(w, 0.5, still);
    assertTrue(Math.abs(s.x - x0) < 0.5, 'nicht geschoben');
    s.x = 0; s.z = 30;
    assertClose(enemySpeed(w, s), fake.speed);
  } finally { delete ENEMIES.__schwimmer; }
});

test('dam: Geschosse fliegen gerade über die Strömung', () => {
  const w = riverWorld(-35, 30);
  w.enemyProjectiles.push({ x: 0, z: -3, dirX: 0, dirZ: 1, speed: 6, radius: 0.3, damage: 1, timeLeft: 2 });
  stepWorld(w, 1, still);
  assertClose(w.enemyProjectiles[0].x, 0); assertClose(w.enemyProjectiles[0].z, 3);
});

test('dam: gedrehte Strömung wirkt nur im Kreis, auch dort mit mindestens 1 m/s Vorankommen', () => {
  const w = riverWorld(-10, 0);
  w.flowTurned = { x: -10, z: 0, r: 5 };
  assertClose(flowAt(w, -10, 0).x, -TERRAIN.currentSpeed);
  assertClose(flowAt(w, 0, 0).x, TERRAIN.currentSpeed);
  assertEqual(flowAt(w, 0, 30), null);
  w.hero.stats.moveSpeed = 1.5;
  for (let i = 0; i < 30; i++) stepWorld(w, 1 / 60, { moveX: 1, moveZ: 0 });
  assertClose(w.hero.x + 10, 0.5 * TERRAIN.heroHeadway, 1e-6);
});

test('dam: Geländequelle ohne flowAt schiebt nichts', () => {
  const w = createWorld({ seed: 3, animalId: 'hase', classId: 'krieger' });
  assertEqual(flowAt(w, 0, 0), null);
});

// ---------------------------------------------------------------- Schleusen und Hebel (Task 3)

/**
 * Testdamm: Weg (0,0)→(80,0), 12 m breit. Schleuse quer bei x = 30 (zu: Weg, offen: Wasser, Hebel bei (10, −4)),
 * Strömungsschleuse bei x = 50 (offen: Strömung nach Süden, zu: Schlamm), Biberschleuse bei x = 70 (zu: Wasser, offen:
 * Weg, sobald „Ruf aus dem Sumpf“ beim zweiten Schritt ist). Das Gebiet heißt wie das erste Sumpf-Ziel.
 */
const DAMM = {
  id: 'testdamm', name: 'Testdamm', chapter: 3, bounds: { minX: -10, maxX: 90, minZ: -30, maxZ: 30 },
  paths: [{ points: [[0, 0], [80, 0]], width: 12 }], clearings: [], water: [], bridges: [], obstacles: [], gates: [],
  sluices: [
    { id: 'td_schleuse', name: 'Testschleuse', lever: { x: 10, z: -4 }, start: 'closed', strips: [{ points: [[30, -6], [30, 6]], width: 10 }], open: 'water', closed: 'walk' },
    { id: 'td_strom', name: 'Strömungsschleuse', lever: { x: 60, z: -4 }, start: 'open', strips: [{ points: [[50, -7], [50, 7]], width: 6 }], open: 'current', closed: 'mud' },
    { id: 'td_biber', name: 'Biberschleuse', start: 'closed', strips: [{ points: [[70, -7], [70, 7]], width: 4 }], open: 'walk', closed: 'water', opensOn: { quest: 'ruf_aus_dem_sumpf', step: 1 } },
  ],
  areas: [{ id: 'schilfrand', name: 'Testdamm', x: 40, z: 0, r: 80 }],
  campfires: [{ id: 'testdamm_feuer', x: 5, z: 0 }], npcs: [], spots: [], chests: [], packs: [], bosses: [],
  exits: [], props: [], start: { campfire: 'testdamm_feuer' },
};

function withDam(fn) {
  return async () => {
    const { MAPS } = await import('../src/data/maps/index.js');
    MAPS.testdamm = DAMM;
    try { await fn(); } finally { delete MAPS.testdamm; }
  };
}

async function damRun(mutate) {
  const { defaultSave, addHero } = await import('../src/save/store.js');
  const { newAdventure } = await import('../src/save/adventure.js');
  const { createAdventureRun } = await import('../src/modes/adventure.js');
  const save = defaultSave();
  const h = addHero(save, { name: 'Hoppel', animal: 'hase', class: 'krieger' }, { now: 1, id: 'h1' });
  h.adventure = newAdventure(h);
  Object.assign(h.adventure, { mapId: 'testdamm', campfireId: 'testdamm_feuer', introSeen: true });
  h.adventure.campfires.push('testdamm_feuer');
  mutate?.(h.adventure);
  const run = createAdventureRun({ seed: 7, save, heroId: 'h1' });
  return { run, save };
}

/** Held an (x,z) stellen, einen Schritt laufen lassen, dann (falls in Reichweite) umlegen. */
async function pull(run, x = 10, z = -2) {
  const { stepAdventure, interact } = await import('../src/modes/adventure.js');
  run.world.hero.x = x; run.world.hero.z = z;
  stepAdventure(run, 1 / 60, still);
  return interact(run);
}

test('dam: Hebel schaltet die Fläche um, zweites Umlegen schaltet zurück; nur in Reichweite', withDam(async () => {
  const { stepAdventure } = await import('../src/modes/adventure.js');
  const { run } = await damRun();
  assertEqual(cellAt(run.grid, 30, 0), CELL.walk);
  run.world.hero.x = 20; run.world.hero.z = 0;
  stepAdventure(run, 1 / 60, still);
  assertEqual(run.interactable, null);
  const version = run.gridVersion ?? 0;
  const r = await pull(run);
  assertEqual([r.kind, r.id, r.state], ['lever', 'td_schleuse', 'open']);
  assertEqual(cellAt(run.grid, 30, 0), CELL.water);
  assertEqual(run.record.switches, { td_schleuse: 'open' });
  assertTrue(run.events.some((e) => e.type === 'sluiceSwitched' && e.id === 'td_schleuse' && e.state === 'open'));
  assertTrue(run.gridVersion > version);
  assertTrue(run.dirty);
  await pull(run);
  assertEqual(cellAt(run.grid, 30, 0), CELL.walk);
  assertEqual(run.record.switches.td_schleuse, 'closed');
}));

test('dam: Schleusen behalten ihren Zustand bei Tod, Reisen und neuem Lauf', withDam(async () => {
  const { stepAdventure, travel, createAdventureRun } = await import('../src/modes/adventure.js');
  const { run, save } = await damRun((rec) => { rec.switches = { td_schleuse: 'open', td_strom: 'closed' }; });
  assertEqual([cellAt(run.grid, 30, 0), cellAt(run.grid, 50, 0)], [CELL.water, CELL.mud]);
  run.world.hero.hp = 0;
  for (let i = 0; i < 200 && run.state !== 'playing' || i < 2; i++) stepAdventure(run, 1 / 30, still);
  assertEqual(run.state, 'playing');
  assertEqual([cellAt(run.grid, 30, 0), cellAt(run.grid, 50, 0)], [CELL.water, CELL.mud]);
  travel(run, 'testdamm_feuer');
  assertEqual(cellAt(run.grid, 30, 0), CELL.water);
  save.heroes[0].adventure = structuredClone(run.record);
  const again = createAdventureRun({ seed: 9, save, heroId: 'h1' });
  assertEqual([cellAt(again.grid, 30, 0), cellAt(again.grid, 50, 0)], [CELL.water, CELL.mud]);
}));

test('dam: die Biberschleuse ohne Hebel öffnet mit ihrer Bedingung und wird nicht gespeichert', withDam(async () => {
  const { stepAdventure, sluiceState } = await import('../src/modes/adventure.js');
  const { run } = await damRun((rec) => { rec.quests.ruf_aus_dem_sumpf = { state: 'active', step: 0, progress: 0 }; });
  assertEqual(sluiceState(run, 'td_biber'), 'closed');
  assertEqual(cellAt(run.grid, 70, 0), CELL.water);
  run.world.hero.x = 20; run.world.hero.z = 0;
  stepAdventure(run, 1 / 60, still); // betritt das Gebiet → Auftrag beim zweiten Schritt
  assertEqual(run.record.quests.ruf_aus_dem_sumpf.step, 1);
  assertEqual(sluiceState(run, 'td_biber'), 'open');
  assertEqual(cellAt(run.grid, 70, 0), CELL.walk);
  assertEqual(run.record.switches.td_biber, undefined);
}));

test('dam: Fluten spült Gegner weg (35 % Schaden, danach begehbar) und setzt den Helden ohne Schaden ans Ufer', withDam(async () => {
  const { interact } = await import('../src/modes/adventure.js');
  const { WASH } = await import('../src/data/adventure.js');
  const { run } = await damRun();
  const e = spawnEnemy(run.world, 'krebs', 31, 2, { hpMul: 10 });
  e.passive = true;
  const hero = run.world.hero;
  hero.x = 29; hero.z = 1;
  hero.hp = hero.stats.maxHp * 0.5;
  const hp = hero.hp;
  run.interactable = { kind: 'lever', id: 'td_schleuse', x: 10, z: -4 };
  interact(run);
  assertClose(e.maxHp - e.hp, Math.max(1, e.maxHp * WASH.enemyPct - ENEMIES.krebs.armor), 1e-6);
  assertTrue(run.world.terrain.walkable(e.x, e.z, 'walk'), `Gegner bei ${e.x},${e.z}`);
  assertEqual(hero.hp, hp);
  const c = cellAt(run.grid, hero.x, hero.z);
  assertTrue(c === CELL.walk, `Held auf Zelle ${c}`);
  assertTrue(Math.hypot(hero.x - 29, hero.z - 1) < 6, `Held bei ${hero.x},${hero.z}`);
  assertTrue(run.events.some((x) => x.type === 'heroWashed'));
}));

test('dam: geflutete Strömung schiebt Gegner in Flussrichtung weg', withDam(async () => {
  const { interact } = await import('../src/modes/adventure.js');
  const { WASH } = await import('../src/data/adventure.js');
  const { run } = await damRun((rec) => { rec.switches = { td_strom: 'closed' }; });
  const e = spawnEnemy(run.world, 'helmfisch', 50, -2, { hpMul: 10 });
  e.passive = true;
  run.world.hero.x = 60; run.world.hero.z = -2;
  run.interactable = { kind: 'lever', id: 'td_strom', x: 60, z: -4 };
  interact(run);
  assertEqual(cellAt(run.grid, 50, 0), CELL.current);
  assertTrue(e.hp < e.maxHp);
  assertTrue(e.z > -2 + WASH.push * 0.5, `z ${e.z}`);
  assertTrue(run.world.terrain.walkable(e.x, e.z, 'walk'));
}));

test('dam: kein Ufer in Reichweite → Held kommt ans Lagerfeuer', withDam(async () => {
  const { rescueHero, nearestShore } = await import('../src/modes/adventure.js');
  const { run } = await damRun((rec) => { rec.switches = { td_schleuse: 'open' }; });
  assertEqual(nearestShore(run, 30, 0, 3), null);
  const s = nearestShore(run, 30, 0);
  assertTrue(Math.abs(s.x - 30) >= 5 && Math.abs(s.x - 30) < 6.5, `${s.x}`);
  run.world.hero.x = 30; run.world.hero.z = 0;
  rescueHero(run, 3);
  assertTrue(Math.hypot(run.world.hero.x - 5, run.world.hero.z) < 2, `${run.world.hero.x},${run.world.hero.z}`);
}));

test('dam: Auftragsschritt „Hebel umlegen“ mit Zielzustand, sofort erfüllt, wenn er schon stimmt; Ziel ist der Hebel', withDam(async () => {
  const { QUESTS } = await import('../src/data/quests.js');
  const { acceptOffer } = await import('../src/modes/adventure.js');
  const { questTarget } = await import('../src/core/quests.js');
  const { MAPS } = await import('../src/data/maps/index.js');
  QUESTS.__hebel = {
    id: '__hebel', chapter: 3, kind: 'side', title: 'Hebel', giver: 'niemand', requires: [],
    steps: [{ type: 'lever', target: 'td_schleuse', state: 'open', map: 'testdamm', text: 'Öffne die Testschleuse' }], reward: { xp: 1, gold: 1 },
  };
  try {
    const { run } = await damRun();
    acceptOffer(run, '__hebel');
    assertEqual(questTarget(run.record.quests, '__hebel', MAPS), { map: 'testdamm', x: 10, z: -4 });
    await pull(run); // öffnet → erledigt
    assertEqual(run.record.quests.__hebel.state, 'done');
    const { run: ready } = await damRun((rec) => { rec.switches = { td_schleuse: 'open' }; });
    acceptOffer(ready, '__hebel');
    assertEqual(ready.record.quests.__hebel.state, 'done');
    const { run: wrong } = await damRun();
    QUESTS.__hebel.steps[0].state = 'closed';
    acceptOffer(wrong, '__hebel');
    assertEqual(wrong.record.quests.__hebel.state, 'done', 'zu ist schon der Ausgangszustand');
  } finally { delete QUESTS.__hebel; }
}));
