import { test, assertEqual, assertClose, assertTrue } from './runner.js';
import { ACHIEVEMENTS } from '../src/data/achievements.js';
import { evaluateAchievements, evaluateStored, unlockStored, applyRunToStats, liveStats, unlock } from '../src/core/achievements.js';
import { createSurvivorRun, stepRun, setPaused, abandonRun, chooseCard, getFacts, recordFacts } from '../src/modes/survivor.js';
import { spawnEnemy } from '../src/core/world.js';
import { xpToNext } from '../src/core/progression.js';
import { obstaclesNear } from '../src/core/terrain.js';
import { defaultSave, validate } from '../src/save/store.js';
import { SFX } from '../src/data/sfx.js';

// ------------------------------------------------------------------ Hilfen

const facts = (o = {}) => ({
  ended: false, won: false, time: 0, level: 1, kills: 0, killsByType: {}, dodges: 0, goldEarned: 0, level10At: null,
  shadowsRouted: 0, revived: 0, hpFractionAtEnd: 1, longestNoKillStreak: 0, maxedAbilities: 0, chestsOpened: 0,
  animalId: 'hase', classId: 'krieger', ...o,
});
const stats = (o = {}) => ({ kills: {}, runs: 0, wins: 0, winsByAnimal: {}, shadowsRouted: 0, tavernRounds: 0, hiLoBestStreak: 0, campfireRests: 0, bubbleKills: 0, ...o });
const ctx = ({ run, stats: s, save } = {}) => ({ run: facts(run), stats: stats(s), save: { ...defaultSave(), ...save } });
const byId = (id) => ACHIEVEMENTS.find((a) => a.id === id);

// ------------------------------------------------------------------ Daten

test('achievements: 37 eindeutige Ids mit Titel, Bedingung, Spruch und positivem Gold', () => {
  assertEqual(ACHIEVEMENTS.length, 45);
  assertEqual(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
  for (const a of ACHIEVEMENTS) {
    for (const key of ['id', 'title', 'condition', 'line']) assertTrue(typeof a[key] === 'string' && a[key].trim() !== '', `${a.id}.${key}`);
    assertTrue(Number.isInteger(a.gold) && a.gold > 0, `${a.id}.gold`);
    assertEqual(typeof a.check, 'function', a.id);
  }
});

test('achievements: Texte und Gold wie vorgegeben', () => {
  const a = byId('erste-schritte');
  assertEqual([a.title, a.condition, a.line, a.gold],
    ['Erste Schritte', 'Beende deinen ersten Durchgang', 'Du bist gestorben. Aber mit Stil.', 25]);
  const z = byId('zoo-direktor');
  assertEqual([z.title, z.gold], ['Zoo-Direktor', 200]);
  assertEqual(byId('froschkoenig').title, 'Kein Froschkönig');
  assertEqual(byId('sparschwein').gold, 50);
  assertEqual(byId('baerenhunger').condition, 'Besiege insgesamt zwei Bären');
});

test('achievements: Texte und Gold der neuen Tier- und Boss-Erfolge', () => {
  const rows = [
    ['fuchsteufelswild', 'Fuchsteufelswild', 'Besiege insgesamt 100 Füchse', 'So schlau waren sie dann doch nicht.', 50],
    ['stachelkugel', 'Stachelkugel', 'Besiege insgesamt 50 Igel', 'Die Stacheln nimmst du als Andenken mit.', 50],
    ['dachsschaden', 'Dachsschaden', 'Besiege insgesamt 50 Dachse', 'Der Bau ist jetzt zu vermieten.', 50],
    ['schlangenbeschwoerer', 'Schlangenbeschwörer', 'Besiege insgesamt 50 Kreuzottern', 'Gegengift? Brauchst du nicht.', 50],
    ['nachteule', 'Nachteule', 'Besiege insgesamt 50 Uhus', 'Uhu? Du!', 75],
    ['luchsauge', 'Luchsauge', 'Besiege insgesamt 50 Luchse', 'Er hat dich gesehen. Geholfen hat es ihm nicht.', 75],
    ['platzhirsch', 'Platzhirsch', 'Besiege einen Rothirsch', 'Jetzt bist du hier der Platzhirsch.', 75],
    ['saustark', 'Saustark', 'Besiege einen Riesenkeiler', 'Das Wildschwein nennt dich jetzt Chef.', 75],
    ['wisentlich', 'Wisentlich stärker', 'Besiege einen Wisent', 'Ein Wisent weniger, ein Wissen mehr.', 75],
    ['grosswildjaeger', 'Großwildjäger', 'Besiege jeden der vier Bosse mindestens einmal', 'Die Wildnis spricht nur noch flüsternd von dir.', 150],
  ];
  for (const [id, ...rest] of rows) {
    const a = byId(id);
    assertTrue(!!a, id);
    assertEqual([a.title, a.condition, a.line, a.gold], rest);
  }
});

/** [id, Kontext, der nicht genügt, Kontext, der genügt] */
const CASES = [
  ['erste-schritte', { stats: { runs: 0 } }, { stats: { runs: 1 } }],
  ['kammerjaeger', { stats: { kills: { ratte: 499 } } }, { stats: { kills: { ratte: 500 } } }],
  ['schweinerei', { stats: { kills: { wildschwein: 99 } } }, { stats: { kills: { wildschwein: 100 } } }],
  ['vogelscheuche', { stats: { kills: { kraehe: 99 } } }, { stats: { kills: { kraehe: 100 } } }],
  ['froschkoenig', { stats: { kills: { giftkroete: 49 } } }, { stats: { kills: { giftkroete: 50 } } }],
  ['rudelfuehrer', { stats: { kills: { wolf: 99 } } }, { stats: { kills: { wolf: 100 } } }],
  ['baerendienst', { stats: { kills: { baer: 0 } } }, { stats: { kills: { baer: 1 } } }],
  ['baerenhunger', { stats: { kills: { baer: 1 } }, run: { killsByType: { baer: 1 } } }, { stats: { kills: { baer: 2 } } }],
  ['fuchsteufelswild', { stats: { kills: { fuchs: 99 } } }, { stats: { kills: { fuchs: 100 } } }],
  ['stachelkugel', { stats: { kills: { igel: 49 } } }, { stats: { kills: { igel: 50 } } }],
  ['dachsschaden', { stats: { kills: { dachs: 49 } } }, { stats: { kills: { dachs: 50 } } }],
  ['schlangenbeschwoerer', { stats: { kills: { kreuzotter: 49 } } }, { stats: { kills: { kreuzotter: 50 } } }],
  ['nachteule', { stats: { kills: { uhu: 49 } } }, { stats: { kills: { uhu: 50 } } }],
  ['luchsauge', { stats: { kills: { luchs: 49 } } }, { stats: { kills: { luchs: 50 } } }],
  ['platzhirsch', { stats: { kills: { hirsch: 0 } } }, { stats: { kills: { hirsch: 1 } } }],
  ['saustark', { stats: { kills: { keiler: 0 } } }, { stats: { kills: { keiler: 1 } } }],
  ['wisentlich', { stats: { kills: { wisent: 0 } } }, { stats: { kills: { wisent: 1 } } }],
  ['grosswildjaeger',
    { stats: { kills: { baer: 3, hirsch: 1, keiler: 2 } } },
    { stats: { kills: { baer: 1, hirsch: 1, keiler: 1, wisent: 1 } } }],
  ['ueberlebenskuenstler', { run: { ended: true, won: false } }, { run: { ended: true, won: true } }],
  ['selbstgespraech', { stats: { shadowsRouted: 0 } }, { stats: { shadowsRouted: 1 } }],
  ['schattenboxen', { run: { shadowsRouted: 2 } }, { run: { shadowsRouted: 3 } }],
  ['pazifist', { run: { longestNoKillStreak: 59.9 } }, { run: { longestNoKillStreak: 60 } }],
  ['glueckspilz', { run: { dodges: 19 } }, { run: { dodges: 20 } }],
  ['sparschwein', { save: { gold: 999 } }, { save: { gold: 1000 } }],
  ['vollausstattung', { run: { maxedAbilities: 4 } }, { run: { maxedAbilities: 5 } }],
  ['zoo-direktor',
    { stats: { winsByAnimal: { hase: 2, ente: 1 } } },
    { stats: { winsByAnimal: { hase: 1, ente: 1, waschbaer: 3 } } }],
  ['knapp-daneben',
    { run: { ended: true, won: true, hpFractionAtEnd: 0.05 } },
    { run: { ended: true, won: true, hpFractionAtEnd: 0.049 } }],
  ['stehaufmaennchen', { run: { ended: true, won: true, revived: 0 } }, { run: { ended: true, won: true, revived: 1 } }],
  ['schnellstarter', { run: { level10At: 180.01 } }, { run: { level10At: 180 } }],
  ['massenabfertigung', { run: { kills: 999 } }, { run: { kills: 1000 } }],
  ['stammgast', { stats: { runs: 24 } }, { stats: { runs: 25 } }],
  ['fruehes-ende', { run: { ended: true, won: false, time: 30 } }, { run: { ended: true, won: false, time: 29.9 } }],
  ['schatzsucher', { run: { chestsOpened: 9 } }, { run: { chestsOpened: 10 } }],
  ['tavern-stammgast', { stats: { tavernRounds: 49 } }, { stats: { tavernRounds: 50 } }],
  ['riecher', { stats: { hiLoBestStreak: 4 } }, { stats: { hiLoBestStreak: 5 } }],
  ['sammelwut', { save: { inventory: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'] } },
    { save: { inventory: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'] } }],
  ['hochstapler',
    { run: { ended: true, won: true, animalId: 'hase' } },
    { run: { ended: true, won: true, animalId: 'giraffe' } }],
  ['trockene-pfoten', { save: { heroes: [{ adventure: { chapterDone: [] } }] } }, { save: { heroes: [{ adventure: { chapterDone: [1] } }] } }],
  ['sumpfdotter', { save: { heroes: [{ adventure: { chapterDone: [1] } }] } }, { save: { heroes: [{ adventure: null }, { adventure: { chapterDone: [1, 2] } }] } }],
  ['meisterstueck', { save: { itemLevels: { paddel: 4 } } }, { save: { itemLevels: { paddel: 5 } } }],
  ['hilfsbereit', { save: { heroes: [{ adventure: { quests: { verbuddelt: { state: 'done' }, post_amsel: { state: 'done' } } } }] } },
    { save: { heroes: [{ adventure: { quests: { verbuddelt: { state: 'done' }, post_amsel: { state: 'done' }, hamsterkauf: { state: 'done' } } } }] } }],
  ['lagerfeuerromantik', { stats: { campfireRests: 19 } }, { stats: { campfireRests: 20 } }],
  ['blubb', { stats: { bubbleKills: 24 } }, { stats: { bubbleKills: 25 } }],
  ['spezialist', { save: { heroes: [{ adventure: { subclass: null } }] } }, { save: { heroes: [{ adventure: null }, { adventure: { subclass: 'tuersteher' } }] } }],
  ['meister-seines-fachs',
    { save: { heroes: [{ adventure: { subclass: 'tuersteher', abilities: { breiteskreuz: 5, ausweisbitte: 5, rausschmiss: 5, hausverbot: 4 } } }] } },
    { save: { heroes: [{ adventure: { subclass: 'tuersteher', abilities: { breiteskreuz: 5, ausweisbitte: 5, rausschmiss: 5, hausverbot: 5 } } }] } }],
];

test('achievements: die Tabelle deckt jede Erfolgs-Id genau einmal ab', () => {
  assertEqual(CASES.map((c) => c[0]), ACHIEVEMENTS.map((a) => a.id));
});

for (const [id, no, yes] of CASES) {
  test(`achievements: ${id} – Grenzfall nicht erfüllt, erfüllt`, () => {
    const a = byId(id);
    assertEqual(a.check(ctx(no)), false, 'nicht erfüllt');
    assertEqual(a.check(ctx(yes)), true, 'erfüllt');
  });
}

test('achievements: Taverne-Erfolge mit Texten und Gold wie in der Spec', () => {
  const rows = [
    ['tavern-stammgast', 'Dein Krug hat schon deinen Namen.', 25],
    ['riecher', 'Kasimir prüft jetzt seine Ärmel.', 50],
    ['sammelwut', 'Der Dachboden ist voll. Die Truhe noch nicht.', 50],
    ['hochstapler', 'Zusammen sind sie größer als jeder Bär.', 100],
  ];
  for (const [id, line, gold] of rows) assertEqual([byId(id).line, byId(id).gold], [line, gold], id);
  assertEqual(byId('hochstapler').title, 'Hochstapler');
  assertEqual(byId('riecher').title, 'Riecher');
  assertEqual(byId('sammelwut').title, 'Sammelwut');
});

test('achievements: Hochstapler braucht einen beendeten Sieg mit dem Duo', () => {
  const h = byId('hochstapler');
  assertEqual(h.check(ctx({ run: { ended: false, won: true, animalId: 'giraffe' } })), false);
  assertEqual(h.check(ctx({ run: { ended: true, won: false, animalId: 'giraffe' } })), false);
});

test('achievements: Zoo-Direktor prüft fest Hase, Ente und Waschbär, auch wenn die Giraffe fehlt', () => {
  const z = byId('zoo-direktor');
  assertEqual(z.check(ctx({ stats: { winsByAnimal: { hase: 1, ente: 1, waschbaer: 1 } } })), true);
  assertEqual(z.check(ctx({ stats: { winsByAnimal: { hase: 1, ente: 1, giraffe: 4 } } })), false);
});

test('achievements: Randfälle der Bedingungen', () => {
  // Level 10 nie erreicht (null) zählt nicht, auch nicht bei früher Zeit.
  assertEqual(byId('schnellstarter').check(ctx({ run: { level10At: null, level: 9, time: 100 } })), false);
  assertEqual(byId('schnellstarter').check(ctx({ run: { level10At: 0 } })), true);
  // Wiederbelebung und knapper Sieg zählen nur bei einem Sieg.
  assertEqual(byId('knapp-daneben').check(ctx({ run: { ended: true, won: false, hpFractionAtEnd: 0 } })), false);
  assertEqual(byId('stehaufmaennchen').check(ctx({ run: { ended: true, won: false, revived: 1 } })), false);
  // Frühes Ende nur im beendeten Durchgang und nur als Niederlage.
  assertEqual(byId('fruehes-ende').check(ctx({ run: { ended: false, won: false, time: 5 } })), false);
  assertEqual(byId('fruehes-ende').check(ctx({ run: { ended: true, won: true, time: 5 } })), false);
  // Kein Eintrag für die Gegnerart: 0, nicht NaN.
  assertEqual(byId('kammerjaeger').check(ctx({ stats: { kills: {} } })), false);
});

// ------------------------------------------------------------------ evaluateAchievements, unlock, Statistik

test('achievements: evaluateAchievements liefert erfüllte Ids in Datenreihenfolge und überspringt freigeschaltete', () => {
  const c = ctx({ run: { dodges: 20, kills: 1000 }, stats: { runs: 30 } });
  assertEqual(evaluateAchievements(c, new Set()), ['erste-schritte', 'glueckspilz', 'massenabfertigung', 'stammgast']);
  assertEqual(evaluateAchievements(c, new Set(['glueckspilz', 'erste-schritte'])), ['massenabfertigung', 'stammgast']);
  assertEqual(evaluateAchievements(ctx(), new Set()), []);
});

test('achievements: unlock bucht Gold einmal; zweiter Aufruf ändert nichts und behält den ersten Zeitpunkt', () => {
  const s = defaultSave();
  s.gold = 10;
  assertEqual(unlock(s, ['erste-schritte', 'pazifist'], 1000), { gold: 50 });
  assertEqual(s.gold, 60);
  assertEqual(s.achievements, { 'erste-schritte': 1000, pazifist: 1000 });
  assertEqual(unlock(s, ['erste-schritte', 'schweinerei'], 2000), { gold: 50 });
  assertEqual(unlock(s, ['erste-schritte'], 3000), { gold: 0 });
  assertEqual(s.gold, 110);
  assertEqual(s.achievements['erste-schritte'], 1000);
  assertEqual(s.achievements.schweinerei, 2000);
  assertTrue(validate(s).ok);
});

test('achievements: unlock ignoriert unbekannte Ids', () => {
  const s = defaultSave();
  assertEqual(unlock(s, ['gibtEsNicht'], 1), { gold: 0 });
  assertEqual(s.achievements, {});
});

test('achievements: applyRunToStats addiert Tötungen je Art, Durchgänge, Siege, Siege je Tier und Schatten', () => {
  const st = stats({ kills: { ratte: 5 }, runs: 2, wins: 1, winsByAnimal: { hase: 1 }, shadowsRouted: 1 });
  const out = applyRunToStats(st, facts({
    ended: true, won: true, animalId: 'ente', killsByType: { ratte: 3, wolf: 2 }, shadowsRouted: 2,
  }));
  assertTrue(out === st, 'mutiert und gibt dasselbe Objekt zurück');
  assertEqual(st, { kills: { ratte: 8, wolf: 2 }, runs: 3, wins: 2, winsByAnimal: { hase: 1, ente: 1 }, shadowsRouted: 3, tavernRounds: 0, hiLoBestStreak: 0, campfireRests: 0, bubbleKills: 0 });
  applyRunToStats(st, facts({ ended: true, won: false, animalId: 'hase', killsByType: { baer: 1 } }));
  assertEqual([st.runs, st.wins, st.winsByAnimal, st.kills.baer], [4, 2, { hase: 1, ente: 1 }, 1]);
});

test('achievements: liveStats zählt Tötungen und Schatten des laufenden Durchgangs, aber noch keinen Durchgang, und mutiert nichts', () => {
  const st = stats({ kills: { ratte: 499 }, runs: 3 });
  const live = liveStats(st, facts({ killsByType: { ratte: 1 }, shadowsRouted: 1 }));
  assertEqual(live.kills.ratte, 500);
  assertEqual([live.runs, live.shadowsRouted], [3, 1]);
  assertEqual(st, stats({ kills: { ratte: 499 }, runs: 3 }));
  assertEqual(byId('kammerjaeger').check(ctx({ stats: live })), true);
});

test('achievements: Ton für Erfolge ist hinterlegt', () => {
  assertTrue(Array.isArray(SFX.achievement) && SFX.achievement.length > 0);
});

// ------------------------------------------------------------------ run.facts

const NONE = { moveX: 0, moveZ: 0 };
function clearSeed() {
  for (let s = 1; s < 1000; s++) if (obstaclesNear(s, 0, 0, 16).length === 0) return s;
  throw new Error('kein freier Seed');
}
const SEED = clearSeed();
/** Waschbär-Dieb ohne Fähigkeiten. */
function newRun(opts = {}) {
  const run = createSurvivorRun({ seed: SEED, animalId: 'waschbaer', classId: 'dieb', ...opts });
  run.world.hero.abilities = [];
  return run;
}
const immortal = (run) => { run.world.hero.invulnerableUntil = Infinity; return run; };
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);

test('facts: neuer Durchgang beginnt mit Nullen', () => {
  const f = newRun().facts;
  assertEqual(f, facts({ animalId: 'waschbaer', classId: 'dieb' }));
});

test('facts: getFacts liefert eine Kopie ohne Verweise in die Welt', () => {
  const run = newRun();
  const copy = getFacts(run);
  copy.killsByType.ratte = 99;
  copy.kills = 99;
  assertEqual(run.facts.killsByType, {});
  assertEqual(run.facts.kills, 0);
});

test('facts: Tötungen je Art, Schatten und Ausweichen aus den Ereignissen', () => {
  const run = newRun();
  recordFacts(run, [
    { type: 'kill', enemyType: 'ratte' }, { type: 'kill', enemyType: 'ratte' }, { type: 'kill', enemyType: 'wolf' },
    { type: 'kill', enemyType: 'baer' }, { type: 'dodge' }, { type: 'dodge' }, { type: 'dodge' },
    { type: 'shadowFlee', line: 'x', x: 0, z: 0 }, { type: 'revive' }, { type: 'heroHit', amount: 3 },
  ]);
  const f = run.facts;
  assertEqual(f.killsByType, { ratte: 2, wolf: 1, baer: 1 });
  assertEqual([f.dodges, f.shadowsRouted, f.revived], [3, 1, 1]);
});

test('facts: echter Durchgang – Tötungen stimmen mit der Welt, Zeit, Level und Gold sind aktuell', () => {
  const run = createSurvivorRun({ seed: SEED, animalId: 'waschbaer', classId: 'dieb' });
  immortal(run);
  const w = run.world;
  for (let i = 0; i < 8; i++) spawnEnemy(w, 'ratte', 1.5 + i * 0.1, 0.5);
  for (let i = 0; i < 40; i++) stepRun(run, 0.25, NONE);
  const f = run.facts;
  assertTrue(w.run.kills > 0, 'keine Tötung');
  assertEqual(f.kills, w.run.kills);
  assertEqual(sum(f.killsByType), w.run.kills);
  assertClose(f.time, w.time, 1e-9);
  assertEqual(f.level, w.run.level);
  assertEqual(f.goldEarned, w.run.gold);
  assertEqual(f.ended, false);
});

test('facts: Ausweichen im echten Schritt', () => {
  const run = newRun();
  const w = run.world;
  w.rng = { ...w.rng, chance: () => true };
  w.hero.invulnerableUntil = 0;
  spawnEnemy(w, 'ratte', w.hero.x, w.hero.z);
  stepRun(run, 1 / 30, NONE);
  assertTrue(run.facts.dodges >= 1);
  assertEqual(run.facts.dodges, run.events.filter((e) => e.type === 'dodge').length);
});

test('facts: längste Zeit ohne Tötung wächst im Spiel, nicht in Pause und nicht nach dem Ende', () => {
  const run = immortal(newRun());
  for (let i = 0; i < 20; i++) stepRun(run, 0.5, NONE);
  assertClose(run.facts.longestNoKillStreak, 10, 0.1);
  setPaused(run, true);
  for (let i = 0; i < 10; i++) stepRun(run, 0.5, NONE);
  assertClose(run.facts.longestNoKillStreak, 10, 0.1);
  setPaused(run, false);
  stepRun(run, 1, NONE);
  assertClose(run.facts.longestNoKillStreak, 11, 0.1);
  abandonRun(run);
  stepRun(run, 5, NONE);
  assertClose(run.facts.longestNoKillStreak, 11, 0.1);
});

test('facts: eine Tötung setzt die laufende Serie zurück, die längste bleibt', () => {
  const run = immortal(newRun());
  for (let i = 0; i < 10; i++) stepRun(run, 0.5, NONE); // 5 s
  recordFacts(run, [{ type: 'kill', enemyType: 'ratte' }]);
  for (let i = 0; i < 4; i++) stepRun(run, 0.5, NONE); // 2 s
  assertClose(run.facts.longestNoKillStreak, 5, 0.6);
  assertTrue(run.facts.longestNoKillStreak < 6);
});

test('facts: Wiederbelebung, Tod mit Lebensanteil 0 und Ende', () => {
  const run = newRun({ revive: true });
  const w = run.world;
  w.hero.hp = 1;
  spawnEnemy(w, 'ratte', w.hero.x, w.hero.z);
  stepRun(run, 1 / 30, NONE);
  assertEqual(run.facts.revived, 1);
  assertEqual(run.facts.ended, false);
  w.hero.invulnerableUntil = 0;
  w.hero.hp = 1;
  spawnEnemy(w, 'ratte', w.hero.x, w.hero.z);
  stepRun(run, 0.05, NONE);
  assertEqual(run.state, 'dying');
  const died = run.deathTime;
  stepRun(run, 1, NONE);
  assertEqual(run.state, 'lost');
  const f = run.facts;
  assertEqual([f.ended, f.won, f.hpFractionAtEnd], [true, false, 0]);
  assertClose(f.time, died, 1e-9);
});

test('facts: Sieg setzt won und den Lebensanteil', () => {
  const run = immortal(newRun());
  const w = run.world;
  w.hero.hp = w.hero.stats.maxHp * 0.04;
  run.spawn.finalBoss = { fake: true };
  stepRun(run, 0.05, NONE);
  assertEqual(run.state, 'won');
  assertEqual([run.facts.ended, run.facts.won], [true, true]);
  assertClose(run.facts.hpFractionAtEnd, 0.04, 1e-6);
  assertTrue(byId('knapp-daneben').check(ctx({ run: run.facts })));
});

test('facts: Aufgeben zählt als beendet ohne Sieg, auch vor dem ersten Schritt', () => {
  const run = newRun();
  abandonRun(run);
  assertEqual([run.facts.ended, run.facts.won, run.facts.time], [true, false, 0]);
  assertTrue(byId('fruehes-ende').check(ctx({ run: run.facts })));
});

test('facts: Fähigkeiten auf Stufe 5 werden gezählt', () => {
  const run = immortal(newRun());
  run.world.hero.abilities = [
    { id: 'wurfdolche', level: 5, cooldownLeft: 99 }, { id: 'feuerball', level: 5, cooldownLeft: 99 },
    { id: 'frostring', level: 4, cooldownLeft: 99 },
  ];
  stepRun(run, 0.05, NONE);
  assertEqual(run.facts.maxedAbilities, 2);
});

test('facts: nur Zahlen und Zeichenketten, keine Verweise in die Welt', () => {
  const run = immortal(newRun());
  stepRun(run, 1, NONE);
  for (const [k, v] of Object.entries(run.facts)) {
    if (k === 'level10At') { assertTrue(v === null || typeof v === 'number', k); continue; }
    if (k === 'killsByType') { assertTrue(Object.values(v).every((n) => typeof n === 'number'), k); continue; }
    assertTrue(['number', 'boolean', 'string'].includes(typeof v), `${k}: ${typeof v}`);
  }
});

test('facts: level10At ist null, bis eine Karte das Level auf 10 bringt, und merkt sich dann die Spielzeit', () => {
  const run = immortal(newRun());
  const w = run.world;
  w.run.level = 9;
  stepRun(run, 0.05, NONE);
  assertEqual(run.facts.level10At, null);
  w.run.xp = xpToNext(9);
  stepRun(run, 0.05, NONE);
  assertEqual(run.state, 'levelup');
  assertEqual(run.facts.level10At, null);
  const frozen = w.time;
  chooseCard(run, 0);
  assertEqual(w.run.level, 10);
  assertEqual(run.facts.level10At, frozen);
  stepRun(run, 1, NONE);
  assertEqual(run.facts.level10At, frozen, 'bleibt bei späteren Schritten');
  assertTrue(byId('schnellstarter').check(ctx({ run: getFacts(run) })));
});

// ------------------------------------------------------------------ evaluateStored

const saveWith = (o = {}) => ({ ...defaultSave(), ...o });

test('achievements: evaluateStored findet Erfolge, die schon aus den gespeicherten Zahlen folgen', () => {
  const s = saveWith({ stats: stats({ runs: 1 }) });
  assertEqual(evaluateStored(s), ['erste-schritte']);
  s.achievements['erste-schritte'] = 1;
  assertEqual(evaluateStored(s), []);
  assertEqual(evaluateStored(saveWith({ stats: stats({ runs: 25, kills: { ratte: 500 } }) })),
    ['erste-schritte', 'kammerjaeger', 'stammgast']);
});

test('achievements: evaluateStored lässt Erfolge, die einen Durchgang brauchen, nie auslösen', () => {
  const s = saveWith({
    gold: 5, stats: stats({ runs: 3, wins: 2, winsByAnimal: { hase: 1 } }),
  });
  const ids = evaluateStored(s);
  for (const id of ['knapp-daneben', 'ueberlebenskuenstler', 'stehaufmaennchen', 'fruehes-ende', 'schnellstarter',
    'pazifist', 'glueckspilz', 'vollausstattung', 'massenabfertigung', 'baerenhunger', 'schattenboxen']) {
    assertTrue(!ids.includes(id), id);
  }
  assertEqual(ids, ['erste-schritte']);
});

test('achievements: unlockStored schaltet in Runden frei, Sparschwein folgt dem Gold der ersten Runde', () => {
  const s = saveWith({ gold: 990, stats: stats({ runs: 1 }) });
  assertEqual(evaluateStored(s), ['erste-schritte']);
  const ids = unlockStored(s, 42);
  assertEqual(ids, ['erste-schritte', 'sparschwein']);
  assertEqual(s.gold, 990 + 25 + 50);
  assertEqual(s.achievements, { 'erste-schritte': 42, sparschwein: 42 });
  assertEqual(unlockStored(s, 43), []);
  assertTrue(validate(s).ok);
});

test('achievements: unlockStored hört nach höchstens drei Runden auf', () => {
  const s = saveWith({ gold: 0, stats: stats({ runs: 1 }) });
  const ids = unlockStored(s, 1, 1);
  assertEqual(ids, ['erste-schritte']);
});

test('achievements: Schatzsucher steht hinter den Durchgangs-Erfolgen, Texte wie vorgegeben', () => {
  const a = ACHIEVEMENTS.find((x) => x.id === 'schatzsucher');
  assertEqual([a.id, a.title, a.condition, a.line, a.gold],
    ['schatzsucher', 'Schatzsucher', 'Öffne in einem Durchgang 10 Kisten', 'Fremde Kisten öffnen: hier ausnahmsweise erlaubt.', 50]);
});

test('achievements: ältere Spielstände ohne Schatzsucher bleiben gültig, mit ihm auch, unbekannte Ids nicht', () => {
  const old = { ...defaultSave(), achievements: Object.fromEntries(ACHIEVEMENTS.filter((a) => a.id !== 'schatzsucher').map((a) => [a.id, 1])) };
  assertTrue(validate(old).ok);
  assertTrue(validate({ ...old, achievements: { ...old.achievements, schatzsucher: 5 } }).ok);
  assertEqual(validate({ ...old, achievements: { ...old.achievements, schatzsucherX: 5 } }).ok, false);
});

test('achievements: evaluateStored löst Schatzsucher nie ohne Durchgang aus', () => {
  assertTrue(!evaluateStored(defaultSave()).includes('schatzsucher'));
});

// ---------------------------------------------------------------- Abenteuer

test('achievements: sieben Abenteuer-Erfolge aus dem gespeicherten Stand', () => {
  assertEqual(ACHIEVEMENTS.length, 45);
  const hero = (adventure) => ({ id: 'h', name: 'H', animal: 'hase', class: 'krieger', createdAt: 1, survivor: { bestTime: 0, wins: 0, runs: 0 }, adventure });
  const ids = (save) => evaluateStored(saveWith({ ...save, stats: stats(save.stats) }));
  assertEqual(ids({}), []);
  const side = { verbuddelt: { state: 'done', step: 2, progress: 0 }, post_amsel: { state: 'done', step: 2, progress: 0 }, hamsterkauf: { state: 'done', step: 2, progress: 0 } };
  assertEqual(ids({ heroes: [hero({ chapterDone: [1], quests: {} })] }), ['trockene-pfoten']);
  assertEqual(ids({ heroes: [hero({ chapterDone: [1, 2], quests: {} })] }), ['trockene-pfoten', 'sumpfdotter']);
  assertEqual(ids({ heroes: [hero({ chapterDone: [], quests: side })] }), ['hilfsbereit']);
  assertEqual(ids({ heroes: [hero({ chapterDone: [], quests: { ...side, hamsterkauf: { state: 'active', step: 1, progress: 0 } } })] }), []);
  assertEqual(ids({ inventory: ['paddel'], itemLevels: { paddel: 5 } }), ['meisterstueck']);
  assertEqual(ids({ inventory: ['paddel'], itemLevels: { paddel: 4 } }), []);
  assertEqual(ids({ stats: { campfireRests: 20 } }), ['lagerfeuerromantik']);
  assertEqual(ids({ stats: { campfireRests: 19 } }), []);
  assertEqual(ids({ heroes: [hero({ chapterDone: [], quests: {}, subclass: 'kneipenschlaeger', abilities: { schwerthieb: 1 } })] }), ['spezialist']);
});
