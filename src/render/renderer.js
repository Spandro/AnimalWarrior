import * as THREE from '../../vendor/three.module.min.js';

/** Kameraneigung über dem Boden (Höhenwinkel) in Grad. */
const CAMERA_TILT_DEG = 55;
/** Abstand der Kamera zum Zielpunkt in Weltmetern. */
const CAMERA_DISTANCE = 22;
const CAMERA_FOV = 45;
/** Nebel- und Hintergrundfarbe, abgestimmt auf die mittlere Bodenfarbe. */
const FOG_COLOR = 0x7b8566;
const FOG_NEAR = 34;
const FOG_FAR = 75;
/** Sonne relativ zum Zielpunkt: von links vorn oben, Schatten fallen nach rechts hinten. */
const SUN_OFFSET = new THREE.Vector3(-14, 26, 10);
const SHADOW_MAP_SIZE = 2048;
const SHADOW_EXTENT_MAX = 45;

/** @typedef {'high'|'low'} Quality */

/**
 * Prüft, ob WebGL 2 (von Three.js 0.170 vorausgesetzt) verfügbar ist. Wirft nie.
 * @returns {boolean}
 */
export function isWebGLAvailable() {
  try {
    if (typeof window === 'undefined' || !window.WebGL2RenderingContext) return false;
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch {
    return false;
  }
}

/**
 * Renderer, Szene, Licht und eine geneigte Kamera, die einem Zielpunkt auf dem Boden folgt.
 * Die Kamera steht in +z-Richtung vom Ziel und blickt Richtung -z; „oben“ am Bildschirm ist -z.
 * @param {HTMLCanvasElement} canvas
 * @param {{ quality?: Quality }} [options]
 */
export function createRenderer(canvas, { quality = 'high' } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(FOG_COLOR);
  scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);

  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.5, 150);
  const tilt = THREE.MathUtils.degToRad(CAMERA_TILT_DEG);
  const cameraOffset = new THREE.Vector3(0, Math.sin(tilt) * CAMERA_DISTANCE, Math.cos(tilt) * CAMERA_DISTANCE);
  const target = new THREE.Vector3();

  // Umgebungslicht als Himmel/Boden-Verlauf: kühles Himmelslicht von oben, grünlich-erdiges Streulicht von unten.
  const ambient = new THREE.HemisphereLight(0xc4d4e6, 0x5d5a3f, 1.25);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
  sun.shadow.mapSize.set(SHADOW_MAP_SIZE, SHADOW_MAP_SIZE);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 90;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);

  let currentQuality = quality;

  function setTarget(x, z) {
    target.set(x, 0, z);
    camera.position.copy(target).add(cameraOffset);
    camera.lookAt(target);
    sun.position.copy(target).add(SUN_OFFSET);
    sun.target.position.copy(target);
  }

  /** @param {Quality} q */
  function setQuality(q) {
    currentQuality = q === 'low' ? 'low' : 'high';
    const high = currentQuality === 'high';
    renderer.setPixelRatio(high ? Math.min(window.devicePixelRatio, 2) : 1);
    renderer.shadowMap.enabled = high;
    // castShadow ändert den Lichtzustand, dadurch werden die Shader ohne Schattenteil neu gebaut.
    sun.castShadow = high;
  }

  const ndc = new THREE.Vector3();
  const dir = new THREE.Vector3();

  /**
   * Passt Zeichenfläche und Kamera an die Canvas-Größe an.
   * @returns {{ halfW: number, halfH: number }} größte halbe Ausdehnung des sichtbaren Bodens
   *   um den Zielpunkt in x (halfW) und z (halfH); das sichtbare Trapez liegt vollständig darin.
   */
  function resize() {
    const w = Math.max(1, canvas.clientWidth || window.innerWidth);
    const h = Math.max(1, canvas.clientHeight || window.innerHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    let halfW = 0, halfH = 0;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      ndc.set(sx, sy, 0.5).unproject(camera);
      dir.copy(ndc).sub(camera.position).normalize();
      // Strahlen, die den Boden nicht (oder erst hinter der Sichtweite) treffen, enden an der Sichtweite.
      const t = dir.y < -1e-6 ? Math.min(-camera.position.y / dir.y, camera.far) : camera.far;
      halfW = Math.max(halfW, Math.abs(camera.position.x + dir.x * t - target.x));
      halfH = Math.max(halfH, Math.abs(camera.position.z + dir.z * t - target.z));
    }

    // Schattenkamera deckt den sichtbaren Bereich ab, unabhängig von der Lichtrichtung.
    const extent = Math.min(Math.hypot(halfW, halfH) + 4, SHADOW_EXTENT_MAX);
    const sc = sun.shadow.camera;
    sc.left = -extent; sc.right = extent; sc.top = extent; sc.bottom = -extent;
    sc.updateProjectionMatrix();

    return { halfW, halfH };
  }

  function render() {
    renderer.render(scene, camera);
  }

  function dispose() {
    renderer.dispose();
    sun.shadow.map?.dispose();
  }

  setQuality(currentQuality);
  setTarget(0, 0);

  return {
    scene,
    camera,
    setTarget,
    setQuality,
    get quality() { return currentQuality; },
    resize,
    render,
    dispose,
  };
}
