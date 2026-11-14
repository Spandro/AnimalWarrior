import { CLASSES } from '../data/classes.js';
import { ITEMS } from '../data/items.js';
import { ADVENTURE_LEVEL, ADVENTURE_BALANCE, AREA_SCALE, SMITH, MAX_ADVENTURE_LEVEL } from '../data/adventure.js';
import { metaModifiers } from '../save/meta.js';

/**
 * Held im Abenteuer: Level, Fähigkeiten, Knöpfe und Werte (Spec §7). Arbeitet auf dem Abenteuer-Stand eines Helden.
 * @typedef {import('../save/adventure.js').AdventureRecord} AdventureRecord
 * @typedef {import('../data/animals.js').Modifier} Modifier
 */

/** Erfahrung bis zum nächsten Level. */
export function xpToNextAdventure(level) {
  return ADVENTURE_LEVEL.xp.base + ADVENTURE_LEVEL.xp.step * (level - 1);
}

/**
 * Erfahrung gutschreiben: je Level ein Punkt, freie Fähigkeiten nach `unlockAt`, neue auf den ersten leeren Knopf.
 * @param {AdventureRecord} record
 * @param {number} amount
 * @param {string} classId
 * @returns {{ levels: number, unlocked: string[] }}
 */
export function gainXp(record, amount, classId) {
  const pool = CLASSES[classId].abilityPool;
  const out = { levels: 0, unlocked: [] };
  record.xp += amount;
  while (record.level < MAX_ADVENTURE_LEVEL && record.xp >= xpToNextAdventure(record.level)) {
    record.xp -= xpToNextAdventure(record.level);
    record.level++;
    record.skillPoints++;
    out.levels++;
    const k = ADVENTURE_LEVEL.unlockAt.indexOf(record.level);
    if (k >= 0 && pool[k] && !Object.hasOwn(record.abilities, pool[k])) {
      record.abilities[pool[k]] = 1;
      out.unlocked.push(pool[k]);
      const free = record.buttons.indexOf(null);
      if (free >= 0) record.buttons[free] = pool[k];
    }
  }
  if (record.level >= MAX_ADVENTURE_LEVEL) record.xp = 0;
  return out;
}

/** Ein Fähigkeitspunkt auf eine freie Fähigkeit (oder die Grundattacke), höchstens Stufe 5. */
export function spendPoint(record, abilityId) {
  const level = record.abilities[abilityId];
  if (record.skillPoints < 1 || level === undefined || level >= SMITH.maxLevel) return false;
  record.abilities[abilityId] = level + 1;
  record.skillPoints--;
  return true;
}

/**
 * Belegt Knopf `slot` (oder leert ihn mit `null`). Liegt die Fähigkeit schon auf einem anderen Knopf, wandert sie.
 * Die Grundattacke liegt auf keinem Knopf.
 * @param {AdventureRecord} record
 * @param {0|1|2} slot
 * @param {string|null} abilityId
 */
export function setButton(record, slot, abilityId) {
  if (abilityId !== null) {
    if (!Object.hasOwn(record.abilities, abilityId)) return false;
    if (Object.values(CLASSES).some((c) => c.startAbility === abilityId)) return false;
    const old = record.buttons.indexOf(abilityId);
    if (old >= 0) record.buttons[old] = null;
  }
  record.buttons[slot] = abilityId;
  return true;
}

/** Rundet Werte eines verbesserten Gegenstands: Rüstung ganz, Anteile auf ganze Prozent, Regeneration auf 0,1. */
function roundStat(stat, value) {
  if (stat === 'armor') return Math.round(value);
  if (stat === 'hpRegen') return Math.round(value * 10) / 10;
  return Math.round(value * 100) / 100;
}

/**
 * Modifikatoren eines Helden im Abenteuer: Leben × 3 (Ausgleich), Zuwachs je Level, angelegte Ausrüstung mit ihrer
 * Verbesserungsstufe und die Dauerboni (ohne „Neun Leben“, das keinen Modifikator hat).
 * @param {import('../save/schema.js').Save} save
 * @param {import('../save/schema.js').Hero} hero
 * @returns {Modifier[]}
 */
export function adventureModifiers(save, hero) {
  const a = hero.adventure;
  const out = [
    { stat: 'maxHp', pct: ADVENTURE_BALANCE.heroHpMul },
    { stat: 'maxHp', pct: ADVENTURE_LEVEL.perLevel.maxHp * (a.level - 1) },
    { stat: 'damage', pct: ADVENTURE_LEVEL.perLevel.damage * (a.level - 1) },
  ];
  for (const id of Object.values(a.equipment)) {
    if (id && Object.hasOwn(ITEMS, id)) out.push(...scaledModifiers(id, save.itemLevels[id] ?? 0));
  }
  return [...out, ...metaModifiers(save)];
}

/**
 * Werte eines Gegenstands auf einer Verbesserungsstufe (0 bis 5): Grundwert × (1 + 20 % je Stufe), gerundet.
 * @param {string} itemId
 * @param {number} level
 * @returns {Modifier[]}
 */
export function scaledModifiers(itemId, level) {
  const k = 1 + SMITH.stepPct * level;
  return ITEMS[itemId].modifiers.map((m) => {
    const scaled = { stat: m.stat };
    if (m.flat) scaled.flat = roundStat(m.stat, m.flat * k);
    if (m.pct) scaled.pct = Math.round(m.pct * k * 100) / 100;
    return scaled;
  });
}

/**
 * Vergleich für die Ausrüstung: je Wert (erst die des angelegten, dann die des neuen Stücks) bisher und danach.
 * @param {string|null} currentId
 * @param {string} candidateId
 * @param {Record<string, number>} itemLevels
 * @returns {{ stat: string, kind: 'flat'|'pct', from: number, to: number }[]}
 */
export function itemDelta(currentId, candidateId, itemLevels) {
  const values = (id) => {
    const out = new Map();
    if (!id) return out;
    for (const m of scaledModifiers(id, itemLevels[id] ?? 0)) {
      if (m.flat) out.set(`${m.stat}|flat`, m.flat);
      if (m.pct) out.set(`${m.stat}|pct`, m.pct);
    }
    return out;
  };
  const from = values(currentId), to = values(candidateId);
  return [...new Set([...from.keys(), ...to.keys()])].map((k) => {
    const [stat, kind] = k.split('|');
    return { stat, kind, from: from.get(k) ?? 0, to: to.get(k) ?? 0 };
  });
}

/**
 * Stärke der Gegner einer Gebietsstufe: Leben, Schaden (mit Abenteuer-Ausgleich) und Erfahrung als Faktoren.
 * @param {number} level
 */
export function enemyMultipliers(level) {
  const n = level - 1;
  return {
    hpMul: 1 + AREA_SCALE.hp * n,
    dmgMul: (1 + AREA_SCALE.damage * n) * ADVENTURE_BALANCE.enemyDamageMul,
    xpMul: 1 + AREA_SCALE.xp * n,
  };
}
