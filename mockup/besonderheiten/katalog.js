'use strict';
// Statischer Abgleich des Quellkatalogs vom 04.10.2026. Keine App oder Datenbank wird geladen.
window.BESONDERHEITEN_KATALOG = [
  {
    "id": "best_record",
    "name": "Der Maßstab",
    "allzeit": {
      "kammer": "mark",
      "cond": "Höchste Siegquote in einem einzelnen Monat, ab 15 Partien in diesem Monat"
    }
  },
  {
    "id": "daylord",
    "name": "Der Platzhirsch",
    "allzeit": {
      "kammer": "mark",
      "cond": "Höchster Anteil eigener Spieltage als Player of the Day, ab 12 Spieltagen"
    }
  },
  {
    "id": "weeklord",
    "name": "Der Wochenherr",
    "allzeit": {
      "kammer": "mark",
      "cond": "Höchster Anteil eigener Wochen als Player of the Week, ab 10 Wochen"
    }
  },
  {
    "id": "spotless",
    "name": "Der makellose Tag",
    "monat": {
      "art": "koennen",
      "cond": "Mindestens 20 % der eigenen Spieltage ohne eine einzige Niederlage, ab 3 Spieltagen mit je 3 Partien"
    },
    "allzeit": {
      "kammer": "koennen",
      "cond": "Höchster Anteil voller Spieltage ohne Niederlage, ab 8 vollen Spieltagen"
    }
  },
  {
    "id": "kopfhoch",
    "name": "Der Tagesabschluss",
    "monat": {
      "art": "konstanz",
      "cond": "An jedem eigenen Spieltag eine ausgeglichene oder positive Bilanz, ab 3 Spieltagen"
    },
    "allzeit": {
      "kammer": "koennen",
      "cond": "Höchster Anteil eigener Spieltage ohne negative Bilanz, ab 15 eigenen Spieltagen"
    }
  },
  {
    "id": "catalyst",
    "name": "Der Katalysator",
    "allzeit": {
      "kammer": "koennen",
      "cond": "Größter positiver Einfluss auf die eigenen Partner, ab 3 Partnern mit je 15 gemeinsamen Partien"
    }
  },
  {
    "id": "ausgleich",
    "name": "Der Ausgleicher",
    "monat": {
      "art": "koennen",
      "cond": "Neben JEDEM Partner mindestens 60 %, ab 3 Partnern mit je 5 Partien"
    },
    "allzeit": {
      "kammer": "koennen",
      "cond": "Beste Siegquote neben dem eigenen schwierigsten Partner, ab 3 Partnern mit je 15 gemeinsamen Partien"
    }
  },
  {
    "id": "clutch",
    "name": "Die ruhige Hand",
    "allzeit": {
      "kammer": "koennen",
      "cond": "Größter Leistungssprung in engen Partien, ab 15 engen Partien"
    }
  },
  {
    "id": "entscheider",
    "name": "Der Entscheider",
    "allzeit": {
      "kammer": "koennen",
      "cond": "Höchste Siegquote in engen Partien, ab 15 engen Partien"
    }
  },
  {
    "id": "gleichauf",
    "name": "Auf Augenhöhe",
    "monat": {
      "art": "koennen",
      "cond": "In offenen Partien mindestens 20 Prozentpunkte stärker als sonst, ab 5 offenen Partien"
    },
    "allzeit": {
      "kammer": "koennen",
      "cond": "Größter Leistungssprung in ausgeglichen erwarteten Partien, ab 20 solchen Partien"
    }
  },
  {
    "id": "gegenwind",
    "name": "Gegen den Wind",
    "allzeit": {
      "kammer": "koennen",
      "cond": "Beste Siegquote als Außenseiter, ab 20 Partien als Außenseiter"
    }
  },
  {
    "id": "destroyer",
    "name": "Der Zerstörer",
    "allzeit": {
      "kammer": "koennen",
      "cond": "Höchster Anteil Kantersiege an allen eigenen Siegen, ab 20 Siegen"
    }
  },
  {
    "id": "breitenwirkung",
    "name": "Kein Angstgegner",
    "monat": {
      "art": "koennen",
      "cond": "Gegen JEDEN regelmäßigen Gegner mehr Siege als Niederlagen, ab 4 solchen Gegnern"
    },
    "allzeit": {
      "kammer": "koennen",
      "cond": "Höchste Siegquote gegen den schwächsten eigenen Gegner, ab 4 Gegnern mit je 6 Duellen"
    }
  },
  {
    "id": "retourkutsche",
    "name": "Die Retourkutsche",
    "allzeit": {
      "kammer": "koennen",
      "cond": "Höchste Siegquote beim nächsten Wiedersehen nach einer Pleite, ab 10 Wiedersehen"
    }
  },
  {
    "id": "deutlich",
    "name": "Der Deutliche",
    "monat": {
      "art": "koennen",
      "cond": "Mindestens 2 Tore Differenz je Partie"
    },
    "allzeit": {
      "kammer": "koennen",
      "cond": "Beste durchschnittliche Tordifferenz je Partie, ab 30 Partien"
    }
  },
  {
    "id": "atk_ace",
    "name": "Der komplette Stürmer",
    "allzeit": {
      "kammer": "koennen",
      "cond": "Höchster Gesamtwert im Sturm, ab 25 Sturmspielen"
    }
  },
  {
    "id": "def_ace",
    "name": "Der komplette Verteidiger",
    "allzeit": {
      "kammer": "koennen",
      "cond": "Höchster Gesamtwert in der Abwehr, ab 25 Abwehrspielen"
    }
  },
  {
    "id": "rollencoup",
    "name": "Der Rollencoup",
    "allzeit": {
      "kammer": "koennen",
      "cond": "Größter Vorsprung auf die Erwartung als Außenseiter auf einer Position, ab 20 solchen Partien"
    }
  },
  {
    "id": "rock",
    "name": "Der Fels",
    "allzeit": {
      "kammer": "koennen",
      "cond": "Wenigste Gegentore je Abwehrspiel, ab 20 Abwehrspielen"
    }
  },
  {
    "id": "sniper",
    "name": "Der Torjäger",
    "allzeit": {
      "kammer": "koennen",
      "cond": "Meiste eigene Tore je Sturmspiel, ab 20 Sturmspielen"
    }
  },
  {
    "id": "comeback_king",
    "name": "Der Stehaufmann",
    "allzeit": {
      "kammer": "koennen",
      "cond": "Größter Aufschwung direkt nach einer Niederlage, ab 25 Gelegenheiten"
    }
  },
  {
    "id": "rueckschlag",
    "name": "Der Rückschlag",
    "allzeit": {
      "kammer": "koennen",
      "cond": "Höchste Siegquote nach zwei Niederlagen in Folge, ab 10 Gelegenheiten"
    }
  },
  {
    "id": "damage_control",
    "name": "Der Widerstand",
    "allzeit": {
      "kammer": "koennen",
      "cond": "Niedrigster mittlerer Torrückstand in allen eigenen Niederlagen, ab 20 Niederlagen"
    }
  },
  {
    "id": "metronom",
    "name": "Das Metronom",
    "monat": {
      "art": "konstanz",
      "cond": "Zwischen bestem und schwächstem Spieltag höchstens 15 Prozentpunkte, ab 3 Spieltagen mit je 3 Partien"
    },
    "allzeit": {
      "kammer": "koennen",
      "cond": "Beste Verbindung aus hoher und gleichmäßiger Tagesleistung, ab 12 Spieltagen mit je 3 Partien"
    }
  },
  {
    "id": "lauf",
    "name": "Der Lauf",
    "allzeit": {
      "kammer": "form",
      "cond": "Höchste Siegquote in den letzten 20 Partien, ab 20 Partien"
    }
  },
  {
    "id": "densephase",
    "name": "Die dichte Phase",
    "allzeit": {
      "kammer": "form",
      "cond": "Wenigste Gegentore je Partie in den letzten 30 Partien, ab 30 Partien"
    }
  },
  {
    "id": "torrausch",
    "name": "Der Torrausch",
    "allzeit": {
      "kammer": "form",
      "cond": "Meiste eigene Tore je Partie in den letzten 30 Partien, ab 30 Partien"
    }
  },
  {
    "id": "allrounder",
    "name": "Der Allrounder",
    "allzeit": {
      "kammer": "koennen",
      "cond": "Größter positiver Abstand zur Erwartung auf beiden Positionen, ab 20 Spielen je Position"
    }
  },
  {
    "id": "sovereign",
    "name": "Der Souverän",
    "allzeit": {
      "kammer": "koennen",
      "cond": "Höchste Siegquote als Favorit, ab 20 Partien als Favorit"
    }
  },
  {
    "id": "sturmfuehrer",
    "name": "Der Sturmführer",
    "allzeit": {
      "kammer": "koennen",
      "cond": "Größter Vorsprung der Sturmquote auf die dort erwartete Siegquote, ab 20 Sturmspielen"
    }
  },
  {
    "id": "defchief",
    "name": "Der Abwehrchef",
    "allzeit": {
      "kammer": "koennen",
      "cond": "Größter Vorsprung der Abwehrquote auf die dort erwartete Siegquote, ab 20 Abwehrspielen"
    }
  },
  {
    "id": "laufstopper",
    "name": "Der Laufstopper",
    "allzeit": {
      "kammer": "koennen",
      "cond": "Höchste Siegquote gegen Gegner in laufender Siegesserie, ab 10 Gelegenheiten"
    }
  },
  {
    "id": "uebersoll",
    "name": "Das Übersoll",
    "monat": {
      "art": "koennen",
      "cond": "Mindestens 15 Prozentpunkte über der eigenen Elo-Erwartung"
    },
    "allzeit": {
      "kammer": "koennen",
      "cond": "Größter Vorsprung der Siegquote auf die eigene Elo-Erwartung, ab 40 Partien"
    }
  },
  {
    "id": "steigerung",
    "name": "Die Steigerung",
    "monat": {
      "art": "koennen",
      "cond": "In der zweiten Hälfte des Monats mindestens 25 Prozentpunkte stärker als in der ersten, ab 4 Partien je Hälfte"
    }
  },
  {
    "id": "hochform",
    "name": "Der Höhenflug",
    "monat": {
      "art": "koennen",
      "cond": "In den letzten 10 Partien mindestens 30 Prozentpunkte über der eigenen Quote davor, ab 20 Partien im Monat"
    },
    "allzeit": {
      "kammer": "form",
      "cond": "Größte Verbesserung der letzten 10 Partien gegenüber den 10 davor, ab 20 Partien"
    }
  },
  {
    "id": "kaltstart",
    "name": "Der Kaltstart",
    "monat": {
      "art": "koennen",
      "cond": "Mindestens 85 % der ersten Partien eines Spieltags gewonnen, ab 5 Spieltagen"
    },
    "allzeit": {
      "kammer": "koennen",
      "cond": "Größter Vorsprung im ersten Spiel eines Spieltags, ab 10 Spieltagen mit je 3 Partien"
    }
  },
  {
    "id": "wiedereinstieg",
    "name": "Der Wiedereinstieg",
    "allzeit": {
      "kammer": "koennen",
      "cond": "Höchste Siegquote in der ersten Partie nach 72 Stunden Pause, ab 8 Rückkehrspielen"
    }
  },
  {
    "id": "schlussball",
    "name": "Der letzte Ball",
    "monat": {
      "art": "konstanz",
      "cond": "In der letzten Partie eines Spieltags mindestens 35 Prozentpunkte stärker als in den übrigen, ab 3 Spieltagen mit je 3 Partien"
    },
    "allzeit": {
      "kammer": "koennen",
      "cond": "Größter Vorsprung im letzten Spiel eines Spieltags, ab 10 Spieltagen mit je 3 Partien"
    }
  },
  {
    "id": "unstoppable",
    "name": "Der Unaufhaltsame",
    "allzeit": {
      "kammer": "mark",
      "cond": "Längste Siegesserie der Ligageschichte"
    }
  },
  {
    "id": "unbeugsam",
    "name": "Der Unbeugsame",
    "allzeit": {
      "kammer": "mark",
      "cond": "Kürzeste längste Niederlagenserie einer Laufbahn, ab 50 Partien"
    }
  },
  {
    "id": "peak",
    "name": "Der höchste Gipfel",
    "allzeit": {
      "kammer": "mark",
      "cond": "Höchster Elo-Stand der Ligageschichte"
    }
  },
  {
    "id": "eloday",
    "name": "Der große Sprung",
    "allzeit": {
      "kammer": "mark",
      "cond": "Größter Elo-Gewinn an einem einzigen Spieltag"
    }
  },
  {
    "id": "wall",
    "name": "Die Mauer",
    "allzeit": {
      "kammer": "mark",
      "cond": "Höchster Abwehranteil über die ganze Laufbahn, ab 40 Partien"
    }
  },
  {
    "id": "sturmtreue",
    "name": "Der Sturmtreue",
    "allzeit": {
      "kammer": "mark",
      "cond": "Höchster Sturmanteil über die ganze Laufbahn, ab 40 Partien"
    }
  },
  {
    "id": "switcher",
    "name": "Der Wandler",
    "allzeit": {
      "kammer": "mark",
      "cond": "Ausgeglichenste Verteilung auf Sturm und Abwehr, ab 40 Partien"
    }
  },
  {
    "id": "dauersturm",
    "name": "Der Dauerstürmer",
    "allzeit": {
      "kammer": "form",
      "cond": "Höchster Sturmanteil in den letzten 50 Partien, ab 50 Partien"
    }
  },
  {
    "id": "abwehrmauer",
    "name": "Die Abwehrmauer",
    "allzeit": {
      "kammer": "form",
      "cond": "Höchster Abwehranteil in den letzten 50 Partien, ab 50 Partien"
    }
  },
  {
    "id": "seitenwechsler",
    "name": "Der Seitenwechsler",
    "allzeit": {
      "kammer": "fuegung",
      "cond": "Höchster Anteil an Rollenwechseln zwischen aufeinanderfolgenden Partien, ab 40 Partien"
    }
  },
  {
    "id": "seesaw",
    "name": "Das Wechselbad",
    "allzeit": {
      "kammer": "fuegung",
      "cond": "Längste Folge aus abwechselnd Sieg und Niederlage"
    }
  },
  {
    "id": "hardnight",
    "name": "Der schwerste Tag",
    "allzeit": {
      "kammer": "fuegung",
      "cond": "Niedrigste mittlere Siegchance an einem ganzen Spieltag, ab 4 Partien"
    }
  },
  {
    "id": "bitterloss",
    "name": "Die bitterste Pleite",
    "allzeit": {
      "kammer": "fuegung",
      "cond": "Verlorene Partie mit der höchsten vorherigen Siegchance"
    }
  },
  {
    "id": "mirrorday",
    "name": "Der Wiedergänger",
    "allzeit": {
      "kammer": "fuegung",
      "cond": "Häufigste Wiederholung desselben Ergebnisses an einem Spieltag"
    }
  },
  {
    "id": "needleeye",
    "name": "Das Nadelöhr",
    "allzeit": {
      "kammer": "fuegung",
      "cond": "Höchster Anteil an Partien mit genau einem Tor Unterschied, ab 40 Partien"
    }
  },
  {
    "id": "evenkeel",
    "name": "Die Punktlandung",
    "monat": {
      "art": "konstanz",
      "cond": "Am Monatsende höchstens 2 Tore Differenz, ab 20 Partien"
    },
    "allzeit": {
      "kammer": "fuegung",
      "cond": "Größter Spieltag mit exakt ausgeglichenem Torkonto, ab 4 Partien am Tag"
    }
  },
  {
    "id": "rollercoaster",
    "name": "Die Achterbahn",
    "allzeit": {
      "kammer": "fuegung",
      "cond": "Ein 10:0 und ein 0:10 am selben Spieltag"
    }
  },
  {
    "id": "fluke",
    "name": "Der Sonntagsschuss",
    "allzeit": {
      "kammer": "fuegung",
      "cond": "Gewonnene Partie mit der niedrigsten vorherigen Siegchance"
    }
  },
  {
    "id": "handwriting",
    "name": "Die Handschrift",
    "allzeit": {
      "kammer": "fuegung",
      "cond": "Gleichmäßigste Tordifferenz im Sturm, ab 40 Sturmspielen"
    }
  },
  {
    "id": "bedrock",
    "name": "Das Fundament",
    "allzeit": {
      "kammer": "fuegung",
      "cond": "Gleichmäßigste Tordifferenz in der Abwehr, ab 40 Abwehrspielen"
    }
  },
  {
    "id": "unruffled",
    "name": "Der Unaufgeregte",
    "allzeit": {
      "kammer": "fuegung",
      "cond": "Gleichmäßigste Tordifferenz in ausgeglichen angesetzten Partien, ab 40 solchen Partien"
    }
  },
  {
    "id": "tailwind",
    "name": "Der Rückenwind",
    "allzeit": {
      "kammer": "form",
      "cond": "Größter Anstieg der Mitspielerstärke in den letzten 25 Partien, ab 50 Partien"
    }
  },
  {
    "id": "solorun",
    "name": "Der Einzelkämpfer",
    "allzeit": {
      "kammer": "form",
      "cond": "Größter Rückgang der Mitspielerstärke in den letzten 25 Partien, ab 50 Partien"
    }
  },
  {
    "id": "drought",
    "name": "Die Durststrecke",
    "monat": {
      "art": "schatten",
      "cond": "11 Niederlagen am Stück"
    },
    "allzeit": {
      "kammer": "shame",
      "cond": "Längste Niederlagenserie der Ligageschichte"
    }
  },
  {
    "id": "abyss",
    "name": "Das Fass ohne Boden",
    "monat": {
      "art": "schatten",
      "cond": "Mindestens 15 % der eigenen Pleiten endeten 0:10, ab 5 Pleiten"
    },
    "allzeit": {
      "kammer": "shame",
      "cond": "Höchster Anteil an 0:10-Niederlagen unter allen eigenen Niederlagen, ab 25 Niederlagen"
    }
  },
  {
    "id": "hardluck",
    "name": "Der Pechvogel",
    "monat": {
      "art": "schatten",
      "cond": "Mindestens 35 % der eigenen Pleiten endeten 9:10, ab 5 Pleiten"
    },
    "allzeit": {
      "kammer": "shame",
      "cond": "Höchster Anteil an 9:10-Niederlagen unter allen eigenen Niederlagen, ab 25 Niederlagen"
    }
  },
  {
    "id": "freefall",
    "name": "Der Sturzflug",
    "allzeit": {
      "kammer": "shame",
      "cond": "Größter Elo-Verlust von einem Saisonende zum nächsten, ab 10 Partien in beiden Saisons"
    }
  },
  {
    "id": "sieve",
    "name": "Das Scheunentor",
    "monat": {
      "art": "schatten",
      "cond": "Mindestens 9,5 Gegentore je Abwehrspiel, ab 5 Abwehrspielen"
    },
    "allzeit": {
      "kammer": "shame",
      "cond": "Größter Anstieg der Gegentore in der Abwehr gegenüber dem eigenen Laufbahnschnitt, ab 30 Abwehrspielen"
    }
  },
  {
    "id": "angstgegner",
    "name": "Der Angstgegner",
    "monat": {
      "art": "schatten",
      "cond": "Gegen einen Gegner mit mindestens 8 Duellen keinen einzigen Sieg"
    },
    "allzeit": {
      "kammer": "shame",
      "cond": "Höchster Niederlagenanteil gegen einen einzelnen regelmäßigen Gegner, ab 20 Duellen"
    }
  },
  {
    "id": "untersoll",
    "name": "Das Untersoll",
    "monat": {
      "art": "schatten",
      "cond": "Mindestens 20 Prozentpunkte unter der eigenen Elo-Erwartung"
    },
    "allzeit": {
      "kammer": "shame",
      "cond": "Größter Rückstand der Siegquote auf die eigene Elo-Erwartung, ab 40 Partien"
    }
  },
  {
    "id": "misfire",
    "name": "Die Ladehemmung",
    "monat": {
      "art": "schatten",
      "cond": "Mindestens 1,2 Tore je Sturmspiel unter dem eigenen Mittel, ab 5 Sturmspielen und 8 Partien"
    },
    "allzeit": {
      "kammer": "shame",
      "cond": "Größter Rückgang der eigenen Tore im Sturm gegenüber dem eigenen Laufbahnschnitt, ab 30 Sturmspielen"
    }
  },
  {
    "id": "noanswer",
    "name": "Die stumme Antwort",
    "allzeit": {
      "kammer": "shame",
      "cond": "Größter Einbruch direkt nach einer Niederlage, ab 25 Gelegenheiten"
    }
  },
  {
    "id": "favflop",
    "name": "Der Wackelkandidat",
    "allzeit": {
      "kammer": "shame",
      "cond": "Höchster Niederlagenanteil als Favorit, ab 20 Partien als Favorit"
    }
  },
  {
    "id": "ballast",
    "name": "Der Klotz am Bein",
    "allzeit": {
      "kammer": "shame",
      "cond": "Größter negativer Einfluss auf die eigenen Partner, ab 3 Partnern mit je 15 gemeinsamen Partien"
    }
  },
  {
    "id": "tagesregent",
    "name": "Der Tagesregent",
    "monat": {
      "art": "koennen",
      "cond": "An mindestens 60 % der eigenen Spieltage Player of the Day, ab 4 Spieltagen"
    }
  },
  {
    "id": "thron",
    "name": "Auf dem Thron",
    "monat": {
      "art": "koennen",
      "cond": "An keinem Spieltag des Monats aus den ersten zwei Plätzen der Liga gefallen"
    }
  },
  {
    "id": "angstfrei",
    "name": "Ohne Angstgegner",
    "monat": {
      "art": "koennen",
      "cond": "Gegen JEDEN regelmäßigen Gegner mindestens 75 %, ab 5 Gegnern mit je 4 Duellen"
    }
  },
  {
    "id": "wochenkrone",
    "name": "Die Wochenkrone",
    "monat": {
      "art": "koennen",
      "cond": "In JEDER eigenen Spielwoche Player of the Week, ab 3 Wochen mit je 3 Partien"
    }
  },
  {
    "id": "traumquote",
    "name": "Der Traummonat",
    "monat": {
      "art": "koennen",
      "cond": "Mindestens 85 % Siegquote über den ganzen Monat"
    }
  },
  {
    "id": "nachzuegler",
    "name": "Der Nachzügler",
    "monat": {
      "art": "koennen",
      "cond": "In den letzten 5 Partien des Monats mindestens 3 Siege mehr als in den ersten 5"
    }
  },
  {
    "id": "schattenmann",
    "name": "Der Schattenmann",
    "monat": {
      "art": "koennen",
      "cond": "Ein Partner gewinnt an dieser Seite mindestens 60 Prozentpunkte häufiger als ohne, ab 5 gemeinsamen Partien"
    }
  },
  {
    "id": "zunull",
    "name": "Die weiße Weste",
    "monat": {
      "art": "koennen",
      "cond": "Mindestens 10 % der eigenen Siege mit höchstens einem Gegentor, ab 5 Siegen"
    }
  },
  {
    "id": "bollwerk",
    "name": "Das Bollwerk",
    "monat": {
      "art": "koennen",
      "cond": "Mindestens 1,5 Gegentore je Partie unter dem Schnitt aller Spieler des Monats"
    }
  },
  {
    "id": "ausreisser2",
    "name": "Der Ausreißer",
    "monat": {
      "art": "koennen",
      "cond": "Ein Spieltag, den die Rechnung mit höchstens 3 % erwartet hat, ab 4 Partien am Tag"
    }
  },
  {
    "id": "endspurt",
    "name": "Der Endspurt",
    "monat": {
      "art": "koennen",
      "cond": "Mindestens 75 % der letzten Partien eines Spieltags gewonnen, ab 5 Spieltagen"
    }
  },
  {
    "id": "umschwung",
    "name": "Der Umschwung",
    "monat": {
      "art": "koennen",
      "cond": "Von einem Spieltag zum nächsten mindestens 65 Prozentpunkte besser, ab 4 Partien an beiden Tagen"
    }
  },
  {
    "id": "aufholjagd",
    "name": "Die Antwort",
    "monat": {
      "art": "koennen",
      "cond": "Mindestens 80 % der Partien direkt nach einer Niederlage gewonnen, ab 5 Gelegenheiten"
    }
  },
  {
    "id": "favschreck",
    "name": "Der Favoritenschreck",
    "monat": {
      "art": "koennen",
      "cond": "Mindestens 40 % gegen klare Favoriten, ab 5 solchen Partien"
    }
  },
  {
    "id": "formgipfel",
    "name": "Der Formgipfel",
    "monat": {
      "art": "koennen",
      "cond": "Ein Block aus 5 Partien mindestens 55 Prozentpunkte über dem eigenen Monatsschnitt"
    }
  },
  {
    "id": "unmoeglich",
    "name": "Der Unmögliche Monat",
    "monat": {
      "art": "koennen",
      "cond": "Ein Monat, den die Elo-Rechnung mit höchstens 2 % erwartet hat"
    }
  },
  {
    "id": "schwachstelle",
    "name": "Ohne Schwachstelle",
    "monat": {
      "art": "koennen",
      "cond": "In allen fünf Lagen mindestens 50 %: vorne, hinten, gegen die Stärkeren, in engen Partien und nach einer Niederlage, ab 5 Partien je Lage"
    }
  },
  {
    "id": "schwachewoche",
    "name": "Ohne schwache Woche",
    "monat": {
      "art": "konstanz",
      "cond": "Auch in der schwächsten Kalenderwoche höchstens 2 Prozentpunkte unter der eigenen Monatsquote, ab 3 Wochen mit je 5 Partien"
    }
  },
  {
    "id": "punktgenau2",
    "name": "Der Erwartungstreue",
    "monat": {
      "art": "konstanz",
      "cond": "Die eigene Quote liegt am Monatsende höchstens 0,5 Prozentpunkte neben der Elo-Erwartung"
    }
  },
  {
    "id": "schwaechstertag",
    "name": "Der schwächste Tag",
    "monat": {
      "art": "konstanz",
      "cond": "Auch am schwächsten eigenen Spieltag noch mindestens 60 %, ab 5 Spieltagen mit je 3 Partien"
    }
  },
  {
    "id": "beidseitig",
    "name": "Der Beidfüßige",
    "monat": {
      "art": "konstanz",
      "cond": "Auf beiden Positionen höchstens 1 Prozentpunkt neben der eigenen Gesamtquote, ab 5 Partien je Position"
    }
  },
  {
    "id": "wochwunder",
    "name": "Die Woche gegen die Rechnung",
    "monat": {
      "art": "koennen",
      "cond": "Eine Kalenderwoche, die die Elo-Rechnung mit höchstens 0,5 % erwartet hat, ab 6 Partien in dieser Woche"
    }
  },
  {
    "id": "gleichmut",
    "name": "Der Gleichmut",
    "monat": {
      "art": "konstanz",
      "cond": "Die Tordifferenz jeder Partie bleibt im Schnitt höchstens 3,0 Tore vom eigenen Mittel entfernt"
    }
  },
  {
    "id": "zweiteluft",
    "name": "Die zweite Luft",
    "monat": {
      "art": "koennen",
      "cond": "Ab der vierten Partie eines Spieltags mindestens 40 Prozentpunkte stärker als in den ersten drei, ab 5 Partien in jedem Block"
    }
  },
  {
    "id": "auferstehung",
    "name": "Die Auferstehung",
    "monat": {
      "art": "koennen",
      "cond": "Jede Partie nach zwei Pleiten am Stück gewonnen, ab 5 solchen Gelegenheiten"
    }
  },
  {
    "id": "nulldiaet",
    "name": "Die Nulldiät",
    "monat": {
      "art": "koennen",
      "cond": "Mindestens 20 % der Partien mit höchstens drei Gegentoren"
    }
  },
  {
    "id": "serienbrecher",
    "name": "Der Serienbrecher",
    "monat": {
      "art": "koennen",
      "cond": "Mindestens 70 % gegen Gegner, die zum Zeitpunkt der Partie drei Siege am Stück tragen, ab 5 solchen Partien"
    }
  },
  {
    "id": "wochenschluss",
    "name": "Der Wochenschluss",
    "monat": {
      "art": "koennen",
      "cond": "Jede letzte Partie einer Kalenderwoche gewonnen, ab 4 Wochen mit je 3 Partien"
    }
  },
  {
    "id": "rollenfest",
    "name": "Favorit wie Außenseiter",
    "monat": {
      "art": "konstanz",
      "cond": "Als klarer Favorit und als Außenseiter höchstens 5 Prozentpunkte auseinander, ab 5 Partien in jeder Lage"
    }
  },
  {
    "id": "aufstieg",
    "name": "Der Aufstieg",
    "monat": {
      "art": "koennen",
      "cond": "Im Monat mindestens 8 Plätze in der Liga-Tabelle gewonnen"
    }
  },
  {
    "id": "zitterkoenig",
    "name": "Der Zitterkönig",
    "monat": {
      "art": "fuegung",
      "cond": "JEDER einzelne Sieg des Monats war knapp, ab 6 Siegen"
    }
  },
  {
    "id": "nervenkitzel",
    "name": "Der Nervenkitzel",
    "monat": {
      "art": "fuegung",
      "cond": "Mindestens 35 Prozentpunkte mehr enge Partien als im Ligaschnitt"
    }
  },
  {
    "id": "ausbruch",
    "name": "Der Ausbruch",
    "monat": {
      "art": "fuegung",
      "cond": "Einen Gegner besiegt, gegen den zuvor 17 Duelle in Folge verloren gingen"
    }
  },
  {
    "id": "spezialisiert",
    "name": "Der Spezialist",
    "monat": {
      "art": "fuegung",
      "cond": "Auf einer Position mindestens 50 Prozentpunkte besser als auf der anderen, ab 5 Partien je Position"
    }
  },
  {
    "id": "torhagel",
    "name": "Der Torhagel",
    "monat": {
      "art": "fuegung",
      "cond": "In den eigenen Partien fällt mindestens 1 Tor je Partie mehr als im Ligaschnitt des Monats"
    }
  },
  {
    "id": "lieblingszahl",
    "name": "Die Lieblingszahl",
    "monat": {
      "art": "fuegung",
      "cond": "Ein und dasselbe Ergebnis in mindestens 25 % der eigenen Partien, ab 12 Partien"
    }
  },
  {
    "id": "wechselhaft",
    "name": "Der Wechselhafte",
    "monat": {
      "art": "fuegung",
      "cond": "Die Tagesquoten streuen mindestens 25 Prozentpunkte um die eigene Monatsquote, ab 5 Spieltagen mit je 3 Partien"
    }
  },
  {
    "id": "kontrast",
    "name": "Der Kontrast",
    "monat": {
      "art": "fuegung",
      "cond": "Zwischen bestem und schwächstem Partner mindestens 80 Prozentpunkte, ab 3 Partnern mit je 5 Partien"
    }
  },
  {
    "id": "kaltblut",
    "name": "Das Kaltblut",
    "monat": {
      "art": "fuegung",
      "cond": "Mindestens 80 % der Partien gewonnen, die mit einem Tor Unterschied endeten, ab 5 solchen Partien"
    }
  },
  {
    "id": "randlage",
    "name": "Immer am Rand",
    "monat": {
      "art": "fuegung",
      "cond": "Mindestens 25 % der eigenen Partien endeten mit genau einem Tor Unterschied"
    }
  }
];
