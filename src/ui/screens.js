// Bildschirmwechsel und Meldungsleiste. Menüs sind HTML über der 3D-Fläche.
import { el } from './dom.js';
import { renderMain, renderHeroes, renderMode } from './menus.js';
import { renderMetaShop } from './metaShop.js';
import { renderSettings } from './settings.js';
import { renderCreateAnimal, renderCreateClass, renderCreateName } from './heroCreate.js';
import { renderResult } from './result.js';

/**
 * @typedef {'main'|'heroes'|'createAnimal'|'createClass'|'createName'|'mode'|'game'|'result'|'metaShop'|'settings'} ScreenName
 * @typedef {(container: HTMLElement, props: Record<string, any>, app: any) => (void | (() => void))} ScreenBuilder
 *   baut den Bildschirm in `container`; die optionale Rückgabe räumt beim Verlassen auf.
 */

/** @type {Record<ScreenName, ScreenBuilder>} */
const BUILDERS = {
  main: renderMain,
  heroes: renderHeroes,
  createAnimal: renderCreateAnimal,
  createClass: renderCreateClass,
  createName: renderCreateName,
  mode: renderMode,
  // Im Spiel ist die Menüebene ausgeblendet; Anzeige und Dialoge baut game.js im UI-Layer.
  game: () => {},
  result: renderResult,
  metaShop: renderMetaShop,
  settings: renderSettings,
};

/**
 * @param {HTMLElement} root Menüebene
 * @param {any} app App-Objekt aus main.js (Spielstand, Aktionen, gemeinsamer Renderer)
 * @returns {{ show(name: ScreenName, props?: Record<string, any>): void, current(): ScreenName | null, props(): Record<string, any> }}
 */
export function createScreens(root, app) {
  /** @type {ScreenName | null} */
  let currentName = null;
  let currentProps = {};
  /** @type {(() => void) | null} */
  let cleanup = null;

  function show(name, props = {}) {
    const build = BUILDERS[name];
    if (!build) throw new Error(`Unbekannter Bildschirm: ${name}`);
    const leave = cleanup;
    cleanup = null;
    leave?.();
    root.replaceChildren();
    currentName = name;
    currentProps = props;
    document.body.dataset.screen = name;
    const container = el('section', { class: `screen screen-${name}` });
    root.append(container);
    cleanup = build(container, props, app) || null;
    root.scrollTop = 0;
    // Tastaturfokus an den Anfang des neuen Bildschirms, sofern der Bildschirm ihn nicht selbst gesetzt hat.
    const heading = container.querySelector('h1');
    if (heading && !container.contains(document.activeElement)) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }

  return { show, current: () => currentName, props: () => currentProps };
}

const NOTICE_TIMEOUT = 7000;

/**
 * Meldungsleiste oben. Dauerhafte Meldungen bleiben, bis eine andere sie ersetzt; eine
 * kurzzeitige Meldung verschwindet nach einigen Sekunden und gibt die dauerhafte wieder frei.
 * @param {HTMLElement} bar
 * @returns {(text: string, options?: { sticky?: boolean }) => void}
 */
export function createNoticeBar(bar) {
  bar.setAttribute('role', 'status');
  let stickyText = '';
  let timer = 0;

  function display(text) {
    bar.textContent = text;
    bar.hidden = text === '';
    document.body.classList.toggle('has-notice', text !== '');
    document.body.style.setProperty('--notice-h', text === '' ? '0px' : `${bar.offsetHeight}px`);
  }
  window.addEventListener('resize', () => display(bar.hidden ? '' : bar.textContent));

  return function showNotice(text, { sticky = false } = {}) {
    clearTimeout(timer);
    if (sticky) stickyText = text;
    display(text);
    if (!sticky) timer = setTimeout(() => display(stickyText), NOTICE_TIMEOUT);
  };
}
