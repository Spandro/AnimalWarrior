import { resolveHit } from './combat.js';
import { createGrid } from './spatial.js';
import { damageEnemy, applyStatus, knockback, recomputeHeroStats, isTargetable, giveShield } from './world.js';
import { ABILITIES, AREA_KEYS, PROJECTILE_SUBSTEP, ABILITY_GRID_CELL } from '../data/abilities.js';
import { SIGNATURE_RULES } from '../data/adventure.js';

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
 * @param {import('../data/adventure.js').MANUAL | null} [manual] Faktoren für Fähigkeiten von Hand (Abenteuer)
 * @returns {AbilityParams}
 */
export function abilityParams(id, level, heroStats, manual = null) {
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
  if (manual) {
    for (const k of DAMAGE_KEYS) if (k in p) p[k] *= manual.damageMul;
    if (def.shape === 'orbit') { p.cooldown = manual.orbitCooldown; p.duration = manual.orbitSeconds; }
    else p.cooldown = Math.max(manual.minCooldown, p.cooldown * manual.cooldownMul);
    if (def.shape === 'buff') p.duration = manual.buffSeconds;
    for (const b of manual.specials ?? []) applySpecial(p, def, b);
  }
  return p;
}

/**
 * Besonderer Dauer-Bonus auf einen Wert der Fähigkeit (nur wenn sie den Wert hat, die Form passt und – bei
 * `slowDuration` – sie überhaupt verlangsamt).
 * @param {AbilityParams} p
 * @param {import('../data/abilities.js').AbilityDef} def
 * @param {import('../data/subclasses.js').SpecialBonus} b
 */
function applySpecial(p, def, b) {
  if (!(b.special in p)) return;
  if (b.shape && ![].concat(b.shape).includes(def.shape)) return;
  if (b.special === 'slowDuration' && !(p.slow > 0)) return;
  if (b.mode === 'pct') p[b.special] *= 1 + b.value;
  else p[b.special] += b.value;
}

/** Werte, die bei Fähigkeiten von Hand mit `damageMul` wachsen. */
const DAMAGE_KEYS = ['damage', 'tickDamage', 'explodeDamage'];

/**
 * Reichweite, in der die Grundattacke im Abenteuer zuschlägt (`gate: 'engage'`): Hiebe ihr Radius plus Spielraum,
 * Linien ihre Länge, alles mit Ziel seine Suchweite.
 * @param {import('../data/abilities.js').AbilityDef} def
 * @param {AbilityParams} p
 */
export function engageRange(def, p) {
  if (def.shape === 'arc') return p.radius + (def.aim?.extra ?? 1.5);
  if (def.shape === 'line') return p.length;
  if (def.shape === 'ring') return p.radius;
  return p.range ?? p.radius ?? 0;
}

/**
 * Löst eine Fähigkeit von Hand aus (`manual: true` am Helden), wenn sie bereit ist und ein Ziel findet; setzt dann
 * die Abklingzeit. Faktoren aus `world.abilityMods`.
 * @param {World} world
 * @param {string} abilityId
 * @returns {boolean}
 */
export function castManual(world, abilityId) {
  const a = world.hero.abilities.find((h) => h.id === abilityId && h.manual);
  if (!a || a.cooldownLeft > 0) return false;
  const p = cast(createContext(world), a.id, a.level, undefined, world.abilityMods ?? null);
  if (!p) return false;
  a.cooldownLeft = p.cooldown;
  if (ABILITIES[a.id].shape === 'orbit') for (const o of world.orbitals) if (o.abilityId === a.id) o.until = world.time + p.duration;
  return true;
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
    if (a.manual) { a.cooldownLeft = Math.max(0, a.cooldownLeft - dt); continue; }
    if (a.gate === 'engage' && a.cooldownLeft <= dt) {
      const p = abilityParams(a.id, a.level, world.hero.stats);
      if (!nearestEnemy(ctx, world.hero.x, world.hero.z, engageRange(def, p))) { a.cooldownLeft = Math.max(0, a.cooldownLeft - dt); continue; }
    }
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
  if (world.followers?.length) updateFollowers(ctx, dt);
  if (world.traps?.length) updateTraps(ctx);
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

/**
 * Schadensbonus der Raserei (Abenteuer): 0 bei vollem Leben, linear bis `maxPct` bei `rageFullAtHp` Leben und darunter.
 * @param {World} world
 */
export function rageBonus(world) {
  const h = world.hero;
  const b = h.buffs.find((x) => x.rage > 0);
  if (!b) return 0;
  const missing = 1 - h.hp / h.stats.maxHp;
  return b.rage * Math.min(1, Math.max(0, missing / (1 - SIGNATURE_RULES.rageFullAtHp)));
}

/** Schaden des Helden auf einen Gegner. Unsichtbar (Abenteuer) ist der erste Treffer sicher kritisch und beendet sie. */
function strike(world, enemy, baseDamage, abilityId) {
  if (!(baseDamage > 0) || !isTargetable(enemy)) return;
  const h = world.hero, s = h.stats;
  const rage = rageBonus(world);
  const sneak = h.stealthUntil > world.time;
  if (sneak) h.stealthUntil = 0;
  const hit = resolveHit(world.rng,
    { baseDamage: rage > 0 ? baseDamage * (1 + rage) : baseDamage, damage: s.damage, critChance: sneak ? 1 : s.critChance, critDamage: s.critDamage },
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
function cast(ctx, abilityId, level, aim, manual = null) {
  const world = ctx.world, def = ABILITIES[abilityId];
  const p = abilityParams(abilityId, level, world.hero.stats, manual);
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
      const pr = {
        abilityId: id, x: h.x, z: h.z, dirX: Math.cos(a), dirZ: Math.sin(a), speed: p.speed, size: p.size,
        distanceLeft: p.range, pierceLeft: p.pierce, explosion: p.explosion, damage: p.damage, hitIds: [],
      };
      if (p.slow > 0 || p.stun > 0 || p.knockback > 0) {
        pr.effects = { slow: p.slow ?? 0, slowDuration: p.slowDuration ?? 0, stun: p.stun ?? 0, knockback: p.knockback ?? 0 };
      }
      ctx.world.projectiles.push(pr);
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
    if (p.slow > 0) { zone.slow = p.slow; zone.slowDuration = p.slowDuration; }
    if (p.healPct > 0) zone.healPct = p.healPct;
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
    const n = Math.max(1, Math.round(p.count ?? 1));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * Math.PI, r = n > 1 ? SIGNATURE_RULES.summonSpread : 0;
      ctx.world.summons.push({
        abilityId: id, x: t.x + Math.cos(a) * r, z: t.z + Math.sin(a) * r, timeLeft: p.duration, lureRadius: p.lureRadius,
        explodeDamage: p.explodeDamage, explodeRadius: p.explodeRadius,
      });
    }
    return { tx: t.x, tz: t.z };
  },

  // ------------------------------------------------ Besonderheiten der Unterklassen (nur Abenteuer, Spec §6)

  /** Raserei: Stärkung ohne Werte; der Schadensbonus kommt zur Trefferzeit aus `rageBonus`. */
  rage(ctx, id, p) {
    const h = ctx.world.hero;
    removeWhere(h.buffs, (b) => b.abilityId === id);
    h.buffs.push({ abilityId: id, modifiers: [], timeLeft: p.duration, rage: p.maxPct });
    return {};
  },

  /** Schild aus einem Anteil des höchsten Lebens; ersetzt einen alten. */
  shield(ctx, id, p) {
    giveShield(ctx.world, ctx.world.hero.stats.maxHp * p.shieldPct, p.duration);
    return {};
  },

  /** Heilzone: Zone an der Heldenposition, die den Helden darin heilt. */
  healzone(ctx, id, p, t) {
    return SHAPES.zone(ctx, id, p, t);
  },

  /** Begleitwolke: folgt dem Helden und trifft im Takt den nächsten Gegner in Reichweite. */
  cloud(ctx, id, p) {
    const w = ctx.world, h = w.hero;
    removeWhere(w.followers, (f) => f.abilityId === id);
    w.followers.push({ kind: 'cloud', abilityId: id, x: h.x, z: h.z, until: w.time + p.duration, nextAt: w.time,
      interval: p.interval, range: p.range, damage: p.damage });
    return {};
  },

  /** Einfrieren: schon verlangsamte Gegner werden betäubt (Bosse nie), die anderen verlangsamt. */
  freeze(ctx, id, p) {
    const w = ctx.world, h = w.hero;
    for (const e of enemiesInCircle(ctx, h.x, h.z, p.radius)) {
      const slowed = w.time < e.slowUntil && e.slowFactor > 0;
      strike(w, e, p.damage, id);
      if (!isTargetable(e)) continue;
      if (slowed && !e.boss && !e.shadow) {
        applyStatus(w, e, { stun: p.freezeStun });
        w.events.push({ type: 'freeze', x: e.x, z: e.z, id: e.id });
      } else applyStatus(w, e, { slow: p.slow, slowDuration: p.slowDuration });
    }
    return {};
  },

  /** Trankwurf: Geschoss zum nächsten Gegner, beim Aufschlag eine Wirkung per Zufall der Welt. */
  potion(ctx, id, p, t) {
    const h = ctx.world.hero;
    ctx.world.projectiles.push({
      abilityId: id, x: h.x, z: h.z, dirX: t.dirX, dirZ: t.dirZ, speed: p.speed, size: p.size,
      distanceLeft: Math.min(p.range, Math.hypot(t.x - h.x, t.z - h.z) + p.size), pierceLeft: 1, explosion: 0, damage: p.damage, hitIds: [],
      potion: { radius: p.radius, slow: p.slow, slowDuration: p.slowDuration, healPct: p.healPct },
    });
    return {};
  },

  /** Klauen: Zustand am Helden; Gold und doppelte Beutechance entstehen in `damageEnemy`. */
  steal(ctx, id, p) {
    const w = ctx.world;
    w.hero.steal = { until: w.time + p.duration, chance: p.goldChance, min: p.goldMin, max: p.goldMax, cap: p.goldCap, given: 0 };
    return {};
  },

  /** Unsichtbarkeit: Nicht-Bosse verlieren das Ziel; der erste Treffer ist kritisch und beendet sie (`strike`). */
  stealth(ctx, id, p) {
    ctx.world.hero.stealthUntil = ctx.world.time + p.duration;
    return {};
  },

  /** Falle an der Heldenposition; die älteste verschwindet, wenn es mehr als `maxTraps` sind. */
  trap(ctx, id, p) {
    const w = ctx.world, h = w.hero;
    w.traps.push({ abilityId: id, x: h.x, z: h.z, radius: p.radius, damage: p.damage, stun: p.stun, until: w.time + p.duration });
    const mine = w.traps.filter((tr) => tr.abilityId === id);
    const extra = mine.length - Math.max(1, Math.round(p.maxTraps));
    if (extra > 0) { const drop = new Set(mine.slice(0, extra)); removeWhere(w.traps, (tr) => drop.has(tr)); }
    return {};
  },

  /** Applaus: Stärkung, die jede Tötung um `perKill` s verlängert, bis `maxDuration` s insgesamt. */
  applause(ctx, id, p) {
    const w = ctx.world;
    const modifiers = Object.keys(p).filter((k) => k.endsWith('Pct')).map((k) => ({ stat: k.slice(0, -3), pct: p[k] }));
    removeWhere(w.hero.buffs, (b) => b.abilityId === id);
    w.hero.buffs.push({ abilityId: id, modifiers, timeLeft: p.duration, applause: { perKill: p.perKill, max: p.maxDuration, total: p.duration } });
    recomputeHeroStats(w);
    return {};
  },

  /** Haustier: läuft zum nächsten Gegner und beißt im Takt; nicht angreifbar, verschwindet nach Ablauf. */
  pet(ctx, id, p) {
    const w = ctx.world, h = w.hero;
    removeWhere(w.followers, (f) => f.abilityId === id);
    w.followers.push({ kind: 'pet', abilityId: id, x: h.x, z: h.z, until: w.time + p.duration, nextAt: w.time,
      interval: p.interval, range: p.range, damage: p.damage, speed: p.speed, reach: p.reach });
    return {};
  },

  /** Markieren: bis zu `maxTargets` nächste Gegner in Reichweite nehmen mehr Schaden (Bosse weniger). */
  mark(ctx, id, p) {
    const w = ctx.world, h = w.hero;
    const list = enemiesInCircle(ctx, h.x, h.z, p.range)
      .map((e) => ({ e, d: (e.x - h.x) ** 2 + (e.z - h.z) ** 2 }))
      .sort((a, b) => a.d - b.d || a.e.id - b.e.id)
      .slice(0, Math.max(0, Math.round(p.maxTargets)));
    for (const { e } of list) {
      e.markedUntil = w.time + p.duration;
      e.markPct = e.boss ? p.bossMarkPct : p.markPct;
    }
    return { ids: list.map(({ e }) => e.id) };
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
        if (pr.potion) { splashPotion(ctx, pr); return true; }
        if (pr.explosion > 0) { explode(ctx, pr.abilityId, pr.x, pr.z, pr.explosion, pr.damage); return true; }
        pr.hitIds.push(e.id);
        strike(world, e, pr.damage, pr.abilityId);
        if (pr.effects && isTargetable(e)) {
          applyStatus(world, e, pr.effects);
          if (pr.effects.knockback) knockback(world, e, pr.effects.knockback);
        }
        if (--pr.pierceLeft <= 0) return true;
      }
    }
    if (pr.distanceLeft <= EPS && pr.potion) { splashPotion(ctx, pr); return true; }
    return pr.distanceLeft <= EPS;
  });
}

/** Aufschlag der Wundertüte: Feuerplatsch (Schaden), Schleimpfütze (Verlangsamung) oder Glückstrank (heilt den Helden). */
function splashPotion(ctx, pr) {
  const w = ctx.world, q = pr.potion;
  const kind = w.rng.pick(['feuer', 'schleim', 'glueck']);
  w.events.push({ type: 'potionSplash', kind, x: pr.x, z: pr.z, radius: q.radius });
  if (kind === 'feuer') explode(ctx, pr.abilityId, pr.x, pr.z, q.radius, pr.damage);
  else if (kind === 'schleim') {
    for (const e of enemiesInCircle(ctx, pr.x, pr.z, q.radius)) applyStatus(w, e, { slow: q.slow, slowDuration: q.slowDuration });
  } else {
    const h = w.hero, amount = Math.min(h.stats.maxHp * q.healPct, h.stats.maxHp - h.hp);
    h.hp += amount;
    w.events.push({ type: 'heal', amount });
  }
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
  if (zone.slow > 0) {
    for (const e of enemiesInCircle(ctx, zone.x, zone.z, zone.radius)) applyStatus(ctx.world, e, { slow: zone.slow, slowDuration: zone.slowDuration });
  }
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
    if (zone.healPct > 0) healInZone(ctx.world, zone, dt);
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
  removeWhere(world.orbitals, (o) => o.until !== undefined && world.time >= o.until);
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

/** Heilzone: der Held im Kreis heilt `healPct` seines höchsten Lebens je Sekunde. */
function healInZone(world, zone, dt) {
  const h = world.hero;
  if ((h.x - zone.x) ** 2 + (h.z - zone.z) ** 2 > zone.radius * zone.radius) return;
  h.hp = Math.min(h.stats.maxHp, h.hp + h.stats.maxHp * zone.healPct * dt);
}

/** Wolke und Haustier: folgen, suchen Ziele, schlagen im Takt zu; nach `until` weg. */
function updateFollowers(ctx, dt) {
  const w = ctx.world, h = w.hero, near = SIGNATURE_RULES.followDistance;
  removeWhere(w.followers, (f) => w.time >= f.until);
  for (const f of w.followers) {
    if (f.kind === 'cloud') {
      f.x = h.x - h.facing.x * near * 0.5; f.z = h.z - h.facing.z * near * 0.5;
      if (w.time < f.nextAt) continue;
      const e = nearestEnemy(ctx, h.x, h.z, f.range);
      if (!e) continue;
      f.nextAt = w.time + f.interval;
      w.events.push({ type: 'cloudStrike', x: f.x, z: f.z, tx: e.x, tz: e.z });
      strike(w, e, f.damage, f.abilityId);
      continue;
    }
    const e = nearestEnemy(ctx, f.x, f.z, f.range) ?? null;
    const goal = e ?? h;
    const dx = goal.x - f.x, dz = goal.z - f.z, d = Math.hypot(dx, dz);
    const stop = e ? e.radius + f.reach * 0.8 : near;
    if (d > stop) { const step = Math.min(d - stop, f.speed * dt); f.x += (dx / d) * step; f.z += (dz / d) * step; }
    if (e && w.time >= f.nextAt && Math.hypot(e.x - f.x, e.z - f.z) <= e.radius + f.reach) {
      f.nextAt = w.time + f.interval;
      strike(w, e, f.damage, f.abilityId);
    }
  }
}

/** Fallen: abgelaufene verschwinden; tritt ein Gegner hinein, trifft sie alle darin (Schaden, Betäubung) und ist verbraucht. */
function updateTraps(ctx) {
  const w = ctx.world;
  removeWhere(w.traps, (tr) => {
    if (w.time >= tr.until) return true;
    const inside = enemiesInCircle(ctx, tr.x, tr.z, tr.radius);
    if (!inside.length) return false;
    w.events.push({ type: 'trapSprung', x: tr.x, z: tr.z });
    for (const e of inside) {
      strike(w, e, tr.damage, tr.abilityId);
      if (isTargetable(e)) applyStatus(w, e, { stun: tr.stun });
    }
    return true;
  });
}
