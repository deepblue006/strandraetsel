/* ============================================================
   DIE STRANDRÄTSEL · js/schach.js
   Stellung des Tages — Logik ohne Oberfläche

   Stellungen stammen aus der Lichess-Puzzle-Datenbank (CC0),
   gefiltert mit lichess-auszug.py. Fehlt die Datei, greift ein
   kleiner eigener Vorrat, damit die App trotzdem läuft.

   Wichtig zum Format: In der Lichess-Datenbank steht das FEN
   VOR dem Gegnerzug. Der erste Zug der Lösung ist dieser
   Gegnerzug — er wird ausgeführt, bevor der Mensch dran ist.
   ============================================================ */

const Schach = (function () {

  /* Notvorrat: eigene, sehr einfache Stellungen. Jeweils
     "Weiß zieht und setzt matt in einem Zug." */
  const VORRAT = [
    // Grundreihenmatt: Schwarz räumt die achte Reihe, Weiß setzt matt
    { id: "eigen-1", fen: "r5k1/5ppp/8/8/8/8/5PPP/3Q2K1 b - - 0 1",
      zuege: ["a8a5", "d1d8"], rating: 700, themen: ["mateIn1", "backRankMate"] },
    { id: "eigen-2", fen: "r5k1/5ppp/8/8/8/8/5PPP/4Q1K1 b - - 0 1",
      zuege: ["a8a4", "e1e8"], rating: 700, themen: ["mateIn1", "backRankMate"] },
    // Hängende Figur: Schwarz stellt den Turm ungedeckt in die Damenlinie
    { id: "eigen-3", fen: "r5k1/5ppp/8/8/8/8/5PPP/3Q2K1 b - - 0 1",
      zuege: ["a8d8", "d1d8"], rating: 600, themen: ["hangingPiece"] },
    { id: "eigen-4", fen: "6k1/5ppp/8/8/1b6/8/5PPP/2B3K1 b - - 0 1",
      zuege: ["b4a3", "c1a3"], rating: 600, themen: ["hangingPiece"] }
  ];

  let stellungen = null;

  async function ladeStellungen(pfad) {
    if (stellungen) return stellungen;
    try {
      const antwort = await fetch(pfad || "stellungen.json");
      if (!antwort.ok) throw new Error("nicht ladbar");
      const d = await antwort.json();
      stellungen = d.stellungen && d.stellungen.length ? d.stellungen : VORRAT;
    } catch (e) {
      stellungen = VORRAT;          // App läuft auch ohne Auszug
    }
    return stellungen;
  }

  function setzeStellungen(liste) {
    stellungen = liste && liste.length ? liste : VORRAT;
    return stellungen;
  }

  function saatAusText(t) {
    let h = 2166136261;
    for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /* ---------- Brett aus FEN ---------- */

  function ausFen(fen) {
    const [felder, amZug, rochade, enPassant] = fen.split(" ");
    const brett = {};                       // "e4" -> "Q" (groß = weiß)
    felder.split("/").forEach((reihe, i) => {
      let spalte = 0;
      for (const z of reihe) {
        if (/\d/.test(z)) { spalte += +z; continue; }
        brett[feldname(spalte, 7 - i)] = z;
        spalte++;
      }
    });
    return { brett, amZug, rochade: rochade || "-", enPassant: enPassant || "-" };
  }

  const feldname = (spalte, reihe) => "abcdefgh"[spalte] + (reihe + 1);
  const spalteVon = f => "abcdefgh".indexOf(f[0]);
  const reiheVon = f => +f[1] - 1;
  const istWeiss = figur => figur === figur.toUpperCase();

  /* ---------- Einen Zug anwenden ----------
     Erwartet UCI wie "e2e4" oder "e7e8q" (Umwandlung).
     Rochade, Umwandlung und en passant werden mitgeführt.      */

  function ziehe(lage, uci) {
    const von = uci.slice(0, 2), nach = uci.slice(2, 4), um = uci[4];
    const brett = { ...lage.brett };
    const figur = brett[von];
    if (!figur) return lage;

    delete brett[von];
    brett[nach] = um ? (istWeiss(figur) ? um.toUpperCase() : um.toLowerCase()) : figur;

    // Rochade: der Turm zieht mit
    if (figur.toLowerCase() === "k" && Math.abs(spalteVon(nach) - spalteVon(von)) === 2) {
      const reihe = von[1];
      if (spalteVon(nach) === 6) { brett["f" + reihe] = brett["h" + reihe]; delete brett["h" + reihe]; }
      if (spalteVon(nach) === 2) { brett["d" + reihe] = brett["a" + reihe]; delete brett["a" + reihe]; }
    }

    // En passant: der geschlagene Bauer steht nicht auf dem Zielfeld
    if (figur.toLowerCase() === "p" && nach === lage.enPassant &&
        spalteVon(von) !== spalteVon(nach)) {
      const opfer = nach[0] + (istWeiss(figur) ? +nach[1] - 1 : +nach[1] + 1);
      delete brett[opfer];
    }

    let enPassant = "-";
    if (figur.toLowerCase() === "p" && Math.abs(reiheVon(nach) - reiheVon(von)) === 2) {
      enPassant = nach[0] + ((reiheVon(von) + reiheVon(nach)) / 2 + 1);
    }

    return { brett, amZug: lage.amZug === "w" ? "b" : "w", rochade: lage.rochade, enPassant };
  }

  /* ---------- Eine Aufgabe aufbereiten ----------
     Der erste Zug der Lösung ist der Gegnerzug; er gehört zur
     Ausgangsstellung, nicht zur Aufgabe.                        */

  function baueAufgabe(p) {
    let lage = ausFen(p.fen);
    const eroeffnung = p.zuege[0];
    lage = ziehe(lage, eroeffnung);

    const loesung = p.zuege.slice(1);
    const seite = lage.amZug;                       // Seite, die der Mensch führt

    return {
      id: p.id,
      titel: "Die Stellung des Tages",
      einleitung: seite === "w"
        ? "Weiß ist am Zug. Ein Zug genügt, wenn es der richtige ist."
        : "Schwarz ist am Zug. Ein Zug genügt, wenn es der richtige ist.",
      frage: motivSatz(p.themen, loesung.length),
      lage,
      seite,
      eroeffnung,
      loesung,
      rating: p.rating,
      themen: p.themen || []
    };
  }

  function motivSatz(themen = [], laenge) {
    const t = new Set(themen);
    if (t.has("mateIn1")) return "Setz matt — in einem Zug.";
    if (t.has("mateIn2")) return "Matt in zwei Zügen.";
    if (laenge <= 1) return "Ein Zug entscheidet. Welcher?";
    return "Finde die Folge, die den Vorteil sichert.";
  }

  function tagesAufgabe(datum) {
    if (!stellungen) throw new Error("Stellungen nicht geladen");
    const d = datum instanceof Date ? datum : new Date(datum);
    const tag = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const i = saatAusText("schach|" + tag) % stellungen.length;
    return baueAufgabe(stellungen[i]);
  }

  /* ---------- Züge prüfen ---------- */

  const istRichtig = (aufgabe, schritt, uci) =>
    !!aufgabe.loesung[schritt] && aufgabe.loesung[schritt].slice(0, 4) === uci.slice(0, 4);

  const brauchtAntwort = (aufgabe, schritt) => schritt + 1 < aufgabe.loesung.length;

  const fertig = (aufgabe, schritt) => schritt >= aufgabe.loesung.length;

  /* ---------- Erlaubte Zielfelder ----------
     Vollständige Regelprüfung braucht es nicht: geprüft wird
     die Lösungslinie. Für die Bedienung genügt eine Vorauswahl
     der Felder, die eine Figur überhaupt erreichen kann.        */

  const SCHRITTE = {
    n: [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]],
    k: [[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1]],
    b: [[1,1],[1,-1],[-1,-1],[-1,1]],
    r: [[0,1],[1,0],[0,-1],[-1,0]],
    q: [[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1]]
  };

  function zielfelder(lage, von) {
    const figur = lage.brett[von];
    if (!figur) return [];
    const weiss = istWeiss(figur);
    const art = figur.toLowerCase();
    const s = spalteVon(von), r = reiheVon(von);
    const aus = [];

    const frei = f => !lage.brett[f];
    const gegner = f => lage.brett[f] && istWeiss(lage.brett[f]) !== weiss;
    const drin = (s, r) => s >= 0 && s < 8 && r >= 0 && r < 8;

    if (art === "p") {
      const richtung = weiss ? 1 : -1;
      const eins = feldname(s, r + richtung);
      if (drin(s, r + richtung) && frei(eins)) {
        aus.push(eins);
        const start = weiss ? 1 : 6;
        const zwei = feldname(s, r + 2 * richtung);
        if (r === start && frei(zwei)) aus.push(zwei);
      }
      for (const ds of [-1, 1]) {
        if (!drin(s + ds, r + richtung)) continue;
        const f = feldname(s + ds, r + richtung);
        if (gegner(f) || f === lage.enPassant) aus.push(f);
      }
      return aus;
    }

    const weit = art === "b" || art === "r" || art === "q";
    for (const [ds, dr] of SCHRITTE[art]) {
      let ns = s + ds, nr = r + dr;
      while (drin(ns, nr)) {
        const f = feldname(ns, nr);
        if (lage.brett[f]) { if (gegner(f)) aus.push(f); break; }
        aus.push(f);
        if (!weit) break;
        ns += ds; nr += dr;
      }
    }

    // Rochade grob anbieten, wenn die Felder frei sind
    if (art === "k" && lage.rochade !== "-") {
      const reihe = weiss ? "1" : "8";
      const rechte = weiss ? "KQ" : "kq";
      if (lage.rochade.includes(rechte[0]) && frei("f" + reihe) && frei("g" + reihe)) aus.push("g" + reihe);
      if (lage.rochade.includes(rechte[1]) && frei("d" + reihe) && frei("c" + reihe) && frei("b" + reihe)) aus.push("c" + reihe);
    }
    return aus;
  }

  return { ladeStellungen, setzeStellungen, tagesAufgabe, ziehe, ausFen,
           zielfelder, istRichtig, brauchtAntwort, fertig, VORRAT };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Schach;
if (typeof globalThis !== "undefined") globalThis.Schach = Schach;
