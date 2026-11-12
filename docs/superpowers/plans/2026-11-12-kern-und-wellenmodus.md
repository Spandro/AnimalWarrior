# Kern und Wellen-Modus – Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein im Browser spielbares 3D-Spiel, in dem man einen Tier-Helden mit Klasse anlegt, einen 15-Minuten-Durchgang im Wellen-Modus spielt, Gold für Dauerboni ausgibt und den Stand behält.

**Architecture:** Spiellogik (`src/core`, `src/modes`, `src/data`, `src/save`) ist reines JavaScript ohne Three.js und ohne DOM und rechnet in festen Schritten von 1/60 s. Darstellung (`src/render`), Oberfläche (`src/ui`) und Ton (`src/audio`) lesen den Zustand und reagieren auf eine Ereignisliste pro Schritt; sie ändern den Zustand nie direkt.

**Tech Stack:** JavaScript ES-Module ohne Build, Three.js 0.170.0 als Datei in `vendor/`, eigener Testläufer in `tests.html`, PowerShell-Webserver für lokal, `localStorage`, Web Audio.

**Spec:** `docs/superpowers/specs/2026-11-12-kern-und-wellenmodus-design.md`

## Global Constraints

- Kein Node.js, kein Build, keine CDN-Abhängigkeit zur Laufzeit. Der Projektordner ist das, was GitHub Pages ausliefert; alle Pfade sind relativ (kein führendes `/`).
- `src/core`, `src/modes`, `src/data`, `src/save` importieren weder Three.js noch greifen sie auf `window`, `document` oder `localStorage` zu. `save` bekommt den Speicher übergeben.
- `src/render` und `src/ui` ändern den Weltzustand nie; Rückmeldungen laufen nur über `chooseCard` und `setPaused` aus `survivor.js`.
- Zufall in der Logik nur über `createRng(seed)`, nie `Math.random()`.
- Alle Balancing-Zahlen stehen in `src/data/`, nicht im Logikcode.
- Oberfläche auf Deutsch. Kennungen im Code auf Englisch, Daten-IDs wie in diesem Plan angegeben.
- Benutzereingaben (Heldenname) werden nur über `textContent` angezeigt, nie über `innerHTML`.
- Höchstens 300 Gegner gleichzeitig, höchstens 6 Helden, höchstens 5 Fähigkeiten, Stufen bis 5.
- Git: nach jeder Aufgabe committen, Nachricht endet mit `Co-Authored-By: Claude Fable 5.2 <noreply@anthropic.com>`. **Nie pushen.**
- Tests laufen so: Server starten (`tools/serve.ps1`), `http://localhost:8080/tests.html` im eingebauten Browser öffnen, `window.__testResults` auslesen. Bestanden heißt `failed === 0`. Mit `?filter=<text>` laufen nur Tests, deren Name den Text enthält.

## Review Focus

1. **Heldenname leer, sehr lang oder mit HTML-Zeichen** → wird gekürzt auf 16 Zeichen, leer wird zu „Held N", `<b>x</b>` erscheint als Text. Test in Aufgabe 8 (`normalizeHeroName`) und Handprobe in Aufgabe 11.
2. **Mehrere Level-ups auf einmal (Boss-Erfahrung) oder Level-up im selben Schritt wie Tod oder Sieg** → Karten erscheinen nacheinander; Tod und Sieg haben Vorrang, es bleibt keine offene Auswahl. Test in Aufgabe 7.
3. **Gegenläufige Tasten, Diagonale, Taste gehalten beim Fokusverlust** → A+D ergibt Stillstand, Diagonale ist nicht schneller, nach Fokusverlust läuft der Held nicht weiter. Test in Aufgabe 12 (`readMoveVector`, `clearKeys`).
4. **Zwei Tabs mit demselben Stand** → ein Kauf im zweiten Tab überschreibt nicht das Gold aus dem ersten: vor jedem Schreiben wird neu geladen und die Änderung darauf angewendet. Test in Aufgabe 8 (`store.update`).
5. **Fenstergröße ändern, sehr schmal oder sehr breit** → Bild verzerrt nicht, Gegner erscheinen weiterhin außerhalb des Sichtfelds (Ringradius aus der aktuellen Sichtweite). Test in Aufgabe 7 (`spawnRadius(viewHalfW, viewHalfH)`), Handprobe in Aufgabe 9.

---

## Dateien

```
index.html, tests.html, styles.css
.claude/launch.json           Startkonfiguration für den eingebauten Browser
tools/serve.ps1               statischer Webserver
vendor/three.module.min.js
src/main.js                   Start, Bildschirmwechsel, Spielschleife
src/data/{animals,classes,abilities,enemies,waves,bonuses,meta}.js
src/core/{rng,stats,combat,spatial,terrain,world,abilities,progression}.js
src/modes/survivor.js
src/save/{schema,store,meta}.js
src/input/keyboard.js
src/render/{renderer,character,enemies,terrain,effects}.js
src/ui/{screens,menus,heroCreate,hud,levelup,result,metaShop,settings}.js
src/audio/sfx.js
tests/runner.js, tests/index.js, tests/*.test.js
```

---

### Task 1: Gerüst, Server, Testläufer, Zufall

**Files:**
- Create: `index.html`, `tests.html`, `styles.css`, `tools/serve.ps1`, `.claude/launch.json`, `.gitignore`, `vendor/three.module.min.js`, `src/main.js`, `src/core/rng.js`, `tests/runner.js`, `tests/index.js`, `tests/rng.test.js`

**Interfaces:**
- Produces:
  - `tests/runner.js`: `test(name, fn)`, `assertEqual(actual, expected, msg?)` (tiefer Vergleich über JSON), `assertClose(actual, expected, eps = 1e-6)`, `assertTrue(value, msg?)`, `assertThrows(fn)`, `run(): Promise<{passed, failed, failures: [{name, error}]}>`; `tests.html` schreibt das Ergebnis in die Seite und nach `window.__testResults`.
  - `src/core/rng.js`: `createRng(seed: number) → { next(): number /* [0,1) */, range(min, max): number, int(min, max): number /* inklusiv */, chance(p): boolean, pick(array) }` (mulberry32).

- [ ] **Step 1:** `tools/serve.ps1` schreiben: Parameter `-Port` (Standard 8080), `System.Net.HttpListener` auf `http://localhost:<Port>/`, liefert Dateien relativ zum Projektordner, `/` → `index.html`, MIME-Typen für `.html .js .css .json .png .svg`, lehnt Pfade mit `..` ab, Header `Cache-Control: no-store`.
- [ ] **Step 2:** `.claude/launch.json` mit Eintrag `animalwarrior`: `powershell`, Argumente `-NoProfile -ExecutionPolicy Bypass -File tools/serve.ps1 -Port 8080`, Port 8080.
- [ ] **Step 3:** Three.js besorgen. **Vorher den Nutzer um Erlaubnis für den Download fragen** (Datei `three.module.min.js`, Quelle `https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js`, etwa 700 KB). Nach dem Download prüfen, dass die Datei keine `import … from './…'`-Zeilen enthält; falls doch, die referenzierten Dateien derselben Version ebenfalls nach `vendor/` legen.
- [ ] **Step 4:** `tests/runner.js`, `tests/index.js` (importiert alle `*.test.js`), `tests.html` schreiben.
- [ ] **Step 5:** Test schreiben (`tests/rng.test.js`):

```js
test('rng: gleicher Startwert, gleiche Folge', () => {
  const a = createRng(42), b = createRng(42);
  assertEqual([a.next(), a.next(), a.next()], [b.next(), b.next(), b.next()]);
});
test('rng: Wertebereiche', () => {
  const r = createRng(7);
  for (let i = 0; i < 1000; i++) {
    const n = r.next(); assertTrue(n >= 0 && n < 1);
    const k = r.int(2, 5); assertTrue(k >= 2 && k <= 5 && Number.isInteger(k));
  }
  assertEqual(createRng(1).chance(0), false);
  assertEqual(createRng(1).chance(1), true);
});
```

- [ ] **Step 6:** Tests ausführen → FAIL (`createRng` fehlt). `src/core/rng.js` implementieren. Tests ausführen → `failed: 0`.
- [ ] **Step 7:** `index.html` (Canvas `#game`, Container `#ui`, lädt `src/main.js` als Modul), `styles.css` (Vollbild, dunkler Hintergrund), `src/main.js` (zeigt vorerst einen drehenden Würfel, um Three.js zu prüfen). Im Browser prüfen: Würfel sichtbar, Konsole ohne Fehler.
- [ ] **Step 8:** Commit `chore: scaffold project, test runner, local server, rng`.

---

### Task 2: Daten für Tiere und Klassen, Werteverrechnung

**Files:**
- Create: `src/data/animals.js`, `src/data/classes.js`, `src/core/stats.js`, `tests/stats.test.js`

**Interfaces:**
- Produces:
  - Typ `Modifier = { stat: StatKey, flat?: number, pct?: number }`.
  - `StatKey`: `maxHp, hpRegen, moveSpeed, damage, cooldown, area, armor, critChance, critDamage, dodge, pickupRadius, xpGain, goldGain`.
  - `BASE_STATS`: `hpRegen 0, damage 1, cooldown 1, area 1, armor 0, critChance 0.05, critDamage 1.5, dodge 0, pickupRadius 2.5, xpGain 1, goldGain 1`.
  - `ANIMALS: Record<'hase'|'ente'|'waschbaer', { id, name, description, base: { maxHp, moveSpeed }, modifiers: Modifier[] }>`
    - hase: 80 / 6.0, `dodge flat 0.15`
    - ente: 130 / 4.6, `hpRegen flat 1`
    - waschbaer: 100 / 5.2, `pickupRadius pct 0.4`, `goldGain pct 0.2`, `critChance flat 0.10`
  - `CLASSES: Record<'krieger'|'magier'|'dieb', { id, name, description, modifiers: Modifier[], startAbility: string, abilityPool: string[] }>`
    - krieger: `maxHp pct 0.3`, `armor flat 2`, Start `schwerthieb`
    - magier: `maxHp pct -0.15`, `area pct 0.15`, `cooldown pct -0.10`, Start `feuerball`
    - dieb: `moveSpeed pct 0.10`, `critChance flat 0.10`, `critDamage flat 0.25`, Start `wurfdolche`
  - `computeStats(animalId, classId, extraModifiers: Modifier[] = []) → Stats`: je Wert `(Grundwert + Σ flat) × (1 + Σ pct)`, danach `dodge ≤ 0.6`, `cooldown ≥ 0.4`.

- [ ] **Step 1:** Tests schreiben:

```js
test('stats: Hase Krieger', () => {
  const s = computeStats('hase', 'krieger');
  assertClose(s.maxHp, 104); assertClose(s.armor, 2); assertClose(s.dodge, 0.15);
});
test('stats: Ente Magier', () => {
  const s = computeStats('ente', 'magier');
  assertClose(s.maxHp, 110.5); assertClose(s.cooldown, 0.9); assertClose(s.area, 1.15); assertClose(s.hpRegen, 1);
});
test('stats: Waschbär Dieb', () => {
  const s = computeStats('waschbaer', 'dieb');
  assertClose(s.critChance, 0.25); assertClose(s.critDamage, 1.75);
  assertClose(s.moveSpeed, 5.72); assertClose(s.pickupRadius, 3.5); assertClose(s.goldGain, 1.2);
});
test('stats: fest vor prozentual', () => {
  const s = computeStats('hase', 'krieger', [{ stat: 'maxHp', flat: 20 }, { stat: 'maxHp', pct: 0.2 }]);
  assertClose(s.maxHp, (80 + 20) * 1.5);
});
test('stats: Deckelungen', () => {
  const s = computeStats('hase', 'magier', [{ stat: 'dodge', flat: 0.9 }, { stat: 'cooldown', pct: -0.9 }]);
  assertClose(s.dodge, 0.6); assertClose(s.cooldown, 0.4);
});
test('stats: alle neun Kombinationen ergeben endliche positive Werte', () => { /* Schleife über ANIMALS × CLASSES */ });
```

- [ ] **Step 2:** Tests ausführen → FAIL. Daten und `computeStats` implementieren. Tests → `failed: 0`.
- [ ] **Step 3:** Commit `feat: animal and class data, stat computation`.

---

### Task 3: Kampfauflösung

**Files:**
- Create: `src/core/combat.js`, `tests/combat.test.js`

**Interfaces:**
- Consumes: `createRng`, `Stats`.
- Produces: `resolveHit(rng, { baseDamage, damage, critChance, critDamage }, { armor, dodge }) → { dodged: boolean, crit: boolean, amount: number }`. Reihenfolge der Zufallszüge: erst Ausweichen, dann kritisch. `amount = max(1, round(baseDamage × damage × (crit ? critDamage : 1)) − armor)`; bei `dodged` ist `amount = 0`.

- [ ] **Step 1:** Tests schreiben: Grundschaden 10 ohne Krit und Rüstung → 10; mit `critChance 1`, `critDamage 2` → 20 und `crit true`; Rüstung 50 → 1; `dodge 1` → `dodged true`, `amount 0`; über 10 000 Züge mit `dodge 0.15` liegt die Ausweichquote zwischen 0.13 und 0.17.
- [ ] **Step 2:** FAIL prüfen, implementieren, `failed: 0` prüfen.
- [ ] **Step 3:** Commit `feat: hit resolution`.

---

### Task 4: Welt, Gelände, Bewegung, Aufsammeln

**Files:**
- Create: `src/core/spatial.js`, `src/core/terrain.js`, `src/core/world.js`, `src/data/enemies.js`, `tests/spatial.test.js`, `tests/terrain.test.js`, `tests/world.test.js`

**Interfaces:**
- Consumes: `computeStats`, `resolveHit`, `createRng`.
- Produces:
  - `createGrid(cellSize) → { clear(), insert(entity /* {x,z,radius} */), queryCircle(x, z, r): entity[] }`.
  - `obstaclesInCell(seed, cx, cz) → [{ x, z, radius, kind: 'tree'|'rock' }]`, Zellgröße `TERRAIN_CELL = 16`, 0–3 Hindernisse je Zelle, deterministisch; die Zelle (0,0) ist leer. `obstaclesNear(seed, x, z, range) → Obstacle[]`.
  - `ENEMIES` (Startwerte): 

    | id | hp | speed | damage | radius | xp | behavior | flying |
    |---|---|---|---|---|---|---|---|
    | ratte | 6 | 4.2 | 4 | 0.35 | 1 | chase | – |
    | wildschwein | 40 | 2.4 | 10 | 0.7 | 4 | charge | – |
    | kraehe | 14 | 4.8 | 6 | 0.4 | 3 | strafe | ja |
    | giftkroete | 25 | 2.6 | 8 | 0.5 | 5 | ranged | – |
    | wolf | 45 | 5.4 | 12 | 0.5 | 6 | circle | – |
    | baer | 1500 | 3.2 | 25 | 1.4 | 100 | boss | – |

    `ELITE = { hpMul: 8, scale: 1.6, xpMul: 10 }`, `DROPS = { goldChance: 0.04, potionChance: 0.005, potionHeal: 0.2, chestGold: 25 }`, `CONTACT_INTERVAL = 0.5` (Sekunden zwischen Berührungstreffern desselben Gegners).
  - `createWorld({ seed, animalId, classId, modifiers }) → World` mit `{ time, seed, rng, hero, enemies, projectiles, zones, orbitals, summons, pickups, events, run }`.
    - `hero: { x, z, facing: {x, z}, hp, stats, modifiers, abilities: [{ id, level, cooldownLeft }], buffs: [{ modifiers, timeLeft }], radius: 0.5, invulnerableUntil: 0 }` (`damageHero` tut nichts, solange `world.time < invulnerableUntil`)
    - `run: { level: 1, xp: 0, kills: 0, gold: 0, bonuses: {}, damageByAbility: {}, revivesLeft: 0 }`
    - `enemy: { id, type, x, z, hp, maxHp, radius, speed, damage, elite, boss, slowUntil, confusedUntil, contactReadyAt, ai: {} }`
    - `pickup: { kind: 'xp'|'gold'|'potion'|'chest', x, z, value }`
  - `stepWorld(world, dt, input: { moveX, moveZ })`: leert `events`, bewegt den Helden (Eingabe normalisiert, Tempo aus `stats.moveSpeed`, `facing` = letzte Bewegungsrichtung), wendet Regeneration und ablaufende Stärkungen an, bewegt Gegner nach `behavior` (in dieser Aufgabe nur `chase`; die übrigen in Aufgabe 7), löst Kollisionen mit Hindernissen (Kreis schiebt Kreis heraus; fliegende Gegner ignorieren sie), trennt Gegner voneinander über das Raster, wendet Berührungsschaden an, sammelt Aufsammelbares im `pickupRadius` ein.
  - `spawnEnemy(world, type, x, z, { elite = false, hpMul = 1, dmgMul = 1 } = {}) → enemy`
  - `damageEnemy(world, enemy, hit: { amount, crit }, abilityId)`: zieht Leben ab, zählt `damageByAbility`, bei Tod: `kills++`, legt Aufsammelbares ab (xp immer; Gold und Trank nach `DROPS`; Elite legt `chest`), entfernt den Gegner.
  - `damageHero(world, rawAmount)`: läuft durch `resolveHit` (Ausweichen, Rüstung).
  - `recomputeHeroStats(world)`: Werte aus Tier, Klasse, `hero.modifiers`, aktiven Stärkungen; hält das Verhältnis `hp/maxHp` bei steigendem `maxHp` nicht, sondern addiert die Differenz.
  - Ereignisse in `world.events`: `{type:'hit', x, z, amount, crit}`, `{type:'heroHit', amount}`, `{type:'dodge'}`, `{type:'kill', enemyType, x, z}`, `{type:'pickup', kind, value}`, `{type:'heal', amount}`. Weitere Typen kommen in den Aufgaben 5–7 hinzu.

- [ ] **Step 1:** Tests schreiben:
  - spatial: Einfügen von drei Kreisen, `queryCircle` findet genau die überlappenden, auch über Zellgrenzen.
  - terrain: gleiche Eingabe → gleiche Hindernisse; Zelle (0,0) leer; `obstaclesNear` liefert nur Hindernisse im Bereich.
  - world: nach 1 s Lauf nach rechts ist `hero.x ≈ moveSpeed`; diagonale Eingabe (1,1) ergibt dieselbe Strecke; Held bleibt außerhalb eines Hinderniskreises; Ratte bei (10,0) kommt näher; Berührung zieht dem Helden Leben ab, aber höchstens einmal je 0,5 s; `damageEnemy` mit tödlichem Treffer erhöht `kills`, legt ein xp-Aufsammelbares ab und meldet `kill`; Held in Reichweite sammelt xp ein und `run.xp` steigt um `value × xpGain`; Gold steigt um `value × goldGain`; Trank heilt 20 % und nie über `maxHp`; Ente regeneriert 1 Leben/s; getöteter Elite-Gegner legt `chest` ab.
- [ ] **Step 2:** FAIL prüfen, implementieren, `failed: 0` prüfen.
- [ ] **Step 3:** Commit `feat: world state, terrain, movement, pickups`.

---

### Task 5: Fähigkeiten

**Files:**
- Create: `src/data/abilities.js`, `src/core/abilities.js`, `tests/abilities.test.js`
- Modify: `src/core/world.js` (ruft `stepAbilities` in `stepWorld` auf), `src/data/classes.js` (`abilityPool` füllen)

**Interfaces:**
- Consumes: `World`, `damageEnemy`, `resolveHit`, `createGrid`, `recomputeHeroStats`.
- Produces:
  - `ABILITIES: Record<id, { id, name, classId, shape, trigger: 'auto', target, base: {...}, levels: [L2, L3, L4, L5] }>`; jede Stufe ist eine Liste von Änderungen `{ key, add? , mul? }` an `base`.
  - `abilityParams(id, level, heroStats) → params`: `base` plus Stufen 2…level, dann `cooldown × stats.cooldown`, Flächenmaße × `stats.area`.
  - `stepAbilities(world, dt)`: zählt Abklingzeiten herunter und löst fällige Fähigkeiten aus; bewegt Geschosse, Zonen, Umläufe, Beschwörungen.
  - `castAbility(world, abilityId, level, aim?: { x, z })`: führt die Wirkung sofort aus. `aim` ist für den Abenteuer-Modus vorgesehen; ohne `aim` gilt `target` aus den Daten.
  - Neue Ereignisse: `{type:'cast', abilityId, x, z, dirX, dirZ, params}`.
  - `target`-Werte: `facing`, `nearest`, `densest`, `self`.

**Startwerte** (Schaden / Abklingzeit in s / Maße; jede Stufe zusätzlich +20 % Schaden auf den Grundschaden):

| id | Klasse | shape | target | Grundwerte | Stufe 3 | Stufe 5 |
|---|---|---|---|---|---|---|
| schwerthieb | krieger | arc | facing | 12 / 1.0 / Radius 2.6, Winkel 110° | Winkel 150° | zweiter Hieb nach hinten |
| wirbelschlag | krieger | ring | self | 10 / 3.0 / Radius 3.0 | Radius +25 % | Abklingzeit −25 % |
| schildstoss | krieger | arc | facing | 5 / 4.0 / Radius 2.2, Winkel 90°, Rückstoß 5 | Rückstoß 8 | betäubt 1 s |
| kriegsschrei | krieger | buff | self | – / 14 / Dauer 5 s, `damage pct 0.3` | Dauer 7 s | `damage pct 0.5` |
| erdspalter | krieger | line | facing | 18 / 5.0 / Länge 9, Breite 1.6 | Länge 12 | Breite 2.4 |
| feuerball | magier | projectile | nearest | 10 / 1.2 / Tempo 14, Explosion 1.5, Reichweite 14 | 2 Geschosse | Explosion 2.5 |
| frostring | magier | ring | self | 6 / 4.0 / Radius 3.5, Verlangsamung 40 % für 2 s | Radius +25 % | Verlangsamung 60 % |
| kettenblitz | magier | chain | nearest | 9 / 2.5 / 4 Sprünge, Sprungweite 5 | 6 Sprünge | 9 Sprünge |
| meteor | magier | zone | densest | 30 / 6.0 / Radius 3.0, Verzögerung 0.8 s | Radius 4.0 | brennt 3 s nach (6/s) |
| arkankugeln | magier | orbit | self | 6 / – / 2 Kugeln, Bahnradius 2.5, Treffer je Gegner alle 0.5 s | 3 Kugeln | 5 Kugeln |
| wurfdolche | dieb | projectile | facing | 7 / 0.6 / Tempo 18, durchschlägt 2, Reichweite 12 | 2 Dolche | durchschlägt 5 |
| giftflaeche | dieb | zone | self | 4 pro 0.5 s / 5.0 / Radius 2.5, Dauer 4 s | Radius 3.5 | Dauer 6 s |
| schattenklon | dieb | summon | self | – / 12 / Dauer 5 s, Gegner im Umkreis 8 greifen den Klon an | Dauer 7 s | explodiert am Ende (25, Radius 3) |
| klingenfaecher | dieb | projectile | facing | 6 / 2.5 / 5 Dolche auf 60°, Tempo 16, Reichweite 9 | 7 Dolche | 9 Dolche auf 360° |
| rauchbombe | dieb | zone | self | – / 9 / Radius 4, Gegner darin 3 s verwirrt (laufen zufällig) | Radius 5.5 | verwirrt 5 s |

- [ ] **Step 1:** Tests schreiben, je Wirkungsform einer, mit Gegnern an festen Positionen und Held bei (0,0), Blick nach +x:
  - arc: Gegner bei (2,0) getroffen, bei (−2,0) und (5,0) nicht.
  - ring: Gegner in Radius getroffen, außerhalb nicht.
  - line: Gegner bei (8,0.5) getroffen, bei (8,3) nicht.
  - projectile/nearest: Feuerball fliegt zum näheren von zwei Gegnern; Explosion trifft den Nachbarn in 1 Einheit Abstand.
  - projectile/facing mit Durchschlag: drei Gegner in Reihe, Stufe 1 trifft genau zwei.
  - chain: fünf Gegner in Kette, Stufe 1 trifft genau vier, keinen doppelt.
  - zone/densest: Meteor landet bei der Dreiergruppe, nicht beim Einzelgegner, Schaden erst nach 0,8 s.
  - orbit: Gegner auf der Bahn wird in 1 s höchstens zweimal getroffen.
  - buff: während Kriegsschrei ist `hero.stats.damage` 1.3, nach 5 s wieder 1.
  - summon: Gegner im Umkreis steuern den Klon an; nach 5 s wieder den Helden.
  - Verwirrung und Verlangsamung setzen `confusedUntil` bzw. `slowUntil`; verlangsamter Gegner legt in 1 s 60 % der Strecke zurück.
  - `abilityParams('schwerthieb', 3, stats)` hat Winkel 150 und Schaden 12 × 1.4; mit `stats.cooldown 0.9` ist die Abklingzeit 0.9; mit `stats.area 1.15` ist der Radius 2.99.
  - Automatik: bei leerer Welt lösen Fähigkeiten mit `nearest`/`densest` nicht aus und behalten ihre Abklingzeit bei 0.
  - `damageByAbility` zählt den Schaden unter der richtigen Kennung.
- [ ] **Step 2:** FAIL prüfen, implementieren, `failed: 0` prüfen.
- [ ] **Step 3:** Commit `feat: ability data and execution`.

---

### Task 6: Erfahrung, Level-up-Karten, Boni

**Files:**
- Create: `src/data/bonuses.js`, `src/core/progression.js`, `tests/progression.test.js`

**Interfaces:**
- Consumes: `World`, `CLASSES[...].abilityPool`, `recomputeHeroStats`.
- Produces:
  - `BONUSES` (je höchstens Stufe 5): `leben` (`maxHp pct 0.10`), `tempo` (`moveSpeed pct 0.06`), `schaden` (`damage pct 0.10`), `abklingzeit` (`cooldown pct -0.06`), `sammelradius` (`pickupRadius pct 0.20`), `ruestung` (`armor flat 1`), `regeneration` (`hpRegen flat 0.5`).
  - `xpToNext(level) → number`: Level 1 → 5; bis Level 20 jeweils +10 (`5 + 10 × (level − 1)`); ab 21 `195 + 16 × (level − 20)`.
  - `pendingLevelUps(world) → number`: wie viele Level-ups `run.xp` gerade hergibt.
  - `rollCards(world, count = 3) → Card[]` mit `Card = { kind: 'newAbility'|'abilityLevel'|'bonus'|'gold'|'heal', id?, toLevel?, value? }`. Keine Doppelten; `newAbility` nur bei weniger als 5 Fähigkeiten und nur aus dem Pool der Klasse; `abilityLevel` nur unter Stufe 5; `bonus` nur unter Stufe 5. Reichen die Möglichkeiten nicht für `count`, wird mit `gold` (value 25) und `heal` (value 0.3) aufgefüllt.
  - `applyCard(world, card)`: wendet an, zieht bei Level-up die Erfahrung ab und erhöht `run.level` (`consumeLevel = true` als dritter Parameter; Truhen rufen mit `false`).
  - `openChest(world) → Card`: zieht eine Karte, wendet sie ohne Levelverbrauch an, addiert `DROPS.chestGold × goldGain` Gold, meldet `{type:'chest', card}`.

- [ ] **Step 1:** Tests schreiben: `xpToNext(1) = 5`, `xpToNext(2) = 15`, `xpToNext(20) = 195`, `xpToNext(21) = 211`; mit 25 xp auf Level 1 sind zwei Level-ups offen; `rollCards` liefert drei verschiedene Karten; mit fünf Fähigkeiten kommt nie `newAbility`; Fähigkeiten anderer Klassen kommen nie; sind alle Fähigkeiten und Boni auf Stufe 5, kommen nur `gold` und `heal`; `applyCard` mit `bonus leben` erhöht `maxHp` um 10 % des Grundwerts und `hp` um dieselbe Differenz; `applyCard` mit `newAbility` hängt `{ id, level: 1, cooldownLeft: 0 }` an; `openChest` verbraucht kein Level.
- [ ] **Step 2:** FAIL prüfen, implementieren, `failed: 0` prüfen.
- [ ] **Step 3:** Commit `feat: xp curve, level-up cards, bonuses`.

---

### Task 7: Regeln des Wellen-Modus

**Files:**
- Create: `src/data/waves.js`, `src/modes/survivor.js`, `tests/survivor.test.js`
- Modify: `src/core/world.js` (Verhalten `charge`, `strafe`, `ranged`, `circle`, `boss`; Gegnergeschosse)

**Interfaces:**
- Consumes: alles aus Aufgaben 2–6; `metaModifiers`, `hasRevive` kommen in Aufgabe 8 und werden hier als Parameter übergeben.
- Produces:
  - `WAVES`: `RUN_DURATION = 900`, `MAX_ENEMIES = 300`, `unlockMinute = { ratte: 0, wildschwein: 2, kraehe: 4, giftkroete: 6, wolf: 9 }`, `weights = { ratte: 10, wildschwein: 3, kraehe: 4, giftkroete: 2, wolf: 3 }`, `spawnPerSecond(minute) = 1.5 + 0.9 × minute`, `hpMul(minute) = 1 + 0.25 × minute`, `dmgMul(minute) = 1 + 0.12 × minute`, `ELITE_INTERVAL = 120`, `BOSS_TIMES = [300, 600, 900]`, `BOSS_HP_MUL = [1, 2.5, 5]`, `LEASH_DISTANCE = 45`.
  - `spawnRadius(viewHalfW, viewHalfH) → number` = `hypot(viewHalfW, viewHalfH) + 3`.
  - `createSurvivorRun({ seed, animalId, classId, modifiers, revive: boolean, timeScale = 1 }) → Run` mit `{ world, state: 'playing'|'levelup'|'paused'|'won'|'lost', cards: Card[] | null, view: { halfW, halfH } }`.
  - `stepRun(run, dt, input)`: tut nichts außer bei `playing`; ruft `stepWorld`, erzeugt Gegner, Elite und Bosse, prüft Tod, Sieg und Level-ups.
  - `chooseCard(run, index)`, `setPaused(run, paused)`, `setView(run, halfW, halfH)`, `getSummary(run) → { won, time, level, kills, gold, damageByAbility }`.
  - Neue Ereignisse: `{type:'levelup', level}`, `{type:'bossSpawn', index}`, `{type:'bossTelegraph', x, z, radius, delay}`, `{type:'revive'}`, `{type:'death'}`, `{type:'victory'}`.

**Regeln, die Tests und Signaturen nicht festlegen:**
- An der Obergrenze von 300 wird das nicht gesetzte Kontingent gesammelt; je 10 aufgestaute Gegner erscheint stattdessen der nächste mit `hpMul × 3`.
- Gegner weiter als `LEASH_DISTANCE` vom Helden werden auf den Ring versetzt (Bosse nicht).
- Verhalten: `charge` läuft normal, alle 4 s nach 0,6 s Stillstand 1 s mit dreifachem Tempo geradeaus; `strafe` nähert sich mit seitlichem Versatz, der alle 1,5 s die Seite wechselt; `ranged` hält 7–9 Einheiten Abstand und schießt alle 2,5 s ein Geschoss (Tempo 8, verschwindet nach 3 s); `circle` umkreist in 5 Einheiten Abstand und stößt alle 3 s vor; `boss` wechselt zwischen Verfolgen, Prankenhieb (Bogen 3 Einheiten, 0,7 s Vorwarnung) und Sprung (Zielkreis Radius 3,5 an der Heldenposition, 1,2 s Vorwarnung, doppelter Schaden).
- Truhen: `world.js` meldet beim Einsammeln nur `{type:'pickup', kind:'chest'}`; `stepRun` ruft daraufhin `openChest(world)` auf (so importiert `world.js` nicht `progression.js`). Test: Held sammelt eine Truhe ein → Ereignis `chest`, Gold +25 × `goldGain`, `run.level` unverändert.
- Bei 900 s erscheint der dritte Boss, danach keine neuen Gegner; `won`, sobald er tot ist.
- Tod: bei `hp ≤ 0` mit `revivesLeft > 0` → Leben auf 50 %, 2 s unverwundbar, alle Gegner im Radius 6 werden weggestoßen, Ereignis `revive`; sonst `lost`.
- Level-up: nach jedem Schritt, wenn `pendingLevelUps > 0` und der Zustand `playing` ist → `levelup` mit drei Karten; nach `chooseCard` wieder `playing`, im nächsten Schritt folgt gegebenenfalls das nächste. `won` und `lost` haben Vorrang und setzen `cards = null`.

- [ ] **Step 1:** Tests schreiben (Lauf mit `timeScale` oder direktem Setzen von `world.time`, Held unverwundbar gemacht, wo nötig):
  - `spawnRadius(10, 6) ≈ 14.66`; nach `setView(run, 30, 6)` erscheint kein Gegner näher als 33 am Helden.
  - In Minute 0 erscheinen nur Ratten; in Minute 3 auch Wildschweine, keine Krähen.
  - Nach 60 s ohne Tötungen liegt die Zahl erzeugter Gegner bei `1.5 × 60 ± 2`.
  - Gegnerzahl überschreitet nie 300, auch nach 600 s ohne Tötungen.
  - Bei 120 s existiert ein Elite-Gegner mit `maxHp = Typ-hp × hpMul(2) × 8`.
  - Bei 300 s und 600 s erscheint je ein Bär, Ereignis `bossSpawn`, zweiter mit 2,5-fachem Leben.
  - Bei 900 s erscheint der dritte Bär und danach kein weiterer Gegner; Tod dieses Bären → `state 'won'`, Ereignis `victory`.
  - Held mit 1 Leben und Ratte in Berührung → `lost`, Ereignis `death`; mit `revive: true` → einmal `revive` mit halbem Leben, beim zweiten Mal `lost`.
  - 25 xp auf einmal → `levelup`; nach `chooseCard(run, 0)` und einem Schritt erneut `levelup`; danach `playing`.
  - Level-up und tödlicher Treffer im selben Schritt → `lost`, `cards === null`.
  - `stepRun` im Zustand `paused` und `levelup` lässt `world.time` unverändert.
  - `chooseCard` mit ungültigem Index oder im falschen Zustand ändert nichts.
  - `getSummary` liefert Zeit, Level, Tötungen, Gold und Schaden je Fähigkeit.
  - Kröte bleibt außerhalb von 6 Einheiten und erzeugt ein Geschoss; Krähe läuft durch ein Hindernis, Wildschwein nicht.
- [ ] **Step 2:** FAIL prüfen, implementieren, `failed: 0` prüfen.
- [ ] **Step 3:** Commit `feat: survivor mode rules, enemy behaviors, bosses`.

---

### Task 8: Speichern und Dauerboni

**Files:**
- Create: `src/data/meta.js`, `src/save/schema.js`, `src/save/store.js`, `src/save/meta.js`, `tests/save.test.js`, `tests/meta.test.js`

**Interfaces:**
- Produces:
  - `SAVE_VERSION = 1`, `STORAGE_KEY = 'animalwarrior.save'`, `BACKUP_KEY = 'animalwarrior.save.corrupt'`, `MAX_HEROES = 6`.
  - `defaultSave() → Save` (Form wie Spec 7.1; `settings: { volume: 70, quality: 'high' }`).
  - `migrate(data) → Save` (Kette je Version; für Version 1 Identität) und `validate(data) → { ok, error? }`: prüft Typen, bekannte Tier- und Klassen-IDs, höchstens 6 Helden, nicht negatives ganzzahliges Gold, Stufen innerhalb der Höchststufe.
  - `createStore(storage) → { load(): { data: Save, status: 'ok'|'empty'|'corrupt'|'newer'|'unavailable' }, update(mutator: (save) => void): { data, saved: boolean }, exportJson(): string, importJson(text): { ok, data?, error? } }`. `update` lädt frisch aus dem Speicher, wendet `mutator` an und schreibt. Bei `corrupt` wandert der Rohinhalt nach `BACKUP_KEY`. Bei `newer` und `unavailable` schreibt `update` nicht und liefert `saved: false`. Ausnahmen des Speichers werden abgefangen.
  - `normalizeHeroName(raw, index) → string`: trimmt, kürzt auf 16 Zeichen, leer → `Held ${index + 1}`.
  - `addHero(save, { name, animal, class }) → hero | null` (null bei 6 Helden), `deleteHero(save, id)`, `recordRun(save, heroId, summary)`: addiert Gold, `runs++`, bei Sieg `wins++`, `bestTime = max`.
  - `META` (Kennung → Wirkung je Stufe, Höchststufe): `leben` (`maxHp pct 0.05`, 5), `schaden` (`damage pct 0.04`, 5), `tempo` (`moveSpeed pct 0.03`, 5), `sammelradius` (`pickupRadius pct 0.10`, 5), `erfahrung` (`xpGain pct 0.05`, 5), `gold` (`goldGain pct 0.10`, 5), `ruestung` (`armor flat 1`, 5), `wiederbelebung` (1 Stufe).
  - `metaPrice(id, currentLevel) → number`: `50 × 2^currentLevel`; `wiederbelebung` kostet 500.
  - `buyMeta(save, id) → { ok: boolean, reason?: 'gold'|'max'|'unknown' }`, `metaModifiers(save) → Modifier[]`, `hasRevive(save) → boolean`.

- [ ] **Step 1:** Tests schreiben, mit einem Speicher-Nachbau `{ getItem, setItem, removeItem }` über eine Map:
  - leerer Speicher → `status 'empty'`, Daten = `defaultSave()`.
  - `update` gefolgt von `load` liefert dieselben Daten.
  - kaputtes JSON und gültiges JSON mit falscher Form → `status 'corrupt'`, Rohinhalt unter `BACKUP_KEY`, Daten = Standard.
  - `version: 99` → `status 'newer'`, `update` schreibt nicht, der Eintrag bleibt unverändert.
  - Speicher, dessen `setItem` wirft → `saved false`, keine Ausnahme; Speicher, dessen `getItem` wirft → `status 'unavailable'`.
  - zwei Stores auf demselben Speicher: A lädt, B fügt per `update` 100 Gold hinzu, A kauft per `update` für 50 → am Ende 50 Gold und der Kauf, nicht −50 oder 0.
  - `importJson` mit Export eines anderen Stands → `ok`; mit `'{'`, mit `version: 99`, mit Held `animal: 'drache'`, mit sieben Helden, mit `gold: -5` → jeweils `ok false` und der Speicher unverändert.
  - `normalizeHeroName('   ', 2) === 'Held 3'`; 40 Zeichen → 16; `'<b>x</b>'` bleibt unverändert als Zeichenkette.
  - `addHero` beim siebten Helden → `null`.
  - `recordRun` addiert Gold und hält die beste Zeit.
  - `metaPrice('leben', 0) = 50`, `metaPrice('leben', 4) = 800`, `metaPrice('wiederbelebung', 0) = 500`.
  - `buyMeta` mit zu wenig Gold → `reason 'gold'`, nichts geändert; auf Höchststufe → `'max'`; Erfolg zieht den Preis ab und erhöht die Stufe.
  - `metaModifiers` bei `leben: 3` → `[{ stat: 'maxHp', pct: 0.15 }]`; `computeStats('hase','krieger', das)` → `80 × 1.45`.
- [ ] **Step 2:** FAIL prüfen, implementieren, `failed: 0` prüfen.
- [ ] **Step 3:** Commit `feat: save store, migration, import/export, meta upgrades`.

---

### Task 9: Darstellung – Szene, Kamera, Gelände, Figuren

**Files:**
- Create: `src/render/renderer.js`, `src/render/character.js`, `src/render/terrain.js`
- Modify: `src/main.js` (Vorschauszene statt Würfel)

**Interfaces:**
- Consumes: `obstaclesNear`, `TERRAIN_CELL`, `ANIMALS`, `CLASSES`.
- Produces:
  - `isWebGLAvailable() → boolean`.
  - `createRenderer(canvas, { quality: 'high'|'low' }) → { scene, camera, setQuality(q), resize(): { halfW, halfH } /* sichtbare Halbmaße auf Bodenhöhe */, render(), dispose() }`. Perspektivische Kamera, 55° von oben geneigt, Abstand 22, folgt einem Zielpunkt; ein Richtungslicht mit Schatten (bei `low` aus) plus Umgebungslicht; leichter Nebel in Bodenfarbe.
  - `buildCharacter(animalId, classId) → THREE.Group` mit `userData.attach = { hand, offHand, head, torso }` (leere Gruppen als Befestigungspunkte) und `userData.parts = { body, head, armL, armR, legL, legR, tail, ears? }`; Höhe etwa 1.6. `animateCharacter(group, { speed, time, attackT })` schwingt Arme und Beine nach Tempo und spielt einen Hieb über `attackT` 0→1.
  - `createTerrainView(scene, seed) → { update(x, z), dispose() }`: Bodenkacheln und Hindernisse (Bäume aus Stamm und Kronenkegeln, Felsen aus verformten Ikosaedern) im Umkreis von 3 Zellen, weiter entfernte werden entfernt.

**Gestaltung:** Hase graubraun mit hellem Bauch, langen Ohren, Stummelschwanz; Ente mit weißem Körper, orangem Schnabel und Füßen, Bürzel, Flügeln statt Armen; Waschbär grau mit schwarzer Augenmaske und geringeltem Schwanz. Krieger: Brustplatte, Schulterstücke, Schwert in `hand`, kleiner Schild in `offHand`. Magier: lange Robe, spitzer Hut auf `head`, Stab mit leuchtender Kugel. Dieb: Kapuze, Umhang, je ein Dolch in beiden Händen. Gedeckte Farben, `MeshStandardMaterial`, mattes Finish.

- [ ] **Step 1:** Implementieren. `main.js` zeigt eine Vorschauszene mit allen neun Kombinationen nebeneinander auf dem Gelände.
- [ ] **Step 2:** Im Browser prüfen und Bildschirmfoto ansehen: alle neun Figuren unterscheidbar, Tier und Klasse erkennbar, Schatten bei `high`, keine bei `low`, Konsole ohne Fehler.
- [ ] **Step 3:** Fenster auf 400×800 und 1600×500 stellen: Bild unverzerrt, `resize()` liefert passende Halbmaße (Review Focus 5).
- [ ] **Step 4:** Commit `feat: renderer, terrain view, character builder`.

---

### Task 10: Darstellung – Gegner, Geschosse, Effekte

**Files:**
- Create: `src/render/enemies.js`, `src/render/effects.js`

**Interfaces:**
- Consumes: `World`, `ENEMIES`, Ereignistypen aus den Aufgaben 4–7.
- Produces:
  - `createEnemyView(scene) → { sync(world, alpha), dispose() }`: ein `InstancedMesh` je Gegnertyp (Kapazität 300, Bär 4) aus wenigen zusammengefügten Formen je Typ; Elite größer und mit leuchtender Tönung über Instanzfarbe; Blickrichtung zum Helden; Geschosse, Aufsammelbares und Umlaufkugeln ebenfalls instanziert. `alpha` gleicht zwischen zwei Logikschritten aus (vorherige Position je Objekt merken).
  - `createEffects(scene, uiLayer, { quality }) → { handle(events, world), update(dt), setQuality(q), dispose() }`: je Ereignis ein Effekt aus einem wiederverwendeten Vorrat – `cast` zeichnet die Form der Fähigkeit (Bogen, Ring, Streifen, Einschlag), `hit` Funken und aufsteigende Schadenszahl (HTML-Element aus Vorrat von 60, kritisch größer und gelb), `kill` kurzer Staub, `bossTelegraph` roter Bodenkreis, der sich füllt, `levelup` Lichtsäule, `heroHit` roter Bildschirmrand. Bei `low` halbe Partikelzahl und keine Schadenszahlen unter 5.

- [ ] **Step 1:** Implementieren. `main.js` startet zum Testen einen Durchgang direkt (Hase Krieger, fester Startwert), Bewegung noch über eine vorläufige Tastenabfrage.
- [ ] **Step 2:** Im Browser prüfen: Gegner laufen heran, Hiebe sichtbar, Schadenszahlen steigen auf, Erfahrungssplitter werden eingesammelt, Konsole ohne Fehler.
- [ ] **Step 3:** Leistung messen: Welt mit 300 Ratten füllen (`?debug=1&stress=1`), Bildrate über 5 s per `requestAnimationFrame`-Zähler ausgeben. Erwartet mindestens 30 Bilder/s; darunter Formen je Gegner vereinfachen.
- [ ] **Step 4:** Commit `feat: enemy, projectile and effect rendering`.

---

### Task 11: Menüs, Heldenerstellung, Bildschirmwechsel

**Files:**
- Create: `src/ui/screens.js`, `src/ui/menus.js`, `src/ui/heroCreate.js`
- Modify: `src/main.js`, `styles.css`, `index.html`

**Interfaces:**
- Consumes: `createStore`, `addHero`, `deleteHero`, `normalizeHeroName`, `ANIMALS`, `CLASSES`, `buildCharacter`, `isWebGLAvailable`.
- Produces:
  - `createScreens(root) → { show(name, props), current() }` mit den Bildschirmen `main`, `heroes`, `createAnimal`, `createClass`, `createName`, `mode`, `game`, `result`, `metaShop`, `settings`.
  - `app` in `main.js`: hält `store`, aktuellen Helden, aktuellen `Run`; `startRun(heroId)` und `endRun()` für Aufgabe 12.
  - Meldungsleiste `showNotice(text, { sticky })` für Speicherhinweise.

**Verhalten:** Ablauf wie Spec 4. Tier- und Klassenkarten zeigen drehende 3D-Vorschau (ein gemeinsamer Renderer, Figur je Auswahl getauscht), Werte aus `computeStats` und Beschreibung. Abenteuer-Modus als gesperrte Karte „kommt später". Löschen mit Rückfrage. Bei sechs Helden ist „Neuer Held" deaktiviert. Ladezustände: `corrupt` → Hinweis „Spielstand war beschädigt und wurde gesichert"; `newer` → „Spielstand stammt von einer neueren Version"; `unavailable` oder `saved false` → dauerhaft „Fortschritt kann nicht gespeichert werden". Ohne WebGL eine Seite mit Erklärung statt des Spiels. Auf das `storage`-Ereignis des Fensters hin laden Menüs den Stand neu.

- [ ] **Step 1:** Implementieren.
- [ ] **Step 2:** Im Browser durchspielen: Held für jedes Tier und jede Klasse anlegen; Namen leer, mit 40 Zeichen und `<b>x</b>` eingeben (erwartet „Held N", 16 Zeichen, sichtbarer Text ohne Fettdruck); sieben Helden versuchen; löschen; Seite neu laden → Helden noch da.
- [ ] **Step 3:** `localStorage`-Eintrag in der Konsole auf `"{"` setzen, neu laden → Hinweis erscheint, `BACKUP_KEY` enthält `"{"`.
- [ ] **Step 4:** Commit `feat: menus, hero creation, screen flow`.

---

### Task 12: Spielschleife, Eingabe, Anzeige im Spiel, Level-up, Ergebnis

**Files:**
- Create: `src/input/keyboard.js`, `src/ui/hud.js`, `src/ui/levelup.js`, `src/ui/result.js`, `tests/keyboard.test.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `createSurvivorRun`, `stepRun`, `chooseCard`, `setPaused`, `setView`, `getSummary`, `metaModifiers`, `hasRevive`, `recordRun`, Darstellung aus Aufgaben 9–10.
- Produces:
  - `createKeyState() → { down(code), up(code), clear(), readMoveVector(): { moveX, moveZ } }`: WASD und Pfeiltasten; gegenläufige Tasten heben sich auf; Ergebnis nicht normalisiert (das macht `stepWorld`). `attachKeyboard(target, keyState, { onPause, onCardKey })` hängt die Ereignisse an und ruft bei `blur` `clear()`.
  - Spielschleife in `main.js`: fester Schritt `1/60`, Akkumulator, höchstens 5 Schritte je Bild, `alpha` an die Darstellung; bei `?debug=1` gilt `timeScale` aus `?speed=` (Standard 1) und Taste `K` tötet alle Gegner, `L` gibt ein Level.

**Verhalten:** Anzeige wie Spec 6.6. Level-up-Dialog mit drei Karten (Name, Art, Wirkung in Worten wie „Schwerthieb Stufe 3: Winkel 150°"), Auswahl per Klick oder Taste 1–3. Esc schaltet Pause mit Menü (Weiter, Aufgeben). Fokusverlust des Fensters und `visibilitychange` pausieren. Bei `won`/`lost`: `recordRun` über `store.update`, dann Ergebnisbildschirm mit Zusammenfassung und Schaden je Fähigkeit als Balken; „Nochmal" und „Zurück".

- [ ] **Step 1:** Tests schreiben: `down('KeyA')`+`down('KeyD')` → `moveX 0`; `down('KeyW')` → `moveZ −1`; `down('KeyW')`+`down('KeyD')` → `(1, −1)`; `down('ArrowLeft')` wirkt wie `KeyA`; nach `clear()` → `(0, 0)`; `up` einer nicht gedrückten Taste ändert nichts.
- [ ] **Step 2:** FAIL prüfen, `keyboard.js` implementieren, `failed: 0` prüfen.
- [ ] **Step 3:** Schleife, Anzeige, Dialoge implementieren.
- [ ] **Step 4:** Im Browser durchspielen mit `?debug=1&speed=6`: Level-ups wählen (Klick und Tasten), Pause, Tab wechseln (Spiel pausiert, Held läuft danach nicht von allein), sterben → Ergebnis, Gold im Hauptmenü gestiegen; mit `K` bis zum Sieg → Ergebnis „Sieg", beste Zeit gespeichert; Seite neu laden → Werte bleiben.
- [ ] **Step 5:** Mit jeder Klasse einen Durchgang bis mindestens Level 12 spielen und jede der 15 Fähigkeiten einmal im Bild sehen.
- [ ] **Step 6:** Commit `feat: game loop, input, HUD, level-up and result screens`.

---

### Task 13: Dauerboni-Laden, Einstellungen, Export/Import, Ton

**Files:**
- Create: `src/ui/metaShop.js`, `src/ui/settings.js`, `src/audio/sfx.js`
- Modify: `src/main.js`, `src/ui/menus.js`

**Interfaces:**
- Consumes: `META`, `metaPrice`, `buyMeta`, `store.update`, `store.exportJson`, `store.importJson`.
- Produces: `createSfx() → { setVolume(0..100), handle(events), resume() }`: Oszillator- und Rauschklänge für `hit` (gedrosselt auf höchstens 12 je Sekunde), `pickup`, `levelup`, `bossSpawn`, `heroHit`, `death`, `victory`, `chest`; `resume()` wird beim ersten Klick aufgerufen (Browser verlangen eine Nutzeraktion).

**Verhalten:** Laden zeigt je Bonus Stufe, Wirkung der nächsten Stufe, Preis; Knopf deaktiviert bei zu wenig Gold oder Höchststufe; Kauf läuft über `store.update`. Einstellungen: Regler Lautstärke, Auswahl Qualität (wirkt sofort über `setQuality`). Export lädt `animalwarrior-spielstand.json` über einen Blob-Link herunter. Import über Dateiauswahl, Rückfrage „Vorhandenen Spielstand ersetzen?", Fehlermeldung bei Ablehnung.

- [ ] **Step 1:** Implementieren.
- [ ] **Step 2:** Im Browser prüfen: mit zu wenig Gold nicht kaufbar; nach Kauf von `leben` hat ein neuer Durchgang höheres Startleben; `wiederbelebung` belebt einmal wieder; Export, Helden löschen, Import → Stand wieder da; Import einer Textdatei mit `hallo` → Fehlermeldung, Stand unverändert; Qualität `low` schaltet Schatten ab; Lautstärke 0 ist stumm.
- [ ] **Step 3:** Kauf in zwei Tabs: in Tab A Laden öffnen, in Tab B einen Bonus kaufen, in Tab A einen anderen kaufen → beide Käufe vorhanden, Gold stimmt (Review Focus 4).
- [ ] **Step 4:** Commit `feat: meta shop, settings, export/import, sound effects`.

---

### Task 14: Abschlussprüfung

**Files:**
- Modify: nach Befund
- Create: `README.md` (Starten lokal, Tests, Veröffentlichen über GitHub Pages, Debug-Schalter)

- [ ] **Step 1:** `tests.html` komplett → `failed: 0`.
- [ ] **Step 2:** Mit `grep` prüfen: kein `Math.random` unter `src/core`, `src/modes`, `src/save`; kein `three` und kein `document`/`window`/`localStorage` unter `src/core`, `src/modes`, `src/data`, `src/save`; kein `innerHTML` mit Variablen unter `src/ui`; keine Pfade mit führendem `/` in `index.html`, `tests.html` und Importen.
- [ ] **Step 3:** Spiel aus einem Unterpfad ausliefern (Server eine Ebene höher starten, `http://localhost:8080/AnimalWarrior/`) → lädt und läuft; das entspricht GitHub Pages.
- [ ] **Step 4:** Ein vollständiger Durchgang ohne Debug-Beschleunigung über mindestens 5 Minuten bis zum ersten Boss; Bildrate und Konsole beobachten.
- [ ] **Step 5:** Erfolgskriterien der Spec (Abschnitt 1) einzeln abhaken und dem Nutzer melden, was geprüft ist und was nicht (insbesondere das Balancing über 15 Minuten).
- [ ] **Step 6:** Commit `docs: README, final verification fixes`.
