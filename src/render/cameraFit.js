// Kameraabstand je Seitenverhältnis: Hochkant ist das Bild schmal, deshalb rückt die Kamera zurück,
// bis links und rechts genug Welt zu sehen ist. Quer bleibt es beim bisherigen Abstand.
// Reine Rechnung ohne Three.js, damit sie ohne Browser geprüft werden kann.
import { CAMERA_FIT } from '../data/sprites.js';

/**
 * Halbe sichtbare Breite auf Bodenhöhe durch den Zielpunkt, in Weltmetern.
 *
 * Die Kamera blickt den Zielpunkt an, er liegt also genau `distance` vor der Linse. Die waagerechte
 * Linie durch den Zielpunkt liegt vollständig in dieser Entfernung (jeder ihrer Punkte hat denselben
 * Abstand zur Bildebene), daher gilt schlicht die Strahlensatz-Breite des Sichtkegels. Der Höhenwinkel
 * spielt dabei keine Rolle: Er streckt die sichtbare Fläche nur in die Tiefe, nicht in die Breite.
 * Er steht trotzdem in der Signatur, damit Aufrufer die Kameralage vollständig übergeben.
 *
 * @param {number} distance Abstand der Kamera zum Zielpunkt
 * @param {number} aspect Breite geteilt durch Höhe der Zeichenfläche
 * @param {number} fovDeg senkrechter Blickwinkel in Grad (wie bei Three.js)
 * @param {number} _elevationDeg Höhenwinkel der Kamera über dem Boden in Grad (ohne Einfluss, siehe oben)
 * @returns {number}
 */
export function visibleHalfWidth(distance, aspect, fovDeg, _elevationDeg) {
  return distance * Math.tan((fovDeg * Math.PI) / 360) * aspect;
}

/**
 * Abstand, mit dem die Kamera einem Zielpunkt folgt: der bisherige Abstand, solange damit mindestens
 * `CAMERA_FIT.minHalfWidth` zu beiden Seiten sichtbar ist, sonst der kleinste Abstand, der das schafft –
 * höchstens `CAMERA_FIT.maxDistance`.
 * @param {number} aspect Breite geteilt durch Höhe der Zeichenfläche
 * @param {number} fovDeg senkrechter Blickwinkel in Grad
 * @param {number} elevationDeg Höhenwinkel der Kamera über dem Boden in Grad
 * @returns {number}
 */
export function cameraDistanceFor(aspect, fovDeg, elevationDeg) {
  const { landscapeDistance, minHalfWidth, maxDistance } = CAMERA_FIT;
  if (!(aspect > 0)) return landscapeDistance;
  if (visibleHalfWidth(landscapeDistance, aspect, fovDeg, elevationDeg) >= minHalfWidth) return landscapeDistance;
  const needed = minHalfWidth / (Math.tan((fovDeg * Math.PI) / 360) * aspect);
  return Math.min(needed, maxDistance);
}
