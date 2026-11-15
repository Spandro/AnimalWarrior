// Bilder des Abenteuers: Ausschnitte, Ausschneiden überlappender Stücke, Symbole der Gegenstände, Porträts und Ersatz
// ohne Bild.
import { test, assertEqual, assertTrue } from './runner.js';
import * as THREE from '../vendor/three.module.min.js';
import {
  SHEETS, SHEET_HOLES, SHEET_CUTS, CUT_LAYOUTS, CUT_SHEET_MAX_WIDTH, cutLayout, ADVENTURE_SHEETS, ADVENTURE_ENEMY_SPRITES,
  NPC_SPRITES, VILLAGE_SPRITES, NPC_PORTRAITS, ENEMY_SPRITES, CHAPTER_SHEETS, ADVENTURE_SPRITE_FALLBACK, SWAMP_SPRITES,
  PROP_SPRITES, MAP_SCENERY,
} from '../src/data/sprites.js';
import { TRAIL_TILES, CHAPTER_TILES } from '../src/data/environment.js';
import { borderScenery } from '../src/core/environment.js';
import { adventureSpriteDef } from '../src/render/enemies.js';
import { chaptersToLoad, loadChapterImages, chapterImagesDone } from '../src/render/chapterImages.js';
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
/** Größe der gelieferten Bilder, deren Figuren nicht ausgeschnitten werden (für Rechtecke direkt im Bild). */
const DELIVERED = { [SHEETS.bewohner]: [1536, 1024], [SHEETS.bewohner2]: [1254, 1254] };
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
  assertEqual([...ADVENTURE_SHEETS, ...Object.values(CHAPTER_SHEETS).flat()].filter((id) => !SHEETS[id]), []);
  for (const keys of Object.values(CHAPTER_TILES)) for (const k of keys) assertTrue(!!TRAIL_TILES[k] && TRAIL_TILES.tileM[k] > 0, k);
});

test('abenteuer-bilder: cutLayout füllt Reihe um Reihe bis zur Höchstbreite', () => {
  const l = cutLayout({ a: { w: 6, h: 3 }, b: { w: 5, h: 4 }, c: { w: 4, h: 2 } }, 12);
  assertEqual(l, { width: 11, height: 6, cells: { a: { x: 0, y: 0, w: 6, h: 3 }, b: { x: 6, y: 0, w: 5, h: 4 }, c: { x: 0, y: 4, w: 4, h: 2 } } });
});

test('abenteuer-bilder: Figuren, Leute und Kulissen zeigen auf ihre Zelle im ausgeschnittenen Bogen', () => {
  const check = (defs, sheets) => {
    for (const [name, d] of Object.entries(defs)) {
      assertTrue(sheets.includes(d.sheet), `${name}: Bogen ${d.sheet}`);
      assertTrue(d.heightM > 0 && d.footOffset >= 0 && d.footOffset < d.heightM, `${name} Maße`);
      if (!SHEET_CUTS[d.sheet]) {
        // Nicht ausgeschnitten (Frau Quappe): Rechteck direkt im gelieferten Bild.
        const [W, H] = DELIVERED[SHEETS[d.sheet]];
        assertTrue(insideBox(d, W, H), name);
        continue;
      }
      assertEqual({ x: d.x, y: d.y, w: d.w, h: d.h }, CUT_LAYOUTS[d.sheet].cells[d.cell ?? name], name);
    }
  };
  check(ADVENTURE_ENEMY_SPRITES, ['kapitel1', 'kapitel2']);
  check(NPC_SPRITES, ['bewohner', 'bewohner2']);
  check(VILLAGE_SPRITES, ['dorf']);
  check(SWAMP_SPRITES, ['sumpf']);
  // Jedes Stück aus kapitel2 und sumpf ist im Spiel.
  assertEqual(Object.keys(SHEET_CUTS.kapitel2.pieces).filter((k) => ADVENTURE_ENEMY_SPRITES[k]?.sheet !== 'kapitel2'), []);
  assertEqual(Object.keys(SHEET_CUTS.sumpf.pieces).filter((k) => !SWAMP_SPRITES[k]), []);
  // Stellvertreter für Kapitel 2 ohne kapitel2.webp: Stück aus kapitel1.webp oder dasselbe Rechteck wie im Wellen-Modus.
  for (const [name, d] of Object.entries(ADVENTURE_SPRITE_FALLBACK)) {
    assertEqual(ADVENTURE_ENEMY_SPRITES[name].sheet, 'kapitel2', name);
    const src = d.sheet === 'kapitel1' ? CUT_LAYOUTS.kapitel1.cells[d.cell] : ENEMY_SPRITES[d.cell];
    assertEqual({ x: d.x, y: d.y, w: d.w, h: d.h }, { x: src.x, y: src.y, w: src.w, h: src.h }, name);
  }
  // Jede Person und jede Art von Kleinkram auf den Karten hat ein Bild, eine Ersatzfarbe und ein Porträt.
  for (const map of Object.values(MAPS)) {
    for (const n of map.npcs) {
      assertTrue(!!NPC_SPRITES[n.id], `Bild ${n.id}`);
      assertTrue(!!MAP_LOOK.npcs[n.id], `Ersatzfarbe ${n.id}`);
      assertTrue(!!NPC_PORTRAITS.rects[n.id], `Porträt ${n.id}`);
    }
    for (const p of map.props) assertTrue(!!PROP_SPRITES[p.kind], p.kind);
  }
  for (const r of Object.values(NPC_PORTRAITS.rects)) {
    const [W, H] = DELIVERED[r.sheet ?? NPC_PORTRAITS.sheet];
    assertTrue(insideBox(r, W, H), 'Porträt im Bild');
    assertEqual(r.w, r.h, 'quadratisch');
  }
  assertEqual(NPC_PORTRAITS.sheet, SHEETS.bewohner);
  assertEqual(NPC_PORTRAITS.rects.quappe.sheet, SHEETS.bewohner2);
  // Kulissen am Rand: nur Bilder aus SWAMP_SPRITES, Anteil zwischen 0 und 1.
  for (const s of Object.values(MAP_SCENERY)) {
    assertTrue(s.share > 0 && s.share <= 1);
    for (const id of [...s.tree, ...s.rock]) assertTrue(!!SWAMP_SPRITES[id], id);
  }
});

test('abenteuer-bilder: Kulissen am Kartenrand sind fest nach der Position gewählt, etwa im eingestellten Anteil', () => {
  const s = MAP_SCENERY.kapitel2;
  let taken = 0;
  const seen = new Set();
  for (let i = 0; i < 2000; i++) {
    const d = { x: (i % 50) * 2.5 + 0.25, z: Math.floor(i / 50) * 2.5 - 40.75, kind: i % 4 ? 'tree' : 'rock' };
    const a = borderScenery(d, s), b = borderScenery({ ...d }, s);
    assertEqual(a, b, 'gleiche Stelle, gleiches Bild');
    if (!a) continue;
    taken++;
    seen.add(a.id);
    assertTrue(s[d.kind].includes(a.id), `${a.id} passt nicht zu ${d.kind}`);
  }
  assertTrue(Math.abs(taken / 2000 - s.share) < 0.05, `Anteil ${taken / 2000}`);
  assertEqual([...seen].sort(), [...new Set([...s.tree, ...s.rock])].sort());
  assertEqual(borderScenery({ x: 1, z: 1, kind: 'tree' }, { ...s, share: 0 }), null);
});

test('abenteuer-bilder: Kapitel-2-Gegner zeigen ihr Bild, ohne kapitel2.webp die Stellvertreter, ohne alles den Wellen-Modus', () => {
  const tex = { gegner: {}, gegner2: {}, bosse: {}, kapitel1: {}, kapitel2: {} };
  const only = (...ids) => ({ ok: true, textures: Object.fromEntries(ids.map((id) => [id, tex[id]])) });
  const all = only('gegner', 'gegner2', 'bosse', 'kapitel1', 'kapitel2');
  for (const type of Object.keys(ADVENTURE_SPRITE_FALLBACK)) assertEqual(adventureSpriteDef(all, type), ADVENTURE_ENEMY_SPRITES[type], type);
  const k1 = only('gegner', 'gegner2', 'bosse', 'kapitel1');
  for (const type of Object.keys(ADVENTURE_SPRITE_FALLBACK)) assertEqual(adventureSpriteDef(k1, type), ADVENTURE_SPRITE_FALLBACK[type], type);
  const wave = only('gegner', 'gegner2', 'bosse');
  assertEqual(adventureSpriteDef(wave, 'libelle'), ADVENTURE_SPRITE_FALLBACK.libelle, 'Krähe liegt im Wellen-Bogen');
  const quak = adventureSpriteDef(wave, 'hofmarschall_quak');
  assertEqual([quak.sheet, quak.x, quak.heightM], ['gegner', ENEMY_SPRITES.giftkroete.x, ADVENTURE_ENEMY_SPRITES.hofmarschall_quak.heightM]);
  assertEqual(adventureSpriteDef(wave, 'frosch').sheet, 'gegner', 'Kapitel 1 unverändert');
});

test('abenteuer-bilder: Kapitelbilder laden, wenn der Held das Kapitel betritt oder das davor abschließt', async () => {
  assertEqual(chaptersToLoad({ chapterDone: [] }, MAPS.dorf), []);
  assertEqual(chaptersToLoad({ chapterDone: [] }, MAPS.kapitel1), []);
  assertEqual(chaptersToLoad({ chapterDone: [1] }, MAPS.dorf), [2]);
  assertEqual(chaptersToLoad({ chapterDone: [] }, MAPS.kapitel2), [2]);
  assertEqual(chaptersToLoad({ chapterDone: [1, 2] }, MAPS.kapitel2), [2]);
  // Fehlen die Bilder, bleiben Bögen leer und Kacheln null; das Laden gilt trotzdem als erledigt und läuft nur einmal.
  const sprites = { ok: true, textures: {}, sizes: {}, canvases: {} }, tiles = { weg: null, wasser: null };
  let calls = 0;
  const load = () => { calls++; return Promise.reject(new Error('fehlt')); };
  assertEqual(chapterImagesDone(tiles, 2), false);
  await Promise.all([loadChapterImages(sprites, tiles, 2, { load }), loadChapterImages(sprites, tiles, 2, { load })]);
  assertEqual(calls, CHAPTER_SHEETS[2].length + CHAPTER_TILES[2].length);
  assertEqual(Object.keys(sprites.textures), []);
  assertEqual(tiles, { weg: null, wasser: null, schlamm: null, steg: null });
  assertEqual(chapterImagesDone(tiles, 2), true);
  await loadChapterImages(sprites, tiles, 2, { load });
  assertEqual(calls, CHAPTER_SHEETS[2].length + CHAPTER_TILES[2].length, 'kein zweites Mal');
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
    if (!itemSheet(item)) { assertEqual(itemIconRect(item), null, item.id); continue; } // noch ohne Bild (Kapitel 2)
    const r = itemIconRect(item), sheet = ITEM_SHEETS[itemSheet(item)];
    assertTrue(insideBox(r, sheet.width, sheet.height), item.id);
    assertEqual(r.url, sheet.url);
    (bySheet[r.url] ??= []).push([item.id, r]);
  }
  for (const list of Object.values(bySheet)) {
    list.forEach(([id, r], i) => { for (const [other, q] of list.slice(i + 1)) assertTrue(!overlaps(r, q), `${id} überlappt ${other}`); });
  }
  // Rasterlinien von beute1.webp und beute2.webp (ausgemessen) liegen außerhalb aller Symbole.
  const lines = {
    beute1: { x: [255, 256, 511, 512, 767, 768, 1023, 1024, 1279, 1280], y: [212, 415, 416, 617, 812] },
    beute2: { x: [383, 384, 767, 768, 1151, 1152], y: [511, 512] },
  };
  for (const [sheet, { x: lineX, y: lineY }] of Object.entries(lines)) {
    const items = Object.values(ITEMS).filter((i) => itemSheet(i) === sheet);
    assertTrue(items.length > 0, sheet);
    for (const item of items) {
      const r = itemIconRect(item);
      assertTrue(lineX.every((x) => x < r.x || x >= r.x + r.w) && lineY.every((y) => y < r.y || y >= r.y + r.h), item.id);
    }
  }
  // Kapitel 2: Zeile für Zeile, 4 je Zeile; Quaks Krone (icon 7) unten rechts.
  assertEqual(itemIconRect(ITEMS.quaks_krone), { url: 'assets/abenteuer/beute2.webp', width: 1536, height: 1024, x: 1154, y: 514, w: 380, h: 508 });
  // Taverne: unverändert die vollen 256er-Zellen.
  assertEqual(itemIconRect(ITEMS.helm_zuversicht), { url: 'assets/taverne/beute.webp', width: 1536, height: 1024, x: 0, y: 0, w: 256, h: 256 });
});

test('abenteuer-bilder: Porträt ohne Bild oder ohne Ausschnitt ist der Kreis mit Buchstaben', () => {
  const none = npcPortrait('flossian', 'Flossian');
  assertEqual([none.textContent, none.classList.contains('dialogue-portrait-image')], ['F', false]);
  const known = npcPortrait('grabowski', NPCS.grabowski?.name ?? 'Grabowski');
  assertEqual(known.textContent.length, 1, 'bis das Bild da ist');
  const quappe = npcPortrait('quappe', NPCS.quappe?.name ?? 'Frau Quappe');
  assertEqual(quappe.textContent.length, 1, 'Frau Quappe: Buchstabe, bis bewohner2.webp da ist');
});

/** Bögen ohne Abenteuer-Bilder (wie wenn die Dateien fehlen) bzw. mit leeren Ersatz-Texturen in der richtigen Größe. */
function fakeSprites(withImages) {
  const s = { ok: true, textures: {}, sizes: {}, canvases: {} };
  if (withImages) {
    for (const id of ['bewohner', 'dorf', 'bewohner2', 'sumpf']) {
      s.textures[id] = new THREE.DataTexture(new Uint8Array(4), 1, 1);
      const [w, h] = CUT_LAYOUTS[id] ? [CUT_LAYOUTS[id].width, CUT_LAYOUTS[id].height] : DELIVERED[SHEETS[id]];
      s.sizes[id] = { width: w, height: h };
    }
  }
  return s;
}

/** Gemalte Umgebung mit leeren Ersatz-Texturen (Boden, Bäume), damit die Geländeansicht Tafeln baut. */
function fakeEnv() {
  const t = () => new THREE.DataTexture(new Uint8Array(4), 1, 1);
  return { ok: true, ground: t(), objects: t(), sizes: { objekte: { width: 1254, height: 1254 }, boden: { width: 1, height: 1 } } };
}

/**
 * Zählt Bildtafeln (Material mit Alpha-Schwelle) und gekachelte Flächen in der Kartengruppe, dazu Tafeln je Bogen
 * (`bySheet`, in Karte und Gelände) und Flächen je Kachel (`byTile`).
 */
function countMapView(sprites, tiles, { mapId = 'kapitel1', campfire = 'k1_ufer', env, at = [0, 0] } = {}) {
  const scene = new THREE.Scene();
  const save = defaultSave();
  const h = addHero(save, { name: 'Hoppel', animal: 'hase', class: 'krieger' }, { now: 1, id: 'h1' });
  h.adventure = newAdventure(h);
  h.adventure.mapId = mapId; h.adventure.campfireId = campfire; h.adventure.introSeen = true;
  const run = createAdventureRun({ seed: 1, save, heroId: 'h1' });
  const map = run.map;
  const view = createMapView(scene, map, run.grid, { sprites, tiles, env, seed: 1 });
  view.update(run, at[0], at[1], 0.1);
  const root = scene.getObjectByName('map');
  let panels = 0, tiled = 0;
  const bySheet = {}, byTile = {};
  const sheetOf = (tex) => Object.keys(sprites.textures).find((k) => sprites.textures[k] === tex);
  const tileOf = (tex) => Object.keys(tiles).find((k) => tiles[k] && tiles[k] === tex);
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.material.alphaTest > 0) panels++;
    if (o.material.map?.wrapS === THREE.RepeatWrapping) tiled++;
    const k = tileOf(o.material.map);
    if (k) byTile[k] = (byTile[k] ?? 0) + 1;
  });
  scene.traverse((o) => {
    const k = o.isMesh && o.material.alphaTest > 0 ? sheetOf(o.material.map) : null;
    if (k) bySheet[k] = (bySheet[k] ?? 0) + 1;
  });
  view.dispose();
  return { panels, tiled, bySheet, byTile };
}

test('abenteuer-bilder: Karte ohne Bilder zeigt 3D-Formen und Farbflächen, mit Bildern gemalte Tafeln und Kacheln', () => {
  const plain = countMapView(fakeSprites(false), { weg: null, wasser: null });
  assertEqual([plain.panels, plain.tiled], [0, 0]);
  const tex = () => { const t = new THREE.DataTexture(new Uint8Array(4), 1, 1); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  const painted = countMapView(fakeSprites(true), { weg: tex(), wasser: tex() });
  const m = MAPS.kapitel1;
  // Kleinkram, Person, je Lagerfeuer und Kiste zwei Tafeln, Nussverstecke, mindestens eine Barrikadentafel.
  const minimum = m.props.length + m.npcs.length + 2 * m.campfires.length + 2 * m.chests.length + m.spots.filter((s) => s.kind === 'nuss').length + 1;
  assertTrue(painted.panels >= minimum, `${painted.panels} Tafeln, erwartet mindestens ${minimum}`);
  assertEqual(painted.tiled, m.paths.length + m.water.length + m.bridges.length);
});

test('abenteuer-bilder: Sumpf mit Bildern – Schlamm und Stege gekachelt, Frau Quappe, Krönungsschild, Kulissen am Rand', () => {
  const tex = () => { const t = new THREE.DataTexture(new Uint8Array(4), 1, 1); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  const m = MAPS.kapitel2;
  const opts = { mapId: 'kapitel2', campfire: 'k2_rand', at: [6, 3] };
  // Ohne Bilder: Farbflächen, gezeichnete Stege, 3D-Leute; ohne Sumpfbilder keine Kulissen im Gelände.
  const plain = countMapView(fakeSprites(false), { weg: null, wasser: null }, { ...opts, env: fakeEnv() });
  assertEqual([plain.panels, plain.tiled, plain.bySheet], [0, 0, {}]);
  // Nur Kapitel-1-Bilder (Sumpf noch nicht geladen): Stege mit gezeichneten Brettern, Schlamm als Fläche.
  const k1 = countMapView(fakeSprites(true), { weg: tex(), wasser: tex() }, opts);
  assertEqual(k1.tiled, m.paths.length + m.water.length + m.boardwalks.length);
  // Mit allen Bildern: Schlamm und Stege mit ihren Kacheln, Quappe und Schild gemalt, Kulissen im Gelände.
  const tiles = { weg: tex(), wasser: tex(), schlamm: tex(), steg: tex() };
  const full = countMapView(fakeSprites(true), tiles, { ...opts, env: fakeEnv() });
  assertEqual(full.byTile, { weg: m.paths.length, wasser: m.water.length, schlamm: m.mud.length, steg: m.boardwalks.length });
  assertEqual(full.tiled, m.paths.length + m.water.length + m.mud.length + m.boardwalks.length);
  assertEqual(full.bySheet.bewohner2, 1, 'Frau Quappe');
  assertTrue(full.bySheet.sumpf > 1, `Krönungsschild und Kulissen am Rand: ${full.bySheet.sumpf}`);
  // Im Dorf und in Kapitel 1 bleibt es bei Bäumen und Felsen.
  const village = countMapView(fakeSprites(true), tiles, { mapId: 'kapitel1', campfire: 'k1_ufer', env: fakeEnv() });
  assertEqual(village.bySheet.sumpf, undefined);
});

test('abenteuer-bilder: fehlende Kacheln und Bögen führen nicht zu Fehlern', async () => {
  const tiles = await loadTrailTiles({ load: () => Promise.reject(new Error('fehlt')) });
  assertEqual(tiles, { weg: null, wasser: null });
  const s = fakeSprites(false);
  for (const id of [...ADVENTURE_SHEETS, ...CHAPTER_SHEETS[2]]) await addSheet(s, id, { load: () => Promise.reject(new Error('fehlt')) });
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

test('abenteuer-bilder: echte Bilder von Kapitel 2 – Frau Quappe ganz im Rechteck, Kacheln und Gegenstände in Liefergröße', async () => {
  const sheet = prepareSheet(await loadImage(SHEETS.bewohner2), SHEET_HOLES.bewohner2);
  const { width: W, height: H } = sheet.size;
  assertEqual([W, H], DELIVERED[SHEETS.bewohner2]);
  const data = sheet.canvas.getContext('2d').getImageData(0, 0, W, H).data;
  sheet.texture.dispose();
  const r = NPC_SPRITES.quappe;
  let inside = 0, outside = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!data[(y * W + x) * 4 + 3]) continue;
      if (x > r.x && y > r.y && x < r.x + r.w - 1 && y < r.y + r.h - 1) inside++; else outside++;
    }
  }
  assertEqual(outside, 0, 'nichts außerhalb oder am Rand');
  assertTrue(inside > 0.3 * r.w * r.h, 'Figur da');
  for (const k of CHAPTER_TILES[2]) {
    const img = await loadImage(TRAIL_TILES[k]);
    assertEqual([img.naturalWidth, img.naturalHeight], [1254, 1254], k);
  }
  const loot = await loadImage(ITEM_SHEETS.beute2.url);
  assertEqual([loot.naturalWidth, loot.naturalHeight], [ITEM_SHEETS.beute2.width, ITEM_SHEETS.beute2.height]);
});
