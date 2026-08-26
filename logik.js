/* ============================================================
   DER STRANDWEG · v0.1 · Baustein 3a
   js/logik.js — Kreuztabelle für Zuordnungsrätsel

   Zuständig für: Gitter zeichnen, Zellzustände (leer / ✗ / ●),
   Hinweisliste, Prüfen, Auflösung.
   Nicht zuständig für: Speichern und Navigation (das macht app.js).
   ============================================================ */

const Logik = (function () {

  const LEER = 0, AUS = 1, GESETZT = 2;

  let raetsel = null;      // { titel, einleitung, raetsel:{kategorien,hinweise}, loesung }
  let zellen = {};         // "rk:ri:ck:ci" -> 0|1|2
  let haken = {};          // hinweisNr -> true
  let einst = { autoStreichen: true };
  let beiAenderung = () => {};

  const schluessel = (rk, ri, ck, ci) => `${rk}:${ri}:${ck}:${ci}`;

  /* ---------- Aufbau ---------- */

  function starte(daten, gespeichert, einstellungen, rueckruf) {
    raetsel = daten;
    zellen = (gespeichert && gespeichert.zellen) || {};
    haken = (gespeichert && gespeichert.haken) || {};
    einst = einstellungen || einst;
    beiAenderung = rueckruf || (() => {});
    zeichneGitter();
    zeichneHinweise();
    zeichneKopf();
    aktualisiere();
  }

  function kats() { return raetsel.raetsel.kategorien; }

  function zeichneKopf() {
    document.getElementById("r-titel").textContent = raetsel.titel;
    document.getElementById("r-einleitung").textContent = raetsel.einleitung;
  }

  /* Zeilengruppen: Kategorien 0 … K-2, Spaltengruppen: 1 … K-1.
     Ein Feld existiert nur, wenn Spaltenkategorie > Zeilenkategorie.   */
  function zeichneGitter() {
    const K = kats().length;
    const n = kats()[0].werte.length;
    const zeilenKats = [...Array(K - 1).keys()];          // 0 … K-2
    const spaltenKats = [...Array(K - 1).keys()].map(i => i + 1); // 1 … K-1

    let h = "<table class='gitter'>";

    // Kopfzeile 1: Kategorienamen über den Spaltengruppen
    h += "<tr><th class='ecke' colspan='2'></th>";
    spaltenKats.forEach((ck, i) => {
      h += `<th class='gruppe${i ? " trenner" : ""}' colspan='${n}'>${kats()[ck].name}</th>`;
    });
    h += "</tr>";

    // Kopfzeile 2: gedrehte Wertebeschriftung
    h += "<tr><th class='ecke' colspan='2'></th>";
    spaltenKats.forEach((ck, i) => {
      kats()[ck].werte.forEach((w, j) => {
        h += `<th class='spalte${i && j === 0 ? " trenner" : ""}'><span>${w}</span></th>`;
      });
    });
    h += "</tr>";

    // Zeilen
    zeilenKats.forEach((rk, gi) => {
      kats()[rk].werte.forEach((w, ri) => {
        h += `<tr${ri === 0 && gi > 0 ? " class='blockstart'" : ""}>`;
        if (ri === 0) h += `<th class='gruppe laengs' rowspan='${n}'><span>${kats()[rk].name}</span></th>`;
        h += `<th class='zeile'>${w}</th>`;
        spaltenKats.forEach((ck, si) => {
          kats()[ck].werte.forEach((_, ci) => {
            const kante = si && ci === 0 ? " trenner" : "";
            if (ck <= rk) {
              h += `<td class='leer${kante}'></td>`;
            } else {
              h += `<td class='zelle${kante}' data-rk='${rk}' data-ri='${ri}' data-ck='${ck}' data-ci='${ci}'></td>`;
            }
          });
        });
        h += "</tr>";
      });
    });

    h += "</table>";
    const feld = document.getElementById("gitterfeld");
    feld.innerHTML = h;
    feld.querySelectorAll("td.zelle").forEach(td => td.addEventListener("click", () => tippe(td)));
  }

  function zeichneHinweise() {
    const liste = document.getElementById("hinweisliste");
    liste.innerHTML = raetsel.raetsel.hinweise.map(hw => `
      <li class="hinweis${haken[hw.nr] ? " abgehakt" : ""}" data-nr="${hw.nr}">
        <button type="button">
          <span class="hnr">${hw.nr}</span>
          <span class="htext">${hw.text}</span>
        </button>
      </li>`).join("");
    liste.querySelectorAll("li").forEach(li => {
      li.querySelector("button").addEventListener("click", () => {
        const nr = +li.dataset.nr;
        if (haken[nr]) delete haken[nr]; else haken[nr] = true;
        li.classList.toggle("abgehakt", !!haken[nr]);
        beiAenderung(stand());
      });
    });
  }

  /* ---------- Zellen ---------- */

  function tippe(td) {
    const { rk, ri, ck, ci } = td.dataset;
    const s = schluessel(rk, ri, ck, ci);
    const neu = ((zellen[s] || LEER) + 1) % 3;
    if (neu === LEER) delete zellen[s]; else zellen[s] = neu;
    if (neu === GESETZT && einst.autoStreichen) fortschreiben(+rk, +ri, +ck, +ci);
    aktualisiere();
    meldung("");
    beiAenderung(stand());
  }

  /* Offensichtliche Folgerung: eine gesetzte Zelle streicht ihre Zeile und ihre Spalte */
  function fortschreiben(rk, ri, ck, ci) {
    const n = kats()[0].werte.length;
    for (let x = 0; x < n; x++) {
      if (x !== ci) { const s = schluessel(rk, ri, ck, x); if (zellen[s] !== GESETZT) zellen[s] = AUS; }
      if (x !== ri) { const s = schluessel(rk, x, ck, ci); if (zellen[s] !== GESETZT) zellen[s] = AUS; }
    }
  }

  function aktualisiere() {
    document.querySelectorAll("#gitterfeld td.zelle").forEach(td => {
      const { rk, ri, ck, ci } = td.dataset;
      const w = zellen[schluessel(rk, ri, ck, ci)] || LEER;
      td.textContent = w === AUS ? "✗" : w === GESETZT ? "●" : "";
      td.classList.toggle("aus", w === AUS);
      td.classList.toggle("gesetzt", w === GESETZT);
    });
  }

  function leeren() {
    zellen = {};
    aktualisiere();
    meldung("");
    beiAenderung(stand());
  }

  /* ---------- Prüfen und Auflösung ---------- */

  function pruefe() {
    const K = kats().length, n = kats()[0].werte.length;
    let offen = 0, falsch = 0;

    for (let rk = 0; rk < K - 1; rk++) {
      for (let ck = rk + 1; ck < K; ck++) {
        for (let ri = 0; ri < n; ri++) {
          let gesetzteSpalte = -1;
          for (let ci = 0; ci < n; ci++) {
            if (zellen[schluessel(rk, ri, ck, ci)] === GESETZT) gesetzteSpalte = ci;
          }
          if (gesetzteSpalte < 0) { offen++; continue; }
          const wertZeile = kats()[rk].werte[ri];
          const wertSpalte = kats()[ck].werte[gesetzteSpalte];
          const person = raetsel.loesung.find(p => p[kats()[rk].name] === wertZeile);
          if (!person || person[kats()[ck].name] !== wertSpalte) falsch++;
        }
      }
    }

    if (offen > 0 && falsch === 0) {
      meldung(`Noch ${offen} Zuordnung${offen === 1 ? "" : "en"} offen — nichts überstürzen.`, "warten");
      return false;
    }
    if (falsch > 0) {
      meldung(`${falsch} Zuordnung${falsch === 1 ? " passt" : "en passen"} nicht zu den Hinweisen. Ein Umweg.`, "fehler");
      return false;
    }
    meldung("Stimmt. Diese Station ist geschafft.", "gut");
    zeigeAufloesung();
    beiAenderung(stand(true));
    return true;
  }

  function zeigeAufloesung() {
    const namen = kats().map(k => k.name);
    const sortier = kats().find(k => k.zahlen) || kats()[0];
    const zeilen = [...raetsel.loesung].sort((a, b) =>
      String(a[sortier.name]).localeCompare(String(b[sortier.name]), "de", { numeric: true }));
    document.getElementById("aufloesung").innerHTML =
      `<table class="tabelle"><tr>${namen.map(t => `<th>${t}</th>`).join("")}</tr>` +
      zeilen.map(z => `<tr>${namen.map(t => `<td>${z[t]}</td>`).join("")}</tr>`).join("") +
      `</table>`;
    document.getElementById("aufloesung").hidden = false;
  }

  function aufgeben() {
    zeigeAufloesung();
    meldung("Die Auflösung steht unten. Diese Station bleibt heute ungegangen.", "warten");
    beiAenderung(stand());
  }

  function meldung(text, art) {
    const m = document.getElementById("meldung");
    m.textContent = text;
    m.className = "meldung" + (art ? " " + art : "");
    m.hidden = !text;
  }

  /* ---------- Stand nach außen ---------- */

  function anteilGefuellt() {
    const K = kats().length, n = kats()[0].werte.length;
    const felder = (K * (K - 1) / 2) * n * n;
    const belegt = Object.keys(zellen).length;
    return Math.min(1, belegt / felder);
  }

  function stand(geloest) {
    return { zellen, haken, anteil: anteilGefuellt(), geloest: !!geloest };
  }

  return { starte, pruefe, leeren, aufgeben, stand, setzeEinstellung: e => { einst = e; } };
})();

if (typeof globalThis !== "undefined") globalThis.Logik = Logik;
