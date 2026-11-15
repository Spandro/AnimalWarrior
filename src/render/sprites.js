// Gemalte Figuren: Bildbögen laden, weißen Hintergrund entfernen, Texturen anlegen, Bewegung berechnen.
import * as THREE from '../../vendor/three.module.min.js';
import {
  SHEETS, SHEET_HOLES, SHEET_FRAMES, SHEET_CUTS, CUT_LAYOUTS, HERO_SPRITES, ENEMY_SPRITES, BACKGROUND, BILLBOARD, MOTION, IDLE, ATTACK, MOTION_FULL_SPEED,
  HOP_BACK_LEAN, DUO_FRAMES,
} from '../data/sprites.js';
import { animalUnlocked } from '../core/roster.js';

/**
 * @typedef {{ width: number, height: number, data: Uint8ClampedArray|Uint8Array }} ImageDataLike
 * @typedef {{ ok: boolean, textures: Record<string, THREE.Texture>, sizes: Record<string, { width: number, height: number }>,
 *   canvases: Record<string, HTMLCanvasElement> }} SpriteSheets
 */

/**
 * Entfernt den weißen Hintergrund eines Bildbogens. Füllt vom Bildrand aus über alle zusammenhängenden
 * Pixel, deren Farbabstand zu Weiß unter `threshold` liegt, und macht sie durchsichtig. Die Pixel am Rand
 * der Füllung (bis zu `BACKGROUND.featherRings` Pixel tief, Abstand unter `threshold + feather`) bekommen
 * eine Teildeckkraft proportional zu ihrem Abstand von Weiß; ihr Weißanteil wird herausgerechnet, damit
 * kein heller Saum bleibt. Nicht mit dem Rand verbundene Pixel bleiben unberührt (weiße Entenkörper), außer
 * die Füllung beginnt zusätzlich an einem der `seeds` (eingeschlossenes Papierweiß, `SHEET_HOLES`).
 * Ändert `img.data` und gibt `img` zurück. Ohne DOM, daher testbar.
 * @param {ImageDataLike} img
 * @param {{ threshold: number, feather: number }} options Abstände im RGB-Raum (0…441)
 * @param {Array<[number, number]>} [seeds] weitere Startpunkte (x, y) der Füllung
 * @returns {ImageDataLike}
 */
export function removeBackground(img, { threshold, feather }, seeds = []) {
  const { width: W, height: H, data } = img;
  const n = W * H;
  const dist = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = 255 - data[i * 4], g = 255 - data[i * 4 + 1], b = 255 - data[i * 4 + 2];
    dist[i] = Math.sqrt(r * r + g * g + b * b);
  }
  // 0 = unberührt, 1 = entfernt, 2 = Saum
  const state = new Uint8Array(n);
  const stack = new Int32Array(n);
  let sp = 0;
  const seed = (i) => { if (state[i] === 0 && dist[i] < threshold) { state[i] = 1; stack[sp++] = i; } };
  for (let x = 0; x < W; x++) { seed(x); seed((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { seed(y * W); seed(y * W + W - 1); }
  for (const [x, y] of seeds) if (x >= 0 && x < W && y >= 0 && y < H) seed(y * W + x);
  while (sp > 0) {
    const i = stack[--sp];
    const x = i % W;
    if (x > 0) seed(i - 1);
    if (x < W - 1) seed(i + 1);
    if (i >= W) seed(i - W);
    if (i < n - W) seed(i + W);
  }
  for (let i = 0; i < n; i++) if (state[i] === 1) data[i * 4 + 3] = 0;

  // Saum: Ring um Ring von der Füllung nach innen, nur über helle Pixel.
  const limit = threshold + feather;
  let frontier = [];
  for (let i = 0; i < n; i++) if (state[i] === 1) frontier.push(i);
  for (let ring = 0; ring < BACKGROUND.featherRings && frontier.length; ring++) {
    const next = [];
    const visit = (j) => {
      if (state[j] !== 0 || dist[j] >= limit) return;
      state[j] = 2;
      next.push(j);
      const a = Math.min(1, Math.max(0, (dist[j] - threshold) / feather));
      const o = j * 4;
      data[o + 3] = Math.round(data[o + 3] * a);
      if (a > 0) {
        for (let c = 0; c < 3; c++) data[o + c] = Math.max(0, Math.min(255, Math.round((data[o + c] - 255 * (1 - a)) / a)));
      }
    };
    for (const i of frontier) {
      const x = i % W;
      if (x > 0) visit(i - 1);
      if (x < W - 1) visit(i + 1);
      if (i >= W) visit(i - W);
      if (i < n - W) visit(i + W);
    }
    frontier = next;
  }
  return img;
}

/**
 * Entfernt kleine, freistehende Flecken (Papierstaub, Kompressionsreste), die nach der Hintergrund-
 * entfernung als Punkte neben den Figuren stünden: zusammenhängende sichtbare Flächen unter `minSize` Pixeln.
 * @param {ImageDataLike} img
 * @param {number} minSize
 */
function removeSpecks(img, minSize) {
  const { width: W, height: H, data } = img;
  const n = W * H;
  const seen = new Uint8Array(n);
  const stack = new Int32Array(n);
  const part = new Int32Array(minSize);
  for (let s = 0; s < n; s++) {
    if (seen[s] || data[s * 4 + 3] === 0) continue;
    let sp = 0, count = 0;
    stack[sp++] = s; seen[s] = 1;
    while (sp > 0) {
      const i = stack[--sp];
      if (count < minSize) part[count] = i;
      count++;
      const x = i % W;
      if (x > 0 && !seen[i - 1] && data[(i - 1) * 4 + 3]) { seen[i - 1] = 1; stack[sp++] = i - 1; }
      if (x < W - 1 && !seen[i + 1] && data[(i + 1) * 4 + 3]) { seen[i + 1] = 1; stack[sp++] = i + 1; }
      if (i >= W && !seen[i - W] && data[(i - W) * 4 + 3]) { seen[i - W] = 1; stack[sp++] = i - W; }
      if (i < n - W && !seen[i + W] && data[(i + W) * 4 + 3]) { seen[i + W] = 1; stack[sp++] = i + W; }
    }
    if (count < minSize) for (let k = 0; k < count; k++) data[part[k] * 4 + 3] = 0;
  }
}

/**
 * Gibt durchsichtigen Pixeln nahe der Figur die Farbe ihrer deckenden Nachbarn, damit die Mipmaps an den
 * Rändern nicht ins Weiße (oder Schwarze) laufen. Deckkraft bleibt unverändert.
 * @param {ImageDataLike} img
 * @param {number} rings
 */
function bleedColors(img, rings) {
  const { width: W, height: H, data } = img;
  const n = W * H;
  const done = new Uint8Array(n);
  let frontier = [];
  for (let i = 0; i < n; i++) if (data[i * 4 + 3] > 0) done[i] = 1;
  for (let i = 0; i < n; i++) {
    if (done[i]) continue;
    const x = i % W;
    if ((x > 0 && done[i - 1] === 1) || (x < W - 1 && done[i + 1] === 1) || (i >= W && done[i - W] === 1) || (i < n - W && done[i + W] === 1)) frontier.push(i);
  }
  for (let ring = 0; ring < rings && frontier.length; ring++) {
    for (const i of frontier) {
      let r = 0, g = 0, b = 0, k = 0;
      const x = i % W;
      const take = (j) => { if (done[j]) { r += data[j * 4]; g += data[j * 4 + 1]; b += data[j * 4 + 2]; k++; } };
      if (x > 0) take(i - 1);
      if (x < W - 1) take(i + 1);
      if (i >= W) take(i - W);
      if (i < n - W) take(i + W);
      if (k) { data[i * 4] = r / k; data[i * 4 + 1] = g / k; data[i * 4 + 2] = b / k; }
    }
    for (const i of frontier) done[i] = 2;
    const next = [];
    for (const i of frontier) {
      const x = i % W;
      const add = (j) => { if (!done[j]) { done[j] = 3; next.push(j); } };
      if (x > 0) add(i - 1);
      if (x < W - 1) add(i + 1);
      if (i >= W) add(i - W);
      if (i < n - W) add(i + W);
    }
    for (const j of next) done[j] = 0;
    frontier = next;
  }
}

/**
 * Schneidet die Phasen eines Bogens mit Bildfolge aus und legt sie nebeneinander in einen neuen Bogen (Phase k bei
 * x = k · w, y = 0). Jede Phase bekommt nur ihre eigenen Pixel: Jede zusammenhängende sichtbare Fläche (Deckkraft > 0,
 * Nachbarn auch über Eck) gehört der Phase, deren Ausschnittsmitte der Mitte ihres Umrisses am nächsten liegt; was aus
 * einer Nachbarphase in einen Ausschnitt ragt, bleibt dort durchsichtig. Außerhalb des Bildes ist es durchsichtig.
 * Erwartet ein Bild nach {@link removeBackground}. Ohne DOM, daher testbar.
 * @param {ImageDataLike} img
 * @param {{ x: number[], y: number, w: number, h: number }} layout siehe `SHEET_FRAMES`
 * @returns {{ width: number, height: number, data: Uint8ClampedArray }}
 */
export function cutFrames(img, { x: lefts, y: top, w, h }) {
  const { width: W, height: H, data } = img;
  const n = W * H;
  // Flächen markieren (1, 2, …) und je Fläche die Phase bestimmen.
  const label = new Int32Array(n);
  const stack = new Int32Array(n);
  /** @type {number[]} Phase je Fläche, Index = Marke */
  const frameOf = [-1];
  const centers = lefts.map((x) => x + w / 2);
  for (let s = 0; s < n; s++) {
    if (label[s] || data[s * 4 + 3] === 0) continue;
    const id = frameOf.length;
    let sp = 0, minX = W, maxX = -1;
    stack[sp++] = s; label[s] = id;
    while (sp > 0) {
      const i = stack[--sp];
      const x = i % W, y = (i - x) / W;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= W) continue;
          const j = yy * W + xx;
          if (!label[j] && data[j * 4 + 3]) { label[j] = id; stack[sp++] = j; }
        }
      }
    }
    const mid = (minX + maxX) / 2;
    let best = 0;
    for (let k = 1; k < centers.length; k++) if (Math.abs(centers[k] - mid) < Math.abs(centers[best] - mid)) best = k;
    frameOf.push(best);
  }
  const outW = w * lefts.length;
  const out = new Uint8ClampedArray(outW * h * 4);
  lefts.forEach((left, k) => {
    for (let y = 0; y < h; y++) {
      const sy = top + y;
      if (sy < 0 || sy >= H) continue;
      for (let x = 0; x < w; x++) {
        const sx = left + x;
        if (sx < 0 || sx >= W) continue;
        const i = sy * W + sx;
        if (!label[i] || frameOf[label[i]] !== k) continue;
        out.set(data.subarray(i * 4, i * 4 + 4), (y * outW + k * w + x) * 4);
      }
    }
  });
  return { width: outW, height: h, data: out };
}

/**
 * Schneidet die Stücke eines Bogens einzeln aus und legt sie in einen neuen Bogen (`layout`, siehe `cutLayout` in
 * `src/data/sprites.js`). Jedes Stück bekommt nur seine eigenen Pixel, auch wo sich die Rechtecke im gelieferten Bild
 * überschneiden: Jede zusammenhängende sichtbare Fläche (Deckkraft > 0, Nachbarn auch über Eck) gehört dem Stück, dessen
 * Rechteck sie ganz enthält. Enthalten sie mehrere (kleine Flächen im Überschneidungsbereich), gehört sie dem Stück, dessen
 * größte eigene Fläche ihr am nächsten liegt. Flächen, die in keinem Rechteck ganz liegen, fallen weg.
 * Erwartet ein Bild nach {@link removeBackground}. Ohne DOM, daher testbar.
 * @param {ImageDataLike} img
 * @param {Record<string, { x: number, y: number, w: number, h: number }>} pieces Rechtecke im gelieferten Bild
 * @param {{ width: number, height: number, cells: Record<string, { x: number, y: number, w: number, h: number }> }} layout
 * @returns {{ width: number, height: number, data: Uint8ClampedArray }}
 */
export function cutPieces(img, pieces, layout) {
  const { width: W, height: H, data } = img;
  const n = W * H;
  const names = Object.keys(pieces);
  const rects = names.map((k) => pieces[k]);
  const label = new Int32Array(n);
  const stack = new Int32Array(n);
  /** @type {Array<{ x0: number, y0: number, x1: number, y1: number, count: number }>} Umriss je Fläche, Index = Marke − 1 */
  const boxes = [];
  for (let s = 0; s < n; s++) {
    if (label[s] || data[s * 4 + 3] === 0) continue;
    const id = boxes.length + 1;
    const box = { x0: W, y0: H, x1: -1, y1: -1, count: 0 };
    let sp = 0;
    stack[sp++] = s; label[s] = id;
    while (sp > 0) {
      const i = stack[--sp];
      const x = i % W, y = (i - x) / W;
      box.count++;
      if (x < box.x0) box.x0 = x;
      if (x > box.x1) box.x1 = x;
      if (y < box.y0) box.y0 = y;
      if (y > box.y1) box.y1 = y;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= H) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= W) continue;
          const j = yy * W + xx;
          if (!label[j] && data[j * 4 + 3]) { label[j] = id; stack[sp++] = j; }
        }
      }
    }
    boxes.push(box);
  }
  const inside = (b, r) => b.x0 >= r.x && b.y0 >= r.y && b.x1 < r.x + r.w && b.y1 < r.y + r.h;
  const gap = (a, b) => Math.hypot(Math.max(0, a.x0 - b.x1, b.x0 - a.x1), Math.max(0, a.y0 - b.y1, b.y0 - a.y1));
  // Größte eigene Fläche je Stück.
  const main = rects.map((r) => {
    let best = null;
    for (const b of boxes) if (inside(b, r) && (!best || b.count > best.count)) best = b;
    return best;
  });
  const owner = new Int32Array(boxes.length + 1).fill(-1);
  boxes.forEach((b, k) => {
    const candidates = [];
    rects.forEach((r, p) => { if (inside(b, r)) candidates.push(p); });
    if (candidates.length === 0) return;
    let pick = candidates[0];
    for (const p of candidates) {
      if (main[p] === b) { pick = p; break; }
      const d = main[p] ? gap(b, main[p]) : Infinity, dPick = main[pick] ? gap(b, main[pick]) : Infinity;
      if (d < dPick) pick = p;
    }
    owner[k + 1] = pick;
  });
  const out = new Uint8ClampedArray(layout.width * layout.height * 4);
  names.forEach((name, p) => {
    const r = rects[p], cell = layout.cells[name];
    for (let y = 0; y < r.h; y++) {
      const sy = r.y + y;
      if (sy < 0 || sy >= H || y >= cell.h) continue;
      for (let x = 0; x < r.w; x++) {
        const sx = r.x + x;
        if (sx < 0 || sx >= W || x >= cell.w) continue;
        const i = sy * W + sx;
        if (owner[label[i]] !== p) continue;
        out.set(data.subarray(i * 4, i * 4 + 4), ((cell.y + y) * layout.width + cell.x + x) * 4);
      }
    }
  });
  return { width: layout.width, height: layout.height, data: out };
}

/** @param {string} url @returns {Promise<HTMLImageElement>} */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Bild nicht geladen: ' + url));
    img.src = url;
  });
}

/**
 * Pixel eines geladenen Bildes samt Canvas, auf dem es liegt.
 * @param {HTMLImageElement} image
 * @returns {ImageDataLike & { canvas: HTMLCanvasElement }}
 */
export function imageDataOf(image) {
  const W = image.naturalWidth, H = image.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const data = ctx.getImageData(0, 0, W, H);
  return Object.assign(data, { canvas });
}

/**
 * Textur aus Rohpixeln (sRGB, Mipmaps, linear gefiltert). DataTexture statt CanvasTexture: ein Canvas
 * speichert vormultipliert und verliert dabei die Farben durchsichtiger Pixel, was in den Mipmaps einen
 * dunklen Saum ergäbe. Die Zeilen werden umgedreht, denn v = 0 ist unten (wie bei Bildtexturen mit flipY).
 * @param {ImageDataLike} img
 * @returns {THREE.DataTexture}
 */
export function dataTexture(img) {
  const { width: W, height: H } = img;
  const flipped = new Uint8Array(W * H * 4);
  const row = W * 4;
  for (let y = 0; y < H; y++) flipped.set(img.data.subarray(y * row, (y + 1) * row), (H - 1 - y) * row);
  const tex = new THREE.DataTexture(flipped, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Pixel auf ein (neues) Canvas legen.
 * @param {{ width: number, height: number, data: Uint8ClampedArray }} img
 * @returns {HTMLCanvasElement}
 */
function canvasOf(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width; canvas.height = img.height;
  canvas.getContext('2d').putImageData(new ImageData(img.data, img.width, img.height), 0, 0);
  return canvas;
}

/**
 * Ein Bildbogen: Hintergrund entfernen, Flecken tilgen, bei einer Bildfolge die Phasen ausschneiden
 * ({@link cutFrames}), Farben auffüllen, Textur und Canvas anlegen.
 * @param {HTMLImageElement} image
 * @param {Array<[number, number]>} [holes] Startpunkte für eingeschlossenes Papierweiß
 * @param {{ x: number[], y: number, w: number, h: number }} [frames] Phasen einer Bildfolge (`SHEET_FRAMES`)
 * @param {{ pieces: Record<string, { x: number, y: number, w: number, h: number }>, layout: ReturnType<typeof import('../data/sprites.js').cutLayout> }} [cut]
 *   einzeln ausgeschnittene Stücke ({@link cutPieces}, `SHEET_CUTS`)
 * @returns {{ texture: THREE.DataTexture, canvas: HTMLCanvasElement, size: { width: number, height: number } }}
 */
export function prepareSheet(image, holes = [], frames, cut) {
  let imageData = imageDataOf(image);
  removeBackground(imageData, BACKGROUND, holes);
  removeSpecks(imageData, BACKGROUND.minSpeck);
  if (frames) imageData = cutFrames(imageData, frames);
  if (cut) imageData = cutPieces(imageData, cut.pieces, cut.layout);
  bleedColors(imageData, BACKGROUND.bleed);
  return { texture: dataTexture(imageData), canvas: canvasOf(imageData), size: { width: imageData.width, height: imageData.height } };
}

/**
 * Ein Rechteck eines Canvas als eigenes, kleines Canvas (kopiert nur dieses Rechteck), etwa das Standbild des Duos
 * aus dem schon aufbereiteten Bogen für den Stall.
 * @param {HTMLCanvasElement} source
 * @param {{ x: number, y: number, w: number, h: number }} rect
 * @returns {HTMLCanvasElement}
 */
export function cropCanvas(source, { x, y, w, h }) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(source, x, y, w, h, 0, 0, w, h);
  return canvas;
}

/**
 * Bildbögen, die ein Eintrag in `HERO_SPRITES` oder `ENEMY_SPRITES` nutzt (nur diese werden geladen).
 * @returns {string[]}
 */
export function usedSheets() {
  return [...new Set([...Object.values(HERO_SPRITES), ...Object.values(ENEMY_SPRITES)].map((s) => s.sheet))];
}

/**
 * Bögen, die nur Helden eines Tiers nutzen, das der Spielstand weder freigeschaltet noch als Held hat (das Duo vor
 * dem Freischalten). Sie werden beim Start übersprungen und erst bei Bedarf nachgeladen ({@link addSheet}).
 * @param {{ unlocks: string[], heroes: { animal: string }[] }} save
 * @returns {string[]}
 */
export function deferredSheets(save) {
  const needed = new Set(Object.values(ENEMY_SPRITES).map((s) => s.sheet));
  for (const [key, def] of Object.entries(HERO_SPRITES)) {
    const animal = key.slice(0, key.indexOf('-'));
    if (animalUnlocked(save, animal) || save.heroes.some((h) => h.animal === animal)) needed.add(def.sheet);
  }
  return usedSheets().filter((id) => !needed.has(id));
}

/**
 * Bildausschnitt eines Helden, wenn es einen Eintrag gibt und sein Bogen geladen ist; sonst `null` (dann zeigt
 * man die 3D-Ersatzfigur). So führt ein fehlender Eintrag oder ein fehlendes Bild (etwa das Duo) nie zu einem Fehler.
 * @param {SpriteSheets|null|undefined} sprites
 * @param {string} animalId
 * @param {string} classId
 * @returns {import('../data/sprites.js').SpriteDef|null}
 */
export function heroSpriteDef(sprites, animalId, classId) {
  const def = HERO_SPRITES[`${animalId}-${classId}`];
  return sprites?.ok && def && sprites.textures?.[def.sheet] ? def : null;
}

/**
 * @typedef {{ load?: (url: string) => Promise<HTMLImageElement>, prepare?: typeof prepareSheet }} SheetSource
 * Woher Bilder kommen und wie sie aufbereitet werden (in Tests ersetzbar).
 */

/** Bereitet einen geladenen Bogen auf und trägt ihn in `result` ein. */
function storeSheet(result, id, image, prepare) {
  const cut = SHEET_CUTS[id] ? { pieces: SHEET_CUTS[id].pieces, layout: CUT_LAYOUTS[id] } : undefined;
  const sheet = prepare(image, SHEET_HOLES[id] || [], SHEET_FRAMES[id], cut);
  result.textures[id] = sheet.texture;
  result.sizes[id] = sheet.size;
  result.canvases[id] = sheet.canvas;
}

/**
 * Lädt die genutzten Bildbögen, entfernt den Hintergrund und legt je Bogen eine Textur und ein 2D-Canvas
 * (für die Menüvorschau) an. Wirft nie: scheitert ein Bogen der Gegner, `ok: false` (alles in 3D); scheitert einer,
 * den nur Helden nutzen (Laden oder Aufbereiten), zeigen nur diese Helden ihre 3D-Ersatzfigur ({@link heroSpriteDef}).
 * @param {SheetSource & { skip?: string[] }} [options] `skip`: Bögen, die erst später nachgeladen werden ({@link deferredSheets})
 * @returns {Promise<SpriteSheets>}
 */
export async function loadSpriteSheets({ load = loadImage, prepare = prepareSheet, skip = [] } = {}) {
  const result = { ok: false, textures: {}, sizes: {}, canvases: {} };
  try {
    const ids = usedSheets().filter((id) => !skip.includes(id));
    const required = new Set(Object.values(ENEMY_SPRITES).map((s) => s.sheet));
    const images = await Promise.allSettled(ids.map((id) => load(SHEETS[id])));
    ids.forEach((id, k) => {
      try {
        const loaded = images[k];
        if (loaded.status === 'rejected') throw loaded.reason;
        storeSheet(result, id, loaded.value, prepare);
      } catch (e) {
        if (required.has(id)) throw e;
        console.warn(`Figurenbild ${SHEETS[id]} nicht verfügbar, zeige dafür 3D-Figuren.`, e);
      }
    });
    result.ok = true;
  } catch (e) {
    console.warn('Figurenbilder nicht verfügbar, zeige 3D-Figuren.', e);
    for (const t of Object.values(result.textures)) t.dispose();
    result.textures = {}; result.sizes = {}; result.canvases = {};
  }
  return result;
}

/** Laufendes oder fertiges Nachladen je Bögen-Objekt und Bogen, damit jeder Bogen nur einmal geholt wird. */
const pendingSheets = new WeakMap();

/**
 * Lädt einen beim Start übersprungenen Bogen nach und trägt ihn in dieselben `sprites` ein. Wirft nie: fehlt das
 * Bild oder scheitert das Aufbereiten, bleibt es bei der Ersatzfigur. Ohne geladene Bögen (`ok: false`) geschieht
 * nichts, dann zeigt ohnehin alles 3D-Figuren.
 * @param {SpriteSheets} sprites
 * @param {string} id
 * @param {SheetSource} [source]
 * @returns {Promise<SpriteSheets>} dieselben `sprites`
 */
export function addSheet(sprites, id, { load = loadImage, prepare = prepareSheet } = {}) {
  if (!sprites.ok || sprites.textures[id]) return Promise.resolve(sprites);
  let pending = pendingSheets.get(sprites);
  if (!pending) { pending = new Map(); pendingSheets.set(sprites, pending); }
  if (!pending.has(id)) {
    pending.set(id, load(SHEETS[id]).then((image) => storeSheet(sprites, id, image, prepare)).catch((e) => {
      console.warn(`Figurenbild ${SHEETS[id]} nicht verfügbar, zeige dafür 3D-Figuren.`, e);
    }).then(() => sprites));
  }
  return pending.get(id);
}

/**
 * UV-Rechteck einer Figur im Bogen; v ist für den Texturraum gespiegelt (v = 0 unten).
 * @param {{ x: number, y: number, w: number, h: number }} sprite Pixelrechteck, y von oben
 * @param {{ width: number, height: number }} sheetSize
 */
export function spriteUv(sprite, sheetSize) {
  return {
    u0: sprite.x / sheetSize.width,
    v0: 1 - (sprite.y + sprite.h) / sheetSize.height,
    u1: (sprite.x + sprite.w) / sheetSize.width,
    v1: 1 - sprite.y / sheetSize.height,
  };
}

// ---------------------------------------------------------------- Bildtafeln in der Welt

/**
 * Drehung aller Bildtafeln: zur Kamera gewandt (nur um die Hochachse) und um `BILLBOARD.tiltDeg` nach
 * hinten geneigt, damit die Bilder unter dem steilen Kamerawinkel nicht gestaucht wirken. Die Kamera dreht
 * sich im Spiel nie, daher genügt es, dies einmal zu berechnen. Alle Tafeln liegen so in parallelen
 * Ebenen und schneiden einander nie.
 * `foot`: Verschiebung am Boden (zur Kamera hin) je Meter Fußhöhe im Bild. Damit landet der Standpunkt einer
 * Figur, der `footOffset` Meter über der Bildunterkante liegt, auf dem Bildschirm genau über ihrer Bodenposition,
 * ohne dass die Tafel in den Boden sinkt (dort würde der Boden die Füße verdecken).
 * @param {THREE.Camera} [camera] ohne Kamera: Blick entlang -z, senkrecht auf die Tafeln
 * @returns {{ quaternion: THREE.Quaternion, right: THREE.Vector3, foot: THREE.Vector3 }} right: Bildschirm-rechts auf dem Boden
 */
export function billboardOrientation(camera) {
  const tilt = THREE.MathUtils.degToRad(BILLBOARD.tiltDeg);
  let yaw = 0, elevation = Math.PI / 2 - tilt;
  if (camera) {
    const dir = camera.getWorldDirection(new THREE.Vector3());
    const flat = Math.hypot(dir.x, dir.z);
    if (flat > 1e-6) yaw = Math.atan2(-dir.x, -dir.z);
    elevation = Math.atan2(-dir.y, flat);
  }
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(-tilt, yaw, 0, 'YXZ'));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  // Standpunkt auf den Sehstrahl durch die Bodenposition legen, Unterkante bleibt auf y = 0.
  const k = elevation > 1e-3 ? Math.cos(tilt) / Math.tan(elevation) + Math.sin(tilt) : 0;
  const foot = new THREE.Vector3(Math.sin(yaw) * k, 0, Math.cos(yaw) * k);
  return { quaternion, right, foot };
}

/**
 * Einheitsquadrat (1 × 1) mit Drehpunkt an der Unterkante Mitte und dem UV-Rechteck der Figur.
 * @param {import('../data/sprites.js').SpriteDef} sprite
 * @param {{ width: number, height: number }} sheetSize
 */
export function spriteGeometry(sprite, sheetSize) {
  const g = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
  const { u0, v0, u1, v1 } = spriteUv(sprite, sheetSize);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) < 0.5 ? u0 : u1, uv.getY(i) < 0.5 ? v0 : v1);
  }
  return g;
}

/** Breite einer Figur in Weltmetern aus Bildseitenverhältnis und Höhe. */
export const spriteWidth = (sprite) => sprite.heightM * sprite.w / sprite.h;

/**
 * Unbeleuchtetes Material für gemalte Figuren: Alpha-Schwelle mit Kantenglättung über die Abdeckung
 * (Tiefentest bleibt gültig, kein Sortieren nötig), beidseitig wegen der Spiegelung über negative Skalierung.
 * @param {THREE.Texture} texture
 */
export function spriteMaterial(texture) {
  return new THREE.MeshBasicMaterial({
    map: texture,
    color: new THREE.Color(BILLBOARD.shade, BILLBOARD.shade, BILLBOARD.shade),
    alphaTest: BILLBOARD.alphaTest,
    alphaToCoverage: true,
    transparent: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

let blobTexture = null;
/** Weicher runder Bodenschatten (eine geteilte Textur). */
export function shadowTexture() {
  if (blobTexture) return blobTexture;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(0.45, 'rgba(0,0,0,0.8)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  blobTexture = new THREE.CanvasTexture(canvas);
  return blobTexture;
}

/** Material des Bodenschattens. */
export function shadowMaterial() {
  return new THREE.MeshBasicMaterial({
    map: shadowTexture(), color: 0x000000, transparent: true, opacity: BILLBOARD.shadowOpacity, depthWrite: false,
  });
}

const _pos = new THREE.Vector3(), _scl = new THREE.Vector3(), _q = new THREE.Quaternion(), _rz = new THREE.Quaternion();
const _zAxis = new THREE.Vector3(0, 0, 1);

/**
 * Setzt `out` für eine Bildtafel: Füße bei (x, y, z), Bewegung aus {@link spriteMotion}, gespiegelt für
 * `face` = -1 (Blick nach links). `footOffset`: Höhe des Standpunkts über der Bildunterkante (m, schon skaliert).
 * @param {THREE.Matrix4} out
 * @param {{ quaternion: THREE.Quaternion, right: THREE.Vector3, foot?: THREE.Vector3 }} orient
 * @param {number} x @param {number} y @param {number} z
 * @param {number} width @param {number} height Weltmaße
 * @param {1|-1} face
 * @param {ReturnType<typeof spriteMotion>} m
 * @param {number} [footOffset]
 */
export function composeSprite(out, orient, x, y, z, width, height, face, m, footOffset = 0) {
  const lunge = m.lunge * face;
  const fx = orient.foot ? orient.foot.x * footOffset : 0, fz = orient.foot ? orient.foot.z * footOffset : 0;
  _pos.set(x + orient.right.x * lunge + fx, y + m.offsetY, z + orient.right.z * lunge + fz);
  _q.copy(orient.quaternion).multiply(_rz.setFromAxisAngle(_zAxis, -m.tilt * face));
  _scl.set(width * m.scaleX * face, height * m.scaleY, 1);
  return out.compose(_pos, _q, _scl);
}

const TAU = Math.PI * 2;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/**
 * Bewegung einer gemalten Figur, rein aus den Eingaben. Im Stand atmet sie leicht; in Bewegung die
 * tierische Gangart; `attackT` 0→1 gibt einen kurzen Ausfall nach vorn.
 * `tilt` > 0 neigt die Figur nach vorn (in Blickrichtung), `lunge` > 0 schiebt sie nach vorn (Meter),
 * `offsetY` hebt sie an (Meter), `scaleX`/`scaleY` stauchen und strecken.
 * @param {keyof typeof MOTION} motion
 * @param {{ speed?: number, time?: number, attackT?: number }} input
 * @returns {{ offsetY: number, tilt: number, scaleX: number, scaleY: number, lunge: number }}
 */
export function spriteMotion(motion, { speed = 0, time = 0, attackT } = {}) {
  const m = MOTION[motion] || MOTION.scurry;
  const move = clamp01((Number.isFinite(speed) ? speed : 0) / MOTION_FULL_SPEED);
  const t = Number.isFinite(time) ? time : 0;
  const breathe = Math.sin(t * IDLE.freq * TAU);
  let offsetY = IDLE.bob * (0.5 + 0.5 * breathe) * (1 - move);
  let tilt = 0;
  let stretch = IDLE.stretch * breathe * (1 - move);
  const phase = t * m.freq * TAU;
  const s = Math.sin(phase);

  switch (motion) {
    case 'hop': {
      // Sprünge im Bogen (ein Sprung je halber Periode): in der Luft gestreckt, bei der Landung gestaucht.
      // Neigung stetig: beim Steigen nach vorn, im Scheitel gerade, beim Fallen leicht zurück, am Boden 0.
      const h = Math.abs(s);
      offsetY += m.bob * h * move;
      const lean = Math.sin(phase * 2);
      tilt += m.tilt * lean * (lean >= 0 ? 1 : HOP_BACK_LEAN) * move;
      stretch += m.squash * (h * 2 - 1) * move;
      break;
    }
    case 'hopSlow': {
      // Kröte: ein Satz, dann Pause am Boden.
      const h = Math.max(0, s);
      offsetY += m.bob * h * move;
      tilt -= m.tilt * h * move;
      stretch += m.squash * (h > 0 ? h : -0.6 * Math.min(1, -s * 2)) * move;
      break;
    }
    case 'waddle': {
      // Ente: wiegt von einer Seite zur anderen, kleine Hüpfer bei jedem Schritt.
      offsetY += m.bob * Math.abs(s) * move;
      tilt += m.tilt * s * move;
      stretch += m.squash * (Math.abs(s) - 0.5) * move;
      break;
    }
    case 'fly': {
      // Krähe: auf und ab, Flügelschlag als Stauchen; schlägt auch im Stand.
      const flap = Math.sin(phase * 2);
      offsetY += m.bob * s * move;
      stretch += m.squash * flap;
      tilt += m.tilt * move;
      break;
    }
    default: {
      // scurry, trot, lope, lumber: Schritt-Hüpfer und Wiegen, Stärke aus MOTION.
      offsetY += m.bob * Math.abs(s) * move;
      tilt += m.tilt * Math.sin(phase * (m.tiltRate || 1)) * move;
      stretch += m.squash * (Math.abs(s) - 0.5) * move;
    }
  }

  let lunge = 0;
  if (attackT !== undefined && attackT > 0 && attackT < 1) {
    const a = Math.sin(Math.PI * attackT);
    lunge = ATTACK.lunge * a;
    tilt += ATTACK.tilt * a;
  }
  return { offsetY, tilt, scaleX: 1 - stretch * 0.6, scaleY: 1 + stretch, lunge };
}

/** Länge eines Umlaufs der Duo-Bildfolge (s). */
const DUO_CYCLE = DUO_FRAMES.seconds.reduce((a, b) => a + b, 0);

/**
 * Bildposition des Duos zur Zeit `t` (s): läuft `DUO_FRAMES.order` mit den Dauern `DUO_FRAMES.seconds` immer wieder durch,
 * nach der Uhr und unabhängig vom Laufen. Rein, damit prüfbar; ungültige Zeiten zählen als 0.
 * @param {number} t
 * @returns {number}
 */
export function duoFrameAt(t) {
  let rest = Number.isFinite(t) ? ((t % DUO_CYCLE) + DUO_CYCLE) % DUO_CYCLE : 0;
  for (let k = 0; k < DUO_FRAMES.order.length; k++) {
    if (rest < DUO_FRAMES.seconds[k]) return DUO_FRAMES.order[k];
    rest -= DUO_FRAMES.seconds[k];
  }
  return DUO_FRAMES.order[0];
}
