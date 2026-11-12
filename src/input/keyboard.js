// Tastatureingabe: WASD und Pfeiltasten zum Laufen, Esc für Pause, 1–3 für Karten.

/** Richtung je Taste; oben am Bildschirm ist −z. */
const MOVE_KEYS = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

/** Tasten für die Kartenwahl → Index. */
const CARD_KEYS = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 };

/**
 * @typedef {{ down(code: string): void, up(code: string): void, clear(): void,
 *   readMoveVector(): { moveX: number, moveZ: number } }} KeyState
 */

/**
 * Gedrückte Bewegungstasten. Gegenläufige Richtungen heben sich auf; das Ergebnis ist nicht
 * normalisiert (das macht stepWorld).
 * @returns {KeyState}
 */
export function createKeyState() {
  /** @type {Set<string>} */
  const held = new Set();
  return {
    down(code) { if (Object.hasOwn(MOVE_KEYS, code)) held.add(code); },
    up(code) { held.delete(code); },
    clear() { held.clear(); },
    readMoveVector() {
      const dirs = new Set();
      for (const code of held) dirs.add(MOVE_KEYS[code]);
      return {
        moveX: (dirs.has('right') ? 1 : 0) - (dirs.has('left') ? 1 : 0),
        moveZ: (dirs.has('down') ? 1 : 0) - (dirs.has('up') ? 1 : 0),
      };
    },
  };
}

/**
 * Hängt Tastaturereignisse an `target` (meist window). Bei `blur` werden alle Tasten gelöst.
 * Tasten mit Strg/Alt/Meta bleiben dem Browser.
 * @param {Window|HTMLElement} target
 * @param {KeyState} keyState
 * @param {{ onPause?: () => void, onCardKey?: (index: number) => void }} [handlers]
 * @returns {() => void} löst die Ereignisse wieder
 */
export function attachKeyboard(target, keyState, { onPause, onCardKey } = {}) {
  /** @param {KeyboardEvent} e */
  const onKeyDown = (e) => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (Object.hasOwn(MOVE_KEYS, e.code)) {
      keyState.down(e.code);
      e.preventDefault();
    } else if (e.code === 'Escape') {
      if (e.repeat) return;
      e.preventDefault();
      onPause?.();
    } else if (Object.hasOwn(CARD_KEYS, e.code)) {
      if (e.repeat) return;
      e.preventDefault();
      onCardKey?.(CARD_KEYS[e.code]);
    }
  };
  /** @param {KeyboardEvent} e */
  const onKeyUp = (e) => keyState.up(e.code);
  const onBlur = () => keyState.clear();
  target.addEventListener('keydown', onKeyDown);
  target.addEventListener('keyup', onKeyUp);
  target.addEventListener('blur', onBlur);
  return () => {
    target.removeEventListener('keydown', onKeyDown);
    target.removeEventListener('keyup', onKeyUp);
    target.removeEventListener('blur', onBlur);
  };
}
