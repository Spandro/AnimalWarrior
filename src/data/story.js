// Bildergeschichte zum Einstieg, zu Beginn eines Kapitels ab 2 (`chapterStart`, Etappe 3) und am Ende eines Kapitels (Spec §4.1). `scene`: Bild in szenen.webp (0 Waldweg,
// 1 Steinbrücke, 2 Höhle, 3 Wasserfall, 4 Baum auf der Wiese, 5 Teich).

export const STORY = {
  intro: [
    { scene: 4, lines: ['Bachwinkel. Ein Dorf, in dem nie etwas passiert.', 'Das gefiel allen sehr.'] },
    { scene: 3, lines: ['Bis der Bach anfing zu steigen. Erst nasse Pfoten. Dann nasse Knie.', 'Dann schwamm Krümels Laden davon. Kurz.'] },
    { scene: 5, lines: ['Weit weg, in einem Glas, lachte jemand sehr laut.', 'Er hieß Flossian der Erste. Und er hatte einen Plan.'] },
    { scene: 0, lines: ['Jemand musste nachsehen gehen. Jemand Mutiges.', 'Oder wenigstens jemand, der gerade Zeit hatte.'] },
  ],
  chapterStart: {
    2: [
      { scene: 5, lines: ['Der Sumpf. Nebel, Schilf und Schlamm bis zu den Knien.', 'Und überall dieses Quaken.'] },
      { scene: 4, lines: ['Flossian hat den Fröschen ein Königreich versprochen.', 'Mit Krone. Und einem Thron aus Seerosen.'] },
      { scene: 0, lines: ['Nur eine macht nicht mit: die Unke Frau Quappe.', 'Sie wartet am Unkenteich. Und sie ist schlecht gelaunt.'] },
    ],
  },
  chapterEnd: {
    1: { scene: 1, lines: ['Kapitel 1 geschafft! Der Bach ist wieder ein Bach.', 'Aber im Sumpf quaken die Frösche lauter als sonst …', 'Der Weg in den Sumpf beginnt am Westrand von Bachwinkel.'] },
    2: { scene: 5, lines: ['Kapitel 2 geschafft! Im Sumpf quakt es wieder normal.', 'Doch flussaufwärts nagen die Biber an einem riesigen Damm …', 'Fortsetzung folgt.'] },
  },
};
