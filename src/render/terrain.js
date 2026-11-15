import * as THREE from '../../vendor/three.module.min.js';
import { obstaclesNear } from '../core/terrain.js';
import { obstacleSprite, decoInCell, occludesHero } from '../core/environment.js';
import { createRng } from '../core/rng.js';
import { TERRAIN_CELL } from '../data/terrain.js';
import { ENV_SPRITES, GROUND } from '../data/environment.js';
import { BILLBOARD } from '../data/sprites.js';
import { billboardOrientation, spriteUv, spriteWidth, spriteMaterial, shadowMaterial } from './sprites.js';

/** Zellen in jede Richtung um die Heldenzelle, die gebaut bleiben. */
const VIEW_CELLS = 3;
const TILE_SEGMENTS = 12;
/** Wiederholungen der Grastextur je Zelle (4 m je Kachel). */
const GRASS_REPEAT = TERRAIN_CELL / 4;

/** Gemalte Bäume und Felsen: Bildhöhe mal Hindernisradius geteilt durch diesen Normradius. */
const SPRITE_SCALE_RADIUS = { tree: 0.75, 'fels-gross': 1.25, 'fels-klein': 0.95 };
/** Deckkraft eines Baumes, der den Helden verdeckt, und die Zeit (s) für das Überblenden. */
const PAINTED_FADE_OPACITY = 0.35;
const PAINTED_FADE_SECONDS = 0.2;
/** Nur Bäume so nah am Helden können ihn überhaupt verdecken; weiter entfernte werden nicht geprüft. */
const OCCLUSION_RANGE = 14;
/** Höhe des Punktes am Helden, der frei sichtbar bleiben soll (m). */
const HERO_POINT_HEIGHT = 1.1;

const GRASS_LUSH = new THREE.Color(0x5d7040);
const GRASS_DRY = new THREE.Color(0x8a8a55);
const GRASS_DARK = new THREE.Color(0x46573a);
const SOIL = new THREE.Color(0x76694f);

/** Kronenstufen als [Radius, Höhe der Basis, Kegelhöhe] in Vielfachen von s = Stammradius / 0.75. */
const CANOPY_TIERS = [[2.6, 1.3, 2.4], [2.0, 2.5, 2.2], [1.4, 3.6, 2.0], [0.8, 4.6, 1.6]];
/** Deckkraft ausgeblendeter Kronen. */
const CANOPY_FADED_OPACITY = 0.28;
/**
 * Ausblendbereich um den Helden in Vielfachen von s: bis FADE_FRONT vor ihm (Richtung Kamera, +z),
 * FADE_BEHIND hinter ihm und FADE_SIDE seitlich. Die Krone (Radius 2.6 s, Höhe 6.2 s) verdeckt bei
 * 55° Kameraneigung den Boden bis etwa 6.2 s / tan 55° ≈ 4.3 s hinter ihrem Fuß.
 */
const FADE_FRONT = 6.5;
const FADE_BEHIND = 1.5;
const FADE_SIDE = 2.8;

/** Deterministischer Hash eines Gitterpunkts nach [0,1). */
function hash2(seed, x, z) {
  let h = Math.imul(seed | 0, 0x27d4eb2d) ^ Math.imul(x | 0, 0x85ebca6b) ^ Math.imul(z | 0, 0xc2b2ae35);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12; h = Math.imul(h, 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Glatter Wertrauschen-Wert in [0,1) an Weltposition (x,z) bei Gitterweite `scale`. */
function valueNoise(seed, x, z, scale) {
  const fx = x / scale, fz = z / scale;
  const ix = Math.floor(fx), iz = Math.floor(fz);
  const tx = fx - ix, tz = fz - iz;
  const sx = tx * tx * (3 - 2 * tx), sz = tz * tz * (3 - 2 * tz);
  const a = hash2(seed, ix, iz), b = hash2(seed, ix + 1, iz);
  const c = hash2(seed, ix, iz + 1), d = hash2(seed, ix + 1, iz + 1);
  return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sz;
}

/** Kleine, kachelbare Grastextur in Grautönen; der Farbton kommt aus den Vertexfarben. */
function makeGrassTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d');
  g.fillStyle = '#c8c8c0';
  g.fillRect(0, 0, size, size);
  const rng = createRng(4711);
  // Halme: kurze Striche, an den Rändern umbrochen, damit die Kachel nahtlos ist.
  for (let i = 0; i < 2600; i++) {
    const x = rng.next() * size, y = rng.next() * size;
    const len = 3 + rng.next() * 6, ang = -Math.PI / 2 + (rng.next() - 0.5) * 1.2;
    const v = Math.floor(150 + rng.next() * 105);
    const tint = Math.floor((rng.next() - 0.5) * 30);
    g.strokeStyle = `rgb(${v + tint},${v + 8},${v - 12 - tint})`;
    g.lineWidth = 1 + rng.next();
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      g.beginPath();
      g.moveTo(x + ox, y + oy);
      g.lineTo(x + ox + Math.cos(ang) * len, y + oy + Math.sin(ang) * len);
      g.stroke();
    }
  }
  // Ein paar dunkle Flecken für Bodenstruktur.
  for (let i = 0; i < 25; i++) {
    const x = rng.next() * size, y = rng.next() * size, r = 2 + rng.next() * 5;
    g.fillStyle = `rgba(90,80,60,${0.08 + rng.next() * 0.1})`;
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      g.beginPath(); g.arc(x + ox, y + oy, r, 0, Math.PI * 2); g.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(GRASS_REPEAT, GRASS_REPEAT);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Felsform: verformtes Ikosaeder, Grundfläche auf Radius 1 normiert. */
function makeRockGeometry(variant) {
  const geo = new THREE.IcosahedronGeometry(1, 1);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  let maxR = 0;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // Gleiche Ecke → gleiche Verschiebung, damit das Netz geschlossen bleibt.
    const k = hash2(variant * 977 + 13, Math.round(v.x * 1000), Math.round(v.y * 1000) * 31 + Math.round(v.z * 1000));
    v.multiplyScalar(0.78 + 0.4 * k);
    v.y = v.y * 0.62 + 0.18;
    if (v.y < 0) v.y *= 0.3;
    pos.setXYZ(i, v.x, v.y, v.z);
    maxR = Math.max(maxR, Math.hypot(v.x, v.z));
  }
  geo.scale(1 / maxR, 1 / maxR, 1 / maxR);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Bodenkacheln und Hindernisse um den Helden. Hindernisse kommen aus `obstaclesNear`, also genau
 * die Kreise der Kollision: Stammfuß und Felsgrundfläche haben etwa den Hindernisradius.
 *
 * Mit geladenen Umgebungsbildern (`env.ok`) sind Boden, Bäume, Felsen und Deko gemalt; sonst bleibt
 * alles bei den 3D-Formen.
 * @param {THREE.Scene} scene
 * @param {number} seed Geländestartwert
 * Optionen `obstacles` und `deco` ersetzen Hindernisse und Deko aus dem Seed (Abenteuer: Randbäume der Karte, Deko
 * nur im Wald).
 * @param {{ env?: import('./environment.js').Environment, camera?: THREE.Camera }} [options]
 * @returns {{ update(x: number, z: number, dt?: number): void, dispose(): void }}
 */
export function createTerrainView(scene, seed, { env, camera, obstacles = (x, z, r) => obstaclesNear(seed, x, z, r), deco = (cx, cz) => decoInCell(seed, cx, cz) } = {}) {
  const root = new THREE.Group();
  root.name = 'terrain';
  scene.add(root);

  const painted = !!env?.ok;
  const orient = painted ? billboardOrientation(camera) : null;

  let grassTex, groundMat;
  if (painted) {
    // Eigene Kopie: die Bodentextur gehört der App, die Kachelung soll sie nicht verändern.
    grassTex = env.ground.clone();
    grassTex.needsUpdate = true;
    grassTex.repeat.set(TERRAIN_CELL / GROUND.tileM, TERRAIN_CELL / GROUND.tileM);
    groundMat = new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1, metalness: 0 });
  } else {
    grassTex = makeGrassTexture();
    groundMat = new THREE.MeshStandardMaterial({ map: grassTex, vertexColors: true, roughness: 1, metalness: 0 });
  }
  const spriteMat = painted ? spriteMaterial(env.objects) : null;
  const blobMat = painted ? shadowMaterial() : null;
  const blobGeo = painted ? new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2) : null;
  /** Durchscheinende Gegenstücke je Baum entstehen erst beim ersten Ausblenden. */
  const fadeMats = [];

  const trunkGeo = new THREE.CylinderGeometry(0.42, 1, 1, 9).translate(0, 0.5, 0);
  const coneGeo = new THREE.ConeGeometry(1, 1, 9).translate(0, 0.5, 0);
  const rockGeos = [0, 1, 2, 3, 4, 5].map(makeRockGeometry);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3b2c, roughness: 0.95 });
  const needleMats = [0x2f4a2e, 0x38522f, 0x2a4433, 0x415a34]
    .map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true }));
  // Durchscheinende Gegenstücke der Kronen: Bäume zwischen Kamera und Held werden damit gezeichnet.
  const fadedMats = needleMats.map((m) => {
    const f = m.clone();
    f.transparent = true;
    f.opacity = CANOPY_FADED_OPACITY;
    f.depthWrite = false;
    return f;
  });
  const rockMats = [0x7c7a72, 0x6d6b64, 0x88847a, 0x75726a]
    .map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true }));

  /**
   * @typedef {{ x: number, z: number, s: number, cones: THREE.Mesh[], matIndex: number, faded: boolean }} TreeRecord
   * @type {Map<string, { group: THREE.Group, groundGeo: THREE.BufferGeometry, trees: TreeRecord[] }>}
   */
  const tiles = new Map();
  let lastCx = NaN, lastCz = NaN;

  function groundTile(cx, cz) {
    const geo = new THREE.PlaneGeometry(TERRAIN_CELL, TERRAIN_CELL, TILE_SEGMENTS, TILE_SEGMENTS);
    geo.rotateX(-Math.PI / 2);
    const ox = (cx + 0.5) * TERRAIN_CELL, oz = (cz + 0.5) * TERRAIN_CELL;
    if (painted) {
      // Gemalter Boden: die Farbe steckt im Bild, die Schattierung kommt weiter vom Licht.
      const mesh = new THREE.Mesh(geo, groundMat);
      mesh.position.set(ox, 0, oz);
      mesh.receiveShadow = true;
      return mesh;
    }
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const wx = pos.getX(i) + ox, wz = pos.getZ(i) + oz;
      const big = valueNoise(seed, wx, wz, 23);
      const mid = valueNoise(seed + 1, wx, wz, 7);
      const fine = valueNoise(seed + 2, wx, wz, 2.3);
      c.copy(GRASS_LUSH).lerp(GRASS_DRY, THREE.MathUtils.smoothstep(big, 0.35, 0.85) * 0.8);
      c.lerp(GRASS_DARK, THREE.MathUtils.smoothstep(mid, 0.55, 0.95) * 0.7);
      c.lerp(SOIL, THREE.MathUtils.smoothstep(fine * mid, 0.5, 0.75) * 0.6);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mesh = new THREE.Mesh(geo, groundMat);
    mesh.position.set(ox, 0, oz);
    mesh.receiveShadow = true;
    return mesh;
  }

  // ------------------------------------------------ Gemalte Umgebung

  const _v = new THREE.Vector3();

  /** Weltmaße eines gemalten Hindernisses: Bildhöhe mal Radius geteilt durch den Normradius der Art. */
  function paintedSize(id, radius, kind) {
    const def = ENV_SPRITES[id];
    const norm = SPRITE_SCALE_RADIUS[kind === 'tree' ? 'tree' : id] || 1;
    const k = radius / norm;
    return { def, width: spriteWidth(def) * k, height: def.heightM * k, foot: def.footOffset * k };
  }

  /**
   * Eine aufrechte Bildtafel am Boden: Rechteck in der festen Billboard-Ebene, Unterkante auf y = 0,
   * Standpunkt über der Bodenposition (wie bei Helden und Gegnern).
   */
  function paintedPanel(id, x, z, width, height, foot, mirror = false) {
    const def = ENV_SPRITES[id];
    const geo = new THREE.PlaneGeometry(width, height).translate(0, height / 2, 0);
    const { u0, v0, u1, v1 } = spriteUv(def, env.sizes.objekte);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const left = uv.getX(i) < 0.5;
      uv.setXY(i, (left !== mirror) ? u0 : u1, uv.getY(i) < 0.5 ? v0 : v1);
    }
    const mesh = new THREE.Mesh(geo, spriteMat);
    mesh.quaternion.copy(orient.quaternion);
    mesh.position.set(x + orient.foot.x * foot, 0, z + orient.foot.z * foot);
    return mesh;
  }

  /** Weicher Bodenschatten unter einem gemalten Gegenstand. */
  function paintedShadow(x, z, width) {
    const s = new THREE.Mesh(blobGeo, blobMat);
    s.position.set(x, 0.02, z);
    s.scale.set(width * BILLBOARD.shadowWidth * 2, 1, width * BILLBOARD.shadowDepth * 2);
    return s;
  }

  /** Baum oder Fels als Bild samt Bodenschatten. */
  function paintedObstacle(o) {
    const id = obstacleSprite(o);
    const { width, height, foot } = paintedSize(id, o.radius, o.kind);
    const group = new THREE.Group();
    const panel = paintedPanel(id, o.x, o.z, width, height, foot);
    group.add(paintedShadow(o.x, o.z, width), panel);
    return { group, panel, record: { x: o.x, z: o.z, width, height, panel, fade: 0, mat: null } };
  }

  /** Alle Deko einer Zelle in einem einzigen Netz, damit die Bildrate nicht an Zeichenaufrufen hängt. */
  function paintedDeco(cx, cz) {
    const list = deco(cx, cz);
    if (list.length === 0) return null;
    const count = list.length;
    const positions = new Float32Array(count * 4 * 3);
    const uvs = new Float32Array(count * 4 * 2);
    const index = new Uint16Array(count * 6);
    const up = _v.set(0, 1, 0).applyQuaternion(orient.quaternion).clone();
    const right = orient.right;
    list.forEach((d, i) => {
      const def = ENV_SPRITES[d.id];
      const w = spriteWidth(def), h = def.heightM, fo = def.footOffset;
      const bx = d.x + orient.foot.x * fo, bz = d.z + orient.foot.z * fo;
      const corners = [[-0.5, 0], [0.5, 0], [-0.5, 1], [0.5, 1]];
      const { u0, v0, u1, v1 } = spriteUv(def, env.sizes.objekte);
      corners.forEach(([sx, sy], c) => {
        const o3 = (i * 4 + c) * 3;
        positions[o3] = bx + right.x * sx * w + up.x * sy * h;
        positions[o3 + 1] = up.y * sy * h;
        positions[o3 + 2] = bz + right.z * sx * w + up.z * sy * h;
        const o2 = (i * 4 + c) * 2;
        uvs[o2] = (sx < 0) !== d.mirror ? u0 : u1;
        uvs[o2 + 1] = sy > 0 ? v1 : v0;
      });
      const b = i * 4;
      index.set([b, b + 1, b + 2, b + 2, b + 1, b + 3], i * 6);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(new THREE.BufferAttribute(index, 1));
    geo.computeBoundingSphere();
    return new THREE.Mesh(geo, spriteMat);
  }

  // ------------------------------------------------ 3D-Ersatzdarstellung

  /** @returns {{ group: THREE.Group, record: TreeRecord }} */
  function tree(o, h) {
    const g = new THREE.Group();
    g.position.set(o.x, 0, o.z);
    g.rotation.y = h * Math.PI * 2;
    const s = o.radius / 0.75;
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.scale.set(o.radius, 2.6 * s, o.radius);
    g.add(trunk);
    const matIndex = Math.floor(h * 97) % needleMats.length;
    const cones = [];
    for (const [r, y, ch] of CANOPY_TIERS) {
      const cone = new THREE.Mesh(coneGeo, needleMats[matIndex]);
      cone.position.y = y * s;
      cone.scale.set(r * s, ch * s, r * s);
      cone.rotation.y = h * 7 + y;
      g.add(cone);
      cones.push(cone);
    }
    g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    return { group: g, record: { x: o.x, z: o.z, s, cones, matIndex, faded: false } };
  }

  /**
   * Blendet Kronen aus, die zwischen Kamera und Held stehen. Die Kamera steht in +z-Richtung vom Helden
   * (siehe renderer.js), verdeckende Bäume liegen also knapp neben oder vor dem Helden in +z.
   */
  function fadeCanopies(x, z) {
    for (const tile of tiles.values()) {
      for (const t of tile.trees) {
        const dz = t.z - z, dx = Math.abs(t.x - x);
        const hide = dz > -FADE_BEHIND * t.s && dz < FADE_FRONT * t.s && dx < FADE_SIDE * t.s;
        if (hide === t.faded) continue;
        t.faded = hide;
        const m = (hide ? fadedMats : needleMats)[t.matIndex];
        for (const c of t.cones) c.material = m;
      }
    }
  }

  function rock(o, h) {
    const m = new THREE.Mesh(rockGeos[Math.floor(h * 61) % rockGeos.length], rockMats[Math.floor(h * 13) % rockMats.length]);
    m.position.set(o.x, 0, o.z);
    m.rotation.y = h * Math.PI * 2;
    m.scale.set(o.radius, o.radius * (0.8 + 0.5 * ((h * 7) % 1)), o.radius);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  function buildTile(cx, cz) {
    const group = new THREE.Group();
    const ground = groundTile(cx, cz);
    group.add(ground);
    const geos = [ground.geometry];
    const half = TERRAIN_CELL / 2;
    const near = obstacles((cx + 0.5) * TERRAIN_CELL, (cz + 0.5) * TERRAIN_CELL, half * Math.SQRT2);
    const trees = [];
    for (const o of near) {
      // Nur Hindernisse, deren Mittelpunkt in dieser Zelle liegt; Nachbarn baut deren Zelle.
      if (Math.floor(o.x / TERRAIN_CELL) !== cx || Math.floor(o.z / TERRAIN_CELL) !== cz) continue;
      if (painted) {
        const p = paintedObstacle(o);
        group.add(p.group);
        geos.push(p.panel.geometry);
        if (o.kind === 'tree') trees.push(p.record);
        continue;
      }
      const h = hash2(seed, Math.round(o.x * 100), Math.round(o.z * 100));
      if (o.kind === 'tree') {
        const t = tree(o, h);
        group.add(t.group);
        trees.push(t.record);
      } else {
        group.add(rock(o, h));
      }
    }
    if (painted) {
      const deco = paintedDeco(cx, cz);
      if (deco) { group.add(deco); geos.push(deco.geometry); }
    }
    root.add(group);
    return { group, geos, trees };
  }

  function removeTile(key) {
    const t = tiles.get(key);
    root.remove(t.group);
    for (const g of t.geos) g.dispose();
    tiles.delete(key);
  }

  const _p = new THREE.Vector3(), _hero = new THREE.Vector3();

  /**
   * Gemalte Bäume, die den Helden auf dem Bildschirm überdecken und näher an der Kamera stehen,
   * werden weich durchscheinend. Geprüft wird über `occludesHero` mit den Bildschirmrechtecken;
   * weit entfernte Bäume können den Helden nicht verdecken und bleiben ungeprüft.
   */
  function fadePaintedTrees(x, z, dt) {
    if (!camera) return;
    _hero.set(x, HERO_POINT_HEIGHT, z).project(camera);
    const heroPoint = { x: _hero.x, y: -_hero.y };
    const heroDepth = _hero.z;
    const step = dt > 0 ? Math.min(1, dt / PAINTED_FADE_SECONDS) : 1;
    for (const tile of tiles.values()) {
      for (const t of tile.trees) {
        let target = 0;
        if (Math.abs(t.x - x) < OCCLUSION_RANGE && Math.abs(t.z - z) < OCCLUSION_RANGE) {
          const half = t.width / 2;
          _p.set(t.x - half, 0, t.z).project(camera);
          const left = _p.x, bottom = -_p.y, depth = _p.z;
          _p.set(t.x + half, t.height, t.z).project(camera);
          const rect = { x: Math.min(left, _p.x), y: Math.min(bottom, -_p.y), w: Math.abs(_p.x - left), h: Math.abs(-_p.y - bottom) };
          if (occludesHero(rect, heroPoint, depth < heroDepth)) target = 1;
        }
        if (t.fade === target) continue;
        t.fade += (target - t.fade) * step;
        if (Math.abs(t.fade - target) < 0.01) t.fade = target;
        applyFade(t);
      }
    }
  }

  /** Setzt die Deckkraft eines Baumes; das durchscheinende Material entsteht erst, wenn es gebraucht wird. */
  function applyFade(t) {
    if (t.fade <= 0) {
      if (t.mat) {
        // Wieder deckend: das durchscheinende Material freigeben, damit es sich im Durchgang nicht ansammelt.
        t.panel.material = spriteMat;
        t.mat.dispose();
        fadeMats.splice(fadeMats.indexOf(t.mat), 1);
        t.mat = null;
      }
      return;
    }
    if (!t.mat) {
      // Durchscheinend wird echt gemischt: die Alpha-Schwelle des deckenden Materials würde beim
      // Abblenden jedes Pixel verwerfen (Deckkraft 0,35 liegt unter der Schwelle 0,4).
      t.mat = spriteMat.clone();
      t.mat.transparent = true;
      t.mat.alphaToCoverage = false;
      t.mat.alphaTest = 0.05;
      t.mat.depthWrite = false;
      fadeMats.push(t.mat);
    }
    t.mat.opacity = 1 - t.fade * (1 - PAINTED_FADE_OPACITY);
    t.panel.material = t.mat;
  }

  /**
   * Baut Zellen im Umkreis von VIEW_CELLS um (x,z), entfernt weiter entfernte und blendet
   * Baumkronen zwischen Kamera und (x,z) aus. Jedes Bild mit der Heldenposition aufrufen.
   * @param {number} x @param {number} z @param {number} [dt] vergangene Zeit (s) für das Überblenden
   */
  function update(x, z, dt = 0) {
    const cx = Math.floor(x / TERRAIN_CELL), cz = Math.floor(z / TERRAIN_CELL);
    if (cx !== lastCx || cz !== lastCz) {
      lastCx = cx; lastCz = cz;
      for (const key of [...tiles.keys()]) {
        const [kx, kz] = key.split(',').map(Number);
        if (Math.abs(kx - cx) > VIEW_CELLS || Math.abs(kz - cz) > VIEW_CELLS) removeTile(key);
      }
      for (let ix = cx - VIEW_CELLS; ix <= cx + VIEW_CELLS; ix++) {
        for (let iz = cz - VIEW_CELLS; iz <= cz + VIEW_CELLS; iz++) {
          const key = ix + ',' + iz;
          if (!tiles.has(key)) tiles.set(key, buildTile(ix, iz));
        }
      }
    }
    if (painted) fadePaintedTrees(x, z, dt);
    else fadeCanopies(x, z);
  }

  function dispose() {
    for (const key of [...tiles.keys()]) removeTile(key);
    scene.remove(root);
    // Die gemalten Bilder gehören der App (einmal geladen) und bleiben; freigegeben wird nur die eigene Kopie.
    grassTex.dispose();
    groundMat.dispose();
    spriteMat?.dispose();
    blobMat?.dispose();
    blobGeo?.dispose();
    for (const m of fadeMats) m.dispose();
    trunkGeo.dispose();
    coneGeo.dispose();
    for (const g of rockGeos) g.dispose();
    trunkMat.dispose();
    for (const m of needleMats) m.dispose();
    for (const m of fadedMats) m.dispose();
    for (const m of rockMats) m.dispose();
  }

  return { update, dispose };
}
