// Figurenvorschau für die Tier- und Klassenwahl.
// Einzige Stelle, die wissen muss, wie eine Figur im Menü gezeigt wird.
import * as THREE from '../../vendor/three.module.min.js';
import { buildCharacter, animateCharacter } from '../render/character.js';
import { spriteMotion } from '../render/sprites.js';
import { ANIMALS } from '../data/animals.js';
import { CLASSES } from '../data/classes.js';
import { HERO_SPRITES, MOTION_FULL_SPEED } from '../data/sprites.js';

const BACKGROUND = 0x2c3a2a;
const GROUND = 0x4a5a3c;
const TURN_SPEED = 0.7; // rad/s
/** Gemalte Vorschau: Figurenhöhe und Fußlinie als Anteil der Canvas-Höhe. */
const FIGURE_HEIGHT = 0.76;
const FEET_LINE = 0.88;
/** Alle `SHOW_PERIOD` s zeigt die Figur kurz ihre Gangart (`SHOW_LENGTH` s, `SHOW_SPEED` m/s). */
const SHOW_PERIOD = 4;
const SHOW_LENGTH = 1.4;
const SHOW_SPEED = MOTION_FULL_SPEED * 0.6;

const css = (hex) => `#${hex.toString(16).padStart(6, '0')}`;

/**
 * Vorschau einer Heldenfigur. Mit geladenen Bildbögen zeichnet sie das gemalte Bild mit leichter
 * Ruhebewegung auf ein 2D-Canvas; sonst rendert sie die 3D-Figur mit dem gemeinsamen WebGL-Renderer der
 * App (kein eigener WebGL-Kontext) und kopiert jedes Bild ins 2D-Canvas.
 * @param {{ renderer: THREE.WebGLRenderer }} shared Rückgabe von `createRenderer`; benutzt wird nur `renderer`.
 * @param {{ width?: number, height?: number,
 *   sprites?: Promise<import('../render/sprites.js').SpriteSheets>|import('../render/sprites.js').SpriteSheets }} [options]
 *   Größe in CSS-Pixeln; `sprites` die (ggf. noch ladenden) Bildbögen.
 * @returns {{ element: HTMLCanvasElement, setFigure(animalId: string, classId: string): void, dispose(): void }}
 */
export function createFigurePreview(shared, { width = 240, height = 260, sprites } = {}) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const element = document.createElement('canvas');
  element.className = 'figure-preview';
  element.width = Math.round(width * ratio);
  element.height = Math.round(height * ratio);
  element.setAttribute('role', 'img');
  const ctx = element.getContext('2d');

  /** @type {{ setFigure(a: string, c: string): void, frame(t: number): void, dispose(): void } | null} */
  let painter = null;
  let figure = null;
  let disposed = false;
  let rafId = 0;
  const start = performance.now();

  Promise.resolve(sprites).then((s) => {
    if (disposed) return;
    painter = s?.ok ? createSpritePainter(ctx, element, s) : createFigurePainter(ctx, element, shared.renderer, width, height);
    if (figure) painter.setFigure(...figure);
  });

  function setFigure(animalId, classId) {
    figure = [animalId, classId];
    element.setAttribute('aria-label', `Vorschau: ${ANIMALS[animalId].name} als ${CLASSES[classId].name}`);
    painter?.setFigure(animalId, classId);
  }

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    if (!element.isConnected) return;
    const t = (now - start) / 1000;
    if (painter && figure) painter.frame(t);
    else { ctx.fillStyle = css(BACKGROUND); ctx.fillRect(0, 0, element.width, element.height); }
  }
  rafId = requestAnimationFrame(frame);

  return {
    element,
    setFigure,
    dispose() {
      disposed = true;
      cancelAnimationFrame(rafId);
      painter?.dispose();
      element.remove();
    },
  };
}

/** Gemalte Figur aus dem bearbeiteten Bildbogen, mit Boden, weichem Schatten und Ruhebewegung. */
function createSpritePainter(ctx, element, sprites) {
  let def = null;
  return {
    setFigure(animalId, classId) { def = HERO_SPRITES[`${animalId}-${classId}`]; },
    frame(t) {
      const W = element.width, H = element.height;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = css(BACKGROUND);
      ctx.fillRect(0, 0, W, H);
      if (!def) return;

      // Gelegentlich die Gangart zeigen, weich ein- und ausgeblendet.
      const k = (t % SHOW_PERIOD) / SHOW_LENGTH;
      const show = k < 1 ? Math.sin(Math.PI * k) ** 2 : 0;
      const m = spriteMotion(def.motion, { speed: SHOW_SPEED * show, time: t });

      const scale = (H * FIGURE_HEIGHT) / def.h;
      const feetX = W / 2, feetY = H * FEET_LINE;
      const lift = m.offsetY / def.heightM * H * FIGURE_HEIGHT;

      ctx.fillStyle = css(GROUND);
      ctx.beginPath();
      ctx.ellipse(feetX, feetY, W * 0.4, H * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      const shadowK = 1 - 0.35 * Math.min(1, m.offsetY / 0.4);
      const grad = ctx.createRadialGradient(feetX, feetY, 0, feetX, feetY, def.w * scale * 0.42 * shadowK);
      grad.addColorStop(0, 'rgba(0,0,0,0.4)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.setTransform(1, 0, 0, 0.3, 0, feetY * 0.7);
      ctx.beginPath();
      ctx.arc(feetX, feetY, def.w * scale * 0.42 * shadowK, 0, Math.PI * 2);
      ctx.fill();

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.translate(feetX, feetY - lift);
      ctx.rotate(m.tilt);
      ctx.scale(scale * m.scaleX, scale * m.scaleY);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(sprites.canvases[def.sheet], def.x, def.y, def.w, def.h, -def.w / 2, -def.h, def.w, def.h);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
    dispose() {},
  };
}

/** Ersatz ohne Bildbögen: drehende 3D-Figur, gerendert mit dem gemeinsamen Renderer. */
function createFigurePainter(ctx, element, renderer, width, height) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND);
  scene.add(new THREE.HemisphereLight(0xe8e0cc, 0x3a3524, 1.6));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
  sun.position.set(-2, 4, 3);
  scene.add(sun);
  const groundGeo = new THREE.CircleGeometry(0.9, 40).rotateX(-Math.PI / 2);
  const groundMat = new THREE.MeshStandardMaterial({ color: GROUND, roughness: 1 });
  scene.add(new THREE.Mesh(groundGeo, groundMat));

  const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 20);
  camera.position.set(0, 1.45, 3.9);
  camera.lookAt(0, 0.82, 0);

  /** @type {THREE.Group|null} */
  let figure = null;
  const bufferSize = new THREE.Vector2();
  return {
    setFigure(animalId, classId) {
      // Figuren teilen Geometrien und Materialien; daher nur aus der Szene nehmen, nicht freigeben.
      if (figure) scene.remove(figure);
      figure = buildCharacter(animalId, classId);
      scene.add(figure);
    },
    frame(t) {
      if (!figure) return;
      figure.rotation.y = 0.5 + t * TURN_SPEED;
      animateCharacter(figure, { time: t });
      renderer.getSize(bufferSize);
      if (bufferSize.x !== width || bufferSize.y !== height) renderer.setSize(width, height, false);
      renderer.render(scene, camera);
      const src = renderer.domElement;
      ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, element.width, element.height);
    },
    dispose() {
      if (figure) scene.remove(figure);
      groundGeo.dispose();
      groundMat.dispose();
    },
  };
}
