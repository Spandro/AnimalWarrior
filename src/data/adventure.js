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

/** Material für den Schmied (Verbesserung +4 und +5). Eine Art je Kapitel. */
export const MATERIALS = {
  flussperle: { id: 'flussperle', name: 'Flussperle', line: 'Glänzt wie Flossians Eitelkeit.' },
};

/**
 * Beute im Abenteuer (Spec §11.1, §7.4): Chance auf einen Gegenstand je besiegtem Gegner und je Elite, Mindestseltenheit
 * der Bossbeute, Trankchance je Gegner, Flussperlen von Elite-Gegnern (Chance) und Bossen (Anzahl je Boss-Kennung),
 * Gold je Gegner (Chance, Spanne).
 */
export const LOOT = {
  enemyChance: 0.015,
  eliteChance: 0.10,
  bossMinRarity: 'selten',
  potionChance: 0.03,
  elitePearlChance: 0.05,
  bossPearls: { graete: 2, zwickzwack: 3 },
  goldChance: 0.25,
  gold: [1, 4],
};
