import * as THREE from '../../vendor/three.module.min.js';
import { chestsNear } from '../core/chests.js';
import { MAP_CHESTS } from '../data/chests.js';

const BODY = { w: 1.0, h: 0.58, d: 0.64 };
const LID = { h: 0.32 };
const BAND_W = 0.1;
/** Winkel des geöffneten Deckels (Bogenmaß), er klappt nach hinten. */
const LID_OPEN = -1.95;

/**
 * Zeichnet die Kisten der Karte im Umkreis des Helden: geschlossen oder, wenn `world.openedChests` sie enthält,
 * mit hochgeklapptem Deckel. Eine einfache Holzkiste aus Quadern; Geometrien und Materialien entstehen einmal,
 * je Kiste nur ein paar Meshes beim Betreten des Umkreises. `sprites` ist für die gemalten Bilder reserviert.
 * @param {THREE.Scene} scene
 * @param {number} seed Startwert der Welt (`world.seed`)
 * @param {import('./sprites.js').SpriteSheets} [sprites]
 * @returns {{ sync(world: import('../core/world.js').World): void, dispose(): void }}
 */
export function createChestView(scene, seed, sprites) {
  const root = new THREE.Group();
  root.name = 'chests';
  scene.add(root);

  const wood = new THREE.MeshStandardMaterial({ color: 0x9a6431, roughness: 0.85 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x4d321a, roughness: 0.8 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xe0b341, roughness: 0.35, metalness: 0.6 });
  const inside = new THREE.MeshStandardMaterial({ color: 0x2a1a0d, roughness: 1 });
  const treasure = new THREE.MeshStandardMaterial({ color: 0xffd040, roughness: 0.3, metalness: 0.5, emissive: 0x6a4a00 });
  const materials = [wood, dark, metal, inside, treasure];

  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const geo = {
    body: box(BODY.w, BODY.h, BODY.d),
    lid: box(BODY.w + 0.04, LID.h, BODY.d + 0.04),
    band: box(BAND_W, BODY.h + 0.02, BODY.d + 0.05),
    lidBand: box(BAND_W, LID.h + 0.02, BODY.d + 0.09),
    lock: box(0.14, 0.16, 0.05),
    inside: box(BODY.w - 0.14, 0.02, BODY.d - 0.14),
    treasure: box(BODY.w - 0.3, 0.1, BODY.d - 0.28),
  };
  const geometries = Object.values(geo);

  function mesh(g, m, x, y, z) {
    const o = new THREE.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    return o;
  }

  /** Eine Kiste: Körper mit Bändern und Schloss, Deckel an einer Achse an der Hinterkante. */
  function build(chest) {
    const g = new THREE.Group();
    g.position.set(chest.x, 0, chest.z);
    // Blickrichtung aus der Zellkennung, damit nicht alle gleich stehen.
    const [cx, cz] = chest.id.split(':').map(Number);
    g.rotation.y = (((cx * 73856093) ^ (cz * 19349663)) % 628) / 100;
    g.add(mesh(geo.body, wood, 0, BODY.h / 2, 0));
    for (const x of [-0.3, 0.3]) g.add(mesh(geo.band, dark, x, BODY.h / 2, 0));
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, BODY.h, -BODY.d / 2);
    const lid = new THREE.Group();
    lid.position.set(0, 0, BODY.d / 2);
    lid.add(mesh(geo.lid, wood, 0, LID.h / 2, 0));
    for (const x of [-0.3, 0.3]) lid.add(mesh(geo.lidBand, dark, x, LID.h / 2, 0));
    lid.add(mesh(geo.lock, metal, 0, 0.02, BODY.d / 2 + 0.03));
    lidPivot.add(lid);
    const filling = new THREE.Group();
    filling.add(mesh(geo.inside, inside, 0, BODY.h - 0.01, 0), mesh(geo.treasure, treasure, 0, BODY.h - 0.04, 0));
    filling.visible = false;
    g.add(lidPivot, filling);
    return { group: g, lidPivot, filling, open: false };
  }

  function setOpen(entry, open) {
    entry.open = open;
    entry.lidPivot.rotation.x = open ? LID_OPEN : 0;
    entry.filling.visible = open;
  }

  /** @type {Map<string, ReturnType<typeof build>>} */
  const shown = new Map();
  const seen = new Set();

  /** @param {import('../core/world.js').World} world */
  function sync(world) {
    const hero = world.hero;
    seen.clear();
    for (const chest of chestsNear(seed, hero.x, hero.z, MAP_CHESTS.viewRange)) {
      seen.add(chest.id);
      let entry = shown.get(chest.id);
      if (!entry) {
        entry = build(chest);
        shown.set(chest.id, entry);
        root.add(entry.group);
        setOpen(entry, world.openedChests.has(chest.id));
      } else {
        const open = world.openedChests.has(chest.id);
        if (open !== entry.open) setOpen(entry, open);
      }
    }
    for (const [id, entry] of shown) {
      if (seen.has(id)) continue;
      root.remove(entry.group);
      shown.delete(id);
    }
  }

  function dispose() {
    scene.remove(root);
    shown.clear();
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
  }

  return { sync, dispose };
}
