# AnimalWarrior – Taverne (Design)

Stand: 2026-11-13 · Paket 3 der zweiten Ausbaustufe (wird vor Paket 2 gebaut)

## 1. Anlass und Ziel

Der Auftraggeber wünscht sich eine **Taverne** als eigenen Punkt in der Modusauswahl. Dort spielt man Glücksspiele mit dem Gold aus dem Wellen-Modus und kann mehr Gold gewinnen, selten auch Ausrüstung und Waffen. Ausrüstung und Waffen sind für den späteren Abenteuer-Modus (Paket 4) gedacht und wirken im Wellen-Modus nicht. Außerdem lässt sich in der Taverne für viel Gold ein neuer Held freischalten: das Duo Giraffe und Erdmännchen.

**Warum (Worte des Auftraggebers sinngemäß):** Gewinne sollen vor allem Gold sein. Ausrüstung und Waffen sollen selten, aber lustig sein. Später kommt evtl. noch mehr dazu, was man mit Gold kaufen kann. Die Taverne gibt dem Gold also einen zweiten Zweck und dem Spiel ein Langzeitziel (das Duo).

**Erfolg heißt:**

- In der Modusauswahl gibt es eine dritte Karte „Taverne“. Dort kann man Würfelbecher, Glücksrad und Höher oder tiefer spielen, am Handy hochkant mit einem Daumen wie am PC mit der Maus.
- Gold wird beim Spielen sofort und genau einmal verrechnet und gespeichert. Neuladen der Seite ändert kein Ergebnis.
- Auf Dauer zahlt die Taverne weniger aus, als man einsetzt. Die Dauerboni behalten ihren Wert.
- Gewonnene Gegenstände liegen in der Truhe und lassen sich mit Bild, Namen, Seltenheit, Werten und Spruch ansehen.
- Für 20.000 Gold lässt sich das Duo freischalten. Danach kann man es bei „Neuer Held“ anlegen und den Wellen-Modus damit von Anfang bis Ende spielen.
- Alte Spielstände (Version 2) und alte Exporte laden ohne Verlust.

## 2. Ziele, Nicht-Ziele, Anti-Ziele

**Ziele** siehe Abschnitte 4 bis 9.

**Nicht-Ziele**

- Ausrüstung anlegen oder irgendeine Wirkung von Ausrüstung im Spiel (kommt mit Paket 4)
- Weitere Dinge, die man mit Gold kaufen kann (Wunsch für später)
- Begehbare oder gemalte Wimmelbild-Taverne (siehe Abschnitt 3, Ansätze)
- Geschicklichkeitsspiele
- Das Duo im Abenteuer-Modus

**Anti-Ziele**

- **Kein echtes Geld**, keine Käufe, keine Werbung. Nur Spielgold.
- **Gold darf nicht inflationär werden.** Kein Spiel darf im Schnitt mehr auszahlen, als man einsetzt.
- Ergebnisse dürfen sich nicht durch Neuladen, Zurück-Knopf oder Abbrechen erzwingen lassen.
- Die Taverne darf den Wellen-Modus nicht verändern (außer dass dort das Duo als Held hinzukommt).

## 3. Ansätze

| Ansatz | Abwägung |
|---|---|
| **A – Taverne als Menü:** gemaltes Bild der Gaststube als Hintergrund, Karten für die Spieltische, je Spiel ein eigener Bildschirm mit Wirtstier und animierten Würfeln, Rad und Karten | funktioniert hochkant und quer gleich gut; man ist sofort am Tisch; baut auf den vorhandenen Menüs auf; man läuft nicht selbst herum |
| B – begehbare Taverne in 3D | am stimmungsvollsten; braucht eine eigene Karte, Bilder für Wände und Möbel und viel mehr Bauzeit; am Handy ist jedes Spiel einen Fußweg entfernt |
| C – gemaltes Wimmelbild mit Tippflächen | hübsch; hochkant und quer brauchen verschiedene Ausschnitte; die Tippflächen hängen genau am gelieferten Bild |

**Gewählt: A**, vom Auftraggeber am 2026-11-13. Aus A lässt sich später B oder C machen, ohne die Spiele neu zu bauen.

Beim Duo gibt es einen naheliegenden Weg: Seine Fähigkeiten nutzen die vorhandenen Wirkungsformen (Bogen, Geschoss, Ring, Zielfläche, Beschwörung) mit neuen Zahlen, Namen und Effekten. Neue Wirkungsformen wären teurer und brächten im Spiel kaum Unterschied.

## 4. Bildschirme und Ablauf

Heldenauswahl → Modusauswahl → **Taverne** → Spieltisch, Truhe oder Stall.

- **Modusauswahl:** drei Karten: Wellen-Modus, Taverne, Abenteuer-Modus (weiter gesperrt). Hochkant untereinander.
- **Taverne (Übersicht):** Hintergrund ist die gemalte Gaststube (abgedunkelt und weichgezeichnet wie die anderen Menüs). Oben steht das Gold, darunter „<Heldenname> sitzt am Tresen“. Darunter fünf Karten:
  1. Würfelbecher (Wirt: Kasimir, ein Affe)
  2. Glücksrad (Wirtin: Madame Funkel, eine Elster)
  3. Höher oder tiefer (Wirt: wieder Kasimir)
  4. Truhe („7 von 24 gefunden“)
  5. Stall: das Duo, bis zur Freischaltung geschwärzt mit Preis
- **Spieltisch:** Wirtstier mit Namen und einem wechselnden Spruch, das Spiel in der Mitte, unten Einsatzwahl und Spielknopf, oben das aktuelle Gold. „Zurück“ führt zur Übersicht.
- **Zurück aus der Taverne** führt zur Modusauswahl.

Skizze hochkant (Spieltisch):

```text
┌─────────────────────┐
│ ← Zurück   Gold 1.240│
│  [Affe]  Kasimir:    │
│  „Würfel lügen nie.  │
│   Ich manchmal.“     │
│                      │
│    ⚀⚄   gegen   ⚂⚂   │
│   Du: 6     Wirt: 6  │
│                      │
│ Einsatz:             │
│ [10] [50] [100] [500]│
│ [     Würfeln!     ] │
└─────────────────────┘
```

Man betritt die Taverne immer mit einem gewählten Helden. Der Held spielt aber keine Rolle für Spiele, Gold oder Beute. Gold, Truhe und Freischaltung gehören allen Helden gemeinsam.

## 5. Die Spiele

### 5.1 Gemeinsame Regeln

- **Einsätze:** 10, 50, 100 oder 500 Gold. Ein Einsatz ist nur wählbar, wenn man so viel Gold hat. Mit weniger als 10 Gold sagt der Wirt freundlich, man solle erst einmal Gold verdienen.
- **Beute** ist nur bei einem Einsatz ab 100 Gold möglich. Der Bildschirm sagt das mit einem Satz („Ab 100 Gold Einsatz spielt Kasimir auch um Beute.“).
- **Auszahlung:** Jedes Spiel zahlt im Schnitt **90 bis 95 %** des Einsatzes in Gold zurück (genaue Werte unten). Beute kommt obendrauf. Ihr Gegenwert (Verkauf von Doppelten, Abschnitt 6.3) bleibt so klein, dass die Taverne insgesamt unter 97 % bleibt.
- **Verrechnung genau einmal:** Wird eine Runde gestartet, wird ihr Ausgang sofort ausgewürfelt, mit Einsatz, Gewinn und Beute in den Spielstand geschrieben und gespeichert. Erst danach läuft die Animation. Schließt man den Tab während der Animation, gilt das Ergebnis trotzdem.
- Bei Höher oder tiefer gilt das für jeden einzelnen Schritt (Abschnitt 5.4).
- **Zufall:** Die Oberfläche erzeugt für jede Runde einen Startwert. Die Spiellogik würfelt nur über `createRng(seed)`. Der Startwert wird nicht gespeichert.
- **Animationen** dauern höchstens etwa 1,5 s und lassen sich durch Tippen abkürzen. Bei „Bewegung reduzieren“ springt das Ergebnis sofort ins Bild.
- Würfel, Rad und Karten werden im Code gezeichnet. Dafür braucht es keine Bilder.
- **Ton:** kurze neue Effekte für Würfeln, Radklackern, Kartenaufdecken, Münzen und Beute. Sie entstehen per Web Audio wie die übrigen.

### 5.2 Würfelbecher (Wirt Kasimir, ein Affe)

- Spieler und Wirt würfeln je zwei Würfel. Die höhere Summe gewinnt.
- **Gewinn:** doppelter Einsatz zurück. **Gleichstand:** halber Einsatz zurück. **Verloren:** nichts.
- Auszahlung im Schnitt: 2 × 0,4437 + 0,5 × 0,1127 ≈ **94,4 %**.
- **Beute:** Würfelt der Spieler einen Sechserpasch (1 zu 36), gibt es bei einem Einsatz ab 100 einen Gegenstand dazu, unabhängig vom Ausgang gegen den Wirt.

### 5.3 Glücksrad (Wirtin Madame Funkel, eine Elster)

- Das Rad hat 20 gleich große Felder:

  | Felder | Ergebnis |
  |---|---|
  | 10 | Niete |
  | 4 | Einsatz zurück (×1) |
  | 3 | ×2 |
  | 1 | ×3 |
  | 1 | ×5 |
  | 1 | Beutefeld |

- **Beutefeld:** ab Einsatz 100 ein Gegenstand, kein Gold. Darunter gibt es den Einsatz zurück.
- Auszahlung im Schnitt: ab 100 Einsatz 18/20 = **90 %** plus Beute, darunter 19/20 = **95 %**.

### 5.4 Höher oder tiefer (Wirt Kasimir, derselbe Affe)

Ein Kartenstapel mit 2 bis 10, Bube, Dame, König und Ass (13 Werte). Die Farben spielen keine Rolle.

- Nach dem Einsatz liegt eine Karte offen. Der Spieler tippt „Höher“ oder „Tiefer“, dann wird die nächste Karte aufgedeckt.
- **Gleicher Wert ist unentschieden** (Wunsch des Auftraggebers vom 2026-11-14; vorher zählte er als verloren): Der Topf bleibt, es zählt kein Treffer, die gezogene Karte liegt offen und man tippt erneut.
- **Der Gewinn wächst nach Risiko, nicht immer ums Doppelte.** Auf jedem Knopf steht der Faktor, zum Beispiel bei einer 8: „Höher ×1,8“ und „Tiefer ×1,8“; bei einer 4: „Höher ×1,1“ und „Tiefer ×5,5“.
  - Faktor = 0,93 ÷ Gewinnchance unter den 12 Werten, die entscheiden (der gleiche Wert zählt nicht mit), auf eine Nachkommastelle abgerundet, nie unter 1,0.
  - Eine Wahl, die nicht verlieren kann („Höher“ bei der 2, „Tiefer“ beim Ass), zahlt ×1,0: Der Topf bleibt gleich, der Tipp zählt aber als Treffer.
  - Eine Wahl ohne Gewinnchance (Höher bei Ass) ist gesperrt.
  - Grund: Mit festem Verdoppeln könnte man bei einer 2 fast sicher „Höher“ tippen und Gold vermehren. Gold würde wertlos.
- Nach jedem Treffer: **„Auszahlen“** oder **weiterspielen**. Höchstens **fünf Treffer** pro Runde. Nach dem fünften wird automatisch ausgezahlt, ebenso, sobald der Topf das **50-Fache des Einsatzes** erreicht.
- **Joker:** Jede Karte, die nach einem Tipp aufgedeckt wird, ist mit 2 % Chance ein Joker. Dann wird der bisherige Topf sofort ausgezahlt, ohne Verlust. Ab Einsatz 100 gibt es dazu einen Gegenstand. Die Runde endet.
  - Die offene Startkarte ist nie ein Joker.
  - Der Joker wird vor dem Kartenwert ausgewürfelt. Er nimmt also Gewinn und Verlust anteilig je 2 % weg.
  - Er zählt nicht als Treffer, weder für die fünf Treffer noch für die Trefferserie.
- **Karten** werden unabhängig gezogen: jeder der 13 Werte mit gleicher Chance, wie mit Zurücklegen. Die Faktoren rechnen ohne Joker.
- **Topf:** Nach jedem Treffer wird der Topf auf ganzes Gold abgerundet. Die Obergrenze des 50-fachen Einsatzes prüft den abgerundeten Wert.
- Auszahlung je Schritt im Schnitt etwa **93 %**. Wer früh auszahlt, verliert am wenigsten.
- **Speichern je Schritt:**
  - Beim Start wird der Einsatz abgebucht und gespeichert. Die Runde zählt dabei schon für `tavernRounds`. Der Topf lebt nur im Speicher der Seite.
  - Jeder Schritt wird sofort ausgewertet. Erst „Auszahlen“, das automatische Auszahlen oder der Joker schreibt den Topf gut.
  - Endet eine Runde mit einem Fehltipp, wird ebenfalls gespeichert, damit die Trefferserie (`hiLoBestStreak`) erhalten bleibt.
  - Wer mitten in einer Runde die Seite schließt oder „Zurück“ tippt, verliert den Topf. „Zurück“ fragt deshalb nach, solange ein Topf da ist.
- Die bisher längste Trefferserie wird für einen Erfolg gezählt.

### 5.5 Erfolge der Taverne

Vier neue Erfolge im Ton der vorhandenen. Die Belohnung ist bewusst klein:

| Erfolg | Bedingung | Spruch | Gold |
|---|---|---|---|
| Stammgast | 50 Runden in der Taverne gespielt | „Dein Krug hat schon deinen Namen.“ | 25 |
| Riecher | Bei Höher oder tiefer fünf Treffer in einer Runde | „Kasimir prüft jetzt seine Ärmel.“ | 50 |
| Sammelwut | 12 verschiedene Gegenstände in der Truhe | „Der Dachboden ist voll. Die Truhe noch nicht.“ | 50 |
| Hochstapler | Einen Durchgang mit dem Duo gewinnen | „Zusammen sind sie größer als jeder Bär.“ | 100 |

Nach jeder Runde und nach der Freischaltung werden **alle** gespeicherten Erfolge neu geprüft, wie es die vorhandene Prüfung außerhalb eines Durchgangs schon tut. Dazu zählt auch „Sparschwein“ (1.000 Gold besitzen). Neue Erfolge werden wie bisher eingeblendet. „Hochstapler“ wird wie die anderen Durchgangserfolge geprüft.

## 6. Beute und Truhe

### 6.1 Gegenstände

- Es gibt **24 Gegenstände**. Jeder hat:
  - eine feste Kennung, einen Namen, eine Art (Kopf, Körper, Füße, Waffe, Schmuck) und eine Seltenheit
  - Werte als Modifikatoren der vorhandenen Werteverrechnung, einen Spruch und ein gemaltes Symbol
- Waffen haben zusätzlich eine Waffenart: Nahkampf, Zauber oder Wurf. Ob eine Klasse nur bestimmte Waffenarten tragen darf, entscheidet Paket 4.
- **Seltenheiten:**
  - Gewöhnlich: 12 Stück, grauer Rahmen
  - Selten: 8 Stück, blauer Rahmen
  - Legendär: 4 Stück, goldener Rahmen
- **Beutewurf:** zuerst die Seltenheit (Gewöhnlich 70 %, Selten 25 %, Legendär 5 %), dann ein Gegenstand dieser Seltenheit mit gleicher Chance.
- **Werte sind Startwerte.** Paket 4 darf sie ändern, ohne dass alte Spielstände brechen, denn gespeichert werden nur Kennungen. Kennungen werden nie gelöscht oder umbenannt.

**Startkatalog** (Namen und Sprüche sind Vorschläge des Entwurfs):

| Art | Name | Seltenheit | Werte | Spruch |
|---|---|---|---|---|
| Kopf | Helm der mäßigen Zuversicht | gewöhnlich | Rüstung +1 | Sitzt. Meistens. |
| Kopf | Topf mit Kinnriemen | gewöhnlich | Leben +5 % | Früher war hier Suppe drin. |
| Kopf | Denkerkappe mit Bommel | selten | Erfahrung +8 % | Klüger sieht man damit nicht aus. Ist man aber. |
| Kopf | Federhut der Selbstüberschätzung | selten | kritische Chance +5 Prozentpunkte | Die Feder ist größer als der Mut. |
| Kopf | Krone des Kneipenkönigs | legendär | Gold +15 %, Rüstung +1 | Gewonnen beim Würfeln. Ehrlich. |
| Körper | Wams aus Kartoffelsack | gewöhnlich | Leben +5 % | Kratzt, hält aber warm. |
| Körper | Kettenhemd mit Lücken | gewöhnlich | Rüstung +1 | Lüftung inklusive. |
| Körper | Lederweste „Fast wie neu“ | gewöhnlich | Ausweichchance +3 % | Nur ein Vorbesitzer. Glaub uns. |
| Körper | Schuppenpanzer des Drachen, der keiner war | selten | Rüstung +2 | Es war ein sehr großer Fisch. |
| Körper | Mantel der dramatischen Auftritte | legendär | Leben +10 %, Ausweichchance +5 % | Weht auch ohne Wind. |
| Füße | Stiefel des übereilten Rückzugs | gewöhnlich | Lauftempo +5 % | Vorwärts ist auch nur eine Richtung. |
| Füße | Pantoffeln der Gemütlichkeit | gewöhnlich | Lebensregeneration +0,5/s | Wer will schon kämpfen. |
| Füße | Siebenmeilen-Sandalen (nur drei Meilen) | selten | Lauftempo +8 % | Der Rest ist im Kleingedruckten. |
| Füße | Stiefel mit Sprungfedern | selten | Ausweichchance +5 % | Boing. |
| Waffe (Nahkampf) | Löffel des Zorns | gewöhnlich | Schaden +4 % | Für Suppe und Feinde. |
| Waffe (Zauber) | Ast mit Ambitionen | gewöhnlich | Abklingzeit −4 % | Wird mal ein Zauberstab. Sagt er. |
| Waffe (Wurf) | Buttermesser des Schreckens | gewöhnlich | kritische Chance +3 Prozentpunkte | Streicht auch Feinde. |
| Waffe (Nahkampf) | Nudelholz der Gerechtigkeit | selten | Schaden +8 % | Oma hat es immer gesagt. |
| Waffe (Zauber) | Zauberstab mit Wackelkontakt | selten | Wirkungsfläche +10 % | Funktioniert, wenn man draufhaut. |
| Waffe (Wurf) | Bumerang der Rückkehr (meistens) | selten | kritische Chance +6 Prozentpunkte, kritischer Schaden +0,1 | Kommt zurück. Irgendwann. |
| Waffe (Nahkampf) | Opas Schwert „Erbstück“ | legendär | Schaden +12 %, kritische Chance +5 Prozentpunkte | Opa hat damit Brot geschnitten. |
| Schmuck | Glückspfennig mit Loch | gewöhnlich | Gold +5 % | Das Loch bringt das Glück. |
| Schmuck | Kette aus Kronkorken | gewöhnlich | Sammelradius +10 % | Gesammelt in der Taverne. Jeder einzelne. |
| Schmuck | Ring der unverschämten Glückssträhne | legendär | kritische Chance +10 Prozentpunkte, Gold +10 % | Kasimir will ihn zurück. |

### 6.2 Truhe

- Die Truhe zeigt alle 24 Plätze in einem Raster.
  - Gefundene Gegenstände erscheinen mit Symbol und Seltenheitsrahmen.
  - Nicht gefundene erscheinen als dunkle Umrisse mit „?“.
  - Oben steht „X von 24 gefunden“.
- Antippen eines gefundenen Gegenstands öffnet eine Detailansicht mit:
  - großem Symbol, Name, Art und Seltenheit
  - Werten in Worten, so wie die Heldenerstellung sie schon beschreibt
  - dem Spruch und dem Hinweis „Wirkt im Abenteuer-Modus.“
- Neu gewonnene Gegenstände tragen bis zum ersten Ansehen ein kleines „Neu“.

### 6.3 Doppelte

Gewinnt man einen Gegenstand, den man schon besitzt, verkauft der Wirt ihn sofort. Der Spieler sieht „Schon vorhanden – Kasimir kauft ihn dir für 30 Gold ab.“ (bzw. Madame Funkel am Glücksrad)

- Verkaufswert: gewöhnlich 10, selten 30, legendär 100 Gold.
- Der Verkaufswert zählt nicht zum Goldgewinn-Wert des Helden.

Gewinnt man zum ersten Mal einen Gegenstand, zeigt ein kleiner Beute-Moment Symbol, Namen und Seltenheit.

## 7. Das Duo Giraffe und Erdmännchen

### 7.1 Freischalten

- In der Taverne-Übersicht steht die Karte „Stall“. Bis zur Freischaltung zeigt sie das Duo geschwärzt (Umriss) mit „Ein ungewöhnliches Gespann wartet im Stall. 20.000 Gold.“
- Bei genug Gold wird der Knopf „Freischalten“ aktiv. Eine Rückfrage nennt den Preis, dann wird abgebucht, gespeichert und das Duo in Farbe gezeigt („Freigeschaltet! Lege bei ‚Neuer Held‘ ein Duo an.“).
- Die Freischaltung gilt für den ganzen Spielstand, nicht für einen Helden. Der Preis steht in den Daten.

### 7.2 Held anlegen

- Bei „Neuer Held“ zeigt die Tierwahl eine vierte Karte „Giraffe & Erdmännchen“.
  - Vor der Freischaltung ist sie geschwärzt und gesperrt („In der Taverne freischaltbar“).
  - Danach ist sie wählbar.
- Wählt man das Duo, entfällt die Klassenwahl, denn das Duo hat seine eigene Klasse **Hochstapler**. Es geht direkt zum Namen.
- Das Duo belegt einen normalen Speicherplatz und zählt zu den höchstens sechs Helden.
- Zeile in Heldenauswahl und Modusauswahl: „Giraffe & Erdmännchen · Hochstapler“.

### 7.3 Werte

Das Duo ist ein viertes Tier im Datensatz der Tiere (Kennung `giraffe`) mit fest zugeordneter Klasse `hochstapler`. Andere Klassen sind für das Duo nicht wählbar, und keine andere Tierart kann Hochstapler sein.

| | Werte |
|---|---|
| Tier „Giraffe & Erdmännchen“ | Leben 115, Tempo 5,0; Eigenheit **Ausguck**: Sammelradius +30 %, Erfahrung +10 % („Das Erdmännchen sieht alles zuerst.“) |
| Klasse „Hochstapler“ | Leben +15 %, Rüstung +1, Wirkungsfläche +10 % |

### 7.4 Fähigkeiten

Fünf Fähigkeiten, alle mit vorhandenen Wirkungsformen, Stufen nach demselben Muster wie bisher:

- Stufen 2 bis 5 bringen je +20 % Grundschaden.
- Stufe 3 und Stufe 5 bringen zusätzlich ein Extra.

| Fähigkeit | Form | Wer | Wirkung | Startwerte |
|---|---|---|---|---|
| **Langer Hals, kurzer Prozess** (Start) | Bogen, Auto-Zielen | Giraffe | Weiter Halsschwung nach vorn | Schaden 13, Abklingzeit 1,2 s, Radius 3,2, Winkel 130°; Stufe 3: Winkel +40°; Stufe 5: zweiter Schwung nach hinten |
| **Nüsse von oben** | Geschoss auf den nächsten Gegner | Erdmännchen | Wirft Nüsse vom Giraffenkopf | Schaden 5, Abklingzeit 0,9 s, 2 Nüsse, Reichweite 12; Stufe 3: +1 Nuss; Stufe 5: durchschlagen 2 Gegner |
| **Stampede für Arme** | Ring um den Helden | Giraffe | Stampft, Schaden rundum und Verlangsamung | Schaden 11, Abklingzeit 3,5 s, Radius 3,2, Verlangsamung 30 % für 1,5 s; Stufe 3: Radius ×1,25; Stufe 5: Abklingzeit ×0,75 |
| **Hier wurde gebuddelt** | Zielfläche in der dichtesten Gruppe | Erdmännchen | Ein Loch tut sich auf, Gegner stolpern und sind kurz verwirrt | Schaden 20, Abklingzeit 6 s, Radius 2,5, Verzögerung 0,6 s, Verwirrung 1,5 s; Stufe 3: Radius +1; Stufe 5: Verwirrung +1,5 s |
| **Großfamilie** | Beschwörung | Erdmännchen | Die Verwandtschaft taucht auf und lenkt Gegner ab | Abklingzeit 12 s, Dauer 5 s, Lockradius 8, Explosionsradius 3; Stufe 3: Dauer +2 s; Stufe 5: zum Ende eine Staubexplosion mit 25 Schaden |

Die Zahlen sind Startwerte fürs Balancing, wie bei den anderen Klassen.

- Die Spalte „Wer“ wirkt nur in der Darstellung: Nüsse starten auf Kopfhöhe der Giraffe, die Buddelstelle zeigt einen Erdhaufen.
- Die Großfamilie erscheint als kleine Gruppe von drei Erdmännchen aus Grundformen. Ein eigenes Bild ist nicht nötig. Die Spiellogik behandelt sie wie den vorhandenen Klon.

### 7.5 Aussehen

- Eine Figur: Die Giraffe trägt das Erdmännchen auf dem Kopf. Das Bild kommt vom Auftraggeber (Abschnitt 9).
- Größe in der Welt: etwa 2,6 m. Die Figur ist deutlich größer als die anderen Helden (1,6 m), aber kleiner als der Bär (3,2 m).
- **Bildfolge (Wunsch des Auftraggebers vom 2026-11-13, nach Lieferung):** `duo.webp` enthält vier Phasen nebeneinander. Von links nach rechts zeigen sie:
  1. Erdmännchen steht oben auf dem Kopf
  2. Erdmännchen rutscht herunter (Nüsse fallen)
  3. Erdmännchen klettert den Hals hinauf
  4. Erdmännchen sitzt auf dem Rücken

  Die Figur spielt sie in entspanntem Rhythmus immer wieder durch, in der Reihenfolge der Bildpositionen **4 → 3 → 1 → 2**: auf dem Rücken, hochklettern, oben stehen, herunterrutschen.
  - Die Dauer je Phase steht in den Daten. Startwerte des Entwurfs: Rücken 2,5 s, Klettern 1,2 s, oben 2,5 s, Rutschen 0,8 s.
  - Die Giraffe bleibt in allen Phasen gleich groß und steht auf demselben Fußpunkt, nur das Erdmännchen wechselt.
  - Die Bildfolge läuft auch im Stand und in der Vorschau.
  - Bei „Bewegung reduzieren“ bleibt sie auf Phase 4 (Rücken) stehen.
  - Der Stall und die Heldenerstellung zeigen als Standbild Phase 1 (oben stehen).
- Die Größe wirkt **nur im Bild**. Körperradius, Trefferfläche, Kamera und Hindernisse bleiben wie bei allen Helden, damit das Duo nicht schwerer zu spielen ist.
- Neue Gangart „schreiten“: langsamer, gemächlicher Passgang mit leichtem Wiegen des Halses (eine Neigung, kein Hüpfen).
- Fehlt das Bild, gibt es eine einfache Ersatzfigur aus Grundformen (langer Hals, kleines Erdmännchen obendrauf), wie bei den anderen Helden. Gleiches gilt für die drehende Vorschau bei der Heldenerstellung.
- Bisherige Regeln gelten weiter: Die Figur schaut nach rechts, wird nach links gespiegelt, hat einen Bodenschatten und blitzt bei Treffern rot.

### 7.6 Verhältnis zu bestehenden Erfolgen

„Zoo-Direktor“ (mit jedem Tier gewinnen) zählt weiter nur Hase, Ente und Waschbär. Sonst würde der Erfolg nachträglich schwerer. Für das Duo gibt es den eigenen Erfolg „Hochstapler“ (Abschnitt 5.5).

## 8. Spielstand

Neue Version **3**. Neue Felder:

```text
inventory: string[]          Kennungen der gefundenen Gegenstände, jede höchstens einmal
seenItems: string[]          Kennungen, die schon in der Truhe angesehen wurden (für „Neu“)
unlocks: string[]            Freischaltungen des Spielstands, z. B. 'duo'
stats.tavernRounds: number   gespielte Taverne-Runden
stats.hiLoBestStreak: number längste Trefferserie bei Höher oder tiefer
```

- **Umwandlung 2 → 3:** leere Listen, Zähler 0. Alles andere bleibt unverändert.
- **Prüfung beim Laden und Import:**
  - Gegenstände und Freischaltungen müssen bekannt sein und dürfen nicht doppelt vorkommen.
  - `seenItems` darf nur Gegenstände aus `inventory` enthalten.
  - Ein Held mit Tier `giraffe` muss Klasse `hochstapler` haben und umgekehrt.
  - Ein solcher Held setzt die Freischaltung `duo` voraus.
- Ein Export der Version 3 lässt sich in einer älteren Spielversion nicht laden. Das ist das bekannte Verhalten bei neueren Ständen.
- Gespeichert wird nach jeder Taverne-Runde (bei Höher oder tiefer nach Start und nach Auszahlung), nach der Freischaltung und nach dem Ansehen neuer Gegenstände.

## 9. Bilder vom Auftraggeber

Vier Bilder. Bis sie da sind, gibt es überall Ersatz:

- **Gaststube:** dunkler Holzton als Verlauf
- **Wirte (Affe und Elster):** ein Kreis mit dem Anfangsbuchstaben
- **Beute:** ein Symbol der Art (Helm, Hemd, Stiefel, Schwert, Ring) im Seltenheitsrahmen
- **Duo:** die 3D-Ersatzfigur

Ausschnitte werden nach Lieferung ausgemessen und in die Daten eingetragen, wie bei Paket 1.

| Datei | Inhalt |
|---|---|
| `assets/taverne/gaststube.webp` | Gemütliche Gaststube von innen, als Hintergrund |
| `assets/taverne/wirte.webp` | Affe und Elster nebeneinander auf weißem Grund |
| `assets/taverne/beute.webp` | Die 24 Gegenstände in einem Raster 6 × 4 auf weißem Grund |
| `assets/figuren/duo.webp` | Giraffe mit Erdmännchen auf dem Kopf, auf weißem Grund |

**Beschreibungen für den Bildgenerator** stehen in Anhang A. Sie nutzen den vereinbarten Stilblock.

## 10. Handy und Bedienung

- Alle Taverne-Bildschirme funktionieren bei 360 × 640 und 390 × 844 ohne seitliches Scrollen. Alle Knöpfe sind mindestens 44 px hoch.
- Hochkant liegen Einsatz und Spielknopf unten in Daumenreichweite.
- Tastatur:
  - Leertaste oder Enter spielt.
  - Bei Höher oder tiefer gelten Pfeil hoch und Pfeil runter, A zahlt aus.
  - Esc ist „Zurück“.
- Text nur über `textContent`, Oberfläche auf Deutsch.

## 11. Regeln im Code

Es gelten die Regeln aus Abschnitt 4 der Übergabe, besonders:

- **Logik ohne Grafik und Browserzugriffe:** Würfeln, Rad, Kartenschritte, Beutewurf und Verkauf von Doppelten sind reine Funktionen mit übergebenem Zufall.
- **Spielstand-Funktionen wie bei den Dauerboni:** Freischalten und Rundenergebnis verrechnen verändern den übergebenen Spielstand und melden, ob es geklappt hat (zu wenig Gold, schon freigeschaltet).
- **Zahlen in `src/data/`:** Einsätze, Radfelder, Faktoren, Obergrenzen, Beutechancen, Verkaufswerte, Preis des Duos, Gegenstände, Wirte und Sprüche.

## 12. Entscheidungen des Entwurfs (nicht vom Auftraggeber festgelegt)

- **Höher oder tiefer zahlt nach Risiko statt immer doppelt** (Abschnitt 5.4). Bei der Auswahl stand „jeder Treffer verdoppelt“. Das ließe sich aber mit sicheren Tipps ausnutzen.
- Einsätze 10/50/100/500, Beute erst ab Einsatz 100, alle Auszahlungsquoten, Radfelder, Joker, Obergrenzen (5 Treffer, 50-facher Einsatz)
- Seltenheiten und ihre Chancen, Verkaufswerte für Doppelte, der Startkatalog mit Namen, Werten und Sprüchen
- Namen der Wirte: Kasimir (Affe) und Madame Funkel (Elster). Dass ein Affe beide Tische betreut, hat der Auftraggeber am 2026-11-13 entschieden. So gibt es keine Verwechslung mit Fuchs und Dachs, die das Paket „Neue Gegner“ als Gegner plant.
- Werte, Klasse „Hochstapler“, Fähigkeiten, Größe und Gangart des Duos
- Vier Taverne-Erfolge mit kleinen Belohnungen; „Zoo-Direktor“ bleibt bei drei Tieren
- Die Truhe zeigt nicht gefundene Gegenstände als Umrisse („X von 24 gefunden“)
- Taverne nur über die Modusauswahl erreichbar (nicht zusätzlich im Hauptmenü)
- Nach dem Gegenlesen festgelegt:
  - Joker nie auf der Startkarte und nicht als Treffer gezählt
  - Karten unabhängig gezogen; Topf je Schritt auf ganzes Gold abgerundet
  - Rundenzähler beim Start, Serie auch nach einem Fehltipp gespeichert
  - nach jeder Runde alle gespeicherten Erfolge prüfen
  - die Größe des Duos wirkt nur im Bild
  - die Großfamilie besteht aus drei Erdmännchen aus Grundformen

## 13. Was dem Bau überlassen bleibt

- Aufteilung in Dateien innerhalb der bestehenden Ordner
- Genaue Gestaltung von Würfeln, Rad, Karten, Beute-Moment und Truhenraster
- Wie die Animationen technisch entstehen
- Die Sprüche der Wirte (je Wirt etwa 6 bis 8 im Ton der Erfolge)
- Die Ersatzfigur des Duos und die Ersatzsymbole der Beute im Einzelnen

## 14. Prüfung

**Automatisch (`tests.html`):**

- **Auszahlungsquoten:** genau ausgerechnet über alle Ausgänge, nicht ausgewürfelt. Würfelbecher und Glücksrad über und unter 100 Einsatz liegen zwischen 88 und 95 %. Bei Höher oder tiefer liegt für jede offene Karte die bessere der beiden Wahlen zwischen 88 und 95 %, und keine Wahl liegt über 95 % (durch das Abrunden kann eine fast sichere Wahl darunter fallen). Mit dem Gegenwert der Doppelten bleibt alles unter 97 %.
- **Spiele:** gleicher Startwert ergibt gleiches Ergebnis; Gleichstand beim Würfeln; Beute nur ab 100; Faktoren und gesperrte Wahl; Obergrenzen; Joker.
- **Beute:** Verteilung der Seltenheiten über viele Würfe; Doppelte werden verkauft; Truhe enthält jede Kennung höchstens einmal.
- **Spielstand:**
  - Rundenergebnis wird genau einmal verrechnet; Einsatz über dem vorhandenen Gold wird abgelehnt.
  - Freischalten mit zu wenig Gold, doppeltes Freischalten.
  - Umwandlung 2 → 3; die Prüfung lehnt unbekannte Gegenstände, Doppelte, ein Duo ohne Freischaltung und falsche Tier-Klasse-Paare ab.
- **Duo:** Werte, Startfähigkeit, Kartenvorrat nur aus eigenen Fähigkeiten, jede Fähigkeit trifft wie ihre Wirkungsform.
- **Erfolge:** die vier neuen; „Zoo-Direktor“ unverändert.
- Alle bisherigen Tests bleiben grün.

**Von Hand im Browser:**

- Jedes Spiel mehrfach bei 390 × 844 und am PC spielen.
- Neuladen mitten in einer Animation.
- Höher oder tiefer abbrechen.
- Truhe und Detailansicht ansehen.
- Duo freischalten (mit Testschalter für Gold), anlegen und einen Durchgang spielen.
- Alter Spielstand der Version 2 lädt.
- Alles mit und ohne gelieferte Bilder.

**Nur der Auftraggeber kann prüfen:** ob die Spiele Spaß machen, ob Beute selten genug ist und ob 20.000 Gold sich richtig anfühlen.

## Anhang A – Beschreibungen für den Bildgenerator

Stilblock (wie vereinbart, an jede Beschreibung anhängen): *zarte Aquarellmalerei mit feinen Buntstift- und Tuschestrichen, Kinderbuch-Illustration nach der Natur, gedeckte Farben, weißer oder transparenter Hintergrund, Figur schaut nach rechts, keine Schlagschatten, kein Text.*

**1. Gaststube** (`gaststube.webp`, Querformat, etwa 1600 × 1000, *hier ausnahmsweise mit gemaltem Hintergrund statt weiß*): Gemütliche Waldtaverne von innen, aus Holz und Stein, warmes Licht von einem Kamin und Kerzen. Ein langer Holztresen mit Fässern und Krügen, einige runde Tische mit Hockern, an der Wand ein großes hölzernes Glücksrad, auf einem Tisch ein Würfelbecher und Spielkarten. Keine Figuren. Die Mitte des Bildes ruhig halten, weil dort Text liegt.

**2. Wirte** (`wirte.webp`, zwei Figuren nebeneinander mit Abstand, je ganz zu sehen, weißer Hintergrund):

- **Affe** (ein Kapuzineräffchen) in einer gestreiften Weste mit hochgekrempelten Ärmeln, verschmitzt grinsend. In einer Hand hält er einen Würfelbecher, mit der anderen fächert er Spielkarten auf. Aus dem Ärmel lugt eine Karte.
- **Elster** mit glitzerndem Halstuch und Schmuck, eitel und vergnügt, eine Flügelspitze auf einem kleinen Glücksrad.
Beide schauen nach rechts.

**3. Beute** (`beute.webp`, 24 Gegenstände in einem Raster aus 6 Spalten und 4 Reihen, gleich große Felder, jeder Gegenstand mittig und mit Abstand, weißer Hintergrund), Reihe für Reihe von links nach rechts:

- **Reihe 1:**
  1. verbeulter Ritterhelm
  2. Kochtopf mit Lederkinnriemen
  3. Wollmütze mit großem Bommel
  4. Hut mit übergroßer Feder
  5. kleine goldene Krone mit Bierschaum-Fleck
  6. Wams aus Kartoffelsack
- **Reihe 2:**
  7. Kettenhemd mit Löchern
  8. abgewetzte Lederweste
  9. Schuppenpanzer aus Fischschuppen
  10. roter wehender Umhang
  11. Stiefel, deren Spitzen nach hinten zeigen
  12. karierte Pantoffeln
- **Reihe 3:**
  13. Sandalen mit Flügelchen
  14. Stiefel mit Sprungfedern unter der Sohle
  15. großer Holzlöffel
  16. knorriger Ast mit einem Blatt
  17. Buttermesser
  18. Nudelholz
- **Reihe 4:**
  19. Zauberstab mit Pflaster und Funken
  20. Bumerang
  21. altes Schwert mit Brotkrümeln
  22. Kupfermünze mit Loch an einer Schnur
  23. Kette aus Kronkorken
  24. goldener Ring mit vierblättrigem Kleeblatt

**4. Duo** (`duo.webp`, eine Figur, ganz zu sehen, weißer Hintergrund): Eine junge Giraffe in ganzer Größe, die auf dem Kopf zwischen den Hörnchen ein aufrecht stehendes Erdmännchen trägt. Die Giraffe trägt eine kleine Satteldecke, das Erdmännchen hat eine Schleuder und einen Beutel Nüsse und hält Ausschau mit der Pfote über den Augen. Beide wirken unternehmungslustig. Die Giraffe schreitet nach rechts.
