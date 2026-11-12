// Erfolge: Einblendung bei Freischaltung und die Liste im Hauptmenü. Texte immer über Textknoten.
import { el, formatNumber } from './dom.js';
import { screenHeader, screenFooter } from './menus.js';
import { ACHIEVEMENTS } from '../data/achievements.js';

/** So lange bleibt eine Einblendung stehen (ms), samt Ausblenden am Ende. */
export const TOAST_MS = 4000;
const FADE_MS = 300;

/**
 * Einblendungen für freigeschaltete Erfolge. Mehrere erscheinen nacheinander (je etwa 4 s). Das Element liegt
 * unten über dem Spielfeld, damit weder Leisten noch Held verdeckt werden, und fängt keine Mausklicks ab.
 * @param {HTMLElement} host Element, in das die Ablage gelegt wird (in main.js der Body, damit sie auch über Menüs steht)
 * @returns {{ show(toast: { title: string, line: string, gold: number }): void, dispose(): void }}
 */
export function createToasts(host) {
  const root = el('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
  host.append(root);
  /** @type {{ title: string, line: string, gold: number }[]} */
  const queue = [];
  let current = null;
  let timers = [];
  let disposed = false;

  const later = (fn, ms) => { timers.push(setTimeout(fn, ms)); };

  function next() {
    if (disposed || current || queue.length === 0) return;
    const { title, line, gold } = queue.shift();
    current = el('div', { class: 'toast' },
      el('span', { class: 'toast-kicker', text: 'Erfolg freigeschaltet' }),
      el('strong', { class: 'toast-title', text: title }),
      el('span', { class: 'toast-line', text: line }),
      el('span', { class: 'toast-gold', text: `+${formatNumber(gold)} Gold` }));
    root.append(current);
    const node = current;
    later(() => node.classList.add('toast-out'), TOAST_MS - FADE_MS);
    later(() => { node.remove(); current = null; next(); }, TOAST_MS);
  }

  return {
    show(toast) {
      if (disposed) return;
      queue.push(toast);
      next();
    },
    dispose() {
      disposed = true;
      for (const t of timers) clearTimeout(t);
      timers = [];
      queue.length = 0;
      root.remove();
    },
  };
}

/** Datum der Freischaltung, deutsch (TT.MM.JJJJ). */
export function formatDate(ms) {
  return new Date(ms).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Liste aller Erfolge in Datenreihenfolge; freigeschaltete mit Spruch, Belohnung und Datum, die übrigen mit „???“.
 * @param {HTMLElement} c
 * @param {Record<string, any>} props
 * @param {any} app
 */
export function renderAchievements(c, props, app) {
  const unlocked = app.save.achievements;
  const count = ACHIEVEMENTS.filter((a) => Object.hasOwn(unlocked, a.id)).length;
  const list = el('ul', { class: 'achievement-list', 'aria-label': 'Erfolge' });
  for (const a of ACHIEVEMENTS) {
    const at = Object.hasOwn(unlocked, a.id) ? unlocked[a.id] : null;
    const done = at !== null;
    list.append(el('li', { class: `achievement ${done ? 'achievement-done' : 'achievement-locked'}` },
      el('span', { class: 'achievement-title', text: a.title }),
      el('span', { class: 'achievement-condition', text: a.condition }),
      el('span', { class: 'achievement-line', text: done ? a.line : '???' }),
      done
        ? el('span', { class: 'achievement-meta' },
          el('span', { class: 'achievement-gold', text: `+${formatNumber(a.gold)} Gold` }),
          el('span', { class: 'achievement-date', text: `Freigeschaltet am ${formatDate(at)}` }))
        : null));
  }
  c.append(
    screenHeader('Erfolge', `${count} von ${ACHIEVEMENTS.length} freigeschaltet`),
    list,
    screenFooter(() => app.screens.show('main')),
  );
}
