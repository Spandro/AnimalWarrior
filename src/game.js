// Ein Durchgang im Wellenmodus: Spielschleife mit festem Schritt, Tastatur, Anzeige, Level-up-Dialog und Pause.
// Was nach dem Durchgang passiert (Speichern, Ergebnis), entscheidet der Aufrufer über onEnd.
import { createRenderer } from './render/renderer.js';
import { createTerrainView } from './render/terrain.js';
import { createEnemyView } from './render/enemies.js';
import { createHeroView } from './render/hero.js';
import { createEffects } from './render/effects.js';
import { createSurvivorRun, stepRun, chooseCard, setPaused, setView, getSummary, abandonRun } from './modes/survivor.js';
import { spawnEnemy, damageEnemy } from './core/world.js';
import { xpToNext } from './core/progression.js';
import { createRng } from './core/rng.js';
import { createKeyState, attachKeyboard } from './input/keyboard.js';
import { createHud } from './ui/hud.js';
import { createLevelUpDialog } from './ui/levelup.js';
import { el } from './ui/dom.js';
import { confirmDialog } from './ui/menus.js';

const STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 5;
/** Längster Abstand zweier Bilder, der noch nachgeholt wird (s). */
const MAX_FRAME_DT = 0.25;
/** So lange läuft das Bild nach Sieg oder Tod weiter, bevor das Ergebnis kommt (reale s). */
const END_DELAY = 1.6;
const STRESS_ENEMIES = 300;
const FPS_WINDOW = 5;

/**
 * @typedef {ReturnType<typeof getSummary>} Summary
 */

/**
 * Startet einen Durchgang und zeichnet ihn in den gemeinsamen Renderer.
 * @param {{ canvas: HTMLCanvasElement, uiLayer: HTMLElement, view?: ReturnType<typeof createRenderer>,
 *   animalId: string, classId: string, seed: number, quality?: 'high'|'low', timeScale?: number,
 *   modifiers?: import('./data/animals.js').Modifier[], revive?: boolean,
 *   debug?: boolean, stress?: boolean, autopick?: boolean, sprites?: import('./render/sprites.js').SpriteSheets,
 *   onEnd?: (summary: Summary) => void }} options
 *   `view` ist der gemeinsame Renderer der App (sonst wird einer für `canvas` angelegt). `sprites` sind die
 *   geladenen Bildbögen (`loadSpriteSheets`); fehlen sie oder sind sie nicht `ok`, erscheinen die 3D-Figuren.
 *   Nur mit `debug`: `stress` füllt die Welt mit Ratten, `autopick` wählt Karten selbst, Taste K besiegt
 *   alle Gegner, L gibt ein Level. `onEnd` kommt einmal nach Sieg, Tod oder Aufgeben.
 * @returns {{ stop(): void }}
 */
export function startGame({
  canvas, uiLayer, view, animalId, classId, seed, quality = 'high', timeScale = 1, modifiers = [], revive = false,
  debug = false, stress = false, autopick = false, sprites, onEnd,
}) {
  if (!view) view = createRenderer(canvas, { quality });
  else view.setQuality(quality);
  stress = debug && stress;
  autopick = debug && autopick;

  const run = createSurvivorRun({ seed, animalId, classId, modifiers, revive, timeScale });
  const world = run.world;
  const terrain = createTerrainView(view.scene, world.seed);
  const enemyView = createEnemyView(view.scene, { sprites, camera: view.camera });
  const heroView = createHeroView(view.scene, animalId, classId, { sprites, camera: view.camera });
  const effects = createEffects(view.scene, uiLayer, { quality, camera: view.camera });
  const hud = createHud(uiLayer);
  const levelUp = createLevelUpDialog(uiLayer, { onChoose: (i) => chooseCard(run, i) });
  const pauseMenu = createPauseMenu(uiLayer, { onResume: resume, onAbandon: abandon });

  function onResize() {
    const { halfW, halfH } = view.resize();
    setView(run, halfW, halfH);
  }
  window.addEventListener('resize', onResize);
  onResize();

  // ------------------------------------------------ Eingabe, Pause

  const keys = createKeyState();
  const detachKeyboard = attachKeyboard(window, keys, {
    onPause() {
      if (run.state === 'playing') pause();
      else if (run.state === 'paused' && !pauseMenu.busy) resume();
    },
    onCardKey(index) { if (levelUp.open) levelUp.choose(index); },
  });

  function pause() {
    keys.clear();
    setPaused(run, true);
    if (run.state === 'paused') pauseMenu.show();
  }
  function resume() {
    pauseMenu.hide();
    keys.clear();
    setPaused(run, false);
  }
  function abandon() {
    pauseMenu.hide();
    abandonRun(run);
    handleEvents();
    finish(0);
  }

  // Fokusverlust und verdeckter Tab pausieren; weiter geht es erst über das Pausenmenü.
  // Der Belastungstest misst weiter, auch ohne Fokus.
  function onFocusLost() {
    keys.clear();
    if (run.state === 'playing' && !stress) pause();
  }
  const onVisibility = () => { if (document.hidden) onFocusLost(); };
  window.addEventListener('blur', onFocusLost);
  document.addEventListener('visibilitychange', onVisibility);

  // ------------------------------------------------ Debug

  function onDebugKey(e) {
    if (e.repeat || e.ctrlKey || e.altKey || e.metaKey || run.state !== 'playing') return;
    if (e.code === 'KeyK') {
      for (const enemy of [...world.enemies]) damageEnemy(world, enemy, { amount: enemy.hp, crit: false }, 'debug');
      delete world.run.damageByAbility.debug;
    } else if (e.code === 'KeyL') {
      world.run.xp += xpToNext(world.run.level);
    }
  }
  if (debug) window.addEventListener('keydown', onDebugKey);

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
  let fpsNode = null, fpsFrames = 0, fpsStart = NaN;
  function measureFps(now) {
    if (Number.isNaN(fpsStart)) { fpsStart = now; fpsFrames = 0; return; }
    fpsFrames++;
    const elapsed = (now - fpsStart) / 1000;
    if (elapsed < FPS_WINDOW) return;
    const fps = fpsFrames / elapsed;
    const text = `${fps.toFixed(1)} Bilder/s bei ${world.enemies.length} Gegnern (Qualität ${quality})`;
    console.log('[stress] ' + text);
    if (!fpsNode) uiLayer.append(fpsNode = el('div', { class: 'fps-readout' }));
    fpsNode.textContent = text;
    window.__fps = fps;
    fpsStart = now; fpsFrames = 0;
  }

  // ------------------------------------------------ Schleife

  function handleEvents() {
    heroView.handle(run.events, world);
    effects.handle(run.events, world);
  }

  let endTimer = 0, ended = false;
  /** Meldet das Ende einmal, nach `delay` ms. */
  function finish(delay) {
    if (ended) return;
    ended = true;
    keys.clear();
    endTimer = setTimeout(() => onEnd?.(getSummary(run)), delay);
  }

  let acc = 0, last = NaN, rafId = 0;
  function frame(now) {
    rafId = requestAnimationFrame(frame);
    const dt = Number.isNaN(last) ? 0 : Math.min(MAX_FRAME_DT, (now - last) / 1000);
    last = now;

    let steps = 0;
    if (run.state === 'playing') {
      acc += dt;
      while (acc >= STEP && steps < MAX_STEPS_PER_FRAME && run.state === 'playing') {
        if (stress) fillRats();
        stepRun(run, STEP, keys.readMoveVector());
        handleEvents();
        acc -= STEP;
        steps++;
      }
      if (steps === MAX_STEPS_PER_FRAME) acc = Math.min(acc, STEP);
    }
    // Pause, Kartenwahl und Ende: Welt steht, kein Nachholen danach.
    if (run.state !== 'playing') acc = 0;

    if (run.state === 'levelup' && !levelUp.open) {
      if (autopick) chooseCard(run, 0);
      else { keys.clear(); levelUp.show(run.cards, world, world.run.level + 1); }
    }
    if (run.state === 'won' || run.state === 'lost') finish(END_DELAY * 1000);

    const alpha = run.state === 'playing' ? acc / STEP : 1;
    heroView.sync(world, alpha);
    const p = heroView.position;
    view.setTarget(p.x, p.z);
    terrain.update(p.x, p.z);
    enemyView.sync(world, alpha);
    effects.update(run.state === 'playing' || ended ? dt : 0, p);
    hud.update(run);
    view.render();
    if (stress) measureFps(now);
  }
  rafId = requestAnimationFrame(frame);

  if (debug) window.__debug = { run, view, enemyView, heroView, effects, terrain, hud, levelUp, pauseMenu, keys };

  let stopped = false;
  return {
    /** Hält die Schleife an, löst Tasten und Ereignisse und entfernt alle Teile des Durchgangs aus Szene und Anzeige. */
    stop() {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(rafId);
      clearTimeout(endTimer);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('blur', onFocusLost);
      document.removeEventListener('visibilitychange', onVisibility);
      if (debug) window.removeEventListener('keydown', onDebugKey);
      detachKeyboard();
      terrain.dispose();
      enemyView.dispose();
      heroView.dispose();
      effects.dispose();
      hud.dispose();
      levelUp.dispose();
      pauseMenu.dispose();
      fpsNode?.remove();
      if (debug) delete window.__debug;
    },
  };
}

/**
 * Pausenmenü mit „Weiter“ und „Aufgeben“ (mit Rückfrage).
 * @param {HTMLElement} uiLayer
 * @param {{ onResume: () => void, onAbandon: () => void }} handlers
 */
function createPauseMenu(uiLayer, { onResume, onAbandon }) {
  let busy = false;
  const resumeBtn = el('button', { class: 'btn btn-primary btn-large', type: 'button', onclick: () => onResume() }, 'Weiter');
  const abandonBtn = el('button', {
    class: 'btn btn-danger', type: 'button',
    onclick: async () => {
      busy = true;
      const ok = await confirmDialog({
        title: 'Durchgang aufgeben?',
        message: 'Der Durchgang endet als Niederlage. Das gesammelte Gold bleibt dir.',
        confirmLabel: 'Aufgeben',
      });
      busy = false;
      if (ok) onAbandon();
    },
  }, 'Aufgeben');
  const root = el('div', { class: 'overlay pause', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pause-title', hidden: true },
    el('div', { class: 'pause-box' },
      el('h2', { id: 'pause-title', text: 'Pause' }),
      el('p', { class: 'muted', text: 'Esc oder „Weiter“ setzt fort.' }),
      resumeBtn,
      abandonBtn));
  uiLayer.append(root);
  return {
    show() { root.hidden = false; resumeBtn.focus({ preventScroll: true }); },
    hide() { root.hidden = true; },
    /** Während der Rückfrage zum Aufgeben. */
    get busy() { return busy; },
    dispose() { root.remove(); },
  };
}
