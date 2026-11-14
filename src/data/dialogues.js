// Gespräche (Spec §10.2). Je Person: Angebot, Erinnerung und Abschluss je Auftrag, Zwischenstand bei Gesprächsschritten
// mitten im Auftrag (`progress`) und Sprüche ohne Auftrag (`idle`). Jeder Satz höchstens 90 Zeichen.

/** Bewohner und Sprecher: Anzeigename und Tier (für das Ersatzporträt). */
export const NPCS = {
  panzerla: { name: 'Oma Panzerla', animal: 'Schildkröte' },
  kruemel: { name: 'Krümel', animal: 'Hamster' },
  grabowski: { name: 'Meister Grabowski', animal: 'Maulwurf' },
  nussa: { name: 'Nussa', animal: 'Eichhörnchen' },
  pieps: { name: 'Pieps', animal: 'Spatz' },
  amsel: { name: 'Tante Amsel', animal: 'Amsel' },
  flossian: { name: 'Flossian der Erste', animal: 'Goldfisch' },
};

/**
 * @typedef {{ offer: Record<string, string[]>, remind: Record<string, string[]>, progress: Record<string, string[]>,
 *   done: Record<string, string[]>, idle: string[] }} Dialogue
 * @type {Record<string, Dialogue>}
 */
export const DIALOGUES = {
  panzerla: {
    offer: {
      nasse_pfoten: ['Ach, da bist du ja. Der Bach steigt, Kindchen. Jeden Tag ein Stück.', 'Am Ufer laufen Fische herum. An Land! Mit Helmen!', 'Scheuch sie weg und sag mir, was da los ist.'],
      bruecke_zu: ['Die Fische haben die Alte Brücke verbarrikadiert.', 'Ihr Anführer heißt Hauptmann Gräte. Er hält sich für sehr wichtig.', 'Zeig ihm, wie wichtig er ist. Also: gar nicht.'],
      flugblaetter: ['Überall liegen Zettel herum. Die Fische verteilen sie.', 'Bring mir ein paar davon. Ich will wissen, wer dahintersteckt.'],
      zwickzwack: ['„Seine Durchlaucht Flossian der Erste“. Ein Goldfisch!', 'Sein General, ein Krebs namens Zwickzwack, sitzt am Quellteich.', 'Dort wird das Wasser umgeleitet. Hör auf damit, äh, hör ihn auf.'],
    },
    remind: {
      nasse_pfoten: ['Die Fische sind am Bachufer. Gleich hinter dem Dorf.'],
      bruecke_zu: ['Hauptmann Gräte wartet an der Alten Brücke. Sei vorsichtig.'],
      flugblaetter: ['Fische und Frösche tragen die Zettel. Nimm sie ihnen ab.'],
      zwickzwack: ['Der Quellteich liegt hinter dem Tiefen Wald.'],
    },
    progress: {},
    done: {
      nasse_pfoten: ['Fische mit Helmen. In meinem Alter sieht man alles.', 'Krümel hat seinen Laden wieder aufgemacht. Schau mal rein.'],
      bruecke_zu: ['Gräte ist besiegt? Du bist ja tüchtiger als dein Ruf.'],
      flugblaetter: ['„Wasser für alle! Besonders für Fische!“ Wer schreibt so was?', 'Hier unten steht ein Name. Und ein Siegel mit einer Krone.'],
      zwickzwack: ['Eine Flaschenpost? Lies vor. Ich habe meine Brille verlegt.', 'Der Bach ist wieder ein Bach. Vorerst. Danke, Kindchen.'],
    },
    idle: ['Früher war hier alles trocken. Und langweilig. Schön war das.', 'Iss was. Du siehst dünn aus. Für ein Tier deiner Art.'],
  },
  kruemel: {
    offer: { hamsterkauf: ['Krebsscheren! Daraus mache ich Nussknacker. Die verkaufen sich wie verrückt.', 'Bring mir acht Stück. Es lohnt sich. Für mich vor allem.'] },
    remind: { hamsterkauf: ['Acht Scheren, nicht sieben. Ich zähle nach.'] },
    progress: {},
    done: { hamsterkauf: ['Wunderbar! Hier, für dich. Nicht weitersagen, wie günstig.'] },
    idle: ['Alles muss raus. Außer mir.', 'Heiltränke! Frisch abgefüllt, kaum benutzt.', 'Meine Backen sind voll. Mein Laden auch.'],
  },
  grabowski: {
    offer: { schmied_ohne_hammer: ['Krebse! Die haben meinen Hammer geklaut. Einfach so.', 'Ihr Lager liegt südlich vom Bachufer. Hol ihn mir zurück.'] },
    remind: { schmied_ohne_hammer: ['Ohne Hammer bin ich nur ein Maulwurf mit Schürze.'] },
    progress: {},
    done: { schmied_ohne_hammer: ['Mein Hammer! Jetzt kann ich wieder arbeiten.', 'Bring mir deine Ausrüstung. Ich mache sie besser. Oder wenigstens schwerer.'] },
    idle: ['Das wird schön. Oder wenigstens schwer.', 'Gutes Werkzeug braucht Gold. Und Geduld. Hauptsächlich Gold.'],
  },
  nussa: {
    offer: { verbuddelt: ['Ich habe meine Nüsse vergraben. Fünf Verstecke. Glaube ich.', 'Und jetzt weiß ich nicht mehr, wo. Hilfst du mir suchen?'] },
    remind: { verbuddelt: ['Die Verstecke sind entlang des Wegs. Und ein paar daneben.'] },
    progress: {},
    done: { verbuddelt: ['Alle fünf! Du hast eine bessere Nase als ich.', 'Hier, das habe ich mal gefunden. Beim Buddeln, natürlich.'] },
    idle: ['Ich buddle, also bin ich.', 'Nüsse sind wie Gold. Nur leckerer.'],
  },
  pieps: {
    offer: { post_amsel: ['Ein Brief für Tante Amsel! Sie wohnt bei der Mühlenwiese.', 'Ich kann nicht hin. Da sind Frösche. Große Frösche.'] },
    remind: { post_amsel: ['Tante Amsel wohnt nördlich der Mühlenwiese.'] },
    progress: {},
    done: { post_amsel: ['Sie hat geantwortet! Und mir Kekse versprochen.', 'Danke! Hier, das wollte ich eh loswerden.'] },
    idle: ['Pieps! Ich meine: Hallo!', 'Ich bin die schnellste Post im Dorf. Die einzige auch.'],
  },
  amsel: {
    offer: {},
    remind: { post_amsel: ['Bring Pieps meine Antwort. Er macht sich sonst Sorgen.'] },
    progress: { post_amsel: ['Ein Brief von meinem Neffen? Wie lieb.', 'Warte, ich schreibe gleich zurück. Bring ihm das.'] },
    done: {},
    idle: ['Hier oben ist es trocken. Noch.', 'Die Frösche singen nachts so falsch.'],
  },
  flossian: {
    offer: {},
    remind: {},
    progress: { zwickzwack: ['„An die Landbewohner! Hier spricht Flossian der Erste!“', '„Ihr habt einen Krebs besiegt. Ich habe tausend Frösche.“', '„Der Sumpf gehört schon mir. Bald gehört mir alles. Blubb.“'] },
    done: {},
    idle: [],
  },
};
