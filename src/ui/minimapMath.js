// Rechnungen der Minikarte ohne DOM (getestet in tests/minimap.test.js).

/**
 * Pfeil am Rand der Minikarte für ein Ziel außerhalb: Punkt auf dem Rand des Quadrats mit halber Kantenlänge
 * `half` (Meter um den Helden) in Richtung des Ziels und Winkel der Richtung; `null`, wenn das Ziel innerhalb liegt.
 * Koordinaten wie in der Welt: x nach rechts, y = z nach unten.
 * @returns {{ x: number, y: number, angle: number } | null}
 */
export function edgeArrow(heroX, heroZ, targetX, targetZ, half) {
  const dx = targetX - heroX, dz = targetZ - heroZ;
  const m = Math.max(Math.abs(dx), Math.abs(dz));
  if (m <= half) return null;
  const k = half / m;
  return { x: dx * k, y: dz * k, angle: Math.atan2(dz, dx) };
}
