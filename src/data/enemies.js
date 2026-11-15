/**
 * @typedef {{ id: string, name: string, hp: number, speed: number, damage: number, radius: number, xp: number, behavior: string,
 *   flying?: boolean, venom?: boolean, armor?: number, pounceMul?: number, adventureOnly?: boolean, mudproof?: boolean,
 *   pounceRange?: number, leech?: { slow: number, seconds: number, healPct: number } }} EnemyDef
 *   name: Anzeigename (Bossanzeige); venom: Berührungstreffer vergiftet (siehe VENOM); armor: zieht flach von jedem
 *   Treffer ab (mindestens 1 Schaden bleibt); pounceMul: Sprungschaden statt POUNCE.damageMul.
 *   adventureOnly: nur im Abenteuer (nicht in `unlockMinute`, `weights` und `BOSS_POOL`).
 *   mudproof: Schlamm bremst ihn nicht (Gelände, Kapitel 2). pounceRange: Sprungweite statt POUNCE.engageRange.
 *   leech: ein durchgekommener Berührungstreffer bremst den Helden `seconds` s um den Anteil `slow` und heilt den Gegner
 *   um `healPct` seines höchsten Lebens (Blutegel).
 */

/** @type {Record<string, EnemyDef>} */
export const ENEMIES = {
  ratte: { id: 'ratte', name: 'Ratte', hp: 6, speed: 4.2, damage: 4, radius: 0.35, xp: 1, behavior: 'chase' },
  wildschwein: { id: 'wildschwein', name: 'Wildschwein', hp: 40, speed: 2.4, damage: 10, radius: 0.7, xp: 4, behavior: 'charge' },
  kraehe: { id: 'kraehe', name: 'Krähe', hp: 14, speed: 4.8, damage: 6, radius: 0.4, xp: 3, behavior: 'strafe', flying: true },
  giftkroete: { id: 'giftkroete', name: 'Giftkröte', hp: 25, speed: 2.6, damage: 8, radius: 0.5, xp: 5, behavior: 'ranged' },
  wolf: { id: 'wolf', name: 'Wolf', hp: 45, speed: 5.4, damage: 12, radius: 0.5, xp: 6, behavior: 'circle' },
  fuchs: { id: 'fuchs', name: 'Fuchs', hp: 10, speed: 5.6, damage: 5, radius: 0.4, xp: 2, behavior: 'strafe' },
  igel: { id: 'igel', name: 'Igel', hp: 20, speed: 2.0, damage: 7, radius: 0.4, xp: 3, behavior: 'curl' },
  dachs: { id: 'dachs', name: 'Dachs', hp: 70, speed: 2.2, damage: 10, radius: 0.55, xp: 5, behavior: 'chase' },
  kreuzotter: { id: 'kreuzotter', name: 'Kreuzotter', hp: 18, speed: 3.4, damage: 6, radius: 0.4, xp: 4, behavior: 'slither', venom: true },
  uhu: { id: 'uhu', name: 'Uhu', hp: 35, speed: 4.0, damage: 10, radius: 0.5, xp: 6, behavior: 'charge', flying: true },
  luchs: { id: 'luchs', name: 'Luchs', hp: 40, speed: 4.4, damage: 14, radius: 0.5, xp: 7, behavior: 'pounce' },
  baer: { id: 'baer', name: 'Bär', hp: 1500, speed: 3.2, damage: 25, radius: 1.4, xp: 100, behavior: 'boss' },
  keiler: { id: 'keiler', name: 'Riesenkeiler', hp: 1500, speed: 3.6, damage: 25, radius: 1.3, xp: 100, behavior: 'boss' },
  hirsch: { id: 'hirsch', name: 'Rothirsch', hp: 1500, speed: 3.3, damage: 25, radius: 1.3, xp: 100, behavior: 'boss' },
  wisent: { id: 'wisent', name: 'Wisent', hp: 1500, speed: 2.8, damage: 25, radius: 1.6, xp: 100, behavior: 'boss' },
  helmfisch: { id: 'helmfisch', adventureOnly: true, name: 'Helmfisch', hp: 12, speed: 3.6, damage: 5, radius: 0.4, xp: 2, behavior: 'chase' },
  krebs: { id: 'krebs', adventureOnly: true, name: 'Krebs', hp: 26, speed: 2.4, damage: 7, radius: 0.5, xp: 4, behavior: 'strafe', armor: 2 },
  frosch: { id: 'frosch', adventureOnly: true, name: 'Frosch', hp: 18, speed: 3.8, damage: 6, radius: 0.45, xp: 3, behavior: 'pounce', pounceMul: 0.8 },
  ochsenfrosch: { id: 'ochsenfrosch', adventureOnly: true, name: 'Ochsenfrosch', hp: 36, speed: 3.4, damage: 8, radius: 0.6, xp: 5, behavior: 'pounce', pounceMul: 1, pounceRange: 11 },
  libelle: { id: 'libelle', adventureOnly: true, name: 'Libelle', hp: 14, speed: 5.2, damage: 6, radius: 0.4, xp: 4, behavior: 'circle', flying: true },
  blutegel: { id: 'blutegel', adventureOnly: true, name: 'Blutegel', hp: 30, speed: 1.8, damage: 6, radius: 0.4, xp: 4, behavior: 'chase', leech: { slow: 0.4, seconds: 1.5, healPct: 0.1 } },
  kaulquappe: { id: 'kaulquappe', adventureOnly: true, name: 'Kaulquappe', hp: 6, speed: 3.6, damage: 3, radius: 0.3, xp: 1, behavior: 'chase' },
  hofmarschall_quak: { id: 'hofmarschall_quak', adventureOnly: true, name: 'Hofmarschall Quak', hp: 800, speed: 3.0, damage: 15, radius: 1.3, xp: 220, behavior: 'boss' },
  hecht_haudrauf: { id: 'hecht_haudrauf', adventureOnly: true, name: 'Hecht Haudrauf', hp: 1200, speed: 3.2, damage: 18, radius: 1.5, xp: 400, behavior: 'boss', mudproof: true },
  hauptmann_graete: { id: 'hauptmann_graete', adventureOnly: true, name: 'Hauptmann Gräte', hp: 600, speed: 3.4, damage: 14, radius: 1.1, xp: 150, behavior: 'boss' },
  kommandant_zwickzwack: { id: 'kommandant_zwickzwack', adventureOnly: true, name: 'Kommandant Zwickzwack', hp: 900, speed: 2.6, damage: 18, radius: 1.5, xp: 300, behavior: 'boss', armor: 3 },
};

export const ELITE = { hpMul: 8, scale: 1.6, xpMul: 10 };

export const DROPS = { goldChance: 0.04, potionChance: 0.005, potionHeal: 0.2, chestGold: 25 };

/** Sekunden zwischen Berührungstreffern desselben Gegners. */
export const CONTACT_INTERVAL = 0.5;
/** Spielraum beim Berührungstest: Gegner stehen nach dem Hinausschieben genau am Heldenrand. */
export const CONTACT_TOLERANCE = 0.05;

export const HERO_RADIUS = 0.5;
/** Zellgröße des Rasters für Gegnertrennung. */
export const SEPARATION_CELL = 2;
/** Obergrenze gleichzeitiger Gegner. */
export const MAX_ENEMIES = 300;

/** Sekunden, nach denen ein verwirrter Gegner eine neue Zufallsrichtung würfelt. */
export const CONFUSE_REROLL = 1;
/** Anteil der Verlangsamung, der bei Bossen wirkt. */
export const BOSS_SLOW_FACTOR = 0.5;
/** Größte Teilstrecke beim Rückstoß (für die Hinderniskollision). */
export const KNOCKBACK_SUBSTEP = 0.5;

/**
 * Wildschwein: läuft normal; alle `interval` s steht es `windup` s still und rennt dann
 * `duration` s mit `speedMul`-fachem Tempo geradeaus.
 */
export const CHARGE = { interval: 4, windup: 0.6, duration: 1, speedMul: 3 };

/** Krähe: nähert sich mit seitlichem Versatz (Anteil `lateral` je Vorwärtseinheit), Seitenwechsel alle `switchInterval` s. */
export const STRAFE = { lateral: 0.6, switchInterval: 1.5 };

/** Kreuzotter: wie STRAFE, aber enger gewunden. */
export const SLITHER = { lateral: 0.8, switchInterval: 0.6 };

/**
 * Gift der Kreuzotter: ein durchgekommener Biss vergiftet `duration` s; alle `tick` s verliert der Held
 * `dpsMul` × Schaden der Otter × `tick` Leben (gerundet wie jeder Treffer, daher ganze Sekunden: 3 je Tick bei
 * Schaden 6). Ein neuer Biss frischt die Dauer auf, stapelt aber nicht.
 */
export const VENOM = { duration: 4, tick: 1, dpsMul: 0.5 };

/**
 * Igel: nimmt er Schaden, rollt er sich `duration` s ein, nimmt dann nur `damageTaken` des Schadens und rollt mit
 * `speedMul`-fachem Tempo; danach `cooldown` s, in denen er sich nicht erneut einrollt.
 */
export const CURL = { duration: 2.5, damageTaken: 0.2, speedMul: 3, cooldown: 1.5 };

/**
 * Luchs: verfolgt, bis der Held höchstens `engageRange` entfernt ist; duckt sich dann `crouch` s (Bodenkreis mit
 * `radius` an der Heldenposition) und springt in `leapTime` s dorthin. Trifft bei der Landung mit `damageMul`,
 * wenn der Held im Kreis steht; danach `cooldown` s normales Verfolgen.
 */
export const POUNCE = { engageRange: 8, crouch: 0.8, leapTime: 0.5, radius: 1.2, cooldown: 3, damageMul: 1 };

/**
 * Giftkröte: hält `minRange`–`maxRange` Abstand und schießt alle `fireInterval` s, wenn der Held
 * höchstens `fireRange` entfernt ist. Geschoss: Tempo `projectileSpeed`, verschwindet nach `projectileLife` s.
 */
export const RANGED = {
  minRange: 7, maxRange: 9, fireRange: 12, fireInterval: 2.5,
  projectileSpeed: 8, projectileLife: 3, projectileRadius: 0.3,
};

/**
 * Wolf: verfolgt bis `engageRange`, umkreist dann in `radius` Abstand und stößt alle `lungeInterval` s
 * für `lungeDuration` s mit `lungeSpeedMul`-fachem Tempo geradeaus vor.
 */
export const CIRCLE = { radius: 5, engageRange: 7, lungeInterval: 3, lungeDuration: 0.5, lungeSpeedMul: 2.5 };

/**
 * Bär (Boss): verfolgt `chaseTime` s, dann ein Angriff. Steht der Held höchstens `swipe.triggerRange` jenseits
 * des Bärenrands, folgt der Prankenhieb (Bogen mit Reichweite `swipe.reach` ab dem Bärenrand, halber
 * Öffnungswinkel `swipe.halfAngle`), sonst der Sprung (Zielkreis `leap.radius` an der Heldenposition).
 * Schaden tritt nach `windup` s ein, wenn der Held dann in der Form steht; danach `recover` s Pause.
 */
export const BOSS = {
  chaseTime: 3,
  recover: 0.5,
  swipe: { reach: 3, halfAngle: Math.PI / 3, windup: 0.7, damageMul: 1, triggerRange: 4 },
  leap: { radius: 3.5, windup: 1.2, damageMul: 2 },
};

/**
 * Angriffe der Bosse (Baukasten). Ablauf für alle: `chaseTime` s verfolgen; steht der Held höchstens `triggerRange`
 * jenseits des Boss-Rands, kommt `near`, sonst `far`; nach der Ankündigung (`windup`) wirkt der Angriff, dann
 * `recover` s Pause. Formen:
 * - `swipe`: Bogen vor dem Boss, Reichweite `reach` ab seinem Rand, halber Öffnungswinkel `halfAngle`
 * - `leap`: Kreis mit `radius` an der Heldenposition; der Boss landet dort
 * - `ring`: Kreis um den Boss (Radius = Boss-Radius + `reach`); ein Treffer stößt den Helden `push` weit weg
 * - `dash`: Streifen (`length` × `width`) ab dem Boss Richtung Held; der Boss rennt ihn in `dashTime` s ab und trifft
 *   höchstens einmal je Ansturm; `count` Anstürme, dazwischen `gap` s, jeder neu ausgerichtet und angekündigt
 * - `bubbles`: `count` Moorblasen (Kreise mit `radius`), die erste am Helden, die übrigen im Umkreis `spread` um ihn;
 *   nach `windup` trifft es den Helden, wenn er in einem der Kreise steht (Hecht Haudrauf)
 * Schaden: Bossschaden × `damageMul`.
 * @typedef {{ kind: 'swipe', reach: number, halfAngle: number, windup: number, damageMul: number }
 *   | { kind: 'leap', radius: number, windup: number, damageMul: number }
 *   | { kind: 'ring', reach: number, windup: number, damageMul: number, push: number }
 *   | { kind: 'dash', length: number, width: number, windup: number, dashTime: number, damageMul: number,
 *       count: number, gap: number }
 *   | { kind: 'bubbles', count: number, spread: number, radius: number, windup: number, damageMul: number }} BossAttack
 * @typedef {{ chaseTime: number, recover: number, triggerRange: number, near: BossAttack, far: BossAttack,
 *   summon?: { every: number, type: string, count: number, radius: number } }} BossMoves
 *   `summon` (nur Abenteuer): alle `every` s erscheinen `count` Gegner `type` im Abstand `radius` um den Boss,
 *   unabhängig vom Angriffsablauf (Ereignis `bossSummon` mit ihren `ids`).
 * @type {Record<string, BossMoves>}
 */
export const BOSS_MOVES = {
  baer: {
    chaseTime: BOSS.chaseTime, recover: BOSS.recover, triggerRange: BOSS.swipe.triggerRange,
    near: { kind: 'swipe', ...BOSS.swipe },
    far: { kind: 'leap', ...BOSS.leap },
  },
  keiler: {
    chaseTime: 2.5, recover: 0.5, triggerRange: 3.5,
    near: { kind: 'swipe', reach: 2.5, halfAngle: Math.PI / 4, windup: 0.5, damageMul: 1 },
    far: { kind: 'dash', length: 14, width: 2.6, windup: 0.7, dashTime: 0.6, damageMul: 1.2, count: 3, gap: 0.4 },
  },
  hirsch: {
    chaseTime: 3, recover: 0.6, triggerRange: 4,
    near: { kind: 'ring', reach: 4, windup: 0.9, damageMul: 1, push: 4 },
    far: { kind: 'dash', length: 18, width: 2.6, windup: 1.0, dashTime: 0.8, damageMul: 1.6, count: 1, gap: 0 },
  },
  wisent: {
    chaseTime: 3.5, recover: 0.8, triggerRange: 4.5,
    near: { kind: 'ring', reach: 5.5, windup: 1.1, damageMul: 1.8, push: 0 },
    far: { kind: 'dash', length: 28, width: 3.2, windup: 1.3, dashTime: 1.2, damageMul: 2, count: 1, gap: 0 },
  },
  hauptmann_graete: {
    chaseTime: 2.5, recover: 0.7, triggerRange: 3.5,
    near: { kind: 'swipe', reach: 2.8, halfAngle: Math.PI / 3, windup: 0.7, damageMul: 1 },
    far: { kind: 'dash', length: 16, width: 2.4, windup: 0.9, dashTime: 0.7, damageMul: 1.3, count: 2, gap: 0.5 },
  },
  kommandant_zwickzwack: {
    chaseTime: 3, recover: 0.8, triggerRange: 4,
    near: { kind: 'swipe', reach: 3.2, halfAngle: Math.PI / 2.5, windup: 0.8, damageMul: 1.2 },
    far: { kind: 'ring', reach: 7, windup: 1.2, damageMul: 1, push: 3 },
    summon: { every: 25, type: 'krebs', count: 3, radius: 3 },
  },
  hofmarschall_quak: {
    chaseTime: 2.5, recover: 0.7, triggerRange: 3.5,
    near: { kind: 'leap', radius: 3, windup: 0.9, damageMul: 1.2 },
    far: { kind: 'leap', radius: 3.5, windup: 1.2, damageMul: 1.6 },
    summon: { every: 20, type: 'kaulquappe', count: 4, radius: 3 },
  },
  hecht_haudrauf: {
    chaseTime: 2.5, recover: 0.8, triggerRange: 4,
    near: { kind: 'dash', length: 14, width: 2.6, windup: 0.8, dashTime: 0.6, damageMul: 1.3, count: 2, gap: 0.5 },
    far: { kind: 'bubbles', count: 4, spread: 5, radius: 1.8, windup: 1.2, damageMul: 1.2 },
  },
};
