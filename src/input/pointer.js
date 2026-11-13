// Zeigersteuerung: Finger oder Maus ziehen vom Ansatzpunkt aus in die Laufrichtung.
// createPointerState und combineMove sind reine Logik; nur attachPointer berührt die Seite.
import { POINTER } from '../data/input.js';

const STILL = Object.freeze({ moveX: 0, moveZ: 0 });

/**
 * @typedef {{ down(id: number, x: number, y: number): void, move(id: number, x: number, y: number): void,
 *   up(id: number): void, cancel(id: number): void, reset(): void, active(): boolean,
 *   anchor(): { x: number, y: number } | null, knob(): { x: number, y: number } | null,
 *   readMoveVector(): { moveX: number, moveZ: number } }} PointerState
 */

/**
 * Zustand der Zeigersteuerung. Nur der erste Zeiger steuert, weitere werden ignoriert.
 * Rechts im Bild ist moveX = 1, unten im Bild moveZ = 1. Außerhalb der Totzone ist der Vektor
 * auf Länge 1 normiert. Ist der Zeiger weiter als `followDistance` entfernt, wandert der
 * Ansatzpunkt auf der Verbindungslinie nach.
 * @returns {PointerState}
 */
export function createPointerState() {
  /** @type {number | null} */
  let id = null;
  let ax = 0, ay = 0, px = 0, py = 0;

  const end = () => { id = null; };
  return {
    down(pid, x, y) {
      if (id !== null) return;
      id = pid; ax = px = x; ay = py = y;
    },
    move(pid, x, y) {
      if (pid !== id) return;
      px = x; py = y;
      const dx = px - ax, dy = py - ay, d = Math.hypot(dx, dy);
      if (d > POINTER.followDistance) {
        const k = POINTER.followDistance / d;
        ax = px - dx * k; ay = py - dy * k;
      }
    },
    up(pid) { if (pid === id) end(); },
    cancel(pid) { if (pid === id) end(); },
    reset: end,
    active: () => id !== null,
    anchor: () => (id === null ? null : { x: ax, y: ay }),
    knob: () => (id === null ? null : { x: px, y: py }),
    readMoveVector() {
      if (id === null) return { ...STILL };
      const dx = px - ax, dy = py - ay, d = Math.hypot(dx, dy);
      if (d <= POINTER.deadZone) return { ...STILL };
      return { moveX: dx / d, moveZ: dy / d };
    },
  };
}

/**
 * Tastatur hat Vorrang: ist ihr Vektor ungleich null, gilt er, sonst der des Zeigers.
 * @param {{ moveX: number, moveZ: number }} keyVector
 * @param {{ moveX: number, moveZ: number }} pointerVector
 * @returns {{ moveX: number, moveZ: number }}
 */
export function combineMove(keyVector, pointerVector) {
  if (keyVector.moveX !== 0 || keyVector.moveZ !== 0) return { moveX: keyVector.moveX, moveZ: keyVector.moveZ };
  return { moveX: pointerVector.moveX, moveZ: pointerVector.moveZ };
}

/**
 * Hängt Zeigerereignisse an `target` (die Spielfläche). Zeiger, die auf einem Element mit
 * `data-ui-control` (oder darin) beginnen, steuern nicht; bei der Maus zählt nur die linke Taste.
 * Der Zeiger wird erfasst, damit ein Zug über den Rand hinaus weiter steuert und das Loslassen
 * ankommt. Solange `isBlocked()` wahr ist, sowie bei `blur` und `visibilitychange` wird zurückgesetzt.
 * @param {HTMLElement} target
 * @param {PointerState} pointerState
 * @param {{ isBlocked: () => boolean }} options
 * @returns {() => void} löst die Ereignisse wieder
 */
export function attachPointer(target, pointerState, { isBlocked }) {
  /** @param {PointerEvent} e */
  const onDown = (e) => {
    if (isBlocked()) { pointerState.reset(); return; }
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target instanceof Element && e.target.closest('[data-ui-control]')) return;
    if (pointerState.active()) return;
    e.preventDefault();
    pointerState.down(e.pointerId, e.clientX, e.clientY);
    try { target.setPointerCapture(e.pointerId); } catch { /* Zeiger schon weg */ }
  };
  /** @param {PointerEvent} e */
  const onMove = (e) => {
    if (isBlocked()) { pointerState.reset(); return; }
    pointerState.move(e.pointerId, e.clientX, e.clientY);
  };
  /** @param {PointerEvent} e */
  const onUp = (e) => pointerState.up(e.pointerId);
  /** @param {PointerEvent} e */
  const onCancel = (e) => pointerState.cancel(e.pointerId);
  const onReset = () => pointerState.reset();
  const onContextMenu = (e) => e.preventDefault();

  target.addEventListener('pointerdown', onDown);
  target.addEventListener('pointermove', onMove);
  target.addEventListener('pointerup', onUp);
  target.addEventListener('pointercancel', onCancel);
  target.addEventListener('lostpointercapture', onCancel);
  target.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('blur', onReset);
  document.addEventListener('visibilitychange', onReset);
  return () => {
    target.removeEventListener('pointerdown', onDown);
    target.removeEventListener('pointermove', onMove);
    target.removeEventListener('pointerup', onUp);
    target.removeEventListener('pointercancel', onCancel);
    target.removeEventListener('lostpointercapture', onCancel);
    target.removeEventListener('contextmenu', onContextMenu);
    window.removeEventListener('blur', onReset);
    document.removeEventListener('visibilitychange', onReset);
    pointerState.reset();
  };
}
