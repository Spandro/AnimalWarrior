# AnimalWarrior – Abenteuer-Modus, Etappe 2: Unterklassen mit Fähigkeitenbaum (Design)

Stand: 2026-11-14 · zweite von fünf Etappen des Abenteuer-Modus. Baut auf Etappe 1 auf (`docs/superpowers/specs/2026-11-14-abenteuer-etappe1-design.md`, gebaut und auf `main`).

## 1. Anlass und Ziel

Wunsch des Auftraggebers: „2-3 Unterklassen pro klasse mit Skilltree“. Im Gespräch am 2026-11-14 festgelegt:

- **Ab Level 10** wählt man eine Unterklasse.
- **Jede Unterklasse bringt eigene, neue Fähigkeiten.**
- **Umlernen** ist bei Oma Panzerla gegen Gold möglich (Wahl B).
- **Bauweise C:** Die meisten neuen Fähigkeiten nutzen die vorhandenen Wirkungsformen. Jede Unterklasse hat dazu **eine eigene Besonderheit**, also eine neue Spielmechanik.
- Der Vorschlag „drei Unterklassen je Klasse (auch das Duo), vier neue Fähigkeiten je Unterklasse, Baum aus Stamm und Ast plus Knoten mit Dauer-Boni“ ist vom Auftraggeber bestätigt („Vorschlag passt so“).
- **Freischalten nach Wahl A** (vom Auftraggeber am 2026-11-14 nach dem Gegenlesen): Statt Level 10/13/16/20 stehen mit der Wahl alle vier Astfähigkeiten im Baum und werden mit je einem Punkt freigeschaltet. Bei der Wahl der Unterklasse kommen einmal kostenlos alle Punkte zurück. Grund: Kapitel 1 endet bei etwa Level 10, höhere Level wären bis Etappe 3 kaum erreichbar.

**Erfolg heißt:**

- Mit Level 10 öffnet sich die Wahl zwischen drei Unterklassen. Sie zeigt, was jede kann.
- Danach gibt es im Fähigkeitenbaum den Ast der Unterklasse: vier Fähigkeiten (je ein Punkt zum Freischalten) und vier Dauer-Boni, ausgebaut mit Fähigkeitspunkten. Alles ist sofort mit den vorhandenen Punkten nutzbar.
- Jede Unterklasse spielt sich durch ihre Besonderheit spürbar anders.
- Bei Oma Panzerla kann man für Gold umlernen: alle Punkte zurück, Unterklasse neu wählen.
- Alles geht mit Handy allein, Tastatur allein und Maus allein.
- Alte Spielstände laden ohne Verlust. Der Wellen-Modus bleibt unverändert.

## 2. Ziele, Nicht-Ziele, Anti-Ziele

**Nicht-Ziele:** Unterklassen im Wellen-Modus; neue Bilder (das Aussehen des Helden ändert sich erst mit Etappe 4); neue Karten oder Gegner (Etappe 3); mehr als drei Knöpfe; Level über 30.

**Anti-Ziele:**

- Keine Unterklasse darf eine andere klar überflüssig machen.
- Keine Besonderheit darf den Helden unbesiegbar machen. Das gilt besonders für Schild, Unsichtbarkeit und Heilzone.
- Ein vorhandener Abenteuer-Stand darf nichts verlieren: weder Level, Punkte noch Fähigkeitenstufen.

## 3. Ansätze

| Ansatz | Abwägung |
|---|---|
| A – alles aus vorhandenen Wirkungsformen plus zwei allgemeine Zusatzwirkungen (Lebensraub, Schild) | am schnellsten und sichersten; Unterklassen unterscheiden sich vor allem durch Zahlen und Namen |
| B – jede Unterklasse ganz eigene Mechanik | am abwechslungsreichsten; drei- bis vierfache Arbeit, viele neue Fehlerquellen |
| **C – gemischt:** meist wie A, je Unterklasse eine Besonderheit | Mittelweg: 12 neue Mechaniken, der Rest nutzt Bewährtes |

**Gewählt: C**, vom Auftraggeber am 2026-11-14.

## 4. Der Fähigkeitenbaum

```text
┌──────────── Fähigkeiten ─────────────┐
│ Punkte: 3        Unterklasse: Türsteher│
│ STAMM (Klasse)                        │
│  Ordentlich Draufhauen ●●●○○  [+]     │
│  Karussell des Schmerzes ●○○○○ [+][1] │
│  …                                    │
│ AST: Türsteher                        │
│  ◆ Breites Kreuz (Besonderheit) ●●○○○ [+][2]│
│  Ausweis bitte!  [Freischalten: 1 Punkt]│
│  …                                    │
│ DAUER-BONI                            │
│  Dicke Haut  +4 % Leben  ●●○  [+]     │
│  …                                    │
│ [Umlernen: bei Oma Panzerla]          │
└───────────────────────────────────────┘
```

- **Stamm:** die fünf Fähigkeiten der Klasse wie in Etappe 1. Frei mit Level 1, 2, 4, 6, 8 und mit Punkten auf Stufe 1 bis 5 ausbaubar.
- **Ast der Unterklasse:** vier Fähigkeiten, die erste ist die **Besonderheit**. Alle vier stehen mit der Wahl im Baum; jede wird mit **einem Punkt freigeschaltet** (dann Stufe 1) und mit weiteren Punkten bis Stufe 5 ausgebaut. Stufen wirken wie bisher: +20 % Grundschaden je Stufe, Extras auf Stufe 3 und 5. Keine Levelgrenzen im Ast.
- **Dauer-Boni:** vier Knoten je Unterklasse, je höchstens 3 Stufen. Jede Stufe kostet einen Punkt (Beispiel: „+4 % Leben je Stufe“). Dauer-Boni auf allgemeine Werte (Leben, Schaden, Abklingzeit, Wirkungsfläche …) wirken für alle Fähigkeiten des Helden; Dauer-Boni auf eine Besonderheit (Schild-Stärke, Trankheilung, Fallenschaden, Haustier …) nur auf diese. *(Entscheidung des Entwurfs.)*
- **Punkte:** weiter einer je Level. Bis Level 30 sind es 29 Punkte; alles auszubauen kostet 52 (Stamm 20, Ast 4 zum Freischalten plus 16 Stufen, Dauer-Boni 12). Man muss also wählen.
- **Einmal alle Punkte zurück bei der Wahl:** Wer die Unterklasse zum ersten Mal wählt (oder nach dem Umlernen neu), bekommt alle bis dahin verteilten Punkte zurück (Stamm auf Stufe 1, Knöpfe bleiben belegt) und verteilt sie neu.
- **Knöpfe:** Auf die drei Knöpfe passen Stamm- und Astfähigkeiten gemischt. Die Grundattacke bleibt automatisch.
- **Wahl der Unterklasse:** Ab Level 10. Mit Level 10 erscheint eine Meldung „Wähle deine Unterklasse!“. Der Fähigkeiten-Bildschirm zeigt dann oben drei Karten mit Name, Spruch, Besonderheit und den vier Fähigkeitsnamen. Wählen braucht eine Rückfrage. Wer noch nicht wählt, kann später jederzeit im Fähigkeiten-Bildschirm wählen. Beim nächsten Rasten erinnert das Lagerfeuer-Fenster daran.
- **Umlernen (Oma Panzerla, im Gespräch ein zusätzlicher Knopf „Umlernen“ ab Level 10):** kostet Gold (Startwert 500). Alle Punkte aus Stamm, Ast und Dauer-Boni kommen zurück, die Unterklasse ist wieder offen. Die Knöpfe werden geleert, bis auf Stammfähigkeiten, die frei bleiben. Rückfrage mit Preis.
- Die Zeile des Helden zeigt die Unterklasse: „Hase · Krieger · Türsteher“, in Heldenauswahl, Modusauswahl und Pausenmenü.

## 5. Die zwölf Unterklassen

Namen und Sprüche im Ton des Spiels. Zahlen sind Startwerte fürs Balancing und Sache des Baus, ausgehend von den vorhandenen Fähigkeiten gleicher Form (Fähigkeiten von Hand mit den Abenteuer-Faktoren aus Etappe 1). „Form“ nennt die vorhandene Wirkungsform. ◆ ist die Besonderheit, also die neue Mechanik (Abschnitt 6).

### Krieger

| Unterklasse | Idee | Fähigkeiten (◆ Lv 10, dann Lv 13/16/20) | Dauer-Boni |
|---|---|---|---|
| **Kneipenschläger** – „Erst hauen, dann fragen. Fragen ist eh überbewertet.“ | viel Schaden, wenig Schutz | ◆ **Rote Rübe** (Raserei) · Hockerwurf (Geschoss, Rückstoß) · Thekenrutsche (Linie; der Held bewegt sich nicht, nur die Optik zeigt eine Rutsche) · Letzte Runde! (Ring, großer Schaden) | Schaden, kritischer Schaden, Lebensraub, Lauftempo |
| **Türsteher** – „Du kommst hier nicht rein. Niemand.“ | hält viel aus, schützt sich | ◆ **Breites Kreuz** (Schild) · Ausweis bitte! (Bogen, Betäubung) · Rausschmiss (Linie, starker Rückstoß) · Hausverbot (Ring, Verlangsamung) | Leben („Dicke Haut“), Rüstung, Schild-Stärke, Lebensregeneration |
| **Ritter von der traurigen Kochstelle** – „Für Ehre, Vaterland und eine warme Mahlzeit.“ | Flächen und Heilung | ◆ **Eintopf der Hoffnung** (Heilzone) · Pfannenschwung (Bogen, breit) · Kellenwurf (Geschoss, durchschlagend) · Fliegende Teller (Umlauf) | Wirkungsfläche, Heilung der Zone, Leben, Abklingzeit |

### Magier

| Unterklasse | Idee | Fähigkeiten | Dauer-Boni |
|---|---|---|---|
| **Wetterfrosch** – „Morgen: heiter bis tödlich.“ | Blitz und Sturm | ◆ **Persönliche Gewitterwolke** (Begleitwolke) · Böe von vorn (Linie, Rückstoß) · Hagelschauer (Zielfläche, Ticks) · Kugelblitz (Kette, viele Sprünge) | Schaden, Abklingzeit, Kettensprünge, kritische Chance |
| **Eisheiliger** – „Bleib cool. Bleib sehr, sehr cool.“ | Verlangsamen und Einfrieren | ◆ **Frostbeule** (Einfrieren) · Eiszapfen (Geschoss, Verlangsamung) · Glatteis (Zielfläche, Verlangsamung) · Schneesturm (Ring, Verlangsamung) | Dauer der Verlangsamung, Leben, Rüstung, Wirkungsfläche |
| **Hobbyalchemist** – „Was soll schon passieren? Oh.“ | Gift, Tränke, Zufall | ◆ **Wundertüte** (Trankwurf) · Stinkbombe (Zielfläche, Gift-Ticks, Verwirrung) · Blubbernde Phiole (Geschoss, Explosion) · Selbstversuch (Stärkung: Schaden und Tempo) | Trankheilung, Gift-Schaden, Erfahrung, Gold |

### Dieb

| Unterklasse | Idee | Fähigkeiten | Dauer-Boni |
|---|---|---|---|
| **Taschendieb** – „Gefunden. Also, quasi.“ | Gold und Beute | ◆ **Lange Finger** (Klauen) · Griff in die Tasche (Bogen, kurz) · Münzwurf (Geschoss, viele) · Ablenkungsmanöver (Beschwörung, Lockvogel) | Gold, Beutechance, kritische Chance, Sammelradius |
| **Schattenläufer** – „Du hast mich nicht gesehen. Ich dich schon.“ | Unsichtbar und Überraschung | ◆ **Hier war niemand** (Unsichtbarkeit) · Dolch in den Rücken (Linie, hoher Kritschaden) · Schattenschritt (Ring um den Helden; der Held springt nicht, nur ein Schatten-Effekt) · Rauchvorhang (Zielfläche, Verwirrung) | kritischer Schaden, Ausweichchance, Dauer der Unsichtbarkeit, Lauftempo |
| **Fallensteller** – „Pass auf, wo du hintrittst. Nein, nicht da.“ | Fallen und Kontrolle | ◆ **Bärenfalle für Nicht-Bären** (Fallen) · Stolperdraht (Linie, Betäubung) · Krähenfüße (Zielfläche, Verlangsamung, Ticks) · Ab in die Grube (Zielfläche, großer Schaden) | Fallenschaden, Fallen-Anzahl, Wirkungsfläche, Rüstung |

### Hochstapler (Duo)

| Unterklasse | Idee | Fähigkeiten | Dauer-Boni |
|---|---|---|---|
| **Zirkusdirektor** – „Manege frei! Und Deckung!“ | Stärkungen, die sich durch Siege verlängern | ◆ **Applaus, Applaus** (Applaus) · Peitschenknall (Bogen, Betäubung) · Jonglage (Umlauf, Nüsse) · Großes Finale (Ring, großer Schaden) | Dauer von Stärkungen, Schaden, Leben, Abklingzeit |
| **Kletterkünstler** – „Das Erdmännchen kann das allein. Behauptet es.“ | Erdmännchen als eigener Kämpfer | ◆ **Erdmännchen auf Abwegen** (Haustier) · Nussgewitter (Geschoss, viele) · Halsrutsche (Linie) · Familientreffen (Beschwörung, mehrere) | Haustier-Schaden, Haustier-Leben, Lauftempo, Sammelradius |
| **Ausguck** – „Ich seh was, was du nicht siehst. Und es ist böse.“ | Markieren und Fernkampf | ◆ **Da drüben!** (Markieren) · Fernglaswurf (Geschoss, große Reichweite) · Langer Hals, weiter Blick (Linie, lang) · Steinschlag von oben (Zielfläche) | kritische Chance, Markierungsschaden, Reichweite (Zielweite), Erfahrung |

## 6. Die zwölf Besonderheiten

Jede ist eine Fähigkeit auf einem Knopf, mit Abklingzeit und Stufen 1 bis 5. Werte sind Startwerte. Alle Zahlen stehen in `src/data/`.

| Besonderheit | Wirkung | Grenzen (Anti-Ziel) |
|---|---|---|
| **Raserei** (Rote Rübe) | 8 s lang: Schaden + bis zu 60 %, je weniger Leben der Held hat (linear von voller Gesundheit 0 % bis 25 % Leben voller Bonus) | nur Schaden, keine Verteidigung |
| **Schild** (Breites Kreuz) | Schild aus 30 % des höchsten Lebens für 8 s; Schaden trifft erst den Schild | Schild stapelt nicht, Neuauslösen ersetzt ihn |
| **Heilzone** (Eintopf der Hoffnung) | Topf an der Heldenposition, 6 s: heilt den Helden darin 3 % Leben je Sekunde, schadet Gegnern darin | Heilung nur im Topf; Abklingzeit lang |
| **Begleitwolke** (Persönliche Gewitterwolke) | 10 s folgt eine Wolke dem Helden und trifft jede Sekunde einen Gegner in 7 m | nur ein Ziel je Schlag |
| **Einfrieren** (Frostbeule) | Ring um den Helden; Gegner, die schon verlangsamt sind, frieren 2 s ein (betäubt), andere werden verlangsamt | Bosse frieren nicht ein, sondern werden nur verlangsamt |
| **Trankwurf** (Wundertüte) | Wurf auf den nächsten Gegner; zufällig eines von drei: Feuerplatsch (Schaden), Schleimpfütze (Verlangsamung), Glückstrank (heilt den Helden 15 %) | Zufall über den Zufallsgeber der Welt |
| **Klauen** (Lange Finger) | 10 s lang lässt jeder Treffer mit 25 % Chance Gold fallen (1–3), jede Tötung mit doppelter Gegenstandschance | Gold nur bis 30 je Auslösung |
| **Unsichtbarkeit** (Hier war niemand) | 4 s unsichtbar: Gegner verlieren das Ziel und laufen herum, keine Berührungstreffer; der erste eigene Treffer danach ist sicher kritisch und beendet sie | Bosse greifen weiter an |
| **Fallen** (Bärenfalle für Nicht-Bären) | legt eine Falle an die Heldenposition; tritt ein Gegner hinein, Schaden und 1,5 s Betäubung; höchstens 3 Fallen gleichzeitig, jede hält 30 s | kein Schaden ohne Gegner |
| **Applaus** (Applaus, Applaus) | 8 s Stärkung (Schaden, Tempo); jede Tötung verlängert um 1 s | höchstens 20 s gesamt |
| **Haustier** (Erdmännchen auf Abwegen) | 15 s läuft ein Erdmännchen mit, greift den nächsten Gegner an (eigener Schaden), lockt Gegner nicht | kann nicht sterben, verschwindet nach Ablauf |
| **Markieren** (Da drüben!) | markiert bis zu 5 Gegner in 12 m für 8 s; markierte nehmen +40 % Schaden | Bosse nur +20 % |

Allgemeine Zusatzwirkungen, die dabei entstehen und auch Dauer-Boni nutzen: **Lebensraub** (Anteil des Schadens heilt den Helden) und **Schild**.

## 7. Darstellung

- Keine neuen Bilder. Die Besonderheiten werden mit vorhandenen Effekten und einfachen Formen gezeigt: Schild als bläulicher Schimmer, Wolke als graue Kugel mit Blitzen, Topf, Fallen und Haustier als einfache 3D-Formen, Markierung als roter Ring, Unsichtbarkeit als durchscheinender Held, Raserei als rötlicher Schimmer.
- Jede neue Fähigkeit hat eine Farbe und Anfangsbuchstaben auf dem Knopf wie bisher.

## 8. Spielstand

Neue Version **5**:

```text
je Held adventure:
  subclass: string | null           gewählte Unterklasse
  passives: { [knotenId]: 1..3 }    Dauer-Boni
  abilities                          enthält auch Astfähigkeiten (nur mit passender Unterklasse)
```

- **Umwandlung 4 → 5:** `subclass: null`, `passives: {}`. Eine eigene Markierung für die kostenlose Rückgabe ist nicht nötig: Sie passiert genau bei der Wahl, und gewählt wird nur, solange `subclass` leer ist. Alles andere bleibt. Stammstufen aus Etappe 1 bleiben erhalten. Eine Rückerstattung ist nicht nötig, weil der Stamm gleich funktioniert. *(Entscheidung des Entwurfs; Etappe 1 hatte „Punkte zurück“ vorgesehen, das ist hier überflüssig.)*
- **Ausbessern** (wie Etappe 1): Eine Unterklasse, die nicht zur Klasse passt, wird gelöscht. Astfähigkeiten und Dauer-Boni ohne passende Unterklasse fallen weg, ihre Punkte kommen zurück. Stufen werden in ihren Bereich gerückt. Eine Wahl unter Level 10 wird gelöscht.
- **Sicherungskopie** vor der Umwandlung wie in Etappe 1.
- Spielversion **0.6.0**.

## 9. Erfolge

Zwei neue: **„Spezialist“** (eine Unterklasse gewählt, 25 Gold) und **„Meister seines Fachs“** (alle vier Astfähigkeiten einer Unterklasse auf Stufe 5, 100 Gold; braucht 20 Punkte, also etwa Level 21 und damit erst mit späteren Kapiteln erreichbar).

## 10. Regeln im Code

Wie Etappe 1 (Abschnitt 14 dort). Die neuen Mechaniken liegen in der Logik (`src/core`, `src/modes`), nicht in der Darstellung. Zufall nur über den Zufallsgeber der Welt. Der Wellen-Modus bleibt unverändert, alle seine Tests bleiben grün.

## 11. Entscheidungen des Entwurfs

- Namen, Sprüche, Fähigkeitsnamen und die Zuordnung zu Formen aller zwölf Unterklassen
- Zahlen und Grenzen der Besonderheiten (Abschnitt 6)
- Ast-Fähigkeiten je 1 Punkt zum Freischalten (Wahl A des Auftraggebers), Dauer-Boni 4 × 3 Stufen, Umlernen 500 Gold
- Thekenrutsche und Schattenschritt bewegen den Helden nicht (nur Optik)
- Dauer-Boni auf allgemeine Werte gelten für alle Fähigkeiten, auf Besonderheiten nur für diese
- Wahl mit Rückfrage, Erinnerung am Lagerfeuer
- Kein Zurücksetzen der Stammstufen bei der Umwandlung
- Zwei neue Erfolge, Spielversion 0.6.0

## 12. Was dem Bau überlassen bleibt

- Alle Zahlen der 36 Ast-Fähigkeiten und 48 Dauer-Boni innerhalb der Grenzen von Abschnitt 6
- Gestaltung des Baums am Handy und am PC (Skizze in Abschnitt 4 ist die Richtung)
- Darstellung der Besonderheiten mit vorhandenen Mitteln
- Wie die Besonderheiten im Code als Formen oder Zusatzwirkungen umgesetzt werden

## 13. Prüfung

**Automatisch:** jede Besonderheit wirkt und hält ihre Grenzen ein (Abschnitt 6); Freischalten der Astfähigkeiten mit je einem Punkt; Wahl erst ab Level 10; Rückgabe aller Punkte bei der Wahl; Punkte und Stufen; Umlernen (Gold, Rückfrage-unabhängige Logik, alle Punkte zurück, Knöpfe); Umwandlung 4 → 5 ohne Verlust und Ausbessern; Erfolge; Wellen-Modus unverändert.

**Von Hand im Browser:** je Klasse eine Unterklasse wählen und ihre Besonderheit im Kampf auslösen (mit `?debug=1`), Umlernen bei Oma, Baum bei 390 × 844 und am PC, nur Tastatur, nur Maus.

**Nur der Auftraggeber kann prüfen:** ob sich die Unterklassen verschieden genug und gleich stark anfühlen.
