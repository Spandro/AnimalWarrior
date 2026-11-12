// Vorschauszene (vorläufig): alle neun Tier-×-Klasse-Kombinationen auf dem Gelände.
// `?quality=low` schaltet die niedrige Qualitätsstufe ein, `?speed=5` zeigt die Laufanimation.
import { isWebGLAvailable, createRenderer } from './render/renderer.js';
import { buildCharacter, animateCharacter } from './render/character.js';
import { createTerrainView } from './render/terrain.js';
import { ANIMALS } from './data/animals.js';
import { CLASSES } from './data/classes.js';

const canvas = document.getElementById('game');

if (!isWebGLAvailable()) {
  document.getElementById('ui').textContent = 'Dein Browser unterstützt kein WebGL 2.';
} else {
  const params = new URLSearchParams(location.search);
  const quality = params.get('quality') === 'low' ? 'low' : 'high';
  const speed = Number(params.get('speed')) || 0; // Schrittanimation prüfen, z. B. ?speed=5
  const view = createRenderer(canvas, { quality });
  const terrain = createTerrainView(view.scene, 1);
  terrain.update(0, 0);
  view.setTarget(0, 0);

  const SPACING = 2.6;
  const heroes = [];
  Object.keys(ANIMALS).forEach((animalId, row) => {
    Object.keys(CLASSES).forEach((classId, col) => {
      const hero = buildCharacter(animalId, classId);
      hero.position.set((col - 1) * SPACING, 0, (row - 1) * SPACING);
      hero.rotation.y = 0.5;
      view.scene.add(hero);
      heroes.push(hero);
    });
  });

  window.addEventListener('resize', () => view.resize());
  view.resize();

  const ATTACK_EVERY = 4, ATTACK_TIME = 0.5;
  function frame(ms) {
    const time = ms / 1000;
    heroes.forEach((hero, i) => {
      const t = (time + i * 0.45) % ATTACK_EVERY;
      animateCharacter(hero, { speed, time: time + i, attackT: t < ATTACK_TIME ? t / ATTACK_TIME : undefined });
    });
    view.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Zum Prüfen im Browser.
  window.__preview = { view, heroes, animateCharacter };
}
