# AnimalWarrior

Ein Actionspiel für den Browser mit Draufsicht: Wähle ein Tier (Hase, Ente, Waschbär) und eine Klasse (Krieger, Magier, Dieb) und überlebe 15 Minuten gegen Gegnerwellen. Für viel Gold gibt es in der Taverne ein Duo aus Giraffe und Erdmännchen dazu.

## Was es gibt

- **Wellen-Modus:** Gegner kommen von allen Seiten, du levelst mit neuen Fähigkeiten und Boni. Bei Minute 5, 10 und 15 erscheint je ein anderer Boss (Bär, Rothirsch, Riesenkeiler oder Wisent); dazwischen taucht dein eigener Schatten auf, den man vertreiben, aber nie besiegen kann.
- **Kisten auf der Karte:** verstreute Truhen mit Gold, Heilung oder einer Gratis-Aufwertung. Ein Pfeil am Bildrand zeigt zur nächsten.
- **Am Handy spielbar:** hochkant mit einem Daumen, mit Pause-Knopf in Daumenreichweite.
- **Dauerboni:** Gold aus den Durchgängen kaufst du im Hauptmenü in dauerhafte Verbesserungen um.
- **Taverne:** In der Modusauswahl unter „Taverne → Zum Tresen“. Drei Tische, an denen du Gold einsetzt: Würfelbecher und Höher oder tiefer beim Affen Kasimir, Glücksrad bei der Elster Madame Funkel. Einsätze 10, 50, 100 und 500 Gold; ab 100 spielt der Wirt auch um Beute. Das Haus gewinnt im Schnitt, die Auszahlung liegt bei etwa 88 bis 95 Prozent. Jede Runde wird sofort gespeichert.
- **Beute und Truhe:** 24 lustige Gegenstände (Helme, Hemden, Stiefel, Waffen, Schmuck) in drei Seltenheiten. Sie liegen in einer gemeinsamen Truhe für alle Helden; nicht gefundene erscheinen als Umriss. Doppelte werden für Gold verkauft. Ihre Werte wirken erst im Abenteuer-Modus.
- **Das Duo:** Giraffe und Erdmännchen (Klasse „Hochstapler“) schaltest du im Stall der Taverne für 20.000 Gold frei. Danach legst du sie bei „Neuer Held“ an und spielst sie im Wellen-Modus, mit eigenen Fähigkeiten (Hals-Schwung, Nüsse, Stampfen, Buddelfalle, Großfamilie). Das Erdmännchen wechselt dabei seinen Platz auf der Giraffe.
- **Erfolge:** 37, jeder mit einmaliger Goldbelohnung, darunter vier aus der Taverne.
- **Speichern:** automatisch im Browser, dazu Export und Import als Datei. Ein Export aus dieser Version lässt sich in einer älteren Spielversion nicht laden; ältere Stände laden hier ohne Verlust.
- **Abenteuer-Modus:** geplant, noch nicht gebaut.

## Steuerung

Mit dem Finger oder der Maus: irgendwo auf die Spielfläche tippen und in die Laufrichtung ziehen. Dort, wo der Finger aufsetzt, erscheint ein Steuerkreis; der Held läuft, solange gezogen wird. Loslassen hält ihn an.

| Taste | Wirkung |
|---|---|
| W A S D oder Pfeiltasten | Laufen |
| 1, 2, 3 oder Tippen | Karte beim Level-up wählen |
| Esc oder der Pause-Knopf unten rechts | Pause |

Fähigkeiten lösen im Wellen-Modus von selbst aus und zielen selbst.

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

## Aufbau

| Ordner | Inhalt |
|---|---|
| `src/data` | Tabellen: Tiere, Klassen, Fähigkeiten, Gegner, Wellen, Boni, Erfolge, Texte, Taverne (Einsätze, Radfelder, Wirte und ihre Sprüche, Preis des Duos) und Gegenstände. Balancing ändert man hier. |
| `src/core`, `src/modes` | Spiellogik ohne Grafik, durch Tests abgedeckt; auch die Regeln der drei Taverne-Spiele und der Beutewurf |
| `src/save` | Spielstand mit Versionsnummer (jetzt 3, mit Umwandlung älterer Stände), Export und Import, Taverne-Runden und Freischaltungen |
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

Fehlt ein Bild der Taverne, zeigt das Spiel Ersatz: einen dunklen Holzton statt der Gaststube, einen Kreis mit Anfangsbuchstaben statt des Wirts, ein Symbol im Seltenheitsrahmen statt der Beute und eine einfache 3D-Figur statt des Duos.
