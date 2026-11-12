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
      laden.hidden = false;
      laden.innerHTML = "<p>" + text + "</p>";
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
      balken.style.width = Math.round(fortschritt * 100) + "%";
    }).then(function (fertig) {
      instanz = fertig;
      laden.hidden = true;
    }).catch(function () {
      meldung("Die 3D-Ansicht konnte nicht geladen werden. Der Chat funktioniert trotzdem.");
    });
  
    // 3. SCHRITT 4: Unity ruft diese Funktion auf, wenn sich der Avatar bewegt
    //    (über Position.jslib im Unity-Projekt).
    window.empfangePosition = function (x, y, etage, haus) {
      window.CampusTour.setzeAvatarPosition({ x: x, y: y, etage: etage, haus: haus });
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
  
    window.CampusUnity = { zeigeRoute: zeigeRoute, loescheRoute: loescheRoute };
  })();