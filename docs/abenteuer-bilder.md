# Abenteuer, Etappe 1: Bilder

Stand 2026-11-14. Diese Bilder braucht der Abenteuer-Modus. Bis sie da sind, zeigt das Spiel Ersatz:
- Häuser, Leute, Lagerfeuer, Kisten und Tore sind einfache 3D-Formen.
- Die neuen Gegner zeigen gemalte Stellvertreter: Helmfisch als Ratte, Krebs als Igel, Frosch als Giftkröte, Gräte als Wolf, Zwickzwack als Dachs.
- Weg und Bach sind Farbflächen.
- Gegenstände zeigen ein Symbol im Seltenheitsrahmen.

Nach der Lieferung werden die Ausschnitte ausgemessen und in die Daten eingetragen, wie bei den bisherigen Bögen.

**Stil** (an jede Beschreibung anhängen):

> Delicate watercolor painting with fine colored-pencil and ink lines, children's book illustration drawn from nature, muted natural colors, plain pure white background, no cast shadows, no text, no frame. Characters face right.

Für `wasser.webp` und `weg.webp` gilt der Stil ohne „plain pure white background“; diese beiden sind nahtlose Kacheln von oben.

| Datei | Wohin | Wofür |
|---|---|---|
| `bewohner.webp` | `assets/abenteuer/` | Leute im Dorf (Figuren und Porträts) |
| `kapitel1.webp` | `assets/figuren/` | neue Gegner und Bosse (Rasterzellen 418 × 627 bei 1254 × 1254, `ADVENTURE_ENEMY_SPRITES` in `src/data/sprites.js`) |
| `dorf.webp` | `assets/abenteuer/` | Häuser und Gegenstände der Karten |
| `wasser.webp`, `weg.webp` | `assets/abenteuer/` | Bach und Erdweg |
| `beute1.webp` | `assets/abenteuer/` | die 30 Gegenstände aus Kapitel 1 |

## 1. `bewohner.webp`

About 1536 × 1024, six full-body figures in a 3 × 2 grid, generous white space between them, none touching:
1. an old wise tortoise grandmother with round spectacles, a knitted shawl and a walking stick
2. a plump cheerful hamster shopkeeper with a striped apron, cheeks stuffed full, holding a small sack
3. a sturdy mole blacksmith with a leather apron, tiny round goggles pushed up on his forehead, holding tongs
4. a lively red squirrel girl with a satchel full of nuts
5. a small chirpy house sparrow with a postman's cap and a letter in his beak
6. an elegant blackbird aunt with a lace collar and a tiny hat

## 2. `kapitel1.webp`

Square 1254 × 1254, grid 3 × 2, each figure centred in its cell, none touching:
1. a small perch fish standing on two little frog legs, wearing an old brass diving helmet filled with water
2. a river crayfish raising both claws, looking grumpy
3. a green frog wearing a helmet made of pond weed, crouching to jump
4. a big pike in a brass diving helmet with a small curved sabre, standing upright on stubby legs, captain's sash
5. a huge crayfish commander wearing a bicorne hat and a medal, claws raised
6. a pompous goldfish in a round glass bowl carried on a tiny sedan chair by two small crabs, the goldfish wearing a little crown

## 3. `dorf.webp`

Square 1536 × 1536, objects in a loose grid, none touching:
- a round cottage with a mossy roof
- a small shop hut with a striped awning and sacks
- a blacksmith's hut with an anvil and a chimney
- two small cosy woodland cottages
- a stone well with a wooden roof
- an unlit campfire of stacked logs and stones, and the same campfire burning
- a short wooden footbridge seen from the side
- a barricade of driftwood and fishing nets
- a wooden signpost
- a short wooden fence piece
- a small heap of earth with a few hazelnuts peeking out
- a crumpled paper leaflet nailed to a stick
- a small wooden treasure chest, closed and open

## 4. `wasser.webp` und 5. `weg.webp`

1024 × 1024, seamless tileable texture, top-down view:
- **wasser.webp:** clear shallow woodland stream water seen from above, soft ripples, a few pebbles shimmering through, muted blue-green.
- **weg.webp:** a soft brown earth footpath seen from above, with small pebbles, a few dry leaves and faint paw prints.

## 6. `beute1.webp`

Size 1536 × 1280. Grid of 6 columns × 5 rows with equal cells, each item centred with space around it. Row by row, left to right; the order matches the `icon` numbers in `src/data/items.js`.

| Nr. | Gegenstand | Description |
|---|---|---|
| 0 | Eimer der Wachsamkeit | a dented tin bucket worn as a helmet, with two eye slits |
| 1 | Seerosenhut | a hat made from a big water-lily leaf with a pink lily flower on top |
| 2 | Kappe mit Schnorchel | a knitted cap with a wooden snorkel sticking up from the side |
| 3 | Erbeuteter Taucherhelm | an old brass diving helmet, slightly dented, a tiny leak dripping |
| 4 | Helm mit Krebsscheren | a leather helmet decorated with two red crayfish claws like horns |
| 5 | Kapitänsmütze ohne Schiff | a navy captain's cap with a golden anchor badge |
| 6 | Regenponcho, gelb | a bright yellow rain poncho with a hood |
| 7 | Schwimmweste aus Korken | a life vest made of wine corks strung together |
| 8 | Wams aus Algen | a green tunic woven from pond algae |
| 9 | Mantel aus echten Fischschuppen | a shimmering coat of silver fish scales |
| 10 | Froschlederjacke | a green spotted leather jacket |
| 11 | Rüstung aus Rettungsringen | armour made of stacked red-and-white lifebuoys |
| 12 | Gummistiefel der falschen Hoffnung | green rubber boots, one with a hole |
| 13 | Schwimmflossen | a pair of blue diving flippers |
| 14 | Klappernde Holzschuhe | a pair of carved wooden clogs |
| 15 | Wasserläufer-Sandalen | sandals with tiny wooden skids underneath, like a pond skater |
| 16 | Siebenseen-Stiefel | tall elegant blue boots with silver buckles and water droplets |
| 17 | Paddel der Tapferkeit | a wooden canoe paddle |
| 18 | Angel mit Glücksköder | a fishing rod with a red float |
| 19 | Treibholzstab | a twisted driftwood staff with a shell on top |
| 20 | Gabel des Meeresgottes (Küche) | a kitchen fork as big as a trident |
| 21 | Muschelschleuder | a wooden slingshot with a little pouch of shells |
| 22 | Regenmacher-Stab | a rainstick decorated with feathers |
| 23 | Schöpfkelle des Hochwassers | a big copper ladle |
| 24 | Zepter der gestohlenen Wolke | a silver sceptre with a tiny grey rain cloud floating above it |
| 25 | Kette aus Bachkieseln | a necklace of smooth river pebbles |
| 26 | Glücks-Angelhaken | a golden fishhook on a cord |
| 27 | Schneckenhaus-Amulett | an amulet made of an empty snail shell |
| 28 | Flussperlen-Ohrring | an earring with a single pearl |
| 29 | Flossians verlorene Schuppe | a large golden fish scale on a gold chain |
