// Textbausteine des Fähigkeitenbaums und der Heldenzeile (DOM-frei, testbar).
import { ANIMALS } from '../data/animals.js';
import { CLASSES } from '../data/classes.js';
import { ABILITIES } from '../data/abilities.js';
import { SUBCLASSES, SPECIAL_TEXT, PASSIVE_LABELS } from '../data/subclasses.js';
import { SUBCLASS_RULES } from '../data/adventure.js';
import { SMITH } from '../data/adventure.js';
import { describeModifier } from './statText.js';
import { formatNumber } from './dom.js';

const num = (v) => formatNumber(v, Number.isInteger(Math.round(v * 10) / 10) ? 0 : 1);

/**
 * „Hase · Krieger“, mit Unterklasse „Hase · Krieger · Türsteher“.
 * @param {{ animal: string, class: string, adventure?: { subclass?: string|null } | null }} hero
 */
export function heroLineText(hero) {
  const base = `${ANIMALS[hero.animal].name} · ${CLASSES[hero.class].name}`;
  const sub = hero.adventure?.subclass;
  return sub && SUBCLASSES[sub] ? `${base} · ${SUBCLASSES[sub].name}` : base;
}

/**
 * Wirkung eines Dauer-Bonus je Stufe, z. B. „Leben +4 % je Stufe“ oder „Schild-Stärke +5 % je Stufe (Breites Kreuz)“.
 * @param {import('../data/subclasses.js').PassiveDef & { subclass: string }} def
 */
export function passiveEffectText(def) {
  const r = def.perRank;
  if (r.stat) return `${describeModifier(r)} je Stufe`;
  const t = SPECIAL_TEXT[r.special] ?? { label: r.special, unit: 'num' };
  const value = t.unit === 'pct' ? `${formatNumber(Math.round(r.value * 100))} %` : t.unit === 'sec' ? `${num(r.value)} s` : num(r.value);
  const custom = PASSIVE_LABELS[def.id];
  if (custom) return `${custom} +${value} je Stufe`;
  const shape = typeof r.shape === 'string' ? ABILITIES[SUBCLASSES[def.subclass].signature] : null;
  return `${t.label} +${value} je Stufe${shape && shape.shape === r.shape ? ` (${shape.name})` : ''}`;
}

/**
 * Zustand einer Astfähigkeit im Baum.
 * @param {import('../save/adventure.js').AdventureRecord} record
 * @param {string} abilityId
 */
export function branchStatus(record, abilityId) {
  const level = record.abilities[abilityId] ?? 0;
  if (!level) return { unlocked: false, level: 0, label: `Freischalten: ${SUBCLASS_RULES.unlockCost} Punkt` };
  return { unlocked: true, level, label: `Stufe ${level} von ${SMITH.maxLevel}` };
}

/** Kopfzeile des Baums: Punkte und Unterklasse. */
export function treeHeader(record) {
  const points = `Punkte: ${record.skillPoints}`;
  if (record.subclass && SUBCLASSES[record.subclass]) return `${points} · Unterklasse: ${SUBCLASSES[record.subclass].name}`;
  if (record.level < SUBCLASS_RULES.chooseLevel) return `${points} · Unterklasse ab Level ${SUBCLASS_RULES.chooseLevel}`;
  return `${points} · Unterklasse: noch nicht gewählt`;
}

/** Hinweis auf das Umlernen. */
export function respecLine() {
  return `Umlernen bei Oma Panzerla: ${formatNumber(SUBCLASS_RULES.respecGold)} Gold, alle Punkte zurück, Unterklasse neu wählen.`;
}
