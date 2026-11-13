// Sichtbares Steuerkreuz: blasser Ring am Ansatzpunkt, Knopf in Zugrichtung. Nur sichtbar, solange ein Zeiger steuert.
import { el } from './dom.js';
import { STICK } from '../data/input.js';

/**
 * @param {HTMLElement} uiLayer
 * @returns {{ update(pointerState: import('../input/pointer.js').PointerState): void, dispose(): void }}
 */
export function createStick(uiLayer) {
  const ring = el('div', { class: 'stick-ring', 'aria-hidden': 'true' });
  const knob = el('div', { class: 'stick-knob', 'aria-hidden': 'true' });
  ring.style.width = ring.style.height = `${STICK.ringSize}px`;
  knob.style.width = knob.style.height = `${STICK.knobSize}px`;
  ring.hidden = knob.hidden = true;
  uiLayer.append(ring, knob);
  let visible = false;
  const reach = (STICK.ringSize - STICK.knobSize) / 2 + STICK.knobSize / 2;

  return {
    update(pointerState) {
      const a = pointerState.anchor(), k = pointerState.knob();
      if (!a || !k) {
        if (visible) { ring.hidden = knob.hidden = true; visible = false; }
        return;
      }
      if (!visible) { ring.hidden = knob.hidden = false; visible = true; }
      const dx = k.x - a.x, dy = k.y - a.y, d = Math.hypot(dx, dy);
      const s = d > reach ? reach / d : 1;
      ring.style.transform = `translate(${a.x - STICK.ringSize / 2}px, ${a.y - STICK.ringSize / 2}px)`;
      knob.style.transform = `translate(${a.x + dx * s - STICK.knobSize / 2}px, ${a.y + dy * s - STICK.knobSize / 2}px)`;
    },
    dispose() { ring.remove(); knob.remove(); },
  };
}
