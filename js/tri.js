/* tri.js – Gesichtsausdrücke für Tri im Chat-Kopf.
   neutral: Standard · denken: Wegweiser rechnet · froh: Route gefunden · fehler: Raum unbekannt / Fehler
   Aufruf: CampusTri.zeige("froh") */
(function () {
  var KOERPER = '<path class="tri__koerper" d="M50 10 Q55 10 58 16 L89 74 Q93 82 84 82 H16 Q7 82 11 74 L42 16 Q45 10 50 10Z"/>';
  var WANGEN = '<ellipse class="tri__wange" cx="32" cy="66" rx="4" ry="2.5"/><ellipse class="tri__wange" cx="68" cy="66" rx="4" ry="2.5"/>';
  function augen(px, py) {
    return '<circle class="tri__auge" cx="40" cy="55" r="7"/><circle class="tri__auge" cx="60" cy="55" r="7"/>' +
      '<circle class="tri__pupille" cx="' + (41 + px) + '" cy="' + (56 + py) + '" r="3.5"/>' +
      '<circle class="tri__pupille" cx="' + (61 + px) + '" cy="' + (56 + py) + '" r="3.5"/>';
  }
  function arm(x1, y1, qx, qy, x2, y2) {
    return '<path class="tri__arm" d="M' + x1 + ' ' + y1 + ' Q' + qx + ' ' + qy + ' ' + x2 + ' ' + y2 + '"/>' +
      '<circle class="tri__hand" cx="' + x2 + '" cy="' + y2 + '" r="4.5"/>';
  }
  var FUESSE = '<ellipse class="tri__fuss" cx="38" cy="88" rx="6" ry="5"/><ellipse class="tri__fuss" cx="62" cy="88" rx="6" ry="5"/>';

  var AUSDRUECKE = {
    // Standard: mit Füßen, ohne Arme
    neutral: FUESSE + KOERPER + augen(0, 0),
    // Nachdenklich C: Kopf schief, kleiner Mund, Fragezeichen
    denken: '<g transform="rotate(-8 50 50)">' + FUESSE +
      KOERPER + WANGEN + augen(1, -3) +
      '<circle class="tri__strich" cx="50" cy="68" r="2.8"/></g>' +
      '<text class="tri__frage" x="80" y="16">?</text>',
    // Froh C: Arme hoch, Füße, springt
    froh: '<g class="tri--huepf">' + arm(26, 52, 16, 44, 10, 30) + arm(74, 52, 84, 44, 90, 30) + FUESSE + KOERPER + WANGEN +
      '<path class="tri__strich" d="M34 57 Q40 50 46 57"/><path class="tri__strich" d="M54 57 Q60 50 66 57"/>' +
      '<path class="tri__mund-voll" d="M42 64 Q50 76 58 64 Z"/></g>',
    // Fehler A: traurig, besorgte Brauen
    fehler: FUESSE + '<g class="tri--sinken">' +
      KOERPER + WANGEN + augen(0, 3) +
      '<path class="tri__strich" d="M33 46 Q38 45 45 40"/><path class="tri__strich" d="M67 46 Q62 45 55 40"/>' +
      '<path class="tri__lid" d="M33 52 Q40 46 47 52 Z"/><path class="tri__lid" d="M53 52 Q60 46 67 52 Z"/>' +
      '<path class="tri__strich" d="M43 72 Q50 65 57 72"/></g>'
  };

  var ziel = document.getElementById("tri-avatar");
  var zurueck = null;

  function zeige(name, dauerMs) {
    if (!ziel || !AUSDRUECKE[name]) return;
    clearTimeout(zurueck);
    ziel.setAttribute("data-ausdruck", name);
    ziel.innerHTML = '<svg viewBox="-12 -16 124 120" aria-hidden="true">' + AUSDRUECKE[name] + '</svg>';
    // froh und fehler gehen nach ein paar Sekunden zurück zu neutral
    if (dauerMs) zurueck = setTimeout(function () { zeige("neutral"); }, dauerMs);
  }

  zeige("neutral");
  window.CampusTri = { zeige: zeige };
})();
