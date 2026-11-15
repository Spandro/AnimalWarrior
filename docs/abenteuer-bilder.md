# Abenteuer, Etappe 1: Bilder

Stand 2026-11-15. Die sechs Bilder hat der Auftraggeber geliefert (Commit `c99eea6`); sie sind **eingebaut**. Unten stehen
zuerst der Einbau und die Ausschnitte, danach die ursprünglichen Beschreibungen für den Bildgenerator.

## Einbau

- **Wann geladen:** erst beim Betreten des Abenteuers (`ADVENTURE_SHEETS` in `src/data/sprites.js` per `addSheet`,
  Kacheln per `loadTrailTiles` in `src/render/environment.js`). Der Wellen-Modus lädt keins davon.
- **Freistellen:** wie alle Bögen (`removeBackground`); eingeschlossenes Papierweiß steht in `SHEET_HOLES` (alle
  umschlossenen weißen Flächen ab 20 Pixeln, im Browser einzeln angesehen). Nicht entfernt wird gemaltes Weiß: Krümels
  Augenglanz, Amsels Brosche, das Glas von Flossians Kugel und der Taucherhelme, die Gischt unter der Brücke.
- **Überschneidungen:** In `kapitel1.webp` ragen Zwickzwacks Scheren in die Rechtecke von Gräte und Flossian, der Frosch
  in das des Krebses; in `dorf.webp` überschneiden sich die Häuser oben rechts, die Schmiede und die Lagerfeuer mit dem
  Wegweiser; in `bewohner.webp` Pieps und Amsel um 6 px. Statt die Bilder umzustellen, schneidet das Laden die Stücke
  dieser drei Bögen einzeln aus (`SHEET_CUTS`, `cutPieces`): Jede zusammenhängende Fläche gehört dem Stück, dessen
  Rechteck sie ganz enthält, und die Stücke liegen danach Reihe für Reihe in einem neuen Bogen (`cutLayout`, höchstens
  2048 px breit). Die Figuren-Einträge (`ADVENTURE_ENEMY_SPRITES`, `NPC_SPRITES`, `VILLAGE_SPRITES`) zeigen auf diesen
  neuen Bogen. Die gelieferten Dateien sind unverändert.
- **Karte** (`src/render/mapView.js`): Häuser, Brunnen, Wegweiser, Zaun, Flugblatt, Lagerfeuer (aus, nach dem Entdecken
  an, leicht flackernd), Kisten (zu/offen), Nussverstecke, Barrikade (das Bild mehrfach entlang des Tors) und die Leute
  (atmen leicht, `faceX` −1 spiegelt) als gemalte Tafeln wie die Bäume, mit Bodenschatten. Weg und Bach mit den Kacheln
  (Ränder gemischt wie beim Boden, `blendSeams`; eine Kachel je 5 m bzw. 6 m), die Brücke mit gezeichneten Brettern.
  Grabowskis Hammer bleibt eine 3D-Form, die Brücke aus dem Bild ist ausgemessen, aber nicht im Spiel (Brücken sind von oben
  gesehene Stege).
- **Gespräch** (`src/ui/dialogue.js`): Porträt aus `bewohner.webp` (`NPC_PORTRAITS`, wie die Wirte der Taverne).
- **Gegenstände:** Symbol aus `beute1.webp` bzw. `beute.webp` (`ITEM_SHEETS`, `itemIconRect`) in Ausrüstung, Laden,
  Schmiede und der Beute-Einblendung; bei `beute1.webp` nur das Zellinnere.
- **Ersatz:** Fehlt ein Bild, bleibt es dort beim Bisherigen: 3D-Formen für Häuser, Leute, Feuer, Kisten und Tore,
  gemalte Stellvertreter für die neuen Gegner (`ADVENTURE_SPRITE_STANDIN`), Farbflächen für Weg und Bach, Kreis mit
  Buchstaben im Gespräch, Symbol im Seltenheitsrahmen für Gegenstände.

## Ausschnitte

Gemessen wie bei den bisherigen Bögen: enge Umrandung aller Pixel, die sich von Weiß abheben (Farbabstand ab 28), plus
6 px Rand, am Bildrand gekappt. x, y von links oben im gelieferten Bild. Höhe in Metern (`heightM`) und Standpunkt
stehen in `src/data/sprites.js`.

**`kapitel1.webp`** (1254 × 1254)

| Figur | x | y | w | h | Höhe (m) |
|---|---|---|---|---|---|
| Helmfisch | 18 | 49 | 368 | 504 | 0,9 |
| Krebs | 422 | 12 | 420 | 518 | 0,95 |
| Frosch | 821 | 122 | 401 | 439 | 0,8 |
| Hauptmann Gräte | 30 | 562 | 375 | 653 | 2,6 |
| Kommandant Zwickzwack | 383 | 535 | 504 | 679 | 2,8 |
| Flossian | 758 | 688 | 496 | 496 | 1,6 |

**`bewohner.webp`** (1536 × 1024); Porträt: quadratischer Kopfausschnitt

| Person | x | y | w | h | Höhe (m) | Porträt x, y, Seite |
|---|---|---|---|---|---|---|
| Oma Panzerla | 28 | 49 | 474 | 453 | 1,35 | 300, 28, 196 |
| Krümel | 573 | 24 | 374 | 488 | 1,3 | 672, 24, 210 |
| Grabowski | 1062 | 21 | 463 | 490 | 1,5 | 1196, 18, 228 |
| Nussa | 24 | 520 | 441 | 472 | 1,3 | 270, 530, 200 |
| Pieps | 522 | 569 | 482 | 422 | 0,95 | 730, 566, 200 |
| Tante Amsel | 986 | 520 | 492 | 471 | 1,3 | 1250, 520, 226 |

**`dorf.webp`** (1254 × 1254)

| Stück | Schlüssel | x | y | w | h | Höhe (m) |
|---|---|---|---|---|---|---|
| rundes Moos-Haus (Oma) | `haus_oma` | 4 | 20 | 336 | 375 | 5,6 |
| Laden mit Markise | `laden` | 329 | 45 | 297 | 356 | 4,6 |
| Schmiede | `schmiede` | 609 | 7 | 344 | 413 | 5,6 |
| kleines Haus oben | `wohnhaus` | 933 | 7 | 315 | 255 | 3,8 |
| Wurzelhaus darunter | `wohnhaus2` | 929 | 231 | 322 | 221 | 3,4 |
| Brunnen | `brunnen` | 9 | 397 | 281 | 314 | 3,0 |
| Lagerfeuer aus | `feuer_aus` | 284 | 509 | 276 | 192 | 1,0 |
| Lagerfeuer an | `feuer_an` | 562 | 470 | 285 | 237 | 1,23 |
| Holzbrücke (nicht im Spiel) | `bruecke` | 841 | 475 | 408 | 247 | 2,2 |
| Barrikade | `barrikade` | 4 | 709 | 418 | 257 | 2,2 |
| Wegweiser mit Eule | `wegweiser` | 438 | 686 | 188 | 296 | 2,2 |
| Zaun | `zaun` | 647 | 779 | 319 | 194 | 1,4 |
| Erdhaufen mit Nüssen | `nuesse` | 967 | 777 | 280 | 202 | 0,7 |
| Flugblatt am Pfosten | `flugblatt` | 109 | 965 | 202 | 278 | 1,7 |
| Truhe zu | `truhe_zu` | 385 | 1002 | 366 | 226 | 0,95 |
| Truhe offen | `truhe_offen` | 812 | 968 | 326 | 267 | 1,12 |

**`beute1.webp`** (1536 × 1024): Raster 6 × 5 mit hellgrauen Linien bei x = 255/256, 511/512, 767/768, 1023/1024,
1279/1280 und y = 212, 415/416, 617, 812. Die Zeilen sind daher ungleich hoch (Kanten 0, 213, 416, 618, 813, 1024;
Spalten alle 256 px). Ein Symbol ist die Zelle mit 2 px Abstand zu den Kanten (die Gegenstände reichen fast bis an die
Linien); Reihenfolge Zeile für Zeile = `icon` 0–29 der Kapitel-1-Gegenstände (geprüft).

**`wasser.webp`, `weg.webp`** (1254 × 1254): nahtlose Kacheln, keine Ausschnitte.

## Ursprüngliche Beschreibungen

**Stil** (an jede Beschreibung anhängen):

> Delicate watercolor painting with fine colored-pencil and ink lines, children's book illustration drawn from nature, muted natural colors, plain pure white background, no cast shadows, no text, no frame. Characters face right.

Für `wasser.webp` und `weg.webp` gilt der Stil ohne „plain pure white background“; diese beiden sind nahtlose Kacheln von oben.

| Datei | Wohin | Wofür |
|---|---|---|
| `bewohner.webp` | `assets/abenteuer/` | Leute im Dorf (Figuren und Porträts) |
| `kapitel1.webp` | `assets/figuren/` | neue Gegner und Bosse (`ADVENTURE_ENEMY_SPRITES` in `src/data/sprites.js`) |
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
