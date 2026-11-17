/* unity.js – verbindet die Website mit dem Unity-Build.
   Schritt 4: Unity → Website  (wo steht der Avatar?)
   Schritt 8: Website → Unity  (Route zeichnen)
   Koordinaten bleiben wie in graph.json (Meter, x nach rechts, y nach unten).
   Umrechnen in Unity-Koordinaten macht Unity selbst. */
   (function () {
    var canvas = document.getElementById("unity-canvas");
    var laden = document.getElementById("unity-laden");
    var balken = document.getElementById("unity-balken");
    var instanz = null; // wird gesetzt, sobald Unity fertig geladen ist
  
    function meldung(text) {
      // Ladebildschirm bleibt im Design, nur Text tauschen und Balken ausblenden
      laden.hidden = false;
      document.getElementById("unity-laden-titel").textContent = text;
      document.getElementById("unity-laden-unter").hidden = true;
      document.getElementById("unity-ladebalken").hidden = true;
    }
  
    // 1. Kann der Browser überhaupt 3D (WebGL)?
    var test = document.createElement("canvas");
    if (!(test.getContext("webgl2") || test.getContext("webgl"))) {
      meldung("Dein Browser kann keine 3D-Ansicht anzeigen. Der Chat funktioniert trotzdem.");
      return;
    }
  // Tastatur für Chat-Felder freigeben.
// Unity schnappt sich sonst alle Tasten auf der ganzen Seite.
// Muss VOR createUnityInstance stehen, damit es vor Unity drankommt.
function tippenErlauben(event) {
    var ziel = event.target;
    if (ziel && (ziel.tagName === "INPUT" || ziel.tagName === "TEXTAREA")) {
      event.stopImmediatePropagation();
    }
  }
  window.addEventListener("keydown", tippenErlauben);
  window.addEventListener("keyup", tippenErlauben);
  window.addEventListener("keypress", tippenErlauben, true);
    // 2. Unity-Build laden (Pfade wie in Unitys eigener index.html, nur mit "unity/" davor)
    createUnityInstance(canvas, {
      dataUrl: "unity/Build/Unity_WebBuild.data",
      frameworkUrl: "unity/Build/Unity_WebBuild.framework.js",
      codeUrl: "unity/Build/Unity_WebBuild.wasm",
      streamingAssetsUrl: "unity/StreamingAssets",
      companyName: "DefaultCompany",
      productName: "Virtuelle_Uni_Tour",
      productVersion: "0.1.0"
    }, function (fortschritt) {
      // fortschritt geht von 0 bis 1
      var prozent = Math.round(fortschritt * 100);
      balken.style.width = prozent + "%";
      document.getElementById("unity-ladebalken").setAttribute("aria-valuenow", prozent);
    }).then(function (fertig) {
      instanz = fertig;
      laden.hidden = true;
      steuerungStarten();
    }).catch(function () {
      meldung("Die 3D-Ansicht konnte nicht geladen werden. Der Chat funktioniert trotzdem.");
    });
  
    // 3. SCHRITT 4: Unity ruft diese Funktion auf, wenn sich der Avatar bewegt
    //    (über Position.jslib im Unity-Projekt).
    //    n8n braucht auch das Haus (jedes Haus hat eigene Koordinaten).
    //    Solange Unity das Haus nicht mitschickt, nehmen wir Haus 3,
    //    weil das 3D-Modell bisher nur Haus 3 enthält.
    var STANDARD_HAUS = "03";
    window.empfangePosition = function (x, y, etage, haus) {
      window.CampusTour.setzeAvatarPosition({ x: x, y: y, etage: etage, haus: haus || STANDARD_HAUS });
    };
  
    // 4. SCHRITT 8: Route an Unity geben. tour.js ruft das auf, wenn n8n geantwortet hat.
    function zeigeRoute(route) {
      if (!instanz || !route || !route.length) return;
      instanz.SendMessage("Navigation", "ZeigeRoute", JSON.stringify({ route: route }));
    }
  
    function loescheRoute() {
      if (!instanz) return;
      instanz.SendMessage("Navigation", "LoescheRoute");
    }
  
    // 5. Steuerungs-Hinweis: erscheint beim ersten Besuch, danach über den ?-Knopf.
    //    Ob er schon gesehen wurde, merkt sich nur dieser Browser (localStorage).
    function steuerungStarten() {
      var karte = document.getElementById("steuerung");
      var ok = document.getElementById("steuerung-ok");
      var hilfe = document.getElementById("steuerung-hilfe");
      if (!karte || !ok || !hilfe) return;
      var schluessel = "campus-steuerung-gesehen";

      function zeigen(an) {
        karte.hidden = !an;
        hilfe.hidden = an;
        hilfe.setAttribute("aria-expanded", an ? "true" : "false");
      }

      ok.addEventListener("click", function () {
        zeigen(false);
        try { localStorage.setItem(schluessel, "ja"); } catch (e) {}
        canvas.focus();
      });
      hilfe.addEventListener("click", function () { zeigen(true); });

      var gesehen = false;
      try { gesehen = localStorage.getItem(schluessel) === "ja"; } catch (e) {}
      zeigen(!gesehen);
    }

    window.CampusUnity = { zeigeRoute: zeigeRoute, loescheRoute: loescheRoute };
  })();