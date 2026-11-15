// Gemalte Umgebung laden: Bodenbild nahtlos machen, Objektbogen freistellen. Schlägt etwas fehl,
// kommt `ok: false` zurück und alles bleibt bei der bisherigen 3D-Darstellung.
import * as THREE from '../../vendor/three.module.min.js';
import { loadImage, imageDataOf, prepareSheet, dataTexture } from './sprites.js';
import { ENV_SHEETS, GROUND, TRAIL_TILES } from '../data/environment.js';

/**
 * Macht ein Bild kachelbar: mischt die äußeren `margin` Pixel jeder Kante mit der gegenüberliegenden
 * Seite, sodass linke und rechte sowie obere und untere Randreihe fast gleich sind. Ganz am Rand steht
 * der Mittelwert beider Seiten, nach innen hin verläuft die Mischung auf null. Die Bildmitte bleibt
 * unberührt. Ändert `img.data` und gibt `img` zurück; ohne DOM, daher prüfbar.
 * @param {import('./sprites.js').ImageDataLike} img
 * @param {number} margin Breite des gemischten Randes in Pixeln
 */
export function blendSeams(img, margin) {
  const { width: W, height: H, data } = img;
  const m = Math.max(0, Math.min(margin, Math.floor(Math.min(W, H) / 2) - 1));
  for (let k = 0; k < m; k++) {
    const w = 0.5 * (1 - k / m);
    for (let y = 0; y < H; y++) {
      const a = (y * W + k) * 4, b = (y * W + (W - 1 - k)) * 4;
      for (let c = 0; c < 3; c++) {
        const va = data[a + c], vb = data[b + c];
        data[a + c] = Math.round(va * (1 - w) + vb * w);
        data[b + c] = Math.round(vb * (1 - w) + va * w);
      }
    }
  }
  for (let k = 0; k < m; k++) {
    const w = 0.5 * (1 - k / m);
    for (let x = 0; x < W; x++) {
      const a = (k * W + x) * 4, b = ((H - 1 - k) * W + x) * 4;
      for (let c = 0; c < 3; c++) {
        const va = data[a + c], vb = data[b + c];
        data[a + c] = Math.round(va * (1 - w) + vb * w);
        data[b + c] = Math.round(vb * (1 - w) + va * w);
      }
    }
  }
  return img;
}

/**
 * @typedef {{ ok: boolean, ground: THREE.Texture | null, objects: THREE.Texture | null,
 *   sizes: Record<string, { width: number, height: number }> }} Environment
 */

/**
 * Lädt Boden- und Objektbild. Löst nie mit einem Fehler auf: fehlt ein Bild, ist `ok` false.
 * @returns {Promise<Environment>}
 */
export async function loadEnvironment() {
  /** @type {Environment} */
  const result = { ok: false, ground: null, objects: null, sizes: {} };
  try {
    const [bodenImg, objekteImg] = await Promise.all([loadImage(ENV_SHEETS.boden), loadImage(ENV_SHEETS.objekte)]);

    const boden = imageDataOf(bodenImg);
    blendSeams(boden, GROUND.seamBlendPx);
    const ground = dataTexture(boden);
    ground.wrapS = ground.wrapT = THREE.RepeatWrapping;
    result.ground = ground;
    result.sizes.boden = { width: boden.width, height: boden.height };

    const sheet = prepareSheet(objekteImg);
    result.objects = sheet.texture;
    result.sizes.objekte = sheet.size;

    result.ok = true;
  } catch (e) {
    console.warn('Umgebungsbilder nicht verfügbar, zeige die bisherige Darstellung.', e);
    result.ground?.dispose();
    result.objects?.dispose();
    result.ground = null;
    result.objects = null;
    result.sizes = {};
  }
  return result;
}

/**
 * @typedef {{ weg: THREE.Texture | null, wasser: THREE.Texture | null, schlamm?: THREE.Texture | null, steg?: THREE.Texture | null }} TrailTiles
 * Kacheln für Weg und Bach, nach dem Laden von Kapitel 2 auch Schlamm und Stege; `null` (oder fehlend), wo das Bild
 * fehlt oder noch lädt (dann bleibt es dort bei der Farbfläche bzw. den gezeichneten Brettern).
 */

/**
 * Lädt Kacheln der Karten und macht sie nahtlos ({@link blendSeams}, wie den Boden). Löst nie mit einem Fehler auf:
 * Fehlt ein Bild, ist sein Eintrag `null`.
 * @param {{ load?: (url: string) => Promise<HTMLImageElement>, keys?: Array<'weg'|'wasser'|'schlamm'|'steg'> }} [options]
 *   `load` in Tests ersetzbar; `keys`: welche Kacheln (ohne Angabe Weg und Bach)
 * @returns {Promise<TrailTiles>}
 */
export async function loadTrailTiles({ load = loadImage, keys = ['weg', 'wasser'] } = {}) {
  const tile = async (key) => {
    const url = TRAIL_TILES[key];
    try {
      const data = imageDataOf(await load(url));
      blendSeams(data, TRAIL_TILES.seamBlendPx);
      const tex = dataTexture(data);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      if (key === 'steg') tex.rotation = TRAIL_TILES.stegTurn; // Bretter quer zum Steg
      return tex;
    } catch (e) {
      console.warn(`Kachel ${url} nicht verfügbar, zeige dort eine Farbfläche.`, e);
      return null;
    }
  };
  const loaded = await Promise.all(keys.map(tile));
  return Object.fromEntries(keys.map((k, i) => [k, loaded[i]]));
}
