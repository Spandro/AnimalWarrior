import * as THREE from '../../vendor/three.module.min.js';
import { buildCharacter, animateCharacter } from './character.js';
import { createTracker } from './enemies.js';
import {
  billboardOrientation, spriteGeometry, spriteWidth, spriteMaterial, shadowMaterial, composeSprite, spriteMotion,
} from './sprites.js';
import { CLASSES } from '../data/classes.js';
import { HERO_SPRITES, BILLBOARD, AIM_TURN_DURATION, HERO_FLASH, HERO_POISON_TINT, DYING_TILT } from '../data/sprites.js';
import { ABILITIES } from '../data/abilities.js';

/** Dauer der Hiebanimation in Weltsekunden. */
const ATTACK_DURATION = 0.35;
/** Wie schnell sich die 3D-Ersatzfigur zur Blickrichtung dreht (Anteil je 1/60 s). */
const TURN_RATE = 0.3;
/** Glättung der aus der Bewegung geschätzten Geschwindigkeit. */
const SPEED_SMOOTHING = 0.35;
/** Blinkfrequenz während der Unverwundbarkeit nach der Wiederbelebung. */
const BLINK_HZ = 10;
/** Deckkraft des Heldenrings. */
const RING_OPACITY = 0.55;
/** Farbe der Schattenklone (multipliziert das Bild) und ihre Deckkraft. */
const CLONE_COLOR = 0x3c3060;
const CLONE_OPACITY = 0.7;

const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Heldenfigur in der laufenden Welt und die Schattenklone (Beschwörungen) als dunkle, durchscheinende
 * Kopien derselben Figur. Liest die Welt nur.
 *
 * Mit geladenen Bildbögen ist der Held ein gemaltes Bild auf einer Tafel (Füße am Boden, zur Kamera
 * gewandt, nach links gespiegelt, wenn er nach links blickt) mit weichem Bodenschatten; sonst die
 * 3D-Figur aus `character.js`.
 * @param {THREE.Scene} scene
 * @param {'hase'|'ente'|'waschbaer'} animalId
 * @param {'krieger'|'magier'|'dieb'} classId
 * @param {{ sprites?: import('./sprites.js').SpriteSheets, camera?: THREE.Camera }} [options]
 */
export function createHeroView(scene, animalId, classId, { sprites, camera } = {}) {
  const body = sprites?.ok ? createSpriteBody(scene, animalId, classId, sprites, camera) : createFigureBody(scene, animalId, classId);

  // Heller Bodenring unter dem Helden, damit er im Gewühl auffindbar bleibt.
  const ringGeo = new THREE.RingGeometry(0.62, 0.74, 40).rotateX(-Math.PI / 2);
  // Ohne Tiefentest zuletzt gezeichnet: bleibt sichtbar, auch wenn Gegner auf dem Helden stehen.
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: RING_OPACITY, depthWrite: false, depthTest: false });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.03;
  ring.renderOrder = 10;
  scene.add(ring);

  const startAbility = CLASSES[classId].startAbility;
  const tracker = createTracker();
  const position = new THREE.Vector3();
  let attackAt = -Infinity;
  /** Blickseite (-1/1) zum Ziel der letzten zielenden Fähigkeit und bis wann sie gilt (nur Darstellung). */
  let aimSide = 0, aimUntil = -Infinity;
  /**
   * Volle Zielrichtung derselben Fähigkeit und bis wann sie gilt. Die gemalte Tafel kann nur nach links
   * oder rechts kippen, die 3D-Figur dreht sich dagegen in jede Richtung – auch gerade nach oben oder unten.
   */
  const aimDir = { x: 0, z: 0 };
  let aimDirUntil = -Infinity;
  let speed = 0, lastX = NaN, lastZ = NaN, lastT = NaN, lastRenderT = NaN;
  /** Treffer-Aufblitzen (Echtzeit in ms) und Sterbezustand (Neigung und Deckkraft, 0…1). */
  let flashUntil = -Infinity, dyingTilt = 0, opacity = 1, dying = false;

  /**
   * Startet die Hiebanimation bei jedem Einsatz der Startfähigkeit.
   * @param {object[]} events run.events eines Logikschritts
   * @param {import('../core/world.js').World} world
   */
  function handle(events, world) {
    for (const e of events) {
      if (e.type === 'cast' && e.abilityId === startAbility) attackAt = world.time;
      if (e.type === 'cast' && ABILITIES[e.abilityId]?.aim) {
        aimDir.x = e.dirX; aimDir.z = e.dirZ;
        aimDirUntil = world.time + AIM_TURN_DURATION;
        // Die Tafel kippt nur, wenn das Ziel deutlich zur Seite liegt; sonst bliebe sie zappelig.
        if (Math.abs(e.dirX) >= BILLBOARD.flipHysteresis) {
          aimSide = Math.sign(e.dirX);
          aimUntil = world.time + AIM_TURN_DURATION;
        }
      }
    }
  }

  /**
   * @param {import('../core/world.js').World} world
   * @param {number} alpha
   */
  function sync(world, alpha) {
    const hero = world.hero;
    tracker.begin(world.time);
    const t = tracker.lerpTime(alpha);
    const p = tracker.pos('hero', hero.x, hero.z, alpha);
    position.set(p.x, 0, p.z);

    // Tempo aus der Bewegung zwischen zwei Logikschritten (Weltmeter je Weltsekunde).
    if (world.time !== lastT) {
      const dt = world.time - lastT;
      const v = dt > 0 ? Math.hypot(hero.x - lastX, hero.z - lastZ) / dt : 0;
      speed += ((Number.isFinite(v) ? v : 0) - speed) * SPEED_SMOOTHING;
      lastX = hero.x; lastZ = hero.z; lastT = world.time;
    }
    const frameDt = Number.isNaN(lastRenderT) ? 0 : Math.max(0, t - lastRenderT);
    lastRenderT = t;

    const since = t - attackAt;
    body.update({
      position, facing: hero.facing, aimSide: t < aimUntil ? aimSide : 0,
      aim: t < aimDirUntil ? aimDir : null, speed, time: t, frameDt,
      attackT: since >= 0 && since < ATTACK_DURATION ? since / ATTACK_DURATION : undefined,
      visible: dying || !(world.time < hero.invulnerableUntil && Math.floor(t * BLINK_HZ) % 2),
      flash: performance.now() < flashUntil, poisoned: !!hero.poison, dyingTilt, opacity,
    });
    ringMat.opacity = RING_OPACITY * opacity;
    ring.position.set(position.x, 0.03, position.z);
    body.updateClones(world.summons, t);
  }

  function dispose() {
    body.dispose();
    scene.remove(ring);
    ringGeo.dispose();
    ringMat.dispose();
  }

  return {
    handle,
    sync,
    dispose,
    /** Lässt den Helden kurz rot aufblitzen (Treffer). */
    flash() { flashUntil = performance.now() + HERO_FLASH.ms; },
    /**
     * Sterbezustand: `tilt` 0…1 kippt den Helden um, `opacity` 1…0 blendet ihn aus (mit dem Bodenschatten und dem Ring).
     * @param {number} tilt
     * @param {number} alpha
     */
    setDying(tilt, alpha) { dying = true; dyingTilt = tilt; opacity = alpha; },
    /** Gezeichnete (überblendete) Heldenposition, Ziel der Kamera. */
    get position() { return position; },
  };
}

/**
 * @typedef {{ position: THREE.Vector3, facing: { x: number, z: number }, aimSide?: number,
 *   aim?: { x: number, z: number } | null, speed: number, time: number,
 *   frameDt: number, attackT?: number, visible: boolean, flash: boolean, poisoned: boolean }} BodyInput
 */

/**
 * Richtung, in die die Figur schaut, als Drehwinkel um die Hochachse: die Zielrichtung der letzten
 * zielenden Fähigkeit, solange es eine gibt, sonst die Laufrichtung. Rein, damit prüfbar.
 * @param {{ x: number, z: number }} facing
 * @param {{ x: number, z: number } | null} [aim]
 * @returns {number} Bogenmaß
 */
export function lookYaw(facing, aim) {
  const d = aim && (aim.x !== 0 || aim.z !== 0) ? aim : facing;
  return Math.atan2(d.x, d.z);
}

/** Gemalter Held: eine Bildtafel mit Bodenschatten; Klone als dunkle Kopien derselben Tafel. */
function createSpriteBody(scene, animalId, classId, sprites, camera) {
  const def = HERO_SPRITES[`${animalId}-${classId}`];
  const orient = billboardOrientation(camera);
  const geometry = spriteGeometry(def, sprites.sizes[def.sheet]);
  const material = spriteMaterial(sprites.textures[def.sheet]);
  const width = spriteWidth(def), height = def.heightM;

  const figure = new THREE.Mesh(geometry, material);
  figure.matrixAutoUpdate = false;
  figure.frustumCulled = false;
  scene.add(figure);

  const blobGeo = new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2);
  const blobMat = shadowMaterial();
  const blob = new THREE.Mesh(blobGeo, blobMat);
  blob.renderOrder = 1;
  scene.add(blob);

  const cloneMat = new THREE.MeshBasicMaterial({
    map: material.map, color: CLONE_COLOR, transparent: true, opacity: CLONE_OPACITY, alphaTest: BILLBOARD.alphaTest,
    depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  /** @type {THREE.Mesh[]} */
  const clones = [];
  /** Blickseite der Klone, beim ersten Erscheinen vom Helden übernommen. */
  const cloneFace = new WeakMap();
  let face = 1;
  let lookFlash = 'plain', lookOpacity = 1;

  const placeBlob = (x, z, scale, lift) => {
    const k = scale * (1 - 0.35 * Math.min(1, lift / 0.4));
    blob.position.set(x, 0.02, z);
    blob.scale.set(width * BILLBOARD.shadowWidth * k, 1, width * BILLBOARD.shadowDepth * k);
  };

  return {
    /** @param {BodyInput} input */
    update({ position, facing, aimSide, speed, time, attackT, visible, flash, poisoned, dyingTilt, opacity }) {
      if (aimSide) face = aimSide;
      else if (facing.x > BILLBOARD.flipHysteresis) face = 1;
      else if (facing.x < -BILLBOARD.flipHysteresis) face = -1;
      const m = spriteMotion(def.motion, { speed, time, attackT });
      m.tilt += dyingTilt * DYING_TILT;
      // Nur bei Änderung schreiben: Aufblitzen, Gifttönung und Ausblenden betreffen allein diese Tafel (eigenes Material).
      const tint = flash ? 'flash' : poisoned ? 'poison' : 'plain';
      if (tint !== lookFlash) {
        lookFlash = tint;
        if (tint === 'flash') material.color.setRGB(...HERO_FLASH.color);
        else if (tint === 'poison') material.color.setRGB(...HERO_POISON_TINT).multiplyScalar(BILLBOARD.shade);
        else material.color.setScalar(BILLBOARD.shade);
      }
      if (opacity !== lookOpacity) {
        const wasSolid = lookOpacity >= 1;
        lookOpacity = opacity;
        material.opacity = opacity;
        blobMat.opacity = BILLBOARD.shadowOpacity * opacity;
        if (wasSolid !== opacity >= 1) {
          material.transparent = opacity < 1;
          material.alphaToCoverage = opacity >= 1;
          material.needsUpdate = true;
        }
      }
      composeSprite(figure.matrix, orient, position.x, 0, position.z, width, height, face, m, def.footOffset);
      figure.matrixWorldNeedsUpdate = true;
      figure.visible = visible;
      placeBlob(position.x, position.z, 1, m.offsetY);
    },
    updateClones(summons, t) {
      let i = 0;
      for (const s of summons) {
        let c = clones[i];
        if (!c) {
          c = new THREE.Mesh(geometry, cloneMat);
          c.matrixAutoUpdate = false;
          c.frustumCulled = false;
          scene.add(c);
          clones.push(c);
        }
        if (!cloneFace.has(s)) cloneFace.set(s, face);
        const fade = Math.min(1, s.timeLeft / 0.4);
        const k = 0.6 + 0.4 * fade;
        const m = spriteMotion(def.motion, { speed: 0, time: t * 1.3 + i });
        composeSprite(c.matrix, orient, s.x, 0, s.z, width * k, height * k, cloneFace.get(s), m, def.footOffset * k);
        c.matrixWorldNeedsUpdate = true;
        c.visible = true;
        i++;
      }
      for (; i < clones.length; i++) clones[i].visible = false;
    },
    dispose() {
      scene.remove(figure, blob, ...clones);
      geometry.dispose();
      material.dispose();
      cloneMat.dispose();
      blobGeo.dispose();
      blobMat.dispose();
    },
  };
}

/** Ersatz ohne Bildbögen: die 3D-Figur aus `character.js`. */
function createFigureBody(scene, animalId, classId) {
  const figure = buildCharacter(animalId, classId);
  scene.add(figure);
  const shadowMat = new THREE.MeshStandardMaterial({
    color: 0x1c1726, emissive: 0x2e2050, emissiveIntensity: 0.7, roughness: 0.9, transparent: true, opacity: 0.62,
  });
  /** @type {THREE.Group[]} */
  const clones = [];
  const cloneYaw = new WeakMap();
  let yaw = 0;
  // buildCharacter teilt seine Materialien über einen Zwischenspeicher (character.js) mit allen anderen Figuren; damit
  // Aufblitzen und Ausblenden nur diesen Helden treffen, bekommt er eigene Kopien (Klone nutzen shadowMat).
  /** @type {THREE.MeshStandardMaterial[]} */
  const ownMaterials = [];
  const copies = new Map();
  figure.traverse((o) => {
    if (!o.isMesh) return;
    if (!copies.has(o.material)) { const c = o.material.clone(); copies.set(o.material, c); ownMaterials.push(c); }
    o.material = copies.get(o.material);
  });
  const baseEmissive = new Map(ownMaterials.map((m) => [m, m.emissive.getHex()]));
  let lookFlash = 'plain', lookOpacity = 1;

  function makeClone() {
    const c = buildCharacter(animalId, classId);
    c.traverse((o) => { if (o.isMesh) { o.material = shadowMat; o.castShadow = false; o.receiveShadow = false; } });
    scene.add(c);
    clones.push(c);
    return c;
  }

  return {
    /** @param {BodyInput} input */
    update({ position, facing, aim, speed, time, frameDt, attackT, visible, flash, poisoned, dyingTilt, opacity }) {
      const target = lookYaw(facing, aim);
      yaw = wrapAngle(yaw + wrapAngle(target - yaw) * Math.min(1, TURN_RATE * frameDt * 60));
      animateCharacter(figure, { speed, time, attackT });
      figure.position.copy(position);
      figure.rotation.y = yaw;
      figure.rotation.z = dyingTilt * DYING_TILT;
      const tint = flash ? 'flash' : poisoned ? 'poison' : 'plain';
      if (tint !== lookFlash) {
        lookFlash = tint;
        for (const m of ownMaterials) {
          m.emissive.setHex(tint === 'flash' ? 0xff2020 : tint === 'poison' ? 0x1f5a14 : baseEmissive.get(m));
        }
      }
      if (opacity !== lookOpacity) {
        lookOpacity = opacity;
        for (const m of ownMaterials) {
          const flip = m.transparent !== opacity < 1;
          m.transparent = opacity < 1; m.opacity = opacity;
          if (flip) m.needsUpdate = true;
        }
      }
      figure.visible = visible;
    },
    updateClones(summons, t) {
      let i = 0;
      for (const s of summons) {
        const c = clones[i] || makeClone();
        if (!cloneYaw.has(s)) cloneYaw.set(s, yaw);
        c.visible = true;
        c.position.set(s.x, 0, s.z);
        c.rotation.y = cloneYaw.get(s);
        const fade = Math.min(1, s.timeLeft / 0.4);
        c.scale.setScalar(0.6 + 0.4 * fade);
        animateCharacter(c, { speed: 0, time: t * 1.3 + i });
        i++;
      }
      for (; i < clones.length; i++) clones[i].visible = false;
    },
    dispose() {
      scene.remove(figure, ...clones);
      shadowMat.dispose();
      for (const m of ownMaterials) m.dispose();
    },
  };
}
