// Vorläufiger Einstieg (bis Aufgabe 11): startet direkt einen Durchgang im Wellenmodus.
// URL-Schalter: ?animal=hase|ente|waschbaer, ?class=krieger|magier|dieb, ?speed=N (timeScale),
// ?quality=low, ?debug=1&stress=1 (300 Ratten, Bildrate in der Konsole und oben links).
import { isWebGLAvailable, createRenderer } from './render/renderer.js';
import { createTerrainView } from './render/terrain.js';
import { createEnemyView } from './render/enemies.js';
import { createHeroView } from './render/hero.js';
import { createEffects } from './render/effects.js';
import { createSurvivorRun, stepRun, chooseCard, setView } from './modes/survivor.js';
import { spawnEnemy } from './core/world.js';
import { createRng } from './core/rng.js';
import { ANIMALS } from './data/animals.js';
import { CLASSES } from './data/classes.js';

const SEED = 20261112;
const STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 5;
const STRESS_ENEMIES = 300;
const FPS_WINDOW = 5;

const canvas = document.getElementById('game');
const ui = document.getElementById('ui');

if (!isWebGLAvailable()) {
  ui.textContent = 'Dein Browser unterstützt kein WebGL 2.';
} else {
  const params = new URLSearchParams(location.search);
  const quality = params.get('quality') === 'low' ? 'low' : 'high';
  const animalId = params.get('animal') in ANIMALS ? params.get('animal') : 'hase';
  const classId = params.get('class') in CLASSES ? params.get('class') : 'krieger';
  const timeScale = Number(params.get('speed')) > 0 ? Number(params.get('speed')) : 1;
  const debug = params.get('debug') === '1';
  const stress = debug && params.get('stress') === '1';

  const view = createRenderer(canvas, { quality });
  const run = createSurvivorRun({ seed: SEED, animalId, classId, timeScale });
  const world = run.world;
  const terrain = createTerrainView(view.scene, world.seed);
  const enemyView = createEnemyView(view.scene);
  const heroView = createHeroView(view.scene, animalId, classId);
  const effects = createEffects(view.scene, ui, { quality, camera: view.camera });

  function onResize() {
    const { halfW, halfH } = view.resize();
    setView(run, halfW, halfH);
  }
  window.addEventListener('resize', onResize);
  onResize();

  // Vorläufige Tastenabfrage: WASD und Pfeiltasten. Oben am Bildschirm ist -z.
  const held = new Set();
  const KEYS = {
    KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1],
    KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
  };
  window.addEventListener('keydown', (e) => { if (KEYS[e.code]) { held.add(e.code); e.preventDefault(); } });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => held.clear());
  function readInput() {
    let moveX = 0, moveZ = 0;
    for (const code of held) { moveX += KEYS[code][0]; moveZ += KEYS[code][1]; }
    return { moveX, moveZ };
  }

  // Belastungstest: Welt mit Ratten auffüllen, Held am Leben halten.
  const stressRng = createRng(7);
  function fillRats() {
    const h = world.hero;
    while (world.enemies.length < STRESS_ENEMIES) {
      const a = stressRng.range(0, Math.PI * 2), r = stressRng.range(3, 16);
      if (!spawnEnemy(world, 'ratte', h.x + Math.cos(a) * r, h.z + Math.sin(a) * r)) break;
    }
    h.hp = h.stats.maxHp;
  }

  let status = null;
  function showStatus(text) {
    if (!status) {
      status = document.createElement('div');
      Object.assign(status.style, {
        position: 'absolute', left: '12px', top: '10px', font: '600 14px system-ui, sans-serif',
        color: '#fff', textShadow: '0 1px 2px #000', pointerEvents: 'none',
      });
      ui.appendChild(status);
    }
    status.textContent = text;
  }

  let fpsFrames = 0, fpsStart = NaN;
  function measureFps(now) {
    if (Number.isNaN(fpsStart)) { fpsStart = now; fpsFrames = 0; return; }
    fpsFrames++;
    const elapsed = (now - fpsStart) / 1000;
    if (elapsed < FPS_WINDOW) return;
    const fps = fpsFrames / elapsed;
    const text = `${fps.toFixed(1)} Bilder/s bei ${world.enemies.length} Gegnern (Qualität ${quality})`;
    console.log('[stress] ' + text);
    showStatus(text);
    window.__fps = fps;
    fpsStart = now; fpsFrames = 0;
  }

  let acc = 0, last = NaN;
  function frame(now) {
    const dt = Number.isNaN(last) ? 0 : Math.min(0.25, (now - last) / 1000);
    last = now;
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < MAX_STEPS_PER_FRAME) {
      if (stress) fillRats();
      stepRun(run, STEP, readInput());
      heroView.handle(run.events, world);
      effects.handle(run.events, world);
      if (run.state === 'levelup') chooseCard(run, 0);
      acc -= STEP;
      steps++;
    }
    if (steps === MAX_STEPS_PER_FRAME) acc = Math.min(acc, STEP);
    const alpha = acc / STEP;

    heroView.sync(world, alpha);
    const p = heroView.position;
    view.setTarget(p.x, p.z);
    terrain.update(p.x, p.z);
    enemyView.sync(world, alpha);
    effects.update(dt);
    view.render();

    if (run.state === 'lost') showStatus('Besiegt – Seite neu laden für einen neuen Versuch.');
    else if (run.state === 'won') showStatus('Gewonnen!');
    if (stress) measureFps(now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  if (debug) window.__debug = { run, view, enemyView, heroView, effects, terrain };
}
