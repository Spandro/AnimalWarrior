/**
 * @typedef {{ id: string, hp: number, speed: number, damage: number, radius: number, xp: number, behavior: string, flying?: boolean }} EnemyDef
 */

/** @type {Record<string, EnemyDef>} */
export const ENEMIES = {
  ratte: { id: 'ratte', hp: 6, speed: 4.2, damage: 4, radius: 0.35, xp: 1, behavior: 'chase' },
  wildschwein: { id: 'wildschwein', hp: 40, speed: 2.4, damage: 10, radius: 0.7, xp: 4, behavior: 'charge' },
  kraehe: { id: 'kraehe', hp: 14, speed: 4.8, damage: 6, radius: 0.4, xp: 3, behavior: 'strafe', flying: true },
  giftkroete: { id: 'giftkroete', hp: 25, speed: 2.6, damage: 8, radius: 0.5, xp: 5, behavior: 'ranged' },
  wolf: { id: 'wolf', hp: 45, speed: 5.4, damage: 12, radius: 0.5, xp: 6, behavior: 'circle' },
  baer: { id: 'baer', hp: 1500, speed: 3.2, damage: 25, radius: 1.4, xp: 100, behavior: 'boss' },
};

export const ELITE = { hpMul: 8, scale: 1.6, xpMul: 10 };

export const DROPS = { goldChance: 0.04, potionChance: 0.005, potionHeal: 0.2, chestGold: 25 };

/** Sekunden zwischen Berührungstreffern desselben Gegners. */
export const CONTACT_INTERVAL = 0.5;

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
