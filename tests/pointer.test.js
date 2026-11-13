import { test, assertEqual, assertClose } from './runner.js';
import { createPointerState, combineMove } from '../src/input/pointer.js';

test('pointer: Totzone und Richtung', () => {
  const p = createPointerState();
  p.down(1, 100, 100);
  assertEqual(p.readMoveVector(), { moveX: 0, moveZ: 0 });
  p.move(1, 108, 100);
  assertEqual(p.readMoveVector(), { moveX: 0, moveZ: 0 });
  p.move(1, 130, 100);
  assertEqual(p.readMoveVector(), { moveX: 1, moveZ: 0 });
  p.move(1, 100, 60);
  assertEqual(p.readMoveVector(), { moveX: 0, moveZ: -1 });
  p.move(1, 130, 130);
  const v = p.readMoveVector();
  assertClose(v.moveX, Math.SQRT1_2); assertClose(v.moveZ, Math.SQRT1_2);
});
test('pointer: Ansatzpunkt wandert nach', () => {
  const p = createPointerState();
  p.down(1, 100, 100); p.move(1, 300, 100);
  assertClose(p.anchor().x, 230); assertClose(p.anchor().y, 100);
});
test('pointer: zweiter Finger steuert nicht und beendet nichts', () => {
  const p = createPointerState();
  p.down(1, 100, 100); p.move(1, 130, 100);
  p.down(2, 10, 10); p.move(2, 10, 200); p.up(2);
  assertEqual(p.readMoveVector(), { moveX: 1, moveZ: 0 });
});
test('pointer: up, cancel und reset halten an', () => {
  for (const end of ['up', 'cancel']) {
    const p = createPointerState();
    p.down(1, 100, 100); p.move(1, 130, 100); p[end](1);
    assertEqual(p.readMoveVector(), { moveX: 0, moveZ: 0 });
    assertEqual(p.anchor(), null); assertEqual(p.active(), false);
  }
  const p = createPointerState();
  p.down(1, 100, 100); p.move(1, 130, 100); p.reset();
  assertEqual(p.readMoveVector(), { moveX: 0, moveZ: 0 });
});
test('pointer: Tastatur hat Vorrang', () => {
  assertEqual(combineMove({ moveX: -1, moveZ: 0 }, { moveX: 1, moveZ: 0 }), { moveX: -1, moveZ: 0 });
  assertEqual(combineMove({ moveX: 0, moveZ: 0 }, { moveX: 1, moveZ: 0 }), { moveX: 1, moveZ: 0 });
});
