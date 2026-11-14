// Die drei Spieltische der Taverne: Würfelbecher, Glücksrad, Höher oder tiefer.
// Jede Runde wird erst ausgewürfelt und gespeichert, danach läuft die Animation. Sie ist durch Tippen (oder eine Taste)
// abkürzbar und entfällt bei „Bewegung reduzieren“. Würfel, Rad und Karten entstehen aus CSS und SVG, ohne Bilder.
import { el, formatNumber } from './dom.js';
import { confirmDialog } from './menus.js';
import { lootIcon, hostPortrait } from './tavern.js';
import { stakeOptions, formatFactor, cardLabel } from './tavernText.js';
import { createRng } from '../core/rng.js';
import { playDice, spinWheel, hiLoStart, hiLoGuess, hiLoCashOut, hiLoFactor } from '../core/tavern.js';
import { applyRound, startHiLoRound, settleHiLoRound, canStake } from '../save/tavern.js';
import { TAVERN, HOSTS, TABLE_HOST, WHEEL, HILO, TABLE_MOTION } from '../data/tavern.js';
import { ITEMS, RARITIES } from '../data/items.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Zuletzt gewählter Einsatz je Tisch, solange die Seite offen ist. */
const lastStake = {};

/** Startwert einer Runde. Er wird nicht gespeichert. */
function newSeed() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0];
}

function reducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

/**
 * Lässt `frame(t)` mit t von 0 bis 1 über `ms` laufen, dann `done()`. `skip()` springt ans Ende, `cancel()` bricht ohne
 * `done()` ab. Bei „Bewegung reduzieren“ geht es sofort ans Ende. Ein Zeitgeber beendet die Animation auch, wenn der Tab
 * im Hintergrund liegt und keine Bilder zeichnet.
 * @param {number} ms
 * @param {(t: number) => void} frame
 * @param {() => void} done
 */
function animate(ms, frame, done) {
  let raf = 0;
  let timer = 0;
  let over = false;
  let start = 0;
  const end = () => {
    if (over) return;
    over = true;
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    frame(1);
    done();
  };
  const handle = { skip: end, cancel() { over = true; cancelAnimationFrame(raf); clearTimeout(timer); } };
  if (reducedMotion() || ms <= 0) { end(); return handle; }
  const step = (now) => {
    if (over) return;
    if (!start) start = now;
    const t = Math.min(1, (now - start) / ms);
    if (t >= 1) { end(); return; }
    frame(t);
    raf = requestAnimationFrame(step);
  };
  frame(0);
  raf = requestAnimationFrame(step);
  timer = setTimeout(end, ms + 250);
  return handle;
}

const easeOutCubic = (t) => 1 - (1 - t) ** 3;

/** Ziel eines Tastendrucks ist ein Knopf oder Eingabefeld (dann gilt dessen eigenes Verhalten). */
function isControl(target) {
  return target instanceof Element && !!target.closest('button, input, select, textarea, a[href]');
}

// ---------------------------------------------------------------- Gemeinsamer Tisch

/**
 * Baut das Gerüst eines Spieltischs: oben „Zurück“ und Gold, Titel, Wirt mit Spruch, Bühne, Ergebnis, unten Hinweis
 * zur Beute, Einsätze und Knöpfe. Gibt Teile und Helfer zurück, die das jeweilige Spiel nutzt.
 * @param {HTMLElement} c
 * @param {any} app
 * @param {{ table: 'dice'|'wheel'|'hilo', title: string, onBack: () => void }} options
 */
function createTable(c, app, { table, title, onBack }) {
  const host = HOSTS[TABLE_HOST[table]];
  const lines = host.lines[table];
  let lineIndex = -1;
  let busy = false;
  /** Kurze Pause nach einer Runde oder einem Schritt (gegen Doppeltippen); die Knöpfe sind solange gesperrt. */
  let cooling = false;
  let cooldownTimer = 0;
  /** Gleicht die Knöpfe des Spiels an, wenn die Pause endet ({@link api.onIdle}). */
  let onIdle = () => {};
  let pendingAchievements = false;
  let stakesLocked = false;
  /** Laufende Animation (abkürzbar) */
  let anim = null;

  const goldValue = el('strong');
  const hostLine = el('p', { class: 'host-line' });
  const stage = el('div', { class: `table-stage stage-${table}` });
  const resultText = el('p', { class: 'table-result-text' });
  const lootSlot = el('div', { class: 'loot-slot' });
  const stakesRow = el('div', { class: 'stakes', role: 'group', 'aria-label': 'Einsatz' });
  const actions = el('div', { class: 'table-actions' });
  const resultBox = el('div', { class: 'table-result', 'aria-live': 'polite' }, resultText, lootSlot);
  const controls = el('div', { class: 'table-controls' },
    el('p', { class: 'loot-note muted', text: `Ab ${formatNumber(TAVERN.lootMinStake)} Gold Einsatz spielt ${host.name} auch um Beute.` }),
    el('div', { class: 'stakes-row' }, el('span', { class: 'stakes-label', text: 'Einsatz:' }), stakesRow),
    actions);

  let stake = lastStake[table] ?? TAVERN.stakes[0];

  c.classList.add('table-screen');
  c.append(
    el('div', { class: 'table-top' },
      el('button', { class: 'btn', type: 'button', onclick: () => onBack() }, '← Zurück'),
      el('p', { class: 'gold-line' }, 'Gold: ', goldValue)),
    el('header', { class: 'table-header' }, el('h1', { text: title })),
    el('div', { class: 'host-row' },
      hostPortrait(TABLE_HOST[table]),
      el('div', { class: 'host-speech' },
        el('span', { class: 'host-name', text: `${host.name} · ${host.animal}` }),
        hostLine)),
    stage,
    resultBox,
    controls,
  );

  const broke = () => app.save.gold < TAVERN.stakes[0];

  /** Neuer Spruch, nicht derselbe wie eben. Ohne Gold sagt der Wirt, man solle erst Gold verdienen. */
  function speak() {
    if (broke()) {
      hostLine.textContent = `„${TAVERN.brokeLine.replace('{min}', formatNumber(TAVERN.stakes[0]))}“`;
      hostLine.classList.add('host-broke');
      return;
    }
    hostLine.classList.remove('host-broke');
    let i = Math.floor(Math.random() * lines.length);
    if (lines.length > 1 && i === lineIndex) i = (i + 1) % lines.length;
    lineIndex = i;
    hostLine.textContent = `„${lines[i]}“`;
  }

  /** Einsatz behalten, wenn er bezahlbar ist, sonst den höchsten bezahlbaren wählen. */
  function fitStake() {
    if (canStake(app.save, stake)) return;
    const affordable = stakeOptions(app.save.gold).filter((o) => o.enabled);
    if (affordable.length > 0) stake = affordable[affordable.length - 1].stake;
  }

  function renderStakes() {
    fitStake();
    stakesRow.replaceChildren(...stakeOptions(app.save.gold).map(({ stake: s, enabled }) => el('button', {
      class: 'btn stake', type: 'button', 'aria-pressed': String(s === stake && enabled),
      disabled: !enabled || busy || stakesLocked,
      'aria-label': `${formatNumber(s)} Gold setzen`,
      onclick: () => { stake = s; lastStake[table] = s; renderStakes(); },
    }, formatNumber(s))));
  }

  function setGold(value) { goldValue.textContent = formatNumber(value); }

  /** Prüft gespeicherte Erfolge (z. B. Stammgast, Sparschwein) und blendet neue ein. */
  function checkAchievements() {
    pendingAchievements = false;
    const ids = app.unlockStoredAchievements();
    for (const id of ids) app.announceAchievement(id);
  }

  /** Ergebnis und Beute sichtbar machen: auf kleinen Anzeigen liegen sonst die klebenden Knöpfe darüber. */
  function reveal() {
    resultBox.style.scrollMarginBottom = `${controls.offsetHeight + 8}px`;
    resultBox.scrollIntoView({ block: 'nearest' });
  }

  /** Beute-Moment: Symbol, Name, Seltenheit; bei Doppelten der Satz vom Rückkauf. */
  function showLoot(item) {
    if (!item) { lootSlot.replaceChildren(); return; }
    const def = ITEMS[item.id];
    const rarity = RARITIES[def.rarity];
    lootSlot.replaceChildren(el('div', { class: 'loot-moment', style: `--rarity: ${rarity.color}` },
      lootIcon(def, 'loot-small'),
      el('div', { class: 'loot-moment-text' },
        el('span', { class: 'loot-kicker', text: item.duplicate ? 'Beute' : 'Beute für die Truhe!' }),
        el('strong', { class: 'loot-name', text: def.name }),
        el('span', { class: 'loot-rarity', text: rarity.name }),
        item.duplicate
          ? el('span', { class: 'loot-dup', text: `Schon vorhanden – ${host.name} kauft ihn dir für ${formatNumber(item.resale)} Gold ab.` })
          : null)));
    reveal();
  }

  const api = {
    host,
    stage,
    actions,
    get stake() { return stake; },
    get busy() { return busy; },
    /** Animation oder kurze Pause danach: die Spielknöpfe sind gesperrt. */
    get locked() { return busy || cooling; },
    /** Darf jetzt eine neue Runde (oder ein Tipp) starten? */
    ready() { return !busy && !cooling && !document.querySelector('.dialog-backdrop'); },
    /** `sync` des Spiels: gleicht die Knöpfe an, sobald die Pause nach einem Schritt vorbei ist. */
    onIdle(fn) { onIdle = fn; },
    setGold,
    speak,
    showLoot,
    setResult(text, tone = '') {
      resultText.textContent = text;
      resultText.dataset.tone = tone;
      if (!busy) reveal();
    },
    lockStakes(locked) { stakesLocked = locked; renderStakes(); },
    /** Sperrt Einsätze und Knöpfe für die Dauer einer Animation. */
    begin() {
      busy = true;
      pendingAchievements = true;
      showLoot(null);
      renderStakes();
    },
    /** Ende einer Runde oder eines Schritts: Animation vorbei, dann kurze Pause gegen Doppeltippen (Knöpfe gesperrt). */
    end() {
      busy = false;
      anim = null;
      cooling = true;
      clearTimeout(cooldownTimer);
      cooldownTimer = setTimeout(() => { cooling = false; onIdle(); }, TABLE_MOTION.cooldownMs);
    },
    run(ms, frame, done) { anim = animate(ms, frame, done); },
    checkAchievements,
    /** Gold, Einsätze und Spruch nach dem Spielstand. */
    refresh() {
      setGold(app.save.gold);
      renderStakes();
    },
    broke,
    /** Abkürzen der laufenden Animation (Tippen oder Taste). */
    skip() { anim?.skip(); },
    /** Beim Verlassen: Animation abbrechen, Erfolge trotzdem prüfen (das Ergebnis ist schon gespeichert). */
    dispose() {
      anim?.cancel();
      anim = null;
      clearTimeout(cooldownTimer);
      if (pendingAchievements) checkAchievements();
    },
  };

  // Tippen irgendwo auf den Tisch kürzt die Animation ab.
  c.addEventListener('pointerdown', () => { if (busy) api.skip(); });

  setGold(app.save.gold);
  renderStakes();
  speak();
  return api;
}

/**
 * Tastatur eines Tischs: Esc ist „Zurück“, Leertaste oder Enter spielt (oder kürzt die Animation ab), weitere Tasten
 * über `extra`. Tastendrücke auf Knöpfen behalten deren eigenes Verhalten. Gibt die Aufräumfunktion zurück.
 * @param {ReturnType<typeof createTable>} t
 * @param {{ onBack: () => void, onPlay: () => void, extra?: (e: KeyboardEvent) => boolean }} handlers
 */
function tableKeys(t, { onBack, onPlay, extra }) {
  const onKey = (e) => {
    if (document.querySelector('.dialog-backdrop')) return;
    if (e.key === 'Escape') { e.preventDefault(); onBack(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (t.busy && (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key.toLowerCase() === 'a')) {
      e.preventDefault();
      if (!e.repeat) t.skip();
      return;
    }
    if (extra?.(e)) { e.preventDefault(); return; }
    if ((e.key === ' ' || e.key === 'Enter') && !isControl(e.target)) {
      e.preventDefault();
      if (!e.repeat) onPlay();
    }
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}

function playButton(label, onPlay) {
  return el('button', { class: 'btn btn-primary btn-large table-play', type: 'button', onclick: onPlay }, label);
}

/** Nach der Pause den Fokus auf den Spielknopf zurück, falls er verloren ging, als der Knopf gesperrt war (für die Tastatur). */
function keepFocus(c, button) {
  if (!c.contains(document.activeElement) || document.activeElement === document.body) button?.focus({ preventScroll: true });
}

// ---------------------------------------------------------------- Würfelbecher

/** Belegte Felder im 3 × 3-Raster eines Würfels. */
const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

function die() {
  const box = el('span', { class: 'die', 'aria-hidden': 'true' });
  for (let i = 0; i < 9; i++) box.append(el('span', { class: 'die-pip' }));
  return box;
}

function setDie(box, value) {
  const on = PIPS[value] ?? [];
  [...box.children].forEach((pip, i) => pip.classList.toggle('on', on.includes(i)));
}

/**
 * Würfelbecher: zwei Würfel gegen zwei Würfel des Wirts.
 * @param {HTMLElement} c
 * @param {{ heroId: string }} props
 * @param {any} app
 */
export function renderDice(c, props, app) {
  const goBack = () => app.screens.show('tavern', { heroId: props.heroId });
  const t = createTable(c, app, { table: 'dice', title: 'Würfelbecher', onBack: goBack });
  const mine = [die(), die()];
  const theirs = [die(), die()];
  const mySum = el('span', { class: 'dice-sum', text: 'Du: –' });
  const theirSum = el('span', { class: 'dice-sum', text: `${t.host.name}: –` });
  const myDice = el('div', { class: 'dice-pair' }, ...mine);
  const theirDice = el('div', { class: 'dice-pair' }, ...theirs);
  t.stage.append(
    el('div', { class: 'dice-side' }, myDice, mySum),
    el('span', { class: 'dice-vs', text: 'gegen' }),
    el('div', { class: 'dice-side' }, theirDice, theirSum));

  const button = playButton('Würfeln!', play);
  t.actions.append(button);
  const sync = () => { button.disabled = t.locked || t.broke() || !canStake(app.save, t.stake); };
  t.onIdle(() => { sync(); keepFocus(c, button); });
  sync();

  function play() {
    if (!t.ready() || !canStake(app.save, t.stake)) return;
    const stake = t.stake;
    const goldBefore = app.save.gold;
    const r = playDice(createRng(newSeed()), stake);
    let res = { ok: false };
    app.update((save) => { res = applyRound(save, { stake, payout: r.payout, loot: r.loot }); });
    if (!res.ok) { t.refresh(); sync(); return; }
    t.begin();
    sync();
    t.setGold(goldBefore - stake);
    t.setResult('Die Würfel rollen …');
    app.sfx.play('dice');
    const sum = (d) => d[0] + d[1];
    let last = -1;
    t.run(TABLE_MOTION.diceMs, (time) => {
      // Erst kommen die eigenen Würfel zur Ruhe, dann die des Wirts.
      const step = Math.floor(time * 14);
      const mineDone = time >= 0.55 || time === 1;
      const theirsDone = time === 1;
      myDice.classList.toggle('rolling', !mineDone);
      theirDice.classList.toggle('rolling', !theirsDone);
      if (step !== last || time === 1) {
        last = step;
        mine.forEach((d, i) => setDie(d, mineDone ? r.player[i] : 1 + Math.floor(Math.random() * 6)));
        theirs.forEach((d, i) => setDie(d, theirsDone ? r.host[i] : 1 + Math.floor(Math.random() * 6)));
      }
      mySum.textContent = mineDone ? `Du: ${sum(r.player)}` : 'Du: …';
      theirSum.textContent = theirsDone ? `${t.host.name}: ${sum(r.host)}` : `${t.host.name}: …`;
    }, () => finish(r, stake, res.item));
  }

  function finish(r, stake, item) {
    t.end();
    const pasch = r.player[0] === 6 && r.player[1] === 6 ? 'Sechserpasch! ' : '';
    if (r.outcome === 'win') t.setResult(`${pasch}Gewonnen! ${formatNumber(r.payout)} Gold für dich.`, 'win');
    else if (r.outcome === 'tie') t.setResult(`${pasch}Gleichstand. Die Hälfte zurück: ${formatNumber(r.payout)} Gold.`, 'tie');
    else t.setResult(`${pasch}Verloren. ${t.host.name} streicht ${formatNumber(stake)} Gold ein.`, 'lose');
    t.showLoot(item);
    if (item) app.sfx.play('loot');
    else if (r.payout > 0) app.sfx.play('coins');
    t.checkAchievements();
    t.refresh();
    t.speak();
    sync();
  }

  const unbind = tableKeys(t, { onBack: goBack, onPlay: play });
  return () => { unbind(); t.dispose(); };
}

// ---------------------------------------------------------------- Glücksrad

const FIELD_DEG = 360 / WHEEL.fields.length;

/** Aufschrift und Farbklasse eines Feldes. */
function fieldLook(f) {
  if (f.kind === 'niete') return { label: 'Niete', cls: 'f-niete' };
  if (f.kind === 'loot') return { label: '★', cls: 'f-loot' };
  return { label: `×${f.mul}`, cls: `f-x${f.mul}` };
}

function svg(tag, attrs = {}, ...children) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  node.append(...children);
  return node;
}

/** Punkt auf dem Kreis, Winkel im Uhrzeigersinn ab oben. */
function polar(r, deg) {
  const a = (deg * Math.PI) / 180;
  return [r * Math.sin(a), -r * Math.cos(a)];
}

/** Das Rad als SVG: 20 Felder, oben ein fester Zeiger. Gibt das Element und die drehbare Gruppe zurück. */
function wheelSvg() {
  const R = 92;
  const rot = svg('g', { class: 'wheel-rot' });
  const sectors = WHEEL.fields.map((f, i) => {
    const a0 = i * FIELD_DEG;
    const a1 = a0 + FIELD_DEG;
    const [x0, y0] = polar(R, a0);
    const [x1, y1] = polar(R, a1);
    const { label, cls } = fieldLook(f);
    const text = svg('text', {
      class: 'wheel-label', 'text-anchor': 'middle', 'dominant-baseline': 'central',
      transform: `rotate(${a0 + FIELD_DEG / 2}) translate(0 ${f.kind === 'niete' ? -62 : -70}) rotate(${f.kind === 'niete' ? -90 : 0})`,
    });
    text.textContent = label;
    const group = svg('g', { class: `wheel-field ${cls}` },
      svg('path', { d: `M0 0 L${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z` }),
      text);
    rot.append(group);
    return group;
  });
  rot.append(svg('circle', { class: 'wheel-hub', r: 16 }));
  const node = svg('svg', { class: 'wheel', viewBox: '-100 -104 200 208', 'aria-hidden': 'true', focusable: 'false' },
    svg('circle', { class: 'wheel-rim', r: 97 }),
    rot,
    svg('path', { class: 'wheel-pointer', d: 'M-9 -103 L9 -103 L0 -84 Z' }));
  return { node, rot, sectors };
}

/**
 * Glücksrad: ein Dreh, 20 Felder.
 * @param {HTMLElement} c
 * @param {{ heroId: string }} props
 * @param {any} app
 */
export function renderWheel(c, props, app) {
  const goBack = () => app.screens.show('tavern', { heroId: props.heroId });
  const t = createTable(c, app, { table: 'wheel', title: 'Glücksrad', onBack: goBack });
  const wheel = wheelSvg();
  let angle = 0;
  t.stage.append(wheel.node,
    el('p', { class: 'wheel-legend muted', text: `★ Beutefeld: ab ${formatNumber(TAVERN.lootMinStake)} Gold Einsatz ein Gegenstand, darunter der Einsatz zurück.` }));

  const button = playButton('Drehen!', play);
  t.actions.append(button);
  const sync = () => { button.disabled = t.locked || t.broke() || !canStake(app.save, t.stake); };
  t.onIdle(() => { sync(); keepFocus(c, button); });
  sync();

  const fieldAt = (deg) => Math.floor((((-deg % 360) + 360) % 360) / FIELD_DEG) % WHEEL.fields.length;

  function play() {
    if (!t.ready() || !canStake(app.save, t.stake)) return;
    const stake = t.stake;
    const goldBefore = app.save.gold;
    const r = spinWheel(createRng(newSeed()), stake);
    let res = { ok: false };
    app.update((save) => { res = applyRound(save, { stake, payout: r.payout, loot: r.loot }); });
    if (!res.ok) { t.refresh(); sync(); return; }
    t.begin();
    sync();
    t.setGold(goldBefore - stake);
    t.setResult('Das Rad dreht sich …');
    for (const s of wheel.sectors) s.classList.remove('win');
    // Ziel: Mitte des Feldes unter dem Zeiger, mit etwas Spiel innerhalb des Feldes (nur Optik).
    const from = angle;
    const center = r.index * FIELD_DEG + FIELD_DEG / 2;
    const wobble = (Math.random() - 0.5) * FIELD_DEG * 0.6;
    const rest = (((-center + wobble - from) % 360) + 360) % 360;
    const to = from + TABLE_MOTION.wheelTurns * 360 + rest;
    let lastField = fieldAt(from);
    let lastTick = 0;
    t.run(TABLE_MOTION.wheelMs, (time) => {
      angle = from + (to - from) * easeOutCubic(time);
      wheel.rot.setAttribute('transform', `rotate(${angle.toFixed(2)})`);
      const field = fieldAt(angle);
      const now = performance.now();
      if (field !== lastField && time < 1 && now - lastTick >= TABLE_MOTION.tickGapMs) {
        app.sfx.play('wheelTick');
        lastTick = now;
      }
      lastField = field;
    }, () => finish(r, stake, res.item));
  }

  function finish(r, stake, item) {
    t.end();
    angle %= 360;
    wheel.rot.setAttribute('transform', `rotate(${angle.toFixed(2)})`);
    wheel.sectors[r.index].classList.add('win');
    const f = WHEEL.fields[r.index];
    if (f.kind === 'niete') t.setResult(`Niete. ${t.host.name} lächelt und behält ${formatNumber(stake)} Gold.`, 'lose');
    else if (f.kind === 'loot' && item) t.setResult('Das Beutefeld!', 'win');
    else if (f.kind === 'loot') t.setResult(`Das Beutefeld! Ab ${formatNumber(TAVERN.lootMinStake)} Gold Einsatz gäbe es Beute. Einsatz zurück.`, 'tie');
    else if (f.mul === 1) t.setResult(`×1: Einsatz zurück, ${formatNumber(r.payout)} Gold.`, 'tie');
    else t.setResult(`×${f.mul}! ${formatNumber(r.payout)} Gold für dich.`, 'win');
    t.showLoot(item);
    if (item) app.sfx.play('loot');
    else if (r.payout > 0) app.sfx.play('coins');
    t.checkAchievements();
    t.refresh();
    t.speak();
    sync();
  }

  const unbind = tableKeys(t, { onBack: goBack, onPlay: play });
  return () => { unbind(); t.dispose(); };
}

// ---------------------------------------------------------------- Höher oder tiefer

/**
 * Spielkarte aus CSS: Wert groß in der Mitte und klein in zwei Ecken, Joker mit Stern, ohne Wert die Rückseite.
 * @param {number | 'joker' | null} rank
 */
function cardFace(rank) {
  if (rank === null) return el('span', { class: 'play-card card-back', 'aria-label': 'Verdeckte Karte', role: 'img' });
  const label = rank === 'joker' ? '★' : cardLabel(rank);
  const name = rank === 'joker' ? 'Joker' : label;
  const red = rank !== 'joker' && rank % 2 === 1;
  return el('span', { class: `play-card${rank === 'joker' ? ' card-joker' : ''}${red ? ' card-red' : ''}`, role: 'img', 'aria-label': `Karte ${name}` },
    el('span', { class: 'card-corner card-tl', 'aria-hidden': 'true', text: label }),
    el('span', { class: 'card-rank', 'aria-hidden': 'true', text: rank === 'joker' ? 'Joker' : label }),
    el('span', { class: 'card-corner card-br', 'aria-hidden': 'true', text: label }));
}

/**
 * Höher oder tiefer: Karte für Karte, der Topf wächst nach Risiko.
 * @param {HTMLElement} c
 * @param {{ heroId: string }} props
 * @param {any} app
 */
export function renderHiLo(c, props, app) {
  const leave = () => app.screens.show('tavern', { heroId: props.heroId });
  const t = createTable(c, app, { table: 'hilo', title: 'Höher oder tiefer', onBack: () => goBack() });
  c.style.setProperty('--card-ms', `${TABLE_MOTION.cardMs}ms`);
  /** Laufende Runde: Zustand und Zufall (nur im Speicher der Seite). */
  let round = null;
  let leaving = false;

  const openSlot = el('div', { class: 'card-slot' }, cardFace(null));
  const drawSlot = el('div', { class: 'card-slot' }, cardFace(null));
  const potLine = el('p', { class: 'hilo-pot' });
  t.stage.append(
    el('div', { class: 'hilo-cards' },
      el('div', { class: 'card-col' }, openSlot, el('span', { class: 'muted card-cap', text: 'Offen' })),
      el('div', { class: 'card-col' }, drawSlot, el('span', { class: 'muted card-cap', text: 'Nächste' }))),
    potLine);

  const startBtn = playButton('Karte aufdecken', start);
  const upBtn = el('button', { class: 'btn btn-primary hilo-guess', type: 'button', onclick: () => guess('up') });
  const downBtn = el('button', { class: 'btn btn-primary hilo-guess', type: 'button', onclick: () => guess('down') });
  const cashBtn = el('button', { class: 'btn hilo-cash', type: 'button', onclick: cashOut }, 'Auszahlen');
  const guessRow = el('div', { class: 'hilo-row' }, upBtn, downBtn);

  function sync() {
    const running = !!round && !round.state.done;
    if (running) {
      const { card, hits } = round.state;
      const fUp = hiLoFactor(card, 'up');
      const fDown = hiLoFactor(card, 'down');
      upBtn.textContent = fUp > 0 ? `↑ Höher ${formatFactor(fUp)}` : '↑ Höher';
      downBtn.textContent = fDown > 0 ? `↓ Tiefer ${formatFactor(fDown)}` : '↓ Tiefer';
      upBtn.disabled = t.locked || fUp === 0;
      downBtn.disabled = t.locked || fDown === 0;
      cashBtn.disabled = t.locked || hits === 0;
      if (t.actions.firstChild !== guessRow) t.actions.replaceChildren(guessRow, cashBtn);
      potLine.textContent = `Topf: ${formatNumber(round.state.pot)} Gold · Treffer ${hits} von ${HILO.maxHits}`;
    } else {
      startBtn.disabled = t.locked || t.broke() || !canStake(app.save, t.stake);
      if (t.actions.firstChild !== startBtn) t.actions.replaceChildren(startBtn);
      if (!round) potLine.textContent = `Gleicher Wert verliert. Höchstens ${HILO.maxHits} Treffer, dann wird ausgezahlt.`;
    }
  }

  function show(slot, rank, reveal) {
    const face = cardFace(rank);
    if (reveal) face.classList.add('card-reveal');
    slot.replaceChildren(face);
  }

  function start() {
    if (!t.ready() || round || !canStake(app.save, t.stake)) return;
    const stake = t.stake;
    let res = { ok: false };
    app.update((save) => { res = startHiLoRound(save, stake); });
    if (!res.ok) { t.refresh(); sync(); return; }
    const rng = createRng(newSeed());
    round = { state: hiLoStart(rng, stake), rng };
    t.begin();
    t.lockStakes(true);
    t.setGold(app.save.gold);
    t.setResult('Höher oder tiefer?');
    show(openSlot, round.state.card, true);
    show(drawSlot, null, false);
    app.sfx.play('card');
    sync();
    t.run(TABLE_MOTION.cardMs, () => {}, () => {
      t.end();
      openSlot.firstChild?.classList.remove('card-reveal');
      sync();
    });
  }

  /** Schließt die Runde im Spielstand ab (genau einmal) und gibt die Beute zurück. */
  function settle(state, loot) {
    let item = null;
    app.update((save) => { ({ item } = settleHiLoRound(save, state, loot)); });
    return item;
  }

  function guess(dir) {
    if (!t.ready() || !round || round.state.done || hiLoFactor(round.state.card, dir) === 0) return;
    const before = round.state;
    const { state, drawn, loot } = hiLoGuess(before, dir, round.rng);
    round.state = state;
    const item = state.done ? settle(state, loot) : null;
    t.begin();
    sync();
    show(drawSlot, drawn, true);
    app.sfx.play('card');
    t.run(TABLE_MOTION.cardMs, () => {}, () => afterGuess(before, state, drawn, item));
  }

  function afterGuess(before, state, drawn, item) {
    t.end();
    drawSlot.firstChild?.classList.remove('card-reveal');
    if (state.result === 'miss') {
      const same = drawn === before.card ? 'Gleicher Wert zählt als verloren. ' : 'Daneben. ';
      t.setResult(`${same}Der Topf von ${formatNumber(before.pot)} Gold ist weg.`, 'lose');
    } else if (state.result === 'joker') {
      t.setResult(`Joker! Dein Topf von ${formatNumber(state.pot)} Gold wird ausgezahlt.`, 'win');
    } else if (state.result === 'max') {
      const why = state.hits >= HILO.maxHits ? `${HILO.maxHits} Treffer!` : 'Der Topf ist voll!';
      t.setResult(`${why} ${formatNumber(state.pot)} Gold ausgezahlt.`, 'win');
    } else {
      t.setResult(`Treffer! Topf: ${formatNumber(state.pot)} Gold. Auszahlen oder weiter?`, 'win');
      // Die gezogene Karte wird zur offenen Karte.
      show(openSlot, state.card, false);
      show(drawSlot, null, false);
    }
    if (state.done) finishRound(state, item);
    else sync();
  }

  function cashOut() {
    if (!t.ready() || !round || round.state.done || round.state.hits === 0) return;
    const state = hiLoCashOut(round.state);
    round.state = state;
    settle(state, null);
    t.end();
    t.setResult(`Ausgezahlt: ${formatNumber(state.pot)} Gold.`, 'win');
    finishRound(state, null);
  }

  /** Runde vorbei: Beute zeigen, Ton, Erfolge prüfen, Einsätze wieder frei. */
  function finishRound(state, item) {
    round = null;
    t.showLoot(item);
    if (item) app.sfx.play('loot');
    else if (state.result !== 'miss' && state.pot > 0) app.sfx.play('coins');
    t.lockStakes(false);
    t.checkAchievements();
    t.refresh();
    t.speak();
    sync();
  }

  /** Bricht eine laufende Runde ab: der Topf ist verloren, die Trefferserie zählt (als Fehltipp gespeichert). */
  function abandon() {
    if (!round || round.state.done) { round = null; return; }
    const state = { ...round.state, pot: 0, done: true, result: 'miss' };
    round = null;
    settle(state, null);
    t.checkAchievements();
  }

  async function goBack() {
    if (leaving) return;
    if (round && !round.state.done && round.state.pot > 0) {
      leaving = true;
      const ok = await confirmDialog({
        title: 'Runde aufgeben?',
        message: ['Dein Topf von ', el('strong', { text: `${formatNumber(round.state.pot)} Gold` }), ' ist dann verloren.'],
        confirmLabel: 'Aufgeben',
        cancelLabel: 'Weiterspielen',
      });
      leaving = false;
      if (!ok) return;
      if (!round || round.state.done) { leave(); return; }
      abandon();
    }
    leave();
  }

  // Nach der Pause: Knöpfe freigeben und den Fokus zurück auf den nächsten sinnvollen Knopf (für die Tastatur).
  t.onIdle(() => {
    sync();
    keepFocus(c, !round || round.state.done ? startBtn : upBtn.disabled ? downBtn : upBtn);
  });
  sync();
  const unbind = tableKeys(t, {
    onBack: goBack,
    onPlay: start,
    extra: (e) => {
      if (!round || round.state.done) return false;
      if (e.key === 'ArrowUp') { if (!e.repeat) guess('up'); return true; }
      if (e.key === 'ArrowDown') { if (!e.repeat) guess('down'); return true; }
      if (e.key.toLowerCase() === 'a') { if (!e.repeat) cashOut(); return true; }
      return false;
    },
  });
  return () => { unbind(); abandon(); t.dispose(); };
}
