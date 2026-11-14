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

/** Heiltränke (Spec §7.4): höchstens, Heilung (Anteil am höchsten Leben), Sperre danach (s), Preis, Startbestand. */
export const POTION = { max: 4, heal: 0.4, lockSeconds: 2, price: 25, start: 2 };

/** Waffenart je Klasse; `null` = jede Waffenart (Spec §11.2). */
export const CLASS_WEAPON = { krieger: 'nahkampf', magier: 'zauber', dieb: 'wurf', hochstapler: null };

/**
 * Schmied (Spec §11.3): Zuwachs je Stufe (Anteil des Grundwerts), Gold je Seltenheit für die Stufen +1 bis +5,
 * Flussperlen je Stufe.
 */
export const SMITH = {
  stepPct: 0.2,
  gold: { gewoehnlich: [20, 40, 80, 160, 320], selten: [40, 80, 160, 320, 640], legendaer: [100, 200, 400, 800, 1600] },
  pearls: [0, 0, 0, 1, 2],
  maxLevel: 5,
};

/** Händler Krümel (Spec §11.4): Preis = Gegenwert × `priceFactor`; feste Auswahl gewöhnlicher Stücke aus Kapitel 1. */
export const SHOP = {
  priceFactor: 5,
  stock: ['eimerhelm', 'regenponcho', 'gummistiefel', 'paddel', 'treibholzstab', 'angel'],
};

/** Höchstes Abenteuer-Level (Etappe 1). */
export const MAX_ADVENTURE_LEVEL = 30;

/**
 * Level im Abenteuer (Spec §7.2/§7.3): Fähigkeiten der Klasse werden mit diesen Leveln frei (Reihenfolge `abilityPool`),
 * Zuwachs je Level über 1, Erfahrungskurve `xpToNextAdventure(level) = xp.base + xp.step × (level − 1)`.
 */
export const ADVENTURE_LEVEL = { unlockAt: [2, 4, 6, 8], perLevel: { maxHp: 0.06, damage: 0.04 }, xp: { base: 70, step: 50 } };

/**
 * Fähigkeiten von Hand (Spec §7.3): Schaden × `damageMul`, Abklingzeit × `cooldownMul`, mindestens `minCooldown`;
 * Umlauf wirkt `orbitSeconds` und hat `orbitCooldown`; Stärkungen wirken `buffSeconds`.
 */
export const MANUAL = { damageMul: 2.5, cooldownMul: 2.5, minCooldown: 6, orbitSeconds: 8, orbitCooldown: 16, buffSeconds: 8 };

/**
 * „Nicht so schnell sterben“ (Spec §8.1): Leben des Helden (+ Anteil, also × 3), Schaden der Gegner, Abstand der
 * Berührungstreffer eines Gegners (s, Wellen-Modus 0,5).
 */
export const ADVENTURE_BALANCE = { heroHpMul: 2, enemyDamageMul: 0.28, contactInterval: 1 };

/** Gebietsstufe (Spec §8.2): Zuwachs je Stufe über 1 für Leben, Schaden und Erfahrung der Gegner. */
export const AREA_SCALE = { hp: 0.18, damage: 0.12, xp: 0.15 };

/**
 * Gegnergruppen (Spec §8.1): Aufmerksamkeit (m), Leine (m vom Ort der Gruppe), ab welcher Nähe eine Gruppe in der
 * Welt steht (m; darüber wird sie nicht berechnet, mit `despawnPad` Spielraum), Umherlaufen um den Ort (m),
 * Abstand der Gegner beim Erscheinen (m).
 */
export const PACK = { aggro: 10, leash: 25, active: 40, despawnPad: 6, wanderRadius: 4, spread: 2.5 };

/** Tod (Spec §8.5): Goldverlust (Anteil, Deckel) und Dauer der Sterbephase (s). */
export const DEATH = { goldPct: 0.05, goldMax: 200, seconds: 1.2 };

/** Reichweite für Sprechen, Rasten, Untersuchen, Öffnen (m). */
export const INTERACT_RANGE = 2.2;

/** Bis zu dieser Entfernung gilt die Umgebung auf der Minikarte als gesehen (m). */
export const EXPLORE_RADIUS = 20;

/** Abstand vom Lagerfeuer, an dem der Held nach Rasten, Reisen oder Aufwachen steht (m). */
export const CAMPFIRE_OFFSET = 1.6;

/**
 * Aussehen der Karten, solange die Bilder des Abenteuers fehlen: Radius der Randbäume und -felsen (m), Anteil der
 * Wegbreite, der als Erdweg gezeichnet wird, Farben von Weg, Wasser und Brücke, Häuser (Breite, Höhe, Tiefe in m,
 * Wand- und Dachfarbe) und eine Farbe je Person.
 */
export const MAP_LOOK = {
  borderRadius: { tree: 0.75, rock: 1.0 },
  pathWidthShare: 0.7,
  path: 0x8a7150,
  water: 0x4d86a6,
  bridge: 0x7a5530,
  props: {
    haus_oma: { house: [6, 3, 5], wall: 0x9c8a6a, roof: 0x5f7a3a },
    laden: { house: [5, 2.6, 4], wall: 0xb59a6a, roof: 0xb04a3a },
    schmiede: { house: [5, 2.8, 5], wall: 0x7a6a5a, roof: 0x4a4a4a },
    wohnhaus: { house: [4.5, 2.6, 4], wall: 0xa89070, roof: 0x7a5a3a },
    wohnhaus2: { house: [4, 2.4, 4], wall: 0xa08868, roof: 0x6a7a4a },
  },
  npcs: {
    panzerla: 0x6f8a4a, kruemel: 0xd29a5a, grabowski: 0x4a4048, nussa: 0xc0622e, pieps: 0x9a7a5a, amsel: 0x2a2a2a,
  },
};

/** Minikarte: Kantenlänge in Pixeln, gezeigter Umkreis in Metern, Größe der Nebelblöcke (wie die Erkundung). */
export const MINIMAP = { size: 112, radius: 45, block: EXPLORE_BLOCK };

/** Namen der Lagerfeuer für das Reisen. */
export const CAMPFIRE_NAMES = {
  dorf_platz: 'Bachwinkel', k1_ufer: 'Bachufer', k1_bruecke: 'Alte Brücke', k1_wald: 'Tiefer Wald', k1_quelle: 'Quellteich',
};

/** Sprüche am Ladentisch und in der Schmiede. */
export const SHOP_LINES = ['Alles muss raus. Außer mir.', 'Heiltränke! Frisch abgefüllt, kaum benutzt.', 'Meine Backen sind voll. Mein Laden auch.'];
export const SMITH_LINES = ['Das wird schön. Oder wenigstens schwer.', 'Gutes Werkzeug braucht Gold. Und Geduld. Hauptsächlich Gold.', 'Hämmern ist wie Umarmen. Nur lauter.'];

/** Der Bosskampf beginnt erst so weit (m) innerhalb des Arenakreises, damit das Tor hinter dem Helden schließt. */
export const ARENA_INSET = 2.5;

/** Unterklassen (Etappe 2, Spec §4): Wahl ab Level, Kosten zum Freischalten einer Astfähigkeit (Punkte), Umlernen (Gold). */
export const SUBCLASS_RULES = { chooseLevel: 10, unlockCost: 1, respecGold: 500 };
