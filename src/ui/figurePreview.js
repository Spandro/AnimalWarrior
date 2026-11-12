// Drehende Figurenvorschau für die Tier- und Klassenwahl.
// Einzige Stelle, die wissen muss, wie eine Figur im Menü gezeigt wird: Sobald die Figuren als
// gemalte Bilder vorliegen, ändert sich nur diese Datei.
import * as THREE from '../../vendor/three.module.min.js';
import { buildCharacter, animateCharacter } from '../render/character.js';
import { ANIMALS } from '../data/animals.js';
import { CLASSES } from '../data/classes.js';

const BACKGROUND = 0x2c3a2a;
const GROUND = 0x4a5a3c;
const TURN_SPEED = 0.7; // rad/s

/**
 * Vorschau einer Heldenfigur. Zeichnet mit dem gemeinsamen WebGL-Renderer der App (kein eigener
 * WebGL-Kontext) und kopiert jedes Bild in ein eigenes 2D-Canvas, das frei im Menü platziert wird.
 * @param {{ renderer: THREE.WebGLRenderer }} shared Rückgabe von `createRenderer`; benutzt wird nur `renderer`.
 * @param {{ width?: number, height?: number }} [size] Größe in CSS-Pixeln
 * @returns {{ element: HTMLCanvasElement, setFigure(animalId: string, classId: string): void, dispose(): void }}
 */
export function createFigurePreview(shared, { width = 240, height = 260 } = {}) {
  const renderer = shared.renderer;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const element = document.createElement('canvas');
  element.className = 'figure-preview';
  element.width = Math.round(width * ratio);
  element.height = Math.round(height * ratio);
  element.setAttribute('role', 'img');
  const ctx = element.getContext('2d');

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
  let rafId = 0;
  const start = performance.now();
  const bufferSize = new THREE.Vector2();

  function setFigure(animalId, classId) {
    // Figuren teilen Geometrien und Materialien; daher nur aus der Szene nehmen, nicht freigeben.
    if (figure) scene.remove(figure);
    figure = buildCharacter(animalId, classId);
    scene.add(figure);
    element.setAttribute('aria-label', `Vorschau: ${ANIMALS[animalId].name} als ${CLASSES[classId].name}`);
  }

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    if (!figure || !element.isConnected) return;
    const t = (now - start) / 1000;
    figure.rotation.y = 0.5 + t * TURN_SPEED;
    animateCharacter(figure, { time: t });
    renderer.getSize(bufferSize);
    if (bufferSize.x !== width || bufferSize.y !== height) renderer.setSize(width, height, false);
    renderer.render(scene, camera);
    const src = renderer.domElement;
    ctx.drawImage(src, 0, 0, src.width, src.height, 0, 0, element.width, element.height);
  }
  rafId = requestAnimationFrame(frame);

  return {
    element,
    setFigure,
    dispose() {
      cancelAnimationFrame(rafId);
      if (figure) scene.remove(figure);
      groundGeo.dispose();
      groundMat.dispose();
      element.remove();
    },
  };
}
