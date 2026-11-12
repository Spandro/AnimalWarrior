// Dauerboni-Laden: Gold gegen dauerhafte Verbesserungen. Jeder Kauf läuft über app.update (frisch gelesen,
// geprüft und gespeichert), damit ein zweiter Tab keine Käufe überschreibt.
import { el, formatNumber } from './dom.js';
import { screenHeader, screenFooter } from './menus.js';
import { META } from '../data/meta.js';
import { metaPrice, buyMeta } from '../save/meta.js';

const REASON_TEXT = {
  gold: 'Dafür fehlt das Gold.',
  max: 'Dieser Bonus ist schon auf der höchsten Stufe.',
  unknown: 'Diesen Bonus gibt es nicht.',
};

/** Zahl mit höchstens einer Nachkommastelle. */
const fmt = (v) => formatNumber(v, Number.isInteger(Math.round(v * 10) / 10) ? 0 : 1);

/**
 * Wirkung eines Bonus auf einer Stufe in Worten: „+15 %“, „+3“ oder bei Boni ohne Zahlenwert „aktiv“.
 * @param {import('../data/meta.js').MetaDef} def
 * @param {number} level
 */
export function effectText(def, level) {
  if (!def.modifier) return level > 0 ? 'aktiv' : 'nicht erworben';
  if (level <= 0) return 'keine';
  const { pct, flat } = def.modifier;
  return pct ? `+${fmt(Math.round(pct * level * 1000) / 10)} %` : `+${fmt(flat * level)}`;
}

/**
 * @param {HTMLElement} c
 * @param {Record<string, any>} props
 * @param {any} app
 */
export function renderMetaShop(c, props, app) {
  const goldValue = el('strong');
  const list = el('ul', { class: 'shop-list', 'aria-label': 'Dauerboni' });
  const footer = screenFooter(() => app.screens.show('main'));

  function buy(id) {
    let result = { ok: false, reason: 'unknown' };
    app.update((save) => { result = buyMeta(save, id); });
    if (!result.ok) app.showNotice(REASON_TEXT[result.reason] ?? 'Kauf nicht möglich.');
    render(id);
  }

  /** Baut Goldanzeige und Liste aus app.save neu auf; der Fokus bleibt beim Bonus, der gerade gekauft wurde. */
  function render(focusId) {
    const save = app.save;
    goldValue.textContent = formatNumber(save.gold);
    list.replaceChildren(...Object.values(META).map((def) => {
      const level = save.metaUpgrades[def.id] || 0;
      const maxed = level >= def.maxLevel;
      const price = maxed ? 0 : metaPrice(def.id, level);
      const missing = price - save.gold;
      const pips = el('span', { class: 'shop-pips', 'aria-hidden': 'true' },
        ...Array.from({ length: def.maxLevel }, (_, i) => el('span', { class: i < level ? 'pip pip-on' : 'pip' })));
      const button = el('button', {
        class: maxed ? 'btn shop-buy' : 'btn btn-primary shop-buy', type: 'button', 'data-id': def.id,
        disabled: maxed || missing > 0,
        'aria-label': maxed ? `${def.name}: höchste Stufe erreicht` : `${def.name} auf Stufe ${level + 1} kaufen für ${formatNumber(price)} Gold`,
        onclick: () => buy(def.id),
      }, maxed ? 'Höchststufe' : `Kaufen · ${formatNumber(price)} Gold`);
      const effect = maxed
        ? `Wirkung: ${effectText(def, level)}`
        : `Wirkung jetzt: ${effectText(def, level)} → nächste Stufe: ${effectText(def, level + 1)}`;
      return el('li', { class: 'shop-item' },
        el('div', { class: 'shop-head' },
          el('span', { class: 'shop-name', text: def.name }),
          el('span', { class: 'shop-level' }, pips, ` Stufe ${level} / ${def.maxLevel}`)),
        el('p', { class: 'shop-desc', text: def.description }),
        el('p', { class: 'shop-effect', text: effect.replaceAll(' %', ' %') }),
        el('div', { class: 'shop-buyrow' },
          button,
          !maxed && missing > 0 ? el('span', { class: 'shop-missing muted', text: `Es fehlen ${formatNumber(missing)} Gold.` }) : null));
    }));
    if (focusId) {
      const next = list.querySelector(`button[data-id="${focusId}"]:not(:disabled)`) ?? footer.querySelector('button');
      next?.focus({ preventScroll: true });
    }
  }

  c.append(
    screenHeader('Dauerboni', 'Dauerhafte Verbesserungen für jeden Durchgang aller Helden. Der Preis verdoppelt sich mit jeder Stufe.'),
    el('p', { class: 'gold-line' }, 'Gold: ', goldValue),
    list,
    footer,
  );
  render();
}
