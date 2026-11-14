import { test, assertEqual, assertTrue } from './runner.js';
import { defaultSave } from '../src/save/store.js';
import { renderDice, renderHiLo } from '../src/ui/tavernGames.js';
import { TABLE_MOTION } from '../src/data/tavern.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Kleinstes App-Objekt für einen Spieltisch: Spielstand mit Gold, alles andere ohne Wirkung. */
function fakeApp(gold) {
  const app = {
    save: { ...defaultSave(), gold },
    update(mutate) { mutate(app.save); },
    sfx: { play() {} },
    screens: { show() {} },
    unlockStoredAchievements: () => [],
    announceAchievement() {},
  };
  return app;
}

/** Baut einen Tisch in einem unsichtbaren Container auf und räumt danach wieder ab. */
async function withTable(render, run) {
  const c = document.createElement('section');
  c.style.cssText = 'position: fixed; left: -9999px; top: 0; width: 360px;';
  document.body.append(c);
  const cleanup = render(c, { heroId: 'h1' }, fakeApp(1000));
  try {
    await run(c);
  } finally {
    cleanup?.();
    c.remove();
  }
}

/** Kürzt die laufende Animation ab, wie ein Tippen auf den Tisch. */
const tap = (c) => c.dispatchEvent(new Event('pointerdown'));

test('tavernGames: nach dem Würfeln bleibt der Knopf während der kurzen Sperre sichtbar gesperrt', async () => {
  await withTable(renderDice, async (c) => {
    const play = c.querySelector('.table-play');
    assertEqual(play.disabled, false);
    play.click();
    assertEqual(play.disabled, true, 'während der Animation');
    tap(c);
    assertEqual(play.disabled, true, 'direkt nach dem Ergebnis');
    await wait(TABLE_MOTION.cooldownMs + 100);
    assertEqual(play.disabled, false, 'nach der Sperre');
  });
});

test('tavernGames: Höher oder tiefer sperrt die Tipps nach dem Aufdecken sichtbar, bis die Sperre vorbei ist', async () => {
  await withTable(renderHiLo, async (c) => {
    c.querySelector('.table-play').click();
    tap(c);
    const guesses = [...c.querySelectorAll('.hilo-guess')];
    assertEqual(guesses.length, 2);
    assertTrue(guesses.every((b) => b.disabled), 'direkt nach dem Aufdecken');
    await wait(TABLE_MOTION.cooldownMs + 100);
    assertTrue(guesses.some((b) => !b.disabled), 'nach der Sperre');
  });
});
