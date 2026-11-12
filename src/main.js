// Einstieg: Menüs, Heldenverwaltung, Start eines Durchgangs und was danach passiert (Speichern, Ergebnis).
// URL-Schalter: ?autostart=1 oder ?debug=1&stress=1 überspringen die Menüs und starten sofort
// (dann gelten ?animal=hase|ente|waschbaer und ?class=krieger|magier|dieb); ?quality=low.
// Nur mit ?debug=1 (window.__debug, window.__app): ?speed=N (timeScale), ?stress=1 (300 Ratten,
// Bildrate oben links), ?autopick=1 (Level-up-Karten automatisch), Tasten K (alle Gegner besiegen), L (ein Level).
import { isWebGLAvailable, createRenderer } from './render/renderer.js';
import { loadSpriteSheets } from './render/sprites.js';
import { startGame } from './game.js';
import { createStore, addHero, deleteHero, recordRun, STORAGE_KEY } from './save/store.js';
import { metaModifiers, hasRevive } from './save/meta.js';
import { createScreens, createNoticeBar } from './ui/screens.js';
import { renderNoWebGL } from './ui/menus.js';
import { ANIMALS } from './data/animals.js';
import { CLASSES } from './data/classes.js';

const AUTOSTART_SEED = 20261112;
const UNSAVED_TEXT = 'Fortschritt kann nicht gespeichert werden';

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game'));
const uiLayer = document.getElementById('ui');
const menuRoot = document.getElementById('menu');
const showNotice = createNoticeBar(document.getElementById('notice'));

const params = new URLSearchParams(location.search);
const debug = params.get('debug') === '1';
const stress = debug && params.get('stress') === '1';
const timeScale = debug && Number(params.get('speed')) > 0 ? Number(params.get('speed')) : 1;
const autopick = debug && params.get('autopick') === '1';

/** Speicherzugriff, der auch dann nicht abstürzt, wenn schon der Zugriff auf localStorage wirft. */
const safeStorage = {
  getItem: (key) => window.localStorage.getItem(key),
  setItem: (key, value) => window.localStorage.setItem(key, value),
  removeItem: (key) => window.localStorage.removeItem(key),
};

if (!isWebGLAvailable()) {
  document.body.dataset.screen = 'nowebgl';
  renderNoWebGL(menuRoot);
} else if (params.get('autostart') === '1' || stress) {
  const quality = params.get('quality') === 'low' ? 'low' : 'high';
  document.body.dataset.screen = 'game';
  loadSpriteSheets().then((sprites) => startGame({
    canvas, uiLayer, seed: AUTOSTART_SEED, quality, timeScale, debug, stress, autopick, sprites,
    animalId: Object.hasOwn(ANIMALS, params.get('animal')) ? params.get('animal') : 'hase',
    classId: Object.hasOwn(CLASSES, params.get('class')) ? params.get('class') : 'krieger',
    // Ohne Menüs gibt es keinen Spielstand: nur melden, nichts speichern.
    onEnd: (summary) => showNotice(`${summary.won ? 'Gewonnen!' : 'Besiegt.'} Seite neu laden für einen neuen Versuch.`, { sticky: true }),
  }));
} else {
  startApp();
}

function startApp() {
  const store = createStore(safeStorage);
  const initial = store.load();
  const quality = params.get('quality') === 'low' ? 'low' : initial.data.settings.quality;

  const app = {
    store,
    /** Aktueller Spielstand; fällt beim Speichern etwas aus, wird nur im Speicher weitergeführt. */
    save: initial.data,
    /** Id des gewählten Helden. */
    heroId: null,
    /** Laufender Durchgang (Rückgabe von startGame) oder null. */
    run: null,
    /** Der eine WebGL-Renderer der App (Spiel und Figurenvorschau). */
    view: createRenderer(canvas, { quality }),
    /**
     * Gemalte Figuren, einmal beim Start geladen. Menüs erscheinen schon vorher; Vorschau und Durchgang
     * warten darauf. Schlägt das Laden fehl, `ok: false` (3D-Figuren).
     * @type {Promise<import('./render/sprites.js').SpriteSheets>}
     */
    sprites: loadSpriteSheets(),
    /** Merkmal des zuletzt angeforderten Durchgangs, solange er auf die Figuren wartet. */
    pendingRun: null,
    showNotice,
    screens: null,

    /**
     * Ändert den Spielstand und speichert. Klappt das Speichern nicht, gilt die Änderung nur
     * im Speicher weiter, und eine dauerhafte Meldung erscheint.
     * @param {(save: import('./save/schema.js').Save) => void} mutator
     */
    update(mutator) {
      let result;
      try {
        result = store.update(mutator);
      } catch (e) {
        console.error(e);
        result = { saved: false };
      }
      if (result.saved) {
        app.save = result.data;
      } else {
        const copy = structuredClone(app.save);
        mutator(copy);
        app.save = copy;
        showNotice(UNSAVED_TEXT, { sticky: true });
      }
    },

    /** @returns {import('./save/schema.js').Hero | null} null, wenn alle Plätze belegt sind */
    createHero(spec) {
      const id = typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${performance.now().toString(36).replace('.', '')}`;
      let created = null;
      app.update((save) => { created = addHero(save, spec, { now: Date.now(), id }); });
      if (!created) showNotice('Alle sechs Heldenplätze sind belegt.');
      return created && app.save.heroes.find((h) => h.id === id) || null;
    },

    deleteHero(id) {
      app.update((save) => { deleteHero(save, id); });
      if (app.heroId === id) app.heroId = null;
    },

    /** Zeigt den Spielbildschirm und startet einen Durchgang mit dem Helden. */
    startRun(heroId) {
      const hero = app.save.heroes.find((h) => h.id === heroId);
      if (!hero) { app.screens.show('heroes'); return; }
      app.endRunSilently();
      app.heroId = heroId;
      app.screens.show('game');
      const token = {};
      app.pendingRun = token;
      app.sprites.then((sprites) => {
        // Inzwischen abgebrochen oder durch einen neueren Start ersetzt.
        if (app.pendingRun !== token) return;
        app.pendingRun = null;
        app.run = startGame({
          canvas, uiLayer, view: app.view, animalId: hero.animal, classId: hero.class,
          seed: Date.now(), quality, timeScale, debug, autopick, sprites,
          modifiers: metaModifiers(app.save), revive: hasRevive(app.save),
          onEnd: (summary) => app.finishRun(heroId, summary),
        });
      });
    },

    /**
     * Nach Sieg, Tod oder Aufgeben: Durchgang verbuchen (Gold, Statistik, beste Zeit) und Ergebnis zeigen.
     * @param {string} heroId
     * @param {ReturnType<typeof import('./modes/survivor.js').getSummary>} summary
     */
    finishRun(heroId, summary) {
      app.endRunSilently();
      const before = app.save.heroes.find((h) => h.id === heroId)?.survivor.bestTime ?? 0;
      if (app.save.heroes.some((h) => h.id === heroId)) app.update((save) => recordRun(save, heroId, summary));
      const after = app.save.heroes.find((h) => h.id === heroId)?.survivor.bestTime ?? 0;
      app.screens.show('result', { heroId, summary, newBest: after > before });
    },

    endRunSilently() {
      app.pendingRun = null;
      app.run?.stop();
      app.run = null;
    },
  };
  app.screens = createScreens(menuRoot, app);

  if (initial.status === 'corrupt') showNotice('Spielstand war beschädigt und wurde gesichert');
  else if (initial.status === 'newer') showNotice('Spielstand stammt von einer neueren Version', { sticky: true });
  else if (initial.status === 'unavailable') showNotice(UNSAVED_TEXT, { sticky: true });

  // Ein anderer Tab hat den Spielstand geändert: Menüs mit dem neuen Stand neu aufbauen.
  window.addEventListener('storage', (e) => {
    if (e.key !== null && e.key !== STORAGE_KEY) return;
    const { data, status } = store.load();
    if (status !== 'ok' && status !== 'empty') return;
    app.save = data;
    const screen = app.screens.current();
    if (screen === 'main' || screen === 'heroes' || screen === 'mode') {
      app.screens.show(screen, app.screens.props());
    }
  });

  if (debug) window.__app = app;
  app.screens.show('main');
}
