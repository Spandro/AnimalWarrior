import { test, assertEqual, assertClose, assertTrue } from './runner.js';
import { MAP_CHESTS } from '../src/data/chests.js';
import { chestInCell, chestsNear, nearestUnopenedChest } from '../src/core/chests.js';
import { createSurvivorRun, stepRun, openMapChests } from '../src/modes/survivor.js';
import { obstaclesNear } from '../src/core/terrain.js';
import { TERRAIN_CELL } from '../src/data/terrain.js';
import { xpToNext } from '../src/core/progression.js';
import { CLASSES } from '../src/data/classes.js';
import { BONUSES, FILLER } from '../src/data/bonuses.js';
import { hintArrow } from '../src/ui/chestHint.js';

const NONE = { moveX: 0, moveZ: 0 };
const SEED = 1;

/** Alle Kisten der Zellen 2…(2+nx-1) × 2…(2+nz-1), also außerhalb des Startbereichs. */
function chestsInGrid(seed, nx, nz) {
  const out = [];
  for (let cx = 2; cx < 2 + nx; cx++) for (let cz = 2; cz < 2 + nz; cz++) {
    const c = chestInCell(seed, cx, cz);
    if (c) out.push(c);
  }
  return out;
}

/** Erste Kiste, die `pred` erfüllt (Zellen weit weg vom Start, damit kein Gegner stört). */
function findChest(pred, seed = SEED) {
  const c = chestsInGrid(seed, 60, 60).find(pred);
  if (!c) throw new Error('keine passende Kiste');
  return c;
}

/** Waschbär-Dieb ohne Fähigkeiten, Held auf der Kiste. */
function runOn(chest, opts = {}) {
  const run = createSurvivorRun({ seed: SEED, animalId: 'waschbaer', classId: 'dieb', modifiers: [], revive: false, ...opts });
  run.world.hero.abilities = [];
  run.world.hero.invulnerableUntil = Infinity;
  run.world.hero.x = chest.x;
  run.world.hero.z = chest.z;
  return run;
}

const mapChestEvents = (run) => run.events.filter((e) => e.type === 'mapChest');

// ------------------------------------------------------------------ Erzeugung

test('chests: chestInCell liefert für gleiche Eingaben dasselbe, andere Startwerte andere Kisten', () => {
  for (let cx = 2; cx < 30; cx++) for (let cz = 2; cz < 30; cz++) {
    assertEqual(chestInCell(SEED, cx, cz), chestInCell(SEED, cx, cz));
  }
  const a = chestsInGrid(1, 30, 30).map((c) => c.id + c.kind);
  const b = chestsInGrid(2, 30, 30).map((c) => c.id + c.kind + Math.round(c.x));
  assertTrue(a.length > 20 && b.length > 20);
  assertTrue(JSON.stringify(a) !== JSON.stringify(b));
});

test('chests: Kennung ist "cx:cz", die Kiste liegt in ihrer Zelle', () => {
  const c = findChest(() => true);
  const [cx, cz] = c.id.split(':').map(Number);
  assertEqual(c, chestInCell(SEED, cx, cz));
  assertTrue(c.x >= cx * TERRAIN_CELL && c.x < (cx + 1) * TERRAIN_CELL);
  assertTrue(c.z >= cz * TERRAIN_CELL && c.z < (cz + 1) * TERRAIN_CELL);
});

test('chests: für 20 Startwerte keine Kiste im Umkreis von 12 um den Ursprung', () => {
  for (let seed = 1; seed <= 20; seed++) {
    assertEqual(chestsNear(seed, 0, 0, MAP_CHESTS.clearRadius), [], `seed ${seed}`);
    for (let cx = -3; cx <= 2; cx++) for (let cz = -3; cz <= 2; cz++) {
      const c = chestInCell(seed, cx, cz);
      if (c) assertTrue(Math.hypot(c.x, c.z) >= MAP_CHESTS.clearRadius, `seed ${seed} Zelle ${cx}:${cz}`);
    }
  }
});

test('chests: über 3000 Zellen hat 9 bis 13 % eine Kiste', () => {
  let n = 0;
  for (let cx = 2; cx < 62; cx++) for (let cz = 2; cz < 52; cz++) if (chestInCell(SEED, cx, cz)) n++;
  const share = n / 3000;
  assertTrue(share >= 0.09 && share <= 0.13, `Anteil ${share}`);
});

test('chests: keine von 500 Kisten berührt ein Hindernis', () => {
  const chests = chestsInGrid(SEED, 80, 80).slice(0, 500);
  assertEqual(chests.length, 500);
  for (const c of chests) {
    for (const o of obstaclesNear(SEED, c.x, c.z, MAP_CHESTS.radius + 2)) {
      assertTrue(Math.hypot(o.x - c.x, o.z - c.z) >= o.radius + MAP_CHESTS.radius, `Kiste ${c.id} berührt Hindernis`);
    }
  }
});

test('chests: Verteilung der Arten und ganzzahlige Goldmengen über mindestens 1000 Kisten', () => {
  const chests = chestsInGrid(SEED, 100, 100);
  assertTrue(chests.length >= 1000, `nur ${chests.length}`);
  const n = { gold: 0, heal: 0, upgrade: 0 };
  for (const c of chests) {
    n[c.kind]++;
    assertTrue(Number.isInteger(c.gold), c.id);
    if (c.kind === 'gold') assertTrue(c.gold >= 3 && c.gold <= 8, `gold ${c.gold}`);
    else if (c.kind === 'heal') assertTrue(c.gold >= 2 && c.gold <= 4, `heal ${c.gold}`);
    else assertEqual(c.gold, 0);
  }
  const share = (k) => n[k] / chests.length;
  assertTrue(share('gold') >= 0.55 && share('gold') <= 0.65, `gold ${share('gold')}`);
  assertTrue(share('heal') >= 0.25 && share('heal') <= 0.35, `heal ${share('heal')}`);
  assertTrue(share('upgrade') >= 0.06 && share('upgrade') <= 0.14, `upgrade ${share('upgrade')}`);
});

test('chests: chestsNear gibt genau die Kisten im Umkreis zurück', () => {
  const c = findChest(() => true);
  const near = chestsNear(SEED, c.x, c.z, 40);
  assertTrue(near.some((x) => x.id === c.id));
  for (const x of near) assertTrue(Math.hypot(x.x - c.x, x.z - c.z) <= 40);
  // alle Kisten im Umkreis sind enthalten
  const ids = new Set(near.map((x) => x.id));
  const cx0 = Math.floor((c.x - 40) / TERRAIN_CELL), cx1 = Math.floor((c.x + 40) / TERRAIN_CELL);
  const cz0 = Math.floor((c.z - 40) / TERRAIN_CELL), cz1 = Math.floor((c.z + 40) / TERRAIN_CELL);
  for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) {
    const k = chestInCell(SEED, cx, cz);
    if (k && Math.hypot(k.x - c.x, k.z - c.z) <= 40) assertTrue(ids.has(k.id), k.id);
  }
});

// ------------------------------------------------------------------ Öffnen

test('chests: Goldkiste mit 5 Gold gibt mit Goldgewinn 1,2 sechs Gold, genau einmal', () => {
  const chest = findChest((c) => c.kind === 'gold' && c.gold === 5);
  const run = runOn(chest);
  assertClose(run.world.hero.stats.goldGain, 1.2);
  const before = run.world.run.gold;
  stepRun(run, 0.05, NONE);
  const ev = mapChestEvents(run);
  assertEqual(ev.length, 1);
  assertEqual([ev[0].id, ev[0].x, ev[0].z, ev[0].kind, ev[0].heal, ev[0].card], [chest.id, chest.x, chest.z, 'gold', 0, null]);
  assertClose(ev[0].gold, 6);
  assertClose(run.world.run.gold - before, 6);
  assertTrue(run.world.openedChests.has(chest.id));
  assertEqual(run.facts.chestsOpened, 1);
  const after = run.world.run.gold;
  stepRun(run, 0.05, NONE);
  stepRun(run, 0.05, NONE);
  assertEqual(mapChestEvents(run).length, 0);
  assertEqual(run.world.run.gold, after);
  assertEqual(run.facts.chestsOpened, 1);
});

test('chests: ein Held in Reichweite (Öffnungsradius plus Kistenradius), aber nicht weiter, öffnet', () => {
  const chest = findChest((c) => c.kind === 'gold');
  const reach = MAP_CHESTS.openRadius + MAP_CHESTS.radius;
  const far = runOn(chest);
  far.world.hero.x = chest.x + reach + 0.3;
  stepRun(far, 0.05, NONE);
  assertEqual(far.world.openedChests.size, 0);
  const near = runOn(chest);
  near.world.hero.x = chest.x + reach - 0.3;
  stepRun(near, 0.05, NONE);
  assertTrue(near.world.openedChests.has(chest.id));
});

test('chests: Heilkiste bei 50 % Leben gibt 25 % des Maximums, bei 90 % nur bis zum Maximum', () => {
  const chest = findChest((c) => c.kind === 'heal');
  const run = runOn(chest);
  const max = run.world.hero.stats.maxHp;
  run.world.hero.hp = max * 0.5;
  const gold0 = run.world.run.gold;
  stepRun(run, 0.05, NONE);
  assertClose(run.world.hero.hp, max * 0.75, 1e-6);
  const ev = mapChestEvents(run)[0];
  assertClose(ev.heal, max * 0.25, 1e-6);
  assertClose(ev.gold, chest.gold * run.world.hero.stats.goldGain);
  assertClose(run.world.run.gold - gold0, ev.gold);

  const run2 = runOn(chest);
  run2.world.hero.hp = max * 0.9;
  stepRun(run2, 0.05, NONE);
  assertClose(run2.world.hero.hp, max, 1e-9);
  assertClose(mapChestEvents(run2)[0].heal, max * 0.1, 1e-6);
});

/** Zählt Fähigkeitsstufen und Boni, damit eine Aufwertung sichtbar wird. */
function upgradeScore(world) {
  return world.hero.abilities.reduce((s, a) => s + a.level, 0) + Object.values(world.run.bonuses).reduce((s, n) => s + n, 0);
}

test('chests: Aufwertungskiste erhöht eine Fähigkeit oder einen Bonus, run.level bleibt', () => {
  const chest = findChest((c) => c.kind === 'upgrade');
  const run = runOn(chest);
  const before = upgradeScore(run.world);
  stepRun(run, 0.05, NONE);
  assertEqual(upgradeScore(run.world), before + 1);
  assertEqual(run.world.run.level, 1);
  const ev = mapChestEvents(run)[0];
  assertEqual(ev.kind, 'upgrade');
  assertTrue(ev.card && ['newAbility', 'abilityLevel', 'bonus'].includes(ev.card.kind));
  assertEqual([ev.gold, ev.heal], [0, 0]);
  assertEqual(run.state, 'playing');
});

test('chests: Aufwertungskiste bei voll ausgebauten Fähigkeiten und Boni gibt eine Ersatzkarte ohne Fehler', () => {
  const chest = findChest((c) => c.kind === 'upgrade');
  const run = runOn(chest);
  const w = run.world;
  w.hero.abilities = CLASSES[w.hero.classId].abilityPool.slice(0, 5).map((id) => ({ id, level: 5, cooldownLeft: 0 }));
  for (const b of Object.values(BONUSES)) w.run.bonuses[b.id] = b.maxLevel;
  const gold0 = w.run.gold, hp0 = w.hero.hp;
  w.hero.hp = hp0 * 0.5;
  stepRun(run, 0.05, NONE);
  const ev = mapChestEvents(run)[0];
  assertTrue(ev.card.kind === 'gold' || ev.card.kind === 'heal', ev.card.kind);
  assertEqual(w.run.level, 1);
  if (ev.card.kind === 'gold') {
    assertClose(w.run.gold - gold0, FILLER.gold * w.hero.stats.goldGain);
    assertClose(ev.gold, FILLER.gold * w.hero.stats.goldGain);
  } else assertTrue(ev.heal > 0);
});

test('chests: Aufwertung und fälliges Level-up im selben Schritt: Karte angewendet, mapChest vor levelup, drei Karten', () => {
  const chest = findChest((c) => c.kind === 'upgrade');
  const run = runOn(chest);
  run.world.run.xp = xpToNext(1);
  const before = upgradeScore(run.world);
  stepRun(run, 0.05, NONE);
  assertEqual(run.state, 'levelup');
  assertEqual(run.cards.length, 3);
  assertEqual(upgradeScore(run.world), before + 1);
  const types = run.events.map((e) => e.type);
  assertTrue(types.indexOf('mapChest') >= 0 && types.indexOf('levelup') > types.indexOf('mapChest'), types.join(','));
});

test('chests: außerhalb von playing öffnet nichts', () => {
  const chest = findChest((c) => c.kind === 'gold');
  for (const state of ['dying', 'lost', 'won', 'paused', 'levelup']) {
    const run = runOn(chest);
    run.state = state;
    openMapChests(run);
    assertEqual(run.world.openedChests.size, 0, state);
    assertEqual(run.world.run.gold, 0, state);
  }
});

test('chests: nearestUnopenedChest überspringt geöffnete und liefert null außerhalb der Reichweite', () => {
  const chest = findChest(() => true);
  const run = runOn(chest);
  const w = run.world;
  assertEqual(nearestUnopenedChest(w, 5).id, chest.id);
  w.openedChests.add(chest.id);
  const next = nearestUnopenedChest(w, 5);
  assertTrue(next === null || next.id !== chest.id);
  const nextWide = nearestUnopenedChest(w, 60);
  assertTrue(nextWide === null || (nextWide.id !== chest.id && !w.openedChests.has(nextWide.id)));
  w.hero.x = 0; w.hero.z = 0;
  assertEqual(nearestUnopenedChest(w, 5), null);
});

test('chests: Erfolg-Zähler run.facts.chestsOpened zählt jede geöffnete Kiste', () => {
  const chests = chestsInGrid(SEED, 40, 40).filter((c) => c.kind === 'gold').slice(0, 3);
  const run = runOn(chests[0]);
  assertEqual(run.facts.chestsOpened, 0);
  for (const c of chests) {
    run.world.hero.x = c.x; run.world.hero.z = c.z;
    stepRun(run, 0.05, NONE);
  }
  assertEqual(run.facts.chestsOpened, 3);
});

// ------------------------------------------------------------------ Pfeil

const VIEW = { halfW: 20, halfH: 12, width: 800, height: 600, margin: 28 };

test('chestHint: Kiste im Bild gibt null', () => {
  assertEqual(hintArrow({ x: 0, z: 0 }, { x: 5, z: 3 }, VIEW), null);
  assertEqual(hintArrow({ x: 10, z: 10 }, { x: 10, z: 10 }, VIEW), null);
});

test('chestHint: Kiste weit rechts gibt einen Punkt am rechten Rand mit Winkel 0, weit unten π/2', () => {
  const r = hintArrow({ x: 0, z: 0 }, { x: 200, z: 0 }, VIEW);
  assertClose(r.x, VIEW.width - VIEW.margin);
  assertClose(r.y, VIEW.height / 2);
  assertClose(r.angle, 0);
  const d = hintArrow({ x: 0, z: 0 }, { x: 0, z: 200 }, VIEW);
  assertClose(d.angle, Math.PI / 2);
  assertClose(d.y, VIEW.height - VIEW.margin);
  const u = hintArrow({ x: 0, z: 0 }, { x: 0, z: -200 }, VIEW);
  assertClose(u.angle, -Math.PI / 2);
  const l = hintArrow({ x: 0, z: 0 }, { x: -200, z: 0 }, VIEW);
  assertClose(Math.abs(l.angle), Math.PI);
});

test('chestHint: alle Punkte liegen im Bild, auch rund um den Helden und mit eigenen Rändern oben und unten', () => {
  const v = { ...VIEW, marginTop: 120, marginBottom: 60 };
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    for (const view of [VIEW, v]) {
      const r = hintArrow({ x: 3, z: -4 }, { x: 3 + Math.cos(a) * 90, z: -4 + Math.sin(a) * 90 }, view);
      assertTrue(r !== null);
      assertTrue(r.x >= view.margin - 1e-9 && r.x <= view.width - view.margin + 1e-9, `x ${r.x}`);
      assertTrue(r.y >= (view.marginTop ?? view.margin) - 1e-9 && r.y <= view.height - (view.marginBottom ?? view.margin) + 1e-9, `y ${r.y}`);
      // der Pfeil zeigt von der Bildmitte zum Punkt
      assertClose(r.angle, Math.atan2(r.y - view.height / 2, r.x - view.width / 2), 1e-9);
    }
  }
  const up = hintArrow({ x: 0, z: 0 }, { x: 0, z: -200 }, v);
  assertClose(up.y, 120);
});

test('chestHint: nach vorn und nach hinten ist unterschiedlich weit zu sehen', () => {
  // Werte der Kamera hochkant (390 × 844, Abstand 23,5): seitlich 4,5 m, zur Bildoberkante
  // (−z, vom Helden weg) 16,7 m, zur Bildunterkante (+z, zur Kamera hin) nur 9,2 m.
  const v = { halfW: 4.5, front: 16.7, back: 9.2, width: 390, height: 844, margin: 28 };
  assertEqual(hintArrow({ x: 0, z: 0 }, { x: 0, z: -12 }, v), null, '12 m nach vorn ist noch im Bild');
  const hinten = hintArrow({ x: 0, z: 0 }, { x: 0, z: 11 }, v);
  assertTrue(hinten !== null && Number.isFinite(hinten.x) && Number.isFinite(hinten.y),
    '11 m nach hinten ist nicht mehr im Bild, da gehört ein Pfeil hin');
  assertClose(hinten.angle, Math.PI / 2);
  assertClose(hinten.y, v.height - v.margin);
  const vorn = hintArrow({ x: 0, z: 0 }, { x: 0, z: -18 }, v);
  assertTrue(vorn !== null && Number.isFinite(vorn.y), '18 m nach vorn ist draußen');
  assertClose(vorn.y, v.margin);
  // Ohne eigene Werte bleibt es bei der symmetrischen Angabe.
  assertEqual(hintArrow({ x: 0, z: 0 }, { x: 0, z: 11 }, { ...v, front: undefined, back: undefined, halfH: 16.7 }), null);
});
