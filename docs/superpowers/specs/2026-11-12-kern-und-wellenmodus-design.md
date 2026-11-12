# AnimalWarrior – Kern und Wellen-Modus (Design)

Stand: 2026-11-12 · Teilprojekt 1 von 2

## 1. Ziel und Rahmen

AnimalWarrior ist ein Einzelspieler-Actionspiel im Browser mit 3D-Draufsicht. Der Spieler wählt ein Tier (Hase, Ente, Waschbär) und eine Klasse (Krieger, Magier, Dieb) und spielt in zwei Modi:

1. **Wellen-Modus** – Überleben gegen Gegnerwellen von allen Seiten, Level-ups mit Fähigkeiten und Boni.
2. **Abenteuer-Modus** – Action-RPG mit Leveln, aktiven Fähigkeiten, Ausrüstung und Inventar.

Dieses Dokument beschreibt **Teilprojekt 1: den gemeinsamen Kern und den Wellen-Modus**. Der Abenteuer-Modus bekommt eine eigene Spec und einen eigenen Plan; der Kern wird so gebaut, dass er ihn aufnehmen kann (Abschnitt 10).

**Für wen:** primär für den Auftraggeber selbst, später über GitHub Pages für ein bis zwei Kollegen.

**Erfolgskriterien**

- Das Spiel läuft als statische Seite lokal und unverändert auf GitHub Pages.
- Ein Held lässt sich anlegen (Tier, Klasse, Name), ein Durchgang im Wellen-Modus von Start bis Sieg oder Tod spielen, Gold ausgeben, und nach Neuladen der Seite ist alles noch da.
- Die neun Tier-Klassen-Kombinationen spielen sich spürbar verschieden.
- Mit 300 Gegnern gleichzeitig bleibt das Spiel auf einem normalen Büro-Laptop flüssig (Ziel 60 Bilder/s, mindestens 30).

**Nicht im Umfang von Teilprojekt 1**

- Abenteuer-Modus, Ausrüstung, Inventar, aktive Steuerung per Maus und Tasten 1–4
- Mehrspieler, Accounts, Server, Online-Bestenliste
- Bedienung per Touch oder Gamepad
- Musik (Soundeffekte sind enthalten, siehe 7.4)

## 2. Technik

- **Reines JavaScript als ES-Module, ohne Build und ohne Node.js.** Auf dem Entwicklungsrechner ist kein Node.js installiert; der Projektordner ist direkt das, was GitHub Pages ausliefert.
- **Three.js** liegt als Datei im Projekt (`vendor/three.module.js`), keine Abhängigkeit von einem CDN zur Laufzeit.
- **Lokaler Start** über ein PowerShell-Skript (`tools/serve.ps1`), das den Ordner auf `http://localhost:8080` ausliefert. ES-Module laden nicht direkt von der Festplatte.
- **Typen** als JSDoc-Kommentare an den Datenstrukturen, damit Editoren Fehler anzeigen.
- **Tests** als Browser-Seite `tests.html` mit einem kleinen eigenen Testläufer.
- Keine eigenen Grafikdateien: Figuren, Gegner und Umgebung entstehen aus Three.js-Geometrie, Effekte aus Partikeln und Licht, Töne aus der Web Audio API.

## 3. Aufbau

```
index.html            Spielseite
tests.html            Testseite
vendor/               Three.js
tools/serve.ps1       lokaler Webserver
src/
  main.js             Start, Bildschirmwechsel, Spielschleife
  data/               Tabellen: Tiere, Klassen, Fähigkeiten, Gegner, Aufwertungen, Wellen, Dauerboni
  core/               Spiellogik ohne Grafik
    stats.js          Verrechnung der Werte
    combat.js         Treffer, Schaden, kritische Treffer, Ausweichen
    abilities.js      Fähigkeiten ausführen (Formen der Wirkung)
    world.js          Zustand eines Durchgangs: Held, Gegner, Geschosse, Aufsammelbares
    progression.js    Erfahrung, Level-up, Kartenauswahl
    rng.js            Zufall mit Startwert
    spatial.js        Raster für schnelle Nachbarschaftssuche
  modes/
    survivor.js       Regeln des Wellen-Modus: Wellen, Timer, Sieg und Tod
  render/             Three.js: Szene, Kamera, Licht, Figurenbau, Gegner, Effekte
  input/              Tastatur (später Maus)
  ui/                 Menüs, Anzeige im Spiel, Aufwertungsauswahl, Ergebnis
  save/               Speichern, Laden, Umwandeln, Export und Import
  audio/              Soundeffekte
tests/                Testdateien je Logikmodul
```

**Regeln für die Grenzen**

- `core/`, `modes/`, `data/` und `save/` importieren weder Three.js noch greifen sie auf das Dokument zu. Sie sind allein über Daten testbar. `save/` bekommt den Speicher (z. B. `localStorage`) übergeben, statt ihn selbst zu greifen.
- `render/` und `ui/` lesen den Zustand der Welt und ändern ihn nie. Rückmeldungen (gewählte Karte, Pause) laufen über wenige benannte Funktionen des Modus.
- Die Logik meldet Ereignisse (Treffer, Tod, Level-up, Aufsammeln) in einer Liste pro Zeitschritt; Darstellung und Ton reagieren darauf.

**Spielschleife:** Die Logik rechnet in festen Schritten von 1/60 s; pro Bild werden so viele Schritte nachgeholt wie nötig, höchstens fünf. Die Darstellung zeichnet einmal pro Bild und gleicht Positionen zwischen zwei Schritten aus.

## 4. Bildschirme

Hauptmenü → Heldenauswahl → (neuer Held: Tier → Klasse → Name) → Modusauswahl → Spiel → Ergebnis → Modusauswahl.

- **Hauptmenü:** Spielen, Dauerboni, Einstellungen, Spielstand exportieren/importieren.
- **Heldenauswahl:** bis zu sechs Speicherplätze mit Tier, Klasse, Name und bester Zeit; Löschen mit Rückfrage.
- **Tier- und Klassenwahl:** je drei Karten mit drehender 3D-Vorschau, Werten und Beschreibung.
- **Modusauswahl:** Wellen-Modus spielbar; Abenteuer-Modus sichtbar, aber als „kommt später" gesperrt.
- Menüs sind HTML über der 3D-Fläche. Sprache der Oberfläche: Deutsch.

## 5. Tiere, Klassen, Werte

### 5.1 Werte

Leben, Lebensregeneration, Lauftempo, Schaden (Faktor), Abklingzeit (Faktor), Wirkungsfläche (Faktor), Rüstung, kritische Chance, kritischer Schaden, Ausweichchance, Sammelradius, Erfahrungsgewinn, Goldgewinn.

**Verrechnung (eine Funktion, überall benutzt):** Endwert = (Grundwert des Tiers + feste Zuschläge) × (1 + Summe der prozentualen Zuschläge). Quellen: Klasse, Dauerboni, Boni aus dem Durchgang, später Ausrüstung. Rüstung senkt jeden Treffer um einen festen Betrag, mindestens 1 Schaden bleibt. Ausweichchance ist bei 60 % gedeckelt, Abklingzeit bei −60 %.

### 5.2 Tiere

| Tier | Leben | Tempo | Eigenheit |
|---|---|---|---|
| Hase | 80 | 6,0 | **Haken schlagen:** 15 % Ausweichchance |
| Ente | 130 | 4,6 | **Dickes Gefieder:** regeneriert 1 Leben/s |
| Waschbär | 100 | 5,2 | **Flinke Pfoten:** Sammelradius +40 %, Gold +20 %, kritische Chance +10 Prozentpunkte |

Grundwerte aller Tiere: kritische Chance 5 %, kritischer Schaden ×1,5, Sammelradius 2,5.

### 5.3 Klassen

| Klasse | Zuschläge | Startwaffe |
|---|---|---|
| Krieger | Leben +30 %, Rüstung +2 | Schwerthieb |
| Magier | Leben −15 %, Wirkungsfläche +15 %, Abklingzeit −10 % | Feuerball |
| Dieb | Tempo +10 %, kritische Chance +10 Prozentpunkte, kritischer Schaden +0,25 | Wurfdolche |

Alle Zahlen in diesem Dokument sind Startwerte fürs Balancing und stehen in `src/data/`.

### 5.4 Fähigkeiten

Jede Fähigkeit ist ein Datensatz: Kennung, Name, Klasse, Wirkungsform, Schaden, Abklingzeit, Reichweite oder Fläche, Zusatzwirkung und die Änderungen je Stufe (1–5). Wirkungsformen, die `abilities.js` ausführen kann:

| Form | Bedeutung |
|---|---|
| Bogen | Treffer in einem Kreisausschnitt vor dem Helden |
| Ring | Treffer rund um den Helden |
| Linie | Treffer in einem Streifen in Blickrichtung |
| Geschoss | fliegt, trifft den ersten Gegner oder durchschlägt mehrere |
| Kette | springt von Gegner zu Gegner |
| Zielfläche | Fläche an einem Zielpunkt, sofort oder über Zeit |
| Umlauf | Objekte kreisen um den Helden |
| Stärkung | zeitlich begrenzte Wertänderung am Helden |
| Beschwörung | Ablenkungsziel mit eigener Lebenszeit |

**Krieger**

| Fähigkeit | Form | Wirkung |
|---|---|---|
| Schwerthieb (Start) | Bogen | Hieb in Blickrichtung |
| Wirbelschlag | Ring | Schaden rundum |
| Schildstoß | Bogen | wenig Schaden, starker Rückstoß |
| Kriegsschrei | Stärkung | einige Sekunden +Schaden |
| Erdspalter | Linie | langer Riss in Blickrichtung |

**Magier**

| Fähigkeit | Form | Wirkung |
|---|---|---|
| Feuerball (Start) | Geschoss | fliegt zum nächsten Gegner, kleine Explosion |
| Frostring | Ring | Schaden und Verlangsamung |
| Kettenblitz | Kette | springt auf mehrere Gegner |
| Meteor | Zielfläche | schlägt in die dichteste Gruppe ein |
| Arkankugeln | Umlauf | kreisen und treffen bei Berührung |

**Dieb**

| Fähigkeit | Form | Wirkung |
|---|---|---|
| Wurfdolche (Start) | Geschoss | in Blickrichtung, durchschlagend |
| Giftfläche | Zielfläche | Schaden über Zeit unter dem Helden |
| Schattenklon | Beschwörung | lenkt Gegner ab |
| Klingenfächer | Geschoss | mehrere Dolche im Fächer |
| Rauchbombe | Zielfläche | Gegner in der Fläche verlieren kurz das Ziel |

Im Wellen-Modus löst jede Fähigkeit aus, sobald ihre Abklingzeit abgelaufen ist. Blickrichtung ist die letzte Bewegungsrichtung. Die Zielwahl (nächster Gegner, dichteste Gruppe) ist Teil des Datensatzes.

### 5.5 Aussehen

Jedes Tier hat einen eigenen Körper aus 3D-Formen: Hase mit langen Ohren und Stummelschwanz, Ente mit Schnabel und Bürzel, Waschbär mit Gesichtsmaske und Ringelschwanz. Die Klasse kommt als Ausstattung dazu: Rüstungsteile und Schwert, Robe und Stab, Kapuze und Dolche. Gedeckte, natürliche Farben; ein Sonnenlicht mit Schatten; einfache Lauf- und Angriffsbewegung durch Drehen der Körperteile. Der Figurenbau nimmt Tier und Klasse als Eingabe und hat benannte Befestigungspunkte (Hand, Kopf, Rumpf), damit später Ausrüstung sichtbar werden kann.

## 6. Wellen-Modus

### 6.1 Ablauf

- Der Timer läuft 15 Minuten. Bei 15:00 erscheint der letzte Boss und es kommen keine neuen Gegner mehr; ist er besiegt, ist der Durchgang gewonnen. Tod beendet den Durchgang als Niederlage.
- Start mit der Startwaffe der Klasse auf Stufe 1.
- Offene Wiese ohne Rand: Boden und Hindernisse (Bäume, Felsen) werden in Kacheln um den Helden herum aus einem Startwert erzeugt und hinter ihm wieder entfernt.
- Gegner erscheinen auf einem Ring knapp außerhalb des Sichtfelds und laufen auf den Helden zu. Hindernisse blockieren Held und Bodengegner.
- Besiegte Gegner lassen Erfahrungssplitter fallen, mit kleiner Chance Gold oder einen Heiltrank (20 % Leben). Aufsammeln durch Annähern innerhalb des Sammelradius.
- Steuerung: WASD oder Pfeiltasten zum Laufen, Esc für Pause. Die Kamera folgt schräg von oben.

### 6.2 Gegner

| Gegner | Verhalten | Ab Minute |
|---|---|---|
| Ratte | schwach, schnell, große Schwärme | 0 |
| Wildschwein | zäh, langsam, kurze Sturmangriffe | 2 |
| Krähe | fliegt über Hindernisse, weicht seitlich aus | 4 |
| Giftkröte | hält Abstand, spuckt Geschosse | 6 |
| Wolf | schnell, im Rudel, kreist ein | 9 |
| Elite | große, leuchtende Variante mit viel Leben; lässt eine Truhe fallen | alle 2 Minuten |
| Bär (Boss) | Prankenhieb und Sprungangriff mit Vorwarnung am Boden | 5, 10, 15 |

Eine Truhe gibt eine Gratis-Aufwertung (eine Karte, sofort angewendet) und Gold.

### 6.3 Schwierigkeit

Eine Wellentabelle in den Daten legt pro Minute fest: welche Gegner, wie viele pro Sekunde, Faktor für Leben und Schaden. Höchstens 300 Gegner gleichzeitig; an der Grenze wird das Kontingent in stärkere Gegner umgerechnet. Gegner, die weit hinter dem Helden zurückbleiben, werden an den Ring vor ihm versetzt.

### 6.4 Erfahrung und Level-up

- Benötigte Erfahrung je Level steigt nach einer Formel aus den Daten (Start: 5, dann +10 je Level bis 20, danach +16).
- Beim Level-up pausiert das Spiel und zeigt drei verschiedene Karten; Auswahl per Klick oder Taste 1–3.
- Kartenarten: neue Fähigkeit der eigenen Klasse (höchstens fünf Fähigkeiten gleichzeitig), Stufe für eine vorhandene Fähigkeit (bis 5), allgemeiner Bonus (Leben, Tempo, Schaden, Abklingzeit, Sammelradius, Rüstung, Regeneration; je bis Stufe 5).
- Karten, die nichts mehr bewirken können, erscheinen nicht. Ist nichts mehr aufwertbar, gibt es stattdessen Gold oder Heilung.

### 6.5 Gold und Dauerboni

- Gold aus dem Durchgang bleibt auch beim Tod erhalten.
- Dauerboni im Hauptmenü, je fünf Stufen mit steigendem Preis: Leben, Schaden, Lauftempo, Sammelradius, Erfahrungsgewinn, Goldgewinn, Rüstung, Wiederbelebung (eine Stufe: einmal pro Durchgang mit halbem Leben aufstehen).
- Gold und Dauerboni gelten für alle Helden gemeinsam.

### 6.6 Anzeige und Ergebnis

- Im Spiel: Lebensbalken, Erfahrungsbalken mit Level, Timer, Gold, besiegte Gegner, Fähigkeitssymbole mit Stufe, Lebensbalken des Bosses, aufsteigende Schadenszahlen.
- Ergebnis: Sieg oder Niederlage, Überlebenszeit, Level, besiegte Gegner, verdientes Gold, Schaden je Fähigkeit. Die beste Zeit je Held wird gespeichert.

## 7. Speichern, Einstellungen, Ton

### 7.1 Datensatz

Ein Eintrag im `localStorage` unter festem Schlüssel:

```
{
  version: 1,
  heroes: [{ id, name, animal, class, createdAt, survivor: { bestTime, wins, runs } }],
  gold: 0,
  metaUpgrades: { <kennung>: stufe },
  settings: { volume, quality }
}
```

- Automatisches Speichern nach jedem Durchgang, jedem Kauf und jeder Änderung an Helden oder Einstellungen.
- Ein laufender Durchgang wird nicht gespeichert. Wird der Tab geschlossen, ist er samt dem darin gesammelten Gold verloren.
- Laden läuft durch eine Kette von Umwandlungen je Versionsnummer, damit spätere Erweiterungen alte Stände übernehmen.

### 7.2 Export und Import

Export lädt den Datensatz als JSON-Datei herunter. Import prüft Aufbau und Version, fragt vor dem Überschreiben nach und ersetzt dann den Stand. Nötig, weil der Browser Stände je Adresse trennt (lokal und GitHub Pages).

### 7.3 Einstellungen

Lautstärke (0–100) und Grafikqualität in zwei Stufen: „Hoch" mit Schatten und vollen Effekten, „Niedrig" ohne Schatten und mit weniger Partikeln.

### 7.4 Ton

Kurze, per Web Audio erzeugte Effekte für Treffer, Aufsammeln, Level-up, Bosswarnung, Tod und Sieg. Keine Musik.

## 8. Fehlerfälle

| Fall | Verhalten |
|---|---|
| Stand beschädigt oder unlesbar | Spiel startet mit leerem Stand, der defekte Inhalt wird unter einem Sicherungsschlüssel aufbewahrt, Hinweis im Hauptmenü |
| Stand von neuerer Version als das Spiel | wird nicht geladen und nicht überschrieben; Hinweis |
| Import ungültig oder von neuerer Version | Ablehnung mit Meldung, vorhandener Stand bleibt |
| Speicher gesperrt oder voll | Spiel läuft weiter, dauerhafter Hinweis „Fortschritt kann nicht gespeichert werden" |
| Kein WebGL | verständliche Meldung statt leerer Seite |
| Tab verliert den Fokus | automatische Pause |
| Ruckler | feste Zeitschritte, höchstens fünf Nachholschritte pro Bild; darüber läuft das Spiel langsamer statt Gegner springen zu lassen |

## 9. Leistung

- Gegner je Art in einem gemeinsamen Zeichenaufruf (`InstancedMesh`); ebenso Erfahrungssplitter und Geschosse.
- Nachbarschaftssuche für Treffer und Abstandhalten über ein Raster statt jeder gegen jeden.
- Objekte (Gegner, Geschosse, Partikel, Schadenszahlen) werden wiederverwendet statt neu angelegt.
- Schatten nur vom Sonnenlicht und nur für Held, Boss und Hindernisse.

## 10. Vorbereitung auf den Abenteuer-Modus

Im Kern jetzt schon angelegt, ohne dass Teilprojekt 1 es nutzt:

- Fähigkeiten trennen **Wirkung** von **Auslöser** (automatisch oder per Eingabe mit Zielpunkt).
- Die Werteverrechnung nimmt beliebig viele Quellen entgegen; Ausrüstung wird eine weitere Quelle.
- Die Welt eines Durchgangs kennt keine Wellenregeln; diese liegen im Modus. Ein zweiter Modus bringt eigene Regeln und Karten mit.
- Der Speicherdatensatz hat eine Versionsnummer und je Held einen eigenen Bereich pro Modus.
- Der Figurenbau hat Befestigungspunkte für sichtbare Ausrüstung.

## 11. Tests

**Automatisch (`tests.html`, Logik ohne Grafik, Zufall mit festem Startwert)**

- Werteverrechnung: Reihenfolge fest vor prozentual, Deckelungen, alle neun Kombinationen
- Kampf: Schaden, Rüstung mit Mindestschaden, kritische Treffer, Ausweichen
- Fähigkeiten: jede Wirkungsform trifft die richtigen Gegner; Stufen ändern die richtigen Werte; Abklingzeiten
- Fortschritt: Erfahrungskurve, Kartenauswahl (keine Doppelten, keine wirkungslosen, Obergrenzen), Truhe
- Wellen: Tabelle je Minute, Obergrenze 300, Boss- und Elite-Zeitpunkte, Sieg und Tod, Wiederbelebung
- Dauerboni: Preise, Kauf mit zu wenig Gold, Höchststufe
- Speichern: Hin und zurück, Umwandlung, beschädigter Stand, neuere Version, gesperrter Speicher, Import-Prüfung

**Von Hand im Browser nach jedem größeren Schritt**

Heldenerstellung für alle Tiere und Klassen, ein Durchgang mit Level-ups, Boss, Tod, Sieg (mit Testschalter für schnelleren Zeitablauf über `?debug=1`), Kauf, Neuladen der Seite, Export und Import, beide Qualitätsstufen.

**Nicht automatisch prüfbar:** ob sich das Balancing über volle 15 Minuten gut anfühlt. Die Feinabstimmung der Zahlen folgt nach dem ersten Spielen durch den Auftraggeber.
