# Neue Gegner und wechselnde Bosse – Bauplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sechs neue Gegner und drei neue Bosse im Wellen-Modus; je Durchgang drei verschiedene Bosse aus vier, jeder mit eigenem Nah- und Fernangriff; eingeschlossenes Papierweiß der neuen Bögen wird entfernt; zehn neue Erfolge.

**Architecture:** Werte in `src/data/`, Verhalten als neue Einträge in `BEHAVIORS` (`src/core/world.js`); die feste Bärenlogik wird zu einem datengetriebenen Boss-Baukasten (`BOSS_MOVES`) mit vier Angriffsformen (`swipe`, `leap`, `ring`, `dash`). Bossfolge zieht `src/modes/survivor.js` mit eigenem Zufallsgeber aus dem Seed. Darstellung liest den Weltzustand nur.

**Tech Stack:** Browser-ES-Module ohne Build, Three.js 0.170 aus `vendor/`, eigene Testseite `tests.html` (`tests/runner.js`: `test`, `assertEqual`, `assertClose`, `assertTrue`).

**Spec:** `docs/superpowers/specs/2026-11-13-neue-gegner-und-bosse-design.md` (freigegeben 2026-11-13). Alle Zahlen stehen dort; dieser Plan nennt nur, wo sie hinkommen.

## Global Constraints

- Regeln aus `docs/UEBERGABE.md` Abschnitt 4 gelten: Logik ohne Three.js/`window`/`document`/`Date.now()`, Zufall nur über `createRng`/`world.rng`; Darstellung ändert den Weltzustand nie; alle Zahlen in `src/data/`; Text nur über `textContent`, Deutsch; Pfade relativ
- Spielstand-Format bleibt (keine neue Version); keine Erfolgs-Kennung darf wegfallen
- `world.rng` darf durch die Bossauswahl nicht verbraucht werden
- Der Bär kämpft genau wie heute; die vorhandenen Bärentests in `tests/survivor.test.js` (Sprung, Prankenhieb) bleiben unverändert grün
- Tests: Server `python3 tools/serve.py 8080` (bzw. `preview_start` mit Namen `animalwarrior`), `http://localhost:8080/tests.html`, bestanden heißt `window.__testResults.failed === 0`; `?filter=<text>` grenzt ein. Bei „does not provide an export named …“ zwischen `localhost` und `127.0.0.1` wechseln
- Commits direkt auf `main`, Autor `Spandro <Spandro@users.noreply.github.com>`: `git -c user.name=Spandro -c user.email=Spandro@users.noreply.github.com commit …`; nur eigene Dateien stagen (parallel arbeitet eine Taverne-Sitzung in `docs/superpowers/` und `docs/UEBERGABE.md`)
- Limit-Regel: vor jedem Subagenten Verbrauch prüfen; ab ~85–90 % eines Fensters laufenden Schritt abschließen, committen, pushen, Stand in `docs/UEBERGABE.md` festhalten

## Review Focus

1. Igel unter Dauerbeschuss (z. B. Dornenkranz/Umlauf trifft jede Zehntelsekunde): er darf nicht dauerhaft eingerollt bleiben – nach Ende der Rolle 1,5 s Abklingzeit (Test in Aufgabe 3)
2. Gift mit ausgewichenem Biss oder während Unverwundbarkeit: kein Gift, wenn der Berührungstreffer nicht durchkam (Test in Aufgabe 4)
3. Held stirbt vergiftet und wird wiederbelebt: Gift ist danach weg, kein Tick tötet ihn gleich wieder (Test in Aufgabe 4)
4. Ansturm eines Bosses durch den stehenden Helden: höchstens ein Ansturmtreffer je Ansturm, auch wenn der Boss mehrere Schritte am Helden klebt (Test in Aufgabe 6)
5. Durchgang endet, während ein Boss mitten in einer Ansturm-Serie ist bzw. der letzte Boss ein anderer als der Bär ist: Sieg bei seinem Tod wie heute (Test in Aufgabe 7)

---

### Task 1: Freistellen mit Startpunkten, neue Bögen

**Files:**
- Modify: `src/render/sprites.js` (`removeBackground`, `prepareSheet`, `loadSpriteSheets`)
- Modify: `src/data/sprites.js` (`SHEETS`, `SHEET_HOLES`, Typ `SpriteDef.sheet`)
- Test: `tests/sprites.test.js`

**Interfaces:**
- Produces: `removeBackground(img, { threshold, feather }, seeds = [])`, `seeds: Array<[number, number]>` (Bogenkoordinaten x, y); `prepareSheet(image, holes = [])`; `SHEET_HOLES: Record<string, Array<[number, number]>>`; `SHEETS.gegner2`, `SHEETS.bosse`; `SpriteDef.sheet: 'helden'|'gegner'|'gegner2'|'bosse'`

- [ ] **Step 1: Failing tests** in `tests/sprites.test.js`:
  - `sprites: removeBackground entfernt eingeschlossenes Weiß nur mit Startpunkt` – künstliches Bild 12×12: weißer Rand, dunkler Ring, zwei eingeschlossene weiße 2×2-Flächen A und B. Aufruf mit `seeds = [[xA, yA]]`: Alpha in A = 0, Alpha in B = 255, Alpha im Ring = 255. Ohne Seeds: A und B = 255 (der vorhandene Test bei Zeile 32 bleibt)
  - `sprites: Startpunkt auf dunklem Pixel ändert nichts` – Seed auf dem Ring: Ring bleibt 255
  - `sprites: SHEET_HOLES enthält die sieben Punkte aus der Bilder-Doku` – `assertEqual(SHEET_HOLES, { gegner2: [[290, 921], [753, 516], [172, 904]], bosse: [[198, 427], [302, 1011], [296, 165], [388, 127]] })`; jeder Bogen in `SHEET_HOLES` steht in `SHEETS`
- [ ] **Step 2:** Tests laufen lassen (`tests.html?filter=sprites`), erwartet FAIL
- [ ] **Step 3: Implementieren.** Seeds laufen durch dieselbe `seed(i)`-Funktion wie die Randpixel (Schwelle prüft sie schon), danach unveränderte Füllung und Saum. `prepareSheet` reicht `holes` durch; `loadSpriteSheets` übergibt `SHEET_HOLES[id] || []`. `SHEETS` um `gegner2: 'assets/figuren/gegner2.webp'`, `bosse: 'assets/figuren/bosse.webp'` ergänzen
- [ ] **Step 4:** Tests grün, Gesamtlauf grün
- [ ] **Step 5: Commit** `feat: fill enclosed paper white from per-sheet seed points`

### Task 2: Daten und Bilder der sechs neuen Gegner

**Files:**
- Modify: `src/data/enemies.js` (Einträge, Feld `name` für alle, `venom` beim Otter, `SLITHER`, `CURL`, `VENOM`, `POUNCE` als Konstanten mit Spec-Werten)
- Modify: `src/data/waves.js` (`unlockMinute`, `weights`)
- Modify: `src/data/sprites.js` (`ENEMY_SPRITES`, `MOTION.slither`, `MotionId`)
- Modify: `src/render/enemies.js` (3D-Ersatzformen über Zuordnung)
- Test: `tests/sprites.test.js`, `tests/survivor.test.js`

**Interfaces:**
- Produces: `EnemyDef` mit `name: string` und optional `venom?: boolean`; Kennungen `fuchs, igel, dachs, kreuzotter, uhu, luchs`; Verhalten `fuchs: 'strafe'`, `igel: 'curl'`, `dachs: 'chase'`, `kreuzotter: 'slither'`, `uhu: 'charge'` mit `flying: true`, `luchs: 'pounce'` (bis Aufgabe 3–5 fallen `curl`/`slither`/`pounce` auf `chase` zurück); `CURL = { duration: 2.5, damageTaken: 0.2, speedMul: 3, cooldown: 1.5 }`, `SLITHER = { lateral: 0.8, switchInterval: 0.6 }`, `VENOM = { duration: 4, tick: 0.5, dpsMul: 0.5 }`, `POUNCE = { engageRange: 8, crouch: 0.8, leapTime: 0.5, radius: 1.2, cooldown: 3, damageMul: 1 }`
- Namen: Ratte, Wildschwein, Krähe, Giftkröte, Wolf, Bär, Fuchs, Igel, Dachs, Kreuzotter, Uhu, Luchs

- [ ] **Step 1: Failing tests:**
  - `sprites: alle Gegnerausschnitte liegen im Bogen` – für jeden Eintrag in `ENEMY_SPRITES`: `x ≥ 0, y ≥ 0, x + w ≤ 1254, y + h ≤ 1254` (alle vier Bögen sind 1254 × 1254); Ausschnitte der sechs neuen genau wie in `docs/neue-gegner-bilder.md`
  - `survivor: jeder Nicht-Boss hat Freischaltminute und Gewicht, jeder Gegner einen Namen` – Werte aus Spec Abschnitt 2 per `assertEqual` auf `unlockMinute` und `weights`
  - vorhandener Test „jeder Gegnertyp hat ein Bild“ deckt die neuen automatisch ab
- [ ] **Step 2:** FAIL bestätigen
- [ ] **Step 3: Implementieren** mit den Spec-Werten (Tabelle Abschnitt 2, Aussehen-Tabelle, `MOTION.slither = { freq: 1.6, bob: 0, tilt: 0.08, squash: 0.06 }`). 3D-Ersatz: Zuordnung `FALLBACK_SHAPE = { fuchs: 'wolf', luchs: 'wolf', dachs: 'wildschwein', keiler: 'wildschwein', igel: 'ratte', kreuzotter: 'ratte', uhu: 'kraehe', hirsch: 'baer', wisent: 'baer' }` in `src/render/enemies.js`, skaliert mit `ENEMIES[type].radius / ENEMIES[form].radius`
- [ ] **Step 4:** Tests grün, Gesamtlauf grün (Wellen-Tests mit festem Seed können andere Typen ziehen – Erwartungen nur dort anpassen, wo sie an der alten Gewichtssumme hängen, und das im Commit nennen)
- [ ] **Step 5: Commit** `feat: add fox, hedgehog, badger, adder, owl and lynx data and sprites`

### Task 3: Igel rollt sich ein (`curl`)

**Files:**
- Modify: `src/core/world.js` (`BEHAVIORS.curl`, `damageEnemy`, Export `isCurled`)
- Modify: `src/render/enemies.js` (Drehen um die Bildmitte, leicht gestaucht, solange `isCurled`)
- Test: `tests/world.test.js`

**Interfaces:**
- Produces: `isCurled(world, enemy): boolean`; Zustand in `enemy.ai.curledUntil`, `enemy.ai.curlReadyAt`

- [ ] **Step 1: Failing tests:**
  - `world: Igel rollt sich nach einem Treffer ein; der auslösende Treffer zählt voll` – `damageEnemy(w, igel, { amount: 5, crit: false }, 'x')`: `hp === 15`, `isCurled === true`
  - `world: eingerollter Igel nimmt ein Fünftel Schaden und rollt dreimal so schnell` – zweiter Treffer 5 → `hp === 14`; Strecke in 0,5 s ≈ `3 × speed × 0,5`
  - `world: nach 2,5 s entrollt, 1,5 s Abklingzeit` – Treffer jede 0,1 s über 6 s: `isCurled` ist zwischen 2,5 und 4,0 s nach dem ersten Treffer false, ab dem nächsten Treffer danach wieder true; in diesem Fenster zählt Schaden voll
- [ ] **Step 2:** FAIL bestätigen
- [ ] **Step 3: Implementieren.** In `damageEnemy` vor dem Abziehen: eingerollt → `amount × CURL.damageTaken` (auch im `hit`-Ereignis und `damageByAbility`); nicht eingerollt und `time ≥ curlReadyAt` → `curledUntil = t + duration`, `curlReadyAt = t + duration + cooldown`. `BEHAVIORS.curl`: eingerollt → wie `chase` mit `speedMul`, sonst `chase`
- [ ] **Step 4:** Tests grün, Gesamtlauf grün
- [ ] **Step 5: Commit** `feat: hedgehog curls into a rolling ball when hit`

### Task 4: Kreuzotter schlängelt und vergiftet

**Files:**
- Modify: `src/core/world.js` (`BEHAVIORS.slither`, `strafe` auf gemeinsame Hilfsfunktion mit Parametern, `damageHero` Rückgabe und Option, Gift im Berührungsschaden und je Schritt)
- Modify: `src/modes/survivor.js` (Wiederbelebung setzt `hero.poison = null`)
- Modify: `src/game.js`, `src/render/effects.js`, `src/audio/sfx.js` (Gifttreffer: kein Aufblitzen, kein Wackeln, kein Rand-Rot, kein Ton)
- Modify: `src/render/hero.js`, `src/data/sprites.js` (`HERO_POISON_TINT = [0.62, 1, 0.55]`; Aufblitzen hat Vorrang)
- Test: `tests/world.test.js`, `tests/survivor.test.js`, `tests/sfx.test.js`

**Interfaces:**
- Produces: `damageHero(world, rawAmount, { poison = false } = {}): boolean` (true, wenn Schaden ankam); Ereignis `heroHit` mit `poison: true` nur bei Gift; `hero.poison: { until: number, dps: number, nextTick: number } | null` (in `createWorld` mit `null`)

- [ ] **Step 1: Failing tests:**
  - `world: Otterbiss vergiftet: 8 Ticks zu je 0,5 × Schaden × 0,5` – Held ohne Rüstung/Ausweichen, ein Berührungstreffer, dann Otter entfernen; über 5 s genau 8 `heroHit` mit `poison: true`, je `amount ≈ 1.5`
  - `world: neuer Biss frischt Gift auf, stapelt nicht` – zweiter Biss nach 2 s: Ticks enden 4 s nach dem zweiten Biss; nie zwei Gift-Ticks im selben Halbsekundenfenster
  - `world: ausgewichener oder abgeprallter Biss vergiftet nicht` – `hero.invulnerableUntil = Infinity` bzw. Ausweichen 1: `hero.poison === null`
  - `survivor: Wiederbelebung hebt Gift auf`
  - `world: Kreuzotter wechselt die Seite alle 0,6 s` (wie der vorhandene Krähentest, mit `SLITHER`)
  - `sfx: Gifttreffer spielt keinen Ton`
- [ ] **Step 2:** FAIL bestätigen
- [ ] **Step 3: Implementieren.** Gift wird nur gesetzt, wenn `damageHero` beim Biss `true` liefert: `until = t + duration`, `dps = max(alt, VENOM.dpsMul × e.damage)`, `nextTick = t + tick` (nur neu setzen, wenn kein Gift lief). Ticks in `stepWorld` nach dem Berührungsschaden; nach `until` → `null`. Grüne Tönung: `heroView` bekommt `poisoned = !!world.hero.poison`
- [ ] **Step 4:** Tests grün, Gesamtlauf grün
- [ ] **Step 5: Commit** `feat: adder slithers and poisons on bite`

### Task 5: Luchs springt an (`pounce`)

**Files:**
- Modify: `src/core/world.js` (`BEHAVIORS.pounce`)
- Test: `tests/survivor.test.js` (bei den anderen Verhaltenstests mit `behaviorWorld`)

**Interfaces:**
- Consumes: `POUNCE`; Ereignis `bossTelegraph` mit `kind: 'leap'` (die Darstellung zeichnet den Kreis schon)
- Produces: Phasen in `enemy.ai.phase`: `'chase' | 'crouch' | 'leap'`

- [ ] **Step 1: Failing tests:**
  - `survivor: Luchs duckt sich in 8 Abstand und kündigt den Sprung an` – Luchs bei (12, 0), Held still: ein `bossTelegraph` mit `kind 'leap'`, `radius 1.2`, `delay 1.3` (crouch + leapTime) an der Heldenposition; während des Duckens bewegt er sich nicht
  - `survivor: Luchs trifft bei der Landung im Kreis, sonst nicht` – Kontaktschaden aus (`contactReadyAt = Infinity`); stehen bleiben → genau ein Treffer mit `amount = damage`; nach der Ankündigung Held auf (−20, 0) → kein Treffer; Luchs steht nach der Landung am Zielpunkt
  - `survivor: nach dem Sprung 3 s kein neuer Sprung`
  - `survivor: Betäubung beim Ducken bricht den Sprung ab`
- [ ] **Step 2:** FAIL bestätigen
- [ ] **Step 3: Implementieren.** Sprung bewegt den Luchs gleichmäßig von Start zu Ziel über `leapTime`; Abbruch, wenn `enemy.stunnedUntil > ai.crouchStart`
- [ ] **Step 4:** Tests grün, Gesamtlauf grün
- [ ] **Step 5: Commit** `feat: lynx crouches and pounces with a ground warning`

### Task 6: Boss-Baukasten und die drei neuen Bosse

**Files:**
- Modify: `src/data/enemies.js` (`BOSS_MOVES`, `BOSS` bleibt als bisheriges Objekt und speist `BOSS_MOVES.baer`; `ENEMIES.hirsch/keiler/wisent`)
- Modify: `src/data/sprites.js` (Ausschnitte und Aussehen der drei Bosse)
- Modify: `src/core/world.js` (Boss-Verhalten liest `BOSS_MOVES[enemy.type]`; Formen `ring`, `dash`; `pushHero`)
- Modify: `src/render/effects.js` (Ankündigung `ring` als Kreis um den Boss, `dash` als Streifen; `halfAngle`-Ersatz aus `BOSS_MOVES.baer.near`)
- Modify: `src/render/enemies.js` (`type === 'baer'` → `ENEMIES[type].behavior === 'boss'` für Platz und Wippen)
- Test: `tests/survivor.test.js`

**Interfaces:**
- Produces: `BOSS_MOVES: Record<'baer'|'keiler'|'hirsch'|'wisent', { chaseTime, recover, triggerRange, near: BossAttack, far: BossAttack }>`; `BossAttack` = `{ kind: 'swipe', reach, halfAngle, windup, damageMul } | { kind: 'leap', radius, windup, damageMul } | { kind: 'ring', reach, windup, damageMul, push } | { kind: 'dash', length, width, windup, dashTime, damageMul, count, gap }`; `bossTelegraph` für `ring`: `{ kind, x, z, radius, delay, damageMul, push }` (x, z = Boss), für `dash`: `{ kind, x, z, dirX, dirZ, length, width, delay, damageMul }`; `pushHero(world, dirX, dirZ, distance)` in Teilstrecken `KNOCKBACK_SUBSTEP` mit Hinderniskollision
- Werte: Spec Abschnitt 3 (Tabelle und Block „Startwerte“); alle drei Bosse `hp 1500, damage 25, xp 100, behavior 'boss'`

- [ ] **Step 1: Failing tests:**
  - `survivor: jeder Boss hat Nah- und Fernangriff` – `Object.keys(BOSS_MOVES)` = die vier, `near.kind`/`far.kind` wie Spec; `BOSS_MOVES.baer` entspricht `BOSS`
  - `survivor: Röhren trifft im Ring und stößt weg` – Hirsch bei (3, 0): Ankündigung `ring` mit `radius = 1.3 + 4`; Held bleibt → ein Treffer, danach Abstand zum Hirsch um ≈ 4 größer; Held vorher auf (−20, 0) → kein Treffer
  - `survivor: Stampfen stößt nicht weg` (Wisent, `push 0`)
  - `survivor: Geweih-Ansturm läuft 18 und trifft höchstens einmal` – Hirsch bei (25, 0): Ankündigung `dash`, `length 18`; nach `windup + dashTime` hat er ≈ 18 zurückgelegt; Held in der Bahn → genau ein Ansturmtreffer `25 × 1.6` (Kontaktschaden aus)
  - `survivor: Keiler stürmt dreimal mit je eigener Ankündigung` – drei `dash`-Ankündigungen, die zweite und dritte neu auf den Helden ausgerichtet
  - Bär-Tests bleiben unverändert
- [ ] **Step 2:** FAIL bestätigen
- [ ] **Step 3: Implementieren.** Ablauf: `chase` (chaseTime) → Nahangriff, wenn Held ≤ `radius + triggerRange`, sonst Fern → Ankündigung → Wirkung → `recover`. `dash`-Phasen `dashWindup → dashing → dashGap` (bei Rest-`count`) → `recover`; Treffer im Ansturm, wenn Abstand ≤ `e.radius + hero.radius + CONTACT_TOLERANCE` und `ai.dashHit` noch false. Darstellung: Streifen ab (x, z) in Richtung, Länge × Breite, Füllung wächst wie beim Kreis
- [ ] **Step 4:** Tests grün, Gesamtlauf grün
- [ ] **Step 5: Commit** `feat: data-driven boss moves with ring and dash, add stag, boar and bison`

### Task 7: Wechselnde Bosse, Namen und Texte

**Files:**
- Modify: `src/data/waves.js` (`BOSS_POOL = ['baer', 'hirsch', 'keiler', 'wisent']`, `BOSS_ORDER_SALT = 0x5b0551`, Kommentar zu `BOSS_HP_MUL`)
- Modify: `src/modes/survivor.js` (Export `bossOrder(seed): string[]`, `run.spawn.bossOrder`, Setzen mit `ENEMIES[type].radius`, Ereignis `bossSpawn` mit `enemyType`)
- Modify: `src/ui/hud.js` (Name aus `ENEMIES[b.type].name` statt `BOSS_NAME`)
- Modify: `src/ui/menus.js:175`, `src/ui/result.js:54`, `src/data/texts.js` (Texte genau wie Spec Abschnitt 3 „Texte“)
- Test: `tests/survivor.test.js`

**Interfaces:**
- Produces: `bossOrder(seed)` – Fisher-Yates über eine Kopie von `BOSS_POOL` mit `createRng(seed ^ BOSS_ORDER_SALT)`, liefert die ersten drei; `bossSpawn`: `{ type: 'bossSpawn', index, enemyType }`

- [ ] **Step 1: Tests anpassen und ergänzen:**
  - die zwei Tests „bei 300 s und 600 s erscheint je ein Bär …“ und „bei 900 s dritter Bär …“ prüfen statt `'baer'` die Typen `bossOrder(seed)[i]`; `bossSpawn` mit `enemyType`
  - `survivor: bossOrder liefert drei verschiedene Bosse, gleich bei gleichem Seed` – Seeds 1…200: Länge 3, alle verschieden, alle im Pool; jeder Boss kommt an jeder der drei Stellen mindestens einmal vor
  - `survivor: Bossauswahl verbraucht world.rng nicht` – `createSurvivorRun` mit Seed s: `world.rng.next()` gleich dem ersten Wert eines frischen `createWorld` mit s
  - `survivor: Tod des letzten Bosses gewinnt auch, wenn er kein Bär ist` – Seed suchen, dessen `bossOrder[2] !== 'baer'`
- [ ] **Step 2:** FAIL bestätigen
- [ ] **Step 3: Implementieren**
- [ ] **Step 4:** Tests grün, Gesamtlauf grün
- [ ] **Step 5: Commit** `feat: three different bosses per run, boss names in the HUD`

### Task 8: Erfolge

**Files:**
- Modify: `src/data/achievements.js`
- Test: `tests/achievements.test.js`, `tests/save.test.js`

**Interfaces:**
- Consumes: Kennungen der neuen Gegner und Bosse
- Produces: zehn neue Erfolge mit Kennung, Titel, Bedingung, Satz, Gold genau wie Spec Abschnitt 4, eingereiht hinter „Bärenhunger“ (Gegner-Erfolge) bzw. dahinter (Boss-Erfolge, dann `grosswildjaeger`); `baerenhunger.check = killed('baer', 2)`, Bedingung „Besiege insgesamt zwei Bären“

- [ ] **Step 1: Tests anpassen:** Anzahl 23 → 33; Texttabelle um die zehn ergänzen, „Bärenhunger“ neue Bedingung; Grenzfälle je neuem Erfolg (n−1 nicht erfüllt, n erfüllt; `grosswildjaeger` mit drei von vier Bossen nicht erfüllt); `save: Stand mit Tötungen der neuen Tiere und den neuen Erfolgen ist gültig`; `save: alter Stand mit baerenhunger bleibt gültig`
- [ ] **Step 2:** FAIL bestätigen
- [ ] **Step 3: Implementieren**
- [ ] **Step 4:** Tests grün, Gesamtlauf grün
- [ ] **Step 5: Commit** `feat: ten achievements for the new enemies and bosses`

### Task 9: Im Browser prüfen, abstimmen, Übergabe

**Files:**
- Modify (nur bei Bedarf): `src/data/sprites.js` (heightM, footOffset), `src/data/enemies.js` (lesbare Ankündigungen)
- Modify: `docs/UEBERGABE.md` (vorher frisch lesen; Abschnitt 1 „Was fertig ist“, Wunschliste, Teststand), `docs/neue-gegner-bilder.md` (Kopf: eingebaut)

- [ ] **Step 1:** Spiel mit `?debug=1&autostart=1` starten; mit `?speed=` und Tasten K/L zu den Minuten 1–10 springen und jedes neue Tier ansehen: steht auf dem Boden, Größe passend zu Ratte/Wolf, **kein weißer Fleck auf Gras** (Otter-Schlinge, Dachskinn); Ente zeigt weiter weiße Federn
- [ ] **Step 2:** Alle drei neuen Bosse ansehen (Seed mit passender `bossOrder` oder Konsole): kein weißer Fleck zwischen Hirschbeinen, im Geweih, zwischen Wisentbeinen; Ring und Streifen gut lesbar; Igel rollt sichtbar, Held schimmert vergiftet grün, Luchs-Kreis erscheint vor dem Sprung
- [ ] **Step 3:** Höhe/Standpunkt bei Bedarf nachstellen, Gesamtlauf `tests.html` grün, Bildschirmfoto als Beleg
- [ ] **Step 4:** `docs/UEBERGABE.md` und `docs/neue-gegner-bilder.md` aktualisieren
- [ ] **Step 5: Commit und Push** `docs: new enemies and bosses are in, handover updated`; `git push origin main`
