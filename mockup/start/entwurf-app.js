// Der Entwurf für Öffnen, Reiter und Blätter. Läuft nur unter #neu, nach
// dem Code der App und vor dem Start (`__start` ruft `__entwurf`, dann
// `loadAll`). Er hängt sich an fünf Stellen der App — render, renderNav,
// _renderNachEingabe, setConn, _ligaAktualisieren — und an die Klassen von
// Blatt, Story und Popover. Beim Einbau stünde jeder Teil in der Datei, die
// diese Stelle besitzt; hier steht er beisammen, damit man ihn sieht.
//
// Fünf Regeln, die jeder Teil befolgt:
//  · nie warten: die App ist vom ersten Bild an bedienbar, keine Bewegung
//    hält eine Antwort auf;
//  · einmal: der Aufbau läuft beim Öffnen nach längerer Pause, nicht bei
//    jedem Zeichnen und nicht nach fünf Minuten wieder;
//  · abbrechbar: jede Berührung beendet die Vorführung, das Ergebnis steht;
//  · nur, was etwas sagt: eine Zeile bewegt sich, weil sie den Platz
//    gewechselt hat, und der Hinweis kommt, weil etwas neu ist;
//  · nur, was man sieht: was verdeckt oder außerhalb liegt, steht still.
(function(){
  var S = window.__SIM;
  window.__entwurf = function(){
    if(S.art !== 'neu') return;
    var html = document.documentElement, K = window.__k.eval;
    html.classList.add('neu');
    var main = document.getElementById('main');
    var NAV_IDS = ['ranking', 'positions', 'awards', 'teams', 'history'];
    var still = function(){ return html.classList.contains('ruhe') || matchMedia('(prefers-reduced-motion: reduce)').matches; };

    // ── 1 · Das Gerüst ────────────────────────────────────────────────
    // Beim Einbau: festes Markup in src/index.html, innerhalb von <main>.
    // Es steht damit im ersten Bild, bevor ein Skript gelaufen ist — heute
    // ist die Fläche unter der Kopfleiste leer, bis der Stand gezeichnet hat,
    // beim ersten Start bis die Datenbank geantwortet hat. Die Maße sind die
    // der Liga, damit beim Tausch nichts springt.
    // Jedes Kästchen trägt die Klasse `gk`: eine Regel mit einem Tag ganz
    // rechts (`.geruest i`) prüfte der Browser bei jedem <i> der App.
    var k = function(c){ return '<i class="gk' + (c ? ' ' + c : '') + '"></i>'; };
    var gz = function(erste){ return '<div class="g-zeile' + (erste ? ' g-erste' : '') + '">' + k('g-pos') + k('g-av')
      + '<span class="g-mid">' + k('g-m1') + k('g-m2') + k('g-m3') + '</span>' + k('g-wert') + '</div>'; };
    if(S.ohne.indexOf('geruest') < 0) main.innerHTML = '<section class="view active geruest" aria-busy="true" aria-label="Die Liga lädt">'
      + '<div class="g-kopf">' + k('g-h') + k('g-s') + '</div>'
      + '<div class="g-switch">' + k('g-sw') + '</div><div class="g-lauf"></div><div class="g-wahl">' + k('g-w1') + k('g-w') + k('g-w') + '</div>'
      + '<div class="g-tabs">' + k('g-t') + k('g-t') + '</div>'
      + '<div class="g-liste">' + gz(true) + gz() + gz() + gz() + gz() + gz() + '</div></section>';
    // Die untere Leiste steht ebenfalls sofort: sie braucht keine Daten.
    K('renderNav(); 0');

    // ── 2 · Der Aufbau ────────────────────────────────────────────────
    // Einmal beim Öffnen nach einer Pause (beim Einbau: länger als
    // fünfzehn Minuten nicht sichtbar, gemerkt im Speicher des Geräts).
    // Kopf, Wähler und die Tage des Monats zuerst, dann die Zeilen, die man
    // sieht — und nur die: was unter dem Rand liegt, steht schon da, wenn
    // man hinscrollt. Zuletzt zieht einmal Licht über den Ersten.
    var aufbauTimer = 0, warteschlange = [];
    function aufbauEnde(){
      if(!html.classList.contains('aufbau')) return;
      html.classList.remove('aufbau');
      clearTimeout(aufbauTimer);
      document.querySelectorAll('.neu-licht').forEach(function(l){ l.remove(); });
      var w = warteschlange; warteschlange = [];
      w.forEach(function(f){ f(); });
    }
    function aufbau(view){
      if(still() || S.fall === 'kurz') return;
      // Jedes bewegte Element bekommt für die Dauer eine eigene Ebene. Die
      // 31 Tage einzeln wachsen zu lassen und dazu jeden Quotenbalken hieß
      // gemessen rund fünfzig Ebenen auf einmal; jetzt sind es höchstens
      // zwölf: Kopf, Wähler, die Tage als ein Streifen, die Zeilen.
      // Wie viele Zeilen im Bild stehen, wird aus der Höhe des Fensters
      // geschätzt (die Liste beginnt bei rund 350 px, eine Zeile ist rund
      // 90 px hoch), nicht gemessen: `getBoundingClientRect` erzwang hier ein
      // Layout der ganzen neuen Ansicht, mitten in ihrem ersten Bild. Die
      // Verzögerung steht direkt an der Zeile, nicht als Variable: eine
      // Variable erbt jeder Knoten darunter, samt Wappen, und alle rechneten
      // ihren Stil neu.
      var sichtbar = Math.max(1, Math.ceil((innerHeight - 340) / 90));
      [].slice.call(view.querySelectorAll('.rrow'), 0, sichtbar).forEach(function(r, n){
        r.classList.add('auf-z'); r.style.animationDelay = (80 + n * 40) + 'ms';
      });
      var erster = view.querySelector('.rrow.held.top1');
      if(erster){ var l = document.createElement('span'); l.className = 'neu-licht'; l.setAttribute('aria-hidden', 'true');
        l.innerHTML = '<i class="neu-licht-b"></i>'; erster.appendChild(l); }
      if(S.ohne.indexOf('aufbau') >= 0) return;
      html.classList.add('aufbau');
      aufbauTimer = setTimeout(aufbauEnde, 1400);
    }
    // Wer tippt, wischt oder scrollt, will etwas Bestimmtes: die Vorführung
    // endet sofort, und alles steht, wo es hingehört.
    ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(function(ev){
      addEventListener(ev, aufbauEnde, {passive:true, capture:true});
    });

    // ── 3 · Was sich seit dem letzten Stand bewegt hat ───────────────
    // Der Start zeichnet den Stand des Geräts, der Live-Abruf ersetzt ihn
    // [§C42]. Heute springt die Liste dabei an ihre neue Ordnung. Hier
    // gleitet jede sichtbare Zeile von ihrem alten an den neuen Platz, und
    // wer den Platz gewechselt hat, trägt ▲ oder ▼ wie im Positionsverlauf
    // [§C27]. Dasselbe beim Zurückkommen aus dem Hintergrund.
    // Gemessen wird, wo eine Zeile gerade STEHT — mitten in einer Bewegung
    // also an ihrem Zwischenplatz. Zeichnet die App gleich danach noch einmal
    // (das Archiv eines Monats tut das), gleitet die Zeile von dort weiter,
    // statt zurückzuspringen.
    function lage(){
      var m = {};
      main.querySelectorAll('.rrow[data-detail]').forEach(function(r){
        var pos = r.querySelector('.pos'), w = r.querySelector('.rval .big');
        m[r.dataset.detail] = {y:r.getBoundingClientRect().top, pos:pos ? parseInt(pos.textContent, 10) : 0,
          wert:w ? w.textContent.trim() : ''};
      });
      return m;
    }
    var zahl = function(t){ var x = parseInt(String(t).replace(/[^\d-]/g, ''), 10); return isNaN(x) ? null : x; };
    // Die Marken rechnen gegen den Stand VOR den neuen Partien, nicht gegen
    // das letzte Bild: sonst nähme ein zweites Zeichnen mit denselben
    // Partien sie wieder weg. `frisch` sagt, ob sie gerade erst entstehen
    // (dann springen sie auf) oder nur wieder hingestellt werden.
    function marken(basis, frisch){
      main.querySelectorAll('.rrow[data-detail]').forEach(function(r){
        var a = basis[r.dataset.detail]; if(!a) return;
        var pos = r.querySelector('.pos'), w = r.querySelector('.rval .big');
        var p = pos ? parseInt(pos.textContent, 10) : 0, d = a.pos && p ? a.pos - p : 0;
        if(d && pos && !pos.querySelector('.neu-platz')){
          var c = document.createElement('span');
          c.className = 'posv-bw num neu-platz ' + (d > 0 ? 'auf' : 'ab') + (frisch ? '' : ' fest');
          c.textContent = (d > 0 ? '▲' : '▼') + Math.abs(d);
          pos.appendChild(c);
        }
        var vorher = zahl(a.wert), jetzt = w ? zahl(w.textContent) : null;
        if(w && vorher != null && jetzt != null && jetzt !== vorher && !w.parentNode.querySelector('.neu-delta')){
          var e = document.createElement('span');
          e.className = 'neu-delta num ' + (jetzt > vorher ? 'auf' : 'ab') + (frisch ? '' : ' fest');
          e.textContent = (jetzt > vorher ? '+' : '−') + Math.abs(jetzt - vorher);
          w.parentNode.appendChild(e);
        }
      });
    }
    function bewegen(alt, frisch){
      if(S.ohne.indexOf('bewegung') >= 0) return;
      var vh = innerHeight, k = 0;
      main.querySelectorAll('.rrow[data-detail]').forEach(function(r){
        var a = alt[r.dataset.detail]; if(!a) return;
        var b = r.getBoundingClientRect(), dy = a.y - b.top;
        var sieht = (b.top < vh && b.bottom > 0) || (a.y < vh && a.y + b.height > 0);
        if(still() || !sieht || Math.abs(dy) < 2) return;
        if(frisch){
          var s = document.createElement('span'); s.className = 'neu-schein ' + (dy > 0 ? 'auf' : 'ab');
          s.setAttribute('aria-hidden', 'true'); r.appendChild(s);
        }
        // Wer steigt, fährt über die, die fallen.
        r.style.zIndex = dy > 0 ? 3 : 2;
        r.animate([{transform:'translateY(' + dy + 'px)'}, {transform:'none'}],
          {duration:620, delay:frisch ? Math.min(k++, 6) * 45 : 0, easing:'cubic-bezier(.25,.8,.25,1)', fill:'backwards'})
          .finished.then(function(){ r.style.zIndex = ''; }, function(){});
      });
    }

    // „+4 Partien" neben dem Verbindungspunkt: wie viel seit dem Stand dazu
    // kam. Ohne neue Partie steht nichts da.
    function neuePartien(d){
      var pill = document.querySelector('.conn-pill');
      var alt = pill.querySelector('.neu-plus'); if(alt) alt.remove();
      if(d <= 0) return;
      var b = document.createElement('b'); b.className = 'neu-plus num';
      b.textContent = '+' + d + (d === 1 ? ' Partie' : ' Partien');
      pill.appendChild(b);
    }

    // ── 4 · Reiter: Schlitten, Einfahrt, Überbrückung ───────────────
    // Die Pille in der unteren Leiste fährt zum gewählten Reiter, wie der
    // Schlitten im Segmentwähler [§C27], statt an der neuen Stelle neu zu
    // erscheinen. Die Ansicht kommt aus der Richtung des Reiters.
    var schlitten = document.createElement('i'); schlitten.className = 'neu-schlitten'; schlitten.setAttribute('aria-hidden', 'true');
    function schlittenSetzen(tabJetzt){
      var nav = document.getElementById('botnav');
      if(!nav.firstElementChild || S.ohne.indexOf('schlitten') >= 0) return;
      if(schlitten.parentNode !== nav) nav.appendChild(schlitten);
      // Die Lage steht als transform am Schlitten selbst. Eine vererbte
      // Variable an der Leiste (`--ni`) ließ jedes Kind der Leiste seinen
      // Stil neu rechnen, bei jedem Wechsel.
      // Gerechnet wird aus der Breite des Fensters (die Leiste ist höchstens
      // 520 px breit, fünf Knöpfe, 2 px Abstand), nicht aus der Lage der
      // Knöpfe: `offsetLeft` und `clientWidth` erzwangen bei jedem Wechsel
      // ein Layout, `innerWidth` nicht. In Pixeln,
      // nicht in Prozent: eine Bewegung mit Prozentwerten lief gemessen in
      // jedem Bild über den Hauptthread.
      var i = NAV_IDS.indexOf(tabJetzt);
      if(i < 0){ schlitten.style.opacity = '0'; return; }
      schlitten.style.opacity = '';
      var schritt = (Math.min(innerWidth, 520) - 28) / 5 + 2;
      var ziel = 'translateX(' + (i * schritt).toFixed(1) + 'px)', alt = schlitten.style.transform;
      if(alt === ziel) return;
      schlitten.style.transform = ziel;
      if(alt && !still()) schlitten.animate([{transform:alt}, {transform:ziel}], {duration:360, easing:'cubic-bezier(.3,1.25,.5,1)'});
    }
    // Die Ladelinie unter der Kopfleiste: sie erscheint erst, wenn das
    // Zeichnen länger dauert als ein Augenblick (120 ms), und läuft auf dem
    // Compositor — auch dann noch, wenn das Rechnen den Hauptthread hält.
    var linie = document.createElement('i'); linie.className = 'neu-ladelinie'; linie.setAttribute('aria-hidden', 'true');
    document.querySelector('.appbar').appendChild(linie);
    // Sie hat zwei Gründe zu laufen — ein Reiter rechnet, oder Daten kommen
    // — und endet erst, wenn keiner mehr gilt. Das Ende der Daten meldet die
    // App selbst (`setConn`), auch dann, wenn nichts Neues kam und deshalb
    // nicht neu gezeichnet wird.
    var linienLauf = null, gruende = {};
    function ladeStart(grund){
      gruende[grund] = true;
      if(linienLauf || S.ohne.indexOf('linie') >= 0) return;
      linienLauf = linie.animate([{transform:'scaleX(0)', opacity:1}, {transform:'scaleX(.88)', opacity:1}],
        {duration:2400, delay:120, easing:'cubic-bezier(.08,.7,.2,1)', fill:'both'});
    }
    function ladeEnde(grund){
      delete gruende[grund];
      if(!linienLauf || Object.keys(gruende).length) return;
      var lauf = linienLauf; linienLauf = null;
      var t = lauf.currentTime || 0, sichtbar = t > 120;
      lauf.cancel();
      if(!sichtbar || still()) return;
      linie.animate([{transform:'scaleX(.88)', opacity:1}, {transform:'scaleX(1)', opacity:1, offset:.5}, {transform:'scaleX(1)', opacity:0}],
        {duration:320, easing:'ease-out'});
    }
    // Der Schleier: eine feste, einfarbige Fläche in der Farbe des Grunds
    // zwischen Kopfleiste und unterer Leiste. Er dunkelt den alten Reiter ab,
    // während der neue rechnet, und hebt sich über dem neuen. Gemessen
    // kostete es je Wechsel spürbar Zeit, die ganze Ansicht zu verblassen
    // oder zu verschieben: sie bekam dafür eine eigene Ebene und gab sie
    // danach wieder ab. Eine einfarbige Ebene, die immer da ist, muss der
    // Browser nicht rastern.
    var schleier = document.createElement('i'); schleier.className = 'neu-schleier'; schleier.setAttribute('aria-hidden', 'true');
    document.getElementById('app').appendChild(schleier);
    var richtung = 0, dunkel = null;
    var rni0 = K('_renderNachEingabe');
    K('_renderNachEingabe = ' + function(){
      var root = document.getElementById('main'), vorher = root._renderTab;
      window.__entwurfReiter(vorher, tab);
      return window.__rni0.apply(this, arguments);
    }.toString() + '; 0');
    window.__rni0 = rni0;
    window.__entwurfReiter = function(vorher, nach){
      if(!vorher || vorher === nach) return;
      var a = NAV_IDS.indexOf(vorher), b = NAV_IDS.indexOf(nach);
      richtung = a < 0 || b < 0 ? 0 : (b > a ? 1 : -1);
      // Gesteuert über die Animation selbst, nicht über eine Klasse: eine
      // Klasse am Wurzelknoten prüfte jeden Knoten der Seite neu.
      if(S.ohne.indexOf('dimm') < 0 && !dunkel && !still())
        dunkel = schleier.animate([{opacity:0}, {opacity:.6}], {duration:180, delay:90, easing:'ease', fill:'forwards'});
      ladeStart('reiter');
    };
    // Auch der Druck auf den schon gewählten Liga-Knopf lädt; heute sieht
    // man davon nur den Punkt oben links.
    var la0 = K('_ligaAktualisieren');
    window.__la0 = la0;
    K('_ligaAktualisieren = function(){ window.__entwurfLaden(); return window.__la0.apply(this, arguments); }; 0');
    window.__entwurfLaden = function(){ ladeStart('daten'); };
    var sc0 = K('setConn'); window.__sc0 = sc0;
    K('setConn = function(t, c){ const e = window.__sc0.apply(this, arguments); window.__entwurfConn && window.__entwurfConn(c); return e; }; 0');
    window.__entwurfConn = function(c){ if(c === 'load') ladeStart('daten'); else ladeEnde('daten'); };

    // ── Der Haken an render ─────────────────────────────────────────
    var r0 = K('render');
    window.__r0 = r0;
    var letzteN = null, basis = null, basisN = null;
    // Die App reicht Reiter, Partienzahl und Datenversion mit; ein `eval`
    // je Wert kostete bei jedem Zeichnen messbar Zeit.
    window.__entwurfRender = function(vorAufruf, nachTab, n, version){
      var root = main, warTab = root._renderTab, warVersion = root._renderVersion, warKnoten = root.firstElementChild;
      var tabWechsel = !!warTab && warTab !== nachTab;
      var erstesBild = !warTab;
      var alt = null, neuePartie = false;
      if(!tabWechsel && !erstesBild && nachTab === 'ranking' && warVersion !== version){
        // Der Aufbau läuft noch: er endet hier, damit die Zeilen von ihrem
        // wirklichen Platz aus gleiten und nicht zweimal einfahren.
        aufbauEnde();
        alt = lage();
        if(letzteN != null && n !== letzteN){ neuePartie = true; basis = alt; basisN = letzteN; }
      }
      if(tabWechsel){ basis = null; neuePartien(0); }
      vorAufruf();
      letzteN = n;
      var von = 0;
      // Wie dunkel er schon ist, sagt die Animation selbst; getComputedStyle
      // erzwänge hier, direkt nach dem Zeichnen, eine Stilberechnung.
      if(dunkel){ von = .6 * ((dunkel.effect.getComputedTiming().progress) || 0); dunkel.cancel(); dunkel = null; }
      var view = root.firstElementChild, neuGezeichnet = view !== warKnoten;
      ladeEnde('reiter');
      if(erstesBild){
        // Das Gerüst geht nicht einfach weg: es liegt noch einen Augenblick
        // über der Liga und blendet aus, während die Zeilen darunter
        // einfahren — sonst stünde zwischen beiden ein leeres Bild.
        if(warKnoten && warKnoten.classList.contains('geruest') && !still() && S.fall !== 'kurz'){
          warKnoten.classList.add('g-weg'); main.appendChild(warKnoten);
          warKnoten.animate([{opacity:1}, {opacity:0}], {duration:320, easing:'ease-out', fill:'forwards'})
            .finished.then(function(){ warKnoten.remove(); }, function(){ warKnoten.remove(); });
        }
        aufbau(view); return;
      }
      if(tabWechsel){
        if(!still() && S.ohne.indexOf('rein') < 0)
          schleier.animate([{opacity:Math.max(.55, von)}, {opacity:0}], {duration:240, easing:'ease-out'});
        return;
      }
      if(alt && neuGezeichnet) bewegen(alt, neuePartie);
      if(basis && nachTab === 'ranking' && neuGezeichnet) marken(basis, neuePartie);
      if(neuePartie) neuePartien(n - basisN);
    };
    K('render = function(){ let e; window.__entwurfRender(() => { e = window.__r0.apply(this, arguments); }, tab, matches.length, _cache.version); return e; }; 0');
    var rn0 = K('renderNav'); window.__rn0 = rn0;
    K('renderNav = function(){ const e = window.__rn0.apply(this, arguments); window.__entwurfNav && window.__entwurfNav(tab); return e; }; 0');
    window.__entwurfNav = schlittenSetzen;

    // ── 5 · Neuigkeiten: einmal kurz, wenn es welche gibt ─────────────
    // Die Pille „News" erscheint heute unvermittelt, sobald der Feed
    // geladen ist. Hier blendet sie ein; kommt der Hinweis „x neue Stories",
    // geht von der Pille einmal ein Ring aus, zweimal hintereinander, und
    // die Zahl springt auf. Kein Dauerleuchten: danach ist sie still.
    var btn = document.getElementById('newsBtn'), badge = document.getElementById('newsBtnBadge'), toast = document.getElementById('newsToast');
    var btnDa = false;
    new MutationObserver(function(){
      if(btnDa || btn.style.visibility !== 'visible') return;
      btnDa = true;
      if(!still()) btn.animate([{opacity:0, transform:'scale(.85)'}, {opacity:1, transform:'none'}], {duration:360, easing:'cubic-bezier(.3,1.4,.5,1)'});
    }).observe(btn, {attributes:true, attributeFilter:['style']});
    new MutationObserver(function(){
      if(!toast.classList.contains('show')) return;
      btn.classList.remove('neu-ruf'); void btn.offsetWidth; btn.classList.add('neu-ruf');
      badge.classList.add('neu-pop');
      setTimeout(function(){ btn.classList.remove('neu-ruf'); badge.classList.remove('neu-pop'); }, 2400);
    }).observe(toast, {attributes:true, attributeFilter:['class']});

    // ── 6 · Blätter: gestaffelt herein, verdeckt still ───────────────
    var sheet = document.getElementById('sheet');
    var unterBlatt = [];
    var endlos = function(a){ var t = a.effect && a.effect.getTiming && a.effect.getTiming(); return t && t.iterations === Infinity; };
    // Was ein Blatt verdeckt, steht still: die Hauptansicht liegt hinter
    // dem Vorhang mit Unschärfe, und jedes Bild einer Bewegung dort rechnet
    // die Unschärfe neu. Pausiert wird über die Animationen selbst, nicht
    // über eine Klasse — eine Klasse am Wurzelknoten rechnete den Stil
    // aller Knoten der Ansicht neu, genau in dem Moment, in dem das Blatt
    // hereinfährt.
    function verdecken(an){
      if(an){
        unterBlatt = document.getAnimations().filter(function(a){
          var t = a.effect && a.effect.target;
          return t && a.playState === 'running' && endlos(a) && (main.contains(t) || t.closest('.appbar, .botnav'));
        });
        unterBlatt.forEach(function(a){ a.pause(); });
      } else {
        unterBlatt.forEach(function(a){ try { a.play(); } catch(e){} });
        unterBlatt = [];
      }
    }
    // Im Blatt läuft nur, was im Bild ist. Das Profil trug gemessen
    // fünfzehn Endlosbewegungen, elf davon außerhalb des sichtbaren Teils.
    // Beobachtet werden die Abschnitte, nicht die Bewegungen: die Lichtläufe
    // weiter unten entstehen erst, wenn der Browser den Abschnitt rechnet
    // (content-visibility), und ein einmaliger Blick beim Öffnen fände sie
    // nicht. Was später in einem verdeckten Abschnitt anläuft, fängt
    // `animationstart` ab. Pausiert werden NUR Endlosbewegungen: ein
    // Einblenden, das erst beim Hinscrollen liefe, wäre genau der Effekt,
    // der auf dem Telefon beim Scrollen schlecht aussah.
    var BLOCK = '.pp-sec, .pp-header, .chron-one, .nf-card, .card';
    var sicht = new WeakMap(), io = null;
    function blockVon(el){ return el && el.closest ? el.closest(BLOCK) : null; }
    function blockSetzen(b, an){
      sicht.set(b, an);
      b.getAnimations({subtree:true}).filter(endlos).forEach(function(a){
        if(an){ if(a.playState === 'paused') a.play(); } else if(a.playState === 'running') a.pause();
      });
    }
    function blattRuhe(){
      if(io) io.disconnect();
      if(!('IntersectionObserver' in window)) return;
      io = new IntersectionObserver(function(es){
        es.forEach(function(e){ blockSetzen(e.target, e.isIntersecting); });
      }, {root:sheet, rootMargin:'80px 0px'});
      sheet.querySelectorAll(BLOCK).forEach(function(b){ io.observe(b); });
    }
    sheet.addEventListener('animationstart', function(e){
      var b = blockVon(e.target);
      if(!b || sicht.get(b) !== false) return;
      // Ohne `subtree` fehlen die Bewegungen der Pseudo-Elemente — und die
      // Lichtläufe sitzen genau dort (::after).
      e.target.getAnimations({subtree:true}).forEach(function(a){
        if(a.effect.target === e.target && a.animationName === e.animationName
          && (a.effect.pseudoElement || '') === (e.pseudoElement || '') && endlos(a)) a.pause();
      });
    }, true);
    // Gestaffelt herein: Blätter ohne eigene Choreografie blendeten heute
    // alles auf einmal ein. Hier kommen die ersten acht Teile nacheinander,
    // 45 ms auseinander. Das Profil hat seine eigene Folge und bleibt so.
    function staffeln(){
      if(still()) return;
      var kinder = [].filter.call(sheet.children, function(k){ return !k.classList.contains('sheet-leiste'); });
      if(kinder.length === 1 && !kinder[0].classList.contains('pp-root')){
        kinder[0].classList.add('neu-staffel');
        kinder = [].slice.call(kinder[0].children);
      } else if(kinder.length === 1) return;
      // Die Verzögerung direkt am Teil, nicht als vererbte Variable (siehe
      // Aufbau).
      kinder.slice(0, 8).forEach(function(k, i){ k.classList.add('neu-k'); k.style.animationDelay = (i * 45) + 'ms'; });
    }
    var offen = false, planTimer = 0;
    new MutationObserver(function(){
      var jetzt = sheet.classList.contains('show');
      if(jetzt === offen) return;
      offen = jetzt;
      verdecken(jetzt);
      if(!jetzt && io){ io.disconnect(); io = null; }
    }).observe(sheet, {attributes:true, attributeFilter:['class']});
    new MutationObserver(function(){
      if(!sheet.firstElementChild) return;
      staffeln();
      clearTimeout(planTimer);
      planTimer = setTimeout(blattRuhe, 0);
    }).observe(sheet, {childList:true});

    // Story und Auszeichnung schließen nur ihren Vorhang; der Inhalt blieb
    // bisher stehen, unsichtbar, mit allem, was darin läuft. Nach dem
    // Ausblenden wird er geleert, wie das Blatt es schon tut.
    [['ndBg', 'nd'], ['bpBg', 'bp']].forEach(function(p){
      var bg = document.getElementById(p[0]), inh = document.getElementById(p[1]);
      new MutationObserver(function(){
        if(bg.classList.contains('show')) return;
        setTimeout(function(){ if(!bg.classList.contains('show')) inh.innerHTML = ''; }, 260);
      }).observe(bg, {attributes:true, attributeFilter:['class']});
    });
  };
})();
