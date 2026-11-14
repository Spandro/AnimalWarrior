import { createRng } from './rng.js';
import { computeStats } from './stats.js';
import { resolveHit } from './combat.js';
import { createGrid } from './spatial.js';
import { seedTerrain } from './terrain.js';
import { stepAbilities } from './abilities.js';
import { CLASSES } from '../data/classes.js';
import { bonusModifiers } from '../data/bonuses.js';
import { ENEMIES, ELITE, DROPS, CONTACT_INTERVAL, CONTACT_TOLERANCE, HERO_RADIUS, SEPARATION_CELL, MAX_ENEMIES,
  CONFUSE_REROLL, BOSS_SLOW_FACTOR, KNOCKBACK_SUBSTEP, CHARGE, STRAFE, RANGED, CIRCLE, BOSS_MOVES, CURL, SLITHER, VENOM, POUNCE } from '../data/enemies.js';
import { SHADOW, SHADOW_LINES } from '../data/shadow.js';

/**
 * @typedef {import('./stats.js').Stats} Stats
 * @typedef {import('../data/animals.js').Modifier} Modifier
 * @typedef {{ id: string, level: number, cooldownLeft: number }} HeroAbility
 * @typedef {{ modifiers: Modifier[], timeLeft: number, abilityId?: string }} Buff
 * @typedef {{ x: number, z: number, facing: {x:number,z:number}, hp: number, stats: Stats, modifiers: Modifier[],
 *   abilities: HeroAbility[], buffs: Buff[], radius: number, invulnerableUntil: number,
 *   poison: { until: number, dps: number, nextTick: number } | null, animalId: string, classId: string }} Hero
 *   `poison`: Gift der Kreuzotter (VENOM), nur im Lauf.
 * @typedef {{ id: number, type: string, x: number, z: number, hp: number, maxHp: number, radius: number, speed: number,
 *   damage: number, elite: boolean, boss: boolean, flying: boolean, behavior: string, slowUntil: number, slowFactor: number,
 *   confusedUntil: number, stunnedUntil: number, contactReadyAt: number, hitReadyAt: Record<string, number>, ai: object,
 *   wander?: { x: number, z: number, rerollAt: number },
 *   shadow?: boolean, style?: string, expiresAt?: number, fleeing?: boolean, fleeUntil?: number, untargetable?: boolean }} Enemy
 *   Der Schatten (`shadow`) kämpft im Stil `style` (Klasse des Helden), verschwindet bei `expiresAt` und flieht
 *   bei 1 Leben bis `fleeUntil`; währenddessen ist er `untargetable`.
 * @typedef {{ kind: 'xp'|'gold'|'potion'|'chest', x: number, z: number, value: number }} Pickup
 * @typedef {{ level: number, xp: number, kills: number, gold: number, bonuses: object, damageByAbility: Record<string, number>, revivesLeft: number }} Run
 * @typedef {{ x: number, z: number, dirX: number, dirZ: number, speed: number, damage: number, radius: number, timeLeft: number,
 *   shadow?: boolean }} EnemyProjectile
 *   Gegnergeschoss: trifft nur den Held, wird von Hindernissen aufgehalten. `shadow`: vom Schatten geworfen.
 * @typedef {{ time: number, seed: number, rng: import('./rng.js').Rng, hero: Hero, enemies: Enemy[], projectiles: object[],
 *   enemyProjectiles: EnemyProjectile[], zones: object[], orbitals: object[], summons: object[], pickups: Pickup[],
 *   events: object[], run: Run, nextId: number, openedChests: Set<string>, terrain: import('./terrain.js').Terrain }} World
 *   `openedChests`: Kennungen der schon geöffneten Karten-Kisten (`chestInCell`); `terrain`: Geländequelle.
 *   Nur im Abenteuer gesetzt (src/modes/adventure.js): `drops: 'none'` (Besiegte lassen nichts fallen, der Modus
 *   verteilt Beute selbst), `abilityMods` (Faktoren für Fähigkeiten von Hand), `contactInterval` (statt
 *   CONTACT_INTERVAL), `lifesteal` (Anteil jedes Treffers des Helden, der ihn heilt). Besonderheiten der Unterklassen
 *   (Etappe 2, leer ohne Abenteuer-Fähigkeiten): `followers` (Wolke, Haustier), `traps`; am Helden `shield`,
 *   `stealthUntil` (unsichtbar: Nicht-Bosse wandern, keine Berührungstreffer), `steal` (Klauen); an Gegnern
 *   `markedUntil`/`markPct` (Markierung); Stärkungen mit `rage` (Raserei) oder `applause` (Verlängerung je Tötung); an Gegnern `passive` mit `home` (ruht an seinem Ort, keine Berührungstreffer), `packId`, `bossId`;
 *   an Aufsammelbarem `locked` (bleibt liegen) und `ref` (Kennung, kommt im Ereignis `pickup` mit).
 */

/** Einheitsrichtung und Abstand von a nach b; bei Deckung die Richtung `fallback`. */
function towards(a, b, fallback = { x: 1, z: 0 }) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const d = Math.hypot(dx, dz);
  return d < 1e-9 ? { x: fallback.x, z: fallback.z, d: 0 } : { x: dx / d, z: dz / d, d };
}

function moveDir(enemy, dirX, dirZ, distance) {
  enemy.x += dirX * distance;
  enemy.z += dirZ * distance;
}

/**
 * Bewegungsfunktionen je behavior; unbekannte fallen auf chase zurück.
 * Sie nutzen enemyTarget und enemySpeed, damit Klon und Verlangsamung wirken; ihr Zustand liegt in enemy.ai.
 * Betäubung und Verwirrung greifen vorher in stepWorld.
 */
const BEHAVIORS = {
  chase(world, enemy, dt) {
    const to = towards(enemy, enemyTarget(world, enemy));
    if (to.d === 0) return;
    moveDir(enemy, to.x, to.z, Math.min(to.d, enemySpeed(world, enemy) * dt));
  },

  /** Laufen → Stillstand (windup) → Ansturm geradeaus → Laufen … */
  charge(world, enemy, dt) {
    const ai = enemy.ai, t = world.time;
    if (!ai.phase) { ai.phase = 'walk'; ai.until = t + CHARGE.interval; }
    if (ai.phase === 'walk' && t >= ai.until) { ai.phase = 'windup'; ai.until = t + CHARGE.windup; }
    if (ai.phase === 'windup') {
      if (t < ai.until) return;
      const to = towards(enemy, enemyTarget(world, enemy));
      ai.phase = 'dash'; ai.until = t + CHARGE.duration; ai.dirX = to.x; ai.dirZ = to.z;
    }
    if (ai.phase === 'dash') {
      if (t < ai.until) { moveDir(enemy, ai.dirX, ai.dirZ, enemySpeed(world, enemy) * CHARGE.speedMul * dt); return; }
      ai.phase = 'walk'; ai.until = t + CHARGE.interval;
    }
    BEHAVIORS.chase(world, enemy, dt);
  },

  /** Igel: verfolgt; eingerollt (nach einem Treffer) rollt er mit `CURL.speedMul`-fachem Tempo direkt aufs Ziel. */
  curl(world, enemy, dt) {
    if (!isCurled(world, enemy)) { BEHAVIORS.chase(world, enemy, dt); return; }
    const to = towards(enemy, enemyTarget(world, enemy));
    if (to.d === 0) return;
    moveDir(enemy, to.x, to.z, Math.min(to.d, enemySpeed(world, enemy) * CURL.speedMul * dt));
  },

  /**
   * Luchs: verfolgt; in `POUNCE.engageRange` duckt er sich mit Ankündigung (Kreis am Ziel) und springt dann
   * sichtbar dorthin. Eine Betäubung während des Duckens bricht den Sprung ab.
   */
  pounce(world, enemy, dt) {
    const ai = enemy.ai, t = world.time;
    if (ai.phase === 'crouch') {
      if (enemy.stunnedUntil > ai.crouchStart) { ai.phase = 'chase'; ai.readyAt = t + POUNCE.cooldown; return; }
      if (t < ai.until) return;
      ai.phase = 'leap'; ai.leapStart = ai.until; ai.fromX = enemy.x; ai.fromZ = enemy.z;
    }
    if (ai.phase === 'leap') {
      const k = Math.min(1, (t - ai.leapStart) / POUNCE.leapTime);
      enemy.x = ai.fromX + (ai.tx - ai.fromX) * k;
      enemy.z = ai.fromZ + (ai.tz - ai.fromZ) * k;
      if (k < 1) return;
      const hero = world.hero;
      if (Math.hypot(hero.x - ai.tx, hero.z - ai.tz) <= POUNCE.radius) damageHero(world, enemy.damage * (ENEMIES[enemy.type]?.pounceMul ?? POUNCE.damageMul));
      ai.phase = 'chase'; ai.readyAt = t + POUNCE.cooldown;
      return;
    }
    const target = enemyTarget(world, enemy);
    const to = towards(enemy, target);
    if (t >= (ai.readyAt ?? 0) && to.d <= POUNCE.engageRange) {
      ai.phase = 'crouch'; ai.crouchStart = t; ai.until = t + POUNCE.crouch; ai.tx = target.x; ai.tz = target.z;
      world.events.push({
        type: 'bossTelegraph', kind: 'leap', x: target.x, z: target.z, radius: POUNCE.radius,
        delay: POUNCE.crouch + POUNCE.leapTime, dirX: to.x, dirZ: to.z, damageMul: ENEMIES[enemy.type]?.pounceMul ?? POUNCE.damageMul,
      });
      return;
    }
    BEHAVIORS.chase(world, enemy, dt);
  },

  /** Nähert sich mit seitlichem Versatz, der regelmäßig die Seite wechselt. */
  strafe(world, enemy, dt) {
    approachSideways(world, enemy, dt, STRAFE);
  },

  /** Kreuzotter: wie strafe, nur enger gewunden. */
  slither(world, enemy, dt) {
    approachSideways(world, enemy, dt, SLITHER);
  },

  /** Hält Abstand und schießt auf den Helden. */
  ranged(world, enemy, dt) {
    keepRangeAndFire(world, enemy, dt, RANGED, 1, 0, enemy.damage, false);
  },

  /** Verfolgt, umkreist dann in festem Abstand und stößt regelmäßig vor. */
  circle(world, enemy, dt) {
    circleAndLunge(world, enemy, dt, CIRCLE);
  },

  /**
   * Bosse: verfolgen, dann Nah- oder Fernangriff aus `BOSS_MOVES` mit Vorwarnung, dann kurze Pause.
   * Phasen: chase → (swipe|leap|ring|dash: Ankündigung) → recover; ein Ansturm läuft dash → dashing (→ dashGap → dash …).
   */
  boss(world, enemy, dt) {
    const mv = BOSS_MOVES[enemy.type] || BOSS_MOVES.baer;
    const ai = enemy.ai, t = world.time;
    if (!ai.phase) { ai.phase = 'chase'; ai.until = t + mv.chaseTime; }
    if (mv.summon) summonHelpers(world, enemy, mv.summon);
    if (ai.phase === 'chase') {
      if (t < ai.until) { BEHAVIORS.chase(world, enemy, dt); return; }
      startBossAttack(world, enemy, mv);
      return;
    }
    if (ai.phase === 'dashing') { stepDash(world, enemy, mv); return; }
    if (ai.phase === 'dashGap') { if (t >= ai.until) startDash(world, enemy, ai.dash); return; }
    if (ai.phase === 'recover') { if (t >= ai.until) { ai.phase = 'chase'; ai.until = t + mv.chaseTime; } return; }
    if (t < ai.until) return;
    if (ai.phase === 'dash') { ai.phase = 'dashing'; ai.dashStart = ai.until; ai.dashK = 0; ai.dashHit = false; return; }
    resolveAttack(world, enemy, mv.recover);
  },

  /** Dein Schatten: kämpft im Stil der Heldenklasse; nach dem Brechen flieht er vom Helden weg. */
  shadow(world, enemy, dt) {
    const hero = world.hero;
    if (enemy.fleeing) {
      enemy.speed = hero.stats.moveSpeed * SHADOW.fleeSpeedFactor;
      const away = towards(hero, enemy, hero.facing);
      moveDir(enemy, away.x, away.z, enemySpeed(world, enemy) * dt);
      return;
    }
    enemy.speed = hero.stats.moveSpeed * SHADOW.speedFactor;
    if (enemy.style === 'magier') {
      const c = SHADOW.magier;
      keepRangeAndFire(world, enemy, dt, c, c.count, c.spreadDeg, enemy.damage * c.damageMul, true);
    } else if (enemy.style === 'dieb') {
      const c = SHADOW.dieb;
      if (circleAndLunge(world, enemy, dt, c)) fireAt(world, enemy, c, c.count, c.spreadDeg, enemy.damage * c.damageMul, true);
    } else {
      shadowMelee(world, enemy, dt, SHADOW.krieger);
    }
  },
};

/** Nähert sich mit seitlichem Versatz (Anteil `c.lateral`), Seitenwechsel alle `c.switchInterval` s. */
function approachSideways(world, enemy, dt, c) {
  const ai = enemy.ai, t = world.time;
  if (!ai.side) { ai.side = enemy.id % 2 ? 1 : -1; ai.switchAt = t + c.switchInterval; }
  if (t >= ai.switchAt) { ai.side = -ai.side; ai.switchAt = t + c.switchInterval; }
  const to = towards(enemy, enemyTarget(world, enemy));
  if (to.d === 0) return;
  const step = enemySpeed(world, enemy) * dt;
  if (to.d <= step) { moveDir(enemy, to.x, to.z, to.d); return; }
  const lx = -to.z * ai.side * c.lateral, lz = to.x * ai.side * c.lateral;
  const len = Math.hypot(to.x + lx, to.z + lz);
  moveDir(enemy, (to.x + lx) / len, (to.z + lz) / len, step);
}

/**
 * Hält `c.minRange`–`c.maxRange` Abstand zum Ziel und feuert alle `c.fireInterval` s `count` Geschosse auf den
 * Helden, wenn er höchstens `c.fireRange` entfernt ist.
 */
function keepRangeAndFire(world, enemy, dt, c, count, spreadDeg, damage, shadow) {
  const ai = enemy.ai, t = world.time;
  if (ai.fireAt === undefined) ai.fireAt = t + c.fireInterval;
  const to = towards(enemy, enemyTarget(world, enemy));
  const step = enemySpeed(world, enemy) * dt;
  if (to.d > c.maxRange) moveDir(enemy, to.x, to.z, Math.min(step, to.d - c.maxRange));
  else if (to.d < c.minRange) moveDir(enemy, -to.x, -to.z, Math.min(step, c.minRange - to.d));
  if (t < ai.fireAt) return;
  if (towards(enemy, world.hero).d > c.fireRange) return;
  ai.fireAt = t + c.fireInterval;
  fireAt(world, enemy, c, count, spreadDeg, damage, shadow);
}

/** `count` Gegnergeschosse auf den Helden, gleichmäßig über `spreadDeg` Grad gefächert. */
function fireAt(world, enemy, c, count, spreadDeg, damage, shadow) {
  const aim = towards(enemy, world.hero);
  const base = Math.atan2(aim.z, aim.x);
  const step = count > 1 ? (spreadDeg * Math.PI) / 180 / (count - 1) : 0;
  for (let i = 0; i < count; i++) {
    const a = base + (i - (count - 1) / 2) * step;
    /** @type {EnemyProjectile} */
    const p = {
      x: enemy.x, z: enemy.z, dirX: count > 1 ? Math.cos(a) : aim.x, dirZ: count > 1 ? Math.sin(a) : aim.z,
      speed: c.projectileSpeed, damage, radius: c.projectileRadius, timeLeft: c.projectileLife,
    };
    if (shadow) p.shadow = true;
    world.enemyProjectiles.push(p);
  }
}

/**
 * Verfolgt bis `c.engageRange`, umkreist dann in `c.radius` Abstand und stößt alle `c.lungeInterval` s für
 * `c.lungeDuration` s mit `c.lungeSpeedMul`-fachem Tempo geradeaus vor.
 * @returns {boolean} ob in diesem Schritt ein Vorstoß zu Ende ging
 */
function circleAndLunge(world, enemy, dt, c) {
  const ai = enemy.ai, t = world.time;
  if (!ai.side) { ai.side = enemy.id % 2 ? 1 : -1; ai.lungeAt = t + c.lungeInterval; }
  const speed = enemySpeed(world, enemy);
  if (ai.lungeUntil > t) { moveDir(enemy, ai.dirX, ai.dirZ, speed * c.lungeSpeedMul * dt); return false; }
  const ended = ai.lunging === true;
  ai.lunging = false;
  const to = towards(enemy, enemyTarget(world, enemy));
  if (to.d > c.engageRange) { BEHAVIORS.chase(world, enemy, dt); return ended; }
  if (t >= ai.lungeAt) {
    ai.lungeUntil = t + c.lungeDuration; ai.lungeAt = ai.lungeUntil + c.lungeInterval;
    ai.dirX = to.x; ai.dirZ = to.z; ai.lunging = true;
    return ended;
  }
  const radial = Math.max(-1, Math.min(1, (to.d - c.radius) / 2));
  const vx = to.x * radial - to.z * ai.side, vz = to.z * radial + to.x * ai.side;
  const len = Math.hypot(vx, vz);
  moveDir(enemy, vx / len, vz / len, speed * dt);
  return ended;
}

/**
 * Nahkampf des Krieger-Schattens: verfolgt mindestens `c.chaseTime` s; ist der Held dann nah genug, Hieb mit
 * Vorwarnung, danach `c.recover` s Pause. Ohne Held in Reichweite verfolgt er weiter (kein Sprung wie der Bär).
 */
function shadowMelee(world, enemy, dt, c) {
  const ai = enemy.ai, t = world.time, hero = world.hero;
  if (!ai.phase) { ai.phase = 'chase'; ai.until = t + c.chaseTime; }
  if (ai.phase === 'swipe') { if (t >= ai.until) resolveAttack(world, enemy, c.recover); return; }
  if (ai.phase === 'recover') {
    if (t < ai.until) return;
    ai.phase = 'chase'; ai.until = t + c.chaseTime;
  }
  const to = towards(enemy, hero, hero.facing);
  if (t >= ai.until && to.d <= enemy.radius + c.triggerRange) { startSwipe(world, enemy, to, c); return; }
  BEHAVIORS.chase(world, enemy, dt);
}

/**
 * Verstärkung: alle `s.every` s erscheinen `s.count` Gegner um den Boss. Sie übernehmen `enemy.summonHpMul` und
 * `enemy.summonDmgMul` (vom Modus gesetzt, sonst 1).
 */
function summonHelpers(world, enemy, s) {
  const ai = enemy.ai;
  ai.nextSummon ??= world.time + s.every;
  if (world.time < ai.nextSummon) return;
  ai.nextSummon = world.time + s.every;
  const ids = [];
  for (let i = 0; i < s.count; i++) {
    const a = (i / s.count) * 2 * Math.PI;
    let x = enemy.x + Math.cos(a) * (enemy.radius + s.radius), z = enemy.z + Math.sin(a) * (enemy.radius + s.radius);
    if (world.terrain.walkable && !world.terrain.walkable(x, z, 'walk')) { x = enemy.x; z = enemy.z; }
    const e = spawnEnemy(world, s.type, x, z, { hpMul: enemy.summonHpMul ?? 1, dmgMul: enemy.summonDmgMul ?? 1 });
    if (e) ids.push(e.id);
  }
  world.events.push({ type: 'bossSummon', x: enemy.x, z: enemy.z, ids });
}

/** Wählt Nah- oder Fernangriff des Bosses und kündigt ihn an. */
function startBossAttack(world, enemy, mv) {
  const hero = world.hero;
  const to = towards(enemy, hero, hero.facing);
  const a = to.d <= enemy.radius + mv.triggerRange ? mv.near : mv.far;
  if (a.kind === 'swipe') { startSwipe(world, enemy, to, a); return; }
  if (a.kind === 'dash') { enemy.ai.dash = a; enemy.ai.dashLeft = a.count; startDash(world, enemy, a); return; }
  if (a.kind === 'ring') {
    telegraph(world, enemy, {
      kind: 'ring', x: enemy.x, z: enemy.z, radius: enemy.radius + a.reach, delay: a.windup,
      dirX: to.x, dirZ: to.z, damageMul: a.damageMul, push: a.push,
    });
    return;
  }
  telegraph(world, enemy, {
    kind: 'leap', x: hero.x, z: hero.z, radius: a.radius, delay: a.windup,
    dirX: to.x, dirZ: to.z, damageMul: a.damageMul,
  });
}

/** Kündigt einen Ansturm an: Streifen ab dem Boss in Richtung Held; `radius` (Boss) lässt die Darstellung zeigen, wie weit sein Körper reicht. */
function startDash(world, enemy, a) {
  const hero = world.hero;
  const to = towards(enemy, hero, hero.facing);
  telegraph(world, enemy, {
    kind: 'dash', x: enemy.x, z: enemy.z, dirX: to.x, dirZ: to.z, length: a.length, width: a.width,
    radius: enemy.radius, delay: a.windup, damageMul: a.damageMul,
  });
}

/**
 * Ansturm: der Boss legt die Streifenlänge gleichmäßig in `dashTime` s zurück (Hindernisse schieben ihn wie sonst)
 * und trifft den Helden höchstens einmal, wenn seine Bahn in diesem Schritt ihn berührt.
 */
function stepDash(world, enemy, mv) {
  const ai = enemy.ai, a = ai.dash, att = ai.attack, hero = world.hero, t = world.time;
  const k = Math.min(1, (t - ai.dashStart) / a.dashTime);
  const step = (k - ai.dashK) * a.length;
  ai.dashK = k;
  const x0 = enemy.x, z0 = enemy.z;
  moveDir(enemy, att.dirX, att.dirZ, step);
  if (!ai.dashHit && segmentDistance(hero, x0, z0, enemy.x, enemy.z) <= enemy.radius + hero.radius + CONTACT_TOLERANCE) {
    ai.dashHit = true;
    damageHero(world, enemy.damage * a.damageMul);
  }
  if (k < 1) return;
  ai.dashLeft--;
  ai.attack = null;
  if (ai.dashLeft > 0) { ai.phase = 'dashGap'; ai.until = t + a.gap; return; }
  ai.phase = 'recover'; ai.until = t + mv.recover;
}

/** Abstand des Punkts p zur Strecke (x0, z0)–(x1, z1). */
function segmentDistance(p, x0, z0, x1, z1) {
  const dx = x1 - x0, dz = z1 - z0, len2 = dx * dx + dz * dz;
  const u = len2 > 0 ? Math.max(0, Math.min(1, ((p.x - x0) * dx + (p.z - z0) * dz) / len2)) : 0;
  return Math.hypot(p.x - (x0 + dx * u), p.z - (z0 + dz * u));
}

/** Hieb im Bogen vor dem Angreifer (Reichweite `s.reach` ab seinem Rand, halber Öffnungswinkel `s.halfAngle`). */
function startSwipe(world, enemy, to, s) {
  telegraph(world, enemy, {
    kind: 'swipe', x: enemy.x, z: enemy.z, radius: enemy.radius + s.reach, delay: s.windup,
    dirX: to.x, dirZ: to.z, halfAngle: s.halfAngle, damageMul: s.damageMul,
  });
}

/** Kündigt einen Angriff an (Ereignis `bossTelegraph`); er wirkt nach `a.delay` s. */
function telegraph(world, enemy, a) {
  const ai = enemy.ai;
  ai.phase = a.kind; ai.until = world.time + a.delay;
  ai.attack = a;
  world.events.push({ type: 'bossTelegraph', ...a });
}

/** Schaden, wenn der Held jetzt in der angekündigten Form steht; dann `recover` s Pause. */
function resolveAttack(world, enemy, recover) {
  const ai = enemy.ai, a = ai.attack, hero = world.hero;
  if (a.kind === 'leap') { enemy.x = a.x; enemy.z = a.z; }
  const dx = hero.x - a.x, dz = hero.z - a.z;
  const d = Math.hypot(dx, dz);
  let inside = d <= a.radius;
  if (inside && a.kind === 'swipe' && d > enemy.radius) {
    inside = (dx * a.dirX + dz * a.dirZ) / d >= Math.cos(a.halfAngle);
  }
  if (inside && damageHero(world, enemy.damage * a.damageMul) && a.kind === 'ring' && a.push > 0) {
    pushHero(world, d > 1e-9 ? dx / d : 1, d > 1e-9 ? dz / d : 0, a.push);
  }
  ai.phase = 'recover'; ai.until = world.time + recover; ai.attack = null;
}

/**
 * Ob ein Igel gerade eingerollt ist.
 * @param {World} world
 * @param {Enemy} enemy
 */
export function isCurled(world, enemy) {
  return world.time < (enemy.ai.curledUntil ?? -Infinity);
}

/**
 * Ziel, das ein Gegner ansteuert: die nächste Beschwörung, in deren Lockradius er steht, sonst der Held.
 * @param {World} world
 * @param {Enemy} enemy
 * @returns {{ x: number, z: number }}
 */
export function enemyTarget(world, enemy) {
  let best = world.hero, bestD2 = Infinity;
  if (enemy.shadow) return best; // lässt sich vom Schattenklon nicht täuschen
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
 * Setzt Zustände auf einen Gegner. Bosse und der Schatten sind immun gegen Betäubung und Verwirrung,
 * Verlangsamung wirkt halb. Längere bzw. stärkere Wirkungen werden nicht durch schwächere überschrieben.
 * @param {World} world
 * @param {Enemy} enemy
 * @param {{ slow?: number, slowDuration?: number, stun?: number, confuse?: number }} status
 */
export function applyStatus(world, enemy, { slow = 0, slowDuration = 0, stun = 0, confuse = 0 }) {
  const t = world.time;
  const tough = enemy.boss || enemy.shadow;
  if (slow > 0 && slowDuration > 0) {
    const factor = tough ? slow * BOSS_SLOW_FACTOR : slow;
    if (t >= enemy.slowUntil || factor >= enemy.slowFactor) enemy.slowFactor = factor;
    enemy.slowUntil = Math.max(enemy.slowUntil, t + slowDuration);
  }
  if (tough) return;
  if (stun > 0) enemy.stunnedUntil = Math.max(enemy.stunnedUntil, t + stun);
  if (confuse > 0) enemy.confusedUntil = Math.max(enemy.confusedUntil, t + confuse);
}

/**
 * Stößt einen Gegner direkt vom Helden weg; Bodengegner bleiben an Hindernissen hängen. Bosse und der Schatten sind immun.
 * @param {World} world
 * @param {Enemy} enemy
 * @param {number} distance
 */
export function knockback(world, enemy, distance) {
  if (enemy.boss || enemy.shadow || distance <= 0) return;
  let dx = enemy.x - world.hero.x, dz = enemy.z - world.hero.z;
  const d = Math.hypot(dx, dz);
  if (d < 1e-9) { dx = world.hero.facing.x; dz = world.hero.facing.z; } else { dx /= d; dz /= d; }
  const steps = Math.max(1, Math.ceil(distance / KNOCKBACK_SUBSTEP));
  for (let i = 0; i < steps; i++) {
    const px = enemy.x, pz = enemy.z;
    enemy.x += dx * distance / steps;
    enemy.z += dz * distance / steps;
    if (!enemy.flying) pushOutOfObstacles(world, enemy);
    if (blocked(world, enemy)) { enemy.x = px; enemy.z = pz; break; }
  }
}

/** Steht das Wesen auf gesperrter Fläche (nur mit Kartenraster, sonst nie)? */
function blocked(world, e) {
  return !!world.terrain.walkable && !world.terrain.walkable(e.x, e.z, e.flying ? 'fly' : 'walk');
}

/** Stößt den Helden um `distance` in Richtung (dirX, dirZ), in Teilstrecken mit Hinderniskollision. */
export function pushHero(world, dirX, dirZ, distance) {
  const hero = world.hero;
  const steps = Math.max(1, Math.ceil(distance / KNOCKBACK_SUBSTEP));
  for (let i = 0; i < steps; i++) {
    const px = hero.x, pz = hero.z;
    hero.x += dirX * distance / steps;
    hero.z += dirZ * distance / steps;
    pushOutOfObstacles(world, hero);
    if (blocked(world, hero)) { hero.x = px; hero.z = pz; break; }
  }
}

/** Verwirrter Gegner: läuft in eine zufällige Richtung, die etwa einmal pro Sekunde neu gewürfelt wird. */
/**
 * Ruhender Gegner (Abenteuer, `passive`): läuft gemächlich um seinen Ort `home` (Kreis mit `home.r`), kehrt dorthin
 * zurück, wenn er weiter weg ist.
 */
function stepPassive(world, enemy, dt) {
  const h = enemy.home;
  if (!h) return;
  const to = towards(enemy, h);
  if (to.d > h.r) moveDir(enemy, to.x, to.z, Math.min(to.d, enemy.speed * dt));
  else wander(world, enemy, dt * 0.4);
}

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
 * @param {{ seed: number, animalId: string, classId: string, modifiers?: Modifier[], terrain?: import('./terrain.js').Terrain }} opts
 *   `terrain`: Geländequelle (Standard: zufällige Hindernisse aus dem Seed, wie im Wellen-Modus)
 * @returns {World}
 */
export function createWorld({ seed, animalId, classId, modifiers = [], terrain }) {
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
      buffs: [], radius: HERO_RADIUS, invulnerableUntil: 0, poison: null, animalId, classId, shield: null, stealthUntil: 0, steal: null,
    },
    enemies: [], projectiles: [], enemyProjectiles: [], zones: [], orbitals: [], summons: [], pickups: [], events: [],
    followers: [], traps: [],
    run: { level: 1, xp: 0, kills: 0, gold: 0, bonuses: {}, damageByAbility: {}, revivesLeft: 0 },
    openedChests: new Set(),
    terrain: terrain ?? seedTerrain(seed),
  };
}

/**
 * Berechnet die Heldenwerte neu. Steigt maxHp, wächst hp um die Differenz; sinkt es, wird hp gedeckelt.
 * @param {World} world
 */
export function recomputeHeroStats(world) {
  const hero = world.hero;
  const extra = [...hero.modifiers, ...bonusModifiers(world.run.bonuses)];
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
  if (!elite && def.behavior !== 'boss' && cappedEnemyCount(world) >= MAX_ENEMIES) return null;
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
 * Gegner, die zum Limit von 300 zählen: alle außer dem Schatten.
 * @param {World} world
 */
export function cappedEnemyCount(world) {
  let n = world.enemies.length;
  for (const e of world.enemies) if (e.shadow) n--;
  return n;
}

/**
 * Ob Fähigkeiten, Treffer, Berührung und Hinausschieben einen Gegner erfassen: lebend und nicht unantastbar
 * (der fliehende Schatten ist es nicht).
 * @param {Enemy} enemy
 */
export function isTargetable(enemy) {
  return enemy.hp > 0 && !enemy.untargetable;
}

/**
 * Setzt den Schatten des Helden in die Welt: Bild und Kampfstil wie die Heldenklasse, außerhalb des Limits,
 * ohne Eintrag in ENEMIES (Werte aus SHADOW). Tempo folgt in jedem Schritt dem Helden.
 * @param {World} world
 * @param {number} x
 * @param {number} z
 * @param {{ hp: number, damage: number, expiresAt: number }} opts
 * @returns {Enemy}
 */
export function spawnShadow(world, x, z, { hp, damage, expiresAt }) {
  const enemy = {
    id: world.nextId++, type: 'schatten', x, z, hp, maxHp: hp, radius: SHADOW.radius,
    speed: world.hero.stats.moveSpeed * SHADOW.speedFactor, damage,
    elite: false, boss: false, flying: false, behavior: 'shadow',
    slowUntil: 0, slowFactor: 0, confusedUntil: 0, stunnedUntil: 0, contactReadyAt: 0, hitReadyAt: {}, ai: {},
    shadow: true, style: world.hero.classId, expiresAt, fleeing: false, fleeUntil: Infinity, untargetable: false,
  };
  world.enemies.push(enemy);
  return enemy;
}

/**
 * Schaden an einem Gegner. Unantastbare nehmen keinen. Der Schatten fällt nie unter 1 Leben: erreicht er 1,
 * flieht er (`shadowFlee`) und lässt an dieser Stelle eine Truhe fallen; er zählt nie als Tötung.
 * @param {World} world
 * @param {Enemy} enemy
 * @param {{ amount: number, crit: boolean }} hit
 * @param {string} abilityId
 */
export function damageEnemy(world, enemy, hit, abilityId) {
  const index = world.enemies.indexOf(enemy);
  if (index < 0 || enemy.untargetable) return;
  let amount = enemy.behavior === 'curl' ? curlOnHit(world, enemy, hit.amount) : hit.amount;
  if (enemy.markedUntil > world.time) amount = Math.round(amount * (1 + enemy.markPct));
  const armor = ENEMIES[enemy.type]?.armor;
  if (armor) amount = Math.max(1, amount - armor);
  world.events.push({ type: 'hit', x: enemy.x, z: enemy.z, amount, crit: hit.crit });
  const dbA = world.run.damageByAbility;
  if (enemy.shadow) {
    const dealt = Math.max(0, Math.min(hit.amount, enemy.hp - 1));
    enemy.hp -= dealt;
    dbA[abilityId] = (dbA[abilityId] || 0) + dealt;
    if (enemy.hp <= 1) startShadowFlee(world, enemy);
    return;
  }
  enemy.hp -= amount;
  dbA[abilityId] = (dbA[abilityId] || 0) + amount;
  if (world.lifesteal > 0) {
    const hero = world.hero;
    hero.hp = Math.min(hero.stats.maxHp, hero.hp + amount * world.lifesteal);
  }
  const steal = world.hero.steal;
  const stealing = !!steal && world.time < steal.until;
  if (stealing && steal.given < steal.cap && world.rng.chance(steal.chance)) {
    const value = Math.min(world.rng.int(steal.min, steal.max), steal.cap - steal.given);
    steal.given += value;
    world.events.push({ type: 'stealGold', value, x: enemy.x, z: enemy.z });
  }
  if (enemy.hp > 0) return;

  world.enemies.splice(index, 1);
  world.run.kills++;
  const kill = { type: 'kill', enemyType: enemy.type, x: enemy.x, z: enemy.z, id: enemy.id, elite: enemy.elite, boss: enemy.boss, packId: enemy.packId ?? null, bossId: enemy.bossId ?? null };
  if (stealing) kill.doubleLoot = true;
  world.events.push(kill);
  for (const b of world.hero.buffs) {
    if (!b.applause) continue;
    const add = Math.max(0, Math.min(b.applause.perKill, b.applause.max - b.applause.total));
    b.timeLeft += add;
    b.applause.total += add;
  }
  if (world.drops === 'none') return;
  const def = ENEMIES[enemy.type];
  const drop = (kind, value) => world.pickups.push({ kind, x: enemy.x, z: enemy.z, value });
  drop('xp', def.xp * (enemy.elite ? ELITE.xpMul : 1));
  if (world.rng.chance(DROPS.goldChance)) drop('gold', world.rng.int(1, 3));
  if (world.rng.chance(DROPS.potionChance)) drop('potion', DROPS.potionHeal);
  if (enemy.elite) drop('chest', DROPS.chestGold);
}

/**
 * Igel: eingerollt nimmt er nur `CURL.damageTaken` des Schadens; sonst rollt ihn ein Treffer ein (dieser zählt voll),
 * sofern die Abklingzeit vorbei ist. Liefert den wirksamen Schaden.
 */
function curlOnHit(world, enemy, amount) {
  const ai = enemy.ai, t = world.time;
  if (isCurled(world, enemy)) return amount * CURL.damageTaken;
  if (t >= (ai.curlReadyAt ?? -Infinity)) {
    ai.curledUntil = t + CURL.duration;
    ai.curlReadyAt = ai.curledUntil + CURL.cooldown;
  }
  return amount;
}

/** Der Schatten ist gebrochen: Truhe an seiner Stelle, dann flieht er unantastbar `SHADOW.fleeDuration` s. */
function startShadowFlee(world, enemy) {
  enemy.hp = 1;
  enemy.fleeing = true;
  enemy.untargetable = true;
  enemy.fleeUntil = world.time + SHADOW.fleeDuration;
  enemy.ai = {};
  world.pickups.push({ kind: 'chest', x: enemy.x, z: enemy.z, value: DROPS.chestGold });
  world.events.push({ type: 'shadowFlee', line: world.rng.pick(SHADOW_LINES.flee), x: enemy.x, z: enemy.z });
}

/**
 * Schaden am Helden über Ausweichen und Rüstung; ein Schild (`hero.shield`, Abenteuer) fängt danach zuerst ab.
 * Gifttreffer (`poison`) tragen im Ereignis `heroHit` das Feld `poison: true`.
 * @param {World} world
 * @param {number} rawAmount
 * @param {{ poison?: boolean }} [opts]
 * @returns {boolean} ob Schaden ankam
 */
export function damageHero(world, rawAmount, { poison = false } = {}) {
  const hero = world.hero;
  if (world.time < hero.invulnerableUntil) return false;
  const res = resolveHit(world.rng,
    { baseDamage: rawAmount, damage: 1, critChance: 0, critDamage: 1 },
    { armor: hero.stats.armor, dodge: hero.stats.dodge });
  if (res.dodged) { world.events.push({ type: 'dodge' }); return false; }
  let amount = res.amount;
  if (hero.shield) {
    const absorbed = Math.min(hero.shield.hp, amount);
    hero.shield.hp -= absorbed;
    amount -= absorbed;
    world.events.push({ type: 'shieldHit', amount: absorbed });
    if (hero.shield.hp <= 0) hero.shield = null;
    if (amount <= 0) return true;
  }
  hero.hp -= amount;
  world.events.push(poison ? { type: 'heroHit', amount, poison: true } : { type: 'heroHit', amount });
  return true;
}

/**
 * Gibt dem Helden einen Schild (Abenteuer, Besonderheit „Breites Kreuz“). Ein neuer ersetzt den alten, er stapelt nie.
 * @param {World} world
 * @param {number} hp
 * @param {number} duration
 */
export function giveShield(world, hp, duration) {
  world.hero.shield = { hp, until: world.time + duration };
}

/** Ein durchgekommener Otterbiss vergiftet (oder frischt das Gift auf); der Tick-Takt eines laufenden Gifts bleibt. */
function poisonHero(world, enemy) {
  const hero = world.hero, t = world.time;
  const dps = VENOM.dpsMul * enemy.damage;
  if (hero.poison) {
    hero.poison.until = t + VENOM.duration;
    hero.poison.dps = Math.max(hero.poison.dps, dps);
  } else {
    hero.poison = { until: t + VENOM.duration, dps, nextTick: t + VENOM.tick };
  }
}

/** Gift-Ticks bis zur aktuellen Zeit; nach dem letzten Tick ist das Gift weg. */
function stepPoison(world) {
  const hero = world.hero, p = hero.poison;
  if (!p) return;
  const end = p.until + 1e-9;
  while (p.nextTick <= end && world.time >= p.nextTick) {
    p.nextTick += VENOM.tick;
    damageHero(world, p.dps * VENOM.tick, { poison: true });
  }
  if (p.nextTick > end) hero.poison = null;
}

function pushOutOfObstacles(world, e) {
  for (const o of world.terrain.obstaclesNear(e.x, e.z, e.radius)) {
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
  for (const e of world.enemies) if (!e.untargetable) grid.insert(e);
  for (const e of world.enemies) {
    if (e.untargetable) continue;
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

/** Schiebt jeden erfassbaren Gegner, der den Heldenkreis überlappt, geradlinig hinaus (der Held bleibt unbewegt). */
function pushEnemiesOutOfHero(world) {
  const hero = world.hero;
  for (const e of world.enemies) {
    if (!isTargetable(e)) continue;
    const min = e.radius + hero.radius;
    const to = towards(hero, e);
    if (to.d >= min) continue;
    e.x = hero.x + to.x * min;
    e.z = hero.z + to.z * min;
    if (!e.flying) pushOutOfObstacles(world, e);
  }
}

function stepEnemyProjectiles(world, dt) {
  const hero = world.hero;
  world.enemyProjectiles = world.enemyProjectiles.filter((p) => {
    p.x += p.dirX * p.speed * dt;
    p.z += p.dirZ * p.speed * dt;
    p.timeLeft -= dt;
    if (p.timeLeft <= 0 || world.terrain.obstaclesNear(p.x, p.z, p.radius).length > 0) return false;
    if (world.terrain.walkable && !world.terrain.walkable(p.x, p.z, 'shot')) return false;
    const min = p.radius + hero.radius;
    if ((p.x - hero.x) ** 2 + (p.z - hero.z) ** 2 >= min * min) return true;
    damageHero(world, p.damage);
    return false;
  });
}

function collectPickups(world) {
  const hero = world.hero;
  const r = hero.stats.pickupRadius;
  world.pickups = world.pickups.filter((p) => {
    if (p.locked) return true;
    const dx = p.x - hero.x, dz = p.z - hero.z;
    if (dx * dx + dz * dz > r * r) return true;
    if (p.kind === 'xp') world.run.xp += p.value * hero.stats.xpGain;
    else if (p.kind === 'gold') world.run.gold += p.value * hero.stats.goldGain;
    else if (p.kind === 'potion') {
      const amount = Math.min(hero.stats.maxHp * p.value, hero.stats.maxHp - hero.hp);
      hero.hp += amount;
      world.events.push({ type: 'heal', amount });
    }
    world.events.push(p.ref === undefined ? { type: 'pickup', kind: p.kind, value: p.value } : { type: 'pickup', kind: p.kind, value: p.value, ref: p.ref });
    return false;
  });
}

/**
 * @param {World} world
 * @param {number} dt
 * @param {{ moveX: number, moveZ: number }} input
 * @param {{ inert?: boolean }} [opts] `inert`: der Held ist träge (Sterbephase) – er bewegt sich nicht, regeneriert nicht,
 *   löst nichts aus und sammelt nichts ein; Gegner, Geschosse und Zonen laufen weiter.
 */
export function stepWorld(world, dt, input, { inert = false } = {}) {
  world.events = [];
  world.time += dt;
  const hero = world.hero;
  const walkable = world.terrain.walkable;
  const startPos = walkable ? new Map([[hero, [hero.x, hero.z]], ...world.enemies.map((e) => [e, [e.x, e.z]])]) : null;

  // Held bewegen
  const len = inert ? 0 : Math.hypot(input.moveX, input.moveZ);
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

  if (hero.shield && world.time >= hero.shield.until) hero.shield = null;

  // Regeneration
  if (!inert && hero.stats.hpRegen > 0) hero.hp = Math.min(hero.stats.maxHp, hero.hp + hero.stats.hpRegen * dt);

  // Fähigkeiten auslösen, Geschosse, Zonen, Umläufe und Beschwörungen bewegen
  stepAbilities(world, dt, !inert);

  // Gegner bewegen
  const hidden = hero.stealthUntil > world.time;
  for (const e of world.enemies) {
    if (e.passive) { stepPassive(world, e, dt); continue; }
    if (world.time < e.stunnedUntil) continue;
    if (hidden && !e.boss && !e.shadow) { wander(world, e, dt); continue; }
    if (world.time < e.confusedUntil) wander(world, e, dt);
    else (BEHAVIORS[e.behavior] || BEHAVIORS.chase)(world, e, dt);
  }
  separateEnemies(world);
  for (const e of world.enemies) if (!e.flying) pushOutOfObstacles(world, e);
  pushEnemiesOutOfHero(world);
  stepEnemyProjectiles(world, dt);

  // Berührungsschaden
  for (const e of world.enemies) {
    if (world.time < e.stunnedUntil || !isTargetable(e) || e.passive || (hidden && !e.boss && !e.shadow)) continue;
    const dx = e.x - hero.x, dz = e.z - hero.z;
    const min = e.radius + hero.radius + CONTACT_TOLERANCE;
    if (dx * dx + dz * dz <= min * min && world.time >= e.contactReadyAt) {
      e.contactReadyAt = world.time + (world.contactInterval ?? CONTACT_INTERVAL);
      if (damageHero(world, e.damage) && ENEMIES[e.type]?.venom) poisonHero(world, e);
    }
  }
  stepPoison(world);

  if (startPos) for (const [e, [x, z]] of startPos) keepWalkable(world, e, x, z);

  if (!inert) collectPickups(world);
}

/**
 * Hält ein Wesen auf begehbarer Fläche: Ist seine neue Stelle gesperrt, wird achsenweise auf die Stelle vom Anfang
 * des Schritts zurückgenommen (erst nur z, dann nur x, sonst ganz) – so gleitet es an Rändern entlang.
 */
function keepWalkable(world, e, oldX, oldZ) {
  const mode = e.flying ? 'fly' : 'walk';
  const ok = (x, z) => world.terrain.walkable(x, z, mode);
  if (ok(e.x, e.z) || !ok(oldX, oldZ)) return; // wer schon im Gesperrten stand, darf hinaus
  if (ok(e.x, oldZ)) { e.z = oldZ; return; }
  if (ok(oldX, e.z)) { e.x = oldX; return; }
  e.x = oldX; e.z = oldZ;
}
