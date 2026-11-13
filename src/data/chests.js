/**
 * Kisten, die auf der Karte stehen (Zahlen für Erzeugung, Öffnen und Hinweis).
 *
 * @typedef {{ weight: number, kind: 'gold', gold: [number, number] }
 *   | { weight: number, kind: 'heal', heal: number, gold: [number, number] }
 *   | { weight: number, kind: 'upgrade' }} ChestEntry
 *   `gold`: ganze Zahl aus diesem Bereich (inklusive); `heal`: Anteil der maximalen Lebenspunkte;
 *   `upgrade`: eine Karte wie beim Level-up (ohne Level).
 */
export const MAP_CHESTS = {
  /** Wahrscheinlichkeit, dass eine Gelände-Zelle eine Kiste bekommt (vor dem Ausschluss durch Hindernisse). */
  chancePerCell: 0.12,
  /** Um den Startpunkt (0,0) steht keine Kiste in diesem Radius. */
  clearRadius: 12,
  /** Der Held öffnet, sobald der Abstand der Mitten höchstens `openRadius + radius` beträgt. */
  openRadius: 1.2,
  /** Körperradius der Kiste; der Kreis berührt kein Hindernis. */
  radius: 0.5,
  /** Der Pfeil zeigt auf die nächste ungeöffnete Kiste innerhalb dieser Entfernung. */
  hintRange: 40,
  /** Die Kistenansicht zeichnet Kisten bis zu dieser Entfernung vom Helden. */
  viewRange: 30,
  /** @type {ChestEntry[]} */
  table: [
    { weight: 60, kind: 'gold', gold: [3, 8] },
    { weight: 30, kind: 'heal', heal: 0.25, gold: [2, 4] },
    { weight: 10, kind: 'upgrade' },
  ],
};

/**
 * Pfeil am Bildrand (CSS-Pixel): Abstand zum Rand, oben und unten größer, damit er keine Anzeige überdeckt.
 */
export const CHEST_HINT = { margin: 28, marginTop: 150, marginBottom: 80 };
