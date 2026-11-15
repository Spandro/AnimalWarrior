// Gesprächskasten unten (Spec §10.2): Porträt (Kopf aus `bewohner.webp`, sonst ein Kreis mit Anfangsbuchstaben), Name,
// ein Satz nach dem anderen. Weiter mit Tippen, Klick, Leertaste oder Enter; am Ende eines Nebenauftrags „Mach ich!“ oder „Später“.
import { el } from './dom.js';
import { NPCS } from '../data/dialogues.js';
import { NPC_PORTRAITS } from '../data/sprites.js';
import { probeImage } from './tavern.js';

/** Kantenlänge des Porträts in Pixeln (wie `.dialogue-portrait` in styles.css). */
const PORTRAIT_SIZE = 56;

/**
 * Porträt einer Person: Kopf-Ausschnitt aus `bewohner.webp`, sobald das Bild da ist und die Person ausgemessen ist
 * (wie die Wirte der Taverne), sonst ein Kreis mit dem Anfangsbuchstaben.
 * @param {string} npc
 * @param {string} name
 */
export function npcPortrait(npc, name) {
  const box = el('div', { class: 'dialogue-portrait', 'aria-hidden': 'true', text: name.charAt(0) });
  const rect = NPC_PORTRAITS.rects[npc];
  if (!rect) return box;
  probeImage(NPC_PORTRAITS.sheet).then((img) => {
    if (!img || !box.isConnected) return;
    const k = PORTRAIT_SIZE / Math.max(rect.w, rect.h);
    box.style.backgroundImage = `url('${NPC_PORTRAITS.sheet}')`;
    box.style.backgroundSize = `${img.naturalWidth * k}px ${img.naturalHeight * k}px`;
    box.style.backgroundPosition = `${(PORTRAIT_SIZE - rect.w * k) / 2 - rect.x * k}px ${(PORTRAIT_SIZE - rect.h * k) / 2 - rect.y * k}px`;
    box.classList.add('dialogue-portrait-image');
    box.textContent = '';
  });
  return box;
}

/**
 * @param {HTMLElement} uiLayer
 * @param {{ npc: string, speaker: string, lines: string[], choice?: boolean }} talk
 * @returns {Promise<'accept'|'later'|'done'>}
 */
export function showDialogue(uiLayer, { npc, speaker, lines, choice = false }) {
  return new Promise((resolve) => {
    let index = 0;
    const portrait = npcPortrait(npc, NPCS[npc]?.name ?? speaker);
    const text = el('p', { class: 'dialogue-text', 'aria-live': 'polite' });
    const next = el('button', { class: 'btn btn-primary dialogue-next', type: 'button' }, 'Weiter ▸');
    const accept = el('button', { class: 'btn btn-primary', type: 'button', hidden: true }, 'Mach ich!');
    const later = el('button', { class: 'btn', type: 'button', hidden: true }, 'Später');
    const box = el('div', { class: 'dialogue', role: 'dialog', 'aria-modal': 'true', 'aria-label': `Gespräch mit ${speaker}`, 'data-ui-control': true },
      portrait,
      el('div', { class: 'dialogue-body' }, el('strong', { class: 'dialogue-name', text: speaker }), text,
        el('div', { class: 'dialogue-actions' }, next, accept, later)));
    uiLayer.append(box);

    const last = () => index >= lines.length - 1;
    function show() {
      text.textContent = lines[index];
      const ask = choice && last();
      next.hidden = ask;
      accept.hidden = later.hidden = !ask;
      (ask ? accept : next).focus({ preventScroll: true });
      if (!ask) next.textContent = last() ? 'Fertig' : 'Weiter ▸';
    }
    function close(result) {
      window.removeEventListener('keydown', onKey, true);
      box.remove();
      resolve(result);
    }
    function advance() {
      if (choice && last()) return;
      if (last()) close('done');
      else { index++; show(); }
    }
    function onKey(e) {
      if (e.repeat) return;
      if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); close(choice ? 'later' : 'done'); return; }
      if ((e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') && !(choice && last())) { e.preventDefault(); e.stopPropagation(); advance(); }
    }
    next.addEventListener('click', (e) => { e.stopPropagation(); advance(); });
    accept.addEventListener('click', () => close('accept'));
    later.addEventListener('click', () => close('later'));
    box.addEventListener('click', (e) => { if (e.target === box || e.target === text || e.target === portrait) advance(); });
    window.addEventListener('keydown', onKey, true);
    show();
  });
}
