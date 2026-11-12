import { createWorld, stepWorld, spawnEnemy, knockback } from '../core/world.js';
import { pendingLevelUps, rollCards, applyCard, openChest } from '../core/progression.js';
import { obstaclesNear } from '../core/terrain.js';
import { ENEMIES, ELITE } from '../data/enemies.js';
import {
  RUN_DURATION, MAX_ENEMIES, unlockMinute, weights, MAX_FORMULA_MINUTE, spawnPerSecond, hpMul, dmgMul,
  ELITE_INTERVAL, BOSS_TIMES, BOSS_HP_MUL, LEASH_DISTANCE, CAP_BACKLOG, SPAWN_REROLLS, MAX_SUBSTEP, REVIVE,
  DEFAULT_VIEW, spawnRadius,
} from '../data/waves.js';

/**
 * Regelschicht des 15-Minuten-Wellenmodus. Darstellung und UI lesen `run`, schreiben aber nur über
 * `chooseCard`, `setPaused` und `setView`.
 *
 * Ereignisse: Nach jedem `stepRun` stehen in `run.events` alle Ereignisse dieses Aufrufs (aus allen
 * Teilschritten, inklusive der Modus-Ereignisse `levelup`, `bossSpawn`, `revive`, `death`, `victory`, `chest`).
 * Verbraucher lesen `run.events`, nicht `world.events` (das enthält nur den letzten Teilschritt).
 *
 * @typedef {import('../core/world.js').World} World
 * @typedef {import('../core/progression.js').Card} Card
 * @typedef {import('../data/animals.js').Modifier} Modifier
 * @typedef {'playing'|'levelup'|'paused'|'won'|'lost'} RunState
 * @typedef {{ acc: number, backlog: number, strongPending: number, nextEliteAt: number, bossIndex: number,
 *   finalBoss: import('../core/world.js').Enemy|null }} SpawnState
 * @typedef {{ world: World, state: RunState, cards: Card[]|null, view: { halfW: number, halfH: number },
 *   timeScale: number, events: object[], spawn: SpawnState }} Run
 */

/**
 * @param {{ seed: number, animalId: string, classId: string, modifiers?: Modifier[], revive?: boolean, timeScale?: number }} opts
 * @returns {Run}
 */
export function createSurvivorRun({ seed, animalId, classId, modifiers = [], revive = false, timeScale = 1 }) {
  const world = createWorld({ seed, animalId, classId, modifiers });
  world.run.revivesLeft = revive ? 1 : 0;
  return {
    world, state: 'playing', cards: null, view: { ...DEFAULT_VIEW }, timeScale, events: [],
    spawn: { acc: 0, backlog: 0, strongPending: 0, nextEliteAt: ELITE_INTERVAL, bossIndex: 0, finalBoss: null },
  };
}

/**
 * Simuliert `dt × timeScale` Sekunden in Teilschritten von höchstens MAX_SUBSTEP; nur im Zustand playing.
 * Hält an, sobald ein Teilschritt den Zustand ändert (Level-up, Sieg, Tod).
 * @param {Run} run
 * @param {number} dt
 * @param {{ moveX: number, moveZ: number }} input
 */
export function stepRun(run, dt, input) {
  run.events = [];
  let remaining = dt * run.timeScale;
  while (run.state === 'playing' && remaining > 1e-9) {
    const h = Math.min(remaining, MAX_SUBSTEP);
    remaining -= h;
    subStep(run, h, input);
  }
}

function subStep(run, dt, input) {
  const world = run.world;
  stepWorld(world, dt, input);
  const chests = world.events.filter((e) => e.type === 'pickup' && e.kind === 'chest').length;
  for (let i = 0; i < chests; i++) openChest(world);
  spawnWaves(run, dt);
  leash(run);
  checkOutcome(run);
  if (run.state === 'playing' && pendingLevelUps(world) > 0) {
    run.state = 'levelup';
    run.cards = rollCards(world, 3);
    world.events.push({ type: 'levelup', level: world.run.level + 1 });
  }
  run.events.push(...world.events);
}

/** Minute für die Formeln, gedeckelt. */
function currentMinute(world) {
  return Math.min(Math.floor(world.time / 60), MAX_FORMULA_MINUTE);
}

function spawnWaves(run, dt) {
  const { world, spawn } = run;
  const minute = currentMinute(world);

  // Bosse (nie mehr als fällig; im echten Spiel höchstens einer pro Schritt)
  while (spawn.bossIndex < BOSS_TIMES.length && world.time >= BOSS_TIMES[spawn.bossIndex]) {
    const index = spawn.bossIndex++;
    const pos = ringPosition(run, 'baer', false, true);
    const boss = spawnEnemy(world, 'baer', pos.x, pos.z, { hpMul: BOSS_HP_MUL[index], dmgMul: dmgMul(minute) });
    world.events.push({ type: 'bossSpawn', index });
    if (index === BOSS_TIMES.length - 1) spawn.finalBoss = boss;
  }
  if (spawn.finalBoss) return; // nach dem letzten Boss keine neuen Gegner

  // Elite (ab 120 s alle ELITE_INTERVAL s, nicht ab RUN_DURATION)
  if (world.time >= spawn.nextEliteAt && spawn.nextEliteAt < RUN_DURATION) {
    spawn.nextEliteAt = (Math.floor(world.time / ELITE_INTERVAL) + 1) * ELITE_INTERVAL;
    const type = pickType(world, minute);
    const pos = ringPosition(run, type, true, true);
    spawnEnemy(world, type, pos.x, pos.z, { elite: true, hpMul: hpMul(minute), dmgMul: dmgMul(minute) });
  }

  // Reguläre Gegner über einen Bruchteil-Akkumulator
  spawn.acc += spawnPerSecond(minute) * dt;
  while (spawn.acc >= 1) {
    spawn.acc -= 1;
    if (world.enemies.length >= MAX_ENEMIES) {
      if (++spawn.backlog >= CAP_BACKLOG.batch) { spawn.backlog -= CAP_BACKLOG.batch; spawn.strongPending++; }
      continue;
    }
    const type = pickType(world, minute);
    const pos = ringPosition(run, type, false, false);
    if (!pos) continue;
    const strong = spawn.strongPending > 0;
    const enemy = spawnEnemy(world, type, pos.x, pos.z,
      { hpMul: hpMul(minute) * (strong ? CAP_BACKLOG.hpMul : 1), dmgMul: dmgMul(minute) });
    if (enemy && strong) spawn.strongPending--;
  }
}

/** Gewichtete Wahl unter den freigeschalteten Typen. */
function pickType(world, minute) {
  const types = Object.keys(weights).filter((t) => unlockMinute[t] <= minute);
  let r = world.rng.next() * types.reduce((s, t) => s + weights[t], 0);
  for (const t of types) { r -= weights[t]; if (r < 0) return t; }
  return types[types.length - 1];
}

/**
 * Zufälliger Punkt auf dem Erscheinungsring um den Helden. Bodengegner nicht in Hindernissen:
 * bis zu SPAWN_REROLLS neue Winkel, dann null – oder mit `force` der letzte Punkt (die Welt schiebt ihn heraus).
 */
function ringPosition(run, type, elite, force) {
  const { world, view } = run;
  const def = ENEMIES[type];
  const r = spawnRadius(view.halfW, view.halfH);
  const radius = def.radius * (elite ? ELITE.scale : 1);
  let pos = null;
  for (let i = 0; i <= SPAWN_REROLLS; i++) {
    const a = world.rng.range(0, Math.PI * 2);
    pos = { x: world.hero.x + Math.cos(a) * r, z: world.hero.z + Math.sin(a) * r };
    if (def.flying || obstaclesNear(world.seed, pos.x, pos.z, radius).length === 0) return pos;
  }
  return force ? pos : null;
}

/** Gegner (außer Bossen), die zu weit weg sind, kommen zurück auf den Ring. */
function leash(run) {
  const { world, view } = run;
  const limit = Math.max(LEASH_DISTANCE, spawnRadius(view.halfW, view.halfH) + 1);
  const hero = world.hero;
  for (const e of world.enemies) {
    if (e.boss || (e.x - hero.x) ** 2 + (e.z - hero.z) ** 2 <= limit * limit) continue;
    const pos = ringPosition(run, e.type, e.elite, false);
    if (pos) { e.x = pos.x; e.z = pos.z; }
  }
}

/** Tod (mit Wiederbelebung) und Sieg; beide vor Level-ups. */
function checkOutcome(run) {
  const world = run.world, hero = world.hero;
  if (hero.hp <= 0) {
    if (world.run.revivesLeft > 0) {
      world.run.revivesLeft--;
      hero.hp = hero.stats.maxHp * REVIVE.hpFraction;
      hero.invulnerableUntil = world.time + REVIVE.invulnerable;
      for (const e of world.enemies) {
        if ((e.x - hero.x) ** 2 + (e.z - hero.z) ** 2 <= REVIVE.pushRadius ** 2) knockback(world, e, REVIVE.pushDistance);
      }
      world.events.push({ type: 'revive' });
    } else {
      endRun(run, 'lost', 'death');
      return;
    }
  }
  const boss = run.spawn.finalBoss;
  if (boss && !world.enemies.includes(boss)) endRun(run, 'won', 'victory');
}

function endRun(run, state, eventType) {
  run.state = state;
  run.cards = null;
  run.world.events.push({ type: eventType });
}

/**
 * Wählt eine der angebotenen Karten. Nur im Zustand levelup und mit gültigem Index, sonst ohne Wirkung.
 * @param {Run} run
 * @param {number} index
 */
export function chooseCard(run, index) {
  if (run.state !== 'levelup' || !run.cards || !Number.isInteger(index) || index < 0 || index >= run.cards.length) return;
  applyCard(run.world, run.cards[index]);
  run.cards = null;
  run.state = 'playing';
}

/**
 * Pausiert nur aus playing und setzt nur aus paused fort; offene Karten bleiben unberührt.
 * @param {Run} run
 * @param {boolean} paused
 */
export function setPaused(run, paused) {
  if (paused && run.state === 'playing') run.state = 'paused';
  else if (!paused && run.state === 'paused') run.state = 'playing';
}

/**
 * Halbe sichtbare Breite und Höhe in Welteinheiten; bestimmt den Erscheinungsring.
 * @param {Run} run
 * @param {number} halfW
 * @param {number} halfH
 */
export function setView(run, halfW, halfH) {
  run.view = { halfW, halfH };
}

/**
 * Laufzeit für die Anzeige: bleibt nach dem letzten Boss bei RUN_DURATION stehen.
 * @param {Run} run
 * @returns {number}
 */
export function displayTime(run) {
  return Math.min(run.world.time, RUN_DURATION);
}

/**
 * @param {Run} run
 * @returns {{ won: boolean, time: number, level: number, kills: number, gold: number, damageByAbility: Record<string, number> }}
 */
export function getSummary(run) {
  const { world } = run;
  return {
    won: run.state === 'won', time: world.time, level: world.run.level, kills: world.run.kills,
    gold: world.run.gold, damageByAbility: { ...world.run.damageByAbility },
  };
}
