/**
 * @typedef {{ kind: 'niete'|'mult'|'loot', mul: number }} WheelField
 * @typedef {{ name: string, animal: string, lines: Record<string, string[]> }} Host
 */

/** Einsätze, Beute-Schwelle und Preis des Duos. */
export const TAVERN = { stakes: [10, 50, 100, 500], lootMinStake: 100, duoPrice: 20000 };

/** Würfelbecher: Gewinn zahlt `winMul` × Einsatz, Gleichstand `tieMul` × Einsatz (abgerundet). */
export const DICE = { winMul: 2, tieMul: 0.5 };

const N = { kind: 'niete', mul: 0 };
const x = (mul) => ({ kind: 'mult', mul });

/**
 * Glücksrad, 20 Felder: 10 Nieten, 4 × ×1, 3 × ×2, 1 × ×3, 1 × ×5, 1 Beutefeld.
 * Die Nieten wechseln sich mit den übrigen Feldern ab, kein Block.
 * @type {{ fields: WheelField[] }}
 */
export const WHEEL = {
  fields: [
    N, x(1), N, x(2), N, { kind: 'loot', mul: 1 }, N, x(1), N, x(3),
    N, x(1), N, x(2), N, x(5), N, x(1), N, x(2),
  ],
};

/**
 * Höher oder tiefer. `rtp`: Ziel-Auszahlung je Schritt, aus der der Faktor folgt. `potCapMul`: Obergrenze des Topfs
 * als Vielfaches des Einsatzes. `ranks`: 2 bis 10, Bube (11), Dame (12), König (13), Ass (14).
 */
export const HILO = {
  rtp: 0.93,
  maxHits: 5,
  potCapMul: 50,
  jokerChance: 0.02,
  ranks: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  rankLabels: { 11: 'B', 12: 'D', 13: 'K', 14: 'A' },
};

/** Die beiden Wirte mit Sprüchen je Tisch. @type {Record<string, Host>} */
export const HOSTS = {
  affe: {
    name: 'Kasimir',
    animal: 'Affe',
    lines: {
      dice: [
        'Die Würfel sind ehrlich. Der Becher nicht.',
        'Zwei Würfel, null Verantwortung.',
        'Ich zähle nicht mit. Ich weiß es einfach.',
        'Glück ist nur Mathematik mit schlechtem Ruf.',
        'Wirf ruhig. Ich habe Zeit und du hast Gold.',
        'Sechs und sechs? Ich habe nichts gesehen.',
        'Der Becher klappert vor Vorfreude.',
      ],
      hilo: [
        'Höher oder tiefer. Mehr Auswahl hat das Leben selten.',
        'Ich mische nicht. Ich ziehe einfach nach Gefühl.',
        'Gleicher Wert verliert. Das steht klein irgendwo.',
        'Der Joker ist mein Lieblingsgast. Er zahlt nie.',
        'Eine Karte noch? Mutig. Oder müde.',
        'Wer früh auszahlt, schläft ruhig.',
        'Ass hoch? Du bist optimistisch, nicht klug.',
        'Kasimir prüft seine Ärmel. Zur Sicherheit.',
      ],
    },
  },
  elster: {
    name: 'Madame Funkel',
    animal: 'Elster',
    lines: {
      wheel: [
        'Alles, was glänzt, gehört bald mir. Oder dir. Meistens mir.',
        'Das Rad dreht sich. Dein Gold auch, nur andersherum.',
        'Eine Niete ist nur ein Gewinn mit Geduld.',
        'Ich liebe Beute. Sie liegt nur ungern bei dir.',
        'Dreh es, Schätzchen. Es beißt nicht. Meistens.',
        'Das Klackern klingt nach Glück. Bilde dir ruhig etwas ein.',
        'Funkelnde Dinge verschwinden hier gern. Frag nicht.',
      ],
    },
  },
};

/** Welcher Wirt welchen Tisch betreut. */
export const TABLE_HOST = { dice: 'affe', wheel: 'elster', hilo: 'affe' };
