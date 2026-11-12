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
  leben: { id: 'leben', name: 'Leben', description: '+5 % maximales Leben je Stufe', modifier: { stat: 'maxHp', pct: 0.05 }, maxLevel: 5, basePrice: 50 },
  schaden: { id: 'schaden', name: 'Schaden', description: '+4 % Schaden je Stufe', modifier: { stat: 'damage', pct: 0.04 }, maxLevel: 5, basePrice: 50 },
  tempo: { id: 'tempo', name: 'Tempo', description: '+3 % Lauftempo je Stufe', modifier: { stat: 'moveSpeed', pct: 0.03 }, maxLevel: 5, basePrice: 50 },
  sammelradius: { id: 'sammelradius', name: 'Sammelradius', description: '+10 % Sammelradius je Stufe', modifier: { stat: 'pickupRadius', pct: 0.10 }, maxLevel: 5, basePrice: 50 },
  erfahrung: { id: 'erfahrung', name: 'Erfahrung', description: '+5 % Erfahrung je Stufe', modifier: { stat: 'xpGain', pct: 0.05 }, maxLevel: 5, basePrice: 50 },
  gold: { id: 'gold', name: 'Gold', description: '+10 % Gold je Stufe', modifier: { stat: 'goldGain', pct: 0.10 }, maxLevel: 5, basePrice: 50 },
  ruestung: { id: 'ruestung', name: 'Rüstung', description: '+1 Rüstung je Stufe', modifier: { stat: 'armor', flat: 1 }, maxLevel: 5, basePrice: 50 },
  wiederbelebung: { id: 'wiederbelebung', name: 'Wiederbelebung', description: 'Einmal pro Durchlauf mit halbem Leben wiederbeleben', maxLevel: 1, basePrice: 500 },
};
