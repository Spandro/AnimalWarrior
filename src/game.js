// Vorläufige Spielschleife (bis Aufgabe 12): ein Durchgang im Wellenmodus mit einfacher Tastenabfrage.
// Aufgabe 12 ersetzt das durch Spielschleife, Eingabe, Anzeige und Level-up-Dialog.
import { createRenderer } from './render/renderer.js';
import { createTerrainView } from './render/terrain.js';
import { createEnemyView } from './render/enemies.js';
import { createHeroView } from './render/hero.js';
import { createEffects } from './render/effects.js';
import { createSurvivorRun, stepRun, chooseCard, setView } from './modes/survivor.js';
import { spawnEnemy } from './core/world.js';
import { createRng } from './core/rng.js';

const STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 5;
const STRESS_ENEMIES = 300;
const FPS_WINDOW = 5;

/**
 * Startet einen Durchgang und zeichnet ihn in den gemeinsamen Renderer.
 * @param {{ canvas: HTMLCanvasElement, uiLayer: HTMLElement, view?: ReturnType<typeof createRenderer>,
 *   animalId: string, classId: string, seed: number, quality?: 'high'|'low', timeScale?: number,
 *   debug?: boolean, stress?: boolean, onEscape?: () => void }} options
 *   `view` ist der gemeinsame Renderer der App (sonst wird einer für `canvas` angelegt);
 *   `stress` füllt die Welt mit Ratten (nur mit `debug`); `onEscape` wird bei der Esc-Taste gerufen.
 * @returns {{ stop(): void }}
 */
export function startGame({
  canvas, uiLayer, view, animalId, classId, seed, quality = 'high', timeScale = 1, debug = false, stress = false, onEscape,
}) {
  if (!view) view = createRenderer(canvas, { quality });
  else view.setQuality(quality);
  stress = debug && stress;

  const run = createSurvivorRun({ seed, animalId, classId, timeScale });
  const world = run.world;
  const terrain = createTerrainView(view.scene, world.seed);
  const enemyView = createEnemyView(view.scene);
  const heroView = createHeroView(view.scene, animalId, classId);
  const effects = createEffects(view.scene, uiLayer, { quality, camera: view.camera });

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
  const onKeyDown = (e) => {
    if (KEYS[e.code]) { held.add(e.code); e.preventDefault(); }
    else if (e.code === 'Escape' && onEscape) { e.preventDefault(); onEscape(); }
  };
  const onKeyUp = (e) => held.delete(e.code);
  const onBlur = () => held.clear();
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
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
      uiLayer.appendChild(status);
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

  const endHint = onEscape ? 'Esc führt zurück zur Modusauswahl.' : 'Seite neu laden für einen neuen Versuch.';
  let acc = 0, last = NaN, rafId = 0;
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

    if (run.state === 'lost') showStatus('Besiegt – ' + endHint);
    else if (run.state === 'won') showStatus('Gewonnen! ' + endHint);
    if (stress) measureFps(now);
    rafId = requestAnimationFrame(frame);
  }
  rafId = requestAnimationFrame(frame);

  if (debug) window.__debug = { run, view, enemyView, heroView, effects, terrain };

  let stopped = false;
  return {
    /** Hält die Schleife an, löst die Tasten und entfernt alle Darstellungsteile des Durchgangs aus der Szene. */
    stop() {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      terrain.dispose();
      enemyView.dispose();
      heroView.dispose();
      effects.dispose();
      status?.remove();
      if (debug) delete window.__debug;
    },
  };
}
