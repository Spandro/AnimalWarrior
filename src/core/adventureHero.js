import { CLASSES } from '../data/classes.js';
import { ITEMS } from '../data/items.js';
import { ADVENTURE_LEVEL, ADVENTURE_BALANCE, AREA_SCALE, SMITH, MAX_ADVENTURE_LEVEL, SUBCLASS_RULES } from '../data/adventure.js';
import { SUBCLASSES, PASSIVES } from '../data/subclasses.js';
import { ABILITIES } from '../data/abilities.js';
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

// ---------------------------------------------------------------- Fähigkeitenbaum (Etappe 2)

/** Ob eine Fähigkeit zum Stamm der Klasse gehört (Grundattacke und `abilityPool`). */
function isTrunk(classId, abilityId) {
  const c = CLASSES[classId];
  return abilityId === c.startAbility || c.abilityPool.includes(abilityId);
}

/**
 * Verteilte Punkte: Stammstufen über 1, Astfähigkeiten mit ihrer Stufe (1 Punkt Freischalten plus Ausbau) und Dauer-Boni.
 * Zusammen mit `skillPoints` immer `level − 1`.
 * @param {AdventureRecord} record
 * @param {string} classId
 */
export function pointsSpent(record, classId) {
  let n = 0;
  for (const [id, level] of Object.entries(record.abilities)) n += isTrunk(classId, id) ? level - 1 : level;
  for (const rank of Object.values(record.passives ?? {})) n += rank;
  return n;
}

/** Setzt den Stamm auf Stufe 1 und gibt alle Punkte zurück. */
function refundTrunk(record) {
  for (const id of Object.keys(record.abilities)) record.abilities[id] = 1;
  record.skillPoints = record.level - 1;
}

/**
 * Wählt die Unterklasse (ab Level 10, nur wenn noch keine gewählt ist): Stamm auf 1, alle Punkte zurück, Knöpfe bleiben.
 * @param {AdventureRecord} record
 * @param {string} classId
 * @param {string} subclassId
 */
export function chooseSubclass(record, classId, subclassId) {
  const sub = Object.hasOwn(SUBCLASSES, subclassId) ? SUBCLASSES[subclassId] : null;
  if (!sub || sub.classId !== classId || record.subclass || record.level < SUBCLASS_RULES.chooseLevel) return false;
  record.subclass = subclassId;
  record.passives = {};
  refundTrunk(record);
  return true;
}

/** Schaltet eine Astfähigkeit der eigenen Unterklasse für `unlockCost` Punkte frei (Stufe 1). */
export function unlockBranch(record, abilityId) {
  const sub = record.subclass ? SUBCLASSES[record.subclass] : null;
  if (!sub || !sub.abilities.includes(abilityId) || Object.hasOwn(record.abilities, abilityId)) return false;
  if (record.skillPoints < SUBCLASS_RULES.unlockCost) return false;
  record.abilities[abilityId] = 1;
  record.skillPoints -= SUBCLASS_RULES.unlockCost;
  return true;
}

/** Ein Punkt auf einen Dauer-Bonus der eigenen Unterklasse, höchstens `maxRank`. */
export function spendPassive(record, passiveId) {
  const def = Object.hasOwn(PASSIVES, passiveId) ? PASSIVES[passiveId] : null;
  if (!def || def.subclass !== record.subclass || record.skillPoints < 1) return false;
  const rank = record.passives[passiveId] ?? 0;
  if (rank >= def.maxRank) return false;
  record.passives[passiveId] = rank + 1;
  record.skillPoints--;
  return true;
}

/** Dauer-Boni des Helden mit Stufe. */
function passiveEntries(record) {
  return Object.entries(record.passives ?? {}).filter(([id]) => Object.hasOwn(PASSIVES, id)).map(([id, rank]) => ({ def: PASSIVES[id], rank }));
}

/**
 * Summe der besonderen Dauer-Boni mit diesem Namen (Wert × Stufe), z. B. `lifesteal` oder `lootChance`.
 * @param {AdventureRecord} record
 * @param {string} special
 */
export function specialBonus(record, special) {
  let n = 0;
  for (const { def, rank } of passiveEntries(record)) if (def.perRank.special === special) n += def.perRank.value * rank;
  return n;
}

/**
 * Besondere Dauer-Boni, die auf Werte der Fähigkeiten wirken (für `abilityParams`), mit Wert × Stufe.
 * @param {AdventureRecord} record
 * @returns {import('../data/subclasses.js').SpecialBonus[]}
 */
export function abilitySpecials(record) {
  return passiveEntries(record)
    .filter(({ def }) => def.perRank.special && def.perRank.special !== 'lifesteal' && def.perRank.special !== 'lootChance')
    .map(({ def, rank }) => ({ ...def.perRank, value: def.perRank.value * rank }));
}

/** Ob eine Fähigkeit eine Astfähigkeit ist. */
export function isBranchAbility(abilityId) {
  return !!ABILITIES[abilityId]?.subclass;
}

/** Rundet Werte eines verbesserten Gegenstands: Rüstung ganz, Anteile auf ganze Prozent, Regeneration auf 0,1. */
function roundStat(stat, value) {
  if (stat === 'armor') return Math.round(value);
  if (stat === 'hpRegen') return Math.round(value * 10) / 10;
  return Math.round(value * 100) / 100;
}

/**
 * Modifikatoren eines Helden im Abenteuer: Leben × 3 (Ausgleich), Zuwachs je Level, angelegte Ausrüstung mit ihrer
 * Verbesserungsstufe, die allgemeinen Dauer-Boni der Unterklasse und die Dauerboni (ohne „Neun Leben“, das keinen Modifikator hat).
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
  for (const { def, rank } of passiveEntries(a)) {
    const m = def.perRank;
    if (!m.stat) continue;
    const scaled = { stat: m.stat };
    if (m.flat !== undefined) scaled.flat = m.flat * rank;
    if (m.pct !== undefined) scaled.pct = m.pct * rank;
    out.push(scaled);
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
