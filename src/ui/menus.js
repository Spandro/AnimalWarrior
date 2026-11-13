// Hauptmenü mit Export und Import, Heldenauswahl, Modusauswahl und Rückfragen.
import { el, formatTime, formatNumber } from './dom.js';
import { ANIMALS } from '../data/animals.js';
import { CLASSES } from '../data/classes.js';
import { RUN_DURATION } from '../data/waves.js';
import { MAX_HEROES } from '../save/schema.js';
import { exportText } from '../save/store.js';

/** Kopfzeile eines Bildschirms mit Titel und optionaler Unterzeile. */
export function screenHeader(title, subtitle) {
  return el('header', { class: 'screen-header' },
    el('h1', { text: title }),
    subtitle ? el('p', { class: 'subtitle', text: subtitle }) : null);
}

/** Fußzeile mit „Zurück“ und optional weiteren Knöpfen rechts. */
export function screenFooter(onBack, ...right) {
  return el('footer', { class: 'screen-footer' },
    onBack ? el('button', { class: 'btn', type: 'button', onclick: onBack }, '← Zurück') : el('span'),
    ...right);
}

// ---------------------------------------------------------------- Hauptmenü

/** Dateiname des Spielstand-Exports. */
export const EXPORT_FILENAME = 'animalwarrior-spielstand.json';
/** Größer als das darf eine Importdatei nicht sein (ein Spielstand ist wenige KB groß). */
const MAX_IMPORT_BYTES = 1024 * 1024;

/** Lädt den Spielstand im Speicher als JSON-Datei herunter (Blob-Link, danach wieder freigegeben). */
export function exportSave(app) {
  const text = exportText(app.save, app.loadStatus);
  if (text === null) return;
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = el('a', { href: url, download: EXPORT_FILENAME, hidden: true });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  app.showNotice('Spielstand exportiert.');
}

/**
 * Liest die gewählte Datei, fragt nach und ersetzt den Spielstand; Fehler erscheinen als Meldung,
 * der vorhandene Stand bleibt dann unverändert.
 * @param {File | undefined} file
 */
export async function importSave(app, file) {
  if (!file) return;
  if (file.size > MAX_IMPORT_BYTES) { app.showNotice('Die Datei ist zu groß für einen Spielstand.'); return; }
  let text;
  try {
    text = await file.text();
  } catch (e) {
    app.showNotice('Die Datei konnte nicht gelesen werden.');
    return;
  }
  const ok = await confirmDialog({
    title: 'Vorhandenen Spielstand ersetzen?',
    message: 'Alle Helden, Gold und Dauerboni werden durch den Inhalt der Datei ersetzt. Das lässt sich nicht rückgängig machen.',
    confirmLabel: 'Ersetzen',
  });
  if (!ok) return;
  const result = app.store.importJson(text);
  if (!result.ok) { app.showNotice(`Import fehlgeschlagen: ${result.error}`); return; }
  app.save = result.data;
  app.loadStatus = 'ok';
  app.heroId = null;
  app.applySettings();
  app.showNotice('Spielstand importiert.');
  app.screens.show('main');
}

export function renderMain(c, props, app) {
  const save = app.save;
  const fileInput = el('input', {
    type: 'file', accept: '.json,application/json', hidden: true, tabindex: '-1', 'aria-hidden': 'true', id: 'import-file',
    onchange: () => {
      const file = fileInput.files[0];
      fileInput.value = '';
      importSave(app, file);
    },
  });
  c.append(
    el('div', { class: 'title-block' },
      el('p', { class: 'kicker', text: 'Ein Abenteuer im Wald' }),
      el('h1', { class: 'game-title', text: 'AnimalWarrior' }),
      el('p', { class: 'subtitle', text: 'Hase, Ente und Waschbär gegen die Wellen der Wildnis.' })),
    el('nav', { class: 'menu-list', 'aria-label': 'Hauptmenü' },
      el('button', { class: 'btn btn-primary btn-large', type: 'button', onclick: () => app.screens.show('heroes') }, 'Spielen'),
      el('button', { class: 'btn', type: 'button', onclick: () => app.screens.show('metaShop') }, 'Dauerboni'),
      el('button', { class: 'btn', type: 'button', onclick: () => app.screens.show('achievements') }, 'Erfolge'),
      el('button', { class: 'btn', type: 'button', onclick: () => app.screens.show('settings') }, 'Einstellungen'),
      el('div', { class: 'menu-row' },
        el('button', {
          class: 'btn', type: 'button', disabled: app.loadStatus === 'newer',
          title: app.loadStatus === 'newer' ? 'Spielstand stammt von einer neueren Version' : null,
          onclick: () => exportSave(app),
        }, 'Spielstand exportieren'),
        el('button', { class: 'btn', type: 'button', onclick: () => fileInput.click() }, 'Spielstand importieren')),
      fileInput),
    el('p', { class: 'gold-line' }, 'Gold: ', el('strong', { text: formatNumber(save.gold) })),
  );
}

// ---------------------------------------------------------------- Heldenauswahl

/** Zeile „Hase · Krieger“ eines Helden. */
export function heroLine(hero) {
  return `${ANIMALS[hero.animal].name} · ${CLASSES[hero.class].name}`;
}

export function renderHeroes(c, props, app) {
  const heroes = app.save.heroes;
  const full = heroes.length >= MAX_HEROES;
  const list = el('ul', { class: 'slots', 'aria-label': 'Helden' });
  for (const hero of heroes) {
    list.append(el('li', { class: 'slot' },
      el('button', {
        class: 'slot-main', type: 'button',
        onclick: () => app.screens.show('mode', { heroId: hero.id }),
      },
      el('span', { class: 'slot-name', text: hero.name }),
      el('span', { class: 'slot-meta', text: heroLine(hero) }),
      el('span', { class: 'slot-best' }, 'Beste Zeit: ', el('strong', { text: formatTime(hero.survivor.bestTime) }))),
      el('button', {
        class: 'btn btn-danger btn-small slot-delete', type: 'button',
        'aria-label': `${hero.name} löschen`,
        onclick: async () => {
          const ok = await confirmDialog({
            title: 'Held löschen?',
            message: ['„', el('strong', { text: hero.name }), '“ wird endgültig gelöscht. Das lässt sich nicht rückgängig machen.'],
            confirmLabel: 'Löschen',
          });
          if (ok) {
            app.deleteHero(hero.id);
            app.screens.show('heroes');
          }
        },
      }, 'Löschen')));
  }
  list.append(el('li', { class: 'slot slot-new' },
    el('button', {
      class: 'slot-main', type: 'button', disabled: full,
      title: full ? 'Alle sechs Plätze sind belegt' : null,
      onclick: () => app.screens.show('createAnimal'),
    },
    el('span', { class: 'slot-plus', 'aria-hidden': 'true', text: '+' }),
    el('span', { class: 'slot-name', text: 'Neuer Held' }),
    el('span', { class: 'slot-meta', text: full ? 'Alle sechs Plätze sind belegt.' : 'Tier, Klasse und Namen wählen' }))));

  c.append(
    screenHeader('Heldenauswahl', `${heroes.length} von ${MAX_HEROES} Plätzen belegt`),
    list,
    screenFooter(() => app.screens.show('main')),
  );
}

// ---------------------------------------------------------------- Modusauswahl

export function renderMode(c, props, app) {
  const hero = app.save.heroes.find((h) => h.id === props.heroId);
  if (!hero) { app.screens.show('heroes'); return; }
  const minutes = Math.round(RUN_DURATION / 60);
  c.append(
    screenHeader('Modus wählen'),
    el('p', { class: 'hero-badge' },
      el('strong', { text: hero.name }), ' – ', heroLine(hero)),
    el('div', { class: 'cards cards-2' },
      el('button', {
        class: 'card mode-card', type: 'button',
        onclick: () => app.startRun(hero.id),
      },
      el('span', { class: 'card-title', text: 'Wellen-Modus' }),
      el('span', { class: 'card-text', text: `Überlebe ${minutes} Minuten gegen immer stärkere Wellen und besiege am Ende den Bären.` }),
      el('span', { class: 'card-text muted', text: `Beste Zeit: ${formatTime(hero.survivor.bestTime)}` }),
      el('span', { class: 'card-action', text: 'Los geht’s →' })),
      el('button', { class: 'card mode-card locked', type: 'button', disabled: true, 'aria-describedby': 'adventure-soon' },
        el('span', { class: 'card-title', text: 'Abenteuer-Modus' }),
        el('span', { class: 'card-text', text: 'Eine Reise durch Wald und Dorf mit Aufgaben und Ausrüstung.' }),
        el('span', { class: 'badge', id: 'adventure-soon', text: 'kommt später' }))),
    screenFooter(() => app.screens.show('heroes')),
  );
}

/** Erklärseite, wenn der Browser kein WebGL 2 kann. */
export function renderNoWebGL(root) {
  root.replaceChildren(el('section', { class: 'screen screen-nowebgl' },
    screenHeader('AnimalWarrior kann hier nicht starten'),
    el('div', { class: 'panel' },
      el('p', { text: 'Dein Browser stellt kein WebGL 2 bereit. Das Spiel braucht WebGL 2 für die 3D-Darstellung von Figuren und Landschaft.' }),
      el('p', { text: 'So kannst du es beheben:' }),
      el('ul', {},
        el('li', { text: 'Einen aktuellen Browser verwenden (Chrome, Edge, Firefox oder Safari).' }),
        el('li', { text: 'In den Browser-Einstellungen die Hardwarebeschleunigung einschalten.' }),
        el('li', { text: 'Grafikkartentreiber aktualisieren und die Seite neu laden.' })))));
}

// ---------------------------------------------------------------- Rückfrage

/**
 * Rückfrage als Dialog in der Seite (blockiert nichts). Text nur über Textknoten.
 * @param {{ title: string, message: (Node|string)[] | string, confirmLabel?: string, cancelLabel?: string }} options
 * @returns {Promise<boolean>}
 */
export function confirmDialog({ title, message, confirmLabel = 'OK', cancelLabel = 'Abbrechen' }) {
  return new Promise((resolve) => {
    const previous = document.activeElement;
    const cancel = el('button', { class: 'btn', type: 'button' }, cancelLabel);
    const confirm = el('button', { class: 'btn btn-danger', type: 'button' }, confirmLabel);
    const box = el('div', { class: 'dialog', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'dialog-title', 'aria-describedby': 'dialog-text' },
      el('h2', { id: 'dialog-title', text: title }),
      el('p', { id: 'dialog-text' }, ...[message].flat()),
      el('div', { class: 'dialog-buttons' }, cancel, confirm));
    const backdrop = el('div', { class: 'dialog-backdrop', 'data-ui-control': true }, box);

    function close(result) {
      document.removeEventListener('keydown', onKey, true);
      backdrop.remove();
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus();
      resolve(result);
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(false); }
      else if (e.key === 'Tab') {
        // Fokus im Dialog halten.
        e.preventDefault();
        (document.activeElement === cancel ? confirm : cancel).focus();
      }
    }
    cancel.addEventListener('click', () => close(false));
    confirm.addEventListener('click', () => close(true));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(false); });
    document.addEventListener('keydown', onKey, true);
    document.body.append(backdrop);
    cancel.focus();
  });
}
