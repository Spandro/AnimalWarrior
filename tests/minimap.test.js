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
