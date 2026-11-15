// Aufträge von Kapitel 1 (Spec §10.4) und Kapitel 2 (Etappe 3, Spec §5.4). Kennungen werden nie umbenannt; neue Schritte nur hinten anfügen.

/**
 * @typedef {{ type: 'talk'|'reach'|'kill'|'collect'|'boss', target: string, count?: number, map?: string, text: string,
 *   from?: 'spot'|string[] }} StepDef
 *   `collect`: `from: 'spot'` = Fundorte dieser Art („Untersuchen“), sonst Gegnerarten, deren Besiegen mit Chance
 *   `QUEST_DROP` ein Stück gibt.
 * @typedef {{ id: string, kind: 'main'|'side', title: string, giver: string, requires: string[], steps: StepDef[],
 *   reward: { xp: number, gold: number, item?: string, potions?: number }, unlocks?: 'merchant'|'smith', endsChapter?: number,
 *   chapter?: number }} QuestDef
 *   `endsChapter`: mit diesem Auftrag ist das Kapitel geschafft. `chapter`: zu welchem Kapitel er gehört (fehlt = 1).
 */

/** Anzeigenamen der Auftragsstücke (Meldung „Gefunden: …“). */
export const QUEST_THING_NAMES = {
  hammer: 'Grabowskis Hammer', nuss: 'Nussversteck', flugblatt: 'Flugblatt', krebsschere: 'Krebsschere',
  einladung: 'Einladung zur Krönung', irrlicht: 'Irrlicht', seerose: 'Seerose',
};

/** Chance, dass ein passender Gegner ein Auftragsstück (Flugblatt, Krebsschere) fallen lässt. */
export const QUEST_DROP = 0.5;

/** @type {Record<string, QuestDef>} */
export const QUESTS = {
  nasse_pfoten: {
    id: 'nasse_pfoten', kind: 'main', title: 'Nasse Pfoten', giver: 'panzerla', requires: [],
    steps: [
      { type: 'kill', target: 'helmfisch', count: 6, map: 'kapitel1', text: 'Vertreibe Helmfische am Bachufer' },
      { type: 'talk', target: 'panzerla', text: 'Berichte Oma Panzerla' },
    ],
    reward: { xp: 40, gold: 30, potions: 1 }, unlocks: 'merchant',
  },
  schmied_ohne_hammer: {
    id: 'schmied_ohne_hammer', kind: 'main', title: 'Ein Schmied ohne Hammer', giver: 'grabowski', requires: ['nasse_pfoten'],
    steps: [
      { type: 'reach', target: 'krebslager', map: 'kapitel1', text: 'Finde das Krebslager' },
      { type: 'collect', target: 'hammer', from: 'spot', count: 1, map: 'kapitel1', text: 'Hol Grabowskis Hammer' },
      { type: 'talk', target: 'grabowski', text: 'Bring Grabowski den Hammer' },
    ],
    reward: { xp: 90, gold: 40 }, unlocks: 'smith',
  },
  bruecke_zu: {
    id: 'bruecke_zu', kind: 'main', title: 'Brücke zu', giver: 'panzerla', requires: ['schmied_ohne_hammer'],
    steps: [
      { type: 'reach', target: 'alte_bruecke', map: 'kapitel1', text: 'Geh zur Alten Brücke' },
      { type: 'boss', target: 'graete', map: 'kapitel1', text: 'Besiege Hauptmann Gräte' },
      { type: 'talk', target: 'panzerla', text: 'Erzähl Oma Panzerla davon' },
    ],
    reward: { xp: 180, gold: 60 },
  },
  flugblaetter: {
    id: 'flugblaetter', kind: 'main', title: 'Flugblätter', giver: 'panzerla', requires: ['bruecke_zu'],
    steps: [
      { type: 'collect', target: 'flugblatt', from: ['helmfisch', 'frosch'], count: 5, map: 'kapitel1', text: 'Nimm Fischen und Fröschen Flugblätter ab' },
      { type: 'talk', target: 'panzerla', text: 'Zeig Oma Panzerla die Flugblätter' },
    ],
    reward: { xp: 240, gold: 80, potions: 1 },
  },
  zwickzwack: {
    id: 'zwickzwack', kind: 'main', title: 'Zwickzwack', giver: 'panzerla', requires: ['flugblaetter'],
    steps: [
      { type: 'reach', target: 'quellteich', map: 'kapitel1', text: 'Geh zum Quellteich' },
      { type: 'boss', target: 'zwickzwack', map: 'kapitel1', text: 'Besiege Kommandant Zwickzwack' },
      { type: 'talk', target: 'panzerla', text: 'Bring Oma Panzerla die Flaschenpost' },
    ],
    reward: { xp: 400, gold: 150 }, endsChapter: 1,
  },
  verbuddelt: {
    id: 'verbuddelt', kind: 'side', title: 'Verbuddelt und vergessen', giver: 'nussa', requires: [],
    steps: [
      { type: 'collect', target: 'nuss', from: 'spot', count: 5, map: 'kapitel1', text: 'Finde Nussas Verstecke' },
      { type: 'talk', target: 'nussa', text: 'Bring Nussa ihre Nüsse' },
    ],
    reward: { xp: 120, gold: 40, item: 'schneckenhaus' },
  },
  post_amsel: {
    id: 'post_amsel', kind: 'side', title: 'Post für Tante Amsel', giver: 'pieps', requires: ['nasse_pfoten'],
    steps: [
      { type: 'talk', target: 'amsel', text: 'Bring Tante Amsel den Brief' },
      { type: 'talk', target: 'pieps', text: 'Bring Pieps die Antwort' },
    ],
    reward: { xp: 100, gold: 30, item: 'flussperlenohrring' },
  },
  hamsterkauf: {
    id: 'hamsterkauf', kind: 'side', title: 'Hamsterkauf', giver: 'kruemel', requires: ['nasse_pfoten'],
    steps: [
      { type: 'collect', target: 'krebsschere', from: ['krebs'], count: 8, map: 'kapitel1', text: 'Sammle Krebsscheren' },
      { type: 'talk', target: 'kruemel', text: 'Bring Krümel die Scheren' },
    ],
    reward: { xp: 120, gold: 60, item: 'wasserlaeufer' },
  },

  // ---------------------------------------------------------------- Kapitel 2 „Der Sumpf“
  ruf_aus_dem_sumpf: {
    id: 'ruf_aus_dem_sumpf', chapter: 2, kind: 'main', title: 'Ruf aus dem Sumpf', giver: 'panzerla', requires: ['zwickzwack'],
    steps: [
      { type: 'reach', target: 'schilfrand', map: 'kapitel2', text: 'Geh in den Sumpf westlich von Bachwinkel' },
      { type: 'talk', target: 'quappe', text: 'Sprich mit Frau Quappe am Unkenteich' },
    ],
    reward: { xp: 80, gold: 80, potions: 1 },
  },
  froesche_verbuendet: {
    id: 'froesche_verbuendet', chapter: 2, kind: 'main', title: 'Die Frösche haben sich verbündet', giver: 'quappe', requires: ['ruf_aus_dem_sumpf'],
    steps: [
      { type: 'kill', target: 'ochsenfrosch', count: 6, map: 'kapitel2', text: 'Vertreibe Ochsenfrösche im Schilf' },
      { type: 'collect', target: 'einladung', from: ['ochsenfrosch', 'frosch'], count: 4, map: 'kapitel2', text: 'Nimm Fröschen Einladungen zur Krönung ab' },
      { type: 'talk', target: 'quappe', text: 'Zeig Frau Quappe die Einladungen' },
    ],
    reward: { xp: 120, gold: 100 },
  },
  hofmarschall: {
    id: 'hofmarschall', chapter: 2, kind: 'main', title: 'Der Hofmarschall', giver: 'quappe', requires: ['froesche_verbuendet'],
    steps: [
      { type: 'reach', target: 'froschhof', map: 'kapitel2', text: 'Geh zum Froschhof' },
      { type: 'boss', target: 'quak', map: 'kapitel2', text: 'Besiege Hofmarschall Quak' },
      { type: 'talk', target: 'quappe', text: 'Erzähl Frau Quappe davon' },
    ],
    reward: { xp: 160, gold: 140, potions: 1 },
  },
  nebel_im_moor: {
    id: 'nebel_im_moor', chapter: 2, kind: 'main', title: 'Nebel im Moor', giver: 'quappe', requires: ['hofmarschall'],
    steps: [
      { type: 'reach', target: 'nebelmoor', map: 'kapitel2', text: 'Geh ins Nebelmoor' },
      { type: 'collect', target: 'irrlicht', from: 'spot', count: 3, map: 'kapitel2', text: 'Fang drei Irrlichter' },
      { type: 'talk', target: 'quappe', text: 'Bring Frau Quappe die Irrlichter' },
    ],
    reward: { xp: 200, gold: 160 },
  },
  hecht_haudrauf: {
    id: 'hecht_haudrauf', chapter: 2, kind: 'main', title: 'Hecht Haudrauf', giver: 'quappe', requires: ['nebel_im_moor'],
    steps: [
      { type: 'reach', target: 'hechtloch', map: 'kapitel2', text: 'Geh zum Hechtloch' },
      { type: 'boss', target: 'haudrauf', map: 'kapitel2', text: 'Besiege Hecht Haudrauf' },
      { type: 'talk', target: 'panzerla', text: 'Erzähl Oma Panzerla vom Sumpf' },
    ],
    reward: { xp: 300, gold: 250 }, endsChapter: 2,
  },
  egelplage: {
    id: 'egelplage', chapter: 2, kind: 'side', title: 'Egelplage', giver: 'quappe', requires: ['ruf_aus_dem_sumpf'],
    steps: [
      { type: 'kill', target: 'blutegel', count: 8, map: 'kapitel2', text: 'Vertreibe Blutegel' },
      { type: 'talk', target: 'quappe', text: 'Sag Frau Quappe Bescheid' },
    ],
    reward: { xp: 80, gold: 80, item: 'libellenfluegel' },
  },
  seerosen: {
    id: 'seerosen', chapter: 2, kind: 'side', title: 'Seerosen für Frau Quappe', giver: 'quappe', requires: ['ruf_aus_dem_sumpf'],
    steps: [
      { type: 'collect', target: 'seerose', from: 'spot', count: 4, map: 'kapitel2', text: 'Pflück vier Seerosen' },
      { type: 'talk', target: 'quappe', text: 'Bring Frau Quappe die Seerosen' },
    ],
    reward: { xp: 80, gold: 80, item: 'froschschleuder' },
  },
  libellenflug: {
    id: 'libellenflug', chapter: 2, kind: 'side', title: 'Libellenflug', giver: 'quappe', requires: ['hofmarschall'],
    steps: [
      { type: 'kill', target: 'libelle', count: 10, map: 'kapitel2', text: 'Verscheuche Libellen' },
      { type: 'talk', target: 'quappe', text: 'Erzähl Frau Quappe davon' },
    ],
    reward: { xp: 100, gold: 90, potions: 1 },
  },
};

/**
 * Erster Auftrag je Kapitel ab 2: Solange er noch beim ersten Schritt steht, läuft beim Betreten der Karte die
 * Einstiegsgeschichte des Kapitels (kein eigenes Feld im Spielstand).
 */
export const CHAPTER_START_QUEST = { 2: 'ruf_aus_dem_sumpf' };
