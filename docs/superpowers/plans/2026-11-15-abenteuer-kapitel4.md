# Abenteuer Etappe 3, Kapitel 4 „Der Schlosssee“ – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kapitel 4 und damit die Geschichte zu Ende bringen: Karte „Der Schlosssee“ mit Gezeiten (tiefe Stellen, Anzeige, Ankündigung 5 s vorher), drei neuen Gegnern (Gardekrebs, Kugelfisch, Muschelschütze), Zwei-Boss-Kampf „Die Krebs-Sänftenträger“, Endkampf gegen Flossian (nur bei Niedrigwasser angreifbar), Bewohner Reiher Stelzfuß, Aufträge mit „bei Niedrigwasser erreichen“, Schlussgeschichte mit Abschlusstafel „Ende“, Flossian danach beleidigt im Dorfbrunnen, Gegenstände, Erfolge „Ebbe und Flut“ und „Fisch auf dem Trockenen“; Ausgang vom Dorf nach Kapitel 3; Spielversion 0.9.0.

**Architecture:** Tiefe Stelle als neue Zellart `CELL.deep` im Kartenraster; ob sie begehbar ist, entscheidet die Geländequelle über eine Abfrage „Hochwasser?“ (kein Neumalen beim Wechsel). Der Gezeiten-Takt ist reine Logik in `src/core/tides.js`, sein Zustand liegt in der Welt (`world.tide`, nur auf Karten mit `tides`), weitergeschaltet von der Regelschicht nur im Zustand `playing`; beim Steigen setzt die Regelschicht Held und Bodengegner von tiefen Stellen ans Ufer. Bosse bekommen eine Gruppe (`group`), die Regelschicht zählt den Sieg erst mit dem Letzten. Flossian ist eine eigene Bossform in der Welt, die `world.tide` liest und `untargetable` setzt. Inhalte als Daten wie Kapitel 2 und 3.

**Tech Stack:** ES-Module ohne Build, Three.js 0.170 (`vendor/`), Tests `tests.html` (Runner `tests/runner.js`); Schnelltest per Node-Läufer, der `tests/runner.js` und `tests/index.js` lädt (Browser-Tests mit `document`/`Image` scheitern dort erwartungsgemäß).

**Spec:** `docs/superpowers/specs/2026-11-15-abenteuer-etappe3-design.md` (§4.3, §4.4, §5.3, §5.4, §6 Kapitel 4 und §6.3, §7 Bewohner am Schlosssee und Flossian im Brunnen, §8, §10, §11 „Ebbe und Flut“ und „Fisch auf dem Trockenen“, §12, §13 Punkt 3, §14.1). Vorbild: `docs/superpowers/plans/2026-11-15-abenteuer-kapitel3.md`, Schnittstellen in `docs/UEBERGABE.md` Abschnitt 1 („Etappe 3, Kapitel 2“ und „Kapitel 3“).

## Global Constraints

- Regeln aus `docs/UEBERGABE.md` Abschnitt 4: Logik ohne Three.js/`window`/`document`/`localStorage`/`Date.now()`; Zufall nur `createRng`/`world.rng`; Darstellung ändert den Weltzustand nicht; Zahlen und Texte in `src/data/`; Text nur über `textContent`; relative Pfade.
- **Wellen-Modus und Taverne unverändert:** Test „Wellen-Modus unverändert – fester Durchlauf über 60 s“ (`tests/world.test.js`, vergleicht exakt) und alle bisherigen Tests bleiben grün. Ohne `world.tide`, ohne Gardekrebs und ohne neue Bossformen wirkt nichts Neues: keine zusätzlichen Zufallszahlen, keine andere Reihenfolge von Rechnungen.
- Alle neuen Gegner `adventureOnly: true`.
- **Spielstand bleibt Version 6** (Spec §9: Gezeiten werden nicht gespeichert; Flossian im Brunnen ergibt sich aus `record.bosses`). Neue Feuer, Bosse, Kisten, Fundorte kennt das Ausbessern über die Kartendaten. Spielversion **0.9.0**.
- Startwerte aus der Spec: Gezeiten **25 s Niedrigwasser / 15 s Hochwasser**, Ankündigung **5 s** vorher, im Endkampf **12 s / 10 s**; Takt beginnt bei jedem Betreten der Karte (auch nach Tod, Reisen, Laden) mit Niedrigwasser; läuft nur im Zustand `playing`. Held auf tiefer Stelle beim Steigen → ohne Schaden ans nächste Ufer (Suche über das Raster), notfalls letztes Lagerfeuer; Bodengegner ebenso, Flieger bleiben. Gardekrebs: Gegner in seiner Nähe nehmen **−25 %**, nicht stapelbar. Zwei Bosse: beide müssen fallen, der übrige wird wütend **Tempo und Schaden × 1,3**, Anzeige zeigt die Summe, Auftrag/Erfolg/Beute zählen einmal. Flossian: bei Hochwasser `untargetable`, Wasserstrahlen und Helmfische; bei Niedrigwasser fest und angreifbar; ab halbem Leben schneller und ruft Gardekrebse. Gebietsstufen etwa **22 bis 28**.
- Handy allein, Tastatur allein, Maus allein; Knöpfe ≥ 44 px; 390 × 844 ohne seitliches Scrollen.
- Commits als `Spandro <Spandro@users.noreply.github.com>` direkt auf `main`, Zeile `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; vor Commits `git pull` (andere Sitzungen bauen Bilder im selben Ordner); Push an Pausenpunkten; Limit-Regel (Übergabe §5).

## Review Focus

1. **Flut im Bosskampf:** Held steht beim Steigen auf einer tiefen Stelle in Flossians Arena (Tor zu) → landet ohne Schaden auf trockener Fläche **innerhalb** der Arena, nie hinter dem Tor, nie auf einer anderen tiefen Stelle; ohne Ufer in Reichweite am Lagerfeuer. → Test in Task 1.
2. **Gezeiten-Uhr steht, wenn nicht gespielt wird:** Pause, Gespräch, Lagerfeuer-Menü und Sterbephase schalten den Takt nicht weiter; Tod, Reisen und neuer Lauf beginnen mit Niedrigwasser und vollen 25 s; die schnellen Zeiten gelten nur, solange der Flossian-Kampf läuft, und danach wieder die der Karte. → Test in Task 1 (Takt) und Task 4 (Kampfzeiten).
3. **Beide Träger im selben Schritt besiegt oder einer außerhalb des Kampfs:** Sieg, Beute, Flussperlen, Auftragsschritt und Ereignis `bossDefeated` genau einmal; Wut nur am Überlebenden und nur einmal; Tod mitten im Kampf → beide kommen mit vollem Leben und ohne Wut wieder. → Test in Task 2.
4. **Flossian bei Hochwasser unverwundbar gegen alles:** Fähigkeit, Zone, Moorblase/Gelände, Platzen eines Kugelfischs, Rückstoß; kein Auto-Ziel. Ein einzelner Treffer über die Hälfte hinaus löst die Eile genau einmal aus; beginnt der Kampf bei Hochwasser, wird er beim nächsten Niedrigwasser angreifbar. → Test in Task 4.
5. **Kugelfisch und Gardekrebs am Rand:** Ein Kugelfisch, der während des Aufblähens besiegt oder betäubt wird, platzt nicht (kein Schaden aus dem Nichts); sein Platzen trifft andere Gegner, nicht aber unangreifbare; zwei Gardekrebse nebeneinander schützen zusammen nur −25 %; ein Gardekrebs schützt sich nicht selbst. → Test in Task 3.

---

### Task 1: Gezeiten im Raster, in der Welt und in der Regelschicht

**Files:** Create `src/core/tides.js`; Modify `src/core/mapGrid.js`, `src/modes/adventure.js`, `src/data/maps/index.js` (Typ `MapDef`), `src/data/adventure.js`; Test neue `tests/lake.test.js` (in `tests/index.js` eintragen), `tests/mapGrid.test.js`

**Interfaces – Produces:**
- `CELL.deep = 6`; `MapDef.deeps?: Strip[]` (gemalt nach Strömung und Schleusen, vor Brücken/Stegen – Stege über tiefen Stellen bleiben immer begehbar); `MapDef.tides?: { low: number, high: number, warn: number }`.
- `mapTerrain(map, grid, isGateClosed, isHighTide = () => false)`: `walkable(x, z, 'walk')` ist auf `CELL.deep` nur bei `!isHighTide()` wahr; `fly` und `shot` unverändert (Flieger und Geschosse über tiefen Stellen bei jedem Wasserstand).
- `TIDES = { low: 25, high: 15, warn: 5 }` in `src/data/adventure.js` (Karten ohne eigene Zeiten nutzen ihn).
- `src/core/tides.js`: `createTide(timings): Tide` mit `Tide = { high: boolean, left: number, warned: boolean }` (beginnt `high: false`, `left: timings.low`); `stepTide(tide, dt, timings): object[]` liefert Ereignisse `{ type: 'tideWarn', high: boolean, in: number }` (einmal, sobald `left ≤ timings.warn`) und `{ type: 'tideChange', high: boolean }` (bei `left ≤ 0`; danach `left += timings[neu]`, `warned = false`).
- Regelschicht: `enterMap` legt `world.tide = createTide(tideTimings(run))` an, wenn die Karte `tides` hat, sonst bleibt es weg; Geländequelle mit `() => !!run.world?.tide?.high`. `stepPlaying` ruft nach `stepWorld` `stepTides(run, dt)` (Ereignisse über `emit`); `tideTimings(run)` = Zeiten des laufenden Bosskampfs (`bossDef.tides`, Task 4) sonst `map.tides`. Beim Wechsel auf Hochwasser: `run.gridVersion++`; Held auf `CELL.deep` → `rescueHero(run)`; nicht fliegende Gegner auf `CELL.deep` → nächste begehbare Zelle (`nearestCell`), ohne Schaden. Beim Wechsel auf Niedrigwasser nur `gridVersion++`.
- `nearestShore` schließt `CELL.deep` aus; während eines Bosskampfs nur Zellen im Arenakreis (`dist ≤ arena.r − 1`).

- [ ] Tests (`tests/lake.test.js`, Testkarte mit Weg, tiefer Stelle, Steg über der tiefen Stelle und kleiner Arena, nicht in `MAPS`): `deep` begehbar bei Niedrig-, gesperrt bei Hochwasser, `fly`/`shot` immer; Steg über `deep` bleibt begehbar; `stepTide`: Ankündigung genau einmal bei 5 s Rest, Wechsel nach 25 s auf hoch, nach weiteren 15 s auf niedrig; Lauf mit Gezeitenkarte: Held auf tiefer Stelle beim Wechsel → am Ufer, gleiches Leben, Ereignis `heroWashed`; Bodengegner versetzt, Flieger bleibt; Arena-Fall aus Review Focus 1; `state = 'paused'`/`'talking'`/`'menu'`/`'dying'` → `left` unverändert (Review Focus 2); Tod und `travel` → wieder `high: false, left: 25`; Karte ohne `tides` → `world.tide` fehlt; Wellen-Durchlauf exakt gleich.
- [ ] FAIL sehen, implementieren, alle Tests grün.
- [ ] Commit `feat: tides – deep spots flood and drain on a timer`

### Task 2: Zwei Bosse in einer Arena

**Files:** Modify `src/modes/adventure.js`, `src/data/maps/index.js` (Typ), `src/data/adventure.js`, `src/ui/adventureHud.js` (nur Anbindung); Test `tests/lake.test.js`

**Interfaces – Produces:**
- Boss-Eintrag der Karte: optional `group?: string[]` (Gegnertypen, die zusammen erscheinen; fehlt = `[type]`), `name?: string` (Anzeigename, sonst `ENEMIES[type].name`), `tides?: { low, high, warn }` (Task 4). `bossName(bossDef): string` (exportiert).
- `BOSS_GROUP = { spacing: 3, enrageMul: 1.3 }`: Gruppenmitglieder erscheinen nebeneinander im Abstand `spacing` quer zur Arena-Mitte (begehbar, sonst am Bossplatz).
- `run.activeBoss = { id, enemyIds: number[], maxHp: number }` (Summe des höchsten Lebens beim Kampfbeginn). `activeBossHealth(run): { name: string, hp: number, maxHp: number } | null` (exportiert; Summe der lebenden Mitglieder) – die Bossanzeige liest nur noch diese Funktion.
- `onKill` eines Gruppenmitglieds: leben noch andere mit derselben `bossId`, werden sie wütend (`enraged = true`, `speed` und `damage` × `enrageMul`, nur einmal), Ereignis `bossEnraged { bossId, x, z }`, sonst `onBossDefeated` wie bisher (genau einmal). `updateBosses` erscheint die ganze Gruppe nur, wenn kein Mitglied lebt.

- [ ] Tests: Gruppe erscheint mit zwei Gegnern, Anzeige zeigt Summe; erster fällt → anderer wütend (Tempo/Schaden × 1,3), Boss nicht besiegt, Tor zu; zweiter fällt → `bossDefeated` einmal, Flussperlen einmal, Auftragsschritt einmal; beide im selben Schritt besiegt → einmal; einer außerhalb des Kampfs besiegt, dann der andere → einmal; Tod im Kampf → beide neu, ohne Wut (Review Focus 3); Einzelbosse wie bisher (vorhandene Tests grün).
- [ ] FAIL, implementieren, grün.
- [ ] Commit `feat: boss groups – two bosses share one fight and one health bar`

### Task 3: Gegner des Schlosssees und die Krebs-Sänftenträger

**Files:** Modify `src/data/enemies.js`, `src/core/world.js`, `src/data/sprites.js` (Stellvertreter in `ADVENTURE_SPRITE_FALLBACK`/`ADVENTURE_ENEMY_SPRITES`); Test `tests/lake.test.js`

**Interfaces – Produces** (Werte in der Größenordnung von Kapitel 3, Stufe kommt aus der Karte):
- `gardekrebs`: `behavior: 'strafe'`, `armor: 3`, `guard: { radius: 4, reduce: 0.25 }`. In `damageEnemy`: steht ein anderer lebender Gegner mit `guard` höchstens `radius` vom Getroffenen, wird `amount × (1 − reduce)` vor der Rüstung (größter Schutz zählt, nie mehrere). Prüfung nur, wenn `world.guards > 0` (Zähler der lebenden Gegner mit `guard`, gepflegt in `spawnEnemy` und beim Entfernen) – im Wellen-Modus keine Rechnung.
- `kugelfisch`: `behavior: 'chase'`, `puff: { range: 2.2, warn: 1.2, radius: 2.8, damageMul: 1.6, enemyPct: 0.3, bossMaxPct: 0.05 }`: in Reichweite bleibt er stehen, Ereignis `bossTelegraph { kind: 'ring', look: 'puff', x, z, radius, delay: warn }`; nach `warn` trifft er den Helden im Kreis und alle anderen treffbaren Gegner im Kreis (`enemyPct × maxHp`, Bosse höchstens `bossMaxPct`, `damageEnemy(…, 'platzen', { environment: true })`) und ist selbst besiegt (Kill-Ereignis mit `source: 'platzen'`, zählt wie jeder Sieg). Betäubung oder Verwirrung bricht ab; wird er vorher besiegt, platzt nichts.
- `damageEnemy(…, { environment, pierce })`: `pierce: true` übergeht Schutz und Rüstung (nur für das Platzen selbst).
- `muschelschuetze`: `behavior: 'ranged'`, `shot: 'perle'` → seine Geschosse tragen `kind: 'perle'` (nur Darstellung).
- Krebs-Sänftenträger `knips` und `knaps` (je etwa 900 Leben, `behavior: 'boss'`, `armor: 2`, Namen „Träger Knips“, „Träger Knaps“), `BOSS_MOVES` beide: near `swipe` (Scherenhieb), far `dash` (Ansturm), gleiche `chaseTime`, damit sie meist zusammen anstürmen.
- Stellvertreter: Gardekrebs = Krebs (größer), Kugelfisch = Helmfisch, Muschelschütze = Krebs, Knips/Knaps = Zwickzwack.

- [ ] Tests: Gardekrebs-Schutz −25 % für Nachbarn, nicht für sich, zwei Gardekrebse nicht stapelnd, außerhalb des Radius nichts (Review Focus 5); Kugelfisch kündigt an, trifft Held und Nachbarn im Kreis, ist danach weg und zählt als Sieg; vorher besiegt oder betäubt → kein Platzen (Review Focus 5); Platzen trifft keinen `untargetable`; Muschelschütze schießt Perlen; Knips/Knaps haben Bossangriffe; alle neuen `adventureOnly`; Wellen-Durchlauf exakt gleich.
- [ ] FAIL, implementieren, grün.
- [ ] Commit `feat: castle lake enemies – guard crab, puffer fish, pearl shooter, the litter bearers`

### Task 4: Endkampf gegen Flossian

**Files:** Modify `src/data/enemies.js`, `src/core/world.js`, `src/modes/adventure.js`; Test `tests/lake.test.js`

**Interfaces – Produces:**
- `ENEMIES.flossian`: Boss „Seine Durchlaucht Flossian der Erste“, etwa 2.000 Leben, `flying: true` (das Glas schwebt über tiefen Stellen und wird nie weggesetzt), `behavior: 'flossian'`.
- `BOSS_MOVES.flossian`: `chaseTime 2`, `recover 0.8`, `triggerRange 4`, `anchored: true` (in der Verfolgungsphase bleibt er stehen), near `ring` (Glasplatscher, `reach 3`, `push 4`), far neue Form `jets` `{ count: 3, spreadDeg: 30, speed: 10, radius: 0.35, life: 2.5, windup: 0.7, damageMul: 0.9 }` (Ankündigung `bossTelegraph { kind: 'jets', … }`, danach Geschosse `kind: 'strahl'`); `tide: { swim: 4, jetEvery: 2.5, summonEvery: 9, summon: { type: 'helmfisch', count: 2, radius: 3 } }`; `haste: { at: 0.5, mul: 0.7, summon: { type: 'gardekrebs', count: 2, radius: 3 } }`.
- `BEHAVIORS.flossian`: bei `world.tide?.high`: `untargetable = true`, gleitet zum Teich (`enemy.home.pool`), schießt alle `jetEvery` s Strahlen, ruft alle `summonEvery` s Verstärkung (ab Eile Gardekrebse); laufende Ankündigung bricht ab. Sonst: `untargetable = false`, gleitet zum Thron (`enemy.home`), danach normaler Bossablauf mit `anchored`. Fällt das Leben erstmals auf ≤ `haste.at`: `ai.hasted = true`, Zeiten (`chaseTime`, `recover`, `windup`, `jetEvery`) × `haste.mul`, sofort `haste.summon`, Ereignis `bossHaste`.
- Boss-Eintrag `flossian` der Karte: `pool: { x, z }`, `tides: { low: 12, high: 10, warn: 5 }`; die Regelschicht setzt `home.pool` beim Erscheinen. Beim Kampfbeginn und -ende wird `world.tide.left` höchstens auf die Länge der neuen Phase gekürzt (keine Sprünge nach oben).

- [ ] Tests: bei Hochwasser nimmt Flossian keinen Schaden (Fähigkeit von Hand, `damageEnemy` mit und ohne `environment`, Platzen) und ist kein Ziel (`isTargetable` falsch), bei Niedrigwasser schon (Review Focus 4); bei Hochwasser Strahlen und zwei Helmfische, bei Niedrigwasser am Thron; ein Treffer von 60 % auf 30 % → Eile genau einmal, zwei Gardekrebse; Kampf beginnt bei Hochwasser → beim nächsten Wechsel angreifbar; Kampfzeiten 12/10 nur im Kampf, nach Sieg wieder 25/15 (Review Focus 2); Wellen-Durchlauf exakt gleich.
- [ ] FAIL, implementieren, grün.
- [ ] Commit `feat: final fight – Flossian can only be hit at low tide`

### Task 5: Karte „Der Schlosssee“, Dorf-Ausgang, Stelzfuß, Flossian im Brunnen

**Files:** Create `src/data/maps/kapitel4.js`; Modify `src/data/maps/index.js`, `src/data/maps/dorf.js`, `src/data/adventure.js` (`CAMPFIRE_NAMES`, `MAP_LOOK.npcs`), `src/data/dialogues.js` (`NPCS.stelzfuss`); Test `tests/maps.test.js`

**Interfaces – Produces:**
- `KAPITEL4: MapDef` mit `id: 'kapitel4'`, `name: 'Der Schlosssee'`, `chapter: 4`, `tides: { low: 25, high: 15, warn: 5 }`: Hauptweg etwa 1.300 m am Seeufer entlang zum halb versunkenen Schloss, Stege über tiefe Rinnen (Hauptweg bei jedem Wasserstand begehbar), Abkürzungen und Watt nur bei Niedrigwasser; etwas Strömung (Zufluss) und Schlamm; 4 Lagerfeuer (`k4_ufer`, `k4_watt`, `k4_schlosstor`, `k4_thron`); Gebiete u. a. `seeufer`, `watt`, `fischerdorf`, `schlosstor`, `schlosshof`, `thronsaal`; Gruppen Stufe 22–28 (gardekrebs, kugelfisch, muschelschuetze, dazu helmhecht, aal, ochsenfrosch), Kennungen `p4_…`; Kisten (mindestens zwei nur bei Niedrigwasser erreichbar); Fundorte `schlossschluessel` (1, nur bei Niedrigwasser) und `muschel` (4, davon mindestens 3 nur bei Niedrigwasser); Bewohner `stelzfuss` (alter Reiher, ehemaliger Hofdiener); Sperre `schlosstor` (`opensOn: { quest: 'ebbe', step: 1 }`, mit dem Schlüssel), Sperre hinter den Sänftenträgern; Bosse `saenftentraeger` (`type: 'knips'`, `group: ['knips', 'knaps']`, `name: 'Die Krebs-Sänftenträger'`, Stufe ~25) und `flossian` (Stufe ~28, Thronsaal mit tiefem Teich in der Mitte und trockenem Rand, `pool` im Teich, `tides` 12/10); Ausgang zurück ins Dorf.
- Dorf: Weg nach Süden über den Bach (Brücke), Ausgang `nach_kapitel4` mit `requires: { chapterDone: 3 }`, Wegweiser mit `requires` wie bei Sumpf und Damm, Ziel `{ map: 'kapitel4', campfire: 'k4_ufer' }`. Bewohner `flossian` am Brunnen mit `requires: { boss: 'flossian' }`.
- `STORY.chapterEnd[3]`: statt „Fortsetzung folgt“ der Hinweis auf den Südausgang.

- [ ] Tests: Karte gültig wie Kapitel 1 bis 3 (Kennungen, begehbar bei Niedrigwasser); jede Arena mit geschlossenem Tor dicht, bei beiden Wasserständen; Erreichbarkeit bei **beiden** Wasserständen von jedem Lagerfeuer: Lagerfeuer, Bewohner, Ausgänge, Arenen, Bosse und Fundorte/Kisten, die nicht auf tiefen Stellen liegen; bei Niedrigwasser alles; jede Arena hat bei Hochwasser mindestens 150 m² begehbare Fläche ohne tiefe Stellen; Fundort `schlossschluessel` liegt mehr als `INTERACT_RANGE` von jeder bei Hochwasser begehbaren Zelle entfernt (nur bei Niedrigwasser erreichbar); Hauptweg 1.200–1.500 m und mindestens eine tiefe Stelle quert eine Abkürzung; ohne Schlüssel kein Weg zum Schlosshof; Südausgang ohne `chapterDone: [3]` zu, mit offen; Flossian im Dorf erst nach seinem Sieg sichtbar; `repairSave` behält Feuer, Bosse, Kisten, Fundorte von Kapitel 4.
- [ ] FAIL, implementieren, grün.
- [ ] Commit `feat: castle lake map, village exit and the heron`

### Task 6: Aufträge, Gespräche, Schlussgeschichte, Gegenstände, Erfolge

**Files:** Modify `src/data/quests.js`, `src/data/dialogues.js`, `src/data/story.js`, `src/data/items.js`, `src/data/adventure.js` (`SHOP.stockByChapter[4]`, `LOOT.bossPearls`), `src/data/achievements.js`, `src/adventureGame.js` (Schlussgeschichte + Tafel „Ende“), `src/ui/menus.js` (Kapitelzeile der Heldenkarte); Tests `tests/quests.test.js`, `tests/adventureHero.test.js`, `tests/achievements.test.js`, `tests/items.test.js`

**Interfaces – Produces:**
- 5 Hauptaufträge mit `chapter: 4`: `ruf_vom_see` (von `panzerla`, `requires: ['admiral']`, Gebiet `seeufer`, Gespräch `stelzfuss`), `leibgarde` (Gardekrebse besiegen, `hofsiegel` von Muschelschütze/Kugelfisch sammeln, Gespräch), `ebbe` (Fundort `schlossschluessel` bei Niedrigwasser, Gespräch – öffnet das Schlosstor), `saenfte` (Gebiet `schlosstor`, Boss `saenftentraeger`, Gespräch), `der_thron` (Gebiet `thronsaal`, Boss `flossian`, `endsChapter: 4` – endet mit dem Sieg, damit die Schlussgeschichte gleich folgt); 2 Nebenaufträge (`perlen_im_watt`: 4 Fundorte `muschel`; `kugelfischplage`: 8 Kugelfische). `CHAPTER_START_QUEST[4] = 'ruf_vom_see'`; Namen in `QUEST_THING_NAMES`.
- `DIALOGUES.stelzfuss` mit Hinweisen zu den Gezeiten („Wenn die Anzeige blinkt, geh vom Watt runter“), neue Sätze für `panzerla` (Angebot `ruf_vom_see`, Leerlauf nach dem Ende), `DIALOGUES.flossian.idle` mit beleidigten Sätzen (kein Auftrag).
- `STORY.chapterStart[4]` (2–3 Tafeln); `STORY.finale` (3–4 Tafeln: Glas kippt, Pfütze, Flossian zieht in den Dorfbrunnen); `STORY.chapterEnd[4] = { scene, lines, end: true }` mit dem Wort „Ende“. Bei `chapterDone` mit Kapitel 4 spielt die Spielschleife `[...STORY.finale, STORY.chapterEnd[4]]`; die Tafel mit `end` zeigt „Ende“ groß.
- 8 Gegenstände `source: 'kapitel4'`, stärker als Kapitel 3; ohne Bildbogen. `SHOP.stockByChapter[4]` (sichtbar nach Kapitel 3). Flussperlen Sänftenträger 5, Flossian 6.
- Erfolge `ebbe-und-flut` („Ebbe und Flut“, Kapitel 4 abgeschlossen, 100 Gold) und `fisch-auf-dem-trockenen` („Fisch auf dem Trockenen“, Flossian besiegt, 150 Gold); jetzt 48.
- Heldenkarte: „Kapitel n“ zeigt das laufende Kapitel (heute steht dort immer 1), nach Kapitel 4 „Geschichte beendet“.

- [ ] Tests: Aufträge gültig (Ziele existieren auf `kapitel4`, Ketten lösbar, genau ein `endsChapter: 4`); `ebbe` öffnet `schlosstor`; „Kapitel 4 bringt ohne Wiederholen von Level 22 etwa auf Level 27 bis 29“; Gegenstände gültig; Erfolge mit Grenzfall; Händlerauswahl nach Kapitel 3; Kapitelzeile für 0, 1, 3 und 4 abgeschlossene Kapitel.
- [ ] FAIL, implementieren, grün.
- [ ] Commit `feat: castle lake quests, final story, items and achievements`

### Task 7: Darstellung des Schlosssees

**Files:** Modify `src/render/mapView.js` (tiefe Stellen dunkelblau bei Hochwasser, nasser Sand bei Niedrigwasser, in den 5 s vor dem Steigen pulsierend blau eingefärbt; Gardekrebs-Schutzring; Flossian im Brunnen), `src/ui/minimap.js` (Farbe `deep` je Wasserstand, Neuzeichnen bei `gridVersion`), `src/ui/adventureHud.js` (Gezeiten-Anzeige oben: „Niedrigwasser · Flut in 0:12“ / „Hochwasser · Ebbe in 0:08“, in den letzten 5 s hervorgehoben; Einblendungen „Die Flut kommt!“, „Das Wasser sinkt.“, „Die Träger werden wütend!“, „Flossian wird hektisch!“), `src/render/effects.js` (Aufblähen, Strahlen-Ankündigung, Platzen), `src/render/enemies.js` (Perlen und Strahlen als Geschosse), `src/ui/story.js` o. ä. (Tafel „Ende“), `src/data/adventure.js` (`MAP_LOOK.deep`, `MAP_LOOK.telegraph.puff/jets`, `MAP_LOOK.guard`, `MINIMAP.colors.deep/deepHigh`), Stelzfuß als 3D-Figur mit Porträt-Buchstabe
- [ ] Reine Hilfen DOM-frei testen, falls neue entstehen (z. B. Text der Gezeiten-Anzeige `tideLabel(tide, timings)`).
- [ ] Im Browser (390 × 844 und Desktop, `?debug=1&mode=adventure`, Held per Konsole auf Kapitel 3 abgeschlossen und Level 22): Südausgang im Dorf, See betreten (Einstiegsgeschichte), Gezeiten-Anzeige und Ankündigung, tiefe Stellen färben sich, Held wird ans Ufer gesetzt, Watt bei Niedrigwasser, Stelzfuß per Taste E und per Maus, Gegner, Zwei-Boss-Kampf mit Summenanzeige und Wut, Endkampf (Hoch- und Niedrigwasser, Strahlen, Eile), Schlussgeschichte mit „Ende“, Flossian im Dorfbrunnen; nur Tastatur, nur Maus/Touch; Konsole ohne Fehler; Wellen-Modus startet.
- [ ] Commit `feat: castle lake look`

### Task 8: Bilder-Beschreibungen, Version, Doku, Gesamtprüfung

**Files:** Create `docs/abenteuer-bilder-kapitel4.md`; Modify `src/data/version.js` (`0.9.0`), `README.md`, `docs/UEBERGABE.md`
- [ ] Bildbeschreibungen (Stilblock aus Spec §10): Bogen Gegner und Bosse (Gardekrebs, Kugelfisch normal und aufgebläht, Muschelschütze, Knips und Knaps, Flossian im Glas auf der Sänfte, Flossian in der Pfütze), Porträts Stelzfuß und Flossian im Brunnen, Kacheln tiefes Wasser und nasser Sand, Kulissen (Schlossmauern, Turm, Sänfte, Thron), 8 Gegenstände.
- [ ] Version 0.9.0; README (Kapitel 4, Gezeiten, Ende der Geschichte) und Übergabe (Etappe 3 abgeschlossen, Entscheidungen, Prüfung, Konsole für Handproben).
- [ ] Alle Tests grün im Browser; frischer Prüfer über alle Commits des Kapitels; Critical/Important mit Test beheben; Push.
- [ ] Commit `docs: chapter 4 – images, readme and handover; version 0.9.0`
