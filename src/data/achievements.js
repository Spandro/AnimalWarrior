import { BOSS_POOL } from './waves.js';
import { SUBCLASSES } from './subclasses.js';
import { QUESTS } from './quests.js';

/**
 * Lebenslange Zähler im Spielstand (gemeinsam für alle Helden).
 * @typedef {{ kills: Record<string, number>, runs: number, wins: number, winsByAnimal: Record<string, number>,
 *   shadowsRouted: number, tavernRounds: number, hiLoBestStreak: number, campfireRests: number }} LifetimeStats
 *
 * Zahlen eines Durchgangs (`run.facts` aus modes/survivor.js), nur einfache Werte.
 * `ended`/`won`/`hpFractionAtEnd` gelten erst, wenn der Durchgang vorbei ist; `level10At`: Spielzeit, zu der Level 10
 * zuerst erreicht wurde (null davor).
 * @typedef {{ ended: boolean, won: boolean, time: number, level: number, kills: number, killsByType: Record<string, number>,
 *   dodges: number, goldEarned: number, level10At: number | null, shadowsRouted: number, revived: number,
 *   hpFractionAtEnd: number, longestNoKillStreak: number, maxedAbilities: number, chestsOpened: number, animalId: string, classId: string }} RunFacts
 *
 * Eingabe jeder Bedingung. `stats` enthält die Zahlen des laufenden Durchgangs schon (mitten im Durchgang nur
 * Tötungen und Schatten), `save.gold` ebenso das verdiente Gold; `save.inventory`: Kennungen der Truhe.
 * @typedef {{ run: RunFacts, stats: LifetimeStats, save: { gold: number, inventory: string[], heroes?: object[], itemLevels?: Record<string, number> } }} AchievementContext
 *   Abenteuer-Erfolge lesen `save.heroes[].adventure` und `save.itemLevels`.
 * @typedef {{ id: string, title: string, condition: string, line: string, gold: number, check: (ctx: AchievementContext) => boolean }} Achievement
 */

/** Nebenaufträge von Kapitel 1 (für „Hilfsbereit“). */
const SIDE_QUESTS = Object.values(QUESTS).filter((q) => q.kind === 'side').map((q) => q.id);

const killed = (type, n) => (ctx) => (ctx.stats.kills[type] || 0) >= n;

/** In dieser Reihenfolge erscheinen die Erfolge in der Liste. @type {Achievement[]} */
export const ACHIEVEMENTS = [
  {
    id: 'erste-schritte', title: 'Erste Schritte', condition: 'Beende deinen ersten Durchgang',
    line: 'Du bist gestorben. Aber mit Stil.', gold: 25, check: (c) => c.stats.runs >= 1,
  },
  {
    id: 'kammerjaeger', title: 'Kammerjäger', condition: 'Besiege insgesamt 500 Ratten',
    line: 'Die Rattengewerkschaft hat Beschwerde eingelegt.', gold: 50, check: killed('ratte', 500),
  },
  {
    id: 'schweinerei', title: 'Schweinerei', condition: 'Besiege insgesamt 100 Wildschweine',
    line: 'Irgendwo weint ein Metzger vor Glück.', gold: 50, check: killed('wildschwein', 100),
  },
  {
    id: 'vogelscheuche', title: 'Vogelscheuche', condition: 'Besiege insgesamt 100 Krähen',
    line: 'Die Krähen erzählen sich jetzt Gruselgeschichten über dich.', gold: 50, check: killed('kraehe', 100),
  },
  {
    id: 'froschkoenig', title: 'Kein Froschkönig', condition: 'Besiege insgesamt 50 Giftkröten',
    line: 'Geküsst hast du keine. Gute Entscheidung.', gold: 50, check: killed('giftkroete', 50),
  },
  {
    id: 'rudelfuehrer', title: 'Rudelführer', condition: 'Besiege insgesamt 100 Wölfe',
    line: 'Der Mond heult jetzt zurück.', gold: 75, check: killed('wolf', 100),
  },
  {
    id: 'baerendienst', title: 'Bärendienst', condition: 'Besiege deinen ersten Bären',
    line: 'Er wollte nur kuscheln. Vermutlich.', gold: 75, check: killed('baer', 1),
  },
  {
    id: 'baerenhunger', title: 'Bärenhunger', condition: 'Besiege insgesamt zwei Bären',
    line: 'Honig ist jetzt wieder vorrätig.', gold: 100, check: killed('baer', 2),
  },
  {
    id: 'fuchsteufelswild', title: 'Fuchsteufelswild', condition: 'Besiege insgesamt 100 Füchse',
    line: 'So schlau waren sie dann doch nicht.', gold: 50, check: killed('fuchs', 100),
  },
  {
    id: 'stachelkugel', title: 'Stachelkugel', condition: 'Besiege insgesamt 50 Igel',
    line: 'Die Stacheln nimmst du als Andenken mit.', gold: 50, check: killed('igel', 50),
  },
  {
    id: 'dachsschaden', title: 'Dachsschaden', condition: 'Besiege insgesamt 50 Dachse',
    line: 'Der Bau ist jetzt zu vermieten.', gold: 50, check: killed('dachs', 50),
  },
  {
    id: 'schlangenbeschwoerer', title: 'Schlangenbeschwörer', condition: 'Besiege insgesamt 50 Kreuzottern',
    line: 'Gegengift? Brauchst du nicht.', gold: 50, check: killed('kreuzotter', 50),
  },
  {
    id: 'nachteule', title: 'Nachteule', condition: 'Besiege insgesamt 50 Uhus',
    line: 'Uhu? Du!', gold: 75, check: killed('uhu', 50),
  },
  {
    id: 'luchsauge', title: 'Luchsauge', condition: 'Besiege insgesamt 50 Luchse',
    line: 'Er hat dich gesehen. Geholfen hat es ihm nicht.', gold: 75, check: killed('luchs', 50),
  },
  {
    id: 'platzhirsch', title: 'Platzhirsch', condition: 'Besiege einen Rothirsch',
    line: 'Jetzt bist du hier der Platzhirsch.', gold: 75, check: killed('hirsch', 1),
  },
  {
    id: 'saustark', title: 'Saustark', condition: 'Besiege einen Riesenkeiler',
    line: 'Das Wildschwein nennt dich jetzt Chef.', gold: 75, check: killed('keiler', 1),
  },
  {
    id: 'wisentlich', title: 'Wisentlich stärker', condition: 'Besiege einen Wisent',
    line: 'Ein Wisent weniger, ein Wissen mehr.', gold: 75, check: killed('wisent', 1),
  },
  {
    id: 'grosswildjaeger', title: 'Großwildjäger', condition: 'Besiege jeden der vier Bosse mindestens einmal',
    line: 'Die Wildnis spricht nur noch flüsternd von dir.', gold: 150,
    check: (c) => BOSS_POOL.every((type) => (c.stats.kills[type] || 0) >= 1),
  },
  {
    id: 'ueberlebenskuenstler', title: 'Überlebenskünstler', condition: 'Gewinne einen Durchgang',
    line: 'Das Buffet ist eröffnet – für die Geier der anderen.', gold: 150, check: (c) => c.run.ended && c.run.won,
  },
  {
    id: 'selbstgespraech', title: 'Selbstgespräch', condition: 'Zwinge deinen Schatten zur Flucht',
    line: 'Du hast dich selbst in die Flucht geschlagen. Therapie empfohlen.', gold: 75, check: (c) => c.stats.shadowsRouted >= 1,
  },
  {
    id: 'schattenboxen', title: 'Schattenboxen', condition: 'Vertreibe deinen Schatten in einem Durchgang dreimal',
    line: 'Selbst dein Schatten hat jetzt Angst vor dir.', gold: 150, check: (c) => c.run.shadowsRouted >= 3,
  },
  {
    id: 'pazifist', title: 'Pazifist wider Willen', condition: 'Überlebe 60 Sekunden ohne einen besiegten Gegner',
    line: 'Gewaltfrei. Unfreiwillig.', gold: 25, check: (c) => c.run.longestNoKillStreak >= 60,
  },
  {
    id: 'glueckspilz', title: 'Glückspilz', condition: 'Weiche in einem Durchgang 20 Treffern aus',
    line: 'Die Gegner fordern eine Brille.', gold: 50, check: (c) => c.run.dodges >= 20,
  },
  {
    id: 'sparschwein', title: 'Sparschwein', condition: 'Besitze 1000 Gold',
    line: 'Geld allein macht nicht glücklich. Dauerboni schon.', gold: 50, check: (c) => c.save.gold >= 1000,
  },
  {
    id: 'vollausstattung', title: 'Vollausstattung', condition: 'Bringe fünf Fähigkeiten auf Stufe 5',
    line: 'Mehr geht nicht. Wirklich. Hör auf zu fragen.', gold: 150, check: (c) => c.run.maxedAbilities >= 5,
  },
  {
    id: 'zoo-direktor', title: 'Zoo-Direktor', condition: 'Gewinne mit jedem Tier einen Durchgang',
    line: 'Hase, Ente, Waschbär. Fehlt nur noch der Streichelzoo.', gold: 200,
    // Fest die drei Ursprungstiere: das Duo darf den Erfolg nicht nachträglich schwerer machen (es hat "Hochstapler").
    check: (c) => ['hase', 'ente', 'waschbaer'].every((id) => (c.stats.winsByAnimal[id] || 0) >= 1),
  },
  {
    id: 'knapp-daneben', title: 'Knapp daneben', condition: 'Gewinne mit weniger als 5 % Leben',
    line: 'Das war Absicht. Bestimmt.', gold: 100, check: (c) => c.run.ended && c.run.won && c.run.hpFractionAtEnd < 0.05,
  },
  {
    id: 'stehaufmaennchen', title: 'Stehaufmännchen', condition: 'Gewinne nach einer Wiederbelebung',
    line: 'Tot sein war dir zu langweilig.', gold: 100, check: (c) => c.run.ended && c.run.won && c.run.revived > 0,
  },
  {
    id: 'schnellstarter', title: 'Schnellstarter', condition: 'Erreiche Level 10 in den ersten drei Minuten',
    line: 'Andere sind da noch beim Aufwärmen.', gold: 75, check: (c) => c.run.level10At !== null && c.run.level10At <= 180,
  },
  {
    id: 'massenabfertigung', title: 'Massenabfertigung', condition: 'Besiege 1000 Gegner in einem Durchgang',
    line: 'Bitte eine Nummer ziehen.', gold: 100, check: (c) => c.run.kills >= 1000,
  },
  {
    id: 'stammgast', title: 'Stammgast', condition: 'Beende 25 Durchgänge',
    line: 'Dein Stammplatz auf der Wiese ist reserviert.', gold: 100, check: (c) => c.stats.runs >= 25,
  },
  {
    id: 'fruehes-ende', title: 'Frühes Ende', condition: 'Stirb in den ersten 30 Sekunden',
    line: 'Das ging schnell. Rekordverdächtig schnell.', gold: 25, check: (c) => c.run.ended && !c.run.won && c.run.time < 30,
  },
  {
    id: 'schatzsucher', title: 'Schatzsucher', condition: 'Öffne in einem Durchgang 10 Kisten',
    line: 'Fremde Kisten öffnen: hier ausnahmsweise erlaubt.', gold: 50, check: (c) => c.run.chestsOpened >= 10,
  },
  {
    // Die Kennung `stammgast` gehört schon dem Erfolg für 25 Durchgänge und bleibt dort (gespeicherte Stände).
    id: 'tavern-stammgast', title: 'Taverne-Stammgast', condition: 'Spiele 50 Runden in der Taverne',
    line: 'Dein Krug hat schon deinen Namen.', gold: 25, check: (c) => c.stats.tavernRounds >= 50,
  },
  {
    id: 'riecher', title: 'Riecher', condition: 'Erziele bei Höher oder tiefer fünf Treffer in einer Runde',
    line: 'Kasimir prüft jetzt seine Ärmel.', gold: 50, check: (c) => c.stats.hiLoBestStreak >= 5,
  },
  {
    id: 'sammelwut', title: 'Sammelwut', condition: 'Finde 12 verschiedene Gegenstände für deine Truhe',
    line: 'Der Dachboden ist voll. Die Truhe noch nicht.', gold: 50, check: (c) => c.save.inventory.length >= 12,
  },
  {
    id: 'hochstapler', title: 'Hochstapler', condition: 'Gewinne einen Durchgang mit dem Duo',
    line: 'Zusammen sind sie größer als jeder Bär.', gold: 100,
    check: (c) => c.run.ended && c.run.won && c.run.animalId === 'giraffe',
  },
  {
    id: 'trockene-pfoten', title: 'Trockene Pfoten', condition: 'Schließe im Abenteuer Kapitel 1 ab',
    line: 'Der Bach ist wieder ein Bach. Vorerst.', gold: 100,
    check: (c) => (c.save.heroes ?? []).some((h) => h.adventure?.chapterDone?.includes(1)),
  },
  {
    id: 'meisterstueck', title: 'Meisterstück', condition: 'Lass einen Gegenstand auf +5 verbessern',
    line: 'Grabowski hat geweint. Vor Stolz.', gold: 50,
    check: (c) => Object.values(c.save.itemLevels ?? {}).some((l) => l >= 5),
  },
  {
    id: 'hilfsbereit', title: 'Hilfsbereit', condition: 'Erledige alle Nebenaufträge von Kapitel 1',
    line: 'Bachwinkel schuldet dir was. Viel.', gold: 50,
    check: (c) => (c.save.heroes ?? []).some((h) => SIDE_QUESTS.every((id) => h.adventure?.quests?.[id]?.state === 'done')),
  },
  {
    id: 'lagerfeuerromantik', title: 'Lagerfeuerromantik', condition: 'Raste 20-mal an einem Lagerfeuer',
    line: 'Marshmallows wären schön gewesen.', gold: 25, check: (c) => (c.stats.campfireRests ?? 0) >= 20,
  },
  {
    id: 'spezialist', title: 'Spezialist', condition: 'Wähle im Abenteuer eine Unterklasse',
    line: 'Allrounder war gestern.', gold: 25,
    check: (c) => (c.save.heroes ?? []).some((h) => !!h.adventure?.subclass),
  },
  {
    id: 'meister-seines-fachs', title: 'Meister seines Fachs', condition: 'Bringe alle vier Astfähigkeiten einer Unterklasse auf Stufe 5',
    line: 'Mehr Fach geht nicht.', gold: 100,
    check: (c) => (c.save.heroes ?? []).some((h) => {
      const sub = h.adventure?.subclass ? SUBCLASSES[h.adventure.subclass] : null;
      return !!sub && sub.abilities.every((id) => (h.adventure.abilities?.[id] ?? 0) >= 5);
    }),
  },
];
