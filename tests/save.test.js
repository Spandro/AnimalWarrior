import { test, assertEqual, assertTrue, assertThrows } from './runner.js';
import {
  SAVE_VERSION, STORAGE_KEY, BACKUP_KEY, defaultSave, validate, migrate, createStore,
  normalizeHeroName, addHero, deleteHero, recordRun,
} from '../src/save/store.js';

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  };
}

const spec = { name: 'Hoppel', animal: 'hase', class: 'krieger' };
const ctx = (n) => ({ now: 1000 + n, id: `h${n}` });

test('save: leerer Speicher liefert Standard und Status empty', () => {
  const r = createStore(memoryStorage()).load();
  assertEqual(r.status, 'empty');
  assertEqual(r.data, defaultSave());
  assertEqual(r.data.settings, { volume: 70, quality: 'high' });
});

test('save: update gefolgt von load liefert dieselben Daten', () => {
  const store = createStore(memoryStorage());
  const { data, saved } = store.update((s) => { s.gold = 120; addHero(s, spec, ctx(1)); });
  assertTrue(saved);
  const r = store.load();
  assertEqual(r.status, 'ok');
  assertEqual(r.data, data);
  assertEqual(r.data.heroes[0].name, 'Hoppel');
});

test('save: kaputtes JSON wird gesichert und liefert Standard', () => {
  const storage = memoryStorage({ [STORAGE_KEY]: '{kaputt' });
  const r = createStore(storage).load();
  assertEqual(r.status, 'corrupt');
  assertEqual(r.data, defaultSave());
  assertEqual(storage.getItem(BACKUP_KEY), '{kaputt');
});

test('save: gültiges JSON mit falscher Form ist corrupt', () => {
  const raw = JSON.stringify({ version: 1, heroes: 'x', gold: 0 });
  const storage = memoryStorage({ [STORAGE_KEY]: raw });
  const r = createStore(storage).load();
  assertEqual(r.status, 'corrupt');
  assertEqual(r.data, defaultSave());
  assertEqual(storage.getItem(BACKUP_KEY), raw);
});

test('save: Sicherung bleibt nach update und weiteren Loads erhalten', () => {
  const storage = memoryStorage({ [STORAGE_KEY]: '{kaputt' });
  const store = createStore(storage);
  store.load();
  store.update((s) => { s.gold = 5; });
  assertEqual(store.load().status, 'ok');
  assertEqual(storage.getItem(BACKUP_KEY), '{kaputt');
  store.load();
  assertEqual(storage.getItem(BACKUP_KEY), '{kaputt');
});

test('save: Sicherung schlägt fehl, load liefert trotzdem corrupt', () => {
  const storage = memoryStorage({ [STORAGE_KEY]: '{kaputt' });
  storage.setItem = () => { throw new Error('voll'); };
  assertEqual(createStore(storage).load().status, 'corrupt');
});

function storageWithFailingBackup() {
  const storage = memoryStorage({ [STORAGE_KEY]: '{kaputt' });
  const set = storage.setItem;
  storage.setItem = (k, v) => { if (k === BACKUP_KEY) throw new Error('voll'); set(k, v); };
  return storage;
}

test('save: update überschreibt kaputten Spielstand nicht, wenn die Sicherung fehlschlug', () => {
  const storage = storageWithFailingBackup();
  let called = false;
  const r = createStore(storage).update(() => { called = true; });
  assertEqual(r.saved, false);
  assertEqual(called, false);
  assertEqual(storage.getItem(STORAGE_KEY), '{kaputt');
});

test('save: importJson überschreibt kaputten Spielstand nicht, wenn die Sicherung fehlschlug', () => {
  const storage = storageWithFailingBackup();
  const r = createStore(storage).importJson(JSON.stringify(defaultSave()));
  assertEqual(r.ok, false);
  assertTrue(typeof r.error === 'string' && r.error.length > 0);
  assertEqual(storage.getItem(STORAGE_KEY), '{kaputt');
});

test('save: update nach corrupt startet vom Standard', () => {
  const storage = memoryStorage({ [STORAGE_KEY]: '{kaputt' });
  const r = createStore(storage).update((s) => { s.gold = 7; });
  assertTrue(r.saved);
  assertEqual(r.data.gold, 7);
  assertEqual(storage.getItem(BACKUP_KEY), '{kaputt');
});

test('save: neuere Version wird nicht überschrieben', () => {
  const raw = JSON.stringify({ version: 99, whatever: true });
  const storage = memoryStorage({ [STORAGE_KEY]: raw });
  const store = createStore(storage);
  assertEqual(store.load().status, 'newer');
  let called = false;
  const r = store.update(() => { called = true; });
  assertEqual(r.saved, false);
  assertEqual(r.data, defaultSave());
  assertEqual(called, false);
  assertEqual(storage.getItem(STORAGE_KEY), raw);
});

test('save: setItem wirft ergibt saved false ohne Ausnahme', () => {
  const storage = memoryStorage();
  storage.setItem = () => { throw new Error('Quota'); };
  const r = createStore(storage).update((s) => { s.gold = 3; });
  assertEqual(r.saved, false);
  assertEqual(r.data.gold, 3);
});

test('save: getItem wirft ergibt unavailable, update schreibt nicht', () => {
  const storage = memoryStorage();
  storage.getItem = () => { throw new Error('gesperrt'); };
  const store = createStore(storage);
  assertEqual(store.load().status, 'unavailable');
  const r = store.update((s) => { s.gold = 3; });
  assertEqual(r.saved, false);
  assertEqual(storage.map.size, 0);
});

test('save: zwei Stores auf demselben Speicher verlieren nichts', () => {
  const storage = memoryStorage();
  const a = createStore(storage);
  const b = createStore(storage);
  a.load();
  b.update((s) => { s.gold += 100; });
  a.update((s) => { s.gold -= 50; s.metaUpgrades.leben = 1; });
  const r = a.load();
  assertEqual(r.data.gold, 50);
  assertEqual(r.data.metaUpgrades.leben, 1);
});

test('save: ungültiges Ergebnis des Mutators wirft und schreibt nicht', () => {
  const storage = memoryStorage();
  const store = createStore(storage);
  store.update((s) => { s.gold = 10; });
  const before = storage.getItem(STORAGE_KEY);
  assertThrows(() => store.update((s) => { s.gold = -1; }));
  assertThrows(() => store.update((s) => { s.heroes.push({ id: 'x' }); }));
  assertEqual(storage.getItem(STORAGE_KEY), before);
});

test('save: exportJson ist formatiert, Standard bei leerem Speicher', () => {
  const store = createStore(memoryStorage());
  assertEqual(JSON.parse(store.exportJson()), defaultSave());
  assertTrue(store.exportJson().includes('\n'));
});

test('save: importJson übernimmt einen Export', () => {
  const other = createStore(memoryStorage());
  other.update((s) => { s.gold = 40; addHero(s, spec, ctx(1)); });
  const text = other.exportJson();
  const storage = memoryStorage();
  const store = createStore(storage);
  const r = store.importJson(text);
  assertTrue(r.ok);
  assertEqual(store.load().data.gold, 40);
  assertEqual(store.load().data.heroes.length, 1);
});

test('save: importJson lehnt Ungültiges ab und lässt den Speicher unberührt', () => {
  const storage = memoryStorage();
  const store = createStore(storage);
  store.update((s) => { s.gold = 9; });
  const before = storage.getItem(STORAGE_KEY);
  const good = defaultSave();
  const withHero = (h) => ({ ...good, heroes: [h] });
  const hero = (n, extra = {}) => ({ id: `h${n}`, name: 'A', animal: 'hase', class: 'krieger', createdAt: 1, survivor: { bestTime: 0, wins: 0, runs: 0 }, ...extra });
  const bad = [
    '{',
    JSON.stringify({ ...good, version: 99 }),
    JSON.stringify(withHero(hero(1, { animal: 'drache' }))),
    JSON.stringify({ ...good, heroes: [1, 2, 3, 4, 5, 6, 7].map((n) => hero(n)) }),
    JSON.stringify({ ...good, gold: -5 }),
  ];
  for (const text of bad) {
    const r = store.importJson(text);
    assertEqual(r.ok, false, text.slice(0, 40));
    assertTrue(typeof r.error === 'string' && r.error.length > 0);
    assertEqual(storage.getItem(STORAGE_KEY), before);
  }
});

test('save: validate prüft Stufen, Einstellungen und Namen', () => {
  const s = defaultSave();
  assertTrue(validate(s).ok);
  assertEqual(validate({ ...s, metaUpgrades: { leben: 6 } }).ok, false);
  assertEqual(validate({ ...s, metaUpgrades: { unbekannt: 1 } }).ok, false);
  assertEqual(validate({ ...s, gold: 1.5 }).ok, false);
  assertEqual(validate({ ...s, settings: { volume: 101, quality: 'high' } }).ok, false);
  assertEqual(validate({ ...s, settings: { volume: 5, quality: 'ultra' } }).ok, false);
  const h = { id: 'a', name: 'x'.repeat(17), animal: 'hase', class: 'krieger', createdAt: 1, survivor: { bestTime: 0, wins: 0, runs: 0 } };
  assertEqual(validate({ ...s, heroes: [h] }).ok, false);
});

test('save: migrate lässt die aktuelle Version unverändert und wirft sonst', () => {
  const s = defaultSave();
  assertEqual(migrate(s), s);
  assertEqual(SAVE_VERSION, 2);
  assertThrows(() => migrate({ version: 99 }));
  assertThrows(() => migrate({ version: 0 }));
  assertThrows(() => migrate(null));
});

const v1Hero = (n, animal, runs, wins) => ({
  id: `h${n}`, name: `H${n}`, animal, class: 'krieger', createdAt: 1, survivor: { bestTime: 120, wins, runs },
});
const v1Save = () => ({
  version: 1, gold: 340, metaUpgrades: { leben: 2 }, settings: { volume: 40, quality: 'low' },
  heroes: [v1Hero(1, 'hase', 5, 1), v1Hero(2, 'ente', 7, 2)],
});

test('save: migrate hebt Version 1 auf 2 mit leeren Erfolgen und Zählern aus den Helden', () => {
  const old = v1Save();
  const copy = JSON.parse(JSON.stringify(old));
  const s = migrate(old);
  assertEqual(old, copy, 'Eingabe bleibt unverändert');
  assertEqual(s.version, 2);
  assertEqual(s.achievements, {});
  assertEqual(s.stats, { kills: {}, runs: 12, wins: 3, winsByAnimal: {}, shadowsRouted: 0 });
  assertEqual(s.gold, 340);
  assertEqual(s.heroes, old.heroes);
  assertEqual(s.metaUpgrades, { leben: 2 });
  assertEqual(s.settings, { volume: 40, quality: 'low' });
  assertTrue(validate(s).ok);
});

test('save: migrate einer Version 1 ohne Helden ergibt Nullzähler', () => {
  const s = migrate({ version: 1, gold: 0, metaUpgrades: {}, settings: { volume: 70, quality: 'high' }, heroes: [] });
  assertEqual(s.stats, { kills: {}, runs: 0, wins: 0, winsByAnimal: {}, shadowsRouted: 0 });
  assertTrue(validate(s).ok);
});

test('save: Spielstand der Version 1 im Speicher wird beim Laden migriert und dann als Version 2 gespeichert', () => {
  const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(v1Save()) });
  const store = createStore(storage);
  const r = store.load();
  assertEqual(r.status, 'ok');
  assertEqual(r.data.version, 2);
  assertEqual(r.data.heroes.length, 2);
  assertEqual(r.data.gold, 340);
  store.update((s) => { s.gold += 1; });
  assertEqual(JSON.parse(storage.getItem(STORAGE_KEY)).version, 2);
  assertEqual(JSON.parse(storage.getItem(STORAGE_KEY)).gold, 341);
});

test('save: importJson nimmt den Export einer älteren Version 1 an und migriert ihn', () => {
  const store = createStore(memoryStorage());
  const r = store.importJson(JSON.stringify(v1Save(), null, 2));
  assertTrue(r.ok, r.error);
  assertEqual(r.data.version, 2);
  assertEqual(store.load().data.stats.runs, 12);
  assertEqual(store.load().data.heroes.length, 2);
});

test('save: Version 2 mit Erfolgen und Statistik übersteht Speichern, Export und Import', () => {
  const store = createStore(memoryStorage());
  store.update((s) => {
    s.gold = 80;
    s.achievements = { 'erste-schritte': 1700000000000, pazifist: 1700000005000 };
    s.stats = { kills: { ratte: 12, baer: 1 }, runs: 3, wins: 1, winsByAnimal: { hase: 1 }, shadowsRouted: 2 };
  });
  const loaded = store.load();
  assertEqual(loaded.status, 'ok');
  assertEqual(loaded.data.achievements, { 'erste-schritte': 1700000000000, pazifist: 1700000005000 });
  const other = createStore(memoryStorage());
  assertTrue(other.importJson(store.exportJson()).ok);
  assertEqual(other.load().data, loaded.data);
});

test('save: defaultSave enthält Erfolge und Nullstatistik', () => {
  const s = defaultSave();
  assertEqual(s.version, 2);
  assertEqual(s.achievements, {});
  assertEqual(s.stats, { kills: {}, runs: 0, wins: 0, winsByAnimal: {}, shadowsRouted: 0 });
});

test('save: validate lehnt unbekannte Erfolge, negative oder gebrochene Zähler und falsche Formen ab', () => {
  const s = defaultSave();
  const withStats = (o) => ({ ...s, stats: { ...s.stats, ...o } });
  assertTrue(validate({ ...s, achievements: { pazifist: 5 } }).ok);
  assertEqual(validate({ ...s, achievements: { gibtEsNicht: 5 } }).ok, false);
  assertEqual(validate({ ...s, achievements: { pazifist: 'gestern' } }).ok, false);
  assertEqual(validate({ ...s, achievements: { pazifist: -1 } }).ok, false);
  assertEqual(validate({ ...s, achievements: [] }).ok, false);
  assertEqual(validate({ ...s, achievements: undefined }).ok, false);
  assertEqual(validate({ ...s, stats: undefined }).ok, false);
  assertEqual(validate(withStats({ runs: -1 })).ok, false);
  assertEqual(validate(withStats({ wins: 1.5 })).ok, false);
  assertEqual(validate(withStats({ shadowsRouted: -2 })).ok, false);
  assertEqual(validate(withStats({ kills: { ratte: -1 } })).ok, false);
  assertEqual(validate(withStats({ kills: { drache: 1 } })).ok, false);
  assertEqual(validate(withStats({ kills: { ratte: 2.5 } })).ok, false);
  assertEqual(validate(withStats({ winsByAnimal: { hase: -1 } })).ok, false);
  assertEqual(validate(withStats({ winsByAnimal: { drache: 1 } })).ok, false);
  assertTrue(validate(withStats({ kills: { ratte: 4 }, winsByAnimal: { ente: 2 } })).ok);
});

test('save: normalizeHeroName', () => {
  assertEqual(normalizeHeroName('   ', 2), 'Held 3');
  assertEqual(normalizeHeroName('x'.repeat(40), 0).length, 16);
  assertEqual(normalizeHeroName('<b>x</b>', 0), '<b>x</b>');
  assertEqual(normalizeHeroName('  Anna  ', 0), 'Anna');
});

test('save: addHero legt Helden an und liefert beim siebten null', () => {
  const s = defaultSave();
  const h = addHero(s, { name: ' ', animal: 'ente', class: 'magier' }, ctx(1));
  assertEqual(h.name, 'Held 1');
  assertEqual(h.createdAt, 1001);
  assertEqual(h.survivor, { bestTime: 0, wins: 0, runs: 0 });
  for (let n = 2; n <= 6; n++) assertTrue(addHero(s, spec, ctx(n)) !== null);
  assertEqual(addHero(s, spec, ctx(7)), null);
  assertEqual(s.heroes.length, 6);
  assertTrue(validate(s).ok);
});

test('save: addHero lehnt unbekannte Ids und doppelte Helden-Ids ab', () => {
  const s = defaultSave();
  assertThrows(() => addHero(s, { ...spec, animal: 'drache' }, ctx(1)));
  assertThrows(() => addHero(s, { ...spec, class: 'barde' }, ctx(1)));
  addHero(s, spec, ctx(1));
  assertThrows(() => addHero(s, spec, ctx(1)));
});

test('save: deleteHero entfernt nur den passenden Helden', () => {
  const s = defaultSave();
  addHero(s, spec, ctx(1)); addHero(s, spec, ctx(2));
  assertEqual(deleteHero(s, 'h1'), true);
  assertEqual(deleteHero(s, 'h1'), false);
  assertEqual(s.heroes.map((h) => h.id), ['h2']);
});

test('save: recordRun addiert Gold, zählt Läufe und hält die beste Zeit', () => {
  const s = defaultSave();
  addHero(s, spec, ctx(1));
  recordRun(s, 'h1', { won: false, time: 300, gold: 10.9 });
  recordRun(s, 'h1', { won: true, time: 5000, gold: 20 });
  recordRun(s, 'h1', { won: false, time: 100, gold: 0 });
  const rec = s.heroes[0].survivor;
  assertEqual(s.gold, 30);
  assertEqual(rec.runs, 3);
  assertEqual(rec.wins, 1);
  assertEqual(rec.bestTime, 900);
  assertThrows(() => recordRun(s, 'nope', { won: false, time: 1, gold: 1 }));
  assertTrue(validate(s).ok);
});
