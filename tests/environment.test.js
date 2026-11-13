import { test, assertEqual, assertTrue } from './runner.js';
import { ENV_SPRITES, DECO, MENU_SCENES, SCENE_CELLS, OBSTACLE_LOOK } from '../src/data/environment.js';
import { obstacleSprite, decoInCell, occludesHero } from '../src/core/environment.js';
import { blendSeams } from '../src/render/environment.js';
import { obstaclesNear } from '../src/core/terrain.js';
import { TERRAIN_CELL } from '../src/data/terrain.js';

test('environment: jedes Bild hat ein brauchbares Rechteck, keine zwei überlappen sich', () => {
  const list = Object.entries(ENV_SPRITES);
  assertEqual(list.length, 15);
  for (const [id, s] of list) {
    assertTrue(s.w > 0 && s.h > 0, `${id}: Rechteck`);
    assertTrue(s.heightM > 0, `${id}: Höhe in Metern`);
    assertTrue(s.footOffset >= 0 && s.footOffset < s.heightM, `${id}: Standpunkt`);
  }
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i][1], b = list[j][1];
      const over = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      assertTrue(!over, `${list[i][0]} überlappt ${list[j][0]}`);
    }
  }
});

test('environment: Baumbild hängt fest an der Position, alle drei Arten kommen vor', () => {
  const at = (x, z) => obstacleSprite({ x, z, radius: 0.7, kind: 'tree' });
  assertEqual(at(12.5, -7.25), at(12.5, -7.25));
  const seen = new Set();
  for (let i = 0; i < 300; i++) seen.add(at(i * 1.37, -i * 0.91));
  for (const id of OBSTACLE_LOOK.trees) assertTrue(seen.has(id), `Baumart ${id} kommt nicht vor`);
  assertEqual(seen.size, OBSTACLE_LOOK.trees.length);
});

test('environment: Felsbild hängt am Radius', () => {
  assertEqual(obstacleSprite({ x: 3, z: 4, radius: 1.4, kind: 'rock' }), 'fels-gross');
  assertEqual(obstacleSprite({ x: 3, z: 4, radius: 0.8, kind: 'rock' }), 'fels-klein');
});

test('environment: Deko ist deterministisch, begrenzt und steht frei', () => {
  const seed = 5;
  assertEqual(decoInCell(seed, 2, -3), decoInCell(seed, 2, -3));
  const kinds = new Set();
  let total = 0;
  for (let cx = -10; cx < 10; cx++) {
    for (let cz = -5; cz < 5; cz++) {
      const list = decoInCell(seed, cx, cz);
      assertTrue(list.length <= DECO.perCell[1], 'höchstens vier je Zelle');
      total += list.length;
      for (const d of list) {
        kinds.add(d.id);
        assertTrue(ENV_SPRITES[d.id] !== undefined, `unbekannte Art ${d.id}`);
        assertTrue(typeof d.mirror === 'boolean');
        assertTrue(d.x >= cx * TERRAIN_CELL && d.x < (cx + 1) * TERRAIN_CELL, 'x in der Zelle');
        assertTrue(d.z >= cz * TERRAIN_CELL && d.z < (cz + 1) * TERRAIN_CELL, 'z in der Zelle');
        assertTrue(Math.hypot(d.x, d.z) >= DECO.startClear, 'nichts im Startbereich');
        assertTrue(obstaclesNear(seed, d.x, d.z, 0).length === 0, 'nichts in einem Hindernis');
      }
    }
  }
  assertTrue(total > 100, `zu wenig Deko insgesamt: ${total}`);
  assertEqual([...kinds].sort(), Object.keys(DECO.kinds).sort());
});

test('environment: blendSeams macht die Ränder gleich und lässt die Mitte in Ruhe', () => {
  const W = 64, H = 64, margin = 12;
  const img = { width: W, height: H, data: new Uint8ClampedArray(W * H * 4) };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      // Harter Sprung zwischen linker und rechter sowie oberer und unterer Hälfte.
      img.data[i] = x < W / 2 ? 20 : 220;
      img.data[i + 1] = y < H / 2 ? 30 : 210;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  const mitteVorher = [...img.data.slice((32 * W + 32) * 4, (32 * W + 32) * 4 + 4)];
  blendSeams(img, margin);
  for (let y = 0; y < H; y++) {
    for (let c = 0; c < 3; c++) {
      const links = img.data[(y * W) * 4 + c], rechts = img.data[(y * W + W - 1) * 4 + c];
      assertTrue(Math.abs(links - rechts) <= 8, `Zeile ${y}, Kanal ${c}: ${links} gegen ${rechts}`);
    }
  }
  for (let x = 0; x < W; x++) {
    for (let c = 0; c < 3; c++) {
      const oben = img.data[x * 4 + c], unten = img.data[((H - 1) * W + x) * 4 + c];
      assertTrue(Math.abs(oben - unten) <= 8, `Spalte ${x}, Kanal ${c}: ${oben} gegen ${unten}`);
    }
  }
  assertEqual([...img.data.slice((32 * W + 32) * 4, (32 * W + 32) * 4 + 4)], mitteVorher);
});

test('environment: jedes Menü zeigt ein vorhandenes Motiv', () => {
  for (const [screen, scene] of Object.entries(MENU_SCENES)) {
    assertTrue(SCENE_CELLS[scene] !== undefined, `${screen}: unbekanntes Motiv ${scene}`);
  }
  for (const [scene, cell] of Object.entries(SCENE_CELLS)) {
    assertTrue(cell.col >= 0 && cell.col <= 2, `${scene}: Spalte`);
    assertTrue(cell.row >= 0 && cell.row <= 1, `${scene}: Zeile`);
  }
});

test('environment: ein Baum verdeckt den Helden nur, wenn er davor steht', () => {
  const rect = { x: 100, y: 50, w: 80, h: 200 };
  assertEqual(occludesHero(rect, { x: 140, y: 200 }, true), true);
  assertEqual(occludesHero(rect, { x: 140, y: 200 }, false), false);
  assertEqual(occludesHero(rect, { x: 40, y: 200 }, true), false);
  assertEqual(occludesHero(rect, { x: 140, y: 300 }, true), false);
});
