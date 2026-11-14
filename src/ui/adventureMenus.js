// Menüs im Abenteuer (Spec §5): Pausenmenü mit Ausrüstung, Fähigkeiten, Aufträgen und Karte; Lagerfeuer; Bildergeschichte.
// Jede Seite ist eine Tafel über dem Spiel; bedienbar mit Tippen, Klicken und Tastatur (Pfeile, Tab, Enter, Esc).
// Spielstand-Änderungen nur über `ctx.change` (src/save/adventure.js bzw. src/core/adventureHero.js).
import { el } from './dom.js';
import { CLASSES } from '../data/classes.js';
import { ABILITIES } from '../data/abilities.js';
import { QUESTS } from '../data/quests.js';
import { ADVENTURE_LEVEL, CAMPFIRE_NAMES } from '../data/adventure.js';
import { ENV_SHEETS } from '../data/environment.js';
import { spendPoint, setButton } from '../core/adventureHero.js';
import { trackedQuest } from '../core/quests.js';

/**
 * @typedef {{ uiLayer: HTMLElement, app: any, heroId: string, run: import('../modes/adventure.js').AdventureRun,
 *   change(mutator: (save: any, hero: any) => void): void, minimap: any, onExit(): void }} MenuCtx
 *   `change` ändert den gespeicherten Stand (Held als zweites Argument) und übernimmt ihn in den Lauf.
 */

/** Offene Tafeln, die oberste zuletzt: nur sie bekommt Tasten. */
const stack = [];

/**
 * Tafel mit Titel, Inhalt und „Zurück“. `build(body)` füllt den Inhalt; `refresh()` baut ihn neu.
 * @returns {Promise<void>} erfüllt beim Schließen
 */
export function panel(uiLayer, title, build, { backLabel = 'Zurück', wide = false, closeKeys = [] } = {}) {
  return new Promise((resolve) => {
    const body = el('div', { class: 'adv-panel-body' });
    const back = el('button', { class: 'btn', type: 'button' }, backLabel);
    const box = el('div', { class: `adv-panel${wide ? ' wide' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      el('div', { class: 'adv-panel-head' }, el('h2', { text: title }), back), body);
    const root = el('div', { class: 'adv-overlay', 'data-ui-control': true }, box);
    uiLayer.append(root);
    const api = {
      refresh() { const focusKey = document.activeElement?.dataset?.key; body.replaceChildren(); build(body, api); focusFirst(focusKey); },
      close,
    };
    function focusFirst(key) {
      const target = (key && body.querySelector(`[data-key="${CSS.escape(key)}"]`)) || body.querySelector('button:not([disabled])') || back;
      target.focus({ preventScroll: true });
    }
    function close() {
      window.removeEventListener('keydown', onKey, true);
      stack.splice(stack.indexOf(api), 1);
      root.remove();
      resolve();
    }
    function onKey(e) {
      // Nur die oberste Tafel, und keine, solange eine Rückfrage offen ist.
      if (stack[stack.length - 1] !== api || document.querySelector('.dialog-backdrop')) return;
      if (e.code === 'Escape' || closeKeys.includes(e.code)) { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
        const list = [...box.querySelectorAll('button:not([disabled])')];
        const i = list.indexOf(document.activeElement);
        const next = list[(i + (e.code === 'ArrowDown' ? 1 : -1) + list.length) % list.length];
        if (next) { e.preventDefault(); e.stopPropagation(); next.focus(); }
      }
    }
    back.addEventListener('click', close);
    stack.push(api);
    window.addEventListener('keydown', onKey, true);
    build(body, api);
    focusFirst();
  });
}

/**
 * Pausenmenü. Liefert, wie es weitergeht.
 * @param {MenuCtx} ctx
 * @param {{ equipment: (ctx: MenuCtx) => Promise<void> }} pages
 * @returns {Promise<'resume'|'exit'>}
 */
export async function openPauseMenu(ctx, pages) {
  let choice = 'resume';
  const page = async (fn) => { await fn(ctx); };
  // Die Unterseiten öffnen sich über dem Pausenmenü; danach geht es dort weiter.
  await panel(ctx.uiLayer, 'Pause', (body, api) => {
    const item = (label, fn) => el('button', { class: 'btn btn-large', type: 'button', onclick: fn }, label);
    body.append(el('nav', { class: 'adv-menu' },
      item('Weiter', () => api.close()),
      item('Ausrüstung', () => page(pages.equipment)),
      item('Fähigkeiten', () => page(openAbilities)),
      item('Aufträge', () => page(openQuests)),
      item('Karte', () => page(openBigMap)),
      item('Zum Hauptmenü', () => { choice = 'exit'; api.close(); })));
  }, { backLabel: 'Weiter' });
  return choice;
}

/** Fähigkeiten: Punkte verteilen, Knöpfe 1–3 belegen. */
export function openAbilities(ctx) {
  const cls = CLASSES[ctx.run.hero.class];
  return panel(ctx.uiLayer, 'Fähigkeiten', (body, api) => {
    const rec = ctx.run.record;
    body.append(el('p', { class: 'adv-note', text: `Fähigkeitspunkte: ${rec.skillPoints}. Die Grundattacke schlägt von selbst zu; die anderen legst du auf die Knöpfe 1 bis 3.` }));
    const ids = [cls.startAbility, ...cls.abilityPool];
    for (const [i, id] of ids.entries()) {
      const def = ABILITIES[id], level = rec.abilities[id];
      const start = i === 0;
      const row = el('div', { class: `adv-row${level ? '' : ' locked'}` },
        el('div', { class: 'adv-row-main' },
          el('strong', { text: def.name }),
          el('span', { class: 'adv-muted', text: level ? `${start ? 'Grundattacke · ' : ''}Stufe ${level} von 5` : `frei ab Level ${ADVENTURE_LEVEL.unlockAt[i - 1]}` }),
          el('span', { class: 'adv-desc', text: def.description })));
      const actions = el('div', { class: 'adv-row-actions' });
      if (level) {
        actions.append(el('button', {
          class: 'btn', type: 'button', 'data-key': `up-${id}`, disabled: rec.skillPoints < 1 || level >= 5,
          onclick: () => { ctx.change((save, hero) => { spendPoint(hero.adventure, id); }); api.refresh(); },
        }, '+1 Stufe'));
        if (!start) {
          for (const slot of [0, 1, 2]) {
            const on = rec.buttons[slot] === id;
            actions.append(el('button', {
              class: `btn adv-slot${on ? ' on' : ''}`, type: 'button', 'data-key': `slot-${id}-${slot}`, 'aria-pressed': on ? 'true' : 'false',
              'aria-label': `${def.name} auf Knopf ${slot + 1}`,
              onclick: () => { ctx.change((save, hero) => { setButton(hero.adventure, slot, on ? null : id); }); api.refresh(); },
            }, String(slot + 1)));
          }
        }
      }
      row.append(actions);
      body.append(row);
    }
  });
}

/** Aufträge: laufende mit Schritt und Fortschritt (antippen = verfolgen), erledigte darunter. */
export function openQuests(ctx) {
  return panel(ctx.uiLayer, 'Aufträge', (body, api) => {
    const rec = ctx.run.record;
    const tracked = trackedQuest(rec.quests, rec.trackedQuest);
    const active = Object.values(QUESTS).filter((q) => rec.quests[q.id]?.state === 'active');
    const done = Object.values(QUESTS).filter((q) => rec.quests[q.id]?.state === 'done');
    if (active.length === 0) body.append(el('p', { class: 'adv-note', text: 'Gerade keine Aufträge. Sprich mit den Leuten im Dorf.' }));
    for (const q of active) {
      const e = rec.quests[q.id], s = q.steps[e.step];
      const count = s.count > 1 ? ` (${e.progress}/${s.count})` : '';
      body.append(el('button', {
        class: `adv-quest-row${q.id === tracked ? ' on' : ''}`, type: 'button', 'data-key': q.id, 'aria-pressed': q.id === tracked ? 'true' : 'false',
        onclick: () => { ctx.change((save, hero) => { hero.adventure.trackedQuest = q.id; }); api.refresh(); },
      },
      el('strong', { text: `${q.kind === 'main' ? 'Hauptauftrag' : 'Nebenauftrag'}: ${q.title}` }),
      el('span', { text: `${s.text}${count}` }),
      q.id === tracked ? el('span', { class: 'adv-muted', text: '★ wird verfolgt' }) : null));
    }
    if (done.length) body.append(el('p', { class: 'adv-muted', text: `Erledigt: ${done.map((q) => q.title).join(', ')}` }));
  });
}

/** Große Karte mit Gebietsnamen. */
export function openBigMap(ctx) {
  return panel(ctx.uiLayer, ctx.run.map.name, (body) => {
    const w = Math.min(900, ctx.uiLayer.clientWidth - 48), h = Math.min(560, Math.round(ctx.uiLayer.clientHeight * 0.6));
    const canvas = el('canvas', { class: 'adv-bigmap', width: Math.max(200, w), height: Math.max(160, h) });
    body.append(canvas);
    ctx.minimap.drawBig(canvas, ctx.run);
  }, { wide: true, closeKeys: ['KeyM'] });
}

/**
 * Lagerfeuer nach dem Rasten: weiterziehen oder reisen.
 * @param {MenuCtx} ctx
 * @param {{ id: string, destinations: string[] }} fire
 * @returns {Promise<string|null>} Ziel-Lagerfeuer oder null
 */
export async function openCampfire(ctx, fire) {
  let target = null;
  await panel(ctx.uiLayer, `Lagerfeuer: ${CAMPFIRE_NAMES[fire.id] ?? fire.id}`, (body, api) => {
    body.append(el('p', { class: 'adv-note', text: 'Du rastest. Leben voll, Spiel gespeichert. Die Gegner sind zurück.' }));
    body.append(el('button', { class: 'btn btn-primary btn-large', type: 'button', onclick: () => api.close() }, 'Weiterziehen'));
    const others = fire.destinations.filter((id) => id !== fire.id);
    if (others.length) body.append(el('p', { class: 'adv-muted', text: 'Reisen zu:' }));
    for (const id of others) {
      body.append(el('button', { class: 'btn', type: 'button', onclick: () => { target = id; api.close(); } }, CAMPFIRE_NAMES[id] ?? id));
    }
  }, { backLabel: 'Weiterziehen' });
  return target;
}

/**
 * Bildergeschichte: Tafeln mit Landschaftsbild und Text; „Weiter“, „Überspringen“.
 * @param {HTMLElement} uiLayer
 * @param {{ scene: number, lines: string[] }[]} panels
 * @returns {Promise<void>}
 */
export function playStory(uiLayer, panels) {
  return new Promise((resolve) => {
    let i = 0;
    const text = el('div', { class: 'adv-story-text', 'aria-live': 'polite' });
    const next = el('button', { class: 'btn btn-primary btn-large', type: 'button' }, 'Weiter');
    const skip = el('button', { class: 'btn', type: 'button' }, 'Überspringen');
    const root = el('div', { class: 'adv-story', 'data-ui-control': true, role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Geschichte' },
      el('div', { class: 'adv-story-box' }, text, el('div', { class: 'adv-story-actions' }, skip, next)));
    root.style.backgroundImage = `url("${ENV_SHEETS.szenen}")`;
    uiLayer.append(root);
    function show() {
      const p = panels[i];
      root.style.backgroundPosition = `${(p.scene % 3) * 50}% ${Math.floor(p.scene / 3) * 100}%`;
      text.replaceChildren(...p.lines.map((line) => el('p', { text: line })));
      next.textContent = i === panels.length - 1 ? 'Los geht’s' : 'Weiter';
      next.focus({ preventScroll: true });
    }
    function close() { window.removeEventListener('keydown', onKey, true); root.remove(); resolve(); }
    function advance() { if (i >= panels.length - 1) close(); else { i++; show(); } }
    function onKey(e) {
      if (e.repeat) return;
      if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); e.stopPropagation(); advance(); }
    }
    next.addEventListener('click', advance);
    skip.addEventListener('click', close);
    window.addEventListener('keydown', onKey, true);
    show();
  });
}
