/* Baut die Standortliste für das Dropdown.
   Nächste Woche dieselbe Funktion mit der echten graph.json. */
(function () {
  var SICHTBARE_TYPEN = { raum: true, toilette: true, fahrstuhl: true, eingang: true };

  /* Nur zum Ansehen, solange graphUrl leer ist. Kreuzung bleibt drin, damit der Filter sichtbar ist. */
  var VORSCHAU = {
    knoten: [
      { id: "E3_Eingang", name: "E3_Eingang", typ: "eingang", etage: 3, haus: 3 },
      { id: "E3_03.61", name: "E3_03.61", typ: "fahrstuhl", etage: 3 },
      { id: "E3_03.62", name: "E3_03.62", typ: "fahrstuhl", etage: 3 },
      { id: "E3_03.31", name: "E3_03.31", typ: "toilette", etage: 3 },
      { id: "E3_03.33/1", name: "E3_03.33/1", typ: "raum", etage: 3 },
      { id: "E3_03.33/2", name: "E3_03.33/2", typ: "raum", etage: 3 },
      { id: "E3_03.25", name: "E3_03.25", typ: "raum", etage: 3 },
      { id: "03.00.Sporthalle", name: "03.00.Sporthalle", typ: "raum", etage: 0 },
      { id: "E3_Kreuzung1", name: "E3_Kreuzung1", typ: "kreuzung", etage: 3 }
    ]
  };

  function tuerInfo(id) {
    var treffer = /^(.*)\/(\d+)$/.exec(id);
    if (!treffer || treffer[1].indexOf("/") !== -1) {
      return { basis: id, tuer: 0 };
    }
    return { basis: treffer[1], tuer: Number(treffer[2]) };
  }

  function ortVon(knoten) {
    var id = knoten.id;
    var drei = /(\d+)\.(\d+)\.(.+)$/.exec(id);
    if (drei) {
      return { haus: Number(drei[1]), etage: Number(drei[2]) };
    }
    var etageAusId = /^E(\d+)_(.+)$/.exec(id);
    var etage = knoten.etage != null ? Number(knoten.etage) : (etageAusId ? Number(etageAusId[1]) : null);
    var rest = etageAusId ? etageAusId[2] : id;
    var hausTreffer = /^(\d+)\./.exec(rest);
    return {
      haus: knoten.haus != null ? Number(knoten.haus) : (hausTreffer ? Number(hausTreffer[1]) : null),
      etage: etage
    };
  }

  function ortText(ort) {
    var teile = [];
    if (ort.haus != null && !isNaN(ort.haus)) teile.push("Haus " + ort.haus);
    if (ort.etage != null && !isNaN(ort.etage)) teile.push("Etage " + ort.etage);
    return teile.join(", ");
  }

  function raumcode(id) {
    var basis = tuerInfo(id).basis;
    var drei = /(\d+\.\d+\.\d+.*)$/.exec(basis);
    if (drei) return drei[1];
    var zwei = /(\d+\.\d+)$/.exec(basis);
    if (zwei) return zwei[1];
    return "";
  }

  function mitOrt(titel, ort) {
    var suffix = ortText(ort);
    return suffix ? titel + " · " + suffix : titel;
  }

  function erzeugeName(knoten, aufzugNr) {
    var ort = ortVon(knoten);
    if (/sporthalle/i.test(knoten.id)) return mitOrt("Sporthalle", ort);
    if (knoten.typ === "eingang") return mitOrt("Eingang", ort);
    if (knoten.typ === "fahrstuhl") return mitOrt("Aufzug " + aufzugNr, ort);
    if (knoten.typ === "toilette") {
      var codeToilette = raumcode(knoten.id);
      return mitOrt(codeToilette ? "Toilette " + codeToilette : "Toilette", ort);
    }
    var code = raumcode(knoten.id);
    return mitOrt(code ? "Raum " + code : "Raum", ort);
  }

  function synonymeLesen(daten) {
    var karte = {};
    if (!daten) return karte;
    if (Array.isArray(daten)) {
      daten.forEach(function (eintrag) {
        if (eintrag && eintrag.id && eintrag.name) karte[eintrag.id] = eintrag.name;
      });
      return karte;
    }
    Object.keys(daten).forEach(function (id) {
      if (typeof daten[id] === "string") karte[id] = daten[id];
    });
    return karte;
  }

  function optionenAusGraph(graph, synonyme) {
    var knoten = (graph && (graph.knoten || graph.nodes)) || [];
    var gruppen = {};
    knoten.forEach(function (eintrag) {
      if (!SICHTBARE_TYPEN[eintrag.typ]) return;
      var schluessel = eintrag.typ === "raum" ? tuerInfo(eintrag.id).basis : eintrag.id;
      if (!gruppen[schluessel]) gruppen[schluessel] = [];
      gruppen[schluessel].push(eintrag);
    });

    var roh = Object.keys(gruppen).map(function (schluessel) {
      var liste = gruppen[schluessel].slice().sort(function (a, b) {
        return tuerInfo(a.id).tuer - tuerInfo(b.id).tuer || a.id.localeCompare(b.id, "de");
      });
      return liste[0];
    });

    var aufzuege = roh.filter(function (eintrag) { return eintrag.typ === "fahrstuhl"; })
      .sort(function (a, b) { return a.id.localeCompare(b.id, "de"); });
    var aufzugNr = {};
    var zaehler = {};
    aufzuege.forEach(function (eintrag) {
      var ort = ortVon(eintrag);
      var key = (ort.haus != null ? ort.haus : "") + ":" + (ort.etage != null ? ort.etage : "");
      zaehler[key] = (zaehler[key] || 0) + 1;
      aufzugNr[eintrag.id] = zaehler[key];
    });

    var optionen = roh.map(function (eintrag) {
      var basis = tuerInfo(eintrag.id).basis;
      var synonym = synonyme[eintrag.id] || synonyme[basis];
      return {
        startId: eintrag.id,
        typ: eintrag.typ,
        label: synonym || erzeugeName(eintrag, aufzugNr[eintrag.id] || 1)
      };
    });

    var reihenfolge = { eingang: 0, fahrstuhl: 1, toilette: 2, raum: 3 };
    optionen.sort(function (a, b) {
      return (reihenfolge[a.typ] - reihenfolge[b.typ]) || a.label.localeCompare(b.label, "de");
    });
    return optionen;
  }

  function laden() {
    var config = window.CAMPUS_CONFIG || {};
    if (!config.graphUrl) {
      return Promise.resolve({
        optionen: optionenAusGraph(VORSCHAU, {}),
        vorschau: true
      });
    }
    return fetch(config.graphUrl)
      .then(function (antwort) {
        if (!antwort.ok) throw new Error("graph");
        return antwort.json();
      })
      .then(function (graph) {
        if (!config.synonymUrl) return { graph: graph, synonyme: {} };
        return fetch(config.synonymUrl)
          .then(function (antwort) { return antwort.ok ? antwort.json() : {}; })
          .catch(function () { return {}; })
          .then(function (daten) { return { graph: graph, synonyme: synonymeLesen(daten) }; });
      })
      .then(function (paket) {
        return {
          optionen: optionenAusGraph(paket.graph, paket.synonyme),
          vorschau: false
        };
      });
  }

  window.CampusStart = {
    laden: laden,
    optionenAusGraph: optionenAusGraph
  };
})();
