/* ============================================================
   DIE STRANDRÄTSEL · js/wortfeld.js
   Oberfläche für das Wort des Tages

   Sechs Zeilen à fünf Felder, eigene Buchstabentastatur
   (mit Ä, Ö, Ü). Kein Zeitdruck, keine Statistik.
   ============================================================ */

const Wortfeld = (function () {

  const REIHEN = [
    "QWERTZUIOPÜ".split(""),
    "ASDFGHJKLÖÄ".split(""),
    ["⏎", ..."YXCVBNM".split(""), "⌫"]
  ];

  let wort = "";
  let zeilen = [];          // abgeschickte Versuche
  let eingabe = "";         // aktuelle Zeile
  let beendet = false;
  let beiAenderung = () => {};

  function starte(tageswort, gespeichert, rueckruf) {
    wort = tageswort;
    zeilen = (gespeichert && gespeichert.zeilen) || [];
    eingabe = "";
    beendet = Wort.fertig(zeilen, wort);
    beiAenderung = rueckruf || (() => {});
    baueGitter();
    baueTastatur();
    male();
    meldung(beendet ? schlusssatz() : "");
  }

  function baueGitter() {
    const g = document.getElementById("wortgitter");
    let h = "";
    for (let z = 0; z < Wort.VERSUCHE; z++) {
      h += `<div class="wortzeile" data-z="${z}">`;
      for (let s = 0; s < Wort.LAENGE; s++) h += `<div class="wortfeld" data-s="${s}"></div>`;
      h += `</div>`;
    }
    g.innerHTML = h;
  }

  function baueTastatur() {
    const t = document.getElementById("worttastatur");
    t.innerHTML = REIHEN.map(reihe =>
      `<div class="tastenreihe">` +
      reihe.map(k => `<button type="button" class="taste${k.length > 1 || k === "⏎" || k === "⌫" ? " weit" : ""}" data-k="${k}">${k}</button>`).join("") +
      `</div>`).join("");
    t.querySelectorAll(".taste").forEach(b =>
      b.addEventListener("click", () => tippe(b.dataset.k)));

    // Physische Tastatur (Mac) mitbedienen — einmalig anmelden
    if (!baueTastatur.angemeldet) {
      baueTastatur.angemeldet = true;
      document.addEventListener("keydown", e => {
        if (document.getElementById("ansicht-wort").hidden) return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        const k = e.key;
        if (k === "Enter") { e.preventDefault(); tippe("⏎"); }
        else if (k === "Backspace") { e.preventDefault(); tippe("⌫"); }
        else if (/^[a-zA-ZäöüÄÖÜ]$/.test(k)) { e.preventDefault(); tippe(k.toUpperCase()); }
      });
    }
  }

  function tippe(k) {
    if (beendet) return;
    if (k === "⌫") { eingabe = eingabe.slice(0, -1); }
    else if (k === "⏎") { schickeAb(); return; }
    else if (eingabe.length < Wort.LAENGE) { eingabe += k; }
    meldung("");
    male();
  }

  function schickeAb() {
    if (eingabe.length < Wort.LAENGE) { meldung("Da fehlen noch Buchstaben.", "warten"); return; }
    if (!Wort.erlaubt(eingabe)) { meldung("Dieses Wort kennt die Liste nicht.", "fehler"); return; }
    zeilen.push(eingabe);
    eingabe = "";
    beendet = Wort.fertig(zeilen, wort);
    male();
    if (beendet) meldung(schlusssatz(), Wort.gewonnen(zeilen, wort) ? "gut" : "warten");
    beiAenderung(stand());
  }

  function schlusssatz() {
    if (Wort.gewonnen(zeilen, wort)) {
      const n = zeilen.length;
      return n === 1 ? "Auf Anhieb. Das gelingt selten."
           : n <= 3 ? `Gefunden, mit ${n} Versuchen.`
           : `Gefunden — der Weg dahin war etwas länger.`;
    }
    return `Heute nicht. Das Wort war ${wort}.`;
  }

  function male() {
    const felder = z => document.querySelectorAll(`.wortzeile[data-z="${z}"] .wortfeld`);

    zeilen.forEach((zeile, z) => {
      const b = Wort.bewerte(zeile, wort);
      felder(z).forEach((f, s) => {
        f.textContent = zeile[s];
        f.className = "wortfeld " + b[s];
      });
    });

    if (!beendet) {
      const z = zeilen.length;
      felder(z).forEach((f, s) => {
        f.textContent = eingabe[s] || "";
        f.className = "wortfeld" + (eingabe[s] ? " gesetzt" : "");
      });
      for (let leer = z + 1; leer < Wort.VERSUCHE; leer++)
        felder(leer).forEach(f => { f.textContent = ""; f.className = "wortfeld"; });
    }

    const stand = Wort.tastenstand(zeilen, wort);
    document.querySelectorAll(".taste").forEach(b => {
      const s = stand[b.dataset.k];
      b.className = "taste" + (b.dataset.k.length > 1 ? " weit" : "") + (s ? " " + s : "");
    });
  }

  function meldung(text, art) {
    const m = document.getElementById("wort-meldung");
    m.textContent = text;
    m.className = "meldung" + (art ? " " + art : "");
    m.hidden = !text;
  }

  function stand() {
    return {
      zeilen,
      anteil: zeilen.length / Wort.VERSUCHE,
      geloest: Wort.gewonnen(zeilen, wort),
      beendet
    };
  }

  return { starte, stand, tippe };
})();

if (typeof globalThis !== "undefined") globalThis.Wortfeld = Wortfeld;
