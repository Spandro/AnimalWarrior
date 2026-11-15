// Zahlen des Abenteuer-Modus: Kartenraster, Gruppen, Tränke, Tod, Level, Fähigkeiten von Hand, Beute, Schmied, Händler.
// Nur Zahlen und Tabellen; die Regeln stehen in src/core und src/modes/adventure.js.

/** Kantenlänge einer Rasterzelle der Karte in Metern. */
export const MAP_CELL = 1;

/**
 * Gelände (Etappe 3, Spec §4.1, §4.2, §14.1): Tempo-Faktor auf Schlamm für Laufende (nicht fliegend, nicht `mudproof`);
 * Strömung schiebt Laufende mit `currentSpeed` m/s in Flussrichtung (nicht Flieger, nicht `swimmer`); gegen die Strömung
 * kommt der Held immer mit mindestens `heroHeadway` m/s voran (sein Schub ist höchstens wirksames Tempo − `heroHeadway`).
 */
export const TERRAIN = { mudSpeed: 0.65, currentSpeed: 2.5, heroHeadway: 1 };

/**
 * Wegspülen beim Fluten einer Schleusenfläche (Spec §4.2): Gegner verlieren `enemyPct` ihres höchsten Lebens (Bosse
 * höchstens `bossMaxPct`) und werden auf Strömung `push` m in Flussrichtung geschoben, aus Wasser an die nächste begehbare
 * Stelle; der Held kommt ohne Schaden ans nächste Ufer im Umkreis `searchRadius`, sonst ans Lagerfeuer.
 */
export const WASH = { enemyPct: 0.35, bossMaxPct: 0.05, push: 6, searchRadius: 40 };

/**
 * Moorblasen (Spec §4.1, §14.1): nächste Blase nach `minInterval`–`maxInterval` s, Ort im Umkreis `range` (m) um den
 * Helden auf Schlamm (bis `tries` Versuche, sonst diese Runde keine), Vorwarnung `warn` s, Radius `radius` (m); Schaden:
 * Held `heroPct` seines höchsten Lebens, Gegner `enemyShare` × Leben eines Ochsenfroschs der Kartenstufe, Bosse höchstens
 * `bossMaxPct` ihres Lebens; nie näher als `campfireClear` (m) an einem Lagerfeuer.
 */
export const BUBBLES = {
  minInterval: 3, maxInterval: 5, range: 14, warn: 1.2, radius: 1.8, heroPct: 0.08, enemyShare: 2 / 3, bossMaxPct: 0.05,
  campfireClear: 6, tries: 12,
};

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
  bossPearls: { graete: 2, zwickzwack: 3, quak: 3, haudrauf: 4, nagezahn: 4, flossenbart: 5 },
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

/**
 * Händler Krümel (Spec §11.4, Etappe 3 §8): Preis = Gegenwert × `priceFactor`; Auswahl gewöhnlicher Stücke je Kapitel.
 * Die von Kapitel 1 gibt es immer, die eines späteren Kapitels, sobald das Kapitel davor abgeschlossen ist.
 */
export const SHOP = {
  priceFactor: 5,
  stockByChapter: {
    1: ['eimerhelm', 'regenponcho', 'gummistiefel', 'paddel', 'treibholzstab', 'angel'],
    2: ['schilfhelm', 'moorstiefel', 'unkenamulett', 'rohrkolbenstab'],
    3: ['bauhelm', 'watstiefel', 'schwimmweste', 'zollstock'],
  },
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
 * Aussehen der Karten: Radius der Randbäume und -felsen (m), Abstand (m) um Häuser und Kleinkram (`propClear`) sowie um
 * Leute, Lagerfeuer, Kisten und Fundorte (`thingClear`), in dem keine Randbäume und -felsen stehen (sonst verdecken sie
 * diese), Anteil der Wegbreite, der als Erdweg gezeichnet wird; wenn die
 * Bilder des Abenteuers fehlen: Farben von Weg, Wasser, Brücke und Schlamm, Ring an Ausgängen, Moorblasen, Häuser (Breite, Höhe, Tiefe in m, Wand- und
 * Dachfarbe) und eine Farbe je Person.
 */
export const MAP_LOOK = {
  borderRadius: { tree: 0.75, rock: 1.0 },
  propClear: { haus_oma: 6, laden: 5, schmiede: 6, wohnhaus: 5.5, wohnhaus2: 5.5, brunnen: 2.5, wegweiser: 2, zaun: 2.5, flugblatt: 1.5 },
  thingClear: 3,
  pathWidthShare: 0.7,
  path: 0x8a7150,
  water: 0x4d86a6,
  bridge: 0x7a5530,
  /** Schlamm (Kapitel 2, bis Bilder kommen): Farbe braun-grün, Höhe über dem Boden (m). */
  mud: { color: 0x5b5a30, y: 0.035 },
  /** Ring an offenen Ausgängen: Farbe, Deckkraft. */
  exit: { color: 0xffe08a, opacity: 0.45 },
  /** Moorblasen: Farbe des blubbernden Kreises und der Spritzer. */
  bubble: { ring: 0xf0f070, fill: 0xd8e040, splash: 0x5a4a2a },
  /** Vom Blutegel gebremst: dunkelroter Ring um den Helden, solange es wirkt, und kurz ein Wort über ihm. */
  leech: { color: 0x9a2a3a, opacity: 0.7, text: 'Gebremst' },
  /** Bretter der Brücke, wenn Weg und Bach gemalt sind: Bretter je Kachel, Kachel in m, Fugenfarbe, Helligkeitsstreuung. */
  planks: { count: 8, tileM: 2.4, gap: 0x3a2614, spread: 0.18 },
  props: {
    haus_oma: { house: [6, 3, 5], wall: 0x9c8a6a, roof: 0x5f7a3a },
    laden: { house: [5, 2.6, 4], wall: 0xb59a6a, roof: 0xb04a3a },
    schmiede: { house: [5, 2.8, 5], wall: 0x7a6a5a, roof: 0x4a4a4a },
    wohnhaus: { house: [4.5, 2.6, 4], wall: 0xa89070, roof: 0x7a5a3a },
    wohnhaus2: { house: [4, 2.4, 4], wall: 0xa08868, roof: 0x6a7a4a },
  },
  npcs: {
    panzerla: 0x6f8a4a, kruemel: 0xd29a5a, grabowski: 0x4a4048, nussa: 0xc0622e, pieps: 0x9a7a5a, amsel: 0x2a2a2a,
    quappe: 0x6a5a3a,
    rinde: 0x7a5232,
    nagezahn: 0x8a6440,
  },
};

/**
 * Minikarte: Kantenlänge in Pixeln, gezeigter Umkreis in Metern, Größe der Nebelblöcke (wie die Erkundung), Farbe je
 * Zellart des Kartenrasters (Namen wie `CELL` in src/core/mapGrid.js).
 */
export const MINIMAP = {
  size: 112, radius: 45, block: EXPLORE_BLOCK,
  colors: { blocked: '#2e3b25', walk: '#b8a77a', water: '#4d86a6', bridge: '#8a6a45', mud: '#6e6a3c', current: '#5fa8d0' },
};

/** Namen der Lagerfeuer für das Reisen. */
export const CAMPFIRE_NAMES = {
  dorf_platz: 'Bachwinkel', k1_ufer: 'Bachufer', k1_bruecke: 'Alte Brücke', k1_wald: 'Tiefer Wald', k1_quelle: 'Quellteich',
  k2_rand: 'Sumpfrand', k2_froschhof: 'Froschhof', k2_nebel: 'Nebelmoor', k2_hecht: 'Hechtloch',
  k3_ufer: 'Dammufer', k3_muehle: 'Mühlgraben', k3_auwald: 'Auwald', k3_stausee: 'Stausee',
};

/** Sprüche am Ladentisch und in der Schmiede. */
export const SHOP_LINES = ['Alles muss raus. Außer mir.', 'Heiltränke! Frisch abgefüllt, kaum benutzt.', 'Meine Backen sind voll. Mein Laden auch.'];
export const SMITH_LINES = ['Das wird schön. Oder wenigstens schwer.', 'Gutes Werkzeug braucht Gold. Und Geduld. Hauptsächlich Gold.', 'Hämmern ist wie Umarmen. Nur lauter.'];

/** Der Bosskampf beginnt erst so weit (m) innerhalb des Arenakreises, damit das Tor hinter dem Helden schließt. */
export const ARENA_INSET = 2.5;

/** Unterklassen (Etappe 2, Spec §4): Wahl ab Level, Kosten zum Freischalten einer Astfähigkeit (Punkte), Umlernen (Gold). */
export const SUBCLASS_RULES = { chooseLevel: 10, unlockCost: 1, respecGold: 500 };

/**
 * Regeln der Besonderheiten (Spec §6), soweit sie nicht in den Fähigkeitswerten stehen: Raserei erreicht ihren vollen
 * Bonus bei diesem Anteil Leben; Abstand (m), in dem Haustier und Wolke dem Helden folgen; Abstand der Beschwörungen
 * von „Familientreffen“ zueinander (m).
 */
export const SIGNATURE_RULES = { rageFullAtHp: 0.25, followDistance: 1.5, summonSpread: 1.5 };

/**
 * Aussehen der Besonderheiten (Spec §7, einfache Formen statt Bilder): Farben, Größen (m), Höhen (m), Deckkraft;
 * `stealthOpacity`: Deckkraft des unsichtbaren Helden.
 */
export const SIGNATURE_LOOK = {
  shield: { color: 0x7ab8ff, radius: 0.95, opacity: 0.22 },
  rage: { color: 0xff3a2a, radius: 0.85, opacity: 0.18 },
  stealthOpacity: 0.35,
  cloud: { color: 0x8a8f9a, radius: 0.55, height: 2.6, opacity: 0.85 },
  pet: { color: 0xc49a5a, radius: 0.18, height: 0.45 },
  trap: { color: 0x4a4a4a, edge: 0x9a9aa2, opacity: 0.8 },
  mark: { color: 0xff3a3a, opacity: 0.85, pad: 0.25 },
  pot: { color: 0x6a4a2a, radius: 0.45, height: 0.5 },
};
