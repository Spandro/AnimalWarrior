# Abenteuer, Kapitel 3 „Der Biberdamm“: Bilder

Stand 2026-11-15. Die Bilder sind beschrieben, aber **noch nicht geliefert**. Bis sie kommen, zeigt das Spiel
Stellvertreter (siehe unten). Das Einbauen ist eine eigene kleine Aufgabe, wie bei Kapitel 1 und 2 (Spec Etappe 3, §10).

## Was das Spiel bis dahin zeigt

- **Gegner und Bosse:** gemalte Stellvertreter aus vorhandenen Bögen (`ADVENTURE_ENEMY_SPRITES` in `src/data/sprites.js`,
  Feld `cell`): Aal = Kreuzotter, Bisam = Ratte, Helmhecht = größerer Helmfisch, Bauleiter Nagezahn = großer Dachs, Admiral
  Flossenbart = großer Hauptmann Gräte. Ohne diese Bögen 3D-Formen (`ADVENTURE_SPRITE_STANDIN`).
- **Biberin Rinde und Nagezahn als Bewohner:** 3D-Figuren in Biberbraun (`MAP_LOOK.npcs`), im Gespräch ein Kreis mit
  Anfangsbuchstaben.
- **Strömung:** blaue Fläche mit hellen Streifen, die in Flussrichtung wandern (`MAP_LOOK.current`); trockenes Flussbett
  einer Schleuse als sandbraune Fläche (`MAP_LOOK.dryBed`); Hebel als Holzklotz mit rotem Griff (`MAP_LOOK.lever`).
- **Holzstämme:** rollende braune Form (wie die Nüsse des Duos), angekündigt mit roten Streifen.
- **Gegenstände:** Symbol der Art im Seltenheitsrahmen (`itemSheet` → `null` für `kapitel3`).

## Beschreibungen für den Bildgenerator

### Stil

An jede Beschreibung anhängen:

> Delicate watercolor painting with fine colored-pencil and ink lines, children's book illustration drawn from nature, muted natural colors, plain pure white background, no cast shadows, no text, no frame. Characters face right.

Für `stroemung.webp` und `flussbett.webp` gilt der Stil ohne „plain pure white background“; beide sind nahtlose Kacheln von oben.

| Datei | Wohin | Wofür |
|---|---|---|
| `kapitel3.webp` | `assets/figuren/` | neue Gegner und Bosse am Damm |
| `bewohner3.webp` | `assets/abenteuer/` | Biberin Rinde und Nagezahn als Bewohner (Figur und Porträt) |
| `stroemung.webp`, `flussbett.webp` | `assets/abenteuer/` | Strömung und trockenes Flussbett |
| `damm.webp` | `assets/abenteuer/` | Kulissen am Rand der Damm-Karte, Hebel, Schleusentor |
| `beute3.webp` | `assets/abenteuer/` | die 8 Gegenstände aus Kapitel 3 |

Bitte wie bisher genug weißen Abstand zwischen den Figuren lassen; nichts darf sich berühren.

### 1. `kapitel3.webp`

Square 1254 × 1254, grid 3 × 2, each figure centred in its cell, none touching:
1. a glossy dark eel standing upright in an S-curve, tiny sparks crackling around its head (it gives electric shocks)
2. a muskrat with a big digging claw on one paw, a bit of earth on its nose, crouching as if about to burrow
3. a pike wearing a huge old brass diving helmet with a round glass window, standing upright on stubby legs
4. a stout beaver foreman with a yellow hard hat, a rolled-up construction plan under one arm and a flat broad tail
5. a huge catfish admiral with long whiskers, a navy admiral's bicorne hat with a gold cockade, a dark coat with gold buttons, standing upright
6. (empty cell, or a single log of wood lying on its side – the logs the foreman throws)

### 2. `bewohner3.webp`

About 1536 × 1024, two full-body figures side by side, generous white space around and between them:
- left: Rinde, a sensible middle-aged beaver lady with a leather tool apron and a pencil behind her ear, arms crossed, sceptical look
- right: Nagezahn the beaver foreman from `kapitel3.webp`, now friendly and a bit embarrassed, holding his hard hat in his paws

Die Porträts im Gespräch werden aus denselben Figuren geschnitten (Kopf und Schultern).

### 3. `stroemung.webp` und `flussbett.webp`

1024 × 1024, seamless tileable texture, top-down view:
- **stroemung.webp:** clear blue-green flowing shallow river water seen from above, streaks and ripples all running from left to right, a few pebbles visible on the bottom.
- **flussbett.webp:** a dried-out river bed seen from above, sandy grey-brown, smooth pebbles, small cracks, a few damp dark patches.

### 4. `damm.webp`

Square 1536 × 1536, objects in a loose grid, none touching:
- a section of a beaver dam made of stacked branches and mud (wide, low)
- a wooden sluice gate in a frame with a wheel on top
- a lever on a wooden post with a red handle, shown upright
- a pile of gnawed logs with pointed ends
- a willow bush at the water's edge
- a wooden sign with a fish crown symbol nailed to a post, saying nothing (the dam "gift" sign, no letters)

### 5. `beute3.webp`

Size 1536 × 512. Grid of 4 columns × 2 rows with equal cells, each item centred with space around it. Row by row, left to right; the order matches the `icon` numbers of the Kapitel-3 items in `src/data/items.js`.

| Nr. | Gegenstand | Description |
|---|---|---|
| 0 | Biber-Bauhelm | a yellow hard hat with a few small tooth marks on the brim |
| 1 | Watstiefel | tall green rubber waders reaching up to the chest, with braces |
| 2 | Schwimmweste aus Kork | an old-fashioned life vest made of cork blocks sewn onto canvas |
| 3 | Zollstock des Bauleiters | a folding wooden ruler, half unfolded, with faint magic sparkles |
| 4 | Nagezahn-Axt | a small wooden axe whose blade is sharpened like a beaver's front tooth |
| 5 | Mantel aus Aalhaut | a dark glossy cloak with a faint blue electric shimmer |
| 6 | Flusskiesel-Schleuder | a forked-branch slingshot with a pouch of round river pebbles |
| 7 | Admiralsmütze | a navy admiral's bicorne hat with a gold cockade and a small fish-bone emblem |
