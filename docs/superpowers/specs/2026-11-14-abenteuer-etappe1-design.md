# AnimalWarrior – Abenteuer-Modus, Etappe 1: Grundgerüst mit Kapitel 1 (Design)

Stand: 2026-11-14 · erste von fünf Etappen des Abenteuer-Modus (Paket 4)

## 1. Anlass und Ziel

Der Auftraggeber wünscht sich den Abenteuer-Modus als „großen Umbau“, wörtlich: „eine gute story. 2-3 Unterklassen pro klasse mit Skilltree. Mini Map und mehr maps und verschiedene Gegner. Verkäufer, Schmiede und Quest Dialoge. Noch mehr Freischaltbare Klassen“.

Das ist zu groß für ein Paket. Vereinbart sind fünf Etappen, jede für sich spielbar und in dieser Reihenfolge (vom Auftraggeber bestätigt):

1. **Grundgerüst mit Kapitel 1** (dieses Dokument): Dorf, erste Karte mit Minikarte, Geschichte, Gespräche, Aufträge, Händler, Schmied, Ausrüstung anlegen, Lagerfeuer, Zwischenboss und Kapitel-Boss
2. Unterklassen (2–3 je Klasse) mit Fähigkeitenbaum
3. Kapitel 2 bis 4 mit neuen Karten und Gegnern
4. Sichtbare Ausrüstung am Helden (aufgelegte gemalte Teile; Bild-Beschreibungen gibt es, „sobald es soweit ist“)
5. Neue freischaltbare Klassen

**Wie es sich spielen soll (Worte des Auftraggebers sinngemäß):** Keine riesige offene Fläche wie im Wellen-Modus, sondern eine lineare Kartenführung. Man wird an die Geschichte herangeführt und geht Auftrag für Auftrag durch, mit Nebenaufträgen, verschiedensten Gegnern und Zwischenbossen je Karte. Man levelt seinen Helden für mehr Beute und stärkere Gegner. Der Held greift nur Gegner in der Nähe selbst an; Spezialfähigkeiten löst man selbst aus, höchstens drei gleichzeitig ausgewählt, dazu ein Knopf für Heiltränke (höchstens 4). Eine Karte dauert 20 bis 30 Minuten, und man stirbt nicht so schnell wie im Wellen-Modus. Die Geschichte ist eher lustig.

**Erfolg heißt (Etappe 1):**

- In der Modusauswahl ist „Abenteuer-Modus“ freigeschaltet. Jeder vorhandene Held kann ein Abenteuer beginnen.
- Man erlebt einen Einstieg in die Geschichte, läuft durch das Dorf Bachwinkel, spricht mit seinen Bewohnern und spielt Kapitel 1 „Der steigende Bach“ in 20 bis 30 Minuten durch, mit allen Haupt- und Nebenaufträgen, Zwischenboss und Kapitel-Boss.
- Händler, Schmied, Ausrüstung, Fähigkeitenwahl, Heiltränke, Lagerfeuer und Minikarte funktionieren.
- **Alles ist mit dem Handy allein, mit der Tastatur allein und mit der Maus allein spielbar** (Regel des Auftraggebers, gilt für jede Etappe).
- Der Wellen-Modus und die Taverne spielen sich genau wie vorher.
- Alte Spielstände und Exporte laden ohne Verlust. Vor jeder Umwandlung bleibt eine Sicherungskopie liegen.
- Auf dem Titelbildschirm steht die Versionsnummer des Spiels.

## 2. Ziele, Nicht-Ziele, Anti-Ziele

**Ziele** siehe Abschnitte 4 bis 14.

**Nicht-Ziele (kommen in späteren Etappen oder gar nicht)**

- Unterklassen und Fähigkeitenbaum (Etappe 2). Bis dahin gibt es die einfache Fähigkeitenwahl aus Abschnitt 7.
- Kapitel 2 bis 4 und deren Gegner (Etappe 3). Am Ende von Kapitel 1 steht „Fortsetzung folgt“.
- Ausrüstung am Helden sichtbar (Etappe 4)
- Neue Klassen (Etappe 5)
- Herstellen von Gegenständen beim Schmied (vom Auftraggeber verworfen: nur Verbessern)
- Ausrüstung im Wellen-Modus
- Zufällige Werte auf Gegenständen
- Mehrspieler, Synchronisation zwischen Geräten, Speichern auf einem Server

**Anti-Ziele**

- Der Wellen-Modus darf sich nicht verändern: gleiche Regeln, gleiche Zahlen, alle bisherigen Tests bleiben grün.
- Kein Fortschritt darf bei einem Update verloren gehen.
- Keine Bedienung, die nur mit Finger oder nur mit Tastatur geht.
- Kein echtes Geld, keine Werbung.
- Kein schnelles Sterben wie im Wellen-Modus: Das Abenteuer soll fordern, nicht hetzen.

## 3. Ansätze

### 3.1 Karten

| Ansatz | Abwägung |
|---|---|
| **A – Karte aus Bausteinen:** Weg, Lichtungen, Bach, Orte von Leuten, Lagerfeuern, Gegnergruppen und Bossen stehen als Beschreibung in `src/data/`. Gezeichnet wird mit den vorhandenen gemalten Böden, Bäumen und Felsen; dichte Bäume, Felsen und Wasser bilden die Ränder. Dazu kommen neue gemalte Teile (Wasser, Weg, Häuser, Brücke, Lagerfeuer). Die Minikarte entsteht aus derselben Beschreibung. | leicht zu ändern und zu erweitern (Etappe 3 braucht drei weitere Karten); nutzt alles Vorhandene; sieht aus wie der Wellen-Modus mit Weg |
| B – ein großes gemaltes Bild je Kapitel als Boden | am schönsten, aber riesig; der Bildgenerator liefert so etwas kaum einheitlich; Ränder und Hindernisse müssten von Hand nachgezeichnet werden; jede Änderung braucht ein neues Bild |
| C – zufällig erzeugter Weg | jedes Mal anders, aber Aufträge und Geschichte brauchen feste Orte; fühlt sich weniger gemacht an |

**Gewählt: A**, vom Auftraggeber am 2026-11-14.

### 3.2 Speichern

| Ansatz | Abwägung |
|---|---|
| **A – localStorage behalten und absichern:** wie heute mit Versionsnummer und schrittweiser Umwandlung; neu eine Sicherungskopie vor jeder Umwandlung, die Bitte an den Browser um dauerhaften Speicher und ein Hinweis im Hauptmenü | bewährt, durch Tests abgesichert; ein Abenteuer-Stand ist nur wenige Kilobyte groß |
| B – IndexedDB | mehr Platz, den niemand braucht; mehr Code; gleiches Löschrisiko |
| C – SQLite im Browser | zusätzliche Bibliothek von etwa 1 MB, die am Ende auch im Browser speichert; kein Gewinn |

**Gewählt: A**, vom Auftraggeber am 2026-11-14. Bekannte Grenze für alle drei: Safari auf dem iPhone löscht die Daten einer Webseite nach 7 Tagen ohne Besuch, außer das Spiel liegt auf dem Home-Bildschirm. Dagegen helfen nur Export und Home-Bildschirm; der Hinweis im Hauptmenü sagt das (vom Auftraggeber gewünscht).

### 3.3 Spiellogik

Es gibt einen naheliegenden Weg: Das Abenteuer nutzt die vorhandene Welt (`src/core/world.js`) mit Held, Gegnern, Fähigkeiten, Kampf und Werteverrechnung und bringt einen eigenen Modus `src/modes/adventure.js` mit, so wie der Wellen-Modus `src/modes/survivor.js` hat. Die Kern-Spec hat das ausdrücklich so vorbereitet (Fähigkeiten trennen Wirkung und Auslöser, Werteverrechnung nimmt beliebige Quellen, Welt kennt keine Wellenregeln). Eine eigene zweite Spiellogik wäre doppelte Arbeit und doppelte Fehler.

Die Welt braucht dafür eine Erweiterung: Hindernisse kommen heute fest aus dem zufälligen Gelände (`obstaclesNear(world.seed, …)`). Im Abenteuer kommen sie aus der Kartenbeschreibung. Wie die Welt ihre Hindernisquelle bekommt, entscheidet der Bau; der Wellen-Modus muss sich dabei genau gleich verhalten.

## 4. Die Geschichte

Ton: lustig, wie die Namen der Gegenstände. Kurze Sätze, keine langen Textwände. Alle Texte stehen in `src/data/`.

**Idee des Auftraggebers:** Ein Goldfisch in einem Glas will das Land mit Wasser überfluten, damit die Fische die Welt regieren.

**Ausgearbeitet (vom Auftraggeber mit „passt so“ bestätigt):**

- **Bösewicht:** Goldfisch **Seine Durchlaucht Flossian der Erste**. Er sitzt in einem Glas, das zwei Krebse auf einer kleinen Sänfte tragen. Er hält sich für ein Genie und ist vor allem laut.
- **Sein Plan, „Die Große Flut“:** Dämme brechen, eine Regenwolke stehlen, das ganze Land fluten.
- **Seine Truppen:** Fische an Land in wassergefüllten Taucherhelmen, Krebse, Frösche; später Hechte und Aale.
- **Anfang:** Im Dorf Bachwinkel am Waldbach werden die Pfoten nass, der Bach steigt jeden Tag. Die Dorfälteste, die Schildkröte Oma Panzerla, schickt den Helden los.
- **Kapitel** (je eine Karte): 1 Waldbach und Dorf · 2 Sumpf (die Frösche haben sich verbündet) · 3 Der Biberdamm (die Biber wurden reingelegt) · 4 Der Schlosssee des Goldfischs, halb unter Wasser
- **Ende** (Etappe 3): Das Glas kippt um, Flossian landet in einer Pfütze und lebt danach beleidigt im Dorfbrunnen.
- Das Dorf ist der Ort, an den man zwischen den Kapiteln zurückkehrt.

### 4.1 Einstieg

Beim ersten Betreten des Abenteuers mit einem Helden läuft eine kurze Bildergeschichte: 4 bis 5 Tafeln mit je einem Landschaftsbild aus `assets/umgebung/szenen.webp` und zwei, drei Sätzen. Sie lässt sich mit „Weiter“ durchblättern und mit „Überspringen“ abbrechen. Danach steht der Held im Dorf, und Oma Panzerla hat ein „!“ über dem Kopf.

Vorschlag für die Tafeln (Wortlaut ist Sache des Baus, Ton wie hier):

1. „Bachwinkel. Ein Dorf, in dem nie etwas passiert. Das gefiel allen sehr.“
2. „Bis der Bach anfing zu steigen. Erst nasse Pfoten. Dann nasse Knie. Dann schwamm Krümels Laden davon. Kurz.“
3. „Weit weg, in einem Glas, lachte jemand sehr laut. Er hieß Flossian der Erste und hatte einen Plan.“
4. „Und jemand musste nachsehen gehen. Jemand Mutiges. Oder wenigstens jemand, der gerade Zeit hatte.“

Am Ende von Kapitel 1 gibt es eine kurze Abschlusstafel mit „Fortsetzung folgt“ (Hinweis auf den Sumpf).

## 5. Bildschirme und Ablauf

Heldenauswahl → Modusauswahl → **Abenteuer** (erster Besuch: Einstieg) → im Spiel: Dorf oder Kapitel-Karte.

- **Modusauswahl:** Die dritte Karte „Abenteuer-Modus“ ist frei. Sie zeigt „Kapitel 1 · Level 7“ bzw. „Neues Abenteuer“.
- **Im Spiel** gibt es keinen Durchgang mit Ende wie im Wellen-Modus. Man spielt, bis man über das Pausenmenü zum Hauptmenü geht. Fortgesetzt wird am letzten Lagerfeuer (Abschnitt 9).
- **Pausenmenü** (Pause-Knopf, Esc): Weiter · Ausrüstung · Fähigkeiten · Aufträge · Karte · Zum Hauptmenü. Während das Pausenmenü und alle seine Seiten offen sind, steht die Welt still.
- **Gespräche, Händler, Schmied, Lagerfeuer** halten die Welt ebenfalls an.
- **Erfolge** werden wie bisher eingeblendet.

### 5.1 Anzeige im Spiel

Skizze hochkant (Knopfviereck rechts gewählt):

```text
┌──────────────────────┐
│ ❤ ████████░░  Lv 7 ┌─┐│
│ ✦ ███░░░░░░░       │▪││ ← Minikarte
│ Auftrag:           └─┘│
│ Krebslager (2/5)      │
│                       │
│         Held          │
│                       │
│   (laufen    [1] [2]  │
│    hier)     [3] [🧪4] │
└──────────────────────┘
```

- Oben links: Leben, Erfahrung bis zum nächsten Level, Level.
- Darunter der verfolgte Auftrag in einer Zeile mit Fortschritt.
- Oben rechts: die Minikarte (Abschnitt 6.4). Antippen oder Taste M öffnet die große Karte.
- Unten: das **Knopfviereck** (2 × 2): drei Fähigkeiten und der Heiltrank mit Anzahl. Jede Fähigkeit zeigt ihre Abklingzeit als ablaufenden Schatten. Leere Plätze sind sichtbar leer.
- **In den Einstellungen** wählt man, ob das Viereck **unten links oder unten rechts** liegt (Wunsch des Auftraggebers). Voreinstellung: rechts.
- Der Pause-Knopf liegt oben neben der Minikarte.
- **Sprechen-Knopf:** Steht der Held in Reichweite einer Person, eines Lagerfeuers oder eines Fundorts, erscheint über dem Knopfviereck ein großer Knopf „Sprechen“ bzw. „Rasten“ oder „Untersuchen“.
- Laufen geht wie heute mit Ziehen auf der Spielfläche. Auf dem Knopfviereck, dem Sprechen-Knopf und den Anzeigen beginnt kein Laufen.
- Quer sitzt alles an denselben Stellen, nur mit mehr Platz.

### 5.2 Bedienung

**Regel des Auftraggebers:** Handy allein, Tastatur allein und Maus allein reichen jeweils für alles.

| Aktion | Handy | Maus | Tastatur |
|---|---|---|---|
| Laufen | Daumen ziehen | Ziehen mit gedrückter Taste | W A S D oder Pfeiltasten |
| Fähigkeit 1–3 | Knopf antippen | Knopf anklicken | 1, 2, 3 |
| Heiltrank | Knopf antippen | Knopf anklicken | 4 |
| Sprechen, Rasten, Untersuchen | Knopf „Sprechen“ | Knopf anklicken oder Person anklicken | E oder Enter |
| Gespräch weiter | Antippen | Klicken | Leertaste oder Enter |
| Große Karte | Minikarte antippen | Minikarte anklicken | M |
| Pause und Menüs | Pause-Knopf | Pause-Knopf | Esc |
| In Menüs (Händler, Schmied, Ausrüstung, Fähigkeiten, Aufträge) | Antippen | Klicken | Pfeiltasten, Tab, Enter, Esc |

- Alle Knöpfe sind mindestens 44 px groß.
- Alle Bildschirme funktionieren bei 360 × 640 und 390 × 844 ohne seitliches Scrollen und quer am PC.
- Mit der Maus allein lässt sich laufen, weil Ziehen schon heute geht (Steuerkreis an der Stelle des Klicks). Ob Klicken auf eine Stelle den Helden dorthin laufen lässt, entscheidet der Bau; Pflicht ist es nicht.

## 6. Karten

### 6.1 Kartenbeschreibung

Jede Karte ist eine Beschreibung in `src/data/` (je Karte eine Datei). Sie enthält:

- **Begehbare Fläche:** ein Weg als Linienzug mit Breite und Lichtungen als Kreise oder Vielecke. Alles außerhalb ist nicht begehbar.
- **Ränder:** Außerhalb der begehbaren Fläche stehen dicht Bäume und Felsen, damit der Rand natürlich aussieht. Sie werden aus der Beschreibung fest erzeugt (gleiche Karte, gleiche Bäume) und können von Hand ergänzt werden.
- **Wasser:** Bach als Linienzug mit Breite; nicht begehbar, Geschosse fliegen darüber. Brücken und Furten machen Stellen begehbar.
- **Sperren:** Hindernisse, die erst nach einem Auftragsschritt verschwinden (z. B. eine Barrikade der Fische auf der Brücke). Bossbereiche schließen sich beim Betreten und öffnen sich nach dem Sieg.
- **Orte:** Leute (mit Blickrichtung), Lagerfeuer, Kisten, Fundorte für Aufträge, Übergänge zu anderen Karten, Startpunkt.
- **Gegnergruppen:** Ort, Gegnerarten und Anzahl, Gebietsstufe (Abschnitt 8.2), ob Elite dabei ist.
- **Bosse** mit ihrem Bossbereich.
- **Gebiete:** Namen für die Minikarte und den Hinweis beim Betreten („Krebslager“).

Hindernisse für die Spiellogik (Kollision von Held, Gegnern und Gegnergeschossen) kommen aus dieser Beschreibung. Der Held und laufende Gegner bleiben auf der begehbaren Fläche. Fliegende Gegner (Krähe) dürfen über Ränder und Wasser.

### 6.2 Dorf Bachwinkel

Eine kleine eigene Karte, etwa eine Minute von einem Ende zum anderen. Keine Gegner.

- Häuser: Haus von Oma Panzerla, Laden von Krümel, Schmiede von Grabowski, zwei Wohnhäuser, ein Brunnen in der Mitte.
- Der Bach fließt am Dorf vorbei, am Ufer stehen schon Pfützen.
- Ein Lagerfeuer am Dorfplatz.
- Ein Weg führt zum Dorfausgang. Dort beginnt Kapitel 1 (Übergang ohne Ladebildschirm oder mit kurzer Abblende, Sache des Baus).

### 6.3 Kapitel 1 „Der steigende Bach“

Ein Weg vom Dorf am Bach entlang in den Wald bis zur Quelle, in etwa 20 bis 30 Minuten mit allen Aufträgen. Länge und Aufteilung sind Startwerte; Zielgröße ist ein Hauptweg, den man ohne Kampf in etwa 4 bis 5 Minuten abläuft.

Gebiete in Wegrichtung (Vorschlag des Entwurfs):

1. **Bachufer** – erste Fischspäher, ruhiger Einstieg. Lagerfeuer 1.
2. **Krebslager** – Seitenlichtung mit Krebsen und Grabowskis Hammer.
3. **Alte Brücke** – Barrikade der Fische, Bossbereich von **Hauptmann Gräte** (Zwischenboss). Lagerfeuer 2 davor.
4. **Mühlenwiese** – Seitenweg zu Tante Amsel (Nebenauftrag), Nussverstecke.
5. **Tiefer Wald** – dichtere Gruppen, Elite-Gegner. Lagerfeuer 3.
6. **Quellteich** – Bossbereich von **Kommandant Zwickzwack** (Kapitel-Boss). Lagerfeuer 4 kurz davor.

Mindestens zwei Seitenwege führen zu Nebenaufträgen oder Kisten und enden in einer Sackgasse.

### 6.4 Minikarte und große Karte

- **Minikarte** oben rechts, rund oder eckig (Sache des Baus), etwa 90 bis 120 px. Sie zeigt die Umgebung des Helden: begehbare Fläche hell, Wasser blau, Rand dunkel.
- **Erkundung:** Was der Held noch nicht gesehen hat, bleibt verdeckt. Ein Bereich gilt als gesehen, wenn der Held näher als etwa 20 m war. Die Erkundung wird je Held und Karte gespeichert.
- **Zeichen:** Held als Pfeil in Blickrichtung, Lagerfeuer, Leute mit „!“ (neuer Auftrag) oder „?“ (Auftrag abgeben), Ziel des verfolgten Auftrags als Stern, Bosse als Totenkopf, sobald entdeckt. Ziele außerhalb der Minikarte erscheinen als Pfeil am Rand.
- **Große Karte** (Minikarte antippen oder M): die ganze erkundete Karte mit denselben Zeichen und den Gebietsnamen. Die Welt steht still. Schließen mit Antippen, Esc oder M.

## 7. Held, Level und Fähigkeiten

### 7.1 Ein Held für alle Modi

Vom Auftraggeber bestätigt: Man spielt das Abenteuer mit den vorhandenen Helden.

- **Gemeinsam für alle Helden und Modi:** Gold, die Truhe mit den Gegenständen, die Verbesserungsstufen der Gegenstände, Material, Freischaltungen, Erfolge.
- **Nur im Abenteuer und je Held:** Abenteuer-Level und Erfahrung, Fähigkeitenstufen und Knopfbelegung, angelegte Ausrüstung, Heiltränke, Aufträge, Kapitel, Lagerfeuer, Erkundung.
- Der Wellen-Modus bleibt unberührt: kein Abenteuer-Level, keine Ausrüstung.
- **Dauerboni** aus dem Hauptmenü wirken auch im Abenteuer (Leben, Schaden, Tempo, Sammelradius, Erfahrung, Gold, Rüstung), aber nicht „Neun Leben“, weil das Abenteuer Lagerfeuer hat. *(Entscheidung des Entwurfs.)*
- Das Duo (Giraffe & Erdmännchen) darf mit ins Abenteuer.
- Ein Held kann gelöscht werden wie bisher; sein Abenteuer-Stand geht mit.

### 7.2 Level

- Erfahrung gibt es für besiegte Gegner, Bosse und erledigte Aufträge.
- In Kapitel 1 erreicht man etwa Level 10. Höchstes Level in Etappe 1: 30 (für die späteren Kapitel). Die Erfahrungskurve steht in den Daten und ist eine eigene Kurve fürs Abenteuer.
- **Jedes Level** bringt einen festen Zuwachs (Startwert: +6 % Leben, +4 % Schaden) und **einen Fähigkeitspunkt**. Ein Level-up füllt das Leben auf, zeigt kurz „Level 5!“ und hält das Spiel nicht an (keine Kartenwahl wie im Wellen-Modus).

### 7.3 Fähigkeiten bis zum Fähigkeitenbaum

Vom Auftraggeber bestätigt („der passt“):

- **Grundattacke** ist die Startfähigkeit der Klasse (Krieger „Ordentlich Draufhauen“, Magier Feuerball, Dieb Wurfdolche, Hochstapler „Langer Hals, kurzer Prozess“). Sie löst von selbst aus, **aber nur, wenn ein Gegner in ihrer Reichweite ist** (Nahkampf: Hiebweite plus etwas Spielraum; Fernkampf: ihre Suchweite). Ohne Gegner in der Nähe schlägt der Held nicht in die Luft.
- **Die vier weiteren Fähigkeiten der Klasse** werden mit **Level 2, 4, 6 und 8** frei, in der Reihenfolge von `abilityPool`.
- **Drei Knöpfe:** Im Bildschirm „Fähigkeiten“ legt man bis zu drei freie Fähigkeiten auf die Knöpfe 1 bis 3. Eine neu freie Fähigkeit landet von selbst auf dem ersten leeren Knopf.
- **Fähigkeitspunkte** heben eine freie Fähigkeit oder die Grundattacke um eine Stufe (1 bis 5, Stufen wirken wie im Wellen-Modus). Bis Level 10 hat man 9 Punkte, genug für etwa die Hälfte aller Stufen. Punkte lassen sich in Etappe 1 nicht zurücknehmen.
- **Auslösen von Hand:** Knopf drücken löst die Fähigkeit sofort aus, wenn sie bereit ist. Sie zielt selbst wie im Wellen-Modus (nächster Gegner, dichteste Gruppe, Blickrichtung oder um den Helden). Findet eine Fähigkeit, die ein Ziel braucht, keinen Gegner, löst sie nicht aus und verbraucht nichts (der Knopf wackelt kurz).
- Weil man sie seltener auslöst als im Wellen-Modus, sind Fähigkeiten von Hand **stärker und langsamer**: Im Abenteuer gelten eigene Faktoren für Schaden und Abklingzeit (Startwert: Schaden × 2,5, Abklingzeit × 2,5). Dauerhafte Formen bekommen im Abenteuer eine Dauer: Umlauf (Arkankugeln) und Stärkungen (Kriegsschrei) wirken 8 s. *(Startwerte des Entwurfs, im Bau feinzustimmen.)*
- In Etappe 2 ersetzt der Fähigkeitenbaum diese Wahl. Bis dahin vergebene Punkte werden dann zurückerstattet.

### 7.4 Heiltränke

- Höchstens **4** Tränke je Held (Wunsch des Auftraggebers).
- Ein Trank heilt sofort 40 % des höchsten Lebens. Danach sind Tränke 2 s gesperrt, damit man nicht aus Versehen zwei trinkt.
- Bei vollem Leben lässt sich kein Trank trinken.
- Tränke gibt es beim Händler (Startwert 25 Gold) und selten von Gegnern (Startwert 3 % je besiegtem Gegner, Bosse immer einer). Ist man schon bei 4, bleibt der Trank liegen.
- Rasten am Lagerfeuer heilt ganz, füllt aber keine Tränke auf. *(Entscheidung des Entwurfs, damit der Händler wichtig bleibt.)*
- Zu Beginn eines neuen Abenteuers hat man 2 Tränke.

## 8. Gegner und Kampf

### 8.1 Gruppen statt Wellen

- Gegner stehen in **Gruppen** an festen Orten der Karte (3 bis 8 Gegner). Sie laufen dort ruhig umher.
- Kommt der Held näher als etwa 10 m (**Aufmerksamkeit**), greift die ganze Gruppe an.
- Entfernt sich der Held weiter als etwa 25 m vom Ort der Gruppe, kehren die Gegner zurück und heilen sich voll (**Leine**). So lässt sich ein Kampf durch Weglaufen abbrechen.
- Gruppen fern vom Helden (über 40 m) werden nicht berechnet. Die Zahl gleichzeitig kämpfender Gegner bleibt dadurch klein.
- **Besiegte Gruppen** bleiben besiegt, bis der Held an einem Lagerfeuer rastet, stirbt oder die Karte neu betritt. Dann sind alle Gruppen wieder da (zum Üben, Leveln und Beute sammeln). **Bosse** bleiben für immer besiegt.
- Elite-Gegner wie im Wellen-Modus (größer, stärker, mehr Erfahrung), einzeln in manchen Gruppen.
- **Nicht so schnell sterben:** Gegnerschaden und Gruppengrößen sind so gewählt, dass ein Held mit passendem Level und Ausrüstung, der still in einer Gruppe von 6 normalen Gegnern steht, frühestens nach etwa 20 Sekunden fällt. *(Zielwert für das Balancing; im Bau mit einem Test nachgerechnet.)*

### 8.2 Gebietsstufen

- Jede Gegnergruppe hat eine **Gebietsstufe** (Kapitel 1: Stufe 1 bis 10). Leben, Schaden und Erfahrung der Gegner wachsen mit der Stufe (Faktoren in den Daten).
- Gegner werden **nicht** mit dem Level des Helden stärker. Wer zurückgeht, ist dort stärker als die Gegner. Wer eine Gruppe viel höherer Stufe angreift, merkt es.
- Die Stufe einer Gruppe ist nicht sichtbar, ihr Gebiet aber nennt die Minikarte; Bosse zeigen ihren Namen.

### 8.3 Gegner in Kapitel 1

Vorhandene Gegner, die das Wasser aufgescheucht hat: **Ratte, Fuchs, Krähe, Igel, Kreuzotter, Wildschwein**. Ihre Bilder und Bewegungsarten bleiben.

Neu, Flossians Truppe (Bilder vom Auftraggeber, bis dahin Ersatzformen):

| Gegner | Aussehen | Bewegung (vorhandene Form) | Eigenheit |
|---|---|---|---|
| **Helmfisch** | kleiner Barsch in einem wassergefüllten Taucherhelm auf zwei Froschbeinen | verfolgt (`chase`) | häufigster Gegner, schwach |
| **Krebs** | Flusskrebs mit erhobenen Scheren | seitlich nähernd (`strafe`) | zäh, nimmt weniger Schaden von vorn (Startwert: Rüstung) |
| **Frosch** | grüner Frosch mit Algenhelm | duckt sich und springt (`pounce`) | Sprung mit Bodenkreis wie der Luchs, schwächer |

Die genauen Werte sind Sache des Baus (gleiche Größenordnung wie Fuchs, Igel und Luchs).

### 8.4 Bosse in Kapitel 1

| Boss | Aussehen | Angriffe (vorhandene Formen aus `BOSS_MOVES`) |
|---|---|---|
| **Hauptmann Gräte** (Zwischenboss, Alte Brücke) | großer Hecht im Taucherhelm mit Säbel | Ansturm (`dash`), Hieb (`swipe`) |
| **Kommandant Zwickzwack** (Kapitel-Boss, Quellteich) | riesiger Krebs mit Feldherrenhut | Scherenhieb (`swipe`), Wasserwelle um sich herum (`ring`), ruft alle 25 s drei Krebse herbei |

- Der Bossbereich schließt sich beim Betreten (Wasserwand oder Dornen, Sache des Baus) und öffnet sich nach dem Sieg. Bossanzeige mit Namen wie im Wellen-Modus.
- Ein Bosskampf dauert mit passendem Level etwa 1 bis 3 Minuten.
- Stirbt der Held im Bosskampf, ist der Boss beim nächsten Versuch wieder voll.
- Bosse geben viel Erfahrung, sicher einen Gegenstand, einen Trank und Material (Abschnitt 11.2).
- Flossian selbst kämpft in Kapitel 1 nicht. Er erscheint nur in Gesprächen (als Porträt, er spricht über eine „Flaschenpost“).
- Neue Bossangriffs-Form „Verstärkung rufen“ für Zwickzwack: Der Bau darf sie als neue Form in `BOSS_MOVES` anlegen; der Wellen-Modus nutzt sie nicht.

### 8.5 Tod

Vom Auftraggeber gewählt (A):

- Fällt der Leben auf 0, gibt es eine kurze Sterbephase (wie im Wellen-Modus) und den Satz „Du wachst am Lagerfeuer auf …“.
- Der Held erwacht am **zuletzt benutzten Lagerfeuer** mit vollem Leben. Erfahrung, Level, Beute und erledigte Auftragsschritte bleiben.
- Er verliert **etwas Gold**: Startwert 5 % des Golds, höchstens 200. *(Startwert des Entwurfs.)* Gold ist gemeinsam für alle Helden, deshalb ist der Verlust gedeckelt.
- Alle Gegnergruppen erscheinen wieder, ein angefangener Bosskampf beginnt von vorn.

## 9. Lagerfeuer und Speichern im Spiel

- Lagerfeuer stehen an festen Orten (Dorf 1, Kapitel 1 vier). Ein noch nicht benutztes Feuer ist aus; beim ersten Rasten brennt es und ist ab dann bekannt.
- **Rasten** (am Feuer „Rasten“): Leben voll, Gegnergruppen erscheinen wieder, das Spiel wird gespeichert. Danach zeigt ein kleines Fenster zwei Knöpfe:
  - **Weiterziehen** (schließt das Fenster)
  - **Reisen**: zu jedem bekannten Lagerfeuer dieses Kapitels und ins Dorf. Vom Dorffeuer aus zu jedem bekannten Feuer.
- **Speichern** passiert außerdem nach jedem Auftragsschritt, nach jeder Beute, nach jedem Kauf, Verkauf und Verbessern, nach Level-ups und beim Verlassen über das Pausenmenü.
- **Weiterspielen** beginnt immer am zuletzt benutzten Lagerfeuer, nicht an der genauen Stelle. Gruppen sind dann wieder da, erledigte Auftragsschritte, geöffnete Kisten und besiegte Bosse bleiben. Neuladen der Seite oder Schließen des Tabs verliert so höchstens den Weg seit dem letzten Speichern, nie Level, Beute oder Auftragsschritte.

## 10. Leute, Gespräche und Aufträge

### 10.1 Bewohner (vom Auftraggeber bestätigt)

| Wer | Tier | Rolle | Ort |
|---|---|---|---|
| **Oma Panzerla** | Schildkröte | Dorfälteste, Hauptaufträge | Dorf |
| **Krümel** | Hamster | Händler | Dorf (Laden) |
| **Meister Grabowski** | Maulwurf | Schmied (nach Hauptauftrag 2) | Dorf (Schmiede) |
| **Nussa** | Eichhörnchen | Nebenauftrag | Dorf |
| **Pieps** | Spatz | Nebenauftrag | Dorf |
| **Tante Amsel** | Amsel | Ziel eines Nebenauftrags | Kapitel 1, Mühlenwiese |

Leute stehen als gemalte Figuren in der Welt (Bilder vom Auftraggeber) und haben im Gespräch ein Porträt. Über dem Kopf zeigt ein „!“ einen neuen Auftrag und ein „?“ einen abzugebenden.

### 10.2 Gespräche

- Unten erscheint ein Kasten mit Porträt, Namen und Text. Ein Gespräch hat mehrere kurze Sätze (je höchstens zwei Zeilen am Handy).
- **Weiter:** antippen, klicken, Leertaste oder Enter. Ein langer Satz erscheint nicht Buchstabe für Buchstabe; er steht sofort da. *(Entscheidung des Entwurfs: schneller und ohne „Bewegung reduzieren“-Sonderfall.)*
- Nebenaufträge enden mit der Wahl **„Mach ich!“** oder **„Später“**. Hauptaufträge werden ohne Wahl angenommen.
- Wer schon alles erzählt hat, sagt einen wechselnden kurzen Spruch.
- Text nur über `textContent`. Alle Gespräche stehen in `src/data/`.

### 10.3 Aufträge

Aufträge sind Daten: Kennung, Titel, Art (Haupt/Neben), Auftraggeber, Voraussetzungen, **Schritte** und Belohnung (Erfahrung, Gold, Gegenstand, Trank). Jeder Schritt hat eine Art:

- `talk` – mit jemandem sprechen
- `reach` – einen Ort erreichen
- `kill` – Gegner einer Art (oder einer Gruppe) besiegen, Anzahl
- `collect` – Dinge einsammeln: an Fundorten („Untersuchen“) oder als Beute einer Gegnerart
- `boss` – einen Boss besiegen

Auftragsgegenstände (Hammer, Flugblätter, Nüsse, Brief) liegen nicht in der Truhe. Sie zählen nur für den Auftrag.

**Bildschirm „Aufträge“** (Pausenmenü oder Taste J): laufende Aufträge mit aktuellem Schritt und Fortschritt, erledigte eingeklappt. Einen Auftrag antippen macht ihn zum verfolgten (Anzeige oben und Stern auf der Minikarte). Ist nichts gewählt, wird der nächste Hauptauftrag verfolgt.

### 10.4 Aufträge in Kapitel 1 (Vorschlag des Entwurfs, vom Auftraggeber mit „passt so“ im Umfang bestätigt)

**Hauptaufträge:**

1. **Nasse Pfoten** (Oma Panzerla): Am Bachufer nachsehen, 6 Helmfische vertreiben, Oma berichten. → schaltet den Händler frei.
2. **Ein Schmied ohne Hammer** (Grabowski): Krebse haben seinen Hammer gestohlen. Krebslager räumen, Hammer finden, zurückbringen. → schaltet den Schmied frei.
3. **Brücke zu** (Oma Panzerla): Die Fische haben die Alte Brücke verbarrikadiert. Hauptmann Gräte besiegen. → Barrikade weg, Weg frei.
4. **Flugblätter** (Oma Panzerla): Auf der Mühlenwiese und im Tiefen Wald 5 Flugblätter Flossians bei Helmfischen und Fröschen finden („Wasser für alle! Besonders für Fische!“). Danach mit Oma sprechen.
5. **Zwickzwack** (Oma Panzerla): Am Quellteich Kommandant Zwickzwack besiegen, seine Flaschenpost lesen (Flossian spricht), zu Oma zurück. → Kapitel 1 geschafft, Abschlusstafel.

**Nebenaufträge:**

1. **Verbuddelt und vergessen** (Nussa): 5 Nussverstecke auf der Karte finden (Fundorte, auch an Seitenwegen).
2. **Post für Tante Amsel** (Pieps): einen Brief zu Tante Amsel auf der Mühlenwiese bringen und ihre Antwort zurück.
3. **Hamsterkauf** (Krümel): 8 Krebsscheren sammeln (Beute von Krebsen).

Belohnungen: Erfahrung, etwas Gold, bei Nebenaufträgen je ein fester seltener Gegenstand. Zahlen sind Sache des Baus.

## 11. Beute, Ausrüstung, Händler, Schmied

### 11.1 Gegenstände

- Feste, lustige Einzelstücke wie in der Taverne (vom Auftraggeber bestätigt): Name, Art, Seltenheit, Werte, Spruch, gemaltes Symbol.
- **Neu: etwa 30 Gegenstände für Kapitel 1** (Namen im Ton der Taverne, z. B. „Gummistiefel der falschen Hoffnung“). Sie liegen im selben Katalog `ITEMS` mit neuen Kennungen; ihr Bildbogen ist neu (Abschnitt 15).
- **Die 24 Gegenstände der Taverne** gelten im Abenteuer ebenso. Sie kommen weiter nur aus der Taverne. Die Kapitel-Gegenstände kommen nur aus dem Abenteuer.
- **Beute im Abenteuer:**
  - Gegner: selten ein Gegenstand (Startwert 1,5 % je Gegner, Elite 10 %), Seltenheit wie in der Taverne gewürfelt, nur aus der Beuteliste des Kapitels
  - Kisten auf der Karte: fester Ort, einmal je Held zu öffnen, Gold und ein Gegenstand
  - Bosse: sicher ein Gegenstand, mindestens selten
  - Aufträge: feste Gegenstände
- **Gemeinsame Truhe:** Die Truhe gehört allen Helden (wie in der Taverne). Jeder Gegenstand liegt höchstens einmal darin. Findet man ein Stück, das schon in der Truhe liegt, wird es sofort für seinen Gegenwert verkauft, wie in der Taverne.
- **Anlegen:** Jeder Held legt aus der Truhe an, was er will. Zwei Helden dürfen dasselbe Stück angelegt haben. *(Entscheidung des Entwurfs; einfacher und ohne Streit um Stücke.)*
- Gefundene Gegenstände erscheinen beim Aufheben kurz mit Symbol, Namen und Seltenheit.

### 11.2 Ausrüstung

- Fünf Plätze: Kopf, Körper, Füße, Waffe, Schmuck.
- **Waffen je Klasse:** Krieger nur Nahkampf, Magier nur Zauber, Dieb nur Wurf. Der Hochstapler darf jede Waffenart tragen.
- **Bildschirm „Ausrüstung“:** die fünf Plätze mit angelegtem Stück; daneben die Werte des Helden. Einen Platz wählen zeigt alle passenden Stücke aus der Truhe mit Seltenheitsrahmen, Verbesserungsstufe und dem Unterschied zum angelegten Stück („Rüstung +1 → +2“). Anlegen, Ablegen.
- Ausrüstung wirkt als weitere Quelle in der vorhandenen Werteverrechnung, nur im Abenteuer.
- „Wirkt im Abenteuer-Modus.“ in der Truhe der Taverne bleibt richtig.

### 11.3 Schmied (Grabowski, vom Auftraggeber gewählt: verbessern)

- Jeder Gegenstand lässt sich **fünfmal verbessern** (+1 bis +5). Jede Stufe erhöht alle Werte des Stücks um 20 % des Grundwerts; +5 verdoppelt sie. Gerundet wird so, dass Rüstung ganze Zahlen bleibt und Prozentwerte auf ganze Prozent. *(Startwerte des Entwurfs.)*
- **Kosten:** Gold je nach Seltenheit und Stufe (Tabelle in den Daten). Stufe +4 kostet zusätzlich 1, Stufe +5 zusätzlich 2 **Flussperlen**.
- **Flussperlen** sind das Material von Kapitel 1. Es gibt sie von Bossen (Gräte 2, Zwickzwack 3), aus Kisten und selten von Elite-Gegnern. Spätere Kapitel bringen eigenes Material. *(Der Auftraggeber nannte als Beispiel Bossmaterial; eine Materialart je Kapitel hält es übersichtlich.)*
- Die Verbesserung gehört zum Gegenstand in der gemeinsamen Truhe, nicht zum Helden.
- Bildschirm: Liste der Stücke, gewähltes Stück mit Werten jetzt und nach der Verbesserung, Kosten, Knopf „Verbessern“. Ohne genug Gold oder Perlen ist er gesperrt und sagt warum.
- Grabowski hat ein paar Sprüche („Das wird schön. Oder wenigstens schwer.“).

### 11.4 Händler (Krümel)

- **Kaufen:**
  - Heiltränke (Startwert 25 Gold, nur bis 4)
  - eine feste Auswahl von 6 gewöhnlichen Gegenständen aus der Beuteliste von Kapitel 1. Gekaufte verschwinden aus dem Angebot, weil man sie dann besitzt.
  - Preis: Startwert das Fünffache des Gegenwerts
- **Verkaufen:** Gegenstände aus der Truhe für ihren Gegenwert, mit Rückfrage. Ein Stück, das **irgendein** Held angelegt hat, lässt sich nicht verkaufen; die Liste zeigt dann „angelegt von Hoppel“ (Heldenname). Man legt es erst bei diesem Helden ab. *(Entscheidung des Entwurfs: Ein Verkauf verändert nie still einen anderen Helden.)* Ein verkauftes Stück verliert seine Verbesserung und kann später wieder gefunden werden.
- Flussperlen und Auftragsgegenstände kauft Krümel nicht.
- Krümel hat ein paar Sprüche („Alles muss raus. Außer mir.“).

## 12. Spielstand

### 12.1 Neue Version 4

Neue Felder (Namen sind Sache des Baus, Inhalt nicht):

```text
Spielstand:
  itemLevels: { [itemId]: 1..5 }      Verbesserungsstufe; fehlt ein Eintrag, ist die Stufe 0
  materials:  { flussperle: number }
  settings.buttonSide: 'left'|'right' Lage des Knopfvierecks (Voreinstellung 'right')
  stats.*                             neue Zähler für die Abenteuer-Erfolge

je Held:
  adventure: null | {
    level, xp, skillPoints,
    abilities: { [abilityId]: stufe }   freie Fähigkeiten mit Stufe (Grundattacke eingeschlossen)
    buttons: [id|null, id|null, id|null]
    equipment: { kopf, koerper, fuesse, waffe, schmuck }   Kennung oder null
    potions,
    mapId, campfireId,                  wo es weitergeht
    campfires: [id]                     bekannte Lagerfeuer
    quests: { [questId]: { state: 'active'|'done', step, progress } }
    trackedQuest,
    bosses: [id], chests: [id],         besiegt / geöffnet
    found: [id],                        benutzte Fundorte
    explored: { [mapId]: string }       Erkundung, kompakt kodiert
    introSeen, chapterDone: [n]
  }
```

- **Umwandlung 3 → 4:** `adventure: null` für jeden Helden, leere `itemLevels` und `materials`, `buttonSide: 'right'`, neue Zähler bei 0. Alles andere bleibt unverändert.
- **Ausbessern statt verwerfen** *(Entscheidung des Entwurfs nach dem Gegenlesen)*: Heute verwirft das Spiel einen ungültigen Stand ganz (`animalwarrior.save.corrupt`) und beginnt leer. Für den Abenteuer-Teil wäre das zu hart, denn er hat viele Kennungen, die sich in späteren Etappen ändern können. Deshalb wird der Abenteuer-Teil eines Helden beim Laden und Import **ausgebessert**, nie der ganze Stand verworfen:
  - unbekannte Kennungen (Fähigkeiten, Gegenstände, Aufträge, Lagerfeuer, Bosse, Kisten, Fundorte) fallen weg
  - Zahlen werden in den erlaubten Bereich gerückt (höchstens 4 Tränke, Stufen 1 bis 5, Level 1 bis 30)
  - ein angelegtes Stück, das nicht in der Truhe liegt oder nicht zu Platz oder Waffenart passt, wird abgelegt
  - eine unbekannte Karte oder ein unbekanntes Lagerfeuer setzt den Helden ans Dorffeuer
  - ein unbekannter Auftragsschritt setzt den Auftrag auf seinen letzten gültigen Schritt
  - ist der Abenteuer-Teil gar nicht lesbar, beginnt nur dieser Held sein Abenteuer neu (Level und Ausrüstung weg, alles Gemeinsame bleibt)
  - Die bisherige Prüfung für alles andere (Helden, Gold, Truhe, Erfolge …) bleibt wie sie ist.
- **Kennungen** von Karten, Lagerfeuern, Aufträgen, Bossen, Kisten und Fundorten werden wie die der Gegenstände nie umbenannt oder gelöscht. Auftragsschritte werden nur hinten angefügt.
- **Fehler beim Speichern mitten im Spiel** (etwa ein Programmfehler, der einen ungültigen Stand erzeugt): Das Spiel läuft weiter, der zuletzt gute Stand bleibt gespeichert, und es erscheint ein kurzer Hinweis „Speichern hat nicht geklappt“. Es stürzt nicht ab.
- Ein Export der Version 4 lässt sich in einer älteren Spielversion nicht laden (bekanntes Verhalten).

### 12.2 Schutz vor Verlust

- **Sicherungskopie vor jeder Umwandlung:** Lädt das Spiel einen älteren Stand, legt es den unveränderten Text vorher unter einem eigenen Schlüssel ab (z. B. `animalwarrior.save.v3`). Je Version bleibt höchstens eine Kopie; eine vorhandene wird nicht überschrieben. Die Kopie wird nie automatisch gelöscht.
- **Dauerhafter Speicher:** Beim Start bittet das Spiel den Browser einmal um dauerhaften Speicher (`navigator.storage.persist()`), falls verfügbar. Ablehnung ändert nichts.
- **Hinweis im Hauptmenü** (vom Auftraggeber gewünscht): eine kleine Zeile, z. B. „Dein Spielstand liegt nur in diesem Browser. Sichere ihn ab und zu mit ‚Exportieren‘. Auf dem iPhone hilft ‚Zum Home-Bildschirm‘.“
- Alles Bisherige bleibt: Versionsnummer im Stand, schrittweise Umwandlung, Sicherung eines beschädigten Stands, Export und Import.

### 12.3 Versionsnummer des Spiels

- Eine Datei in `src/data/` nennt die Spielversion. Sie steht unten auf dem Titelbildschirm, klein: „Version 0.5.0“.
- Zählweise: Wellen-Modus 0.1, Paket 1 0.2, Neue Gegner 0.3, Taverne 0.4, **Abenteuer Etappe 1 0.5.0**. Jede weitere Etappe zählt die mittlere Zahl hoch, Korrekturen die letzte. *(Entscheidung des Entwurfs.)*
- Die Spielversion ist nicht die Versionsnummer des Spielstands; beide stehen getrennt.

## 13. Erfolge

Vier neue Erfolge im Ton der vorhandenen (Vorschlag):

| Erfolg | Bedingung | Spruch | Gold |
|---|---|---|---|
| Trockene Pfoten | Kapitel 1 abschließen | „Der Bach ist wieder ein Bach. Vorerst.“ | 100 |
| Meisterstück | einen Gegenstand auf +5 verbessern | „Grabowski hat geweint. Vor Stolz.“ | 50 |
| Hilfsbereit | alle Nebenaufträge von Kapitel 1 erledigen | „Bachwinkel schuldet dir was. Viel.“ | 50 |
| Lagerfeuerromantik | 20-mal rasten | „Marshmallows wären schön gewesen.“ | 25 |

„Zoo-Direktor“ und alle bisherigen Erfolge bleiben unverändert.

## 14. Regeln im Code

Es gelten die Regeln aus Abschnitt 4 der Übergabe, besonders:

- Logik in `src/core`, `src/modes`, `src/data`, `src/save` ohne Three.js, `window`, `document`, `localStorage`, `Date.now()`; Zufall nur über `createRng`.
- Darstellung und Oberfläche ändern den Weltzustand nie; Rückmeldungen nur über Funktionen des Abenteuer-Modus (Fähigkeit auslösen, Trank, Sprechen, Pause …).
- Alle Zahlen und Texte in `src/data/`: Karten, Aufträge, Gespräche, Gegner, Bosse, Beutelisten, Preise, Kosten, Faktoren, Erfahrungskurve.
- Text nur über `textContent`, Oberfläche auf Deutsch, alle Pfade relativ.
- Fehlt ein Bild, gibt es Ersatz (Grundformen, Kreis mit Anfangsbuchstaben, Symbol im Seltenheitsrahmen). Kein Bildschirm scheitert an einem fehlenden Bild.
- Neue Bilder werden erst geladen, wenn das Abenteuer betreten wird (wie `duo.webp` bei Bedarf).
- Der Wellen-Modus bleibt unverändert: seine Tests bleiben grün, und neue Tests prüfen, dass seine Hindernisse und Gegner sich nicht ändern.
- **Leistung:** Am Handy flüssig. Nicht berechnete Gruppen fern vom Helden, Kartenstücke nur in der Nähe zeichnen.

## 15. Bilder vom Auftraggeber

Bis sie da sind, gibt es überall Ersatz, und der Bau wartet nicht auf sie. Die Beschreibungen für den Bildgenerator bekommt der Auftraggeber **mit dem Plan** (Englisch, weißer Hintergrund, gleicher gemalter Stil wie die vorhandenen Bögen; Anhang zum Plan). Ausschnitte werden nach Lieferung ausgemessen.

| Datei (Vorschlag) | Inhalt |
|---|---|
| `assets/abenteuer/bewohner.webp` | Oma Panzerla, Krümel, Grabowski, Nussa, Pieps, Tante Amsel als ganze Figuren nebeneinander (Porträts werden ausgeschnitten) |
| `assets/figuren/kapitel1.webp` | Helmfisch, Krebs, Frosch, Hauptmann Gräte, Kommandant Zwickzwack, Flossian im Glas |
| `assets/abenteuer/dorf.webp` | Häuser (Oma, Laden, Schmiede, zwei Wohnhäuser), Brunnen, Lagerfeuer aus und an, Brücke, Barrikade, Wegweiser, Zaun, Nussversteck, Flugblatt |
| `assets/abenteuer/wasser.webp` | nahtlose Wasserkachel für den Bach |
| `assets/abenteuer/weg.webp` | nahtlose Kachel Erdweg |
| `assets/abenteuer/beute1.webp` | die etwa 30 neuen Gegenstände im Raster |

## 16. Entscheidungen des Entwurfs (nicht vom Auftraggeber festgelegt)

- Namen von Bösewicht, Bewohnern, Bossen und Gebieten; Wortlaut der Geschichte (vom Auftraggeber mit „passt so“ bestätigt, Feinheiten dem Bau überlassen)
- Fähigkeiten frei mit Level 2/4/6/8, Punkte je Level, Faktoren für Fähigkeiten von Hand, Dauer für Umlauf und Stärkung
- Dauerboni wirken im Abenteuer, „Neun Leben“ nicht
- Rasten füllt keine Tränke; 2 Tränke zum Start; Trank heilt 40 %
- Goldverlust beim Tod 5 %, höchstens 200
- Gegnergruppen mit Aufmerksamkeit und Leine; Wiedererscheinen beim Rasten
- Helmfisch, Krebs, Frosch mit vorhandenen Bewegungsformen; neue Bossform „Verstärkung rufen“
- Eine Materialart je Kapitel (Flussperle); +4 und +5 brauchen Perlen; +20 % je Stufe
- Mehrere Helden dürfen dasselbe Stück tragen; Verbesserung gehört zum Stück
- Taverne-Gegenstände nur aus der Taverne, Kapitel-Gegenstände nur aus dem Abenteuer
- Weiterspielen am letzten Lagerfeuer statt an der genauen Stelle
- Ungültige Abenteuer-Daten werden je Held ausgebessert statt den ganzen Stand zu verwerfen; Speicherfehler mitten im Spiel stürzen nicht ab
- Ein von irgendeinem Helden angelegtes Stück ist nicht verkaufbar
- Text in Gesprächen steht sofort da
- Versionszählung ab 0.5.0
- Vier neue Erfolge

## 17. Was dem Bau überlassen bleibt

- Aufteilung in Dateien innerhalb der bestehenden Ordner, Form der Kartenbeschreibung im Einzelnen
- Wie die Welt ihre Hindernisquelle bekommt (ohne den Wellen-Modus zu verändern)
- Genaue Länge und Form der Karten, Lage von Gruppen, Kisten und Fundorten
- Alle Zahlen fürs Balancing innerhalb der Zielwerte (20 bis 30 Minuten je Kapitel, Level 10 am Ende von Kapitel 1, nicht unter 20 s in einer Gruppe von 6)
- Werte der neuen Gegner und Bosse, Namen, Werte und Sprüche der 30 neuen Gegenstände
- Wortlaut aller Gespräche und Sprüche im Ton dieses Dokuments
- Gestaltung von Minikarte, Gesprächskasten, Händler, Schmied, Ausrüstung, Fähigkeiten, Aufträgen
- Ersatzformen für fehlende Bilder
- Ob Klicken auf eine Stelle den Helden dorthin laufen lässt

## 18. Prüfung

**Automatisch (`tests.html`):**

- **Karte:** Held und laufende Gegner bleiben auf begehbarer Fläche; Wasser sperrt, Brücke nicht; Sperren verschwinden nach dem Auftragsschritt; Bossbereich schließt und öffnet; gleiche Karte ergibt gleiche Ränder.
- **Wellen-Modus unverändert:** Hindernisse und Gegnerverhalten wie vorher; alle bisherigen Tests grün.
- **Kampf:** Grundattacke nur mit Gegner in Reichweite; Fähigkeit von Hand mit und ohne Ziel; Abklingzeit; Trank (voll, leer, Sperre, höchstens 4).
- **Gruppen:** Aufmerksamkeit, Leine mit Heilung, Wiedererscheinen beim Rasten, Bosse bleiben besiegt; Zielwert „nicht unter 20 s in einer Gruppe von 6“.
- **Level:** Erfahrungskurve, Fähigkeiten frei mit 2/4/6/8, Punkte, Stufen höchstens 5, Knopfbelegung.
- **Aufträge:** jede Schrittart; Voraussetzungen; Belohnung genau einmal; „Später“ bei Nebenaufträgen; ganzer Ablauf von Kapitel 1 als Durchlauf der Auftragslogik.
- **Tod:** Rückkehr zum Lagerfeuer, Goldverlust mit Deckel, nichts anderes geht verloren.
- **Beute und Ausrüstung:** Beutelisten je Quelle; Doppelte werden verkauft; Waffenarten je Klasse; Werte mit Verbesserung; von irgendeinem Helden angelegte Stücke nicht verkaufbar.
- **Schmied und Händler:** Kosten, zu wenig Gold oder Perlen, Höchststufe, Trankgrenze.
- **Spielstand:** Umwandlung 3 → 4 (und 1 → 4, 2 → 4) ohne Verlust; Sicherungskopie vor der Umwandlung, ohne vorhandene zu überschreiben; ungültige Abenteuer-Daten werden ausgebessert (jeder Fall aus Abschnitt 12.1), ohne dass Helden, Gold, Truhe oder Erfolge verloren gehen; Speicherfehler mitten im Spiel behält den letzten guten Stand; Hin und zurück.
- **Minikarte:** Erkundung kodieren und wieder lesen.
- **Erfolge:** die vier neuen; alte unverändert.

**Von Hand im Browser:**

- Kapitel 1 ganz durchspielen (mit `?debug=1` und schnellerer Zeit erlaubt), bei 390 × 844 und am PC.
- Jeweils nur mit Finger, nur mit Maus und nur mit Tastatur: laufen, Fähigkeiten, Trank, Sprechen, Händler, Schmied, Ausrüstung, Fähigkeiten, Aufträge, große Karte, Pause.
- Knopfviereck links und rechts.
- Sterben, am Feuer aufwachen; Seite neu laden mitten im Kapitel; Reisen zwischen Feuern.
- Ein alter Spielstand der Version 3 lädt, die Sicherungskopie liegt da.
- Versionsnummer auf dem Titelbildschirm; Hinweis zum Sichern im Hauptmenü.
- Alles mit und ohne gelieferte Bilder.
- Ein Durchgang im Wellen-Modus und eine Runde in der Taverne wie vorher.

**Nur der Auftraggeber kann prüfen:** ob die Geschichte lustig ist, ob 20 bis 30 Minuten stimmen, ob das Sterben fair ist und ob sich die Knöpfe am Handy gut anfühlen.
