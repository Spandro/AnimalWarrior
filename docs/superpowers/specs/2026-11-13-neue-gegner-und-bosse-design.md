# Neue Gegner und wechselnde Bosse – Entwurf

Stand 2026-11-13. Paket „Neue Gegner“ im Wellen-Modus. Die Wünsche hat der Auftraggeber in der Sitzung geklärt; was
hier als **Festlegung** steht, hat er bestätigt, was als **Entscheidung des Entwurfs** steht, ist Sache des Bauenden
und darf beim Abstimmen im Browser angepasst werden.

## 1. Worum es geht

Der Wellen-Modus hat sechs Gegnerarten und dreimal denselben Boss (Bär bei Minute 5, 10, 15). Der Auftraggeber hat
Bilder für sechs neue Gegner und drei neue Bosse geliefert (`assets/figuren/gegner2.webp`, `assets/figuren/bosse.webp`,
Ausschnitte in `docs/neue-gegner-bilder.md`). Ziel: mehr Abwechslung in einem Durchgang und zwischen Durchgängen –
jeder Bossauftritt ein anderes Tier, neue Gegner, die sich spürbar anders spielen.

**Ziele**
- Sechs neue Gegner im Wellen-Modus, drei davon mit eigener Kampfweise
- Vier Bosse; jeder Durchgang zieht drei verschiedene in zufälliger Reihenfolge
- Jeder neue Boss mit eigenem Nah- und Fernangriff, jeweils mit Bodenmarkierung
- Kein weißer Fleck in den neuen Bildern (eingeschlossenes Papierweiß wird entfernt)
- Zehn neue Erfolge

**Nicht in diesem Paket:** neue Welten/Karten, neue Töne, Balancing durch Probespielen (die Zahlen sind ein
begründeter Startwert wie bisher), die kleinen weißen Stellen in `helden.webp` (Nebenbefund, eigener Punkt).

**Darf nicht passieren:** alte Spielstände werden ungültig; der Bär spielt sich anders als heute; die weißen
Entenfedern werden durchsichtig; ein Boss-Los ist deutlich schwerer als ein anderes.

## 2. Neue Gegner (Festlegung)

| Kennung | Name | ab Min. | Gewicht | Leben | Tempo | Schaden | Radius | EP | Kampfweise |
|---|---|---|---|---|---|---|---|---|---|
| `fuchs` | Fuchs | 1 | 6 | 10 | 5,6 | 5 | 0,4 | 2 | `strafe` (vorhanden, wie Krähe, am Boden) |
| `igel` | Igel | 3 | 3 | 20 | 2,0 | 7 | 0,4 | 3 | `curl` (neu) |
| `dachs` | Dachs | 5 | 2 | 70 | 2,2 | 10 | 0,55 | 5 | `chase` (vorhanden) |
| `kreuzotter` | Kreuzotter | 7 | 3 | 18 | 3,4 | 6 | 0,4 | 4 | `slither` (neu) + Gift |
| `uhu` | Uhu | 8 | 2 | 35 | 4,0 | 10 | 0,5 | 6 | `charge` (vorhanden), fliegend |
| `luchs` | Luchs | 10 | 2 | 40 | 4,4 | 14 | 0,5 | 7 | `pounce` (neu) |

Alte Gegner bleiben unverändert (Ratte 10, Wildschwein 3, Krähe 4, Giftkröte 2, Wolf 3). Elite-Gegner werden wie
bisher aus allen freigeschalteten Arten gezogen, also auch aus den neuen. Zahlen in `src/data/enemies.js` und
`src/data/waves.js`; Leben und Schaden werden wie bei allen mit `hpMul`/`dmgMul` der Minute multipliziert.

### Neue Kampfweisen

**Igel – `curl` (Einrollen).** Läuft normal hinterher. Nimmt er Schaden und ist nicht eingerollt und nicht in der
Abklingzeit, rollt er sich ein: `CURL.duration` = 2,5 s lang nimmt er nur `CURL.damageTaken` = 20 % Schaden und rollt
mit `CURL.speedMul` = 3-fachem Tempo direkt auf sein Ziel zu. Danach `CURL.cooldown` = 1,5 s, in der er sich nicht
erneut einrollt (sonst bliebe er unter Dauerbeschuss für immer eingerollt). Der auslösende Treffer zählt noch voll.
Betäubung und Verwirrung wirken wie bei allen. Darstellung: Das Bild dreht sich während des Rollens um seine Mitte
(Rollen), leicht gestaucht. *Entscheidung des Entwurfs.*

**Kreuzotter – `slither` (Schlängeln) und Gift.** Bewegung wie `strafe`, aber mit eigenen Zahlen `SLITHER`
(Seitenanteil 0,8, Seitenwechsel alle 0,6 s), damit sie sich sichtbar windet. Das Feld `venom: true` in der
Gegnerdefinition macht ihren Berührungstreffer giftig: Zusätzlich zum normalen Treffer ist der Held `VENOM.duration`
= 4 s vergiftet und verliert alle `VENOM.tick` = 0,5 s `VENOM.dpsMul` × Schaden der Otter × `VENOM.tick` Leben
(Startwert `dpsMul` 0,5, also bei Schaden 6: 1,5 je Halbsekunde, 12 insgesamt). Ein neuer Biss setzt die Restdauer
wieder auf 4 s und übernimmt den höheren Giftschaden; Gift stapelt sich nicht. Gifttreffer laufen über `damageHero`
(Rüstung, Ausweichen, Unverwundbarkeit gelten), tragen im Ereignis `heroHit` das Feld `poison: true` und lösen
**kein** rotes Aufblitzen, kein Kamerawackeln und keinen Trefferton aus. Solange der Held vergiftet ist, ist sein Bild grünlich getönt
(Farbfaktor in `src/data/sprites.js`). Wiederbelebung und Rundenende heben Gift auf. Gift gilt nur im Lauf, wird nicht
gespeichert.

**Uhu – `charge`, fliegend.** Nutzt die Ansturm-Kampfweise des Wildschweins mit denselben Zahlen (`CHARGE`): fliegt
heran, steht kurz in der Luft still, stößt dann geradeaus herab. Fliegt in derselben Höhe wie die Krähe
(`motion: 'fly'`).

**Luchs – `pounce` (Anspringen).** Läuft hinterher, bis der Held höchstens `POUNCE.engageRange` = 8 entfernt ist und
die Abklingzeit vorbei ist. Dann duckt er sich `POUNCE.crouch` = 0,8 s (steht still; Bodenkreis mit Radius
`POUNCE.radius` = 1,2 an der Heldenposition zu Beginn des Duckens, über das vorhandene Ankündigungs-Ereignis) und
springt in `POUNCE.leapTime` = 0,5 s sichtbar auf diesen Punkt. Bei der Landung trifft er mit `POUNCE.damageMul` = 1,
wenn der Held im Kreis steht. Danach `POUNCE.cooldown` = 3 s normales Hinterherlaufen. Während des Sprungs ist er
weiter treffbar. Betäubung bricht das Ducken ab (Abklingzeit beginnt).

### Aussehen der neuen Gegner (Entscheidung des Entwurfs, im Browser abstimmen)

Ausschnitte genau wie in `docs/neue-gegner-bilder.md`. Startwerte:

| Kennung | Bogen | heightM | motion | footOffset |
|---|---|---|---|---|
| fuchs | gegner2 | 0,75 | lope | 0,04 |
| igel | gegner2 | 0,5 | scurry | 0,03 |
| dachs | gegner2 | 0,7 | trot | 0,04 |
| kreuzotter | gegner2 | 0,45 | slither (neu) | 0,03 |
| uhu | gegner2 | 0,9 | fly | 0 |
| luchs | gegner2 | 1,1 | lope | 0,05 |

Neue Gangart `slither`: kein Hub, seitliches Wiegen (Startwerte freq 1,6, bob 0, tilt 0,08, squash 0,06).

## 3. Bosse (Festlegung)

**Auswahl.** Pool `['baer', 'hirsch', 'keiler', 'wisent']`. Beim Start eines Durchgangs wird der Pool gemischt; die
ersten drei sind die Bosse für Minute 5, 10 und 15. Gemischt wird mit einem eigenen Zufallsgeber aus dem Seed
(`createRng(seed ^ Konstante)`), damit `world.rng` und damit alle bisherigen Abläufe gleich bleiben. Gleicher Seed →
gleiche Bossfolge.

**Stärke.** Alle vier haben dasselbe Grundleben (1500) und denselben Grundschaden (25). Die Steigerung kommt wie heute
nur aus `BOSS_HP_MUL` [1; 2,5; 5] und `dmgMul` der Minute. Damit ist kein Los schwerer als ein anderes.

| Kennung | Name | Tempo | Radius | Nah | Fern |
|---|---|---|---|---|---|
| `baer` | Bär | 3,2 | 1,4 | Prankenhieb (Bogen) | Sprung (Kreis am Helden) |
| `keiler` | Riesenkeiler | 3,6 | 1,3 | Hauerstoß (Bogen) | Ansturm-Serie (3 Streifen) |
| `hirsch` | Rothirsch | 3,3 | 1,3 | Röhren (Ring um ihn, stößt weg) | Geweih-Ansturm (langer Streifen) |
| `wisent` | Wisent | 2,8 | 1,6 | Stampfen (großer Ring) | Durchbruch (sehr langer Streifen) |

**Ablauf (für alle gleich, wie heute beim Bär):** `chaseTime` s hinterherlaufen, dann Angriff: steht der Held
höchstens `triggerRange` jenseits des Boss-Rands, der Nahangriff, sonst der Fernangriff. Nach der Ankündigungszeit
(`windup`) wirkt der Angriff, dann `recover` s Pause.

### Boss-Baukasten

Die heutige feste Bärenlogik (`BOSS` in `src/data/enemies.js`, `startBossAttack`/`resolveAttack` in
`src/core/world.js`) wird zu einem datengetriebenen Baukasten: `BOSS_MOVES` in `src/data/enemies.js` enthält je Boss
`{ chaseTime, recover, triggerRange, near, far }`; `near` und `far` sind Angriffe einer dieser Formen:

| Form | Felder | Wirkung |
|---|---|---|
| `swipe` (Bogen) | reach, halfAngle, windup, damageMul | wie heute: Bogen vor dem Boss |
| `leap` (Sprung) | radius, windup, damageMul | wie heute: Kreis an der Heldenposition, Boss landet dort |
| `ring` (Ring) | reach, windup, damageMul, push | Kreis um den Boss (Radius = Boss-Radius + reach); Treffer stößt den Helden `push` weit nach außen (0 = kein Stoß) |
| `dash` (Ansturm) | length, width, windup, dashTime, damageMul, count, gap | Streifen ab dem Boss in Richtung Held; nach `windup` rennt der Boss in `dashTime` s die Länge ab und trifft den Helden höchstens einmal je Ansturm, wenn er ihn berührt (zusätzlich zum normalen Berührungsschaden); bei `count` > 1 folgt nach `gap` s der nächste, neu auf den Helden ausgerichtet und neu angekündigt |

Die Ankündigung bleibt das Ereignis `bossTelegraph` mit `kind`, Position, Richtung und Maßen; die Darstellung
(`src/render/effects.js`) bekommt zu Bogen und Kreis den Ring um den Boss und den Streifen dazu. Die Werte des Bären
werden 1:1 übernommen; die vorhandenen Bärentests müssen unverändert grün bleiben.

Startwerte (Entscheidung des Entwurfs):

```
baer:   chaseTime 3,   recover 0,5, triggerRange 4
        near swipe reach 3, halfAngle π/3, windup 0,7, damageMul 1
        far  leap  radius 3,5, windup 1,2, damageMul 2
keiler: chaseTime 2,5, recover 0,5, triggerRange 3,5
        near swipe reach 2,5, halfAngle π/4, windup 0,5, damageMul 1
        far  dash  length 14, width 2,6, windup 0,7, dashTime 0,6, damageMul 1,2, count 3, gap 0,4
hirsch: chaseTime 3,   recover 0,6, triggerRange 4
        near ring  reach 4, windup 0,9, damageMul 1, push 4
        far  dash  length 18, width 2,6, windup 1,0, dashTime 0,8, damageMul 1,6, count 1
wisent: chaseTime 3,5, recover 0,8, triggerRange 4,5
        near ring  reach 5,5, windup 1,1, damageMul 1,8, push 0
        far  dash  length 28, width 3,2, windup 1,3, dashTime 1,2, damageMul 2, count 1
```

Der Rückstoß des Helden nutzt dieselbe Hinderniskollision wie das Wegstoßen bei der Wiederbelebung. Während eines
Ansturms schiebt die Welt den Boss wie heute aus Hindernissen.

### Aussehen der Bosse (Entscheidung des Entwurfs, im Browser abstimmen)

| Kennung | Bogen | heightM | motion | footOffset |
|---|---|---|---|---|
| hirsch | bosse | 4,0 | trot | 0,12 |
| keiler | bosse | 2,4 | trot | 0,1 |
| wisent | bosse | 3,0 | lumber | 0,12 |

Stellen, die heute fest `'baer'` prüfen, gelten künftig für alle Bosse (`behavior === 'boss'`): Platz in der
Darstellung (`BOSS_CAPACITY`), stärkeres Wippen, Erscheinungsradius beim Setzen. Die 3D-Ersatzfigur (wenn Bilder
fehlen) nimmt für neue Tiere die Form eines ähnlichen alten Tiers, nach Radius skaliert (Fuchs/Luchs → Wolf,
Dachs/Keiler → Wildschwein, Igel/Kreuzotter → Ratte, Uhu → Krähe, Hirsch/Wisent → Bär).

### Texte

- Die Bossanzeige oben zeigt den Namen des jeweiligen Bosses (Namen in den Daten, nicht in `hud.js`).
- Modusauswahl: „… und besiege am Ende den Bären.“ → „… und besiege die Bosse.“
- Ergebnis bei Sieg: „Der Bär ist besiegt – …“ → „Der letzte Boss ist besiegt – die Wildnis gehört dir.“
- Siegspruch „Der Bär ist platt, der Tag gerettet.“ → „Die Bosse sind platt, der Tag gerettet.“

## 4. Erfolge (Festlegung)

- „Bärendienst“ bleibt unverändert.
- „Bärenhunger“ behält Kennung und Titel; neue Bedingung „Besiege insgesamt zwei Bären“ (`killed('baer', 2)`). Wer ihn
  hat, behält ihn. Kennungen dürfen nicht wegfallen, sonst lehnt `src/save/schema.js` alte Stände ab.
- Neu (Texte als Vorschlag, Gold wie vergleichbare alte):

| Kennung | Titel | Bedingung | Satz | Gold |
|---|---|---|---|---|
| `fuchsteufelswild` | Fuchsteufelswild | Besiege insgesamt 100 Füchse | So schlau waren sie dann doch nicht. | 50 |
| `stachelkugel` | Stachelkugel | Besiege insgesamt 50 Igel | Die Stacheln nimmst du als Andenken mit. | 50 |
| `dachsschaden` | Dachsschaden | Besiege insgesamt 50 Dachse | Der Bau ist jetzt zu vermieten. | 50 |
| `schlangenbeschwoerer` | Schlangenbeschwörer | Besiege insgesamt 50 Kreuzottern | Gegengift? Brauchst du nicht. | 50 |
| `nachteule` | Nachteule | Besiege insgesamt 50 Uhus | Uhu? Du! | 75 |
| `luchsauge` | Luchsauge | Besiege insgesamt 50 Luchse | Er hat dich gesehen. Geholfen hat es ihm nicht. | 75 |
| `platzhirsch` | Platzhirsch | Besiege einen Rothirsch | Jetzt bist du hier der Platzhirsch. | 75 |
| `saustark` | Saustark | Besiege einen Riesenkeiler | Das Wildschwein nennt dich jetzt Chef. | 75 |
| `wisentlich` | Wisentlich stärker | Besiege einen Wisent | Ein Wisent weniger, ein Wissen mehr. | 75 |
| `grosswildjaeger` | Großwildjäger | Besiege jeden der vier Bosse mindestens einmal | Die Wildnis spricht nur noch flüsternd von dir. | 150 |

Alle zählen über die lebenslangen Tötungen (`stats.kills`), wie die alten Tier-Erfolge.

## 5. Eingeschlossenes Papierweiß (Pflicht)

`removeBackground` entfernt Weiß nur, wenn es mit dem Bildrand verbunden ist. Neu: `SHEET_HOLES` in
`src/data/sprites.js` – je Bogen eine Liste von Startpunkten (Bogenkoordinaten). `removeBackground` erhält sie als
optionalen dritten Wert und füllt zusätzlich von dort, mit derselben Schwelle und demselben weichen Rand wie vom
Bildrand. Startpunkte genau aus `docs/neue-gegner-bilder.md`:

```
gegner2: [290, 921], [753, 516], [172, 904]
bosse:   [198, 427], [302, 1011], [296, 165], [388, 127]
```

`SHEETS` bekommt `gegner2` und `bosse`; `SpriteDef.sheet` erlaubt beide.

Tests: Ein künstliches Bild mit einer ringsum eingeschlossenen weißen Fläche – ohne Startpunkt bleibt sie deckend,
mit Startpunkt wird sie durchsichtig; eine zweite eingeschlossene Fläche ohne Startpunkt im selben Bild bleibt
(Entenfedern). Prüfung im Browser auf Gras: keiner der neun neuen Tiere zeigt weiße Flecken; die Ente hat weiter weiße
Federn.

## 6. Spielstand

Kein neues Format: `stats.kills` nimmt neue Gegnerkennungen schon an (geprüft gegen `ENEMIES`), neue Erfolge sind nur
neue Kennungen. Keine Versionsänderung, keine Umwandlung. Ein Test sichert, dass ein Stand mit Tötungen der neuen Tiere
und den neuen Erfolgen gültig ist und ein alter Stand mit „Bärenhunger“ gültig bleibt.

## 7. Tests (Mindestumfang, in `tests.html`)

- Datenstimmigkeit: jeder Gegner in `ENEMIES` hat einen Ausschnitt in `ENEMY_SPRITES`; jeder Nicht-Boss hat
  `unlockMinute` und `weights`; jeder Boss im Pool hat `BOSS_MOVES`; alle Ausschnitte liegen im Bogen (1254 × 1254)
- Bossfolge: drei verschiedene aus dem Pool, gleich bei gleichem Seed, über viele Seeds kommt jeder Boss vor und an
  jeder Stelle; `world.rng` wird durch das Ziehen nicht verändert
- Bär: vorhandene Tests unverändert grün
- `ring`: Treffer innerhalb, kein Treffer außerhalb, Rückstoß nach außen
- `dash`: Boss bewegt sich die Länge ab, trifft je Ansturm höchstens einmal, `count` 3 ergibt drei Ankündigungen
- `curl`: Einrollen nach Treffer, verringerter Schaden, Tempo, Abklingzeit
- Gift: Ticks, Auffrischen statt Stapeln, Ende nach Dauer, Aufheben bei Wiederbelebung, kein Kamerawackeln-Ereignis
- `pounce`: Ankündigung, Treffer bei Landung im Kreis, kein Treffer nach Ausweichen, Abklingzeit
- Erfolge: neue Bedingungen, „Bärenhunger“ lebenslang
- Freistellen mit Startpunkten (Abschnitt 5)

## 8. Was der Bauende entscheidet

Genaue Startwerte für Aussehen (Höhe, Standpunkt) nach Ansicht im Browser; Feinheiten der Darstellung von Rollen,
Gifttönung, Streifen und Ring; ob Zahlen der Kampfweisen leicht nachgestellt werden müssen, damit Ankündigungen
lesbar sind. Alles in `src/data/`.

## 9. Abwägung der Bauweise

- **Gewählt: datengetriebener Boss-Baukasten** (Abschnitt 3). Alle Zahlen in `src/data/`, ein Ablauf für alle Bosse,
  eine Darstellung je Angriffsform, gleiche Tests für alle.
- **Verworfen: eigene Kampffunktion je Boss.** Am Anfang etwas schneller, aber Ankündigung, Treffertest und Darstellung
  stünden viermal da.
- Bei den Gegnern hat der Auftraggeber „Mischung“ gewählt: drei neue Kampfweisen (Igel, Kreuzotter, Luchs), drei mit
  vorhandenen (Fuchs, Dachs, Uhu). Verworfen: alle sechs neu (größter Bau) und nur neue Werte (zu wenig Unterschied).
