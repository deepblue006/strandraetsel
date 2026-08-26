/* ============================================================
   DIE STRANDRÄTSEL · js/aufgabe.js
   Oberfläche für die Denksportaufgabe

   Zwei Antwortformen:
     zahl       — ein Eingabefeld
     zuordnung  — je Person ein Auswahlfeld
   ============================================================ */

const Aufgabe = (function () {

  let daten = null;
  let antwort = null;            // Zahl (String) oder Array
  let beiAenderung = () => {};

  function starte(aufgabe, gespeichert, rueckruf) {
    daten = aufgabe;
    antwort = (gespeichert && gespeichert.antwort) ||
              (aufgabe.form === "zahl" ? "" : aufgabe.felder.map(() => ""));
    beiAenderung = rueckruf || (() => {});
    zeichne();
    meldung("");
    document.getElementById("a-weg").hidden = true;
  }

  function zeichne() {
    document.getElementById("a-titel").textContent = daten.titel;
    document.getElementById("a-text").textContent = daten.text;

    const liste = document.getElementById("a-aussagen");
    if (daten.aussagen && daten.aussagen.length) {
      liste.innerHTML = daten.aussagen.map(t => `<li>${t}</li>`).join("");
      liste.hidden = false;
    } else {
      liste.innerHTML = ""; liste.hidden = true;
    }

    document.getElementById("a-frage").textContent = daten.frage;

    const feld = document.getElementById("a-antwort");
    if (daten.form === "zahl") {
      feld.innerHTML = `
        <label class="zahlzeile">
          <input type="number" inputmode="decimal" id="a-zahl" value="${antwort || ""}"
                 aria-label="${daten.frage}">
          <span class="einheit">${daten.einheit || ""}</span>
        </label>`;
      const eingabe = document.getElementById("a-zahl");
      eingabe.addEventListener("input", () => {
        antwort = eingabe.value;
        meldung("");
        beiAenderung(stand());
      });
    } else {
      feld.innerHTML = daten.felder.map((f, i) => `
        <label class="zuordnungszeile">
          <span class="zname">${f.name} ist der</span>
          <select data-i="${i}">
            <option value="">—</option>
            ${f.auswahl.map(w => `<option value="${w}"${antwort[i] === w ? " selected" : ""}>${w}</option>`).join("")}
          </select>
        </label>`).join("");
      feld.querySelectorAll("select").forEach(sel => {
        sel.addEventListener("change", () => {
          antwort[+sel.dataset.i] = sel.value;
          meldung("");
          beiAenderung(stand());
        });
      });
    }
  }

  function pruefe() {
    if (daten.form === "zahl") {
      if (!String(antwort).trim()) { meldung("Da fehlt noch eine Zahl.", "warten"); return false; }
    } else if (antwort.some(w => !w)) {
      meldung("Noch nicht alle zugeordnet.", "warten"); return false;
    } else if (new Set(antwort).size !== antwort.length) {
      meldung("Jeder Beruf gehört genau einer Person.", "fehler"); return false;
    }

    if (!Denksport.pruefe(daten, antwort)) {
      meldung("Das trägt noch nicht. Ein zweiter Blick lohnt.", "fehler");
      return false;
    }
    meldung("Genau so. Der Weg steht unten.", "gut");
    zeigeWeg();
    beiAenderung(stand(true));
    return true;
  }

  function zeigeWeg() {
    const kasten = document.getElementById("a-weg");
    kasten.innerHTML = `<div class="titelzeile"><h2>Der Weg dorthin</h2><span class="linie"></span></div>
                        <p class="loesungsweg">${daten.weg.replace(/\n/g, "<br>")}</p>`;
    kasten.hidden = false;
  }

  function aufgeben() {
    zeigeWeg();
    meldung(daten.form === "zahl"
      ? `Die Antwort lautet ${daten.loesung} ${daten.einheit || ""}. Der Weg dorthin steht unten.`
      : "Die Auflösung steht unten.", "warten");
    beiAenderung(stand());
  }

  function leeren() {
    antwort = daten.form === "zahl" ? "" : daten.felder.map(() => "");
    zeichne();
    meldung("");
    beiAenderung(stand());
  }

  function meldung(text, art) {
    const m = document.getElementById("a-meldung");
    m.textContent = text;
    m.className = "meldung" + (art ? " " + art : "");
    m.hidden = !text;
  }

  function stand(geloest) {
    const angefangen = daten.form === "zahl"
      ? (String(antwort).trim() ? 1 : 0)
      : antwort.filter(Boolean).length / antwort.length;
    return { antwort, anteil: angefangen, geloest: !!geloest };
  }

  return { starte, pruefe, leeren, aufgeben, stand };
})();

if (typeof globalThis !== "undefined") globalThis.Aufgabe = Aufgabe;
