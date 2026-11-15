// Bilder des Abenteuers: Ausschnitte, Ausschneiden überlappender Stücke, Symbole der Gegenstände, Porträts und Ersatz
// ohne Bild.
import { test, assertEqual, assertTrue } from './runner.js';
import * as THREE from '../vendor/three.module.min.js';
import {
  SHEETS, SHEET_HOLES, SHEET_CUTS, CUT_LAYOUTS, CUT_SHEET_MAX_WIDTH, cutLayout, ADVENTURE_SHEETS, ADVENTURE_ENEMY_SPRITES,
  NPC_SPRITES, VILLAGE_SPRITES, NPC_PORTRAITS, ENEMY_SPRITES,
} from '../src/data/sprites.js';
import { ITEMS, ITEM_SHEETS, itemIconRect, itemSheet } from '../src/data/items.js';
import { MAPS } from '../src/data/maps/index.js';
import { MAP_LOOK } from '../src/data/adventure.js';
import { NPCS } from '../src/data/dialogues.js';
import { cutPieces, prepareSheet, loadImage, addSheet } from '../src/render/sprites.js';
import { loadTrailTiles } from '../src/render/environment.js';
import { createMapView } from '../src/render/mapView.js';
import { createAdventureRun } from '../src/modes/adventure.js';
import { npcPortrait } from '../src/ui/dialogue.js';
import { defaultSave, addHero } from '../src/save/store.js';
import { newAdventure } from '../src/save/adventure.js';

const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const insideBox = (r, W, H) => r.x >= 0 && r.y >= 0 && r.w > 0 && r.h > 0 && r.x + r.w <= W && r.y + r.h <= H;

test('abenteuer-bilder: Stücke liegen im gelieferten Bild, im ausgeschnittenen Bogen ohne Überlappung', () => {
  for (const [id, cut] of Object.entries(SHEET_CUTS)) {
    assertTrue(!!SHEETS[id], `${id} fehlt in SHEETS`);
    for (const [name, r] of Object.entries(cut.pieces)) assertTrue(insideBox(r, cut.width, cut.height), `${id}/${name}`);
    const layout = CUT_LAYOUTS[id];
    assertTrue(layout.width <= CUT_SHEET_MAX_WIDTH, `${id} zu breit`);
    const cells = Object.entries(layout.cells);
    assertEqual(cells.map(([n]) => n), Object.keys(cut.pieces));
    cells.forEach(([name, c], i) => {
      assertTrue(insideBox(c, layout.width, layout.height), `${id}/${name} im Bogen`);
      assertEqual([c.w, c.h], [cut.pieces[name].w, cut.pieces[name].h], `${id}/${name} gleich groß`);
      for (const [other, d] of cells.slice(i + 1)) assertTrue(!overlaps(c, d), `${id}: ${name} überlappt ${other}`);
    });
  }
  for (const [id, holes] of Object.entries(SHEET_HOLES)) {
    if (!SHEET_CUTS[id]) continue;
    for (const [x, y] of holes) assertTrue(x >= 0 && y >= 0 && x < SHEET_CUTS[id].width && y < SHEET_CUTS[id].height, `${id} ${x},${y}`);
  }
  assertEqual(ADVENTURE_SHEETS.filter((id) => !SHEETS[id]), []);
});

test('abenteuer-bilder: cutLayout füllt Reihe um Reihe bis zur Höchstbreite', () => {
  const l = cutLayout({ a: { w: 6, h: 3 }, b: { w: 5, h: 4 }, c: { w: 4, h: 2 } }, 12);
  assertEqual(l, { width: 11, height: 6, cells: { a: { x: 0, y: 0, w: 6, h: 3 }, b: { x: 6, y: 0, w: 5, h: 4 }, c: { x: 0, y: 4, w: 4, h: 2 } } });
});

test('abenteuer-bilder: Figuren, Leute und Dorfbilder zeigen auf ihre Zelle im ausgeschnittenen Bogen', () => {
  const check = (defs, sheet) => {
    for (const [name, d] of Object.entries(defs)) {
      if (defs === ADVENTURE_ENEMY_SPRITES && d.sheet !== sheet) {
        // Stellvertreter aus einem Bogen des Wellen-Modus: dasselbe Rechteck wie dort.
        const w = ENEMY_SPRITES[d.cell];
        assertEqual({ sheet: d.sheet, x: d.x, y: d.y, w: d.w, h: d.h }, { sheet: w.sheet, x: w.x, y: w.y, w: w.w, h: w.h }, name);
        continue;
      }
      assertEqual(d.sheet, sheet, name);
      assertEqual({ x: d.x, y: d.y, w: d.w, h: d.h }, CUT_LAYOUTS[sheet].cells[d.cell ?? name], name);
      assertTrue(d.heightM > 0 && d.footOffset >= 0 && d.footOffset < d.heightM, `${name} Maße`);
    }
  };
  check(ADVENTURE_ENEMY_SPRITES, 'kapitel1');
  check(NPC_SPRITES, 'bewohner');
  check(VILLAGE_SPRITES, 'dorf');
  // Jede Person und jede Art von Kleinkram auf den Karten hat ein Bild, jede Person ein Porträt. Neue Leute ohne Bild
  // (Kapitel 2, bis Bilder kommen) haben eine Farbe für die 3D-Figur; ihr Porträt ist der Kreis mit Buchstaben.
  for (const map of Object.values(MAPS)) {
    for (const n of map.npcs) {
      if (!NPC_SPRITES[n.id]) { assertTrue(!!MAP_LOOK.npcs[n.id], `Ersatzfarbe ${n.id}`); continue; }
      assertTrue(!!NPC_PORTRAITS.rects[n.id], `Porträt ${n.id}`);
    }
    for (const p of map.props) assertTrue(!!VILLAGE_SPRITES[p.kind], p.kind);
  }
  for (const r of Object.values(NPC_PORTRAITS.rects)) {
    assertTrue(insideBox(r, SHEET_CUTS.bewohner.width, SHEET_CUTS.bewohner.height), 'Porträt im Bild');
    assertEqual(r.w, r.h, 'quadratisch');
  }
  assertEqual(NPC_PORTRAITS.sheet, SHEETS.bewohner);
});

test('abenteuer-bilder: cutPieces gibt jedem Stück nur seine eigenen Pixel, auch wo sich die Rechtecke überschneiden', () => {
  // 12 × 6: Fläche A bei x 1–4 mit einem Zipfel bei x 5, Fläche B bei x 7–10; die Rechtecke überschneiden sich bei x 5–7.
  const W = 12, H = 6, data = new Uint8ClampedArray(W * H * 4);
  const put = (x, y, v) => data.set([v, v, v, 255], (y * W + x) * 4);
  for (let y = 1; y <= 4; y++) { for (let x = 1; x <= 4; x++) put(x, y, 10); for (let x = 7; x <= 10; x++) put(x, y, 200); }
  put(5, 1, 10);
  const pieces = { a: { x: 0, y: 0, w: 8, h: 6 }, b: { x: 5, y: 0, w: 7, h: 6 } };
  const layout = cutLayout(pieces);
  const out = cutPieces({ width: W, height: H, data }, pieces, layout);
  assertEqual([out.width, out.height], [15, 6]);
  const at = (x, y) => [out.data[(y * out.width + x) * 4], out.data[(y * out.width + x) * 4 + 3]];
  // Stück a: eigener Zipfel bei x 5 da, B bei x 7 fehlt.
  assertEqual(at(5, 1), [10, 255]);
  assertEqual(at(7, 2)[1], 0);
  // Stück b (ab x 8 im Bogen): A-Zipfel bei Quelle x 5 fehlt, eigene Fläche ab Quelle x 7 da.
  assertEqual(at(8, 1)[1], 0);
  assertEqual(at(10, 2), [200, 255]);
  // Berühren sich zwei Flächen (auch über Eck), sind sie eine; liegt sie in keinem Rechteck ganz, fällt sie weg.
  put(6, 1, 10);
  const merged = cutPieces({ width: W, height: H, data }, pieces, layout);
  assertTrue(merged.data.every((v, i) => i % 4 !== 3 || v === 0), 'verbundene Fläche in keinem Rechteck');
});

test('abenteuer-bilder: Symbole der Gegenstände liegen in ihrer Zelle, ohne Rasterlinien und ohne Überlappung', () => {
  const bySheet = {};
  for (const item of Object.values(ITEMS)) {
    const r = itemIconRect(item), sheet = ITEM_SHEETS[itemSheet(item)];
    assertTrue(insideBox(r, sheet.width, sheet.height), item.id);
    assertEqual(r.url, sheet.url);
    (bySheet[r.url] ??= []).push([item.id, r]);
  }
  for (const list of Object.values(bySheet)) {
    list.forEach(([id, r], i) => { for (const [other, q] of list.slice(i + 1)) assertTrue(!overlaps(r, q), `${id} überlappt ${other}`); });
  }
  // Rasterlinien von beute1.webp (ausgemessen) liegen außerhalb aller Symbole.
  const lineX = [255, 256, 511, 512, 767, 768, 1023, 1024, 1279, 1280], lineY = [212, 415, 416, 617, 812];
  for (const item of Object.values(ITEMS).filter((i) => itemSheet(i) === 'beute1')) {
    const r = itemIconRect(item);
    assertTrue(lineX.every((x) => x < r.x || x >= r.x + r.w) && lineY.every((y) => y < r.y || y >= r.y + r.h), item.id);
  }
  // Taverne: unverändert die vollen 256er-Zellen.
  assertEqual(itemIconRect(ITEMS.helm_zuversicht), { url: 'assets/taverne/beute.webp', width: 1536, height: 1024, x: 0, y: 0, w: 256, h: 256 });
});

test('abenteuer-bilder: Porträt ohne Bild oder ohne Ausschnitt ist der Kreis mit Buchstaben', () => {
  const none = npcPortrait('flossian', 'Flossian');
  assertEqual([none.textContent, none.classList.contains('dialogue-portrait-image')], ['F', false]);
  const known = npcPortrait('grabowski', NPCS.grabowski?.name ?? 'Grabowski');
  assertEqual(known.textContent.length, 1, 'bis das Bild da ist');
});

/** Bögen ohne Abenteuer-Bilder (wie wenn die Dateien fehlen) bzw. mit leeren Ersatz-Texturen in der richtigen Größe. */
function fakeSprites(withImages) {
  const s = { ok: true, textures: {}, sizes: {}, canvases: {} };
  if (withImages) {
    for (const id of ['bewohner', 'dorf']) {
      s.textures[id] = new THREE.DataTexture(new Uint8Array(4), 1, 1);
      s.sizes[id] = { width: CUT_LAYOUTS[id].width, height: CUT_LAYOUTS[id].height };
    }
  }
  return s;
}

/** Zählt Bildtafeln (Material mit Alpha-Schwelle) und gekachelte Flächen in der Kartengruppe. */
function countMapView(sprites, tiles) {
  const scene = new THREE.Scene();
  const save = defaultSave();
  const h = addHero(save, { name: 'Hoppel', animal: 'hase', class: 'krieger' }, { now: 1, id: 'h1' });
  h.adventure = newAdventure(h);
  h.adventure.mapId = 'kapitel1'; h.adventure.campfireId = 'k1_ufer'; h.adventure.introSeen = true;
  const run = createAdventureRun({ seed: 1, save, heroId: 'h1' });
  const map = run.map;
  const view = createMapView(scene, map, run.grid, { sprites, tiles, seed: 1 });
  view.update(run, 0, 0, 0.1);
  const root = scene.getObjectByName('map');
  let panels = 0, tiled = 0;
  root.traverse((o) => { if (o.isMesh && o.material.alphaTest > 0) panels++; if (o.isMesh && o.material.map?.wrapS === THREE.RepeatWrapping) tiled++; });
  view.dispose();
  return { panels, tiled };
}

test('abenteuer-bilder: Karte ohne Bilder zeigt 3D-Formen und Farbflächen, mit Bildern gemalte Tafeln und Kacheln', () => {
  const plain = countMapView(fakeSprites(false), { weg: null, wasser: null });
  assertEqual(plain, { panels: 0, tiled: 0 });
  const tex = () => { const t = new THREE.DataTexture(new Uint8Array(4), 1, 1); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  const painted = countMapView(fakeSprites(true), { weg: tex(), wasser: tex() });
  const m = MAPS.kapitel1;
  // Kleinkram, Person, je Lagerfeuer und Kiste zwei Tafeln, Nussverstecke, mindestens eine Barrikadentafel.
  const minimum = m.props.length + m.npcs.length + 2 * m.campfires.length + 2 * m.chests.length + m.spots.filter((s) => s.kind === 'nuss').length + 1;
  assertTrue(painted.panels >= minimum, `${painted.panels} Tafeln, erwartet mindestens ${minimum}`);
  assertEqual(painted.tiled, m.paths.length + m.water.length + m.bridges.length);
});

test('abenteuer-bilder: fehlende Kacheln und Bögen führen nicht zu Fehlern', async () => {
  const tiles = await loadTrailTiles({ load: () => Promise.reject(new Error('fehlt')) });
  assertEqual(tiles, { weg: null, wasser: null });
  const s = fakeSprites(false);
  for (const id of ADVENTURE_SHEETS) await addSheet(s, id, { load: () => Promise.reject(new Error('fehlt')) });
  assertEqual(Object.keys(s.textures), []);
});

test('abenteuer-bilder: in den echten Bildern liegt jedes Stück ganz in seinem Rechteck', async () => {
  for (const id of Object.keys(SHEET_CUTS)) {
    const sheet = prepareSheet(await loadImage(SHEETS[id]), SHEET_HOLES[id], undefined, { pieces: SHEET_CUTS[id].pieces, layout: CUT_LAYOUTS[id] });
    const { width: W, height: H } = sheet.size;
    const data = sheet.canvas.getContext('2d').getImageData(0, 0, W, H).data;
    sheet.texture.dispose();
    const alpha = (x, y) => data[(y * W + x) * 4 + 3];
    for (const [name, c] of Object.entries(CUT_LAYOUTS[id].cells)) {
      let filled = 0, edge = 0;
      for (let y = c.y; y < c.y + c.h; y++) {
        for (let x = c.x; x < c.x + c.w; x++) {
          if (!alpha(x, y)) continue;
          filled++;
          // Am Bildrand des gelieferten Bogens darf ein Stück anstoßen (Rand dort gekappt).
          const src = SHEET_CUTS[id].pieces[name];
          const atLeft = x === c.x && src.x > 0, atTop = y === c.y && src.y > 0;
          const atRight = x === c.x + c.w - 1 && src.x + src.w < SHEET_CUTS[id].width;
          const atBottom = y === c.y + c.h - 1 && src.y + src.h < SHEET_CUTS[id].height;
          if (atLeft || atTop || atRight || atBottom) edge++;
        }
      }
      assertTrue(filled > 0.05 * c.w * c.h, `${id}/${name} fast leer`);
      assertEqual(edge, 0, `${id}/${name} stößt an den Rand`);
    }
  }
});
