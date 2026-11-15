import { test, assertEqual, assertTrue, assertClose } from './runner.js';
import { edgeArrow } from '../src/ui/minimapMath.js';

test('minimap: kein Pfeil, solange das Ziel auf der Minikarte liegt', () => {
  assertEqual(edgeArrow(0, 0, 10, 10, 30), null);
});

test('minimap: Ziel weit weg ergibt einen Randpunkt in seiner Richtung', () => {
  const a = edgeArrow(0, 0, 100, 0, 30);
  assertClose(a.x, 30); assertClose(a.y, 0); assertClose(a.angle, 0);
  const b = edgeArrow(10, 10, 10, -200, 30);
  assertClose(b.x, 0); assertClose(b.y, -30); assertClose(b.angle, -Math.PI / 2);
  const c = edgeArrow(0, 0, 60, 120, 30);
  assertTrue(Math.max(Math.abs(c.x), Math.abs(c.y)) <= 30 + 1e-9);
  assertClose(c.y, 30);
});

test('minimap: jede Zellart des Kartenrasters hat eine Farbe (auch Schlamm)', async () => {
  const { CELL } = await import('../src/core/mapGrid.js');
  const { MINIMAP } = await import('../src/data/adventure.js');
  for (const name of Object.keys(CELL)) assertTrue(/^#[0-9a-f]{6}$/.test(MINIMAP.colors?.[name] ?? ''), name);
  assertTrue(MINIMAP.colors.mud !== MINIMAP.colors.walk && MINIMAP.colors.mud !== MINIMAP.colors.water);
});
