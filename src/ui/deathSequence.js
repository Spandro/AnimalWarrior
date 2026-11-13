import { el } from './dom.js';

/**
 * Ablauf der Todesdarstellung als reine Funktion der Zeit seit dem Ereignis `dying`, dazu das Deckelement
 * mit Text. Die Regeln des Spiels kennen nur die Sterbephase (`dying`); Farbverlust, Abblende und Schriftzug
 * sind reine Darstellung.
 *
 * @typedef {{ grayscale: number, darkness: number, heroTilt: number, heroOpacity: number, showText: boolean,
 *   canSkip: boolean, done: boolean }} DeathValues
 */

const clamp01 = (v) => Math.min(1, Math.max(0, v));
/** 0 bis `from`, dann linear bis 1 bei `to`. */
const ramp = (t, from, to) => clamp01((t - from) / (to - from));
/** Zeitpunkte (s seit `dying`), ab denen der Text steht und die Darstellung fertig ist. */
export const DEATH_TIMES = { normal: { text: 2.4, done: 4.4 }, reduced: { text: 1.2, done: 3.0 } };


/**
 * @param {number} t Sekunden seit dem Ereignis `dying`
 * @param {boolean} reducedMotion ohne Kippen des Helden, kürzer
 * @returns {DeathValues}
 */
export function deathSequence(t, reducedMotion) {
  const times = reducedMotion ? DEATH_TIMES.reduced : DEATH_TIMES.normal;
  return {
    grayscale: ramp(t, 0, 1.2),
    darkness: reducedMotion ? ramp(t, 0, 1.2) : ramp(t, 1.0, 3.2),
    heroTilt: reducedMotion ? 0 : ramp(t, 0, 0.8),
    heroOpacity: 1 - ramp(t, 0.8, 2.0),
    showText: t >= times.text,
    canSkip: t >= 0.5,
    done: t >= times.done,
  };
}

/**
 * Deckelement für Tod und Sieg. Der Farbverlust läuft als CSS-Filter auf der Spielfläche (`canvas`), die Abblende
 * über ein schwarzes Deckelement; beides verschwindet mit `hide()` und `dispose()`. Der Text kommt über `textContent`.
 * @param {HTMLElement} uiLayer
 * @param {{ canvas?: HTMLCanvasElement|null }} [options] Spielfläche für den Filter (sonst die erste im Elternelement)
 */
export function createDeathOverlay(uiLayer, { canvas = uiLayer.parentElement?.querySelector('canvas') ?? null } = {}) {
  const dark = el('div', { class: 'death-dark' });
  const title = el('h2', { class: 'death-title' });
  const lineNode = el('p', { class: 'death-line' });
  const text = el('div', { class: 'death-text', hidden: true }, title, lineNode);
  const root = el('div', { class: 'death-overlay', 'aria-live': 'polite', hidden: true }, dark, text);
  uiLayer.append(root);

  let lastFilter = '', lastDark = -1, lastShown = false, lastLine = null;

  function setFilter(value) {
    if (!canvas || value === lastFilter) return;
    lastFilter = value;
    canvas.style.filter = value;
  }

  function showText(titleText, line) {
    title.textContent = titleText;
    if (line !== lastLine) { lastLine = line; lineNode.textContent = line ?? ''; }
    text.hidden = false;
  }

  return {
    /**
     * Wendet die Werte eines Bildes an; schreibt nur, was sich ändert.
     * @param {DeathValues} v
     * @param {string} line Spruch unter „Gefallen“
     */
    apply(v, line) {
      root.hidden = false;
      root.classList.remove('victory');
      setFilter(v.grayscale > 0 ? `grayscale(${v.grayscale.toFixed(3)})` : '');
      if (v.darkness !== lastDark) { lastDark = v.darkness; dark.style.opacity = v.darkness.toFixed(3); }
      if (v.showText !== lastShown) { lastShown = v.showText; if (v.showText) showText('Gefallen', line); else text.hidden = true; }
    },
    /** Goldenes Leuchten mit „Überlebt!“ und einem Spruch (eigene CSS-Animation). @param {string} line */
    showVictory(line) {
      setFilter('');
      root.hidden = false;
      root.classList.add('victory');
      dark.style.opacity = '0';
      lastDark = 0; lastShown = true;
      showText('Überlebt!', line);
    },
    /** Entfernt Filter und Deckelement, Text weg; die Spielfläche ist wieder unverändert. */
    hide() {
      setFilter('');
      if (canvas) canvas.style.filter = '';
      root.hidden = true;
      root.classList.remove('victory');
      text.hidden = true;
      dark.style.opacity = '0';
      lastDark = -1; lastShown = false; lastLine = null;
    },
    dispose() {
      this.hide();
      root.remove();
    },
  };
}
