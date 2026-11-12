# AnimalWarrior

Ein Actionspiel für den Browser mit Draufsicht: Wähle ein Tier (Hase, Ente, Waschbär) und eine Klasse (Krieger, Magier, Dieb) und überlebe 15 Minuten gegen Gegnerwellen.

## Was es gibt

- **Wellen-Modus:** Gegner kommen von allen Seiten, du levelst mit neuen Fähigkeiten und Boni. Bei Minute 5, 10 und 15 erscheint ein Bär als Boss; dazwischen taucht dein eigener Schatten auf, den man vertreiben, aber nie besiegen kann.
- **Dauerboni:** Gold aus den Durchgängen kaufst du im Hauptmenü in dauerhafte Verbesserungen um.
- **Erfolge:** mit einmaliger Goldbelohnung.
- **Speichern:** automatisch im Browser, dazu Export und Import als Datei.
- **Abenteuer-Modus:** geplant, noch nicht gebaut.

## Steuerung

| Taste | Wirkung |
|---|---|
| W A S D oder Pfeiltasten | Laufen |
| 1, 2, 3 oder Klick | Karte beim Level-up wählen |
| Esc | Pause |

Fähigkeiten lösen im Wellen-Modus von selbst aus.

## Lokal starten

Es wird nichts installiert und nichts gebaut. Der Browser lädt das Spiel aber nicht direkt von der Festplatte, deshalb braucht es einen kleinen Webserver:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1 -Port 8080
```

Danach `http://localhost:8080/` öffnen.

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
| `animal=hase\|ente\|waschbaer`, `class=krieger\|magier\|dieb` | Held für `autostart` |
| `autopick=1` | wählt Level-up-Karten automatisch |
| `stress=1` | füllt die Welt mit 300 Ratten und zeigt die Bildrate |
| `quality=low` | niedrige Grafikqualität |

## Aufbau

| Ordner | Inhalt |
|---|---|
| `src/data` | Tabellen: Tiere, Klassen, Fähigkeiten, Gegner, Wellen, Boni, Erfolge, Texte. Balancing ändert man hier. |
| `src/core`, `src/modes` | Spiellogik ohne Grafik, durch Tests abgedeckt |
| `src/save` | Spielstand mit Versionsnummer, Export und Import |
| `src/render` | Darstellung mit Three.js; Figuren sind gemalte Bilder aus `assets/figuren` |
| `src/ui`, `src/audio` | Menüs, Anzeige im Spiel, Ton |
| `vendor` | Three.js 0.170.0 |
| `docs/superpowers` | Spec und Plan |

## Bilder

Die Figuren in `assets/figuren/` sind zwei Bildbögen (`helden.webp`, `gegner.webp`). Das Spiel schneidet die Figuren beim Laden aus und entfernt den weißen Hintergrund. Die Ausschnitte stehen in `src/data/sprites.js`.
