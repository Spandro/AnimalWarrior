# AnimalWarrior – Spielgefühl und Handy (Design)

Stand: 2026-11-13 · Paket 1 von 4 der zweiten Ausbaustufe

## 1. Anlass und Ziel

Der Wellen-Modus ist fertig und spielbar. Nach dem ersten Spielen hat der Auftraggeber eine Wunschliste geschickt. Sie ist in vier Pakete gegliedert, die nacheinander entworfen und gebaut werden:

1. **Spielgefühl und Handy** (dieses Dokument)
2. Mehr Welten: nach einem Boss eine neue Karte mit neuen Tieren
3. Taverne: Minispiele und Glücksspiel um Beute, freischaltbares Duo Giraffe und Erdmännchen
4. Abenteuer-Modus mit Story, ein Held für alle Modi

**Warum Paket 1 zuerst:** Das Spiel soll sich auch am Handy gut spielen lassen (Kollegen öffnen den Link eher dort), sich runder anfühlen und zu den gemalten Figuren passen.

**Erfolg heißt:**

- Ein Durchgang lässt sich hochkant am Handy mit einem Daumen spielen, vom Hauptmenü bis zum Endbildschirm, ohne Tastatur.
- Derselbe Durchgang lässt sich am PC nur mit der Maus spielen.
- Krieger und Dieb treffen Gegner, ohne dass man in deren Richtung laufen muss.
- Treffer und der eigene Tod sind am Helden sichtbar.
- Es lohnt sich, über die Karte zu laufen, weil dort Kisten stehen.
- Bäume, Felsen und Boden passen im Stil zu den gemalten Tieren, sobald die Bilder geliefert sind.

## 2. Ziele, Nicht-Ziele, Anti-Ziele

**Ziele** siehe Abschnitte 4 bis 9.

**Nicht-Ziele**

- Gamepad, eigenes Querformat-Layout (quer funktioniert, wird aber nicht eigens gestaltet)
- Ausrüstung und Waffen (kommen mit Taverne und Abenteuer-Modus)
- Neue Karten, neue Gegner, neue Helden
- Installation als App (PWA), Offline-Betrieb

**Anti-Ziele**

- Die Tastatursteuerung darf nicht schlechter werden.
- Am Handy darf nichts Wichtiges unter dem Daumen oder hinter Aussparungen des Bildschirms liegen.
- Gold darf nicht inflationär werden: Die Dauerboni kosten 50 bis 800 Gold und sollen ihren Wert behalten.

## 3. Rahmen

- Bestehende Technik bleibt: JavaScript ES-Module ohne Build, Three.js 0.170.0, Tests in `tests.html`, statische Seite für GitHub Pages.
- Die Regeln aus der ersten Spec gelten weiter: Logik ohne Grafik und Browserzugriffe, Zufall nur über `createRng`, Balancing-Zahlen in `src/data/`, Text über `textContent`, relative Pfade.
- Der Auftraggeber liefert Bilder für die Umgebung (Abschnitt 9). Bis sie da sind, bleibt die jetzige 3D-Umgebung.

## 4. Steuerung

Drei gleichwertige Wege, das Spiel erkennt selbst, welcher gerade benutzt wird:

- **Tastatur:** WASD und Pfeiltasten wie bisher.
- **Touch:** Finger irgendwo auf die Spielfläche setzen; dieser Punkt ist der Mittelpunkt. Ziehen gibt die Laufrichtung, Loslassen heißt stehen bleiben. Ein dezenter Kreis mit Knopf zeigt Ansatzpunkt und Richtung.
- **Nur Maus:** dasselbe mit gedrückter linker Maustaste.

Festlegungen:

- Totzone 12 Pixel um den Ansatzpunkt; außerhalb volle Geschwindigkeit in die gezogene Richtung. Der Ansatzpunkt wandert mit, wenn der Finger weiter als 70 Pixel entfernt ist.
- Nur der erste Finger steuert; weitere Finger werden ignoriert.
- Tastatur und Zeiger gleichzeitig: Solange eine Lauftaste gedrückt ist, gilt die Tastatur.
- Knöpfe der Anzeige (Pause, Karten, Dialoge) lösen keine Bewegung aus.
- Die Umrechnung „Zeigerzustand → Laufrichtung" ist eine reine Funktion in `src/input/` und getestet.
- Auf der Spielfläche sind Scrollen, Zoomen und „Seite herunterziehen zum Neuladen" abgeschaltet.

## 5. Auto-Zielen

Bisher zielen nur Fähigkeiten mit Ziel „nächster Gegner" selbst; Hiebe und Würfe gehen in Laufrichtung. Neu:

- Alle Fähigkeiten, die bisher in Laufrichtung wirken (Krieger: Hieb, Schildstoß, Erdspalter; Dieb: Wurfdolche, Klingenfächer), richten sich auf den nächsten Gegner innerhalb einer Zielreichweite. Die Zielreichweite steht je Fähigkeit in den Daten: bei Nahkampf die eigene Reichweite plus 1,5 Einheiten, bei Geschossen deren Reichweite.
- Ist kein Gegner in Zielreichweite, wirkt die Fähigkeit wie bisher in Laufrichtung.
- Der Held dreht sich im Bild zum Ziel, wenn er angreift, und sonst in Laufrichtung.
- Unverwundbare, fliehende Gegner (Schatten auf der Flucht) werden nicht anvisiert.
- Der spätere Abenteuer-Modus mit Zielen per Zeiger bleibt möglich: Ein mitgegebener Zielpunkt hat Vorrang vor dem Auto-Zielen.

## 6. Schaden, Tod und Sieg

- **Treffer:** Die Heldenfigur blitzt 120 ms rot auf, das Bild wackelt 150 ms leicht. Der rote Bildschirmrand bleibt.
- **Wenig Leben:** Unter 25 % pulsiert der Rand langsam rot.
- **Tod:** Eine neue Phase „stirbt" vor dem Ende: etwa 1 s Zeitlupe (Welt läuft mit einem Viertel der Geschwindigkeit, der Held ist handlungsunfähig und nimmt keinen Schaden mehr), der Held kippt um und verblasst; währenddessen verliert das Bild die Farbe und wird über gut 2 s schwarz. Dann erscheint „Gefallen" mit einem trockenen Spruch aus einer Liste, danach der Endbildschirm. Ab 0,5 s kann man mit Tippen, Klick oder Taste abkürzen.
- **Wiederbelebung:** heller Blitz, der Held steht auf; das Wegstoßen der Gegner gibt es schon.
- **Sieg:** etwa 1,5 s goldener Schein und „Überlebt!", dann der Endbildschirm. (Zusatz des Entwurfs, vom Auftraggeber nicht verlangt, nicht abgelehnt.)
- **Aufgeben** überspringt die Sterbephase.
- Wer im Betriebssystem „Bewegung reduzieren" eingestellt hat, bekommt kein Bildwackeln und keine Zeitlupe, nur die Abblende.
- Gold, Statistik und Erfolge werden weiterhin genau einmal gespeichert, und zwar wenn die Phase endet oder abgekürzt wird; schließt jemand während der Abblende den Tab, gilt dasselbe wie bisher beim Schließen im Durchgang.

## 7. Kisten auf der Karte

- Kisten stehen fest auf der Karte, aus dem Startwert des Durchgangs erzeugt wie die Hindernisse: je Geländezelle (16 × 16 Einheiten) mit 12 % Chance eine Kiste, keine näher als 12 Einheiten am Startpunkt, keine in einem Hindernis.
- **Öffnen:** auf 1,2 Einheiten heranlaufen. Die Kiste springt auf und bleibt geöffnet stehen.
- **Inhalt** (ein Wurf je Kiste):

  | Chance | Inhalt |
  |---|---|
  | 60 % | 3 bis 8 Gold |
  | 30 % | Heilung um 25 % des maximalen Lebens und 2 bis 4 Gold |
  | 10 % | eine Gratis-Aufwertung (eine zufällige Karte, sofort angewendet, verbraucht kein Level) |

- Gold aus Kisten zählt mit dem Goldgewinn-Wert des Helden. Die Truhen von Elite-Gegnern und vom Schatten bleiben wie sie sind.
- **Hinweis:** Ein kleiner Pfeil am Bildrand zeigt zur nächsten ungeöffneten Kiste im Umkreis von 40 Einheiten, wenn sie nicht im Bild ist.
- **Gold bleibt knapp:** Die Chance, dass Gegner Gold fallen lassen, bleibt bei 4 %.
- Neuer Erfolg „Schatzsucher" (in einem Durchgang 10 Kisten öffnen, Spruch: „Fremde Kisten öffnen: hier ausnahmsweise erlaubt.", 50 Gold).

## 8. Handyfreundliche Oberfläche

- **Seite:** passt sich der Gerätebreite an, berücksichtigt Aussparungen und runde Ecken, kein versehentliches Zoomen.
- **Anzeige im Spiel hochkant:** Leben, Level, Erfahrung und Timer oben in einem schmalen Block; Fähigkeiten und ein Pause-Knopf unten in Daumenreichweite; Gold und Tötungen klein oben rechts. Boss- und Schattenbalken unter dem oberen Block.

  ```text
  ┌───────────────┐
  │ ♥ 104   02:31 │
  │ Lv 4 ▓▓▓░░  ● 3│
  │ [ Bär ▓▓▓▓░ ] │
  │               │
  │      Held     │
  │               │
  │      (o)→     │
  │ [OD][KS]   ⏸  │
  └───────────────┘
  ```

- **Kamera hochkant:** Abstand so, dass links und rechts mindestens 9 Einheiten sichtbar sind; quer bleibt es beim jetzigen Abstand.
- **Bedienflächen:** alle Knöpfe mindestens 44 Pixel hoch; Level-up-Karten untereinander und fingerbreit; Dialoge füllen hochkant die Breite.
- **Menüs, Heldenerstellung, Laden, Einstellungen, Erfolge:** bei 360 × 640 und 390 × 844 ohne seitliches Scrollen und ohne abgeschnittene Knöpfe.
- **Leistung:** Auf Geräten mit Touch als Hauptzeiger startet die Grafikqualität beim ersten Start auf „Niedrig"; umstellbar in den Einstellungen.
- **Ton:** startet auch nach dem ersten Tippen am Handy zuverlässig.
- **Pause:** Der Pause-Knopf tut dasselbe wie Esc. Wechselt man die App, pausiert das Spiel wie bisher.

## 9. Gemalte Umgebung

Der Auftraggeber liefert zwei Bilder im Stil der Figuren:

- `assets/umgebung/boden.webp` – nahtlos kachelbare Grasfläche von oben.
- `assets/umgebung/objekte.webp` – ein Bogen auf weißem Hintergrund mit: zwei bis drei Bäumen, zwei Felsen, Busch, Blumen, Pilzen, Baumstumpf, Farn, Kiste zu, Kiste offen, Goldmünze, Heiltrank, Erfahrungskristall.

Einbau:

- Boden als gekachelte Textur statt der eingefärbten Fläche.
- Bäume und Felsen als aufrecht stehende Bilder wie die Figuren, mit weichem Bodenschatten. Die Kollision bleibt unverändert der Kreis aus der Logik; der Stamm bzw. Fuß des Bildes steht auf diesem Kreis.
- Steht der Held hinter einem Baum, wird dessen Bild durchscheinend.
- Deko ohne Kollision (Busch, Blumen, Pilze, Stumpf, Farn) wird aus dem Startwert verteilt, nur in der Darstellung.
- Kisten und Aufsammelbares (Gold, Trank, Erfahrung) nutzen die gemalten Bilder.
- Fehlt ein Bild oder ein Ausschnitt, bleibt dafür die jetzige 3D-Darstellung. Die Ausschnitte stehen in den Daten und werden nach Lieferung einmal ausgemessen.
- Hintergrundentfernung und Laden nutzen die vorhandenen Bausteine der Figuren.

## 10. Ansätze

Für Steuerung, Auto-Zielen, Schaden und Tod, Kisten und Oberfläche gibt es jeweils einen naheliegenden Weg: Erweiterung der vorhandenen Bausteine. Eine Wahl gab es beim Hintergrund:

| Ansatz | Abwägung |
|---|---|
| A – Gemalte Umgebung vom Auftraggeber, Einbau mit Rückfall auf 3D | passt zu den Figuren; hängt an der Lieferung der Bilder |
| B – nur per Code verschönern | sofort machbar; bleibt sichtbar 3D neben gemalten Tieren |
| C – erst B, später A | sofort etwas besser; doppelte Arbeit |

**Gewählt: A**, vom Auftraggeber am 2026-11-13, weil der Stilbruch zwischen gemalten Tieren und kantigen Bäumen am meisten stört.

Bei der Steuerung hat der Auftraggeber „hochkant mit einem Daumen" gewählt; daraus folgt der frei ansetzbare Steuerkreis statt eines festen Steuerkreuzes oder „Held läuft zum Finger" (der Finger würde den Helden verdecken).

## 11. Entscheidungen des Entwurfs (nicht vom Auftraggeber festgelegt)

- Maus-Steuerung funktioniert wie Touch (ziehen bei gedrückter Taste) statt „Held läuft zum Mauszeiger".
- Zahlen: Totzone 12 px, Nachführen ab 70 px, Zielreichweite Nahkampf +1,5, Kistenchance 12 % je Zelle, Inhaltstabelle, Pfeil bis 40 Einheiten, Schwelle 25 % Leben, Dauer der Sterbephase.
- Sieg bekommt einen eigenen kurzen Moment.
- Neuer Erfolg „Schatzsucher".
- Grafikqualität „Niedrig" als Startwert auf Touch-Geräten.

## 11a. Präzisierungen nach dem Gegenlesen (Entscheidungen des Entwurfs)

**Sterbephase**

- Fällt das Leben auf 0 und eine Wiederbelebung ist übrig, wird sofort wiederbelebt wie bisher; es gibt dann keine Sterbephase.
- Sonst wechselt der Durchgang in den neuen Zustand „stirbt". Die Überlebenszeit wird in diesem Moment festgehalten und läuft nicht weiter; Zusammenfassung und Statistik nehmen diesen Zeitpunkt. Die Welt (Gegner, Geschosse, Effekte) läuft für 1 s Echtzeit mit einem Viertel der Geschwindigkeit weiter, es erscheinen keine neuen Gegner, der Held handelt nicht und nimmt keinen Schaden.
- Danach, oder sobald der Spieler abkürzt, wird der Zustand „verloren" erreicht. Erst dann werden Gold, Statistik und Erfolge gespeichert und der Endbildschirm gezeigt. Die Abblende und der Text „Gefallen" gehören zur Darstellung und liegen zeitlich in und nach der Sterbephase; gespeichert wird spätestens, wenn der Endbildschirm erscheint.
- Wird der Tab während der Sterbephase oder Abblende geschlossen, ist der Durchgang nicht gespeichert, genau wie beim Schließen mitten im Spiel.
- Bei „Bewegung reduzieren": keine Zeitlupe und kein Wackeln; der Held verblasst ohne Umkippen, das Bild wird in etwa 1,2 s schwarz, der Farbverlust bleibt.

**Auto-Zielen**

- „Eigene Reichweite" ist beim Bogen der Radius, bei der Linie die Länge. Bogen, Linie und Fächer werden auf das Ziel zentriert, auch wenn dadurch Gegner in Laufrichtung nicht mehr getroffen werden.
- Fähigkeiten, die auf den Helden selbst wirken (Ring, Stärkung, Zonen unter dem Helden, Klon), bleiben unverändert.
- Dass fliehende Gegner nicht anvisiert werden, gilt für alle Fähigkeiten; für die schon selbst zielenden ist das bereits so.

**Eingabe**

- Die Fähigkeiten-Symbole unten sind reine Anzeige; im Wellen-Modus löst man keine Fähigkeit von Hand aus. Der einzige Knopf in der Spielanzeige ist Pause.
- Öffnet sich ein Level-up-Dialog, die Pause oder ein anderer Dialog, wird der Zeigerzustand zurückgesetzt; nach dem Schließen muss neu angesetzt werden.
- Alle Pixelangaben sind CSS-Pixel.

**Spielstand**

- Keine neue Versionsnummer: Der neue Erfolg ist nur ein weiterer bekannter Eintrag; vorhandene Spielstände und alte Exporte bleiben gültig.
- „Niedrig" als Startwert gilt nur für neu angelegte Spielstände auf Touch-Geräten; bestehende Spielstände behalten ihre Einstellung.

**Kisten**

- Position, Art des Inhalts und Goldmenge jeder Kiste ergeben sich fest aus Startwert und Zelle, unabhängig davon, in welcher Reihenfolge Kisten geöffnet werden.
- Die Gratis-Aufwertung zieht eine Karte aus dem normalen Kartenvorrat des Durchgangs. Ist nichts mehr aufwertbar, greift dessen vorhandener Ersatz (Gold oder Heilung).

**Umgebung**

- Die Bilder sind am 2026-11-13 geliefert worden und liegen unter `assets/umgebung/`: `boden.webp` (Grasfläche von oben), `objekte.webp` (Bogen auf weißem Hintergrund: Laubbaum, Tanne, Birke; großer und kleiner Fels, Busch, Baumstumpf, Farn; Blumen, Pilze, Truhe zu, Truhe offen, Goldmünze, Heiltrank, blauer Kristall). Der Bau misst die Ausschnitte aus und trägt sie in die Daten ein; der Rückfall auf die 3D-Umgebung bleibt für den Fall, dass ein Bild nicht lädt.
- Zusätzlich geliefert: `szenen.webp`, sechs gemalte Landschaftsbilder in einem Raster (Waldweg, Steinbrücke am Fluss, Höhle, Wasserfall, Baum auf der Wiese, Teich mit Schilf). Sie sind von der Seite gemalt und taugen nicht als Spielfeld. Entscheidung des Entwurfs: Sie werden als Hintergrund der Menüs genutzt (Hauptmenü: Baum auf der Wiese; Heldenauswahl und -erstellung: Waldweg; Modusauswahl: Steinbrücke; Dauerboni: Höhle; Erfolge: Wasserfall; Einstellungen: Teich), abgedunkelt und weichgezeichnet, damit Text lesbar bleibt. Für Paket 2 sind sie als Titelbilder möglicher Welten vorgemerkt.
- Der Boden wird beim Laden an den Kanten überblendet, falls das gelieferte Bild nicht nahtlos kachelt.
- „Hinter einem Baum" heißt: Der Baum steht näher an der Kamera als der Held und sein Bild überdeckt den Helden auf dem Bildschirm.

## 12. Was dem Bau überlassen bleibt

- Aufteilung in Dateien innerhalb der bestehenden Ordner.
- Wie Abblende, Farbverlust und Bildwackeln technisch entstehen.
- Genaue Anordnung der Deko und Größe der Umgebungsbilder in der Welt.
- Genaue Gestaltung des Steuerkreises und des Kistenpfeils.

## 13. Prüfung

**Automatisch:** Laufrichtung aus Zeigerzustand (Totzone, Nachführen, zweiter Finger, Vorrang der Tastatur); Auto-Zielen (nächster Gegner in Reichweite, Rückfall auf Laufrichtung, kein Zielen auf Fliehende, Vorrang eines Zielpunkts); Sterbephase (Dauer, Unverwundbarkeit, einmaliges Ende, Aufgeben überspringt sie, Wiederbelebung verhindert sie); Kisten (gleicher Startwert gleiche Kisten, keine am Start oder in Hindernissen, Verteilung der Inhalte über viele Würfe, Gold mit Goldgewinn, jede Kiste nur einmal, Erfolg „Schatzsucher"); alle bisherigen Tests bleiben grün.

**Von Hand im Browser:** ein Durchgang nur mit Maus; ein Durchgang mit simuliertem Touch bei 390 × 844; alle Menüs bei 360 × 640; Tod, Wiederbelebung und Sieg ansehen; Umgebung mit und ohne gelieferte Bilder.

**Nur der Auftraggeber kann prüfen:** das Spielgefühl auf einem echten Handy (Daumen, Bildrate, Ton), und ob die Umgebung mit seinen Bildern stimmig aussieht.
