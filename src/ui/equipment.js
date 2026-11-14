// Ausrüstung (Spec §11.2): fünf Plätze, je Platz die passenden Stücke aus der Truhe mit Vergleich.
import { el } from './dom.js';
import { panel } from './adventureMenus.js';
import { describeModifier } from './heroCreate.js';
import { ITEMS, RARITIES, SLOT_NAMES } from '../data/items.js';
import { CLASS_WEAPON } from '../data/adventure.js';
import { itemDelta } from '../core/adventureHero.js';
import { equipItem } from '../save/adventure.js';

/** Name mit Verbesserungsstufe, z. B. „Paddel der Tapferkeit +2“. */
export function itemTitle(id, levels) {
  const l = levels[id] ?? 0;
  return l ? `${ITEMS[id].name} +${l}` : ITEMS[id].name;
}

/** Eine Zeile des Vergleichs in Worten: „Rüstung +2 (bisher +1)“. */
function deltaText(d) {
  const now = describeModifier({ stat: d.stat, [d.kind]: d.to || 0 });
  if (d.from === d.to) return now;
  const before = d.from ? describeModifier({ stat: d.stat, [d.kind]: d.from }).split(' ').slice(-2).join(' ') : 'nichts';
  return `${d.to ? now : `${describeModifier({ stat: d.stat, [d.kind]: d.from })} fällt weg`}${d.to ? ` (bisher ${before})` : ''}`;
}

/** @param {import('./adventureMenus.js').MenuCtx} ctx */
export function openEquipment(ctx) {
  let slot = null;
  return panel(ctx.uiLayer, 'Ausrüstung', (body, api) => {
    const save = ctx.app.save, rec = ctx.run.record, stats = ctx.run.world.hero.stats;
    const levels = save.itemLevels;
    if (!slot) {
      body.append(el('p', { class: 'adv-note', text: `Leben ${Math.round(stats.maxHp)} · Rüstung ${Math.round(stats.armor)} · Schaden ${Math.round(stats.damage * 100)} % · Tempo ${stats.moveSpeed.toFixed(1)}` }));
      for (const [key, label] of Object.entries(SLOT_NAMES)) {
        const id = rec.equipment[key];
        body.append(el('button', { class: 'adv-quest-row', type: 'button', 'data-key': key, onclick: () => { slot = key; api.refresh(); } },
          el('strong', { text: label }),
          el('span', { text: id ? itemTitle(id, levels) : '– leer –', style: id ? `color:${RARITIES[ITEMS[id].rarity].color}` : null })));
      }
      return;
    }
    const current = rec.equipment[slot];
    const kind = CLASS_WEAPON[ctx.run.hero.class];
    body.append(el('button', { class: 'btn', type: 'button', onclick: () => { slot = null; api.refresh(); } }, '← Alle Plätze'));
    if (current) body.append(el('button', { class: 'btn', type: 'button', onclick: () => { ctx.change((s) => equipItem(s, ctx.heroId, slot, null)); slot = null; api.refresh(); } }, `${ITEMS[current].name} ablegen`));
    const order = Object.keys(RARITIES);
    const options = save.inventory.filter((id) => ITEMS[id]?.slot === slot && (slot !== 'waffe' || !kind || ITEMS[id].weaponKind === kind))
      .sort((a, b) => order.indexOf(ITEMS[b].rarity) - order.indexOf(ITEMS[a].rarity));
    if (options.length === 0) body.append(el('p', { class: 'adv-note', text: 'Noch nichts Passendes in der Truhe. Gegner, Kisten, Krümel und die Taverne haben Nachschub.' }));
    for (const id of options) {
      const worn = id === current;
      body.append(el('button', {
        class: `adv-quest-row${worn ? ' on' : ''}`, type: 'button', 'data-key': id, disabled: worn,
        style: `border-color:${RARITIES[ITEMS[id].rarity].color}`,
        onclick: () => { ctx.change((s) => equipItem(s, ctx.heroId, slot, id)); slot = null; api.refresh(); },
      },
      el('strong', { text: `${itemTitle(id, levels)}${worn ? ' (angelegt)' : ''}` }),
      ...itemDelta(current, id, levels).map((d) => el('span', { class: 'adv-muted', text: deltaText(d) })),
      el('span', { class: 'adv-desc', text: `„${ITEMS[id].line}“` })));
    }
  });
}
