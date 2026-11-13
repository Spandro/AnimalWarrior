// Welche Qualität beim allerersten Start gilt, solange es noch keinen Spielstand gibt.
// Rein, damit sie ohne Browser geprüft werden kann; `main.js` reicht das Ergebnis von
// matchMedia('(pointer: coarse)') hinein.

/**
 * Geräte, die hauptsächlich mit dem Finger bedient werden, starten sparsam (keine Schatten,
 * einfache Auflösung). In den Einstellungen lässt sich das jederzeit umstellen.
 * @param {boolean} isTouchPrimary
 * @returns {'low'|'high'}
 */
export function initialQuality(isTouchPrimary) {
  return isTouchPrimary ? 'low' : 'high';
}
