# Abenteuer Etappe 3, Kapitel 2 „Der Sumpf“ – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kapitel 2 spielbar machen: Karte „Der Sumpf“ mit Schlamm, Stegen und Moorblasen, drei neuen Gegnern, Kaulquappen, zwei Bossen, Bewohnerin Frau Quappe, Aufträgen, Bildergeschichten, Gegenständen und Erfolg; Ausgang vom Dorf nach Kapitel 1; Spielversion 0.7.0.

**Architecture:** Gelände als neue Zellart `mud` im Kartenraster (`src/core/mapGrid.js`); die Geländequelle meldet über die neue freiwillige Abfrage `speedFactor(x, z, mode)` das Tempo, `stepWorld` und `enemySpeed` nutzen sie nur, wenn es sie gibt (Wellen-Modus unberührt). Moorblasen als eigene reine Logik in `src/core/hazards.js`, aufgerufen von der Regelschicht. Kapitel-Inhalte als Daten (`src/data/maps/kapitel2.js`, Aufträge, Gespräche, Geschichte, Gegenstände).

**Tech Stack:** ES-Module ohne Build, Three.js 0.170 (`vendor/`), Tests `tests.html` (Runner `tests/runner.js`); Schnelltest per Node-Läufer, der `tests/runner.js` und `tests/index.js` lädt (Browser-Tests mit `document`/`Image` scheitern dort erwartungsgemäß).

**Spec:** `docs/superpowers/specs/2026-11-15-abenteuer-etappe3-design.md` (§1–§5.1, §5.4, §6 Kapitel 2, §7, §8, §10–§14.1 soweit Kapitel 2).

## Global Constraints

- Regeln aus `docs/UEBERGABE.md` Abschnitt 4: Logik ohne Three.js/`window`/`document`/`localStorage`/`Date.now()`; Zufall nur `createRng`/`world.rng`; Darstellung ändert den Weltzustand nicht; Zahlen und Texte in `src/data/`; Text nur über `textContent`; relative Pfade.
- **Wellen-Modus unverändert:** Test „Wellen-Modus unverändert – fester Durchlauf über 60 s“ (`tests/world.test.js`) und alle bisherigen Tests bleiben grün. Neue Felder sind optional; ohne sie wirkt nichts und `world.rng` wird nicht zusätzlich verbraucht.
- Alle neuen Gegner `adventureOnly: true`.
- Spielstand bleibt **Version 5** (Kapitel 2 braucht keine neuen Felder; Spec §9). Spielversion **0.7.0**.
- Startwerte aus der Spec: Schlamm-Tempo × **0,65** (Boden, nicht fliegend, nicht `mudproof`); Moorblasen alle **3–5 s**, im Umkreis **14 m** des Helden, Vorwarnung **1,2 s**, Radius **1,8 m**, Held **8 %** des höchsten Lebens, Gegner **2/3 des Lebens eines Ochsenfroschs der Kartenstufe**; nie im Umkreis eines Lagerfeuers (Startwert 6 m) und nie in einer Bossarena außer der von Hecht Haudrauf; Gebietsstufen etwa **10 bis 16**.
- Handy allein, Tastatur allein, Maus allein; Knöpfe ≥ 44 px; 390 × 844 ohne seitliches Scrollen.
- Commits als `Spandro <Spandro@users.noreply.github.com>` direkt auf `main`, Zeile `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; Push an Pausenpunkten; Limit-Regel (Übergabe §5).

## Review Focus

1. **Wellen-Modus ohne Gelände:** Geländequelle ohne `speedFactor` → Tempo exakt wie vorher, keine zusätzlichen Zufallszahlen. → Test in Task 1.
2. **Moorblase unter dem Helden am Lagerfeuer oder in einer fremden Arena:** darf nie entstehen. → Test in Task 2.
3. **Moorblasen besiegen Gegner, auch Bosse?** Bosse nehmen den Gegner-Schaden, aber höchstens 5 % ihres Lebens je Blase; „Kills durch Blasen“ zählen als normale Tötungen (Beute, Aufträge). → Test in Task 2.
4. **Alter Spielstand mit Kapitel 1 abgeschlossen:** sieht den Ausgang in den Sumpf sofort; ohne Abschluss ist er weder benutzbar noch sichtbar. → Test in Task 4.
5. **Erreichbarkeit der Karte:** Von jedem Lagerfeuer aus sind alle Ausgänge, Bossarenen, Fundorte, Bewohner und Kisten über begehbare Fläche erreichbar (Flutfüllung; Arena-Tore offen, Sperren nach ihrer Bedingung offen). → Test in Task 4.

---

### Task 1: Schlamm und Stege im Kartenraster, Tempo in der Welt

**Files:** Modify `src/core/mapGrid.js`, `src/core/world.js`, `src/data/maps/index.js` (Typ `MapDef`), `src/data/adventure.js`; Test `tests/mapGrid.test.js`, `tests/world.test.js`

**Interfaces – Produces:**
- `CELL.mud = 4` in `src/core/mapGrid.js`; `MapDef` bekommt optional `mud: Strip[]` (gemalt nach Wasser, vor Brücken) und `boardwalks: Strip[]` (Stege, gemalt zuletzt als `CELL.bridge`).
- `mapTerrain(...)` liefert zusätzlich `speedFactor(x, z, mode = 'walk'): number` = `TERRAIN.mudSpeed` auf `CELL.mud` bei `mode === 'walk'`, sonst 1. `walkable` behandelt `mud` wie `walk`.
- `TERRAIN = { mudSpeed: 0.65 }` in `src/data/adventure.js`.
- `ENEMIES[type].mudproof?: boolean` – Schlamm bremst diesen Gegner nicht.
- In `src/core/world.js`: Hilfsfunktion `terrainFactor(world, x, z, mode): number` (1, wenn `world.terrain.speedFactor` fehlt); Held: Schrittweite × `terrainFactor(world, hero.x, hero.z, 'walk')`; `enemySpeed` × Faktor nur für `!enemy.flying && !ENEMIES[enemy.type]?.mudproof`.

- [ ] Tests: Raster malt `mud` und Stege (Steg über Schlamm = `CELL.bridge`); `walkable` auf Schlamm true, `speedFactor` 0,65 auf Schlamm, 1 auf Weg, Steg und bei `mode 'fly'`; Held läuft auf Schlamm 0,65 × so weit; fliegender und `mudproof`-Gegner unverändert; Geländequelle ohne `speedFactor` → gleiche Strecke wie vorher (Review Focus 1).
- [ ] FAIL sehen, implementieren, alle Tests grün (inkl. Wellen-Durchlauf).
- [ ] Commit `feat: mud and boardwalks slow walkers in the adventure`

### Task 2: Moorblasen

**Files:** Create `src/core/hazards.js`; Modify `src/modes/adventure.js`, `src/data/adventure.js`, `src/data/maps/index.js` (Typ); Test `tests/hazards.test.js` (in `tests/index.js` eintragen)

**Interfaces – Produces:**
- `BUBBLES = { minInterval: 3, maxInterval: 5, range: 14, warn: 1.2, radius: 1.8, heroPct: 0.08, enemyShare: 2 / 3, bossMaxPct: 0.05, campfireClear: 6, tries: 12 }` in `src/data/adventure.js`.
- `MapDef.hazards?: { bubbles?: { level: number } }` (Stufe für den Gegner-Schaden).
- `createBubbles(): BubbleState` = `{ nextAt: number, pending: { x, z, popAt }[] }`.
- `stepBubbles(world, state, { isMud(x, z): boolean, forbidden(x, z): boolean, enemyDamage: number }, dt): void` – plant mit `world.rng` die nächste Blase (Zeitpunkt in `[minInterval, maxInterval]`), sucht bis `tries` Mal einen Punkt im Umkreis `range` um den Helden, der `isMud` und nicht `forbidden` ist (sonst diese Runde keine); Ereignis `bubbleWarn { x, z, radius, delay }`; nach `warn` s Ereignis `bubblePop { x, z, radius }`, Schaden: Held `heroPct × maxHp` über `damageHero`, jeder erfassbare Gegner im Kreis `enemyDamage` (Bosse höchstens `bossMaxPct × maxHp`) über `damageEnemy(world, e, { amount, crit: false }, 'moorblase')`.
- Regelschicht: `run.bubbles` nur, wenn `map.hazards?.bubbles`; `forbidden` = näher als `campfireClear` an einem Lagerfeuer oder in einer Bossarena, deren Boss nicht `bubbleArena: true` hat; `enemyDamage = enemyShare × ENEMIES.ochsenfrosch.hp × enemyMultipliers(level).hpMul`. Beim Kartenwechsel, Tod und Rasten wird `pending` geleert.

- [ ] Tests: Blase erst nach Vorwarnung; trifft Held und Gegner im Kreis, niemanden außerhalb; nur auf Schlamm; nie am Lagerfeuer und nie in fremder Arena (Review Focus 2); Boss nimmt höchstens 5 % (Review Focus 3); gleicher Seed → gleiche Blasen; Tötung durch Blase gibt `kill`-Ereignis und zählt für Aufträge; ohne `hazards` in der Karte keine Blasen.
- [ ] FAIL, implementieren, grün.
- [ ] Commit `feat: bog bubbles`

### Task 3: Gegner und Bosse des Sumpfs

**Files:** Modify `src/data/enemies.js`, `src/core/world.js`, `src/data/sprites.js` (`ADVENTURE_SPRITE_STANDIN`), `src/render/effects.js` (Ankündigung `bubbles`); Test `tests/survivor.test.js` bzw. neue `tests/swamp.test.js`

**Interfaces – Produces** (Werte in der Größenordnung vorhandener Gegner, Stufe kommt aus der Karte):
- `ochsenfrosch`: `behavior: 'pounce'`, neues optionales Feld `pounceRange` (statt `POUNCE.engageRange`), zäh (Leben etwa 2 × Frosch).
- `libelle`: `behavior: 'circle'`, `flying: true`.
- `blutegel`: `behavior: 'chase'`, langsam; neues Feld `leech: { slow: 0.4, seconds: 1.5, healPct: 0.1 }`: ein durchgekommener Berührungstreffer setzt `hero.slowUntil`/`hero.slowFactor` (neue, optionale Heldenfelder; Heldentempo × `1 − slowFactor` solange aktiv) und heilt den Egel um `healPct × maxHp` (höchstens bis `maxHp`).
- `kaulquappe`: schwach, `behavior: 'chase'`, für die Verstärkung.
- `hofmarschall_quak` (Boss): `BOSS_MOVES` mit `leap` und `summon: { every: 20, type: 'kaulquappe', count: 4, radius: 3 }`.
- `hecht_haudrauf` (Boss): `mudproof: true`; `BOSS_MOVES` near `dash`, far neue Form `kind: 'bubbles'` mit `{ count: 4, spread: 5, radius: 1.8, windup: 1.2, damageMul }`: Ankündigung `bossTelegraph { kind: 'bubbles', points: [{x,z}], radius, delay }` (Punkte per `world.rng` um den Helden), danach Schaden, wenn der Held in einem der Kreise steht.
- Kartenfeld `bosses[].bubbleArena?: true` (für Task 2).

- [ ] Tests: Ochsenfrosch duckt sich ab `pounceRange`; Libelle fliegt (Schlamm bremst sie nicht); Egel-Treffer bremst den Helden für 1,5 s und heilt ihn; Quak ruft Kaulquappen; Haudrauf: Ankündigung mit 4 Kreisen, Treffer nur im Kreis; Haudrauf im Schlamm ungebremst; alle neuen `adventureOnly`.
- [ ] Wellen-Durchlauf grün.
- [ ] Commit `feat: swamp enemies and bosses`

### Task 4: Karte „Der Sumpf“, Dorf-Ausgang, Frau Quappe

**Files:** Create `src/data/maps/kapitel2.js`; Modify `src/data/maps/index.js`, `src/data/maps/dorf.js`, `src/modes/adventure.js` (Ausgänge mit Bedingung), `src/data/adventure.js` (`CAMPFIRE_NAMES`, `MAP_LOOK.npcs.quappe`), `src/data/dialogues.js` (`NPCS.quappe`); Test `tests/maps.test.js`

**Interfaces – Produces:**
- `KAPITEL2: MapDef` mit `id: 'kapitel2'`, `name: 'Der Sumpf'`, `chapter: 2`, Hauptweg mit Seitenwegen, Schlammflächen und Stegen, 4 Lagerfeuer (`k2_…`), Gebiete mit Namen, Gruppen der Stufen 10–16 (Gegner: ochsenfrosch, libelle, blutegel, frosch, helmfisch, kreuzotter), Kisten, Fundorte für Aufträge, Bewohnerin `quappe`, Bosse `quak` (Typ `hofmarschall_quak`, Stufe ~12, mit Arena-Tor) und `haudrauf` (Typ `hecht_haudrauf`, Stufe ~16, `bubbleArena: true`), Sperre hinter Quak (`opensOn: { boss: 'quak' }`), Ausgang zurück ins Dorf, `hazards: { bubbles: { level: 13 } }`.
- Ausgänge bekommen optional `requires: { chapterDone: number }`; die Regelschicht nimmt einen Ausgang nur, wenn `record.chapterDone` die Zahl enthält; neue Funktion `exitOpen(run, exit): boolean` (exportiert, die Darstellung zeigt nur offene Ausgänge).
- Dorf: Ausgang `nach_kapitel2` mit `requires: { chapterDone: 1 }`, Ziel `{ map: 'kapitel2', campfire: 'k2_rand' }`.

- [ ] Tests: Karte gültig wie Kapitel 1 (vorhandene Kartentests auf alle Karten ausweiten: Lagerfeuer, Gruppen, Bewohner, Kisten auf begehbarer Fläche, Kennungen eindeutig); Erreichbarkeit per Flutfüllung (Review Focus 5); Ausgang ohne `chapterDone: [1]` nicht nutzbar, mit sofort nutzbar, auch bei einem alten Stand, der nur `chapterDone: [1]` hat (Review Focus 4); `repairSave` behält Lagerfeuer, Bosse und Kisten von Kapitel 2.
- [ ] FAIL, implementieren, grün.
- [ ] Commit `feat: swamp map and village exit`

### Task 5: Aufträge, Gespräche, Geschichte, Gegenstände, Erfolg

**Files:** Modify `src/data/quests.js`, `src/data/dialogues.js`, `src/data/story.js`, `src/data/items.js`, `src/data/adventure.js` (`SHOP`), `src/data/achievements.js`, `src/adventureGame.js` (Einstiegsgeschichte beim ersten Betreten von Kapitel 2); Tests `tests/quests.test.js`, `tests/adventureHero.test.js`, `tests/achievements.test.js`, `tests/items.test.js`

**Interfaces – Produces:**
- Etwa 5 Hauptaufträge (erster von `panzerla`, `requires` des letzten Kapitel-1-Auftrags; letzter mit `endsChapter: 2`, Boss `haudrauf`) und 2–3 Nebenaufträge von `quappe`, nur mit vorhandenen Schritt-Arten.
- `DIALOGUES.quappe` (Angebote, Erinnerungen, Fortschritt, Leerlauf) und neue Sätze für `panzerla`; Ton des Spiels.
- `STORY.chapterStart[2]` (2–3 Tafeln) und `STORY.chapterEnd[2]` mit „Fortsetzung folgt“; Einstiegsgeschichte läuft einmal beim ersten Betreten von `kapitel2` (gemerkt über den ersten Auftrag des Kapitels, kein neues Feld).
- 8 Gegenstände mit `source: 'kapitel2'`, stärker als Kapitel 1; `icon` vorerst ohne Bild (Ersatzsymbol).
- Krümels Auswahl: `SHOP.stockByChapter = { 1: [...vorhandene], 2: [...] }`, sichtbar nach abgeschlossenem Vorkapitel.
- Erfolg `sumpfdotter` („Sumpfdotter“, Kapitel 2 abgeschlossen, Gold wie „Trockene Pfoten“); Anzahl Erfolge 44. Der Erfolg „Blubb“ (Spec §11) kommt erst mit Kapitel 3: Er braucht einen Zähler im Spielstand, und die neue Version 6 kommt laut Spec §9 erst dort.

- [ ] Tests: Aufträge gültig (Ziele existieren auf `kapitel2`, Ketten lösbar, genau ein `endsChapter: 2`); Test „Kapitel 2 bringt ohne Wiederholen von Level 10 etwa auf Level 15 bis 17“ (Rechnung wie der Test für Kapitel 1); Gegenstände gültig; Erfolg mit Grenzfall; Händlerauswahl je Kapitel.
- [ ] FAIL, implementieren, grün.
- [ ] Commit `feat: swamp quests, story, items and achievement`

### Task 6: Darstellung des Sumpfs

**Files:** Modify `src/render/mapView.js` (Schlamm als braun-grüne Fläche, Stege wie Brücken, offene Ausgänge), `src/ui/minimap.js`/`src/ui/minimapMath.js` (Farbe Schlamm), `src/render/effects.js` (`bubbleWarn`: blubbernder Kreis für `delay`; `bubblePop`: Spritzer), `src/data/adventure.js` (`MAP_LOOK.mud`, Farben), Stellvertreter-Figuren für neue Gegner, Bosse und Frau Quappe; reine Hilfen DOM-frei testen, falls neue entstehen
- [ ] Im Browser (390 × 844 und Desktop, `?debug=1&mode=adventure`, Held per Konsole auf Kapitel 1 abgeschlossen und Level 10): Dorf-Ausgang sichtbar, Sumpf betreten, Schlamm bremst sichtbar, Stege schnell, Moorblasen sichtbar angekündigt, neue Gegner und beide Bosse, Frau Quappe, Minikarte; nur Tastatur, nur Maus/Touch; Konsole ohne Fehler.
- [ ] Commit `feat: swamp look`

### Task 7: Bilder-Beschreibungen, Version, Doku, Gesamtprüfung

**Files:** Create `docs/abenteuer-bilder-kapitel2.md`; Modify `src/data/version.js` (`0.7.0`), `README.md`, `docs/UEBERGABE.md`
- [ ] Bildbeschreibungen (Stilblock aus Spec §10): Bogen Gegner und Bosse (Ochsenfrosch, Libelle, Blutegel, Kaulquappe, Hofmarschall Quak, Hecht Haudrauf), Porträt Frau Quappe, Kacheln Schlamm und Steg, Kulissen (Schilf, Seerosen, Moorbaum), 8 Gegenstände.
- [ ] Version 0.7.0; README (Kapitel 2, Gelände, Schalter) und Übergabe (Stand, Entscheidungen, Prüfung).
- [ ] Alle Tests grün im Browser; frischer Prüfer über alle Commits des Kapitels; Critical/Important mit Test beheben; Push.
- [ ] Commit `docs: chapter 2 – images, readme and handover`
