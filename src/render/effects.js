import * as THREE from '../../vendor/three.module.min.js';
import { BOSS_MOVES } from '../data/enemies.js';
import { describeCard } from '../ui/cardText.js';

/**
 * Kurzlebige Effekte aus den Ereignissen eines Logikschritts: Formen der Fähigkeiten, Funken, Staub,
 * Explosionen, Vorwarnungen des Bossen, Lichtsäule beim Stufenaufstieg und – als HTML im UI-Layer –
 * aufsteigende Schadenszahlen und der rote Bildschirmrand bei Treffern am Helden.
 * Alles kommt aus wiederverwendeten Vorräten; ist ein Vorrat voll, wird der älteste Eintrag überschrieben.
 * Liest die Welt nur.
 *
 * @typedef {'high'|'low'} Quality
 */

const DEG = Math.PI / 180;
const HALF_PI = Math.PI / 2;

const PARTICLE_CAPACITY = { glow: 1400, dust: 900 };
const DECAL_POOL = 64;
const NUMBER_POOL = 60;
/** Unter `low` erscheinen Schadenszahlen erst ab diesem Wert. */
const LOW_MIN_NUMBER = 5;
const NUMBER_LIFE = 0.8;
const NUMBER_RISE = 1.2;
const VIGNETTE_DECAY = 2.5;

/** Farben je Fähigkeit (Fallback: weiß); auch für die Symbole in der Anzeige. */
export const ABILITY_COLOR = {
  schwerthieb: 0xfff2d0, schildstoss: 0xa8c8ff, wirbelschlag: 0xffe2a8, kriegsschrei: 0xff8a3a,
  erdspalter: 0xb8743a, feuerball: 0xff8a30, frostring: 0x9fe4ff, kettenblitz: 0xc4e4ff, meteor: 0xff7a2a,
  arkankugeln: 0xa880ff, wurfdolche: 0xdfe8ff, giftflaeche: 0x8ccf3c, schattenklon: 0x7a5ad0,
  klingenfaecher: 0xdfe8ff, rauchbombe: 0x9a9aa2,
};
const colorOf = (id) => ABILITY_COLOR[id] ?? 0xffffff;

const rand = (a, b) => a + Math.random() * (b - a);

// ---------------------------------------------------------------- Partikel

/**
 * Partikel als InstancedMesh kleiner Ikosaeder. Ringpuffer: neue Partikel überschreiben die ältesten.
 * @param {THREE.Object3D} parent
 * @param {number} capacity
 * @param {boolean} additive
 */
function createParticles(parent, capacity, additive) {
  const geometry = new THREE.IcosahedronGeometry(1, 0);
  const material = new THREE.MeshBasicMaterial({
    transparent: true, opacity: additive ? 0.95 : 0.75, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, capacity);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.count = 0;
  mesh.setColorAt(0, new THREE.Color());
  parent.add(mesh);

  const f = () => new Float32Array(capacity);
  const px = f(), py = f(), pz = f(), vx = f(), vy = f(), vz = f();
  const life = f(), maxLife = f(), s0 = f(), s1 = f(), grav = f(), drag = f();
  const cr = f(), cg = f(), cb = f();
  let next = 0;
  const col = new THREE.Color(), m = new THREE.Matrix4();

  return {
    /**
     * @param {number} x @param {number} y @param {number} z
     * @param {number} velX @param {number} velY @param {number} velZ
     * @param {{ life: number, size: number, endSize?: number, color: number, gravity?: number, drag?: number }} o
     */
    spawn(x, y, z, velX, velY, velZ, o) {
      const i = next;
      next = (next + 1) % capacity;
      px[i] = x; py[i] = y; pz[i] = z; vx[i] = velX; vy[i] = velY; vz[i] = velZ;
      life[i] = maxLife[i] = o.life;
      s0[i] = o.size; s1[i] = o.endSize ?? 0;
      grav[i] = o.gravity ?? 0; drag[i] = o.drag ?? 0;
      col.setHex(o.color);
      cr[i] = col.r; cg[i] = col.g; cb[i] = col.b;
    },
    update(dt) {
      let n = 0;
      for (let i = 0; i < capacity; i++) {
        if (life[i] <= 0) continue;
        life[i] -= dt;
        if (life[i] <= 0) continue;
        const d = Math.max(0, 1 - drag[i] * dt);
        vx[i] *= d; vz[i] *= d; vy[i] = vy[i] * d - grav[i] * dt;
        px[i] += vx[i] * dt; py[i] += vy[i] * dt; pz[i] += vz[i] * dt;
        if (py[i] < 0.02) { py[i] = 0.02; vy[i] = 0; }
        const k = 1 - life[i] / maxLife[i];
        const s = s0[i] + (s1[i] - s0[i]) * k;
        m.makeScale(s, s, s).setPosition(px[i], py[i], pz[i]);
        mesh.setMatrixAt(n, m);
        mesh.setColorAt(n, col.setRGB(cr[i], cg[i], cb[i]));
        n++;
      }
      mesh.count = n;
      mesh.visible = n > 0;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor.needsUpdate = true;
    },
    dispose() {
      parent.remove(mesh);
      mesh.dispose();
      geometry.dispose();
      material.dispose();
    },
  };
}

// ---------------------------------------------------------------- Flächen und Körper

/** Geteilte Geometrien der Flächeneffekte; flach auf dem Boden, +x ist die Wirkrichtung. */
function createShapes() {
  const flat = (g) => g.rotateX(-HALF_PI);
  const sectors = new Map();
  return {
    disc: flat(new THREE.CircleGeometry(1, 48)),
    ring: flat(new THREE.RingGeometry(0.86, 1, 64)),
    /** Streifen von x = 0 bis 1, Breite 1. */
    strip: flat(new THREE.PlaneGeometry(1, 1)).translate(0.5, 0, 0),
    pillar: new THREE.CylinderGeometry(1, 1, 1, 24, 1, true).translate(0, 0.5, 0),
    sphere: new THREE.SphereGeometry(1, 16, 12),
    box: new THREE.BoxGeometry(1, 1, 1),
    /** Kreisausschnitt um +x mit Öffnungswinkel `deg`, innen bis `inner` offen. */
    sector(deg, inner = 0) {
      const key = deg.toFixed(1) + '|' + inner;
      let g = sectors.get(key);
      if (!g) {
        const len = Math.min(deg, 360) * DEG;
        sectors.set(key, g = flat(new THREE.RingGeometry(inner, 1, Math.max(8, Math.ceil(deg / 6)), 1, -len / 2, len)));
      }
      return g;
    },
    dispose() {
      for (const g of [this.disc, this.ring, this.strip, this.pillar, this.sphere, this.box, ...sectors.values()]) g.dispose();
    },
  };
}

/** Drehung um y, die +x auf die Richtung (dirX, dirZ) legt. */
const yawToward = (dirX, dirZ) => Math.atan2(-dirZ, dirX);

/**
 * @typedef {{ mesh: THREE.Mesh, material: THREE.MeshBasicMaterial, age: number, life: number, active: boolean,
 *   clock: 'real'|'world', start: number, follow: object|null, tick: (k: number, d: Decal) => void }} Decal
 */

/** Vorrat an Einzelnetzen mit eigenem Material (für eigene Deckkraft je Effekt). */
function createDecals(parent, size) {
  /** @type {Decal[]} */
  const items = [];
  for (let i = 0; i < size; i++) {
    const material = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(undefined, material);
    mesh.visible = false;
    mesh.frustumCulled = false;
    parent.add(mesh);
    items.push({ mesh, material, age: 0, life: 1, active: false, clock: 'real', start: 0, follow: null, tick: () => {} });
  }
  let next = 0;
  return {
    items,
    /**
     * @param {THREE.BufferGeometry} geometry
     * @param {{ color: number, additive?: boolean, life: number, x: number, y?: number, z: number, yaw?: number,
     *   clock?: 'real'|'world', start?: number, follow?: object|null, renderOrder?: number }} o
     * @param {(k: number, d: Decal) => void} tick setzt Skalierung/Deckkraft je Fortschritt k (0…1)
     */
    add(geometry, o, tick) {
      let d = items.find((it) => !it.active);
      if (!d) { d = items[next]; next = (next + 1) % size; }
      d.active = true;
      d.age = 0;
      d.life = o.life;
      d.clock = o.clock ?? 'real';
      d.start = o.start ?? 0;
      d.follow = o.follow ?? null;
      d.tick = tick;
      d.mesh.geometry = geometry;
      d.mesh.position.set(d.follow ? d.follow.x : o.x, o.y ?? 0.06, d.follow ? d.follow.z : o.z);
      d.mesh.rotation.set(0, o.yaw ?? 0, 0);
      d.mesh.scale.setScalar(1);
      d.mesh.renderOrder = o.renderOrder ?? 1;
      d.material.color.setHex(o.color);
      d.material.blending = o.additive ? THREE.AdditiveBlending : THREE.NormalBlending;
      d.material.opacity = 1;
      d.mesh.visible = true;
      tick(0, d);
      return d;
    },
    /** @param {number} dt reale Sekunden @param {number} worldTime */
    update(dt, worldTime) {
      for (const d of items) {
        if (!d.active) continue;
        d.age += dt;
        const elapsed = d.clock === 'world' ? worldTime - d.start : d.age;
        const k = elapsed / d.life;
        if (k >= 1) { d.active = false; d.mesh.visible = false; continue; }
        if (d.follow) d.mesh.position.set(d.follow.x, d.mesh.position.y, d.follow.z);
        d.tick(Math.max(0, k), d);
      }
    },
    dispose() {
      for (const d of items) { parent.remove(d.mesh); d.material.dispose(); }
    },
  };
}

// ---------------------------------------------------------------- HTML: Zahlen und Bildschirmrand

const NUMBER_STYLE = {
  normal: { size: 18, color: '#ffffff' },
  crit: { size: 27, color: '#ffd23a' },
  heal: { size: 18, color: '#86e07a' },
  info: { size: 14, color: '#d8d8d8' },
  loot: { size: 20, color: '#ffd23a' },
};

function createNumbers(uiLayer, size) {
  const box = document.createElement('div');
  box.className = 'fx-numbers';
  Object.assign(box.style, { position: 'absolute', inset: '0', pointerEvents: 'none', overflow: 'hidden' });
  uiLayer.appendChild(box);
  const items = [];
  for (let i = 0; i < size; i++) {
    const el = document.createElement('div');
    Object.assign(el.style, {
      position: 'absolute', left: '0', top: '0', display: 'none', whiteSpace: 'nowrap', fontWeight: '800',
      fontFamily: 'system-ui, sans-serif', willChange: 'transform, opacity', pointerEvents: 'none',
      textShadow: '0 0 3px #000, 0 1px 2px #000, 0 0 1px #000',
    });
    box.appendChild(el);
    items.push({ el, active: false, x: 0, y: 0, z: 0, age: 0, pop: 1 });
  }
  let next = 0;
  const v = new THREE.Vector3();
  return {
    /** @param {keyof NUMBER_STYLE} style */
    show(text, x, y, z, style) {
      const it = items[next];
      next = (next + 1) % size;
      const st = NUMBER_STYLE[style];
      it.active = true;
      it.age = 0;
      it.x = x + rand(-0.3, 0.3); it.y = y; it.z = z + rand(-0.2, 0.2);
      it.pop = style === 'crit' ? 1.5 : 1.2;
      it.el.textContent = text;
      it.el.style.fontSize = st.size + 'px';
      it.el.style.color = st.color;
      it.el.style.display = 'block';
    },
    update(dt, camera) {
      const w = uiLayer.clientWidth, h = uiLayer.clientHeight;
      for (const it of items) {
        if (!it.active) continue;
        it.age += dt;
        const k = it.age / NUMBER_LIFE;
        if (k >= 1) { it.active = false; it.el.style.display = 'none'; continue; }
        const rise = 1 - (1 - k) * (1 - k);
        v.set(it.x, it.y + rise * NUMBER_RISE, it.z).project(camera);
        if (v.z > 1) { it.el.style.opacity = '0'; continue; }
        const sx = (v.x * 0.5 + 0.5) * w, sy = (-v.y * 0.5 + 0.5) * h;
        const scale = 1 + (it.pop - 1) * Math.max(0, 1 - k * 5);
        it.el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translate(-50%, -50%) scale(${scale.toFixed(2)})`;
        it.el.style.opacity = String(k < 0.65 ? 1 : 1 - (k - 0.65) / 0.35);
      }
    },
    dispose() { box.remove(); },
  };
}

function createVignette(uiLayer) {
  const el = document.createElement('div');
  el.className = 'fx-vignette';
  Object.assign(el.style, {
    position: 'absolute', inset: '0', pointerEvents: 'none', opacity: '0',
    boxShadow: 'inset 0 0 110px 28px rgba(200, 16, 16, 0.85)',
  });
  uiLayer.appendChild(el);
  let level = 0, low = false, pulsing = false;
  return {
    hit(strength) { level = Math.max(level, Math.min(1, strength)); },
    /** Unter wenig Leben pulsiert der Rand (CSS-Klasse); während eines Treffer-Aufblitzens ruht das Pulsieren. */
    setLow(on) { low = on; },
    update(dt) {
      if (level > 0) {
        level = Math.max(0, level - dt * VIGNETTE_DECAY);
        el.style.opacity = level.toFixed(3);
      }
      const want = low && level <= 0;
      if (want !== pulsing) { pulsing = want; el.classList.toggle('low-health', want); }
    },
    dispose() { el.remove(); },
  };
}

// ---------------------------------------------------------------- Effekte

/**
 * @param {THREE.Scene} scene
 * @param {HTMLElement} uiLayer Element über dem Canvas (#ui)
 * @param {{ quality?: Quality, camera: THREE.Camera }} options Kamera zum Projizieren der Schadenszahlen
 * @returns {{ handle(events: object[], world: import('../core/world.js').World): void, update(dt: number, heroPosition?: { x: number, z: number }): void,
 *   setQuality(q: Quality): void, dispose(): void }}
 */
export function createEffects(scene, uiLayer, { quality = 'high', camera } = {}) {
  if (!camera) throw new Error('createEffects braucht options.camera (zum Projizieren der Schadenszahlen).');
  const root = new THREE.Group();
  root.name = 'effects';
  scene.add(root);

  let high = quality !== 'low';
  /** @type {import('../core/world.js').World|null} */
  let world = null;
  /** Gezeichnete Heldenposition; Effekte, die dem Helden folgen, hängen hieran (nicht an der Logikposition). */
  const heroAnchor = { x: 0, z: 0 };

  const glow = createParticles(root, PARTICLE_CAPACITY.glow, true);
  const dust = createParticles(root, PARTICLE_CAPACITY.dust, false);
  const shapes = createShapes();
  const decals = createDecals(root, DECAL_POOL);
  const numbers = createNumbers(uiLayer, NUMBER_POOL);
  const vignette = createVignette(uiLayer);

  /** Partikelzahl nach Qualität: bei low die Hälfte (aufgerundet). */
  const count = (n) => (high ? n : Math.ceil(n / 2));

  /** Kugelförmiger Ausstoß um (x,y,z). */
  function burst(sys, n, x, y, z, { speed = 3, up = 1, life = 0.5, size = 0.08, endSize = 0, color, gravity = 6, drag = 2, spread = 0 }) {
    for (let i = 0, c = count(n); i < c; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * rand(0.4, 1);
      const ox = spread ? Math.cos(a) * rand(0, spread) : 0, oz = spread ? Math.sin(a) * rand(0, spread) : 0;
      sys.spawn(x + ox, y, z + oz, Math.cos(a) * s, up * rand(0.5, 1.5), Math.sin(a) * s,
        { life: life * rand(0.7, 1.2), size: size * rand(0.7, 1.3), endSize, color, gravity, drag });
    }
  }

  /** Fadet von `peak` auf 0 aus, während die Form von `from` auf `to` wächst (Faktor auf `base`). */
  const grow = (base, from, to, peak, ease = (k) => 1 - (1 - k) ** 3) => (k, d) => {
    d.mesh.scale.setScalar(base * (from + (to - from) * ease(k)));
    d.material.opacity = peak * (1 - k);
  };

  // ------------------------------------------------ Fähigkeiten

  function castArc(e) {
    const p = e.params, color = colorOf(e.abilityId);
    const swings = Math.max(1, Math.round(p.swings || 1));
    const base = Math.atan2(e.dirZ, e.dirX);
    for (let i = 0; i < swings; i++) {
      const a = base + (i * 2 * Math.PI) / swings;
      const dirX = Math.cos(a), dirZ = Math.sin(a);
      decals.add(shapes.sector(p.angle, 0.35), { color, additive: true, life: 0.26, x: e.x, z: e.z, y: 0.5, yaw: yawToward(dirX, dirZ), follow: heroAnchor },
        (k, d) => {
          d.mesh.scale.set(p.radius * (0.7 + 0.3 * Math.min(1, k * 3)), 1, p.radius * (0.7 + 0.3 * Math.min(1, k * 3)));
          d.material.opacity = 0.7 * (1 - k) ** 1.5;
        });
      // Funken entlang der Schneide
      for (let j = 0, n = count(6); j < n; j++) {
        const b = a + rand(-0.5, 0.5) * p.angle * DEG, r = p.radius * rand(0.75, 1);
        glow.spawn(e.x + Math.cos(b) * r, 0.6, e.z + Math.sin(b) * r, Math.cos(b) * 2, 0.8, Math.sin(b) * 2,
          { life: 0.25, size: 0.07, color, gravity: 3, drag: 3 });
      }
    }
  }

  function castRing(e) {
    const p = e.params, color = colorOf(e.abilityId);
    decals.add(shapes.ring, { color, additive: true, life: 0.4, x: e.x, z: e.z, y: 0.08, follow: heroAnchor },
      grow(p.radius, 0.15, 1, 0.9));
    decals.add(shapes.disc, { color, additive: true, life: 0.3, x: e.x, z: e.z, y: 0.06, follow: heroAnchor },
      grow(p.radius, 0.3, 1, 0.22));
    for (let j = 0, n = count(16); j < n; j++) {
      const a = (j / n) * Math.PI * 2 + rand(-0.1, 0.1);
      glow.spawn(e.x + Math.cos(a) * 0.5, 0.4, e.z + Math.sin(a) * 0.5, Math.cos(a) * p.radius * 2.6, 0.6, Math.sin(a) * p.radius * 2.6,
        { life: 0.35, size: 0.09, color, gravity: 2, drag: 5 });
    }
  }

  function castLine(e) {
    const p = e.params, color = colorOf(e.abilityId);
    decals.add(shapes.strip, { color, life: 0.7, x: e.x, z: e.z, y: 0.05, yaw: yawToward(e.dirX, e.dirZ) }, (k, d) => {
      d.mesh.scale.set(p.length * Math.min(1, k * 6), 1, p.width * (1 - 0.3 * k));
      d.material.opacity = 0.65 * (1 - k);
    });
    for (let j = 0, n = count(18); j < n; j++) {
      const s = rand(0, p.length), side = rand(-0.5, 0.5) * p.width;
      dust.spawn(e.x + e.dirX * s - e.dirZ * side, 0.1, e.z + e.dirZ * s + e.dirX * side, rand(-0.4, 0.4), rand(2, 4), rand(-0.4, 0.4),
        { life: 0.55, size: 0.16, endSize: 0.05, color: 0x7a5c3e, gravity: 9 });
    }
  }

  function castChain(e) {
    const color = colorOf(e.abilityId);
    let ax = e.x, az = e.z, ay = 1.1;
    for (const pt of e.points || []) {
      // Zickzack aus vier Teilstücken je Sprung
      const segs = 4;
      let px = ax, pz = az, py = ay;
      for (let s = 1; s <= segs; s++) {
        const k = s / segs;
        const jitter = s < segs ? 0.35 : 0;
        const nx = ax + (pt.x - ax) * k + rand(-jitter, jitter), nz = az + (pt.z - az) * k + rand(-jitter, jitter);
        const ny = ay + (0.8 - ay) * k + rand(-jitter, jitter) * 0.5;
        const dx = nx - px, dz = nz - pz, dy = ny - py, len = Math.hypot(dx, dy, dz);
        const seg = decals.add(shapes.box, { color, additive: true, life: 0.2, x: (px + nx) / 2, y: (py + ny) / 2, z: (pz + nz) / 2 },
          (kk, d) => { d.material.opacity = 1 - kk; });
        seg.mesh.rotation.set(0, yawToward(dx, dz), Math.atan2(dy, Math.hypot(dx, dz)), 'YZX');
        seg.mesh.scale.set(len, 0.07, 0.07);
        px = nx; pz = nz; py = ny;
      }
      burst(glow, 6, pt.x, 0.8, pt.z, { speed: 3, life: 0.25, size: 0.07, color });
      ax = pt.x; az = pt.z; ay = 0.8;
    }
  }

  function castZone(e) {
    if (e.abilityId === 'rauchbombe') {
      const r = e.params.radius;
      decals.add(shapes.disc, { color: 0x8c8c94, life: 1.2, x: e.x, z: e.z, y: 0.07 }, grow(r, 0.3, 1, 0.45));
      for (let j = 0, n = count(36); j < n; j++) {
        const a = Math.random() * Math.PI * 2, s = rand(1, 3) * r;
        dust.spawn(e.x, rand(0.2, 0.8), e.z, Math.cos(a) * s, rand(0.3, 1.2), Math.sin(a) * s,
          { life: rand(0.8, 1.3), size: 0.25, endSize: 0.5, color: 0x9a9aa2, drag: 3 });
      }
    } else if (e.abilityId === 'giftflaeche') {
      burst(dust, 14, e.tx ?? e.x, 0.2, e.tz ?? e.z, { speed: 2, up: 2, life: 0.6, size: 0.14, color: 0x7fb83a, spread: e.params.radius * 0.6, gravity: 2 });
    }
  }

  function castBuff(e) {
    const color = colorOf(e.abilityId);
    decals.add(shapes.ring, { color, additive: true, life: 0.55, x: e.x, z: e.z, y: 0.08, follow: heroAnchor }, grow(3, 0.2, 1, 0.9));
    for (let j = 0, n = count(20); j < n; j++) {
      const a = Math.random() * Math.PI * 2;
      glow.spawn(e.x + Math.cos(a) * 0.6, 0.3, e.z + Math.sin(a) * 0.6, Math.cos(a) * 0.6, rand(2, 4), Math.sin(a) * 0.6,
        { life: 0.7, size: 0.08, color, gravity: 0, drag: 1 });
    }
  }

  function castSummon(e) {
    burst(dust, 18, e.tx ?? e.x, 0.6, e.tz ?? e.z, { speed: 2.5, up: 1.5, life: 0.6, size: 0.25, endSize: 0.45, color: 0x2a2238, gravity: 0, drag: 3 });
  }

  function castProjectile(e) {
    const color = colorOf(e.abilityId);
    for (let j = 0, n = count(5); j < n; j++) {
      glow.spawn(e.x + e.dirX * 0.6, 0.9, e.z + e.dirZ * 0.6, e.dirX * rand(2, 5) + rand(-1, 1), rand(0, 1), e.dirZ * rand(2, 5) + rand(-1, 1),
        { life: 0.18, size: 0.06, color, drag: 4 });
    }
  }

  const CAST = { arc: castArc, ring: castRing, line: castLine, chain: castChain, zone: castZone, buff: castBuff, summon: castSummon, projectile: castProjectile };

  // ------------------------------------------------ übrige Ereignisse

  function explosion(e) {
    const color = colorOf(e.abilityId), r = e.radius || 1;
    decals.add(shapes.sphere, { color, additive: true, life: 0.32, x: e.x, y: 0.4, z: e.z }, (k, d) => {
      d.mesh.scale.set(r * (0.3 + 0.7 * k), r * (0.3 + 0.5 * k), r * (0.3 + 0.7 * k));
      d.material.opacity = 0.45 * (1 - k) ** 2;
    });
    decals.add(shapes.disc, { color: 0x2a1a10, life: 1.4, x: e.x, y: 0.03, z: e.z, renderOrder: 0 }, (k, d) => {
      d.mesh.scale.setScalar(r * 0.8);
      d.material.opacity = 0.4 * (1 - k);
    });
    burst(glow, 16, e.x, 0.5, e.z, { speed: r * 3, up: 3, life: 0.5, size: 0.1, color, gravity: 8 });
    burst(dust, 8, e.x, 0.3, e.z, { speed: r * 1.5, up: 1.5, life: 0.7, size: 0.25, endSize: 0.45, color: 0x5a4a3a, gravity: 0, drag: 2 });
  }

  function hit(e) {
    burst(glow, e.crit ? 8 : 5, e.x, 0.8, e.z, { speed: 4, up: 2, life: 0.22, size: e.crit ? 0.09 : 0.065, color: e.crit ? 0xffc040 : 0xfff0d0, gravity: 10 });
    if (!high && e.amount < LOW_MIN_NUMBER) return;
    numbers.show(String(Math.max(1, Math.round(e.amount))), e.x, 1.4, e.z, e.crit ? 'crit' : 'normal');
  }

  function kill(e) {
    burst(dust, 6, e.x, 0.2, e.z, { speed: 1.6, up: 1, life: 0.45, size: 0.1, endSize: 0.2, color: 0x6e5f4a, gravity: 1, drag: 3 });
  }

  /** Ankündigung eines Ansturms: ganzer Streifen blass, Füllung wächst vom Boss aus bis zum Losrennen. */
  function dashTelegraph(e) {
    const o = { life: e.delay, x: e.x, z: e.z, yaw: yawToward(e.dirX, e.dirZ), clock: 'world', start: world.time };
    decals.add(shapes.strip, { ...o, y: 0.06, color: 0xff3a2a }, (k, d) => {
      d.mesh.scale.set(e.length, 1, e.width);
      d.material.opacity = 0.28;
    });
    decals.add(shapes.strip, { ...o, y: 0.07, color: 0xd81c1c }, (k, d) => {
      d.mesh.scale.set(Math.max(0.01, e.length * k), 1, e.width * 0.92);
      d.material.opacity = 0.3 + 0.3 * k;
    });
  }

  function bossTelegraph(e) {
    if (e.kind === 'dash') { dashTelegraph(e); return; }
    const swipe = e.kind === 'swipe';
    const halfAngle = e.halfAngle ?? BOSS_MOVES.baer.near.halfAngle;
    const geoFill = swipe ? shapes.sector(2 * halfAngle / DEG) : shapes.disc;
    const geoEdge = swipe ? shapes.sector(2 * halfAngle / DEG, 0.93) : shapes.ring;
    const o = { color: 0xd81c1c, life: e.delay, x: e.x, z: e.z, yaw: yawToward(e.dirX, e.dirZ), clock: 'world', start: world.time };
    decals.add(geoEdge, { ...o, y: 0.07, color: 0xff3a2a }, (k, d) => {
      d.mesh.scale.setScalar(e.radius);
      d.material.opacity = 0.85;
    });
    decals.add(geoFill, { ...o, y: 0.06 }, (k, d) => {
      d.mesh.scale.setScalar(Math.max(0.01, e.radius * k));
      d.material.opacity = 0.3 + 0.25 * k;
    });
  }

  function levelup(hero) {
    decals.add(shapes.pillar, { color: 0xffd77a, additive: true, life: 1.3, x: hero.x, z: hero.z, y: 0, follow: heroAnchor }, (k, d) => {
      d.mesh.scale.set(0.65 + 0.2 * k, 5, 0.65 + 0.2 * k);
      d.material.opacity = 0.32 * Math.min(1, k * 6) * (1 - k);
    });
    decals.add(shapes.ring, { color: 0xffd77a, additive: true, life: 0.8, x: hero.x, z: hero.z, y: 0.08, follow: heroAnchor }, grow(3, 0.2, 1, 0.9));
    for (let j = 0, n = count(30); j < n; j++) {
      const a = Math.random() * Math.PI * 2, r = rand(0.2, 1);
      glow.spawn(hero.x + Math.cos(a) * r, rand(0, 1), hero.z + Math.sin(a) * r, 0, rand(2, 5), 0,
        { life: rand(0.6, 1.1), size: 0.07, color: 0xffe08a, gravity: 0 });
    }
  }

  /** Dunkler Rauch mit violetten Funken, wo der Schatten erscheint oder sich auflöst. */
  /** Inhalt einer geöffneten Karten-Kiste: Funken und aufsteigender Text über der Kiste. */
  function mapChest(e, w) {
    burst(glow, 24, e.x, 0.7, e.z, { speed: 3, up: 3.5, life: 0.7, size: 0.08, color: 0xffd040, gravity: 6 });
    const gold = Math.round(e.gold);
    let y = 1.5;
    if (e.card && e.card.kind !== 'gold' && e.card.kind !== 'heal') { numbers.show(describeCard(e.card, w).title, e.x, y, e.z, 'loot'); y += 0.6; }
    if (e.heal > 0) { numbers.show('Heilung', e.x, y, e.z, 'heal'); y += 0.6; }
    if (gold > 0) numbers.show(`+${gold} Gold`, e.x, y, e.z, 'loot');
  }

  function shadowSmoke(e, strength = 1) {
    burst(dust, Math.round(16 * strength), e.x, 0.5, e.z, {
      speed: 2.6, up: 1.6, life: 0.8, size: 0.2, endSize: 0.42, color: 0x3a2a52, gravity: -0.6, drag: 2.5, spread: 0.6,
    });
    burst(glow, Math.round(12 * strength), e.x, 0.9, e.z, { speed: 2.5, up: 2, life: 0.6, size: 0.07, color: 0x9a5cff, gravity: 1, drag: 2 });
  }

  function revive(hero) {
    decals.add(shapes.ring, { color: 0xffffff, additive: true, life: 0.7, x: hero.x, z: hero.z, y: 0.08 }, grow(6, 0.1, 1, 1));
    levelup(hero);
  }

  /**
   * @param {object[]} events run.events eines Logikschritts
   * @param {import('../core/world.js').World} w
   */
  function handle(events, w) {
    world = w;
    const hero = w.hero;
    for (const e of events) {
      switch (e.type) {
        case 'cast': CAST[e.shape]?.(e); break;
        case 'explosion': explosion(e); break;
        case 'hit': hit(e); break;
        case 'kill': kill(e); break;
        case 'bossTelegraph': bossTelegraph(e); break;
        case 'levelup': levelup(hero); break;
        case 'revive': revive(hero); break;
        case 'mapChest': mapChest(e, w); break;
        case 'shadowAppear': case 'shadowVanish': shadowSmoke(e); break;
        case 'shadowFlee': shadowSmoke(e, 0.5); break;
        case 'heroHit':
          if (!e.poison) vignette.hit(0.45 + (e.amount / hero.stats.maxHp) * 4);
          break;
        case 'heal':
          if (e.amount >= 1) numbers.show('+' + Math.round(e.amount), hero.x, 1.8, hero.z, 'heal');
          break;
        case 'dodge':
          numbers.show('Ausgewichen', hero.x, 1.9, hero.z, 'info');
          break;
        case 'pickup':
          if (e.kind === 'gold') burst(glow, 4, hero.x, 0.8, hero.z, { speed: 1.5, up: 2, life: 0.35, size: 0.06, color: 0xffd040, gravity: 4 });
          else if (e.kind === 'chest') burst(glow, 30, hero.x, 0.8, hero.z, { speed: 4, up: 4, life: 0.8, size: 0.09, color: 0xffd040, gravity: 6 });
          else if (e.kind === 'xp' && high) glow.spawn(hero.x, 1, hero.z, 0, 2, 0, { life: 0.25, size: 0.06, color: 0x7fdcff });
          break;
        default: break; // unbekannte Ereignisse ignorieren
      }
    }
  }

  /**
   * @param {number} dt reale Sekunden seit dem letzten Bild (0 friert die Effekte ein)
   * @param {{ x: number, z: number }} [heroPosition] gezeichnete (überblendete) Heldenposition; ohne sie folgen
   *   Effekte der Logikposition
   */
  function update(dt, heroPosition) {
    const follow = heroPosition ?? world?.hero;
    if (follow) { heroAnchor.x = follow.x; heroAnchor.z = follow.z; }
    glow.update(dt);
    dust.update(dt);
    decals.update(dt, world ? world.time : 0);
    numbers.update(dt, camera);
    vignette.update(dt);
  }

  /** @param {Quality} q */
  function setQuality(q) {
    high = q !== 'low';
  }

  function dispose() {
    glow.dispose();
    dust.dispose();
    decals.dispose();
    shapes.dispose();
    numbers.dispose();
    vignette.dispose();
    scene.remove(root);
  }

  /** @param {boolean} on wenig Leben: roter Rand pulsiert */
  function setLowHealth(on) { vignette.setLow(on); }

  return { handle, update, setQuality, setLowHealth, dispose };
}
