// Darstellung einer Abenteuer-Karte: Gras, Randbäume und Deko über die Geländeansicht (src/render/terrain.js), darauf
// Weg, Bach, Schlamm, Brücken, Stege, Häuser, Leute, Lagerfeuer, Kisten, Fundorte und Tore. Mit geladenen Bildern sind
// Häuser, Kleinkram, Lagerfeuer, Kisten, Nussverstecke und Barrikaden gemalte Tafeln aus `dorf.webp`, die Leute aus
// `bewohner.webp`/`bewohner2.webp`, Krönungsschild und Kulissen am Rand des Sumpfs aus `sumpf.webp`, und Weg, Bach,
// Schlamm und Stege mit Kacheln belegt; fehlt ein Bild, bleibt es dort bei einfachen 3D-Formen, Randbäumen, gezeichneten
// Brettern und Farbflächen. Liest den Lauf nur.
import * as THREE from '../../vendor/three.module.min.js';
import { createTerrainView } from './terrain.js';
import { billboardOrientation, spriteUv, spriteWidth, spriteMaterial, shadowMaterial } from './sprites.js';
import { borderDecor, cellAt, CELL } from '../core/mapGrid.js';
import { decoInCell, borderScenery } from '../core/environment.js';
import { npcState } from '../core/quests.js';
import { isGateClosed, exitOpen, npcVisible } from '../modes/adventure.js';
import { TERRAIN_CELL } from '../data/terrain.js';
import { MAP_LOOK } from '../data/adventure.js';
import { TRAIL_TILES } from '../data/environment.js';
import { BILLBOARD, NPC_SPRITES, VILLAGE_SPRITES, PROP_SPRITES, SWAMP_SPRITES, MAP_SCENERY, FIRE_FLICKER, IDLE } from '../data/sprites.js';

const JOINT_SEGMENTS = 12;

/**
 * Dreiecke eines Streifens (Linienzug mit Breite) als flaches Netz in Höhe `y`, mit runden Gelenken. Die Bildkoordinaten
 * folgen der Welt (eine Kachel je `tileM` Meter), damit eine Kachel nahtlos über alle Abschnitte läuft.
 * @param {[number, number][]} points
 * @param {number} width
 * @param {number} y
 * @param {number} [tileM]
 */
function stripGeometry(points, width, y, tileM = 1) {
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
  const uv = [];
  for (let i = 0; i < pos.length; i += 3) uv.push(pos[i] / tileM, -pos[i + 2] / tileM);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

/** Viereck entlang der Strecke a → b: u läuft in Flussrichtung (je `tileM` Meter eine Kachel), v quer. */
function segmentQuad(a, b, width, y, tileM) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const nx = (-(b[1] - a[1]) / len) * width / 2, nz = ((b[0] - a[0]) / len) * width / 2;
  const p = [[a[0] + nx, a[1] + nz], [b[0] + nx, b[1] + nz], [b[0] - nx, b[1] - nz], [a[0] - nx, a[1] - nz]];
  const u = len / tileM;
  const pos = [], uv = [];
  for (const [i, uu, vv] of [[0, 0, 1], [1, u, 1], [3, 0, 0], [3, 0, 0], [1, u, 1], [2, u, 0]]) { pos.push(p[i][0], y, p[i][1]); uv.push(uu, vv); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

/** Helle Querstreifen für die Strömung (wandern beim Verschieben der Kachel in u-Richtung). */
function stripeTexture() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = MAP_LOOK.current.stripe;
  for (const [x, y, w] of [[6, 4, 10], [30, 14, 14], [48, 24, 9], [18, 26, 7]]) g.fillRect(x, y, w, 2);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/**
 * Bretter für die Brücke neben gemalten Wegen: Streifen quer zur Kachel in der Brückenfarbe, je Brett etwas heller oder
 * dunkler, mit dunklen Fugen und ein paar Maserungslinien.
 */
function plankTexture() {
  const { count, gap, spread } = MAP_LOOK.planks;
  const size = 256, w = size / count;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const base = new THREE.Color(MAP_LOOK.bridge), tone = new THREE.Color();
  for (let k = 0; k < count; k++) {
    const f = 1 + spread * Math.sin(k * 2.7 + 1.3);
    tone.copy(base).multiplyScalar(f);
    g.fillStyle = `#${tone.getHexString()}`;
    g.fillRect(k * w, 0, w, size);
    g.strokeStyle = 'rgba(40,24,10,0.25)';
    g.lineWidth = 1;
    for (let l = 0; l < 3; l++) {
      const x = k * w + w * (0.25 + 0.25 * l) + Math.sin(k + l) * 2;
      g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 3, size * 0.3, x - 3, size * 0.7, x, size); g.stroke();
    }
    g.fillStyle = `#${new THREE.Color(gap).getHexString()}`;
    g.fillRect(k * w, 0, 2, size);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
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
 * @param {{ env?: import('./environment.js').Environment, sprites?: import('./sprites.js').SpriteSheets,
 *   tiles?: import('./environment.js').TrailTiles, camera?: THREE.Camera, seed: number }} options
 * @returns {{ update(run: import('../modes/adventure.js').AdventureRun, heroX: number, heroZ: number, dt: number): void, dispose(): void }}
 */
export function createMapView(scene, map, grid, { env, sprites, tiles, camera, seed }) {
  // Randbäume und -felsen als Hindernisse der Geländeansicht, nach Geländezellen sortiert.
  const buckets = new Map();
  const key = (cx, cz) => `${cx},${cz}`;
  const addObstacle = (o) => {
    const k = key(Math.floor(o.x / TERRAIN_CELL), Math.floor(o.z / TERRAIN_CELL));
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(o);
  };
  // Keine Randbäume und -felsen an Häusern, Kleinkram, Leuten, Lagerfeuern, Kisten und Fundorten, im Bach oder auf Brücken.
  const nearStrip = (d, strips) => strips.some((st) => st.points.some((pt, i) => {
    const q = st.points[i + 1];
    if (!q) return false;
    const dx = q[0] - pt[0], dz = q[1] - pt[1], len2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((d.x - pt[0]) * dx + (d.z - pt[1]) * dz) / len2));
    return Math.hypot(d.x - pt[0] - dx * t, d.z - pt[1] - dz * t) < st.width / 2 + MAP_LOOK.borderRadius[d.kind];
  }));
  const cleared = (d) => map.props.some((p) => Math.hypot(d.x - p.x, d.z - p.z) < (MAP_LOOK.propClear[p.kind] ?? 0))
    || [map.npcs, map.campfires, map.chests, map.spots].some((list) => list.some((t) => Math.hypot(d.x - t.x, d.z - t.z) < MAP_LOOK.thingClear))
    || nearStrip(d, map.water) || nearStrip(d, map.bridges) || nearStrip(d, map.boardwalks ?? []);
  // Kulissen der Karte (Sumpf): ein Teil der Randbäume und -felsen wird zu Schilf, Seerosen, Moorbaum und Baumstumpf.
  const scenery = MAP_SCENERY[map.id];
  const sceneryTex = scenery ? sprites?.textures?.[scenery.sheet] : null;
  for (const d of borderDecor(grid, seed)) {
    if (cleared(d)) continue;
    const look = sceneryTex ? borderScenery(d, scenery) : null;
    const sprite = look ? { def: SWAMP_SPRITES[look.id], texture: sceneryTex, size: sprites.sizes[scenery.sheet], mirror: look.mirror } : undefined;
    addObstacle({ x: d.x, z: d.z, radius: MAP_LOOK.borderRadius[d.kind], kind: d.kind, sprite });
  }
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
  // Weg und Bach: Kacheln, wenn geladen, sonst Farbe.
  const pathMat = tiles?.weg ? std(0xffffff, { ...layer, map: tiles.weg, roughness: 1 }) : std(MAP_LOOK.path, layer);
  for (const p of map.paths) flat(stripGeometry(p.points, p.width * MAP_LOOK.pathWidthShare, 0.015, TRAIL_TILES.tileM.weg), pathMat, 1);
  const waterMat = tiles?.wasser
    ? std(0xffffff, { ...layer, map: tiles.wasser, roughness: 0.35, metalness: 0.05, transparent: true, opacity: TRAIL_TILES.waterOpacity })
    : std(MAP_LOOK.water, { ...layer, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.88 });
  for (const w of map.water) flat(stripGeometry(w.points, w.width, 0.025, TRAIL_TILES.tileM.wasser), waterMat, 2);
  // Schlamm (Kapitel 2) über Weg und Wasser: Kachel aus `schlamm.webp`, sonst braun-grüne Fläche.
  // Deckend: eine durchscheinende Fläche würde nach den Warnkreisen gezeichnet und sie blass überdecken.
  const mudMat = tiles?.schlamm ? std(0xffffff, { ...layer, map: tiles.schlamm, roughness: 0.6 }) : std(MAP_LOOK.mud.color, layer);
  for (const m of map.mud ?? []) flat(stripGeometry(m.points, m.width, MAP_LOOK.mud.y, TRAIL_TILES.tileM.schlamm), mudMat, 2);
  // Brücken mit gezeichneten Brettern (neben gemalten Wegen), Stege mit der Kachel aus `steg.webp`, sonst wie Brücken.
  const bridgeMat = tiles?.weg && (map.bridges.length || map.boardwalks?.length) ? std(0xffffff, { ...layer, map: own(plankTexture()) }) : std(MAP_LOOK.bridge, layer);
  for (const b of map.bridges) flat(stripGeometry(b.points, b.width, 0.09, MAP_LOOK.planks.tileM), bridgeMat, 3);
  const stegMat = tiles?.steg ? std(0xffffff, { ...layer, map: tiles.steg }) : bridgeMat;
  const stegTileM = tiles?.steg ? TRAIL_TILES.tileM.steg : MAP_LOOK.planks.tileM;
  for (const b of map.boardwalks ?? []) flat(stripGeometry(b.points, b.width, 0.09, stegTileM), stegMat, 3);

  // Strömung (Kapitel 3): blaue Fläche, darauf helle Streifen, die in Flussrichtung wandern (je Linienzug eine Kachel,
  // damit eine gedrehte Strömung gegenläufig wandern kann). Schleusenflächen haben je Zustand ihre eigene Fläche.
  const look = MAP_LOOK.current;
  const currentMat = std(look.color, { ...layer, roughness: 0.3 });
  const flows = [];
  const addCurrent = (strip, parent, y) => {
    const base = new THREE.Mesh(own(stripGeometry(strip.points, strip.width, y, look.tileM)), currentMat);
    base.renderOrder = 2;
    const tex = own(stripeTexture());
    const mat = std(0xffffff, { ...layer, map: tex, transparent: true, depthWrite: false, roughness: 0.3 });
    parent.add(base);
    for (let i = 0; i + 1 < strip.points.length; i++) {
      const m = new THREE.Mesh(own(segmentQuad(strip.points[i], strip.points[i + 1], strip.width, y + 0.005, look.tileM)), mat);
      m.renderOrder = 3;
      parent.add(m);
    }
    const mid = strip.points[Math.floor(strip.points.length / 2)];
    flows.push({ tex, x: mid[0], z: mid[1] });
  };
  for (const c of map.currents ?? []) addCurrent(c, root, look.y);
  const dryMat = std(MAP_LOOK.dryBed, layer);
  const sluiceViews = (map.sluices ?? []).map((sl) => {
    const view = { id: sl.id, open: new THREE.Group(), closed: new THREE.Group() };
    for (const state of ['open', 'closed']) {
      const kind = sl[state], group = view[state];
      for (const st of sl.strips) {
        if (kind === 'current') { addCurrent(st, group, look.y + 0.01); continue; }
        const mat = kind === 'water' ? waterMat : kind === 'mud' ? mudMat : dryMat;
        const m = new THREE.Mesh(own(stripGeometry(st.points, st.width, look.y + 0.01, kind === 'water' ? TRAIL_TILES.tileM.wasser : TRAIL_TILES.tileM.weg)), mat);
        m.renderOrder = 2;
        group.add(m);
      }
      root.add(group);
    }
    return view;
  });
  // Hebel: Pfosten mit Griff; der Griff steht schräg nach vorn (offen) oder hinten (zu).
  const levers = (map.sluices ?? []).filter((sl) => sl.lever).map((sl) => {
    const lv = MAP_LOOK.lever;
    const g = new THREE.Group();
    const base = new THREE.Mesh(own(new THREE.BoxGeometry(0.9, 0.3, 0.6)), std(lv.post));
    base.position.y = 0.15; base.castShadow = true;
    const pivot = new THREE.Group();
    pivot.position.y = 0.3;
    const handle = new THREE.Mesh(own(new THREE.CylinderGeometry(0.07, 0.07, 1.3, 8)), std(lv.handle));
    handle.position.y = 0.65; handle.castShadow = true;
    const knob = new THREE.Mesh(own(new THREE.SphereGeometry(0.14, 10, 8)), std(lv.handle));
    knob.position.y = 1.3;
    pivot.add(handle, knob);
    g.add(base, pivot);
    g.position.set(sl.lever.x, 0, sl.lever.z);
    root.add(g);
    return { id: sl.id, pivot };
  });

  // Ausgänge: heller Ring am Boden, nur solange der Ausgang offen ist.
  const exitMat = std(MAP_LOOK.exit.color, { ...layer, transparent: true, opacity: MAP_LOOK.exit.opacity, emissive: MAP_LOOK.exit.color, emissiveIntensity: 0.4, depthWrite: false });
  const exitRings = map.exits.map((x) => {
    const ring = new THREE.Mesh(own(new THREE.RingGeometry(x.r * 0.75, x.r, 32).rotateX(-Math.PI / 2)), exitMat);
    ring.position.set(x.x, 0.1, x.z);
    root.add(ring);
    return { exit: x, ring };
  });

  // Gemalte Tafeln wie die Bäume: fest zur Kamera geneigt, Standpunkt über der Bodenposition, weicher Bodenschatten.
  // `has(def)`: ist der Bogen dieses Bildes geladen?
  const has = (def) => !!(def && sprites?.textures?.[def.sheet]);
  const village = !!sprites?.textures?.dorf;
  const orient = sprites?.ok && Object.keys(sprites.textures ?? {}).length ? billboardOrientation(camera) : null;
  const sheetMats = {};
  const blobMat = orient ? own(shadowMaterial()) : null;
  const blobGeo = orient ? own(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)) : null;
  /**
   * @param {import('../data/sprites.js').PanelDef} def
   * @param {number} x @param {number} z
   * @param {boolean} [mirror] nach links blickend
   */
  function panel(def, x, z, mirror = false) {
    const material = sheetMats[def.sheet] ??= own(spriteMaterial(sprites.textures[def.sheet]));
    const w = spriteWidth(def), h = def.heightM;
    const geo = own(new THREE.PlaneGeometry(w, h).translate(0, h / 2, 0));
    const { u0, v0, u1, v1 } = spriteUv(def, sprites.sizes[def.sheet]);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) < 0.5) !== mirror ? u0 : u1, uv.getY(i) < 0.5 ? v0 : v1);
    const mesh = new THREE.Mesh(geo, material);
    mesh.quaternion.copy(orient.quaternion);
    mesh.position.set(x + orient.foot.x * def.footOffset, 0, z + orient.foot.z * def.footOffset);
    return mesh;
  }
  function shadow(x, z, width) {
    const s = new THREE.Mesh(blobGeo, blobMat);
    s.position.set(x, 0.02, z);
    s.scale.set(width * BILLBOARD.shadowWidth * 2, 1, width * BILLBOARD.shadowDepth * 2);
    return s;
  }
  /** Tafel samt Schatten als Gruppe. */
  function painted(def, x, z, mirror = false) {
    const g = new THREE.Group();
    const p = panel(def, x, z, mirror);
    g.add(shadow(x, z, spriteWidth(def)), p);
    g.userData.panel = p;
    return g;
  }

  // Häuser und Kleinkram (3D-Ersatz, wenn `dorf.webp` fehlt).
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
    } else if (kind === 'wegweiser' || kind === 'kroenungsschild') {
      g.add(cyl(0.08, 1.8, 0x5a3e24, 6));
      const sign = box(1.1, kind === 'wegweiser' ? 0.3 : 0.6, 0.06, 0x8a6a45); sign.position.y = 1.5; g.add(sign);
    } else if (kind === 'zaun') {
      for (let i = -2; i <= 2; i++) { const post = cyl(0.06, 0.9, 0x6b4a2b, 6); post.position.x = i * 0.8; g.add(post); }
      const rail = box(3.4, 0.08, 0.06, 0x7a5530); rail.position.y = 0.65; g.add(rail);
    } else if (kind === 'flugblatt') {
      g.add(cyl(0.06, 1.6, 0x5a3e24, 6));
      const sheet = box(0.5, 0.65, 0.03, 0xe8dcb8); sheet.position.set(0, 1.15, 0.05); g.add(sheet);
    }
    return g;
  }
  /** Kleinkram, der erst mit einem abgeschlossenen Kapitel erscheint (Wegweiser zum neuen Ausgang). */
  const gatedProps = [];
  for (const p of map.props) {
    let g;
    if (has(PROP_SPRITES[p.kind])) g = painted(PROP_SPRITES[p.kind], p.x, p.z, p.faceX === -1);
    else { g = prop(p.kind); g.position.set(p.x, 0, p.z); }
    root.add(g);
    if (p.requires) gatedProps.push({ prop: p, mesh: g });
  }

  // Leute: Körper und Kopf in ihrer Farbe, darüber „!“ oder „?“.
  const markers = {};
  const offerMarker = markerSprite('!', '#ffd34d'), turnInMarker = markerSprite('?', '#9fe07a');
  owned.push(offerMarker.material, offerMarker.material.map, turnInMarker.material, turnInMarker.material.map);
  /** Gemalte Leute, die im Stand leicht atmen. */
  const breathing = [];
  const gatedNpcs = [];
  for (const n of map.npcs) {
    const def = has(NPC_SPRITES[n.id]) ? NPC_SPRITES[n.id] : null;
    let top = 2.2;
    if (def) {
      const g = painted(def, n.x, n.z, n.faceX === -1);
      if (n.requires) gatedNpcs.push({ npc: n, mesh: g });
      root.add(g);
      breathing.push({ mesh: g.userData.panel, phase: n.x * 0.37 + n.z * 0.11 });
      top = def.heightM + 0.6;
    } else {
      const g = new THREE.Group();
      const color = MAP_LOOK.npcs[n.id] ?? 0xb08860;
      const body = new THREE.Mesh(own(new THREE.CapsuleGeometry(0.35, 0.6, 4, 10)), std(color));
      body.position.y = 0.65; body.castShadow = true;
      const head = new THREE.Mesh(own(new THREE.SphereGeometry(0.3, 12, 10)), std(color));
      head.position.y = 1.35; head.castShadow = true;
      g.add(body, head);
      g.position.set(n.x, 0, n.z);
      if (n.requires) gatedNpcs.push({ npc: n, mesh: g });
      root.add(g);
    }
    const offer = offerMarker.clone(), turn = turnInMarker.clone();
    offer.position.set(n.x, top, n.z); turn.position.set(n.x, top, n.z);
    offer.visible = turn.visible = false;
    root.add(offer, turn);
    markers[n.id] = { offer, turn, top };
  }

  // Lagerfeuer: Steinkreis, Holz, Flamme, sobald bekannt. Gemalt: Bild „aus“, bis bekannt, dann „an“.
  const fires = {}, paintedFires = {};
  const flameMat = std(0xff9a3a, { emissive: 0xff6a10, emissiveIntensity: 1.4, roughness: 0.6 });
  for (const c of map.campfires) {
    if (village) {
      const off = painted(VILLAGE_SPRITES.feuer_aus, c.x, c.z), on = painted(VILLAGE_SPRITES.feuer_an, c.x, c.z);
      root.add(off, on);
      paintedFires[c.id] = { off, on };
      continue;
    }
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

  // Kisten und Fundorte. Gemalt: Truhe zu, nach dem Öffnen offen; Nussverstecke als Erdhaufen.
  const chests = {}, paintedChests = {};
  for (const c of map.chests) {
    if (village) {
      const shut = painted(VILLAGE_SPRITES.truhe_zu, c.x, c.z), open = painted(VILLAGE_SPRITES.truhe_offen, c.x, c.z);
      root.add(shut, open);
      paintedChests[c.id] = { shut, open };
      continue;
    }
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
    if (village && s.kind === 'nuss') {
      const g = painted(VILLAGE_SPRITES.nuesse, s.x, s.z);
      root.add(g);
      spots[s.id] = g;
      continue;
    }
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
      } else if (village) {
        // Gemalte Barrikade: das Bild so oft nebeneinander, dass es die Sperre überlappend füllt.
        const def = VILLAGE_SPRITES.barrikade;
        const n = Math.max(1, Math.ceil(len / (spriteWidth(def) * 0.75)));
        for (let k = 0; k < n; k++) {
          const t = (k + 0.5) / n;
          g.add(painted(def, ax + (bx - ax) * t, az + (bz - az) * t, k % 2 === 1));
        }
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
        const bob = m.top + 0.08 * Math.sin(time * 3);
        m.offer.position.y = m.turn.position.y = bob;
      }
      for (const b of breathing) b.mesh.scale.y = 1 + IDLE.stretch * Math.sin(time * IDLE.freq * Math.PI * 2 + b.phase);
      for (const [id, flame] of Object.entries(fires)) {
        flame.visible = rec.campfires.includes(id);
        flame.scale.set(1, 0.85 + 0.2 * Math.sin(time * 9 + id.length), 1);
      }
      for (const [id, f] of Object.entries(paintedFires)) {
        const lit = rec.campfires.includes(id);
        f.on.visible = lit; f.off.visible = !lit;
        if (lit) f.on.userData.panel.scale.y = 1 + FIRE_FLICKER.amount * Math.sin(time * FIRE_FLICKER.freq * Math.PI * 2 + id.length);
      }
      for (const [id, lid] of Object.entries(chests)) lid.rotation.x = rec.chests.includes(id) ? -1.1 : 0;
      for (const [id, c] of Object.entries(paintedChests)) { const opened = rec.chests.includes(id); c.open.visible = opened; c.shut.visible = !opened; }
      for (const [id, m] of Object.entries(spots)) m.visible = !rec.found.includes(id);
      for (const gate of run.map.gates) gates[gate.id].visible = isGateClosed(run, gate.id);
      for (const { exit, ring } of exitRings) ring.visible = exitOpen(run, exit);
      for (const { prop: p, mesh } of gatedProps) mesh.visible = rec.chapterDone.includes(p.requires.chapterDone);
      for (const { npc, mesh } of gatedNpcs) {
        const shown = npcVisible(run, npc);
        mesh.visible = shown;
        if (!shown) markers[npc.id].offer.visible = markers[npc.id].turn.visible = false;
      }
      const turned = run.world.flowTurned;
      for (const f of flows) {
        const back = turned && Math.hypot(f.x - turned.x, f.z - turned.z) <= turned.r;
        f.tex.offset.x -= (back ? -1 : 1) * MAP_LOOK.current.speed / MAP_LOOK.current.tileM * dt;
      }
      for (const v of sluiceViews) {
        const open = run.sluices?.[v.id] === 'open';
        v.open.visible = open; v.closed.visible = !open;
      }
      for (const l of levers) {
        const want = run.sluices?.[l.id] === 'open' ? MAP_LOOK.lever.open : MAP_LOOK.lever.closed;
        l.pivot.rotation.z += (want - l.pivot.rotation.z) * Math.min(1, dt * 8);
      }
    },
    dispose() {
      terrain.dispose();
      scene.remove(root);
      for (const x of owned) x?.dispose?.();
    },
  };
}
