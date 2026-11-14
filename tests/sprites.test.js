import { test, assertEqual, assertClose, assertTrue } from './runner.js';
import { removeBackground, spriteUv, spriteMotion, heroSpriteDef, usedSheets, duoFrameAt, cutFrames } from '../src/render/sprites.js';
import { lookYaw } from '../src/render/hero.js';
import { buildCharacter, animateCharacter } from '../src/render/character.js';
import * as THREE from '../vendor/three.module.min.js';
import { HERO_SPRITES, ENEMY_SPRITES, MOTION, IDLE, SHEETS, SHEET_HOLES, SHEET_FRAMES, DUO_HEIGHT, DUO_FRAMES } from '../src/data/sprites.js';
import { ENEMIES } from '../src/data/enemies.js';
import { ANIMALS } from '../src/data/animals.js';
import { CLASSES } from '../src/data/classes.js';
import { isValidPair } from '../src/core/roster.js';

const OPTS = { threshold: 28, feather: 60 };
const DUO_KEY = 'giraffe-hochstapler';

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

/** 12×12: dunkler Block 1…10 mit zwei eingeschlossenen weißen 2×2-Flächen A (3–4) und B (7–8). */
function twoHoles() {
  const hole = (v) => v >= 3 && v <= 4 ? 'A' : v >= 7 && v <= 8 ? 'B' : null;
  return image(12, 12, (x, y) => {
    if (x < 1 || x > 10 || y < 1 || y > 10) return null;
    return hole(x) && hole(x) === hole(y) ? null : [40, 30, 20];
  });
}

test('sprites: removeBackground entfernt eingeschlossenes Weiß nur mit Startpunkt', () => {
  const img = removeBackground(twoHoles(), OPTS, [[3, 3]]);
  for (const [x, y] of [[3, 3], [4, 3], [3, 4], [4, 4]]) assertEqual(alphaAt(img, x, y), 0, `A ${x},${y}`);
  for (const [x, y] of [[7, 7], [8, 7], [7, 8], [8, 8]]) assertEqual(alphaAt(img, x, y), 255, `B ${x},${y}`);
  assertEqual(alphaAt(img, 1, 1), 255);
  assertEqual(alphaAt(img, 5, 5), 255);
  const plain = removeBackground(twoHoles(), OPTS);
  assertEqual([alphaAt(plain, 3, 3), alphaAt(plain, 7, 7)], [255, 255]);
});

test('sprites: Startpunkt auf dunklem Pixel ändert nichts', () => {
  const img = removeBackground(twoHoles(), OPTS, [[1, 1]]);
  assertEqual([alphaAt(img, 1, 1), alphaAt(img, 3, 3)], [255, 255]);
});

test('sprites: SHEET_HOLES enthält die sieben Punkte aus der Bilder-Doku und die Lücken des Duos', () => {
  assertEqual(SHEET_HOLES, {
    gegner2: [[290, 921], [753, 516], [172, 904]],
    bosse: [[198, 427], [302, 1011], [296, 165], [388, 127]],
    duo: [[160, 669], [567, 674], [898, 673], [1337, 673], [340, 121], [1203, 512], [915, 499], [296, 243], [223, 191],
      [1176, 546], [241, 176], [279, 261], [1191, 530]],
  });
  for (const id of Object.keys(SHEET_HOLES)) assertTrue(!!SHEETS[id], `Bogen ${id} fehlt in SHEETS`);
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
  for (const a of Object.keys(ANIMALS)) {
    for (const c of Object.keys(CLASSES)) {
      if (!isValidPair(a, c)) continue;
      const key = `${a}-${c}`;
      if (key === DUO_KEY && !HERO_SPRITES[key]) continue; // ein fehlender Duo-Eintrag ist erlaubt (eigener Test unten)
      check(key, HERO_SPRITES[key]);
    }
  }
  for (const type of Object.keys(ENEMIES)) check(type, ENEMY_SPRITES[type]);
});

test('sprites: stride ist eine bekannte Gangart; SHEETS.duo ist relativ; ein fehlender Duo-Eintrag ist erlaubt', () => {
  assertEqual(MOTION.stride, { freq: 1.4, bob: 0.05, tilt: 0.08, squash: 0.02, tiltRate: 1 });
  assertEqual(SHEETS.duo, 'assets/figuren/duo.webp');
  assertTrue(!SHEETS.duo.startsWith('/'), 'Pfad muss relativ sein');
  assertEqual(DUO_HEIGHT, 2.6);
  // Geladene Bögen ohne Duo-Bild: es gibt kein Bild für das Duo, die Grundhelden behalten ihres.
  const sheets = { ok: true, textures: { helden: {} }, sizes: {}, canvases: {} };
  const duo = HERO_SPRITES[DUO_KEY];
  if (duo) {
    assertEqual([duo.sheet, duo.motion, duo.heightM], ['duo', 'stride', DUO_HEIGHT]);
    assertEqual(heroSpriteDef({ ...sheets, textures: { ...sheets.textures, duo: {} } }, 'giraffe', 'hochstapler'), duo);
  }
  assertEqual(heroSpriteDef(sheets, 'giraffe', 'hochstapler'), null);
  assertEqual(heroSpriteDef(sheets, 'hase', 'krieger'), HERO_SPRITES['hase-krieger']);
  assertEqual(heroSpriteDef({ ok: false, textures: {} }, 'hase', 'krieger'), null);
  assertEqual(heroSpriteDef(undefined, 'hase', 'krieger'), null);
  // Geladen werden nur Bögen, die ein Eintrag nutzt: ohne Duo-Eintrag kein Versuch, duo.webp zu holen.
  const used = usedSheets();
  for (const s of [...Object.values(HERO_SPRITES), ...Object.values(ENEMY_SPRITES)]) assertTrue(used.includes(s.sheet), s.sheet);
  assertEqual(used.includes('duo'), !!duo);
});

test('sprites: die Ersatzfigur des Duos ist etwa 2,6 m hoch und lässt sich bewegen', () => {
  const fig = buildCharacter('giraffe', 'hochstapler');
  const box = new THREE.Box3().setFromObject(fig);
  assertTrue(Math.abs(box.max.y - DUO_HEIGHT) < 0.2 && box.min.y > -0.05, `Höhe ${box.min.y.toFixed(2)}…${box.max.y.toFixed(2)}`);
  for (const attackT of [undefined, 0.2, 0.5, 0.9]) {
    animateCharacter(fig, { speed: 4, time: 1.3, attackT });
    fig.traverse((o) => assertTrue([o.position.x, o.position.y, o.rotation.x, o.rotation.z].every(Number.isFinite), o.name));
  }
  // Die Grundhelden bleiben unverändert (etwa 1,6 m).
  const hase = new THREE.Box3().setFromObject(buildCharacter('hase', 'krieger'));
  assertTrue(hase.max.y < 2.1, `Hase ${hase.max.y}`);
});

test('sprites: alle Gegnerausschnitte liegen im Bogen; die neuen wie ausgemessen', () => {
  for (const [type, s] of Object.entries(ENEMY_SPRITES)) {
    assertTrue(s.x >= 0 && s.y >= 0 && s.x + s.w <= 1254 && s.y + s.h <= 1254, `${type} ragt aus dem Bogen`);
    assertTrue(Object.hasOwn(SHEETS, s.sheet), `${type}: Bogen ${s.sheet}`);
  }
  const cut = (t) => { const s = ENEMY_SPRITES[t]; return [s.sheet, s.x, s.y, s.w, s.h]; };
  assertEqual(cut('fuchs'), ['gegner2', 9, 330, 425, 224]);
  assertEqual(cut('dachs'), ['gegner2', 458, 304, 359, 269]);
  assertEqual(cut('uhu'), ['gegner2', 831, 174, 413, 413]);
  assertEqual(cut('kreuzotter'), ['gegner2', 54, 707, 319, 266]);
  assertEqual(cut('igel'), ['gegner2', 441, 714, 317, 269]);
  assertEqual(cut('luchs'), ['gegner2', 791, 683, 428, 326]);
});

test('sprites: Duo-Bildfolge', () => {
  const duo = HERO_SPRITES[DUO_KEY];
  assertTrue(duo, 'Duo-Eintrag fehlt');
  assertEqual([duo.sheet, duo.motion, duo.heightM], ['duo', 'stride', DUO_HEIGHT]);
  // Vier gleich große Ausschnitte nebeneinander im ausgeschnittenen Bogen; der Eintrag selbst ist das Standbild.
  assertEqual(duo.frames.length, 4);
  duo.frames.forEach((f, k) => assertEqual([f.x, f.y, f.w, f.h], [k * duo.w, 0, duo.w, duo.h], `Phase ${k}`));
  const still = duo.frames[DUO_FRAMES.still];
  assertEqual([duo.x, duo.y], [still.x, still.y]);
  // Ausgemessen im gelieferten Bild (1536 × 1024): gleiche Größe, Giraffe am selben Fußpunkt.
  assertEqual(SHEET_FRAMES.duo, { x: [-37, 330, 703, 1093], y: 97, w: 443, h: 834 });
  assertEqual([duo.w, duo.h], [SHEET_FRAMES.duo.w, SHEET_FRAMES.duo.h]);
  for (const x of SHEET_FRAMES.duo.x) assertTrue(x + SHEET_FRAMES.duo.w <= 1536, `Phase bei ${x} ragt rechts heraus`);
  // Reihenfolge ist eine Umstellung von 0–3, alle Dauern positiv.
  assertEqual(DUO_FRAMES.order.length, 4);
  assertEqual([...DUO_FRAMES.order].sort(), [0, 1, 2, 3]);
  assertEqual(DUO_FRAMES.seconds.length, 4);
  for (const s of DUO_FRAMES.seconds) assertTrue(s > 0, `Dauer ${s}`);
  assertEqual([DUO_FRAMES.still, DUO_FRAMES.reducedMotion], [0, 3]);
  // Rücken 2,5 s → Klettern 1,2 s → oben 2,5 s → Rutschen 0,8 s, Umlauf 7 s.
  assertEqual(duoFrameAt(0), 3);
  assertEqual(duoFrameAt(2.4), 3);
  assertEqual(duoFrameAt(2.6), 2);
  assertEqual(duoFrameAt(3.8), 0);
  assertEqual(duoFrameAt(6.3), 1);
  assertEqual(duoFrameAt(7), 3);
  assertEqual(duoFrameAt(7 * 40 + 2.6), 2);
  for (const t of [-1, NaN, Infinity]) assertTrue([0, 1, 2, 3].includes(duoFrameAt(t)), `t = ${t}`);
});

test('sprites: cutFrames gibt jeder Phase nur ihre eigenen Pixel', () => {
  // 10 × 5, durchsichtig: Figur A (x 1–3, y 1–2); Figur B (x 6–9, y 1–3) mit Schwanz (x 4–5, y 4), der in As Ausschnitt ragt.
  const W = 10, H = 5;
  const data = new Uint8ClampedArray(W * H * 4);
  const put = (x, y, rgb) => data.set([...rgb, 255], (y * W + x) * 4);
  for (let y = 1; y <= 2; y++) for (let x = 1; x <= 3; x++) put(x, y, [200, 10, 10]);
  for (let y = 1; y <= 3; y++) for (let x = 6; x <= 9; x++) put(x, y, [10, 10, 200]);
  put(4, 4, [10, 10, 201]); put(5, 4, [10, 10, 202]);
  // Phase 0 beginnt links außerhalb, Phase 1 endet rechts außerhalb des Bogens.
  const out = cutFrames({ width: W, height: H, data }, { x: [-1, 5], y: 0, w: 6, h: 5 });
  assertEqual([out.width, out.height], [12, 5]);
  assertTrue(out.data instanceof Uint8ClampedArray, 'Uint8ClampedArray');
  const a = (x, y) => out.data[(y * 12 + x) * 4 + 3];
  for (let y = 1; y <= 2; y++) for (let x = 2; x <= 4; x++) assertEqual(a(x, y), 255, `A ${x},${y}`);
  assertEqual(a(5, 4), 0, 'Bs Schwanz bleibt aus Phase 0 heraus');
  assertEqual(a(0, 1), 0, 'links außerhalb ist durchsichtig');
  for (let y = 1; y <= 3; y++) for (let x = 7; x <= 10; x++) assertEqual(a(x, y), 255, `B ${x},${y}`);
  assertEqual(a(6, 4), 255, 'Bs Schwanz gehört zu Phase 1');
  assertEqual(Array.from(out.data.slice((4 * 12 + 6) * 4, (4 * 12 + 6) * 4 + 3)), [10, 10, 202]);
  for (let y = 0; y < 5; y++) assertEqual(a(11, y), 0, 'rechts außerhalb ist durchsichtig');
});

test('hero: die Figur dreht sich beim Zielen in die Zielrichtung, sonst in die Laufrichtung', () => {
  const lauf = { x: 1, z: 0 };
  // Ohne Zielrichtung zählt die Laufrichtung.
  assertClose(lookYaw(lauf, null), Math.atan2(1, 0));
  assertClose(lookYaw({ x: 0, z: 1 }, null), 0);
  // Mit Zielrichtung zählt sie, auch wenn der Held in eine andere Richtung läuft.
  assertClose(lookYaw(lauf, { x: -1, z: 0 }), Math.atan2(-1, 0));
  assertClose(lookYaw(lauf, { x: 0, z: -1 }), Math.atan2(0, -1));
  // Eine Zielrichtung der Länge null zählt nicht.
  assertClose(lookYaw(lauf, { x: 0, z: 0 }), Math.atan2(1, 0));
});
