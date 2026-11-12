/* Tour-Seite: Standort wählen und die Frage vorbereiten.
   Webhook und Unity werden erst angebunden, wenn die URLs in config.js stehen. */
(function () {
  var AVATAR_LABEL = "Mein aktueller Standort (Avatar)";
  var suche = document.getElementById("start-suche");
  var liste = document.getElementById("start-liste");
  var hinweis = document.getElementById("start-hinweis");
  var formular = document.getElementById("chat-form");
  var frageFeld = document.getElementById("frage");
  var verlauf = document.getElementById("chat-verlauf");
  var routeLeiste = document.getElementById("route-leiste");
  var routeZiel = document.getElementById("route-ziel");
  var routeInfo = document.getElementById("route-info");

  var optionen = [];
  var auswahl = { quelle: "avatar" };
  var avatarPosition = null;
  var offen = -1;

  suche.value = AVATAR_LABEL;

  function sessionId() {
    var key = "campus-session";
    var vorhandene = sessionStorage.getItem(key);
    if (vorhandene) return vorhandene;
    var neu = "tour-" + Date.now();
    sessionStorage.setItem(key, neu);
    return neu;
  }

  function norm(text) {
    return (text || "").toLocaleLowerCase("de").trim();
  }

  function gefiltert() {
    var suchtext = norm(suche.value);
    var avatarPassend = !suchtext || norm(AVATAR_LABEL).indexOf(suchtext) !== -1 || suchtext === norm(AVATAR_LABEL);
    var treffer = optionen.filter(function (option) {
      if (!suchtext || suchtext === norm(AVATAR_LABEL)) return true;
      return norm(option.label).indexOf(suchtext) !== -1 || norm(option.startId).indexOf(suchtext) !== -1;
    });
    return { avatar: avatarPassend, optionen: treffer };
  }

  function schliessen() {
    liste.hidden = true;
    liste.innerHTML = "";
    suche.setAttribute("aria-expanded", "false");
    offen = -1;
  }

  function oeffnen() {
    var ansicht = gefiltert();
    liste.innerHTML = "";
    if (ansicht.avatar) liste.appendChild(eintrag({ quelle: "avatar", label: AVATAR_LABEL }, 0));
    ansicht.optionen.forEach(function (option, index) {
      liste.appendChild(eintrag(option, (ansicht.avatar ? 1 : 0) + index));
    });
    if (!liste.children.length) {
      var leer = document.createElement("li");
      leer.className = "startwahl__option";
      leer.textContent = "Kein Standort gefunden";
      liste.appendChild(leer);
    }
    liste.hidden = false;
    suche.setAttribute("aria-expanded", "true");
    offen = -1;
  }

  function eintrag(option, index) {
    var punkt = document.createElement("li");
    punkt.setAttribute("role", "presentation");
    var knopf = document.createElement("button");
    knopf.type = "button";
    knopf.className = "startwahl__option";
    knopf.setAttribute("role", "option");
    knopf.setAttribute("data-index", String(index));
    knopf.textContent = option.label;
    knopf.addEventListener("click", function () {
      waehlen(option);
    });
    punkt.appendChild(knopf);
    return punkt;
  }

  function waehlen(option) {
    if (option.quelle === "avatar") {
      auswahl = { quelle: "avatar" };
      suche.value = AVATAR_LABEL;
    } else {
      auswahl = { quelle: "knoten", startId: option.startId, label: option.label };
      suche.value = option.label;
    }
    schliessen();
  }

  function nachricht(text, art) {
    var punkt = document.createElement("li");
    punkt.className = "nachricht nachricht--" + art;
    punkt.textContent = text;
    verlauf.appendChild(punkt);
    verlauf.scrollTop = verlauf.scrollHeight;
  }

  /* „Wegweiser tippt …“: drei hüpfende Punkte, solange n8n rechnet */
  function tipptAnzeigen() {
    var punkt = document.createElement("li");
    punkt.className = "nachricht nachricht--bot nachricht--tippt";
    punkt.innerHTML = '<span class="nur-screenreader">Wegweiser tippt …</span>' +
      '<span class="tippt__punkt" aria-hidden="true"></span>' +
      '<span class="tippt__punkt" aria-hidden="true"></span>' +
      '<span class="tippt__punkt" aria-hidden="true"></span>';
    verlauf.appendChild(punkt);
    verlauf.scrollTop = verlauf.scrollHeight;
    return punkt;
  }

  /* Icons für die Wegschritte (24×24, Linienstärke wie im Styleguide) */
  var SCHRITT_ICONS = {
    verlassen: '<path d="M6 21V4a1 1 0 0 1 1-1h8v18M3 21h18M12 12h.01"/>',
    gehen: '<path d="M12 20V5M6 11l6-6 6 6"/>',
    rechts: '<path d="M7 20v-7a4 4 0 0 1 4-4h8M15 5l4 4-4 4"/>',
    links: '<path d="M17 20v-7a4 4 0 0 0-4-4H5M9 5 5 9l4 4"/>',
    fahrstuhl: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 10l3-3 3 3M9 14l3 3 3-3"/>',
    treppe: '<path d="M4 20h4v-4h4v-4h4V8h4"/>',
    ziel: '<path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>'
  };

  function schrittIcon(schritt) {
    var art = schritt.aktion;
    if (art === "etage") art = schritt.mittel === "treppe" ? "treppe" : "fahrstuhl";
    var pfad = SCHRITT_ICONS[art] || SCHRITT_ICONS.gehen;
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + pfad + '</svg>';
  }

  function textSicher(text) {
    var hilfe = document.createElement("span");
    hilfe.textContent = text == null ? "" : String(text);
    return hilfe.innerHTML;
  }

  function hausEtage(ort) {
    if (!ort) return "";
    var teile = [];
    if (ort.haus != null) teile.push("Haus " + parseInt(ort.haus, 10));
    if (ort.etage != null) teile.push("Etage " + ort.etage);
    return teile.join(", ");
  }

  /* Antwort als übersichtliche Schrittliste statt als Textblock */
  function routeNachricht(daten) {
    var ziel = daten.ziel || {};
    var meta = [];
    if (daten.gesamt_m != null) meta.push(Math.round(daten.gesamt_m) + " m");
    if (hausEtage(ziel)) meta.push(hausEtage(ziel));

    var html = '<p class="route-antwort__kopf">Zu <strong>' + textSicher(ziel.name || ziel.id || "deinem Ziel") + '</strong></p>';
    if (meta.length) html += '<p class="route-antwort__meta">' + textSicher(meta.join(" · ")) + '</p>';
    html += '<ol class="weg-schritte">';
    daten.schritte.forEach(function (schritt) {
      var art = schritt.aktion === "etage" ? "etage" : schritt.aktion;
      html += '<li class="weg-schritt weg-schritt--' + textSicher(art) + '">' +
        '<span class="weg-schritt__icon">' + schrittIcon(schritt) + '</span>' +
        '<span class="weg-schritt__text">' + textSicher(schritt.text) + '</span></li>';
    });
    html += '</ol>';
    html += '<p class="route-antwort__tipp">Folge der türkisen Linie in der 3D-Ansicht.</p>';

    var punkt = document.createElement("li");
    punkt.className = "nachricht nachricht--bot nachricht--route";
    punkt.innerHTML = html;
    verlauf.appendChild(punkt);
    // Zum Anfang der Antwort scrollen, damit man den ersten Schritt sieht
    verlauf.scrollTop = punkt.offsetTop - verlauf.offsetTop - 8;
  }

  /* Demo: unbekannte Ziele als rote Fehlerblase zeigen */
  function fehlerZuFrage(frage) {
    var text = norm(frage).replace(/[?!.,]+$/g, "");

    // In der Demo ist nur Haus 3 bekannt (z. B. „Wo ist Haus 6?“).
    var haus = text.match(/\bhaus\s*(\d+)\b/);
    if (haus && haus[1] !== "3") {
      return "Es gibt kein Haus " + haus[1] + " in diesem Plan.";
    }

    var raum = text.match(/\b(?:raum|hörsaal|hoersaal)\s*([0-9]+(?:\.[0-9]+){0,3})\b/);
    if (raum) {
      var code = raum[1];
      var raumBekannt = optionen.some(function (option) {
        return norm(option.label).indexOf(code) !== -1 || norm(option.startId).indexOf(code) !== -1;
      });
      if (!raumBekannt) {
        return "Raum " + code + " ist in diesem Plan nicht vorhanden.";
      }
    }

    if (/\b(?:mensa|bibliothek|parkhaus|wohnheim)\b/.test(text)) {
      return "Dieser Ort ist in der aktuellen Tour noch nicht hinterlegt.";
    }

    return null;
  }

  /* Entweder start_id oder Avatar-Position, nie beides. */
  function payloadBauen(frage) {
    var basis = { frage: frage, sessionId: sessionId() };
    if (auswahl.quelle === "knoten") {
      basis.start_id = auswahl.startId;
      return basis;
    }
    var position = avatarPosition || {};
    basis.x = position.x != null ? position.x : null;
    basis.y = position.y != null ? position.y : null;
    basis.etage = position.etage != null ? position.etage : null;
    basis.haus = position.haus != null ? position.haus : null;
    return basis;
  }

  function zeigeRoute(daten) {
    var text = daten.antwort || daten.text || "";
    if (Array.isArray(daten.schritte) && daten.schritte.length) {
      routeNachricht(daten);
    } else if (text) {
      nachricht(text, "bot");
    }
    var zielName = daten.ziel && (daten.ziel.name || daten.ziel.id);
    routeLeiste.hidden = false;
    routeZiel.textContent = zielName ? "Route zu " + zielName : "Route";
    var teile = [];
    if (daten.gesamt_m != null) teile.push(Math.round(daten.gesamt_m) + " m");
    // Start lesbar anzeigen: Avatar-Position oder Name des Startraums
    var startName = daten.start && (daten.start.name || daten.start.id);
    if (startName) teile.push("Start: " + startName);
    routeInfo.textContent = teile.join(" · ");
    if (window.CampusUnity) window.CampusUnity.zeigeRoute(daten.route);
  }

  function senden(frage) {
    var payload = payloadBauen(frage);
    var config = window.CAMPUS_CONFIG || {};
    window.CampusTour.letzterPayload = payload;

    // Die Demo-Prüfung kennt nur die Beispielräume. Sobald der Chatbot
    // angebunden ist, entscheidet n8n selbst, ob es den Raum gibt.
    var fehler = config.webhookUrl ? null : fehlerZuFrage(frage);
    if (fehler) {
      if (window.CampusTri) window.CampusTri.zeige("fehler", 5000);
      nachricht(fehler, "fehler");
      return Promise.resolve({ ok: false, status: "fehler", antwort: fehler });
    }

    if (!config.webhookUrl) {
      var startText = auswahl.quelle === "knoten" ? auswahl.label : AVATAR_LABEL;
      nachricht("Start: " + startText + ". Die Wegberechnung wird angebunden, sobald der Chatbot verbunden ist.", "bot");
      return Promise.resolve(payload);
    }
    var tippt = tipptAnzeigen();
    if (window.CampusTri) window.CampusTri.zeige("denken");
    return fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }).then(function (antwort) {
      console.log("Chatbot-Antwort: HTTP", antwort.status);
      return antwort.json();
    }).then(function (daten) {
      tippt.remove();
      if (daten && (daten.status === "fehler" || daten.ok === false)) {
        if (window.CampusTri) window.CampusTri.zeige("fehler", 5000);
        nachricht(daten.antwort || daten.text || "Dieser Ort wurde nicht gefunden.", "fehler");
        window.CampusTour.letzteAntwort = daten;
        return daten;
      }
      zeigeRoute(daten);
      if (window.CampusTri) window.CampusTri.zeige("froh", 4000);
      window.CampusTour.letzteAntwort = daten;
      return daten;
    }).catch(function (grund) {
      // Genaue Ursache für die Fehlersuche in der Konsole ausgeben
      console.error("Chatbot-Anfrage fehlgeschlagen:", grund);
      tippt.remove();
      if (window.CampusTri) window.CampusTri.zeige("fehler", 5000);
      nachricht("Die Anfrage an den Chatbot hat nicht geklappt. Bitte später noch einmal versuchen.", "fehler");
    });
  }

  suche.addEventListener("focus", oeffnen);
  suche.addEventListener("input", function () {
    auswahl = null;
    oeffnen();
  });
  suche.addEventListener("keydown", function (event) {
    var knoepfe = liste.querySelectorAll(".startwahl__option[role='option']");
    if (event.key === "Escape") {
      schliessen();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (liste.hidden) oeffnen();
      if (!knoepfe.length) return;
      offen += event.key === "ArrowDown" ? 1 : -1;
      if (offen < 0) offen = knoepfe.length - 1;
      if (offen >= knoepfe.length) offen = 0;
      knoepfe.forEach(function (knopf, index) {
        knopf.setAttribute("aria-selected", index === offen ? "true" : "false");
      });
      knoepfe[offen].focus();
    }
  });

  liste.addEventListener("keydown", function (event) {
    var knoepfe = liste.querySelectorAll(".startwahl__option[role='option']");
    if (event.key === "Escape") {
      schliessen();
      suche.focus();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    var aktuell = Array.prototype.indexOf.call(knoepfe, document.activeElement);
    var naechster = aktuell + (event.key === "ArrowDown" ? 1 : -1);
    if (naechster < 0) naechster = knoepfe.length - 1;
    if (naechster >= knoepfe.length) naechster = 0;
    knoepfe[naechster].focus();
  });

  document.addEventListener("click", function (event) {
    if (!event.target.closest(".startwahl")) schliessen();
  });

  document.querySelectorAll("[data-frage]").forEach(function (knopf) {
    knopf.addEventListener("click", function () {
      frageFeld.value = knopf.getAttribute("data-frage");
      frageFeld.focus();
    });
  });

  formular.addEventListener("submit", function (event) {
    event.preventDefault();
    var frage = frageFeld.value.trim();
    if (!frage) {
      frageFeld.focus();
      return;
    }
    if (!auswahl) {
      var suchtext = norm(suche.value);
      var ansicht = gefiltert();
      if (!suchtext || suchtext === norm(AVATAR_LABEL)) {
        auswahl = { quelle: "avatar" };
        suche.value = AVATAR_LABEL;
      } else if (ansicht.optionen.length === 1) {
        waehlen(ansicht.optionen[0]);
      } else {
        nachricht("Bitte einen Standort aus der Liste wählen.", "bot");
        suche.focus();
        oeffnen();
        return;
      }
    }
    nachricht(frage, "nutzer");
    frageFeld.value = "";
    schliessen();
    senden(frage);
  });

  document.getElementById("route-beenden").addEventListener("click", function () {
    routeLeiste.hidden = true;
    if (window.CampusUnity) window.CampusUnity.loescheRoute();
  });

  var frageAusLink = new URLSearchParams(window.location.search).get("frage");
  if (frageAusLink) frageFeld.value = frageAusLink;

  window.CampusTour = {
    letzterPayload: null,
    letzteAntwort: null,
    setzeAvatarPosition: function (position) {
      avatarPosition = position;
    },
    zeigeRoute: zeigeRoute,
    senden: senden
  };

  window.CampusStart.laden().then(function (ergebnis) {
    optionen = ergebnis.optionen;
    if (ergebnis.vorschau) {
      hinweis.hidden = false;
      hinweis.textContent = "Vorschau mit Beispielräumen. Die echte Liste kommt aus der graph.json.";
    }
  }).catch(function () {
    hinweis.hidden = false;
    hinweis.textContent = "Die Raumliste konnte nicht geladen werden.";
  });
})();
