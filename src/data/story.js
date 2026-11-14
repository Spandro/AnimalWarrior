// Bildergeschichte zum Einstieg und am Ende eines Kapitels (Spec §4.1). `scene`: Bild in szenen.webp (0 Waldweg,
// 1 Steinbrücke, 2 Höhle, 3 Wasserfall, 4 Baum auf der Wiese, 5 Teich).

export const STORY = {
  intro: [
    { scene: 4, lines: ['Bachwinkel. Ein Dorf, in dem nie etwas passiert.', 'Das gefiel allen sehr.'] },
    { scene: 3, lines: ['Bis der Bach anfing zu steigen. Erst nasse Pfoten. Dann nasse Knie.', 'Dann schwamm Krümels Laden davon. Kurz.'] },
    { scene: 5, lines: ['Weit weg, in einem Glas, lachte jemand sehr laut.', 'Er hieß Flossian der Erste. Und er hatte einen Plan.'] },
    { scene: 0, lines: ['Jemand musste nachsehen gehen. Jemand Mutiges.', 'Oder wenigstens jemand, der gerade Zeit hatte.'] },
  ],
  chapterEnd: {
    1: { scene: 1, lines: ['Kapitel 1 geschafft! Der Bach ist wieder ein Bach.', 'Aber im Sumpf quaken die Frösche lauter als sonst …', 'Fortsetzung folgt.'] },
  },
};
