/**
 * @typedef {{ id: string, name: string, hp: number, speed: number, damage: number, radius: number, xp: number, behavior: string,
 *   flying?: boolean, venom?: boolean }} EnemyDef
 *   name: Anzeigename (Bossanzeige); venom: Berührungstreffer vergiftet (siehe VENOM).
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
 * `dpsMul` × Schaden der Otter × `tick` Leben. Ein neuer Biss frischt die Dauer auf, stapelt aber nicht.
 */
export const VENOM = { duration: 4, tick: 0.5, dpsMul: 0.5 };

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
