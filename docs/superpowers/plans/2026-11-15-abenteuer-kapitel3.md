# Abenteuer Etappe 3, Kapitel 3 „Der Biberdamm“ – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kapitel 3 spielbar machen: Karte „Der Biberdamm“ mit Strömung und Schleusen (Hebel), drei neuen Gegnern (Aal, Bisam, Helmhecht), Bossen Bauleiter Nagezahn (wechselt besiegt die Seite) und Admiral Flossenbart (dreht die Strömung), Biberin und Nagezahn als Bewohner, Aufträge mit dem neuen Schritt „Hebel umlegen“, Bildergeschichten, Gegenstände, Erfolge „Dammbruch verhindert“ und „Blubb“; Spielstand 6 (Schleusen-Zustände); Ausgang vom Dorf nach Kapitel 2; Spielversion 0.8.0.

**Architecture:** Strömung als neue Zellart `CELL.current` im Kartenraster mit Richtung je Zelle (`grid.flow`); die Geländequelle bekommt die freiwillige Abfrage `flowAt(x, z)` (Schub in m/s), `stepWorld` nutzt sie nur, wenn es sie gibt (Wellen-Modus unberührt). Schleusen sind Flächen der Karte, deren Zellart vom Schalter-Zustand abhängt; das Raster wird beim Umlegen in place neu gemalt (`paintMapGrid`), die Regelschicht spült weg und setzt den Helden ans Ufer. Kapitel-Inhalte als Daten wie in Kapitel 2.

**Tech Stack:** ES-Module ohne Build, Three.js 0.170 (`vendor/`), Tests `tests.html` (Runner `tests/runner.js`); Schnelltest per Node-Läufer, der `tests/runner.js` und `tests/index.js` lädt (Browser-Tests mit `document`/`Image` scheitern dort erwartungsgemäß).

**Spec:** `docs/superpowers/specs/2026-11-15-abenteuer-etappe3-design.md` (§4.2, §5.2, §5.4, §6 Kapitel 3, §7 Biber/Nagezahn, §8, §9, §10, §11 „Dammbruch verhindert“ und „Blubb“, §12, §13 Punkt 2, §14.1). Vorbild: `docs/superpowers/plans/2026-11-15-abenteuer-kapitel2.md`, Schnittstellen in `docs/UEBERGABE.md` Abschnitt 1 („Etappe 3, Kapitel 2“).

## Global Constraints

- Regeln aus `docs/UEBERGABE.md` Abschnitt 4: Logik ohne Three.js/`window`/`document`/`localStorage`/`Date.now()`; Zufall nur `createRng`/`world.rng`; Darstellung ändert den Weltzustand nicht; Zahlen und Texte in `src/data/`; Text nur über `textContent`; relative Pfade.
- **Wellen-Modus und Taverne unverändert:** Test „Wellen-Modus unverändert – fester Durchlauf über 60 s“ (`tests/world.test.js`, vergleicht exakt) und alle bisherigen Tests bleiben grün. Neue Felder sind optional; ohne `flowAt` wirkt nichts, keine zusätzlichen Zufallszahlen, keine andere Reihenfolge von Rechnungen in der Heldenbewegung.
- Alle neuen Gegner `adventureOnly: true`.
- **Spielstand Version 6** (Spec §9): je Held `adventure.switches: { [schleusenId]: 'open'|'closed' }` (fehlt = Ausgangszustand). Umwandlung 5 → 6 mit Sicherungskopie `animalwarrior.save.v5` wie bisher. Spielversion **0.8.0**.
- Startwerte aus der Spec: Strömung **2,5 m/s** in Flussrichtung (Boden, nicht fliegend); Held kommt gegen die Strömung immer mit **≥ 1 m/s** voran (Schub für den Helden höchstens eigenes wirksames Tempo − 1, nie negativ); Gelände-Faktoren multiplikativ mit allen Tempo-Wirkungen, Strömung als eigener Schub dazu; Geschosse und Flieger spüren keine Strömung; Gebietsstufen etwa **16 bis 22**; etwa **drei** Schleusen mit Hebel plus die Biberschleuse; Schleusen behalten ihren Zustand bei Tod, Reisen, Laden und Bosskampf von vorn; Held auf gesperrter Fläche → nächstes begehbares Ufer (Suche über das Raster), notfalls letztes Lagerfeuer, ohne Schaden.
- Handy allein, Tastatur allein, Maus allein; Knöpfe ≥ 44 px; 390 × 844 ohne seitliches Scrollen.
- Commits als `Spandro <Spandro@users.noreply.github.com>` direkt auf `main`, Zeile `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; Push an Pausenpunkten; Limit-Regel (Übergabe §5).

## Review Focus

1. **Langsamer Held gegen die Strömung:** Held mit Egel-Bremse (−40 %) und kleinem Grundtempo läuft gegen die Strömung → kommt mit mindestens 1 m/s voran; steht er still, treibt er höchstens mit „Tempo − 1“ ab, nie in Wasser oder durch ein Tor. → Test in Task 1.
2. **Hebel umlegen, während jemand in der Fläche steht:** Held wird ohne Schaden ans nächste Ufer gesetzt (nie ins Wasser, nie in eine andere Schleusenfläche, notfalls ans letzte Lagerfeuer); Gegner nehmen Schaden und landen auf begehbarer Fläche. → Test in Task 3.
3. **Kaputte oder alte Schalter im Spielstand:** Version 5 → 6 ergibt `switches: {}`; unbekannte Schleuse fällt weg, `'halb'`/Zahl/Objekt fällt weg (= Ausgangszustand); der Rest des Abenteuers bleibt unverändert. → Test in Task 2.
4. **Erreichbarkeit in jedem Schleusenzustand:** für alle 2ⁿ Kombinationen der Hebel-Schleusen (Biberschleuse und Sperren nach ihrer Bedingung offen) sind von jedem Lagerfeuer aus alle Hebel, Ausgänge, Auftragsziele (Bewohner, Fundorte, Gebiete, Gruppen der Kill-/Sammelschritte), Kisten außerhalb von Schleusenflächen und Bossarenen erreichbar; Lagerfeuer, Hebel, Bewohner, Fundorte, Ausgänge, Arenen und Gruppenmitten liegen in keiner Schleusenfläche. → Test in Task 5.
5. **Gedrehte Strömung bleibt nicht hängen:** Flossenbarts Drehung endet mit seinem Sieg, mit Tod und Rasten (neue Welt bzw. `resetPacks`), wirkt nur im Arenakreis, und auch gedreht gilt die 1-m/s-Regel. → Test in Task 4.

---

### Task 1: Strömung im Kartenraster und in der Welt

**Files:** Modify `src/core/mapGrid.js`, `src/core/world.js`, `src/data/maps/index.js` (Typ `MapDef`), `src/data/adventure.js`, `src/data/enemies.js` (Typ); Test `tests/mapGrid.test.js`, neue `tests/dam.test.js` (in `tests/index.js` eintragen)

**Interfaces – Produces:**
- `CELL.current = 5`; `MapDef.currents?: Strip[]` (gemalt nach Schlamm, vor Brücken/Stegen). `grid.flow: Float32Array | null` (2 Werte je Zelle: Einheitsrichtung des nächsten Abschnitts a → b des Linienzugs; nur angelegt, wenn die Karte Strömung oder Schleusen hat).
- `buildMapGrid(map, switches = {})` ruft neu `paintMapGrid(grid, map, switches)` (exportiert; setzt alle Zellen zurück und malt neu; Schleusen kommen in Task 3 dazu).
- `mapTerrain(...).flowAt(x, z): { x: number, z: number } | null` = Richtung × `TERRAIN.currentSpeed` auf `CELL.current`, sonst `null`. `walkable` behandelt `current` wie `walk`; `speedFactor` bleibt 1 auf Strömung.
- `TERRAIN = { mudSpeed: 0.65, currentSpeed: 2.5, heroHeadway: 1 }`.
- `ENEMIES[type].swimmer?: { speedMul: number }` – auf Strömung `speedMul`-fach schneller und nicht geschoben.
- In `src/core/world.js`: `flowAt(world, x, z): { x, z } | null` (null ohne `world.terrain.flowAt`; im Kreis `world.flowTurned = { x, z, r }` umgedreht). Nach der Heldenbewegung (nicht bei `inert`): Schub mit Betrag `min(|flow|, max(0, moveSpeed × Faktoren − TERRAIN.heroHeadway))`; Faktoren = Egel-Bremse × `terrainFactor`. Nach den Gegner-Bewegungen: nicht fliegende, nicht `swimmer` Gegner um `flow × dt` verschieben. Beides vor `keepWalkable`, sodass niemand in Gesperrtes geschoben wird. `enemySpeed` × `swimmer.speedMul` auf Strömung.

- [ ] Tests (`tests/mapGrid.test.js`, `tests/dam.test.js`): Raster malt `current` mit Richtung des Abschnitts (Linienzug mit Knick: zwei Richtungen); Steg über Strömung = `CELL.bridge` ohne Schub; `flowAt` null auf Weg, Länge 2,5 auf Strömung; Held steht still auf Strömung → nach 1 s um `min(2,5, Tempo − 1)` versetzt; Held läuft gegen die Strömung mit Egel-Bremse → Fortschritt ≥ 1 m/s (Review Focus 1); Strömung schiebt Held und Gegner nicht ins Wasser und nicht durch ein geschlossenes Tor; Flieger und `swimmer` ungeschoben, `swimmer` auf Strömung schneller; Geschoss fliegt gerade über Strömung; `world.flowTurned` dreht nur im Kreis; Geländequelle ohne `flowAt` → Wellen-Durchlauf exakt gleich.
- [ ] FAIL sehen, implementieren, alle Tests grün (inkl. Wellen-Durchlauf).
- [ ] Commit `feat: river current pushes walkers in the adventure`

### Task 2: Spielstand 6, Zähler für „Blubb“

**Files:** Modify `src/save/schema.js`, `src/save/adventure.js`, `src/core/world.js` (Kill-Ereignis), `src/modes/adventure.js` (Ledger), `src/data/achievements.js`; Test `tests/save.test.js`, `tests/adventureSave.test.js`, `tests/achievements.test.js`

**Interfaces – Produces:**
- `SAVE_VERSION = 6`; Umwandlung `5: (data) => ({ ...data, version: 6, heroes: … adventure → { ...adventure, switches: {} }, stats: { ...data.stats, bubbleKills: 0 } })`.
- `AdventureRecord.switches: Record<string, 'open'|'closed'>`; `newAdventure` mit `switches: {}`; `repairAdventure` behält nur Kennungen aus `KNOWN.sluices` (alle `map.sluices[].id` mit Hebel) mit Wert `'open'` oder `'closed'`.
- `repairSave`: `stats.bubbleKills` fehlt/ungültig → 0. `Ledger.bubbleKills?: number`; `commitAdventure` zählt ihn auf `stats.bubbleKills` auf.
- `damageEnemy(…, { environment: true })` gibt dem `kill`-Ereignis zusätzlich `source: abilityId` (nur bei Gelände-Schaden; Wellen-Modus unberührt). Regelschicht `onKill`: `source === 'moorblase'` → `run.ledger.bubbleKills++`.
- Erfolg `blubb` („Blubb“, „Besiege 25 Gegner mit Moorblasen“, 50 Gold, `stats.bubbleKills >= 25`).

- [ ] Tests: Stand Version 5 mit Abenteuer → Version 6, `switches: {}`, `stats.bubbleKills: 0`, alles andere gleich; Sicherungskopie `animalwarrior.save.v5` (wie vorhandener Test für v4); Ausbessern: `{ unbekannt: 'open', schleuse_x: 'halb', schleuse_y: 3 }` → nur gültige Einträge bleiben (Review Focus 3, mit den echten Kennungen aus Task 5 nachgezogen, bis dahin über eine Testkarte); Blasen-Tötung erhöht `ledger.bubbleKills`, Fähigkeits-Tötung nicht; `commitAdventure` addiert; „Blubb“ bei 24 nein, 25 ja.
- [ ] FAIL, implementieren, grün.
- [ ] Commit `feat: save version 6 with sluice states; bubble kill counter`

### Task 3: Schleusen, Hebel, Wegspülen, ans Ufer setzen

**Files:** Modify `src/core/mapGrid.js`, `src/modes/adventure.js`, `src/core/quests.js`, `src/data/maps/index.js` (Typ), `src/data/adventure.js`; Test `tests/dam.test.js`, `tests/quests.test.js`

**Interfaces – Produces:**
- `MapDef.sluices?: { id: string, name: string, lever?: { x: number, z: number }, start: 'open'|'closed', strips: Strip[], open: CellKind, closed: CellKind, opensOn?: { boss: string } | { quest: string, step: number } }[]` mit `CellKind = 'walk'|'mud'|'water'|'current'`. Eine Schleuse ohne `lever` (Biberschleuse) ist `'open'`, sobald `opensOn` erfüllt ist, sonst `start`; sie wird nicht gespeichert.
- `paintMapGrid` malt Schleusenflächen nach Strömung, vor Brücken, mit der Zellart ihres Zustands (Strömungsrichtung aus ihren Linienzügen).
- `sluiceState(run, id): 'open'|'closed'` (exportiert) = gespeicherter Wert, sonst Bedingung/`start`. Gemeinsame Hilfsfunktion `conditionMet(run, on)` für Tore und Schleusen.
- `findInteractable` kennt `{ kind: 'lever', id }` (Hebel in `INTERACT_RANGE`). `interact` → `toggleSluice(run, id)`: Zustand umdrehen, in `run.record.switches` schreiben, Raster neu malen, `run.gridVersion++` (Minikarte, Darstellung), wegspülen, Ereignis `sluiceSwitched { id, state, x, z }`, Auftragsereignis `{ type: 'lever', sluice: id, state }`, `run.dirty = true`.
- Wegspülen (`WASH = { enemyPct: 0.35, bossMaxPct: 0.05, push: 6 }`): jeder nicht fliegende Gegner, dessen Zelle neu `water` oder `current` ist, nimmt `enemyPct × maxHp` über `damageEnemy(…, 'flut', { environment: true })` und wird auf `current` um `push` m in Flussrichtung geschoben (in Schritten ≤ 0,5 m, nur über begehbare Zellen), auf `water` zum nächsten begehbaren Punkt gesetzt. Held auf neu `water`/`current` → `rescueHero(run)`, ohne Schaden, Ereignis `heroWashed`.
- `nearestShore(run, x, z, maxR = 40): { x, z } | null` – Breitensuche über das Raster ab der Zelle des Punkts; Ziel ist eine Zelle, die `walkable` ist und weder `current` noch Schleusenfläche; `rescueHero(run)` nutzt sie, sonst das Lagerfeuer `run.record.campfireId` dieser Karte (sonst erstes Feuer). `enterMap` ruft `rescueHero`, wenn der Held nach dem Platzieren nicht auf begehbarer Fläche steht.
- Neuer Auftragsschritt `{ type: 'lever', target: sluiceId, state: 'open'|'closed', map, text }`: erfüllt durch ein passendes `lever`-Ereignis; steht die Schleuse schon im Zielzustand, wenn der Schritt dran ist (Annahme oder Weiterkommen), gilt er sofort (wie `skipBeatenBosses`). `questTarget` zeigt auf den Hebel.

- [ ] Tests (Testkarte mit einer Schleuse, nicht in `MAPS`): Hebel schaltet die Zellen um, zweites Umlegen zurück; Zustand im `record.switches`, nach Tod (`stepDying`), `travel` und neuem Lauf aus dem Stand gleich; Biberschleuse ohne Hebel öffnet mit ihrer Bedingung; Gegner in überfluteter Fläche verliert 35 % und steht danach begehbar; Held in der Fläche → am Ufer, gleiches Leben, nicht in `current`/`water` (Review Focus 2); kein Ufer in 40 m → Lagerfeuer; Auftragsschritt `lever` mit Zielzustand, auch sofort erfüllt, wenn er schon stimmt; Hebel nur `interactable` in Reichweite.
- [ ] FAIL, implementieren, grün.
- [ ] Commit `feat: sluices and levers switch the river`

### Task 4: Gegner und Bosse des Damms

**Files:** Modify `src/data/enemies.js`, `src/core/world.js`, `src/modes/adventure.js` (Seitenwechsel, Drehung beenden), `src/data/sprites.js` (`ADVENTURE_ENEMY_SPRITES` Stellvertreter); Test `tests/dam.test.js`

**Interfaces – Produces** (Werte in der Größenordnung von Kapitel 2, Stufe kommt aus der Karte):
- `aal`: `behavior: 'slither'`, `swimmer: { speedMul: 1.6 }`, `shock: { range: 3.5, warn: 1.0, radius: 2.6, damageMul: 1.4, cooldown: 4 }`: in `range` bleibt er stehen, Ankündigung `bossTelegraph { kind: 'ring', look: 'shock', x, z, radius, delay }` an seiner Stelle, nach `warn` Schaden, wenn der Held im Kreis steht. Betäubung bricht ab.
- `bisam`: `behavior: 'burrow'` mit `BURROW = { range: 8, time: 1.4, radius: 1.4, offset: 1.5, cooldown: 4, damageMul: 1.2 }`: gräbt sich ein (`untargetable = true`, `hidden = true`), Ankündigung `bossTelegraph { kind: 'leap', look: 'burrow', … delay: time }` an einem Punkt `offset` neben dem Helden (begehbar, sonst bleibt er, wo er ist), taucht dort auf und trifft im Kreis; dazwischen keine Berührung, keine Treffer, kein Auto-Ziel.
- `helmhecht`: `behavior: 'charge'`, `armor: 2`, etwa 2 × Helmfisch-Leben.
- `bauleiter_nagezahn` (Boss): `BOSS_MOVES` near `swipe` (Schwanzschlag), far neue Form `{ kind: 'logs', count: 3, lane: 3, length: 18, radius: 1.1, speed: 9, windup: 1.1, damageMul: 1.2 }`: Ankündigung `bossTelegraph { kind: 'logs', lanes: [{ x, z }], dirX, dirZ, length, width: 2 × radius, delay }` (Streifen nebeneinander Richtung Held), danach `count` gegnerische Geschosse `{ kind: 'log', radius, speed, timeLeft: length / speed }` – jeder trifft höchstens einmal.
- `admiral_flossenbart` (Boss): `swimmer`, near `ring` (Druckwelle mit Stoß), far `dash`; neues Feld `turnFlow: { every: 12, warn: 2, radius: 20 }`: `warn` s vor der Drehung `bossTelegraph { kind: 'flow', x, z, radius, delay }`, dann `world.flowTurned` an/aus (Mitte = `enemy.home`).
- Regelschicht: Sieg über einen Boss setzt `world.flowTurned = null`; `resetPacks` ebenso. Karten-Bewohner bekommen optional `requires: { boss: string }` (Nagezahn erscheint erst nach seinem Sieg als Bewohner `nagezahn`); `npcVisible(run, npc)` (exportiert) gilt für `findInteractable`, Darstellung und Minikarte.

- [ ] Tests: Aal kündigt Stromschlag an und trifft nur im Kreis, ist auf Strömung schneller; Bisam ist eingegraben nicht treffbar (Fähigkeit und `damageEnemy` ohne Wirkung), taucht angekündigt neben dem Helden auf; Helmhecht stürmt an; Nagezahn: Ankündigung mit 3 Streifen, Stamm trifft einmal, nicht durch Wasser; Flossenbart dreht nach Ankündigung, Drehung endet mit Sieg und `rest` (Review Focus 5); Nagezahn als Bewohner erst nach dem Sieg; alle neuen `adventureOnly`.
- [ ] Wellen-Durchlauf grün.
- [ ] Commit `feat: dam enemies and bosses`

### Task 5: Karte „Der Biberdamm“, Dorf-Ausgang, Biber

**Files:** Create `src/data/maps/kapitel3.js`; Modify `src/data/maps/index.js`, `src/data/maps/dorf.js`, `src/data/adventure.js` (`CAMPFIRE_NAMES`, `MAP_LOOK.npcs`), `src/data/dialogues.js` (`NPCS.rinde`, `NPCS.nagezahn`); Test `tests/maps.test.js`

**Interfaces – Produces:**
- `KAPITEL3: MapDef` mit `id: 'kapitel3'`, `name: 'Der Biberdamm'`, `chapter: 3`: Fluss mit Strömung entlang des Hauptwegs (Furten gegen die Strömung), etwas Schlamm, Stege; 4 Lagerfeuer (`k3_…`); Gebiete mit Namen (u. a. `dammufer`, `baustelle`, `stausee`); Gruppen der Stufen 16–22 (aal, bisam, helmhecht, helmfisch, krebs, ochsenfrosch), Kennungen `p3_…`; Kisten (mindestens eine nur bei trockener Schleuse erreichbar); Fundorte `treibholz`; Bewohner `rinde` (Biberin, von Anfang an) und `nagezahn` (`requires: { boss: 'nagezahn' }`); Bosse `nagezahn` (Typ `bauleiter_nagezahn`, Stufe ~19, Arena ohne Strömung) und `flossenbart` (Typ `admiral_flossenbart`, Stufe ~22, Arena mit Strömungsband und trockenen Ufern auf beiden Seiten); Sperre hinter Nagezahn; Schleusen `schleuse_nord` (offen: Strömung, zu: Schlamm), `schleuse_sued` (offen: Wasser, zu: Weg), `schleuse_altarm` (offen: Wasser, zu: Schlamm, Kiste im Altarm) mit Hebeln, `biberschleuse` ohne Hebel (zu: Wasser quer über den Weg zum Stausee, offen: Weg; `opensOn: { quest: 'dammwache', step: 3 }`); Ausgang zurück ins Dorf.
- Dorf: Ausgang `nach_kapitel3` im Norden mit `requires: { chapterDone: 2 }`, Weg und Wegweiser (`requires` wie beim Sumpf), Ziel `{ map: 'kapitel3', campfire: 'k3_ufer' }`.

- [ ] Tests: Karte gültig wie Kapitel 1 und 2 (vorhandene Kartentests laufen über alle Karten); jede Arena mit geschlossenem Tor dicht; Erreichbarkeit in allen Hebel-Kombinationen (Review Focus 4, Flutfüllung mit `paintMapGrid` je Kombination); jeder Hebel ist in beiden Zuständen seiner und aller anderen Schleusen erreichbar; Strömung auf dem Hauptweg (mindestens eine Furt); Ausgang ohne `chapterDone: [2]` zu, mit offen; `repairSave` behält Lagerfeuer, Bosse, Kisten, Fundorte und `switches` von Kapitel 3 (Review Focus 3 mit echten Kennungen).
- [ ] FAIL, implementieren, grün.
- [ ] Commit `feat: beaver dam map and village exit`

### Task 6: Aufträge, Gespräche, Geschichte, Gegenstände, Erfolg

**Files:** Modify `src/data/quests.js`, `src/data/dialogues.js`, `src/data/story.js`, `src/data/items.js`, `src/data/adventure.js` (`SHOP.stockByChapter[3]`, `LOOT.bossPearls`), `src/data/achievements.js`; Tests `tests/quests.test.js`, `tests/adventureHero.test.js`, `tests/achievements.test.js`, `tests/items.test.js`

**Interfaces – Produces:**
- 5 Hauptaufträge mit `chapter: 3`: `ruf_vom_damm` (von `panzerla`, `requires: ['hecht_haudrauf']`, Gebiet `dammufer`, Gespräch `rinde`), `flossians_geschenk` (Aale besiegen, `bauplan` von Helmhecht/Bisam sammeln), `bauleiter` (Boss `nagezahn`, danach Gespräch mit `nagezahn`), `dammwache` (von `nagezahn`: Hebel `schleuse_nord` → `'closed'`, Hebel `schleuse_sued` → `'closed'`, Gespräch `nagezahn` – damit öffnen die Biber die Biberschleuse), `admiral` (Gebiet `stausee`, Boss `flossenbart`, Gespräch `panzerla`, `endsChapter: 3`); 2–3 Nebenaufträge (`bisamplage` von `rinde`, `treibholz` von `rinde` mit Fundorten, `altarm` von `nagezahn` mit Hebel `schleuse_altarm` → `'closed'`). `CHAPTER_START_QUEST[3] = 'ruf_vom_damm'`; Namen der Auftragsstücke in `QUEST_THING_NAMES`.
- `DIALOGUES.rinde`, `DIALOGUES.nagezahn` (Angebote, Erinnerungen mit Hinweis auf die Hebel, Fortschritt, Leerlauf), neue Sätze für `panzerla`; Ton des Spiels.
- `STORY.chapterStart[3]` (2–3 Tafeln); `STORY.chapterEnd[2]` sagt jetzt, wo der Weg zum Damm beginnt; `STORY.chapterEnd[3]` mit „Fortsetzung folgt“.
- 8 Gegenstände `source: 'kapitel3'`, stärker als Kapitel 2; ohne Bildbogen (Ersatzsymbol). `SHOP.stockByChapter[3]` (sichtbar nach Kapitel 2). Flussperlen Nagezahn 4, Flossenbart 5.
- Erfolg `dammbruch-verhindert` („Dammbruch verhindert“, Kapitel 3 abgeschlossen, 100 Gold); mit „Blubb“ jetzt 46 Erfolge.

- [ ] Tests: Aufträge gültig (Ziele existieren auf `kapitel3`, Hebel-Schritte nennen eine Schleuse mit Hebel und gültigen Zustand, Ketten lösbar, genau ein `endsChapter: 3`); „Kapitel 3 bringt ohne Wiederholen von Level 16 etwa auf Level 21 bis 23“; Gegenstände gültig; Erfolg mit Grenzfall; Händlerauswahl nach Kapitel 2.
- [ ] FAIL, implementieren, grün.
- [ ] Commit `feat: dam quests, story, items and achievements`

### Task 7: Darstellung des Damms

**Files:** Modify `src/render/mapView.js` (Strömung blau mit wandernden Streifen in Flussrichtung, im gedrehten Kreis gegenläufig; Schleusenflächen je Zustand; Hebel als 3D-Form mit Griff nach Zustand; Bewohner mit `requires`), `src/ui/minimap.js` (Grundbild neu bei `run.gridVersion`, Farbe `current`, Hebel), `src/ui/adventureHud.js` (`INTERACT_LABEL.lever = 'Umlegen'`, Meldungen „Schleuse offen/zu“, „Weggespült!“), `src/render/effects.js` (Stromschlag-Ring, Grab-Kreis, Stamm-Streifen, Strömungs-Ankündigung, Spritzer beim Umlegen), `src/render/enemies.js` (eingegrabene Gegner unsichtbar, Stämme als Rollen), `src/data/adventure.js` (`MAP_LOOK.current`, `MAP_LOOK.lever`, `MINIMAP.colors.current`), Stellvertreter für Aal (Kreuzotter), Bisam (Ratte), Helmhecht (Helmfisch), Nagezahn (Dachs), Flossenbart (Gräte), Biberin und Nagezahn als 3D-Figuren/Porträt-Buchstabe
- [ ] Reine Hilfen DOM-frei testen, falls neue entstehen (z. B. Streifen-Verschiebung je Zeit).
- [ ] Im Browser (390 × 844 und Desktop, `?debug=1&mode=adventure`, Held per Konsole auf Kapitel 2 abgeschlossen und Level 16): Dorf-Ausgang im Norden, Damm betreten, Strömung sichtbar und spürbar, Hebel per Taste E, per Knopf und per Maus, Fläche schaltet sichtbar und auf der Minikarte, Wegspülen, Gegner und beide Bosse, Seitenwechsel Nagezahn, Biberschleuse; nur Tastatur, nur Maus/Touch; Konsole ohne Fehler; Wellen-Modus startet.
- [ ] Commit `feat: dam look`

### Task 8: Bilder-Beschreibungen, Version, Doku, Gesamtprüfung

**Files:** Create `docs/abenteuer-bilder-kapitel3.md`; Modify `src/data/version.js` (`0.8.0`), `README.md`, `docs/UEBERGABE.md`
- [ ] Bildbeschreibungen (Stilblock aus Spec §10): Bogen Gegner und Bosse (Aal, Bisam, Helmhecht, Bauleiter Nagezahn, Admiral Flossenbart), Porträts Biberin Rinde und Nagezahn als Bewohner, Kacheln Strömung und nasses Flussbett, Kulissen (Damm, Schleusentor, Hebel, Holzstämme), 8 Gegenstände.
- [ ] Version 0.8.0; README (Kapitel 3, Strömung, Schleusen, Spielstand 6, Schalter) und Übergabe (Stand, Entscheidungen, Prüfung, Konsole für Handproben).
- [ ] Alle Tests grün im Browser; frischer Prüfer über alle Commits des Kapitels; Critical/Important mit Test beheben; Push.
- [ ] Commit `docs: chapter 3 – images, readme and handover`
