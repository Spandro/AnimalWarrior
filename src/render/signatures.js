// Darstellung der Besonderheiten der Unterklassen (Spec §7): Schild-Schimmer, Raserei-Schimmer, Gewitterwolke,
// Erdmännchen, Fallen, Markierungsringe und Heiltopf als einfache 3D-Formen. Liest nur den Weltzustand.
import * as THREE from '../../vendor/three.module.min.js';
import { SIGNATURE_LOOK as L } from '../data/adventure.js';

/**
 * @param {THREE.Scene} scene
 * @returns {{ sync(world: import('../core/world.js').World, heroPos: { x: number, z: number }): void, dispose(): void }}
 */
export function createSignatureView(scene) {
  const root = new THREE.Group();
  root.name = 'signatures';
  scene.add(root);
  const geos = [], mats = [];
  const geo = (g) => { geos.push(g); return g; };
  const mat = (m) => { mats.push(m); return m; };
  const glass = (color, opacity) => mat(new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));

  const sphere = geo(new THREE.SphereGeometry(1, 20, 14));
  const disc = geo(new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2));
  const ring = geo(new THREE.RingGeometry(0.85, 1, 40).rotateX(-Math.PI / 2));
  const cylinder = geo(new THREE.CylinderGeometry(1, 0.8, 1, 16));
  const petBody = geo(new THREE.CapsuleGeometry(L.pet.radius, L.pet.height, 4, 10));

  const shieldMat = glass(L.shield.color, L.shield.opacity);
  const rageMat = glass(L.rage.color, L.rage.opacity);
  const cloudMat = mat(new THREE.MeshLambertMaterial({ color: L.cloud.color, transparent: true, opacity: L.cloud.opacity }));
  const petMat = mat(new THREE.MeshLambertMaterial({ color: L.pet.color }));
  const trapMat = glass(L.trap.color, L.trap.opacity);
  const trapEdgeMat = glass(L.trap.edge, 1);
  const markMat = glass(L.mark.color, L.mark.opacity);
  const potMat = mat(new THREE.MeshLambertMaterial({ color: L.pot.color }));

  const shieldMesh = new THREE.Mesh(sphere, shieldMat);
  const rageMesh = new THREE.Mesh(sphere, rageMat);
  shieldMesh.scale.setScalar(L.shield.radius);
  rageMesh.scale.setScalar(L.rage.radius);
  root.add(shieldMesh, rageMesh);

  /** Wiederverwendbare Meshes einer Art; `show(n)` blendet die ersten n ein, den Rest aus. */
  function pool(make) {
    const items = [];
    return {
      get(i) { while (items.length <= i) { const m = make(); root.add(m); items.push(m); } items[i].visible = true; return items[i]; },
      hideFrom(n) { for (let i = n; i < items.length; i++) items[i].visible = false; },
    };
  }
  const clouds = pool(() => new THREE.Mesh(sphere, cloudMat));
  const pets = pool(() => new THREE.Mesh(petBody, petMat));
  const traps = pool(() => { const g = new THREE.Group(); g.add(new THREE.Mesh(disc, trapMat), new THREE.Mesh(ring, trapEdgeMat)); return g; });
  const marks = pool(() => new THREE.Mesh(ring, markMat));
  const pots = pool(() => new THREE.Mesh(cylinder, potMat));

  function sync(world, heroPos) {
    const h = world.hero, t = world.time;
    shieldMesh.visible = !!h.shield;
    shieldMesh.position.set(heroPos.x, 0.8, heroPos.z);
    rageMesh.visible = h.buffs.some((b) => b.rage > 0);
    rageMesh.position.set(heroPos.x, 0.8, heroPos.z);

    let c = 0, p = 0;
    for (const f of world.followers ?? []) {
      if (f.kind === 'cloud') {
        const m = clouds.get(c++);
        m.position.set(f.x, L.cloud.height + Math.sin(t * 2) * 0.1, f.z);
        m.scale.set(L.cloud.radius * 1.5, L.cloud.radius, L.cloud.radius);
      } else {
        const m = pets.get(p++);
        m.position.set(f.x, L.pet.height / 2 + L.pet.radius, f.z);
      }
    }
    clouds.hideFrom(c); pets.hideFrom(p);

    let n = 0;
    for (const tr of world.traps ?? []) {
      const g = traps.get(n++);
      g.position.set(tr.x, 0.05, tr.z);
      g.scale.setScalar(tr.radius);
    }
    traps.hideFrom(n);

    n = 0;
    for (const e of world.enemies) {
      if (!(e.markedUntil > t)) continue;
      const m = marks.get(n++);
      m.position.set(e.x, 0.06, e.z);
      m.scale.setScalar(e.radius + L.mark.pad);
    }
    marks.hideFrom(n);

    n = 0;
    for (const z of world.zones) {
      if (!(z.healPct > 0) || !z.landed) continue;
      const m = pots.get(n++);
      m.position.set(z.x, L.pot.height / 2, z.z);
      m.scale.set(L.pot.radius, L.pot.height, L.pot.radius);
    }
    pots.hideFrom(n);
  }

  function dispose() {
    scene.remove(root);
    for (const g of geos) g.dispose();
    for (const m of mats) m.dispose();
  }

  return { sync, dispose };
}
