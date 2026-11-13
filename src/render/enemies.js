import * as THREE from '../../vendor/three.module.min.js';
import { ENEMIES } from '../data/enemies.js';
import { ABILITIES } from '../data/abilities.js';
import { ENEMY_SPRITES, HERO_SPRITES, CROW_FLIGHT_HEIGHT, BILLBOARD, CURL_ROLL } from '../data/sprites.js';
import { isCurled } from '../core/world.js';
import { SHADOW } from '../data/shadow.js';
import { ENV_SPRITES } from '../data/environment.js';
import {
  billboardOrientation, spriteGeometry, spriteWidth, spriteMaterial, shadowMaterial, composeSprite, spriteMotion,
} from './sprites.js';
import { buildCharacter, animateCharacter } from './character.js';

/**
 * Darstellung aller Weltobjekte außer Held und Gelände: Gegner, Heldengeschosse, Gegnergeschosse,
 * Zonen, Umlaufkugeln und Aufsammelbares – alles über InstancedMesh. Liest die Welt nur.
 *
 * Lokale Achsen der Formen wie bei den Heldenfiguren: y oben, Blickrichtung +z, Füße auf y = 0.
 * Maße gelten für den Normalgegner; Elite und andere Radien werden über die Instanzskalierung
 * `enemy.radius / ENEMIES[type].radius` vergrößert.
 */

// ---------------------------------------------------------------- Zwischenstände

/** Weiter springt ein Objekt in einem Logikschritt nur durch Versetzen; dann ohne Übergang zeichnen. */
const SNAP_DISTANCE = 6;

/**
 * Merkt Positionen je Schlüssel (Gegner-id oder Objektidentität) über Logikschritte hinweg und blendet
 * zwischen dem vorletzten und dem letzten Schritt über `alpha` über. Ein Schritt gilt als neu, sobald sich
 * die Weltzeit ändert. Neue Objekte erscheinen sofort an ihrer aktuellen Position.
 */
export function createTracker() {
  let prev = new Map(), cur = new Map();
  let time = NaN, prevTime = NaN;
  const out = { x: 0, z: 0 };
  return {
    /** @param {number} worldTime */
    begin(worldTime) {
      if (worldTime === time) return;
      prevTime = Number.isNaN(time) ? worldTime : time;
      time = worldTime;
      const old = prev;
      prev = cur;
      cur = old;
      cur.clear();
    },
    /** Weltzeit zwischen den beiden letzten Schritten. */
    lerpTime(alpha) {
      return prevTime + (time - prevTime) * alpha;
    },
    /**
     * @returns {{ x: number, z: number }} wiederverwendetes Objekt, nur bis zum nächsten Aufruf gültig
     */
    pos(key, x, z, alpha) {
      const c = cur.get(key);
      if (c) { c.x = x; c.z = z; } else cur.set(key, { x, z });
      const p = prev.get(key);
      if (!p || (x - p.x) ** 2 + (z - p.z) ** 2 > SNAP_DISTANCE * SNAP_DISTANCE) {
        out.x = x; out.z = z;
      } else {
        out.x = p.x + (x - p.x) * alpha;
        out.z = p.z + (z - p.z) * alpha;
      }
      return out;
    },
  };
}

// ---------------------------------------------------------------- Formen

const UNIT = {
  sphere: new THREE.SphereGeometry(1, 10, 7),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 8),
  cone: new THREE.ConeGeometry(1, 1, 8),
  box: new THREE.BoxGeometry(1, 1, 1),
};

/**
 * @typedef {[keyof UNIT, number, number[]?, number[]?, number[]?]} Part
 *   [Grundform, Farbe, Position, Skalierung, Drehung (Euler XYZ)]
 */

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

/**
 * Fügt Grundformen zu einer Geometrie mit Vertexfarben zusammen (ersetzt BufferGeometryUtils).
 * @param {Part[]} parts
 * @returns {THREE.BufferGeometry}
 */
export function mergeParts(parts) {
  const geos = parts.map(([unit, color, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0]]) => {
    const g = UNIT[unit].toNonIndexed();
    _m.compose(_p.fromArray(pos), _q.setFromEuler(_e.set(rot[0], rot[1], rot[2])), _s.fromArray(scale));
    g.applyMatrix4(_m);
    g.userData.color = color;
    return g;
  });
  const total = geos.reduce((n, g) => n + g.attributes.position.count, 0);
  const position = new Float32Array(total * 3), normal = new Float32Array(total * 3), color = new Float32Array(total * 3);
  let o = 0;
  for (const g of geos) {
    const n = g.attributes.position.count;
    position.set(g.attributes.position.array, o * 3);
    normal.set(g.attributes.normal.array, o * 3);
    _c.setHex(g.userData.color);
    for (let i = 0; i < n; i++) {
      color[(o + i) * 3] = _c.r; color[(o + i) * 3 + 1] = _c.g; color[(o + i) * 3 + 2] = _c.b;
    }
    o += n;
    g.dispose();
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(position, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  merged.setAttribute('color', new THREE.BufferAttribute(color, 3));
  merged.computeBoundingSphere();
  return merged;
}

const HALF_PI = Math.PI / 2;
/** Beidseitig gespiegelte Teile: fn(s) für s = +1 (links, +x) und s = -1 (rechts). */
const both = (fn) => [fn(1), fn(-1)];

/** @type {Record<string, Part[]>} */
const ENEMY_PARTS = {
  // Klein, graubraun, langer nackter Schwanz.
  ratte: [
    ['sphere', 0x6f6152, [0, 0.2, -0.02], [0.2, 0.17, 0.32]],
    ['sphere', 0x5a4e43, [0, 0.27, -0.06], [0.15, 0.08, 0.24]],
    ['sphere', 0x6f6152, [0, 0.21, 0.3], [0.12, 0.11, 0.15]],
    ['cone', 0x8d7a6c, [0, 0.19, 0.46], [0.07, 0.14, 0.07], [HALF_PI, 0, 0]],
    ['sphere', 0xc79a92, [0, 0.19, 0.53], [0.026, 0.026, 0.026]],
    ...both((s) => ['sphere', 0xb38c84, [s * 0.08, 0.31, 0.25], [0.06, 0.06, 0.025]]),
    ...both((s) => ['sphere', 0x111111, [s * 0.07, 0.25, 0.37], [0.022, 0.022, 0.022]]),
    ['cyl', 0xa88880, [0, 0.13, -0.66], [0.032, 0.72, 0.032], [HALF_PI + 0.12, 0, 0]],
  ],
  // Gedrungen, dunkelbraun, Borstenkamm, helle Hauer.
  wildschwein: [
    ['sphere', 0x4b3627, [0, 0.62, -0.05], [0.46, 0.42, 0.72]],
    ['sphere', 0x2f2219, [0, 0.98, -0.05], [0.14, 0.12, 0.62]],
    ['sphere', 0x45311f, [0, 0.58, 0.62], [0.3, 0.3, 0.34]],
    ['cyl', 0x7a5643, [0, 0.5, 0.96], [0.15, 0.14, 0.15], [HALF_PI, 0, 0]],
    ...both((s) => ['cone', 0xece4cf, [s * 0.16, 0.56, 0.93], [0.05, 0.32, 0.05], [0.55, 0, -s * 0.5]]),
    ...both((s) => ['cone', 0x3a2a1e, [s * 0.18, 0.86, 0.5], [0.08, 0.18, 0.06], [-0.2, 0, -s * 0.3]]),
    ...both((s) => ['sphere', 0x111111, [s * 0.17, 0.68, 0.84], [0.035, 0.035, 0.035]]),
    ...both((s) => ['cyl', 0x2e2219, [s * 0.25, 0.2, 0.38], [0.09, 0.42, 0.09]]),
    ...both((s) => ['cyl', 0x2e2219, [s * 0.25, 0.2, -0.42], [0.09, 0.42, 0.09]]),
    ['cone', 0x2f2219, [0, 0.72, -0.8], [0.05, 0.2, 0.05], [-HALF_PI - 0.4, 0, 0]],
  ],
  // Rumpf ohne Flügel; die Flügel sind eigene Netze, die schlagen. Mitte bei y = 0 (Flughöhe kommt dazu).
  kraehe: [
    ['sphere', 0x1e1e24, [0, 0, 0], [0.17, 0.15, 0.32]],
    ['sphere', 0x1e1e24, [0, 0.06, 0.3], [0.12, 0.11, 0.13]],
    ['cone', 0x55514a, [0, 0.04, 0.46], [0.045, 0.17, 0.04], [HALF_PI, 0, 0]],
    ['cone', 0x26262c, [0, 0, -0.42], [0.17, 0.32, 0.04], [-HALF_PI, 0, 0]],
    ...both((s) => ['sphere', 0x8a7a30, [s * 0.08, 0.1, 0.36], [0.022, 0.022, 0.022]]),
  ],
  // Flach und breit, grün, Glupschaugen oben, dunkle Warzen.
  giftkroete: [
    ['sphere', 0x5b7838, [0, 0.26, -0.05], [0.45, 0.27, 0.42]],
    ['sphere', 0x9aa463, [0, 0.17, 0.1], [0.36, 0.15, 0.32]],
    ['sphere', 0x5b7838, [0, 0.31, 0.28], [0.32, 0.2, 0.24]],
    ...both((s) => ['sphere', 0xcbb84a, [s * 0.17, 0.46, 0.3], [0.09, 0.09, 0.09]]),
    ...both((s) => ['sphere', 0x111111, [s * 0.19, 0.5, 0.36], [0.04, 0.04, 0.04]]),
    ['sphere', 0x3e5726, [0.15, 0.47, -0.1], [0.07, 0.05, 0.07]],
    ['sphere', 0x3e5726, [-0.12, 0.48, 0.02], [0.06, 0.05, 0.06]],
    ['sphere', 0x3e5726, [0.02, 0.47, -0.27], [0.07, 0.05, 0.07]],
    ['sphere', 0x3e5726, [-0.2, 0.43, -0.22], [0.05, 0.04, 0.05]],
    ...both((s) => ['sphere', 0x4d6a2e, [s * 0.38, 0.15, -0.2], [0.16, 0.12, 0.3]]),
    ...both((s) => ['sphere', 0x4d6a2e, [s * 0.3, 0.08, 0.32], [0.08, 0.08, 0.12]]),
  ],
  // Schlank, grau, lange Beine, spitze Ohren, buschiger Schwanz.
  wolf: [
    ['sphere', 0x7a7975, [0, 0.68, -0.05], [0.22, 0.24, 0.58]],
    ['sphere', 0x54534e, [0, 0.83, -0.1], [0.17, 0.1, 0.42]],
    ['sphere', 0xb9b6ad, [0, 0.6, 0.35], [0.18, 0.2, 0.2]],
    ['sphere', 0x7a7975, [0, 0.86, 0.62], [0.16, 0.15, 0.19]],
    ['cone', 0xa9a59b, [0, 0.81, 0.83], [0.08, 0.26, 0.08], [HALF_PI, 0, 0]],
    ['sphere', 0x1a1a1a, [0, 0.81, 0.96], [0.03, 0.03, 0.03]],
    ...both((s) => ['cone', 0x4b4a46, [s * 0.09, 1.03, 0.58], [0.05, 0.15, 0.04]]),
    ...both((s) => ['cyl', 0x5f5e5a, [s * 0.12, 0.3, 0.3], [0.05, 0.6, 0.05]]),
    ...both((s) => ['cyl', 0x5f5e5a, [s * 0.12, 0.3, -0.36], [0.05, 0.6, 0.05]]),
    ['sphere', 0x6c6b66, [0, 0.58, -0.75], [0.09, 0.09, 0.3], [-0.5, 0, 0]],
    ['sphere', 0xc9c6bd, [0, 0.44, -0.98], [0.06, 0.06, 0.1], [-0.5, 0, 0]],
  ],
  // Groß und braun mit Schulterbuckel – das größte Objekt auf dem Bildschirm.
  baer: [
    ['sphere', 0x5a3e29, [0, 1.05, -0.1], [1.0, 0.85, 1.35]],
    ['sphere', 0x4c3322, [0, 1.6, 0.3], [0.72, 0.45, 0.62]],
    ['sphere', 0x5a3e29, [0, 1.38, 1.3], [0.5, 0.45, 0.5]],
    ['sphere', 0x8b6a4b, [0, 1.24, 1.72], [0.25, 0.2, 0.26]],
    ['sphere', 0x1a1410, [0, 1.3, 1.96], [0.09, 0.07, 0.06]],
    ...both((s) => ['sphere', 0x4c3322, [s * 0.34, 1.76, 1.18], [0.15, 0.15, 0.08]]),
    ...both((s) => ['sphere', 0x111111, [s * 0.21, 1.5, 1.68], [0.05, 0.05, 0.05]]),
    ...both((s) => ['cyl', 0x42301f, [s * 0.55, 0.4, 0.75], [0.3, 0.8, 0.3]]),
    ...both((s) => ['cyl', 0x42301f, [s * 0.55, 0.4, -0.85], [0.3, 0.8, 0.3]]),
  ],
};

/** Flügel der Krähe, Drehpunkt an der Schulter (Ursprung); s = +1 links. */
const wingParts = (s) => [
  ['sphere', 0x24242b, [s * 0.38, 0, -0.02], [0.4, 0.03, 0.2]],
  ['sphere', 0x15151a, [s * 0.66, -0.01, -0.06], [0.16, 0.025, 0.13]],
];

/** Fassungsvermögen je Gegnertyp: 300 reguläre insgesamt plus ausgenommene Elite; Bären sind Bosse. */
/** 3D-Ersatz für Tiere ohne eigene Form: Kennung → Form aus ENEMY_PARTS. */
const FALLBACK_SHAPE = {
  fuchs: 'wolf', luchs: 'wolf', dachs: 'wildschwein', keiler: 'wildschwein', igel: 'ratte', kreuzotter: 'ratte',
  uhu: 'kraehe', hirsch: 'baer', wisent: 'baer',
};

/**
 * Eingerollter Igel: dreht das Bild um seine Mitte statt um die Fußlinie (Ausgleich über Hub und Ausfall)
 * und staucht es etwas zur Kugel.
 * @param {number} time
 * @param {number} height Bildhöhe in Metern
 */
function rollMotion(time, height) {
  const a = time * CURL_ROLL.spin, h = (height * CURL_ROLL.scale) / 2;
  return { tilt: a, offsetY: h * (1 - Math.cos(a)), lunge: -h * Math.sin(a), scaleX: CURL_ROLL.scale, scaleY: CURL_ROLL.scale };
}

const ENEMY_CAPACITY = 320;
const BOSS_CAPACITY = 4;
const CROW_HEIGHT = 1.3;
/** Gemalte Gegner wechseln die Blickseite nur, wenn der waagrechte Anteil der Bewegung mindestens so groß ist. */
const SPRITE_FLIP_RATIO = 0.25;
/** Objekte weiter als dies vom Helden werden nicht gezeichnet (Instanzen haben kein Frustum-Culling). */
const CULL_DISTANCE = 42;

/** Instanzfarben (Multiplikator der Vertexfarben, Werte > 1 hellen auf). */
const TINT = {
  elite: new THREE.Color(1.55, 1.2, 0.68),
  stun: new THREE.Color(1.3, 1.25, 0.6),
  confuse: new THREE.Color(1.25, 0.75, 1.35),
  slow: new THREE.Color(0.72, 0.95, 1.5),
};

/** Dein Schatten: Farbe (multipliziert das Heldenbild), Deckkraft, Ein- und Ausblenden (Weltsekunden). */
const SHADOW_LOOK = { color: 0x3a2264, opacity: 0.75, fadeIn: 0.6, fadeOut: 0.5, aura: 0x2a0f52 };

// ---------------------------------------------------------------- Instanzvorrat

/**
 * InstancedMesh mit Füllzähler. Mit `grow` verdoppelt sich die Kapazität bei Bedarf, sonst werden
 * überzählige Instanzen nicht gezeichnet.
 */
function createPool(scene, geometry, material, capacity, { grow = true, castShadow = false } = {}) {
  let cap = capacity, n = 0;
  let mesh = make(cap);
  function make(c) {
    const m = new THREE.InstancedMesh(geometry, material, c);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.frustumCulled = false;
    m.castShadow = castShadow;
    m.receiveShadow = false;
    m.count = 0;
    m.visible = false;
    scene.add(m);
    return m;
  }
  function enlarge() {
    const old = mesh;
    cap *= 2;
    mesh = make(cap);
    mesh.instanceMatrix.array.set(old.instanceMatrix.array);
    if (old.instanceColor) {
      mesh.setColorAt(0, _c.setRGB(1, 1, 1));
      mesh.instanceColor.array.set(old.instanceColor.array);
    }
    scene.remove(old);
    old.dispose();
  }
  return {
    begin() { n = 0; },
    /** @param {THREE.Matrix4} matrix @param {THREE.Color} [color] */
    push(matrix, color) {
      if (n >= cap) { if (!grow) return; enlarge(); }
      mesh.setMatrixAt(n, matrix);
      if (color) mesh.setColorAt(n, color);
      n++;
    },
    end() {
      mesh.count = n;
      mesh.visible = n > 0;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },
    dispose() { scene.remove(mesh); mesh.dispose(); },
  };
}

// ---------------------------------------------------------------- Ansicht

/**
 * Mit geladenen Bildbögen (`sprites.ok`) sind die Gegner gemalte Bildtafeln, sonst die 3D-Formen oben.
 * @param {THREE.Scene} scene
 * @param {{ sprites?: import('./sprites.js').SpriteSheets, camera?: THREE.Camera,
 *   env?: import('./environment.js').Environment }} [options]
 *   `env`: geladene Umgebungsbilder; damit ist auch das Aufsammelbare gemalt.
 * @returns {{ sync(world: import('../core/world.js').World, alpha: number): void, dispose(): void }}
 */
export function createEnemyView(scene, { sprites, camera, env } = {}) {
  const root = new THREE.Group();
  root.name = 'enemies';
  scene.add(root);
  const painted = !!sprites?.ok;

  const owned = { geometries: [], materials: [] };
  const geo = (g) => (owned.geometries.push(g), g);
  const mat = (m) => (owned.materials.push(m), m);
  const flat = (g) => geo(g.rotateX(-HALF_PI));

  const glowMat = (color, opacity = 1, additive = false) => mat(new THREE.MeshBasicMaterial({
    color, transparent: opacity < 1 || additive, opacity, depthWrite: !(opacity < 1 || additive),
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  }));
  const decalMat = (color, opacity, additive = false) => mat(new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
  }));
  const discGeo = flat(new THREE.CircleGeometry(1, 40));
  const ringGeo = flat(new THREE.RingGeometry(0.9, 1, 48));

  // Gegner: je Typ ein Instanzvorrat, gemalt oder als 3D-Form.
  /** @type {Record<string, ReturnType<typeof createPool>>} */
  const enemyPools = {};
  const capacity = (type) => (ENEMIES[type]?.behavior === 'boss' ? BOSS_CAPACITY : ENEMY_CAPACITY);
  /** @type {ReturnType<typeof createPool>[]} */
  let enemyExtras = [];
  let wingL = null, wingR = null, blobs;
  /** Bildmaße je Gegnertyp (nur gemalt). */
  const spriteSize = {};
  let orient = null;
  if (painted) {
    orient = billboardOrientation(camera);
    /** @type {Record<string, THREE.Material>} je Bildbogen ein Material */
    const sheetMats = {};
    const sheetMat = (sheet) => (sheetMats[sheet] ??= mat(spriteMaterial(sprites.textures[sheet])));
    for (const [type, def] of Object.entries(ENEMY_SPRITES)) {
      enemyPools[type] = createPool(root, geo(spriteGeometry(def, sprites.sizes[def.sheet])), sheetMat(def.sheet), capacity(type), { grow: false });
      spriteSize[type] = { width: spriteWidth(def), height: def.heightM };
    }
    blobs = createPool(root, discGeo, mat(shadowMaterial()), ENEMY_CAPACITY, { grow: false });
  } else {
    const furMat = mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 }));
    for (const type of Object.keys(ENEMY_PARTS)) {
      enemyPools[type] = createPool(root, geo(mergeParts(ENEMY_PARTS[type])), furMat, capacity(type), { grow: false, castShadow: true });
    }
    // Neue Tiere ohne eigene Form: Form eines ähnlichen Tiers, nach Körperradius skaliert.
    for (const [type, form] of Object.entries(FALLBACK_SHAPE)) {
      if (!ENEMIES[type]) continue;
      const g = mergeParts(ENEMY_PARTS[form]);
      g.scale(...Array(3).fill(ENEMIES[type].radius / ENEMIES[form].radius));
      enemyPools[type] = createPool(root, geo(g), furMat, capacity(type), { grow: false, castShadow: true });
    }
    wingL = createPool(root, geo(mergeParts(wingParts(1))), furMat, ENEMY_CAPACITY, { grow: false, castShadow: true });
    wingR = createPool(root, geo(mergeParts(wingParts(-1))), furMat, ENEMY_CAPACITY, { grow: false, castShadow: true });
    blobs = createPool(root, discGeo, decalMat(0x000000, 0.28), ENEMY_CAPACITY, { grow: false });
    enemyExtras = [wingL, wingR];
  }
  const fallbackPool = enemyPools.ratte;
  // Warmer Lichthof unter Elite-Gegnern: die Instanzfarbe allein hellt dunkle Felle (Krähe) kaum auf.
  const eliteHalo = createPool(root, discGeo, decalMat(0xffa040, 0.3, true), 64);

  // Dein Schatten: eine eigene Tafel mit dem Bild des Helden (bzw. seine 3D-Figur), dunkel violett und
  // durchscheinend, mit violettem Schein am Boden. Entsteht beim ersten Erscheinen.
  const shadowAura = createPool(root, discGeo, decalMat(SHADOW_LOOK.aura, 0.35), 2);
  /** @type {{ object: THREE.Object3D, material: THREE.Material, def?: import('../data/sprites.js').SpriteDef, width?: number }|null} */
  let shadowFigure = null;
  function ensureShadowFigure(hero) {
    if (shadowFigure) return shadowFigure;
    if (painted) {
      const def = HERO_SPRITES[`${hero.animalId}-${hero.classId}`];
      const material = mat(new THREE.MeshBasicMaterial({
        map: sprites.textures[def.sheet], color: SHADOW_LOOK.color, transparent: true, opacity: SHADOW_LOOK.opacity,
        alphaTest: BILLBOARD.alphaTest, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
      }));
      const object = new THREE.Mesh(geo(spriteGeometry(def, sprites.sizes[def.sheet])), material);
      object.matrixAutoUpdate = false;
      object.frustumCulled = false;
      shadowFigure = { object, material, def, width: spriteWidth(def) };
    } else {
      const material = mat(new THREE.MeshStandardMaterial({
        color: 0x1c1430, emissive: 0x3a1f66, emissiveIntensity: 0.8, roughness: 0.9, transparent: true, opacity: SHADOW_LOOK.opacity,
      }));
      const object = buildCharacter(hero.animalId, hero.classId);
      object.traverse((o) => { if (o.isMesh) { o.material = material; o.castShadow = false; o.receiveShadow = false; } });
      shadowFigure = { object, material };
    }
    shadowFigure.object.visible = false;
    root.add(shadowFigure.object);
    return shadowFigure;
  }

  // Geschosse
  const ballGeo = geo(new THREE.SphereGeometry(1, 12, 8));
  const fireCore = createPool(root, ballGeo, glowMat(0xffc070), 64);
  const fireHalo = createPool(root, ballGeo, glowMat(0xff5a10, 0.5, true), 64);
  const daggerGeo = geo(mergeParts([
    ['box', 0xe4e8ee, [0, 0, 0.14], [0.11, 0.03, 0.5]],
    ['cone', 0xe4e8ee, [0, 0, 0.44], [0.055, 0.14, 0.015], [HALF_PI, 0, 0]],
    ['box', 0x4a4f55, [0, 0, -0.13], [0.24, 0.05, 0.05]],
    ['box', 0x4d3a2a, [0, 0, -0.24], [0.06, 0.05, 0.17]],
  ]));
  const daggers = createPool(root, daggerGeo,
    mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.2, emissive: 0x30343a })), 128);
  const daggerTrail = createPool(root, ballGeo, glowMat(0xcfe0ff, 0.35, true), 128);
  const spitCore = createPool(root, ballGeo, glowMat(0xa6d84a), 64);
  const spitHalo = createPool(root, ballGeo, glowMat(0x5f9a18, 0.45, true), 64);
  const shadowShotCore = createPool(root, ballGeo, glowMat(0x2a1640), 32);
  const shadowShotHalo = createPool(root, ballGeo, glowMat(0x6a2cff, 0.4, true), 32);

  // Umlaufkugeln
  const orbCore = createPool(root, ballGeo, glowMat(0xe2d4ff), 16);
  const orbHalo = createPool(root, ballGeo, glowMat(0x8a5cff, 0.55, true), 16);

  // Zonen
  const poisonDisc = createPool(root, discGeo, decalMat(0x5f9a2c, 0.42), 16);
  const poisonRing = createPool(root, ringGeo, decalMat(0xa8d850, 0.75), 16);
  const burnDisc = createPool(root, discGeo, decalMat(0x9a3a10, 0.32), 16);
  const burnRing = createPool(root, ringGeo, decalMat(0xff8a30, 0.4, true), 16);
  const targetRing = createPool(root, ringGeo, decalMat(0xff7a2a, 0.85, true), 16);
  const targetFill = createPool(root, discGeo, decalMat(0xff4a1a, 0.3, true), 16);
  const otherDisc = createPool(root, discGeo, decalMat(0x9a9aa0, 0.35), 16);
  const meteorRock = createPool(root, geo(new THREE.IcosahedronGeometry(1, 1)), glowMat(0xffb050), 16);

  // Aufsammelbares: gemalt, wenn die Umgebungsbilder geladen sind, sonst die 3D-Formen.
  const paintedPickups = !!env?.ok;
  /** Weltmaße je Bild (nur gemalt). */
  const pickupSize = {};
  let xpPool, goldPool, potionPool, chestPool;
  if (paintedPickups) {
    if (!orient) orient = billboardOrientation(camera);
    const envMat = mat(spriteMaterial(env.objects));
    const pool = (kind, id, capacity) => {
      const def = ENV_SPRITES[id];
      pickupSize[kind] = { def, width: spriteWidth(def), height: def.heightM };
      return createPool(root, geo(spriteGeometry(def, env.sizes.objekte)), envMat, capacity, { grow: false });
    };
    xpPool = pool('xp', 'kristall', 512);
    goldPool = pool('gold', 'muenze', 64);
    potionPool = pool('potion', 'trank', 16);
    chestPool = pool('chest', 'truhe-zu', 8);
  } else {
    const pickupMat = mat(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.1 }));
    xpPool = createPool(root, geo(new THREE.OctahedronGeometry(1, 0)),
      mat(new THREE.MeshStandardMaterial({ color: 0x6fd0f0, emissive: 0x1d7aa8, emissiveIntensity: 1, roughness: 0.3 })), 512);
    goldPool = createPool(root, geo(new THREE.CylinderGeometry(1, 1, 0.16, 16).rotateX(HALF_PI)),
      mat(new THREE.MeshStandardMaterial({ color: 0xe6b432, emissive: 0x6a4500, emissiveIntensity: 0.8, roughness: 0.35, metalness: 0.7 })), 64);
    potionPool = createPool(root, geo(mergeParts([
      ['sphere', 0xc0343c, [0, 0.2, 0], [0.17, 0.17, 0.17]],
      ['sphere', 0xf3a0a0, [0.06, 0.26, 0.09], [0.04, 0.04, 0.04]],
      ['cyl', 0xddd6c8, [0, 0.4, 0], [0.06, 0.13, 0.06]],
      ['cyl', 0x8a6a42, [0, 0.49, 0], [0.068, 0.06, 0.068]],
    ])), pickupMat, 16, { castShadow: true });
    chestPool = createPool(root, geo(mergeParts([
      ['box', 0x6e4a2b, [0, 0.25, 0], [0.8, 0.5, 0.55]],
      ['box', 0x84592f, [0, 0.56, 0], [0.84, 0.14, 0.6]],
      ...both((s) => ['box', 0xd4a640, [s * 0.25, 0.33, 0], [0.08, 0.62, 0.62]]),
      ['box', 0xeac860, [0, 0.42, 0.3], [0.13, 0.15, 0.05]],
    ])), pickupMat, 8, { castShadow: true });
  }

  const allPools = [
    ...Object.values(enemyPools), ...enemyExtras, blobs, eliteHalo, shadowAura, fireCore, fireHalo, daggers, daggerTrail,
    spitCore, spitHalo, shadowShotCore, shadowShotHalo,
    orbCore, orbHalo, poisonDisc, poisonRing, burnDisc, burnRing, targetRing, targetFill, otherDisc, meteorRock,
    xpPool, goldPool, potionPool, chestPool,
  ];

  const tracker = createTracker();
  const m = new THREE.Matrix4(), wingRot = new THREE.Matrix4(), wm = new THREE.Matrix4();
  const pos = new THREE.Vector3(), scl = new THREE.Vector3(), euler = new THREE.Euler(), quat = new THREE.Quaternion();
  const color = new THREE.Color();

  /** Setzt m aus Position, Drehung (Euler YXZ: Gieren zuerst) und Skalierung. */
  function place(x, y, z, yaw, sx, sy = sx, sz = sx, pitch = 0, roll = 0) {
    euler.set(pitch, yaw, roll, 'YXZ');
    m.compose(pos.set(x, y, z), quat.setFromEuler(euler), scl.set(sx, sy, sz));
    return m;
  }

  /** Kleiner, stabiler Phasenversatz je Objekt aus seiner Position beim ersten Erscheinen. */
  const phases = new WeakMap();
  function phaseOf(obj) {
    let p = phases.get(obj);
    if (p === undefined) { p = ((obj.x * 12.9898 + obj.z * 78.233) % 6.283 + 6.283) % 6.283; phases.set(obj, p); }
    return p;
  }

  // Gangzustand je Gegner-id (nur gemalt): Position im letzten Logikschritt, geglättetes Tempo, Blickseite.
  /** @type {Map<number, { x: number, z: number, speed: number, face: 1|-1 }>} */
  let gait = new Map(), gaitNext = new Map();
  let gaitTime = NaN;

  /** Einmal je Logikschritt: Tempo und Blickseite aus der Bewegung seit dem letzten Schritt. */
  function updateGait(world) {
    if (world.time === gaitTime) return;
    const dt = world.time - gaitTime;
    gaitTime = world.time;
    const hero = world.hero;
    for (const e of world.enemies) {
      let g = gait.get(e.id);
      if (!g) {
        g = { x: e.x, z: e.z, speed: 0, face: hero.x >= e.x ? 1 : -1 };
      } else {
        const dx = e.x - g.x, dz = e.z - g.z;
        const d = Math.hypot(dx, dz);
        if (dt > 0 && d < SNAP_DISTANCE) g.speed += (d / dt - g.speed) * 0.35;
        // Fast senkrechte Bewegung behält die alte Seite.
        if (d > 1e-4 && Math.abs(dx) > SPRITE_FLIP_RATIO * d) g.face = dx > 0 ? 1 : -1;
        g.x = e.x; g.z = e.z;
      }
      gaitNext.set(e.id, g);
    }
    const old = gait;
    gait = gaitNext;
    gaitNext = old;
    gaitNext.clear();
  }

  /**
   * Zeichnet den Schatten: blendet nach dem Erscheinen ein, vor dem Ablauf und während der ganzen Flucht aus;
   * während der Vorwarnung seines Hiebs der Ausfall nach vorn wie beim Helden.
   */
  function drawShadow(world, e, alpha, t) {
    const fig = ensureShadowFigure(world.hero);
    const p = tracker.pos(e.id, e.x, e.z, alpha);
    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    const fadeIn = clamp01((t - (e.expiresAt - SHADOW.duration)) / SHADOW_LOOK.fadeIn);
    const fadeOut = e.fleeing
      ? clamp01((e.fleeUntil - t) / SHADOW.fleeDuration)
      : clamp01((e.expiresAt - t) / SHADOW_LOOK.fadeOut);
    const fade = Math.min(fadeIn, fadeOut);
    fig.material.opacity = SHADOW_LOOK.opacity * fade;
    fig.object.visible = fade > 0.01;
    const a = e.ai.attack;
    const attackT = e.ai.phase === 'swipe' && a ? clamp01(1 - (e.ai.until - t) / a.delay) * 0.5 : undefined;
    const ph = e.id * 1.7;
    if (painted) {
      const g = gait.get(e.id);
      const motion = spriteMotion(fig.def.motion, { speed: g?.speed ?? 0, time: t + ph, attackT });
      composeSprite(fig.object.matrix, orient, p.x, 0, p.z, fig.width, fig.def.heightM, g?.face ?? 1, motion, fig.def.footOffset);
      fig.object.matrixWorldNeedsUpdate = true;
      const sk = (1 - 0.35 * Math.min(1, motion.offsetY / 0.4)) * (0.4 + 0.6 * fade);
      blobs.push(place(p.x, 0.02, p.z, 0, fig.width * BILLBOARD.shadowWidth * sk, 1, fig.width * BILLBOARD.shadowDepth * sk));
    } else {
      const hero = world.hero;
      const yaw = Math.atan2(hero.x - p.x, hero.z - p.z) + (e.fleeing ? Math.PI : 0);
      fig.object.position.set(p.x, 0, p.z);
      fig.object.rotation.y = yaw;
      animateCharacter(fig.object, { speed: e.speed, time: t + ph, attackT });
    }
    if (fade > 0.01) shadowAura.push(place(p.x, 0.025, p.z, 0, (0.6 + 0.05 * Math.sin(t * 4)) * (0.5 + 0.5 * fade)));
  }

  function drawPaintedEnemies(world, alpha, t) {
    updateGait(world);
    const hero = world.hero;
    for (const e of world.enemies) {
      const dx = e.x - hero.x, dz = e.z - hero.z;
      if (dx * dx + dz * dz > CULL_DISTANCE * CULL_DISTANCE) continue;
      if (e.shadow) { drawShadow(world, e, alpha, t); continue; }
      const def = ENEMIES[e.type];
      const pool = enemyPools[e.type] || fallbackPool;
      const sprite = ENEMY_SPRITES[e.type] || ENEMY_SPRITES.ratte;
      const size = spriteSize[e.type] || spriteSize.ratte;
      const p = tracker.pos(e.id, e.x, e.z, alpha);
      const k = def ? e.radius / def.radius : 1;
      const stunned = world.time < e.stunnedUntil;
      const confused = world.time < e.confusedUntil && e.wander;
      const ph = e.id * 1.7;
      const g = gait.get(e.id);

      color.setRGB(1, 1, 1);
      if (e.elite) {
        const pulse = Math.sin(t * 5 + ph);
        color.multiply(TINT.elite).multiplyScalar(1 + 0.12 * pulse);
        eliteHalo.push(place(p.x, 0.03, p.z, 0, e.radius * (1.2 + 0.08 * pulse)));
      }
      if (stunned) color.multiply(TINT.stun);
      else if (confused) color.multiply(TINT.confuse);
      if (world.time < e.slowUntil) color.multiply(TINT.slow);

      let motion = spriteMotion(sprite.motion, { speed: stunned ? 0 : g?.speed ?? 0, time: t + ph });
      if (isCurled(world, e)) motion = rollMotion(t + ph, size.height * k);
      const lift = sprite.motion === 'fly' ? CROW_FLIGHT_HEIGHT * k : 0;
      pool.push(composeSprite(m, orient, p.x, lift, p.z, size.width * k, size.height * k, g?.face ?? 1, motion, sprite.footOffset * k), color);
      const air = lift + motion.offsetY;
      const sk = k * (1 - 0.35 * Math.min(1, air / 1.2));
      blobs.push(place(p.x, 0.02, p.z, 0, size.width * BILLBOARD.shadowWidth * sk, 1, size.width * BILLBOARD.shadowDepth * sk));
    }
  }

  function drawEnemies(world, alpha, t) {
    if (shadowFigure) shadowFigure.object.visible = false;
    if (painted) { drawPaintedEnemies(world, alpha, t); return; }
    const hero = world.hero;
    for (const e of world.enemies) {
      const dx = e.x - hero.x, dz = e.z - hero.z;
      if (dx * dx + dz * dz > CULL_DISTANCE * CULL_DISTANCE) continue;
      if (e.shadow) { drawShadow(world, e, alpha, t); continue; }
      const def = ENEMIES[e.type];
      const pool = enemyPools[e.type] || fallbackPool;
      const p = tracker.pos(e.id, e.x, e.z, alpha);
      const x = p.x, z = p.z;
      const confused = world.time < e.confusedUntil && e.wander;
      const yaw = confused ? Math.atan2(e.wander.x, e.wander.z) : Math.atan2(hero.x - x, hero.z - z);
      const k = def ? e.radius / def.radius : 1;
      const stunned = world.time < e.stunnedUntil;
      const ph = e.id * 1.7;

      color.setRGB(1, 1, 1);
      if (e.elite) {
        const pulse = Math.sin(t * 5 + ph);
        color.multiply(TINT.elite).multiplyScalar(1 + 0.12 * pulse);
        eliteHalo.push(place(x, 0.03, z, 0, e.radius * (1.2 + 0.08 * pulse)));
      }
      if (stunned) color.multiply(TINT.stun);
      else if (confused) color.multiply(TINT.confuse);
      if (world.time < e.slowUntil) color.multiply(TINT.slow);

      const gait = stunned ? 0 : t * 11 + ph;
      if (e.type === 'kraehe') {
        const y = (CROW_HEIGHT + 0.12 * Math.sin(t * 3 + ph)) * k;
        pool.push(place(x, y, z, yaw, k), color);
        const flap = stunned ? 0.2 : Math.sin(t * 14 + ph) * 0.65;
        wingL.push(wm.multiplyMatrices(m, wingRot.makeRotationZ(flap)), color);
        wingR.push(wm.multiplyMatrices(m, wingRot.makeRotationZ(-flap)), color);
        blobs.push(place(x, 0.025, z, 0, 0.42 * k));
      } else if (e.type === 'giftkroete') {
        const hop = Math.max(0, Math.sin(gait * 0.55));
        pool.push(place(x, hop * 0.22 * k, z, yaw, k, k * (1 - 0.12 * hop), k, -0.2 * hop), color);
      } else {
        const bob = Math.abs(Math.sin(gait)) * 0.05 * k * (e.boss ? 2 : 1);
        pool.push(place(x, bob, z, yaw, k, k, k, 0, Math.sin(gait) * 0.06), color);
      }
    }
  }

  function drawProjectiles(world, alpha, t) {
    for (const pr of world.projectiles) {
      const p = tracker.pos(pr, pr.x, pr.z, alpha);
      if (pr.abilityId === 'wurfdolche' || pr.abilityId === 'klingenfaecher') {
        const k = pr.size / 0.25;
        const yaw = Math.atan2(pr.dirX, pr.dirZ);
        daggers.push(place(p.x, 0.9, p.z, yaw, k * 1.15));
        daggerTrail.push(place(p.x - pr.dirX * 0.45, 0.9, p.z - pr.dirZ * 0.45, yaw, 0.07 * k, 0.04 * k, 0.55 * k));
      } else {
        const r = pr.size * (1 + 0.08 * Math.sin(t * 30));
        fireCore.push(place(p.x, 0.95, p.z, 0, r));
        fireHalo.push(place(p.x - pr.dirX * 0.15, 0.95, p.z - pr.dirZ * 0.15, Math.atan2(pr.dirX, pr.dirZ), r * 1.7, r * 1.7, r * 2.4));
      }
    }
    for (const pr of world.enemyProjectiles) {
      const p = tracker.pos(pr, pr.x, pr.z, alpha);
      const r = pr.radius * (1 + 0.1 * Math.sin(t * 20));
      if (pr.shadow) {
        shadowShotCore.push(place(p.x, 0.8, p.z, 0, r * 0.6));
        shadowShotHalo.push(place(p.x, 0.8, p.z, Math.atan2(pr.dirX, pr.dirZ), r * 0.95, r * 0.95, r * 1.6));
      } else {
        spitCore.push(place(p.x, 0.6, p.z, 0, r * 0.75));
        spitHalo.push(place(p.x, 0.6, p.z, 0, r * 1.35));
      }
    }
  }

  function drawOrbitals(world, alpha, t) {
    for (const o of world.orbitals) {
      const p = tracker.pos(o, o.x, o.z, alpha);
      const r = o.size * (1 + 0.1 * Math.sin(t * 8 + o.index));
      orbCore.push(place(p.x, 1.0, p.z, 0, r * 0.5));
      orbHalo.push(place(p.x, 1.0, p.z, 0, r * 1.0));
    }
  }

  function drawZones(world, t) {
    for (const zone of world.zones) {
      const r = zone.radius;
      if (!zone.landed) {
        // Vorwarnung: Zielkreis, sich füllende Fläche und herabstürzender Brocken.
        const delay = ABILITIES[zone.abilityId]?.base.delay || 1;
        const left = Math.max(0, Math.min(1, zone.delayLeft / delay));
        targetRing.push(place(zone.x, 0.05, zone.z, 0, r));
        targetFill.push(place(zone.x, 0.045, zone.z, 0, Math.max(0.01, r * (1 - left))));
        meteorRock.push(place(zone.x - 5 * left, 0.6 + 16 * left, zone.z - 5 * left, t * 4, 0.7));
      } else if (zone.abilityId === 'giftflaeche') {
        const wobble = 1 + 0.025 * Math.sin(t * 3 + zone.x);
        poisonDisc.push(place(zone.x, 0.035, zone.z, 0, r * wobble));
        poisonRing.push(place(zone.x, 0.04, zone.z, 0, r * wobble));
      } else if (zone.abilityId === 'meteor') {
        const flicker = 1 + 0.04 * Math.sin(t * 13 + zone.z);
        burnDisc.push(place(zone.x, 0.035, zone.z, 0, r * flicker));
        burnRing.push(place(zone.x, 0.04, zone.z, 0, r));
      } else {
        otherDisc.push(place(zone.x, 0.035, zone.z, 0, r));
      }
    }
  }

  /** Gemaltes Aufsammelbares: Bildtafel, die sanft auf und ab schwebt. */
  const pickupMotion = { offsetY: 0, tilt: 0, scaleX: 1, scaleY: 1, lunge: 0 };
  const pickupPools = () => ({ xp: xpPool, gold: goldPool, potion: potionPool, chest: chestPool });

  function drawPaintedPickups(world, t) {
    const hero = world.hero;
    const pools = pickupPools();
    for (const pk of world.pickups) {
      const dx = pk.x - hero.x, dz = pk.z - hero.z;
      if (dx * dx + dz * dz > CULL_DISTANCE * CULL_DISTANCE) continue;
      const size = pickupSize[pk.kind], pool = pools[pk.kind];
      if (!size || !pool) continue;
      // Größere Erfahrungssplitter wachsen leicht mit ihrem Wert, wie bei den 3D-Formen.
      const k = pk.kind === 'xp' ? Math.min(1.5, 0.85 + 0.18 * Math.log2(Math.max(1, pk.value))) : 1;
      pickupMotion.offsetY = 0.05 * (Math.sin(t * 3 + phaseOf(pk)) + 1);
      pool.push(composeSprite(m, orient, pk.x, 0, pk.z, size.width * k, size.height * k, 1, pickupMotion, size.def.footOffset * k));
    }
  }

  function drawPickups(world, t) {
    if (paintedPickups) { drawPaintedPickups(world, t); return; }
    const hero = world.hero;
    for (const pk of world.pickups) {
      const dx = pk.x - hero.x, dz = pk.z - hero.z;
      if (dx * dx + dz * dz > CULL_DISTANCE * CULL_DISTANCE) continue;
      const ph = phaseOf(pk);
      const bob = Math.sin(t * 3 + ph);
      if (pk.kind === 'xp') {
        const s = Math.min(0.38, 0.15 * (1 + 0.3 * Math.log2(Math.max(1, pk.value))));
        xpPool.push(place(pk.x, 0.32 + 0.07 * bob, pk.z, t * 2 + ph, s, s * 1.45, s));
      } else if (pk.kind === 'gold') {
        goldPool.push(place(pk.x, 0.34 + 0.06 * bob, pk.z, t * 3 + ph, 0.2));
      } else if (pk.kind === 'potion') {
        potionPool.push(place(pk.x, 0.04 + 0.05 * (bob + 1), pk.z, t * 1.2 + ph, 1.1));
      } else if (pk.kind === 'chest') {
        chestPool.push(place(pk.x, 0, pk.z, 0.4 + 0.08 * bob, 1, 1 + 0.03 * bob, 1));
      }
    }
  }

  /**
   * @param {import('../core/world.js').World} world
   * @param {number} alpha Anteil (0…1) des laufenden Logikschritts
   */
  function sync(world, alpha) {
    tracker.begin(world.time);
    const t = tracker.lerpTime(alpha);
    for (const pool of allPools) pool.begin();
    drawEnemies(world, alpha, t);
    drawProjectiles(world, alpha, t);
    drawOrbitals(world, alpha, t);
    drawZones(world, t);
    drawPickups(world, t);
    for (const pool of allPools) pool.end();
  }

  function dispose() {
    for (const pool of allPools) pool.dispose();
    if (shadowFigure) root.remove(shadowFigure.object);
    scene.remove(root);
    for (const g of owned.geometries) g.dispose();
    for (const mm of owned.materials) mm.dispose();
  }

  return { sync, dispose };
}
