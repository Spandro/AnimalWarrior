// Ein Durchgang im Wellenmodus: Spielschleife mit festem Schritt, Tastatur, Anzeige, Level-up-Dialog und Pause.
// Was nach dem Durchgang passiert (Speichern, Ergebnis), entscheidet der Aufrufer über onEnd.
import { createRenderer } from './render/renderer.js';
import { createTerrainView } from './render/terrain.js';
import { createEnemyView } from './render/enemies.js';
import { createHeroView } from './render/hero.js';
import { createChestView } from './render/chests.js';
import { createEffects } from './render/effects.js';
import { createSurvivorRun, stepRun, chooseCard, setPaused, setView, getSummary, getFacts, abandonRun, skipDying } from './modes/survivor.js';
import { DYING } from './data/waves.js';
import { LOW_HEALTH_FRACTION } from './data/sprites.js';
import { DEATH_LINES, VICTORY_LINES } from './data/texts.js';
import { evaluateAchievements, liveStats } from './core/achievements.js';
import { spawnEnemy, damageEnemy } from './core/world.js';
import { xpToNext } from './core/progression.js';
import { createRng } from './core/rng.js';
import { createKeyState, attachKeyboard } from './input/keyboard.js';
import { createPointerState, attachPointer, combineMove } from './input/pointer.js';
import { createStick } from './ui/stick.js';
import { createHud } from './ui/hud.js';
import { createChestHint } from './ui/chestHint.js';
import { deathSequence, createDeathOverlay, DEATH_TIMES } from './ui/deathSequence.js';
import { createLevelUpDialog } from './ui/levelup.js';
import { el } from './ui/dom.js';
import { confirmDialog } from './ui/menus.js';

const STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 5;
/** Längster Abstand zweier Bilder, der noch nachgeholt wird (s). */
const MAX_FRAME_DT = 0.25;
/** Siegesmoment vor dem Ergebnis und ab wann er sich abkürzen lässt (reale s). */
const VICTORY_MOMENT = 1.5;
const VICTORY_SKIP_AFTER = 0.5;
/** So lange schlucken wir Eingaben nach dem Ergebnisbildschirm, damit das Abkürzen nichts darunter auslöst (ms). */
const INPUT_GUARD_MS = 300;
const STRESS_ENEMIES = 300;
const FPS_WINDOW = 5;

/**
 * @typedef {ReturnType<typeof getSummary>} Summary
 */

/**
 * Startet einen Durchgang und zeichnet ihn in den gemeinsamen Renderer.
 * @param {{ canvas: HTMLCanvasElement, uiLayer: HTMLElement, view?: ReturnType<typeof createRenderer>,
 *   animalId: string, classId: string, seed: number, quality?: 'high'|'low', timeScale?: number,
 *   modifiers?: import('./data/animals.js').Modifier[], revive?: boolean, sfx?: { handle(events: object[]): void },
 *   debug?: boolean, stress?: boolean, autopick?: boolean, sprites?: import('./render/sprites.js').SpriteSheets,
 *   achievements?: { getSave: () => import('./save/schema.js').Save, notify: (id: string) => void },
 *   onEnd?: (summary: Summary, extra: { facts: import('./data/achievements.js').RunFacts, earlyIds: string[] }) => void }} options
 *   `view` ist der gemeinsame Renderer der App (sonst wird einer für `canvas` angelegt). `sprites` sind die
 *   geladenen Bildbögen (`loadSpriteSheets`); fehlen sie oder sind sie nicht `ok`, erscheinen die 3D-Figuren.
 *   Nur mit `debug`: `stress` füllt die Welt mit Ratten, `autopick` wählt Karten selbst, Taste K besiegt
 *   alle Gegner, L gibt ein Level. `onEnd` kommt einmal nach Sieg, Tod oder Aufgeben. `sfx` bekommt dieselben
 *   Ereignisse wie die Effekte und spielt die Klänge dazu.
 *   `achievements` (nur mit Spielstand): `getSave` liefert den aktuellen Stand, `notify(id)` meldet einen mitten im
 *   Durchgang erfüllten Erfolg; `onEnd` bekommt dazu die Zahlen des Durchgangs und diese Ids (`earlyIds`).
 * @returns {{ stop(): void, setQuality(q: 'high'|'low'): void }}
 */
export function startGame({
  canvas, uiLayer, view, animalId, classId, seed, quality = 'high', timeScale = 1, modifiers = [], revive = false,
  debug = false, stress = false, autopick = false, sprites, sfx, achievements, onEnd,
}) {
  if (!view) view = createRenderer(canvas, { quality });
  else view.setQuality(quality);
  stress = debug && stress;
  autopick = debug && autopick;

  const run = createSurvivorRun({ seed, animalId, classId, modifiers, revive, timeScale });
  const world = run.world;
  const terrain = createTerrainView(view.scene, world.seed);
  const enemyView = createEnemyView(view.scene, { sprites, camera: view.camera });
  const chestView = createChestView(view.scene, world.seed, sprites);
  const heroView = createHeroView(view.scene, animalId, classId, { sprites, camera: view.camera });
  const effects = createEffects(view.scene, uiLayer, { quality, camera: view.camera });
  const hud = createHud(uiLayer, { onPause: () => togglePause() });
  const chestHint = createChestHint(uiLayer);
  const deathOverlay = createDeathOverlay(uiLayer, { canvas });
  /** Weniger Bewegung gewünscht: kein Wackeln, Sterbephase sofort beendet, kürzere Abblende. */
  const reducedMotion = (() => {
    try { return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
  })();
  const levelUp = createLevelUpDialog(uiLayer, { onChoose: (i) => chooseCard(run, i) });
  const pauseMenu = createPauseMenu(uiLayer, { onResume: resume, onAbandon: abandon });

  // Fenstergröße oder Drehung geändert: Kamera und Sichtbereich neu setzen. Der Steuerkreis gehört zum
  // alten Bild und würde den Helden sonst weiterlaufen lassen, also wird er zurückgesetzt.
  function onResize() {
    const { halfW, halfH } = view.resize();
    setView(run, halfW, halfH);
    pointer.reset();
  }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  // ------------------------------------------------ Eingabe, Pause

  const keys = createKeyState();
  const detachKeyboard = attachKeyboard(window, keys, {
    onPause: () => togglePause(),
    onCardKey(index) { if (levelUp.open) levelUp.choose(index); },
  });

  const pointer = createPointerState();
  const stick = createStick(uiLayer);
  const detachPointer = attachPointer(canvas, pointer, { isBlocked: () => run.state !== 'playing' });
  onResize();

  /** Esc und der Pause-Knopf in der Anzeige: hält an oder setzt fort. */
  function togglePause() {
    if (run.state === 'playing') pause();
    else if (run.state === 'paused' && !pauseMenu.busy) resume();
  }
  function pause() {
    keys.clear();
    pointer.reset();
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
    pointer.reset();
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

  /** Echtzeit-Zeitstempel (ms, wie requestAnimationFrame) des Ereignisses `dying` bzw. `victory`; null davor. */
  let dyingAt = null, victoryAt = null, frameNow = performance.now();
  let deathLine = '', victoryLine = '', skipAllowed = false;
  const pickLine = (lines) => lines[Math.floor(Math.random() * lines.length)];

  function handleEvents() {
    heroView.handle(run.events, world);
    hud.handle(run.events, world);
    effects.handle(run.events, world);
    sfx?.handle(run.events);
    let startedDying = false;
    for (const e of run.events) {
      if (e.type === 'heroHit') {
        heroView.flash();
        if (!reducedMotion) view.shake();
      } else if (e.type === 'dying') {
        startedDying = true;
        dyingAt = frameNow;
        deathLine = pickLine(DEATH_LINES);
        keys.clear();
        pointer.reset();
      } else if (e.type === 'victory') {
        victoryAt = frameNow;
        victoryLine = pickLine(VICTORY_LINES);
        deathOverlay.showVictory(victoryLine);
      }
    }
    if (startedDying && reducedMotion) { skipDying(run); handleEvents(); }
  }

  // ------------------------------------------------ Ende, Abkürzen

  let endTimer = 0, ended = false, presented = false;
  /** Meldet das Ende einmal, nach `delay` ms; Filter und Deckelement verschwinden vor dem Ergebnisbildschirm. */
  function finish(delay) {
    if (ended || stopped) return;
    ended = true;
    presented = dyingAt !== null || victoryAt !== null;
    keys.clear();
    pointer.reset();
    if (presented) guardInput(INPUT_GUARD_MS);
    endTimer = setTimeout(() => {
      deathOverlay.hide();
      onEnd?.(getSummary(run), { facts: getFacts(run), earlyIds: [...early] });
    }, delay);
  }

  /** Springt in der Darstellung vor: zum Text, zum Ende bzw. beim Sieg ans Ende des Moments. */
  function skipPresentation(now) {
    const times = reducedMotion ? DEATH_TIMES.reduced : DEATH_TIMES.normal;
    if (run.state === 'dying') {
      skipDying(run);
      handleEvents();
      dyingAt = Math.min(dyingAt, now - times.text * 1000);
    } else if (run.state === 'lost' && dyingAt !== null) {
      dyingAt = Math.min(dyingAt, now - times.done * 1000);
    } else if (run.state === 'won' && victoryAt !== null) {
      victoryAt = Math.min(victoryAt, now - VICTORY_MOMENT * 1000);
    }
  }

  const presenting = () => !ended && ((dyingAt !== null && (run.state === 'dying' || run.state === 'lost')) || (victoryAt !== null && run.state === 'won'));
  function onSkipInput(e) {
    if (!presenting()) return;
    // Ein gehaltenes Laufkommando (Tastenwiederholung) soll nicht gleich abkürzen.
    if (e.type === 'keydown' && e.repeat) { e.stopImmediatePropagation(); return; }
    if (skipAllowed && e.type !== 'click') skipPresentation(performance.now());
    e.stopImmediatePropagation();
  }
  const SKIP_EVENTS = ['pointerdown', 'click', 'keydown'];
  for (const type of SKIP_EVENTS) window.addEventListener(type, onSkipInput, true);

  /**
   * Erfolge mitten im Durchgang: einmal je Spielsekunde mit den laufenden Zahlen; neu erfüllte Ids werden sofort
   * gemeldet und für das Ende gemerkt (gespeichert und mit Gold belohnt wird erst dort).
   */
  const early = new Set();
  let achievementSecond = -1;
  function checkAchievements() {
    if (!achievements || ended || run.state === 'won' || run.state === 'lost' || run.state === 'dying') return;
    const second = Math.floor(world.time);
    if (second === achievementSecond) return;
    achievementSecond = second;
    const save = achievements.getSave();
    const f = getFacts(run);
    const ctx = { run: f, stats: liveStats(save.stats, f), save: { ...save, gold: save.gold + Math.floor(f.goldEarned) } };
    for (const id of evaluateAchievements(ctx, new Set([...Object.keys(save.achievements), ...early]))) {
      early.add(id);
      achievements.notify(id);
    }
  }

  /** Todes- und Siegesdarstellung eines Bildes aus der verstrichenen Echtzeit; meldet das Ende, wenn sie fertig ist. */
  function present(now) {
    if (ended) return;
    if (dyingAt !== null && (run.state === 'dying' || run.state === 'lost')) {
      const v = deathSequence((now - dyingAt) / 1000, reducedMotion);
      skipAllowed = v.canSkip;
      deathOverlay.apply(v, deathLine);
      heroView.setDying(v.heroTilt, v.heroOpacity);
      if (run.state === 'lost' && v.done) finish(0);
    } else if (victoryAt !== null && run.state === 'won') {
      const t = (now - victoryAt) / 1000;
      skipAllowed = t >= VICTORY_SKIP_AFTER;
      if (t >= VICTORY_MOMENT) finish(0);
    } else if (run.state === 'lost') {
      finish(0); // Aufgeben: ohne Darstellung wie bisher sofort
    }
  }

  let acc = 0, last = NaN, rafId = 0, lastLow = false;
  function frame(now) {
    rafId = requestAnimationFrame(frame);
    frameNow = now;
    const realDt = Number.isNaN(last) ? 0 : Math.max(0, (now - last) / 1000);
    const dt = Math.min(MAX_FRAME_DT, realDt);
    last = now;

    let steps = 0;
    if (run.state === 'playing') {
      acc += dt;
      while (acc >= STEP && steps < MAX_STEPS_PER_FRAME && run.state === 'playing') {
        if (stress) fillRats();
        stepRun(run, STEP, combineMove(keys.readMoveVector(), pointer.readMoveVector()));
        handleEvents();
        acc -= STEP;
        steps++;
      }
      if (steps === MAX_STEPS_PER_FRAME) acc = Math.min(acc, STEP);
    } else if (run.state === 'dying') {
      // Echtzeit ungedeckelt: nach einem verdeckten Tab ist die Sterbephase sofort vorbei; die Welt läuft nur im Zeitlupentempo.
      stepRun(run, realDt, { moveX: 0, moveZ: 0 });
      handleEvents();
    }
    // Pause, Kartenwahl und Ende: Welt steht, kein Nachholen danach.
    if (run.state !== 'playing') acc = 0;
    checkAchievements();

    if (run.state === 'levelup' && !levelUp.open) {
      if (autopick) chooseCard(run, 0);
      else { keys.clear(); pointer.reset(); levelUp.show(run.cards, world, world.run.level + 1); }
    }
    present(now);

    // Wenig Leben: roter Rand pulsiert (nur beim Wechsel schreiben).
    const low = run.state === 'playing' && world.hero.hp / world.hero.stats.maxHp < LOW_HEALTH_FRACTION;
    if (low !== lastLow) { lastLow = low; effects.setLowHealth(low); }

    const alpha = run.state === 'playing' ? acc / STEP : 1;
    heroView.sync(world, alpha);
    const p = heroView.position;
    view.setTarget(p.x, p.z);
    terrain.update(p.x, p.z);
    enemyView.sync(world, alpha);
    chestView.sync(world);
    effects.update(run.state === 'dying' ? dt * DYING.timeScale : run.state === 'levelup' || run.state === 'paused' ? 0 : dt, p);
    hud.update(run);
    chestHint.update(world, { halfW: run.view.halfW, halfH: run.view.halfH, width: uiLayer.clientWidth, height: uiLayer.clientHeight }, run.state);
    stick.update(pointer);
    view.render();
    if (stress) measureFps(now);
  }
  rafId = requestAnimationFrame(frame);

  if (debug) window.__debug = { run, view, enemyView, chestView, chestHint, heroView, effects, terrain, hud, levelUp, pauseMenu, keys, pointer, deathOverlay };

  let stopped = false;
  return {
    /** Stellt die Qualität sofort um (Renderer und Effekte), auch mitten im Durchgang. */
    setQuality(q) {
      quality = q === 'low' ? 'low' : 'high';
      view.setQuality(quality);
      effects.setQuality(quality);
    },
    /** Hält die Schleife an, löst Tasten und Ereignisse und entfernt alle Teile des Durchgangs aus Szene und Anzeige. */
    stop() {
      if (stopped) return;
      stopped = true;
      cancelAnimationFrame(rafId);
      clearTimeout(endTimer);
      for (const type of SKIP_EVENTS) window.removeEventListener(type, onSkipInput, true);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.removeEventListener('blur', onFocusLost);
      document.removeEventListener('visibilitychange', onVisibility);
      if (debug) window.removeEventListener('keydown', onDebugKey);
      detachKeyboard();
      detachPointer();
      stick.dispose();
      terrain.dispose();
      enemyView.dispose();
      chestView.dispose();
      heroView.dispose();
      effects.dispose();
      hud.dispose();
      chestHint.dispose();
      deathOverlay.dispose();
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
  const root = el('div', { class: 'overlay pause', 'data-ui-control': true, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pause-title', hidden: true },
    el('div', { class: 'pause-box' },
      el('h2', { id: 'pause-title', text: 'Pause' }),
      el('p', { class: 'muted', text: '„Weiter“ oder Esc setzt fort.' }),
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

/**
 * Schluckt Tippen, Klick und Tasten für `ms` Millisekunden (vor allen anderen Zuhörern), damit das Abkürzen der
 * Todesdarstellung nichts auslöst, was danach unter dem Zeiger auf dem Ergebnisbildschirm liegt. Läuft unabhängig vom
 * Durchgang weiter, auch wenn der Aufrufer ihn mit `stop()` beendet.
 * @param {number} ms
 */
function guardInput(ms) {
  const swallow = (e) => e.stopImmediatePropagation();
  const types = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'keydown'];
  for (const type of types) window.addEventListener(type, swallow, true);
  setTimeout(() => { for (const type of types) window.removeEventListener(type, swallow, true); }, ms);
}
