/* ============================================================
   DIE STRANDRÄTSEL · js/brett.js
   Oberfläche für die Stellung des Tages

   Antippen: erst die eigene Figur, dann das Zielfeld.
   Mögliche Felder werden angezeigt. Der Gegenzug läuft
   von allein, kurz verzögert, damit man ihn sieht.
   ============================================================ */

const Brett = (function () {

  const REIHEN = [8, 7, 6, 5, 4, 3, 2, 1];
  const LINIEN = "abcdefgh".split("");

  const ZEICHEN = {
    K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
    k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟"
  };

  let aufgabe = null;
  let lage = null;
  let schritt = 0;             // wie viele Halbzüge der Lösung stehen
  let gewaehlt = null;         // angetipptes Ausgangsfeld
  let beendet = false;
  let beiAenderung = () => {};

  function starte(daten, gespeichert, rueckruf) {
    aufgabe = daten;
    beiAenderung = rueckruf || (() => {});
    schritt = (gespeichert && gespeichert.schritt) || 0;
    beendet = (gespeichert && gespeichert.beendet) || false;
    gewaehlt = null;

    // gespeicherten Fortschritt nachspielen
    lage = aufgabe.lage;
    for (let i = 0; i < schritt; i++) lage = Schach.ziehe(lage, aufgabe.loesung[i]);

    document.getElementById("s-titel").textContent = aufgabe.titel;
    document.getElementById("s-einleitung").textContent = aufgabe.einleitung;
    document.getElementById("s-frage").textContent = aufgabe.frage;

    baueBrett();
    male();
    meldung(beendet ? "Gelöst. Der Zug saß." : "", beendet ? "gut" : "");
  }

  function baueBrett() {
    const b = document.getElementById("brettfeld");
    const untenWeiss = aufgabe.seite === "w";
    const reihen = untenWeiss ? REIHEN : REIHEN.slice().reverse();
    const linien = untenWeiss ? LINIEN : LINIEN.slice().reverse();

    let h = "";
    reihen.forEach(r => {
      linien.forEach(l => {
        const feld = l + r;
        const hell = (LINIEN.indexOf(l) + r) % 2 === 1;
        h += `<button type="button" class="feld ${hell ? "hell" : "dunkel"}" data-feld="${feld}">
                <span class="figur"></span><span class="punkt"></span>
              </button>`;
      });
    });
    b.innerHTML = h;
    b.querySelectorAll(".feld").forEach(f =>
      f.addEventListener("click", () => tippe(f.dataset.feld)));
  }

  function tippe(feld) {
    if (beendet) return;
    const figur = lage.brett[feld];
    const eigen = figur && (figur === figur.toUpperCase()) === (aufgabe.seite === "w");

    if (gewaehlt && !eigen) {
      versuche(gewaehlt, feld);
      return;
    }
    gewaehlt = eigen ? (gewaehlt === feld ? null : feld) : null;
    male();
  }

  function versuche(von, nach) {
    const uci = von + nach;
    if (!Schach.zielfelder(lage, von).includes(nach)) {
      gewaehlt = null; male();
      meldung("Dorthin kommt die Figur nicht.", "warten");
      return;
    }

    if (!Schach.istRichtig(aufgabe, schritt, uci)) {
      gewaehlt = null; male();
      meldung("Ein Umweg. Sieh dir die Stellung noch einmal an.", "fehler");
      return;
    }

    // richtiger Zug
    lage = Schach.ziehe(lage, aufgabe.loesung[schritt]);
    schritt++;
    gewaehlt = null;
    male();
    meldung("");

    if (Schach.fertig(aufgabe, schritt)) {
      beendet = true;
      meldung("Gelöst. Der Zug saß.", "gut");
      beiAenderung(stand());
      return;
    }

    // Antwortzug des Gegners
    beiAenderung(stand());
    setTimeout(() => {
      lage = Schach.ziehe(lage, aufgabe.loesung[schritt]);
      schritt++;
      male();
      if (Schach.fertig(aufgabe, schritt)) {
        beendet = true;
        meldung("Gelöst. Der Zug saß.", "gut");
      } else {
        meldung("Und weiter — noch ein Zug.", "warten");
      }
      beiAenderung(stand());
    }, 550);
  }

  function male() {
    const ziele = gewaehlt ? Schach.zielfelder(lage, gewaehlt) : [];
    document.querySelectorAll("#brettfeld .feld").forEach(f => {
      const feld = f.dataset.feld;
      const figur = lage.brett[feld];
      const z = f.querySelector(".figur");
      z.textContent = figur ? ZEICHEN[figur] : "";
      z.className = "figur" + (figur ? (figur === figur.toUpperCase() ? " weiss" : " schwarz") : "");
      f.classList.toggle("gewaehlt", feld === gewaehlt);
      f.classList.toggle("ziel", ziele.includes(feld));
      f.classList.toggle("schlagbar", ziele.includes(feld) && !!lage.brett[feld]);
    });
  }

  function aufgeben() {
    while (!Schach.fertig(aufgabe, schritt)) {
      lage = Schach.ziehe(lage, aufgabe.loesung[schritt]);
      schritt++;
    }
    beendet = true;
    gewaehlt = null;
    male();
    meldung(`Die Lösung lautet ${aufgabe.loesung.map(lesbar).join(", ")}.`, "warten");
    beiAenderung(stand());
  }

  const lesbar = uci => uci.slice(0, 2) + "–" + uci.slice(2, 4);

  function zurueck() {
    schritt = 0;
    beendet = false;
    gewaehlt = null;
    lage = aufgabe.lage;
    male();
    meldung("");
    beiAenderung(stand());
  }

  function meldung(text, art) {
    const m = document.getElementById("s-meldung");
    m.textContent = text;
    m.className = "meldung" + (art ? " " + art : "");
    m.hidden = !text;
  }

  function stand() {
    return {
      schritt, beendet,
      anteil: aufgabe.loesung.length ? schritt / aufgabe.loesung.length : 0,
      geloest: beendet && schritt >= aufgabe.loesung.length
    };
  }

  return { starte, aufgeben, zurueck, stand };
})();

if (typeof globalThis !== "undefined") globalThis.Brett = Brett;
