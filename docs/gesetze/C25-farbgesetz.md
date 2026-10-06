# §C25 Farbgesetz

Status- und Wertfarben haben vier feste Rollen:
1. Rangfarbe = „ich"
2. Gold = Titel und heute gehaltene Rekorde
3. Grün/Rot = ausschließlich Richtung
4. Metall = alles Übrige
Der News-Feed setzt daneben eine **leise Navigationsschicht**, keine neue
Wertung: Rubrikgold bleibt Spieler des Tages und Woche vorbehalten; die
Karte des Tages trägt Gold nur als übergeordneten Auswahlschimmer. Kühles
Metall führt durch Ewige Tafel und Bestmarken, Violett durch Insignien und Auszeichnungen,
Grün durch positive Spieltagsdynamik, Bronze durch das direkte Duell und
Rot durch Breaking oder eine negative Richtung. Fun Facts bleiben die
leiseste Kartenform, tragen innerhalb davon aber einen kleinen Farbschnitt:
Blau für Liga/Chronik, Violett für Spieler/Laufbahn/Auszeichnungen, Grün
für Form und Bronze für Duelle.
Diese Farben sitzen nur an Kante, Rubrik, Zeichen und einem schwachen
Schimmer; alle Kartenflächen bleiben dunkel. Zwölf eigene Vollfarben wären
ein Regenbogen, eine einzige Goldfamilie machte dagegen jede zweite Karte
zum vermeintlichen Titel.
Im Rekorde-Reiter heißt das: Können, Aktuelle Form und Bestmarke tragen
Gold, die Fügung Metall [§C35] — sie zeichnet niemanden aus —, die
Schattenseite Rot. Als alle Karten golden waren, sagte Gold dort nichts
mehr. Fünf Kammern tragen deshalb drei Töne und nicht fünf: eine neue Farbe
je Kammer wäre ein Regenbogen, und das Farbgesetz kennt vier Rollen.
Das gilt auch für die **Beinamen-Pille im Profilkopf**: „Der Gestrandete"
kommt aus der Durststrecke und stand golden unter dem Namen wie ein
Titel. Die Ausnahme gab es für die Zelle der Matrix und die Plakette seit
jeher, nur die Pille war nie davon erfasst.
**Was negativ ist, trägt Rot und zählt nicht als Rekord** (`neg`, gesetzt
von `art:'schatten'` oder `negativ:true` im Katalog). „Die bitterste
Pleite" stand im Profil golden zwischen den Titeln und machte aus sechs
Rekorden sieben; sie steht dort jetzt rot, hinten und außerhalb der Zahl,
und `nextRecordFor` schlägt sie niemandem als Ziel vor.
**Gezählt wird sie an keiner Stelle** (`rekordZaehlung`): die Besitzleiste
des Rekorde-Reiters zählte sie mit, Podest und Profil nicht, und damit
standen zwei Zahlen unter demselben Wort — Martins Säule sagte 13, seine
Podestkarte „10 Rek.". Die Regel steht deshalb in der Zählung und nicht
dreimal im Aufruf [§C27]; sichtbar bleibt die Schandtafel in ihrer Kammer.
`tests/blatt` hält Leiste und Podest je Spieler aneinander — eine Summe
stimmt auch dann, wenn zwei Spieler ihre Zahlen tauschen. Die **Kammer**
bleibt davon unberührt — sie steht als `data-kammer` an der Karte, nicht
als Farbklasse, weil eine Fügung rot sein kann und trotzdem eine Fügung
bleibt — und `art` auch, sonst verschöbe sich das Prestige [§C34].
