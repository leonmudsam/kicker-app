'use strict';
// Dieselbe Disziplin wie der Partie-Rekord, nur mit der festen Monatsachse.
window.BESONDERHEITEN_UMSCHALT_MONAT = {
  id:'umschaltmoment-monat', disziplinId:'umschaltmoment', bereich:'monate', art:'koennen', kategorie:'Können', titel:'Der Umschaltmoment', beiname:'Der Umsteller', status:'Eine Disziplin, zwei Zeitachsen',
  frage:'Nach eigenen Positionswechseln fällt das Leistungsbild günstiger aus als beim Bleiben – bei unverändertem Partner und getrennt nach der neuen Position.',
  wert:'+15 Punkte', person:'Auch mit schwacher Monatsbilanz · Beispiel', grafik:'erweiterung', bild:{typ:'matrix',zellen:[['Sturm · nach Wechsel','−10 Punkte'],['Sturm · bleiben','−30 Punkte'],['Abwehr · nach Wechsel','−15 Punkte'],['Abwehr · bleiben','−25 Punkte']],hinweis:'Soll-Abweichungen, keine Siegquoten. Sturm +20, Abwehr +10: gleich gewichtet +15 Punkte.'},
  basis:'5 je Zelle, 3 eigene Tage', achse:'Positionswechsel gegen Bleiben',
  abgrenzung:'Staffellauf misst Partnerwechsel. Hier bleibt der Partner gleich. Spezialist vergleicht Rollen, Seitenwechsler die Wechselhäufigkeit. Umschaltmoment vergleicht den Übergang innerhalb jeder Zielrolle.',
  mind:'Vorgeschlagen fünf Partien in jeder der vier Zellen, insgesamt mindestens drei eigene Tage. Bekannte unmittelbare Vorgängerpartie am selben Berliner Tag, unveränderter Partner, bekannte Positionen und historische Anpfiffchancen. Keine hohe Siegquote erforderlich.',
  rechnung:'R = Mittelwert(Siegindikator minus Anpfiffchance). Je aktuellem Ziel Sturm/Abwehr R nach Positionswechsel minus R beim Bleiben rechnen. Wert = halbe Summe beider Rollenunterschiede, unabhängig vom Rollenpensum. Nur direkte eigene Nachbarpartien desselben Tages mit gleichem Partner sind Gelegenheiten; Tagesanfänge und unvollständige Übergänge auslassen, unbekannte Vorgänger niemals überspringen. Größter positiver Monats-Ausschlag gewinnt.',
  gegenbeispiel:'−10 statt −30 im Sturm und −15 statt −25 in der Abwehr ergeben +15 Punkte, obwohl alle vier Gruppen unter Soll bleiben. Nur häufiger die gute Position zu spielen reicht nicht; beide Zielrollen werden getrennt verglichen.',
  risiko:'Gegner, Planung und Entscheidungen über Positionswechsel können das Bild erklären. Keine kausale Behauptung, der Wechsel habe einen Sieg bewirkt. Fehlende Zellen sind keine Nullwerte; dann ist der Vergleich nicht qualifiziert. Vorheriges Ergebnis als Kontext zeigen und Unsicherheit vor späterer Freigabe prüfen.',
  story:'Für Alex zeigt sich nach Positionswechseln das günstigere Monatsbild. Bei gleichem Partner liegen diese Übergänge im Mittel 15 Punkte näher am Soll als das Bleiben.',
  beleg:'Synthetische Gruppenwerte. Gemeinsame vorgeschlagene Disziplin umschaltmoment mit monat/allzeit: gleiche Formel und Datenquelle, andere Zeitachse und Stichprobe. Keine zweite Auszeichnung oder neue Elo-Rechnung.'
};
