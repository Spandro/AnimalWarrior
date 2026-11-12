import { ANIMALS } from './animals.js';

/**
 * Lebenslange Zähler im Spielstand (gemeinsam für alle Helden).
 * @typedef {{ kills: Record<string, number>, runs: number, wins: number, winsByAnimal: Record<string, number>,
 *   shadowsRouted: number }} LifetimeStats
 *
 * Zahlen eines Durchgangs (`run.facts` aus modes/survivor.js), nur einfache Werte.
 * `ended`/`won`/`hpFractionAtEnd` gelten erst, wenn der Durchgang vorbei ist; `level10At`: Spielzeit, zu der Level 10
 * zuerst erreicht wurde (null davor).
 * @typedef {{ ended: boolean, won: boolean, time: number, level: number, kills: number, killsByType: Record<string, number>,
 *   dodges: number, goldEarned: number, level10At: number | null, shadowsRouted: number, revived: number,
 *   hpFractionAtEnd: number, longestNoKillStreak: number, maxedAbilities: number, animalId: string, classId: string }} RunFacts
 *
 * Eingabe jeder Bedingung. `stats` enthält die Zahlen des laufenden Durchgangs schon (mitten im Durchgang nur
 * Tötungen und Schatten), `save.gold` ebenso das verdiente Gold.
 * @typedef {{ run: RunFacts, stats: LifetimeStats, save: { gold: number } }} AchievementContext
 * @typedef {{ id: string, title: string, condition: string, line: string, gold: number, check: (ctx: AchievementContext) => boolean }} Achievement
 */

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
    id: 'baerenhunger', title: 'Bärenhunger', condition: 'Besiege in einem Durchgang zwei Bären',
    line: 'Honig ist jetzt wieder vorrätig.', gold: 100, check: (c) => (c.run.killsByType.baer || 0) >= 2,
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
    check: (c) => Object.keys(ANIMALS).every((id) => (c.stats.winsByAnimal[id] || 0) >= 1),
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
];
