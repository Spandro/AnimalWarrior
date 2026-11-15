// Schmied Grabowski (Spec §11.3): Stücke der Truhe verbessern (+1 bis +5) gegen Gold und Flussperlen.
import { el, formatNumber } from './dom.js';
import { panel } from './adventureMenus.js';
import { describeModifier } from './heroCreate.js';
import { itemTitle, itemRow } from './equipment.js';
import { lootIcon } from './tavern.js';
import { ITEMS, RARITIES } from '../data/items.js';
import { SMITH, SMITH_LINES } from '../data/adventure.js';
import { scaledModifiers } from '../core/adventureHero.js';
import { smithCost, upgradeItem } from '../save/adventure.js';

const REASON = { gold: 'Dafür fehlt dir Gold.', pearls: 'Dafür brauchst du Flussperlen. Die haben Bosse.', max: 'Besser geht es nicht. Ehrlich.' };

/** @param {import('./adventureMenus.js').MenuCtx} ctx */
export function openSmith(ctx) {
  let pick = null, note = SMITH_LINES[Math.floor(Math.random() * SMITH_LINES.length)];
  return panel(ctx.uiLayer, 'Grabowskis Schmiede', (body, api) => {
    const save = ctx.app.save, levels = save.itemLevels;
    body.append(el('p', { class: 'adv-note' }, `Grabowski: „${note}“ · Gold: `, el('strong', { text: formatNumber(save.gold) }),
      ` · Flussperlen: ${save.materials.flussperle ?? 0}`));
    if (!pick) {
      if (save.inventory.length === 0) body.append(el('p', { class: 'adv-note', text: 'Bring mir erst mal was zum Hämmern.' }));
      for (const id of save.inventory) {
        body.append(itemRow({ class: 'adv-quest-row', type: 'button', 'data-key': id, style: `border-color:${RARITIES[ITEMS[id].rarity].color}`, onclick: () => { pick = id; api.refresh(); } }, id,
          el('strong', { text: itemTitle(id, levels) }), el('span', { class: 'adv-muted', text: `Stufe ${levels[id] ?? 0} von ${SMITH.maxLevel}` })));
      }
      return;
    }
    const level = levels[pick] ?? 0;
    body.append(el('button', { class: 'btn', type: 'button', onclick: () => { pick = null; api.refresh(); } }, '← Alle Stücke'));
    body.append(el('div', { class: 'adv-item-head' }, lootIcon(ITEMS[pick], 'loot-row'), el('h3', { text: itemTitle(pick, levels) })));
    body.append(el('p', { class: 'adv-muted', text: `Jetzt: ${scaledModifiers(pick, level).map(describeModifier).join(', ')}` }));
    if (level >= SMITH.maxLevel) { body.append(el('p', { class: 'adv-note', text: REASON.max })); return; }
    const cost = smithCost(pick, level + 1);
    body.append(el('p', { class: 'adv-muted', text: `Danach (+${level + 1}): ${scaledModifiers(pick, level + 1).map(describeModifier).join(', ')}` }));
    const lacking = save.gold < cost.gold ? 'gold' : (save.materials.flussperle ?? 0) < cost.pearls ? 'pearls' : null;
    body.append(el('button', {
      class: 'btn btn-primary btn-large', type: 'button', 'data-key': 'upgrade', disabled: !!lacking,
      onclick: () => { let r; ctx.change((s) => { r = upgradeItem(s, pick); }); note = r.ok ? 'Fertig. Nicht anfassen, ist noch heiß.' : REASON[r.reason]; api.refresh(); },
    }, `Verbessern: ${cost.gold} Gold${cost.pearls ? ` und ${cost.pearls} Flussperle${cost.pearls > 1 ? 'n' : ''}` : ''}`));
    if (lacking) body.append(el('p', { class: 'adv-note', text: REASON[lacking] }));
  });
}
