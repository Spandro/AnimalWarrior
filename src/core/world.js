import { createRng } from './rng.js';
import { computeStats } from './stats.js';
import { resolveHit } from './combat.js';
import { createGrid } from './spatial.js';
import { obstaclesNear } from './terrain.js';
import { stepAbilities } from './abilities.js';
import { CLASSES } from '../data/classes.js';
import { ENEMIES, ELITE, DROPS, CONTACT_INTERVAL, HERO_RADIUS, SEPARATION_CELL, MAX_ENEMIES,
  CONFUSE_REROLL, BOSS_SLOW_FACTOR, KNOCKBACK_SUBSTEP } from '../data/enemies.js';

/**
 * @typedef {import('./stats.js').Stats} Stats
 * @typedef {import('../data/animals.js').Modifier} Modifier
 * @typedef {{ id: string, level: number, cooldownLeft: number }} HeroAbility
 * @typedef {{ modifiers: Modifier[], timeLeft: number, abilityId?: string }} Buff
 * @typedef {{ x: number, z: number, facing: {x:number,z:number}, hp: number, stats: Stats, modifiers: Modifier[],
 *   abilities: HeroAbility[], buffs: Buff[], radius: number, invulnerableUntil: number, animalId: string, classId: string }} Hero
 * @typedef {{ id: number, type: string, x: number, z: number, hp: number, maxHp: number, radius: number, speed: number,
 *   damage: number, elite: boolean, boss: boolean, flying: boolean, behavior: string, slowUntil: number, slowFactor: number,
 *   confusedUntil: number, stunnedUntil: number, contactReadyAt: number, hitReadyAt: Record<string, number>, ai: object,
 *   wander?: { x: number, z: number, rerollAt: number } }} Enemy
 * @typedef {{ kind: 'xp'|'gold'|'potion'|'chest', x: number, z: number, value: number }} Pickup
 * @typedef {{ level: number, xp: number, kills: number, gold: number, bonuses: object, damageByAbility: Record<string, number>, revivesLeft: number }} Run
 * @typedef {{ time: number, seed: number, rng: import('./rng.js').Rng, hero: Hero, enemies: Enemy[], projectiles: object[],
 *   zones: object[], orbitals: object[], summons: object[], pickups: Pickup[], events: object[], run: Run, nextId: number }} World
 */

/**
 * Bewegungsfunktionen je behavior; unbekannte fallen auf chase zurück. Weitere kommen in Aufgabe 7.
 * Sie nutzen enemyTarget und enemySpeed, damit Klon und Verlangsamung wirken.
 */
const BEHAVIORS = {
  chase(world, enemy, dt) {
    const target = enemyTarget(world, enemy);
    const dx = target.x - enemy.x, dz = target.z - enemy.z;
    const d = Math.hypot(dx, dz);
    if (d < 1e-9) return;
    const step = Math.min(d, enemySpeed(world, enemy) * dt);
    enemy.x += (dx / d) * step;
    enemy.z += (dz / d) * step;
  },
};

/**
 * Ziel, das ein Gegner ansteuert: die nächste Beschwörung, in deren Lockradius er steht, sonst der Held.
 * @param {World} world
 * @param {Enemy} enemy
 * @returns {{ x: number, z: number }}
 */
export function enemyTarget(world, enemy) {
  let best = world.hero, bestD2 = Infinity;
  for (const s of world.summons) {
    const dx = s.x - enemy.x, dz = s.z - enemy.z;
    const d2 = dx * dx + dz * dz;
    if (d2 <= s.lureRadius * s.lureRadius && d2 < bestD2) { best = s; bestD2 = d2; }
  }
  return best;
}

/**
 * Aktuelles Tempo eines Gegners unter Verlangsamung.
 * @param {World} world
 * @param {Enemy} enemy
 */
export function enemySpeed(world, enemy) {
  return world.time < enemy.slowUntil ? enemy.speed * (1 - enemy.slowFactor) : enemy.speed;
}

/**
 * Setzt Zustände auf einen Gegner. Bosse sind immun gegen Betäubung und Verwirrung, Verlangsamung wirkt halb.
 * Längere bzw. stärkere Wirkungen werden nicht durch schwächere überschrieben.
 * @param {World} world
 * @param {Enemy} enemy
 * @param {{ slow?: number, slowDuration?: number, stun?: number, confuse?: number }} status
 */
export function applyStatus(world, enemy, { slow = 0, slowDuration = 0, stun = 0, confuse = 0 }) {
  const t = world.time;
  if (slow > 0 && slowDuration > 0) {
    const factor = enemy.boss ? slow * BOSS_SLOW_FACTOR : slow;
    if (t >= enemy.slowUntil || factor >= enemy.slowFactor) enemy.slowFactor = factor;
    enemy.slowUntil = Math.max(enemy.slowUntil, t + slowDuration);
  }
  if (enemy.boss) return;
  if (stun > 0) enemy.stunnedUntil = Math.max(enemy.stunnedUntil, t + stun);
  if (confuse > 0) enemy.confusedUntil = Math.max(enemy.confusedUntil, t + confuse);
}

/**
 * Stößt einen Gegner direkt vom Helden weg; Bodengegner bleiben an Hindernissen hängen. Bosse sind immun.
 * @param {World} world
 * @param {Enemy} enemy
 * @param {number} distance
 */
export function knockback(world, enemy, distance) {
  if (enemy.boss || distance <= 0) return;
  let dx = enemy.x - world.hero.x, dz = enemy.z - world.hero.z;
  const d = Math.hypot(dx, dz);
  if (d < 1e-9) { dx = world.hero.facing.x; dz = world.hero.facing.z; } else { dx /= d; dz /= d; }
  const steps = Math.max(1, Math.ceil(distance / KNOCKBACK_SUBSTEP));
  for (let i = 0; i < steps; i++) {
    enemy.x += dx * distance / steps;
    enemy.z += dz * distance / steps;
    if (!enemy.flying) pushOutOfObstacles(world, enemy);
  }
}

/** Verwirrter Gegner: läuft in eine zufällige Richtung, die etwa einmal pro Sekunde neu gewürfelt wird. */
function wander(world, enemy, dt) {
  if (!enemy.wander || world.time >= enemy.wander.rerollAt) {
    const a = world.rng.range(0, Math.PI * 2);
    enemy.wander = { x: Math.cos(a), z: Math.sin(a), rerollAt: world.time + CONFUSE_REROLL };
  }
  const step = enemySpeed(world, enemy) * dt;
  enemy.x += enemy.wander.x * step;
  enemy.z += enemy.wander.z * step;
}

/**
 * @param {{ seed: number, animalId: string, classId: string, modifiers?: Modifier[] }} opts
 * @returns {World}
 */
export function createWorld({ seed, animalId, classId, modifiers = [] }) {
  const stats = computeStats(animalId, classId, modifiers);
  return {
    time: 0,
    seed,
    rng: createRng(seed),
    nextId: 1,
    hero: {
      x: 0, z: 0, facing: { x: 1, z: 0 },
      hp: stats.maxHp, stats, modifiers: [...modifiers],
      abilities: [{ id: CLASSES[classId].startAbility, level: 1, cooldownLeft: 0 }],
      buffs: [], radius: HERO_RADIUS, invulnerableUntil: 0, animalId, classId,
    },
    enemies: [], projectiles: [], zones: [], orbitals: [], summons: [], pickups: [], events: [],
    run: { level: 1, xp: 0, kills: 0, gold: 0, bonuses: {}, damageByAbility: {}, revivesLeft: 0 },
  };
}

/**
 * Berechnet die Heldenwerte neu. Steigt maxHp, wächst hp um die Differenz; sinkt es, wird hp gedeckelt.
 * @param {World} world
 */
export function recomputeHeroStats(world) {
  const hero = world.hero;
  const extra = [...hero.modifiers];
  for (const b of hero.buffs) extra.push(...b.modifiers);
  const oldMax = hero.stats.maxHp;
  hero.stats = computeStats(hero.animalId, hero.classId, extra);
  const diff = hero.stats.maxHp - oldMax;
  if (diff > 0) hero.hp += diff;
  hero.hp = Math.min(hero.hp, hero.stats.maxHp);
}

/**
 * @param {World} world
 * @param {string} type
 * @param {number} x
 * @param {number} z
 * @param {{ elite?: boolean, hpMul?: number, dmgMul?: number }} [opts]
 * @returns {Enemy|null} Elite und Bosse sind vom Limit von 300 Gegnern ausgenommen; reguläre Gegner liefern bei erreichtem Limit null
 */
export function spawnEnemy(world, type, x, z, { elite = false, hpMul = 1, dmgMul = 1 } = {}) {
  const def = ENEMIES[type];
  if (!def) throw new Error(`Unbekannter Gegner: ${type}`);
  if (!elite && def.behavior !== 'boss' && world.enemies.length >= MAX_ENEMIES) return null;
  const maxHp = def.hp * hpMul * (elite ? ELITE.hpMul : 1);
  const enemy = {
    id: world.nextId++, type, x, z, hp: maxHp, maxHp,
    radius: def.radius * (elite ? ELITE.scale : 1),
    speed: def.speed, damage: def.damage * dmgMul,
    elite, boss: def.behavior === 'boss', flying: !!def.flying, behavior: def.behavior,
    slowUntil: 0, slowFactor: 0, confusedUntil: 0, stunnedUntil: 0, contactReadyAt: 0, hitReadyAt: {}, ai: {},
  };
  world.enemies.push(enemy);
  return enemy;
}

/**
 * @param {World} world
 * @param {Enemy} enemy
 * @param {{ amount: number, crit: boolean }} hit
 * @param {string} abilityId
 */
export function damageEnemy(world, enemy, hit, abilityId) {
  const index = world.enemies.indexOf(enemy);
  if (index < 0) return;
  world.events.push({ type: 'hit', x: enemy.x, z: enemy.z, amount: hit.amount, crit: hit.crit });
  enemy.hp -= hit.amount;
  const dbA = world.run.damageByAbility;
  dbA[abilityId] = (dbA[abilityId] || 0) + hit.amount;
  if (enemy.hp > 0) return;

  world.enemies.splice(index, 1);
  world.run.kills++;
  world.events.push({ type: 'kill', enemyType: enemy.type, x: enemy.x, z: enemy.z });
  const def = ENEMIES[enemy.type];
  const drop = (kind, value) => world.pickups.push({ kind, x: enemy.x, z: enemy.z, value });
  drop('xp', def.xp * (enemy.elite ? ELITE.xpMul : 1));
  if (world.rng.chance(DROPS.goldChance)) drop('gold', world.rng.int(1, 3));
  if (world.rng.chance(DROPS.potionChance)) drop('potion', DROPS.potionHeal);
  if (enemy.elite) drop('chest', DROPS.chestGold);
}

/**
 * Schaden am Helden über Ausweichen und Rüstung.
 * @param {World} world
 * @param {number} rawAmount
 */
export function damageHero(world, rawAmount) {
  const hero = world.hero;
  if (world.time < hero.invulnerableUntil) return;
  const res = resolveHit(world.rng,
    { baseDamage: rawAmount, damage: 1, critChance: 0, critDamage: 1 },
    { armor: hero.stats.armor, dodge: hero.stats.dodge });
  if (res.dodged) { world.events.push({ type: 'dodge' }); return; }
  hero.hp -= res.amount;
  world.events.push({ type: 'heroHit', amount: res.amount });
}

function pushOutOfObstacles(world, e) {
  for (const o of obstaclesNear(world.seed, e.x, e.z, e.radius)) {
    const dx = e.x - o.x, dz = e.z - o.z;
    const min = e.radius + o.radius;
    const d2 = dx * dx + dz * dz;
    if (d2 >= min * min) continue;
    const d = Math.sqrt(d2);
    if (d < 1e-9) { e.x += min; continue; }
    e.x = o.x + (dx / d) * min;
    e.z = o.z + (dz / d) * min;
  }
}

function separateEnemies(world) {
  const grid = createGrid(SEPARATION_CELL);
  for (const e of world.enemies) grid.insert(e);
  for (const e of world.enemies) {
    for (const o of grid.queryCircle(e.x, e.z, e.radius)) {
      if (o.id <= e.id) continue; // jedes Paar nur einmal
      const dx = o.x - e.x, dz = o.z - e.z;
      const min = e.radius + o.radius;
      const d2 = dx * dx + dz * dz;
      if (d2 >= min * min) continue;
      const d = Math.sqrt(d2);
      const nx = d < 1e-9 ? 1 : dx / d, nz = d < 1e-9 ? 0 : dz / d;
      const push = (min - d) / 2;
      e.x -= nx * push; e.z -= nz * push;
      o.x += nx * push; o.z += nz * push;
    }
  }
}

function collectPickups(world) {
  const hero = world.hero;
  const r = hero.stats.pickupRadius;
  world.pickups = world.pickups.filter((p) => {
    const dx = p.x - hero.x, dz = p.z - hero.z;
    if (dx * dx + dz * dz > r * r) return true;
    if (p.kind === 'xp') world.run.xp += p.value * hero.stats.xpGain;
    else if (p.kind === 'gold') world.run.gold += p.value * hero.stats.goldGain;
    else if (p.kind === 'potion') {
      const amount = Math.min(hero.stats.maxHp * p.value, hero.stats.maxHp - hero.hp);
      hero.hp += amount;
      world.events.push({ type: 'heal', amount });
    }
    world.events.push({ type: 'pickup', kind: p.kind, value: p.value });
    return false;
  });
}

/**
 * @param {World} world
 * @param {number} dt
 * @param {{ moveX: number, moveZ: number }} input
 */
export function stepWorld(world, dt, input) {
  world.events = [];
  world.time += dt;
  const hero = world.hero;

  // Held bewegen
  const len = Math.hypot(input.moveX, input.moveZ);
  if (len > 0) {
    const dx = input.moveX / len, dz = input.moveZ / len;
    hero.facing = { x: dx, z: dz };
    hero.x += dx * hero.stats.moveSpeed * dt;
    hero.z += dz * hero.stats.moveSpeed * dt;
    pushOutOfObstacles(world, hero);
  }

  // Stärkungen ablaufen lassen
  const before = hero.buffs.length;
  for (const b of hero.buffs) b.timeLeft -= dt;
  hero.buffs = hero.buffs.filter((b) => b.timeLeft > 0);
  if (hero.buffs.length !== before) recomputeHeroStats(world);

  // Regeneration
  if (hero.stats.hpRegen > 0) hero.hp = Math.min(hero.stats.maxHp, hero.hp + hero.stats.hpRegen * dt);

  // Fähigkeiten auslösen, Geschosse, Zonen, Umläufe und Beschwörungen bewegen
  stepAbilities(world, dt);

  // Gegner bewegen
  for (const e of world.enemies) {
    if (world.time < e.stunnedUntil) continue;
    if (world.time < e.confusedUntil) wander(world, e, dt);
    else (BEHAVIORS[e.behavior] || BEHAVIORS.chase)(world, e, dt);
  }
  separateEnemies(world);
  for (const e of world.enemies) if (!e.flying) pushOutOfObstacles(world, e);

  // Berührungsschaden
  for (const e of world.enemies) {
    if (world.time < e.stunnedUntil) continue;
    const dx = e.x - hero.x, dz = e.z - hero.z;
    const min = e.radius + hero.radius;
    if (dx * dx + dz * dz < min * min && world.time >= e.contactReadyAt) {
      e.contactReadyAt = world.time + CONTACT_INTERVAL;
      damageHero(world, e.damage);
    }
  }

  collectPickups(world);
}
