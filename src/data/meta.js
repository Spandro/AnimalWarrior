/**
 * @typedef {import('./animals.js').Modifier} Modifier
 * @typedef {{ id: string, name: string, description: string, modifier?: Modifier, maxLevel: number, basePrice: number }} MetaDef
 */

/**
 * Dauerboni, die mit Gold gekauft werden; der Modifikator gilt je Stufe.
 * Preis der nächsten Stufe: basePrice × 2^aktuelleStufe.
 * @type {Record<string, MetaDef>}
 */
export const META = {
  leben: { id: 'leben', name: 'Extra Polster', description: '+5 % maximales Leben je Stufe. Gut gepolstert ist halb gewonnen.', modifier: { stat: 'maxHp', pct: 0.05 }, maxLevel: 5, basePrice: 50 },
  schaden: { id: 'schaden', name: 'Schlechte Laune', description: '+4 % Schaden je Stufe. Wer sauer ist, haut fester zu.', modifier: { stat: 'damage', pct: 0.04 }, maxLevel: 5, basePrice: 50 },
  tempo: { id: 'tempo', name: 'Chronisch zu spät', description: '+3 % Lauftempo je Stufe. Es eilt immer.', modifier: { stat: 'moveSpeed', pct: 0.03 }, maxLevel: 5, basePrice: 50 },
  sammelradius: { id: 'sammelradius', name: 'Taschen mit Magnet', description: '+10 % Sammelradius je Stufe. Alles klebt von selbst dran.', modifier: { stat: 'pickupRadius', pct: 0.10 }, maxLevel: 5, basePrice: 50 },
  erfahrung: { id: 'erfahrung', name: 'Besserwisser', description: '+5 % Erfahrung je Stufe. Hast du natürlich schon immer gewusst.', modifier: { stat: 'xpGain', pct: 0.05 }, maxLevel: 5, basePrice: 50 },
  gold: { id: 'gold', name: 'Goldzahn', description: '+10 % Gold je Stufe. Glänzt und zahlt sich aus.', modifier: { stat: 'goldGain', pct: 0.10 }, maxLevel: 5, basePrice: 50 },
  ruestung: { id: 'ruestung', name: 'Konservendosen-Look', description: '+1 Rüstung je Stufe. Sieht komisch aus, hilft aber.', modifier: { stat: 'armor', flat: 1 }, maxLevel: 5, basePrice: 50 },
  wiederbelebung: { id: 'wiederbelebung', name: 'Neun Leben (eins davon)', description: 'Einmal pro Durchlauf mit halbem Leben wiederbeleben. Aufstehen ist das neue Hinfallen.', maxLevel: 1, basePrice: 500 },
};
