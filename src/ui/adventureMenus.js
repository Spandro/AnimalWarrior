// Menüs im Abenteuer (Spec §5): Pausenmenü mit Ausrüstung, Fähigkeiten, Aufträgen und Karte; Lagerfeuer; Bildergeschichte.
// Jede Seite ist eine Tafel über dem Spiel; bedienbar mit Tippen, Klicken und Tastatur (Pfeile, Tab, Enter, Esc).
// Spielstand-Änderungen nur über `ctx.change` (src/save/adventure.js bzw. src/core/adventureHero.js).
import { el } from './dom.js';
import { CLASSES } from '../data/classes.js';
import { ABILITIES } from '../data/abilities.js';
import { QUESTS } from '../data/quests.js';
import { ADVENTURE_LEVEL, CAMPFIRE_NAMES } from '../data/adventure.js';
import { ENV_SHEETS } from '../data/environment.js';
import { spendPoint, setButton, chooseSubclass, unlockBranch, spendPassive } from '../core/adventureHero.js';
import { SUBCLASSES, subclassesFor } from '../data/subclasses.js';
import { SUBCLASS_RULES } from '../data/adventure.js';
import { confirmDialog } from './menus.js';
import { respecAdventure } from '../save/adventure.js';
import { clearSignaturesAction } from '../modes/adventure.js';
import { RESPEC_LINES } from '../data/dialogues.js';
import { heroLineText, passiveEffectText, branchStatus, treeHeader, respecLine } from './treeText.js';
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
export function panel(uiLayer, title, build, { backLabel = 'Zurück', wide = false, closeKeys = [], focusBack = false } = {}) {
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
    if (focusBack) back.focus({ preventScroll: true }); else focusFirst();
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
    body.append(el('p', { class: 'adv-muted' }, el('strong', { text: ctx.run.hero.name }), ` – ${heroLineText({ ...ctx.run.hero, adventure: ctx.run.record })} · Level ${ctx.run.record.level}`));
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

/**
 * Fähigkeitenbaum (Spec §4): oben ggf. die Wahl der Unterklasse, dann Stamm (Klasse), Ast der Unterklasse und Dauer-Boni.
 * Punkte verteilen, Astfähigkeiten freischalten, Knöpfe 1–3 belegen.
 */
export function openAbilities(ctx) {
  const cls = CLASSES[ctx.run.hero.class];
  return panel(ctx.uiLayer, 'Fähigkeiten', (body, api) => {
    const rec = ctx.run.record;
    const act = (fn) => { ctx.change((save, hero) => { fn(hero.adventure); }); api.refresh(); };
    const slotButtons = (id, name) => [0, 1, 2].map((slot) => {
      const on = rec.buttons[slot] === id;
      return el('button', {
        class: `btn adv-slot${on ? ' on' : ''}`, type: 'button', 'data-key': `slot-${id}-${slot}`, 'aria-pressed': on ? 'true' : 'false',
        'aria-label': `${name} auf Knopf ${slot + 1}`, onclick: () => act((a) => setButton(a, slot, on ? null : id)),
      }, String(slot + 1));
    });
    const upButton = (id, level) => el('button', {
      class: 'btn', type: 'button', 'data-key': `up-${id}`, disabled: rec.skillPoints < 1 || level >= 5,
      onclick: () => act((a) => spendPoint(a, id)),
    }, '+1 Stufe');
    const row = (locked, main, actions) => el('div', { class: `adv-row${locked ? ' locked' : ''}` },
      el('div', { class: 'adv-row-main' }, ...main), el('div', { class: 'adv-row-actions' }, ...actions));

    body.append(el('p', { class: 'adv-note', text: `${treeHeader(rec)}. Die Grundattacke schlägt von selbst zu; die anderen legst du auf die Knöpfe 1 bis 3.` }));

    if (!rec.subclass && rec.level >= SUBCLASS_RULES.chooseLevel) {
      body.append(el('h3', { class: 'adv-tree-head', text: 'Wähle deine Unterklasse!' }));
      const cards = el('div', { class: 'adv-subclass-cards' });
      for (const sub of subclassesFor(ctx.run.hero.class)) {
        const sig = ABILITIES[sub.signature];
        cards.append(el('div', { class: 'adv-subclass-card' },
          el('strong', { text: sub.name }),
          el('span', { class: 'adv-muted', text: `„${sub.line}“` }),
          el('span', { text: `◆ ${sig.name}: ${sig.description}` }),
          el('span', { class: 'adv-muted', text: `Fähigkeiten: ${sub.abilities.map((id) => ABILITIES[id].name).join(', ')}` }),
          el('button', {
            class: 'btn btn-primary', type: 'button', 'data-key': `choose-${sub.id}`,
            onclick: async () => {
              const ok = await confirmDialog({
                title: `${sub.name} wählen?`,
                message: `Alle verteilten Punkte kommen zurück und du verteilst sie neu. Später umlernen kostet ${SUBCLASS_RULES.respecGold} Gold bei Oma Panzerla.`,
                confirmLabel: 'Wählen',
              });
              if (ok) act((a) => chooseSubclass(a, ctx.run.hero.class, sub.id));
            },
          }, 'Wählen')));
      }
      body.append(cards);
    }

    body.append(el('h3', { class: 'adv-tree-head', text: `Stamm: ${cls.name}` }));
    for (const [i, id] of [cls.startAbility, ...cls.abilityPool].entries()) {
      const def = ABILITIES[id], level = rec.abilities[id];
      const start = i === 0;
      body.append(row(!level, [
        el('strong', { text: def.name }),
        el('span', { class: 'adv-muted', text: level ? `${start ? 'Grundattacke · ' : ''}Stufe ${level} von 5` : `frei ab Level ${ADVENTURE_LEVEL.unlockAt[i - 1]}` }),
        el('span', { class: 'adv-desc', text: def.description }),
      ], level ? [upButton(id, level), ...(start ? [] : slotButtons(id, def.name))] : []));
    }

    const sub = rec.subclass ? SUBCLASSES[rec.subclass] : null;
    if (!sub) return;
    body.append(el('h3', { class: 'adv-tree-head', text: `Ast: ${sub.name}` }));
    for (const id of sub.abilities) {
      const def = ABILITIES[id], st = branchStatus(rec, id);
      const signature = id === sub.signature;
      body.append(row(!st.unlocked, [
        el('strong', { text: `${signature ? '◆ ' : ''}${def.name}` }),
        el('span', { class: 'adv-muted', text: `${signature ? 'Besonderheit · ' : ''}${st.label}` }),
        el('span', { class: 'adv-desc', text: def.description }),
      ], st.unlocked ? [upButton(id, st.level), ...slotButtons(id, def.name)] : [el('button', {
        class: 'btn', type: 'button', 'data-key': `unlock-${id}`, disabled: rec.skillPoints < SUBCLASS_RULES.unlockCost,
        onclick: () => act((a) => unlockBranch(a, id)),
      }, 'Freischalten')]));
    }
    body.append(el('h3', { class: 'adv-tree-head', text: 'Dauer-Boni' }));
    for (const def of sub.passives) {
      const rank = rec.passives[def.id] ?? 0;
      body.append(row(rank === 0, [
        el('strong', { text: def.name }),
        el('span', { class: 'adv-muted', text: `${passiveEffectText({ ...def, subclass: sub.id })} · Stufe ${rank} von ${def.maxRank}` }),
      ], [el('button', {
        class: 'btn', type: 'button', 'data-key': `passive-${def.id}`, disabled: rec.skillPoints < 1 || rank >= def.maxRank,
        onclick: () => act((a) => spendPassive(a, def.id)),
      }, '+1 Stufe')]));
    }
    body.append(el('p', { class: 'adv-muted', text: respecLine() }));
  });
}

/**
 * Umlernen bei Oma Panzerla (nach dem Gespräch, ab Level 10 mit Unterklasse): Preis, Rückfrage, dann `respecAdventure`.
 * @param {MenuCtx} ctx
 */
export function openRespec(ctx) {
  return panel(ctx.uiLayer, 'Oma Panzerla', (body, api) => {
    const sub = SUBCLASSES[ctx.run.record.subclass];
    const gold = ctx.app.save.gold;
    const price = SUBCLASS_RULES.respecGold;
    if (!sub) { body.append(el('p', { class: 'adv-note', text: RESPEC_LINES.done })); return; }
    body.append(el('p', { class: 'adv-note', text: RESPEC_LINES.offer(sub.name, price) }));
    body.append(el('p', { class: 'adv-muted', text: `Alle Punkte aus Stamm, Ast und Dauer-Boni kommen zurück, die Unterklasse ist wieder offen. Du hast ${gold} Gold.` }));
    body.append(el('button', {
      class: 'btn btn-primary btn-large', type: 'button', 'data-key': 'respec', disabled: gold < price,
      onclick: async () => {
        const ok = await confirmDialog({ title: 'Umlernen?', message: `Umlernen kostet ${price} Gold. Alle Punkte kommen zurück, die Unterklasse ${sub.name} ist weg.`, confirmLabel: `Umlernen (${price} Gold)` });
        if (!ok) return;
        ctx.change((save) => { respecAdventure(save, ctx.heroId); });
        clearSignaturesAction(ctx.run);
        api.refresh();
      },
    }, `Umlernen (${price} Gold)`));
    if (gold < price) body.append(el('p', { class: 'adv-muted', text: RESPEC_LINES.broke }));
  }, { backLabel: 'Nein danke', focusBack: true });
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
    const rec = ctx.run.record;
    if (!rec.subclass && rec.level >= SUBCLASS_RULES.chooseLevel) {
      body.append(el('p', { class: 'adv-note adv-remind', text: 'Du kannst eine Unterklasse wählen: Pause → Fähigkeiten.' }));
    }
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
