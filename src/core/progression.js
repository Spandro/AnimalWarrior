import { CLASSES } from '../data/classes.js';
import { ABILITIES } from '../data/abilities.js';
import { DROPS } from '../data/enemies.js';
import { BONUSES, FILLER, MAX_LEVEL } from '../data/bonuses.js';
import { recomputeHeroStats } from './world.js';

/**
 * @typedef {import('./world.js').World} World
 * @typedef {{ kind: 'newAbility'|'abilityLevel'|'bonus'|'gold'|'heal', id?: string, toLevel?: number, value?: number }} Card
 */

const MAX_ABILITIES = 5;

/**
 * Erfahrung, die der Aufstieg von `level` auf `level + 1` kostet.
 * @param {number} level
 * @returns {number}
 */
export function xpToNext(level) {
  return level <= 20 ? 5 + 10 * (level - 1) : 195 + 16 * (level - 20);
}

/**
 * Wie viele Level-ups `run.xp` gerade hergibt.
 * @param {World} world
 * @returns {number}
 */
export function pendingLevelUps(world) {
  let xp = world.run.xp, level = world.run.level, n = 0;
  while (xp >= xpToNext(level)) { xp -= xpToNext(level); level++; n++; }
  return n;
}

/** Alle derzeit möglichen echten Karten (ohne Füllkarten). */
function possibleCards(world) {
  const { hero, run } = world;
  /** @type {Card[]} */
  const cards = [];
  if (hero.abilities.length < MAX_ABILITIES) {
    for (const id of CLASSES[hero.classId].abilityPool) {
      if (!hero.abilities.some((a) => a.id === id)) cards.push({ kind: 'newAbility', id });
    }
  }
  for (const a of hero.abilities) {
    if (a.level < MAX_LEVEL) cards.push({ kind: 'abilityLevel', id: a.id, toLevel: a.level + 1 });
  }
  for (const b of Object.values(BONUSES)) {
    const level = run.bonuses[b.id] || 0;
    if (level < b.maxLevel) cards.push({ kind: 'bonus', id: b.id, toLevel: level + 1 });
  }
  return cards;
}

/**
 * Zieht Karten ohne Wiederholung aus allen möglichen; fehlende Plätze füllen gold und heal.
 * @param {World} world
 * @param {number} [count]
 * @returns {Card[]}
 */
export function rollCards(world, count = 3) {
  const pool = possibleCards(world);
  /** @type {Card[]} */
  const cards = [];
  while (cards.length < count && pool.length > 0) {
    cards.push(pool.splice(Math.floor(world.rng.next() * pool.length), 1)[0]);
  }
  const fillers = [{ kind: 'gold', value: FILLER.gold }, { kind: 'heal', value: FILLER.heal }];
  for (let i = 0; cards.length < count; i++) cards.push({ ...fillers[i < 2 ? i : 0] });
  return cards;
}

/**
 * Wendet eine Karte an. Mit consumeLevel zieht sie die Erfahrung für den Aufstieg ab und erhöht run.level.
 * @param {World} world
 * @param {Card} card
 * @param {boolean} [consumeLevel]
 */
export function applyCard(world, card, consumeLevel = true) {
  const { hero, run } = world;
  const fail = () => { throw new Error(`Unmögliche Karte: ${JSON.stringify(card)}`); };
  if (card.kind === 'newAbility') {
    const pool = CLASSES[hero.classId].abilityPool;
    if (!ABILITIES[card.id] || !pool.includes(card.id) || hero.abilities.length >= MAX_ABILITIES
      || hero.abilities.some((a) => a.id === card.id)) fail();
    hero.abilities.push({ id: card.id, level: 1, cooldownLeft: 0 });
  } else if (card.kind === 'abilityLevel') {
    const a = hero.abilities.find((x) => x.id === card.id);
    if (!a || a.level >= MAX_LEVEL) fail();
    a.level++;
  } else if (card.kind === 'bonus') {
    const def = BONUSES[card.id];
    if (!def || (run.bonuses[card.id] || 0) >= def.maxLevel) fail();
    run.bonuses[card.id] = (run.bonuses[card.id] || 0) + 1;
    recomputeHeroStats(world);
  } else if (card.kind === 'gold') {
    run.gold += card.value * hero.stats.goldGain;
  } else if (card.kind === 'heal') {
    hero.hp = Math.min(hero.stats.maxHp, hero.hp + hero.stats.maxHp * card.value);
  } else fail();

  if (consumeLevel) {
    run.xp -= xpToNext(run.level);
    run.level++;
  }
}

/**
 * Öffnet eine Truhe: eine Karte ohne Levelverbrauch plus Truhengold.
 * @param {World} world
 * @returns {Card}
 */
export function openChest(world) {
  const card = rollCards(world, 1)[0];
  applyCard(world, card, false);
  world.run.gold += DROPS.chestGold * world.hero.stats.goldGain;
  world.events.push({ type: 'chest', card });
  return card;
}
