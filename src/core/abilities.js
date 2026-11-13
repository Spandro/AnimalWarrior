import { resolveHit } from './combat.js';
import { createGrid } from './spatial.js';
import { damageEnemy, applyStatus, knockback, recomputeHeroStats, isTargetable } from './world.js';
import { ABILITIES, AREA_KEYS, PROJECTILE_SUBSTEP, ABILITY_GRID_CELL } from '../data/abilities.js';

/**
 * @typedef {import('./world.js').World} World
 * @typedef {import('./world.js').Enemy} Enemy
 * @typedef {Record<string, number>} AbilityParams
 * @typedef {{ world: World, grid: ReturnType<typeof createGrid> }} Ctx
 * @typedef {{ x: number, z: number, dirX: number, dirZ: number, enemy: Enemy|null }} Target
 * @typedef {{ abilityId: string, x: number, z: number, dirX: number, dirZ: number, speed: number, size: number,
 *   distanceLeft: number, pierceLeft: number, explosion: number, damage: number, hitIds: number[] }} Projectile
 * @typedef {{ abilityId: string, x: number, z: number, radius: number, delayLeft: number, timeLeft: number, landed: boolean,
 *   damage: number, tickDamage: number, tickInterval: number, tickLeft: number, confuse: number }} Zone
 * @typedef {{ abilityId: string, level: number, index: number, count: number, angle: number, orbitRadius: number,
 *   orbitSpeed: number, size: number, damage: number, hitInterval: number, x: number, z: number }} Orbital
 * @typedef {{ abilityId: string, x: number, z: number, timeLeft: number, lureRadius: number,
 *   explodeDamage: number, explodeRadius: number }} Summon
 */

const DEG = Math.PI / 180;
const EPS = 1e-9;

/**
 * Werte einer Fähigkeit auf einer Stufe: base plus Stufen 2…level, dann Abklingzeit × stats.cooldown, Flächenmaße × stats.area.
 * @param {string} id
 * @param {number} level
 * @param {import('./stats.js').Stats} heroStats
 * @returns {AbilityParams}
 */
export function abilityParams(id, level, heroStats) {
  const def = ABILITIES[id];
  if (!def) throw new Error(`Unbekannte Fähigkeit: ${id}`);
  const p = { ...def.base };
  for (let l = 2; l <= Math.min(level, def.levels.length + 1); l++) {
    for (const c of def.levels[l - 2]) {
      if (c.add !== undefined) p[c.key] = (p[c.key] || 0) + c.add;
      if (c.mul !== undefined) p[c.key] = (p[c.key] || 0) * c.mul;
    }
  }
  p.cooldown = (p.cooldown || 0) * heroStats.cooldown;
  for (const k of AREA_KEYS) if (k in p) p[k] *= heroStats.area;
  return p;
}

/**
 * Richtung vom Helden zum nächsten anvisierbaren Gegner innerhalb der Zielreichweite params[aim.key] + aim.extra
 * (Abstand von der Heldenmitte zum Rand des Gegners).
 * @param {World} world
 * @param {AbilityParams} params
 * @param {import('../data/abilities.js').AbilityAim} aim
 * @returns {{ x: number, z: number }|null} Einheitsvektor, null ohne Gegner in Reichweite
 */
export function aimDirection(world, params, aim) {
  return aimTowardsNearest(createContext(world), params, aim);
}

/**
 * Führt eine Fähigkeit sofort aus. Ohne aim gilt target aus den Daten; mit aim kommen Richtung bzw. Zielpunkt von dort.
 * @param {World} world
 * @param {string} abilityId
 * @param {number} level
 * @param {{ x: number, z: number }} [aim]
 * @returns {boolean} ob die Fähigkeit ausgelöst hat (nearest/densest ohne Ziel lösen nicht aus)
 */
export function castAbility(world, abilityId, level, aim) {
  return cast(createContext(world), abilityId, level, aim) !== null;
}

/**
 * Zählt Abklingzeiten herunter, löst fällige automatische Fähigkeiten aus und bewegt Geschosse, Zonen, Umläufe, Beschwörungen.
 * @param {World} world
 * @param {number} dt
 * @param {boolean} [fire] false: keine Abklingzeiten, keine neuen Würfe (der Held ist träge), nur Bewegung der vorhandenen Geschosse, Zonen usw.
 */
export function stepAbilities(world, dt, fire = true) {
  const ctx = createContext(world);
  for (const a of fire ? world.hero.abilities : []) {
    const def = ABILITIES[a.id];
    if (def.trigger !== 'auto') continue;
    if (def.shape === 'orbit') {
      if (orbitOutdated(world, a)) cast(ctx, a.id, a.level);
      continue;
    }
    a.cooldownLeft = Math.max(0, a.cooldownLeft - dt);
    if (a.cooldownLeft > 0) continue;
    const p = cast(ctx, a.id, a.level);
    if (p) a.cooldownLeft = p.cooldown;
  }
  updateProjectiles(ctx, dt);
  updateZones(ctx, dt);
  updateOrbitals(ctx, dt);
  updateSummons(ctx, dt);
}

// ---------------------------------------------------------------- Hilfen

/** @returns {Ctx} */
function createContext(world) {
  const grid = createGrid(ABILITY_GRID_CELL);
  for (const e of world.enemies) if (isTargetable(e)) grid.insert(e);
  return { world, grid };
}

/** Erfassbare Gegner (lebend, nicht unantastbar), deren Kreis den Kreis (x, z, r) berührt. */
function enemiesInCircle(ctx, x, z, r) {
  return ctx.grid.queryCircle(x, z, r).filter(isTargetable);
}

/** Nächster lebender Gegner zum Punkt innerhalb von range, ohne die in exclude. */
function nearestEnemy(ctx, x, z, range, exclude) {
  let best = null, bestD2 = Infinity;
  for (const e of enemiesInCircle(ctx, x, z, range)) {
    if (exclude && exclude.has(e)) continue;
    const d2 = (e.x - x) ** 2 + (e.z - z) ** 2;
    if (d2 < bestD2) { best = e; bestD2 = d2; }
  }
  return best;
}

/** Einheitsvektor zum nächsten anvisierbaren Gegner in Zielreichweite (Mitte zu Rand), sonst null. */
function aimTowardsNearest(ctx, p, aim) {
  const h = ctx.world.hero;
  const e = nearestEnemy(ctx, h.x, h.z, (p[aim.key] || 0) + aim.extra);
  if (!e) return null;
  const dx = e.x - h.x, dz = e.z - h.z, d = Math.hypot(dx, dz);
  return d < EPS ? null : { x: dx / d, z: dz / d };
}

/** Gegner im Umkreis range des Helden mit den meisten Nachbarn innerhalb von radius. */
function densestEnemy(ctx, range, radius) {
  const h = ctx.world.hero;
  let best = null, bestN = -1;
  for (const e of enemiesInCircle(ctx, h.x, h.z, range)) {
    const n = enemiesInCircle(ctx, e.x, e.z, radius).length;
    if (n > bestN) { best = e; bestN = n; }
  }
  return best;
}

/** Schaden des Helden auf einen Gegner. */
function strike(world, enemy, baseDamage, abilityId) {
  if (!(baseDamage > 0) || !isTargetable(enemy)) return;
  const s = world.hero.stats;
  const hit = resolveHit(world.rng,
    { baseDamage, damage: s.damage, critChance: s.critChance, critDamage: s.critDamage },
    { armor: 0, dodge: 0 });
  damageEnemy(world, enemy, hit, abilityId);
}

/** Schaden, dann (falls er überlebt) Zustände und Rückstoß aus den Parametern. */
function strikeWithEffects(world, enemy, p, abilityId) {
  strike(world, enemy, p.damage, abilityId);
  if (!isTargetable(enemy)) return;
  applyStatus(world, enemy, p);
  if (p.knockback) knockback(world, enemy, p.knockback);
}

function explode(ctx, abilityId, x, z, radius, damage) {
  ctx.world.events.push({ type: 'explosion', abilityId, x, z, radius });
  for (const e of enemiesInCircle(ctx, x, z, radius)) strike(ctx.world, e, damage, abilityId);
}

/** Entfernt Elemente in place (Renderer dürfen die Arrays behalten). */
function removeWhere(list, pred) {
  let j = 0;
  for (let i = 0; i < list.length; i++) if (!pred(list[i])) list[j++] = list[i];
  list.length = j;
}

const angleDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// ---------------------------------------------------------------- Auslösen

/**
 * @param {Ctx} ctx
 * @returns {Target|null}
 */
function resolveTarget(ctx, def, p, aim) {
  const h = ctx.world.hero;
  let x = h.x, z = h.z, enemy = null;
  if (def.target === 'nearest') {
    const from = aim || h;
    enemy = nearestEnemy(ctx, from.x, from.z, p.range);
    if (enemy) { x = enemy.x; z = enemy.z; } else if (aim) { x = aim.x; z = aim.z; } else return null;
  } else if (def.target === 'densest' && !aim) {
    enemy = densestEnemy(ctx, p.range, p.radius);
    if (!enemy) return null;
    x = enemy.x; z = enemy.z;
  } else if (aim) {
    x = aim.x; z = aim.z;
  } else if (def.target === 'facing' && def.aim) {
    const dir = aimTowardsNearest(ctx, p, def.aim);
    if (dir) return { x: h.x + dir.x, z: h.z + dir.z, dirX: dir.x, dirZ: dir.z, enemy: null };
  }
  const dx = x - h.x, dz = z - h.z, d = Math.hypot(dx, dz);
  const dirX = d < EPS ? h.facing.x : dx / d, dirZ = d < EPS ? h.facing.z : dz / d;
  return { x, z, dirX, dirZ, enemy };
}

/** @returns {AbilityParams|null} */
function cast(ctx, abilityId, level, aim) {
  const world = ctx.world, def = ABILITIES[abilityId];
  const p = abilityParams(abilityId, level, world.hero.stats);
  const t = resolveTarget(ctx, def, p, aim);
  if (!t) return null;
  const event = { type: 'cast', abilityId, shape: def.shape, x: world.hero.x, z: world.hero.z, dirX: t.dirX, dirZ: t.dirZ, params: p };
  world.events.push(event);
  Object.assign(event, SHAPES[def.shape](ctx, abilityId, p, t, level));
  return p;
}

// ---------------------------------------------------------------- Wirkungsformen

/** Je Form: führt die Wirkung aus und liefert Zusatzfelder für das cast-Ereignis. */
const SHAPES = {
  arc(ctx, id, p, t) {
    const h = ctx.world.hero, half = (p.angle * DEG) / 2, base = Math.atan2(t.dirZ, t.dirX);
    const swings = Math.max(1, Math.round(p.swings));
    const hit = new Set();
    for (let i = 0; i < swings; i++) {
      const dir = base + (i * 2 * Math.PI) / swings;
      for (const e of enemiesInCircle(ctx, h.x, h.z, p.radius)) {
        if (Math.abs(angleDiff(Math.atan2(e.z - h.z, e.x - h.x), dir)) <= half) hit.add(e);
      }
    }
    for (const e of hit) strikeWithEffects(ctx.world, e, p, id);
    return {};
  },

  ring(ctx, id, p) {
    const h = ctx.world.hero;
    for (const e of enemiesInCircle(ctx, h.x, h.z, p.radius)) strikeWithEffects(ctx.world, e, p, id);
    return {};
  },

  line(ctx, id, p, t) {
    const h = ctx.world.hero;
    for (const e of enemiesInCircle(ctx, h.x, h.z, p.length + p.width)) {
      const rx = e.x - h.x, rz = e.z - h.z;
      const along = rx * t.dirX + rz * t.dirZ;
      const across = Math.abs(rz * t.dirX - rx * t.dirZ);
      if (along < -e.radius || along > p.length + e.radius || across > p.width / 2 + e.radius) continue;
      strikeWithEffects(ctx.world, e, p, id);
    }
    return {};
  },

  projectile(ctx, id, p, t) {
    const h = ctx.world.hero, n = Math.max(1, Math.round(p.count));
    const full = p.spread >= 360;
    const step = full ? (2 * Math.PI) / n : n > 1 ? (p.spread * DEG) / (n - 1) : 0;
    const start = Math.atan2(t.dirZ, t.dirX) - (full || n === 1 ? 0 : (p.spread * DEG) / 2);
    for (let i = 0; i < n; i++) {
      const a = start + i * step;
      ctx.world.projectiles.push({
        abilityId: id, x: h.x, z: h.z, dirX: Math.cos(a), dirZ: Math.sin(a), speed: p.speed, size: p.size,
        distanceLeft: p.range, pierceLeft: p.pierce, explosion: p.explosion, damage: p.damage, hitIds: [],
      });
    }
    return {};
  },

  chain(ctx, id, p, t) {
    const hits = [], seen = new Set();
    for (let cur = t.enemy; cur && hits.length < p.jumps; cur = nearestEnemy(ctx, cur.x, cur.z, p.jumpRange, seen)) {
      seen.add(cur);
      hits.push(cur);
    }
    const points = hits.map((e) => ({ x: e.x, z: e.z }));
    for (const e of hits) strikeWithEffects(ctx.world, e, p, id);
    return { points };
  },

  zone(ctx, id, p, t) {
    /** @type {Zone} */
    const zone = {
      abilityId: id, x: t.x, z: t.z, radius: p.radius, delayLeft: p.delay, timeLeft: p.duration, landed: false,
      damage: p.damage, tickDamage: p.tickDamage, tickInterval: p.tickInterval, tickLeft: 0, confuse: p.confuse,
    };
    if (zone.delayLeft <= EPS) landZone(ctx, zone);
    if (!zone.landed || zone.timeLeft > EPS) ctx.world.zones.push(zone);
    return { tx: t.x, tz: t.z };
  },

  orbit(ctx, id, p, t, level) {
    const world = ctx.world, n = Math.max(1, Math.round(p.count));
    const prev = world.orbitals.find((o) => o.abilityId === id);
    const phase = prev ? prev.angle - (prev.index * 2 * Math.PI) / prev.count : 0;
    removeWhere(world.orbitals, (o) => o.abilityId === id);
    for (let i = 0; i < n; i++) {
      world.orbitals.push({
        abilityId: id, level, index: i, count: n, angle: phase + (i * 2 * Math.PI) / n, orbitRadius: p.orbitRadius,
        orbitSpeed: p.orbitSpeed, size: p.size, damage: p.damage, hitInterval: p.hitInterval, x: world.hero.x, z: world.hero.z,
      });
    }
    placeOrbitals(world);
    return {};
  },

  buff(ctx, id, p) {
    const world = ctx.world;
    // jeder Wert <stat>Pct wird zu einem prozentualen Modifikator auf <stat>
    const modifiers = Object.keys(p).filter((k) => k.endsWith('Pct')).map((k) => ({ stat: k.slice(0, -3), pct: p[k] }));
    removeWhere(world.hero.buffs, (b) => b.abilityId === id);
    world.hero.buffs.push({ abilityId: id, modifiers, timeLeft: p.duration });
    recomputeHeroStats(world);
    return {};
  },

  summon(ctx, id, p, t) {
    ctx.world.summons.push({
      abilityId: id, x: t.x, z: t.z, timeLeft: p.duration, lureRadius: p.lureRadius,
      explodeDamage: p.explodeDamage, explodeRadius: p.explodeRadius,
    });
    return { tx: t.x, tz: t.z };
  },
};

// ---------------------------------------------------------------- Fortlaufende Objekte

function updateProjectiles(ctx, dt) {
  const world = ctx.world;
  removeWhere(world.projectiles, (pr) => {
    let travel = Math.min(pr.speed * dt, pr.distanceLeft);
    while (travel > EPS) {
      const s = Math.min(PROJECTILE_SUBSTEP, travel);
      travel -= s;
      pr.distanceLeft -= s;
      pr.x += pr.dirX * s;
      pr.z += pr.dirZ * s;
      const touched = enemiesInCircle(ctx, pr.x, pr.z, pr.size).filter((e) => !pr.hitIds.includes(e.id));
      touched.sort((a, b) => ((a.x - pr.x) ** 2 + (a.z - pr.z) ** 2) - ((b.x - pr.x) ** 2 + (b.z - pr.z) ** 2));
      for (const e of touched) {
        if (pr.explosion > 0) { explode(ctx, pr.abilityId, pr.x, pr.z, pr.explosion, pr.damage); return true; }
        pr.hitIds.push(e.id);
        strike(world, e, pr.damage, pr.abilityId);
        if (--pr.pierceLeft <= 0) return true;
      }
    }
    return pr.distanceLeft <= EPS;
  });
}

/** Aufschlag: Sofortschaden und Verwirrung, dann der erste Tick. */
function landZone(ctx, zone) {
  zone.landed = true;
  if (zone.damage > 0) explode(ctx, zone.abilityId, zone.x, zone.z, zone.radius, zone.damage);
  if (zone.confuse > 0) {
    for (const e of enemiesInCircle(ctx, zone.x, zone.z, zone.radius)) applyStatus(ctx.world, e, { confuse: zone.confuse });
  }
  tickZone(ctx, zone);
}

function tickZone(ctx, zone) {
  if (!(zone.tickDamage > 0) || zone.timeLeft <= EPS) return;
  for (const e of enemiesInCircle(ctx, zone.x, zone.z, zone.radius)) strike(ctx.world, e, zone.tickDamage, zone.abilityId);
  zone.tickLeft += zone.tickInterval;
}

function updateZones(ctx, dt) {
  removeWhere(ctx.world.zones, (zone) => {
    if (!zone.landed) {
      zone.delayLeft -= dt;
      if (zone.delayLeft > EPS) return false;
      landZone(ctx, zone);
      return zone.timeLeft <= EPS;
    }
    zone.timeLeft -= dt;
    zone.tickLeft -= dt;
    if (zone.timeLeft <= EPS) return true;
    if (zone.tickLeft <= EPS) tickZone(ctx, zone);
    return false;
  });
}

/** Umlauf neu aufsetzen, wenn er fehlt oder Stufe bzw. Bahnradius sich geändert haben. */
function orbitOutdated(world, heroAbility) {
  const orb = world.orbitals.find((o) => o.abilityId === heroAbility.id);
  if (!orb) return true;
  return orb.level !== heroAbility.level ||
    orb.orbitRadius !== abilityParams(heroAbility.id, heroAbility.level, world.hero.stats).orbitRadius;
}

function placeOrbitals(world) {
  const h = world.hero;
  for (const o of world.orbitals) {
    o.x = h.x + Math.cos(o.angle) * o.orbitRadius;
    o.z = h.z + Math.sin(o.angle) * o.orbitRadius;
  }
}

function updateOrbitals(ctx, dt) {
  const world = ctx.world;
  for (const o of world.orbitals) o.angle += o.orbitSpeed * dt;
  placeOrbitals(world);
  for (const o of world.orbitals) {
    for (const e of enemiesInCircle(ctx, o.x, o.z, o.size)) {
      if (world.time < (e.hitReadyAt[o.abilityId] || 0)) continue;
      e.hitReadyAt[o.abilityId] = world.time + o.hitInterval;
      strike(world, e, o.damage, o.abilityId);
    }
  }
}

function updateSummons(ctx, dt) {
  removeWhere(ctx.world.summons, (s) => {
    s.timeLeft -= dt;
    if (s.timeLeft > EPS) return false;
    if (s.explodeDamage > 0) explode(ctx, s.abilityId, s.x, s.z, s.explodeRadius, s.explodeDamage);
    return true;
  });
}
