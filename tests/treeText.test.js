import { test, assertEqual } from './runner.js';
import { heroLineText, passiveEffectText, branchStatus, treeHeader, respecLine, offerRespec } from '../src/ui/treeText.js';
import { PASSIVES } from '../src/data/subclasses.js';

test('treeText: Heldenzeile mit Unterklasse', () => {
  assertEqual(heroLineText({ animal: 'hase', class: 'krieger', adventure: null }), 'Hase · Krieger');
  assertEqual(heroLineText({ animal: 'hase', class: 'krieger', adventure: { subclass: null } }), 'Hase · Krieger');
  assertEqual(heroLineText({ animal: 'hase', class: 'krieger', adventure: { subclass: 'tuersteher' } }), 'Hase · Krieger · Türsteher');
});

test('treeText: Dauer-Boni in Worten, besondere mit Name der Besonderheit', () => {
  assertEqual(passiveEffectText(PASSIVES.dickehaut), 'Leben +4 % je Stufe');
  assertEqual(passiveEffectText(PASSIVES.lederjacke), 'Rüstung +1 je Stufe');
  assertEqual(passiveEffectText(PASSIVES.zapfhahn), 'Lebensraub +2 % je Stufe');
  assertEqual(passiveEffectText(PASSIVES.kreuzbreiter), 'Schild-Stärke +5 % je Stufe (Breites Kreuz)');
  assertEqual(passiveEffectText(PASSIVES.langerschatten), 'Dauer +0,5 s je Stufe (Hier war niemand)');
  assertEqual(passiveEffectText(PASSIVES.vorgekocht), 'Abklingzeit −4 % je Stufe');
  assertEqual(passiveEffectText(PASSIVES.zugabe), 'Dauer von Stärkungen +1 s je Stufe');
  assertEqual(passiveEffectText(PASSIVES.zornesfalte), 'kritischer Schaden +10 % je Stufe');
});

test('treeText: Astzeile gesperrt oder mit Stufe, Kopfzeile und Umlernen', () => {
  const rec = { level: 12, skillPoints: 3, subclass: 'tuersteher', abilities: { schwerthieb: 1, breiteskreuz: 2 }, passives: {} };
  assertEqual(branchStatus(rec, 'ausweisbitte'), { unlocked: false, level: 0, label: 'Freischalten: 1 Punkt' });
  assertEqual(branchStatus(rec, 'breiteskreuz'), { unlocked: true, level: 2, label: 'Stufe 2 von 5' });
  assertEqual(treeHeader(rec), 'Punkte: 3 · Unterklasse: Türsteher');
  assertEqual(treeHeader({ ...rec, subclass: null, level: 8 }), 'Punkte: 3 · Unterklasse ab Level 10');
  assertEqual(treeHeader({ ...rec, subclass: null }), 'Punkte: 3 · Unterklasse: noch nicht gewählt');
  assertEqual(respecLine(), 'Umlernen bei Oma Panzerla: 500 Gold, alle Punkte zurück, Unterklasse neu wählen.');
});

test('treeText: Umlernen-Tafel nur bei Oma, ab Level 10 mit Unterklasse und nur nach einem Gespräch ohne Auftragsschritt', () => {
  const rec = { level: 12, subclass: 'tuersteher' };
  assertEqual(offerRespec({ npc: 'panzerla' }, rec), true);
  assertEqual(offerRespec({ npc: 'kruemel' }, rec), false);
  assertEqual(offerRespec({ npc: 'panzerla', offer: 'x' }, rec), false);
  assertEqual(offerRespec({ npc: 'panzerla', advances: 'x' }, rec), false);
  assertEqual(offerRespec({ npc: 'panzerla', completes: 'x' }, rec), false);
  assertEqual(offerRespec({ npc: 'panzerla' }, { level: 12, subclass: null }), false);
  assertEqual(offerRespec({ npc: 'panzerla' }, { level: 9, subclass: 'tuersteher' }), false);
});
