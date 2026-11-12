import * as THREE from '../../vendor/three.module.min.js';

/**
 * Heldenfiguren aus Grundkörpern. Lokale Achsen: y oben, Blickrichtung (vorn) ist +z,
 * die rechte Hand liegt bei -x. Füße stehen auf y = 0, Kopfhöhe etwa 1.6.
 *
 * Geometrien und Materialien werden zwischen allen Figuren geteilt (Caches unten); eine Figur
 * entfernt man daher nur aus der Szene, ohne ihre Geometrien oder Materialien freizugeben.
 *
 * @typedef {{ hand: THREE.Group, offHand: THREE.Group, head: THREE.Group, torso: THREE.Group }} AttachPoints
 * @typedef {{ body: THREE.Group, head: THREE.Group, armL: THREE.Group, armR: THREE.Group,
 *   legL: THREE.Group, legR: THREE.Group, tail: THREE.Group, ears?: THREE.Group[] }} CharacterParts
 * @typedef {{ speed?: number, time?: number, attackT?: number }} AnimationInput
 */

// ---------------------------------------------------------------- caches

const materials = new Map();

/** Geteiltes mattes Material je Farbe/Eigenschaften. */
function mat(color, { rough = 0.85, metal = 0, emissive = 0x000000, glow = 0, side = THREE.FrontSide } = {}) {
  const key = `${color}|${rough}|${metal}|${emissive}|${glow}|${side}`;
  let m = materials.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, emissive, emissiveIntensity: glow, side });
    materials.set(key, m);
  }
  return m;
}

const geometries = new Map();
function geo(key, make) {
  let g = geometries.get(key);
  if (!g) geometries.set(key, g = make());
  return g;
}
const SPHERE = () => geo('sphere', () => new THREE.SphereGeometry(1, 20, 14));
const CAPSULE = () => geo('capsule', () => new THREE.CapsuleGeometry(1, 1, 6, 12));
const CYL = () => geo('cyl', () => new THREE.CylinderGeometry(1, 1, 1, 14));
const CONE = () => geo('cone', () => new THREE.ConeGeometry(1, 1, 16));
const BOX = () => geo('box', () => new THREE.BoxGeometry(1, 1, 1));

/**
 * Netz mit Position, Skalierung und Drehung, wirft und empfängt Schatten.
 * @param {THREE.Object3D} parent
 */
function add(parent, geometry, material, [x = 0, y = 0, z = 0] = [], [sx = 1, sy = 1, sz = 1] = [], [rx = 0, ry = 0, rz = 0] = []) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

/** Kapsel mit Radius r und Gesamtlänge len (inkl. Kappen) entlang y. */
function capsule(parent, material, pos, r, len, rot) {
  return add(parent, CAPSULE(), material, pos, [r, Math.max(0.001, len - 2 * r), r], rot);
}

function group(parent, [x = 0, y = 0, z = 0] = [], name = '') {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

// ---------------------------------------------------------------- Farben

const EYE = mat(0x15110e, { rough: 0.25 });
const NOSE_DARK = mat(0x1d1a18, { rough: 0.4 });

const ANIMAL_LOOK = {
  hase: {
    fur: 0x8a7560, light: 0xd6c8b0, inner: 0xb48b80, nose: 0x9c6c68,
    hipY: 0.46, torso: [0.25, 0.34, 0.21], shoulderX: 0.25,
  },
  ente: {
    fur: 0xe6e1d4, light: 0xf2eee4, bill: 0xcf7a2c, feet: 0xd0802f,
    hipY: 0.36, torso: [0.3, 0.38, 0.32], shoulderX: 0.28,
  },
  waschbaer: {
    fur: 0x76726b, light: 0xccc6bb, mask: 0x23201d, ring: 0x2e2a26, nose: 0x1d1a18,
    hipY: 0.44, torso: [0.27, 0.35, 0.23], shoulderX: 0.26,
  },
};

// ---------------------------------------------------------------- Tiere

function buildHaseHead(head, look) {
  const fur = mat(look.fur), light = mat(look.light);
  add(head, SPHERE(), fur, [0, 0, 0], [0.18, 0.17, 0.2]);
  add(head, SPHERE(), light, [0, -0.06, 0.12], [0.11, 0.08, 0.1]);       // Schnauze
  add(head, SPHERE(), light, [0.055, -0.07, 0.17], [0.05, 0.045, 0.045]); // Backen
  add(head, SPHERE(), light, [-0.055, -0.07, 0.17], [0.05, 0.045, 0.045]);
  add(head, SPHERE(), mat(look.nose, { rough: 0.5 }), [0, -0.03, 0.215], [0.025, 0.018, 0.015]);
  for (const s of [1, -1]) add(head, SPHERE(), EYE, [s * 0.12, 0.035, 0.1], [0.032, 0.036, 0.03]);
  const ears = [];
  for (const s of [1, -1]) {
    const ear = group(head, [s * 0.065, 0.13, -0.04], s > 0 ? 'earL' : 'earR');
    ear.rotation.set(-0.22, 0, s * -0.16);
    add(ear, SPHERE(), fur, [0, 0.24, 0], [0.055, 0.26, 0.03]);
    add(ear, SPHERE(), mat(look.inner), [0, 0.23, 0.017], [0.034, 0.2, 0.014]);
    ears.push(ear);
  }
  return ears;
}

function buildEnteHead(head, look) {
  const fur = mat(look.fur), bill = mat(look.bill, { rough: 0.6 });
  capsule(head, fur, [0, -0.12, -0.02], 0.09, 0.26);                   // Hals
  add(head, SPHERE(), fur, [0, 0.03, 0.03], [0.135, 0.14, 0.18]);
  add(head, SPHERE(), fur, [0, 0.1, 0.0], [0.09, 0.06, 0.13]);          // Scheitel
  // Breiter, flacher Entenschnabel, vorn abgerundet und leicht gespreizt.
  add(head, BOX(), bill, [0, -0.015, 0.2], [0.1, 0.035, 0.12], [0.08, 0, 0]);
  add(head, SPHERE(), bill, [0, -0.02, 0.27], [0.065, 0.022, 0.06]);
  add(head, SPHERE(), bill, [0, -0.045, 0.2], [0.07, 0.018, 0.1]);     // Unterschnabel
  for (const s of [1, -1]) add(head, SPHERE(), EYE, [s * 0.11, 0.05, 0.09], [0.024, 0.028, 0.022]);
  return undefined;
}

function buildWaschbaerHead(head, look) {
  const fur = mat(look.fur), light = mat(look.light), mask = mat(look.mask, { rough: 0.9 });
  add(head, SPHERE(), fur, [0, 0, 0], [0.2, 0.17, 0.18]);
  add(head, SPHERE(), light, [0, 0.025, 0.08], [0.16, 0.12, 0.12]);      // helles Gesicht
  add(head, CONE(), light, [0, -0.045, 0.2], [0.085, 0.16, 0.07], [Math.PI / 2, 0, 0]); // Schnauze
  add(head, SPHERE(), NOSE_DARK, [0, -0.045, 0.28], [0.03, 0.024, 0.024]);
  // Augenmaske: dunkles Band über beide Augen bis zu den Seiten, auch von oben sichtbar.
  add(head, SPHERE(), mask, [0, 0.03, 0.115], [0.19, 0.055, 0.09], [-0.15, 0, 0]);
  add(head, SPHERE(), fur, [0, 0.03, 0.135], [0.025, 0.06, 0.06]);       // Steg zwischen den Augen
  for (const s of [1, -1]) {
    add(head, SPHERE(), EYE, [s * 0.075, 0.035, 0.19], [0.026, 0.026, 0.02]);
    add(head, SPHERE(), light, [s * 0.075, 0.085, 0.16], [0.06, 0.022, 0.04]); // helle Brauen
  }
  const ears = [];
  for (const s of [1, -1]) {
    const ear = group(head, [s * 0.13, 0.13, -0.03], s > 0 ? 'earL' : 'earR');
    ear.rotation.z = s * -0.35;
    add(ear, SPHERE(), light, [0, 0.03, -0.005], [0.075, 0.075, 0.025]);
    add(ear, SPHERE(), mat(look.mask), [0, 0.025, 0.008], [0.055, 0.058, 0.02]);
    ears.push(ear);
  }
  return ears;
}

function buildTail(animalId, tail, look) {
  if (animalId === 'hase') {
    tail.position.set(0, 0.06, -0.2);
    add(tail, SPHERE(), mat(look.light, { rough: 1 }), [0, 0, -0.03], [0.085, 0.08, 0.075]);
  } else if (animalId === 'ente') {
    // Bürzel: spitz nach hinten oben gestellte Schwanzfedern.
    tail.position.set(0, 0.12, -0.27);
    tail.rotation.x = -0.6;
    add(tail, CONE(), mat(look.fur), [0, 0.06, -0.06], [0.12, 0.2, 0.06], [-Math.PI / 2 - 0.3, 0, 0]);
    add(tail, CONE(), mat(look.fur), [0, 0.12, -0.08], [0.05, 0.09, 0.03], [-0.4, 0, 0]);
  } else {
    // Buschiger Ringelschwanz: Glieder abwechselnd grau und dunkel, nach hinten unten geschwungen.
    tail.position.set(0, 0.0, -0.2);
    tail.rotation.x = -0.2;
    const n = 7;
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const r = 0.105 - 0.035 * t * t;
      const y = -0.02 - 0.03 * t;
      const z = -0.04 - i * 0.095;
      add(tail, SPHERE(), mat(i % 2 ? look.ring : look.fur, { rough: 1 }), [0, y, z], [r, r * 0.95, 0.07]);
    }
    add(tail, SPHERE(), mat(look.ring, { rough: 1 }), [0, -0.05, -0.04 - n * 0.095 + 0.03], [0.05, 0.05, 0.06]);
  }
}

// ---------------------------------------------------------------- Klassen

const STEEL = () => mat(0x8e9398, { rough: 0.42, metal: 0.55 });
const STEEL_DARK = () => mat(0x5d6166, { rough: 0.5, metal: 0.45 });
const LEATHER = () => mat(0x4d3a2a, { rough: 0.8 });
const WOOD = () => mat(0x5b4631, { rough: 0.85 });

function sword(hand) {
  const s = group(hand, [0, 0, 0.02], 'sword');
  s.rotation.x = 0.15;
  capsule(s, LEATHER(), [0, 0, 0], 0.022, 0.14, [Math.PI / 2, 0, 0]);
  add(s, BOX(), STEEL_DARK(), [0, 0, 0.08], [0.2, 0.03, 0.04]);
  add(s, BOX(), STEEL(), [0, 0, 0.42], [0.055, 0.012, 0.64]);
  add(s, CONE(), STEEL(), [0, 0, 0.77], [0.039, 0.07, 0.009], [Math.PI / 2, 0, 0]);
  add(s, SPHERE(), STEEL_DARK(), [0, 0, -0.08], [0.03, 0.03, 0.03]);
}

function shield(offHand) {
  const s = group(offHand, [0.06, 0.08, 0.04], 'shield');
  s.rotation.set(0, Math.PI / 2 - 0.5, 0);
  add(s, CYL(), WOOD(), [0, 0, 0], [0.24, 0.04, 0.24], [Math.PI / 2, 0, 0]);
  add(s, CYL(), STEEL_DARK(), [0, 0, -0.003], [0.255, 0.034, 0.255], [Math.PI / 2, 0, 0]);
  add(s, SPHERE(), STEEL(), [0, 0, 0.025], [0.07, 0.07, 0.045]);
}

function staff(hand) {
  const s = group(hand, [0, 0, 0.03], 'staff');
  s.rotation.x = 0.3;
  add(s, CYL(), WOOD(), [0, 0.3, 0], [0.026, 1.55, 0.026]);
  add(s, SPHERE(), WOOD(), [0, 1.08, 0], [0.05, 0.06, 0.05]);
  // Leuchtende Kugel: selbstleuchtend, damit sie auch im Schatten auffällt.
  add(s, SPHERE(), mat(0xbfe4f2, { rough: 0.3, emissive: 0x6fc4e8, glow: 1.6 }), [0, 1.18, 0], [0.085, 0.085, 0.085]).castShadow = false;
}

function dagger(hand, name) {
  const d = group(hand, [0, 0, 0.02], name);
  d.rotation.x = 0.25;
  capsule(d, LEATHER(), [0, 0, 0], 0.018, 0.1, [Math.PI / 2, 0, 0]);
  add(d, BOX(), STEEL_DARK(), [0, 0, 0.055], [0.1, 0.02, 0.025]);
  add(d, BOX(), STEEL(), [0, 0, 0.2], [0.04, 0.01, 0.27]);
  add(d, CONE(), STEEL(), [0, 0, 0.36], [0.028, 0.05, 0.007], [Math.PI / 2, 0, 0]);
}

function dressKrieger(c, look) {
  const { body, armL, armR } = c.parts;
  const [tx, ty, tz] = look.torso;
  const ty0 = ty;
  add(body, SPHERE(), mat(0x6b3a2c), [0, ty0 - 0.03, 0], [tx * 1.05, ty * 0.75, tz * 1.06]);          // Waffenrock
  add(body, SPHERE(), STEEL(), [0, ty0 + 0.07, 0.01], [tx * 1.1, ty * 0.68, tz * 1.12]);              // Brustplatte
  add(body, CYL(), LEATHER(), [0, ty0 - 0.18, 0], [tx * 0.98, 0.06, tz * 0.98]);                      // Gürtel
  add(body, BOX(), STEEL_DARK(), [0, ty0 - 0.18, tz * 0.97], [0.07, 0.06, 0.02]);
  for (const arm of [armL, armR]) {
    add(arm, SPHERE(), STEEL(), [0, 0.0, 0], [0.13, 0.1, 0.14]);                                    // Schulterstück
    add(arm, SPHERE(), STEEL_DARK(), [0, -0.035, 0], [0.135, 0.06, 0.145]);
  }
  sword(c.attach.hand);
  shield(c.attach.offHand);
}

function dressMagier(c, look) {
  const { body, armL, armR } = c.parts;
  const [, ty] = look.torso;
  const robe = mat(0x3c4865), trim = mat(0x8c7646, { rough: 0.6, metal: 0.3 });
  // Robe von den Schultern bis knapp über den Boden; deckt die Beine.
  const hipY = look.hipY;
  const top = ty + 0.25, bottom = -hipY + 0.06;
  const profile = [
    [0.0, bottom], [0.34, bottom], [0.33, bottom + 0.06], [0.27, -0.05], [0.25, ty * 0.6],
    [0.24, top - 0.06], [0.16, top], [0.0, top + 0.01],
  ].map(([x, y]) => new THREE.Vector2(x * (look.torso[0] / 0.26), y));
  const robeGeo = geo('robe:' + look.torso[0] + ':' + hipY + ':' + ty, () => new THREE.LatheGeometry(profile, 20));
  add(body, robeGeo, robe, [0, 0, 0], [1, 1, look.torso[2] / look.torso[0] * 1.2]);
  add(body, CYL(), trim, [0, ty * 0.15, 0], [look.torso[0] * 1.1, 0.05, look.torso[2] * 1.18]);       // Gürtel
  for (const arm of [armL, armR]) {
    add(arm, CONE(), robe, [0, -0.2, 0], [0.11, 0.38, 0.11], [Math.PI, 0, 0]);                       // weite Ärmel
  }
  const hat = group(c.attach.head, [0, -0.02, -0.01], 'hat');
  hat.rotation.x = -0.32;
  const hatMat = mat(0x333d58);
  add(hat, CYL(), hatMat, [0, 0, -0.02], [0.25, 0.025, 0.25]);
  add(hat, CYL(), trim, [0, 0.03, 0], [0.165, 0.04, 0.165]);
  const tip = group(hat, [0, 0.03, 0]);
  tip.rotation.x = -0.25;
  add(tip, CONE(), hatMat, [0, 0.28, 0], [0.16, 0.56, 0.16]);
  staff(c.attach.hand);
}

function dressDieb(c, look) {
  const { body } = c.parts;
  const [tx, ty, tz] = look.torso;
  const cloth = mat(0x47503d), clothIn = mat(0x47503d, { side: THREE.DoubleSide });
  add(body, SPHERE(), mat(0x4e3d2d), [0, ty, 0.005], [tx * 1.06, ty * 0.85, tz * 1.08]);             // Lederwams
  add(body, CYL(), LEATHER(), [0, ty - 0.17, 0], [tx * 0.98, 0.05, tz * 0.98]);
  add(body, BOX(), LEATHER(), [tx * 0.55, ty - 0.12, tz * 0.6], [0.06, 0.12, 0.05], [0, 0, 0.3]);   // Gürteltasche
  // Umhang: offener Halbzylinder hinten, unten weiter.
  const cloakGeo = geo('cloak', () => new THREE.CylinderGeometry(0.85, 1.05, 1, 16, 1, true, Math.PI / 2 + 0.35, Math.PI * 2 - 0.7 - Math.PI));
  const cloakTop = ty + 0.27, cloakBottom = -look.hipY * 0.5;
  add(body, cloakGeo, clothIn, [0, (cloakTop + cloakBottom) / 2, -0.02], [tx * 1.15, cloakTop - cloakBottom, tz * 1.3]);
  add(body, SPHERE(), cloth, [0, ty + 0.24, 0], [tx * 0.95, 0.07, tz * 1.05]);                     // Kragen
  // Kapuze: Kugelschale mit Öffnung nach vorn, Zipfel hinten.
  const hoodGeo = geo('hood', () => new THREE.SphereGeometry(1, 18, 12, Math.PI / 2 + 1.15, Math.PI * 2 - 2.3, 0, Math.PI * 0.78));
  const hood = group(c.attach.head, [0, -0.15, -0.015], 'hood');
  add(hood, hoodGeo, clothIn, [0, 0, 0], [0.235, 0.23, 0.235]);
  add(hood, CONE(), cloth, [0, 0.06, -0.21], [0.08, 0.2, 0.06], [-2.1, 0, 0]);
  dagger(c.attach.hand, 'daggerR');
  dagger(c.attach.offHand, 'daggerL');
}

const DRESS = { krieger: dressKrieger, magier: dressMagier, dieb: dressDieb };

// ---------------------------------------------------------------- Aufbau

/**
 * Baut eine Heldenfigur. Blickrichtung +z; die Gruppe dreht man über `rotation.y`.
 * @param {'hase'|'ente'|'waschbaer'} animalId
 * @param {'krieger'|'magier'|'dieb'} classId
 * @returns {THREE.Group} mit `userData.parts` ({@link CharacterParts}) und `userData.attach` ({@link AttachPoints})
 */
export function buildCharacter(animalId, classId) {
  const look = ANIMAL_LOOK[animalId];
  if (!look) throw new Error('Unbekanntes Tier: ' + animalId);
  if (!DRESS[classId]) throw new Error('Unbekannte Klasse: ' + classId);
  const fur = mat(look.fur), light = mat(look.light);
  const [tx, ty, tz] = look.torso;
  const duck = animalId === 'ente';

  const root = new THREE.Group();
  root.name = `hero:${animalId}:${classId}`;

  // Beine: Drehpunkt an der Hüfte, hängen nach unten.
  const legs = [];
  for (const s of [1, -1]) {
    const leg = group(root, [s * 0.11, look.hipY, 0], s > 0 ? 'legL' : 'legR');
    const len = look.hipY;
    if (duck) {
      const foot = mat(look.feet, { rough: 0.6 });
      capsule(leg, foot, [0, -len / 2, 0], 0.035, len);
      add(leg, SPHERE(), foot, [0, -len + 0.02, 0.08], [0.1, 0.022, 0.14]);
    } else {
      capsule(leg, fur, [0, -len * 0.45, 0], 0.085, len * 0.85);
      const footMat = animalId === 'waschbaer' ? mat(look.ring) : fur;
      const fl = animalId === 'hase' ? [0.075, 0.05, 0.17] : [0.07, 0.045, 0.11];
      add(leg, SPHERE(), footMat, [0, -len + 0.04, fl[2] * 0.5], fl);
    }
    legs.push(leg);
  }

  // Rumpf: Drehpunkt an der Hüfte; trägt Arme, Kopf und Schwanz.
  const body = group(root, [0, look.hipY, 0], 'body');
  // Ente: birnenförmiger, nach vorn geneigter Rumpf mit weit hinten liegendem Bürzel.
  add(body, SPHERE(), fur, [0, ty, duck ? -0.03 : 0], [tx, ty, tz], [duck ? 0.25 : 0, 0, 0]);
  if (duck) {
    add(body, SPHERE(), fur, [0, ty * 0.75, 0.1], [tx * 0.85, ty * 0.75, tz * 0.85]); // Brust
  } else {
    add(body, SPHERE(), light, [0, ty * 0.9, tz * 0.3], [tx * 0.75, ty * 0.8, tz * 0.75]); // heller Bauch
  }
  const torso = group(body, [0, ty, 0], 'torsoAttach');

  const arms = [];
  const shoulderY = ty * 1.65;
  for (const s of [1, -1]) {
    const arm = group(body, [s * look.shoulderX, shoulderY, 0], s > 0 ? 'armL' : 'armR');
    let hand;
    if (duck) {
      // Flügel statt Armen; Federspitzen etwas dunkler.
      add(arm, SPHERE(), fur, [s * 0.02, -0.17, -0.02], [0.065, 0.22, 0.14], [0.15, 0, s * 0.08]);
      add(arm, SPHERE(), mat(0xc9c4b6), [s * 0.03, -0.33, -0.05], [0.04, 0.09, 0.09], [0.3, 0, 0]);
      hand = group(arm, [s * 0.01, -0.36, 0.03], s > 0 ? 'offHand' : 'hand');
    } else {
      capsule(arm, fur, [0, -0.17, 0], 0.062, 0.38);
      add(arm, SPHERE(), animalId === 'waschbaer' ? mat(look.ring) : light, [0, -0.37, 0.01], [0.065, 0.065, 0.065]);
      hand = group(arm, [0, -0.38, 0.02], s > 0 ? 'offHand' : 'hand');
    }
    arms.push({ arm, hand });
  }

  const head = group(body, [0, shoulderY + (duck ? 0.2 : 0.17), duck ? 0.06 : 0.02], 'head');
  const ears = animalId === 'hase' ? buildHaseHead(head, look)
    : animalId === 'ente' ? buildEnteHead(head, look)
      : buildWaschbaerHead(head, look);
  const headAttach = group(head, [0, duck ? 0.15 : 0.15, 0], 'headAttach');

  const tail = group(body, [0, 0, 0], 'tail');
  buildTail(animalId, tail, look);

  const parts = {
    body, head, armL: arms[0].arm, armR: arms[1].arm, legL: legs[0], legR: legs[1], tail,
    ...(ears ? { ears } : {}),
  };
  const attach = { hand: arms[1].hand, offHand: arms[0].hand, head: headAttach, torso };
  root.userData.parts = parts;
  root.userData.attach = attach;
  root.userData.animalId = animalId;
  root.userData.classId = classId;

  DRESS[classId]({ parts, attach }, look);

  // Ruhehaltung merken, damit animateCharacter rein aus den Eingaben rechnen kann.
  root.userData.rest = {
    bodyY: body.position.y,
    tailX: tail.rotation.x,
    armSpread: duck ? 0.22 : 0.12,
    armForward: classId === 'magier' ? -0.45 : -0.3,
    earX: ears ? ears.map((e) => e.rotation.x) : [],
  };
  animateCharacter(root, {});
  return root;
}

// ---------------------------------------------------------------- Animation

const STRIDE_RATE = 9;       // rad/s Schrittphase
const FULL_SPEED = 5;        // ab diesem Tempo volle Schrittweite
const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Setzt die Pose rein aus den Eingaben (keine innere Uhr): gleiche Eingaben → gleiche Pose.
 * @param {THREE.Group} group Rückgabe von {@link buildCharacter}
 * @param {AnimationInput} input speed in m/s, time in s, attackT 0→1 während eines Hiebs (sonst weglassen)
 */
export function animateCharacter(group, { speed = 0, time = 0, attackT } = {}) {
  const { parts, rest } = group.userData;
  const move = Math.min(1, Math.max(0, speed) / FULL_SPEED);
  const phase = time * STRIDE_RATE;
  const swing = Math.sin(phase) * 0.8 * move;
  const breathe = Math.sin(time * 2.1);

  parts.legL.rotation.x = swing;
  parts.legR.rotation.x = -swing;

  let armR = rest.armForward - swing * 0.7 + breathe * 0.03;
  const armL = rest.armForward + swing * 0.7 - breathe * 0.03;
  let twist = 0;
  if (attackT !== undefined && attackT > 0 && attackT < 1) {
    // Ausholen über den Kopf, Hieb nach vorn unten, zurück in die Ruhehaltung.
    const up = -2.6, down = -0.15;
    if (attackT < 0.35) {
      const k = smooth(attackT / 0.35);
      armR = lerp(armR, up, k); twist = lerp(0, -0.45, k);
    } else if (attackT < 0.6) {
      const k = smooth((attackT - 0.35) / 0.25);
      armR = lerp(up, down, k); twist = lerp(-0.45, 0.5, k);
    } else {
      const k = smooth((attackT - 0.6) / 0.4);
      armR = lerp(down, armR, k); twist = lerp(0.5, 0, k);
    }
  }
  parts.armR.rotation.set(armR, 0, -rest.armSpread);
  parts.armL.rotation.set(armL, 0, rest.armSpread);

  parts.body.position.y = rest.bodyY + Math.abs(Math.cos(phase)) * 0.05 * move + breathe * 0.006;
  parts.body.rotation.set(0.12 * move, twist, Math.sin(phase) * 0.04 * move);
  parts.head.rotation.set(-0.08 * move, -twist * 0.4, 0);
  parts.tail.rotation.set(rest.tailX, Math.sin(time * 2.6) * 0.18 + Math.sin(phase) * 0.2 * move, 0);
  if (parts.ears) {
    for (let i = 0; i < parts.ears.length; i++) {
      parts.ears[i].rotation.x = rest.earX[i] - 0.25 * move + Math.sin(time * 1.7 + i) * 0.04;
    }
  }
}
