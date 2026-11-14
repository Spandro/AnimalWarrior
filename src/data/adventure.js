// Zahlen des Abenteuer-Modus: Kartenraster, Gruppen, Tränke, Tod, Level, Fähigkeiten von Hand, Beute, Schmied, Händler.
// Nur Zahlen und Tabellen; die Regeln stehen in src/core und src/modes/adventure.js.

/** Kantenlänge einer Rasterzelle der Karte in Metern. */
export const MAP_CELL = 1;

/** Halbe Breite eines geschlossenen Tors (Sperre) in Metern, gemessen von seinem Linienzug. */
export const GATE_HALF_WIDTH = 1.2;

/** Größe eines Erkundungsblocks der Minikarte in Metern. */
export const EXPLORE_BLOCK = 8;

/** Randdeko: Abstand der Prüfpunkte (Zellen), Suchweite zur begehbaren Fläche (Zellen), Chance je Punkt, Anteil Bäume. */
export const BORDER_DECOR = { step: 2, reach: 3, chance: 0.4, treeShare: 0.75 };
