// Anzeige im Abenteuer (Spec §5.1): Leben, Erfahrung, Level, verfolgter Auftrag, Minikarte, Pause, Knopfviereck mit drei
// Fähigkeiten und Heiltrank (links oder rechts), Sprechen-Knopf, Bossanzeige, kurze Einblendungen.
import { el } from './dom.js';
import { bar, abilityInitials, abilityColor } from './hud.js';
import { createMinimap } from './minimap.js';
import { xpToNextAdventure } from '../core/adventureHero.js';
import { trackedQuest } from '../core/quests.js';
import { ABILITIES } from '../data/abilities.js';
import { ENEMIES } from '../data/enemies.js';
import { ITEMS } from '../data/items.js';
import { QUESTS } from '../data/quests.js';
import { MATERIALS } from '../data/adventure.js';

const INTERACT_LABEL = { npc: 'Sprechen', campfire: 'Rasten', spot: 'Untersuchen', chest: 'Öffnen' };
const BANNER_SECONDS = 2.6;

/**
 * @param {HTMLElement} uiLayer
 * @param {{ side: 'left'|'right', onAbility(slot: number): void, onPotion(): void, onInteract(): void, onPause(): void, onMap(): void }} h
 */
export function createAdventureHud(uiLayer, h) {
  const hp = bar('hud-hp', 'Leben');
  const xp = bar('hud-xp', 'Erfahrung');
  const levelNode = el('span', { class: 'hud-level' });
  const questNode = el('div', { class: 'adv-quest' });
  const bossName = el('span', { class: 'hud-boss-name' });
  const bossBar = bar('hud-boss-bar', 'Leben des Bosses');
  const boss = el('div', { class: 'hud-boss', hidden: true }, bossName, bossBar.root);
  const banner = el('div', { class: 'adv-banner', hidden: true, 'aria-live': 'polite' });
  const pause = el('button', { class: 'hud-pause adv-pause', type: 'button', 'data-ui-control': true, 'aria-label': 'Pause', title: 'Pause (Esc)', onclick: () => h.onPause() },
    el('span', { class: 'hud-pause-icon', 'aria-hidden': 'true', text: '❚❚' }));
  const corner = el('div', { class: 'adv-corner' }, pause);
  const minimap = createMinimap(corner, { onOpen: () => h.onMap() });

  const slots = [0, 1, 2].map((i) => {
    const initials = el('span', { class: 'adv-btn-initials' });
    const cool = el('span', { class: 'adv-btn-cool' });
    const key = el('span', { class: 'adv-btn-key', text: String(i + 1) });
    const btn = el('button', { class: 'adv-btn', type: 'button', 'data-ui-control': true, onclick: () => h.onAbility(i) }, cool, initials, key);
    return { btn, initials, cool, id: undefined };
  });
  const potionCount = el('span', { class: 'adv-btn-initials' });
  const potion = el('button', { class: 'adv-btn adv-potion', type: 'button', 'data-ui-control': true, 'aria-label': 'Heiltrank (4)', onclick: () => h.onPotion() },
    el('span', { class: 'adv-potion-icon', 'aria-hidden': 'true', text: '🧪' }), potionCount, el('span', { class: 'adv-btn-key', text: '4' }));
  const talk = el('button', { class: 'btn btn-primary adv-talk', type: 'button', 'data-ui-control': true, hidden: true, onclick: () => h.onInteract() });
  const pad = el('div', { class: 'adv-pad' }, ...slots.map((s) => s.btn), potion);
  const controls = el('div', { class: `adv-controls side-${h.side}` }, talk, pad);

  const root = el('div', { class: 'hud adv-hud', 'aria-live': 'off' },
    el('div', { class: 'adv-top' },
      el('div', { class: 'hud-vitals' }, hp.root, el('div', { class: 'hud-xp-row' }, levelNode, xp.root), questNode),
      corner),
    el('div', { class: 'hud-bosses' }, boss, banner),
    controls);
  uiLayer.append(root);

  let bannerUntil = 0, clock = 0, lastQuest = null, lastTalk = null, bannerImportant = false;
  /** Einblendung; Gebietsnamen (`minor`) verdrängen keine laufende wichtigere Meldung. */
  function say(text, minor = false) {
    if (minor && bannerImportant && !banner.hidden) return;
    bannerImportant = !minor;
    banner.textContent = text;
    banner.hidden = false;
    bannerUntil = clock + BANNER_SECONDS;
  }

  return {
    minimap,
    setSide(side) { controls.className = `adv-controls side-${side}`; },
    /** Einblendungen aus den Ereignissen eines Schritts. */
    handle(events) {
      for (const e of events) {
        if (e.type === 'areaEnter') say(e.name, true);
        else if (e.type === 'levelUp') say(`Level ${e.level}!`);
        else if (e.type === 'abilityUnlocked') say(`Neue Fähigkeit: ${ABILITIES[e.abilityId].name}`);
        else if (e.type === 'questAccepted') say(`Neuer Auftrag: ${QUESTS[e.questId].title}`);
        else if (e.type === 'questCompleted') say(`Auftrag erledigt: ${QUESTS[e.questId].title}`);
        else if (e.type === 'bossStart') say(e.name);
        else if (e.type === 'bossDefeated') say(`${e.name} besiegt!`);
        else if (e.type === 'loot' && e.kind === 'item') say(`Gefunden: ${ITEMS[e.itemId].name}`);
        else if (e.type === 'loot' && e.kind === 'chest') say(`Truhe: ${e.gold} Gold und ${ITEMS[e.itemId].name}`);
        else if (e.type === 'loot' && e.kind === 'material') say(`${MATERIALS[e.id].name}${e.count > 1 ? ` × ${e.count}` : ''}`);
        else if (e.type === 'loot' && e.kind === 'potion') say('Heiltrank gefunden');
        else if (e.type === 'questItem') say(`Gefunden: ${THINGS[e.thing] ?? e.thing}`);
        else if (e.type === 'wake') say(e.goldLost > 0 ? `Du wachst am Lagerfeuer auf … (−${e.goldLost} Gold)` : 'Du wachst am Lagerfeuer auf …');
        else if (e.type === 'abilityFail' && slots[e.slot]) {
          const b = slots[e.slot].btn;
          b.classList.remove('adv-shake'); void b.offsetWidth; b.classList.add('adv-shake');
        }
      }
    },
    /**
     * @param {import('../modes/adventure.js').AdventureRun} run
     * @param {number} dt
     */
    update(run, dt) {
      clock += dt;
      const { hero } = run.world, rec = run.record;
      hp.set(hero.hp / hero.stats.maxHp, `${Math.max(0, Math.ceil(hero.hp))} / ${Math.round(hero.stats.maxHp)}`, Math.round(hero.stats.maxHp));
      const need = xpToNextAdventure(rec.level);
      xp.set(rec.xp / need, `${Math.floor(rec.xp)} / ${need}`, need);
      levelNode.textContent = `Lv ${rec.level}`;
      const qid = trackedQuest(rec.quests, rec.trackedQuest);
      const qText = qid ? questLine(qid, rec) : '';
      if (qText !== lastQuest) { questNode.textContent = qText; questNode.hidden = !qText; lastQuest = qText; }
      slots.forEach((s, i) => {
        const id = rec.buttons[i];
        if (id !== s.id) {
          s.id = id;
          s.initials.textContent = id ? abilityInitials(id) : '';
          s.btn.style.setProperty('--ability-color', id ? abilityColor(id) : 'transparent');
          s.btn.classList.toggle('empty', !id);
          s.btn.setAttribute('aria-label', id ? `${ABILITIES[id].name} (${i + 1})` : `Leerer Platz ${i + 1}`);
        }
        const a = id ? hero.abilities.find((x) => x.id === id) : null;
        const left = a ? a.cooldownLeft : 0;
        if (left > (s.last ?? 0) + 1e-6) s.max = left; // gerade ausgelöst: volle Abklingzeit merken
        s.last = left;
        s.cool.style.transform = `scaleY(${s.max && left > 0 ? Math.min(1, left / s.max) : 0})`;
      });
      potionCount.textContent = String(rec.potions);
      potion.classList.toggle('empty', rec.potions === 0);
      const t = run.state === 'playing' ? run.interactable : null;
      const label = t ? INTERACT_LABEL[t.kind] : null;
      if (label !== lastTalk) { talk.hidden = !label; if (label) talk.textContent = `${label} (E)`; lastTalk = label; }
      const b = run.activeBoss ? run.world.enemies.find((e) => e.id === run.activeBoss.enemyId) : null;
      boss.hidden = !b;
      if (b) {
        bossName.textContent = ENEMIES[b.type].name;
        bossBar.set(b.hp / b.maxHp, `${Math.max(0, Math.ceil(b.hp))} / ${Math.round(b.maxHp)}`, Math.round(b.maxHp));
      }
      if (!banner.hidden && clock >= bannerUntil) banner.hidden = true;
      minimap.update(run);
    },
    dispose() { root.remove(); },
  };
}

/** Auftragsgegenstände für Einblendungen. */
const THINGS = { hammer: 'Grabowskis Hammer', nuss: 'Nussversteck', flugblatt: 'Flugblatt', krebsschere: 'Krebsschere' };

/** Zeile „Titel: Schritt (2/5)“ des verfolgten Auftrags. */
function questLine(id, rec) {
  const q = QUESTS[id], e = rec.quests[id], s = q.steps[e.step];
  const count = s.count && s.count > 1 ? ` (${e.progress}/${s.count})` : '';
  return `${q.title}: ${s.text}${count}`;
}
