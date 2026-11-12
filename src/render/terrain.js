import * as THREE from '../../vendor/three.module.min.js';
import { obstaclesNear } from '../core/terrain.js';
import { createRng } from '../core/rng.js';
import { TERRAIN_CELL } from '../data/terrain.js';

/** Zellen in jede Richtung um die Heldenzelle, die gebaut bleiben. */
const VIEW_CELLS = 3;
const TILE_SEGMENTS = 12;
/** Wiederholungen der Grastextur je Zelle (4 m je Kachel). */
const GRASS_REPEAT = TERRAIN_CELL / 4;

const GRASS_LUSH = new THREE.Color(0x5d7040);
const GRASS_DRY = new THREE.Color(0x8a8a55);
const GRASS_DARK = new THREE.Color(0x46573a);
const SOIL = new THREE.Color(0x76694f);

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
 * @param {THREE.Scene} scene
 * @param {number} seed Geländestartwert
 * @returns {{ update(x: number, z: number): void, dispose(): void }}
 */
export function createTerrainView(scene, seed) {
  const root = new THREE.Group();
  root.name = 'terrain';
  scene.add(root);

  const grassTex = makeGrassTexture();
  const groundMat = new THREE.MeshStandardMaterial({ map: grassTex, vertexColors: true, roughness: 1, metalness: 0 });

  const trunkGeo = new THREE.CylinderGeometry(0.42, 1, 1, 9).translate(0, 0.5, 0);
  const coneGeo = new THREE.ConeGeometry(1, 1, 9).translate(0, 0.5, 0);
  const rockGeos = [0, 1, 2, 3, 4, 5].map(makeRockGeometry);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3b2c, roughness: 0.95 });
  const needleMats = [0x2f4a2e, 0x38522f, 0x2a4433, 0x415a34]
    .map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, flatShading: true }));
  const rockMats = [0x7c7a72, 0x6d6b64, 0x88847a, 0x75726a]
    .map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true }));

  /** @type {Map<string, { group: THREE.Group, groundGeo: THREE.BufferGeometry }>} */
  const tiles = new Map();
  let lastCx = NaN, lastCz = NaN;

  function groundTile(cx, cz) {
    const geo = new THREE.PlaneGeometry(TERRAIN_CELL, TERRAIN_CELL, TILE_SEGMENTS, TILE_SEGMENTS);
    geo.rotateX(-Math.PI / 2);
    const ox = (cx + 0.5) * TERRAIN_CELL, oz = (cz + 0.5) * TERRAIN_CELL;
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

  function tree(o, h) {
    const g = new THREE.Group();
    g.position.set(o.x, 0, o.z);
    g.rotation.y = h * Math.PI * 2;
    const s = o.radius / 0.75;
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.scale.set(o.radius, 2.6 * s, o.radius);
    g.add(trunk);
    const mat = needleMats[Math.floor(h * 97) % needleMats.length];
    const tiers = [[2.6, 1.3, 2.4], [2.0, 2.5, 2.2], [1.4, 3.6, 2.0], [0.8, 4.6, 1.6]];
    for (const [r, y, ch] of tiers) {
      const cone = new THREE.Mesh(coneGeo, mat);
      cone.position.y = y * s;
      cone.scale.set(r * s, ch * s, r * s);
      cone.rotation.y = h * 7 + y;
      g.add(cone);
    }
    g.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    return g;
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
    const half = TERRAIN_CELL / 2;
    const near = obstaclesNear(seed, (cx + 0.5) * TERRAIN_CELL, (cz + 0.5) * TERRAIN_CELL, half * Math.SQRT2);
    for (const o of near) {
      // Nur Hindernisse, deren Mittelpunkt in dieser Zelle liegt; Nachbarn baut deren Zelle.
      if (Math.floor(o.x / TERRAIN_CELL) !== cx || Math.floor(o.z / TERRAIN_CELL) !== cz) continue;
      const h = hash2(seed, Math.round(o.x * 100), Math.round(o.z * 100));
      group.add(o.kind === 'tree' ? tree(o, h) : rock(o, h));
    }
    root.add(group);
    return { group, groundGeo: ground.geometry };
  }

  function removeTile(key) {
    const t = tiles.get(key);
    root.remove(t.group);
    t.groundGeo.dispose();
    tiles.delete(key);
  }

  /** Baut Zellen im Umkreis von VIEW_CELLS um (x,z) und entfernt weiter entfernte. */
  function update(x, z) {
    const cx = Math.floor(x / TERRAIN_CELL), cz = Math.floor(z / TERRAIN_CELL);
    if (cx === lastCx && cz === lastCz) return;
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

  function dispose() {
    for (const key of [...tiles.keys()]) removeTile(key);
    scene.remove(root);
    grassTex.dispose();
    groundMat.dispose();
    trunkGeo.dispose();
    coneGeo.dispose();
    for (const g of rockGeos) g.dispose();
    trunkMat.dispose();
    for (const m of needleMats) m.dispose();
    for (const m of rockMats) m.dispose();
  }

  return { update, dispose };
}
