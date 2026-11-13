# Neue Gegner und Bosse: Bilder vorbereitet (noch nicht im Spiel)

Stand 2026-11-13. Die Bilder hat der Auftraggeber geliefert; sie liegen im Repo, sind aber noch nicht eingebaut.
Was jedes Tier im Spiel tut (Tempo, Leben, Angriff, ab welcher Minute), ist noch nicht geklärt. Das kommt mit
dem Paket „Neue Gegner“ (Wünsche klären, Spec, Plan, wie in `docs/UEBERGABE.md` beschrieben).

## Dateien

| Datei | Inhalt |
|---|---|
| `assets/figuren/gegner2.webp` | sechs Gegner, 1254 × 1254, Raster 3 × 2 |
| `assets/figuren/bosse.webp` | drei Bosse, 1254 × 1254 |

`bosse.webp` ist **neu angeordnet**: Im gelieferten Bild griffen Hirsch und Wisent ineinander (Geweih über dem
Wisent, Schwanz neben dem Hirschbein). Sie berührten sich nicht, aber ihre Rechtecke überschnitten sich, sodass jeder
Ausschnitt ein Stück des Nachbarn gezeigt hätte. Die drei Tiere sind deshalb pixelgenau an neue Stellen
verschoben (Hirsch oben links, Keiler oben rechts, Wisent unten links); gemalt ist nichts neu.

## Ausschnitte

Gemessen wie bei den anderen Bögen: enge Umrandung aller Pixel, die sich von Weiß abheben, plus bis zu 6 px Rand,
ohne Überlappung mit Nachbarn. Format wie `SpriteDef` in `src/data/sprites.js` (x, y von links oben).

| Tier | Bogen | x | y | w | h |
|---|---|---|---|---|---|
| fuchs | gegner2 | 9 | 330 | 425 | 224 |
| dachs | gegner2 | 458 | 304 | 359 | 269 |
| uhu | gegner2 | 831 | 174 | 413 | 413 |
| kreuzotter | gegner2 | 54 | 707 | 319 | 266 |
| igel | gegner2 | 441 | 714 | 317 | 269 |
| luchs | gegner2 | 791 | 683 | 428 | 326 |
| hirsch | bosse | 34 | 34 | 433 | 538 |
| keiler | bosse | 574 | 104 | 416 | 390 |
| wisent | bosse | 34 | 684 | 434 | 390 |

Höhe in Metern (`heightM`), Standpunkt (`footOffset`) und Gangart (`motion`) legt erst der Einbau fest.

## Eingeschlossenes Papierweiß

`removeBackground` in `src/render/sprites.js` entfernt Weiß nur, wenn es mit dem Bildrand verbunden ist (damit
weiße Federn der Ente bleiben). In den neuen Bögen gibt es weiße Lücken, die ringsum vom Tier umschlossen sind.
Ohne Zusatz blieben sie im Spiel als weiße Flecken stehen (im Browser auf Grasgrund geprüft):

| Bogen | Stelle | Pixel | Punkt darin (x, y) |
|---|---|---|---|
| gegner2 | Schlitz in der Otter-Schlinge | 464 | 290, 921 |
| gegner2 | Lücke unter dem Dachskinn, vor der Pfote | 81 | 753, 516 |
| gegner2 | zweiter Schlitz in der Otter-Schlinge | 46 | 172, 904 |
| bosse | zwischen den Hirschbeinen | 4823 | 198, 427 |
| bosse | zwischen den Vorderbeinen des Wisents | 354 | 302, 1011 |
| bosse | Lücke im Hirschgeweih | 233 | 296, 165 |
| bosse | kleine Lücke im Hirschgeweih | 31 | 388, 127 |

Vorschlag für den Einbau: je Bogen eine Liste solcher Punkte in den Daten; `removeBackground` füllt zusätzlich von
dort aus (gleiche Schwelle und gleicher weicher Rand wie vom Bildrand). Ein Test sichert, dass ein umschlossenes Weiß
nur mit Punkt entfernt wird. Für die Weißkanten (Fuchsschwanz, Dachsgesicht, Uhu) war nichts nötig, sie sind sauber.

**Nebenbefund:** Auch `assets/figuren/helden.webp` hat kleine umschlossene, rein weiße Stellen (bis 133 Pixel, z. B.
um 1052/450, 933/659, 738/839). Ob sie im Spiel als Fleck auffallen, ist nicht geprüft.

## Vorschläge für die Rollen (noch offen)

Aus dem Bildauftrag, nur als Ausgangspunkt für die Klärung:

- Fuchs: schnell und wendig
- Dachs: gedrungen und zäh
- Uhu: Flieger wie die Krähe, stößt herab
- Kreuzotter: Gift
- Igel: klein, sticht bei Berührung
- Luchs: lauert und springt
- Bosse: Rothirsch, Wisent und Riesenkeiler, damit bei Minute 5, 10 und 15 jeweils ein anderer Boss kommt (bisher dreimal der Bär)
