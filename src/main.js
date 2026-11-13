// Einstieg: Menüs, Heldenverwaltung, Start eines Durchgangs und was danach passiert (Speichern, Ergebnis).
// URL-Schalter: ?autostart=1 oder ?debug=1&stress=1 überspringen die Menüs und starten sofort
// (dann gelten ?animal=hase|ente|waschbaer|giraffe und ?class=krieger|magier|dieb|hochstapler, aber nur gültige Paare:
// das Duo `giraffe` nur mit `hochstapler`, die anderen Tiere nur mit den drei Grundklassen); ?quality=low.
// Nur mit ?debug=1 (window.__debug, window.__app): ?speed=N (timeScale), ?stress=1 (300 Ratten,
// Bildrate oben links), ?autopick=1 (Level-up-Karten automatisch), Tasten K (alle Gegner besiegen), L (ein Level).
import { isWebGLAvailable, createRenderer } from './render/renderer.js';
import { initialQuality } from './render/quality.js';
import { loadSpriteSheets } from './render/sprites.js';
import { loadEnvironment } from './render/environment.js';
import { startGame } from './game.js';
import { createStore, addHero, deleteHero, settleRun, STORAGE_KEY } from './save/store.js';
import { applyRunToStats, evaluateAchievements, evaluateStored, unlockStored, unlock } from './core/achievements.js';
import { ACHIEVEMENTS } from './data/achievements.js';
import { createToasts } from './ui/achievements.js';
import { metaModifiers, hasRevive } from './save/meta.js';
import { createScreens, createNoticeBar } from './ui/screens.js';
import { createSfx } from './audio/sfx.js';
import { renderNoWebGL } from './ui/menus.js';
import { ANIMALS } from './data/animals.js';
import { classesFor, isValidPair } from './core/roster.js';

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
  Promise.all([loadSpriteSheets(), loadEnvironment()]).then(([sprites, env]) => startGame({
    canvas, uiLayer, seed: AUTOSTART_SEED, quality, timeScale, debug, stress, autopick, sprites, env, sfx: createUnlockedSfx(70),
    ...autostartHero(params.get('animal'), params.get('class')),
    // Ohne Menüs gibt es keinen Spielstand: nur melden, nichts speichern.
    onEnd: (summary) => showNotice(`${summary.won ? 'Gewonnen!' : 'Besiegt.'} Seite neu laden für einen neuen Versuch.`, { sticky: true }),
  }));
} else {
  startApp();
}

/**
 * Tier und Klasse für ?animal= und ?class=: nur ein gültiges Paar zählt (das Duo gehört fest zu Hochstapler).
 * Ohne Angabe oder bei einem ungültigen Paar fehlende Teile ergänzen: unbekanntes Tier → Hase; unbekannte
 * Klasse oder ungültiges Paar → die erste passende Klasse des Tiers (Krieger, beim Duo Hochstapler).
 * @param {string|null} animal
 * @param {string|null} cls
 */
function autostartHero(animal, cls) {
  const animalId = Object.hasOwn(ANIMALS, animal) ? animal : 'hase';
  const classId = isValidPair(animalId, cls) ? cls : classesFor(animalId)[0];
  return { animalId, classId };
}

/** Wird das Gerät hauptsächlich mit dem Finger bedient? Ohne matchMedia: nein. */
function isTouchPrimary() {
  try { return !!window.matchMedia?.('(pointer: coarse)').matches; } catch { return false; }
}

/**
 * Klangeffekte, die bei der ersten Berührung, dem ersten Klick oder Tastendruck irgendwo in der Seite
 * freigeschaltet werden (Browser erlauben Ton erst nach einer Nutzeraktion); jede weitere Aktion weckt
 * einen eingeschlafenen Kontext. Auf dem Handy kommt je nach Browser `pointerup`, `touchend` oder erst
 * `click` an, deshalb hören wir auf alle.
 * @param {number} volume 0…100
 */
function createUnlockedSfx(volume) {
  const sfx = createSfx();
  sfx.setVolume(volume);
  const unlock = () => sfx.resume();
  for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) {
    window.addEventListener(type, unlock, true);
  }
  return sfx;
}

function startApp() {
  const store = createStore(safeStorage);
  const initial = store.load();
  // Allererster Start ohne Spielstand: Fingergeräte beginnen sparsam. Danach gilt immer die Einstellung.
  if (initial.status === 'empty') {
    initial.data.settings.quality = initialQuality(isTouchPrimary());
  }
  // ?quality=low gilt, bis die Einstellungen etwas anderes sagen (Qualität dort wählen oder Spielstand importieren).
  const quality = params.get('quality') === 'low' ? 'low' : initial.data.settings.quality;

  const app = {
    store,
    /** Aktueller Spielstand; fällt beim Speichern etwas aus, wird nur im Speicher weitergeführt. */
    save: initial.data,
    /** Status des letzten Ladens aus dem Speicher (bei 'newer' ist `save` nur der Standard). */
    loadStatus: initial.status,
    /** Id des gewählten Helden. */
    heroId: null,
    /** Laufender Durchgang (Rückgabe von startGame) oder null. */
    run: null,
    /** Der eine WebGL-Renderer der App (Spiel und Figurenvorschau). */
    view: createRenderer(canvas, { quality }),
    /** Gerade gültige Qualität (URL-Schalter oder Einstellung). */
    quality,
    /** Klangeffekte; Lautstärke aus den Einstellungen. */
    sfx: createUnlockedSfx(initial.data.settings.volume),
    /**
     * Gemalte Figuren, einmal beim Start geladen. Menüs erscheinen schon vorher; Vorschau und Durchgang
     * warten darauf. Schlägt das Laden fehl, `ok: false` (3D-Figuren).
     * @type {Promise<import('./render/sprites.js').SpriteSheets>}
     */
    sprites: loadSpriteSheets(),
    /**
     * Gemalte Umgebung (Boden, Bäume, Deko, Truhen, Aufsammelbares), einmal beim Start geladen.
     * Schlägt das Laden fehl, `ok: false` (bisherige 3D-Darstellung).
     * @type {Promise<import('./render/environment.js').Environment>}
     */
    environment: loadEnvironment(),
    /** Merkmal des zuletzt angeforderten Durchgangs, solange er auf die Figuren wartet. */
    pendingRun: null,
    showNotice,
    /** Einblendungen für Erfolge; im Body, damit sie im Spiel und auf dem Ergebnisbildschirm erscheinen. */
    toasts: createToasts(document.body),
    screens: null,

    /** Blendet einen Erfolg ein und spielt den Ton dazu. */
    announceAchievement(id) {
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (!def) return;
      app.toasts.show({ title: def.title, line: def.line, gold: def.gold });
      app.sfx.play('achievement');
    },

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

    /** Überträgt die gespeicherten Einstellungen auf Renderer, laufenden Durchgang und Ton (sofort, ohne Neuladen). */
    applySettings() {
      const { volume, quality: q } = app.save.settings;
      app.quality = q;
      app.view.setQuality(q);
      app.run?.setQuality(q);
      app.sfx.setVolume(volume);
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
      Promise.all([app.sprites, app.environment]).then(([sprites, env]) => {
        // Inzwischen abgebrochen oder durch einen neueren Start ersetzt.
        if (app.pendingRun !== token) return;
        app.pendingRun = null;
        app.run = startGame({
          canvas, uiLayer, view: app.view, animalId: hero.animal, classId: hero.class,
          seed: Date.now(), quality: app.quality, timeScale, debug, autopick, sprites, env, sfx: app.sfx,
          modifiers: metaModifiers(app.save), revive: hasRevive(app.save),
          achievements: { getSave: () => app.save, notify: (id) => app.announceAchievement(id) },
          onEnd: (summary, extra) => app.finishRun(heroId, summary, extra),
        });
      });
    },

    /**
     * Nach Sieg, Tod oder Aufgeben: Durchgang verbuchen (Gold, Statistik, beste Zeit) und Ergebnis zeigen.
     * @param {string} heroId
     * @param {{ facts: import('./data/achievements.js').RunFacts, earlyIds: string[] }} [extra]
     *   Zahlen des Durchgangs und Erfolge, die schon während des Durchgangs eingeblendet wurden.
     *
     * Erfolge: Alles in einem `update` – Durchgang verbuchen, lebenslange Zähler fortschreiben, Erfolge freischalten
     * (die schon eingeblendeten und die, die erst jetzt erfüllt sind) samt Gold. Neue Einblendungen erscheinen auf
     * dem Ergebnisbildschirm.
     */
    finishRun(heroId, summary, extra) {
      app.endRunSilently();
      const before = app.save.heroes.find((h) => h.id === heroId)?.survivor.bestTime ?? 0;
      const facts = extra?.facts;
      const earlyIds = extra?.earlyIds ?? [];
      let lateIds = [];
      if (facts) {
        // Zähler und Gold so, wie sie nach dem Verbuchen sind, ohne den gespeicherten Stand zu ändern.
        const stats = applyRunToStats(structuredClone(app.save.stats), facts);
        const save = { ...app.save, gold: app.save.gold + Math.floor(summary.gold) };
        const known = new Set([...Object.keys(app.save.achievements), ...earlyIds]);
        lateIds = evaluateAchievements({ run: facts, stats, save }, known);
      }
      const ids = [...earlyIds, ...lateIds];
      // Ist der Held inzwischen gelöscht (anderer Tab), bleiben Gold, Zähler und Erfolge trotzdem erhalten.
      app.update((save) => {
        settleRun(save, heroId, summary);
        if (facts) applyRunToStats(save.stats, facts);
        unlock(save, ids, Date.now());
      });
      const storedIds = app.unlockStoredAchievements();
      const after = app.save.heroes.find((h) => h.id === heroId)?.survivor.bestTime ?? 0;
      app.screens.show('result', { heroId, summary, newBest: after > before });
      for (const id of [...lateIds, ...storedIds]) app.announceAchievement(id);
    },

    /**
     * Schaltet Erfolge frei, die schon aus dem gespeicherten Stand folgen (höchstens drei Runden, damit z. B. das
     * Gold eines Erfolgs Sparschwein auslösen kann). Gibt die neuen Ids zurück; die Einblendung macht der Aufrufer.
     * @returns {string[]}
     */
    unlockStoredAchievements() {
      if (evaluateStored(app.save).length === 0) return [];
      let ids = [];
      app.update((save) => { ids = unlockStored(save, Date.now()); });
      return ids;
    },

    endRunSilently() {
      app.pendingRun = null;
      app.run?.stop();
      app.run = null;
    },
  };
  app.screens = createScreens(menuRoot, app);

  // Kleines Klicken für Knöpfe in Menüs und Dialogen.
  document.addEventListener('click', (e) => {
    const button = e.target instanceof Element ? e.target.closest('button') : null;
    if (button && !button.disabled) app.sfx.play('click');
  });

  if (initial.status === 'corrupt') showNotice('Spielstand war beschädigt und wurde gesichert');
  else if (initial.status === 'newer') showNotice('Spielstand stammt von einer neueren Version', { sticky: true });
  else if (initial.status === 'unavailable') showNotice(UNSAVED_TEXT, { sticky: true });

  // Ein anderer Tab hat den Spielstand geändert: Menüs mit dem neuen Stand neu aufbauen.
  window.addEventListener('storage', (e) => {
    if (e.key !== null && e.key !== STORAGE_KEY) return;
    const { data, status } = store.load();
    if (status !== 'ok' && status !== 'empty') return;
    app.save = data;
    app.loadStatus = status;
    const screen = app.screens.current();
    if (screen === 'main' || screen === 'heroes' || screen === 'mode' || screen === 'metaShop' || screen === 'achievements') {
      app.screens.show(screen, app.screens.props());
    }
  });

  if (debug) window.__app = app;
  app.screens.show('main');
  for (const id of app.unlockStoredAchievements()) app.announceAchievement(id);
}
