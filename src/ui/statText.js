// Werte des Helden in Worten (DOM-frei, testbar).
import { formatNumber } from './dom.js';

/** Bezeichnungen der Werte in Wörtern. */
export const STAT_LABELS = {
  maxHp: 'Leben', hpRegen: 'Lebensregeneration', moveSpeed: 'Lauftempo', damage: 'Schaden',
  cooldown: 'Abklingzeit', area: 'Wirkungsfläche', armor: 'Rüstung', critChance: 'kritische Chance',
  critDamage: 'kritischer Schaden', dodge: 'Ausweichchance', pickupRadius: 'Sammelradius',
  xpGain: 'Erfahrung', goldGain: 'Gold',
};

const signed = (text, value) => (value < 0 ? `−${text}` : `+${text}`);

/**
 * Ein Modifikator in Wörtern, z. B. „Leben +30 %“, „Rüstung +2“, „kritische Chance +10 Prozentpunkte“.
 * @param {import('../data/animals.js').Modifier} m
 */
export function describeModifier(m) {
  const label = STAT_LABELS[m.stat] ?? m.stat;
  const parts = [];
  if (m.flat) {
    const v = Math.abs(m.flat);
    if (m.stat === 'critChance') parts.push(signed(`${formatNumber(v * 100)} Prozentpunkte`, m.flat));
    else if (m.stat === 'dodge' || m.stat === 'critDamage') parts.push(signed(`${formatNumber(Math.round(v * 100))} %`, m.flat));
    else if (m.stat === 'hpRegen') parts.push(signed(`${formatNumber(v, Number.isInteger(v) ? 0 : 1)}/s`, m.flat));
    else parts.push(signed(formatNumber(v, Number.isInteger(v) ? 0 : 2), m.flat));
  }
  if (m.pct) parts.push(signed(`${formatNumber(Math.abs(m.pct) * 100)} %`, m.pct));
  return `${label} ${parts.join(' und ')}`;
}
