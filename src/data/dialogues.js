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
  quappe: { name: 'Frau Quappe', animal: 'Unke' },
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
      ruf_aus_dem_sumpf: ['Hörst du das Quaken? Das kommt aus dem Sumpf im Westen.', 'Da stimmt was nicht. Frösche quaken nicht im Takt.', 'Geh hin. Frag nach der Unke Quappe. Die weiß immer alles. Leider.'],
    },
    remind: {
      nasse_pfoten: ['Die Fische sind am Bachufer. Gleich hinter dem Dorf.'],
      bruecke_zu: ['Hauptmann Gräte wartet an der Alten Brücke. Sei vorsichtig.'],
      flugblaetter: ['Fische und Frösche tragen die Zettel. Nimm sie ihnen ab.'],
      zwickzwack: ['Der Quellteich liegt hinter dem Tiefen Wald.'],
      ruf_aus_dem_sumpf: ['Hörst du das Quaken? Das kommt aus dem Sumpf im Westen.', 'Frag dort nach der Unke Quappe. Die weiß immer alles. Leider.', 'Der Weg in den Sumpf beginnt am Westrand des Dorfs.'],
    },
    progress: {},
    done: {
      nasse_pfoten: ['Fische mit Helmen. In meinem Alter sieht man alles.', 'Krümel hat seinen Laden wieder aufgemacht. Schau mal rein.'],
      bruecke_zu: ['Gräte ist besiegt? Du bist ja tüchtiger als dein Ruf.'],
      flugblaetter: ['„Wasser für alle! Besonders für Fische!“ Wer schreibt so was?', 'Hier unten steht ein Name. Und ein Siegel mit einer Krone.'],
      zwickzwack: ['Eine Flaschenpost? Lies vor. Ich habe meine Brille verlegt.', 'Der Bach ist wieder ein Bach. Vorerst. Danke, Kindchen.'],
      hecht_haudrauf: ['Ein Hecht mit Narbe? Und du hast ihn besiegt? Donnerwetter.', 'Die Frösche sind wieder Frösche. Gut so. Kronen machen nur Ärger.', 'Ruh dich aus, Kindchen. Flossian gibt bestimmt nicht auf.'],
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
  quappe: {
    offer: {
      froesche_verbuendet: ['Du bist also die Hilfe aus dem Dorf. Hm. Klein, aber gut.', 'Die Frösche wollen einen König. Flossian hat ihnen einen versprochen.', 'Vertreib die Ochsenfrösche und bring mir ihre Einladungen zur Krönung.'],
      hofmarschall: ['Der Hofmarschall Quak plant die Krönung am Froschhof.', 'Er ist dick, laut und hat Kaulquappen als Diener.', 'Stopf ihm das Maul. Bildlich gesprochen.'],
      nebel_im_moor: ['Hinter dem Froschhof liegt das Nebelmoor. Da leuchtet es nachts.', 'Irrlichter. Flossian lockt damit Wanderer in den Schlamm.', 'Fang drei davon ein. Ich will sehen, was da leuchtet.'],
      hecht_haudrauf: ['Die Irrlichter sind Fischschuppen. Von einem Hecht.', 'Hecht Haudrauf. Er wohnt im Hechtloch, ganz am Ende des Sumpfs.', 'Er ist Flossians Statthalter hier. Mach ihm klar, dass er umziehen muss.'],
      egelplage: ['Die Blutegel werden frech. Sie saugen sogar an meinen Seerosen.', 'Vertreib acht von ihnen. Pass auf, die bremsen dich aus.'],
      seerosen: ['Meine Seerosen sind über den ganzen Sumpf verstreut.', 'Pflückst du mir vier? Eine am Teich, die anderen findest du schon.'],
      libellenflug: ['Die Libellen fliegen Spähdienste für den Hecht.', 'Verscheuch zehn. Die sind schnell, aber nicht klug.'],
    },
    remind: {
      froesche_verbuendet: ['Ochsenfrösche gibt es überall im Schilf. Sie tragen die Einladungen.'],
      hofmarschall: ['Der Froschhof liegt östlich vom Schilf. Folg dem Quaken.'],
      nebel_im_moor: ['Die Irrlichter schweben im Nebelmoor und im Moorwald.'],
      hecht_haudrauf: ['Das Hechtloch liegt ganz im Osten. Vorsicht vor den Blasen.'],
      egelplage: ['Egel sitzen im Schlamm. Wo sonst.'],
      seerosen: ['Eine Seerose blüht hier am Teich. Die anderen weiter weg.'],
      libellenflug: ['Libellen sieht man über dem Schlamm. Und hört man auch.'],
    },
    progress: {},
    done: {
      ruf_aus_dem_sumpf: ['Panzerla schickt dich? Die alte Schildkröte lebt also noch.', 'Gut. Ich kann Hilfe brauchen. Hör zu.'],
      froesche_verbuendet: ['„Krönung von Flossian dem Ersten, König der Frösche.“ Pah!', 'Ein Goldfisch als Froschkönig. So weit kommt es noch.'],
      hofmarschall: ['Quak ist besiegt? Dann ist die Krönung abgesagt. Hervorragend.', 'Die Sperre hinter dem Froschhof ist offen. Weiter geht es ins Moor.'],
      nebel_im_moor: ['Fischschuppen! Glänzend und eitel. Das riecht nach Hecht.'],
      egelplage: ['Weniger Egel, mehr Seerosen. So mag ich meinen Sumpf.', 'Hier, die habe ich mal einer Libelle abgenommen. Steht dir.'],
      seerosen: ['Wie schön. Fast so schön wie ich.', 'Nimm diese Schleuder. Die hat mal ein Frosch verloren. Beim Angeben.'],
      libellenflug: ['Der Hecht ist jetzt blind und taub. Na ja, fast.'],
    },
    idle: ['Unken unken. Das ist unser Recht.', 'Schlamm ist gut für die Haut. Bremst aber.', 'Wenn es blubbert, geh zur Seite. Glaub mir.', 'Ich bin nicht schlecht gelaunt. Ich gucke immer so.'],
  },
  flossian: {
    offer: {},
    remind: {},
    progress: { zwickzwack: ['„An die Landbewohner! Hier spricht Flossian der Erste!“', '„Ihr habt einen Krebs besiegt. Ich habe tausend Frösche.“', '„Der Sumpf gehört schon mir. Bald gehört mir alles. Blubb.“'] },
    done: {},
    idle: [],
  },
};

/** Omas Sätze beim Umlernen (Etappe 2): Angebot (mit Name der Unterklasse und Preis), danach. */
export const RESPEC_LINES = {
  offer: (subclass, price) => `„Du willst etwas anderes lernen als ${subclass}? Das kostet dich ${price} Gold, Kind.“`,
  done: '„Du hast alles neu gelernt. Jetzt wähle mit Bedacht, Kind.“ Die neue Unterklasse wählst du unter Pause → Fähigkeiten.',
  broke: 'Dafür reicht dein Gold noch nicht.',
};
