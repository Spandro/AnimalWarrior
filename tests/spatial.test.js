import { test, assertEqual } from './runner.js';
import { createGrid } from '../src/core/spatial.js';

test('spatial: queryCircle findet genau die überlappenden Kreise, auch über Zellgrenzen', () => {
  const grid = createGrid(4);
  const a = { x: 3.9, z: 0, radius: 0.5 };   // ragt über die Zellgrenze x=4
  const b = { x: 10, z: 10, radius: 1 };
  const c = { x: -5, z: 2, radius: 0.5 };
  [a, b, c].forEach((e) => grid.insert(e));
  assertEqual(grid.queryCircle(4.3, 0, 0.2), [a]);        // Abfrage in der Nachbarzelle
  assertEqual(grid.queryCircle(10, 8.5, 0.6), [b]);       // knapp überlappend
  assertEqual(grid.queryCircle(10, 7, 0.6), []);          // knapp daneben
  assertEqual(grid.queryCircle(0, 0, 100).length, 3);
});

test('spatial: clear leert das Raster', () => {
  const grid = createGrid(4);
  grid.insert({ x: 0, z: 0, radius: 1 });
  grid.clear();
  assertEqual(grid.queryCircle(0, 0, 5), []);
});
