// Beschreibung der Level-up-Karten in Worten, abgeleitet aus den Daten der Fähigkeiten und Boni.
import { ABILITIES } from '../data/abilities.js';
import { BONUSES } from '../data/bonuses.js';
import { abilityParams } from '../core/abilities.js';
import { formatNumber } from './dom.js';

/**
 * @typedef {import('../core/progression.js').Card} Card
 * @typedef {{ title: string, kind: string, text: string }} CardText
 */

/** Kurzbeschreibung je Fähigkeit (Wirkung aus der Spezifikation). */
const SUMMARY = {
  schwerthieb: 'Hieb in Blickrichtung.',
  wirbelschlag: 'Schaden rundum.',
  schildstoss: 'Wenig Schaden, starker Rückstoß.',
  kriegsschrei: 'Einige Sekunden mehr Schaden.',
  erdspalter: 'Langer Riss in Blickrichtung.',
  feuerball: 'Fliegt zum nächsten Gegner, kleine Explosion.',
  frostring: 'Schaden und Verlangsamung rundum.',
  kettenblitz: 'Springt auf mehrere Gegner.',
  meteor: 'Schlägt in die dichteste Gruppe ein.',
  arkankugeln: 'Kreisen und treffen bei Berührung.',
  wurfdolche: 'Durchschlagende Dolche in Blickrichtung.',
  giftflaeche: 'Schaden über Zeit unter dem Helden.',
  schattenklon: 'Ein Klon lenkt die Gegner ab.',
  klingenfaecher: 'Mehrere Dolche im Fächer.',
  rauchbombe: 'Gegner in der Fläche verlieren kurz das Ziel.',
};

const num = (v) => formatNumber(v, Number.isInteger(Math.round(v * 10) / 10) ? 0 : 1);
const pct = (v) => `${formatNumber(Math.round(v * 100))} %`;
const sec = (v) => `${num(v)} s`;
const deg = (v) => `${num(v)}°`;

/** Bezeichnung und Format je Wert einer Fähigkeit. */
const VALUE = {
  damage: ['Schaden', num],
  tickDamage: ['Schaden je Takt', num],
  cooldown: ['Abklingzeit', sec],
  radius: ['Radius', num],
  angle: ['Winkel', deg],
  swings: ['Hiebe', num],
  knockback: ['Rückstoß', num],
  stun: ['Betäubung', sec],
  duration: ['Dauer', sec],
  damagePct: ['Schadensbonus', (v) => `+${pct(v)}`],
  length: ['Länge', num],
  width: ['Breite', num],
  count: ['Anzahl', num],
  explosion: ['Explosionsradius', num],
  slow: ['Verlangsamung', pct],
  jumps: ['Sprünge', num],
  pierce: ['Durchschlag', num],
  spread: ['Fächer', (v) => deg(Math.min(v, 360))],
  explodeDamage: ['Explosionsschaden', num],
  confuse: ['Verwirrung', sec],
};

/** „Name Wert“ eines Fähigkeitswerts. */
function valueText(key, value) {
  const [label, format] = VALUE[key] || [key, num];
  return `${label} ${format(value)}`;
}

const NEUTRAL_STATS = { cooldown: 1, area: 1 };

/**
 * @param {Card} card
 * @param {import('../core/world.js').World} [world] für die Heldenwerte (Abklingzeit, Fläche, Goldgewinn)
 * @returns {CardText}
 */
export function describeCard(card, world) {
  const stats = world ? world.hero.stats : null;
  switch (card.kind) {
    case 'newAbility': {
      const def = ABILITIES[card.id];
      const p = abilityParams(card.id, 1, stats || NEUTRAL_STATS);
      const parts = [];
      const damageKey = p.damage > 0 ? 'damage' : p.tickDamage > 0 ? 'tickDamage' : null;
      if (damageKey) parts.push(valueText(damageKey, p[damageKey]));
      if (p.cooldown > 0) parts.push(`alle ${sec(p.cooldown)}`);
      const values = parts.join(', ');
      const sentence = values && values[0].toUpperCase() + values.slice(1) + '.';
      return { title: def.name, kind: 'Neue Fähigkeit', text: [SUMMARY[card.id], sentence].filter(Boolean).join(' ') };
    }
    case 'abilityLevel': {
      const def = ABILITIES[card.id];
      const s = stats || NEUTRAL_STATS;
      const changes = (level) => {
        const p = abilityParams(card.id, level, s);
        return [...new Set(def.levels[level - 2].map((c) => c.key))].map((k) => valueText(k, p[k])).join(', ');
      };
      let text = changes(card.toLevel);
      // Manche Stufen ändern keine Werte (Fähigkeiten ohne Schaden): dann die nächste Wirkung nennen.
      if (text === '') {
        let next = card.toLevel + 1;
        while (next <= def.levels.length + 1 && changes(next) === '') next++;
        text = next <= def.levels.length + 1
          ? `Noch ohne neue Werte; Stufe ${next} bringt ${changes(next)}.`
          : 'Keine weiteren Werte.';
      }
      return { title: def.name, kind: `Fähigkeit · Stufe ${card.toLevel}`, text };
    }
    case 'bonus': {
      const def = BONUSES[card.id];
      return { title: def.name, kind: `Bonus · Stufe ${card.toLevel}`, text: def.description };
    }
    case 'gold':
      return { title: 'Goldbeutel', kind: 'Gold', text: `${formatNumber(Math.floor(card.value * (stats ? stats.goldGain : 1)))} Gold` };
    case 'heal':
      return { title: 'Heiltrank', kind: 'Heilung', text: `Heilt ${pct(card.value)} Leben` };
    default:
      return { title: 'Karte', kind: '', text: '' };
  }
}
