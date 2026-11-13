// Pfeil am Bildrand, der zur nächsten ungeöffneten Kiste zeigt, solange sie nicht im Bild ist.
import { el } from './dom.js';
import { nearestUnopenedChest } from '../core/chests.js';
import { MAP_CHESTS, CHEST_HINT } from '../data/chests.js';

/**
 * Der Held steht in der Bildmitte; Weltabstände werden über die sichtbaren Ausdehnungen auf Pixel abgebildet
 * (+x nach rechts, +z nach unten). Liegt die Kiste innerhalb des um die Ränder eingerückten Bildes, gibt es keinen
 * Pfeil. Sonst steht der Pfeil dort, wo der Strahl von der Bildmitte zur Kiste den eingerückten Rand trifft.
 *
 * Die schräge Kamera sieht nach vorn (−z, zur Bildoberkante) deutlich weiter als nach hinten (+z, zur Kamera hin),
 * deshalb nimmt die Rechnung dafür getrennte Werte. Fehlen sie, gilt `halfH` nach beiden Seiten.
 * @param {{ x: number, z: number }} hero Weltkoordinaten
 * @param {{ x: number, z: number }} chest Weltkoordinaten
 * @param {{ halfW: number, halfH?: number, front?: number, back?: number, width: number, height: number,
 *   margin: number, marginTop?: number, marginBottom?: number }} view
 *   sichtbare Ausdehnung in Weltmetern (`halfW` seitlich, `front` nach −z, `back` nach +z), Bildgröße und
 *   Randabstand in CSS-Pixeln; `marginTop` und `marginBottom` ersetzen `margin` oben und unten (z. B. wegen der Anzeige).
 * @returns {{ x: number, y: number, angle: number } | null} Pixelpunkt im Bild und Winkel im Bogenmaß
 *   (0 = nach rechts, im Uhrzeigersinn positiv)
 */
export function hintArrow(hero, chest, view) {
  const cx = view.width / 2, cy = view.height / 2;
  const dz = chest.z - hero.z;
  const reach = dz < 0 ? (view.front ?? view.halfH) : (view.back ?? view.halfH);
  const sx = ((chest.x - hero.x) / view.halfW) * cx;
  const sy = (dz / reach) * cy;
  const left = view.margin, right = view.width - view.margin;
  const top = view.marginTop ?? view.margin, bottom = view.height - (view.marginBottom ?? view.margin);
  const px = cx + sx, py = cy + sy;
  if (px >= left && px <= right && py >= top && py <= bottom) return null;
  // Strahl von der Mitte: kleinster Faktor, der ihn an den eingerückten Rand bringt.
  let k = Infinity;
  if (sx > 0) k = Math.min(k, (right - cx) / sx); else if (sx < 0) k = Math.min(k, (left - cx) / sx);
  if (sy > 0) k = Math.min(k, (bottom - cy) / sy); else if (sy < 0) k = Math.min(k, (top - cy) / sy);
  const x = cx + sx * k, y = cy + sy * k;
  return { x, y, angle: Math.atan2(y - cy, x - cx) };
}

/**
 * Ein kleines Pfeilelement in der Anzeige-Schicht; `update` setzt es je Bild (nur bei geänderter Lage schreiben).
 * Es bleibt verborgen, wenn keine ungeöffnete Kiste innerhalb von `hintRange` liegt, die Kiste im Bild ist
 * oder der Durchgang nicht läuft.
 * @param {HTMLElement} uiLayer
 * @returns {{ update(world: import('../core/world.js').World,
 *   view: { halfW: number, front?: number, back?: number, halfH?: number, width: number, height: number },
 *   state?: string): void, dispose(): void }}
 */
export function createChestHint(uiLayer) {
  const arrow = el('div', { class: 'chest-hint', 'aria-hidden': 'true', hidden: true });
  uiLayer.append(arrow);
  let shown = false, lastTransform = '';

  function hide() {
    if (shown) { arrow.hidden = true; shown = false; }
  }

  return {
    /**
     * @param {import('../core/world.js').World} world
     * @param {{ halfW: number, front?: number, back?: number, halfH?: number, width: number, height: number }} view
     * @param {string} [state] Zustand des Durchgangs; nur `playing` zeigt den Pfeil
     */
    update(world, view, state = 'playing') {
      if (state !== 'playing') { hide(); return; }
      const chest = nearestUnopenedChest(world, MAP_CHESTS.hintRange);
      const a = chest && hintArrow(world.hero, chest, { ...view, margin: CHEST_HINT.margin, marginTop: CHEST_HINT.marginTop, marginBottom: CHEST_HINT.marginBottom });
      if (!a) { hide(); return; }
      const transform = `translate(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px) translate(-50%, -50%) rotate(${a.angle.toFixed(3)}rad)`;
      if (transform !== lastTransform) { arrow.style.transform = transform; lastTransform = transform; }
      if (!shown) { arrow.hidden = false; shown = true; }
    },
    dispose() { arrow.remove(); },
  };
}
