# Abenteuer, Kapitel 2 „Der Sumpf“: Bilder

Stand 2026-11-15. Die sechs Bilder hat der Auftraggeber geliefert (Commit `7d9a210`); sie sind **eingebaut**. Unten stehen
zuerst der Einbau und die Ausschnitte, danach die ursprünglichen Beschreibungen für den Bildgenerator (Spec Etappe 3, §10).

## Einbau

- **Wann geladen:** erst, wenn der Held den Sumpf betritt oder Kapitel 1 abgeschlossen hat (dann kann er als Nächstes
  hinein) – nicht beim Spielstart und nicht für Helden, die noch in Kapitel 1 stecken. `CHAPTER_SHEETS` (Bögen) und
  `CHAPTER_TILES` (Kacheln), geladen von `loadChapterImages` in `src/render/chapterImages.js`; welche Kapitel gerade dran
  sind, sagt `chaptersToLoad`. Steht der Held beim Betreten des Abenteuers schon im Sumpf, wartet der Start auf die Bilder
  (`src/main.js`); sonst lädt das Spiel sie im Hintergrund (`requestChapterImages` in `src/adventureGame.js`, auch direkt
  nach dem Abschluss von Kapitel 1) und baut Karte und Gegner neu auf, sobald sie da sind.
- **Freistellen:** wie alle Bögen; eingeschlossenes Papierweiß steht in `SHEET_HOLES` (alle umschlossenen weißen Flächen
  ab 20 Pixeln, im Browser einzeln angesehen). Nicht entfernt: die Libellenflügel (gemalt durchscheinend) und ihr
  Augenglanz.
- **Überschneidungen:** In `kapitel2.webp` reicht Quaks Mantel unter die Kaulquappe und der Hecht an Quak heran, in
  `sumpf.webp` stehen Schilf, Moorbaum, Baumstumpf und Schild eng. Beide Bögen werden daher wie `kapitel1.webp` einzeln
  ausgeschnitten (`SHEET_CUTS`, `cutPieces`). `bewohner2.webp` hat nur eine Figur und wird nicht ausgeschnitten.
- **Gegner:** eigene Bilder in `ADVENTURE_ENEMY_SPRITES` (Bogen `kapitel2`). Libelle fliegt, Blutegel schlängelt sich,
  Quak schreitet jetzt gewichtig (`lumber`) statt zu hüpfen. Größen etwas angepasst, damit sie zu den Körperradien passen:
  Ochsenfrosch 1,25 m (vorher 1,1), Blutegel 0,8 m (0,5), Quak 2,6 m (2,4), Haudrauf 3,0 m (2,9).
- **Frau Quappe:** Figur auf der Karte (`NPC_SPRITES.quappe`, Bogen `bewohner2`) und Porträt im Gespräch
  (`NPC_PORTRAITS.rects.quappe` mit eigenem `sheet`).
- **Schlamm und Stege:** Kacheln `schlamm.webp` (eine je 6 m) und `steg.webp` (eine je 2,4 m, 8 Bretter, also 0,3 m je
  Brett), nahtlos gemischt wie Weg und Bach. Die Bretter in `steg.webp` laufen waagerecht; die Kachel ist um 90° gedreht
  (`TRAIL_TILES.stegTurn`), damit sie wie bisher quer zu den Stegen liegen. Brücken (Kapitel 1, Dorf) behalten die
  gezeichneten Bretter.
- **Kulissen am Kartenrand:** 60 % der Randbäume und -felsen des Sumpfs werden zu Bildern aus `sumpf.webp`
  (`MAP_SCENERY`, `borderScenery` in `src/core/environment.js`, fest nach der Position): aus Bäumen Moorbaum oder großer
  Schilfbusch, aus Felsen kleiner Schilfbusch, Seerosen oder Baumstumpf, zufällig gespiegelt. Sie laufen über die
  Geländeansicht (`obstacle.sprite` in `src/render/terrain.js`); Moorbaum und großer Schilfbusch werden wie die Bäume
  durchscheinend, wenn sie den Helden verdecken. Das krumme Schild mit Krone steht einmal als Kleinkram am Eingang zum
  Froschhof (`map.props`, Art `kroenungsschild`, bei x 426, z −43), nicht wiederholt am Rand.
- **Gegenstände:** Symbole aus `beute2.webp` (`ITEM_SHEETS.beute2`, `itemSheet` → `beute2`).
- **Ersatz:** Fehlt `kapitel2.webp` (oder lädt noch), zeigen die Gegner die bisherigen Stellvertreter
  (`ADVENTURE_SPRITE_FALLBACK`: Frösche aus `kapitel1.webp`, Haudrauf als Gräte, Libelle als Krähe, Blutegel als
  Kreuzotter), fehlt auch deren Bogen, einen Gegner des Wellen-Modus (`ADVENTURE_SPRITE_STANDIN`, `adventureSpriteDef` in
  `src/render/enemies.js`). Ohne `bewohner2.webp` ist Frau Quappe die 3D-Figur mit Kreis „F“, ohne `sumpf.webp` bleiben
  Randbäume und -felsen und das Schild ist ein einfaches 3D-Schild, ohne `schlamm.webp` ist der Schlamm die braun-grüne
  Fläche, ohne `steg.webp` haben die Stege gezeichnete Bretter, ohne `beute2.webp` zeigen die Gegenstände das Ersatzsymbol.

## Ausschnitte

Gemessen wie bei den bisherigen Bögen: enge Umrandung aller Pixel, die sich von Weiß abheben (Farbabstand ab 28), plus
6 px Rand, am Bildrand gekappt. x, y von links oben im gelieferten Bild. Höhe in Metern (`heightM`) und Standpunkt
stehen in `src/data/sprites.js`.

**`kapitel2.webp`** (1254 × 1254)

| Figur | Schlüssel | x | y | w | h | Höhe (m) |
|---|---|---|---|---|---|---|
| Ochsenfrosch mit Schilfhelm | `ochsenfrosch` | 21 | 47 | 427 | 536 | 1,25 |
| Libelle | `libelle` | 451 | 30 | 400 | 498 | 0,9 |
| Blutegel | `blutegel` | 877 | 100 | 352 | 427 | 0,8 |
| Kaulquappe | `kaulquappe` | 20 | 733 | 346 | 307 | 0,5 |
| Hofmarschall Quak | `hofmarschall_quak` | 298 | 573 | 504 | 637 | 2,6 |
| Hecht Haudrauf | `hecht_haudrauf` | 798 | 590 | 439 | 633 | 3,0 |

**`bewohner2.webp`** (1254 × 1254): Frau Quappe x 197, y 34, w 819, h 1185, Höhe 1,3 m; Porträt (Kopf mit Kopftuch)
x 470, y 34, Seite 420.

**`sumpf.webp`** (1254 × 1254)

| Stück | Schlüssel | x | y | w | h | Höhe (m) |
|---|---|---|---|---|---|---|
| großer Schilfbusch | `schilf_gross` | 14 | 8 | 432 | 615 | 3,0 |
| kleiner Schilfbusch | `schilf_klein` | 428 | 123 | 276 | 498 | 2,2 |
| Seerosen (samt Wasserlinsen ringsum) | `seerosen` | 696 | 130 | 551 | 406 | 1,3 |
| toter Moorbaum | `moorbaum` | 22 | 580 | 548 | 651 | 6,0 |
| Baumstumpf mit Pilzen | `stumpf` | 471 | 785 | 474 | 439 | 1,7 |
| krummes Schild mit Krone | `kroenungsschild` | 915 | 540 | 310 | 688 | 2,4 |

**`beute2.webp`** (geliefert 1536 × 1024 statt 1536 × 512): Raster 4 × 2 mit hellgrauen Linien bei x = 383/384, 767/768,
1151/1152 und y = 511/512, also gleich große Zellen von 384 × 512 (hochkant). Ein Symbol ist die Zelle mit 2 px Abstand
zu den Kanten; Reihenfolge Zeile für Zeile = `icon` 0–7 der Kapitel-2-Gegenstände (geprüft).

**`schlamm.webp`, `steg.webp`** (1254 × 1254): nahtlose Kacheln, keine Ausschnitte.

## Ursprüngliche Beschreibungen

### Stil

An jede Beschreibung anhängen:

> Delicate watercolor painting with fine colored-pencil and ink lines, children's book illustration drawn from nature, muted natural colors, plain pure white background, no cast shadows, no text, no frame. Characters face right.

Für `schlamm.webp` und `steg.webp` gilt der Stil ohne „plain pure white background“; beide sind nahtlose Kacheln von oben.

| Datei | Wohin | Wofür |
|---|---|---|
| `kapitel2.webp` | `assets/figuren/` | neue Gegner und Bosse des Sumpfs |
| `bewohner2.webp` | `assets/abenteuer/` | Frau Quappe (Figur und Porträt) |
| `schlamm.webp`, `steg.webp` | `assets/abenteuer/` | Schlamm und Stege |
| `sumpf.webp` | `assets/abenteuer/` | Kulissen am Rand der Sumpf-Karte |
| `beute2.webp` | `assets/abenteuer/` | die 8 Gegenstände aus Kapitel 2 |

Bitte wie bisher genug weißen Abstand zwischen den Figuren lassen; nichts darf sich berühren.

### 1. `kapitel2.webp`

Square 1254 × 1254, grid 3 × 2, each figure centred in its cell, none touching:
1. a fat bullfrog wearing a helmet woven from reeds, crouching low, ready to leap, big throat pouch
2. a large dragonfly with shimmering blue-green wings spread, slender body, seen from the side
3. a dark brown leech, slightly glossy, curled into an S-shape, with a small round mouth
4. a tiny tadpole with a round head and a wiggly tail, standing upright on two very small new legs
5. a very fat frog courtier with a small golden crown, a ruffled collar and a long cloak, puffing out his chest (the "court marshal")
6. a huge pike with a long scar across his eye, an underbite with sharp teeth, standing upright on stubby legs, a dented breastplate

### 2. `bewohner2.webp`

About 1024 × 1024, one full-body figure, generous white space around it:
- a grumpy old fire-bellied toad lady (orange-spotted belly), wearing a small headscarf and a shawl of pond weed, arms crossed, looking stern but kind

Das Porträt im Gespräch wird aus derselben Figur geschnitten (Kopf und Schultern).

### 3. `schlamm.webp` und `steg.webp`

1024 × 1024, seamless tileable texture, top-down view:
- **schlamm.webp:** dark olive-brown swamp mud seen from above, glistening wet patches, a few small bubbles, bits of reed and duckweed, muted colours.
- **steg.webp:** weathered wooden boardwalk planks seen from above, running left to right, small gaps between the planks, a few nails and moss spots.

### 4. `sumpf.webp`

Square 1536 × 1536, objects in a loose grid, none touching:
- a clump of tall reeds with brown cattails (two sizes)
- a group of water lilies with pink flowers on round leaves
- a gnarled dead bog tree with hanging moss
- a small mossy tree stump with mushrooms
- a sign made of driftwood with a crown painted on it, slightly crooked (the frogs' coronation sign)

### 5. `beute2.webp`

Size 1536 × 512. Grid of 4 columns × 2 rows with equal cells, each item centred with space around it. Row by row, left to right; the order matches the `icon` numbers of the Kapitel-2 items in `src/data/items.js`.

| Nr. | Gegenstand | Description |
|---|---|---|
| 0 | Helm aus Schilf | a helmet woven from green and golden reeds |
| 1 | Moorstiefel | tall dark brown leather boots caked with dried mud |
| 2 | Unken-Amulett | a pendant with a small carved toad, orange spots, on a leather string |
| 3 | Rohrkolbenstab | a staff made from a long cattail stalk with its brown velvety head |
| 4 | Brett vom Steg | a weathered wooden plank with two rusty nails, held like a club |
| 5 | Umhang aus Libellenflügeln | a light shimmering cloak made of blue-green dragonfly wings |
| 6 | Froschkönig-Schleuder | a slingshot with a tiny golden crown carved into the handle |
| 7 | Quaks Krone | a slightly too large golden crown with lily-pad shaped points and a green gem |
