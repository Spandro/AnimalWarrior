# AnimalWarrior – Abenteuer-Modus, Etappe 3: Kapitel 2 bis 4 mit Gelände, das mitspielt (Design)

Stand: 2026-11-15 · dritte von fünf Etappen des Abenteuer-Modus. Baut auf Etappe 1 (`docs/superpowers/specs/2026-11-14-abenteuer-etappe1-design.md`) und Etappe 2 (`docs/superpowers/specs/2026-11-14-abenteuer-etappe2-design.md`) auf, beide gebaut und auf `main` (Spielversion 0.6.0, Spielstand 5).

## 1. Anlass und Ziel

Die Geschichte um den Goldfisch **Seine Durchlaucht Flossian der Erste** endet bisher mit Kapitel 1 („Fortsetzung folgt“). Etappe 3 erzählt sie zu Ende: Sumpf, Biberdamm, Schlosssee und das Ende, bei dem Flossians Glas umkippt. Die Kapitel, ihr Thema und das Ende stehen seit Etappe 1 fest (dort §4, vom Auftraggeber bestätigt).

Im Gespräch am 2026-11-15 festgelegt:

- **Kapitel für Kapitel** (Wahl des Auftraggebers): ein gemeinsamer Entwurf für alle drei Kapitel; gebaut, geprüft und ausgeliefert wird jedes Kapitel einzeln, erst Kapitel 2, dann 3, dann 4. Nach jedem Kapitel kann der Auftraggeber spielen und Rückmeldung geben.
- **Das Gelände spielt mit** (Wunsch des Auftraggebers, Vorschlag mit „passt so“ bestätigt): Jedes Kapitel bringt eine neue Gelände-Regel, die in den späteren Kapiteln bleibt (§4).
- **Geschichte, Gegner, Bosse und Bewohner** wie in §5 bis §7 vorgeschlagen und mit „passt so“ bestätigt.
- **Bauweise A** (Wahl des Entwurfs, der Auftraggeber hat das Wie überlassen): Gelände als neue Zellarten im vorhandenen Kartenraster (§3).

**Erfolg heißt:**

- Nach Kapitel 1 geht es vom Dorf aus in den Sumpf, später zum Biberdamm und zum Schlosssee. Am Ende ist Flossian besiegt, die Schlussgeschichte läuft, und Flossian lebt beleidigt im Dorfbrunnen.
- Jedes Kapitel fühlt sich durch sein Gelände anders an: Im Sumpf bremst Schlamm, am Damm zieht die Strömung und Schleusen verändern die Wege, im Schlosssee kommen und gehen die Gezeiten.
- Alles Gelände ist sichtbar und wird angekündigt. Niemand stirbt ohne Vorwarnung, niemand bleibt eingesperrt.
- Alles geht mit Handy allein, Tastatur allein und Maus allein.
- Alte Spielstände laden ohne Verlust. Der Wellen-Modus bleibt unverändert.

## 2. Ziele, Nicht-Ziele, Anti-Ziele

**Ziele:** drei neue Karten mit je einer Gelände-Regel, neun neue Gegner, sechs Bosse, neue Bewohner, Aufträge, Bildergeschichten bis zum Ende der Geschichte, neue Gegenstände je Kapitel, Erfolge.

**Nicht-Ziele:** Schwimmen oder Tauchen als eigene Steuerung (großer Umbau, am Handy schwer zu bedienen); Gelände im Wellen-Modus; sichtbare Ausrüstung (Etappe 4); neue Klassen (Etappe 5); Level über 30; neue Grafiktechnik (die Karten werden mit den vorhandenen Mitteln gezeichnet).

**Anti-Ziele:**

- Kein Tod aus dem Nichts: Jede Gefahr des Geländes ist vorher zu sehen (Kreis, Anzeige, Farbe).
- Kein Einsperren: Weder Gezeiten noch Schleusen dürfen den Helden in einer gesperrten Fläche oder hinter einem Tor festhalten.
- Keine Rätsel, an denen man hängen bleibt: Schleusen sind kleine Aufgaben, die ein Kind mit einem Hinweis lösen kann.
- Ein vorhandener Abenteuer-Stand verliert nichts: weder Level, Punkte, Fähigkeiten noch Gegenstände.
- Das Gelände darf keine Besonderheit einer Unterklasse überflüssig machen oder unbesiegbar machen (z. B. Gegner dauerhaft in Moorblasen festhalten).

## 3. Ansätze

| Ansatz | Abwägung |
|---|---|
| **A – neue Zellarten im Kartenraster** (Schlamm, Steg, Strömung mit Richtung, tiefe Stelle); Karten beschreiben sie mit Linien und Flächen wie heute den Bach; die Welt fragt beim Bewegen die Zelle ab; Schleusen und Gezeiten schalten Flächen um wie heute die Tore | Minikarte, Darstellung und Kollision kennen das Gelände von selbst; eine Wahrheit; gut testbar. Etwas Umbau am Raster (Richtung der Strömung) |
| B – Gelände als eigene Zonen (Kreise, Bänder) neben dem Raster, je Schritt geprüft wie die Gebiete | schneller angelegt; aber zwei Wahrheiten, Minikarte und Darstellung müssten die Zonen extra kennen, Schleusen und Gezeiten müssten trotzdem das Raster ändern |
| (verworfen) alles in der Regelschicht | Gegner müssen das Gelände auch spüren; das gehört in die Welt |

**Gewählt: A** (Wahl des Entwurfs; der Auftraggeber hat das Wie überlassen).

## 4. Gelände, das mitspielt

Alle Zahlen sind Startwerte fürs Balancing und stehen in `src/data/`. Jede Regel gilt ab ihrem Kapitel auch in den späteren Karten (die Karten dürfen Schlamm, Strömung usw. wieder verwenden).

### 4.1 Kapitel 2 – Schlamm, Stege, Moorblasen

- **Schlamm** (neue Zellart): Held und Gegner am Boden laufen langsamer (Startwert: Tempo × 0,65). Fliegende Gegner (Krähe, Uhu, Libelle) stört er nicht. Geschosse fliegen darüber.
- **Steg** (neue Zellart, wie Brücke): begehbar über Schlamm und Wasser, normales Tempo. Stege bilden schnelle Wege durch den Sumpf.
- **Moorblasen:** In Schlammflächen im Umkreis des Helden (Startwert 14 m) steigt etwa alle 3 bis 5 s eine Blase auf. Erst ist ein blubbernder Kreis zu sehen (Startwert 1,2 s), dann platzt sie: Schaden an allen im Kreis (Startwert Radius 1,8 m), Held und Gegner. Gegner nehmen festen Schaden nach Gebietsstufe, der Held einen Anteil seines höchsten Lebens (Startwert 8 %). Ort per Zufall der Welt (`world.rng`); nie direkt unter einem Lagerfeuer oder in einer Bossarena außer der von Hecht Haudrauf.
- Moorblasen gibt es nur auf Karten, die sie einschalten (Kapitel 2 und Teile von 4).

### 4.2 Kapitel 3 – Strömung und Schleusen

- **Strömung** (neue Zellart „flaches Wasser mit Richtung“): begehbar; schiebt Held und Gegner am Boden mit festem Tempo in Flussrichtung (Startwert 2,5 m/s). Gegen die Strömung kommt man langsam voran, mit ihr schnell. Die Richtung kommt aus dem Linienzug in der Kartenbeschreibung (Richtung des jeweiligen Abschnitts). Rückstoß und Strömung dürfen niemanden in gesperrte Fläche schieben (wie heute: Positionen werden am Ende des Schritts auf begehbare Fläche zurückgenommen).
- **Schleusen:** Am Damm stehen Hebel (Taste E, Enter oder antippen, wie Sprechen). Ein Hebel schaltet eine Schleuse zwischen „zu“ und „offen“. Jede Schleuse gehört zu einer Fläche der Karte, die dadurch zwischen zwei Zuständen wechselt, zum Beispiel trockenes Flussbett (begehbar) und überflutet (Wasser oder Strömung). So öffnen und schließen sich Wege.
- **Wegspülen:** Wird eine Fläche überflutet, nehmen Gegner darin Schaden und werden mit der Strömung weggeschoben. Der Held wird ohne Schaden ans nächste begehbare Ufer geschoben.
- **Kleine Rätsel:** Etwa drei Schleusen im Kapitel. Ein Bewohner (die Biber nach dem Seitenwechsel, §5.2) gibt einen Hinweis. Kein Zustand darf das Weiterkommen dauerhaft verhindern: Jeder Hebel ist von beiden Zuständen aus erreichbar.
- Der Zustand der Schleusen wird gespeichert (§9).

### 4.3 Kapitel 4 – Gezeiten

- **Tiefe Stelle** (neue Zellart): bei Hochwasser gesperrt (Wasser), bei Niedrigwasser begehbar.
- **Gezeiten:** Der Wasserstand wechselt im Takt (Startwerte: 25 s Niedrigwasser, 15 s Hochwasser). Eine Anzeige oben zeigt den Stand und kündigt den Wechsel 5 s vorher an. Steigendes Wasser färbt die tiefen Stellen vorher sichtbar ein.
- Steht jemand beim Steigen auf einer tiefen Stelle: Der Held wird ohne Schaden zum nächsten begehbaren Ufer geschoben; Gegner ebenso (Bodengegner) oder sie bleiben stehen (fliegende).
- Bei Niedrigwasser liegen Wege, Abkürzungen und versteckte Kisten frei.
- Die Gezeiten laufen nur auf der Karte von Kapitel 4 und nur, solange gespielt wird (nicht in Pause oder Gesprächen). Beim Betreten der Karte beginnt der Takt mit Niedrigwasser.
- **Endkampf:** Flossian ist bei Hochwasser unangreifbar (vorhandenes Feld `untargetable`), bei Niedrigwasser angreifbar (§6.3).

### 4.4 Darstellung des Geländes

Ohne neue Bilder zunächst als Farbflächen und einfache Formen wie heute Weg und Bach: Schlamm braun-grün, Steg wie die Brücke mit Brettern, Strömung blau mit wandernden Streifen in Flussrichtung, tiefe Stellen dunkelblau, bei Niedrigwasser nasser Sand. Moorblasen als blubbernder Kreis, dann Spritzer. Hebel als einfache 3D-Form. Die Minikarte zeigt die Geländearten in eigenen Farben. Sobald Bilder kommen (§10), ersetzen sie die Farbflächen wie in Etappe 1.

## 5. Die drei Kapitel

Gestaltung der Karten (Wege, Lichtungen, Orte) wie Kapitel 1: ein Hauptweg mit Seitenwegen, Lagerfeuer in passenden Abständen, Gebiete mit Namen. Länge und Dauer etwa wie Kapitel 1.

### 5.1 Kapitel 2 – Der Sumpf („Die Frösche haben sich verbündet“)

- Flossian hat den Fröschen ein eigenes Königreich versprochen. Die Unke **Frau Quappe**, eine Bewohnerin des Sumpfs, macht als Einzige nicht mit und hilft dem Helden.
- Level des Gebiets etwa 10 bis 16.
- Neue Gegner: **Ochsenfrosch**, **Libelle**, **Blutegel** (§6.1). Dazu vorhandene: Frosch, Helmfisch, Kreuzotter.
- Zwischenboss **Hofmarschall Quak**, Kapitel-Boss **Hecht Haudrauf** (§6.2).
- Gelände: Schlamm, Stege, Moorblasen (§4.1).

### 5.2 Kapitel 3 – Der Biberdamm („Die Biber wurden reingelegt“)

- Flossian hat den Bibern erzählt, der neue Damm sei ein Geschenk an alle. In Wahrheit will er ihn brechen und das Land fluten. Wer die Biber überzeugt, gewinnt sie als Verbündete; sie öffnen dann eine Schleuse, die man allein nicht erreicht.
- Level etwa 16 bis 22.
- Neue Gegner: **Aal**, **Bisam**, **Helmhecht** (§6.1). Dazu vorhandene: Helmfisch, Krebs, Ochsenfrosch.
- Zwischenboss **Bauleiter Nagezahn** (ein reingelegter Biber; besiegt erkennt er den Betrug und wechselt die Seite, danach Bewohner und Hinweisgeber), Kapitel-Boss **Admiral Flossenbart** (§6.2).
- Gelände: Strömung und Schleusen (§4.2), etwas Schlamm.

### 5.3 Kapitel 4 – Der Schlosssee (Flossians Reich)

- Ein halb versunkenes Schloss im See, Flossians Hof. Seine Leibgarde, zum Schluss er selbst.
- Level etwa 22 bis 28.
- Neue Gegner: **Gardekrebs**, **Kugelfisch**, **Muschelschütze** (§6.1). Dazu vorhandene aus Kapitel 2 und 3.
- Zwischenboss **Die Krebs-Sänftenträger**, Endboss **Seine Durchlaucht Flossian der Erste** (§6.2, §6.3).
- Gelände: Gezeiten (§4.3), dazu Strömung und Schlamm an einzelnen Stellen.

### 5.4 Ablauf und Dorf

- Das Dorf Bachwinkel bleibt der Ort zwischen den Kapiteln. Nach Kapitel 1 öffnet sich am Dorf ein Weg in den Sumpf (neuer Ausgang), nach Kapitel 2 zum Damm, nach Kapitel 3 zum See. Reisen geht wie bisher zu bekannten Lagerfeuern.
- Oma Panzerla gibt je Kapitel den ersten Hauptauftrag. Danach führen die Bewohner des Kapitels weiter.
- Je Kapitel etwa 5 Hauptaufträge und 2 bis 3 Nebenaufträge, mit den vorhandenen Schritt-Arten (Sprechen, Besiegen, Sammeln, Untersuchen) und den neuen: „Hebel umlegen“ (Kapitel 3) und „bei Niedrigwasser erreichen“ (Kapitel 4, als Untersuchen eines Orts, der nur dann begehbar ist).
- Bildergeschichte am Anfang jedes Kapitels (kurz, 2 bis 3 Tafeln) und am Ende. Nach Kapitel 4 die Schlussgeschichte; danach sitzt Flossian im Dorfbrunnen und hat ein paar beleidigte Sätze.
- Am Ende von Kapitel 2 und 3 steht wie bisher eine Abschlusstafel mit Hinweis auf das nächste Kapitel. Wird Kapitel 3 oder 4 noch nicht ausgeliefert (Kapitel für Kapitel), steht dort „Fortsetzung folgt“.

## 6. Gegner und Bosse

Namen, Aussehen und Eigenheiten wie vorgeschlagen und bestätigt. Bewegungs- und Angriffsarten möglichst aus den vorhandenen Formen (`behavior`, `BOSS_MOVES`); wo etwas Neues nötig ist, steht es dabei. Werte in der Größenordnung vorhandener Gegner, angepasst an die Gebietsstufe (vorhandenes `AREA_SCALE`). Alle neuen Gegner sind `adventureOnly` (nie im Wellen-Modus).

### 6.1 Neue Gegner

| Kapitel | Gegner | Aussehen | Bewegung | Eigenheit |
|---|---|---|---|---|
| 2 | **Ochsenfrosch** | dicker Frosch mit Schilfhelm | duckt sich und springt (`pounce`), weiter als der Frosch | zäh |
| 2 | **Libelle** | große Libelle mit schimmernden Flügeln | fliegt, stößt im Zickzack vor (`circle`, fliegend) | Schlamm stört sie nicht |
| 2 | **Blutegel** | dunkler Egel | langsam verfolgend (`chase`) | ein Treffer bremst den Helden kurz und heilt den Egel ein wenig (neue kleine Eigenheit) |
| 3 | **Aal** | glänzender Aal | seitlich schlängelnd (`slither`), in Strömung schneller | Stromschlag im Kreis mit Vorwarnung (wie Bodenkreis des Luchses) |
| 3 | **Bisam** | Bisamratte mit Grabkralle | gräbt sich ein und taucht neben dem Helden auf (neue Bewegungsart „graben“: unangreifbar und unsichtbar während des Grabens, Kreis kündigt das Auftauchen an) | |
| 3 | **Helmhecht** | Hecht im großen Taucherhelm | verfolgt (`chase`), kurzer Ansturm (`charge`) | stärkerer Helmfisch |
| 4 | **Gardekrebs** | Krebs mit Rüstung und Hellebarde | seitlich nähernd (`strafe`) | gepanzert (Rüstung); Gegner in seiner Nähe nehmen weniger Schaden (neue kleine Eigenheit, Startwert −25 %, nicht stapelbar) |
| 4 | **Kugelfisch** | Kugelfisch im Helm | verfolgt; bläht sich in der Nähe auf und platzt nach Vorwarnung | Platzen schadet im Kreis, auch anderen Gegnern |
| 4 | **Muschelschütze** | Muschel auf Krebsbeinen | hält Abstand und schießt (`ranged`) | Perlen als Geschosse |

### 6.2 Bosse

| Kapitel | Boss | Aussehen | Angriffe |
|---|---|---|---|
| 2 | **Hofmarschall Quak** (Zwischenboss) | dicker Frosch mit Krone | Sprung (`leap`), ruft Kaulquappen (Verstärkung wie Zwickzwack, kleine schwache Gegner) |
| 2 | **Hecht Haudrauf** (Kapitel-Boss) | großer Hecht mit Narbe | Ansturm durch den Schlamm (`dash`, den Schlamm stört er nicht), Moorblasen um sich herum (neue Bossform: mehrere angekündigte Blasen in der Arena) |
| 3 | **Bauleiter Nagezahn** (Zwischenboss) | Biber mit Bauhelm und Plan | wirft Holzstämme (neue Bossform: rollende Stämme als breite Geschosse mit Vorwarnstreifen), Schwanzschlag (`swipe`); besiegt wechselt er die Seite |
| 3 | **Admiral Flossenbart** (Kapitel-Boss) | riesiger Wels mit Admiralsmütze | Druckwelle (`ring`), dreht die Strömung in der Arena (neue Bossform: Strömungsrichtung wechselt mit Ankündigung) |
| 4 | **Die Krebs-Sänftenträger** (Zwischenboss) | zwei Krebse, die sonst Flossians Glas tragen | zwei Bosse in einer Arena mit gemeinsamer Bossanzeige; Scherenhieb (`swipe`), gemeinsamer Ansturm (`dash`) |
| 4 | **Flossian der Erste** (Endboss) | Goldfisch im Glas auf einer leeren Sänfte | §6.3 |

### 6.3 Endkampf gegen Flossian

- Arena im Thronsaal mit tiefen Stellen. Die Gezeiten laufen in der Arena schneller (Startwerte: 12 s Niedrigwasser, 10 s Hochwasser).
- Bei Hochwasser schwimmt das Glas außer Reichweite und ist unangreifbar; Flossian schießt Wasserstrahlen (Geschosse) und ruft Helmfische.
- Bei Niedrigwasser sitzt das Glas fest und ist angreifbar.
- Ab halbem Leben wird er schneller und ruft Gardekrebse.
- Besiegt: Das Glas kippt um, Flossian landet in einer Pfütze. Schlussgeschichte, danach Abschlusstafel „Ende“ und Flossian im Dorfbrunnen.

## 7. Bewohner

- **Frau Quappe** (Unke, Kapitel 2): Hinweisgeberin im Sumpf, gibt Haupt- und Nebenaufträge.
- **Die Biber** (Kapitel 3): erst reingelegt, nach dem Sieg über Nagezahn Verbündete; Nagezahn selbst wird Bewohner und erklärt die Schleusen.
- **Ein Bewohner am Schlosssee** (Kapitel 4, z. B. ein alter Reiher, der Flossians Hof kennt): Hinweise zu den Gezeiten. Name und Art sind Sache des Baus.
- **Flossian im Dorfbrunnen** (nach dem Ende): beleidigte Sätze, kein Auftrag.

## 8. Level, Beute, Gegenstände

- **Level:** wie oben; Gruppen und Bosse tragen ihre Stufe in der Karte wie in Kapitel 1. Erfahrungskurve und Gebietsstufe bleiben (`ADVENTURE_LEVEL`, `AREA_SCALE`). Ob sich die Level-Spannen ohne Wiederholen etwa so ergeben, prüft ein Test wie in Etappe 1 („Kapitel 1 bringt ohne Wiederholen etwa Level 9 bis 11“).
- **Gegenstände:** je Kapitel neue Gegenstände mit `source: 'kapitel2'` usw. (vorhandenes Feld; die Beute je Kapitel funktioniert schon), Startwert 8 je Kapitel, stärker als die aus Kapitel 1. Bis Bilder kommen, Symbol mit Seltenheitsrahmen wie bisher.
- **Material:** weiter Flussperlen für die Verbesserungen +4 und +5; Bosse der neuen Kapitel geben mehr.
- **Händler Krümel:** Auswahl wächst mit den abgeschlossenen Kapiteln (je Kapitel ein paar gewöhnliche Stücke dazu).

## 9. Spielstand

Neue Version **6**:

```text
je Held adventure:
  switches: { [schleusenId]: 'open' | 'closed' }   Zustand der Schleusen (fehlt = Ausgangszustand der Karte)
```

- **Umwandlung 5 → 6:** `switches: {}`. Alles andere bleibt.
- **Ausbessern:** unbekannte Schleusen fallen weg, ungültige Zustände werden zum Ausgangszustand.
- Gezeiten werden nicht gespeichert (Takt beginnt beim Betreten mit Niedrigwasser).
- Neue Karten, Lagerfeuer, Bosse, Kisten und Aufträge kommen über die vorhandenen Listen (`campfires`, `bosses`, `chests`, `quests` …) dazu; das Ausbessern kennt sie über die Kartendaten.
- Sicherungskopie vor der Umwandlung wie bisher.
- Die Spielstand-Version steigt mit dem ersten Kapitel, das Schleusen braucht (Kapitel 3); Kapitel 2 kommt ohne neue Version aus, wenn es keine neuen Felder braucht (Sache des Baus).

## 10. Bilder

- Für jedes Kapitel schreibt der Bau Beschreibungen für den Bildgenerator in `docs/abenteuer-bilder-kapitel<N>.md` (Stilblock wie bisher: zarte Aquarellmalerei mit feinen Buntstift- und Tuschestrichen, Kinderbuch-Illustration, gedeckte Farben, weißer Hintergrund, Figur schaut nach rechts, keine Schlagschatten, kein Text): ein Bogen mit Gegnern und Bossen, ein Bogen mit Bewohnern (Porträts), Gelände-Kacheln (Schlamm, Steg, Strömung, tiefes Wasser, nasser Sand), Kulissen (z. B. Schilf, Dammteile, Schlossmauern), Gegenstände.
- Bis die Bilder da sind, zeigt das Spiel Stellvertreter wie in Etappe 1 (gemalte Stellvertreter aus vorhandenen Bögen, 3D-Formen, Farbflächen). Kein Bildschirm scheitert an einem fehlenden Bild.
- Das Einbauen geliefert Bilder ist eine eigene kleine Aufgabe je Kapitel (wie in Etappe 1).

## 11. Erfolge

Vorschlag (Sache des Baus, Startwerte): je Kapitel einer für den Abschluss (**„Sumpfdotter“**, **„Dammbruch verhindert“**, **„Ebbe und Flut“**), einer für den Sieg über Flossian (**„Fisch auf dem Trockenen“**), einer für eine Gelände-Regel (z. B. 25 Gegner durch Moorblasen besiegt: **„Blubb“**). Goldbelohnung wie bei den Erfolgen von Etappe 1.

## 12. Regeln im Code

Wie Etappe 1 und 2 (Abschnitt 4 in `docs/UEBERGABE.md`): Logik in `src/core`, `src/modes`, `src/data`, `src/save` ohne Three.js, `window`, `document`, `localStorage`, `Date.now()`; Zufall nur über `createRng` bzw. `world.rng`; Darstellung und Oberfläche ändern den Weltzustand nicht (nur über Aktionen in `src/modes/adventure.js`); Zahlen und Texte in `src/data/`; Text nur über `textContent`; relative Pfade. Das Gelände wirkt nur, wenn die Geländequelle (`world.terrain`) es meldet; der Wellen-Modus nutzt eine Geländequelle ohne diese Arten und bleibt unverändert (fester Durchlauf-Test).

## 13. Reihenfolge des Baus

1. **Kapitel 2:** Geländearten Schlamm und Steg, Moorblasen, Karte, Bewohner, Aufträge, drei Gegner, zwei Bosse, Bildergeschichten, Gegenstände, Erfolg, Ausgang vom Dorf. Bildbeschreibungen. Spielversion 0.7.0.
2. **Kapitel 3:** Strömung, Schleusen und Hebel, Spielstand 6, Karte, Biber und Seitenwechsel, Gegner (mit Bewegungsart „graben“), Bosse (Holzstämme, Strömung drehen). Bildbeschreibungen. Spielversion 0.8.0.
3. **Kapitel 4:** Gezeiten mit Anzeige, Karte, Bewohner, Gegner (Schutz durch Gardekrebs, Platzen), Zwei-Boss-Kampf, Endkampf, Schlussgeschichte, Flossian im Brunnen. Bildbeschreibungen. Spielversion 0.9.0.

Jedes Kapitel bekommt einen eigenen Plan (aus diesem Entwurf), wird gebaut, von einem frischen Prüfer gegengelesen, im Browser geprüft und gepusht. README und Übergabe werden je Kapitel nachgezogen.

## 14. Entscheidungen des Entwurfs

- Bauweise A (Zellarten im Raster)
- Alle Zahlen in §4 und §6 (Startwerte)
- Name und Art des Bewohners am Schlosssee
- Neue kleine Eigenheiten: Blutegel bremst und heilt sich, Bisam gräbt, Gardekrebs schützt, Kugelfisch platzt; neue Bossformen: Moorblasen-Angriff, Holzstämme, Strömung drehen, zwei Bosse mit gemeinsamer Anzeige, Gezeiten-Endkampf
- Spielstand 6 erst mit Kapitel 3
- Gezeiten werden nicht gespeichert
- Erfolge (§11) und Gegenstandszahl (§8)
- Spielversionen 0.7.0 / 0.8.0 / 0.9.0 je Kapitel

## 15. Was dem Bau überlassen bleibt

- Wege, Lichtungen, Orte, Gruppen und Kisten der drei Karten
- Wortlaut der Gespräche, Aufträge und Bildergeschichten im Ton des Spiels
- Werte der Gegner, Bosse und Gegenstände innerhalb der Größenordnung vorhandener
- Darstellung des Geländes mit vorhandenen Mitteln, bis Bilder kommen

## 16. Prüfung

**Automatisch:** jede Geländeart wirkt (Tempo, Schub, gesperrt/frei) und nur dort, wo die Karte sie hat; Moorblasen kündigen an und treffen alle im Kreis; Strömung schiebt nicht in gesperrte Fläche; Schleusen schalten Flächen und sind von beiden Zuständen erreichbar; Wegspülen schadet Gegnern, nicht dem Helden; Gezeiten sperren und öffnen, Held wird nie eingesperrt; Flossian nur bei Niedrigwasser angreifbar; neue Gegner und Bosse mit ihren Eigenheiten; Aufträge lösbar; Level-Spannen ohne Wiederholen; Umwandlung 5 → 6; Erfolge; Wellen-Modus unverändert.

**Von Hand im Browser:** je Kapitel durchspielen in Teilen (mit `?debug=1`), Gelände sehen und spüren, Bosskämpfe, Schleusen-Rätsel, Gezeiten-Anzeige, bei 390 × 844 und am PC, nur Tastatur, nur Maus.

**Nur der Auftraggeber kann prüfen:** ob das Gelände Spaß macht, ob die Rätsel leicht genug sind, ob die Kapitel lang genug sind und ob die Geschichte gut endet.
