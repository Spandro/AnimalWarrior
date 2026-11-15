// Händler Krümel (Spec §11.4): Heiltränke und feste Auswahl kaufen, Stücke aus der Truhe verkaufen.
import { el, formatNumber } from './dom.js';
import { panel } from './adventureMenus.js';
import { confirmDialog } from './menus.js';
import { itemTitle, itemRow } from './equipment.js';
import { ITEMS, RARITIES } from '../data/items.js';
import { POTION, SHOP_LINES } from '../data/adventure.js';
import { buyPotion, buyItem, sellItem, shopStock, shopPrice } from '../save/adventure.js';

const REASON = { gold: 'Zu wenig Gold.', full: 'Mehr als 4 Tränke passen nicht in die Tasche.', owned: 'Hast du schon.' };

/** @param {import('./adventureMenus.js').MenuCtx} ctx */
export function openShop(ctx) {
  let tab = 'buy', note = SHOP_LINES[Math.floor(Math.random() * SHOP_LINES.length)];
  return panel(ctx.uiLayer, 'Krümels Laden', (body, api) => {
    const save = ctx.app.save, rec = ctx.run.record;
    const act = (fn) => { let r; ctx.change((s) => { r = fn(s); }); note = r.ok ? 'Danke! Beehren Sie mich bald wieder.' : REASON[r.reason] ?? ''; api.refresh(); };
    body.append(el('p', { class: 'adv-note' }, `Krümel: „${note}“ · Gold: `, el('strong', { text: formatNumber(save.gold) })));
    body.append(el('div', { class: 'adv-tabs' },
      el('button', { class: `btn${tab === 'buy' ? ' btn-primary' : ''}`, type: 'button', 'aria-pressed': tab === 'buy' ? 'true' : 'false', onclick: () => { tab = 'buy'; api.refresh(); } }, 'Kaufen'),
      el('button', { class: `btn${tab === 'sell' ? ' btn-primary' : ''}`, type: 'button', 'aria-pressed': tab === 'sell' ? 'true' : 'false', onclick: () => { tab = 'sell'; api.refresh(); } }, 'Verkaufen')));
    if (tab === 'buy') {
      body.append(el('button', { class: 'adv-quest-row', type: 'button', 'data-key': 'potion', onclick: () => act((s) => buyPotion(s, ctx.heroId)) },
        el('strong', { text: `Heiltrank – ${POTION.price} Gold` }), el('span', { class: 'adv-muted', text: `In der Tasche: ${rec.potions} von ${POTION.max}` })));
      for (const id of shopStock(rec)) {
        const owned = save.inventory.includes(id);
        body.append(itemRow({ class: 'adv-quest-row', type: 'button', 'data-key': id, disabled: owned, style: `border-color:${RARITIES[ITEMS[id].rarity].color}`, onclick: () => act((s) => buyItem(s, id, ctx.heroId)) }, id,
          el('strong', { text: `${ITEMS[id].name} – ${shopPrice(id)} Gold` }),
          el('span', { class: 'adv-muted', text: owned ? 'Schon in deiner Truhe' : `„${ITEMS[id].line}“` })));
      }
      return;
    }
    if (save.inventory.length === 0) body.append(el('p', { class: 'adv-note', text: 'Deine Truhe ist leer.' }));
    for (const id of save.inventory) {
      const wearer = save.heroes.find((h) => h.adventure && Object.values(h.adventure.equipment).includes(id));
      body.append(itemRow({
        class: 'adv-quest-row', type: 'button', 'data-key': id, disabled: !!wearer, style: `border-color:${RARITIES[ITEMS[id].rarity].color}`,
        onclick: async () => {
          const ok = await confirmDialog({ title: 'Verkaufen?', message: `${itemTitle(id, save.itemLevels)} für ${RARITIES[ITEMS[id].rarity].resale} Gold verkaufen? Eine Verbesserung geht dabei verloren.`, confirmLabel: 'Verkaufen' });
          if (ok) act((s) => sellItem(s, id));
        },
      }, id,
      el('strong', { text: `${itemTitle(id, save.itemLevels)} – ${RARITIES[ITEMS[id].rarity].resale} Gold` }),
      el('span', { class: 'adv-muted', text: wearer ? `angelegt von ${wearer.name}` : RARITIES[ITEMS[id].rarity].name })));
    }
  });
}
