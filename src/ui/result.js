// Ergebnisbildschirm nach einem Durchgang: Sieg oder Niederlage, Kennzahlen, Schaden je Fähigkeit.
import { el, formatNumber } from './dom.js';
import { screenHeader, heroLine } from './menus.js';
import { abilityColor } from './hud.js';
import { ABILITIES } from '../data/abilities.js';
import { RUN_DURATION } from '../data/waves.js';

/** Sekunden als mm:ss (auch 0). */
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * Fähigkeiten nach Schaden absteigend, ohne Einträge ohne Schaden.
 * @param {Record<string, number>} damageByAbility
 * @returns {{ id: string, name: string, damage: number }[]}
 */
export function damageRows(damageByAbility) {
  return Object.entries(damageByAbility)
    .filter(([, d]) => d > 0)
    .map(([id, damage]) => ({ id, name: ABILITIES[id]?.name ?? id, damage }))
    .sort((a, b) => b.damage - a.damage);
}

/**
 * @param {HTMLElement} c
 * @param {{ heroId: string, summary: ReturnType<typeof import('../modes/survivor.js').getSummary>, newBest?: boolean }} props
 * @param {any} app
 */
export function renderResult(c, props, app) {
  const { summary, heroId } = props;
  if (!summary) { app.screens.show('mode', { heroId }); return; }
  const hero = app.save.heroes.find((h) => h.id === heroId);

  const stat = (label, value, extra) => el('div', { class: 'result-stat' },
    el('dt', { text: label }), el('dd', {}, value, extra || null));

  const rows = damageRows(summary.damageByAbility);
  const max = rows.length ? rows[0].damage : 1;
  const total = rows.reduce((s, r) => s + r.damage, 0);
  const bars = rows.length === 0
    ? el('p', { class: 'muted', text: 'Kein Schaden verursacht.' })
    : el('ol', { class: 'damage-bars' }, ...rows.map((r) => {
      const fill = el('span', { class: 'damage-fill' });
      fill.style.width = `${Math.max(1, (r.damage / max) * 100)}%`;
      fill.style.setProperty('--ability-color', abilityColor(r.id));
      return el('li', { class: 'damage-row' },
        el('span', { class: 'damage-name', text: r.name }),
        el('span', { class: 'damage-track' }, fill),
        el('span', { class: 'damage-value', text: `${formatNumber(Math.round(r.damage))} (${formatNumber(Math.round((r.damage / total) * 100))} %)` }));
    }));

  const again = el('button', { class: 'btn btn-primary', type: 'button', onclick: () => app.startRun(heroId) }, 'Nochmal');
  c.append(
    screenHeader(summary.won ? 'Sieg' : 'Niederlage',
      summary.won ? 'Der letzte Boss ist besiegt – die Wildnis gehört dir.' : 'Diesmal hat die Wildnis gewonnen.'),
    hero ? el('p', { class: 'hero-badge' }, el('strong', { text: hero.name }), ' – ', heroLine(hero)) : null,
    el('dl', { class: 'result-stats' },
      stat('Überlebenszeit', clock(Math.min(summary.time, RUN_DURATION)),
        props.newBest ? el('span', { class: 'badge badge-best', text: 'Neue Bestzeit' }) : null),
      stat('Level', String(summary.level)),
      stat('Besiegte Gegner', formatNumber(summary.kills)),
      stat('Gold verdient', formatNumber(Math.floor(summary.gold)))),
    el('section', { class: 'panel result-damage', 'aria-labelledby': 'damage-title' },
      el('h2', { id: 'damage-title', text: 'Schaden je Fähigkeit' }),
      bars),
    el('footer', { class: 'screen-footer' },
      el('button', { class: 'btn', type: 'button', onclick: () => app.screens.show('mode', { heroId }) }, 'Zurück'),
      again),
  );
  again.focus({ preventScroll: true });
}
