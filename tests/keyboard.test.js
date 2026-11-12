import { test, assertEqual } from './runner.js';
import { createKeyState } from '../src/input/keyboard.js';

test('keyboard: A und D zugleich heben sich auf', () => {
  const k = createKeyState();
  k.down('KeyA'); k.down('KeyD');
  assertEqual(k.readMoveVector().moveX, 0);
});

test('keyboard: W bewegt nach −z (oben am Bildschirm)', () => {
  const k = createKeyState();
  k.down('KeyW');
  assertEqual(k.readMoveVector(), { moveX: 0, moveZ: -1 });
});

test('keyboard: W und D ergeben (1, −1), nicht normalisiert', () => {
  const k = createKeyState();
  k.down('KeyW'); k.down('KeyD');
  assertEqual(k.readMoveVector(), { moveX: 1, moveZ: -1 });
});

test('keyboard: Pfeil links wirkt wie A', () => {
  const a = createKeyState(), b = createKeyState();
  a.down('KeyA'); b.down('ArrowLeft');
  assertEqual(b.readMoveVector(), a.readMoveVector());
  assertEqual(b.readMoveVector(), { moveX: -1, moveZ: 0 });
});

test('keyboard: nach clear() steht der Held', () => {
  const k = createKeyState();
  k.down('KeyW'); k.down('ArrowRight'); k.down('KeyS');
  k.clear();
  assertEqual(k.readMoveVector(), { moveX: 0, moveZ: 0 });
});

test('keyboard: up einer nicht gedrückten Taste ändert nichts', () => {
  const k = createKeyState();
  k.down('KeyD');
  k.up('KeyA');
  k.up('KeyQ');
  assertEqual(k.readMoveVector(), { moveX: 1, moveZ: 0 });
});

test('keyboard: Pfeil und Buchstabe derselben Richtung zählen einmal', () => {
  const k = createKeyState();
  k.down('KeyD'); k.down('ArrowRight');
  assertEqual(k.readMoveVector(), { moveX: 1, moveZ: 0 });
  k.up('KeyD');
  assertEqual(k.readMoveVector(), { moveX: 1, moveZ: 0 });
});

test('keyboard: andere Tasten bewegen nicht', () => {
  const k = createKeyState();
  k.down('Space'); k.down('Digit1');
  assertEqual(k.readMoveVector(), { moveX: 0, moveZ: 0 });
});
