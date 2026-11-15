import { test, assertEqual, assertTrue } from './runner.js';
import { pointsSpent } from '../src/core/adventureHero.js';
import { defaultSave, migrate, validate, createStore, addHero, STORAGE_KEY, SAVE_VERSION, versionBackupKey } from '../src/save/store.js';
import {
  newAdventure, repairSave, commitAdventure, equipItem, smithCost, upgradeItem, buyPotion, buyItem, sellItem, shopStock,
} from '../src/save/adventure.js';
import { SMITH, SHOP, POTION } from '../src/data/adventure.js';
import { ITEMS, RARITIES } from '../src/data/items.js';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => { map.set(k, String(v)); }, removeItem: (k) => map.delete(k) };
}

/** Spielstand der Version 3 mit zwei Helden, Gold, Truhe und einem Erfolg. */
function v3() {
  const s = defaultSave();
  addHero(s, { name: 'Hoppel', animal: 'hase', class: 'krieger' }, { now: 1, id: 'h1' });
  addHero(s, { name: 'Quak', animal: 'ente', class: 'magier' }, { now: 2, id: 'h2' });
  s.gold = 777; s.inventory = ['helm_zuversicht', 'loeffel_zorn']; s.achievements = { 'erste-schritte': 5 };
  for (const h of s.heroes) delete h.adventure;
  delete s.itemLevels; delete s.materials; delete s.settings.buttonSide; delete s.stats.campfireRests;
  return { ...s, version: 3 };
}

/** Aktuelle Version mit Abenteuer für Hoppel. */
function v4() {
  const s = repairSave(migrate(v3()));
  s.heroes[0].adventure = newAdventure(s.heroes[0]);
  return s;
}

const shared = (s) => ({ heroes: s.heroes.map((h) => [h.id, h.name, h.animal, h.class]), gold: s.gold, inventory: s.inventory, achievements: s.achievements });

test('adventureSave: Version 5, Umwandlung 3 → 5 ohne Verlust', () => {
  assertEqual(SAVE_VERSION, 5);
  const before = v3();
  const after = repairSave(migrate(before));
  assertEqual(after.version, 5);
  assertEqual(shared(after), shared(before));
  assertTrue(after.heroes.every((h) => h.adventure === null));
  assertEqual([after.itemLevels, after.materials, after.settings.buttonSide, after.stats.campfireRests], [{}, {}, 'right', 0]);
  assertTrue(validate(after).ok, validate(after).error);
});

test('adventureSave: Umwandlung 1 → 5 und 3 → 5 laden über den Speicher, Kopie liegt da', () => {
  const v1 = { version: 1, heroes: [], gold: 5, metaUpgrades: {}, settings: { volume: 70, quality: 'high' } };
  const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(v1) });
  const r = createStore(storage).load();
  assertEqual([r.status, r.data.version, r.data.gold], ['ok', 5, 5]);
  assertTrue(storage.getItem(versionBackupKey(1)) !== null);
  const s3 = memoryStorage({ [STORAGE_KEY]: JSON.stringify(v3()) });
  const r3 = createStore(s3).load();
  assertEqual([r3.status, r3.data.gold, r3.data.heroes.length], ['ok', 777, 2]);
  assertEqual(s3.getItem(versionBackupKey(3)), JSON.stringify(v3()));
});

test('adventureSave: neues Abenteuer', () => {
  const s = v4(), a = s.heroes[0].adventure;
  assertEqual([a.level, a.xp, a.skillPoints, a.potions, a.mapId, a.campfireId], [1, 0, 0, POTION.start, 'dorf', 'dorf_platz']);
  assertEqual(a.abilities, { schwerthieb: 1 });
  assertEqual(a.buttons, [null, null, null]);
  assertEqual(a.equipment, { kopf: null, koerper: null, fuesse: null, waffe: null, schmuck: null });
  assertEqual([a.introSeen, a.chapterDone, a.unlocked, a.campfires], [false, [], [], ['dorf_platz']]);
  assertEqual([a.subclass, a.passives], [null, {}]);
  assertTrue(validate(s).ok);
});

/** Bessert einen Stand mit kaputtem Abenteuer aus; Gemeinsames bleibt. */
function repaired(mutate) {
  const s = v4();
  mutate(s.heroes[0].adventure, s);
  const before = shared(s);
  const r = repairSave(s);
  assertEqual(shared(r), before);
  assertTrue(validate(r).ok, validate(r).error);
  return r.heroes[0].adventure;
}

test('adventureSave: ausbessern – unbekannte Kennungen fallen weg', () => {
  const a = repaired((a) => {
    a.abilities.gibtsnicht = 2; a.abilities.feuerball = 3; a.bosses = ['graete', 'drache']; a.chests = ['x']; a.found = ['nuss_1', 'y'];
    a.quests = { nasse_pfoten: { state: 'active', step: 0, progress: 2 }, unbekannt: { state: 'done', step: 1, progress: 0 } };
    a.campfires = ['dorf_platz', 'k1_ufer', 'nirgends']; a.trackedQuest = 'unbekannt'; a.explored = { kapitel1: 'AAAA', mond: 'AAAA' };
  });
  assertEqual(a.abilities, { schwerthieb: 1 });
  assertEqual([a.bosses, a.chests, a.found, a.campfires], [['graete'], [], ['nuss_1'], ['dorf_platz', 'k1_ufer']]);
  assertEqual(Object.keys(a.quests), ['nasse_pfoten']);
  assertEqual([a.trackedQuest, Object.keys(a.explored)], [null, ['kapitel1']]);
});

test('adventureSave: ausbessern – Zahlen in den erlaubten Bereich', () => {
  const a = repaired((a) => { a.potions = 7; a.abilities.schwerthieb = 9; a.level = 99; a.xp = -5; a.skillPoints = 'viel'; });
  assertEqual([a.potions, a.abilities.schwerthieb, a.level, a.xp, a.skillPoints], [4, 5, 30, 0, 0]);
});

test('adventureSave: ausbessern – falsche Ausrüstung wird abgelegt', () => {
  const a = repaired((a, s) => { a.equipment.kopf = 'denkerkappe'; a.equipment.waffe = 'loeffel_zorn'; a.equipment.fuesse = 'helm_zuversicht'; });
  assertEqual([a.equipment.kopf, a.equipment.waffe, a.equipment.fuesse], [null, 'loeffel_zorn', null]);
  const s = v4();
  s.heroes[1].adventure = newAdventure(s.heroes[1]);
  s.heroes[1].adventure.equipment.waffe = 'loeffel_zorn';
  assertEqual(repairSave(s).heroes[1].adventure.equipment.waffe, null);
});

test('adventureSave: ausbessern – unbekannte Karte, unbekannter Schritt, unlesbares Abenteuer', () => {
  const a = repaired((a) => { a.mapId = 'mond'; a.campfireId = 'k1_ufer'; a.quests = { nasse_pfoten: { state: 'active', step: 9, progress: 0 } }; });
  assertEqual([a.mapId, a.campfireId], ['dorf', 'dorf_platz']);
  assertEqual(a.quests.nasse_pfoten.step, 1);
  const s = v4();
  s.heroes[0].adventure = 'Unsinn';
  const r = repairSave(s);
  assertEqual(r.heroes[0].adventure, newAdventure(r.heroes[0]));
  assertEqual(r.gold, 777);
});

test('adventureSave: commitAdventure bucht das Ledger, ein geleertes Ledger ändert nichts', () => {
  const s = v4();
  const record = { ...s.heroes[0].adventure, level: 3 };
  const snapshot = { record, ledger: { gold: 50, items: ['paddel', 'helm_zuversicht'], materials: { flussperle: 2 } } };
  const r = commitAdventure(s, 'h1', snapshot);
  assertEqual(s.gold, 777 + 50 + RARITIES.gewoehnlich.resale);
  assertEqual(r.sold, [{ id: 'helm_zuversicht', gold: RARITIES.gewoehnlich.resale }]);
  assertTrue(s.inventory.includes('paddel'));
  assertEqual([s.materials.flussperle, s.heroes[0].adventure.level], [2, 3]);
  assertTrue(s.heroes[0].adventure !== record);
  snapshot.ledger = { gold: 0, items: [], materials: {} };
  commitAdventure(s, 'h1', snapshot);
  assertEqual(s.gold, 777 + 50 + RARITIES.gewoehnlich.resale);
  commitAdventure(s, 'h1', { record, ledger: { gold: -99999, items: [], materials: {} } });
  assertEqual(s.gold, 0);
  assertTrue(validate(s).ok);
});

test('adventureSave: anlegen nach Platz und Waffenart je Klasse', () => {
  const s = v4();
  s.inventory.push('treibholzstab', 'paddel');
  assertTrue(equipItem(s, 'h1', 'kopf', 'helm_zuversicht'));
  assertTrue(!equipItem(s, 'h1', 'koerper', 'helm_zuversicht'));
  assertTrue(!equipItem(s, 'h1', 'waffe', 'treibholzstab'));
  assertTrue(equipItem(s, 'h1', 'waffe', 'paddel'));
  assertTrue(!equipItem(s, 'h1', 'schmuck', 'flossians_schuppe'));
  assertTrue(equipItem(s, 'h1', 'kopf', null));
  assertEqual(s.heroes[0].adventure.equipment.kopf, null);
  assertTrue(!equipItem(s, 'h2', 'kopf', 'helm_zuversicht'));
});

test('adventureSave: Schmied – Kosten, Gold, Perlen, Höchststufe', () => {
  assertEqual(smithCost('paddel', 1), { gold: SMITH.gold.gewoehnlich[0], pearls: 0 });
  assertEqual(smithCost('wolkenzepter', 5), { gold: SMITH.gold.legendaer[4], pearls: SMITH.pearls[4] });
  const s = v4();
  s.gold = 100000;
  assertEqual(upgradeItem(s, 'paddel'), { ok: false, reason: 'missing' });
  for (let n = 1; n <= 3; n++) assertEqual(upgradeItem(s, 'helm_zuversicht'), { ok: true });
  assertEqual(upgradeItem(s, 'helm_zuversicht'), { ok: false, reason: 'pearls' });
  s.materials.flussperle = 3;
  assertEqual(upgradeItem(s, 'helm_zuversicht').ok, true);
  assertEqual(upgradeItem(s, 'helm_zuversicht').ok, true);
  assertEqual([s.itemLevels.helm_zuversicht, s.materials.flussperle], [5, 0]);
  assertEqual(upgradeItem(s, 'helm_zuversicht'), { ok: false, reason: 'max' });
  s.gold = 0;
  assertEqual(upgradeItem(s, 'loeffel_zorn'), { ok: false, reason: 'gold' });
  assertTrue(validate(s).ok);
});

test('adventureSave: Händler – Tränke bis 4, Angebot, Verkauf nur ohne Träger', () => {
  const s = v4();
  s.gold = 1000;
  s.heroes[0].adventure.potions = 3;
  assertEqual(buyPotion(s, 'h1'), { ok: true });
  assertEqual(buyPotion(s, 'h1'), { ok: false, reason: 'full' });
  assertEqual(s.gold, 1000 - POTION.price);
  assertEqual(shopStock(), SHOP.stock);
  assertTrue(SHOP.stock.every((id) => ITEMS[id].rarity === 'gewoehnlich' && ITEMS[id].source === 'kapitel1'));
  const id = SHOP.stock[0];
  assertEqual(buyItem(s, id), { ok: true });
  assertEqual(buyItem(s, id), { ok: false, reason: 'owned' });
  s.heroes[1].adventure = newAdventure(s.heroes[1]);
  s.heroes[1].adventure.equipment.kopf = 'helm_zuversicht';
  assertEqual(sellItem(s, 'helm_zuversicht'), { ok: false, reason: 'equipped', by: 'Quak' });
  s.itemLevels.loeffel_zorn = 2;
  const gold = s.gold;
  assertEqual(sellItem(s, 'loeffel_zorn'), { ok: true });
  assertEqual([s.gold, s.itemLevels.loeffel_zorn, s.inventory.includes('loeffel_zorn')], [gold + RARITIES.gewoehnlich.resale, undefined, false]);
  s.gold = 0;
  assertEqual(buyPotion(s, 'h2').reason, 'gold');
  assertTrue(validate(s).ok);
});

// ---------------------------------------------------------------- Etappe 2: Spielstand Version 5

/** Stand der Version 4 mit ausgebautem Stamm (Level 12, Ordentlich Draufhauen auf Stufe 3). */
function v4WithTrunk() {
  const s = v4();
  const a = s.heroes[0].adventure;
  delete a.subclass; delete a.passives;
  Object.assign(a, { level: 12, skillPoints: 9, abilities: { schwerthieb: 3, wirbelschlag: 2, schildstoss: 1 }, buttons: ['wirbelschlag', 'schildstoss', null] });
  return { ...s, version: 4 };
}

test('adventureSave: Umwandlung 4 → 5 behält Stammstufen, keine Unterklasse', () => {
  const before = v4WithTrunk();
  const after = repairSave(migrate(structuredClone(before)));
  const a = after.heroes[0].adventure;
  assertEqual(after.version, 5);
  assertEqual([a.subclass, a.passives, a.level, a.skillPoints], [null, {}, 12, 9]);
  assertEqual(a.abilities, { schwerthieb: 3, wirbelschlag: 2, schildstoss: 1 });
  assertEqual(a.buttons, ['wirbelschlag', 'schildstoss', null]);
  assertEqual(after.heroes[1].adventure, null);
  assertTrue(validate(after).ok, validate(after).error);
  const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(before) });
  assertEqual(createStore(storage).load().data.version, 5);
  assertEqual(storage.getItem(versionBackupKey(4)), JSON.stringify(before));
});

test('adventureSave: Ausbessern – fremde Unterklasse, Astfähigkeit ohne Unterklasse, Dauer-Bonus über 3, Wahl unter Level 10', () => {
  const foreign = repaired((a) => { Object.assign(a, { level: 12, skillPoints: 11, subclass: 'wetterfrosch' }); });
  assertEqual(foreign.subclass, null);
  const orphan = repaired((a) => { Object.assign(a, { level: 12, skillPoints: 6, subclass: null, abilities: { schwerthieb: 1, breiteskreuz: 3 }, passives: { dickehaut: 2 } }); });
  assertEqual([orphan.abilities, orphan.passives, orphan.skillPoints], [{ schwerthieb: 1 }, {}, 11]);
  assertEqual(pointsSpent(orphan, 'krieger') + orphan.skillPoints, 11);
  const over = repaired((a) => { Object.assign(a, { level: 12, skillPoints: 0, subclass: 'tuersteher', abilities: { schwerthieb: 1, breiteskreuz: 4 }, passives: { dickehaut: 7, wucht: 2 } }); });
  assertEqual([over.subclass, over.abilities, over.passives, over.skillPoints], ['tuersteher', { schwerthieb: 1, breiteskreuz: 4 }, { dickehaut: 3 }, 6]);
  const early = repaired((a) => { Object.assign(a, { level: 9, skillPoints: 6, subclass: 'tuersteher', abilities: { schwerthieb: 1, breiteskreuz: 1 }, passives: { dickehaut: 1 } }); });
  assertEqual([early.subclass, early.abilities, early.passives, early.skillPoints], [null, { schwerthieb: 1 }, {}, 8]);
  const kept = repaired((a) => { Object.assign(a, { level: 12, skillPoints: 0, subclass: 'tuersteher', abilities: { schwerthieb: 1, breiteskreuz: 5 }, buttons: ['breiteskreuz', null, null], passives: { dickehaut: 3 } }); });
  assertEqual([kept.buttons[0], kept.passives.dickehaut], ['breiteskreuz', 3]);
});
