# Übergabe: Stand, offene Arbeit, Randinfos

Diese Datei ist für die nächste Sitzung gedacht, falls die laufende abbricht. Sie wird an jedem Pausenpunkt aktualisiert.

Zuletzt aktualisiert: 2026-11-15. **Abenteuer-Modus Etappe 3, Kapitel 2 „Der Sumpf“ ist gebaut, geprüft und auf `main`** (Spielversion 0.7.0, Spielstand weiter Version 5). Spec `docs/superpowers/specs/2026-11-15-abenteuer-etappe3-design.md`, Plan `docs/superpowers/plans/2026-11-15-abenteuer-kapitel2.md`, gebaut „sparsam“ (inline, am Ende ein frischer Prüfer). Was drin ist und welche Entscheidungen fielen, steht in Abschnitt 1 („Abenteuer-Modus Etappe 3, Kapitel 2“). Bilder für Kapitel 2 sind beschrieben (`docs/abenteuer-bilder-kapitel2.md`), aber noch nicht geliefert. Offen: Kapitel 3 (Biberdamm, Spielstand 6) und 4, Rückmeldung zum Spielgefühl von Gelände und Unterklassen. Davor: **Abenteuer-Modus Etappe 2 (Unterklassen mit Fähigkeitenbaum) ist gebaut, getestet und auf `main`** (Spielversion 0.6.0, Spielstand Version 5). Spec `docs/superpowers/specs/2026-11-14-abenteuer-etappe2-design.md`, Plan `docs/superpowers/plans/2026-11-14-abenteuer-etappe2.md`, gebaut „sparsam“ (inline, am Ende ein frischer Prüfer). Was drin ist und welche Entscheidungen beim Bau fielen, steht in Abschnitt 1 („Abenteuer-Modus Etappe 2“). Etappe 1 (0.5.0) steht darüber. **Bilder des Abenteuers (Kapitel 1) sind eingebaut** (2026-11-15, `docs/abenteuer-bilder.md`).

## 1. Was fertig ist

**Erster Bauabschnitt (abgeschlossen, geprüft, auf GitHub):** Wellen-Modus komplett.

- Helden: Hase, Ente, Waschbär × Krieger, Magier, Dieb; bis zu sechs Speicherplätze
- 15-Minuten-Durchgang, sechs Gegnerarten, Elite-Gegner, Bär als Boss bei 5/10/15 Minuten (seit dem Paket „Neue Gegner“: elf Gegnerarten und drei wechselnde aus vier Bossen)
- Schatten-Boss bei 3:30, 8:00, 12:30 (unbesiegbar, vertreibbar)
- 15 Fähigkeiten und 7 Boni mit lustigen Namen, Dauerboni gegen Gold, 22 Erfolge
- Gemalte Figuren aus `assets/figuren/helden.webp` und `gegner.webp`
- Speichern im Browser (damals Version 2, seit der Taverne Version 3), Export/Import, Einstellungen, Ton
- Spec: `docs/superpowers/specs/2026-11-12-kern-und-wellenmodus-design.md`
- Plan: `docs/superpowers/plans/2026-11-12-kern-und-wellenmodus.md`

**Zweiter Bauabschnitt, Paket 1 „Spielgefühl und Handy" (abgeschlossen, siehe Abschnitt 7):**

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

**Paket „Neue Gegner und wechselnde Bosse“ (abgeschlossen, geprüft, gepusht, 2026-11-13):**

- Spec: `docs/superpowers/specs/2026-11-13-neue-gegner-und-bosse-design.md`, Plan:
  `docs/superpowers/plans/2026-11-13-neue-gegner-und-bosse.md` (beide freigegeben); gebaut „sparsam“ (inline, am Ende ein
  frischer Prüfer). Commits `34201ed` bis `00dff01`. Teststand: **381 Tests grün**.
- Sechs neue Gegner aus `assets/figuren/gegner2.webp`: Fuchs (ab Min. 1, Zickzack), Igel (3, rollt sich bei Treffer ein,
  nimmt dann 1/5 Schaden), Dachs (5, zäh), Kreuzotter (7, Gift: 4 s, 3 je Sekunde bei Grundschaden, frischt auf statt
  zu stapeln; Held grünlich), Uhu (8, fliegender Ansturm), Luchs (10, duckt sich und springt mit Bodenkreis).
- Bosse aus `assets/figuren/bosse.webp`: je Durchgang drei verschiedene aus Bär, Rothirsch, Riesenkeiler, Wisent
  (`bossOrder(seed)` in `src/modes/survivor.js`, eigener Zufallsgeber, `world.rng` unberührt). Angriffe datengetrieben in
  `BOSS_MOVES` (`src/data/enemies.js`): Formen `swipe`, `leap`, `ring` (Druckwelle, Hirsch stößt weg), `dash` (Ansturm,
  Keiler dreimal). Der Bär kämpft wie vorher. Bossanzeige zeigt den Namen; Texte sprechen von „den Bossen“.
- Eingeschlossenes Papierweiß: Startpunkte je Bogen in `SHEET_HOLES` (`src/data/sprites.js`), `removeBackground` füllt
  zusätzlich von dort. Im Browser auf Gras geprüft: keine weißen Flecken; Entenfedern bleiben weiß.
- Zehn neue Erfolge (jetzt 33); „Bärenhunger“ heißt weiter so, verlangt aber „insgesamt zwei Bären“. Spielstand-Format
  unverändert (Version 2), alte Stände bleiben gültig.
- Gegner-Bildtafeln haben jetzt je Bogen ein eigenes Material (vorher fest der Bogen `gegner`).
- Entscheidungen beim Bau (stehen auch in der Spec bzw. in den Commits): Gift tickt jede Sekunde statt jede halbe
  (Treffer werden auf ganze Zahlen gerundet); Ausweichen gilt auch für Gift-Ticks; ein Ansturm frontal in den stehenden
  Helden endet vor ihm (ein Treffer); Kreuzotter 0,55 m statt 0,45 m hoch.
- Gesamtprüfung: keine kritischen Befunde; behoben: Druckwelle stieß auch ohne gelandeten Treffer weg; Ansturmstreifen
  war kleiner als die Trefferfläche; Gift endete nicht mit Sterbephase/Sieg. Kleinigkeiten stehen in Abschnitt 8.

**Paket 3 „Taverne“ (gebaut, einzeln und gesamt geprüft, Korrekturrunde erledigt, mit Zustimmung nach `main` zusammengeführt, 2026-11-14):**

- Spec: `docs/superpowers/specs/2026-11-13-taverne-design.md`, Plan: `docs/superpowers/plans/2026-11-13-taverne.md`. Gebaut im Worktree `.claude/worktrees/taverne`, Zweig `worktree-taverne`, je Aufgabe ein Bauer und ein Prüfer. Teststand: **463 Tests grün**.
- **Taverne:** Aus der Modusauswahl („Taverne → Zum Tresen“), nicht aus dem Hauptmenü. Eine Gaststube mit drei Tischen: Würfelbecher und Höher oder tiefer mit dem Affen Kasimir, Glücksrad mit der Elster Madame Funkel. Einsätze 10/50/100/500, Beute erst ab Einsatz 100. Jede Runde wird vor der Animation verrechnet und gespeichert; Neuladen mitten in einer Runde verliert nichts und erfindet nichts.
- **Beute und Truhe:** 24 Gegenstände (12 gewöhnlich, 8 selten, 4 legendär), gemeinsame Truhe für alle Helden, nicht gefundene als Umriss („X von 24 gefunden“), „Neu“-Marke, Detailansicht. Doppelte werden für Gold verkauft. Die Werte der Gegenstände wirken erst im Abenteuer-Modus; gespeichert werden nur Kennungen.
- **Stall und Duo:** Giraffe & Erdmännchen (Klasse „Hochstapler“) kosten 20.000 Gold und sind danach in der Heldenerstellung wählbar und im Wellen-Modus spielbar. Eigene Fähigkeiten: Langer Hals, kurzer Prozess (Start), Nüsse von oben, Stampede für Arme, Hier wurde gebuddelt, Großfamilie. Das Bild hat vier Phasen (Erdmännchen auf dem Rücken, hochklettern, oben stehen, herunterrutschen). Im Durchgang läuft die Bildfolge, in Stall und Heldenerstellung steht ein Standbild, bei „Bewegung reduzieren“ bleibt die Figur auf dem Rücken-Bild stehen. Das Bild `duo.webp` lädt das Spiel erst, wenn es gebraucht wird: beim Start nur, wenn das Duo freigeschaltet ist (oder ein Duo-Held existiert), sonst beim ersten Besuch der Taverne (der Stall zeigt es auch gesperrt als Umriss) oder sobald es freigeschaltet wird (`deferredSheets`, `addSheet` in `src/render/sprites.js`, `app.sprites` und `app.spritesWith` in `src/main.js`). Der Stall nimmt sein Standbild aus dem schon aufbereiteten Bild und rechnet nichts neu.
- **Spielstand Version 3** mit Umwandlung 2 → 3 (neu: `inventory`, `seenItems`, `unlocks`, `stats.tavernRounds`, `stats.hiLoBestStreak`). Alte Stände und Exporte der Versionen 1 und 2 laden ohne Verlust. Ein Export der Version 3 lässt sich in einer älteren Spielversion nicht laden.
- **Erfolge:** vier neue (Taverne-Stammgast, Riecher, Sammelwut, Hochstapler), jetzt **37**. „Zoo-Direktor“ bleibt bei den drei Ursprungstieren.
- **Bilder** (alle am 2026-11-13 geliefert und eingebaut, Commit `477419f`). Wo die Ausschnitte stehen, falls ein Bild ausgetauscht wird und neu ausgemessen werden muss:

| Datei | Wofür | Ausschnitt-Felder |
|---|---|---|
| `assets/taverne/gaststube.webp` | Hintergrund hinter allen Taverne-Bildschirmen | keine, das ganze Bild; Pfad in `TAVERN_IMAGES.room` (`src/data/tavern.js`) |
| `assets/taverne/wirte.webp` | Porträts von Affe und Elster (1536 × 1024) | `TAVERN_IMAGES.hosts.rects.affe` und `.elster` in `src/data/tavern.js`, je ein Quadrat (Kopf und Schultern, 360 × 360 Pixel) |
| `assets/taverne/beute.webp` | die 24 Gegenstände, Raster 6 × 4 (Zellen 256 Pixel) | `TAVERN_IMAGES.loot` (`cols`, `rows`) in `src/data/tavern.js`; welcher Gegenstand in welcher Zelle liegt, steht im Feld `icon` jedes Eintrags in `src/data/items.js` (0 bis 23, zeilenweise) |
| `assets/figuren/duo.webp` | Giraffe mit Erdmännchen, vier Phasen nebeneinander | `SHEET_FRAMES.duo` (linke Kante `x` je Phase, `y`, `w`, `h`) und `DUO_FRAMES` (Abfolge, Dauer, Standbild, Bild bei „Bewegung reduzieren“) in `src/data/sprites.js`; Startpunkte für eingeschlossenes Papierweiß in `SHEET_HOLES.duo` ebenda |

  - Im gelieferten Bild ragt bei manchen Phasen des Duos der Kopf oder der Schwanz in das Rechteck der Nachbarphase (`SHEET_FRAMES.duo`). Die Figuren selbst berühren sich aber nicht. Deshalb ordnet der Code (`cutFrames`) jedes zusammenhängende Stück Figur dem Rechteck zu, dessen Mitte ihm am nächsten liegt, und legt die vier Phasen sauber nebeneinander. **Ein neues `duo.webp` darf ebenso überstehen, solange keine Figur eine andere berührt oder mit ihr verbunden ist**; sonst landen Teile in der falschen Phase. Spielreihenfolge ist Bildposition 4 → 3 → 1 → 2 (im Code `order: [3, 2, 0, 1]`).
  - Fehlt eines der Bilder, gibt es Ersatz: dunkler Holzton, Kreis mit Anfangsbuchstaben, Symbol der Art im Seltenheitsrahmen, 3D-Ersatzfigur. Kein Bildschirm scheitert an einem fehlenden Bild.
  - Die Porträts der Wirte sind Kopf-Ausschnitte. Will der Auftraggeber ganze Figuren zeigen, sind es nur zwei Ausschnitte in `src/data/tavern.js`.
- **Handprobe (2026-11-14, Port 8081):** alle drei Spiele mehrfach bei 390 × 844 und am PC; Doppeltippen spielt nur eine Runde; Neuladen mitten in einer Runde (Einsatz abgebucht und gespeichert, nichts doppelt); Höher oder tiefer: Abbrechen mit Rückfrage, Auszahlen mit Taste A; Truhe und Detailansicht; Duo freischalten (mit Rückfrage, Gold abgezogen); Held anlegen und einen Durchgang spielen (Fähigkeiten, Level-up, Niederlage, Ergebnis, gespeichert); ein von Hand gebauter Spielstand der Version 2 wird auf 3 gehoben (Helden und Gold bleiben, neue Listen leer); Taverne ohne Bilder (Ersatz überall sichtbar; das Duo ohne sein Bild in einem Durchgang des Wellen-Modus ist nur durch Tests geprüft, nicht von Hand). Nicht im Browser prüfbar: „Bewegung reduzieren“ (nur im Code geprüft).
- **Gesamtprüfung (2026-11-14):** keine kritischen Befunde. In der Korrekturrunde behoben (Commit `9b83334`): der Stall bereitete bei jedem Öffnen der Übersicht das ganze Duo-Bild neu auf (über 100 ms, jetzt etwa 4 ms); das Duo-Bild wird erst bei Bedarf geladen; scheitert das Aufbereiten eines optionalen Bildes, fällt nur dieses aus; nach jedem Schritt an einem Tisch sind die Knöpfe während der kurzen Pause gegen Doppeltippen sichtbar gesperrt (vorher wirkten sie frei, Tippen tat aber nichts); der Satz „Ohne Gold kein Spiel …“ steht jetzt in `src/data/tavern.js` (`TAVERN.brokeLine`); neuer Test, dass jede Runde mit dem Gegenwert der Doppelten unter 97 % bleibt; Übergangscode („gleich geöffnet“, `screens.has`) entfernt. Im Browser nachgeprüft: Stall zeigt das Erdmännchen oben, gesperrt als Umriss, nach dem Freischalten in Farbe; ohne Freischaltung lädt der Start `duo.webp` nicht.
- **Keine neuen Konsolenhilfen oder Adress-Schalter** durch die Taverne. Einzige Änderung: `?animal=giraffe&class=hochstapler` startet mit `autostart=1` das Duo (nur gültige Paare gelten). Es gibt auch keinen Testschalter für Gold. Für Handproben mit `?debug=1`: in der Konsole `__app.update((s) => { s.gold += 15000; })`; der offene Bildschirm zeigt das neue Gold erst nach Verlassen und Wiederbetreten.

**Abenteuer-Modus Etappe 1 (gebaut, getestet, auf `main`, 2026-11-14):**

- Etappen laut Auftraggeber: 1 Grundgerüst mit Kapitel 1 (fertig) → 2 Unterklassen mit Fähigkeitenbaum → 3 Kapitel 2–4 mit neuen Karten und Gegnern → 4 sichtbare Ausrüstung (Bildbeschreibungen „sobald es soweit ist“) → 5 neue freischaltbare Klassen.
- **Geschichte:** Goldfisch „Seine Durchlaucht Flossian der Erste“ will das Land fluten. Dorf Bachwinkel (Oma Panzerla, Händler Krümel, Schmied Grabowski, Nussa, Pieps), Kapitel 1 „Der steigende Bach“ (Tante Amsel, Bosse Hauptmann Gräte und Kommandant Zwickzwack), 5 Haupt- und 3 Nebenaufträge, Bildergeschichte am Anfang und am Kapitelende.
- **Aufbau:** Welt mit austauschbarer Geländequelle (`world.terrain`, Wellen-Modus nachweislich unverändert: Test mit festem Durchlauf), Kartenraster `src/core/mapGrid.js`, Karten `src/data/maps/`, Regelschicht `src/modes/adventure.js` (Gruppen mit Aufmerksamkeit/Leine, Bosse mit Arena-Toren, Tod → Lagerfeuer, Ledger), Held `src/core/adventureHero.js`, Aufträge `src/core/quests.js`, Spielstand `src/save/adventure.js`, Darstellung `src/render/mapView.js`, Anzeige und Menüs `src/ui/adventure*.js`, `equipment.js`, `shop.js`, `smith.js`, `dialogue.js`, `minimap.js`, Spielschleife `src/adventureGame.js`.
- **Spielstand Version 4:** je Held `adventure` (oder null), gemeinsam `itemLevels`, `materials`, `settings.buttonSide`, `stats.campfireRests`. Vor jeder Umwandlung Kopie unter `animalwarrior.save.v<alt>`. Kaputte Abenteuer-Daten werden je Held ausgebessert (`repairSave`), nie der ganze Stand verworfen. Der Lauf schreibt nur über `commitAdventure` (Heldenstand + Ledger, danach Ledger leeren).
- **Zahlen fürs Balancing** alle in `src/data/adventure.js`. Beim Bau entschieden: Held im Abenteuer mit dreifachem Leben, Gegnerschaden × 0,28, Berührungstreffer alle 1 s (sonst stirbt ein Level-5-Held in einer Sechsergruppe in 1 s); Erfahrungskurve 70 + 50 × (Level − 1), Kapitel 1 ohne Wiederholen ≈ Level 10; Fähigkeiten von Hand Schaden × 2,5, Abklingzeit × 2,5 (mindestens 6 s).
- **Bilder eingebaut (2026-11-15)**, Einzelheiten und Ausschnitt-Tabellen in `docs/abenteuer-bilder.md`:
  - Neue Gegner und Bosse aus `kapitel1.webp`, Leute aus `bewohner.webp`, Häuser, Kleinkram, Lagerfeuer (aus/an), Kisten (zu/offen), Nussverstecke, Flugblätter und Barrikade aus `dorf.webp` als gemalte Tafeln wie die Bäume (`src/render/mapView.js`); Weg und Bach mit den Kacheln `weg.webp`/`wasser.webp` (nahtlos gemischt wie der Boden), die Brücke mit gezeichneten Brettern.
  - Weil sich in `kapitel1.webp` und `dorf.webp` Rechtecke überschneiden (Zwickzwacks Scheren, die Häuser oben rechts), schneidet das Laden die Stücke dieser drei Bögen einzeln mit nur ihren eigenen Pixeln aus und legt sie in einen neuen Bogen (`SHEET_CUTS`, `cutLayout`, `cutPieces`, wie die Phasen des Duos). Das gelieferte Bild bleibt unverändert.
  - Porträts im Gesprächskasten (Kopf aus `bewohner.webp`, `NPC_PORTRAITS`), Symbole der Gegenstände in Ausrüstung, Laden, Schmiede und in der Beute-Einblendung (`ITEM_SHEETS`, `itemIconRect`, `lootIcon`; bei `beute1.webp` ohne die Rasterlinien).
  - Bilder erst beim Betreten des Abenteuers (`ADVENTURE_SHEETS`, `loadTrailTiles`); fehlt eines, bleibt es dort beim bisherigen Ersatz.
  - Randbäume und -felsen halten Abstand zu Häusern, Kleinkram, Leuten, Feuern, Kisten und Fundorten und stehen nicht mehr im Bach oder auf Brücken (`MAP_LOOK.propClear`, `thingClear`), sonst verdeckten sie die gemalten Häuser und Kisten.
  - Neu auf den Karten: vier Flugblätter als Deko (Dorfausgang, Bachufer, vor der Barrikade, Mühlenwiese). Helmfisch, Krebs und Frosch sind etwas größer als geplant (0,9 / 0,95 / 0,8 m), weil sie auf dem Erdweg sonst kaum zu sehen waren.
  - Geprüft im Browser bei 390 × 844 und am PC (Dorf, Kapitel 1 bis zur Barrikade, Gräte, Gespräch, Ausrüstung, Laden, Schmiede, Beute-Einblendung). Nicht von Hand geprüft: Zwickzwack und der Quellteich, Flossian (kommt in Kapitel 1 nicht vor).
- **Im Browser geprüft (390 × 844 bzw. 375 × 812 und Desktop):** Bildergeschichte, Dorf, Gespräch mit Oma (Auftrag angenommen), Ausgang nach Kapitel 1, Kampf gegen eine Fischgruppe mit Zähler, Pausenmenü und Unterseiten (Esc schließt nur die oberste), Ausrüstung, Fähigkeiten mit Knöpfen 1–3, Krümels Laden per Tastatur (Trank gekauft), Bosskampf Gräte mit Bossanzeige, Tod in der Arena → Aufwachen im Dorf, −200 Gold, Neuladen → am Lagerfeuer, Wellen-Modus startet. **Nicht von Hand geprüft:** ganzes Kapitel am Stück und seine Dauer, Schmied-Bildschirm, große Karte, Verkaufen mit Rückfrage, Knöpfe links, echtes Handy.
- **Gesamtprüfung (2026-11-14, frischer Prüfer):** 2 kritische, 3 wichtige Befunde, alle mit Test behoben (Commit `b0af861`): Grätes Arena-Tor schloss mit dem Helden darin (jetzt startet der Kampf 2,5 m weiter innen, und das Tor schließt erst, wenn der Held frei steht); ein vor seinem Auftrag besiegter Boss machte die Geschichte unbeendbar (Schritt wird jetzt übersprungen); Rückstoß einer Fähigkeit von Hand schob Gegner ins Wasser oder durch den Rand; Bossbeute lag auf dem Boden und ging nach Tod oder Reise verloren (jetzt direkt gutgeschrieben); Einblendungen und die Schlussgeschichte kamen nach Gesprächen doppelt. Dazu hochgestuft und behoben: ein Boss, der außerhalb des Kampfes fiel, zählte nicht als besiegt. Teststand: **548 Tests grün** (`tests.html`).
- **Entscheidungen beim Bau** (nicht in der Spec): Gelände als austauschbare Quelle (`walkable` mit `walk`/`fly`/`shot`), Positionen werden am Ende jedes Weltschritts auf begehbare Fläche zurückgenommen; neue Gegner `adventureOnly` mit eigenen Bildern in `ADVENTURE_ENEMY_SPRITES` (sonst lädt der Wellen-Modus den Bogen als Pflicht); Bosse haben ihre Stufe in der Karte (Gräte 4, Zwickzwack 10); `TAVERN_ITEMS` für die Taverne, `ITEMS` bleibt der ganze Katalog; Ledger zählt auch Rasten; Ereignisse aus Aktionen zwischen zwei Schritten kommen mit dem nächsten Schritt (`emit`, `absorbWorldEvents`); Knöpfe: eine Fähigkeit auf einen anderen Knopf zu legen verschiebt sie; Reisen nur zu bekannten Feuern, ein Ausgang ändert das Aufwach-Feuer nicht; Erfahrung und Auftragszähler markieren den Lauf zum Speichern (Speichern höchstens alle 1,5 s, Wichtiges sofort); Tafeln im Abenteuer haben einen Stapel, nur die oberste bekommt Tasten.
- **Schalter:** `?debug=1&mode=adventure` springt ins Abenteuer des ersten Helden (legt sonst einen „Testheld“ an); Taste K besiegt dort Gegner im Umkreis von 20 m. Für Handproben in der Konsole z. B. `__app.update((s) => { s.gold += 5000; })` außerhalb des Abenteuers, dann neu betreten; im Abenteuer `__debug.run` (Held versetzen: `__debug.run.world.hero.x = …`).

**Abenteuer-Modus Etappe 2 (gebaut, getestet, auf `main`, 2026-11-15):**

- **Unterklassen:** zwölf, drei je Klasse (auch das Duo), Daten in `src/data/subclasses.js` (`SUBCLASSES`, `PASSIVES`, `subclassesFor`, Texte der Dauer-Boni `SPECIAL_TEXT`). Ihre 48 Fähigkeiten stehen als weitere Einträge in `ABILITIES` (`src/data/abilities.js`, Feld `subclass`, nie in einem `abilityPool`, also nie im Wellen-Modus). Regeln `SUBCLASS_RULES` (Wahl ab Level 10, Freischalten 1 Punkt, Umlernen 500 Gold), `SIGNATURE_RULES` und Aussehen `SIGNATURE_LOOK` in `src/data/adventure.js`.
- **Baum-Regeln** in `src/core/adventureHero.js`: `chooseSubclass` (Stamm auf 1, alle Punkte zurück, Knöpfe bleiben), `unlockBranch`, `spendPoint` (auch Ast), `spendPassive`, `pointsSpent` (verteilt + frei = Level − 1), `specialBonus`, `abilitySpecials`; allgemeine Dauer-Boni fließen in `adventureModifiers`. Umlernen `respecAdventure` in `src/save/adventure.js`.
- **Besonderheiten** als neue Formen in `src/core/abilities.js` (`rage`, `shield`, `healzone`, `cloud`, `freeze`, `potion`, `steal`, `stealth`, `trap`, `applause`, `pet`, `mark`) mit Zuständen in `src/core/world.js` (`world.followers`, `world.traps`, `world.lifesteal`, `hero.shield`, `hero.stealthUntil`, `hero.steal`, `enemy.markedUntil`). Ohne diese Felder wirkt nichts; der feste Durchlauf des Wellen-Modus ist unverändert. Besondere Dauer-Boni wirken über `abilityParams` (`manual.specials`) nur auf ihre Form.
- **Regelschicht** (`src/modes/adventure.js`): Ereignis `subclassAvailable` einmal bei Level 10, geklautes Gold ins Ledger, doppelte Beutechance beim Klauen und Bonus „Spürsinn“; Rasten räumt Fallen, Begleiter, Zonen, Lockvögel, Schild, Unsichtbarkeit und Stärkungen weg (Tod und Kartenwechsel legen ohnehin eine neue Welt an).
- **Oberfläche:** Fähigkeiten-Bildschirm als Baum (Wahlkarten mit Rückfrage, Stamm, Ast, Dauer-Boni), Tafel „Umlernen“ nach dem Gespräch mit Oma Panzerla (ab Level 10 mit Unterklasse, Rückfrage mit Preis), Meldung „Wähle deine Unterklasse!“, Erinnerung am Lagerfeuer, Unterklasse in der Heldenzeile (Heldenauswahl, Modusauswahl, Ergebnis, Pausenmenü). Textbausteine DOM-frei in `src/ui/treeText.js`; `describeModifier` liegt jetzt in `src/ui/statText.js`. Darstellung der Besonderheiten in `src/render/signatures.js` (Schild- und Raserei-Schimmer, Wolke, Erdmännchen, Fallen, Markierungsringe, Heiltopf), Unsichtbarkeit als durchscheinender Held (`src/render/hero.js`), Blitz, Trankplatsch, Fallen-Staub, Frost und „+n Gold“ in `src/render/effects.js`.
- **Spielstand Version 5:** Umwandlung 4 → 5 gibt jedem Abenteuer `subclass: null`, `passives: {}`; Stammstufen bleiben. Ausbessern: fremde Unterklasse oder Wahl unter Level 10 wird gelöscht, Astfähigkeiten und Dauer-Boni ohne passende Unterklasse fallen weg und ihre Punkte kommen zurück, Dauer-Boni höchstens Stufe 3.
- **Erfolge:** „Spezialist“ (Unterklasse gewählt, 25 Gold) und „Meister seines Fachs“ (alle vier Astfähigkeiten auf Stufe 5, 100 Gold), jetzt 43.
- **Entscheidungen beim Bau** (nicht in der Spec): Dauer-Boni auf Besonderheiten als `{ special, value, shape?, mode? }`; „Haustier-Leben“ heißt „Ausdauer“ (+2 s Dauer, weil das Erdmännchen nicht sterben kann); Hockerwurf stößt zurück, Eiszapfen/Glatteis/Krähenfüße bremsen, Familientreffen ruft drei (dafür dürfen Geschosse und Zonen Verlangsamung, Betäubung, Rückstoß tragen); Dolch in den Rücken macht einfach mehr Schaden; Lebensraub ist ein Weltwert statt eines neuen Heldenwerts; Unsichtbarkeit lässt Nicht-Bosse herumlaufen und endet mit dem ersten eigenen Treffer jeder Art; Wolke und Erdmännchen schlagen sofort das erste Mal zu; Umlernen ohne gewählte Unterklasse wird abgelehnt; Ausbessern erstattet nur weggefallene Punkte.
- **Im Browser geprüft (390 × 844 und Desktop):** Wahlkarten und Rückfrage mit Maus und nur mit Tastatur (Esc → Pfeile → Enter → Tab/Enter), Freischalten und Knopf belegen mit der Maus, Schild per Taste 1, Darstellung von Wolke, Schimmer, Falle, Heiltopf, Erinnerung am Lagerfeuer, Umlernen bei Oma (Gold −500, Knopf mit Astfähigkeit geleert), Wellen-Modus startet, keine Konsolenfehler, kein seitliches Scrollen. `tests.html`: alle grün. **Nicht von Hand geprüft:** jede der zwölf Besonderheiten einzeln im echten Kampf (alle durch Tests abgedeckt), echtes Handy, Balancing der Unterklassen untereinander (nur der Auftraggeber kann beurteilen, ob sie sich verschieden und gleich stark anfühlen).
- **Gesamtprüfung (2026-11-15, frischer Prüfer über `4db8992..4798a3e`):** keine kritischen Befunde. Wellen-Modus nachweislich unverändert (Prüfer verglich 180 s auf fünf Tier/Klasse-Paaren mit dem Stand vor der Etappe: gleich), Punkte-Summe hält bei Zufallsfolgen aus Wahl, Ausbau, Umlernen und Ausbessern. Behoben mit Test (Commit nach `4798a3e`): der Schild des Türstehers war auf Stufe 5 fast dauerhaft aktiv (Abklingzeit 10,8 s, Dauer 10 s; jetzt bringt Stufe 5 +5 % Schild statt kürzerer Abklingzeit, Test: Schutz-Besonderheiten haben Abklingzeit ≥ 1,25 × Dauer); das Erdmännchen suchte Ziele von sich aus und lief so weit weg und durch Wände (jetzt nur in 12 m um den Helden, sonst zurück); Omas Umlernen-Tafel ging nach jedem Gespräch auf und wählte den Bezahl-Knopf vor (jetzt nur nach Gesprächen ohne Angebot oder Auftragsschritt, „Nein danke“ vorgewählt). Teststand: **589 Tests grün** (`tests.html`).
- **Konsole für Handproben** (mit `?debug=1&mode=adventure`): `__debug.run.record.level = 10; __debug.run.record.skillPoints = 9; __debug.run.dirty = true;` dann Pause → Fähigkeiten.

**Abenteuer-Modus Etappe 3, Kapitel 2 „Der Sumpf“ (gebaut, getestet, auf `main`, 2026-11-15):**

- **Gelände** (Bauweise A, Spec §3): neue Zellart `CELL.mud` im Kartenraster `src/core/mapGrid.js`, Karten beschreiben `mud` und `boardwalks` (Stege, gemalt wie Brücken). Die Geländequelle meldet über die freiwillige Abfrage `speedFactor(x, z, mode)` das Tempo (Schlamm × 0,65 zu Fuß, `TERRAIN` in `src/data/adventure.js`); `stepWorld` und `enemySpeed` nutzen sie über `terrainFactor` nur, wenn es sie gibt. Flieger und `mudproof` (Hecht Haudrauf) bremst Schlamm nicht.
- **Moorblasen:** reine Logik in `src/core/hazards.js` (`createBubbles`, `stepBubbles`, Zufall nur `world.rng`), Regeln in der Regelschicht (`bubbleRules` in `src/modes/adventure.js`): nur auf Schlamm, nie näher als 6 m an einem Lagerfeuer, nie in einer Bossarena ohne `bubbleArena`; Ereignisse `bubbleWarn` (Kreis, 1,2 s) und `bubblePop`; Held verliert 8 % seines Lebens, Gegner 2/3 des Lebens eines Ochsenfroschs der Kartenstufe, Bosse höchstens 5 %. Tötungen zählen normal (Beute, Aufträge). Rasten, Tod und Kartenwechsel leeren angekündigte Blasen. Zahlen in `BUBBLES`.
- **Gegner und Bosse** (`src/data/enemies.js`, alle `adventureOnly`): Ochsenfrosch (Sprung mit eigener Weite `pounceRange`), Libelle (fliegt, `circle`), Blutegel (`leech`: Treffer bremst den Helden 1,5 s um 40 % über `hero.slowUntil`/`slowFactor` und heilt den Egel um 10 %), Kaulquappe; Hofmarschall Quak (Sprung, ruft alle 20 s vier Kaulquappen), Hecht Haudrauf (Ansturm; neue Bossform `bubbles`: vier angekündigte Blasen-Kreise, der erste genau am Helden).
- **Karte** `src/data/maps/kapitel2.js` (Hauptweg etwa 1.300 m, drei Seitenwege, Gebiete Schilfrand, Unkenteich, Froschhof, Nebelmoor, Seerosenbucht, Moorwald, Hechtloch; Feuer `k2_rand`, `k2_froschhof`, `k2_nebel`, `k2_hecht`; Gruppen Stufe 10–16, Kennungen `p2_…`; Moorbach quer über die Karte nur über einen Steg; Sperre hinter Quak). Dorf: Ausgang `nach_kapitel2` im Westen mit `requires: { chapterDone: 1 }` (`exitOpen`), Wegweiser erscheint erst dann (`props[].requires`).
- **Inhalte:** 5 Haupt- und 3 Nebenaufträge (`src/data/quests.js`, Bewohnerin Frau Quappe), Gespräche, Bildergeschichte am Anfang (`STORY.chapterStart[2]`, läuft beim Betreten, solange der erste Auftrag beim ersten Schritt steht, `chapterStartDue`) und am Ende („Fortsetzung folgt“), 8 Gegenstände `source: 'kapitel2'` (noch ohne Bildbogen: `itemSheet` → null, Ersatzsymbol), Krümels Auswahl je Kapitel (`SHOP.stockByChapter`, `shopStock(adventure)`, `buyItem(save, id, heroId)`), Erfolg „Sumpfdotter“ (jetzt 44 Erfolge), Flussperlen von Quak (3) und Haudrauf (4).
- **Spielstand:** bleibt Version 5. Das Ausbessern kennt die neuen Feuer, Bosse, Kisten und Fundorte über die Kartendaten; `chapterDone` behält jetzt jedes Kapitel, das es als Karte gibt (vorher nur 1).
- **Darstellung:** Schlamm als deckende braun-grüne Fläche, Stege mit Brettern, heller Ring an offenen Ausgängen, Moorblase als hellgelber blubbernder Kreis und Spritzer, Haudraufs Blasen wie Sprungkreise; Minikarten-Farben je Zellart in `MINIMAP.colors`. Stellvertreter-Bilder: Ochsenfrosch, Kaulquappe, Quak = Frosch, Haudrauf = Gräte (`cell` in `ADVENTURE_ENEMY_SPRITES`), Libelle = Krähe, Blutegel = Kreuzotter; Frau Quappe als 3D-Figur, Porträt „F“.
- **Entscheidungen beim Bau** (nicht in der Spec): Schlamm deckend (durchscheinend überdeckte er die Warnkreise); Treffer der Blasen am Mittelpunkt (ohne Körperradius), auch Flieger; Arenen bleiben für Blasen auch nach dem Sieg gesperrt; Werte der Gegner in der Größenordnung von Gräte/Zwickzwack; Auftrags-Erfahrung so, dass Kapitel 2 ohne Wiederholen von Level 10 auf etwa 16 bringt; mit dem Abschluss von Kapitel 1 (und beim Start für alte Stände) nimmt der Held den ersten Sumpf-Auftrag gleich an, Omas Erinnerung erzählt vom Sumpf; Abschlusstafel von Kapitel 1 sagt, wo der Sumpf beginnt; „Hilfsbereit“ zählt nur Nebenaufträge von Kapitel 1; Namen der Auftragsstücke in `QUEST_THING_NAMES`. Der Erfolg „Blubb“ kommt mit Kapitel 3 (braucht einen Zähler, Spielstand 6).
- **Im Browser geprüft (390 × 844 und Desktop):** Dorf-Ausgang mit Ring und Wegweiser nach Kapitel 1, Gespräch mit Oma per Taste E und Enter, Ausgang per Pfeiltaste, Einstiegsgeschichte per Maus, Schlamm und Stege, Moorblase sichtbar angekündigt, Frau Quappe per Knopf „Sprechen“ (Maus), Libellen und Helmfische, Haudrauf mit Bossanzeige und vier Kreisen, Quak mit Sprung und Kaulquappen, kein seitliches Scrollen, Minikarte, Konsole ohne Fehler, Wellen-Modus startet. **Nicht von Hand geprüft:** ganzes Kapitel am Stück, Seitenaufträge im echten Spiel, Händlerauswahl am Bildschirm, 3D-Ersatz ohne Bilder, echtes Handy.
- **Gesamtprüfung (2026-11-15, frischer Prüfer über `6b1cf24..ea43002`):** keine kritischen Befunde. Behoben mit Test (Commit `47dc274`): Haudraufs Arena war undicht (Schlamm reichte am Tor vorbei; neuer Test: jede Arena ist mit geschlossenem Tor dicht); wer nach Kapitel 1 gleich in den Sumpf lief, hatte keinen Auftrag und sah die Geschichte nicht; der Wellen-Modus war nicht mehr Bit für Bit gleich (Reihenfolge einer Multiplikation; der 60-s-Test vergleicht jetzt exakt, ein 12-Minuten-Lauf ist gleich wie vor dem Kapitel); Meldung „Gefunden: einladung“. Teststand: **659 Tests grün** (`tests.html`).
- **Konsole für Handproben** (mit `?debug=1&mode=adventure`): `__debug.run.record.chapterDone = [1]` öffnet den Westausgang des Dorfs; `__debug.run.world.hero.x = …` versetzt den Helden.

## 2. Was noch fehlt (vom Auftraggeber gewünschte Pakete und offene Wünsche)

Reihenfolge wie vereinbart; jedes Paket bekommt eigenen Entwurf, Spec und Plan.

**Paket 2 – Mehr Welten:** Nach einem Boss geht es auf eine neue Karte mit neuen Tieren (Idee des Auftraggebers: z. B. Unterwasserwelt). Dafür braucht er wieder Beschreibungen für den Bildgenerator. Die sechs Landschaftsbilder in `assets/umgebung/szenen.webp` (Waldweg, Steinbrücke, Höhle, Wasserfall, Baum auf der Wiese, Teich) stehen seit Aufgabe 6 als Hintergrund hinter den Menüs und sind weiter als Titelbilder möglicher Welten vorgemerkt.

**Paket 3 – Taverne:** gebaut und geprüft, siehe Abschnitt 1. Mit Zustimmung des Auftraggebers am 2026-11-14 nach `main` zusammengeführt. Die Beschreibungen für den Bildgenerator stehen in der Spec, Anhang A (für neue oder ersetzte Bilder). Vom Auftraggeber entschieden: Gewinne sind vor allem Gold, Ausrüstung selten, aber lustig; drei glücksbasierte Spiele; das Duo ist freischaltbar und spielbar für 20.000 Gold; Beute in einer gemeinsamen Truhe; nur Spielgold, kein echtes Geld; ein einziger Affe (Kasimir) betreut zwei Tische, weil „Neue Gegner“ Fuchs und Dachs als Gegner hat. „Höher oder tiefer“ zahlt nach Risiko statt immer doppelt (sonst ausnutzbar); das hat der Auftraggeber mit der Spec freigegeben. Seit 2026-11-14 (Wunsch des Auftraggebers) ist ein gleicher Wert bei „Höher oder tiefer“ unentschieden statt verloren: Topf und Treffer bleiben, man tippt erneut. Damit das Haus weiter im Schnitt etwa 7 % behält, rechnen die Faktoren nur mit den 12 Werten, die entscheiden, und sind dadurch etwas kleiner (bei einer 8 jetzt ×1,8 statt ×2,0). Die einzige Wahl, die nicht verlieren kann („Höher“ bei der 2, „Tiefer“ beim Ass), zahlt ×1,0.

**Paket 4 – Abenteuer-Modus mit Story:** Etappen 1 und 2 sowie Kapitel 2 der Etappe 3 fertig (Abschnitt 1). Offen: Etappe 3 Kapitel 3 und 4 (Biberdamm, Schlosssee), Einbau der Bilder für Kapitel 2, sobald geliefert, Etappe 4 sichtbare Ausrüstung, Etappe 5 neue freischaltbare Klassen. Ein Held gilt für alle Modi; Level und Ausrüstung wirken nur im Abenteuer (vom Auftraggeber bestätigt).

**Weitere offene Wünsche und Ideen**

- ~~Getroffene Gegner blitzen nicht auf~~ – erledigt 2026-11-15 (Treffer tragen die Gegnerkennung, Gegner leuchten 0,1 s hell auf; `ENEMY_FLASH` in `src/data/sprites.js`)
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
- Schalter zum Ausprobieren stehen in `README.md` (`?debug=1`, `?speed=`, `?autostart=1`, `?animal=` (auch `giraffe`), `?class=` (auch `hochstapler`), `?autopick=1`, `?stress=1`, `?quality=low`, Tasten K und L)
- Läuft ein Durchgang im Vorschaufenster, geht er bei Fokusverlust in die Pause; dann „Weiter“ anklicken

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
- **Limit (Regel vom 2026-11-13):** vor größeren Schritten (und vor jedem Subagenten) den Verbrauch mit dem Usage-Tool prüfen. Ab etwa 95 % eines Fensters (5 Stunden oder Woche; Auftraggeber am 2026-11-14: „du kannst auch bis 95% gehen“): den laufenden kleinen Schritt abschließen, alles committen, nach `origin/main` pushen und den Stand hier festhalten. Sobald das Limit wieder frei ist, ohne neue Rückfrage weitermachen. Wortlaut des Auftraggebers: „wenn du kurz davor bist ans limit zu kommen committe und pushe alles und sobald es wieder geht darfst du direkt weiter machen“. Bei etwa 10 % restlichem Kontext ebenso sichern
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

**Aufräumrunde 2026-11-15** (Wunsch des Auftraggebers: „erst die Kleinigkeiten“). Behoben, jeweils mit Test, wo die Logik betroffen ist (Commits `107ec1e` bis `83f4b1b`):

- Etappe 2: Lebensraub zählt nur den Schaden bis zum restlichen Leben; ein ganz vom Schild geschluckter Otterbiss vergiftet nicht mehr (und stößt nicht weg); das Erdmännchen läuft nicht durch gesperrte Fläche, Verwandte von „Familientreffen“ erscheinen nur auf begehbaren Stellen und als Erdmännchen; Umlernen und Tod räumen laufende Besonderheiten weg; unsichtbar wartet die Grundattacke (die Unsichtbarkeit ist wieder ein Hinterhalt); Omas Sätze stehen in `RESPEC_LINES` (`src/data/dialogues.js`), nach dem Umlernen sagt sie, wo man neu wählt; „kritischer Schaden +10 %“ statt „+0,10“; Helden aus Etappe 1 ab Level 10 bekommen beim Start einmal die Meldung „Wähle deine Unterklasse!“.
- Etappe 1: neue Erkundung der Minikarte wird mitgespeichert; schlägt ein Speichern fehl (Speicher voll), baut das nächste auf dem ungespeicherten Stand auf, nichts geht verloren (`createStore`); `busy` wird nach Gespräch und Lagerfeuer immer zurückgesetzt (`try/finally`); der Goldverlust beim Tod rechnet mit dem Gold nach Erfolgsbelohnungen; Reisen zählt als Rasten („Lagerfeuerromantik“); nach einem Kartenwechsel blenden Gegner nicht mehr von alten Positionen über. Geprüft und in Ordnung: die Leertaste löst in Gesprächen nicht doppelt aus (Browser verwirft das Loslassen, weil das Drücken schon behandelt ist).
- Neue Gegner: Ein betäubter oder verwirrter Luchs bricht seinen Sprung ab (vorher landete er nach der Betäubung sofort und traf); Verwirrung bricht auch das Ducken ab; ausgewichene Gift-Ticks zeigen kein „Ausgewichen“ und zählen nicht für „Glückspilz“; JSDoc in `src/audio/sfx.js` und der Kommentar „Fassungsvermögen“ stehen richtig; Gift-Leuchtfarbe der 3D-Figur in `HERO_POISON_EMISSIVE`; ein betäubter, eingerollter Igel dreht sich nicht mehr.
- Taverne: eine Runde mit unbekannter Beute oder ungültiger Auszahlung (NaN, negativ) ändert nichts mehr; `svg()` gibt es nur noch einmal (`src/ui/dom.js`); Tastenprüfung abgesichert; der Fokus springt nicht hinter eine offene Rückfrage; nach einer abgelehnten Runde sagt der Wirt, dass Gold fehlt; `backOnEscape` nicht mehr exportiert.
- Paket 1 und älter: die Bodentextur der App bleibt unverändert (der Boden nutzt eine Kopie); durchscheinende Baum-Materialien werden freigegeben, sobald der Baum wieder deckend ist; Export nach einem beschädigten Stand gibt die gesicherte Kopie aus, solange noch nichts Neues gespielt wurde; Erfolgs-Einblendungen liegen auf dem Ergebnisbildschirm unten; die Großfamilie blendet beim Tod mit aus. Die Anzeige der Bildrate fing schon vorher keine Zeiger ab (`pointer-events: none`).

**Kapitel 2 (Gesamtprüfung 2026-11-15), zurückgestellt:**

- Moorblasen laufen über den Kampfweg des Helden: Lebensraub heilt den Helden, wenn eine Blase Gegner trifft; „Klauen“ kann Gold geben; ein markierter Boss nimmt mehr als 5 %.
- Die Blasen prüfen Arenen nur am Mittelpunkt; eine Blase knapp außerhalb könnte 1,8 m hineinreichen (mit den heutigen Daten unmöglich, nächster Schlamm 49 m von Quaks Arena). Für Kapitel 4 beachten.
- „Hilfsbereit“ erkennt Nebenaufträge von Kapitel 1 daran, dass sie keinen Schritt auf einer späteren Karte haben; ein künftiger reiner Gesprächsauftrag würde fälschlich mitzählen.
- Der erst nach Kapitel 1 sichtbare Wegweiser im Dorf hält schon vorher Randbäume fern (nur Aussehen).
- Kein eigenes Zeichen am Helden, solange ein Blutegel ihn bremst.

**Bewusst gelassen** (mit Grund):

- Entscheidungen, nicht Fehler: Rasten mitten im Kampf entfernt die angreifende Gruppe (Fluchtweg; Spec sagt nichts); Höher oder tiefer prüft Erfolge schon nach dem Aufdecken; Neuladen mitten in einer Runde kostet den Einsatz (wie in der Spec); im Pausenfenster führen nur „Weiter“ oder Esc zurück; Ausweichen gilt für Gift-Ticks.
- Braucht ein echtes Handy oder Messungen: Bäume und Felsen zu weniger Zeichenaufrufen zusammenfassen; Bildrate auf dem Handy; ganz seltener Fall „Finger hoch“ und „Erfassung verloren“ gehen beide verloren.
- Braucht das Auge des Auftraggebers oder neue Bilder: Bodenkachel als Muster erkennbar, Schatten unter Truhen dezent, Deko sparsam; kleine weiße Stellen in `helden.webp`; Hasenohren der 3D-Ersatzfigur ragen durch Hut und Kapuze; Schatten-Wolke und -Geschosse nie im Bild geprüft; Klang-Stimmen werden nicht getrennt (Ton hat noch niemand gehört).
- Kleine Darstellungsdinge ohne sichtbare Folge: in der Sterbephase laufen Welt und Effekte mit verschiedenen Uhren; Animationsgriff bei „Bewegung reduzieren“; die Truhen-Detailansicht hängt nicht am Aufräumen des Bildschirms; Duo: einige Zahlen im Darstellungscode, kein Abstand zwischen den Phasen, Titel des gesperrten Duos mit wenig Kontrast (Stelle nicht eindeutig gefunden).
- Tests fehlen noch für die Wahl der Duo-Phase, „Bewegung reduzieren“ und die Anbindung der Zeigerereignisse (nur im Browser prüfbar); ein Test heißt noch „stride“ (die Gangart gibt es weiterhin, der Titel stimmt also).
- Zweiter Tab mit offener Taverne zeigt das Gold erst nach der nächsten Aktion neu (kein Gold in Gefahr).
- Erdmännchen, Wolke und Fähigkeiten mit großer Reichweite können einen ruhenden Boss von außerhalb seiner Arena treffen (Arena-Regeln: Thema für Etappe 3).
- Testserver meldet beim Neuladen manchmal `ERR_CONNECTION_RESET` (Server, nicht Spiel; Wechsel zwischen `localhost` und `127.0.0.1` hilft).

## 9. Was nur der Auftraggeber prüfen kann

- Spielgefühl auf einem echten Handy (Daumen, Bildrate, Ton)
- Ob 15 Minuten ausgewogen sind
- Ob Ton und Bilder gefallen
- Ob die Spiele der Taverne Spaß machen, ob Beute selten genug ist und ob 20.000 Gold für das Duo sich richtig anfühlen
- Ob die Wirte als Kopf-Porträts gefallen oder ganze Figuren besser wären
- Ob Schlamm, Stege und Moorblasen im Sumpf Spaß machen, ob Kapitel 2 lang genug ist und ob die Bosse zu leicht oder zu schwer sind
- Die veröffentlichte Seite auf GitHub Pages
