// Der Zeichensatz des Entwurfs: neue Zeichnungen und wer welches Zeichen
// trägt. Geladen von bau.js; in die App fließt davon nichts, bis der Entwurf
// abgenommen ist [CLAUDE.md §2].
//
// Regel des Entwurfs: ein Zeichen, eine Bedeutung. Dieselbe Sache in zwei
// Systemen (die Siegesserie als Award, Badge und Ring) behält ein Zeichen —
// dieselbe Sache hat einen Namen und ein Bild. Zwei verschiedene Sachen
// teilen nie eins: heute steht die Krone für sechs Dinge, vom Meistertitel
// bis zum Spitzenwechsel einer Partie.
//
// Alle Zeichnungen im 24er-Raster, nur Linien (der Strich kommt von
// --strich), gefüllt nur als Fläche mit geringer Deckkraft.

const NEU = {
  // ── Ränge: eine Leiter aus Winkeln, damit die fünf Stufen sich als Folge
  // lesen. Heute waren es Person, Schild, Medaille, Stern und Krone — fünf
  // Zeichen, die in anderen Systemen schon anderes bedeuten.
  rang1:  `<path d="M6 15l6-4.5 6 4.5"/>`,
  rang2:  `<path d="M6 12.5l6-4.5 6 4.5M6 17.5l6-4.5 6 4.5"/>`,
  rang3:  `<path d="M6 9.5L12 5l6 4.5M6 14l6-4.5 6 4.5M6 18.5l6-4.5 6 4.5"/>`,
  rang4:  `<path d="M12 2.2l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z"/><path d="M6 13l6-4 6 4M6 17l6-4 6 4M6 21l6-4 6 4"/>`,
  rang5:  `<path d="M7 8.2L6.2 3.5l3 2.1L12 2.2l2.8 3.4 3-2.1L17 8.2z"/><path d="M6 13l6-4 6 4M6 17l6-4 6 4M6 21l6-4 6 4"/>`,

  // ── Positionen: der Tisch von oben, halbiert. Der Punkt steht, wo der
  // Spieler steht; Flex trägt beide Hälften. Heute teilten sich Stürmer,
  // Sturm-Flex, der komplette Stürmer und die Eilmeldung einen Blitz.
  posSturm:      `<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 12h14"/><circle cx="12" cy="7.5" r="2" fill="currentColor"/>`,
  posSturmFlex:  `<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 12h14"/><circle cx="12" cy="7.5" r="2" fill="currentColor"/><circle cx="12" cy="16.5" r="1.3"/>`,
  posFlex:       `<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 12h14"/><circle cx="12" cy="7.5" r="1.8"/><circle cx="12" cy="16.5" r="1.8"/>`,
  posAbwehrFlex: `<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 12h14"/><circle cx="12" cy="7.5" r="1.3"/><circle cx="12" cy="16.5" r="2" fill="currentColor"/>`,
  posAbwehr:     `<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 12h14"/><circle cx="12" cy="16.5" r="2" fill="currentColor"/>`,
  posReinSturm:  `<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 12V5a2 2 0 012-2h10a2 2 0 012 2v7z" fill="currentColor" fill-opacity=".3"/><path d="M5 12h14"/><circle cx="12" cy="7.5" r="2" fill="currentColor"/>`,
  posReinAbwehr: `<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7z" fill="currentColor" fill-opacity=".3"/><path d="M5 12h14"/><circle cx="12" cy="16.5" r="2" fill="currentColor"/>`,
  // Der Spezialist: auf einer Hälfte weit besser als auf der anderen.
  spezialist:    `<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M5 12h14"/><path d="M9 8l2 1.8 4-3.8"/>`,

  // ── Die Liga und ihre Rubriken
  tafelStein:    `<path d="M5 21V8.5a7 5.5 0 0114 0V21z"/><path d="M9 11h6M9 14.5h6M9 18h4"/>`,
  verlauf:       `<path d="M3.5 12a8.5 8.5 0 102.5-6"/><path d="M3.5 3.5V8H8"/><path d="M12 7.5V12l3 2"/>`,
  saisonKal:     `<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M10 19v-6.5h5l-1.3 1.8L15 16h-5"/>`,
  idee:          `<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z"/>`,
  sirene:        `<path d="M7 17v-5a5 5 0 0110 0v5"/><rect x="5" y="17" width="14" height="3.5" rx="1"/><path d="M12 2.5v2M4.3 5.8l1.4 1.4M19.7 5.8l-1.4 1.4M10 12a2 2 0 012-2"/>`,
  funkeln:       `<path d="M10 3l1.8 5.2L17 10l-5.2 1.8L10 17l-1.8-5.2L3 10l5.2-1.8z"/><path d="M18 14l.9 2.1 2.1.9-2.1.9L18 20l-.9-2.1L15 17l2.1-.9z"/>`,
  abzeichen:     `<path d="M12 2.5l8 4.6v9.8l-8 4.6-8-4.6V7.1z"/><path d="M12 8.2l1.2 2.4 2.6.4-1.9 1.8.5 2.6L12 14.2l-2.4 1.2.5-2.6-1.9-1.8 2.6-.4z"/>`,
  spielfeld:     `<rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M12 5v14"/><circle cx="12" cy="12" r="2.5"/><path d="M3 9.5h1.8v5H3M21 9.5h-1.8v5H21"/>`,

  // ── Partie und Spieltag
  premiere:      `<circle cx="8" cy="12" r="2.6"/><circle cx="16" cy="12" r="2.6"/><path d="M3.2 21a4.8 4.8 0 019.6 0M11.2 21a4.8 4.8 0 019.6 0"/><path d="M12 2.2l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 4.3l2-.3z"/>`,
  spitzenwechsel:`<path d="M10.5 8.5l2-1.5V17"/><path d="M4 9a8.5 8.5 0 0114.5-3.5M20 15a8.5 8.5 0 01-14.5 3.5"/><path d="M18.8 2.5v3.3h-3.3M5.2 21.5v-3.3h3.3"/>`,
  rollencoup:    `<rect x="4" y="7" width="11" height="14" rx="2"/><path d="M4 14h11"/><path d="M13 3h8v8"/><path d="M21 3l-8 8"/>`,

  // ── Duos und Partner
  partnerHebel:  `<circle cx="12" cy="9" r="3"/><path d="M7 20a5 5 0 0110 0"/><path d="M4 14V7M2 9l2-2 2 2M20 14V7M18 9l2-2 2 2"/>`,
  jederPartner:  `<circle cx="12" cy="12" r="2.6"/><circle cx="5" cy="5.5" r="2"/><circle cx="19" cy="5.5" r="2"/><circle cx="12" cy="20" r="2"/><path d="M10.1 10.3L6.5 7M13.9 10.3L17.5 7M12 14.6V18"/>`,
  augenhoehe:    `<circle cx="7" cy="9" r="2.6"/><circle cx="17" cy="9" r="2.6"/><path d="M2 9h2.4M9.6 9h4.8M19.6 9H22"/><path d="M2.5 20a4.5 4.5 0 019 0M12.5 20a4.5 4.5 0 019 0"/>`,
  schattenmann:  `<circle cx="9" cy="7.5" r="3.3"/><path d="M3 21v-1a6 6 0 0112 0v1"/><path d="M15.5 4.3a3.3 3.3 0 010 6.4M18 14.6c1.8 1 3 3 3 5.4v1" stroke-dasharray="1.8 2.2"/>`,

  // ── Gegner und Rechnung
  geistBann:     `<path d="M6 20V10.5a6 6 0 0112 0V20l-2-1.6-2 1.6-2-1.6-2 1.6-2-1.6z"/><path d="M10 11h.01M14 11h.01"/><path d="M3 3l18 18"/>`,
  jederGegner:   `<circle cx="12" cy="12" r="8"/><path d="M8.6 12.2l2.3 2.2 4.5-4.6"/><path d="M12 1.5v2.5M12 20v2.5M1.5 12H4M20 12h2.5"/>`,
  bilanzTief:    `<circle cx="12" cy="12" r="9"/><path d="M12 12V3a9 9 0 013.8.84z" fill="currentColor" fill-opacity=".45"/><path d="M12 12V3"/>`,
  ausreisser:    `<path d="M3.5 3.5v17h17"/><circle cx="7.5" cy="16.5" r="1"/><circle cx="10.5" cy="15" r="1"/><circle cx="8.5" cy="13" r="1"/><circle cx="12" cy="17" r="1"/><circle cx="17.5" cy="7" r="2.2"/>`,
  wunderWoche:   `<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18"/><path d="M12 11.8l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z"/>`,
  schwererTag:   `<rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M10 14a2 2 0 014 0"/><path d="M8.8 14.5h6.4l.9 4H7.9z"/>`,

  // ── Serien, Form und Verlauf
  sturzflug:     `<circle cx="16" cy="17" r="3.5"/><path d="M13.4 14.6L4.5 5.7M15.2 13.6L10 4.5M12.4 16.4L3.5 11"/>`,
  zweiteLuft:    `<rect x="2.5" y="7" width="17" height="10" rx="2"/><path d="M21.5 10.5v3"/><path d="M12 8.8L9.3 12.4h3.4L10 15.6"/>`,
  steigerung:    `<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 010 18z" fill="currentColor" fill-opacity=".35"/><path d="M12 3v18"/>`,
  umschwung:     `<rect x="3" y="13" width="6" height="7.5" rx="1"/><rect x="15" y="5.5" width="6" height="15" rx="1"/><path d="M6 10c1.5-3.5 4-5 7.5-5"/><path d="M11.5 3l2 2-2 2"/>`,
  wechselhaft:   `<path d="M2 12h20" stroke-dasharray="1.5 2.5"/><path d="M2 12c2.5-9 5-9 7.5 0s5 9 7.5 0c1.2-4 2.5-6 5-6"/>`,
  formGipfel:    `<path d="M3 20h18"/><path d="M3 16.5l4.5-3.5 3.5 2 4.5-8.5L21 16"/><circle cx="15.5" cy="6.5" r="1.8" fill="currentColor"/>`,
  sollMinus:     `<path d="M3 6h18" stroke-dasharray="3 3"/><path d="M4 9l4 4 4-2 4 7 4-3"/>`,
  schwaechsterTag:`<path d="M3 20.5h18"/><path d="M3 11h18" stroke-dasharray="1.5 2.5"/><path d="M6.5 20.5V8M10.5 20.5V10M14.5 20.5V5.5M18.5 20.5V9"/>`,
  wochenschluss: `<rect x="2.5" y="8" width="19" height="8" rx="1.5"/><path d="M6.3 8v8M10.1 8v8M13.9 8v8M17.7 8v8"/><path d="M17.7 8h2.3a1.5 1.5 0 011.5 1.5v5a1.5 1.5 0 01-1.5 1.5h-2.3z" fill="currentColor" fill-opacity=".45"/>`,
  tagesabschluss:`<path d="M19.5 14.5A8 8 0 019.5 4.5a8 8 0 1010 10z"/><path d="M9.5 13l2 2 3.5-4"/>`,
  thron:         `<path d="M7 21v-3.5M17 21v-3.5"/><path d="M5.5 17.5h13v-4h-13z"/><path d="M8 13.5V5l4-2.5L16 5v8.5"/>`,
  sturmfuehrer:  `<path d="M5.5 21.5V3"/><path d="M5.5 3.5H18l-3 4.25L18 12H5.5"/>`,

  // ── Tore und Abwehr
  weisseWeste:   `<path d="M8.5 3L3.5 6l2 4.2L8 9.2V21h8V9.2l2.5 1L20.5 6l-5-3a3.5 3.5 0 01-7 0z"/>`,
  widerstand:    `<path d="M3 12h9.5M9.5 8.5L13 12l-3.5 3.5"/><path d="M16.5 4v16M20.5 6.5v11"/>`,
  abrissbirne:   `<path d="M3.5 3h10"/><path d="M8.5 3v6.5"/><circle cx="8.5" cy="15" r="5"/><path d="M16.5 10.5l3.5-1.3M17 15h4M16.5 19.3l3.5 1.4"/>`,
  torhagel:      `<path d="M7 14.5a4 4 0 01-.4-8A5.5 5.5 0 0117 7a3.7 3.7 0 01.4 7.5z"/><circle cx="8" cy="18.6" r="1.3"/><circle cx="12.4" cy="20.4" r="1.3"/><circle cx="16.6" cy="18" r="1.3"/>`,
  dreiSaisons:   `<path d="M12 2.5l7.5 3.4v5.6c0 4.7-3.2 8.6-7.5 10-4.3-1.4-7.5-5.3-7.5-10V5.9z"/><path d="M9 9v6M12 9v6M15 9v6"/>`,
  nulldiaet:     `<circle cx="12.5" cy="12" r="6.5"/><circle cx="12.5" cy="12" r="3.5"/><path d="M2.5 4v4.5a1.5 1.5 0 003 0V4M4 9v11M21.5 4v16M21.5 4c-1.8 1-2.3 4-2.3 6h2.3"/>`,

  // ── Zählstände und Leitern
  dauerbrenner:  `<path d="M8.5 21h7M10 21V10h4v11"/><path d="M12 10V8.2"/><path d="M12 2.8c1.4 1.5 1.9 2.8 0 4.3-1.9-1.5-1.4-2.8 0-4.3z"/>`,
  urgestein:     `<path d="M3 20.5h18l-2.5-6.5-3-2.5L13 5.5 9.5 8.5 6 13z"/><path d="M5.3 15.5h13.5M7.6 11.5h8"/>`,
  siegermaschine:`<path d="M10.3 2.5h3.4l.5 2.4 1.6.7 2.1-1.3 2.4 2.4-1.3 2.1.7 1.6 2.4.5v3.4l-2.4.5-.7 1.6 1.3 2.1-2.4 2.4-2.1-1.3-1.6.7-.5 2.4h-3.4l-.5-2.4-1.6-.7-2.1 1.3-2.4-2.4 1.3-2.1-.7-1.6-2.4-.5v-3.4l2.4-.5.7-1.6-1.3-2.1 2.4-2.4 2.1 1.3 1.6-.7z"/><path d="M9.3 12.2l1.9 1.9 3.5-3.8"/>`,
  gleichmass:    `<path d="M3 19.5h18"/><path d="M4.5 19.5c3.5 0 4.5-13 7.5-13s4 13 7.5 13"/><path d="M8.5 13h7" stroke-dasharray="1.5 2"/>`,
  zitterkrone:   `<path d="M6 18l-1-9 4 3 3-5 3 5 4-3-1 9z"/><path d="M2.5 9.5l1 1.5-1 1.5M21.5 9.5l-1 1.5 1 1.5"/>`,
  kaltblut:      `<path d="M10 4.2a2 2 0 014 0v10.3a4 4 0 11-4 0z"/><path d="M12 15.5V12"/><path d="M17 5h3M17 8.5h2"/>`,

  // ── Neu gezeichnet, weil zwei Zeichnungen Zwillinge waren
  pille:         `<path d="M4.7 13.6l8.9-8.9a4 4 0 015.7 5.7l-8.9 8.9a4 4 0 01-5.7-5.7z"/><path d="M9.2 9.1l5.7 5.7"/>`,
  schwarzerTag:  `<circle cx="12" cy="12" r="4.8" fill="currentColor" fill-opacity=".55"/><path d="M12 2.2v2.6M12 19.2v2.6M2.2 12h2.6M19.2 12h2.6M5.1 5.1l1.8 1.8M17.1 17.1l1.8 1.8M5.1 18.9l1.8-1.8M17.1 6.9l1.8-1.8"/>`,
  ueberholen:    `<circle cx="12" cy="16" r="2.4"/><path d="M3.5 18c0-6.5 4.2-10 10.5-10h6"/><path d="M17 5l3 3-3 3"/>`,
  rakete:        `<path d="M12 2.5c3 2 4.5 5.5 4.5 9.5l-2 3h-5l-2-3c0-4 1.5-7.5 4.5-9.5z"/><circle cx="12" cy="9" r="1.6"/><path d="M9.5 15l-2.5 2.5V20l2.5-1.5M14.5 15l2.5 2.5V20l-2.5-1.5M12 17.5V21"/>`,
  betonmauer:    `<circle cx="8" cy="5" r="2.2"/><circle cx="16" cy="5" r="2.2"/><path d="M4.5 11a3.5 3.5 0 017 0M12.5 11a3.5 3.5 0 017 0"/><rect x="3" y="11" width="18" height="10" rx="1"/><path d="M3 16h18M9 11v5M15 11v5M12 16v5"/>`,
  // ── Die Bedienung und die letzten Doppelungen
  rekord:        `<path d="M12 2.5l1.3 2.6 2.9.4-2.1 2 .5 2.9L12 9l-2.6 1.4.5-2.9-2.1-2 2.9-.4z"/><path d="M3.5 21v-5h5v-3h7v5h5v3z"/>`,
  sichern:       `<path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4"/><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/>`,
  neuRechnen:    `<path d="M19.5 10.5A7.8 7.8 0 005.6 7L4 8.6"/><path d="M4 3.8v4.8h4.8"/><path d="M4.5 13.5A7.8 7.8 0 0018.4 17l1.6-1.6"/><path d="M20 20.2v-4.8h-4.8"/>`,
  wippe:         `<path d="M3 14h18"/><path d="M12 14l-3 6.5h6z"/><circle cx="6.5" cy="10.8" r="2.3"/><rect x="15.3" y="8.6" width="4.4" height="4.4" rx=".6"/>`,
  marke:         `<path d="M5 21.5V3.5"/><path d="M5 4h14v9H5"/><path d="M5 4h4.7v4.5H5zM14.3 4H19v4.5h-4.7zM9.7 8.5h4.6V13H9.7z" fill="currentColor" fill-opacity=".45"/>`,
  kontrast:      `<path d="M3 20.5h18"/><rect x="5" y="4" width="5" height="16.5" rx="1"/><rect x="14" y="16" width="5" height="4.5" rx="1"/><path d="M16.5 5v7.5M14.8 10.8l1.7 1.7 1.7-1.7"/>`,
  spaetStart:    `<path d="M3 17.5h9.5c3.2 0 5.3-3.6 6.5-10"/><path d="M16.2 9.3l2.8-2.6 2.3 3"/><path d="M3 21h18" stroke-dasharray="1.5 2.5"/>`,
};

// Wer welches Zeichen trägt. Nur Änderungen stehen hier; alle übrigen
// Einträge behalten ihr Zeichen. `art`:
//   neu    — eine eigene Bedeutung bekommt eine eigene Zeichnung
//   gleich — dieselbe Sache wie ein anderer Eintrag, sie nimmt dessen Zeichen
const WECHSEL = [
  // Ränge und Positionen
  ['Rang', 'Einsteiger', 'rang1', 'neu'], ['Rang', 'Solide', 'rang2', 'neu'], ['Rang', 'Stark', 'rang3', 'neu'],
  ['Rang', 'Elite', 'rang4', 'neu'], ['Rang', 'Legende', 'rang5', 'neu'],
  ['Position', 'Reiner Stürmer', 'posReinSturm', 'neu'], ['Position', 'Stürmer', 'posSturm', 'neu'],
  ['Position', 'Sturm-Flex', 'posSturmFlex', 'neu'], ['Position', 'Flex', 'posFlex', 'neu'],
  ['Position', 'Abwehr-Flex', 'posAbwehrFlex', 'neu'], ['Position', 'Verteidiger', 'posAbwehr', 'neu'],
  ['Position', 'Reiner Verteidiger', 'posReinAbwehr', 'neu'],
  ['Badge', 'atk50', 'posSturm', 'gleich', '50 Spiele im Sturm: ein Stürmer'],
  ['Badge', 'def50', 'posAbwehr', 'gleich', '50 Spiele in der Abwehr: ein Verteidiger'],
  ['Rekord', 'wall', 'posReinAbwehr', 'gleich', 'höchster Abwehranteil: der reine Verteidiger'],
  ['Rekord', 'abwehrmauer', 'posReinAbwehr', 'gleich', 'höchster Abwehranteil, letzte 50 Partien'],
  ['Monatschronik', 'spezialisiert', 'spezialist', 'neu'],
  // Rubriken des Feeds
  ['News', 'tafel', 'tafelStein', 'neu'], ['News', 'history', 'verlauf', 'neu'], ['News', 'season', 'saisonKal', 'neu'],
  ['News', 'fun', 'idee', 'neu'], ['News', 'breaking', 'sirene', 'neu'], ['News', 'highlight', 'funkeln', 'neu'],
  ['News', 'badge', 'abzeichen', 'neu'], ['News', 'personal', 'user', 'gleich', 'ein Spieler'],
  ['News', 'misfortune', 'rainCloud', 'gleich', 'der Pechvogel, wie der Award'],
  // Spieltag
  ['Spieltag', 'feld', 'spielfeld', 'neu'], ['Spieltag', 'premiere', 'premiere', 'neu'],
  ['Spieltag', 'spitze', 'spitzenwechsel', 'neu'], ['Spieltag', 'medaille', 'abzeichen', 'gleich', 'eine Auszeichnung, wie die Rubrik'],
  ['Spieltag', 'teamserie', 'unstoppable', 'gleich', 'die Siegesserie eines Duos, wie der Award „Unaufhaltsam“'],
  ['Spieltag', 'deutlich', 'thumbsUp', 'gleich', 'ein klarer Sieg, wie das Badge „Klares Ding“'],
  ['Spieltag', 'krimi', 'pinch', 'gleich', 'der Zittersieg 10:9, wie das Badge'],
  ['Rekord', 'rollencoup', 'rollencoup', 'neu'],
  // Ringe am Avatar
  ['Ring', 'tots', 'handshake', 'gleich', 'Team der Saison, wie das Badge'],
  // Duos und Partner
  ['Rekord', 'catalyst', 'partnerHebel', 'neu'], ['Monatschronik', 'ausgleich', 'jederPartner', 'neu'],
  ['Monatschronik', 'gleichauf', 'augenhoehe', 'neu'], ['Monatschronik', 'schattenmann', 'schattenmann', 'neu'],
  ['Badge', 'carry', 'weight', 'gleich', 'Sieg mit dem Schwächsten als Partner, wie „Carry-King“'],
  // Gegner und Rechnung
  ['Monatschronik', 'angstfrei', 'geistBann', 'neu'], ['Monatschronik', 'breitenwirkung', 'jederGegner', 'neu'],
  ['Monatschronik', 'angstgegner', 'ghost', 'gleich', 'kein Sieg gegen einen Gegner, wie das Badge „Angstgegner“'],
  ['Award', 'worstWr', 'bilanzTief', 'neu'],
  ['Badge', 'upset_king', 'underdog', 'gleich', 'Sieg als Außenseiter'], ['Rekord', 'gegenwind', 'underdog', 'gleich', 'Siegquote als Außenseiter'],
  ['Monatschronik', 'ausreisser2', 'ausreisser', 'neu'], ['Monatschronik', 'wochwunder', 'wunderWoche', 'neu'],
  ['Rekord', 'hardnight', 'schwererTag', 'neu'],
  ['Rekord', 'bitterloss', 'crownFallen', 'gleich', 'der Favorit verliert, wie „Favoriten-Versager“'],
  // Serien
  ['Rekord', 'unstoppable', 'flameTriple', 'gleich', 'längste Siegesserie, wie der Award'],
  ['Award', 'coldStreak', 'dropTriple', 'gleich', 'die laufende Pleitenserie, wie der Ring am Avatar'],
  ['Monatschronik', 'drought', 'trendCrash', 'gleich', 'längste Pleitenserie, wie der Award'],
  ['Rekord', 'freefall', 'sturzflug', 'neu'], ['Monatschronik', 'zweiteluft', 'zweiteLuft', 'neu'],
  ['Monatschronik', 'aufholjagd', 'comeback', 'gleich', 'Sieg direkt nach einer Pleite, wie „Der Stehaufmann“'],
  ['Monatschronik', 'auferstehung', 'comeback', 'gleich', 'Sieg nach zwei Pleiten'],
  // Titel des Tages und der Woche
  ['Badge', 'potw', 'weekKing', 'gleich', 'Player of the Week, wie Award und Ring'],
  ['Badge', 'potd', 'dayKing', 'gleich', 'Player of the Day, wie der Award'],
  ['Monatschronik', 'tagesregent', 'dayKing', 'gleich', 'Anteil der Tage als Player of the Day, wie „Der Platzhirsch“'],
  ['Monatschronik', 'wochenkrone', 'weekKing', 'gleich', 'jede Woche Player of the Week'],
  // Siegquote, Monat, Tag
  ['Monatschronik', 'traumquote', 'star', 'gleich', 'höchste Siegquote, wie „Beste Bilanz“'],
  ['Rekord', 'best_record', 'star', 'gleich', 'höchste Siegquote eines Monats'],
  ['Monatschronik', 'steigerung', 'steigerung', 'neu'], ['Monatschronik', 'umschwung', 'umschwung', 'neu'],
  ['Monatschronik', 'wechselhaft', 'wechselhaft', 'neu'], ['Monatschronik', 'formgipfel', 'formGipfel', 'neu'],
  ['Monatschronik', 'untersoll', 'sollMinus', 'neu'], ['Monatschronik', 'schwaechstertag', 'schwaechsterTag', 'neu'],
  ['Monatschronik', 'wochenschluss', 'wochenschluss', 'neu'], ['Monatschronik', 'kopfhoch', 'tagesabschluss', 'neu'],
  ['Monatschronik', 'thron', 'thron', 'neu'], ['Monatschronik', 'kaltstart', 'sunrise', 'gleich', 'die erste Partie des Tages, wie „Frühschicht“'],
  ['Monatschronik', 'aufstieg', 'stepsUp', 'gleich', 'Plätze gewonnen, wie der Rangsprung'],
  ['Rekord', 'sturmfuehrer', 'sturmfuehrer', 'neu'],
  // Tore, Abwehr, Ergebnis
  ['Monatschronik', 'zunull', 'weisseWeste', 'neu'], ['Rekord', 'damage_control', 'widerstand', 'neu'],
  ['Rekord', 'destroyer', 'abrissbirne', 'neu'], ['Monatschronik', 'torhagel', 'torhagel', 'neu'],
  ['Monatschronik', 'nulldiaet', 'nulldiaet', 'neu'],
  ['Monatschronik', 'sieve', 'hole', 'gleich', 'die meisten Gegentore, wie „Löchrigste Abwehr“'],
  ['Rekord', 'rock', 'shieldCheck', 'gleich', 'die wenigsten Gegentore, wie „Eiserne Abwehr“'],
  ['Monatschronik', 'bollwerk', 'shieldCheck', 'gleich', 'weniger Gegentore als die Liga'],
  ['Monatschronik', 'deutlich', 'plusMinus', 'gleich', 'Tordifferenz je Partie, wie „Plus-Minus“'],
  ['Monatschronik', 'abyss', 'dizzy', 'gleich', 'Pleiten 0:10, wie „Absoluter Verlierer“'],
  ['Monatschronik', 'lieblingszahl', 'duplicate', 'gleich', 'dasselbe Ergebnis immer wieder, wie „Wiederholungstäter“'],
  ['Monatschronik', 'nervenkitzel', 'thriller', 'gleich', 'viele enge Partien, wie „Krimi-Reihe“'],
  ['Monatschronik', 'hardluck', 'pille', 'gleich', 'Pleiten 9:10, wie „Bittere Pille“'],
  ['Badge', 'bitter_loss', 'pille', 'neu'],
  ['Rekord', 'clutch', 'target', 'gleich', 'enge Partien, wie „Clutch-Player“'],
  ['Monatschronik', 'zitterkoenig', 'zitterkrone', 'neu'],
  ['Monatschronik', 'gleichmut', 'gleichmass', 'neu'], ['Monatschronik', 'kaltblut', 'kaltblut', 'neu'],
  // Badges mit Zählstand
  ['Badge', 'untouchable', 'dreiSaisons', 'neu'], ['Badge', 'games150', 'dauerbrenner', 'neu'],
  ['Badge', 'games250', 'urgestein', 'neu'], ['Badge', 'wins200', 'siegermaschine', 'neu'],
  ['Badge', 'allrounder', 'bothSides', 'gleich', 'auf beiden Positionen, wie der Rekord „Der Allrounder“'],
  ['Badge', 'black_day', 'schwarzerTag', 'neu'], ['Badge', 'overtake', 'ueberholen', 'neu'],
  ['Monatschronik', 'endspurt', 'rakete', 'neu'], ['Award', 'concreteWall', 'betonmauer', 'neu'],
  ['Monatschronik', 'kontrast', 'kontrast', 'neu'], ['Monatschronik', 'rollenfest', 'wippe', 'neu'], ['Monatschronik', 'nachzuegler', 'spaetStart', 'neu'],
];

// Zeichen, die die Bedienung direkt setzt — außerhalb der neun Systeme.
// Sie meinen dasselbe wie ein Eintrag oder brauchen ein eigenes Zeichen.
// [Ort, heute, Entwurf, Grund, Stelle im ausgelieferten Code]
const BEDIENUNG = [
  ['Positionen-Schalter „Sturm“', 'bolt', 'posSturm', 'die Position, wie in der Rolle', "${svgI('bolt')}Sturm</span></button>"],
  ['Positionen-Schalter „Abwehr“', 'shield', 'posAbwehr', 'die Position, wie in der Rolle', "${svgI('shield')}Abwehr</span></button>"],
  ['Profil, Positions-Profil: Sturm', 'bolt', 'posSturm', 'die Position', "<span class=\"lf\">${svgI('bolt')}Sturm</span>"],
  ['Profil, Positions-Profil: Abwehr', 'shield', 'posAbwehr', 'die Position', "Abwehr${svgI('shield')}</span>"],
  ['Team-Profil: Sturm und Abwehr', 'bolt, shield', 'posSturm, posAbwehr', 'die Position', "{atk:svgI('bolt'), def:svgI('shield')}"],
  ['Profil „Positions-Profil“', 'target', 'posFlex', 'beide Positionen; das Ziel ist „Clutch-Player“', "${svgI('target')}<h4>Positions-Profil</h4>"],
  ['Profil „Auszeichnungen“', 'star', 'abzeichen', 'eine Auszeichnung; der Stern ist die beste Siegquote', "${svgI('star')}<h4>Auszeichnungen</h4>"],
  ['Profil „Saisonverlauf“', 'calendar', 'saisonKal', 'die Saison, wie die Rubrik', "${svgI('calendar')}<h4>Saisonverlauf"],
  ['Rekordblatt „Liga-Rekord“', 'trophyStar', 'rekord', 'ein Rekord; der Pokal mit Stern ist „Meiste Siege“', "${svgI('trophyStar')}</span><h4>Liga-Rekord"],
  ['Feed „Die Karte des Tages“', 'star', 'funkeln', 'das Herausragende im Feed, wie die Highlights', "svgI('star') + 'DIE KARTE DES TAGES"],
  ['Teams „Beste“', 'chartUp', 'trendUp', 'Zwilling von trendUp', "${svgI('chartUp')}Beste"],
  ['Teams „Schlechteste“', 'chartDown', 'trendDown', 'Zwilling von trendDown', "${svgI('chartDown')}Schlechteste"],
  ['Direkter Vergleich', 'swords', 'crossedSwords', 'das Duell zweier Gegner ist die Rivalität', "${svgI('swords')}"],
  ['Einstellungen „Alle Matches neu berechnen“', 'cycle', 'neuRechnen', 'der Kreis ist „Das Wechselbad“', "${svgI('cycle')} Alle Matc"],
  ['Einstellungen „Sicherung speichern“', 'shieldCheck', 'sichern', 'das Schild ist „Eiserne Abwehr“', "${svgI('shieldCheck')} Sicherung"],
  // Die Rubriken und Filter des Feeds setzen ihr Zeichen selbst, neben
  // NEWS_CATEGORIES — dieselbe Sache stand an zwei Stellen und hatte zwei
  // Zeichen (Breaking: Blitz hier, Blitz dort; Spieltag: Ball und Klingen).
  ['Rubrik „Breaking“', 'bolt', 'sirene', 'die Eilmeldung, wie die Kategorie', "if(_isBreaking(s)) return 'bolt';"],
  ['Rubrik „Am Spieltag“', 'ball', 'spielfeld', 'die Partie; der Ball ist der Torjäger', "case 'spiel':  return 'ball';"],
  ['Rubrik „Tafel“', 'trophyStar', 'tafelStein', 'die Ewige Tafel, wie die Kategorie', "case 'tafel':  return 'trophyStar';"],
  ['Rubrik „Duell“', 'swords', 'crossedSwords', 'die Rivalität', "case 'duell':  return 'swords';"],
  ['Rubrik „Serie“ (Pleiten)', 'trendDown', 'dropTriple', 'die laufende Pleitenserie, wie am Avatar', "? 'trendDown' : 'flame';"],
  ['Rubrik „Auszeichnung“', 'medal', 'abzeichen', 'eine Auszeichnung', "case 'badge':  return 'medal';"],
  ['Rubrik „Marke“', 'chartUp', 'marke', 'eine erreichte Marke; chartUp ist ein Zwilling', "case 'marke':  return 'chartUp';"],
  ['Rubrik „Spieler“', 'tripleCup', 'medalTrio', 'einer sammelt mehreres, wie „Award-Sammler“; die drei Pokale sind „Mr. Perfect“', "case 'spieler':return 'tripleCup';"],
  ['Filter „Breaking“', 'bolt', 'sirene', 'wie die Rubrik', "{k:'breaking', label:'Breaking', ic:'bolt',"],
  ['Filter „Tafel“', 'trophyStar', 'tafelStein', 'wie die Rubrik', "{k:'tafel',    label:'Tafel',    ic:'trophyStar',"],
  ['Filter „Spieltag“', 'crossedSwords', 'spielfeld', 'wie die Rubrik; die Klingen sind die Rivalität', "{k:'spieltag', label:'Spieltag', ic:'crossedSwords',"],
  ['Einstellungen „Datei einspielen“', 'refresh', 'hochladen', 'das Zeichen ist „Der Wandler“', "${svgI('refresh')} Datei einspielen"],
];

// Familien, die bewusst ein Zeichen teilen: dieselbe Sache in mehreren
// Systemen. Jedes Zeichen, das mehr als ein Eintrag trägt, steht hier mit
// seiner einen Bedeutung — sonst ist es eine Doppelung. Die Seite zeigt die
// Träger, damit die Grenze nachprüfbar ist.
const FAMILIEN = {
  flame:'Die laufende Siegesserie', flameTriple:'Die lange Siegesserie',
  dropTriple:'Die laufende Pleitenserie', trendCrash:'Die längste Pleitenserie',
  handshake:'Das beste Duo', unstoppable:'Die Siegesserie eines Duos',
  weekKing:'Player of the Week', dayKing:'Player of the Day',
  crossedSwords:'Die Rivalität', comeback:'Die Wende nach der Pleite', flameBreak:'Der Serienbruch',
  underdog:'Sieg als Außenseiter', surprise:'Der unwahrscheinlichste Sieg',
  giantSlayer:'Sieg gegen den Favoriten', crownFallen:'Der Favorit verliert',
  star:'Die beste Siegquote', crown:'Der Erste: Meistertitel und Sieger einer Wertung',
  shieldCheck:'Die wenigsten Gegentore', hole:'Die meisten Gegentore',
  ball:'Die meisten Tore im Sturm', plusMinus:'Die Tordifferenz je Partie',
  target:'Stark in engen Partien', thriller:'Viele enge Partien', pinch:'Der Zittersieg 10:9',
  pille:'Die Pleite 9:10', dizzy:'Die Pleite 0:10', thumbsUp:'Der klare Sieg',
  duplicate:'Dasselbe Ergebnis immer wieder', sunrise:'Die erste Partie des Tages',
  weight:'Sieg mit dem Schwächsten als Partner', rainCloud:'Der Pechvogel', ghost:'Der Angstgegner',
  bothSides:'Auf beiden Positionen', stepsUp:'Plätze gewonnen', abzeichen:'Eine Auszeichnung',
  posSturm:'Der Stürmer', posAbwehr:'Der Verteidiger', posReinAbwehr:'Der reine Verteidiger',
  posFlex:'Beide Positionen', saisonKal:'Die Saison', funkeln:'Das Herausragende im Feed',
  sirene:'Die Eilmeldung', spielfeld:'Die Partie am Spieltag', tafelStein:'Die Ewige Tafel', medalTrio:'Einer sammelt mehreres',
};

if(typeof module !== 'undefined') module.exports = {NEU, WECHSEL, FAMILIEN, BEDIENUNG};
