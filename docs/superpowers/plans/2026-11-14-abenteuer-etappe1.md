# Abenteuer-Modus Etappe 1 – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein spielbarer Abenteuer-Modus mit Dorf Bachwinkel und Kapitel 1 „Der steigende Bach“: Karte mit Minikarte, Gegnergruppen, zwei Bosse, Aufträge mit Gesprächen, Händler, Schmied, Ausrüstung, drei Fähigkeiten von Hand plus Heiltrank, Lagerfeuer; dazu Spielstand Version 4 mit Sicherungskopie und die Spielversion auf dem Titelbildschirm.

**Architecture:** Das Abenteuer nutzt die vorhandene Welt (`src/core/world.js`) mit austauschbarer Geländequelle und bringt einen eigenen Regelmodus `src/modes/adventure.js` mit. Karten sind Daten in `src/data/maps/`, aus denen ein Raster der begehbaren Fläche (`src/core/mapGrid.js`) für Kollision und Minikarte entsteht. Spielstand-Funktionen (`src/save/adventure.js`) übertragen den Stand eines laufenden Abenteuers in den gespeicherten Stand; Oberfläche und Darstellung lesen nur.

**Tech Stack:** ES-Module ohne Build, Three.js 0.170 aus `vendor/`, Tests in `tests.html` (`tests/runner.js`: `test`, `assertEqual`, `assertClose`, `assertTrue`, `assertThrows`).

**Spec:** `docs/superpowers/specs/2026-11-14-abenteuer-etappe1-design.md` (freigegeben 2026-11-14). Abschnittsnummern unten (§) beziehen sich darauf.

## Global Constraints

- Logik in `src/core`, `src/modes`, `src/data`, `src/save` ohne Three.js, `window`, `document`, `localStorage`, `Date.now()`; Zufall nur über `createRng(seed)` bzw. `world.rng`.
- Darstellung und Oberfläche ändern den Weltzustand nie; sie rufen nur die exportierten Aktionen von `src/modes/adventure.js`.
- Alle Zahlen und Texte in `src/data/`. Text nur über `textContent`. Oberfläche Deutsch. Alle Pfade relativ.
- **Wellen-Modus und Taverne bleiben unverändert:** alle bisherigen Tests grün, keine geänderte Zahl in `src/data/waves.js`, `enemies.js` (bestehende Einträge), `abilities.js` (bestehende Werte).
- **Handy allein, Tastatur allein, Maus allein** reichen für alles (§5.2). Knöpfe ≥ 44 px; 360 × 640 und 390 × 844 ohne seitliches Scrollen.
- Fehlt ein Bild, gibt es Ersatz; kein Bildschirm scheitert daran. Neue Bilder lädt das Spiel erst beim Betreten des Abenteuers.
- Kennungen von Gegenständen, Karten, Lagerfeuern, Aufträgen, Bossen, Kisten, Fundorten werden nie umbenannt oder gelöscht; Auftragsschritte nur hinten anfügen.
- Spielversion `0.5.0`; Spielstand-Version `4`.
- Commits als `Spandro <Spandro@users.noreply.github.com>`, direkt auf `main`, Betreff Englisch wie bisher (`feat:`, `fix:`, `docs:`, `tune:`), Zeile `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Tests laufen über `http://localhost:8080/tests.html` (preview_start `animalwarrior`); bestanden heißt `window.__testResults.failed === 0`. `?filter=<text>` grenzt ein.

## Review Focus

1. **Neuladen mitten im Kapitel / Tab schließen:** Weiterspielen beginnt am letzten Lagerfeuer; Level, Beute, Gold, Auftragsschritte seit dem letzten Speichern gehen nicht verloren, nichts wird doppelt gutgeschrieben (Ledger wird genau einmal übertragen). → Test in Task 7 (`commitAdventure` zweimal hintereinander schreibt Gold nur einmal).
2. **Held stirbt im Bossbereich bei geschlossenem Tor:** Er wacht am Feuer auf, das Tor ist offen, der Boss voll. Kein Festsitzen. → Test in Task 9.
3. **Gegner und Held am Rand der begehbaren Fläche, an Wasser und Brücke, mit Rückstoß:** Rückstoß und Wegschieben (`knockback`, `pushHero`, Trennung der Gegner) dürfen niemanden ins Wasser oder durch den Rand schieben. → Test in Task 2.
4. **Fähigkeit gedrückt während Pause, Gespräch, Menü oder Sterbephase:** tut nichts, verbraucht nichts. Gleiches für Trank und Sprechen. → Test in Task 9.
5. **Stand aus älterer Version mit Helden und Taverne-Beute, und kaputte Abenteuer-Daten:** Laden hebt auf 4, legt `animalwarrior.save.v3` an, bessert nur den Abenteuer-Teil aus; Helden, Gold, Truhe, Erfolge bleiben. → Tests in Task 1 und Task 7.

---

## Dateiübersicht

| Datei | Verantwortung |
|---|---|
| `src/data/version.js` (neu) | `GAME_VERSION` |
| `src/save/store.js` | Sicherungskopie vor Umwandlung; Ausbessern beim Laden/Import |
| `src/save/schema.js` | Version 4, Umwandlung 3 → 4, Prüfung |
| `src/save/adventure.js` (neu) | neues Abenteuer, Ausbessern, Übertragen eines Laufs, Anlegen, Schmied, Händler |
| `src/core/world.js` | austauschbare Geländequelle (`world.terrain`), passive Gegner, Drop-Modus, Kill-Ereignis mit mehr Feldern |
| `src/core/terrain.js` | `seedTerrain(seed)` als Standard-Geländequelle |
| `src/core/mapGrid.js` (neu) | Raster der begehbaren Fläche, Bewegung mit Gleiten, Rand-Deko, Erkundung |
| `src/data/maps/dorf.js`, `src/data/maps/kapitel1.js`, `src/data/maps/index.js` (neu) | Kartenbeschreibungen |
| `src/data/enemies.js` | neue Gegner und Bosse (nur Einträge anfügen), Bossform `summon` |
| `src/data/items.js` | 30 neue Gegenstände, `source` je Gegenstand |
| `src/data/adventure.js` (neu) | alle Zahlen des Abenteuers (Kurve, Faktoren, Tränke, Tod, Gruppen, Schmied, Händler, Beute, Material) |
| `src/data/quests.js`, `src/data/dialogues.js`, `src/data/story.js` (neu) | Aufträge, Gespräche, Einstieg und Abschluss |
| `src/core/abilities.js` | Fähigkeiten von Hand, Gate für die Grundattacke, Faktoren |
| `src/core/adventureHero.js` (neu) | Level, Fähigkeiten frei, Punkte, Werte aus Ausrüstung und Verbesserung |
| `src/core/quests.js` (neu) | Auftragslogik |
| `src/core/loot.js` (neu) | Beutewürfe des Abenteuers |
| `src/modes/adventure.js` (neu) | Regelschicht: Gruppen, Kampf, Aktionen, Tod, Lagerfeuer, Übergänge, Ledger |
| `src/render/mapView.js` (neu) | Boden, Weg, Wasser, Rand-Bäume, Häuser, Leute, Feuer, Tore, Kisten, Fundorte |
| `src/render/adventureSprites.js` (neu) | Laden der Abenteuer-Bögen bei Bedarf |
| `src/ui/adventureHud.js`, `src/ui/minimap.js`, `src/ui/dialogue.js` (neu) | Anzeige im Spiel |
| `src/ui/adventureMenus.js`, `src/ui/shop.js`, `src/ui/smith.js`, `src/ui/equipment.js` (neu) | Pausenmenü und seine Seiten, Händler, Schmied, Ausrüstung, Fähigkeiten, Aufträge, Lagerfeuer, Karte, Einstieg |
| `src/adventureGame.js` (neu) | Spielschleife des Abenteuers (wie `src/game.js`) |
| `src/input/keyboard.js` | zusätzliche Tasten über Handler-Liste |
| `src/main.js`, `src/ui/menus.js`, `src/ui/settings.js`, `src/ui/screens.js` | Einbindung, Modus-Karte, Einstellung Knopfseite, Versionszeile, Hinweis |
| `src/data/achievements.js`, `src/core/achievements.js` | vier neue Erfolge |

---

### Task 1: Spielversion, Sicherungskopie, dauerhafter Speicher, Hinweis

**Files:**
- Create: `src/data/version.js`
- Modify: `src/save/store.js` (`read`), `src/main.js`, `src/ui/menus.js` (`renderMain`), `src/data/texts.js`, `styles.css`
- Test: `tests/save.test.js`

**Interfaces:**
- Produces: `GAME_VERSION = '0.5.0'`; `versionBackupKey(version: number): string` → `` `animalwarrior.save.v${version}` `` (exportiert aus `store.js`); `SAVE_HINT` (Text) in `src/data/texts.js`.

- [ ] **Step 1: Failing tests** in `tests/save.test.js` mit dem vorhandenen Fake-Storage:
  - `store: älterer Stand legt vor der Umwandlung eine Kopie unter animalwarrior.save.v<alt> ab` — Storage enthält Rohtext eines Version-2-Stands; nach `load()` ist `storage.getItem('animalwarrior.save.v2') === roh`.
  - `store: vorhandene Kopie wird nicht überschrieben` — Schlüssel `…v2` hat vorher `'alt'`; nach `load()` weiter `'alt'`.
  - `store: aktueller Stand legt keine Kopie an` — Version = `SAVE_VERSION` → kein Schlüssel `…v<SAVE_VERSION>`.
  - `store: scheitert das Anlegen der Kopie, lädt der Stand trotzdem` — `setItem` wirft für `…v2`; Status `ok`.
- [ ] **Step 2:** Tests laufen lassen (`tests.html?filter=store:`), erwartet FAIL.
- [ ] **Step 3: Implementieren.** In `read()` nach `JSON.parse` und `isNewer`: ist `parsed.version` eine ganze Zahl kleiner `SAVE_VERSION`, Kopie mit `try/catch` schreiben, nur wenn `getItem(key) === null`. `GAME_VERSION` in `version.js`. In `main.js` beim Start einmal `navigator.storage?.persist?.().catch(() => {})`. `renderMain`: unten kleine Zeile `Version ${GAME_VERSION}` (Klasse `game-version`) und unter Export/Import `SAVE_HINT`: „Dein Spielstand liegt nur in diesem Browser. Sichere ihn ab und zu mit ‚Exportieren‘. Auf dem iPhone hilft ‚Zum Home-Bildschirm‘.“
- [ ] **Step 4:** Tests grün; alle Tests grün.
- [ ] **Step 5:** Im Browser: Titelbildschirm zeigt „Version 0.5.0“ und den Hinweis bei 390 × 844 ohne Scrollen nach rechts.
- [ ] **Step 6: Commit** `feat: game version on the title screen, backup before save upgrades`

### Task 2: Austauschbares Gelände und Kartenraster

**Files:**
- Create: `src/core/mapGrid.js`
- Modify: `src/core/world.js`, `src/core/terrain.js`, `src/modes/survivor.js` (nur Aufrufe `obstaclesNear(world.seed, …)` → `world.terrain.obstaclesNear(…)`)
- Test: `tests/mapGrid.test.js` (neu, in `tests/index.js` eintragen), `tests/world.test.js`

**Interfaces:**
- Produces:
  - `seedTerrain(seed): Terrain` in `terrain.js`, mit `Terrain = { obstaclesNear(x, z, range): Obstacle[], walkable?(x, z, flying): boolean }`.
  - `createWorld({ …, terrain?: Terrain })` — Standard `seedTerrain(seed)`; `world.terrain`.
  - `MapGrid = { cell: number, minX: number, minZ: number, cols: number, rows: number, cells: Uint8Array }` mit Zellwerten `0` gesperrt, `1` begehbar, `2` Wasser, `3` Brücke.
  - `buildMapGrid(mapDef: MapDef): MapGrid`
  - `cellAt(grid, x, z): number` (außerhalb = 0)
  - `mapTerrain(mapDef, grid, isGateClosed: (gateId) => boolean): Terrain` — `obstaclesNear` liefert Hindernisse aus `mapDef.obstacles` plus geschlossene Tore als Kreisketten; `walkable(x, z, flying)` = fliegend: im Raster, sonst Zelle 1 oder 3 und nicht in geschlossenem Tor.
  - `borderDecor(grid, seed): { x, z, kind: 'tree'|'rock' }[]` — feste Rand-Bäume und -Felsen auf gesperrten Zellen mit begehbarer Nachbarzelle in ≤ 3 Zellen (nur Darstellung).
  - Erkundung: `createExplored(grid): Uint8Array` (ein Bit je Block von `EXPLORE_BLOCK = 8` m), `markExplored(bits, grid, x, z, radius)`, `encodeExplored(bits): string` (Base64), `decodeExplored(text, grid): Uint8Array` (falsche Länge oder Text → leer).
- Consumes: `MapDef` aus Task 3 (für Tests genügt eine kleine Testkarte im Test selbst).

**Kollision:** In `stepWorld` merkt sich jede Bewegung (Held, Gegner, Rückstoß, `pushHero`, Trennung, Herausschieben) die alte Position; ist danach `terrain.walkable` vorhanden und die neue Stelle nicht begehbar, wird achsenweise zurückgenommen (erst nur x, dann nur z, sonst ganz zurück) – der Held gleitet an Rändern entlang. Ohne `walkable` (Wellen-Modus) läuft alles wie bisher. Gegnergeschosse verschwinden in gesperrten Zellen, nicht über Wasser.

- [ ] **Step 1: Failing tests** (`mapGrid:` …):
  - `buildMapGrid`: Weg von (0,0) nach (40,0) mit Breite 6 → `cellAt(grid, 20, 0) === 1`, `cellAt(grid, 20, 5) === 0`; Bach quer bei x = 20 Breite 4 → `cellAt(20, 0) === 2`; Brücke darüber → `3`; Lichtung r = 8 bei (40,0) → `cellAt(40, 7) === 1`.
  - Gleiten: Held bei (10, 2.5) läuft schräg nach (+1, +1) gegen den Wegrand → z bleibt ≤ 3, x wächst.
  - Wasser sperrt Laufende, Brücke nicht; Krähe (`flying`) darf übers Wasser.
  - Rückstoß über den Rand (`knockback` 5 m Richtung Rand) → Gegner bleibt auf begehbarer Zelle (Review Focus 3).
  - Geschlossenes Tor sperrt, offenes nicht.
  - `encodeExplored`/`decodeExplored` Hin und zurück; Unsinn → leer, kein Wurf.
  - `borderDecor` gleich bei gleichem Seed, keine Deko auf begehbaren Zellen.
- [ ] **Step 2: Failing test** in `tests/world.test.js`: `world: Wellen-Modus nutzt seedTerrain – Hindernisse wie obstaclesNear(seed)` (gleiche Liste an 20 Stellen) und ein fester Seed-Durchlauf von `stepRun` über 60 s ergibt dieselbe Heldenposition wie mit dem alten Code (Wert vorher mit dem alten Code ermitteln und als Konstante eintragen).
- [ ] **Step 3:** FAIL prüfen, dann implementieren (Raster durch Abtasten jeder Zellmitte gegen Kapseln, Kreise, Wasserkapseln, Brückenkapseln; Zellgröße `MAP_CELL = 1` aus `src/data/adventure.js`).
- [ ] **Step 4:** Alle Tests grün.
- [ ] **Step 5: Commit** `feat: pluggable terrain and walkable map grid`

### Task 3: Karten Dorf und Kapitel 1

**Files:**
- Create: `src/data/maps/dorf.js`, `src/data/maps/kapitel1.js`, `src/data/maps/index.js`
- Test: `tests/maps.test.js` (neu)

**Interfaces:**
- Produces: `MAPS: Record<'dorf'|'kapitel1', MapDef>` und
  ```text
  MapDef = { id, name, chapter: 0|1, bounds: {minX,maxX,minZ,maxZ},
    paths: {points: [x,z][], width}[], clearings: {x,z,r}[], water: {points, width}[], bridges: {points, width}[],
    obstacles: {x,z,radius,kind:'tree'|'rock'}[],
    gates: {id, points: [x,z][], opensOn: {quest, step}|{boss}}[],
    areas: {id, name, x, z, r}[],
    campfires: {id, x, z}[], npcs: {id, x, z, faceX}[], spots: {id, kind, x, z}[],
    chests: {id, x, z, gold, item?: string, pearls?: number}[],
    packs: {id, x, z, level, enemies: Record<string, number>, elite?: string}[],
    bosses: {id, type, x, z, arena: {x, z, r}, gate: string}[],
    exits: {id, x, z, r, to: {map, campfire}}[],
    props: {kind, x, z, faceX?}[], start: {campfire} }
  ```
- Inhalt nach §6.2/§6.3: Dorf mit Lagerfeuer `dorf_platz`, Häusern als `props`, Leuten `panzerla`, `kruemel`, `grabowski`, `nussa`, `pieps`, Ausgang nach `kapitel1`/`k1_ufer`. Kapitel 1 mit Gebieten `bachufer`, `krebslager`, `alte_bruecke`, `muehlenwiese`, `tiefer_wald`, `quellteich`; Feuer `k1_ufer`, `k1_bruecke`, `k1_wald`, `k1_quelle`; Leute `amsel`; Tor `barrikade` (öffnet bei Boss `graete`), Bosstore `arena_graete`, `arena_zwickzwack`; Fundorte `hammer`, 5 × `nuss_1…5`; Bosse `graete` (Typ `hauptmann_graete`), `zwickzwack` (Typ `kommandant_zwickzwack`); Ausgang zurück ins Dorf am Anfang. Mindestens zwei Seitenwege. Hauptweg ohne Kampf 4–5 Minuten bei Tempo 5 m/s (etwa 1.200–1.500 m Weglänge).
- Gruppen: Stufen 1 (Bachufer) bis 10 (Quellteich); Gegner aus `ratte, fuchs, kraehe, igel, kreuzotter, wildschwein, helmfisch, krebs, frosch`.

- [ ] **Step 1: Failing tests** (`maps:` …): Kennungen eindeutig je Art und Karte; jedes Feuer, jeder Mensch, jeder Fundort, jede Kiste, jede Gruppe, jeder Boss liegt auf begehbarer Zelle (`buildMapGrid`); jedes Feuer ist von `start` aus über begehbare Zellen erreichbar, wenn alle Tore offen sind (Breitensuche im Raster); bei geschlossenen Toren ist `k1_quelle` nicht erreichbar; Hauptweglänge zwischen 1.200 und 1.500 m; Gegnerarten bekannt; Gruppengrößen 3–8; Stufen 1–10; Ausgänge zeigen auf bekannte Karte und Feuer.
- [ ] **Step 2:** FAIL, dann Karten anlegen, bis grün.
- [ ] **Step 3: Commit** `feat: village and chapter 1 maps`

### Task 4: Neue Gegner und Bosse

**Files:**
- Modify: `src/data/enemies.js` (anfügen), `src/core/world.js` (Bossform `summon`), `src/data/sprites.js` (Einträge mit Bogen `kapitel1`, solange Bild fehlt → Ersatzform)
- Test: `tests/world.test.js`

**Interfaces:**
- Produces: `ENEMIES.helmfisch` (`chase`), `ENEMIES.krebs` (`strafe`, `armor`), `ENEMIES.frosch` (`pounce`, schwächer als Luchs über `POUNCE`-Faktor `damageMul` je Gegner), `ENEMIES.hauptmann_graete` und `ENEMIES.kommandant_zwickzwack` (`behavior: 'boss'`), `BOSS_MOVES.hauptmann_graete = [dash, swipe]`, `BOSS_MOVES.kommandant_zwickzwack = [swipe, ring, summon]`; neue Form `summon: { every: 25, type: 'krebs', count: 3, radius: 4 }` erzeugt Gegner mit `spawnEnemy` und Ereignis `bossSummon`.
- Neues optionales Feld `armor` bei Gegnern: zieht flach vom Treffer ab (mindestens 1 Schaden), nur wenn gesetzt. Startwerte in der Größenordnung von Fuchs/Igel/Luchs; Bosse Leben so, dass §8.4 (1–3 min) mit Level 5 bzw. 10 und Startfähigkeit Stufe 3 erreichbar ist.
- Bosse sind nicht in `BOSS_POOL` (Wellen-Modus unverändert).

- [ ] **Step 1: Failing tests:** `enemies: neue Gegner nicht im Wellen-Pool und nicht in BOSS_POOL`; `world: summon ruft nach 25 s drei Krebse`; `world: armor zieht ab, mindestens 1`.
- [ ] **Step 2:** FAIL, implementieren, grün.
- [ ] **Step 3: Commit** `feat: fish troops and chapter 1 bosses`

### Task 5: Gegenstände, Material, Beute

**Files:**
- Modify: `src/data/items.js`
- Create: `src/data/adventure.js` (dieser Task legt die Datei an; spätere Tasks ergänzen), `src/core/loot.js`
- Test: `tests/items.test.js`, `tests/loot.test.js` (neu)

**Interfaces:**
- Produces:
  - 30 neue Einträge in `ITEMS` mit `source: 'kapitel1'` (alle 24 bisherigen bekommen `source: 'taverne'`), Bogen `beute1`, `icon` 0–29; Verteilung 15 gewöhnlich, 10 selten, 5 legendär; alle Plätze, je Waffenart mindestens 2 Waffen.
  - `MATERIALS = { flussperle: { id, name: 'Flussperle', line } }` in `src/data/adventure.js`.
  - `LOOT = { enemyChance: 0.015, eliteChance: 0.10, bossMinRarity: 'selten', potionChance: 0.03, eliteResale: … }` und `rollAdventureItem(rng, source, minRarity?): string` in `loot.js` (Seltenheit nach `RARITIES.weight`, dann gleichverteilt; `minRarity` wiegt darunter liegende Seltenheiten mit 0).
- Die Truhe der Taverne zeigt weiter nur `source: 'taverne'` („X von 24 gefunden“, Bogen `beute`); Abenteuer-Bildschirme zeigen alle Gegenstände. Symbol-Bogen je Gegenstand: `itemSheet(item) = item.source === 'taverne' ? 'beute' : 'beute1'` (exportiert aus `items.js`), Ersatzsymbol wie bisher.
- Die bisherigen 24 Taverne-Tests bleiben gültig (sie zählen nur `source: 'taverne'`; Test entsprechend auf `source` filtern, nicht Zahlen ändern). `rollItem` der Taverne zieht nur `source: 'taverne'`.

- [ ] **Step 1: Failing tests:** 30 neue, 15/10/5, `icon` 0–29 je einmal; Taverne würfelt nie `kapitel1`; `rollAdventureItem` nie `taverne`; `minRarity: 'selten'` nie gewöhnlich; Verteilung über 10.000 Würfe ±2 Prozentpunkte.
- [ ] **Step 2:** FAIL, implementieren (Namen, Werte, Sprüche im Ton von §11.1), grün.
- [ ] **Step 3: Commit** `feat: thirty chapter 1 items and adventure loot rolls`

### Task 6: Aufträge, Gespräche, Geschichte

**Files:**
- Create: `src/data/quests.js`, `src/data/dialogues.js`, `src/data/story.js`, `src/core/quests.js`
- Test: `tests/quests.test.js` (neu)

**Interfaces:**
- Produces:
  - `QUESTS: Record<string, QuestDef>`; `QuestDef = { id, kind: 'main'|'side', title, giver, requires: string[], steps: StepDef[], reward: { xp, gold, item?, potions? }, unlocks?: 'merchant'|'smith' }`; `StepDef = { type: 'talk'|'reach'|'kill'|'collect'|'boss', target: string, count?: number, map?: string, text: string, from?: 'spot'|string }` (`from` bei `collect`: `'spot'` = Fundort-Art, sonst Gegnerart, deren Kills mit Chance `QUEST_DROP = 0.5` ein Stück geben).
  - Kennungen nach §10.4: `nasse_pfoten`, `schmied_ohne_hammer`, `bruecke_zu`, `flugblaetter`, `zwickzwack`, `verbuddelt`, `post_amsel`, `hamsterkauf`.
  - `DIALOGUES[npcId] = { offer: Record<questId, string[]>, progress: Record<questId, string[]>, done: Record<questId, string[]>, idle: string[] }`; Bewohner nach §10.1 (`panzerla`, `kruemel`, `grabowski`, `nussa`, `pieps`, `amsel`, dazu `flossian` für Flaschenpost-Text).
  - `STORY = { intro: { scene: number, lines: string[] }[], chapterEnd: { 1: {…} } }` (Szenen-Index in `szenen.webp`, Texte nach §4.1).
  - `QuestLog = Record<questId, { state: 'active'|'done', step: number, progress: number }>`
  - `npcState(log, npcId): 'offer'|'turnIn'|'none'` (für „!“ und „?“)
  - `talkTo(log, npcId): { lines: string[], speaker: string, offer?: questId, completes?: questId }` — rein lesend
  - `acceptQuest(log, questId): boolean`
  - `questEvent(log, event): { advanced: questId[], completed: questId[] }` mit `event` = `{type:'talk', npc}` | `{type:'reach', place}` | `{type:'kill', enemyType}` | `{type:'collect', thing}` | `{type:'boss', bossId}`; ändert `log`.
  - `trackedQuest(log, chosen: string|null): string|null` — gewählter laufender, sonst erster laufender Hauptauftrag.
  - `questTarget(log, questId, maps): { map, x, z } | null` — für Stern und Pfeil.
  - Hauptaufträge werden beim Gespräch ohne Wahl angenommen; Nebenaufträge brauchen `acceptQuest`.

- [ ] **Step 1: Failing tests:** jede Schrittart; Voraussetzungen sperren; Belohnung nur einmal (zweites `questEvent` nach Abschluss ändert nichts); `talkTo` ändert `log` nicht; ganzer Ablauf Kapitel 1: Ereignisfolge aller fünf Hauptaufträge führt zu `zwickzwack.state === 'done'`; jede `target`-Kennung existiert in `MAPS`, `ENEMIES` oder `DIALOGUES`; jedes Gespräch hat höchstens 90 Zeichen je Satz.
- [ ] **Step 2:** FAIL, implementieren, grün.
- [ ] **Step 3: Commit** `feat: chapter 1 quests, dialogues and story texts`

### Task 7: Spielstand Version 4 und Spielstand-Funktionen des Abenteuers

**Files:**
- Modify: `src/save/schema.js`, `src/save/store.js` (Ausbessern vor `validate` in `read` und `importJson`), `src/save/store.js` `addHero` (`adventure: null`), `src/core/tavern.js`/`src/save/tavern.js` nur wenn `ITEMS`-Filter nötig
- Create: `src/save/adventure.js`
- Test: `tests/adventureSave.test.js` (neu), `tests/save.test.js`

**Interfaces:**
- Produces (Feldnamen verbindlich):
  - Spielstand: `itemLevels: Record<itemId, 1..5>`, `materials: { flussperle: number }`, `settings.buttonSide: 'left'|'right'`, `stats.campfireRests: number`.
  - Held: `adventure: AdventureRecord | null` mit
    ```text
    AdventureRecord = { level, xp, skillPoints, abilities: Record<abilityId, 1..5>, buttons: [string|null ×3],
      equipment: { kopf, koerper, fuesse, waffe, schmuck } (Kennung|null), potions: 0..4,
      mapId, campfireId, campfires: string[], quests: QuestLog, trackedQuest: string|null,
      bosses: string[], chests: string[], found: string[], questItems: Record<string, number>,
      explored: Record<mapId, string>, introSeen: boolean, chapterDone: number[], unlocked: ('merchant'|'smith')[] }
    ```
  - `newAdventure(hero): AdventureRecord` — Level 1, Startfähigkeit Stufe 1, 2 Tränke, `mapId: 'dorf'`, `campfireId: 'dorf_platz'`.
  - `repairSave(data): data` — ändert nur `heroes[].adventure`, `itemLevels`, `materials`, `settings.buttonSide` nach §12.1; nie wirft es.
  - `commitAdventure(save, heroId, snapshot: { record: AdventureRecord, ledger: Ledger })` mit `Ledger = { gold: number, items: string[], materials: Record<string, number> }` — schreibt `record`, bucht Gold (nie unter 0), Gegenstände (Doppelte → Gold nach `RARITIES.resale`), Material; liefert `{ sold: { id, gold }[] }`.
  - `equipItem(save, heroId, slot, itemId|null): boolean` (Truhe, Platz, Waffenart je Klasse: `CLASS_WEAPON = { krieger: 'nahkampf', magier: 'zauber', dieb: 'wurf', hochstapler: null }` in `src/data/adventure.js`).
  - `smithCost(itemId, nextLevel): { gold, pearls }`, `upgradeItem(save, itemId): { ok, reason?: 'gold'|'pearls'|'max'|'missing' }`.
  - `buyPotion(save, heroId)`, `buyItem(save, itemId)`, `sellItem(save, itemId): { ok, reason?: 'equipped', by?: string }` (`by` = Heldenname), `shopStock(): string[]` (6 feste gewöhnliche Kennungen aus `SHOP` in `src/data/adventure.js`).
  - Zahlen in `src/data/adventure.js`: `POTION = { max: 4, heal: 0.4, lockSeconds: 2, price: 25, start: 2 }`, `SMITH = { stepPct: 0.2, gold: { gewoehnlich: [20,40,80,160,320], selten: [40,80,160,320,640], legendaer: [100,200,400,800,1600] }, pearls: [0,0,0,1,2] }`, `SHOP = { priceFactor: 5, stock: [...] }`.
- Store: `read()` und `importJson()` rufen nach `migrate` `repairSave` und erst dann `validate`.

- [ ] **Step 1: Failing tests:**
  - Umwandlung 3 → 4, 2 → 4, 1 → 4 ohne Verlust (Helden, Gold, Truhe, Erfolge gleich; `adventure === null`; `buttonSide === 'right'`).
  - Je Ausbesserungsfall aus §12.1 ein Test (unbekannte Kennung fällt weg; 7 Tränke → 4; Stufe 9 → 5; angelegtes Stück nicht in Truhe → abgelegt; Magier mit Nahkampfwaffe → abgelegt; unbekannte Karte → `dorf`/`dorf_platz`; unbekannter Schritt → letzter gültiger; `adventure: 'Unsinn'` → `newAdventure`), jeweils bleiben Helden, Gold, Truhe, Erfolge (Review Focus 5).
  - `commitAdventure` zweimal mit demselben Snapshot-Objekt: Der Aufrufer leert danach das Ledger; Test: erstes Commit +50 Gold, Ledger leeren, zweites Commit +0 (Review Focus 1).
  - Doppelter Fund wird verkauft; Gold nie negativ.
  - `equipItem` Waffenarten je Klasse, Hochstapler alles.
  - `upgradeItem`: Kosten, `gold`, `pearls`, `max`; `smithCost` laut Tabelle.
  - `sellItem` angelegt bei anderem Helden → `{ ok: false, reason: 'equipped', by: 'Hoppel' }`; verkauft → `itemLevels`-Eintrag weg.
  - `buyPotion` bis 4.
  - Import eines Version-3-Exports klappt.
- [ ] **Step 2:** FAIL, implementieren, grün; alle Tests grün.
- [ ] **Step 3: Commit** `feat: save version 4 with adventure records, repair, smith and merchant`

### Task 8: Abenteuer-Held: Level, Fähigkeiten von Hand, Werte

**Files:**
- Create: `src/core/adventureHero.js`
- Modify: `src/core/abilities.js`, `src/data/adventure.js`
- Test: `tests/adventureHero.test.js` (neu), `tests/abilities.test.js`

**Interfaces:**
- Produces:
  - `ADVENTURE_LEVEL = { max: 30, unlockAt: [2, 4, 6, 8], perLevel: { maxHp: 0.06, damage: 0.04 } }`, `xpToNextAdventure(level): number` (Kurve in Daten; Ziel: Level 10 am Ende von Kapitel 1 mit allen Aufträgen; im Test geprüft über Summe der Kapitel-XP aus Gruppen, Bossen, Aufträgen).
  - `MANUAL = { damageMul: 2.5, cooldownMul: 2.5, minCooldown: 6, orbitSeconds: 8, orbitCooldown: 16, buffSeconds: 8 }`.
  - `gainXp(record, amount): { levels: number }` (vergibt Punkte, schaltet Fähigkeiten nach `unlockAt` in `abilityPool`-Reihenfolge frei, legt neue auf ersten leeren Knopf).
  - `spendPoint(record, abilityId): boolean` (Stufe ≤ 5, nur freie oder Startfähigkeit).
  - `setButton(record, slot: 0|1|2, abilityId|null): boolean` (nur freie Nicht-Start-Fähigkeiten; dieselbe Fähigkeit höchstens einmal).
  - `adventureModifiers(save, hero): Modifier[]` = Levelzuwachs + Ausrüstung mit Verbesserung (`base × (1 + SMITH.stepPct × stufe)`, Rüstung auf ganze Zahl, Prozent auf ganze Prozent) + Dauerboni ohne `wiederbelebung`.
  - In `abilities.js`: `world.abilityMods?: { damageMul, cooldownMul, minCooldown, orbitSeconds, orbitCooldown, buffSeconds }` wirkt in `abilityParams` nur für Fähigkeiten mit `manual: true` am Helden; `HeroAbility` bekommt optional `manual?: boolean` und `gate?: 'engage'`. `stepAbilities` überspringt `manual`-Fähigkeiten beim Auslösen (zählt aber Abklingzeit herunter) und löst `gate: 'engage'` nur aus, wenn ein Gegner in `engageRange(def, params)` ist (Bogen/Linie/Ring: Radius bzw. Länge + 1,5; Geschoss/Kette/Zone: `range`). Neu exportiert: `castManual(world, index): boolean` (Abklingzeit muss 0 sein; bei Erfolg Abklingzeit setzen; Umlauf mit Ablaufzeit `orbitSeconds`, Stärkung mit Dauer `buffSeconds`).
  - Ohne `abilityMods` und ohne `manual`/`gate` bleibt alles wie heute (Wellen-Modus).

- [ ] **Step 1: Failing tests:** Level-up gibt Punkt, Freischaltung mit 2/4/6/8, neuer Knopf belegt; Punkte nur bis Stufe 5; Knopf doppelt abgelehnt; Werte mit Ausrüstung +3 (z. B. Rüstung +1 → +2 bei +5); Grundattacke ohne Gegner in Reichweite löst nicht aus, mit Gegner schon; `castManual` ohne Ziel → `false`, Abklingzeit unverändert; mit Ziel Schaden × 2,5; Umlauf endet nach 8 s; alle bisherigen Fähigkeitentests unverändert grün; Zielwert „nicht unter 20 s“: Held Level 5 mit Startausrüstung steht in Gruppe aus 6 Helmfischen Stufe 5, `stepWorld` ohne Fähigkeiten → lebt nach 20 s noch (Testwerte aus Daten).
- [ ] **Step 2:** FAIL, implementieren, grün.
- [ ] **Step 3: Commit** `feat: adventure levels, manual abilities and equipment stats`

### Task 9: Regelschicht `src/modes/adventure.js`

**Files:**
- Create: `src/modes/adventure.js`
- Modify: `src/core/world.js` (`enemy.passive` + `home`, `world.drops: 'survivor'|'none'`, Kill-Ereignis um `elite`, `boss`, `packId` ergänzt), `src/data/adventure.js` (`PACK = { aggro: 10, leash: 25, active: 40, wanderRadius: 4 }`, `DEATH = { goldPct: 0.05, goldMax: 200 }`, `INTERACT_RANGE = 2.2`, `AREA_SCALE = { hp: 0.18, damage: 0.12, xp: 0.15 }` je Stufe über 1)
- Test: `tests/adventure.test.js` (neu)

**Interfaces:**
- Consumes: Tasks 2–8.
- Produces:
  ```text
  createAdventureRun({ seed, hero: {animalId, classId, name}, record: AdventureRecord, modifiers: Modifier[], bankGold: number }) → AdventureRun
  AdventureRun = { world, map: MapDef, grid: MapGrid, record, ledger: Ledger, state: 'playing'|'paused'|'talking'|'dying'|'menu',
    packs: PackState[], events: object[], dirty: boolean, explored: Uint8Array, interactable: Interactable|null, potionLockUntil: number }
  stepAdventure(run, dt, input: {moveX, moveZ})
  useAbility(run, slot: 0|1|2): boolean
  drinkPotion(run): boolean
  interact(run): Interaction|null   // {kind:'talk', npc, …talkTo} | {kind:'campfire', id} | {kind:'spot', id} | {kind:'chest', id}
  acceptOffer(run, questId), endTalk(run), setPaused(run, bool), rest(run, campfireId), travel(run, campfireId)
  snapshot(run): { record, ledger }   // für commitAdventure; danach clearLedger(run)
  clearLedger(run)
  ```
  - `dirty` wird gesetzt bei: Auftragsschritt, Beute, Level-up, Rasten, Kiste, Fundort, Bosssieg, Tod, Reisen. Die Spielschleife speichert, wenn `dirty`, und setzt es zurück.
  - Gruppen nach §8.1; Bosse nach §8.4 (Tor `arena_*` schließt beim Betreten der Arena, öffnet bei Sieg oder Tod).
  - Drops nach §11.1 und §7.4 als Pickups (`item`, `potion_item`, `material`, `quest`, `gold`); Erfahrung direkt (`gainXp`), Stufe nach `AREA_SCALE`.
  - Tod nach §8.5: Sterbephase wie Wellen-Modus (`DYING`), dann Rückkehr zum Feuer, Goldverlust `min(goldMax, floor(goldPct × (bankGold + ledger.gold)))` als negatives Ledger-Gold, alle Gruppen zurück, Bosskampf von vorn.
  - Übergänge: Ausgang betreten → Karte wechseln, Held am Ziel-Feuer.
  - Aktionen in `paused`, `talking`, `menu`, `dying` tun nichts und liefern `false`/`null` (Review Focus 4).
  - Ereignisse in `run.events`: alle Welt-Ereignisse plus `levelUp`, `questAdvanced`, `questCompleted`, `loot`, `areaEnter`, `bossStart`, `bossDefeated`, `arenaClosed`, `arenaOpened`, `death`, `wake`, `rested`, `travel`, `mapChange`, `potion`, `abilityFail`.

- [ ] **Step 1: Failing tests:** passive Gruppe greift erst unter 10 m an; Leine bei 25 m heilt; fern über 40 m keine Gegner in `world.enemies`; besiegte Gruppe bleibt weg bis `rest`; Boss bleibt nach Sieg weg auch nach `rest`; Tod im Bossbereich: Tor offen, Boss voll, Held am Feuer (Review Focus 2); Goldverlust 5 % mit Deckel 200; Trank: voll → `false`, Sperre 2 s, Anzahl sinkt; Aktionen in Pause/Gespräch/Sterbephase → nichts (Review Focus 4); Kill eines Helmfischs zählt für `nasse_pfoten`; Fundort `hammer` mit `interact` → Auftrag weiter; Übergang Dorf → Kapitel 1 → zurück; `snapshot` + `clearLedger` liefert jedes Gold genau einmal; Erkundung wächst beim Laufen.
- [ ] **Step 2:** FAIL, implementieren, grün; alle Tests grün.
- [ ] **Step 3: Commit** `feat: adventure rules – packs, bosses, actions, death and campfires`

### Task 10: Darstellung der Karte, Leute und Bögen

**Files:**
- Create: `src/render/mapView.js`, `src/render/adventureSprites.js`
- Modify: `src/data/environment.js` (Ausschnitte `dorf.webp`, Pfade `wasser.webp`, `weg.webp`), `src/data/sprites.js` (Bögen `kapitel1`, `bewohner`, `beute1` als `deferred`), `src/render/enemies.js` nur falls neue Gegner eigene Ersatzformen brauchen
- Test: `tests/sprites.test.js` (Ausschnitte im Bild, Ersatz ohne Bild)

**Interfaces:**
- Produces: `createMapView(scene, map: MapDef, grid: MapGrid, { env, sprites, camera, seed }) → { update(run, camera), setGateOpen(id, open), dispose() }` — Boden gekachelt (vorhandene Graskachel), Weg-Kachel entlang `paths`, Wasser-Kachel mit langsam wanderndem Versatz, Rand-Deko aus `borderDecor` mit vorhandenen Baum- und Felsbildern, Häuser/Feuer/Brücke/Barrikade/Fundorte/Kisten aus `dorf.webp`, Leute als Bildtafeln mit „!“/„?“ darüber; nur Stücke im Umkreis von 60 m sichtbar. Ohne Bilder: einfache 3D-Formen (Würfelhäuser, blaue Fläche, brauner Streifen, Kegelbäume).
- `loadAdventureSheets(app): Promise<void>` lädt `kapitel1`, `bewohner`, `beute1`, `dorf`, `wasser`, `weg` erst beim ersten Betreten; Fehler fallen einzeln aus (wie `addSheet`).

- [ ] **Step 1:** Tests für Ausschnitte (alle Rechtecke im Bildmaß; fehlendes Bild → `ok: false` ohne Wurf).
- [ ] **Step 2:** Implementieren; im Browser mit `?debug=1` eine Testseite oder den fertigen Modus aus Task 13 nutzen – Prüfung im Browser erfolgt in Task 13.
- [ ] **Step 3: Commit** `feat: map rendering for village and chapter 1`

### Task 11: Anzeige im Spiel: Knopfviereck, Minikarte, Gespräche, Eingabe

**Files:**
- Create: `src/ui/adventureHud.js`, `src/ui/minimap.js`, `src/ui/dialogue.js`
- Modify: `src/input/keyboard.js`, `src/input/pointer.js` (Sperrflächen), `styles.css`
- Test: `tests/keyboard.test.js`, `tests/minimap.test.js` (neu, nur reine Rechnungen)

**Interfaces:**
- Produces:
  - `attachKeyboard(target, keyState, { onPause, onCardKey, onKey?: (code: string) => boolean })` — `onKey` bekommt alle übrigen Tasten (`Digit1–4`, `Numpad1–4`, `KeyE`, `Enter`, `Space`, `KeyM`, `KeyJ`); liefert es `true`, wird `preventDefault` gerufen. Bisheriges Verhalten unverändert.
  - `createAdventureHud(uiLayer, { side: 'left'|'right', onAbility(slot), onPotion(), onInteract(), onPause(), onMap() }) → { update(run, record), setSide(side), destroy() }` — Leben, Erfahrung, Level, Auftragszeile, Viereck 2 × 2 mit Abklingschatten, Trankzahl, Sprechen-Knopf („Sprechen“/„Rasten“/„Untersuchen“/„Öffnen“) über dem Viereck, Bossanzeige, Hinweis beim Betreten eines Gebiets, „Level 5!“-Einblendung, Beute-Einblendung, Knopf wackelt bei `abilityFail`.
  - `createMinimap(container, map, grid, { onOpen }) → { update(run, record, questTarget), drawBig(canvas) }` — Canvas, gesehene Zellen, Zeichen nach §6.4, Pfeil am Rand für ferne Ziele.
  - Reine Rechnung in `src/ui/minimap.js` (ohne DOM, getestet): `edgeArrow(heroX, heroZ, targetX, targetZ, halfSize): { x, y, angle } | null`.
  - `showDialogue(uiLayer, { speaker, portrait, lines, offer? }) → Promise<'accept'|'later'|'done'>` — Weiter mit Tippen, Klick, Leertaste, Enter; Wahl „Mach ich!“/„Später“; Fokus im Kasten.
  - Zeigersteuerung: Laufen beginnt nicht auf Viereck, Sprechen-Knopf, Minikarte, Pause-Knopf (`isBlocked` erweitert).
- [ ] **Step 1: Failing tests:** `keyboard: onKey bekommt Digit4 und KeyE, Bewegungstasten nicht`; `minimap: edgeArrow null innerhalb, sonst Randpunkt in Zielrichtung`.
- [ ] **Step 2:** FAIL, implementieren, grün.
- [ ] **Step 3: Commit** `feat: adventure HUD, minimap, dialogue box and keys`

### Task 12: Menüs: Pause, Ausrüstung, Fähigkeiten, Aufträge, Karte, Händler, Schmied, Lagerfeuer, Einstieg

**Files:**
- Create: `src/ui/adventureMenus.js`, `src/ui/equipment.js`, `src/ui/shop.js`, `src/ui/smith.js`
- Modify: `styles.css`, `src/data/texts.js` (Sprüche von Krümel, Grabowski, Bildschirmtexte)
- Test: `tests/adventureText.test.js` (neu, reine Textbausteine, z. B. Wertevergleich „Rüstung +1 → +2“)

**Interfaces:**
- Produces: `openPauseMenu(ctx)`, `openEquipment(ctx)`, `openAbilities(ctx)`, `openQuests(ctx)`, `openBigMap(ctx)`, `openShop(ctx)`, `openSmith(ctx)`, `openCampfire(ctx, campfireId)`, `playStory(ctx, panels)`; `ctx = { uiLayer, app, heroId, run, onClose() }`. Jede Seite ist mit Tippen, Klicken und Tastatur (Pfeile, Tab, Enter, Esc) bedienbar; Esc schließt. Spielstand-Änderungen nur über die Funktionen aus Task 7 und 8 via `app.update`, danach `run.record` aus dem gespeicherten Stand neu übernehmen (Händler/Schmied/Ausrüstung arbeiten auf dem gespeicherten Stand, nicht auf dem Lauf).
  - `itemDelta(currentId|null, candidateId, levels): string[]` in `src/ui/equipment.js` (rein, getestet).
- [ ] **Step 1: Failing tests** für `itemDelta` (gleich, besser, schlechter, leerer Platz).
- [ ] **Step 2:** FAIL, implementieren, grün.
- [ ] **Step 3: Commit** `feat: adventure menus – equipment, abilities, quests, map, merchant, smith, campfire`

### Task 13: Spielschleife und Einbindung

**Files:**
- Create: `src/adventureGame.js`
- Modify: `src/main.js` (`app.startAdventure(heroId)`), `src/ui/menus.js` (`renderMode`: Karte frei mit „Kapitel 1 · Level 7“ bzw. „Neues Abenteuer“), `src/ui/settings.js` (Knopfviereck links/rechts), `src/ui/screens.js` (`'adventure'`), `README.md` (Schalter `?mode=adventure` für `autostart`)
- Test: im Browser (siehe Schritte)

**Interfaces:**
- Consumes: alles Vorige.
- Produces: `startAdventure({ canvas, uiLayer, view, app, heroId, seed, quality, timeScale, debug, sprites, env, sfx }) → { stop(), setQuality(q) }` — fester Schritt 1/60 wie `src/game.js`; Kamera folgt dem Helden; bei `run.dirty` → `app.update((s) => commitAdventure(s, heroId, snapshot(run)))`, dann `clearLedger(run)`, `run.dirty = false`; beim Verlassen über das Pausenmenü ebenso. Beim ersten Betreten (`!record.introSeen`) läuft `playStory(STORY.intro)`. Bei `questCompleted` für `zwickzwack` → `record.chapterDone` bekommt 1, speichern, `playStory(STORY.chapterEnd[1])` („Fortsetzung folgt“). Händler und Schmied sind erst nach `unlocks` ihrer Aufträge ansprechbar (vorher ein kurzer Satz). Debug (`?debug=1`): Taste K besiegt Gegner in der Nähe, L gibt ein Level, `?speed=N` wie bisher.
- [ ] **Step 1:** Implementieren.
- [ ] **Step 2: Browserprüfung (390 × 844 und Desktop):** Held anlegen → Abenteuer → Einstieg → Dorf; mit Oma sprechen; Kapitel 1 betreten; Gruppe besiegen; Trank; Fähigkeit von Hand; Lagerfeuer rasten und reisen; Seite neu laden → am Feuer; sterben → am Feuer, Gold weniger; Händler, Schmied, Ausrüstung, Fähigkeiten, Aufträge, große Karte; Knopfviereck links/rechts. Je einmal **nur Tastatur**, **nur Maus**, **nur Touch-Emulation**. Konsole ohne Fehler (`read_console_messages`).
- [ ] **Step 3:** Ganzes Kapitel 1 einmal durchspielen (`?debug=1&speed=2` erlaubt) bis zur Abschlusstafel; Dauer ohne `speed` grob schätzen (Ziel 20–30 min) und Zahlen in `src/data/adventure.js` nachstellen, falls weit daneben.
- [ ] **Step 4:** Wellen-Modus einen Durchgang und Taverne eine Runde wie vorher.
- [ ] **Step 5: Commit** `feat: adventure mode playable – village and chapter 1`

### Task 14: Erfolge

**Files:**
- Modify: `src/data/achievements.js`, `src/core/achievements.js` (gespeicherte Prüfung liest `heroes[].adventure`, `itemLevels`, `stats.campfireRests`)
- Test: `tests/achievements.test.js`

**Interfaces:**
- Produces: Erfolge `trockene_pfoten` (ein Held hat `chapterDone` mit 1, 100 Gold), `meisterstueck` (ein Eintrag in `itemLevels` = 5, 50), `hilfsbereit` (ein Held hat alle drei Nebenaufträge `done`, 50), `lagerfeuerromantik` (`stats.campfireRests ≥ 20`, 25); Sprüche nach §13. Nach jedem `commitAdventure` und nach Schmied/Händler wird `unlockStored` gerufen und neue eingeblendet.
- [ ] **Step 1: Failing tests** je Erfolg; alte Erfolge unverändert (Anzahl 37 + 4 = 41).
- [ ] **Step 2:** FAIL, implementieren, grün.
- [ ] **Step 3: Commit** `feat: four adventure achievements`

### Task 15: Bild-Beschreibungen, Doku, Gesamtprüfung

**Files:**
- Create: `docs/abenteuer-bilder.md` (Anhang A unten, für den Auftraggeber)
- Modify: `README.md` (Abenteuer-Modus, Steuerung 1–4/E/M/J, Knopfviereck, Speichern-Hinweis, Version, Bilder-Tabelle), `docs/UEBERGABE.md` (Stand, Entscheidungen, zurückgestellte Kleinigkeiten, nächste Etappe)
- [ ] **Step 1:** `docs/abenteuer-bilder.md` aus Anhang A anlegen.
- [ ] **Step 2:** README und Übergabe aktualisieren.
- [ ] **Step 3:** Alle Tests grün (Zahl notieren); frischer Prüfer über alle Commits dieser Etappe (`superpowers:requesting-code-review`); wichtige Befunde beheben.
- [ ] **Step 4: Commit und Push** `docs: adventure stage 1 – readme, handover, image prompts`; `git push origin main`.

---

## Anhang A – Bild-Beschreibungen (für `docs/abenteuer-bilder.md`)

Style block (append to every prompt): *Delicate watercolor painting with fine colored-pencil and ink lines, children's book illustration drawn from nature, muted natural colors, plain pure white background, no cast shadows, no text, no frame. Characters face right.*

1. **`assets/abenteuer/bewohner.webp`** (square, about 1536 × 1024, six full-body figures in a 3 × 2 grid, generous white space between them, none touching): (1) an old wise tortoise grandmother with round spectacles, a knitted shawl and a walking stick; (2) a plump cheerful hamster shopkeeper with a striped apron, cheeks stuffed full, holding a small sack; (3) a sturdy mole blacksmith with a leather apron, tiny round goggles pushed up on his forehead, holding tongs; (4) a lively red squirrel girl with a satchel full of nuts; (5) a small chirpy house sparrow with a postman's cap and a letter in his beak; (6) an elegant blackbird aunt with a lace collar and a tiny hat.
2. **`assets/figuren/kapitel1.webp`** (square 1254 × 1254, grid 3 × 2, none touching): (1) a small perch fish standing on two little frog legs, wearing an old brass diving helmet filled with water; (2) a river crayfish raising both claws, looking grumpy; (3) a green frog wearing a helmet made of pond weed, crouching to jump; (4) a big pike in a brass diving helmet with a small curved sabre, standing upright on stubby legs, captain's sash; (5) a huge crayfish commander wearing a bicorne hat and a medal, claws raised; (6) a pompous goldfish in a round glass bowl carried on a tiny sedan chair by two small crabs, the goldfish wearing a little crown.
3. **`assets/abenteuer/dorf.webp`** (square 1536 × 1536, objects in a loose grid, none touching): a round cottage with a mossy roof (the tortoise's house), a small shop hut with a striped awning and sacks, a blacksmith's hut with an anvil and a chimney, two small cosy woodland cottages, a stone well with a wooden roof, a campfire unlit (stacked logs and stones), the same campfire burning, a short wooden footbridge seen from the side, a barricade of driftwood and fishing nets, a wooden signpost, a short wooden fence piece, a small heap of earth with a few hazelnuts peeking out, a crumpled paper leaflet nailed to a stick.
4. **`assets/abenteuer/wasser.webp`** (square 1024 × 1024, **seamless tileable texture, top-down view, painted, no white background**): clear shallow woodland stream water seen from above, soft ripples, a few pebbles shimmering through, muted blue-green.
5. **`assets/abenteuer/weg.webp`** (square 1024 × 1024, **seamless tileable texture, top-down view, no white background**): a soft brown earth footpath seen from above with small pebbles, a few dry leaves and faint paw prints.
6. **`assets/abenteuer/beute1.webp`** (square 1536 × 1280, grid of 6 columns × 5 rows, equal cells, each item centered with space): die 30 Gegenstände in der Reihenfolge von `icon` 0–29 aus `src/data/items.js` (die Liste mit englischer Beschreibung je Gegenstand schreibt Task 5 in diesen Anhang, sobald die Namen feststehen).
