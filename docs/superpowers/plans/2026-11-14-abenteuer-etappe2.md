# Abenteuer-Modus Etappe 2 – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zwölf Unterklassen (drei je Klasse) mit Fähigkeitenbaum (Stamm, Ast mit vier Fähigkeiten gegen Punkte, vier Dauer-Boni), je einer neuen Besonderheit, Umlernen bei Oma Panzerla und Spielstand Version 5.

**Architecture:** Daten der Unterklassen in `src/data/subclasses.js`; Astfähigkeiten als weitere Einträge in `ABILITIES` (Abenteuer-only, `subclass`-Feld). Baum-Regeln rein auf dem Abenteuer-Stand in `src/core/adventureHero.js`. Die zwölf Besonderheiten als neue Wirkungsformen bzw. Zustände in `src/core/abilities.js` und `src/core/world.js`, alle nur aktiv, wenn eine Abenteuer-Fähigkeit sie auslöst (Wellen-Modus unberührt). Oberfläche: Fähigkeiten-Bildschirm wird zum Baum, Wahlkarten, Umlernen im Gespräch mit Oma.

**Tech Stack:** ES-Module ohne Build, Three.js 0.170 (`vendor/`), Tests `tests.html` (Runner `tests/runner.js`). Schnelltest ohne Browser: kleiner Node-Läufer, der `tests/runner.js` und `tests/index.js` lädt (zwei `tavernGames`-Tests brauchen `document` und laufen nur im Browser).

**Spec:** `docs/superpowers/specs/2026-11-14-abenteuer-etappe2-design.md` (freigegeben 2026-11-14). Grundlage: Etappe 1 (`docs/superpowers/specs/2026-11-14-abenteuer-etappe1-design.md`, Plan `docs/superpowers/plans/2026-11-14-abenteuer-etappe1.md`, Übergabe `docs/UEBERGABE.md` Abschnitt 1 „Abenteuer-Modus Etappe 1“).

## Global Constraints

- Regeln aus `docs/UEBERGABE.md` Abschnitt 4: Logik in `src/core`, `src/modes`, `src/data`, `src/save` ohne Three.js/`window`/`document`/`localStorage`/`Date.now()`; Zufall nur `createRng`/`world.rng`; Darstellung/Oberfläche ändern den Weltzustand nicht (nur Aktionen aus `src/modes/adventure.js`); Zahlen und Texte in `src/data/`; Text nur über `textContent`; relative Pfade.
- **Wellen-Modus unverändert:** der Test „Wellen-Modus unverändert – fester Durchlauf über 60 s“ in `tests/world.test.js` und alle bisherigen Tests bleiben grün; neue Felder in Welt/Fähigkeiten sind optional und ohne sie wirkt nichts.
- Astfähigkeiten und Besonderheiten gibt es nur im Abenteuer (nie im Kartenvorrat des Wellen-Modus: `possibleCards` nutzt `abilityPool` der Klasse, Astfähigkeiten stehen dort nicht).
- Handy allein, Tastatur allein, Maus allein; Knöpfe ≥ 44 px; 390 × 844 ohne seitliches Scrollen.
- Spielstand Version **5**, Spielversion **0.6.0**.
- Commits als `Spandro <Spandro@users.noreply.github.com>` direkt auf `main`, Zeile `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; Push an Pausenpunkten erlaubt; Limit-Regel: bis etwa 95 % eines Fensters, dann sichern und pushen (`docs/UEBERGABE.md` Abschnitt 5).

## Review Focus

1. **Wahl, Umlernen, Wahl in Folge:** Punkte dürfen nie doppelt entstehen oder verschwinden (Summe verteilter + freier Punkte = Level − 1). → Test in Task 2.
2. **Schild, Unsichtbarkeit, Heilzone zusammen:** der Held darf nicht dauerhaft unverwundbar werden (Schild nicht stapelbar, Unsichtbarkeit endet beim ersten Treffer, Bosse greifen weiter an). → Tests in Task 4.
3. **Besonderheit aktiv beim Kartenwechsel, Tod oder Rasten:** Fallen, Wolke, Haustier, Markierungen, Schild verschwinden sauber mit der alten Welt bzw. beim Aufwachen; nichts wirkt in die neue Karte hinein. → Test in Task 5.
4. **Alter Stand Version 4 mit ausgebautem Stamm:** lädt auf 5, Stammstufen bleiben, `subclass: null`. → Test in Task 2.
5. **Klauen und Markieren gegen Bosse:** Gold gedeckelt, Bossaufschlag nur +20 %, Einfrieren friert Bosse nicht. → Tests in Task 4.

---

### Task 1: Daten der Unterklassen und Astfähigkeiten

**Files:** Create `src/data/subclasses.js`; Modify `src/data/abilities.js` (Einträge anfügen); Test `tests/subclasses.test.js` (in `tests/index.js` eintragen)

**Interfaces – Produces:**
- `SUBCLASSES: Record<string, SubclassDef>` mit `SubclassDef = { id, classId, name, line, signature: string (Fähigkeits-Kennung), abilities: [string, string, string, string] (erste = signature), passives: PassiveDef[4] }`; `PassiveDef = { id, name, maxRank: 3, perRank: Modifier | { special: string, value: number } }`.
- Kennungen nach Spec §5 (z. B. `kneipenschlaeger`, `tuersteher`, `kochstelle`, `wetterfrosch`, `eisheiliger`, `alchemist`, `taschendieb`, `schattenlaeufer`, `fallensteller`, `zirkusdirektor`, `kletterkuenstler`, `ausguck`).
- 48 neue `ABILITIES`-Einträge mit `classId` der Klasse und neuem Feld `subclass`; Formen der Besonderheiten sind neue `shape`-Werte (Task 4): `rage`, `shield`, `healzone`, `cloud`, `freeze`, `potion`, `steal`, `stealth`, `trap`, `applause`, `pet`, `mark`. Die übrigen 36 nutzen vorhandene Formen.
- `subclassesFor(classId): SubclassDef[]` (genau drei).
- `SUBCLASS_RULES = { chooseLevel: 10, unlockCost: 1, respecGold: 500 }` in `src/data/adventure.js`.

- [ ] Tests: 12 Unterklassen, je Klasse drei; je vier Fähigkeiten, erste = `signature`, alle in `ABILITIES` mit passender `classId` und `subclass`; je vier Dauer-Boni mit `maxRank` 3; Kennungen eindeutig; keine Astfähigkeit in einem `abilityPool` von `CLASSES` (Wellen-Modus); Namen und Sprüche nicht leer.
- [ ] FAIL sehen, Daten anlegen (Namen/Sprüche/Formen nach Spec §5/§6, Zahlen in der Größenordnung vorhandener Fähigkeiten gleicher Form), grün.
- [ ] Commit `feat: twelve subclasses with branch abilities and passives`

### Task 2: Baum-Regeln und Spielstand Version 5

**Files:** Modify `src/core/adventureHero.js`, `src/save/adventure.js` (`newAdventure`, `repairSave`, neue Funktion `respecAdventure`), `src/save/schema.js` (Version 5, Umwandlung 4 → 5), `src/data/version.js` (`0.6.0`); Test `tests/adventureHero.test.js`, `tests/adventureSave.test.js`

**Interfaces – Produces:**
- `AdventureRecord` erweitert um `subclass: string|null`, `passives: Record<passiveId, 1..3>`.
- `pointsSpent(record, classId): number` (Stammstufen über 1, Astfreischaltungen und -stufen, Dauer-Boni).
- `chooseSubclass(record, classId, subclassId): boolean` – nur ab `chooseLevel`, nur wenn `subclass` leer, Unterklasse passt zur Klasse; setzt alle Stammstufen auf 1 (Grundattacke bleibt 1), gibt alle Punkte zurück (`skillPoints = level − 1`), behält Knöpfe mit Stammfähigkeiten.
- `unlockBranch(record, abilityId): boolean` – kostet `unlockCost`, setzt Stufe 1; nur Fähigkeiten des eigenen Asts.
- `spendPoint` (vorhanden) gilt auch für freigeschaltete Astfähigkeiten; `spendPassive(record, passiveId): boolean` bis `maxRank`.
- `setButton` erlaubt freigeschaltete Astfähigkeiten.
- `adventureModifiers` enthält Dauer-Boni mit allgemeinem Wert (`perRank` ist Modifier) × Stufe; `specialBonus(record, special): number` liefert Summe der besonderen Boni (z. B. `shieldPct`, `trapDamage`).
- `respecAdventure(save, heroId): { ok, reason?: 'gold'|'level'|'none' }` – kostet `respecGold`, `subclass = null`, Astfähigkeiten und Dauer-Boni weg, Stamm auf 1, alle Punkte zurück, Knöpfe ohne Astfähigkeiten.
- Umwandlung 4 → 5: `subclass: null`, `passives: {}`; Ausbessern nach Spec §8.
- [ ] Tests: Wahl unter Level 10 abgelehnt; Wahl gibt genau `level − 1` Punkte; Freischalten kostet 1; Ast nur eigene Fähigkeiten; Dauer-Boni bis 3; Umlernen kostet 500, setzt zurück, ohne Gold abgelehnt; **Invariante** `pointsSpent + skillPoints === level − 1` nach jeder Folge aus Wahl → Ausbau → Umlernen → Wahl (Review Focus 1); Version 4 → 5 mit Stamm auf Stufe 3 bleibt (Review Focus 4); Ausbessern: fremde Unterklasse, Astfähigkeit ohne Unterklasse, Dauer-Bonus über 3, Wahl unter Level 10.
- [ ] FAIL, implementieren, grün; vorhandene Speichertests auf Version 5 nachziehen.
- [ ] Commit `feat: skill tree rules, respec and save version 5`

### Task 3: Allgemeine Zusatzwirkungen Lebensraub und Schild

**Files:** Modify `src/core/world.js`, `src/core/abilities.js`, `src/data/animals.js` nur falls ein neuer Wert in `BASE_STATS` nötig ist (dann Wellen-Modus-Test prüfen); Test `tests/world.test.js`

**Interfaces – Produces:** `hero.shield: { hp: number, until: number } | null` – `damageHero` zieht zuerst vom Schild ab (nach Ausweichen und Rüstung), Ereignis `shieldHit`; neuer Wert `lifesteal` (Anteil) – nach jedem Treffer des Helden heilt er `Schaden × lifesteal`; ohne Abenteuer-Modifikatoren 0.
- [ ] Tests: Schild schluckt Schaden bis 0, läuft ab, neues Auslösen ersetzt (stapelt nicht); Lebensraub heilt höchstens bis zum höchsten Leben; ohne Lebensraub und Schild unverändert (Wellen-Durchlauf-Test grün).
- [ ] Commit `feat: shield and lifesteal effects`

### Task 4: Die zwölf Besonderheiten

**Files:** Modify `src/core/abilities.js` (neue `SHAPES`), `src/core/world.js` (Zustände, Gegnerziel, Fallen, Haustier, Wolke), `src/data/subclasses.js` bzw. `src/data/adventure.js` (Grenzen aus Spec §6); Test `tests/signatures.test.js` (neu)

**Interfaces – Produces** (alle Zahlen aus Daten, Grenzen aus Spec §6):
- `rage`: Stärkung, Schadensbonus bis +60 % je nach fehlendem Leben, zur Trefferzeit berechnet (`strike`).
- `shield`: Schild 30 % des höchsten Lebens, 8 s (Task 3).
- `healzone`: Zone wie `zone`, zusätzlich `healPct` je Sekunde für den Helden im Kreis.
- `cloud`: `world.followers`-Eintrag, folgt dem Helden, trifft jede `interval` s den nächsten Gegner in `range`.
- `freeze`: Ring; verlangsamte Gegner werden betäubt (`freezeStun`), sonst verlangsamt; Bosse nur verlangsamt.
- `potion`: Geschoss auf nächsten Gegner; beim Aufschlag Zufall über `world.rng`: Feuer (Schaden), Schleim (Verlangsamung), Glück (heilt Helden 15 %).
- `steal`: Zustand `hero.stealUntil`; jeder Treffer mit Chance Ereignis `stealGold` (Wert 1–3), höchstens 30 Gold je Auslösung; Tötungen in der Zeit tragen `doubleLoot` im Kill-Ereignis.
- `stealth`: `hero.stealthUntil`; `enemyTarget` liefert für Nicht-Bosse kein Ziel (sie wandern), keine Berührungstreffer außer Boss; erster Treffer des Helden ist kritisch und beendet sie.
- `trap`: `world.traps` (höchstens 3, je 30 s); Gegner im Kreis → Schaden + Betäubung, Falle verbraucht.
- `applause`: Stärkung mit Verlängerung um 1 s je Tötung, höchstens 20 s gesamt.
- `pet`: `world.followers`-Eintrag „Erdmännchen“, läuft zum nächsten Gegner, trifft im Takt, verschwindet nach Dauer, nicht angreifbar.
- `mark`: bis 5 Gegner in 12 m `markedUntil`; `damageEnemy` × 1,4 (Bosse × 1,2).
- Alle neuen Weltlisten (`followers`, `traps`) und Heldenzustände sind optional; `createWorld` legt sie leer an.
- [ ] Je Besonderheit ein Test für Wirkung und Grenze (Review Focus 2 und 5): Raserei bei vollem und bei 25 % Leben; Schild; Heilzone heilt nur im Kreis; Wolke ein Ziel je Takt; Einfrieren friert verlangsamte, Boss nicht; Trankwurf deterministisch je Seed; Klauen-Deckel 30; Unsichtbarkeit: Gegner ohne Ziel, Boss greift an, endet beim Treffer; höchstens 3 Fallen; Applaus-Deckel 20 s; Haustier verschwindet nach Dauer; Markieren +40 %/+20 %.
- [ ] Wellen-Durchlauf-Test grün.
- [ ] Commit (gern in zwei bis drei Commits nach Gruppen) `feat: twelve subclass signatures`

### Task 5: Einbindung in die Regelschicht

**Files:** Modify `src/modes/adventure.js`; Test `tests/adventure.test.js`

**Interfaces – Produces:** Aktionen `chooseSubclassAction(run, subclassId)`, `unlockBranchAction(run, abilityId)`, `spendPassiveAction(run, passiveId)` sind nicht nötig, wenn die Menüs über `ctx.change` auf dem Spielstand arbeiten (wie Etappe 1) – dann reicht `refreshFromSave`. Neu in der Regelschicht: Ereignis `subclassAvailable` beim Erreichen von Level 10 ohne Unterklasse; Gold aus `stealGold` ins Ledger; `doubleLoot` verdoppelt die Gegenstandschance; beim Kartenwechsel, Tod und Rasten verschwinden Fallen, Begleiter, Markierungen, Schild, Stärkungen (Review Focus 3).
- [ ] Tests: `subclassAvailable` genau einmal; Klauen-Gold landet im Ledger (gedeckelt); nach Tod und nach Kartenwechsel keine Fallen/Begleiter/Schild.
- [ ] Commit `feat: subclasses in the adventure rules`

### Task 6: Oberfläche und Darstellung

**Files:** Modify `src/ui/adventureMenus.js` (`openAbilities` → Baum mit Stamm, Ast, Dauer-Boni; Wahlkarten mit Rückfrage), `src/adventureGame.js` (Oma: Knopf „Umlernen“ nach dem Gespräch ab Level 10, mit Rückfrage und Preis; Meldung bei `subclassAvailable`; Erinnerung im Lagerfeuer-Fenster), `src/ui/menus.js` (`heroLine` mit Unterklasse), `src/ui/adventureHud.js` (Einblendungen), `src/render/hero.js`/`src/render/effects.js`/`src/render/mapView.js` oder neue Datei `src/render/followers.js` (Schild-Schimmer, Raserei-Tönung, Durchscheinen bei Unsichtbarkeit, Wolke, Fallen, Haustier, Markierungsringe, Heiltopf); `src/data/texts.js` bzw. `src/data/subclasses.js` für Texte; `styles.css`
- [ ] Reine Textbausteine (z. B. Kosten-/Stufenzeilen des Baums) testbar in einer DOM-freien Datei; Test dafür.
- [ ] Im Browser (390 × 844 und Desktop, `?debug=1&mode=adventure`, Held per Konsole auf Level 10 setzen): Wahl je Klasse, jede Besonderheit einmal auslösen und sehen, Umlernen bei Oma, nur Tastatur, nur Maus/Touch, Konsole ohne Fehler.
- [ ] Commit `feat: skill tree screen, subclass choice and respec`

### Task 7: Erfolge, Doku, Gesamtprüfung

**Files:** Modify `src/data/achievements.js` (`spezialist`, `meister-seines-fachs`), Tests; `README.md`, `docs/UEBERGABE.md`
- [ ] Tests für beide Erfolge (Tabelle in `tests/achievements.test.js` ergänzen, Anzahl 43).
- [ ] README und Übergabe aktualisieren (Unterklassen, Baum, Umlernen, Version 5, 0.6.0).
- [ ] Alle Tests grün im Browser; frischer Prüfer über alle Commits der Etappe; Critical/Important mit Test beheben; Push.
- [ ] Commit `docs: adventure stage 2 – readme and handover`
