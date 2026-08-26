/* ============================================================
   DIE STRANDRÄTSEL · js/saetze.js
   Oberfläche für das Wahrheitsrätsel

   Kein Gitter: eine Reihe Personen, jede mit ihrer Aussage.
   Antippen wechselt: unbestimmt → ehrlich → flunkert → unbestimmt.
   ============================================================ */

const Saetze = (function () {

  const UNBESTIMMT = 0, EHRLICH = 1, FLUNKERT = 2;

  let raetsel = null;
  let wahl = {};                 // personenIndex -> 0|1|2
  let beiAenderung = () => {};

  function starte(daten, gespeichert, rueckruf) {
    raetsel = daten;
    wahl = (gespeichert && gespeichert.wahl) || {};
    beiAenderung = rueckruf || (() => {});
    zeichne();
    meldung("");
    document.getElementById("w-aufloesung").hidden = true;
  }

  function zeichne() {
    document.getElementById("w-titel").textContent = raetsel.titel;
    document.getElementById("w-einleitung").textContent = raetsel.einleitung;
    document.getElementById("w-frage").textContent = raetsel.frage;

    const liste = document.getElementById("w-leute");
    liste.innerHTML = raetsel.aussagen.map(a => `
      <li class="person" data-i="${a.von}">
        <button type="button">
          <span class="p-kopf">
            <span class="p-name">${a.name}</span>
            <span class="p-urteil"></span>
          </span>
          <span class="p-satz">„${a.satz}“</span>
        </button>
      </li>`).join("");

    liste.querySelectorAll("li.person").forEach(li => {
      li.querySelector("button").addEventListener("click", () => tippe(+li.dataset.i));
    });
    male();
  }

  function tippe(i) {
    wahl[i] = ((wahl[i] || UNBESTIMMT) + 1) % 3;
    if (wahl[i] === UNBESTIMMT) delete wahl[i];
    male();
    meldung("");
    beiAenderung(stand());
  }

  function male() {
    document.querySelectorAll("#w-leute li.person").forEach(li => {
      const w = wahl[+li.dataset.i] || UNBESTIMMT;
      li.classList.toggle("ehrlich", w === EHRLICH);
      li.classList.toggle("flunkert", w === FLUNKERT);
      li.querySelector(".p-urteil").textContent =
        w === EHRLICH ? "sagt die Wahrheit" : w === FLUNKERT ? "flunkert" : "offen";
    });
  }

  function pruefe() {
    const n = raetsel.namen.length;
    let offen = 0, falsch = 0;
    for (let i = 0; i < n; i++) {
      const w = wahl[i] || UNBESTIMMT;
      if (w === UNBESTIMMT) { offen++; continue; }
      if ((w === EHRLICH) !== raetsel.loesung[i]) falsch++;
    }
    if (offen > 0 && falsch === 0) {
      meldung(`${offen} ${offen === 1 ? "Person ist" : "Personen sind"} noch unentschieden.`, "warten");
      return false;
    }
    if (falsch > 0) {
      meldung(`${falsch} ${falsch === 1 ? "Urteil passt" : "Urteile passen"} nicht zu den Aussagen. Noch mal von vorn lesen.`, "fehler");
      return false;
    }
    meldung("Stimmt. Jetzt ergibt jede Aussage einen Sinn.", "gut");
    zeigeAufloesung();
    beiAenderung(stand(true));
    return true;
  }

  function zeigeAufloesung() {
    document.getElementById("w-aufloesung").innerHTML =
      `<table class="tabelle"><tr><th>Person</th><th>Urteil</th></tr>` +
      raetsel.namen.map((n, i) =>
        `<tr><td>${n}</td><td>${raetsel.loesung[i] ? "sagt die Wahrheit" : "flunkert"}</td></tr>`).join("") +
      `</table>`;
    document.getElementById("w-aufloesung").hidden = false;
  }

  function aufgeben() {
    zeigeAufloesung();
    meldung("Die Auflösung steht unten.", "warten");
    beiAenderung(stand());
  }

  function leeren() {
    wahl = {};
    male();
    meldung("");
    beiAenderung(stand());
  }

  function meldung(text, art) {
    const m = document.getElementById("w-meldung");
    m.textContent = text;
    m.className = "meldung" + (art ? " " + art : "");
    m.hidden = !text;
  }

  function stand(geloest) {
    return {
      wahl,
      anteil: Object.keys(wahl).length / raetsel.namen.length,
      geloest: !!geloest
    };
  }

  return { starte, pruefe, leeren, aufgeben, stand };
})();

if (typeof globalThis !== "undefined") globalThis.Saetze = Saetze;
