# Übergabe: Stand, offene Arbeit, Randinfos

Diese Datei ist für die nächste Sitzung gedacht, falls die laufende abbricht. Sie wird an jedem Pausenpunkt aktualisiert.

Zuletzt aktualisiert: 2026-11-13, nach dem Bau von Aufgabe 3 von Paket 1 (302 Tests grün laut Bericht).

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
| 3 | Rotes Aufblitzen, Sterbephase (`dying`), Sieg-Moment | gebaut, Commit `d373e8a`, Prüfung steht aus |
| 4 | Kisten auf der Karte, Pfeil, Erfolg „Schatzsucher" | offen |
| 5 | Handy-Oberfläche: Anzeige hochkant, Pause-Knopf, Kamera, große Knöpfe | offen |
| 6 | Gemalte Umgebung (`assets/umgebung/`), gemalte Kisten und Aufsammelbares, Menü-Hintergründe | offen |
| 7 | Abschlussprüfung, README | offen |
| danach | Gesamtprüfung über Paket 1, eine Korrekturrunde | offen |

Teststand nach Aufgabe 2: 286 Tests grün (`tests.html`).

## 2. Was noch fehlt (vom Auftraggeber gewünscht, noch nicht entworfen)

Reihenfolge wie vereinbart; jedes Paket bekommt eigenen Entwurf, Spec und Plan.

**Paket 2 – Mehr Welten:** Nach einem Boss geht es auf eine neue Karte mit neuen Tieren (Idee des Auftraggebers: z. B. Unterwasserwelt). Dafür braucht er wieder Beschreibungen für den Bildgenerator. Die sechs Landschaftsbilder in `assets/umgebung/szenen.webp` (Waldweg, Steinbrücke, Höhle, Wasserfall, Baum auf der Wiese, Teich) sind als Titelbilder möglicher Welten vorgemerkt.

**Paket 3 – Taverne:** Eigener Punkt in der Modusauswahl. Minispiele und Glücksspiel, bei denen man mit dem gesammelten Gold um Beute spielt – auch Ausrüstung und Waffen für den Abenteuer-Modus. Dort ist außerdem ein weiterer Held für viel Gold freischaltbar, vorerst geschwärzt dargestellt: ein Kombo-Team aus Giraffe und Erdmännchen. Nur Spielgold, kein echtes Geld.

**Paket 4 – Abenteuer-Modus mit Story:** Der zweite Modus (in Richtung Action-Rollenspiel: Level durchlaufen, Erfahrung, Ausrüstung mit Werten). Neuer Wunsch: ein Held für alle Modi. Das widerspricht der früheren Wahl „getrennter Fortschritt je Modus" und muss beim Entwurf neu geklärt werden. Namen für Ausrüstung sollen lustig sein („Helm der mäßigen Zuversicht", „Stiefel des übereilten Rückzugs").

**Weitere offene Wünsche und Ideen**

- Im Wellen-Modus pro Bossauftritt ein anderer Boss (braucht je ein Bild)
- Getroffene Gegner blitzen nicht auf (Trefferereignisse tragen keine Gegnerkennung)
- Balancing ist ungespielt: Wer still steht, stirbt sehr schnell; 15 Minuten hat noch niemand am Stück gespielt
- Ton hat noch niemand gehört

## 3. Lokal starten und testen

Kein Node.js, kein Build. Server:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1 -Port 8080
```

- Spiel: `http://localhost:8080/`
- Tests: `http://localhost:8080/tests.html`, Ergebnis in `window.__testResults` (`failed === 0` heißt bestanden), `?filter=<text>` grenzt ein
- In Claude Code startet `preview_start` mit dem Namen `animalwarrior` denselben Server (`.claude/launch.json`)
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
- **Limit:** bei 75 % des 5-Stunden-Fensters abbrechen und berichten (vor jedem Subagenten den Stand prüfen); ebenso bei etwa 10 % restlichem Kontext
- **Git:** nach jedem Arbeitsschritt lokal committen; **pushen ist an Pausenpunkten erlaubt** (Freigabe vom 2026-11-13), sonst nicht ungefragt; Autor im Repo ist `Spandro` mit GitHub-noreply-Adresse; Remote `origin` = `https://github.com/Spandro/AnimalWarrior.git`, Branch `main`; gearbeitet wird direkt auf `main`
- Bilder liefert der Auftraggeber über einen Bildgenerator; er bekommt dafür fertige Beschreibungen (Stilblock: zarte Aquarellmalerei mit feinen Buntstift- und Tuschestrichen, Kinderbuch-Illustration nach der Natur, gedeckte Farben, weißer oder transparenter Hintergrund, Figur schaut nach rechts, keine Schlagschatten, kein Text)
- Lange Sitzungen sind teuer: Nach einer Pause verbraucht schon eine kurze Antwort viel vom Limit. Für neue Pakete lieber eine frische Sitzung starten und auf diese Datei verweisen

## 6. Wo der genaue Arbeitsstand steht

- Diese Datei und die beiden Pläne (Kästchen je Schritt)
- `git log` – jede Aufgabe ist ein eigener Commit mit sprechendem Betreff
- Auf diesem Rechner zusätzlich das Arbeitsprotokoll der Subagenten-Ausführung (nicht im Repo, weil von Git ignoriert): `.superpowers/sdd/2026-11-13-spielgefuehl-und-handy/progress.md` mit Prüfbefunden, zurückgestellten Kleinigkeiten und Entscheidungen; dort liegen auch die Aufträge je Aufgabe (`task-N-brief.md`) und die Berichte (`task-N-report.md`)

## 7. Fortsetzen von Paket 1

1. `git log --oneline -8` ansehen: Gibt es einen Commit „feat: hit feedback, dying phase and victory moment", ist Aufgabe 3 gebaut; sonst Aufgabe 3 neu beginnen (Auftrag im Plan, Abschnitt „Task 3").
2. Ist Aufgabe 3 gebaut, aber im Protokoll nicht als „complete" vermerkt, fehlt ihre Prüfung.
3. Danach Aufgaben 4 bis 7 in Reihenfolge, dann eine Gesamtprüfung ab Commit `1e7ebd1`.
4. Entscheidungen, die im Plan nicht stehen:
   - Kisten werden im Zustand `dying` nicht geöffnet.
   - Passt die Kameraregel für Querformat nicht zur echten Brennweite, bleibt quer der Abstand 15; die Mindestbreite gilt dann nur hochkant.
   - Der Plantest „Erdspalter Stufe 3 trifft Ratte bei (0, −13)" war falsch; geprüft wird dort nur die Zielrichtung.

## 8. Zurückgestellte Kleinigkeiten (bekannt, nicht dringend)

- Anzeige der Bildrate im Stresstest fängt Zeigerereignisse ab
- Gehen sowohl „Finger hoch" als auch „Erfassung verloren" verloren, läuft der Held bis zur nächsten Pause weiter (sehr selten)
- Kein automatischer Test für die Anbindung der Zeigerereignisse
- Aus dem ersten Bauabschnitt: Export nach beschädigtem Stand schreibt den Standardstand; Klang-Stimmen werden nicht getrennt; Schatten-Wolke und -Geschosse nie im Bild geprüft; Hasenohren ragen in der 3D-Ersatzfigur durch Hut und Kapuze

## 9. Was nur der Auftraggeber prüfen kann

- Spielgefühl auf einem echten Handy (Daumen, Bildrate, Ton)
- Ob 15 Minuten ausgewogen sind
- Ob Ton und Bilder gefallen
- Die veröffentlichte Seite auf GitHub Pages
