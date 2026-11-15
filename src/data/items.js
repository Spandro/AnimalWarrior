/**
 * @typedef {import('./animals.js').Modifier} Modifier
 * @typedef {'kopf'|'koerper'|'fuesse'|'waffe'|'schmuck'} Slot
 * @typedef {'nahkampf'|'zauber'|'wurf'} WeaponKind
 * @typedef {'gewoehnlich'|'selten'|'legendaer'} Rarity
 * @typedef {'taverne'|'kapitel1'} ItemSource
 * @typedef {{ id: string, name: string, slot: Slot, weaponKind?: WeaponKind, rarity: Rarity, modifiers: Modifier[], line: string, icon: number,
 *   source: ItemSource }} ItemDef
 *   `source`: woher der Gegenstand kommt (Taverne oder ein Kapitel des Abenteuers); `icon`: Zelle in seinem Bogen ({@link itemSheet}).
 */

/**
 * Seltenheiten: Gewicht im Beutewurf, Gegenwert beim Verkauf eines Doppelten, Rahmenfarbe.
 * @type {Record<Rarity, { name: string, weight: number, resale: number, color: string }>}
 */
export const RARITIES = {
  gewoehnlich: { name: 'Gewöhnlich', weight: 70, resale: 10, color: '#9a9a9a' },
  selten: { name: 'Selten', weight: 25, resale: 30, color: '#4a8fd8' },
  legendaer: { name: 'Legendär', weight: 5, resale: 100, color: '#e0b020' },
};

/** @type {Record<Slot, string>} */
export const SLOT_NAMES = {
  kopf: 'Kopf',
  koerper: 'Körper',
  fuesse: 'Füße',
  waffe: 'Waffe',
  schmuck: 'Schmuck',
};

/**
 * Startkatalog. Reihenfolge und `icon` folgen dem Bildbogen (Spec Anhang A).
 * Kennungen werden nie gelöscht oder umbenannt; gespeichert werden nur Kennungen.
 * @type {Record<string, ItemDef>}
 */
export const ITEMS = {
  helm_zuversicht: { id: 'helm_zuversicht', name: 'Helm der mäßigen Zuversicht', slot: 'kopf', rarity: 'gewoehnlich', modifiers: [{ stat: 'armor', flat: 1 }], line: 'Sitzt. Meistens.', icon: 0, source: 'taverne' },
  topf_kinnriemen: { id: 'topf_kinnriemen', name: 'Topf mit Kinnriemen', slot: 'kopf', rarity: 'gewoehnlich', modifiers: [{ stat: 'maxHp', pct: 0.05 }], line: 'Früher war hier Suppe drin.', icon: 1, source: 'taverne' },
  denkerkappe: { id: 'denkerkappe', name: 'Denkerkappe mit Bommel', slot: 'kopf', rarity: 'selten', modifiers: [{ stat: 'xpGain', pct: 0.08 }], line: 'Klüger sieht man damit nicht aus. Ist man aber.', icon: 2, source: 'taverne' },
  federhut: { id: 'federhut', name: 'Federhut der Selbstüberschätzung', slot: 'kopf', rarity: 'selten', modifiers: [{ stat: 'critChance', flat: 0.05 }], line: 'Die Feder ist größer als der Mut.', icon: 3, source: 'taverne' },
  krone_kneipenkoenig: { id: 'krone_kneipenkoenig', name: 'Krone des Kneipenkönigs', slot: 'kopf', rarity: 'legendaer', modifiers: [{ stat: 'goldGain', pct: 0.15 }, { stat: 'armor', flat: 1 }], line: 'Gewonnen beim Würfeln. Ehrlich.', icon: 4, source: 'taverne' },
  wams_kartoffelsack: { id: 'wams_kartoffelsack', name: 'Wams aus Kartoffelsack', slot: 'koerper', rarity: 'gewoehnlich', modifiers: [{ stat: 'maxHp', pct: 0.05 }], line: 'Kratzt, hält aber warm.', icon: 5, source: 'taverne' },
  kettenhemd_luecken: { id: 'kettenhemd_luecken', name: 'Kettenhemd mit Lücken', slot: 'koerper', rarity: 'gewoehnlich', modifiers: [{ stat: 'armor', flat: 1 }], line: 'Lüftung inklusive.', icon: 6, source: 'taverne' },
  lederweste: { id: 'lederweste', name: 'Lederweste „Fast wie neu“', slot: 'koerper', rarity: 'gewoehnlich', modifiers: [{ stat: 'dodge', flat: 0.03 }], line: 'Nur ein Vorbesitzer. Glaub uns.', icon: 7, source: 'taverne' },
  schuppenpanzer: { id: 'schuppenpanzer', name: 'Schuppenpanzer des Drachen, der keiner war', slot: 'koerper', rarity: 'selten', modifiers: [{ stat: 'armor', flat: 2 }], line: 'Es war ein sehr großer Fisch.', icon: 8, source: 'taverne' },
  mantel_auftritte: { id: 'mantel_auftritte', name: 'Mantel der dramatischen Auftritte', slot: 'koerper', rarity: 'legendaer', modifiers: [{ stat: 'maxHp', pct: 0.10 }, { stat: 'dodge', flat: 0.05 }], line: 'Weht auch ohne Wind.', icon: 9, source: 'taverne' },
  stiefel_rueckzug: { id: 'stiefel_rueckzug', name: 'Stiefel des übereilten Rückzugs', slot: 'fuesse', rarity: 'gewoehnlich', modifiers: [{ stat: 'moveSpeed', pct: 0.05 }], line: 'Vorwärts ist auch nur eine Richtung.', icon: 10, source: 'taverne' },
  pantoffeln: { id: 'pantoffeln', name: 'Pantoffeln der Gemütlichkeit', slot: 'fuesse', rarity: 'gewoehnlich', modifiers: [{ stat: 'hpRegen', flat: 0.5 }], line: 'Wer will schon kämpfen.', icon: 11, source: 'taverne' },
  sandalen_siebenmeilen: { id: 'sandalen_siebenmeilen', name: 'Siebenmeilen-Sandalen (nur drei Meilen)', slot: 'fuesse', rarity: 'selten', modifiers: [{ stat: 'moveSpeed', pct: 0.08 }], line: 'Der Rest ist im Kleingedruckten.', icon: 12, source: 'taverne' },
  stiefel_sprungfedern: { id: 'stiefel_sprungfedern', name: 'Stiefel mit Sprungfedern', slot: 'fuesse', rarity: 'selten', modifiers: [{ stat: 'dodge', flat: 0.05 }], line: 'Boing.', icon: 13, source: 'taverne' },
  loeffel_zorn: { id: 'loeffel_zorn', name: 'Löffel des Zorns', slot: 'waffe', weaponKind: 'nahkampf', rarity: 'gewoehnlich', modifiers: [{ stat: 'damage', pct: 0.04 }], line: 'Für Suppe und Feinde.', icon: 14, source: 'taverne' },
  ast_ambitionen: { id: 'ast_ambitionen', name: 'Ast mit Ambitionen', slot: 'waffe', weaponKind: 'zauber', rarity: 'gewoehnlich', modifiers: [{ stat: 'cooldown', pct: -0.04 }], line: 'Wird mal ein Zauberstab. Sagt er.', icon: 15, source: 'taverne' },
  buttermesser: { id: 'buttermesser', name: 'Buttermesser des Schreckens', slot: 'waffe', weaponKind: 'wurf', rarity: 'gewoehnlich', modifiers: [{ stat: 'critChance', flat: 0.03 }], line: 'Streicht auch Feinde.', icon: 16, source: 'taverne' },
  nudelholz: { id: 'nudelholz', name: 'Nudelholz der Gerechtigkeit', slot: 'waffe', weaponKind: 'nahkampf', rarity: 'selten', modifiers: [{ stat: 'damage', pct: 0.08 }], line: 'Oma hat es immer gesagt.', icon: 17, source: 'taverne' },
  zauberstab_wackelkontakt: { id: 'zauberstab_wackelkontakt', name: 'Zauberstab mit Wackelkontakt', slot: 'waffe', weaponKind: 'zauber', rarity: 'selten', modifiers: [{ stat: 'area', pct: 0.10 }], line: 'Funktioniert, wenn man draufhaut.', icon: 18, source: 'taverne' },
  bumerang: { id: 'bumerang', name: 'Bumerang der Rückkehr (meistens)', slot: 'waffe', weaponKind: 'wurf', rarity: 'selten', modifiers: [{ stat: 'critChance', flat: 0.06 }, { stat: 'critDamage', flat: 0.1 }], line: 'Kommt zurück. Irgendwann.', icon: 19, source: 'taverne' },
  opas_schwert: { id: 'opas_schwert', name: 'Opas Schwert „Erbstück“', slot: 'waffe', weaponKind: 'nahkampf', rarity: 'legendaer', modifiers: [{ stat: 'damage', pct: 0.12 }, { stat: 'critChance', flat: 0.05 }], line: 'Opa hat damit Brot geschnitten.', icon: 20, source: 'taverne' },
  glueckspfennig: { id: 'glueckspfennig', name: 'Glückspfennig mit Loch', slot: 'schmuck', rarity: 'gewoehnlich', modifiers: [{ stat: 'goldGain', pct: 0.05 }], line: 'Das Loch bringt das Glück.', icon: 21, source: 'taverne' },
  kette_kronkorken: { id: 'kette_kronkorken', name: 'Kette aus Kronkorken', slot: 'schmuck', rarity: 'gewoehnlich', modifiers: [{ stat: 'pickupRadius', pct: 0.10 }], line: 'Gesammelt in der Taverne. Jeder einzelne.', icon: 22, source: 'taverne' },
  ring_glueckstraehne: { id: 'ring_glueckstraehne', name: 'Ring der unverschämten Glückssträhne', slot: 'schmuck', rarity: 'legendaer', modifiers: [{ stat: 'critChance', flat: 0.10 }, { stat: 'goldGain', pct: 0.10 }], line: 'Kasimir will ihn zurück.', icon: 23, source: 'taverne' },
  // Kapitel 1 (Abenteuer), Bogen beute1 (Raster 6 × 5), icon zeilenweise
  eimerhelm: { id: 'eimerhelm', name: 'Eimer der Wachsamkeit', slot: 'kopf', rarity: 'gewoehnlich', modifiers: [{ stat: 'armor', flat: 1 }], line: 'Man hört alles. Vor allem das eigene Echo.', icon: 0, source: 'kapitel1' },
  seerosenhut: { id: 'seerosenhut', name: 'Seerosenhut', slot: 'kopf', rarity: 'gewoehnlich', modifiers: [{ stat: 'hpRegen', flat: 0.4 }], line: 'Riecht nach Teich. Hält aber frisch.', icon: 1, source: 'kapitel1' },
  schnorchelkappe: { id: 'schnorchelkappe', name: 'Kappe mit Schnorchel', slot: 'kopf', rarity: 'gewoehnlich', modifiers: [{ stat: 'maxHp', pct: 0.06 }], line: 'Für den Fall der Fälle.', icon: 2, source: 'kapitel1' },
  taucherhelm_beute: { id: 'taucherhelm_beute', name: 'Erbeuteter Taucherhelm', slot: 'kopf', rarity: 'selten', modifiers: [{ stat: 'armor', flat: 2 }], line: 'Der Fisch wollte ihn eh nicht mehr.', icon: 3, source: 'kapitel1' },
  krebsscherenhelm: { id: 'krebsscherenhelm', name: 'Helm mit Krebsscheren', slot: 'kopf', rarity: 'selten', modifiers: [{ stat: 'critChance', flat: 0.05 }, { stat: 'damage', pct: 0.04 }], line: 'Zwickt zurück.', icon: 4, source: 'kapitel1' },
  kapitaensmuetze: { id: 'kapitaensmuetze', name: 'Kapitänsmütze ohne Schiff', slot: 'kopf', rarity: 'legendaer', modifiers: [{ stat: 'armor', flat: 1 }, { stat: 'goldGain', pct: 0.12 }, { stat: 'xpGain', pct: 0.08 }], line: 'Das Schiff kommt noch. Bestimmt.', icon: 5, source: 'kapitel1' },
  regenponcho: { id: 'regenponcho', name: 'Regenponcho, gelb', slot: 'koerper', rarity: 'gewoehnlich', modifiers: [{ stat: 'dodge', flat: 0.03 }], line: 'Leuchtet. Auch für Gegner.', icon: 6, source: 'kapitel1' },
  korkweste: { id: 'korkweste', name: 'Schwimmweste aus Korken', slot: 'koerper', rarity: 'gewoehnlich', modifiers: [{ stat: 'maxHp', pct: 0.06 }], line: 'Unsinkbar. Unkleidsam.', icon: 7, source: 'kapitel1' },
  algenwams: { id: 'algenwams', name: 'Wams aus Algen', slot: 'koerper', rarity: 'gewoehnlich', modifiers: [{ stat: 'hpRegen', flat: 0.5 }], line: 'Glitschig, aber gesund.', icon: 8, source: 'kapitel1' },
  schuppenmantel: { id: 'schuppenmantel', name: 'Mantel aus echten Fischschuppen', slot: 'koerper', rarity: 'selten', modifiers: [{ stat: 'armor', flat: 2 }], line: 'Glänzt. Und riecht. Beides stark.', icon: 9, source: 'kapitel1' },
  froschlederjacke: { id: 'froschlederjacke', name: 'Froschlederjacke', slot: 'koerper', rarity: 'selten', modifiers: [{ stat: 'dodge', flat: 0.05 }, { stat: 'moveSpeed', pct: 0.03 }], line: 'Quakt bei Regen.', icon: 10, source: 'kapitel1' },
  rettungsringruestung: { id: 'rettungsringruestung', name: 'Rüstung aus Rettungsringen', slot: 'koerper', rarity: 'legendaer', modifiers: [{ stat: 'maxHp', pct: 0.12 }, { stat: 'armor', flat: 1 }, { stat: 'hpRegen', flat: 0.5 }], line: 'Wenn alle Stricke reißen: Ringe!', icon: 11, source: 'kapitel1' },
  gummistiefel: { id: 'gummistiefel', name: 'Gummistiefel der falschen Hoffnung', slot: 'fuesse', rarity: 'gewoehnlich', modifiers: [{ stat: 'moveSpeed', pct: 0.04 }], line: 'Trockene Füße. Theoretisch.', icon: 12, source: 'kapitel1' },
  schwimmflossen: { id: 'schwimmflossen', name: 'Schwimmflossen', slot: 'fuesse', rarity: 'gewoehnlich', modifiers: [{ stat: 'dodge', flat: 0.03 }], line: 'Schnell im Wasser. Lustig an Land.', icon: 13, source: 'kapitel1' },
  holzschuhe: { id: 'holzschuhe', name: 'Klappernde Holzschuhe', slot: 'fuesse', rarity: 'gewoehnlich', modifiers: [{ stat: 'armor', flat: 1 }], line: 'Man hört dich kommen. Den Gegner auch.', icon: 14, source: 'kapitel1' },
  wasserlaeufer: { id: 'wasserlaeufer', name: 'Wasserläufer-Sandalen', slot: 'fuesse', rarity: 'selten', modifiers: [{ stat: 'moveSpeed', pct: 0.08 }], line: 'Fast wie übers Wasser. Fast.', icon: 15, source: 'kapitel1' },
  siebenseenstiefel: { id: 'siebenseenstiefel', name: 'Siebenseen-Stiefel', slot: 'fuesse', rarity: 'legendaer', modifiers: [{ stat: 'moveSpeed', pct: 0.08 }, { stat: 'dodge', flat: 0.05 }, { stat: 'pickupRadius', pct: 0.15 }], line: 'Waren schon in sieben Seen. Und einer Pfütze.', icon: 16, source: 'kapitel1' },
  paddel: { id: 'paddel', name: 'Paddel der Tapferkeit', slot: 'waffe', weaponKind: 'nahkampf', rarity: 'gewoehnlich', modifiers: [{ stat: 'damage', pct: 0.05 }], line: 'Rudert auch durch Gegner.', icon: 17, source: 'kapitel1' },
  angel: { id: 'angel', name: 'Angel mit Glücksköder', slot: 'waffe', weaponKind: 'wurf', rarity: 'gewoehnlich', modifiers: [{ stat: 'critChance', flat: 0.03 }, { stat: 'goldGain', pct: 0.03 }], line: 'Beißt immer. Meistens Gegner.', icon: 18, source: 'kapitel1' },
  treibholzstab: { id: 'treibholzstab', name: 'Treibholzstab', slot: 'waffe', weaponKind: 'zauber', rarity: 'gewoehnlich', modifiers: [{ stat: 'cooldown', pct: -0.04 }], line: 'War mal Teil eines Floßes.', icon: 19, source: 'kapitel1' },
  riesengabel: { id: 'riesengabel', name: 'Gabel des Meeresgottes (Küche)', slot: 'waffe', weaponKind: 'nahkampf', rarity: 'selten', modifiers: [{ stat: 'damage', pct: 0.08 }, { stat: 'critChance', flat: 0.03 }], line: 'Eigentlich zum Spaghettiessen.', icon: 20, source: 'kapitel1' },
  muschelschleuder: { id: 'muschelschleuder', name: 'Muschelschleuder', slot: 'waffe', weaponKind: 'wurf', rarity: 'selten', modifiers: [{ stat: 'critChance', flat: 0.06 }, { stat: 'critDamage', flat: 0.1 }], line: 'Mit Muschelmunition. Nachhaltig.', icon: 21, source: 'kapitel1' },
  regenmacher: { id: 'regenmacher', name: 'Regenmacher-Stab', slot: 'waffe', weaponKind: 'zauber', rarity: 'selten', modifiers: [{ stat: 'area', pct: 0.1 }, { stat: 'cooldown', pct: -0.03 }], line: 'Macht Regen. Ausgerechnet.', icon: 22, source: 'kapitel1' },
  schoepfkelle: { id: 'schoepfkelle', name: 'Schöpfkelle des Hochwassers', slot: 'waffe', weaponKind: 'nahkampf', rarity: 'gewoehnlich', modifiers: [{ stat: 'maxHp', pct: 0.03 }, { stat: 'damage', pct: 0.03 }], line: 'Schöpft Wasser und Hoffnung.', icon: 23, source: 'kapitel1' },
  wolkenzepter: { id: 'wolkenzepter', name: 'Zepter der gestohlenen Wolke', slot: 'waffe', weaponKind: 'zauber', rarity: 'legendaer', modifiers: [{ stat: 'area', pct: 0.15 }, { stat: 'cooldown', pct: -0.08 }, { stat: 'damage', pct: 0.05 }], line: 'Es nieselt, wenn man es schwenkt.', icon: 24, source: 'kapitel1' },
  kieselkette: { id: 'kieselkette', name: 'Kette aus Bachkieseln', slot: 'schmuck', rarity: 'gewoehnlich', modifiers: [{ stat: 'pickupRadius', pct: 0.1 }], line: 'Jeder Kiesel ein Erinnerungsstück.', icon: 25, source: 'kapitel1' },
  gluecksangelhaken: { id: 'gluecksangelhaken', name: 'Glücks-Angelhaken', slot: 'schmuck', rarity: 'gewoehnlich', modifiers: [{ stat: 'critChance', flat: 0.03 }], line: 'Hat schon viel gefangen. Meist Ärger.', icon: 26, source: 'kapitel1' },
  schneckenhaus: { id: 'schneckenhaus', name: 'Schneckenhaus-Amulett', slot: 'schmuck', rarity: 'selten', modifiers: [{ stat: 'armor', flat: 2 }], line: 'Die Schnecke ist ausgezogen. Freiwillig.', icon: 27, source: 'kapitel1' },
  flussperlenohrring: { id: 'flussperlenohrring', name: 'Flussperlen-Ohrring', slot: 'schmuck', rarity: 'selten', modifiers: [{ stat: 'xpGain', pct: 0.08 }], line: 'Klüger durch Glanz.', icon: 28, source: 'kapitel1' },
  flossians_schuppe: { id: 'flossians_schuppe', name: 'Flossians verlorene Schuppe', slot: 'schmuck', rarity: 'legendaer', modifiers: [{ stat: 'critChance', flat: 0.08 }, { stat: 'goldGain', pct: 0.1 }, { stat: 'damage', pct: 0.05 }], line: 'Er sucht sie bestimmt schon.', icon: 29, source: 'kapitel1' },
};

/** Die 24 Gegenstände der Taverne (Würfelbecher, Rad, Höher oder tiefer und ihre Truhe). */
export const TAVERN_ITEMS = Object.fromEntries(Object.entries(ITEMS).filter(([, item]) => item.source === 'taverne'));

/**
 * Bildbogen des Symbols: Taverne `beute` (6 × 4), Kapitel 1 `beute1` (6 × 5).
 * @param {ItemDef} item
 * @returns {'beute'|'beute1'}
 */
export function itemSheet(item) {
  return item.source === 'taverne' ? 'beute' : 'beute1';
}

/**
 * Bildbögen der Gegenstände (relativ zu index.html): Größe in Pixeln, Kanten der Spalten und Zeilen (Pixel, von links
 * bzw. oben; Zelle k liegt in Spalte k % 6, Zeile ⌊k / 6⌋) und Abstand zu den Zellkanten. `beute1.webp` hat hellgraue
 * Rasterlinien bei x = 255/256, 511/512, … und y = 212, 415/416, 617, 812, die Zeilen sind daher ungleich hoch; der
 * Abstand von 2 px hält die Linien aus dem Symbol (die Gegenstände reichen fast bis an die Linien).
 * @type {Record<'beute'|'beute1', { url: string, width: number, height: number, cols: number[], rows: number[], inset: number }>}
 */
export const ITEM_SHEETS = {
  beute: { url: 'assets/taverne/beute.webp', width: 1536, height: 1024, cols: [0, 256, 512, 768, 1024, 1280, 1536], rows: [0, 256, 512, 768, 1024], inset: 0 },
  beute1: { url: 'assets/abenteuer/beute1.webp', width: 1536, height: 1024, cols: [0, 256, 512, 768, 1024, 1280, 1536], rows: [0, 213, 416, 618, 813, 1024], inset: 2 },
};

/**
 * Ausschnitt des Symbols eines Gegenstands in seinem Bogen (x, y von links oben, in Pixeln).
 * @param {ItemDef} item
 * @returns {{ url: string, width: number, height: number, x: number, y: number, w: number, h: number }}
 */
export function itemIconRect(item) {
  const sheet = ITEM_SHEETS[itemSheet(item)];
  const perRow = sheet.cols.length - 1;
  const c = item.icon % perRow, r = Math.floor(item.icon / perRow);
  const x = sheet.cols[c] + sheet.inset, y = sheet.rows[r] + sheet.inset;
  return { url: sheet.url, width: sheet.width, height: sheet.height, x, y, w: sheet.cols[c + 1] - sheet.inset - x, h: sheet.rows[r + 1] - sheet.inset - y };
}
