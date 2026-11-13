# Übergabe: Stand, offene Arbeit, Randinfos

Diese Datei ist für die nächste Sitzung gedacht, falls die laufende abbricht. Sie wird an jedem Pausenpunkt aktualisiert.

Zuletzt aktualisiert: 2026-11-13, Sicherungspunkt bei 86 % Wochenlimit während Paket 3 (Taverne, wird vor Paket 2 entworfen). Spec-Entwurf liegt unter `docs/superpowers/specs/2026-11-13-taverne-design.md` (noch nicht freigegeben). Nächster Schritt: Gegenlesen durch einen frischen Prüfer, offene Fragen an den Auftraggeber, Spec zur Freigabe vorlegen, dann Plan.

## 1. Was fertig ist

**Erster Bauabschnitt (abgeschlossen, geprüft, auf GitHub):** Wellen-Modus komplett.

- Helden: Hase, Ente, Waschbär × Krieger, Magier, Dieb; bis zu sechs Speicherplätze
- 15-Minuten-Durchgang, sechs Gegnerarten, Elite-Gegner, Bär als Boss bei 5/10/15 Minuten
- Schatten-Boss bei 3:30, 8:00, 12:30 (unbesiegbar, vertreibbar)
- 15 Fähigkeiten und 7 Boni mit lustigen Namen, Dauerboni gegen Gold, 22 Erfolge
- Gemalte Figuren aus `assets/figuren/helden.webp` und `gegner.webp`
- Speichern im Browser (Version 2), Export/Import, Einstellungen, Ton
- Spec: `docs/superpowers/specs/2026-11-12-kern-und-wellenmodus-design.md`
- Plan: `docs/superpowers/plans/2026-11-12-kern-und-wellenmodus.md`

**Zweiter Bauabschnitt, Paket 1 „Spielgefühl und Handy" (in Arbeit):**

- Spec: `docs/superpowers/specs/2026-11-13-spielgefuehl-und-handy-design.md` (vom Auftraggeber freigegeben)
- Plan: `docs/superpowers/plans/2026-11-13-spielgefuehl-und-handy.md` (freigegeben, Ausführung mit Subagenten)

| Aufgabe | Inhalt | Stand |
|---|---|---|
| 1 | Steuerung mit Finger und Maus (`src/input/pointer.js`, `src/ui/stick.js`) | fertig, geprüft, Commit `90079bd` |
| 2 | Auto-Zielen für Krieger und Dieb (`aim`-Feld in `src/data/abilities.js`) | fertig, geprüft, Commit `1b478d3` |
| 3 | Rotes Aufblitzen, Sterbephase (`dying`), Sieg-Moment | fertig, geprüft, Commits `d373e8a` und `ddf560c` |
| 4 | Kisten auf der Karte, Pfeil, Erfolg „Schatzsucher" (`src/core/chests.js`) | fertig, geprüft, Commit `e678d53` |
| 5 | Handy-Oberfläche: Anzeige hochkant, Pause-Knopf, Kamera, große Knöpfe | fertig, geprüft, Commit `9ca9220` |
| 6 | Gemalte Umgebung (`assets/umgebung/`), gemalte Kisten und Aufsammelbares, Menü-Hintergründe | fertig, geprüft, Commit `6509808` |
| 7 | Abschlussprüfung, README | fertig, Commit `b0597e9` |
| danach | Gesamtprüfung über Paket 1, eine Korrekturrunde | fertig, Commit `3a277b0` |

**Paket 1 ist damit gebaut und geprüft.** Teststand: 341 Tests grün (`tests.html`).

Die Gesamtprüfung (frischer Prüfer über alle zehn Commits ab `1e7ebd1`) fand zwei wichtige
Fehler, beide behoben und gegengeprüft:

1. Der Kistenpfeil rechnete mit der konservativen Hüllbox statt mit der wirklich sichtbaren
   Fläche. Hochkant blieb er aus, obwohl die Kiste hinter dem Helden schon außerhalb des
   Bildes lag (Unterkante bei 9,2 m, Hüllbox sagte 16,75 m).
2. Die 3D-Ersatzfigur (wenn die gemalten Bilder fehlen) drehte sich nicht zum Ziel.

Die kleinen Befunde stehen unten in Abschnitt 8.

**Was in Aufgabe 5 bis 7 dazugekommen ist**

- Hochkant rückt die Kamera zurück, bis links und rechts zusammen 9 Einheiten sichtbar sind
  (`src/render/cameraFit.js`, Zahlen in `CAMERA_FIT` in `src/data/sprites.js`). Quer bleibt Abstand 15.
- Spielanzeige hochkant: oberer Block, untere Leiste mit Fähigkeiten und Pause-Knopf, Ränder mit
  `env(safe-area-inset-*)`, Knöpfe am Handy mindestens 44 px, Level-up-Karten und Dialoge über die Breite.
- Ohne Spielstand starten Fingergeräte in niedriger Qualität (`src/render/quality.js`).
- Gemalte Umgebung aus `assets/umgebung/`: Boden gekachelt (8 m, Ränder verblendet), drei Baumarten,
  zwei Felsen, Deko je Zelle, Truhen, Münze, Trank, Kristall; Menü-Hintergründe aus `szenen.webp`.
  Daten in `src/data/environment.js`, Rechnungen in `src/core/environment.js`, Laden in
  `src/render/environment.js`.
- Ein Baum vor dem Helden blendet weich auf 35 % Deckkraft.
- `.claude/launch.json` startet den Server jetzt mit `python3` (macOS); die PowerShell-Variante
  heißt `animalwarrior-windows`.

## 2. Was noch fehlt (vom Auftraggeber gewünscht, noch nicht entworfen)

Reihenfolge wie vereinbart; jedes Paket bekommt eigenen Entwurf, Spec und Plan.

**Paket 2 – Mehr Welten:** Nach einem Boss geht es auf eine neue Karte mit neuen Tieren (Idee des Auftraggebers: z. B. Unterwasserwelt). Dafür braucht er wieder Beschreibungen für den Bildgenerator. Die sechs Landschaftsbilder in `assets/umgebung/szenen.webp` (Waldweg, Steinbrücke, Höhle, Wasserfall, Baum auf der Wiese, Teich) stehen seit Aufgabe 6 als Hintergrund hinter den Menüs und sind weiter als Titelbilder möglicher Welten vorgemerkt.

**Paket 3 – Taverne:** Eigener Punkt in der Modusauswahl. Minispiele und Glücksspiel, bei denen man mit dem gesammelten Gold um Beute spielt – auch Ausrüstung und Waffen für den Abenteuer-Modus. Dort ist außerdem ein weiterer Held für viel Gold freischaltbar, vorerst geschwärzt dargestellt: ein Kombo-Team aus Giraffe und Erdmännchen. Nur Spielgold, kein echtes Geld.

*Klärung läuft (2026-11-13, wird vor Paket 2 gemacht).* Vom Auftraggeber entschieden:

- Gewinne sind vor allem Gold; Ausrüstung und Waffen selten, aber lustig. Später kommt evtl. noch mehr, was man mit Gold kaufen kann.
- Drei Spiele, alle glücksbasiert: Würfelbecher, Glücksrad, Höher oder tiefer.
- Duo Giraffe + Erdmännchen wird in diesem Paket **freischaltbar und spielbar** (Wellen-Modus): eigene Sonderklasse mit eigenen Fähigkeiten; das Erdmännchen reitet auf der Giraffe (eine Figur, ein Bild). Preis **20.000 Gold**.
- Beute kommt in eine **gemeinsame Truhe** für alle Helden (wie das Gold); gespeichert werden nur Kennungen, Werte stehen in den Daten.
- Beute bekommt **gemalte Symbole** je Gegenstand (Bogen mit etwa 24 Stück; Beschreibungen für den Bildgenerator liefern).

Vom Auftraggeber bestätigt („Passt so“): Auszahlung im Schnitt 90–95 % des Einsatzes; Einsätze 10/50/100/500; höchstens fünf Schritte bei „Höher oder tiefer“; Wirtstiere an den Tischen; Beute zeigt Seltenheit und Werte („wirkt im Abenteuer-Modus“), Doppelte werden für Gold verkauft; Duo-Fähigkeiten legt der Entwurf fest; einige Taverne-Erfolge. Ansatz gewählt: **A – Taverne als Menü** (gemalte Gaststube als Hintergrund, je Spiel ein Bildschirm). Der Entwurf ändert eine Sache gegenüber der Auswahl: „Höher oder tiefer“ zahlt nach Risiko statt immer doppelt (sonst ausnutzbar) – das muss der Auftraggeber bei der Freigabe ausdrücklich sehen.

**Paket 4 – Abenteuer-Modus mit Story:** Der zweite Modus (in Richtung Action-Rollenspiel: Level durchlaufen, Erfahrung, Ausrüstung mit Werten). Neuer Wunsch: ein Held für alle Modi. Das widerspricht der früheren Wahl „getrennter Fortschritt je Modus" und muss beim Entwurf neu geklärt werden. Namen für Ausrüstung sollen lustig sein („Helm der mäßigen Zuversicht", „Stiefel des übereilten Rückzugs").

**Weitere offene Wünsche und Ideen**

- Im Wellen-Modus pro Bossauftritt ein anderer Boss (braucht je ein Bild)
- Getroffene Gegner blitzen nicht auf (Trefferereignisse tragen keine Gegnerkennung)
- Balancing ist ungespielt: Wer still steht, stirbt sehr schnell; 15 Minuten hat noch niemand am Stück gespielt
- Ton hat noch niemand gehört

## 3. Lokal starten und testen

Kein Node.js, kein Build. Server auf dem Mac oder unter Linux:

```bash
python3 tools/serve.py 8080
```

Unter Windows:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1 -Port 8080
```

- Spiel: `http://localhost:8080/`
- Tests: `http://localhost:8080/tests.html`, Ergebnis in `window.__testResults` (`failed === 0` heißt bestanden), `?filter=<text>` grenzt ein
- **Achtung:** Hält der Browser trotzdem alte Module fest (Testlauf meldet „does not provide an export named …"), hilft ein Wechsel zwischen `localhost` und `127.0.0.1` – das sind getrennte Zwischenspeicher
- In Claude Code startet `preview_start` mit dem Namen `animalwarrior` denselben Server (`.claude/launch.json`); `animalwarrior-windows` ist die PowerShell-Variante
- Schalter zum Ausprobieren stehen in `README.md` (`?debug=1`, `?speed=`, `?autostart=1`, `?animal=`, `?class=`, `?autopick=1`, `?stress=1`, `?quality=low`, Tasten K und L)

## 4. Regeln im Code (gelten für alles Weitere)

- Logik (`src/core`, `src/modes`, `src/data`, `src/save`) ohne Three.js und ohne `window`, `document`, `localStorage`, `Date.now()`; Zufall dort nur über `createRng(seed)` bzw. `world.rng`
- Darstellung und Oberfläche ändern den Weltzustand nie; Rückmeldungen nur über `chooseCard`, `setPaused`, `abandonRun` (und ab Aufgabe 3 `skipDying`) aus `src/modes/survivor.js`
- Ereignisse eines Schritts stehen in `run.events`
- Alle Zahlen fürs Balancing und Aussehen in `src/data/`
- Text nur über `textContent`; Oberfläche auf Deutsch
- Alle Pfade relativ, damit GitHub Pages aus einem Unterordner funktioniert
- Spielstand hat eine Versionsnummer (`src/save/schema.js`); Änderungen am Format brauchen eine Umwandlung alter Stände
- Bilder werden beim Laden freigestellt (`src/render/sprites.js`); Ausschnitte stehen in `src/data/sprites.js`

## 5. Arbeitsweise mit dem Auftraggeber

- Sprache: Deutsch, allgemein verständlich; er ist kein Programmierer im Projekt und beurteilt nach Spielen und Ansehen
- Ablauf je Paket: Wünsche klären → Entwurf (Spec) → Freigabe → Plan → Freigabe → Bau mit Subagenten (je Aufgabe ein Bauer und ein Prüfer) → Gesamtprüfung
- **Limit (Regel vom 2026-11-13):** vor größeren Schritten (und vor jedem Subagenten) den Verbrauch mit dem Usage-Tool prüfen. Ab etwa 85–90 % eines Fensters (5 Stunden oder Woche): den laufenden kleinen Schritt abschließen, alles committen, nach `origin/main` pushen und den Stand hier festhalten. Sobald das Limit wieder frei ist, ohne neue Rückfrage weitermachen. Wortlaut des Auftraggebers: „wenn du kurz davor bist ans limit zu kommen committe und pushe alles und sobald es wieder geht darfst du direkt weiter machen“. Bei etwa 10 % restlichem Kontext ebenso sichern
- **Git:** nach jedem Arbeitsschritt lokal committen; **pushen ist an Pausenpunkten erlaubt** (Freigabe vom 2026-11-13), sonst nicht ungefragt; Autor im Repo ist `Spandro` mit GitHub-noreply-Adresse; Remote `origin` = `https://github.com/Spandro/AnimalWarrior.git`, Branch `main`; gearbeitet wird direkt auf `main`
- Bilder liefert der Auftraggeber über einen Bildgenerator; er bekommt dafür fertige Beschreibungen (Stilblock: zarte Aquarellmalerei mit feinen Buntstift- und Tuschestrichen, Kinderbuch-Illustration nach der Natur, gedeckte Farben, weißer oder transparenter Hintergrund, Figur schaut nach rechts, keine Schlagschatten, kein Text)
- Lange Sitzungen sind teuer: Nach einer Pause verbraucht schon eine kurze Antwort viel vom Limit. Für neue Pakete lieber eine frische Sitzung starten und auf diese Datei verweisen

## 6. Wo der genaue Arbeitsstand steht

- Diese Datei und die beiden Pläne (Kästchen je Schritt)
- `git log` – jede Aufgabe ist ein eigener Commit mit sprechendem Betreff
- Das Arbeitsprotokoll der Ausführung lag unter `.superpowers/sdd/<plan>/progress.md` (von Git ignoriert) und wird nach der Gesamtprüfung gelöscht. Alles, was darüber hinaus zählt – Entscheidungen, zurückgestellte Kleinigkeiten, Prüfbefunde –, steht deshalb hier in den Abschnitten 7 und 8. Für Paket 1 ist dieser Ordner bereits weg.

## 7. Paket 1 ist abgeschlossen

1. Alle sieben Aufgaben sind gebaut, die Gesamtprüfung ab `1e7ebd1` ist gelaufen und ihre
   wichtigen Befunde sind behoben (`3a277b0`). Nichts ist gepusht – das entscheidet der Auftraggeber.
2. Steht im `git log` ein Commit zu einer späteren Aufgabe, der hier nicht als geprüft vermerkt ist, fehlt dessen Prüfung.
3. Entscheidungen, die im Plan nicht stehen (die vollständige Liste mit Begründung steht im
   Arbeitsprotokoll unter „Ruling:"):
   - Kisten werden im Zustand `dying` nicht geöffnet.
   - „Mindestens 9 Einheiten sichtbar" aus der Spec heißt 9 Einheiten Gesamtbreite, also 4,5 zu
     jeder Seite. Die Lesart „9 je Seite" bräuchte Abstand 47 statt 23,5 und machte den Helden
     winzig. Quer bleibt es bei Abstand 15.
   - Der Plantest „Erdspalter Stufe 3 trifft Ratte bei (0, −13)" war falsch; geprüft wird dort nur die Zielrichtung.
   - Die reinen Funktionen der Umgebung liegen in `src/core/environment.js` (wie bei Gelände und Kisten),
     nicht in der Datendatei.
   - Die Deko einer Zelle liegt in einem zusammengefassten Netz statt in Instanzen je Art.

## 8. Zurückgestellte Kleinigkeiten (bekannt, nicht dringend)

Aus der Gesamtprüfung von Paket 1 (bewusst zurückgestellt):

- Die Ausblend-Materialien verdeckender Bäume werden beim Entfernen einer Zelle nicht freigegeben und wachsen innerhalb eines Durchgangs (wenige Dutzend, je wenige KB)
- Bäume und Felsen sind je zwei eigene Meshes; Bodenschatten und Felstafeln einer Zelle ließen sich wie die Deko zusammenfassen (~66 Zeichenaufrufe weniger). Auf dem Entwicklungsrechner 60 Bilder/s, auf einem echten Handy ungemessen
- In der Sterbephase laufen Welt und Effekte mit verschiedenen Uhren (nur Darstellung)
- `src/render/terrain.js` schreibt die Kachelung in die der App gehörende Bodentextur; heute harmlos, aber eine Falle für später

Ältere Punkte:

- Die Bodenkachel (8 m) wiederholt sich im Bild etwa dreimal und ist als Muster erkennbar; harte Nähte gibt es keine
- Der Bodenschatten unter Truhen und Felsen ist sehr dezent, die Deko eher sparsam gesät
- Der Pause-Knopf liegt unter den Überlagerungen; im Pausenfenster führt nur „Weiter" oder Esc zurück
- Auf dem Ergebnisbildschirm kann eine Erfolgs-Einblendung die Überschrift verdecken (schon vor Paket 1 so)
- Anzeige der Bildrate im Stresstest fängt Zeigerereignisse ab
- Gehen sowohl „Finger hoch" als auch „Erfassung verloren" verloren, läuft der Held bis zur nächsten Pause weiter (sehr selten)
- Kein automatischer Test für die Anbindung der Zeigerereignisse
- Aus dem ersten Bauabschnitt: Export nach beschädigtem Stand schreibt den Standardstand; Klang-Stimmen werden nicht getrennt; Schatten-Wolke und -Geschosse nie im Bild geprüft; Hasenohren ragen in der 3D-Ersatzfigur durch Hut und Kapuze

## 9. Was nur der Auftraggeber prüfen kann

- Spielgefühl auf einem echten Handy (Daumen, Bildrate, Ton)
- Ob 15 Minuten ausgewogen sind
- Ob Ton und Bilder gefallen
- Die veröffentlichte Seite auf GitHub Pages
