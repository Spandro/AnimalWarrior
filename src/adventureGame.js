// Spielschleife des Abenteuers (wie src/game.js für den Wellen-Modus): fester Schritt, Eingabe, Darstellung, Anzeige,
// Gespräche und Menüs. Speichert über `app.update`, sobald der Lauf etwas Neues hat (`run.dirty`).
import { createRenderer } from './render/renderer.js';
import { createMapView } from './render/mapView.js';
import { createEnemyView } from './render/enemies.js';
import { createHeroView } from './render/hero.js';
import { createEffects } from './render/effects.js';
import { createSignatureView } from './render/signatures.js';
import {
  createAdventureRun, stepAdventure, useAbility, drinkPotion, interact, endTalk, acceptOffer, setPaused, closeMenu, travel,
  snapshot, clearLedger, refreshFromSave, markIntroSeen,
} from './modes/adventure.js';
import { commitAdventure } from './save/adventure.js';
import { damageEnemy } from './core/world.js';
import { createKeyState, attachKeyboard } from './input/keyboard.js';
import { createPointerState, attachPointer, combineMove } from './input/pointer.js';
import { createStick } from './ui/stick.js';
import { createAdventureHud } from './ui/adventureHud.js';
import { showDialogue } from './ui/dialogue.js';
import { openPauseMenu, openCampfire, openBigMap, openQuests, playStory, openRespec } from './ui/adventureMenus.js';
import { offerRespec } from './ui/treeText.js';
import { openEquipment } from './ui/equipment.js';
import { openShop } from './ui/shop.js';
import { openSmith } from './ui/smith.js';
import { STORY } from './data/story.js';
import { DIALOGUES, NPCS } from './data/dialogues.js';
import { LOW_HEALTH_FRACTION } from './data/sprites.js';

const STEP = 1 / 60;
const MAX_STEPS_PER_FRAME = 5;
const MAX_FRAME_DT = 0.25;
/** Kleinster Abstand zweier Speichervorgänge für Kleinkram wie Gold (ms); Wichtiges speichert sofort. */
const COMMIT_EVERY_MS = 1500;
const IMPORTANT = new Set(['questAccepted', 'questAdvanced', 'questCompleted', 'levelUp', 'bossDefeated', 'loot', 'rested', 'travel', 'mapChange', 'wake', 'chapterDone']);
/** Debug-Taste K: besiegt Gegner in diesem Umkreis (m). */
const DEBUG_KILL_RANGE = 20;

/**
 * @param {{ canvas: HTMLCanvasElement, uiLayer: HTMLElement, view?: ReturnType<typeof createRenderer>, app: any, heroId: string,
 *   seed: number, quality?: 'high'|'low', timeScale?: number, debug?: boolean, sprites?: any, env?: any, sfx?: any,
 *   tiles?: import('./render/environment.js').TrailTiles, onExit(): void }} options
 * @returns {{ stop(): void, setQuality(q: 'high'|'low'): void }}
 */
export function startAdventure({ canvas, uiLayer, view, app, heroId, seed, quality = 'high', timeScale = 1, debug = false, sprites, env, tiles, sfx, onExit }) {
  if (!view) view = createRenderer(canvas, { quality });
  else view.setQuality(quality);
  const run = createAdventureRun({ seed, save: app.save, heroId });
  const reducedMotion = (() => { try { return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches; } catch { return false; } })();

  let mapView = null, mapId = null;
  function ensureMapView() {
    if (mapId === run.map.id) return;
    mapView?.dispose();
    mapView = createMapView(view.scene, run.map, run.grid, { env, sprites, tiles, camera: view.camera, seed: run.seed });
    mapId = run.map.id;
  }
  ensureMapView();
  const enemyView = createEnemyView(view.scene, { sprites, camera: view.camera, env });
  const heroView = createHeroView(view.scene, run.hero.animal, run.hero.class, { sprites, camera: view.camera, reducedMotion });
  const effects = createEffects(view.scene, uiLayer, { quality, camera: view.camera });
  const signatureView = createSignatureView(view.scene);
  const hud = createAdventureHud(uiLayer, {
    side: app.save.settings.buttonSide,
    onAbility: (slot) => useAbility(run, slot),
    onPotion: () => drinkPotion(run),
    onInteract: () => doInteract(),
    onPause: () => togglePause(),
    onMap: () => openPage(openBigMap),
  });

  /** Menü, Gespräch oder Geschichte offen: keine Spieleingabe. */
  let busy = false;
  const ctx = {
    uiLayer, app, heroId, run, minimap: hud.minimap, onExit,
    change(mutator) {
      commit(true);
      app.update((save) => mutator(save, save.heroes.find((h) => h.id === heroId)));
      announceAchievements();
      refreshFromSave(run, app.save);
    },
  };

  // ------------------------------------------------ Speichern

  let lastCommit = 0;
  function commit(force = false) {
    if (!run.dirty) return;
    const now = performance.now();
    if (!force && now - lastCommit < COMMIT_EVERY_MS) return;
    lastCommit = now;
    app.update((save) => { commitAdventure(save, heroId, snapshot(run)); });
    clearLedger(run);
    run.dirty = false;
    announceAchievements();
    run.save = app.save; // nach den Erfolgsbelohnungen, damit z. B. der Goldverlust beim Tod mit dem richtigen Gold rechnet
  }
  function announceAchievements() {
    for (const id of app.unlockStoredAchievements()) app.announceAchievement(id);
  }

  // ------------------------------------------------ Eingabe

  function onResize() { view.resize(); pointer.reset(); }
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  const keys = createKeyState();
  const detachKeyboard = attachKeyboard(window, keys, {
    onPause: () => togglePause(),
    onKey(code) {
      if (busy || run.state !== 'playing') return false;
      if (code === 'Digit1' || code === 'Numpad1') useAbility(run, 0);
      else if (code === 'Digit2' || code === 'Numpad2') useAbility(run, 1);
      else if (code === 'Digit3' || code === 'Numpad3') useAbility(run, 2);
      else if (code === 'Digit4' || code === 'Numpad4') drinkPotion(run);
      else if (code === 'KeyE' || code === 'Enter' || code === 'NumpadEnter') doInteract();
      else if (code === 'KeyM') openPage(openBigMap);
      else if (code === 'KeyJ') openPage(openQuests);
      else return false;
      return true;
    },
  });
  const pointer = createPointerState();
  const stick = createStick(uiLayer);
  const detachPointer = attachPointer(canvas, pointer, { isBlocked: () => busy || run.state !== 'playing' });
  onResize();

  /** Hält die Welt an, solange `task` läuft (Menü, Gespräch). */
  async function hold(task) {
    if (busy) return undefined;
    busy = true;
    keys.clear(); pointer.reset();
    const wasPlaying = run.state === 'playing';
    if (wasPlaying) setPaused(run, true);
    commit(true);
    try {
      return await task();
    } finally {
      if (wasPlaying) setPaused(run, false);
      commit(true);
      keys.clear();
      busy = false;
    }
  }
  const openPage = (page) => hold(() => page(ctx));

  async function togglePause() {
    if (busy || run.state !== 'playing') return;
    let choice = 'resume';
    await hold(async () => { choice = await openPauseMenu(ctx, { equipment: openEquipment }); });
    if (choice === 'exit') { commit(true); onExit(); }
  }

  async function doInteract() {
    if (busy || run.state !== 'playing' || !run.interactable) return;
    const r = interact(run);
    if (!r) return;
    // Die Ereignisse der Aktion kommen mit dem nächsten Schritt (run.events), hier nicht noch einmal behandeln.
    if (r.kind === 'talk') {
      busy = true; keys.clear(); pointer.reset();
      commit(true);
      try {
        const answer = await showDialogue(uiLayer, { npc: r.npc, speaker: r.speaker, lines: r.lines, choice: !!r.offer && !r.autoAccept });
        if (answer === 'accept' && r.offer) acceptOffer(run, r.offer);
      } finally {
        endTalk(run);
        busy = false;
      }
      commit(true);
      if (r.shop) await openPage(r.shop === 'merchant' ? openShop : openSmith);
      if (offerRespec(r, run.record)) await openPage(openRespec);
    } else if (r.kind === 'campfire') {
      busy = true; keys.clear(); pointer.reset();
      commit(true);
      let target = null;
      try {
        target = await openCampfire(ctx, r);
      } finally {
        if (target) travel(run, target); else closeMenu(run);
        busy = false;
      }
      commit(true);
    } else {
      commit(true);
    }
  }

  function onFocusLost() {
    keys.clear(); pointer.reset();
    if (run.state === 'playing' && !busy) togglePause();
  }
  const onVisibility = () => { if (document.hidden) onFocusLost(); };
  window.addEventListener('blur', onFocusLost);
  document.addEventListener('visibilitychange', onVisibility);

  function onDebugKey(e) {
    if (e.repeat || e.ctrlKey || e.altKey || e.metaKey || run.state !== 'playing' || busy) return;
    if (e.code === 'KeyK') {
      const h = run.world.hero;
      for (const enemy of [...run.world.enemies]) {
        if (Math.hypot(enemy.x - h.x, enemy.z - h.z) <= DEBUG_KILL_RANGE) damageEnemy(run.world, enemy, { amount: enemy.hp + 1e6, crit: false }, 'debug');
      }
    }
  }
  if (debug) window.addEventListener('keydown', onDebugKey);

  // ------------------------------------------------ Ereignisse

  /** Geschichten, die nach einem Ereignis drankommen (Flaschenpost, Kapitelende). */
  const storyQueue = [];
  function handleEvents() {
    heroView.handle(run.events, run.world);
    effects.handle(run.events, run.world);
    sfx?.handle(run.events);
    hud.handle(run.events);
    let important = false;
    for (const e of run.events) {
      if (IMPORTANT.has(e.type)) important = true;
      if (e.type === 'heroHit' && !e.poison) { heroView.flash(); if (!reducedMotion) view.shake(); }
      else if (e.type === 'dying') { keys.clear(); pointer.reset(); }
      else if (e.type === 'questAdvanced' && e.questId === 'zwickzwack' && run.record.quests.zwickzwack?.step === 2) {
        storyQueue.push(() => showDialogue(uiLayer, { npc: 'flossian', speaker: NPCS.flossian.name, lines: DIALOGUES.flossian.progress.zwickzwack }));
      } else if (e.type === 'chapterDone') storyQueue.push(() => playStory(uiLayer, [STORY.chapterEnd[e.chapter]]));
    }
    if (important) commit(true);
  }

  // ------------------------------------------------ Schleife

  let acc = 0, last = NaN, rafId = 0, lastLow = false, stopped = false;
  function frame(now) {
    rafId = requestAnimationFrame(frame);
    const realDt = Number.isNaN(last) ? 0 : Math.max(0, (now - last) / 1000);
    const dt = Math.min(MAX_FRAME_DT, realDt) * timeScale;
    last = now;
    if (!busy && (run.state === 'playing' || run.state === 'dying')) {
      acc += dt;
      let steps = 0;
      while (acc >= STEP && steps < MAX_STEPS_PER_FRAME && (run.state === 'playing' || run.state === 'dying')) {
        stepAdventure(run, STEP, combineMove(keys.readMoveVector(), pointer.readMoveVector()));
        handleEvents();
        acc -= STEP;
        steps++;
      }
      if (steps === MAX_STEPS_PER_FRAME) acc = Math.min(acc, STEP);
    } else acc = 0;
    commit();
    if (!busy && storyQueue.length && run.state === 'playing') {
      const next = storyQueue.shift();
      hold(next);
    }
    ensureMapView();

    const low = run.state === 'playing' && run.world.hero.hp / run.world.hero.stats.maxHp < LOW_HEALTH_FRACTION;
    if (low !== lastLow) { lastLow = low; effects.setLowHealth(low); }
    const alpha = run.state === 'playing' && !busy ? acc / STEP : 1;
    heroView.sync(run.world, alpha);
    const p = heroView.position;
    view.setTarget(p.x, p.z);
    mapView.update(run, p.x, p.z, dt);
    enemyView.sync(run.world, alpha);
    signatureView.sync(run.world, p);
    effects.update(busy || run.state === 'paused' ? 0 : dt, p);
    hud.update(run, realDt);
    stick.update(pointer);
    view.render();
  }
  rafId = requestAnimationFrame(frame);

  if (!run.record.introSeen) {
    hold(async () => { await playStory(uiLayer, STORY.intro); markIntroSeen(run); });
  }
  if (debug) window.__debug = { run, view, hud, keys, pointer };

  return {
    setQuality(q) { view.setQuality(q); effects.setQuality(q); hud.setSide(app.save.settings.buttonSide); },
    stop() {
      if (stopped) return;
      stopped = true;
      commit(true);
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.removeEventListener('blur', onFocusLost);
      document.removeEventListener('visibilitychange', onVisibility);
      if (debug) { window.removeEventListener('keydown', onDebugKey); delete window.__debug; }
      detachKeyboard();
      detachPointer();
      stick.dispose();
      mapView.dispose();
      enemyView.dispose();
      heroView.dispose();
      signatureView.dispose();
      effects.dispose();
      hud.dispose();
      for (const node of uiLayer.querySelectorAll('.adv-overlay, .dialogue, .adv-story')) node.remove();
    },
  };
}
