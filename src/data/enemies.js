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
