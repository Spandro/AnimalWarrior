import { test, assertEqual, assertClose, assertTrue } from './runner.js';
import { removeBackground, spriteUv, spriteMotion } from '../src/render/sprites.js';
import { HERO_SPRITES, ENEMY_SPRITES, MOTION, IDLE } from '../src/data/sprites.js';
import { ENEMIES } from '../src/data/enemies.js';
import { ANIMALS } from '../src/data/animals.js';
import { CLASSES } from '../src/data/classes.js';

const OPTS = { threshold: 28, feather: 60 };

/** Bild mit weißem Grund; `paint(x, y)` liefert [r, g, b] oder null für Weiß. */
function image(w, h, paint) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = paint(x, y) || [255, 255, 255];
      data.set([...c, 255], (y * w + x) * 4);
    }
  }
  return { width: w, height: h, data };
}
const alphaAt = (img, x, y) => img.data[(y * img.width + x) * 4 + 3];

test('sprites: removeBackground macht den weißen Rand durchsichtig und lässt die Figur stehen', () => {
  const img = removeBackground(image(5, 5, (x, y) => (x >= 1 && x <= 3 && y >= 1 && y <= 3 ? [40, 30, 20] : null)), OPTS);
  for (let i = 0; i < 5; i++) {
    for (const [x, y] of [[i, 0], [i, 4], [0, i], [4, i]]) assertEqual(alphaAt(img, x, y), 0, `Rand ${x},${y}`);
  }
  for (let y = 1; y <= 3; y++) for (let x = 1; x <= 3; x++) assertEqual(alphaAt(img, x, y), 255, `Block ${x},${y}`);
});

test('sprites: removeBackground lässt ein eingeschlossenes weißes Pixel deckend', () => {
  const img = removeBackground(image(5, 5, (x, y) => {
    if (x === 2 && y === 2) return null;
    return x >= 1 && x <= 3 && y >= 1 && y <= 3 ? [40, 30, 20] : null;
  }), OPTS);
  assertEqual(alphaAt(img, 2, 2), 255);
  assertEqual(alphaAt(img, 0, 0), 0);
});

test('sprites: removeBackground gibt hellgrauen Randpixeln eine Teildeckkraft', () => {
  // Spalte 1 hellgrau (Abstand zu Weiß ≈ 52), Spalten 2–3 dunkel.
  const img = removeBackground(image(5, 3, (x) => (x === 1 ? [225, 225, 225] : x >= 2 && x <= 3 ? [40, 30, 20] : null)), OPTS);
  const a = alphaAt(img, 1, 1);
  assertTrue(a > 0 && a < 255, `Alpha ${a}`);
  assertEqual(alphaAt(img, 0, 1), 0);
  assertEqual(alphaAt(img, 2, 1), 255);
});

test('sprites: spriteUv rechnet das Pixelrechteck in Texturkoordinaten mit gespiegeltem v um', () => {
  const uv = spriteUv({ x: 100, y: 50, w: 200, h: 150 }, { width: 1000, height: 500 });
  assertClose(uv.u0, 0.1);
  assertClose(uv.u1, 0.3);
  assertClose(uv.v0, 0.6);
  assertClose(uv.v1, 0.9);
});

test('sprites: spriteMotion atmet im Stand nur leicht', () => {
  for (const motion of Object.keys(MOTION)) {
    for (let t = 0; t < 4; t += 0.05) {
      const m = spriteMotion(motion, { speed: 0, time: t });
      assertTrue(Math.abs(m.offsetY) <= IDLE.bob + 1e-9, `${motion} t=${t}: ${m.offsetY}`);
    }
  }
});

test('sprites: Hoppeln hebt ab und sinkt nie unter den Boden', () => {
  let max = 0;
  for (let t = 0; t < 2; t += 0.01) {
    const m = spriteMotion('hop', { speed: 5, time: t });
    assertTrue(m.offsetY >= 0, `t=${t}: ${m.offsetY}`);
    max = Math.max(max, m.offsetY);
  }
  assertTrue(max > 0.1, `höchster Hub ${max}`);
});

test('sprites: Neigung ändert sich im Lauf stetig, ohne Sprung bei Landung und Absprung', () => {
  const dt = 1 / 120;
  for (const motion of Object.keys(MOTION)) {
    const cycle = 1 / MOTION[motion].freq;
    let prev = spriteMotion(motion, { speed: 5, time: 0 }).tilt;
    for (let t = dt; t <= cycle + 1e-9; t += dt) {
      const tilt = spriteMotion(motion, { speed: 5, time: t }).tilt;
      assertTrue(Math.abs(tilt - prev) <= 0.05, `${motion} t=${t.toFixed(3)}: ${prev.toFixed(3)} → ${tilt.toFixed(3)}`);
      prev = tilt;
    }
  }
});

test('sprites: Hoppeln neigt beim Steigen nach vorn und steht bei Bodenkontakt gerade', () => {
  const { freq } = MOTION.hop;
  const half = 1 / (2 * freq); // ein Sprung
  assertTrue(spriteMotion('hop', { speed: 5, time: half * 0.25 }).tilt > 0, 'steigt nicht nach vorn geneigt');
  assertTrue(spriteMotion('hop', { speed: 5, time: half * 0.75 }).tilt < 0, 'fällt nicht leicht zurückgeneigt');
  assertClose(spriteMotion('hop', { speed: 5, time: half }).tilt, 0, 0.01);
});

test('sprites: Angriff gibt einen Ausfall nach vorn', () => {
  assertTrue(spriteMotion('hop', { speed: 0, time: 1, attackT: 0.5 }).lunge > 0);
  assertEqual(spriteMotion('hop', { speed: 0, time: 1 }).lunge, 0);
});

test('sprites: spriteMotion liefert für jede Gangart endliche Werte', () => {
  for (const motion of Object.keys(MOTION)) {
    for (const speed of [0, 1.5, 4, 20]) {
      for (const attackT of [undefined, 0.2, 0.9]) {
        for (let t = 0; t < 3; t += 0.13) {
          const m = spriteMotion(motion, { speed, time: t, attackT });
          for (const k of ['offsetY', 'tilt', 'scaleX', 'scaleY', 'lunge']) {
            assertTrue(Number.isFinite(m[k]), `${motion} ${k} = ${m[k]}`);
          }
          assertTrue(m.scaleX > 0 && m.scaleY > 0, `${motion}: Skalierung ${m.scaleX}/${m.scaleY}`);
        }
      }
    }
  }
});

test('sprites: jede Heldenkombination und jeder Gegnertyp hat ein Bild', () => {
  const check = (key, s) => {
    assertTrue(s, `${key} fehlt`);
    assertTrue(s.w > 0 && s.h > 0 && s.heightM > 0, `${key}: Maße`);
    assertTrue(s.footOffset >= 0 && s.footOffset < s.heightM * 0.2, `${key}: footOffset ${s.footOffset}`);
    assertTrue(Object.hasOwn(MOTION, s.motion), `${key}: Gangart ${s.motion}`);
  };
  for (const a of Object.keys(ANIMALS)) for (const c of Object.keys(CLASSES)) check(`${a}-${c}`, HERO_SPRITES[`${a}-${c}`]);
  for (const type of Object.keys(ENEMIES)) check(type, ENEMY_SPRITES[type]);
});
