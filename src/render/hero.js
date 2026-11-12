import * as THREE from '../../vendor/three.module.min.js';
import { buildCharacter, animateCharacter } from './character.js';
import { createTracker } from './enemies.js';
import { CLASSES } from '../data/classes.js';

/** Dauer der Hiebanimation in Weltsekunden. */
const ATTACK_DURATION = 0.35;
/** Wie schnell sich die Figur zur Blickrichtung dreht (Anteil je 1/60 s). */
const TURN_RATE = 0.3;
/** Glättung der aus der Bewegung geschätzten Geschwindigkeit. */
const SPEED_SMOOTHING = 0.35;
/** Blinkfrequenz während der Unverwundbarkeit nach der Wiederbelebung. */
const BLINK_HZ = 10;

const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Heldenfigur in der laufenden Welt und die Schattenklone (Beschwörungen) als dunkle, durchscheinende
 * Kopien derselben Figur. Liest die Welt nur.
 * @param {THREE.Scene} scene
 * @param {'hase'|'ente'|'waschbaer'} animalId
 * @param {'krieger'|'magier'|'dieb'} classId
 */
export function createHeroView(scene, animalId, classId) {
  const figure = buildCharacter(animalId, classId);
  scene.add(figure);

  // Heller Bodenring unter dem Helden, damit er im Gewühl auffindbar bleibt.
  const ringGeo = new THREE.RingGeometry(0.62, 0.74, 40).rotateX(-Math.PI / 2);
  // Ohne Tiefentest zuletzt gezeichnet: bleibt sichtbar, auch wenn Gegner auf dem Helden stehen.
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0.55, depthWrite: false, depthTest: false });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.03;
  ring.renderOrder = 10;
  scene.add(ring);

  const shadowMat = new THREE.MeshStandardMaterial({
    color: 0x1c1726, emissive: 0x2e2050, emissiveIntensity: 0.7, roughness: 0.9, transparent: true, opacity: 0.62,
  });
  /** @type {THREE.Group[]} */
  const clones = [];
  /** Drehung der Klone, beim ersten Erscheinen von der Heldenfigur übernommen. */
  const cloneYaw = new WeakMap();

  const startAbility = CLASSES[classId].startAbility;
  const tracker = createTracker();
  const position = new THREE.Vector3();
  let attackAt = -Infinity;
  let yaw = 0, speed = 0, lastX = NaN, lastZ = NaN, lastT = NaN, lastRenderT = NaN;

  function makeClone() {
    const c = buildCharacter(animalId, classId);
    c.traverse((o) => { if (o.isMesh) { o.material = shadowMat; o.castShadow = false; o.receiveShadow = false; } });
    scene.add(c);
    clones.push(c);
    return c;
  }

  /**
   * Startet die Hiebanimation bei jedem Einsatz der Startfähigkeit.
   * @param {object[]} events run.events eines Logikschritts
   * @param {import('../core/world.js').World} world
   */
  function handle(events, world) {
    for (const e of events) {
      if (e.type === 'cast' && e.abilityId === startAbility) attackAt = world.time;
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
    const target = Math.atan2(hero.facing.x, hero.facing.z);
    yaw = wrapAngle(yaw + wrapAngle(target - yaw) * Math.min(1, TURN_RATE * frameDt * 60));

    const since = t - attackAt;
    animateCharacter(figure, { speed, time: t, attackT: since >= 0 && since < ATTACK_DURATION ? since / ATTACK_DURATION : undefined });
    figure.position.copy(position);
    figure.rotation.y = yaw;
    figure.visible = !(world.time < hero.invulnerableUntil && Math.floor(t * BLINK_HZ) % 2);
    ring.position.set(position.x, 0.03, position.z);

    // Schattenklone
    let i = 0;
    for (const s of world.summons) {
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
  }

  function dispose() {
    scene.remove(figure, ring, ...clones);
    ringGeo.dispose();
    ringMat.dispose();
    shadowMat.dispose();
  }

  return {
    handle,
    sync,
    dispose,
    /** Gezeichnete (überblendete) Heldenposition, Ziel der Kamera. */
    get position() { return position; },
  };
}
