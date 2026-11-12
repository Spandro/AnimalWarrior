import { test, assertEqual, assertClose, assertTrue } from './runner.js';
import { createSurvivorRun, stepRun, chooseCard, setPaused, setView, getSummary, displayTime, abandonRun } from '../src/modes/survivor.js';
import { spawnRadius, hpMul, BOSS_HP_MUL, MAX_ENEMIES, DEFAULT_VIEW } from '../src/data/waves.js';
import { createWorld, stepWorld, spawnEnemy, damageEnemy } from '../src/core/world.js';
import { obstaclesNear, obstaclesInCell } from '../src/core/terrain.js';
import { ENEMIES, ELITE, DROPS, BOSS } from '../src/data/enemies.js';

const NONE = { moveX: 0, moveZ: 0 };
function clearSeed() {
  for (let s = 1; s < 1000; s++) if (obstaclesNear(s, 0, 0, 16).length === 0) return s;
  throw new Error('kein freier Seed');
}
const SEED = clearSeed();

/** Waschbär-Dieb (keine Rüstung, kein Ausweichen, keine Regeneration) ohne Fähigkeiten. */
function newRun(opts = {}) {
  const run = createSurvivorRun({ seed: SEED, animalId: 'waschbaer', classId: 'dieb', modifiers: [], revive: false, ...opts });
  run.world.hero.abilities = [];
  return run;
}
function immortal(run) {
  run.world.hero.invulnerableUntil = Infinity;
  return run;
}
/** Spielt `seconds` in Schritten von dt und sammelt alle Ereignisse. */
function play(run, seconds, dt = 0.5) {
  const events = [];
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) { stepRun(run, dt, NONE); events.push(...run.events); }
  return events;
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const regular = (w) => w.enemies.filter((e) => !e.elite && !e.boss);
const ofType = (events, type) => events.filter((e) => e.type === type);

test('survivor: spawnRadius liegt knapp außerhalb der Sichtecke', () => {
  assertClose(spawnRadius(10, 6), 14.66, 0.01);
});

test('survivor: nach setView(30, 6) erscheint kein Gegner näher als 33', () => {
  const run = immortal(newRun());
  setView(run, 30, 6);
  assertEqual(run.view, { halfW: 30, halfH: 6 });
  const seen = new Set();
  let count = 0;
  for (let i = 0; i < 150; i++) {
    stepRun(run, 1 / 30, NONE);
    for (const e of run.world.enemies) {
      if (seen.has(e.id)) continue;
      seen.add(e.id); count++;
      assertTrue(dist(e, run.world.hero) >= 33, `Gegner bei Abstand ${dist(e, run.world.hero)}`);
    }
  }
  assertTrue(count >= 5);
});

test('survivor: Standardsicht ist 20 × 12', () => {
  assertEqual(newRun().view, DEFAULT_VIEW);
  assertEqual(DEFAULT_VIEW, { halfW: 20, halfH: 12 });
});

test('survivor: in Minute 0 erscheinen nur Ratten', () => {
  const run = immortal(newRun());
  play(run, 30);
  assertTrue(run.world.enemies.length > 30);
  assertTrue(run.world.enemies.every((e) => e.type === 'ratte'));
});

test('survivor: in Minute 3 auch Wildschweine, keine Krähen', () => {
  const run = immortal(newRun());
  run.world.time = 180;
  play(run, 40);
  const types = new Set(run.world.enemies.map((e) => e.type));
  assertTrue(types.has('ratte') && types.has('wildschwein'));
  assertTrue(!types.has('kraehe'));
});

test('survivor: nach 60 s ohne Tötungen etwa 1,5 × 60 Gegner', () => {
  const run = immortal(newRun());
  play(run, 60);
  assertEqual(run.world.run.kills, 0);
  assertClose(run.world.enemies.length, 1.5 * 60, 2);
});

// Verkürzter Horizont: 600 s Simulation dauern im Browser ~25 s. Ab 840 s (höchste Erscheinungsrate,
// 14,1/s) ist das Limit nach gut 20 s erreicht; danach läuft das Kontingent weiter auf.
test('survivor: Gegnerzahl überschreitet nie 300, auch nach langer Zeit ohne Tötungen', () => {
  const run = immortal(newRun());
  run.world.time = 840;
  for (let i = 0; i < 30; i++) {
    stepRun(run, 1, NONE);
    assertTrue(regular(run.world).length <= MAX_ENEMIES, `${regular(run.world).length} reguläre Gegner`);
  }
  assertEqual(run.world.run.kills, 0);
  // Das Limit zählt alle Gegner; Elite und Bosse dürfen es überschreiten, reguläre Gegner füllen den Rest.
  assertTrue(run.world.enemies.length >= MAX_ENEMIES, 'Limit nie erreicht');
});

test('survivor: am Limit erscheint je 10 aufgestauten Gegnern der nächste mit dreifachem Leben', () => {
  const run = immortal(newRun());
  const w = run.world;
  for (let i = 0; i < MAX_ENEMIES; i++) spawnEnemy(w, 'ratte', 20, 0).speed = 0;
  play(run, 7, 0.1); // 10,5 Gegner Kontingent in Minute 0 → einer mit dreifachem Leben steht an
  assertEqual(w.enemies.length, MAX_ENEMIES);
  w.enemies.pop();
  w.enemies.pop();
  const before = new Set(w.enemies.map((e) => e.id));
  play(run, 2, 0.1);
  const fresh = w.enemies.filter((e) => !before.has(e.id));
  assertEqual(fresh.length, 2);
  assertEqual(fresh.map((e) => e.maxHp), [ENEMIES.ratte.hp * hpMul(0) * 3, ENEMIES.ratte.hp * hpMul(0)]);
});

test('survivor: bei 120 s existiert ein Elite-Gegner mit Typ-hp × hpMul(2) × 8', () => {
  const run = immortal(newRun());
  run.world.time = 119.9;
  stepRun(run, 0.2, NONE);
  const elites = run.world.enemies.filter((e) => e.elite);
  assertEqual(elites.length, 1);
  assertEqual(elites[0].maxHp, ENEMIES[elites[0].type].hp * hpMul(2) * ELITE.hpMul);
});

test('survivor: bei 300 s und 600 s erscheint je ein Bär, der zweite mit 2,5-fachem Leben', () => {
  const run = immortal(newRun());
  const w = run.world;
  w.time = 299.9;
  stepRun(run, 0.2, NONE);
  assertEqual(ofType(run.events, 'bossSpawn'), [{ type: 'bossSpawn', index: 0 }]);
  w.time = 599.9;
  stepRun(run, 0.2, NONE);
  assertEqual(ofType(run.events, 'bossSpawn'), [{ type: 'bossSpawn', index: 1 }]);
  const bears = w.enemies.filter((e) => e.boss);
  assertEqual(bears.map((b) => b.maxHp), [ENEMIES.baer.hp * BOSS_HP_MUL[0], ENEMIES.baer.hp * BOSS_HP_MUL[1]]);
  assertEqual(bears.map((b) => b.type), ['baer', 'baer']);
});

test('survivor: bei 900 s dritter Bär, danach kein weiterer Gegner; sein Tod → won', () => {
  const run = immortal(newRun());
  const w = run.world;
  w.time = 899.9;
  stepRun(run, 0.2, NONE);
  const spawns = ofType(run.events, 'bossSpawn');
  assertEqual(spawns[spawns.length - 1], { type: 'bossSpawn', index: 2 });
  const last = w.enemies.filter((e) => e.boss).find((b) => b.maxHp === ENEMIES.baer.hp * BOSS_HP_MUL[2]);
  assertTrue(!!last);
  const maxId = Math.max(...w.enemies.map((e) => e.id));
  play(run, 20);
  assertTrue(w.enemies.every((e) => e.id <= maxId), 'neue Gegner nach 900 s');
  assertEqual(run.state, 'playing');
  assertEqual(displayTime(run), 900);
  damageEnemy(w, last, { amount: 1e9, crit: false }, 'x');
  stepRun(run, 0.05, NONE);
  assertEqual(run.state, 'won');
  assertEqual(run.cards, null);
  assertEqual(ofType(run.events, 'victory').length, 1);
  const t = w.time;
  stepRun(run, 1, NONE);
  assertEqual(w.time, t);
});

/** Held mit 1 Leben, eine Ratte genau auf ihm. */
function lethalContact(run) {
  run.world.hero.hp = 1;
  spawnEnemy(run.world, 'ratte', run.world.hero.x, run.world.hero.z);
}

test('survivor: Held mit 1 Leben und Ratte in Berührung → lost, Ereignis death', () => {
  const run = newRun();
  lethalContact(run);
  stepRun(run, 0.05, NONE);
  assertEqual(run.state, 'lost');
  assertEqual(ofType(run.events, 'death'), [{ type: 'death' }]);
});

test('survivor: mit revive einmal Wiederbelebung mit halbem Leben, beim zweiten Mal lost', () => {
  const run = newRun({ revive: true });
  const w = run.world;
  assertEqual(w.run.revivesLeft, 1);
  lethalContact(run);
  const rat = w.enemies[w.enemies.length - 1];
  stepRun(run, 1 / 30, NONE); // genau ein Teilschritt
  assertEqual(run.state, 'playing');
  assertEqual(ofType(run.events, 'revive'), [{ type: 'revive' }]);
  assertEqual(ofType(run.events, 'death'), []);
  assertEqual(w.hero.hp, w.hero.stats.maxHp * 0.5);
  assertEqual(w.run.revivesLeft, 0);
  assertClose(w.hero.invulnerableUntil, w.time + 2, 1e-9);
  assertTrue(dist(rat, w.hero) >= 4, 'Ratte wurde nicht weggestoßen');
  w.hero.invulnerableUntil = 0;
  lethalContact(run);
  stepRun(run, 0.05, NONE);
  assertEqual(run.state, 'lost');
  assertEqual(ofType(run.events, 'death').length, 1);
});

test('survivor: 25 xp → zwei Level-ups nacheinander, danach playing', () => {
  const run = immortal(newRun());
  const w = run.world;
  w.run.xp = 25;
  stepRun(run, 0.05, NONE);
  assertEqual(run.state, 'levelup');
  assertEqual(run.cards.length, 3);
  assertEqual(ofType(run.events, 'levelup'), [{ type: 'levelup', level: 2 }]);
  chooseCard(run, 0);
  assertEqual(run.state, 'playing');
  assertEqual(run.cards, null);
  assertEqual(w.run.level, 2);
  stepRun(run, 0.05, NONE);
  assertEqual(run.state, 'levelup');
  assertEqual(ofType(run.events, 'levelup'), [{ type: 'levelup', level: 3 }]);
  chooseCard(run, 2);
  assertEqual(w.run.level, 3);
  stepRun(run, 0.05, NONE);
  assertEqual(run.state, 'playing');
  assertEqual(run.cards, null);
});

test('survivor: Level-up und tödlicher Treffer im selben Schritt → lost, cards null', () => {
  const run = newRun();
  run.world.run.xp = 25;
  lethalContact(run);
  stepRun(run, 0.05, NONE);
  assertEqual(run.state, 'lost');
  assertEqual(run.cards, null);
  assertEqual(ofType(run.events, 'levelup'), []);
});

test('survivor: stepRun in paused und levelup lässt world.time unverändert', () => {
  const run = immortal(newRun());
  const w = run.world;
  stepRun(run, 0.1, NONE);
  setPaused(run, true);
  assertEqual(run.state, 'paused');
  const t = w.time;
  stepRun(run, 1, NONE);
  assertEqual(w.time, t);
  setPaused(run, false);
  assertEqual(run.state, 'playing');
  w.run.xp = 5;
  stepRun(run, 0.1, NONE);
  assertEqual(run.state, 'levelup');
  const t2 = w.time;
  stepRun(run, 1, NONE);
  assertEqual(w.time, t2);
  setPaused(run, true); // nur aus playing
  assertEqual(run.state, 'levelup');
  assertEqual(run.cards.length, 3);
  setPaused(run, false); // nur aus paused
  assertEqual(run.state, 'levelup');
});

test('survivor: chooseCard mit ungültigem Index oder im falschen Zustand ändert nichts', () => {
  const run = immortal(newRun());
  const w = run.world;
  chooseCard(run, 0);
  assertEqual(run.state, 'playing');
  assertEqual(w.run.level, 1);
  w.run.xp = 5;
  stepRun(run, 0.05, NONE);
  const cards = JSON.stringify(run.cards);
  for (const bad of [-1, 3, 1.5, undefined]) {
    chooseCard(run, bad);
    assertEqual(run.state, 'levelup');
    assertEqual(JSON.stringify(run.cards), cards);
    assertEqual(w.run.level, 1);
  }
  chooseCard(run, 0);
  stepRun(run, 0.05, NONE);
  assertEqual(run.state, 'playing');
  setPaused(run, true);
  chooseCard(run, 0); // im Zustand paused keine Karte
  assertEqual(run.state, 'paused');
  assertEqual(w.run.level, 2);
});

test('survivor: getSummary liefert Zeit, Level, Tötungen, Gold und Schaden je Fähigkeit', () => {
  const run = immortal(newRun());
  const w = run.world;
  w.rng = { ...w.rng, chance: () => false };
  play(run, 2);
  const rat = spawnEnemy(w, 'ratte', 15, 0);
  damageEnemy(w, rat, { amount: 2, crit: false }, 'wurfdolche');
  damageEnemy(w, rat, { amount: 10, crit: false }, 'giftflaeche');
  w.run.gold = 7;
  w.run.level = 4;
  assertEqual(getSummary(run), {
    won: false, time: w.time, level: 4, kills: 1, gold: 7, damageByAbility: { wurfdolche: 2, giftflaeche: 10 },
  });
});

test('survivor: Truhe öffnen gibt Karte und Gold, Level bleibt', () => {
  const run = immortal(newRun());
  const w = run.world;
  w.pickups.push({ kind: 'chest', x: 0, z: 0, value: DROPS.chestGold });
  stepRun(run, 0.05, NONE);
  assertEqual(ofType(run.events, 'chest').length, 1);
  assertClose(w.run.gold, DROPS.chestGold * w.hero.stats.goldGain);
  assertEqual(w.run.level, 1);
  assertEqual(run.state, 'playing');
});

test('survivor: timeScale beschleunigt, große dt werden unterteilt', () => {
  const run = immortal(newRun({ timeScale: 4 }));
  stepRun(run, 0.25, NONE);
  assertClose(run.world.time, 1, 1e-9);
  const run2 = immortal(newRun());
  const rat = spawnEnemy(run2.world, 'ratte', 10, 0);
  stepRun(run2, 1, NONE);
  assertClose(run2.world.time, 1, 1e-9);
  assertClose(rat.x, 10 - ENEMIES.ratte.speed, 0.05);
});

test('survivor: zu weit entfernte Gegner kommen auf den Ring, Bosse nicht', () => {
  const run = immortal(newRun());
  const w = run.world;
  const rat = spawnEnemy(w, 'ratte', 60, 0);
  const bear = spawnEnemy(w, 'baer', 0, 60);
  stepRun(run, 1 / 30, NONE);
  assertClose(dist(rat, w.hero), spawnRadius(DEFAULT_VIEW.halfW, DEFAULT_VIEW.halfH), 0.01);
  assertTrue(dist(bear, w.hero) > 55);
});

// --- Gegnerverhalten (direkt über stepWorld) ---

function behaviorWorld(seed = SEED) {
  const w = createWorld({ seed, animalId: 'waschbaer', classId: 'dieb' });
  w.hero.abilities = [];
  return w;
}
function simulate(w, seconds, dt, each) {
  const steps = Math.round(seconds / dt);
  for (let i = 0; i < steps; i++) { stepWorld(w, dt, NONE); if (each) each(); }
}

test('survivor: Kröte bleibt außerhalb von 6 Einheiten und erzeugt ein Geschoss, das trifft', () => {
  const w = behaviorWorld();
  const toad = spawnEnemy(w, 'giftkroete', 3, 0);
  let minD = Infinity, shots = 0, hits = 0;
  simulate(w, 12, 0.05, () => {
    if (w.time > 2) minD = Math.min(minD, dist(toad, w.hero));
    shots = Math.max(shots, w.enemyProjectiles.length);
    hits += ofType(w.events, 'heroHit').length;
  });
  assertTrue(minD > 6, `Kröte kam auf ${minD}`);
  assertTrue(shots >= 1);
  assertTrue(hits >= 1);
  assertTrue(w.hero.hp < w.hero.stats.maxHp);
});

test('survivor: Krötengeschoss verschwindet nach 3 s und wird von Hindernissen aufgehalten', () => {
  const w = behaviorWorld();
  w.enemyProjectiles.push({ x: 0, z: 30, dirX: 1, dirZ: 0, speed: 8, damage: 5, radius: 0.3, timeLeft: 3 });
  simulate(w, 2.9, 0.1);
  assertEqual(w.enemyProjectiles.length, 1);
  simulate(w, 0.2, 0.1);
  assertEqual(w.enemyProjectiles.length, 0);
  let seed = 1, o;
  for (; seed < 200; seed++) { o = obstaclesInCell(seed, 1, 0)[0]; if (o) break; }
  const w2 = behaviorWorld(seed);
  w2.hero.x = o.x + 6; w2.hero.z = o.z;
  w2.enemyProjectiles.push({ x: o.x - 4, z: o.z, dirX: 1, dirZ: 0, speed: 8, damage: 5, radius: 0.3, timeLeft: 3 });
  simulate(w2, 2, 0.05);
  assertEqual(w2.enemyProjectiles.length, 0);
  assertEqual(w2.hero.hp, w2.hero.stats.maxHp);
});

/** Erstes Hindernis in Zelle (1,0) eines Seeds. */
function obstacleWorld() {
  for (let seed = 1; seed < 500; seed++) {
    const o = obstaclesInCell(seed, 1, 0)[0];
    if (o && obstaclesNear(seed, o.x, o.z, 8).length === 1) return { w: behaviorWorld(seed), o };
  }
  throw new Error('kein Hindernis');
}

test('survivor: Krähe fliegt durch ein Hindernis, Wildschwein nicht', () => {
  const { w, o } = obstacleWorld();
  w.hero.x = o.x + 5; w.hero.z = o.z; w.hero.invulnerableUntil = Infinity;
  const crow = spawnEnemy(w, 'kraehe', o.x, o.z);
  stepWorld(w, 0.05, NONE);
  assertTrue(dist(crow, o) < o.radius, 'Krähe wurde aus dem Hindernis geschoben');

  const r = obstacleWorld();
  r.w.hero.x = r.o.x + 5; r.w.hero.z = r.o.z; r.w.hero.invulnerableUntil = Infinity;
  const boar = spawnEnemy(r.w, 'wildschwein', r.o.x - 4, r.o.z);
  let minD = Infinity;
  simulate(r.w, 6, 0.05, () => { minD = Math.min(minD, dist(boar, r.o)); });
  assertTrue(minD >= r.o.radius + boar.radius - 1e-6, `Wildschwein im Hindernis (${minD})`);
});

test('survivor: Wildschwein steht vor dem Ansturm still und rennt dann mit dreifachem Tempo', () => {
  const w = behaviorWorld();
  const boar = spawnEnemy(w, 'wildschwein', 40, 0);
  const moves = [];
  let prev = boar.x;
  simulate(w, 6, 0.05, () => { moves.push(Math.abs(boar.x - prev)); prev = boar.x; });
  const walk = ENEMIES.wildschwein.speed * 0.05;
  assertTrue(moves.some((m) => Math.abs(m - walk) < 1e-6), 'kein normales Laufen');
  assertTrue(moves.some((m) => m === 0), 'kein Stillstand');
  assertTrue(moves.some((m) => Math.abs(m - 3 * walk) < 1e-6), 'kein Ansturm');
});

test('survivor: Wolf umkreist den Helden in etwa 5 Einheiten Abstand', () => {
  const w = behaviorWorld();
  w.hero.invulnerableUntil = Infinity;
  const wolf = spawnEnemy(w, 'wolf', 20, 0);
  simulate(w, 5, 0.05);
  let near = 0, total = 0;
  simulate(w, 6, 0.05, () => { total++; if (Math.abs(dist(wolf, w.hero) - 5) < 1.5) near++; });
  assertTrue(near / total > 0.5, `nur ${near}/${total} Schritte im Ring`);
});

test('survivor: Bär springt mit Vorwarnung und doppeltem Schaden auf die Heldenposition', () => {
  const w = behaviorWorld();
  const bear = spawnEnemy(w, 'baer', 25, 0);
  bear.contactReadyAt = Infinity;
  let tele = null, hits = [];
  simulate(w, 6, 0.05, () => {
    if (!tele) tele = ofType(w.events, 'bossTelegraph')[0] || null;
    hits.push(...ofType(w.events, 'heroHit'));
  });
  assertTrue(!!tele, 'keine Vorwarnung');
  assertEqual([tele.kind, tele.radius, tele.delay], ['leap', BOSS.leap.radius, BOSS.leap.windup]);
  assertTrue(dist(bear, tele) <= tele.radius);
  assertEqual(hits.map((h) => h.amount), [2 * ENEMIES.baer.damage]);
});

test('survivor: Prankenhieb trifft nur, wenn der Held nach der Vorwarnung noch im Bogen steht', () => {
  for (const stay of [true, false]) {
    const w = behaviorWorld();
    const bear = spawnEnemy(w, 'baer', 3, 0);
    bear.contactReadyAt = Infinity;
    let tele = null;
    while (!tele) { stepWorld(w, 0.05, NONE); tele = ofType(w.events, 'bossTelegraph')[0]; }
    assertEqual([tele.kind, tele.delay], ['swipe', BOSS.swipe.windup]);
    if (!stay) w.hero.x = -20;
    let hits = 0;
    simulate(w, 0.8, 0.05, () => { hits += ofType(w.events, 'heroHit').length; });
    assertEqual(hits, stay ? 1 : 0);
  }
});

test('survivor: abandonRun beendet als Niederlage ohne Wiederbelebung, Gold bleibt', () => {
  const run = immortal(newRun({ revive: true }));
  play(run, 5);
  run.world.run.gold = 17;
  setPaused(run, true);
  abandonRun(run);
  assertEqual(run.state, 'lost');
  assertEqual(run.cards, null);
  assertEqual(ofType(run.events, 'death'), [{ type: 'death' }]);
  assertEqual(ofType(run.events, 'revive'), []);
  assertEqual(run.world.run.revivesLeft, 1);
  const summary = getSummary(run);
  assertEqual(summary.won, false);
  assertEqual(summary.gold, 17);
  stepRun(run, 1, NONE);
  assertEqual(run.state, 'lost');
});

test('survivor: abandonRun während der Kartenwahl verwirft die Karten; nach Ende ohne Wirkung', () => {
  const run = immortal(newRun());
  run.world.run.xp = 1000;
  stepRun(run, 1 / 60, NONE);
  assertEqual(run.state, 'levelup');
  abandonRun(run);
  assertEqual(run.state, 'lost');
  assertEqual(run.cards, null);
  abandonRun(run);
  assertEqual(run.state, 'lost');
  assertEqual(run.events, [{ type: 'death' }], 'zweiter Aufruf fügt nichts hinzu');
});
