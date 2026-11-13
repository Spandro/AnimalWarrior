// Level-up-Dialog: drei Karten, Auswahl per Klick oder Taste 1–3. Der Dialog wählt nicht selbst,
// sondern meldet den Index über onChoose (das Spiel ruft dann chooseCard).
import { el } from './dom.js';
import { describeCard } from './cardText.js';
import { abilityColor, abilityInitials } from './hud.js';

/** So lange nach dem Öffnen zählen Klicks nicht (gegen versehentliches Wählen mitten im Kampf). */
const CLICK_GUARD_MS = 300;

/** Symbol links auf der Karte: Fähigkeiten in ihrer Farbe mit Kürzel, sonst ein Zeichen je Art. */
function cardIcon(card) {
  if (card.kind === 'newAbility' || card.kind === 'abilityLevel') {
    const node = el('span', { class: 'levelup-icon', 'aria-hidden': 'true', text: abilityInitials(card.id) });
    node.style.setProperty('--ability-color', abilityColor(card.id));
    return node;
  }
  const glyph = { bonus: '✦', gold: '●', heal: '✚' }[card.kind] || '?';
  return el('span', { class: `levelup-icon levelup-icon-${card.kind}`, 'aria-hidden': 'true', text: glyph });
}

/**
 * @param {HTMLElement} uiLayer
 * @param {{ onChoose: (index: number) => void }} handlers
 * @returns {{ show(cards: import('../core/progression.js').Card[], world: import('../core/world.js').World, level: number): void,
 *   hide(): void, readonly open: boolean, choose(index: number): void, dispose(): void }}
 */
export function createLevelUpDialog(uiLayer, { onChoose }) {
  const title = el('h2', { id: 'levelup-title' });
  const list = el('div', { class: 'levelup-cards' });
  const root = el('div', { class: 'overlay levelup', 'data-ui-control': true, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'levelup-title', hidden: true },
    el('div', { class: 'levelup-box', tabindex: '-1' },
      title,
      el('p', { class: 'levelup-hint', text: 'Wähle eine Verbesserung – tippen, klicken oder Taste 1–3.' }),
      list));
  uiLayer.append(root);

  let open = false, openedAt = 0, count = 0;

  function choose(index) {
    if (!open || !Number.isInteger(index) || index < 0 || index >= count) return;
    hide();
    onChoose(index);
  }

  function show(cards, world, level) {
    title.textContent = `Stufe ${level} erreicht!`;
    count = cards.length;
    list.replaceChildren(...cards.map((card, i) => {
      const d = describeCard(card, world);
      return el('button', {
        class: `levelup-card levelup-${card.kind}`, type: 'button',
        'aria-label': `${i + 1}: ${d.title}, ${d.kind}. ${d.text}`,
        onclick: () => { if (performance.now() - openedAt >= CLICK_GUARD_MS) choose(i); },
      },
      el('span', { class: 'levelup-key', 'aria-hidden': 'true', text: String(i + 1) }),
      cardIcon(card),
      el('span', { class: 'levelup-body' },
        el('span', { class: 'levelup-name', text: d.title }),
        el('span', { class: 'levelup-kind', text: d.kind }),
        el('span', { class: 'levelup-text', text: d.text })));
    }));
    root.hidden = false;
    open = true;
    openedAt = performance.now();
    // Fokus auf den Dialog, nicht auf eine Karte: Leertaste oder Enter sollen nicht versehentlich wählen.
    root.firstElementChild.focus({ preventScroll: true });
  }

  function hide() {
    open = false;
    root.hidden = true;
    list.replaceChildren();
  }

  return {
    show, hide, choose,
    get open() { return open; },
    dispose() { root.remove(); },
  };
}
