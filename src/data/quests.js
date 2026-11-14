// Aufträge von Kapitel 1 (Spec §10.4). Kennungen werden nie umbenannt; neue Schritte nur hinten anfügen.

/**
 * @typedef {{ type: 'talk'|'reach'|'kill'|'collect'|'boss', target: string, count?: number, map?: string, text: string,
 *   from?: 'spot'|string[] }} StepDef
 *   `collect`: `from: 'spot'` = Fundorte dieser Art („Untersuchen“), sonst Gegnerarten, deren Besiegen mit Chance
 *   `QUEST_DROP` ein Stück gibt.
 * @typedef {{ id: string, kind: 'main'|'side', title: string, giver: string, requires: string[], steps: StepDef[],
 *   reward: { xp: number, gold: number, item?: string, potions?: number }, unlocks?: 'merchant'|'smith', endsChapter?: number }} QuestDef
 *   `endsChapter`: mit diesem Auftrag ist das Kapitel geschafft.
 */

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
};
