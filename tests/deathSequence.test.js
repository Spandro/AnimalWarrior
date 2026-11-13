import { test, assertEqual, assertClose, assertTrue } from './runner.js';
import { deathSequence } from '../src/ui/deathSequence.js';
import { DEATH_LINES, VICTORY_LINES } from '../src/data/texts.js';
import { DYING } from '../src/data/waves.js';

test('deathSequence: normal bei t = 0', () => {
  assertEqual(deathSequence(0, false), {
    grayscale: 0, darkness: 0, heroTilt: 0, heroOpacity: 1, showText: false, canSkip: false, done: false,
  });
});

test('deathSequence: normal bei t = 0,6', () => {
  const s = deathSequence(0.6, false);
  assertClose(s.grayscale, 0.5);
  assertEqual(s.darkness, 0);
  assertClose(s.heroTilt, 0.75);
  assertClose(s.heroOpacity, 1);
  assertEqual([s.showText, s.canSkip, s.done], [false, true, false]);
});

test('deathSequence: normal bei t = 1,2', () => {
  const s = deathSequence(1.2, false);
  assertClose(s.grayscale, 1);
  assertClose(s.darkness, 0.2 / 2.2);
  assertEqual(s.heroTilt, 1);
  assertClose(s.heroOpacity, 1 - 0.4 / 1.2);
  assertEqual([s.showText, s.canSkip, s.done], [false, true, false]);
});

test('deathSequence: normal bei t = 2,0, 3,2 und 4,4', () => {
  const a = deathSequence(2.0, false);
  assertClose(a.heroOpacity, 0);
  assertClose(a.darkness, 1 / 2.2);
  assertEqual([a.showText, a.done], [false, false]);
  const b = deathSequence(3.2, false);
  assertEqual([b.darkness, b.showText, b.done, b.heroOpacity], [1, true, false, 0]);
  const c = deathSequence(4.4, false);
  assertEqual([c.darkness, c.showText, c.done, c.canSkip], [1, true, true, true]);
});

test('deathSequence: reduziert bei t = 0, 0,6, 1,2 und 3,0', () => {
  const a = deathSequence(0, true);
  assertEqual([a.darkness, a.heroTilt, a.showText, a.done], [0, 0, false, false]);
  const b = deathSequence(0.6, true);
  assertClose(b.darkness, 0.5);
  assertEqual([b.heroTilt, b.canSkip, b.showText], [0, true, false]);
  const c = deathSequence(1.2, true);
  assertEqual([c.darkness, c.showText, c.done, c.heroTilt], [1, true, false, 0]);
  const d = deathSequence(3.0, true);
  assertEqual([d.done, d.heroTilt], [true, 0]);
});

test('deathSequence: alle Werte zwischen 0 und 1, darkness fällt nie', () => {
  for (const reduced of [false, true]) {
    let darkness = 0;
    for (let i = 0; i <= 120; i++) {
      const s = deathSequence(i * 0.05, reduced);
      for (const k of ['grayscale', 'darkness', 'heroTilt', 'heroOpacity']) {
        assertTrue(s[k] >= 0 && s[k] <= 1, `${k} bei ${i * 0.05}: ${s[k]}`);
      }
      assertTrue(s.darkness >= darkness, 'darkness fällt');
      darkness = s.darkness;
    }
  }
});

test('texts: je mindestens sechs Sprüche, der erste Todesspruch steht fest', () => {
  assertTrue(DEATH_LINES.length >= 6 && VICTORY_LINES.length >= 6);
  assertEqual(DEATH_LINES[0], 'Das Gras hier ist wirklich bequem.');
  for (const l of [...DEATH_LINES, ...VICTORY_LINES]) assertTrue(typeof l === 'string' && l.length > 0 && l.length < 80);
});

test('waves: DYING hat 1,0 s und Zeitlupe 0,25', () => {
  assertEqual(DYING, { duration: 1.0, timeScale: 0.25 });
});
