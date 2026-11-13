/**
 * @typedef {import('./animals.js').Modifier} Modifier
 * @typedef {'kopf'|'koerper'|'fuesse'|'waffe'|'schmuck'} Slot
 * @typedef {'nahkampf'|'zauber'|'wurf'} WeaponKind
 * @typedef {'gewoehnlich'|'selten'|'legendaer'} Rarity
 * @typedef {{ id: string, name: string, slot: Slot, weaponKind?: WeaponKind, rarity: Rarity, modifiers: Modifier[], line: string, icon: number }} ItemDef
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
  helm_zuversicht: { id: 'helm_zuversicht', name: 'Helm der mäßigen Zuversicht', slot: 'kopf', rarity: 'gewoehnlich', modifiers: [{ stat: 'armor', flat: 1 }], line: 'Sitzt. Meistens.', icon: 0 },
  topf_kinnriemen: { id: 'topf_kinnriemen', name: 'Topf mit Kinnriemen', slot: 'kopf', rarity: 'gewoehnlich', modifiers: [{ stat: 'maxHp', pct: 0.05 }], line: 'Früher war hier Suppe drin.', icon: 1 },
  denkerkappe: { id: 'denkerkappe', name: 'Denkerkappe mit Bommel', slot: 'kopf', rarity: 'selten', modifiers: [{ stat: 'xpGain', pct: 0.08 }], line: 'Klüger sieht man damit nicht aus. Ist man aber.', icon: 2 },
  federhut: { id: 'federhut', name: 'Federhut der Selbstüberschätzung', slot: 'kopf', rarity: 'selten', modifiers: [{ stat: 'critChance', flat: 0.05 }], line: 'Die Feder ist größer als der Mut.', icon: 3 },
  krone_kneipenkoenig: { id: 'krone_kneipenkoenig', name: 'Krone des Kneipenkönigs', slot: 'kopf', rarity: 'legendaer', modifiers: [{ stat: 'goldGain', pct: 0.15 }, { stat: 'armor', flat: 1 }], line: 'Gewonnen beim Würfeln. Ehrlich.', icon: 4 },
  wams_kartoffelsack: { id: 'wams_kartoffelsack', name: 'Wams aus Kartoffelsack', slot: 'koerper', rarity: 'gewoehnlich', modifiers: [{ stat: 'maxHp', pct: 0.05 }], line: 'Kratzt, hält aber warm.', icon: 5 },
  kettenhemd_luecken: { id: 'kettenhemd_luecken', name: 'Kettenhemd mit Lücken', slot: 'koerper', rarity: 'gewoehnlich', modifiers: [{ stat: 'armor', flat: 1 }], line: 'Lüftung inklusive.', icon: 6 },
  lederweste: { id: 'lederweste', name: 'Lederweste „Fast wie neu“', slot: 'koerper', rarity: 'gewoehnlich', modifiers: [{ stat: 'dodge', flat: 0.03 }], line: 'Nur ein Vorbesitzer. Glaub uns.', icon: 7 },
  schuppenpanzer: { id: 'schuppenpanzer', name: 'Schuppenpanzer des Drachen, der keiner war', slot: 'koerper', rarity: 'selten', modifiers: [{ stat: 'armor', flat: 2 }], line: 'Es war ein sehr großer Fisch.', icon: 8 },
  mantel_auftritte: { id: 'mantel_auftritte', name: 'Mantel der dramatischen Auftritte', slot: 'koerper', rarity: 'legendaer', modifiers: [{ stat: 'maxHp', pct: 0.10 }, { stat: 'dodge', flat: 0.05 }], line: 'Weht auch ohne Wind.', icon: 9 },
  stiefel_rueckzug: { id: 'stiefel_rueckzug', name: 'Stiefel des übereilten Rückzugs', slot: 'fuesse', rarity: 'gewoehnlich', modifiers: [{ stat: 'moveSpeed', pct: 0.05 }], line: 'Vorwärts ist auch nur eine Richtung.', icon: 10 },
  pantoffeln: { id: 'pantoffeln', name: 'Pantoffeln der Gemütlichkeit', slot: 'fuesse', rarity: 'gewoehnlich', modifiers: [{ stat: 'hpRegen', flat: 0.5 }], line: 'Wer will schon kämpfen.', icon: 11 },
  sandalen_siebenmeilen: { id: 'sandalen_siebenmeilen', name: 'Siebenmeilen-Sandalen (nur drei Meilen)', slot: 'fuesse', rarity: 'selten', modifiers: [{ stat: 'moveSpeed', pct: 0.08 }], line: 'Der Rest ist im Kleingedruckten.', icon: 12 },
  stiefel_sprungfedern: { id: 'stiefel_sprungfedern', name: 'Stiefel mit Sprungfedern', slot: 'fuesse', rarity: 'selten', modifiers: [{ stat: 'dodge', flat: 0.05 }], line: 'Boing.', icon: 13 },
  loeffel_zorn: { id: 'loeffel_zorn', name: 'Löffel des Zorns', slot: 'waffe', weaponKind: 'nahkampf', rarity: 'gewoehnlich', modifiers: [{ stat: 'damage', pct: 0.04 }], line: 'Für Suppe und Feinde.', icon: 14 },
  ast_ambitionen: { id: 'ast_ambitionen', name: 'Ast mit Ambitionen', slot: 'waffe', weaponKind: 'zauber', rarity: 'gewoehnlich', modifiers: [{ stat: 'cooldown', pct: -0.04 }], line: 'Wird mal ein Zauberstab. Sagt er.', icon: 15 },
  buttermesser: { id: 'buttermesser', name: 'Buttermesser des Schreckens', slot: 'waffe', weaponKind: 'wurf', rarity: 'gewoehnlich', modifiers: [{ stat: 'critChance', flat: 0.03 }], line: 'Streicht auch Feinde.', icon: 16 },
  nudelholz: { id: 'nudelholz', name: 'Nudelholz der Gerechtigkeit', slot: 'waffe', weaponKind: 'nahkampf', rarity: 'selten', modifiers: [{ stat: 'damage', pct: 0.08 }], line: 'Oma hat es immer gesagt.', icon: 17 },
  zauberstab_wackelkontakt: { id: 'zauberstab_wackelkontakt', name: 'Zauberstab mit Wackelkontakt', slot: 'waffe', weaponKind: 'zauber', rarity: 'selten', modifiers: [{ stat: 'area', pct: 0.10 }], line: 'Funktioniert, wenn man draufhaut.', icon: 18 },
  bumerang: { id: 'bumerang', name: 'Bumerang der Rückkehr (meistens)', slot: 'waffe', weaponKind: 'wurf', rarity: 'selten', modifiers: [{ stat: 'critChance', flat: 0.06 }, { stat: 'critDamage', flat: 0.1 }], line: 'Kommt zurück. Irgendwann.', icon: 19 },
  opas_schwert: { id: 'opas_schwert', name: 'Opas Schwert „Erbstück“', slot: 'waffe', weaponKind: 'nahkampf', rarity: 'legendaer', modifiers: [{ stat: 'damage', pct: 0.12 }, { stat: 'critChance', flat: 0.05 }], line: 'Opa hat damit Brot geschnitten.', icon: 20 },
  glueckspfennig: { id: 'glueckspfennig', name: 'Glückspfennig mit Loch', slot: 'schmuck', rarity: 'gewoehnlich', modifiers: [{ stat: 'goldGain', pct: 0.05 }], line: 'Das Loch bringt das Glück.', icon: 21 },
  kette_kronkorken: { id: 'kette_kronkorken', name: 'Kette aus Kronkorken', slot: 'schmuck', rarity: 'gewoehnlich', modifiers: [{ stat: 'pickupRadius', pct: 0.10 }], line: 'Gesammelt in der Taverne. Jeder einzelne.', icon: 22 },
  ring_glueckstraehne: { id: 'ring_glueckstraehne', name: 'Ring der unverschämten Glückssträhne', slot: 'schmuck', rarity: 'legendaer', modifiers: [{ stat: 'critChance', flat: 0.10 }, { stat: 'goldGain', pct: 0.10 }], line: 'Kasimir will ihn zurück.', icon: 23 },
};
