# Rang-Insignien – App Asset Kit

## Was enthalten ist

- 23 einzelne SVG-Dateien mit transparentem Hintergrund
- je drei Ebenen: Reif, Schildring, Volutenkranz, Zierkranz, Lorbeerreif, Kronenreif
- fünf Varianten des Ordensterns
- mittiger unterer Platzierungsslot in jeder SVG-Datei
- responsive HTML/CSS-Demo mit optionalem, leichtgewichtigem Schimmer

## Herkunft und Genauigkeit

Die Assets sind **neu gezeichnete, vektorisierte Annäherungen** auf Basis des bereitgestellten Referenzbilds. Sie sind **keine extrahierten Bildausschnitte**, keine automatische Pixel-zu-Pfad-Konvertierung und nicht pixelgenau identisch mit der Vorlage. Formen, Verläufe und Details wurden für saubere Skalierbarkeit und App-Nutzung neu aufgebaut.

## Direkte Nutzung

```html
<img class="rank-insignia" src="assets/lorbeerreif-3.svg" alt="Lorbeerreif – Ebene 3">
```

```css
.rank-insignia {
  width: 160px;
  height: 160px;
  object-fit: contain;
  filter: drop-shadow(0 8px 14px rgba(29, 8, 56, .35));
}
```

## Platzierungsslot ansprechen

Jede Datei enthält die Gruppe `<g id="placement-slot" data-placement-slot="center-bottom">`. Bei Inline-Einbettung kann die Fläche so gestaltet werden:

```html
<svg><!-- Inhalt einer Asset-Datei --></svg>
<style>
  #placement-slot #slot-face { fill: #23142f; }
</style>
```

Wenn ein eigenes Icon im Slot sitzen soll, füge es innerhalb der Gruppe `placement-slot` ein und zentriere es auf `x=128, y=201`. Der sichtbare Innenbereich ist ungefähr 24 × 24 SVG-Einheiten groß.

## Performance

Die SVGs selbst sind statisch. Der Demo-Schimmer liegt als CSS-Pseudo-Element über der Karte und verändert nicht die SVG-Filter. `prefers-reduced-motion` wird beachtet. Für große Listen empfiehlt sich zusätzlich `loading="lazy"` am `img`-Element.
