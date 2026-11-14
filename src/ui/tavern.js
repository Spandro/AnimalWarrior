// Taverne: Übersicht mit den Spieltischen, Stall (Duo freischalten) und Truhe mit Detailansicht.
// Alle Bilder sind optional: fehlt eine Datei, erscheint Ersatz aus Grundformen. Bildschirme scheitern nie an Bildern.
import { el, formatNumber } from './dom.js';
import { screenHeader, screenFooter, confirmDialog } from './menus.js';
import { describeModifier } from './heroCreate.js';
import { chestSlots, foundCount, itemKindLabel } from './tavernText.js';
import { TAVERN, HOSTS, TABLE_HOST, TAVERN_IMAGES } from '../data/tavern.js';
import { ITEMS, RARITIES } from '../data/items.js';
import { unlockDuo, markItemsSeen } from '../save/tavern.js';
import { HERO_SPRITES } from '../data/sprites.js';
import { cropCanvas } from '../render/sprites.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const TOTAL_ITEMS = Object.keys(ITEMS).length;

// ---------------------------------------------------------------- Bilder mit Ersatz

/** @type {Map<string, Promise<HTMLImageElement | null>>} */
const probes = new Map();

/**
 * Lädt ein Bild einmal und merkt sich das Ergebnis. Gibt das geladene Bild zurück oder `null`, wenn es fehlt.
 * @param {string} url
 * @returns {Promise<HTMLImageElement | null>}
 */
export function probeImage(url) {
  let probe = probes.get(url);
  if (!probe) {
    probe = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = url;
    });
    probes.set(url, probe);
  }
  return probe;
}

/** Baut ein SVG-Element mit Attributen und Kindern. */
function svg(tag, attrs = {}, ...children) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  node.append(...children);
  return node;
}

/** Ersatzsymbole der Beute nach Art: Helm, Hemd, Stiefel, Schwert, Ring. In der Farbe der Seltenheit. */
const SLOT_SHAPES = {
  kopf: () => [
    svg('path', { d: 'M10 30 Q10 11 24 11 Q38 11 38 30 Z' }),
    svg('rect', { x: 7, y: 30, width: 34, height: 6, rx: 2 }),
    svg('rect', { x: 22, y: 5, width: 4, height: 8, rx: 2 }),
  ],
  koerper: () => [
    svg('path', { d: 'M16 8 L6 15 L10 24 L16 21 V40 H32 V21 L38 24 L42 15 L32 8 Q24 15 16 8 Z' }),
  ],
  fuesse: () => [
    svg('path', { d: 'M17 6 H28 V24 L40 29 Q43 38 36 38 H13 Q13 38 13 32 Z' }),
    svg('rect', { x: 12, y: 38, width: 28, height: 4, rx: 2 }),
  ],
  waffe: () => [
    svg('path', { d: 'M24 3 L28 28 H20 Z' }),
    svg('rect', { x: 13, y: 28, width: 22, height: 4, rx: 2 }),
    svg('rect', { x: 22, y: 32, width: 4, height: 10, rx: 1 }),
  ],
  schmuck: () => [
    svg('circle', { cx: 24, cy: 31, r: 10, fill: 'none', stroke: 'currentColor', 'stroke-width': 4 }),
    svg('polygon', { points: '24,5 31,13 24,21 17,13' }),
  ],
};

/** Ersatzsymbol für eine Art als Inline-SVG; `currentColor` trägt die Farbe der Seltenheit. */
function slotSvg(slot) {
  const shapes = (SLOT_SHAPES[slot] ?? SLOT_SHAPES.schmuck)();
  return svg('svg', { class: 'loot-fallback', viewBox: '0 0 48 48', fill: 'currentColor', 'aria-hidden': 'true', focusable: 'false' }, ...shapes);
}

/** Kleine Truhe als Symbol der Truhen-Karte. */
function chestSvg() {
  return svg('svg', { class: 'loot-fallback', viewBox: '0 0 48 48', fill: 'currentColor', 'aria-hidden': 'true', focusable: 'false' },
    svg('path', { d: 'M6 20 Q6 8 24 8 Q42 8 42 20 Z' }),
    svg('rect', { x: 6, y: 21, width: 36, height: 19, rx: 2 }),
    svg('rect', { x: 21, y: 18, width: 6, height: 9, rx: 1, fill: '#2a1c0a' }));
}

/**
 * Symbol eines Gegenstands: Ausschnitt aus dem Bogen per Hintergrundposition, bis dahin (oder dauerhaft, wenn das Bild
 * fehlt) ein Ersatzsymbol der Art. Ohne Gegenstand (nicht gefunden) erscheint ein „?“.
 * @param {import('../data/items.js').ItemDef | null} def
 * @param {string} [sizeClass]
 */
export function lootIcon(def, sizeClass = '') {
  const box = el('span', { class: `loot-icon ${sizeClass}`.trim(), 'aria-hidden': 'true' });
  if (!def) {
    box.classList.add('loot-unknown');
    box.textContent = '?';
    return box;
  }
  box.style.color = RARITIES[def.rarity].color;
  box.append(slotSvg(def.slot));
  const { sheet, cols, rows } = TAVERN_IMAGES.loot;
  probeImage(sheet).then((img) => {
    if (!img || !box.isConnected) return;
    const col = def.icon % cols;
    const row = Math.floor(def.icon / cols);
    box.style.backgroundImage = `url('${sheet}')`;
    box.style.backgroundSize = `${cols * 100}% ${rows * 100}%`;
    box.style.backgroundPosition = `${cols > 1 ? (col / (cols - 1)) * 100 : 0}% ${rows > 1 ? (row / (rows - 1)) * 100 : 0}%`;
    box.classList.add('loot-image');
    box.querySelector('.loot-fallback')?.remove();
  });
  return box;
}

/**
 * Porträt eines Wirts: Ausschnitt aus `wirte.webp`, solange er ausgemessen ist und das Bild da ist, sonst ein Kreis
 * mit dem Anfangsbuchstaben.
 * @param {string} hostId
 */
export function hostPortrait(hostId) {
  const host = HOSTS[hostId];
  const size = 64;
  const box = el('span', { class: 'host-portrait', 'aria-hidden': 'true' }, el('span', { class: 'host-initial', text: host.name.charAt(0) }));
  const rect = TAVERN_IMAGES.hosts.rects[hostId];
  if (rect) {
    const { sheet } = TAVERN_IMAGES.hosts;
    probeImage(sheet).then((img) => {
      if (!img || !box.isConnected) return;
      const k = size / Math.max(rect.w, rect.h);
      box.style.backgroundImage = `url('${sheet}')`;
      box.style.backgroundSize = `${img.naturalWidth * k}px ${img.naturalHeight * k}px`;
      box.style.backgroundPosition = `${(size - rect.w * k) / 2 - rect.x * k}px ${(size - rect.h * k) / 2 - rect.y * k}px`;
      box.classList.add('host-image');
      box.querySelector('.host-initial')?.remove();
    });
  }
  return box;
}

/** Ersatzfigur des Duos aus Grundformen: Giraffe mit Erdmännchen auf dem Kopf, in Farbe. */
function duoSvg() {
  return svg('svg', { class: 'duo-fallback', viewBox: '0 0 120 150', 'aria-hidden': 'true', focusable: 'false' },
    // Beine, Körper, Hals, Kopf, Hörnchen
    svg('rect', { x: 36, y: 96, width: 8, height: 46, rx: 3, fill: '#d9a441' }),
    svg('rect', { x: 50, y: 96, width: 8, height: 46, rx: 3, fill: '#c4912f' }),
    svg('rect', { x: 78, y: 96, width: 8, height: 46, rx: 3, fill: '#d9a441' }),
    svg('rect', { x: 92, y: 96, width: 8, height: 46, rx: 3, fill: '#c4912f' }),
    svg('ellipse', { cx: 68, cy: 92, rx: 38, ry: 20, fill: '#e4b24f' }),
    svg('path', { d: 'M82 82 L96 52 L104 36 L112 40 L104 58 L96 88 Z', fill: '#e4b24f' }),
    svg('ellipse', { cx: 112, cy: 40, rx: 11, ry: 8, fill: '#e4b24f' }),
    svg('rect', { x: 105, y: 28, width: 3, height: 8, fill: '#8a5a22' }),
    svg('rect', { x: 113, y: 28, width: 3, height: 8, fill: '#8a5a22' }),
    svg('circle', { cx: 56, cy: 90, r: 5, fill: '#8a5a22' }),
    svg('circle', { cx: 72, cy: 98, r: 6, fill: '#8a5a22' }),
    svg('circle', { cx: 88, cy: 90, r: 4, fill: '#8a5a22' }),
    svg('circle', { cx: 100, cy: 60, r: 3, fill: '#8a5a22' }),
    // Erdmännchen auf dem Kopf
    svg('ellipse', { cx: 110, cy: 18, rx: 6, ry: 10, fill: '#b98a56' }),
    svg('circle', { cx: 110, cy: 7, r: 5, fill: '#c89c68' }),
    svg('circle', { cx: 108, cy: 6, r: 1, fill: '#2a1c0a' }));
}

/**
 * Das Duo im Stall, als Standbild die Phase `DUO_FRAMES.still` (Erdmännchen oben). Das Bild kommt aus dem Bogen, den
 * das Spiel schon aufbereitet hat (`canvases.duo`, Rechteck des Eintrags `giraffe-hochstapler`); bis er da ist oder
 * wenn er fehlt, zeigt der Stall die Ersatzfigur. Gesperrt als schwarzer Umriss (CSS-Filter), danach in Farbe.
 * @param {boolean} unlocked
 * @param {Promise<import('../render/sprites.js').SpriteSheets>} sprites
 */
function duoFigure(unlocked, sprites) {
  const box = el('div', { class: unlocked ? 'duo-figure' : 'duo-figure duo-black', role: 'img',
    'aria-label': unlocked ? 'Giraffe und Erdmännchen' : 'Ein Umriss: Giraffe mit etwas auf dem Kopf' }, duoSvg());
  const def = HERO_SPRITES['giraffe-hochstapler'];
  sprites.then((s) => {
    const sheet = s?.canvases?.[def?.sheet];
    if (!sheet || !box.isConnected) return;
    const canvas = cropCanvas(sheet, def);
    canvas.setAttribute('aria-hidden', 'true');
    box.replaceChildren(canvas);
  });
  return box;
}

// ---------------------------------------------------------------- Übersicht

/** Karten der drei Spieltische. */
const TABLES = [
  { table: 'dice', screen: 'tavernDice', title: 'Würfelbecher', text: 'Zwei Würfel gegen den Wirt. Die höhere Summe gewinnt.' },
  { table: 'wheel', screen: 'tavernWheel', title: 'Glücksrad', text: 'Zwanzig Felder, ein Dreh. Von der Niete bis ×5.' },
  { table: 'hilo', screen: 'tavernHiLo', title: 'Höher oder tiefer', text: 'Rate die nächste Karte und zahle rechtzeitig aus.' },
];

const UNLOCK_REASON = {
  gold: 'Dafür fehlt das Gold.',
  already: 'Das Duo ist schon freigeschaltet.',
};

/** Esc führt zurück, solange kein Dialog darüber liegt (Dialoge fangen Esc selbst ab). Gibt die Aufräumfunktion zurück. */
export function backOnEscape(onBack) {
  const onKey = (e) => {
    if (e.key === 'Escape' && !document.querySelector('.dialog-backdrop')) { e.preventDefault(); onBack(); }
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}

/**
 * Taverne, Übersicht: Gold, drei Spieltische, Truhe und Stall.
 * @param {HTMLElement} c
 * @param {{ heroId: string }} props
 * @param {any} app
 */
export function renderTavern(c, props, app) {
  const hero = app.save.heroes.find((h) => h.id === props.heroId);
  if (!hero) { app.screens.show('heroes'); return; }
  const goBack = () => app.screens.show('mode', { heroId: hero.id });
  const goldValue = el('strong');
  const body = el('div', { class: 'tavern-body' });

  function tableCard({ table, screen, title, text }) {
    const host = HOSTS[TABLE_HOST[table]];
    return el('button', {
      class: 'card table-card', type: 'button', 'data-table': table,
      onclick: () => app.screens.show(screen, { heroId: hero.id }),
    },
    hostPortrait(TABLE_HOST[table]),
    el('span', { class: 'table-text' },
      el('span', { class: 'card-title', text: title }),
      el('span', { class: 'card-text', text }),
      el('span', { class: 'table-host muted', text: `${host.name} · ${host.animal}` })));
  }

  function chestCard() {
    const found = foundCount(app.save);
    const fresh = chestSlots(app.save).filter((s) => s.isNew).length;
    return el('button', {
      class: 'card table-card chest-card', type: 'button', 'data-table': 'chest',
      onclick: () => app.screens.show('tavernChest', { heroId: hero.id }),
    },
    el('span', { class: 'loot-icon loot-small', style: 'color: var(--accent-hi)', 'aria-hidden': 'true' }, chestSvg()),
    el('span', { class: 'table-text' },
      el('span', { class: 'card-title', text: 'Truhe' }),
      el('span', { class: 'card-text', text: `${found} von ${TOTAL_ITEMS} gefunden` }),
      fresh > 0 ? el('span', { class: 'badge badge-new', text: `${fresh} neu` }) : null));
  }

  function stable() {
    const save = app.save;
    const unlocked = save.unlocks.includes('duo');
    const missing = TAVERN.duoPrice - save.gold;
    const price = `${formatNumber(TAVERN.duoPrice)} Gold`;
    const text = unlocked
      ? 'Freigeschaltet! Lege bei ‚Neuer Held‘ ein Duo an.'
      : `Ein ungewöhnliches Gespann wartet im Stall. ${price}.`;
    return el('section', { class: 'stable-card', 'aria-labelledby': 'stable-title', id: 'stable', tabindex: '-1' },
      duoFigure(unlocked, app.spritesWith('duo')),
      el('div', { class: 'stable-text' },
        el('h2', { id: 'stable-title', text: unlocked ? 'Stall: Giraffe & Erdmännchen' : 'Stall' }),
        el('p', { class: 'stable-line', text }),
        unlocked ? null : el('div', { class: 'stable-buy' },
          el('button', {
            class: 'btn btn-primary', type: 'button', id: 'unlock-duo', disabled: missing > 0,
            'aria-label': `Duo für ${price} freischalten`,
            onclick: unlock,
          }, 'Freischalten'),
          missing > 0 ? el('span', { class: 'muted stable-missing', text: `Es fehlen ${formatNumber(missing)} Gold.` }) : null)));
  }

  async function unlock() {
    const ok = await confirmDialog({
      title: 'Duo freischalten?',
      message: [`Das Duo Giraffe und Erdmännchen kostet `, el('strong', { text: `${formatNumber(TAVERN.duoPrice)} Gold` }),
        `. Du hast ${formatNumber(app.save.gold)} Gold.`],
      confirmLabel: 'Freischalten',
    });
    if (!ok) { document.getElementById('unlock-duo')?.focus({ preventScroll: true }); return; }
    let result = { ok: false, reason: 'gold' };
    app.update((save) => { result = unlockDuo(save); });
    if (!result.ok) {
      app.showNotice(UNLOCK_REASON[result.reason] ?? 'Freischalten nicht möglich.');
      render();
      return;
    }
    const newAchievements = app.unlockStoredAchievements();
    render();
    document.getElementById('stable')?.focus({ preventScroll: true });
    for (const id of newAchievements) app.announceAchievement(id);
  }

  /** Baut Gold und Karten aus app.save neu auf. */
  function render() {
    const scroller = c.parentElement;
    const top = scroller?.scrollTop ?? 0;
    goldValue.textContent = formatNumber(app.save.gold);
    body.replaceChildren(
      el('div', { class: 'cards cards-tavern' }, ...TABLES.map(tableCard), chestCard()),
      stable());
    if (scroller) scroller.scrollTop = top;
  }

  // Reihenfolge wie im Entwurf: oben das Gold, darunter „<Held> sitzt am Tresen“.
  c.append(
    el('header', { class: 'screen-header' },
      el('h1', { text: 'Taverne' }),
      el('p', { class: 'gold-line' }, 'Gold: ', goldValue),
      el('p', { class: 'subtitle', text: `${hero.name} sitzt am Tresen` })),
    body,
    screenFooter(goBack),
  );
  render();
  return backOnEscape(goBack);
}

// ---------------------------------------------------------------- Truhe

/**
 * Detailansicht eines Gegenstands als Dialog (Fokus bleibt darin, Esc und Tippen daneben schließen).
 * @param {import('../data/items.js').ItemDef} def
 * @param {() => void} [onClose]
 */
function openItemDetail(def, onClose) {
  const previous = document.activeElement;
  const rarity = RARITIES[def.rarity];
  const close = el('button', { class: 'btn btn-primary', type: 'button' }, 'Schließen');
  const box = el('div', {
    class: 'dialog item-detail', role: 'dialog', 'aria-modal': 'true',
    'aria-labelledby': 'item-title', 'aria-describedby': 'item-line', style: `--rarity: ${rarity.color}`,
  },
  lootIcon(def, 'loot-large'),
  el('h2', { id: 'item-title', text: def.name }),
  el('p', { class: 'item-kind', text: itemKindLabel(def) }),
  el('ul', { class: 'item-mods' }, ...def.modifiers.map((m) => el('li', { text: describeModifier(m) }))),
  el('p', { id: 'item-line', class: 'item-line', text: def.line }),
  el('p', { class: 'item-hint muted', text: 'Wirkt im Abenteuer-Modus.' }),
  el('div', { class: 'dialog-buttons' }, close));
  const backdrop = el('div', { class: 'dialog-backdrop', 'data-ui-control': true }, box);

  function finish() {
    document.removeEventListener('keydown', onKey, true);
    backdrop.remove();
    if (previous instanceof HTMLElement && previous.isConnected) previous.focus({ preventScroll: true });
    onClose?.();
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(); }
    else if (e.key === 'Tab') { e.preventDefault(); close.focus(); }
  }
  close.addEventListener('click', finish);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) finish(); });
  document.addEventListener('keydown', onKey, true);
  document.body.append(backdrop);
  close.focus();
}

/**
 * Truhe: 24 Plätze mit Seltenheitsrahmen. Nicht gefundene sind dunkle Umrisse mit „?“ und verraten nichts.
 * @param {HTMLElement} c
 * @param {{ heroId: string }} props
 * @param {any} app
 */
export function renderChest(c, props, app) {
  const goBack = () => app.screens.show('tavern', { heroId: props.heroId });
  const slots = chestSlots(app.save);
  const grid = el('ul', { class: 'chest-grid', 'aria-label': 'Truhe' });

  for (const slot of slots) {
    if (!slot.found) {
      grid.append(el('li', { class: 'chest-slot' },
        el('span', { class: 'chest-tile chest-empty', role: 'img', 'aria-label': 'Noch nicht gefunden' }, lootIcon(null))));
      continue;
    }
    const def = ITEMS[slot.id];
    const rarity = RARITIES[def.rarity];
    const tile = el('button', {
      class: 'chest-tile', type: 'button', style: `--rarity: ${rarity.color}`, 'data-id': def.id,
      'aria-label': `${def.name}, ${rarity.name}${slot.isNew ? ', neu' : ''}`,
      onclick: () => {
        // Beim Öffnen gilt der Gegenstand als gesehen: gespeichert wird nur, wenn er noch neu war.
        if (!app.save.seenItems.includes(def.id)) {
          app.update((save) => markItemsSeen(save, [def.id]));
          tile.querySelector('.chest-new')?.remove();
          tile.setAttribute('aria-label', `${def.name}, ${rarity.name}`);
        }
        openItemDetail(def);
      },
    },
    lootIcon(def),
    slot.isNew ? el('span', { class: 'chest-new', text: 'Neu' }) : null);
    grid.append(el('li', { class: 'chest-slot' }, tile));
  }

  c.append(
    screenHeader('Truhe', `${foundCount(app.save)} von ${TOTAL_ITEMS} gefunden`),
    ...(slots.some((s) => s.found) ? [] : [el('p', { class: 'muted chest-empty-text', text: `Noch nichts darin. Beute gibt es ab ${TAVERN.lootMinStake} Gold Einsatz.` })]),
    grid,
    screenFooter(goBack),
  );
  return backOnEscape(goBack);
}
