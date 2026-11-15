import { CLASSES } from '../data/classes.js';
import { ITEMS, RARITIES, SLOT_NAMES } from '../data/items.js';
import { MAPS } from '../data/maps/index.js';
import { QUESTS } from '../data/quests.js';
import { MATERIALS, POTION, CLASS_WEAPON, SMITH, SHOP, MAX_ADVENTURE_LEVEL, SUBCLASS_RULES } from '../data/adventure.js';
import { SUBCLASSES, PASSIVES } from '../data/subclasses.js';

/**
 * Spielstand-Funktionen des Abenteuers (Spec §12). Alle ändern den übergebenen Stand und melden das Ergebnis.
 * @typedef {import('./schema.js').Save} Save
 * @typedef {import('./schema.js').Hero} Hero
 * @typedef {import('../core/quests.js').QuestLog} QuestLog
 * @typedef {{ level: number, xp: number, skillPoints: number, abilities: Record<string, number>, buttons: (string|null)[],
 *   equipment: Record<import('../data/items.js').Slot, string|null>, potions: number, mapId: string, campfireId: string,
 *   campfires: string[], quests: QuestLog, trackedQuest: string|null, bosses: string[], chests: string[], found: string[],
 *   questItems: Record<string, number>, explored: Record<string, string>, introSeen: boolean, chapterDone: number[],
 *   unlocked: ('merchant'|'smith')[], subclass: string|null, passives: Record<string, number> }} AdventureRecord
 *   `subclass`: gewählte Unterklasse (Etappe 2); `passives`: Dauer-Boni der Unterklasse mit Stufe 1 bis 3.
 * @typedef {{ gold: number, items: string[], materials: Record<string, number>, rests?: number }} Ledger
 *   Was ein laufendes Abenteuer seit dem letzten Speichern gemeinsam für alle Helden verdient hat (`rests`: Rasten
 *   für den Zähler `stats.campfireRests`).
 */

const HOME = { mapId: 'dorf', campfireId: 'dorf_platz' };
const UNLOCKABLE = ['merchant', 'smith'];

/** Alle Astfähigkeiten der Unterklassen. */
const ABILITY_IDS_BRANCH = new Set(Object.values(SUBCLASSES).flatMap((s) => s.abilities));

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const clampInt = (v, lo, hi, fallback) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fallback);
const idList = (v, known) => (Array.isArray(v) ? [...new Set(v.filter((id) => typeof id === 'string' && known.has(id)))] : []);

const ALL = (kind) => new Set(Object.values(MAPS).flatMap((m) => m[kind].map((e) => e.id)));
const KNOWN = { campfires: ALL('campfires'), bosses: ALL('bosses'), chests: ALL('chests'), spots: ALL('spots') };
const QUEST_THINGS = new Set(Object.values(QUESTS).flatMap((q) => q.steps.filter((s) => s.type === 'collect').map((s) => s.target)));

/** Ob ein Gegenstand an diesen Platz und zu dieser Klasse passt. */
function fits(itemId, slot, classId) {
  const item = ITEMS[itemId];
  if (!item || item.slot !== slot) return false;
  const kind = CLASS_WEAPON[classId];
  return slot !== 'waffe' || kind === null || kind === undefined || item.weaponKind === kind;
}

/**
 * Abenteuer-Stand eines Helden, der zum ersten Mal ins Abenteuer geht.
 * @param {Hero} hero
 * @returns {AdventureRecord}
 */
export function newAdventure(hero) {
  return {
    level: 1, xp: 0, skillPoints: 0,
    abilities: { [CLASSES[hero.class].startAbility]: 1 },
    buttons: [null, null, null],
    equipment: Object.fromEntries(Object.keys(SLOT_NAMES).map((s) => [s, null])),
    potions: POTION.start,
    ...HOME,
    campfires: [HOME.campfireId],
    quests: {}, trackedQuest: null, bosses: [], chests: [], found: [], questItems: {}, explored: {},
    introSeen: false, chapterDone: [], unlocked: [],
    subclass: null, passives: {},
  };
}

/** Bessert den Auftragsstand aus: unbekannte Aufträge fallen weg, Schritte und Fortschritt in den gültigen Bereich. */
function repairQuests(v) {
  const out = {};
  if (!isObject(v)) return out;
  for (const [id, e] of Object.entries(v)) {
    if (!Object.hasOwn(QUESTS, id) || !isObject(e) || (e.state !== 'active' && e.state !== 'done')) continue;
    const steps = QUESTS[id].steps;
    if (e.state === 'done') { out[id] = { state: 'done', step: steps.length, progress: 0 }; continue; }
    const step = clampInt(e.step, 0, steps.length - 1, 0);
    out[id] = { state: 'active', step, progress: clampInt(e.progress, 0, (steps[step].count ?? 1) - 1, 0) };
  }
  return out;
}

/**
 * Bessert den Abenteuer-Teil eines Helden aus (Spec §12.1). Wirft nie.
 * @param {any} a
 * @param {Hero} hero
 * @param {Save} save
 * @returns {AdventureRecord}
 */
function repairAdventure(a, hero, save) {
  const fresh = newAdventure(hero);
  if (!isObject(a)) return fresh;
  const cls = CLASSES[hero.class];
  const level = clampInt(a.level, 1, MAX_ADVENTURE_LEVEL, 1);
  const sub = typeof a.subclass === 'string' && Object.hasOwn(SUBCLASSES, a.subclass) && SUBCLASSES[a.subclass].classId === hero.class
    && level >= SUBCLASS_RULES.chooseLevel ? SUBCLASSES[a.subclass] : null;
  const trunk = new Set([cls.startAbility, ...cls.abilityPool]);
  const branch = new Set(sub ? sub.abilities : []);
  const abilities = {};
  let refund = 0; // Punkte aus weggefallenen Astfähigkeiten und Dauer-Boni (Spec §8)
  if (isObject(a.abilities)) {
    for (const [id, lvl] of Object.entries(a.abilities)) {
      if (trunk.has(id) || branch.has(id)) abilities[id] = clampInt(lvl, 1, SMITH.maxLevel, 1);
      else if (ABILITY_IDS_BRANCH.has(id)) refund += clampInt(lvl, 1, SMITH.maxLevel, 1);
    }
  }
  const passives = {};
  if (isObject(a.passives)) {
    for (const [id, rank] of Object.entries(a.passives)) {
      if (!Object.hasOwn(PASSIVES, id)) continue;
      const r = clampInt(rank, 0, 99, 0);
      const keep = sub && PASSIVES[id].subclass === sub.id ? Math.min(r, PASSIVES[id].maxRank) : 0;
      if (keep > 0) passives[id] = keep;
      refund += r - keep;
    }
  }
  abilities[cls.startAbility] ??= 1;
  const buttons = [0, 1, 2].map(() => null);
  if (Array.isArray(a.buttons)) {
    a.buttons.slice(0, 3).forEach((id, i) => {
      if (typeof id === 'string' && id !== cls.startAbility && Object.hasOwn(abilities, id) && !buttons.includes(id)) buttons[i] = id;
    });
  }
  const equipment = { ...fresh.equipment };
  if (isObject(a.equipment)) {
    for (const slot of Object.keys(equipment)) {
      const id = a.equipment[slot];
      if (typeof id === 'string' && save.inventory.includes(id) && fits(id, slot, hero.class)) equipment[slot] = id;
    }
  }
  const map = Object.hasOwn(MAPS, a.mapId) ? MAPS[a.mapId] : null;
  const place = map && map.campfires.some((c) => c.id === a.campfireId) ? { mapId: a.mapId, campfireId: a.campfireId } : HOME;
  const campfires = idList(a.campfires, KNOWN.campfires);
  if (!campfires.includes(place.campfireId)) campfires.push(place.campfireId);
  const quests = repairQuests(a.quests);
  const questItems = {};
  if (isObject(a.questItems)) for (const [k, n] of Object.entries(a.questItems)) if (QUEST_THINGS.has(k)) questItems[k] = clampInt(n, 0, 999, 0);
  const explored = {};
  if (isObject(a.explored)) for (const [k, t] of Object.entries(a.explored)) if (Object.hasOwn(MAPS, k) && typeof t === 'string') explored[k] = t;
  return {
    level,
    xp: typeof a.xp === 'number' && Number.isFinite(a.xp) && a.xp > 0 ? a.xp : 0,
    skillPoints: Math.min(MAX_ADVENTURE_LEVEL, clampInt(a.skillPoints, 0, MAX_ADVENTURE_LEVEL, 0) + refund),
    abilities, buttons, equipment,
    potions: clampInt(a.potions, 0, POTION.max, fresh.potions),
    ...place, campfires, quests,
    trackedQuest: typeof a.trackedQuest === 'string' && Object.hasOwn(quests, a.trackedQuest) ? a.trackedQuest : null,
    bosses: idList(a.bosses, KNOWN.bosses), chests: idList(a.chests, KNOWN.chests), found: idList(a.found, KNOWN.spots),
    questItems, explored,
    introSeen: a.introSeen === true,
    chapterDone: idList(a.chapterDone?.map?.(String), new Set(['1'])).map(Number),
    unlocked: idList(a.unlocked, new Set(UNLOCKABLE)),
    subclass: sub ? sub.id : null,
    passives,
  };
}

/**
 * Bessert nach dem Umwandeln die Teile aus, die das Abenteuer betreffen: Abenteuer je Held, Verbesserungsstufen,
 * Material, Lage der Knöpfe, Zähler. Alles andere bleibt für die Prüfung (`validate`). Wirft nie.
 * @param {any} data
 * @returns {any} derselbe Stand
 */
export function repairSave(data) {
  if (!isObject(data)) return data;
  const inventory = Array.isArray(data.inventory) ? data.inventory : [];
  const levels = {};
  if (isObject(data.itemLevels)) {
    for (const [id, l] of Object.entries(data.itemLevels)) if (inventory.includes(id) && typeof l === 'number') levels[id] = clampInt(l, 1, SMITH.maxLevel, 1);
  }
  data.itemLevels = levels;
  const materials = {};
  if (isObject(data.materials)) for (const id of Object.keys(MATERIALS)) if (data.materials[id] !== undefined) materials[id] = clampInt(data.materials[id], 0, 1e9, 0);
  data.materials = materials;
  if (isObject(data.settings) && data.settings.buttonSide !== 'left' && data.settings.buttonSide !== 'right') data.settings.buttonSide = 'right';
  if (isObject(data.stats) && !(Number.isInteger(data.stats.campfireRests) && data.stats.campfireRests >= 0)) data.stats.campfireRests = 0;
  if (Array.isArray(data.heroes)) {
    for (const h of data.heroes) {
      if (!isObject(h) || !Object.hasOwn(CLASSES, h.class)) continue;
      h.adventure = h.adventure === null || h.adventure === undefined ? null : repairAdventure(h.adventure, h, { inventory });
    }
  }
  return data;
}

/**
 * Überträgt den Stand eines laufenden Abenteuers: Heldenstand (als Kopie) und das Ledger (Gold, nie unter 0;
 * Gegenstände, Doppelte für ihren Gegenwert verkauft; Material). Der Aufrufer leert danach das Ledger.
 * @param {Save} save
 * @param {string} heroId
 * @param {{ record: AdventureRecord, ledger: Ledger }} snapshot
 * @returns {{ sold: { id: string, gold: number }[] }}
 */
export function commitAdventure(save, heroId, { record, ledger }) {
  const hero = save.heroes.find((h) => h.id === heroId);
  if (!hero) return { sold: [] };
  hero.adventure = structuredClone(record);
  let gold = ledger.gold;
  const sold = [];
  for (const id of ledger.items) {
    if (!Object.hasOwn(ITEMS, id)) continue;
    if (save.inventory.includes(id)) {
      const value = RARITIES[ITEMS[id].rarity].resale;
      gold += value;
      sold.push({ id, gold: value });
    } else save.inventory.push(id);
  }
  save.gold = Math.max(0, Math.round(save.gold + gold));
  for (const [id, n] of Object.entries(ledger.materials)) {
    if (Object.hasOwn(MATERIALS, id)) save.materials[id] = (save.materials[id] ?? 0) + n;
  }
  if (ledger.rests) save.stats.campfireRests += ledger.rests;
  return { sold };
}

/**
 * Legt einen Gegenstand aus der Truhe an (oder mit `null` ab).
 * @param {Save} save
 * @param {string} heroId
 * @param {import('../data/items.js').Slot} slot
 * @param {string|null} itemId
 * @returns {boolean}
 */
export function equipItem(save, heroId, slot, itemId) {
  const hero = save.heroes.find((h) => h.id === heroId);
  const a = hero?.adventure;
  if (!a || !Object.hasOwn(a.equipment, slot)) return false;
  if (itemId !== null && (!save.inventory.includes(itemId) || !fits(itemId, slot, hero.class))) return false;
  a.equipment[slot] = itemId;
  return true;
}

/**
 * Kosten der Verbesserung auf `nextLevel` (1 bis 5).
 * @param {string} itemId
 * @param {number} nextLevel
 */
export function smithCost(itemId, nextLevel) {
  return { gold: SMITH.gold[ITEMS[itemId].rarity][nextLevel - 1], pearls: SMITH.pearls[nextLevel - 1] };
}

/**
 * Verbessert einen Gegenstand der Truhe um eine Stufe.
 * @param {Save} save
 * @param {string} itemId
 * @returns {{ ok: boolean, reason?: 'missing'|'max'|'gold'|'pearls' }}
 */
export function upgradeItem(save, itemId) {
  if (!save.inventory.includes(itemId)) return { ok: false, reason: 'missing' };
  const level = save.itemLevels[itemId] ?? 0;
  if (level >= SMITH.maxLevel) return { ok: false, reason: 'max' };
  const cost = smithCost(itemId, level + 1);
  if (save.gold < cost.gold) return { ok: false, reason: 'gold' };
  if ((save.materials.flussperle ?? 0) < cost.pearls) return { ok: false, reason: 'pearls' };
  save.gold -= cost.gold;
  if (cost.pearls) save.materials.flussperle -= cost.pearls;
  save.itemLevels[itemId] = level + 1;
  return { ok: true };
}

/** Feste Auswahl des Händlers. */
export function shopStock() {
  return [...SHOP.stock];
}

/** Preis eines Gegenstands beim Händler. */
export function shopPrice(itemId) {
  return RARITIES[ITEMS[itemId].rarity].resale * SHOP.priceFactor;
}

/**
 * @param {Save} save
 * @param {string} heroId
 * @returns {{ ok: boolean, reason?: 'gold'|'full'|'missing' }}
 */
export function buyPotion(save, heroId) {
  const a = save.heroes.find((h) => h.id === heroId)?.adventure;
  if (!a) return { ok: false, reason: 'missing' };
  if (a.potions >= POTION.max) return { ok: false, reason: 'full' };
  if (save.gold < POTION.price) return { ok: false, reason: 'gold' };
  save.gold -= POTION.price;
  a.potions++;
  return { ok: true };
}

/**
 * @param {Save} save
 * @param {string} itemId
 * @returns {{ ok: boolean, reason?: 'unknown'|'owned'|'gold' }}
 */
export function buyItem(save, itemId) {
  if (!SHOP.stock.includes(itemId)) return { ok: false, reason: 'unknown' };
  if (save.inventory.includes(itemId)) return { ok: false, reason: 'owned' };
  const price = shopPrice(itemId);
  if (save.gold < price) return { ok: false, reason: 'gold' };
  save.gold -= price;
  save.inventory.push(itemId);
  return { ok: true };
}

/**
 * Verkauft einen Gegenstand der Truhe für seinen Gegenwert. Trägt ihn irgendein Held, geht es nicht (`by`: sein Name).
 * @param {Save} save
 * @param {string} itemId
 * @returns {{ ok: boolean, reason?: 'missing'|'equipped', by?: string }}
 */
export function sellItem(save, itemId) {
  if (!save.inventory.includes(itemId)) return { ok: false, reason: 'missing' };
  const wearer = save.heroes.find((h) => h.adventure && Object.values(h.adventure.equipment).includes(itemId));
  if (wearer) return { ok: false, reason: 'equipped', by: wearer.name };
  save.inventory = save.inventory.filter((id) => id !== itemId);
  save.seenItems = save.seenItems.filter((id) => id !== itemId);
  delete save.itemLevels[itemId];
  save.gold += RARITIES[ITEMS[itemId].rarity].resale;
  return { ok: true };
}

/**
 * Umlernen bei Oma Panzerla (Spec §4): kostet `respecGold`, nur ab Level 10 mit gewählter Unterklasse. Unterklasse,
 * Astfähigkeiten und Dauer-Boni fallen weg, der Stamm geht auf Stufe 1, alle Punkte kommen zurück; Knöpfe mit
 * Astfähigkeiten werden geleert.
 * @param {Save} save
 * @param {string} heroId
 * @returns {{ ok: boolean, reason?: 'gold'|'level'|'none' }}
 */
export function respecAdventure(save, heroId) {
  const a = save.heroes.find((h) => h.id === heroId)?.adventure;
  if (!a) return { ok: false, reason: 'none' };
  if (a.level < SUBCLASS_RULES.chooseLevel) return { ok: false, reason: 'level' };
  if (!a.subclass) return { ok: false, reason: 'none' };
  if (save.gold < SUBCLASS_RULES.respecGold) return { ok: false, reason: 'gold' };
  save.gold -= SUBCLASS_RULES.respecGold;
  for (const id of Object.keys(a.abilities)) {
    if (ABILITY_IDS_BRANCH.has(id)) delete a.abilities[id];
    else a.abilities[id] = 1;
  }
  a.buttons = a.buttons.map((id) => (id && ABILITY_IDS_BRANCH.has(id) ? null : id));
  a.subclass = null;
  a.passives = {};
  a.skillPoints = a.level - 1;
  return { ok: true };
}
