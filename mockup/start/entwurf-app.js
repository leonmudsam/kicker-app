// Der Entwurf für Öffnen, Reiter und Blätter. Läuft nur unter #neu, nach
// dem Code der App: `__entwurfStartbild` setzt das Startbild, solange das
// Telefon das Skript übersetzt, `__entwurf` hängt sich danach an fünf
// Stellen der App — render, renderNav, _renderNachEingabe, setConn,
// _ligaAktualisieren — und an die Klassen von Blatt, Story und Popover. Beim
// Einbau stünde jeder Teil in der Datei, die diese Stelle besitzt; hier
// steht er beisammen, damit man ihn sieht.
//
// Die Regeln, die jeder Teil befolgt:
//  · nie warten: keine Bewegung hält eine Antwort auf; was gezeigt werden
//    kann, steht da, und die Bewegung läuft darüber;
//  · abbrechbar: jede Berührung beendet die Vorführung, alles steht sofort;
//  · einmal: das Podest glänzt beim ersten Betreten eines Reiters in der
//    Sitzung, nicht bei jedem;
//  · nur, was man sieht: was verdeckt oder außerhalb liegt, steht still;
//  · nur transform und opacity, auf Ebenen, die bleiben, ohne Messen des
//    Layouts mitten im ersten Bild und ohne vererbte Variablen.
(function(){
  var S = window.__SIM;
  var html = document.documentElement;
  var still = function(){ return html.classList.contains('ruhe') || matchMedia('(prefers-reduced-motion: reduce)').matches; };

  // ── 1 · Das Startbild ───────────────────────────────────────────────
  // Beim Einbau festes Markup in src/index.html: es steht im ersten Bild,
  // bevor das Skript übersetzt ist. Heute ist dort nur der Grund zu sehen —
  // auf einem Mittelklasse-Telefon rund eine halbe Sekunde lang. Das Zeichen
  // der Liga, ihr Name und eine Spur, in der ein Licht läuft: es lädt.
  window.__entwurfStartbild = function(){
    if(S.art !== 'neu') return;
    html.classList.add('neu', 'startbild');
    var img = document.querySelector('.logo-mark img');
    var sb = document.createElement('div');
    sb.className = 'neu-start'; sb.id = 'neuStart'; sb.setAttribute('aria-hidden', 'true');
    sb.innerHTML = '<i class="ns-grund"></i><div class="ns-mitte">'
      + '<span class="ns-logo"><img src="' + (img ? img.getAttribute('src') : '') + '" alt="">'
      + '<span class="neu-kante kreis acid innen" style="--kd:130px"><i></i></span></span>'
      + '<b class="ns-name">Kicker Liga</b><span class="ns-unter">Elo · 2v2</span>'
      + '<span class="ns-spur"><i></i></span></div>';
    document.body.appendChild(sb);
  };

  window.__entwurf = function(){
    if(S.art !== 'neu') return;
    var K = window.__k.eval;
    var main = document.getElementById('main');
    var NAV_IDS = ['ranking', 'positions', 'awards', 'teams', 'history'];

    // ── 2 · Das Gerüst ──────────────────────────────────────────────
    // Wenn das Skript bereit ist, aber noch nichts gezeichnet werden kann
    // (erster Start, nichts gespeichert), steht die Form der Liga da, mit
    // einem Lichtband darüber. Jedes Kästchen trägt die Klasse `gk`: eine
    // Regel mit einem Tag ganz rechts (`.geruest i`) prüfte der Browser bei
    // jedem <i> der App.
    var k = function(c){ return '<i class="gk' + (c ? ' ' + c : '') + '"></i>'; };
    var gz = function(erste){ return '<div class="g-zeile' + (erste ? ' g-erste' : '') + '">' + k('g-pos') + k('g-av')
      + '<span class="g-mid">' + k('g-m1') + k('g-m2') + k('g-m3') + '</span>' + k('g-wert') + '</div>'; };
    main.innerHTML = '<section class="view active geruest" aria-busy="true" aria-label="Die Liga lädt">'
      + '<div class="g-kopf">' + k('g-h') + k('g-s') + '</div>'
      + '<div class="g-switch">' + k('g-sw') + '</div><div class="g-lauf"></div><div class="g-wahl">' + k('g-w1') + k('g-w') + k('g-w') + '</div>'
      + '<div class="g-tabs">' + k('g-t') + k('g-t') + '</div>'
      + '<div class="g-liste">' + gz(true) + gz() + gz() + gz() + gz() + gz() + '</div></section>';
    K('renderNav(); 0');

    // ── 3 · Startbild geht, die App baut sich auf ────────────────────
    // Ist die Liga in einem Augenblick gezeichnet (der Stand des Geräts),
    // fliegt das Zeichen an seinen Platz in der Kopfleiste, und darunter
    // baut sich alles auf. Dauert es länger (erster Start), geht das
    // Startbild nach 280 ms ins Gerüst über, und die Liga baut sich auf,
    // sobald sie kommt. „Gerade erst offen" blendet nur kurz über.
    var startbildTimer = setTimeout(function(){ startbildTimer = 0; startbildEnde(false); }, 280);
    var aufbauTimer = 0;
    function startbildEnde(mitInhalt){
      var sb = document.getElementById('neuStart');
      if(!sb) return;
      var ruhig = still() || S.fall === 'kurz';
      var weg = function(){ sb.remove(); html.classList.remove('startbild'); };
      if(ruhig){
        if(still()) return weg();
        sb.animate([{opacity:1}, {opacity:0}], {duration:180, easing:'ease-out', fill:'forwards'}).finished.then(weg, weg);
        return;
      }
      // Das Zeichen fliegt dorthin, wo es in der Kopfleiste steht: zwei
      // Messungen, einmal. Der Grund blendet aus, Name und Spur zuerst.
      var logo = sb.querySelector('.ns-logo'), ziel = document.querySelector('.logo-mark');
      var a = logo.getBoundingClientRect(), b = ziel.getBoundingClientRect();
      var dx = (b.left + b.width / 2) - (a.left + a.width / 2), dy = (b.top + b.height / 2) - (a.top + a.height / 2);
      logo.animate([{transform:'none'}, {transform:'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + (b.width / a.width).toFixed(3) + ')'}],
        {duration:480, easing:'cubic-bezier(.65,0,.25,1)', fill:'forwards'}).finished
        .then(function(){ weg(); kante(ziel, 'acid innen', 'zeichnen', 0, 60); }, weg);
      // „Match eintragen" dreht sich zuletzt herein; dann läuft einmal
      // Licht um ihn: bereit.
      kante(document.getElementById('fab'), 'weiss', 'zeichnen', 1150, 90);
      sb.querySelectorAll('.ns-name, .ns-unter, .ns-spur').forEach(function(e){
        e.animate([{opacity:1}, {opacity:0, transform:'translateY(6px)'}], {duration:150, easing:'ease-in', fill:'forwards'});
      });
      sb.querySelector('.ns-grund').animate([{opacity:1}, {opacity:0}], {duration:300, delay:60, easing:'ease-out', fill:'forwards'});
      // Kopfleiste und untere Leiste bauen sich auf: einmal, über eine
      // Klasse am Wurzelknoten — beim Öffnen, nicht bei jedem Wechsel.
      html.classList.add('aufbau');
      aufbauTimer = setTimeout(function(){ html.classList.remove('aufbau'); }, 1700);
    }

    // ── 4 · Karten, Zeilen und Wähler bauen sich auf ─────────────────
    // Eine Ansicht kommt in Teilen: Überschrift, Wähler, dann die Karten
    // und Zeilen, 30 bis 40 ms auseinander. Höchstens vierzehn Teile, und
    // die Verzögerung steht an jedem Teil selbst (eine vererbte Variable
    // ließe jeden Knoten darunter seinen Stil neu rechnen, samt Wappen).
    // Gemessen wird nichts: welche Teile im Bild stehen, sagt die Reihenfolge.
    // Beim Betreten eines Reiters stehen Überschrift, Wähler und Suche sofort
    // da; nur Karten und Zeilen kommen nacheinander. Kam auch der Kopf aus
    // dem Nichts, stand zwischen altem und neuem Reiter ein leeres Bild.
    var LISTE = '.rlist, .mlist, .podest, .aw-vitrine';
    var KOPF = '.view-head, .ui-switch, .ui-tabs, .saisonwahl, .lauf, .search, .einblick, .mini-label';
    function aufbauen(view, start, schritt, hoechstens, ohneKopf){
      if(!view || still()) return;
      var teile = [];
      [].forEach.call(view.children, function(kind){
        if(teile.length >= hoechstens || (ohneKopf && kind.matches(KOPF))) return;
        var liste = kind.matches(LISTE) ? kind
          : (kind.children.length === 1 && kind.firstElementChild.matches(LISTE) ? kind.firstElementChild : null);
        if(liste) [].slice.call(liste.children, 0, 7).forEach(function(z){ teile.push(z); });
        else teile.push(kind);
      });
      teile.slice(0, hoechstens).forEach(function(t, i){
        t.classList.add('bau'); t.style.animationDelay = (start + i * schritt) + 'ms';
      });
    }

    // ── 5 · Das Podest glänzt ────────────────────────────────────────
    // Einmal je Reiter und Sitzung zieht ein Licht über Platz 1, 2 und 3,
    // in ihrem Metall: Gold, Silber, Bronze [§C25]. In der Liga und in den
    // Positionen über die drei ersten Zeilen, bei den Duos ebenso, bei den
    // Awards über das Podest.
    var GLANZ = {
      ranking:'.rlist > .rrow.top1, .rlist > .rrow.top2, .rlist > .rrow.top3',
      positions:'.rlist > .rrow.top1, .rlist > .rrow.top2, .rlist > .rrow.top3',
      teams:'.rlist > .rrow.tm-top',
      awards:'.podest > .pod-karte'
    };
    var METALL = ['gold', 'silber', 'bronze'];
    var glanzDa = {};
    function licht(ziel, ton, verzug){
      var s = document.createElement('span');
      s.className = 'neu-glanz ' + ton; s.setAttribute('aria-hidden', 'true');
      s.innerHTML = '<i style="animation-delay:' + verzug + 'ms"></i>';
      ziel.appendChild(s);
      setTimeout(function(){ s.remove(); }, verzug + 1300);
    }
    // ── Das Kantenlicht [§C27] ──────────────────────────────────────
    // Dasselbe Bauteil wie das Licht am Rand des Profilkopfs: ein Ring aus
    // einer Maske, darin ein Kegel aus Licht, der sich dreht — die Linie
    // fährt die Kante ab. Es hat drei Bedeutungen und keine vierte [§C41]:
    //   zeichnen  einmal herum, dann leuchtet der Rahmen kurz auf: eine
    //             Karte, die zählt, ist angekommen;
    //   hinweis   zweimal herum: hier ist etwas neu;
    //   kreis     solange es dauert: es lädt (im Profilkopf: es läuft).
    // Der Kegel ist so groß wie die Diagonale der Karte (--kd), nicht wie im
    // Profil 1400 px: eine gedrehte Ebene dieser Größe kostet bei dreifacher
    // Pixeldichte ein Vielfaches an Speicher. Die Größe gibt der Aufrufer
    // mit, gemessen wird nichts.
    var KANTE_MS = {zeichnen:1250, hinweis:1900};
    function kante(ziel, ton, art, verzug, d){
      if(!ziel || still()) return;
      var k = document.createElement('span');
      k.className = 'neu-kante ' + art + ' ' + ton; k.setAttribute('aria-hidden', 'true');
      k.style.cssText = '--kd:' + d + 'px;--kv:' + verzug + 'ms';
      k.innerHTML = '<i></i>';
      ziel.appendChild(k);
      setTimeout(function(){ k.remove(); }, verzug + (KANTE_MS[art] || 1300) + 120);
    }
    function podest(view, reiter, start){
      if(!view || still() || glanzDa[reiter]) return;
      // Im Verlauf ist es die letzte Partie, die ankommt — kein Podest.
      if(reiter === 'history'){
        glanzDa[reiter] = true;
        kante(view.querySelector('.mlist > .mrow'), 'acid', 'zeichnen', start, 420);
        return;
      }
      if(!GLANZ[reiter]) return;
      glanzDa[reiter] = true;
      // Das Metall sagt die Klasse (top1, gold …); die Duos tragen nur
      // „tm-top", dort sagt es die Reihenfolge.
      [].slice.call(view.querySelectorAll(GLANZ[reiter]), 0, 3).forEach(function(z, i){
        var ton = /top1|gold/.test(z.className) ? 'gold' : /top2|silber/.test(z.className) ? 'silber'
          : /top3|bronze/.test(z.className) ? 'bronze' : METALL[i];
        var v = start + ({gold:0, silber:140, bronze:280})[ton];
        // Erst fährt das Licht die Kante ab und schließt den Rahmen; über
        // Gold zieht danach noch das Band — der Titel [§C25].
        kante(z, ton, 'zeichnen', v, reiter === 'awards' ? 250 : 400);
        if(ton === 'gold') licht(z, 'gold', v + 820);
      });
    }

    // Wer tippt, wischt oder scrollt, will etwas Bestimmtes: die Vorführung
    // endet sofort, und alles steht, wo es hingehört.
    function vorfuehrungEnde(){
      var sb = document.getElementById('neuStart');
      if(sb){ sb.getAnimations({subtree:true}).forEach(function(a){ a.finish(); }); sb.remove(); html.classList.remove('startbild'); }
      html.classList.remove('aufbau');
      main.querySelectorAll('.bau').forEach(function(t){ t.classList.remove('bau'); });
      document.querySelectorAll('.neu-glanz, .neu-kante').forEach(function(s){ s.remove(); });
    }
    ['pointerdown', 'wheel', 'touchstart', 'keydown'].forEach(function(ev){
      addEventListener(ev, vorfuehrungEnde, {passive:true, capture:true});
    });

    // ── 6 · Reiter: Schlitten, Ladelinie, Schleier ───────────────────
    // Die Pille in der unteren Leiste fährt zum gewählten Reiter, wie der
    // Schlitten im Segmentwähler [§C27], und antwortet damit sofort — auch
    // während der neue Reiter noch rechnet: sie wird nur verschoben, das
    // kann der Compositor ohne den Hauptthread.
    var schlitten = document.createElement('i'); schlitten.className = 'neu-schlitten'; schlitten.setAttribute('aria-hidden', 'true');
    function schlittenSetzen(tabJetzt){
      var nav = document.getElementById('botnav');
      if(!nav.firstElementChild || S.ohne.indexOf('schlitten') >= 0) return;
      if(schlitten.parentNode !== nav) nav.appendChild(schlitten);
      // Die Lage steht als transform am Schlitten selbst, gerechnet aus der
      // Breite des Fensters (die Leiste ist höchstens 520 px breit, fünf
      // Knöpfe, 2 px Abstand) und in Pixeln. Eine vererbte Variable an der
      // Leiste, `offsetLeft`, `clientWidth` und Prozente kosteten gemessen
      // bei jedem Wechsel Zeit.
      var i = NAV_IDS.indexOf(tabJetzt);
      if(i < 0){ schlitten.style.opacity = '0'; return; }
      schlitten.style.opacity = '';
      var schritt = (Math.min(innerWidth, 520) - 28) / 5 + 2;
      var ziel = 'translateX(' + (i * schritt).toFixed(1) + 'px)', alt = schlitten.style.transform;
      if(alt === ziel) return;
      schlitten.style.transform = ziel;
      if(alt && !still()) schlitten.animate([{transform:alt}, {transform:ziel}], {duration:360, easing:'cubic-bezier(.3,1.25,.5,1)'});
    }
    // Die Ladelinie unter der Kopfleiste: solange Daten kommen oder ein
    // Reiter rechnet, erst nach 120 ms, auf dem Compositor. Sie endet, wenn
    // kein Grund mehr gilt; das Ende der Daten meldet die App (`setConn`).
    var linie = document.createElement('i'); linie.className = 'neu-ladelinie'; linie.setAttribute('aria-hidden', 'true');
    document.querySelector('.appbar').appendChild(linie);
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
    // Der Schleier: eine feste, einfarbige Fläche, die immer da ist. Rechnet
    // ein Reiter länger als 90 ms, dunkelt er den alten ab; der neue baut
    // sich darunter auf, und er hebt sich. Eine einfarbige Ebene muss der
    // Browser nicht rastern.
    var schleier = document.createElement('i'); schleier.className = 'neu-schleier'; schleier.setAttribute('aria-hidden', 'true');
    document.getElementById('app').appendChild(schleier);
    var dunkel = null;
    window.__rni0 = K('_renderNachEingabe');
    K('_renderNachEingabe = ' + function(){
      var root = document.getElementById('main'), vorher = root._renderTab;
      window.__entwurfReiter(vorher, tab);
      return window.__rni0.apply(this, arguments);
    }.toString() + '; 0');
    window.__entwurfReiter = function(vorher, nach){
      if(!vorher || vorher === nach) return;
      if(S.ohne.indexOf('dimm') < 0 && !dunkel && !still())
        dunkel = schleier.animate([{opacity:0}, {opacity:.6}], {duration:180, delay:90, easing:'ease', fill:'forwards'});
      ladeStart('reiter');
    };
    window.__la0 = K('_ligaAktualisieren');
    K('_ligaAktualisieren = function(){ window.__entwurfLaden(); return window.__la0.apply(this, arguments); }; 0');
    window.__entwurfLaden = function(){ ladeStart('daten'); };
    window.__sc0 = K('setConn');
    K('setConn = function(t, c){ const e = window.__sc0.apply(this, arguments); window.__entwurfConn && window.__entwurfConn(c); return e; }; 0');
    window.__entwurfConn = function(c){ if(c === 'load') ladeStart('daten'); else ladeEnde('daten'); };

    // ── Der Haken an render ─────────────────────────────────────────
    // Ein Wechsel des Zeitraums oder neue Daten im selben Reiter bauen
    // nichts neu auf: das sah wie ein Neustart aus (01-shell.css). Bewegung
    // gibt es beim Öffnen und beim Betreten eines Reiters.
    window.__r0 = K('render');
    window.__entwurfRender = function(vorAufruf, nachTab){
      var warTab = main._renderTab, warKnoten = main.firstElementChild;
      var tabWechsel = !!warTab && warTab !== nachTab, erstesBild = !warTab;
      vorAufruf();
      var von = 0;
      // Wie dunkel er schon ist, sagt die Animation selbst; getComputedStyle
      // erzwänge hier, direkt nach dem Zeichnen, eine Stilberechnung.
      if(dunkel){ von = .6 * (dunkel.effect.getComputedTiming().progress || 0); dunkel.cancel(); dunkel = null; }
      var view = main.firstElementChild;
      ladeEnde('reiter');
      if(erstesBild){
        var ausStartbild = !!startbildTimer;
        if(startbildTimer){ clearTimeout(startbildTimer); startbildTimer = 0; startbildEnde(true); }
        else if(warKnoten && warKnoten.classList.contains('geruest') && !still()){
          // Das Gerüst liegt noch einen Augenblick über der Liga und blendet
          // aus, während sie sich darunter aufbaut.
          warKnoten.classList.add('g-weg'); main.appendChild(warKnoten);
          warKnoten.animate([{opacity:1}, {opacity:0}], {duration:320, easing:'ease-out', fill:'forwards'})
            .finished.then(function(){ warKnoten.remove(); }, function(){ warKnoten.remove(); });
        }
        if(S.fall === 'kurz') return;
        aufbauen(view, ausStartbild ? 90 : 40, 40, 14);
        podest(view, nachTab, ausStartbild ? 700 : 640);
        return;
      }
      if(tabWechsel){
        if(von > .04 && !still()) schleier.animate([{opacity:von}, {opacity:0}], {duration:200, easing:'ease-out'});
        aufbauen(view, 0, 30, 8, true);
        podest(view, nachTab, 360);
      }
    };
    K('render = function(){ let e; window.__entwurfRender(() => { e = window.__r0.apply(this, arguments); }, tab); return e; }; 0');
    window.__rn0 = K('renderNav');
    K('renderNav = function(){ const e = window.__rn0.apply(this, arguments); window.__entwurfNav && window.__entwurfNav(tab); return e; }; 0');
    window.__entwurfNav = schlittenSetzen;
    schlittenSetzen(K('tab'));

    // ── 7 · Neuigkeiten ──────────────────────────────────────────────
    // Die Pille „News" erscheint heute unvermittelt, sobald der Feed geladen
    // ist. Hier gleitet sie herein; gibt es Ungelesenes, zieht ein Licht
    // über sie. Kommt der Hinweis „x neue Stories", geht von ihr zweimal ein
    // Ring aus, und die Zahl springt auf. Danach ist sie still.
    var btn = document.getElementById('newsBtn'), badge = document.getElementById('newsBtnBadge'), toast = document.getElementById('newsToast');
    var btnDa = false;
    new MutationObserver(function(){
      if(btnDa || btn.style.visibility !== 'visible') return;
      btnDa = true;
      if(still()) return;
      btn.animate([{opacity:0, transform:'translateX(14px)'}, {opacity:1, transform:'none'}], {duration:380, easing:'cubic-bezier(.2,.8,.2,1)'});
      if(badge.style.display !== 'none') kante(btn, 'acid', 'hinweis', 200, 120);
    }).observe(btn, {attributes:true, attributeFilter:['style']});
    new MutationObserver(function(){
      if(!toast.classList.contains('show')) return;
      btn.classList.remove('neu-ruf'); void btn.offsetWidth; btn.classList.add('neu-ruf');
      kante(toast, 'acid', 'zeichnen', 80, 240);
      badge.classList.add('neu-pop');
      setTimeout(function(){ btn.classList.remove('neu-ruf'); badge.classList.remove('neu-pop'); }, 2400);
    }).observe(toast, {attributes:true, attributeFilter:['class']});

    // ── 8 · Blätter ──────────────────────────────────────────────────
    var sheet = document.getElementById('sheet');
    var unterBlatt = [];
    var endlos = function(a){ var t = a.effect && a.effect.getTiming && a.effect.getTiming(); return t && t.iterations === Infinity; };
    // Was ein Blatt verdeckt, steht still: die Hauptansicht liegt hinter
    // dem Vorhang mit Unschärfe, und jedes Bild einer Bewegung dort rechnet
    // die Unschärfe neu. Pausiert wird über die Animationen selbst.
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
    // Im Blatt läuft nur, was im Bild ist (das Profil trug gemessen fünfzehn
    // Endlosbewegungen, elf davon außerhalb). Beobachtet werden die
    // Abschnitte; was später in einem verdeckten Abschnitt anläuft, fängt
    // `animationstart` ab. Einblenden wird nie angehalten: es liefe sonst
    // erst beim Hinscrollen.
    var BLOCK = '.pp-sec, .pp-header, .chron-one, .nf-card, .card';
    var sicht = new WeakMap(), io = null;
    function blockSetzen(b, an){
      sicht.set(b, an);
      b.getAnimations({subtree:true}).filter(endlos).forEach(function(a){
        if(an){ if(a.playState === 'paused') a.play(); } else if(a.playState === 'running') a.pause();
      });
    }
    function blattRuhe(){
      if(io) io.disconnect();
      if(!('IntersectionObserver' in window)) return;
      io = new IntersectionObserver(function(es){ es.forEach(function(e){ blockSetzen(e.target, e.isIntersecting); }); },
        {root:sheet, rootMargin:'80px 0px'});
      sheet.querySelectorAll(BLOCK).forEach(function(b){ io.observe(b); });
    }
    sheet.addEventListener('animationstart', function(e){
      var b = e.target.closest && e.target.closest(BLOCK);
      if(!b || sicht.get(b) !== false) return;
      // Ohne `subtree` fehlen die Bewegungen der Pseudo-Elemente — und die
      // Lichtläufe sitzen genau dort (::after).
      e.target.getAnimations({subtree:true}).forEach(function(a){
        if(a.effect.target === e.target && a.animationName === e.animationName
          && (a.effect.pseudoElement || '') === (e.pseudoElement || '') && endlos(a)) a.pause();
      });
    }, true);
    // Gestaffelt herein: die ersten acht Teile eines Blatts nacheinander,
    // 45 ms auseinander; das Profil hat seine eigene Folge. Im Feed zieht
    // über jede ungelesene Story im Bild ein Licht in ihrer Farbe, eine nach
    // der anderen — das ist, was seit dem letzten Öffnen dazukam.
    function staffeln(){
      if(still()) return;
      var kinder = [].filter.call(sheet.children, function(k){ return !k.classList.contains('sheet-leiste'); });
      if(kinder.length === 1 && !kinder[0].classList.contains('pp-root')){
        kinder[0].classList.add('neu-staffel');
        kinder = [].slice.call(kinder[0].children);
      } else if(kinder.length === 1) return;
      kinder.slice(0, 8).forEach(function(k, i){ k.classList.add('neu-k'); k.style.animationDelay = (i * 45) + 'ms'; });
      [].slice.call(sheet.querySelectorAll('.nf-card'), 0, 6).filter(function(c){ return !c.classList.contains('read'); })
        .forEach(function(c, i){ kante(c, 'story', 'zeichnen', 320 + i * 150, 560); });
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

    // Öffnet eine Story oder eine Auszeichnung, fährt das Licht einmal ihre
    // Kante ab — in der Farbe der Story.
    [['ndBg', 'nd', 'story', 760], ['bpBg', 'bp', 'weiss', 700]].forEach(function(p){
      var bg = document.getElementById(p[0]), inh = document.getElementById(p[1]), war = false;
      new MutationObserver(function(){
        var jetzt = bg.classList.contains('show');
        if(jetzt && !war) kante(inh, p[2], 'zeichnen', 120, p[3]);
        war = jetzt;
      }).observe(bg, {attributes:true, attributeFilter:['class']});
    });
    // Steht die Verbindung zum ersten Mal, geht vom Punkt oben links zweimal
    // ein Ring aus: jetzt ist es der Stand von jetzt.
    var verbunden = false, punkt = document.getElementById('connDot');
    var conn0 = window.__entwurfConn;
    window.__entwurfConn = function(c){
      conn0(c);
      if(c !== 'ok' || verbunden || still()) return;
      verbunden = true;
      punkt.classList.add('neu-ping');
      setTimeout(function(){ punkt.classList.remove('neu-ping'); }, 2000);
    };

    // Story und Auszeichnung schließen nur ihren Vorhang; der Inhalt blieb
    // bisher unsichtbar stehen, mit allem, was darin läuft. Nach dem
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
