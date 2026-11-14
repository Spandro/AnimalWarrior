// Anzeige im Spiel: Leben, Erfahrung mit Level, Timer, Gold, besiegte Gegner, Fähigkeiten, Lebensbalken des Bosses
// und des Schattens (mit Restzeit) sowie die Sprüche des Schattens.
// Die Elemente entstehen einmal; je Bild ändern sich nur Text und Stil, und nur, wenn sich der Wert geändert hat.
import { el, formatNumber } from './dom.js';
import { displayTime } from '../modes/survivor.js';
import { xpToNext } from '../core/progression.js';
import { ABILITIES } from '../data/abilities.js';
import { ENEMIES } from '../data/enemies.js';
import { ABILITY_COLOR } from '../render/effects.js';

const MAX_ABILITIES = 5;
const SHADOW_NAME = 'Dein Schatten';
/** So lange steht ein Spruch des Schattens da (Weltsekunden). */
const TAUNT_SECONDS = 3;

/** Sekunden als mm:ss, auch für 0. */
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/**
 * Kürzel einer Fähigkeit für das Symbol: Anfangsbuchstaben der ersten zwei Wörter des Namens
 * („Heiße Angelegenheit“ → HA), bei einem Wort die ersten zwei Buchstaben („Besteckschublade“ → BE).
 */
export function abilityInitials(id) {
  const words = (ABILITIES[id]?.name ?? id).split(/[\s-]+/).map((w) => w.replace(/[^\p{L}\p{N}]/gu, '')).filter(Boolean);
  const text = words.length >= 2 ? words[0][0] + words[1][0] : (words[0] ?? '').slice(0, 2);
  return text.toUpperCase();
}

/** CSS-Farbe einer Fähigkeit. */
export function abilityColor(id) {
  return '#' + (ABILITY_COLOR[id] ?? 0xffffff).toString(16).padStart(6, '0');
}

/**
 * Balken mit Füllung und Text. `set` ändert nur, was sich geändert hat.
 * @param {string} className
 * @param {string} label zugänglicher Name
 */
export function bar(className, label) {
  const fill = el('span', { class: 'hud-bar-fill' });
  const text = el('span', { class: 'hud-bar-text' });
  const root = el('div', { class: `hud-bar ${className}`, role: 'meter', 'aria-label': label, 'aria-valuemin': '0' }, fill, text);
  let lastFrac = -1, lastText = null;
  return {
    root,
    /** @param {number} frac 0…1 @param {string} t */
    set(frac, t, max) {
      const f = Math.max(0, Math.min(1, frac));
      const rounded = Math.round(f * 1000) / 1000;
      if (rounded !== lastFrac) { fill.style.transform = `scaleX(${rounded})`; lastFrac = rounded; }
      if (t !== lastText) {
        text.textContent = t; lastText = t;
        root.setAttribute('aria-valuetext', t);
        if (max !== undefined) root.setAttribute('aria-valuemax', String(max));
      }
    },
  };
}

/** Textfeld, das nur bei Änderung schreibt. */
function textCell(node) {
  let last = null;
  return (t) => { if (t !== last) { node.textContent = t; last = t; } };
}

/**
 * @param {HTMLElement} uiLayer
 * @param {{ onPause?: () => void }} [options] `onPause` zeigt den Pause-Knopf unten neben den Fähigkeiten;
 *   er tut dasselbe wie Esc.
 * @returns {{ handle(events: object[], world: import('../core/world.js').World): void,
 *   update(run: import('../modes/survivor.js').Run): void, dispose(): void }}
 */
export function createHud(uiLayer, { onPause } = {}) {
  const hp = bar('hud-hp', 'Leben');
  const xp = bar('hud-xp', 'Erfahrung');
  const levelNode = el('span', { class: 'hud-level' });
  const timerNode = el('div', { class: 'hud-timer', 'aria-label': 'Zeit' });
  const goldNode = el('strong');
  const killsNode = el('strong');
  const bossName = el('span', { class: 'hud-boss-name', text: '' });
  const bossBar = bar('hud-boss-bar', 'Leben des Bosses');
  const boss = el('div', { class: 'hud-boss', hidden: true }, bossName, bossBar.root);
  const shadowTime = el('span', { class: 'hud-shadow-time' });
  const shadowBar = bar('hud-shadow-bar', 'Leben deines Schattens');
  const shadowBox = el('div', { class: 'hud-boss hud-shadow', hidden: true },
    el('div', { class: 'hud-shadow-head' }, el('span', { class: 'hud-boss-name', text: SHADOW_NAME }), shadowTime),
    shadowBar.root);
  const taunt = el('div', { class: 'hud-taunt', hidden: true });

  const slots = [];
  const abilityRow = el('ul', { class: 'hud-abilities', 'aria-label': 'Fähigkeiten' });
  for (let i = 0; i < MAX_ABILITIES; i++) {
    const initials = el('span', { class: 'hud-ability-initials' });
    const level = el('span', { class: 'hud-ability-level' });
    const li = el('li', { class: 'hud-ability', hidden: true }, initials, level);
    abilityRow.append(li);
    slots.push({ li, initials, level, id: null, lv: -1 });
  }

  // Pause mit dem Daumen: eigener Knopf unten rechts, weil es am Handy kein Esc gibt.
  const pauseButton = onPause
    ? el('button', {
        class: 'hud-pause', type: 'button', 'data-ui-control': true,
        'aria-label': 'Pause', title: 'Pause (Esc)', onclick: () => onPause(),
      }, el('span', { class: 'hud-pause-icon', 'aria-hidden': 'true', text: '❚❚' }))
    : null;

  const root = el('div', { class: 'hud', 'aria-live': 'off' },
    el('div', { class: 'hud-top' },
      el('div', { class: 'hud-vitals' },
        hp.root,
        el('div', { class: 'hud-xp-row' }, levelNode, xp.root)),
      timerNode,
      el('div', { class: 'hud-counters' },
        el('span', { class: 'hud-gold', title: 'Gold' }, el('span', { class: 'hud-icon', 'aria-hidden': 'true', text: '●' }), goldNode),
        el('span', { class: 'hud-kills', title: 'Besiegte Gegner' }, el('span', { class: 'hud-icon', 'aria-hidden': 'true', text: '✕' }), killsNode))),
    el('div', { class: 'hud-bosses' }, boss, shadowBox, taunt),
    el('div', { class: 'hud-bottom' }, abilityRow, pauseButton));
  uiLayer.append(root);

  const setLevel = textCell(levelNode);
  const setTimer = textCell(timerNode);
  const setGold = textCell(goldNode);
  const setKills = textCell(killsNode);
  const setShadowTime = textCell(shadowTime);
  let bossShown = false, bossType = '', shadowShown = false, tauntUntil = -Infinity;

  return {
    /**
     * Sprüche des Schattens aus den Ereignissen eines Logikschritts (Text nur über textContent).
     * @param {object[]} events run.events
     * @param {import('../core/world.js').World} world
     */
    handle(events, world) {
      for (const e of events) {
        if (!e.type.startsWith('shadow') || !e.line) continue;
        taunt.textContent = `„${e.line}“`;
        taunt.hidden = false;
        tauntUntil = world.time + TAUNT_SECONDS;
      }
    },
    update(run) {
      const { hero, run: r, enemies } = run.world;
      const maxHp = hero.stats.maxHp;
      const curHp = Math.max(0, Math.ceil(hero.hp));
      hp.set(hero.hp / maxHp, `${curHp} / ${Math.round(maxHp)}`, Math.round(maxHp));

      const need = xpToNext(r.level);
      xp.set(r.xp / need, `${Math.floor(Math.min(r.xp, need))} / ${need}`, need);
      setLevel(`Lv ${r.level}`);
      setTimer(clock(displayTime(run)));
      setGold(formatNumber(Math.floor(r.gold)));
      setKills(formatNumber(r.kills));

      for (let i = 0; i < MAX_ABILITIES; i++) {
        const a = hero.abilities[i], s = slots[i];
        const id = a ? a.id : null, lv = a ? a.level : -1;
        if (id === s.id && lv === s.lv) continue;
        s.id = id; s.lv = lv;
        s.li.hidden = !a;
        if (!a) continue;
        const name = ABILITIES[id].name;
        s.initials.textContent = abilityInitials(id);
        s.level.textContent = String(lv);
        s.li.style.setProperty('--ability-color', abilityColor(id));
        s.li.title = `${name} – Stufe ${lv}`;
        s.li.setAttribute('aria-label', `${name}, Stufe ${lv}`);
      }

      let b = null, sh = null;
      for (const e of enemies) {
        if (e.shadow) sh = e;
        else if (e.boss && !e.untargetable && !b) b = e;
      }
      if (!!b !== bossShown) { boss.hidden = !b; bossShown = !!b; }
      if (b && b.type !== bossType) { bossType = b.type; bossName.textContent = ENEMIES[b.type]?.name ?? ''; }
      if (b) bossBar.set(b.hp / b.maxHp, `${Math.max(0, Math.ceil(b.hp))} / ${Math.round(b.maxHp)}`, Math.round(b.maxHp));
      if (!!sh !== shadowShown) { shadowBox.hidden = !sh; shadowShown = !!sh; }
      if (sh) {
        shadowBar.set(sh.hp / sh.maxHp, `${Math.ceil(sh.hp)} / ${Math.round(sh.maxHp)}`, Math.round(sh.maxHp));
        setShadowTime(sh.fleeing ? 'flieht!' : `noch ${Math.max(0, Math.ceil(sh.expiresAt - run.world.time))} s`);
      }
      if (!taunt.hidden && run.world.time >= tauntUntil) taunt.hidden = true;
    },
    dispose() { root.remove(); },
  };
}
