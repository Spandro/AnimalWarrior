import { test, assertEqual, assertTrue, assertClose } from './runner.js';
import { visibleHalfWidth, cameraDistanceFor } from '../src/render/cameraFit.js';
import { initialQuality } from '../src/render/quality.js';
import { CAMERA_FIT } from '../src/data/sprites.js';

const { fovDeg: FOV, tiltDeg: TILT, landscapeDistance: NEAR, minHalfWidth: MIN_W, maxDistance: MAX_D } = CAMERA_FIT;
/** Hochkant-Seitenverhältnis eines üblichen Handys (390 × 844 CSS-Pixel). */
const PHONE = 390 / 844;

test('cameraFit: quer bleibt es beim bisherigen Abstand', () => {
  assertEqual(cameraDistanceFor(16 / 9, FOV, TILT), NEAR);
  assertTrue(visibleHalfWidth(NEAR, 16 / 9, FOV, TILT) >= MIN_W, 'quer ist ohnehin breit genug');
});

test('cameraFit: hochkant rückt die Kamera gerade so weit zurück, wie nötig', () => {
  const d = cameraDistanceFor(PHONE, FOV, TILT);
  assertTrue(d > NEAR, `erwartet mehr als ${NEAR}, erhalten ${d}`);
  assertTrue(d <= MAX_D, `erwartet höchstens ${MAX_D}, erhalten ${d}`);
  assertTrue(visibleHalfWidth(d, PHONE, FOV, TILT) >= MIN_W - 1e-6, 'Mindestbreite erreicht');
  assertTrue(visibleHalfWidth(d - 0.5, PHONE, FOV, TILT) < MIN_W, 'ein halber Meter näher reicht nicht mehr');
});

test('cameraFit: sichtbare Breite wächst mit Abstand und mit Seitenverhältnis', () => {
  for (const aspect of [PHONE, 1, 16 / 9]) {
    let last = -Infinity;
    for (const d of [5, 10, 15, 25, 40]) {
      const w = visibleHalfWidth(d, aspect, FOV, TILT);
      assertTrue(w > last, `Abstand ${d} bei ${aspect}: ${w} ist nicht größer als ${last}`);
      last = w;
    }
  }
  let last = -Infinity;
  for (const aspect of [0.2, 0.5, 1, 1.5, 16 / 9]) {
    const w = visibleHalfWidth(20, aspect, FOV, TILT);
    assertTrue(w > last, `Seitenverhältnis ${aspect}: ${w} ist nicht größer als ${last}`);
    last = w;
  }
});

test('cameraFit: sehr schmale Anzeige wird beim größten Abstand gedeckelt', () => {
  assertEqual(cameraDistanceFor(0.2, FOV, TILT), MAX_D);
});

test('cameraFit: halbe Breite ist die halbe Bildbreite auf Zielhöhe', () => {
  // Gegenprobe zur Projektion: Ein Punkt in dieser Entfernung quer zur Blickrichtung
  // liegt genau am Bildrand, unabhängig vom Höhenwinkel.
  const d = 15, aspect = 16 / 9;
  assertClose(visibleHalfWidth(d, aspect, FOV, TILT), d * Math.tan((FOV * Math.PI) / 360) * aspect);
  assertClose(visibleHalfWidth(d, aspect, FOV, 90), visibleHalfWidth(d, aspect, FOV, 30));
});

test('quality: Fingergeräte starten sparsam, Rechner in voller Qualität', () => {
  assertEqual(initialQuality(true), 'low');
  assertEqual(initialQuality(false), 'high');
});
