// Bildschirmwechsel und Meldungsleiste. Menüs sind HTML über der 3D-Fläche.
import { el } from './dom.js';
import { renderMain, renderHeroes, renderMode } from './menus.js';
import { renderMetaShop } from './metaShop.js';
import { renderSettings } from './settings.js';
import { renderCreateAnimal, renderCreateClass, renderCreateName } from './heroCreate.js';
import { renderResult } from './result.js';
import { renderAchievements } from './achievements.js';
import { renderTavern, renderChest, probeImage } from './tavern.js';
import { renderDice, renderWheel, renderHiLo } from './tavernGames.js';
import { TAVERN_IMAGES } from '../data/tavern.js';
import { MENU_SCENES, SCENE_CELLS } from '../data/environment.js';

/**
 * @typedef {'main'|'heroes'|'createAnimal'|'createClass'|'createName'|'mode'|'game'|'result'|'metaShop'|'settings'|'achievements'|'tavern'|'tavernChest'|'tavernDice'|'tavernWheel'|'tavernHiLo'} ScreenName
 * @typedef {(container: HTMLElement, props: Record<string, any>, app: any) => (void | (() => void))} ScreenBuilder
 *   baut den Bildschirm in `container`; die optionale Rückgabe räumt beim Verlassen auf.
 */

/** @type {Partial<Record<ScreenName, ScreenBuilder>>} */
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
  achievements: renderAchievements,
  tavern: renderTavern,
  tavernChest: renderChest,
  tavernDice: renderDice,
  tavernWheel: renderWheel,
  tavernHiLo: renderHiLo,
};

/**
 * Legt das Landschaftsbild hinter einen Bildschirm: `data-scene` schaltet es ein, `--scene-pos`
 * wählt das Feld im 3 × 2-Raster von `szenen.webp` (Spalte 0–2 → 0/50/100 %, Zeile 0–1 → 0/100 %).
 * @param {HTMLElement} root Menüebene
 * @param {string} name Bildschirm
 */
function setScene(root, name) {
  if (name.startsWith('tavern')) {
    setTavernRoom(root);
    return;
  }
  root.style.removeProperty('--room-image');
  const scene = MENU_SCENES[name];
  const cell = scene ? SCENE_CELLS[scene] : null;
  if (!cell) {
    delete root.dataset.scene;
    return;
  }
  root.dataset.scene = scene;
  root.style.setProperty('--scene-pos', `${cell.col * 50}% ${cell.row * 100}%`);
}

/**
 * Die Gaststube hinter allen Taverne-Bildschirmen: `data-scene="gaststube"` schaltet den dunklen Holzverlauf ein
 * (styles.css), das gemalte Bild kommt dazu, sobald die Datei da ist. Fehlt sie, bleibt der Verlauf.
 * @param {HTMLElement} root Menüebene
 */
function setTavernRoom(root) {
  root.dataset.scene = 'gaststube';
  root.style.removeProperty('--scene-pos');
  const url = TAVERN_IMAGES.room;
  probeImage(url).then((img) => {
    if (img && root.dataset.scene === 'gaststube') root.style.setProperty('--room-image', `url('${url}')`);
  });
}

/**
 * @param {HTMLElement} root Menüebene
 * @param {any} app App-Objekt aus main.js (Spielstand, Aktionen, gemeinsamer Renderer)
 * @returns {{ show(name: ScreenName, props?: Record<string, any>): void, has(name: string): boolean, current(): ScreenName | null, props(): Record<string, any> }}
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
    setScene(root, name);
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

  return { show, has: (name) => Object.hasOwn(BUILDERS, name), current: () => currentName, props: () => currentProps };
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
