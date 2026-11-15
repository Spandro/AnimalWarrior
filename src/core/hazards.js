import { damageHero, damageEnemy, isTargetable } from './world.js';
import { BUBBLES } from '../data/adventure.js';

/**
 * Moorblasen (Etappe 3, Spec §4.1): In Schlamm um den Helden steigt alle paar Sekunden eine Blase auf, kündigt sich
 * an (`bubbleWarn`) und platzt nach `BUBBLES.warn` s (`bubblePop`): Schaden an Held und Gegnern im Kreis.
 * Reine Logik; Zufall nur über `world.rng`. Die Regelschicht entscheidet, wo Schlamm ist und was verboten ist.
 * @typedef {{ nextAt: number, pending: { x: number, z: number, popAt: number }[] }} BubbleState
 *   `nextAt`: Weltzeit der nächsten Blase (< 0: noch nicht geplant).
 * @typedef {{ isMud: (x: number, z: number) => boolean, forbidden: (x: number, z: number) => boolean, enemyDamage: number }} BubbleRules
 */

/** @returns {BubbleState} */
export function createBubbles() {
  return { nextAt: -1, pending: [] };
}

/**
 * @param {import('./world.js').World} world
 * @param {BubbleState} state
 * @param {BubbleRules} rules
 * @param {number} dt
 */
export function stepBubbles(world, state, rules, dt) {
  const t = world.time;
  const due = state.pending.filter((p) => t >= p.popAt);
  if (due.length) state.pending = state.pending.filter((p) => t < p.popAt);
  for (const p of due) pop(world, p, rules.enemyDamage);
  if (state.nextAt < 0) { state.nextAt = t + world.rng.range(BUBBLES.minInterval, BUBBLES.maxInterval); return; }
  if (t < state.nextAt) return;
  state.nextAt = t + world.rng.range(BUBBLES.minInterval, BUBBLES.maxInterval);
  const hero = world.hero;
  for (let i = 0; i < BUBBLES.tries; i++) {
    const a = world.rng.range(0, Math.PI * 2), r = BUBBLES.range * Math.sqrt(world.rng.next());
    const x = hero.x + Math.cos(a) * r, z = hero.z + Math.sin(a) * r;
    if (!rules.isMud(x, z) || rules.forbidden(x, z)) continue;
    state.pending.push({ x, z, popAt: t + BUBBLES.warn });
    world.events.push({ type: 'bubbleWarn', x, z, radius: BUBBLES.radius, delay: BUBBLES.warn });
    return;
  }
}

/** Blase platzt: Held verliert einen Anteil seines höchsten Lebens, Gegner festen Schaden (Bosse höchstens einen Anteil). */
function pop(world, p, enemyDamage) {
  const hero = world.hero, r = BUBBLES.radius;
  world.events.push({ type: 'bubblePop', x: p.x, z: p.z, radius: r });
  if (Math.hypot(hero.x - p.x, hero.z - p.z) <= r) damageHero(world, hero.stats.maxHp * BUBBLES.heroPct);
  for (const e of [...world.enemies]) {
    if (!isTargetable(e) || e.shadow || Math.hypot(e.x - p.x, e.z - p.z) > r) continue;
    const amount = e.boss ? Math.min(enemyDamage, e.maxHp * BUBBLES.bossMaxPct) : enemyDamage;
    damageEnemy(world, e, { amount, crit: false }, 'moorblase');
  }
}
