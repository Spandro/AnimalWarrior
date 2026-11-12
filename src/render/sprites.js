// Gemalte Figuren: Bildbögen laden, weißen Hintergrund entfernen, Texturen anlegen, Bewegung berechnen.
import * as THREE from '../../vendor/three.module.min.js';
import { SHEETS, BACKGROUND, BILLBOARD, MOTION, IDLE, ATTACK, MOTION_FULL_SPEED, HOP_BACK_LEAN } from '../data/sprites.js';

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
 * kein heller Saum bleibt. Nicht mit dem Rand verbundene Pixel bleiben unberührt (weiße Entenkörper).
 * Ändert `img.data` und gibt `img` zurück. Ohne DOM, daher testbar.
 * @param {ImageDataLike} img
 * @param {{ threshold: number, feather: number }} options Abstände im RGB-Raum (0…441)
 * @returns {ImageDataLike}
 */
export function removeBackground(img, { threshold, feather }) {
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

/** @param {string} url @returns {Promise<HTMLImageElement>} */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Bild nicht geladen: ' + url));
    img.src = url;
  });
}

/**
 * Lädt beide Bildbögen, entfernt den Hintergrund und legt je Bogen eine Textur (sRGB, Mipmaps, linear
 * gefiltert) und ein 2D-Canvas (für die Menüvorschau) an. Wirft nie: schlägt etwas fehl, `ok: false`.
 * Die Texturen sind DataTextures aus den Rohpixeln statt CanvasTextures: ein Canvas speichert
 * vormultipliert und verliert dabei die Farben durchsichtiger Pixel, was in den Mipmaps einen dunklen
 * Saum ergäbe.
 * @returns {Promise<SpriteSheets>}
 */
export async function loadSpriteSheets() {
  const result = { ok: false, textures: {}, sizes: {}, canvases: {} };
  try {
    const entries = Object.entries(SHEETS);
    const images = await Promise.all(entries.map(([, url]) => loadImage(url)));
    entries.forEach(([id], k) => {
      const image = images[k];
      const W = image.naturalWidth, H = image.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, W, H);
      removeBackground(imageData, BACKGROUND);
      removeSpecks(imageData, BACKGROUND.minSpeck);
      bleedColors(imageData, BACKGROUND.bleed);
      ctx.putImageData(imageData, 0, 0);

      // Zeilen umdrehen: v = 0 ist unten, wie bei Bildtexturen mit flipY.
      const flipped = new Uint8Array(W * H * 4);
      const row = W * 4;
      for (let y = 0; y < H; y++) flipped.set(imageData.data.subarray(y * row, (y + 1) * row), (H - 1 - y) * row);
      const tex = new THREE.DataTexture(flipped, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = 4;
      tex.needsUpdate = true;
      result.textures[id] = tex;
      result.sizes[id] = { width: W, height: H };
      result.canvases[id] = canvas;
    });
    result.ok = true;
  } catch (e) {
    console.warn('Figurenbilder nicht verfügbar, zeige 3D-Figuren.', e);
    for (const t of Object.values(result.textures)) t.dispose();
    result.textures = {}; result.sizes = {}; result.canvases = {};
  }
  return result;
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
