# AnimalWarrior

Ein Actionspiel für den Browser mit Draufsicht: Wähle ein Tier (Hase, Ente, Waschbär) und eine Klasse (Krieger, Magier, Dieb). Überlebe 15 Minuten gegen Gegnerwellen oder zieh im Abenteuer-Modus los, um einen größenwahnsinnigen Goldfisch aufzuhalten. Für viel Gold gibt es in der Taverne ein Duo aus Giraffe und Erdmännchen dazu.

Aktuelle Version: **0.6.0** (steht auch unten auf dem Titelbildschirm).

## Was es gibt

- **Wellen-Modus:** Gegner kommen von allen Seiten, du levelst mit neuen Fähigkeiten und Boni. Bei Minute 5, 10 und 15 erscheint je ein anderer Boss (Bär, Rothirsch, Riesenkeiler oder Wisent); dazwischen taucht dein eigener Schatten auf, den man vertreiben, aber nie besiegen kann.
- **Kisten auf der Karte:** verstreute Truhen mit Gold, Heilung oder einer Gratis-Aufwertung. Ein Pfeil am Bildrand zeigt zur nächsten.
- **Am Handy spielbar:** hochkant mit einem Daumen, mit Pause-Knopf in Daumenreichweite.
- **Dauerboni:** Gold aus den Durchgängen kaufst du im Hauptmenü in dauerhafte Verbesserungen um.
- **Taverne:** In der Modusauswahl unter „Taverne → Zum Tresen“. Drei Tische, an denen du Gold einsetzt: Würfelbecher und Höher oder tiefer beim Affen Kasimir, Glücksrad bei der Elster Madame Funkel. Einsätze 10, 50, 100 und 500 Gold; ab 100 spielt der Wirt auch um Beute. Das Haus gewinnt im Schnitt, die Auszahlung liegt bei etwa 88 bis 95 Prozent. Jede Runde wird sofort gespeichert.
- **Beute und Truhe:** 24 lustige Gegenstände (Helme, Hemden, Stiefel, Waffen, Schmuck) in drei Seltenheiten. Sie liegen in einer gemeinsamen Truhe für alle Helden; nicht gefundene erscheinen als Umriss. Doppelte werden für Gold verkauft. Ihre Werte wirken erst im Abenteuer-Modus.
- **Das Duo:** Giraffe und Erdmännchen (Klasse „Hochstapler“) schaltest du im Stall der Taverne für 20.000 Gold frei. Danach legst du sie bei „Neuer Held“ an und spielst sie im Wellen-Modus, mit eigenen Fähigkeiten (Hals-Schwung, Nüsse, Stampfen, Buddelfalle, Großfamilie). Das Erdmännchen wechselt dabei seinen Platz auf der Giraffe.
- **Erfolge:** 43, jeder mit einmaliger Goldbelohnung, darunter vier aus der Taverne und sechs aus dem Abenteuer.
- **Speichern:** automatisch im Browser (Spielstand-Version 5), dazu Export und Import als Datei. Ältere Stände laden ohne Verlust; vorher legt das Spiel eine Kopie des alten Stands ab (`animalwarrior.save.v4` usw.). Kaputte Abenteuer-Daten eines Helden werden ausgebessert, statt den ganzen Stand zu verwerfen. Ein Export aus dieser Version lässt sich in einer älteren Spielversion nicht laden. Achtung: Safari auf dem iPhone löscht Webseiten-Daten nach 7 Tagen ohne Besuch, außer das Spiel liegt auf dem Home-Bildschirm; deshalb ab und zu exportieren.
- **Abenteuer-Modus (Kapitel 1):** Seine Durchlaucht Flossian der Erste, ein Goldfisch im Glas, will das Land fluten. Vom Dorf Bachwinkel aus geht es den steigenden Bach entlang bis zum Quellteich: fünf Hauptaufträge und drei Nebenaufträge, Gespräche mit Oma Panzerla, Krümel, Grabowski, Nussa, Pieps und Tante Amsel, Gegnergruppen, Zwischenboss Hauptmann Gräte und Kapitel-Boss Kommandant Zwickzwack. Der Held greift Gegner in der Nähe selbst an; drei Fähigkeiten und der Heiltrank liegen auf einem Knopfviereck. Level, Ausrüstung (fünf Plätze) und Fähigkeiten gehören zum Helden; Gold, Truhe und Verbesserungen teilen sich alle Helden. Händler Krümel verkauft Tränke und Kram, Schmied Grabowski verbessert Gegenstände bis +5 (ab +4 mit Flussperlen von Bossen). Gespeichert wird an Lagerfeuern und nach jedem Fortschritt; nach dem Tod oder Neuladen geht es am zuletzt benutzten Lagerfeuer weiter (Tod kostet 5 % Gold, höchstens 200). Kapitel 2 bis 4, sichtbare Ausrüstung und neue Klassen folgen in weiteren Etappen.
- **Unterklassen und Fähigkeitenbaum (Abenteuer):** Ab Level 10 wählt jeder Held eine von drei Unterklassen seiner Klasse (Pause → Fähigkeiten, mit Rückfrage), zum Beispiel Kneipenschläger, Türsteher oder Ritter von der traurigen Kochstelle beim Krieger. Bei der Wahl kommen alle verteilten Punkte zurück. Danach zeigt der Fähigkeitenbaum den Stamm (die fünf Fähigkeiten der Klasse), den Ast der Unterklasse (vier neue Fähigkeiten, je ein Punkt zum Freischalten, bis Stufe 5) und vier Dauer-Boni (je bis Stufe 3). Jede Unterklasse hat eine eigene Besonderheit: Raserei, Schild, Heiltopf, Gewitterwolke, Einfrieren, Wundertüte, Klauen, Unsichtbarkeit, Fallen, Applaus, Erdmännchen oder Markieren. Stamm- und Astfähigkeiten passen gemischt auf die drei Knöpfe. Bei Oma Panzerla kann man nach dem Gespräch für 500 Gold umlernen: alle Punkte zurück, Unterklasse neu wählen. Die Unterklasse steht in der Heldenzeile („Hase · Krieger · Türsteher“). Im Wellen-Modus gibt es keine Unterklassen.

## Steuerung

Mit dem Finger oder der Maus: irgendwo auf die Spielfläche tippen und in die Laufrichtung ziehen. Dort, wo der Finger aufsetzt, erscheint ein Steuerkreis; der Held läuft, solange gezogen wird. Loslassen hält ihn an.

| Taste | Wirkung |
|---|---|
| W A S D oder Pfeiltasten | Laufen |
| 1, 2, 3 oder Tippen | Karte beim Level-up wählen |
| Esc oder der Pause-Knopf unten rechts | Pause |

Fähigkeiten lösen im Wellen-Modus von selbst aus und zielen selbst.

Im Abenteuer (alles geht mit Finger allein, Maus allein oder Tastatur allein):

| Taste | Wirkung |
|---|---|
| W A S D oder Pfeiltasten | Laufen (Finger und Maus: ziehen) |
| 1, 2, 3 | Fähigkeit auf Knopf 1 bis 3 |
| 4 | Heiltrank (höchstens 4) |
| E oder Enter | Sprechen, Rasten, Untersuchen, Öffnen |
| M | große Karte (oder die Minikarte antippen) |
| J | Aufträge |
| Esc oder Pause-Knopf | Pausenmenü mit Ausrüstung, Fähigkeiten, Aufträgen, Karte |

Das Knopfviereck liegt unten rechts; in den Einstellungen lässt es sich nach links legen.

In der Taverne:

| Taste | Wirkung |
|---|---|
| Leertaste oder Enter | spielt die Runde (würfeln, drehen, Karte aufdecken) |
| Pfeil hoch, Pfeil runter | bei Höher oder tiefer: „höher“ oder „tiefer“ |
| A | bei Höher oder tiefer: auszahlen |
| Esc | zurück |

Am Handy tippst du die Knöpfe unten an; Einsatz und Spielknopf liegen in Daumenreichweite.

## Lokal starten

Es wird nichts installiert und nichts gebaut. Der Browser lädt das Spiel aber nicht direkt von der Festplatte, deshalb braucht es einen kleinen Webserver.

Auf einem Mac oder unter Linux:

```bash
python3 tools/serve.py 8080
```

Dieser Server verbietet jedes Zwischenspeichern. Ohne das merkt sich der Browser die Module und zeigt nach einer Änderung weiter den alten Stand.

Unter Windows:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1 -Port 8080
```

Danach `http://localhost:8080/` öffnen. In Claude Code startet `preview_start` mit dem Namen `animalwarrior` denselben Server (`animalwarrior-windows` für die PowerShell-Variante).

## Tests

`http://localhost:8080/tests.html` öffnen. Die Seite zeigt, wie viele Tests bestanden sind. Mit `?filter=<text>` laufen nur Tests, deren Name den Text enthält.

## Veröffentlichen über GitHub Pages

Der Projektordner ist direkt das, was ausgeliefert wird. Im Repository unter Settings → Pages als Quelle „Deploy from a branch", Branch `main`, Ordner `/ (root)` wählen. Das Spiel läuft dann unter `https://<name>.github.io/<repo>/`.

Der Spielstand hängt an der Adresse: Ein lokal erspielter Stand erscheint auf GitHub Pages nicht von selbst. Über „Spielstand exportieren" und „importieren" im Hauptmenü lässt er sich umziehen.

## Schalter zum Ausprobieren

An die Adresse angehängt, zum Beispiel `http://localhost:8080/?debug=1&speed=4`:

| Schalter | Wirkung |
|---|---|
| `debug=1` | schaltet die folgenden Tasten und Schalter frei |
| `speed=N` | Spielzeit läuft N-mal so schnell |
| Taste `K` | besiegt alle Gegner |
| Taste `L` | gibt ein Level |
| `autostart=1` | überspringt die Menüs |
| `animal=hase\|ente\|waschbaer\|giraffe`, `class=krieger\|magier\|dieb\|hochstapler` | Held für `autostart`; nur gültige Paare zählen (die Giraffe nur mit `hochstapler`, die anderen drei nur mit den drei Grundklassen) |
| `autopick=1` | wählt Level-up-Karten automatisch |
| `stress=1` | füllt die Welt mit 300 Ratten und zeigt die Bildrate |
| `quality=low` | niedrige Grafikqualität |
| `mode=adventure` | (mit `debug=1`) springt ins Abenteuer des ersten Helden; ohne Helden wird ein „Testheld“ angelegt (`animal=`, `class=` wählen Tier und Klasse). Taste `K` besiegt dort Gegner im Umkreis von 20 m |

## Aufbau

| Ordner | Inhalt |
|---|---|
| `src/data` | Tabellen: Tiere, Klassen, Fähigkeiten, Gegner, Wellen, Boni, Erfolge, Texte, Taverne, Gegenstände; fürs Abenteuer `adventure.js` (alle Zahlen), `subclasses.js` (Unterklassen und Dauer-Boni; ihre Fähigkeiten stehen in `abilities.js`), `maps/` (Dorf und Kapitel 1), `quests.js`, `dialogues.js`, `story.js`. Balancing ändert man hier. |
| `src/core`, `src/modes` | Spiellogik ohne Grafik, durch Tests abgedeckt; auch die Regeln der drei Taverne-Spiele und der Beutewurf; fürs Abenteuer Kartenraster (`mapGrid.js`), Aufträge, Held und Regelschicht `modes/adventure.js` |
| `src/save` | Spielstand mit Versionsnummer (jetzt 5, mit Umwandlung älterer Stände), Export und Import, Taverne-Runden und Freischaltungen, Abenteuer (Ausbessern, Schmied, Händler) |
| `src/render` | Darstellung mit Three.js; Figuren und Umgebung sind gemalte Bilder aus `assets/` |
| `src/input` | Tastatur und Zeigersteuerung (Finger, Maus) |
| `src/ui`, `src/audio` | Menüs, Anzeige im Spiel, Ton |
| `vendor` | Three.js 0.170.0 |
| `docs/superpowers` | Spec und Plan |

## Bilder

Die Figuren in `assets/figuren/` sind zwei Bildbögen (`helden.webp`, `gegner.webp`). Das Spiel schneidet die Figuren beim Laden aus und entfernt den weißen Hintergrund. Die Ausschnitte stehen in `src/data/sprites.js`.

Die Umgebung in `assets/umgebung/` sind drei Bilder:

| Datei | Inhalt |
|---|---|
| `boden.webp` | Grasboden, beim Laden an den Rändern verblendet, damit die Kacheln nahtlos sind |
| `objekte.webp` | 15 Einzelbilder: drei Baumarten, zwei Felsen, Busch, Stumpf, Farn, Blumen, Pilze, Truhe zu und offen, Münze, Trank, Kristall. Die Ausschnitte stehen in `src/data/environment.js` |
| `szenen.webp` | sechs Landschaften in einem 3 × 2-Raster; je eine steht als Hintergrund hinter einem Menü |

Fehlt eines dieser Bilder, zeigt das Spiel wie früher einfache 3D-Formen.

Die Taverne hat vier weitere Bilder:

| Datei | Inhalt |
|---|---|
| `assets/taverne/gaststube.webp` | Gaststube als Hintergrund hinter allen Taverne-Bildschirmen |
| `assets/taverne/wirte.webp` | Affe und Elster; die Porträt-Ausschnitte stehen in `TAVERN_IMAGES.hosts.rects` in `src/data/tavern.js` |
| `assets/taverne/beute.webp` | die 24 Gegenstände im Raster 6 × 4; welcher Gegenstand in welcher Zelle liegt, steht im Feld `icon` in `src/data/items.js` |
| `assets/figuren/duo.webp` | Giraffe mit Erdmännchen in vier Phasen; die Ausschnitte (`SHEET_FRAMES.duo`) und die Abfolge der Bildfolge (`DUO_FRAMES`) stehen in `src/data/sprites.js`. Im gelieferten Bild ragt manchmal ein Kopf oder Schwanz in den Ausschnitt daneben; das Spiel ordnet jedes Stück der Figur zu, zu der es gehört. Ein neues Bild geht deshalb, solange sich keine zwei Figuren berühren |

Die sechs Bilder des Abenteuers (Bewohner, neue Gegner, Dorf, Wasser, Weg, 30 Gegenstände) sind eingebaut; sie werden erst beim Betreten des Abenteuers geladen. Ausschnitte und Einbau stehen in `docs/abenteuer-bilder.md`. Fehlt eines davon, zeigt das Spiel dort Ersatz: einfache 3D-Formen für Häuser, Leute, Feuer, Kisten und Barrikaden, gemalte Stellvertreter für die neuen Gegner, Farbflächen für Weg und Bach, einen Kreis mit Anfangsbuchstaben im Gespräch und ein Symbol im Seltenheitsrahmen für Gegenstände.

Fehlt ein Bild der Taverne, zeigt das Spiel Ersatz: einen dunklen Holzton statt der Gaststube, einen Kreis mit Anfangsbuchstaben statt des Wirts, ein Symbol im Seltenheitsrahmen statt der Beute und eine einfache 3D-Figur statt des Duos.
