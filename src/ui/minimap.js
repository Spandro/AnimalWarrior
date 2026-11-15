// Minikarte oben rechts und große Karte (Spec §6.4). Zeichnet auf ein Canvas: begehbare Fläche, Wasser, Rand,
// nicht Gesehenes verdeckt; Held als Pfeil, Lagerfeuer, Leute mit „!“/„?“, Bosse, Ziel des verfolgten Auftrags.
import { el } from './dom.js';
import { edgeArrow } from './minimapMath.js';
import { CELL } from '../core/mapGrid.js';
import { isExplored } from '../core/mapGrid.js';
import { npcState, questTarget, trackedQuest } from '../core/quests.js';
import { MAPS } from '../data/maps/index.js';
import { MINIMAP } from '../data/adventure.js';

const COLORS = Object.fromEntries(Object.entries(CELL).map(([name, value]) => [value, MINIMAP.colors[name]]));

/** Bild der ganzen Karte, ein Pixel je Rasterzelle. */
function baseImage(grid) {
  const c = document.createElement('canvas');
  c.width = grid.cols; c.height = grid.rows;
  const g = c.getContext('2d');
  const img = g.createImageData(grid.cols, grid.rows);
  const rgb = Object.fromEntries(Object.entries(COLORS).map(([k, hex]) => [k, [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))]));
  for (let i = 0; i < grid.cells.length; i++) {
    const [r, gr, b] = rgb[grid.cells[i]];
    img.data[i * 4] = r; img.data[i * 4 + 1] = gr; img.data[i * 4 + 2] = b; img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}

/**
 * Zeichnet einen Ausschnitt: Mitte (cx, cz), `scale` Pixel je Meter, Größe w × h.
 * @param {CanvasRenderingContext2D} g
 */
function draw(g, run, base, { cx, cz, scale, w, h }, { names = false } = {}) {
  const grid = run.grid, rec = run.record, map = run.map;
  const toX = (x) => (x - cx) * scale + w / 2, toY = (z) => (z - cz) * scale + h / 2;
  g.fillStyle = '#141a10';
  g.fillRect(0, 0, w, h);
  g.imageSmoothingEnabled = false;
  g.drawImage(base, toX(grid.minX), toY(grid.minZ), grid.cols * grid.cell * scale, grid.rows * grid.cell * scale);
  // Nebel über nicht Gesehenem, blockweise.
  const block = MINIMAP.block;
  g.fillStyle = '#141a10';
  const x0 = Math.floor((cx - w / 2 / scale - grid.minX) / block), x1 = Math.ceil((cx + w / 2 / scale - grid.minX) / block);
  const z0 = Math.floor((cz - h / 2 / scale - grid.minZ) / block), z1 = Math.ceil((cz + h / 2 / scale - grid.minZ) / block);
  for (let bz = z0; bz <= z1; bz++) for (let bx = x0; bx <= x1; bx++) {
    const wx = grid.minX + (bx + 0.5) * block, wz = grid.minZ + (bz + 0.5) * block;
    if (!isExplored(run.explored, grid, wx, wz)) g.fillRect(toX(wx - block / 2) - 0.5, toY(wz - block / 2) - 0.5, block * scale + 1, block * scale + 1);
  }
  const seen = (o) => isExplored(run.explored, grid, o.x, o.z);
  const dot = (o, color, r) => { g.fillStyle = color; g.beginPath(); g.arc(toX(o.x), toY(o.z), r, 0, Math.PI * 2); g.fill(); };
  for (const c of map.campfires) if (seen(c)) dot(c, rec.campfires.includes(c.id) ? '#ff9a3a' : '#8a7a6a', 3);
  g.font = 'bold 11px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (const n of map.npcs) {
    if (!seen(n)) continue;
    dot(n, '#e8dcc0', 3);
    const state = npcState(rec.quests, n.id);
    if (state !== 'none') { g.fillStyle = state === 'offer' ? '#ffd34d' : '#9fe07a'; g.fillText(state === 'offer' ? '!' : '?', toX(n.x), toY(n.z) - 8); }
  }
  for (const b of map.bosses) {
    if (!seen(b) || rec.bosses.includes(b.id)) continue;
    g.strokeStyle = '#e04a3a'; g.lineWidth = 2;
    const x = toX(b.x), y = toY(b.z);
    g.beginPath(); g.moveTo(x - 4, y - 4); g.lineTo(x + 4, y + 4); g.moveTo(x + 4, y - 4); g.lineTo(x - 4, y + 4); g.stroke();
  }
  if (names) {
    g.font = '12px sans-serif'; g.fillStyle = '#f0e6c8';
    for (const a of map.areas) if (seen(a)) g.fillText(a.name, toX(a.x), toY(a.z));
  }
  // Ziel des verfolgten Auftrags: Stern, außerhalb ein Pfeil am Rand.
  const quest = trackedQuest(rec.quests, rec.trackedQuest);
  const target = quest ? questTarget(rec.quests, quest, MAPS, rec.found) : null;
  const hero = run.world.hero;
  if (target && target.map === map.id) {
    const arrow = edgeArrow(cx, cz, target.x, target.z, Math.min(w, h) / 2 / scale - 4 / scale);
    g.fillStyle = '#ffd34d';
    if (!arrow) star(g, toX(target.x), toY(target.z), 6);
    else triangle(g, w / 2 + arrow.x * scale, h / 2 + arrow.y * scale, arrow.angle, 7);
  }
  g.fillStyle = '#ffffff';
  triangle(g, toX(hero.x), toY(hero.z), Math.atan2(hero.facing.z, hero.facing.x), 6);
}

function triangle(g, x, y, angle, r) {
  g.beginPath();
  g.moveTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r);
  g.lineTo(x + Math.cos(angle + 2.5) * r * 0.8, y + Math.sin(angle + 2.5) * r * 0.8);
  g.lineTo(x + Math.cos(angle - 2.5) * r * 0.8, y + Math.sin(angle - 2.5) * r * 0.8);
  g.closePath(); g.fill();
}

function star(g, x, y, r) {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath(); g.fill();
}

/**
 * @param {HTMLElement} container
 * @param {{ onOpen: () => void }} handlers
 */
export function createMinimap(container, { onOpen }) {
  const canvas = el('canvas', { class: 'minimap-canvas', width: MINIMAP.size, height: MINIMAP.size });
  const button = el('button', { class: 'minimap', type: 'button', 'data-ui-control': true, 'aria-label': 'Karte öffnen (M)', title: 'Karte (M)', onclick: () => onOpen() }, canvas);
  container.append(button);
  const g = canvas.getContext('2d');
  let base = null, baseMap = null;
  return {
    root: button,
    /** @param {import('../modes/adventure.js').AdventureRun} run */
    update(run) {
      if (baseMap !== run.map.id) { base = baseImage(run.grid); baseMap = run.map.id; }
      const h = run.world.hero;
      draw(g, run, base, { cx: h.x, cz: h.z, scale: MINIMAP.size / (MINIMAP.radius * 2), w: MINIMAP.size, h: MINIMAP.size });
    },
    /** Große Karte in ein Canvas (ganze Karte eingepasst). */
    drawBig(canvas2, run) {
      if (baseMap !== run.map.id) { base = baseImage(run.grid); baseMap = run.map.id; }
      const grid = run.grid, w = canvas2.width, hh = canvas2.height;
      const scale = Math.min(w / (grid.cols * grid.cell), hh / (grid.rows * grid.cell)) * 0.95;
      draw(canvas2.getContext('2d'), run, base, {
        cx: grid.minX + (grid.cols * grid.cell) / 2, cz: grid.minZ + (grid.rows * grid.cell) / 2, scale, w, h: hh,
      }, { names: true });
    },
    dispose() { button.remove(); },
  };
}
