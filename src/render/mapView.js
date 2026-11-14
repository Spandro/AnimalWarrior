// Darstellung einer Abenteuer-Karte: Gras, Randbäume und Deko über die Geländeansicht (src/render/terrain.js), darauf
// Weg, Bach, Brücken, Häuser, Leute, Lagerfeuer, Kisten, Fundorte und Tore. Solange die Bilder des Abenteuers fehlen,
// sind Häuser, Leute und Gegenstände einfache 3D-Formen. Liest den Lauf nur.
import * as THREE from '../../vendor/three.module.min.js';
import { createTerrainView } from './terrain.js';
import { borderDecor, cellAt, CELL } from '../core/mapGrid.js';
import { decoInCell } from '../core/environment.js';
import { npcState } from '../core/quests.js';
import { isGateClosed } from '../modes/adventure.js';
import { TERRAIN_CELL } from '../data/terrain.js';
import { MAP_LOOK } from '../data/adventure.js';

const JOINT_SEGMENTS = 12;

/**
 * Dreiecke eines Streifens (Linienzug mit Breite) als flaches Netz in Höhe `y`, mit runden Gelenken.
 * @param {[number, number][]} points
 * @param {number} width
 * @param {number} y
 */
function stripGeometry(points, width, y) {
  const pos = [];
  const half = width / 2;
  const tri = (a, b, c) => pos.push(a[0], y, a[1], b[0], y, b[1], c[0], y, c[1]);
  for (let i = 0; i + 1 < points.length; i++) {
    const [ax, az] = points[i], [bx, bz] = points[i + 1];
    const len = Math.hypot(bx - ax, bz - az) || 1;
    const nx = (-(bz - az) / len) * half, nz = ((bx - ax) / len) * half;
    const p1 = [ax + nx, az + nz], p2 = [ax - nx, az - nz], p3 = [bx - nx, bz - nz], p4 = [bx + nx, bz + nz];
    tri(p1, p4, p2); tri(p2, p4, p3);
  }
  for (const [cx, cz] of points) {
    for (let k = 0; k < JOINT_SEGMENTS; k++) {
      const a0 = (k / JOINT_SEGMENTS) * Math.PI * 2, a1 = ((k + 1) / JOINT_SEGMENTS) * Math.PI * 2;
      tri([cx, cz], [cx + Math.cos(a1) * half, cz + Math.sin(a1) * half], [cx + Math.cos(a0) * half, cz + Math.sin(a0) * half]);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Text auf einer Tafel, die immer zur Kamera zeigt (für „!“ und „?“ über den Leuten). */
function markerSprite(text, color) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(30,24,16,0.75)';
  g.beginPath(); g.arc(32, 32, 28, 0, Math.PI * 2); g.fill();
  g.fillStyle = color;
  g.font = 'bold 44px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 32, 35);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
  sprite.scale.set(0.9, 0.9, 1);
  sprite.renderOrder = 10;
  return sprite;
}

/**
 * @param {THREE.Scene} scene
 * @param {import('../data/maps/index.js').MapDef} map
 * @param {import('../core/mapGrid.js').MapGrid} grid
 * @param {{ env?: import('./environment.js').Environment, camera?: THREE.Camera, seed: number }} options
 * @returns {{ update(run: import('../modes/adventure.js').AdventureRun, heroX: number, heroZ: number, dt: number): void, dispose(): void }}
 */
export function createMapView(scene, map, grid, { env, camera, seed }) {
  // Randbäume und -felsen als Hindernisse der Geländeansicht, nach Geländezellen sortiert.
  const buckets = new Map();
  const key = (cx, cz) => `${cx},${cz}`;
  const addObstacle = (o) => {
    const k = key(Math.floor(o.x / TERRAIN_CELL), Math.floor(o.z / TERRAIN_CELL));
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(o);
  };
  for (const d of borderDecor(grid, seed)) addObstacle({ x: d.x, z: d.z, radius: MAP_LOOK.borderRadius[d.kind], kind: d.kind });
  for (const o of map.obstacles) addObstacle(o);
  const obstacles = (x, z, r) => {
    const out = [];
    const c0 = Math.floor((x - r - 2) / TERRAIN_CELL), c1 = Math.floor((x + r + 2) / TERRAIN_CELL);
    const r0 = Math.floor((z - r - 2) / TERRAIN_CELL), r1 = Math.floor((z + r + 2) / TERRAIN_CELL);
    for (let cx = c0; cx <= c1; cx++) for (let cz = r0; cz <= r1; cz++) {
      for (const o of buckets.get(key(cx, cz)) ?? []) if (Math.hypot(o.x - x, o.z - z) <= r + o.radius) out.push(o);
    }
    return out;
  };
  const deco = (cx, cz) => decoInCell(seed, cx, cz).filter((d) => cellAt(grid, d.x, d.z) === CELL.blocked);
  const terrain = createTerrainView(scene, seed, { env, camera, obstacles, deco });

  const root = new THREE.Group();
  root.name = 'map';
  scene.add(root);
  const owned = [];
  const own = (x) => (owned.push(x), x);
  const std = (color, extra = {}) => own(new THREE.MeshStandardMaterial({ color, roughness: 0.95, ...extra }));
  const flat = (geo, material, order) => {
    const m = new THREE.Mesh(own(geo), material);
    m.receiveShadow = true;
    m.renderOrder = order;
    root.add(m);
    return m;
  };
  const layer = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 };
  for (const p of map.paths) flat(stripGeometry(p.points, p.width * MAP_LOOK.pathWidthShare, 0.015), std(MAP_LOOK.path, layer), 1);
  const waterMat = std(MAP_LOOK.water, { ...layer, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.88 });
  for (const w of map.water) flat(stripGeometry(w.points, w.width, 0.025), waterMat, 2);
  for (const b of map.bridges) flat(stripGeometry(b.points, b.width, 0.09), std(MAP_LOOK.bridge, layer), 3);

  // Häuser und Kleinkram (3D-Ersatz, bis `dorf.webp` da ist).
  const box = (w, h, d, color) => { const m = new THREE.Mesh(own(new THREE.BoxGeometry(w, h, d)), std(color)); m.position.y = h / 2; m.castShadow = true; return m; };
  const cyl = (r, h, color, seg = 10) => { const m = new THREE.Mesh(own(new THREE.CylinderGeometry(r, r, h, seg)), std(color)); m.position.y = h / 2; m.castShadow = true; return m; };
  const roof = (r, h, color) => { const m = new THREE.Mesh(own(new THREE.ConeGeometry(r, h, 4)), std(color)); m.rotation.y = Math.PI / 4; m.castShadow = true; return m; };
  function prop(kind) {
    const g = new THREE.Group();
    const look = MAP_LOOK.props[kind];
    if (look?.house) {
      const [w, h, d] = look.house;
      const body = box(w, h, d, look.wall);
      const top = roof(Math.max(w, d) * 0.8, h * 0.7, look.roof);
      top.position.y = h + h * 0.35;
      g.add(body, top);
    } else if (kind === 'brunnen') {
      g.add(cyl(1.2, 0.8, 0x8a8478, 14));
      const r = roof(1.6, 0.9, 0x6b4a2b); r.position.y = 2.4; g.add(r);
      for (const s of [-1, 1]) { const post = cyl(0.08, 2.2, 0x5a3e24, 6); post.position.set(s * 1.1, 1.1, 0); g.add(post); }
    } else if (kind === 'wegweiser') {
      g.add(cyl(0.08, 1.8, 0x5a3e24, 6));
      const sign = box(1.1, 0.3, 0.06, 0x8a6a45); sign.position.y = 1.5; g.add(sign);
    } else if (kind === 'zaun') {
      for (let i = -2; i <= 2; i++) { const post = cyl(0.06, 0.9, 0x6b4a2b, 6); post.position.x = i * 0.8; g.add(post); }
      const rail = box(3.4, 0.08, 0.06, 0x7a5530); rail.position.y = 0.65; g.add(rail);
    }
    return g;
  }
  for (const p of map.props) {
    const g = prop(p.kind);
    g.position.set(p.x, 0, p.z);
    root.add(g);
  }

  // Leute: Körper und Kopf in ihrer Farbe, darüber „!“ oder „?“.
  const markers = {};
  const offerMarker = markerSprite('!', '#ffd34d'), turnInMarker = markerSprite('?', '#9fe07a');
  owned.push(offerMarker.material, offerMarker.material.map, turnInMarker.material, turnInMarker.material.map);
  for (const n of map.npcs) {
    const g = new THREE.Group();
    const color = MAP_LOOK.npcs[n.id] ?? 0xb08860;
    const body = new THREE.Mesh(own(new THREE.CapsuleGeometry(0.35, 0.6, 4, 10)), std(color));
    body.position.y = 0.65; body.castShadow = true;
    const head = new THREE.Mesh(own(new THREE.SphereGeometry(0.3, 12, 10)), std(color));
    head.position.y = 1.35; head.castShadow = true;
    g.add(body, head);
    g.position.set(n.x, 0, n.z);
    root.add(g);
    const offer = offerMarker.clone(), turn = turnInMarker.clone();
    offer.position.set(n.x, 2.2, n.z); turn.position.set(n.x, 2.2, n.z);
    offer.visible = turn.visible = false;
    root.add(offer, turn);
    markers[n.id] = { offer, turn };
  }

  // Lagerfeuer: Steinkreis, Holz, Flamme, sobald bekannt.
  const fires = {};
  const flameMat = std(0xff9a3a, { emissive: 0xff6a10, emissiveIntensity: 1.4, roughness: 0.6 });
  for (const c of map.campfires) {
    const g = new THREE.Group();
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      const stone = new THREE.Mesh(own(new THREE.SphereGeometry(0.16, 6, 5)), std(0x8a8478));
      stone.position.set(Math.cos(a) * 0.55, 0.08, Math.sin(a) * 0.55);
      g.add(stone);
    }
    for (const r of [0.4, -0.4]) { const log = cyl(0.08, 0.9, 0x5a3e24, 6); log.rotation.z = Math.PI / 2; log.rotation.y = r; log.position.y = 0.1; g.add(log); }
    const flame = new THREE.Mesh(own(new THREE.ConeGeometry(0.32, 0.8, 8)), flameMat);
    flame.position.y = 0.5;
    g.add(flame);
    g.position.set(c.x, 0, c.z);
    root.add(g);
    fires[c.id] = flame;
  }

  // Kisten und Fundorte.
  const chests = {};
  for (const c of map.chests) {
    const g = new THREE.Group();
    g.add(box(0.9, 0.55, 0.6, 0x7a5530));
    const lid = box(0.92, 0.18, 0.62, 0x8f6a3c);
    lid.position.y = 0.64;
    g.add(lid);
    g.position.set(c.x, 0, c.z);
    root.add(g);
    chests[c.id] = lid;
  }
  const spots = {};
  for (const s of map.spots) {
    const m = s.kind === 'hammer' ? box(0.7, 0.25, 0.25, 0x77767a) : new THREE.Mesh(own(new THREE.SphereGeometry(0.45, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2)), std(0x5e4630));
    m.position.set(s.x, s.kind === 'hammer' ? 0.12 : 0, s.z);
    root.add(m);
    spots[s.id] = m;
  }

  // Tore: Sperre aus Treibholz, Arena als durchscheinende Wasserwand.
  const gates = {};
  const wallMat = std(0x6fb4e0, { transparent: true, opacity: 0.45, emissive: 0x2a6a9a, emissiveIntensity: 0.6, side: THREE.DoubleSide, depthWrite: false });
  for (const gate of map.gates) {
    const g = new THREE.Group();
    for (let i = 0; i + 1 < gate.points.length; i++) {
      const [ax, az] = gate.points[i], [bx, bz] = gate.points[i + 1];
      const len = Math.hypot(bx - ax, bz - az);
      if (gate.kind === 'arena') {
        const wall = new THREE.Mesh(own(new THREE.PlaneGeometry(len, 2.4)), wallMat);
        wall.position.set((ax + bx) / 2, 1.2, (az + bz) / 2);
        wall.rotation.y = -Math.atan2(bz - az, bx - ax);
        g.add(wall);
      } else {
        const n = Math.max(2, Math.round(len / 0.7));
        for (let k = 0; k <= n; k++) {
          const t = k / n, post = cyl(0.18, 1.6 + (k % 2) * 0.4, 0x6b5238, 7);
          post.position.x = ax + (bx - ax) * t; post.position.z = az + (bz - az) * t;
          post.rotation.z = (k % 3 - 1) * 0.15;
          g.add(post);
        }
      }
    }
    root.add(g);
    gates[gate.id] = g;
  }

  let time = 0;
  return {
    /**
     * @param {import('../modes/adventure.js').AdventureRun} run
     * @param {number} heroX
     * @param {number} heroZ
     * @param {number} dt
     */
    update(run, heroX, heroZ, dt) {
      time += dt;
      terrain.update(heroX, heroZ, dt);
      const rec = run.record;
      for (const [id, m] of Object.entries(markers)) {
        const state = npcState(rec.quests, id);
        m.offer.visible = state === 'offer';
        m.turn.visible = state === 'turnIn';
        const bob = 2.2 + 0.08 * Math.sin(time * 3);
        m.offer.position.y = m.turn.position.y = bob;
      }
      for (const [id, flame] of Object.entries(fires)) {
        flame.visible = rec.campfires.includes(id);
        flame.scale.set(1, 0.85 + 0.2 * Math.sin(time * 9 + id.length), 1);
      }
      for (const [id, lid] of Object.entries(chests)) lid.rotation.x = rec.chests.includes(id) ? -1.1 : 0;
      for (const [id, m] of Object.entries(spots)) m.visible = !rec.found.includes(id);
      for (const gate of run.map.gates) gates[gate.id].visible = isGateClosed(run, gate.id);
    },
    dispose() {
      terrain.dispose();
      scene.remove(root);
      for (const x of owned) x?.dispose?.();
    },
  };
}
