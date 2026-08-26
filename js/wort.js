/* ============================================================
   DIE STRANDRÄTSEL · js/wort.js
   Wort des Tages — deutsche Wordle-Variante

   Fünf Buchstaben, sechs Versuche. Umlaute sind eigene
   Buchstaben (Ä, Ö, Ü), ß kommt nicht vor.
   Das Tageswort folgt aus hash(Datum) — kein Zufall zur Laufzeit.

   Wortlisten: woerter.json im Repo. Quellen: wordfreq
   (Apache 2.0) für die Häufigkeiten, german-nouns (MIT) für
   die Substantivformen. Beides freie Daten, keine Rätselinhalte.
   ============================================================ */

const Wort = (function () {

  const LAENGE = 5, VERSUCHE = 6;
  let listen = null;                 // { loesungen: [], rateworte: Set }

  async function ladeListen(pfad) {
    if (listen) return listen;
    const antwort = await fetch(pfad || "woerter.json");
    if (!antwort.ok) throw new Error("Wortliste nicht ladbar");
    const d = await antwort.json();
    listen = { loesungen: d.loesungen, rateworte: new Set(d.rateworte) };
    return listen;
  }

  function setzeListen(d) {          // für Tests ohne fetch
    listen = { loesungen: d.loesungen, rateworte: new Set(d.rateworte) };
    return listen;
  }

  function saatAusText(t) {
    let h = 2166136261;
    for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function tagesWort(datum) {
    if (!listen) throw new Error("Wortlisten nicht geladen");
    const d = datum instanceof Date ? datum : new Date(datum);
    const tag = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const i = saatAusText("wort|" + tag) % listen.loesungen.length;
    return listen.loesungen[i].toUpperCase();
  }

  const erlaubt = w => !!listen && listen.rateworte.has(w.toLowerCase());

  /* Bewertung mit korrekter Behandlung mehrfacher Buchstaben:
     erst die Treffer an richtiger Stelle, dann der Rest.        */
  function bewerte(versuch, wort) {
    const v = versuch.toUpperCase().split("");
    const w = wort.toUpperCase().split("");
    const aus = new Array(LAENGE).fill("daneben");
    const rest = {};

    for (let i = 0; i < LAENGE; i++) {
      if (v[i] === w[i]) aus[i] = "richtig";
      else rest[w[i]] = (rest[w[i]] || 0) + 1;
    }
    for (let i = 0; i < LAENGE; i++) {
      if (aus[i] === "richtig") continue;
      if (rest[v[i]] > 0) { aus[i] = "vorhanden"; rest[v[i]]--; }
    }
    return aus;
  }

  /* Tastaturzustand aus allen bisherigen Zeilen ableiten.
     richtig schlägt vorhanden, vorhanden schlägt daneben.       */
  function tastenstand(zeilen, wort) {
    const rang = { daneben: 0, vorhanden: 1, richtig: 2 };
    const stand = {};
    for (const z of zeilen) {
      const b = bewerte(z, wort);
      z.toUpperCase().split("").forEach((buchstabe, i) => {
        const alt = stand[buchstabe];
        if (!alt || rang[b[i]] > rang[alt]) stand[buchstabe] = b[i];
      });
    }
    return stand;
  }

  const fertig = (zeilen, wort) =>
    zeilen.length >= VERSUCHE || (zeilen.length > 0 && zeilen[zeilen.length - 1].toUpperCase() === wort);

  const gewonnen = (zeilen, wort) =>
    zeilen.length > 0 && zeilen[zeilen.length - 1].toUpperCase() === wort;

  return { LAENGE, VERSUCHE, ladeListen, setzeListen, tagesWort, erlaubt, bewerte, tastenstand, fertig, gewonnen };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Wort;
if (typeof globalThis !== "undefined") globalThis.Wort = Wort;
