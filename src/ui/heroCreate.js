// Heldenerstellung in drei Schritten: Tier → Klasse → Name. Tiere mit nur einer Klasse (das Duo) überspringen die
// Klassenwahl: dann sind es zwei Schritte, Tier → Name.
import { el, formatNumber } from './dom.js';
import { screenHeader, screenFooter } from './menus.js';
import { createFigurePreview } from './figurePreview.js';
import { ANIMALS } from '../data/animals.js';
import { CLASSES } from '../data/classes.js';
import { ABILITIES } from '../data/abilities.js';
import { computeStats } from '../core/stats.js';
import { MAX_NAME_LENGTH } from '../save/schema.js';
import { classesFor, selectableAnimals } from '../core/roster.js';

/** Klasse, in der die Tiere auf Schritt 1 gezeigt werden, solange noch keine gewählt ist. */
const PREVIEW_CLASS = 'krieger';
/** Text auf der Karte eines noch gesperrten Tiers. */
const LOCKED_TEXT = 'In der Taverne freischaltbar';

/** Die einzige Klasse des Tiers (das Duo nur als Hochstapler) oder `null`, wenn es die Wahl hat. */
function fixedClassOf(animalId) {
  const ids = classesFor(animalId);
  return ids.length === 1 ? ids[0] : null;
}

/** Zahl der Schritte für dieses Tier: ohne Klassenwahl zwei, sonst drei. */
const stepsFor = (animalId) => (fixedClassOf(animalId) ? 2 : 3);
const stepText = (step, steps) => `Schritt ${step} von ${steps}`;

/** Bezeichnungen der Werte in Wörtern. */
const STAT_LABELS = {
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
    else if (m.stat === 'dodge') parts.push(signed(`${formatNumber(v * 100)} %`, m.flat));
    else if (m.stat === 'hpRegen') parts.push(signed(`${formatNumber(v, Number.isInteger(v) ? 0 : 1)}/s`, m.flat));
    else parts.push(signed(formatNumber(v, Number.isInteger(v) ? 0 : 2), m.flat));
  }
  if (m.pct) parts.push(signed(`${formatNumber(Math.abs(m.pct) * 100)} %`, m.pct));
  return `${label} ${parts.join(' und ')}`;
}

/** Zuschläge als Liste unter einer Überschrift (eine Zeile je Modifikator). */
function modifierList(label, mods) {
  return el('div', { class: 'traits' },
    el('span', { class: 'traits-label', text: label }),
    el('ul', {}, ...mods.map((m) => el('li', { text: describeModifier(m) }))));
}

/** Liste der Werte als Definitionsliste. */
function statList(rows) {
  return el('dl', { class: 'stats' }, ...rows.flatMap(([k, v]) => [el('dt', { text: k }), el('dd', { text: v })]));
}

/**
 * Auswahlschritt mit drehender Vorschau und Karten. Gesperrte Karten sind geschwärzt und nicht wählbar.
 * Gibt die Aufräumfunktion zurück.
 * @param {HTMLElement} c
 * @param {any} app
 * @param {{ step: number, steps(id: string): number, title: string, ids: string[], locked?: Set<string>, selected: string,
 *   card(id: string): Node[], cardName?(id: string): string, figure(id: string): [string, string],
 *   onBack(): void, onNext(id: string): void }} options `steps`: Gesamtzahl der Schritte, wenn `id` gewählt ist;
 *   `cardName(id)`: Name auf einer gesperrten Karte
 */
function renderChoice(c, app, { step, steps, title, ids, locked = new Set(), selected, card, cardName, figure, onBack, onNext }) {
  const preview = createFigurePreview(app.view, { sprites: app.sprites });
  let current = selected;
  const buttons = new Map();
  const header = screenHeader(title, stepText(step, steps(selected)));
  const subtitle = header.querySelector('.subtitle');

  function select(id) {
    if (locked.has(id)) return;
    current = id;
    for (const [bid, b] of buttons) if (!locked.has(bid)) b.setAttribute('aria-pressed', String(bid === id));
    preview.setFigure(...figure(id));
    subtitle.textContent = stepText(step, steps(id));
  }
  const next = (id) => { if (!locked.has(id)) onNext(id); };

  const cards = el('div', { class: 'cards', role: 'group', 'aria-label': title });
  for (const id of ids) {
    const b = locked.has(id)
      ? el('button', { class: 'card choice-card locked card-blacked', type: 'button', disabled: true },
        el('span', { class: 'card-title', text: cardName(id) }),
        el('span', { class: 'card-text', text: LOCKED_TEXT }))
      : el('button', { class: 'card choice-card', type: 'button', 'aria-pressed': 'false', onclick: () => select(id) }, ...card(id));
    b.addEventListener('dblclick', () => next(id));
    buttons.set(id, b);
    cards.append(b);
  }

  c.append(
    header,
    el('div', { class: 'choose' },
      el('div', { class: 'preview-frame' }, preview.element),
      cards),
    screenFooter(onBack, el('button', { class: 'btn btn-primary', type: 'button', onclick: () => next(current) }, 'Weiter →')),
  );
  select(current);
  return () => preview.dispose();
}

// ---------------------------------------------------------------- Schritt 1: Tier

export function renderCreateAnimal(c, props, app) {
  const animals = selectableAnimals(app.save);
  const locked = new Set(animals.filter((a) => a.locked).map((a) => a.id));
  const open = animals.filter((a) => !a.locked).map((a) => a.id);
  /** Klasse für die Vorschau: die feste des Tiers, sonst die zuletzt gewählte (wenn das Tier sie hat), sonst Krieger. */
  const previewClass = (id) => fixedClassOf(id)
    ?? (props.classId && classesFor(id).includes(props.classId) ? props.classId : PREVIEW_CLASS);
  return renderChoice(c, app, {
    step: 1,
    steps: stepsFor,
    title: 'Wähle dein Tier',
    ids: animals.map((a) => a.id),
    locked,
    selected: open.includes(props.animalId) ? props.animalId : open[0],
    figure: (id) => [id, previewClass(id)],
    cardName: (id) => ANIMALS[id].name,
    card: (id) => {
      const a = ANIMALS[id];
      return [
        el('span', { class: 'card-title', text: a.name }),
        el('span', { class: 'card-text', text: a.description }),
        statList([
          ['Leben', formatNumber(a.base.maxHp)],
          ['Lauftempo', formatNumber(a.base.moveSpeed, 1)],
        ]),
        modifierList('Eigenheit', a.modifiers),
      ];
    },
    onBack: () => app.screens.show('heroes'),
    onNext: (animalId) => {
      const fixed = fixedClassOf(animalId);
      if (fixed) app.screens.show('createName', { animalId, classId: fixed });
      else app.screens.show('createClass', { animalId, classId: props.classId });
    },
  });
}

// ---------------------------------------------------------------- Schritt 2: Klasse

export function renderCreateClass(c, props, app) {
  const animalId = props.animalId;
  const ids = classesFor(animalId);
  return renderChoice(c, app, {
    step: 2,
    steps: () => 3,
    title: `Wähle die Klasse für ${ANIMALS[animalId].name}`,
    ids,
    selected: ids.includes(props.classId) ? props.classId : ids[0],
    figure: (id) => [animalId, id],
    card: (id) => {
      const cls = CLASSES[id];
      const stats = computeStats(animalId, id);
      return [
        el('span', { class: 'card-title', text: cls.name }),
        el('span', { class: 'card-text', text: cls.description }),
        statList([
          ['Leben', formatNumber(Math.round(stats.maxHp))],
          ['Lauftempo', formatNumber(stats.moveSpeed, 1)],
          ['Startfähigkeit', ABILITIES[cls.startAbility].name],
        ]),
        modifierList('Zuschläge', cls.modifiers),
      ];
    },
    onBack: () => app.screens.show('createAnimal', { animalId, classId: props.classId }),
    onNext: (classId) => app.screens.show('createName', { animalId, classId }),
  });
}

// ---------------------------------------------------------------- Schritt 3: Name

export function renderCreateName(c, props, app) {
  const { animalId, classId } = props;
  const steps = stepsFor(animalId);
  const preview = createFigurePreview(app.view, { width: 180, height: 200, sprites: app.sprites });
  preview.setFigure(animalId, classId);
  const stats = computeStats(animalId, classId);

  const input = el('input', {
    id: 'hero-name', type: 'text', maxlength: MAX_NAME_LENGTH, autocomplete: 'off', spellcheck: 'false',
    placeholder: `Held ${app.save.heroes.length + 1}`, 'aria-describedby': 'hero-name-hint',
  });
  const form = el('form', { class: 'name-form', novalidate: true },
    el('label', { for: 'hero-name', text: 'Name' }),
    input,
    el('p', { id: 'hero-name-hint', class: 'hint', text: `Höchstens ${MAX_NAME_LENGTH} Zeichen. Leer lassen für den Vorschlag.` }));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const hero = app.createHero({ name: input.value, animal: animalId, class: classId });
    if (hero) app.screens.show('mode', { heroId: hero.id });
    else app.screens.show('heroes');
  });

  c.append(
    screenHeader('Wie heißt dein Held?', stepText(steps, steps)),
    el('div', { class: 'name-layout' },
      el('div', { class: 'preview-frame preview-small' }, preview.element),
      el('div', { class: 'panel' },
        el('p', { class: 'summary-line' }, el('strong', { text: ANIMALS[animalId].name }), ' als ', el('strong', { text: CLASSES[classId].name })),
        statList([
          ['Leben', formatNumber(Math.round(stats.maxHp))],
          ['Lauftempo', formatNumber(stats.moveSpeed, 1)],
          ['Startfähigkeit', ABILITIES[CLASSES[classId].startAbility].name],
        ]),
        form)),
    screenFooter(() => app.screens.show(steps === 2 ? 'createAnimal' : 'createClass', { animalId, classId }),
      el('button', { class: 'btn btn-primary', type: 'button', onclick: () => form.requestSubmit() }, 'Held erschaffen')),
  );
  input.focus({ preventScroll: true });
  return () => preview.dispose();
}
