# Abenteuer, Kapitel 2 „Der Sumpf“: Bilder

Stand 2026-11-15. Beschreibungen für den Bildgenerator (Spec Etappe 3, §10). **Noch nicht geliefert.** Bis die Bilder da
sind, zeigt das Spiel Stellvertreter: Ochsenfrosch, Kaulquappe und Hofmarschall Quak als Frosch aus `kapitel1.webp` in
anderer Größe, Hecht Haudrauf als Hauptmann Gräte, die Libelle als Krähe und den Blutegel als Kreuzotter (Bögen des
Wellen-Modus); Frau Quappe als 3D-Figur mit dem Kreis „F“ im Gespräch; Schlamm als braun-grüne Fläche, Stege wie die
Brücke; die acht Gegenstände mit dem Ersatzsymbol im Seltenheitsrahmen. Das Einbauen der gelieferten Bilder ist eine
eigene kleine Aufgabe (wie in Etappe 1, `docs/abenteuer-bilder.md`).

## Stil

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

## 1. `kapitel2.webp`

Square 1254 × 1254, grid 3 × 2, each figure centred in its cell, none touching:
1. a fat bullfrog wearing a helmet woven from reeds, crouching low, ready to leap, big throat pouch
2. a large dragonfly with shimmering blue-green wings spread, slender body, seen from the side
3. a dark brown leech, slightly glossy, curled into an S-shape, with a small round mouth
4. a tiny tadpole with a round head and a wiggly tail, standing upright on two very small new legs
5. a very fat frog courtier with a small golden crown, a ruffled collar and a long cloak, puffing out his chest (the "court marshal")
6. a huge pike with a long scar across his eye, an underbite with sharp teeth, standing upright on stubby legs, a dented breastplate

## 2. `bewohner2.webp`

About 1024 × 1024, one full-body figure, generous white space around it:
- a grumpy old fire-bellied toad lady (orange-spotted belly), wearing a small headscarf and a shawl of pond weed, arms crossed, looking stern but kind

Das Porträt im Gespräch wird aus derselben Figur geschnitten (Kopf und Schultern).

## 3. `schlamm.webp` und `steg.webp`

1024 × 1024, seamless tileable texture, top-down view:
- **schlamm.webp:** dark olive-brown swamp mud seen from above, glistening wet patches, a few small bubbles, bits of reed and duckweed, muted colours.
- **steg.webp:** weathered wooden boardwalk planks seen from above, running left to right, small gaps between the planks, a few nails and moss spots.

## 4. `sumpf.webp`

Square 1536 × 1536, objects in a loose grid, none touching:
- a clump of tall reeds with brown cattails (two sizes)
- a group of water lilies with pink flowers on round leaves
- a gnarled dead bog tree with hanging moss
- a small mossy tree stump with mushrooms
- a sign made of driftwood with a crown painted on it, slightly crooked (the frogs' coronation sign)

## 5. `beute2.webp`

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
