# Spielgefühl und Handy – Implementierungsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Der Wellen-Modus lässt sich hochkant am Handy mit einem Daumen und am PC nur mit der Maus spielen, alle Klassen zielen selbst, Treffer und Tod sind sichtbar, auf der Karte stehen Kisten, und Umgebung und Menüs nutzen die gelieferten gemalten Bilder.

**Architecture:** Jede Neuerung erweitert einen vorhandenen Baustein: Zeigereingabe neben der Tastatur in `src/input`, Zielwahl in `src/core/abilities.js`, ein neuer Zustand „stirbt" in `src/modes/survivor.js`, Kisten als eigene Logikdatei neben dem Gelände, Darstellung über die vorhandenen Sprite-Bausteine. Rechenregeln, die sich ohne Browser prüfen lassen, liegen als reine Funktionen vor und sind getestet; alles Sichtbare wird im Browser angesehen.

**Tech Stack:** JavaScript ES-Module ohne Build, Three.js 0.170.0 (`vendor/`), Pointer Events, CSS, Tests in `tests.html`.

**Spec:** `docs/superpowers/specs/2026-11-13-spielgefuehl-und-handy-design.md` (baut auf `docs/superpowers/specs/2026-11-12-kern-und-wellenmodus-design.md` auf)

## Global Constraints

- Kein Node.js, kein Build, keine CDN-Abhängigkeit zur Laufzeit; alle Pfade relativ (kein führendes `/`).
- `src/core`, `src/modes`, `src/data`, `src/save` importieren weder Three.js noch greifen sie auf `window`, `document`, `localStorage`, `Date.now()` zu. Zufall dort nur über `createRng(seed)` bzw. `world.rng`.
- `src/render` und `src/ui` ändern den Weltzustand nie; Rückmeldungen laufen nur über `chooseCard`, `setPaused`, `abandonRun` und das neue `skipDying` aus `survivor.js` (Debug-Tasten ausgenommen).
- Alle Balancing- und Gestaltungszahlen stehen in `src/data/`.
- Oberfläche auf Deutsch; Text nur über `textContent`.
- Alle Pixelangaben sind CSS-Pixel.
- Die Tastatursteuerung bleibt unverändert nutzbar.
- Keine neue Spielstand-Version; vorhandene Spielstände und alte Exporte bleiben gültig.
- Fehlt ein Bild oder Ausschnitt, bleibt dafür die bisherige 3D-Darstellung.
- Git: nach jeder Aufgabe committen, nur eigene Dateien stagen, Nachricht endet mit dem Co-Authored-By-Trailer des schreibenden Modells. **Nie pushen.**
- Tests: `http://localhost:8080/tests.html` (Server über `preview_start` „animalwarrior"), Ergebnis in `window.__testResults`, bestanden heißt `failed === 0`. Ausgangsstand: 269 Tests.
- Wo eine Aufgabe Testschritte hat: erst den Test schreiben und scheitern sehen, dann bauen.

## Review Focus

1. **Finger verlässt den Bildschirm, Anruf oder App-Wechsel mitten im Ziehen** → der Held bleibt stehen, nichts bleibt „gedrückt". Test in Aufgabe 1 (`cancel`, Fokusverlust setzt zurück).
2. **Zweiter Finger tippt auf Pause oder eine Karte, während der erste steuert** → der Knopf reagiert, die Steuerung springt nicht um. Test in Aufgabe 1.
3. **Handy wird im Durchgang gedreht oder das Fenster verändert** → Kamera passt sich an, Steuerkreis wird zurückgesetzt, Anzeige ordnet sich neu, der Held läuft nicht von selbst weiter. Test in Aufgabe 5 (`cameraDistanceFor` für beide Formate), Handprobe dort.
4. **Sterbephase wird gestört: Pause, Aufgeben, Tab im Hintergrund** → kein hängender Zustand, genau ein Speichern. Tests in Aufgabe 3.
5. **Kiste mit Gratis-Aufwertung im selben Schritt wie ein Level-up, oder letzte freie Aufwertung** → erst die Kistenkarte, dann der Level-up-Dialog; keine Karte geht verloren, kein Fehler bei ausgereiztem Vorrat. Test in Aufgabe 4.

---

## Dateien

```
src/data/input.js            Zahlen der Zeigersteuerung
src/input/pointer.js         Zeigerzustand → Laufrichtung, Anbindung an Pointer Events
src/ui/stick.js              sichtbarer Steuerkreis
src/data/abilities.js        + Zielangabe je Fähigkeit
src/core/abilities.js        + Zielrichtung
src/data/waves.js            + Zahlen der Sterbephase
src/modes/survivor.js        + Zustand „stirbt", Kisten öffnen
src/data/texts.js            Sprüche für Tod und Sieg
src/ui/deathSequence.js      Verlauf der Abblende als reine Funktion + Anzeige
src/data/chests.js           Zahlen und Inhaltstabelle der Kisten
src/core/chests.js           Kisten aus Startwert und Zelle
src/render/chests.js         Kisten im Bild
src/ui/chestHint.js          Pfeil zur nächsten Kiste
src/render/cameraFit.js      Kameraabstand je Seitenverhältnis
src/data/environment.js      Ausschnitte und Größen der Umgebungsbilder, Menü-Szenen
src/render/environment.js    Laden und Aufbereiten der Umgebungsbilder
tests/*.test.js              je neue Logikdatei eine Testdatei
```

---

### Task 1: Steuerung mit Finger und Maus

**Files:**
- Create: `src/data/input.js`, `src/input/pointer.js`, `src/ui/stick.js`, `tests/pointer.test.js`
- Modify: `src/game.js`, `index.html`, `styles.css`, `tests/index.js`

**Interfaces:**
- Consumes: `createKeyState().readMoveVector()` aus `src/input/keyboard.js`.
- Produces:
  - `POINTER = { deadZone: 12, followDistance: 70 }` in `src/data/input.js`.
  - `createPointerState() → { down(id, x, y), move(id, x, y), up(id), cancel(id), reset(), active(): boolean, anchor(): {x, y} | null, knob(): {x, y} | null, readMoveVector(): { moveX, moveZ } }`. Nur der erste Zeiger steuert. Rechts im Bild ist `moveX = 1`, unten im Bild `moveZ = 1`. Außerhalb der Totzone ist der Vektor auf Länge 1 normiert, innerhalb `(0, 0)`. Ist der Zeiger weiter als `followDistance` vom Ansatzpunkt, wandert der Ansatzpunkt auf der Verbindungslinie nach, bis der Abstand `followDistance` beträgt.
  - `combineMove(keyVector, pointerVector) → { moveX, moveZ }`: Ist der Tastaturvektor ungleich null, gilt er; sonst der Zeigervektor.
  - `attachPointer(target, pointerState, { isBlocked: () => boolean }) → detach()`: hängt `pointerdown/move/up/cancel` und `lostpointercapture` an; ignoriert Zeiger, die auf einem Element mit `data-ui-control` (oder darin) beginnen; bei Maus nur die linke Taste; ruft `reset()` solange `isBlocked()` wahr ist, und bei `blur` und `visibilitychange`.
  - `createStick(uiLayer) → { update(pointerState), dispose() }`.

- [ ] **Step 1:** Tests schreiben (`tests/pointer.test.js`):

```js
test('pointer: Totzone und Richtung', () => {
  const p = createPointerState();
  p.down(1, 100, 100);
  assertEqual(p.readMoveVector(), { moveX: 0, moveZ: 0 });
  p.move(1, 108, 100);
  assertEqual(p.readMoveVector(), { moveX: 0, moveZ: 0 });
  p.move(1, 130, 100);
  assertEqual(p.readMoveVector(), { moveX: 1, moveZ: 0 });
  p.move(1, 100, 60);
  assertEqual(p.readMoveVector(), { moveX: 0, moveZ: -1 });
  p.move(1, 130, 130);
  const v = p.readMoveVector();
  assertClose(v.moveX, Math.SQRT1_2); assertClose(v.moveZ, Math.SQRT1_2);
});
test('pointer: Ansatzpunkt wandert nach', () => {
  const p = createPointerState();
  p.down(1, 100, 100); p.move(1, 300, 100);
  assertClose(p.anchor().x, 230); assertClose(p.anchor().y, 100);
});
test('pointer: zweiter Finger steuert nicht und beendet nichts', () => {
  const p = createPointerState();
  p.down(1, 100, 100); p.move(1, 130, 100);
  p.down(2, 10, 10); p.move(2, 10, 200); p.up(2);
  assertEqual(p.readMoveVector(), { moveX: 1, moveZ: 0 });
});
test('pointer: up, cancel und reset halten an', () => {
  for (const end of ['up', 'cancel']) {
    const p = createPointerState();
    p.down(1, 100, 100); p.move(1, 130, 100); p[end](1);
    assertEqual(p.readMoveVector(), { moveX: 0, moveZ: 0 });
    assertEqual(p.anchor(), null); assertEqual(p.active(), false);
  }
  const p = createPointerState();
  p.down(1, 100, 100); p.move(1, 130, 100); p.reset();
  assertEqual(p.readMoveVector(), { moveX: 0, moveZ: 0 });
});
test('pointer: Tastatur hat Vorrang', () => {
  assertEqual(combineMove({ moveX: -1, moveZ: 0 }, { moveX: 1, moveZ: 0 }), { moveX: -1, moveZ: 0 });
  assertEqual(combineMove({ moveX: 0, moveZ: 0 }, { moveX: 1, moveZ: 0 }), { moveX: 1, moveZ: 0 });
});
```

- [ ] **Step 2:** Tests ausführen → scheitern (Modul fehlt). `src/data/input.js` und `src/input/pointer.js` bauen. Tests → `failed: 0`.
- [ ] **Step 3:** In `src/game.js` den Zeigerzustand neben der Tastatur anlegen, an die Spielfläche hängen (`isBlocked`: Zustand ist nicht `playing`), `combineMove` an `stepRun` geben, in `stop()` lösen. `src/ui/stick.js` bauen: Ring am Ansatzpunkt, Knopf in Zugrichtung, nur sichtbar solange aktiv, `pointer-events: none`.
- [ ] **Step 4:** `index.html`: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">`. `styles.css`: auf der Spielfläche `touch-action: none; user-select: none; -webkit-user-select: none;`, auf `html, body` `overscroll-behavior: none`. Alle Knöpfe und Dialoge der Spielanzeige bekommen `data-ui-control`.
- [ ] **Step 5:** Im Browser prüfen: ein Durchgang nur mit Maus (ziehen, loslassen, Karte per Klick, Pause per Esc); mit simuliertem Touch bei 390 × 844 (`resize_window`); während des Ziehens eine Lauftaste drücken → Tastatur gilt; Level-up öffnet sich während des Ziehens → nach Kartenwahl steht der Held, bis neu angesetzt wird. Notieren, was über die Konsole geprüft wurde.
- [ ] **Step 6:** Commit `feat: pointer and touch steering`.

---

### Task 2: Auto-Zielen

**Files:**
- Modify: `src/data/abilities.js`, `src/core/abilities.js`, `src/render/hero.js`, `tests/abilities.test.js`

**Interfaces:**
- Consumes: `isTargetable(enemy)`, die vorhandene Zielwahl für `nearest`, `castAbility(world, abilityId, level, aim?)`.
- Produces:
  - Neues Datenfeld `aim: { key, extra }` an den fünf Fähigkeiten mit `target: 'facing'`: `schwerthieb { key: 'radius', extra: 1.5 }`, `schildstoss { key: 'radius', extra: 1.5 }`, `erdspalter { key: 'length', extra: 1.5 }`, `wurfdolche { key: 'range', extra: 0 }`, `klingenfaecher { key: 'range', extra: 0 }`. Zielreichweite = `params[key] + extra` mit den schon nach Stufe und Fläche berechneten `params`.
  - `aimDirection(world, params, aim) → { x, z } | null` in `src/core/abilities.js`: Einheitsvektor vom Helden zum nächsten anvisierbaren Gegner innerhalb der Zielreichweite (Abstand Mitte zu Mitte minus Gegnerradius), sonst `null`.
  - Richtung einer `facing`-Fähigkeit: mitgegebener Zielpunkt `aim`, sonst `aimDirection`, sonst `hero.facing`. Bogen, Linie und Fächer werden auf diese Richtung zentriert. `hero.facing` selbst bleibt die Laufrichtung.
  - Die Heldenfigur blickt 0,3 s nach einem `cast`-Ereignis einer Fähigkeit mit `aim` in dessen `dirX`-Richtung, danach wieder in Laufrichtung (Zahl in `src/data/sprites.js`).

- [ ] **Step 1:** Tests schreiben (Held bei (0,0), `hero.facing` = (1,0), unbewegliche Gegner mit 1000 Leben wie in den vorhandenen Fähigkeitstests):
  - `schwerthieb` mit Ratte bei (−2, 0): Ratte wird getroffen, `cast`-Ereignis hat `dirX ≈ −1`.
  - `schwerthieb` mit Ratte bei (−6, 0): kein Treffer, `dirX ≈ 1`.
  - Zwei Ratten bei (0, 3) und (−2, 0): Richtung zeigt auf (−2, 0).
  - Fliehender Schatten bei (−1, 0) (`untargetable`) und Ratte bei (0, 3): Richtung zeigt auf (0, 3).
  - `klingenfaecher` mit Ratte bei (0, 5): `cast`-Richtung ≈ (0, 1); die mittlere Klinge fliegt in diese Richtung.
  - `erdspalter` Stufe 3 (Länge 12) trifft eine Ratte bei (0, −13), Stufe 1 (Länge 9) zielt bei einer Ratte in (0, −11) nicht dorthin (`dirX ≈ 1`).
  - `castAbility(world, 'schwerthieb', 1, { x: 0, z: 5 })` mit Ratte bei (−2, 0): Richtung ≈ (0, 1).
  - `aimDirection` liefert `null` in leerer Welt.
  - `wirbelschlag`, `kriegsschrei`, `giftflaeche`, `schattenklon` verhalten sich unverändert (je ein vorhandener Test bleibt grün; keiner von ihnen hat ein `aim`-Feld).
- [ ] **Step 2:** Scheitern sehen, bauen, `failed: 0`.
- [ ] **Step 3:** Im Browser prüfen: Krieger und Dieb stehen lassen und Gegner von links kommen lassen → Hieb bzw. Dolche gehen nach links, die Figur dreht sich beim Angriff dorthin.
- [ ] **Step 4:** Commit `feat: auto-aim for facing abilities`.

---

### Task 3: Schaden, Sterbephase, Sieg

**Files:**
- Create: `src/data/texts.js`, `src/ui/deathSequence.js`, `tests/deathSequence.test.js`
- Modify: `src/data/waves.js`, `src/modes/survivor.js`, `src/game.js`, `src/render/hero.js`, `src/render/renderer.js`, `src/render/effects.js`, `src/data/sfx.js`, `styles.css`, `tests/survivor.test.js`, `tests/index.js`

**Interfaces:**
- Produces:
  - `DYING = { duration: 1.0, timeScale: 0.25 }` in `src/data/waves.js`.
  - `run.state` bekommt den Wert `'dying'`. Übergänge: `playing → dying` (Leben ≤ 0, keine Wiederbelebung übrig), `dying → lost` (nach `DYING.duration` Sekunden Echtzeit oder durch `skipDying`), `playing → lost` (Aufgeben), `dying → lost` (Aufgeben). Wiederbelebung wie bisher ohne `dying`.
  - Beim Eintritt in `dying`: Ereignis `{ type: 'dying' }`, `run.deathTime = world.time`; `getSummary(run).time` und `displayTime(run)` liefern ab dann `deathTime`. Das vorhandene Ereignis `death` und das Abschließen der `run.facts` passieren beim Übergang nach `lost`, genau einmal.
  - In `dying` rechnet `stepRun` die Welt mit `dt × DYING.timeScale` weiter; es erscheinen keine Gegner, Elite, Bosse oder Schatten; der Held bewegt sich nicht, löst keine Fähigkeiten aus und nimmt keinen Schaden; Level-ups werden nicht mehr angeboten (`cards` bleibt `null`).
  - `skipDying(run)`: nur im Zustand `dying` wirksam, setzt sofort `lost`.
  - `setPaused(run, true)` wirkt in `dying` nicht.
  - `DEATH_LINES` und `VICTORY_LINES` in `src/data/texts.js` (je mindestens sechs kurze deutsche Sprüche im Ton der Erfolge; `DEATH_LINES[0]` ist „Das Gras hier ist wirklich bequem.").
  - `deathSequence(t, reducedMotion) → { grayscale, darkness, heroTilt, heroOpacity, showText, canSkip, done }` in `src/ui/deathSequence.js`, `t` in Sekunden seit dem Ereignis `dying`. Normal: `grayscale` 0 → 1 über 0 bis 1,2 s; `darkness` 0 → 1 über 1,0 bis 3,2 s; `heroTilt` 0 → 1 über 0 bis 0,8 s; `heroOpacity` 1 → 0 über 0,8 bis 2,0 s; `showText` ab 2,4 s; `canSkip` ab 0,5 s; `done` ab 4,4 s. Mit `reducedMotion`: `heroTilt` immer 0, `darkness` 0 → 1 über 0 bis 1,2 s, `showText` ab 1,2 s, `done` ab 3,0 s.
  - `createDeathOverlay(uiLayer) → { apply(sequenceValues, line), showVictory(line), hide(), dispose() }` in derselben Datei: Farbverlust und Abblende über einen CSS-Filter auf der Spielfläche und ein schwarzes Deckelement; Text „Gefallen" bzw. „Überlebt!" mit Spruch.
  - `heroView.flash()` (120 ms rot), `heroView.setDying(tilt, opacity)`, `renderer.shake(amount, seconds)` (Standard 0,08 Einheiten, 0,15 s; Zahlen in `src/data/sprites.js`).

- [ ] **Step 1:** Tests schreiben.
  `tests/deathSequence.test.js`: Werte bei `t = 0`, `0.6`, `1.2`, `2.0`, `3.2`, `4.4` normal und bei `0`, `0.6`, `1.2`, `3.0` reduziert, mit den Zahlen oben (z. B. normal `t = 0.6` → `grayscale 0.5`, `canSkip true`, `darkness 0`; `t = 3.2` → `darkness 1`, `showText true`, `done false`; reduziert `t = 0.6` → `darkness 0.5`, `heroTilt 0`); alle Werte liegen für `t` von 0 bis 6 in Schritten von 0,05 zwischen 0 und 1 und `darkness` fällt nie.
  `tests/survivor.test.js` (neue Tests, vorhandene Tod-Tests auf den neuen Ablauf umstellen):
  - Tödlicher Treffer ohne Wiederbelebung → Zustand `dying`, Ereignis `dying`, kein `death`.
  - Nach insgesamt 1,0 s Echtzeit in `dying` → `lost`, genau ein `death`-Ereignis über den ganzen Lauf; `world.time` ist in der Phase um 0,25 s gewachsen; `getSummary(run).time` ist der Todeszeitpunkt.
  - In `dying`: Gegnerzahl wächst nicht; `hero.hp` sinkt nicht weiter; eine Ratte legt in der Phase ein Viertel der normalen Strecke zurück; Fähigkeiten des Helden erzeugen kein `cast`.
  - `skipDying` → sofort `lost`, ein `death`; im Zustand `playing` ändert `skipDying` nichts.
  - `setPaused(run, true)` in `dying` ändert den Zustand nicht.
  - `abandonRun` in `playing` → `lost` ohne `dying`; in `dying` → `lost`, insgesamt ein `death`.
  - Mit Wiederbelebung: erster Tod → `revive`, kein `dying`; zweiter → `dying`.
  - Tod und fälliges Level-up im selben Schritt → `dying`, `cards === null`, auch nach der Phase.
  - `run.facts.ended` ist in `dying` noch `false` und in `lost` `true`.
- [ ] **Step 2:** Scheitern sehen, Logik und `deathSequence` bauen, `failed: 0`.
- [ ] **Step 3:** Darstellung in `src/game.js`: Bei `heroHit` `heroView.flash()` und `renderer.shake()`; unter 25 % Leben pulsiert der vorhandene rote Rand (CSS-Klasse); ab `dying` jede Bildwiederholung `deathSequence(t, reducedMotion)` anwenden; Tippen, Klick oder Taste ruft bei `canSkip` `skipDying` und springt in der Abblende zu „Text sichtbar"; das Ende des Durchgangs (`onEnd`) wird erst gemeldet, wenn der Zustand `lost` ist **und** (`done` oder abgekürzt). Bei `won`: 1,5 s `showVictory`, dann `onEnd`. `reducedMotion` aus `matchMedia('(prefers-reduced-motion: reduce)')`: dann beim Ereignis `dying` sofort `skipDying` und kein `shake`. Tab im Hintergrund während der Phase: beim Zurückkehren läuft die Abblende zu Ende; kein Zustand bleibt hängen. Ton: Eintrag `dying` in `src/data/sfx.js`.
- [ ] **Step 4:** Im Browser ansehen (`?debug=1`, Leben per Konsole senken): Treffer, wenig Leben, Tod bis Endbildschirm, Abkürzen, Aufgeben, Wiederbelebung, Sieg (Taste K bei 15:00). Prüfen, dass Gold nach dem Endbildschirm genau einmal gestiegen ist. Bildschirmfotos von Abblende und „Gefallen".
- [ ] **Step 5:** Commit `feat: hit feedback, dying phase and victory moment`.

---

### Task 4: Kisten auf der Karte

**Files:**
- Create: `src/data/chests.js`, `src/core/chests.js`, `src/render/chests.js`, `src/ui/chestHint.js`, `tests/chests.test.js`
- Modify: `src/core/world.js` (Feld `openedChests`), `src/modes/survivor.js`, `src/data/achievements.js`, `src/game.js`, `src/data/sfx.js`, `styles.css`, `tests/achievements.test.js`, `tests/index.js`

**Interfaces:**
- Consumes: `obstaclesNear(seed, x, z, range)`, `TERRAIN_CELL`, `createRng`, `rollCards(world, 1)`, `applyCard(world, card, false)`, `run.facts`, `run.events`.
- Produces:
  - `MAP_CHESTS = { chancePerCell: 0.12, clearRadius: 12, openRadius: 1.2, radius: 0.5, hintRange: 40, table: [ { weight: 60, kind: 'gold', gold: [3, 8] }, { weight: 30, kind: 'heal', heal: 0.25, gold: [2, 4] }, { weight: 10, kind: 'upgrade' } ] }` in `src/data/chests.js`.
  - `chestInCell(seed, cx, cz) → { id, x, z, kind, gold } | null` in `src/core/chests.js`: fest aus Startwert und Zelle (eigener Zufallsstrom, nicht der der Hindernisse); `id` ist `"cx:cz"`; `gold` ist die gewürfelte ganze Zahl (0 bei `upgrade`); keine Kiste näher als `clearRadius` am Ursprung; keine, deren Kreis ein Hindernis berührt (dann hat die Zelle keine Kiste).
  - `chestsNear(seed, x, z, range) → Chest[]`.
  - `world.openedChests: Set<string>`.
  - `openMapChests(run)` in `src/modes/survivor.js`, aus `stepRun` je Teilschritt aufgerufen, **vor** der Prüfung auf Level-ups: Für jede ungeöffnete Kiste mit Abstand Held–Kiste ≤ `openRadius + radius`: als geöffnet merken, Gold × `stats.goldGain` zu `world.run.gold`, Heilung um `heal × maxHp` (gedeckelt), bei `upgrade` `applyCard(world, rollCards(world, 1)[0], false)`; Ereignis `{ type: 'mapChest', id, x, z, kind, gold, heal, card }`; `run.facts.chestsOpened += 1`.
  - `nearestUnopenedChest(world, range) → Chest | null`.
  - Erfolg `schatzsucher`: Titel „Schatzsucher", Bedingung „Öffne in einem Durchgang 10 Kisten", Spruch „Fremde Kisten öffnen: hier ausnahmsweise erlaubt.", 50 Gold, erfüllt bei `run.chestsOpened >= 10`.
  - `createChestView(scene, seed, sprites) → { sync(world), dispose() }`: zeichnet Kisten im Umkreis, geschlossen oder offen. In dieser Aufgabe als einfache Holzkiste aus Formen; Aufgabe 6 ersetzt sie durch die gemalten Bilder.
  - `hintArrow(hero, chest, view) → { x, y, angle } | null` in `src/ui/chestHint.js` (rein): `hero` und `chest` in Weltkoordinaten, `view = { halfW, halfH, width, height, margin }`; `null`, wenn die Kiste im sichtbaren Bereich liegt; sonst ein Punkt auf dem um `margin` eingerückten Bildrand in Richtung der Kiste und der Winkel in Bogenmaß (0 = nach rechts, im Uhrzeigersinn positiv). `createChestHint(uiLayer) → { update(world, view), dispose() }`.

- [ ] **Step 1:** Tests schreiben (`tests/chests.test.js`):
  - `chestInCell` liefert für gleiche Eingaben dasselbe; für 20 Startwerte gibt es im Umkreis von 12 um den Ursprung keine Kiste.
  - Über 3000 Zellen (ohne Startbereich) liegt der Anteil der Zellen mit Kiste zwischen 0,09 und 0,13 (Hindernis-Ausschluss senkt ihn leicht unter 0,12).
  - Keine Kiste berührt ein Hindernis aus `obstaclesNear` (Abstand der Mitten ≥ Summe der Radien), geprüft für 500 Kisten.
  - Über mindestens 1000 Kisten: Anteil `gold` 0,55–0,65, `heal` 0,25–0,35, `upgrade` 0,06–0,14; `gold`-Kisten haben 3–8 Gold, `heal`-Kisten 2–4, `upgrade`-Kisten 0; alle ganzzahlig.
  - Öffnen: Held (Waschbär, `goldGain` 1,2) auf einer `gold`-Kiste mit 5 Gold → `run.gold` steigt um 6, Ereignis `mapChest`, `openedChests` enthält die Kennung; ein weiterer Schritt erzeugt kein zweites Ereignis und kein weiteres Gold.
  - `heal`-Kiste bei 50 % Leben → Leben +25 % des Maximums; bei 90 % → Maximum, nicht darüber.
  - `upgrade`-Kiste: eine Fähigkeit oder ein Bonus ist danach eine Stufe höher oder neu, `run.level` unverändert.
  - `upgrade`-Kiste, wenn alle Fähigkeiten und Boni auf Stufe 5 sind → kein Fehler, Ersatzkarte (Gold oder Heilung) angewendet.
  - Kiste mit Aufwertung und genug Erfahrung für ein Level-up im selben Schritt → nach dem Schritt ist der Zustand `levelup` mit drei Karten, und die Kistenkarte ist bereits angewendet (Ereignisreihenfolge `mapChest` vor `levelup`).
  - `run.facts.chestsOpened` zählt; Erfolg `schatzsucher` bei 9 nein, bei 10 ja.
  - `nearestUnopenedChest` überspringt geöffnete und liefert `null` außerhalb der Reichweite.
  - `hintArrow`: Kiste im Bild → `null`; Kiste weit rechts → Punkt am rechten Rand (x = `width − margin`), Winkel ≈ 0; Kiste weit unten → Winkel ≈ π/2; alle Punkte liegen innerhalb des Bildes.
- [ ] **Step 2:** Scheitern sehen, Logik bauen, `failed: 0`.
- [ ] **Step 3:** `createChestView`, `createChestHint` und Ton (`mapChest` in `src/data/sfx.js`) bauen und in `src/game.js` einhängen; beim Öffnen eine kurze Einblendung des Inhalts über der Kiste („+6 Gold", „Heilung", Name der Aufwertung) über die vorhandenen aufsteigenden Zahlen.
- [ ] **Step 4:** Im Browser prüfen: Pfeil zeigt zur nächsten Kiste und verschwindet, wenn sie im Bild ist; Hinlaufen öffnet; geöffnete Kiste bleibt offen stehen; bei 390 × 844 überdeckt der Pfeil keine Anzeige.
- [ ] **Step 5:** Commit `feat: loot chests scattered across the map`.

---

### Task 5: Handyfreundliche Oberfläche

**Files:**
- Create: `src/render/cameraFit.js`, `tests/cameraFit.test.js`
- Modify: `src/render/renderer.js`, `src/ui/hud.js`, `src/ui/levelup.js`, `src/ui/result.js`, `src/ui/menus.js`, `src/ui/heroCreate.js`, `src/ui/metaShop.js`, `src/ui/settings.js`, `src/ui/achievements.js`, `src/main.js`, `src/game.js`, `styles.css`, `tests/index.js`

**Interfaces:**
- Produces:
  - `CAMERA_FIT = { landscapeDistance: 15, minHalfWidth: 9, maxDistance: 40 }` in `src/data/sprites.js`.
  - `visibleHalfWidth(distance, aspect, fovDeg, elevationDeg) → number` und `cameraDistanceFor(aspect, fovDeg, elevationDeg) → number` in `src/render/cameraFit.js` (rein): `landscapeDistance`, solange damit `visibleHalfWidth ≥ minHalfWidth`; sonst der kleinste Abstand, der `minHalfWidth` erreicht, höchstens `maxDistance`. `visibleHalfWidth` ist die halbe sichtbare Breite auf Bodenhöhe durch den Zielpunkt (nicht die konservative Größe aus `resize()`).
  - `renderer.resize()` nutzt `cameraDistanceFor` mit dem aktuellen Seitenverhältnis.
  - `initialQuality(isTouchPrimary: boolean) → 'low' | 'high'` in `src/main.js` oder einem kleinen Modul daneben; wird nur verwendet, wenn beim Start kein Spielstand vorhanden ist (`status === 'empty'`); `isTouchPrimary` aus `matchMedia('(pointer: coarse)')`.
  - Pause-Knopf in der Spielanzeige (`data-ui-control`), tut dasselbe wie Esc.

- [ ] **Step 1:** Tests schreiben (`tests/cameraFit.test.js`): `cameraDistanceFor(16 / 9, fov, 55) === 15`; für `aspect = 390 / 844`: Ergebnis > 15 und ≤ 40, `visibleHalfWidth(ergebnis, aspect, fov, 55) ≥ 9 − 1e-6`, und mit `ergebnis − 0.5` wird 9 unterschritten; `visibleHalfWidth` wächst mit Abstand und mit Seitenverhältnis; extrem schmal (`aspect = 0.2`) → 40. `fov` ist der Wert, den `renderer.js` heute verwendet. Dazu `initialQuality(true) === 'low'`, `initialQuality(false) === 'high'`.
- [ ] **Step 2:** Scheitern sehen, bauen, `failed: 0`.
- [ ] **Step 3:** Gestaltung:
  - Ränder mit `env(safe-area-inset-*)` für Anzeige, Menüs und Dialoge.
  - Spielanzeige hochkant (`@media (orientation: portrait)`): oben ein Block mit Leben, Level, Erfahrung, Timer, klein daneben Gold und Tötungen; Boss- und Schattenbalken darunter; unten Fähigkeiten-Symbole und rechts der Pause-Knopf; Erfolgs-Einblendung über der unteren Leiste.
  - Alle Knöpfe mindestens 44 px hoch; Level-up-Karten hochkant untereinander über die volle Breite; Dialoge hochkant über die volle Breite mit Rand.
  - Beim Ändern der Fenstergröße oder Drehen: `resize()`, `setView`, Zeigerzustand `reset()`.
  - Ton: `resume()` zusätzlich bei `pointerup`, `touchend` und `click`.
- [ ] **Step 4:** Im Browser bei 360 × 640 und 390 × 844 durch alle Bildschirme gehen (Hauptmenü, Helden, Erstellung, Modus, Dauerboni, Einstellungen, Erfolge, Spiel, Level-up, Pause, Ergebnis): kein seitliches Scrollen, kein abgeschnittener oder kleiner als 44 px hoher Knopf, nichts unter dem Steuerbereich versteckt. Per Skript die Höhe aller sichtbaren `button`-Elemente je Bildschirm ausgeben und im Bericht nennen. Danach bei 1280 × 720 kontrollieren, dass sich dort nichts verschlechtert hat. Während eines Durchgangs zwischen 390 × 844 und 844 × 390 wechseln: Kamera passt sich an, Held läuft nicht von selbst.
- [ ] **Step 5:** Commit `feat: phone-friendly layout, portrait camera and pause button`.

---

### Task 6: Gemalte Umgebung und Menü-Hintergründe

**Files:**
- Create: `src/data/environment.js`, `src/render/environment.js`, `tests/environment.test.js`
- Modify: `src/render/terrain.js`, `src/render/chests.js`, `src/render/enemies.js` (Aufsammelbares), `src/render/sprites.js` (nur falls ein Helfer verallgemeinert werden muss), `src/main.js`, `src/game.js`, `src/ui/screens.js`, `styles.css`, `tests/index.js`
- Assets (liegen vor, committet): `assets/umgebung/boden.webp`, `assets/umgebung/objekte.webp`, `assets/umgebung/szenen.webp`

**Interfaces:**
- Consumes: `removeBackground`, `spriteUv`, Billboard-Helfer und Laden aus `src/render/sprites.js`; `obstaclesNear`; `chestsNear`; `createRng`.
- Produces:
  - `ENV_SHEETS = { boden: 'assets/umgebung/boden.webp', objekte: 'assets/umgebung/objekte.webp' }`.
  - `ENV_SPRITES: Record<id, { x, y, w, h, heightM, footOffset }>` für `laubbaum`, `tanne`, `birke`, `fels-gross`, `fels-klein`, `busch`, `stumpf`, `farn`, `blumen`, `pilze`, `truhe-zu`, `truhe-offen`, `muenze`, `trank`, `kristall`; Rechtecke einmal mit einem Canvas-Skript aus `objekte.webp` ausgemessen (enges Rechteck plus 6 px Rand, ohne Überlappung mit Nachbarn). Höhen in Metern: Laubbaum 6, Tanne 6,5, Birke 6, großer Fels 2,2, kleiner Fels 1,2, Busch 1,3, Stumpf 1,1, Farn 0,9, Blumen 0,7, Pilze 0,5, Truhen 0,9, Münze 0,45, Trank 0,5, Kristall 0,45.
  - `OBSTACLE_LOOK`: Bäume wählen fest nach Position zwischen `laubbaum`, `tanne`, `birke`; Felsen mit Radius ≥ Schwelle nutzen `fels-gross`, sonst `fels-klein`. `obstacleSprite(obstacle) → id` (rein).
  - `DECO = { perCell: [0, 4], kinds: { busch: 2, farn: 3, blumen: 4, pilze: 2, stumpf: 1 }, startClear: 3 }` und `decoInCell(seed, cx, cz) → [{ id, x, z, mirror }]` (rein, eigener Zufallsstrom, nicht innerhalb von Hindernissen, nicht näher als `startClear` am Ursprung).
  - `GROUND = { tileM: 8, seamBlendPx: 48 }`; `blendSeams(imageData, margin) → imageData` (rein): mischt die äußeren `margin` Pixel jeder Kante mit der gegenüberliegenden Seite, sodass linke und rechte sowie obere und untere Randspalte nahezu gleich sind.
  - `loadEnvironment() → Promise<{ ok, ground, objects, sizes }>`: löst nie mit Fehler ab; `ok: false`, wenn ein Bild fehlt.
  - `MENU_SCENES = { main: 'baum', heroes: 'waldweg', createAnimal: 'waldweg', createClass: 'waldweg', createName: 'waldweg', mode: 'bruecke', metaShop: 'hoehle', achievements: 'wasserfall', settings: 'teich', result: 'baum' }` und `SCENE_CELLS` (Spalte und Zeile jedes Motivs im 3 × 2-Raster von `szenen.webp`: `waldweg` 0/0, `bruecke` 1/0, `hoehle` 2/0, `wasserfall` 0/1, `baum` 1/1, `teich` 2/1).
  - `occludesHero(treeRectOnScreen, heroPointOnScreen, treeIsNearerToCamera) → boolean` (rein).

- [ ] **Step 1:** Tests schreiben (`tests/environment.test.js`):
  - Jeder Eintrag in `ENV_SPRITES` hat positive `w`, `h`, `heightM`; keine zwei Rechtecke überlappen sich.
  - `obstacleSprite` liefert für dieselbe Position dasselbe; über 300 Bäume kommen alle drei Baumarten vor; ein Fels mit großem Radius ergibt `fels-gross`, ein kleiner `fels-klein`.
  - `decoInCell`: gleiche Eingabe gleiches Ergebnis; höchstens 4 je Zelle; nichts im Startbereich; nichts innerhalb eines Hindernisses; über 200 Zellen kommen alle fünf Arten vor.
  - `blendSeams` auf einem 64 × 64-Bild mit hartem Farbsprung zwischen linker und rechter Kante: danach unterscheiden sich Spalte 0 und Spalte 63 je Kanal um höchstens 8; die Bildmitte ist unverändert.
  - `MENU_SCENES` verweist nur auf Motive aus `SCENE_CELLS`; jedes Motiv hat Spalte 0–2 und Zeile 0–1.
  - `occludesHero`: Punkt im Rechteck und Baum näher → `true`; Baum weiter weg → `false`; Punkt außerhalb → `false`.
- [ ] **Step 2:** Scheitern sehen, Daten und reine Funktionen bauen, Rechtecke ausmessen, `failed: 0`.
- [ ] **Step 3:** Einbau:
  - `loadEnvironment()` einmal beim Start in `src/main.js`, Ergebnis auf `app`, an `startGame` weitergeben (wie bei den Figurenbögen).
  - Boden: gekachelte Textur mit `tileM` Metern Kantenlänge, vorher `blendSeams`; die vorhandene Schattierung durch Licht bleibt.
  - Bäume und Felsen als aufrechte Bilder mit weichem Bodenschatten, Fuß auf dem Kollisionskreis; je Art ein instanziertes Netz. Ein Baum, für den `occludesHero` gilt, wird auf etwa 35 % Deckkraft geblendet (weich über 0,2 s).
  - Deko aus `decoInCell`, instanziert, ohne Schatten, zufällig gespiegelt.
  - Kisten (`truhe-zu`, `truhe-offen`) und Aufsammelbares (`muenze`, `trank`, `kristall`; die Elite-Truhe nutzt `truhe-zu`) als Bilder.
  - Bei `ok: false` alles wie bisher in 3D.
  - Menü-Hintergründe: je Bildschirm das Motiv aus `MENU_SCENES` als Hintergrund hinter den Menüs (CSS `background-image` auf `szenen.webp` mit `background-size: 300% 200%` und passender Position, leicht vergrößert, damit die weißen Stege nicht sichtbar sind), mit dunklem Verlauf und leichter Unschärfe; Text bleibt gut lesbar. Im Spiel selbst kein Hintergrundbild.
- [ ] **Step 4:** Im Browser ansehen und Bildschirmfotos machen: Wiese mit allen drei Baumarten, beiden Felsen, Deko; Held hinter einem Baum; Kiste zu und offen; Münze, Trank, Kristall; jedes Menü mit seinem Hintergrund bei 390 × 844 und 1280 × 720. Kritisch prüfen: heller Saum, abgeschnittene Kronen, sichtbare Kachelnaht im Boden, Größenverhältnis Held zu Baum, Lesbarkeit der Menütexte. Bildrate mit `?debug=1&stress=1` nennen. Ehrlich notieren, was noch stört.
- [ ] **Step 5:** Commit `feat: painted environment, pickups and menu backgrounds`.

---

### Task 7: Abschlussprüfung

**Files:**
- Modify: `README.md` (Steuerung mit Finger und Maus, Kisten, Bilder der Umgebung), nach Befund weitere

- [ ] **Step 1:** `tests.html` komplett → `failed: 0`.
- [ ] **Step 2:** Per Suche prüfen: kein `Math.random` und kein `Date.now` unter `src/core`, `src/modes`, `src/save`, `src/data`; kein `three`, `document`, `window`, `localStorage` dort; kein `innerHTML`; keine Pfade mit führendem `/`.
- [ ] **Step 3:** Ein vollständiger Ablauf bei 390 × 844 nur mit Zeiger: Held anlegen, Durchgang starten, Kiste öffnen, Level-up wählen, pausieren, sterben, Endbildschirm, Dauerbonus kaufen. Derselbe Ablauf bei 1280 × 720 nur mit Tastatur.
- [ ] **Step 4:** Erfolgskriterien der Spec (Abschnitt 1) einzeln abhaken; nennen, was nur der Auftraggeber prüfen kann (echtes Handy, Ton, Stimmigkeit der Bilder).
- [ ] **Step 5:** Commit `docs: README for touch controls, chests and environment`.
