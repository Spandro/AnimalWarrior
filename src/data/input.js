// Zahlen für die Zeigersteuerung (Finger und Maus), alle in CSS-Pixeln.

/**
 * @typedef {{ deadZone: number, followDistance: number }} PointerTuning
 *   `deadZone`: Abstand vom Ansatzpunkt, bis zu dem der Held steht.
 *   `followDistance`: weiter weg wandert der Ansatzpunkt mit dem Zeiger mit.
 */

/** @type {PointerTuning} */
export const POINTER = { deadZone: 12, followDistance: 70 };

/**
 * Aussehen des Steuerkreuzes im Spiel (CSS-Pixel).
 * @typedef {{ ringSize: number, knobSize: number }} StickLook
 */
/** @type {StickLook} */
export const STICK = { ringSize: 110, knobSize: 44 };
