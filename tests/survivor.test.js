import { test, assertEqual, assertClose, assertTrue } from './runner.js';
import { createSurvivorRun, stepRun, chooseCard, setPaused, setView, getSummary, displayTime, abandonRun, skipDying, bossOrder } from '../src/modes/survivor.js';
import { spawnRadius, hpMul, BOSS_HP_MUL, MAX_ENEMIES, DEFAULT_VIEW, DYING, unlockMinute, weights, BOSS_POOL } from '../src/data/waves.js';
import { createWorld, stepWorld, spawnEnemy, damageEnemy } from '../src/core/world.js';
import { obstaclesNear, obstaclesInCell } from '../src/core/terrain.js';
import { ENEMIES, ELITE, DROPS, BOSS, BOSS_MOVES, VENOM, POUNCE } from '../src/data/enemies.js';

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

test('survivor: Freischaltminuten und Gewichte der Gegner, jeder Gegner hat einen Namen', () => {
  assertEqual(unlockMinute, {
    ratte: 0, fuchs: 1, wildschwein: 2, igel: 3, kraehe: 4, dachs: 5, giftkroete: 6, kreuzotter: 7, uhu: 8, wolf: 9, luchs: 10,
  });
  assertEqual(weights, {
    ratte: 10, fuchs: 6, wildschwein: 3, igel: 3, kraehe: 4, dachs: 2, giftkroete: 2, kreuzotter: 3, uhu: 2, wolf: 3, luchs: 2,
  });
  for (const [type, def] of Object.entries(ENEMIES)) {
    assertTrue(typeof def.name === 'string' && def.name.length > 0, `${type}: Name`);
    if (def.behavior !== 'boss') assertTrue(type in unlockMinute && type in weights, `${type}: Welle`);
  }
  assertEqual(['fuchs', 'igel', 'dachs', 'kreuzotter', 'uhu', 'luchs'].map((t) => ENEMIES[t].name),
    ['Fuchs', 'Igel', 'Dachs', 'Kreuzotter', 'Uhu', 'Luchs']);
  assertTrue(ENEMIES.uhu.flying && ENEMIES.kreuzotter.venom);
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

test('survivor: bei 300 s und 600 s erscheint je ein Boss der Folge, der zweite mit 2,5-fachem Leben', () => {
  const run = immortal(newRun());
  const w = run.world;
  const order = bossOrder(SEED);
  w.time = 299.9;
  stepRun(run, 0.2, NONE);
  assertEqual(ofType(run.events, 'bossSpawn'), [{ type: 'bossSpawn', index: 0, enemyType: order[0] }]);
  w.time = 599.9;
  stepRun(run, 0.2, NONE);
  assertEqual(ofType(run.events, 'bossSpawn'), [{ type: 'bossSpawn', index: 1, enemyType: order[1] }]);
  const bosses = w.enemies.filter((e) => e.boss);
  assertEqual(bosses.map((b) => b.maxHp), [ENEMIES[order[0]].hp * BOSS_HP_MUL[0], ENEMIES[order[1]].hp * BOSS_HP_MUL[1]]);
  assertEqual(bosses.map((b) => b.type), order.slice(0, 2));
});

test('survivor: bei 900 s dritter Boss, danach kein weiterer Gegner; sein Tod → won', () => {
  const run = immortal(newRun());
  const w = run.world;
  const third = bossOrder(SEED)[2];
  w.time = 899.9;
  stepRun(run, 0.2, NONE);
  const spawns = ofType(run.events, 'bossSpawn');
  assertEqual(spawns[spawns.length - 1], { type: 'bossSpawn', index: 2, enemyType: third });
  const last = w.enemies.filter((e) => e.boss).find((b) => b.maxHp === ENEMIES[third].hp * BOSS_HP_MUL[2]);
  assertEqual(last.type, third);
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

test('survivor: Held mit 1 Leben und Ratte in Berührung → dying, Ereignis dying, kein death', () => {
  const run = newRun();
  lethalContact(run);
  stepRun(run, 0.05, NONE);
  assertEqual(run.state, 'dying');
  assertEqual(ofType(run.events, 'dying'), [{ type: 'dying' }]);
  assertEqual(ofType(run.events, 'death'), []);
  assertEqual(run.dyingLeft, DYING.duration);
});

/** Tödlicher Treffer, Zustand dying. */
function dyingRun(opts = {}) {
  const run = newRun(opts);
  lethalContact(run);
  stepRun(run, 0.05, NONE);
  assertEqual(run.state, 'dying');
  return run;
}

test('survivor: nach 1,0 s Echtzeit in dying → lost mit genau einem death; Welt läuft mit 0,25 weiter, Summary zeigt Todeszeit', () => {
  const run = dyingRun();
  const w = run.world, died = w.time;
  assertEqual(run.deathTime, died);
  const events = [];
  for (let i = 0; i < 10; i++) { stepRun(run, 0.1, NONE); events.push(...run.events); }
  assertEqual(run.state, 'lost');
  assertEqual(ofType(events, 'death').length, 1);
  assertClose(w.time - died, 0.25, 1e-9);
  assertEqual(getSummary(run).time, died);
  assertEqual(displayTime(run), died);
  assertEqual(run.facts.time, died);
});

test('survivor: in dying wächst die Gegnerzahl nicht, hp sinkt nicht, Ratte läuft ein Viertel der Strecke', () => {
  const run = dyingRun();
  const w = run.world;
  const hp = w.hero.hp;
  w.enemies.length = 0;
  const rat = spawnEnemy(w, 'ratte', 12, 0);
  const n = w.enemies.length;
  const x0 = rat.x;
  stepRun(run, 0.4, NONE); // 0,1 s Weltzeit
  assertEqual(run.state, 'dying');
  assertEqual(w.enemies.length, n);
  assertEqual(w.hero.hp, hp);
  assertClose(x0 - rat.x, ENEMIES.ratte.speed * 0.1, 1e-6);
  // auch bei später Spielzeit (Elite, Boss, Schatten wären fällig) erscheint nichts
  w.time = 899.9;
  stepRun(run, 0.4, NONE);
  assertEqual(w.enemies.length, n);
});

test('survivor: in dying ist der Held träge: keine Bewegung, keine Fähigkeiten, kein Einsammeln, keine Regeneration', () => {
  const run = dyingRun();
  const w = run.world;
  w.hero.abilities = [{ id: 'schwerthieb', level: 1, cooldownLeft: 0 }];
  w.hero.stats = { ...w.hero.stats, hpRegen: 5 };
  w.hero.hp = -2;
  w.enemies.length = 0;
  spawnEnemy(w, 'ratte', w.hero.x + 3, w.hero.z).speed = 0;
  w.pickups.push({ kind: 'gold', x: w.hero.x, z: w.hero.z, value: 5 });
  const [x, z] = [w.hero.x, w.hero.z];
  const events = [];
  for (let i = 0; i < 5; i++) { stepRun(run, 0.1, { moveX: 1, moveZ: 0 }); events.push(...run.events); }
  assertEqual(ofType(events, 'cast'), []);
  assertEqual([w.hero.x, w.hero.z], [x, z]);
  assertEqual(w.hero.hp, -2);
  assertEqual(w.pickups.length, 1);
  assertEqual(w.run.gold, 0);
});

test('survivor: Fähigkeiten feuern außerhalb von dying (Gegenprobe)', () => {
  const run = immortal(newRun());
  const w = run.world;
  w.hero.abilities = [{ id: 'schwerthieb', level: 1, cooldownLeft: 0 }];
  spawnEnemy(w, 'ratte', w.hero.x + 1, w.hero.z).speed = 0;
  stepRun(run, 0.1, NONE);
  assertTrue(ofType(run.events, 'cast').length > 0);
});

test('survivor: skipDying → sofort lost mit einem death; in playing ohne Wirkung', () => {
  const live = newRun();
  skipDying(live);
  assertEqual(live.state, 'playing');
  assertEqual(live.events, []);
  const run = dyingRun();
  skipDying(run);
  assertEqual(run.state, 'lost');
  assertEqual(ofType(run.events, 'death').length, 1);
  skipDying(run);
  stepRun(run, 1, NONE);
  assertEqual(run.state, 'lost');
  assertEqual(run.events, []);
});

test('survivor: setPaused(true) in dying ändert nichts', () => {
  const run = dyingRun();
  setPaused(run, true);
  assertEqual(run.state, 'dying');
});

test('survivor: abandonRun in playing → lost ohne dying; in dying → lost mit insgesamt einem death', () => {
  const a = newRun();
  abandonRun(a);
  assertEqual(a.state, 'lost');
  assertEqual(ofType(a.events, 'dying'), []);
  const b = dyingRun();
  const events = [...b.events];
  abandonRun(b);
  events.push(...b.events);
  assertEqual(b.state, 'lost');
  assertEqual(ofType(events, 'death').length, 1);
  assertEqual(b.facts.ended, true);
  assertEqual(b.facts.time, b.deathTime);
});

test('survivor: run.facts.ended ist in dying false, in lost true', () => {
  const run = dyingRun();
  assertEqual(run.facts.ended, false);
  play(run, 1, 0.1);
  assertEqual(run.state, 'lost');
  assertEqual([run.facts.ended, run.facts.won, run.facts.hpFractionAtEnd], [true, false, 0]);
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
  assertEqual(run.state, 'dying');
  assertEqual(ofType(run.events, 'dying').length, 1);
  assertEqual(ofType(run.events, 'revive'), []);
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

test('survivor: Level-up und tödlicher Treffer im selben Schritt → dying, cards null, auch nach der Phase', () => {
  const run = newRun();
  run.world.run.xp = 25;
  lethalContact(run);
  stepRun(run, 0.05, NONE);
  assertEqual(run.state, 'dying');
  assertEqual(run.cards, null);
  assertEqual(ofType(run.events, 'levelup'), []);
  play(run, 1, 0.1);
  assertEqual(run.state, 'lost');
  assertEqual(run.cards, null);
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

test('survivor: dyingLeft ignoriert das Debug-timeScale: 1,0 s Echtzeit, Welt nur mit DYING.timeScale', () => {
  const run = dyingRun({ timeScale: 4 });
  const w = run.world, died = w.time;
  stepRun(run, 0.3, NONE);
  assertEqual(run.state, 'dying');
  assertClose(w.time - died, 0.3 * DYING.timeScale, 1e-9);
  stepRun(run, 0.69, NONE);
  assertEqual(run.state, 'dying');
  stepRun(run, 0.02, NONE);
  assertEqual(run.state, 'lost');
  assertClose(w.time - died, DYING.duration * DYING.timeScale, 1e-9);
});

// --- Kreuzotter (Schlängeln, Gift) ---

/** Lässt die Otter einmal am Helden zubeißen und nimmt sie dann weg; liefert die Welt. */
function bitten(w) {
  spawnEnemy(w, 'kreuzotter', w.hero.x + 0.9, w.hero.z);
  stepWorld(w, 0.05, NONE);
  w.enemies = w.enemies.filter((e) => e.type !== 'kreuzotter');
  return w;
}
const poisonHits = (events) => events.filter((e) => e.type === 'heroHit' && e.poison);

test('survivor: Otterbiss vergiftet: 4 Ticks zu je 0,5 × Schaden je Sekunde', () => {
  const w = bitten(behaviorWorld());
  assertTrue(!!w.hero.poison, 'nicht vergiftet');
  const ticks = [];
  simulate(w, 5, 0.05, () => ticks.push(...poisonHits(w.events)));
  assertEqual(ticks.length, VENOM.duration / VENOM.tick);
  assertEqual(ticks.length, 4);
  for (const h of ticks) assertClose(h.amount, VENOM.dpsMul * ENEMIES.kreuzotter.damage * VENOM.tick, 1e-9);
  assertEqual(w.hero.poison, null);
});

test('survivor: neuer Biss frischt das Gift auf, stapelt aber nicht', () => {
  const w = bitten(behaviorWorld());
  const times = [];
  simulate(w, 2, 0.05, () => { if (poisonHits(w.events).length) times.push(w.time); });
  bitten(w);
  const second = w.time;
  simulate(w, 6, 0.05, () => { if (poisonHits(w.events).length) times.push(w.time); });
  for (let i = 1; i < times.length; i++) assertTrue(times[i] - times[i - 1] > VENOM.tick - 0.06, `Ticks zu dicht bei ${times[i]}`);
  const last = times[times.length - 1];
  assertTrue(last <= second + VENOM.duration + 1e-6 && last > second + VENOM.duration - VENOM.tick - 0.1, `letzter Tick ${last - second}`);
});

test('survivor: ausgewichener oder abgeprallter Biss vergiftet nicht', () => {
  const w = behaviorWorld();
  w.hero.invulnerableUntil = Infinity;
  bitten(w);
  assertEqual(w.hero.poison, null);
  const w2 = behaviorWorld();
  w2.hero.stats.dodge = 1;
  bitten(w2);
  assertEqual(w2.hero.poison, null);
});

test('survivor: Wiederbelebung hebt Gift auf', () => {
  const run = newRun({ revive: true });
  const w = run.world;
  w.hero.poison = { until: w.time + 100, dps: 1e6, nextTick: w.time + 0.01 };
  stepRun(run, 0.05, NONE);
  assertEqual(ofType(run.events, 'revive').length, 1);
  assertEqual(run.state, 'playing');
  assertEqual(w.hero.poison, null);
});

test('survivor: Kreuzotter windet sich und wechselt die Seite alle 0,6 s', () => {
  const w = behaviorWorld();
  const otter = spawnEnemy(w, 'kreuzotter', 20, 0);
  let lastSide = 0, switches = 0, px = otter.x, pz = otter.z;
  simulate(w, 3, 0.05, () => {
    const mx = otter.x - px, mz = otter.z - pz;
    const tx = w.hero.x - px, tz = w.hero.z - pz;
    const side = Math.sign(tx * mz - tz * mx);
    if (side && lastSide && side !== lastSide) switches++;
    if (side) lastSide = side;
    px = otter.x; pz = otter.z;
  });
  assertTrue(switches >= 4 && switches <= 6, `${switches} Seitenwechsel`);
});

// --- Luchs (Anspringen) ---

/** Luchs bei (12, 0) ohne Berührungsschaden; läuft, bis er den Sprung ankündigt. */
function lynxUntilTelegraph(w) {
  const lynx = spawnEnemy(w, 'luchs', w.hero.x + 12, w.hero.z);
  lynx.contactReadyAt = Infinity;
  let tele = null;
  for (let i = 0; i < 100 && !tele; i++) { stepWorld(w, 0.05, NONE); tele = ofType(w.events, 'bossTelegraph')[0] || null; }
  return { lynx, tele };
}

test('survivor: Luchs duckt sich in 8 Abstand und kündigt den Sprung an der Heldenposition an', () => {
  const w = behaviorWorld();
  const { lynx, tele } = lynxUntilTelegraph(w);
  assertTrue(!!tele, 'keine Ankündigung');
  assertEqual([tele.kind, tele.radius], ['leap', POUNCE.radius]);
  assertClose(tele.delay, POUNCE.crouch + POUNCE.leapTime, 1e-9);
  assertClose(dist(tele, w.hero), 0, 1e-9);
  assertTrue(dist(lynx, w.hero) <= POUNCE.engageRange + 0.01);
  const x = lynx.x;
  simulate(w, POUNCE.crouch - 0.1, 0.05);
  assertClose(lynx.x, x, 1e-9);
});

test('survivor: Luchs trifft bei der Landung im Kreis, sonst nicht', () => {
  for (const stay of [true, false]) {
    const w = behaviorWorld();
    const { lynx, tele } = lynxUntilTelegraph(w);
    if (!stay) w.hero.x = -20;
    const hits = [];
    simulate(w, POUNCE.crouch + POUNCE.leapTime + 0.05, 0.05, () => hits.push(...ofType(w.events, 'heroHit')));
    assertEqual(hits.map((h) => h.amount), stay ? [ENEMIES.luchs.damage * POUNCE.damageMul] : []);
    if (!stay) assertTrue(dist(lynx, tele) < 0.3, `Luchs landete ${dist(lynx, tele)} vom Ziel`);
  }
});

test('survivor: nach dem Sprung 3 s kein neuer Sprung', () => {
  const w = behaviorWorld();
  const { lynx } = lynxUntilTelegraph(w);
  const times = [w.time];
  simulate(w, 10, 0.05, () => { if (ofType(w.events, 'bossTelegraph').length) times.push(w.time); });
  assertTrue(times.length >= 2, 'kein zweiter Sprung');
  for (let i = 1; i < times.length; i++) {
    assertTrue(times[i] - times[i - 1] >= POUNCE.crouch + POUNCE.leapTime + POUNCE.cooldown - 0.06, `zu früh: ${times[i] - times[i - 1]}`);
  }
  assertTrue(lynx.hp > 0);
});

test('survivor: Betäubung beim Ducken bricht den Sprung ab', () => {
  const w = behaviorWorld();
  const { lynx } = lynxUntilTelegraph(w);
  lynx.stunnedUntil = w.time + 0.3;
  let leapt = false, hits = 0;
  simulate(w, 2, 0.05, () => { if (lynx.ai.phase === 'leap') leapt = true; hits += ofType(w.events, 'heroHit').length; });
  assertTrue(!leapt, 'sprang trotz Betäubung');
  assertEqual(hits, 0);
});

// --- Boss-Baukasten ---

/** Boss ohne Berührungsschaden; läuft, bis er einen Angriff ankündigt. */
function bossUntilTelegraph(w, type, x) {
  const boss = spawnEnemy(w, type, x, 0);
  boss.contactReadyAt = Infinity;
  let tele = null;
  for (let i = 0; i < 400 && !tele; i++) { stepWorld(w, 0.05, NONE); tele = ofType(w.events, 'bossTelegraph')[0] || null; }
  boss.contactReadyAt = Infinity;
  return { boss, tele };
}

test('survivor: jeder Boss hat Nah- und Fernangriff; der Bär wie bisher', () => {
  assertEqual(Object.keys(BOSS_MOVES), ['baer', 'keiler', 'hirsch', 'wisent']);
  assertEqual(Object.values(BOSS_MOVES).map((m) => [m.near.kind, m.far.kind]),
    [['swipe', 'leap'], ['swipe', 'dash'], ['ring', 'dash'], ['ring', 'dash']]);
  const b = BOSS_MOVES.baer;
  assertEqual([b.chaseTime, b.recover, b.triggerRange], [BOSS.chaseTime, BOSS.recover, BOSS.swipe.triggerRange]);
  assertEqual(b.near, { kind: 'swipe', ...BOSS.swipe });
  assertEqual(b.far, { kind: 'leap', ...BOSS.leap });
  for (const type of ['hirsch', 'keiler', 'wisent']) {
    const d = ENEMIES[type];
    assertEqual([d.behavior, d.hp, d.damage, d.xp], ['boss', 1500, 25, 100]);
  }
  assertEqual(['hirsch', 'keiler', 'wisent'].map((t) => ENEMIES[t].name), ['Rothirsch', 'Riesenkeiler', 'Wisent']);
});

test('survivor: Röhren trifft im Ring und stößt weg, außerhalb kein Treffer', () => {
  for (const stay of [true, false]) {
    const w = behaviorWorld();
    const { boss, tele } = bossUntilTelegraph(w, 'hirsch', 3);
    assertEqual([tele.kind, tele.delay], ['ring', BOSS_MOVES.hirsch.near.windup]);
    assertClose(tele.radius, ENEMIES.hirsch.radius + BOSS_MOVES.hirsch.near.reach, 1e-9);
    if (!stay) w.hero.x = -20;
    const before = dist(boss, w.hero);
    const hits = [];
    simulate(w, tele.delay + 0.1, 0.05, () => hits.push(...ofType(w.events, 'heroHit')));
    assertEqual(hits.map((h) => h.amount), stay ? [ENEMIES.hirsch.damage * BOSS_MOVES.hirsch.near.damageMul] : []);
    if (stay) assertClose(dist(boss, w.hero) - before, BOSS_MOVES.hirsch.near.push, 0.05);
  }
});

test('survivor: Stampfen des Wisents trifft hart, stößt aber nicht weg', () => {
  const w = behaviorWorld();
  const { tele } = bossUntilTelegraph(w, 'wisent', 3);
  assertEqual(tele.kind, 'ring');
  const x = w.hero.x, z = w.hero.z;
  const hits = [];
  simulate(w, tele.delay + 0.1, 0.05, () => hits.push(...ofType(w.events, 'heroHit')));
  assertEqual(hits.map((h) => h.amount), [ENEMIES.wisent.damage * BOSS_MOVES.wisent.near.damageMul]);
  assertClose(Math.hypot(w.hero.x - x, w.hero.z - z), 0, 1e-9);
});

test('survivor: Geweih-Ansturm läuft seine Länge ab und trifft den stehenden Helden genau einmal', () => {
  const far = BOSS_MOVES.hirsch.far;
  const w = behaviorWorld();
  const { boss, tele } = bossUntilTelegraph(w, 'hirsch', 25);
  assertEqual([tele.kind, tele.length, tele.width, tele.delay], ['dash', far.length, far.width, far.windup]);
  const hits = [];
  simulate(w, far.windup + far.dashTime + 0.2, 0.05, () => hits.push(...ofType(w.events, 'heroHit')));
  assertEqual(hits.map((h) => h.amount), [ENEMIES.hirsch.damage * far.damageMul]);

  const w2 = behaviorWorld();
  const r = bossUntilTelegraph(w2, 'hirsch', 25);
  w2.hero.x = 0; w2.hero.z = -40;
  simulate(w2, far.windup + far.dashTime + 0.05, 0.05);
  assertClose(dist(r.boss, r.tele), far.length, 0.3);
  assertTrue(boss.hp > 0);
});

test('survivor: Keiler stürmt dreimal, jeder Ansturm neu angekündigt und neu ausgerichtet', () => {
  const far = BOSS_MOVES.keiler.far;
  const w = behaviorWorld();
  const { tele } = bossUntilTelegraph(w, 'keiler', 30);
  assertEqual(tele.kind, 'dash');
  w.hero.x = 0; w.hero.z = 12;
  const teles = [tele];
  simulate(w, far.count * (far.windup + far.dashTime) + (far.count - 1) * far.gap + 0.2, 0.05,
    () => teles.push(...ofType(w.events, 'bossTelegraph')));
  assertEqual(teles.map((t) => t.kind), ['dash', 'dash', 'dash']);
  for (const t of teles.slice(1)) {
    const to = Math.hypot(w.hero.x - t.x, w.hero.z - t.z);
    assertTrue((t.dirX * (w.hero.x - t.x) + t.dirZ * (w.hero.z - t.z)) / to > 0.99, 'nicht auf den Helden ausgerichtet');
  }
});

// --- Wechselnde Bosse ---

test('survivor: bossOrder liefert drei verschiedene Bosse aus dem Pool, gleich bei gleichem Seed', () => {
  assertEqual(BOSS_POOL, ['baer', 'hirsch', 'keiler', 'wisent']);
  const seen = [new Set(), new Set(), new Set()];
  for (let s = 1; s <= 200; s++) {
    const o = bossOrder(s);
    assertEqual(o.length, 3);
    assertEqual(new Set(o).size, 3);
    for (const b of o) assertTrue(BOSS_POOL.includes(b), b);
    assertEqual(bossOrder(s), o);
    o.forEach((b, i) => seen[i].add(b));
  }
  for (const set of seen) assertEqual(set.size, BOSS_POOL.length);
});

test('survivor: Bossauswahl verbraucht world.rng nicht', () => {
  const run = createSurvivorRun({ seed: 77, animalId: 'hase', classId: 'krieger' });
  const fresh = createWorld({ seed: 77, animalId: 'hase', classId: 'krieger' });
  assertEqual(run.world.rng.next(), fresh.rng.next());
  assertEqual(run.spawn.bossOrder, bossOrder(77));
});

test('survivor: Tod des letzten Bosses gewinnt auch, wenn er kein Bär ist', () => {
  let seed = SEED;
  while ((bossOrder(seed)[2] === 'baer' || obstaclesNear(seed, 0, 0, 16).length) && seed < SEED + 500) seed++;
  assertTrue(bossOrder(seed)[2] !== 'baer', 'kein Seed mit anderem Endboss');
  const run = immortal(newRun({ seed }));
  const w = run.world;
  w.time = 899.9;
  stepRun(run, 0.2, NONE);
  const last = run.spawn.finalBoss;
  assertEqual(last.type, bossOrder(seed)[2]);
  damageEnemy(w, last, { amount: 1e9, crit: false }, 'x');
  stepRun(run, 0.05, NONE);
  assertEqual(run.state, 'won');
});

// --- Korrekturen aus der Gesamtprüfung ---

test('survivor: Röhren stößt nicht weg, wenn der Treffer nicht ankommt', () => {
  const w = behaviorWorld();
  const { tele } = bossUntilTelegraph(w, 'hirsch', 3);
  assertEqual(tele.kind, 'ring');
  w.hero.invulnerableUntil = Infinity;
  const x = w.hero.x, z = w.hero.z;
  simulate(w, tele.delay + 0.1, 0.05);
  assertClose(Math.hypot(w.hero.x - x, w.hero.z - z), 0, 1e-9);
});

test('survivor: Ansturm-Ankündigung trägt den Boss-Radius, damit der Streifen die Trefferfläche zeigt', () => {
  const w = behaviorWorld();
  const { tele } = bossUntilTelegraph(w, 'hirsch', 25);
  assertEqual(tele.kind, 'dash');
  assertEqual(tele.radius, ENEMIES.hirsch.radius);
});

test('survivor: Gift endet mit der Sterbephase und mit dem Sieg', () => {
  const run = newRun();
  run.world.hero.poison = { until: run.world.time + 100, dps: 1, nextTick: run.world.time + 50 };
  lethalContact(run);
  stepRun(run, 0.05, NONE);
  assertEqual(run.state, 'dying');
  assertEqual(run.world.hero.poison, null);

  const won = immortal(newRun());
  won.world.time = 899.9;
  stepRun(won, 0.2, NONE);
  won.world.hero.poison = { until: won.world.time + 100, dps: 0, nextTick: won.world.time + 50 };
  damageEnemy(won.world, won.spawn.finalBoss, { amount: 1e9, crit: false }, 'x');
  stepRun(won, 0.05, NONE);
  assertEqual(won.state, 'won');
  assertEqual(won.world.hero.poison, null);
});
