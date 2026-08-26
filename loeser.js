/* ============================================================
   DER STRANDWEG · v0.1 · Baustein 1
   loeser.js — Constraint-Solver für Zuordnungsrätsel

   Eingabe:  Rätselbeschreibung (Kategorien + Hinweise)
   Ausgabe:  { status: "eindeutig" | "mehrdeutig" | "widerspruechlich",
               loesung, zweiteLoesung, dauerMs }

   Kein Framework, keine Abhängigkeiten. Läuft in node und im Browser.
   Wird gebraucht von: Generator (Eindeutigkeitsprüfung) und
   später der optionalen Hinweisfunktion.
   ============================================================ */

const Loeser = (function () {

  /* ---------- Rätsel einlesen und indizieren ---------- */

  function indiziere(raetsel) {
    const kats = raetsel.kategorien;
    const n = kats[0].werte.length;

    kats.forEach((k, i) => {
      if (k.werte.length !== n) {
        throw new Error(`Kategorie "${k.name}" hat ${k.werte.length} Ausprägungen, erwartet ${n}`);
      }
      if (k.zahlen && k.zahlen.length !== n) {
        throw new Error(`Kategorie "${k.name}": zahlen passt nicht zu werte`);
      }
      k._index = i;
    });

    const katNr = new Map(kats.map((k, i) => [k.name, i]));
    const wertNr = kats.map(k => new Map(k.werte.map((w, i) => [w, i])));

    function anker(a, wo) {
      if (!katNr.has(a.kat)) throw new Error(`${wo}: unbekannte Kategorie "${a.kat}"`);
      const k = katNr.get(a.kat);
      if (!wertNr[k].has(a.wert)) throw new Error(`${wo}: unbekannte Ausprägung "${a.wert}" in "${a.kat}"`);
      return { k, i: wertNr[k].get(a.wert) };
    }

    const hinweise = raetsel.hinweise.map((h, nr) => {
      const wo = `Hinweis ${nr + 1}`;
      const g = { typ: h.typ, text: h.text || "", nr };
      switch (h.typ) {
        case "gleich":
        case "ungleich":
          g.a = anker(h.a, wo); g.b = anker(h.b, wo); break;
        case "keinesVon":
          g.a = anker(h.a, wo); g.liste = h.b.map(x => anker(x, wo)); break;
        case "kleiner":
        case "differenz": {
          g.a = anker(h.a, wo); g.b = anker(h.b, wo);
          if (!katNr.has(h.kat)) throw new Error(`${wo}: unbekannte Kategorie "${h.kat}"`);
          g.kat = katNr.get(h.kat);
          if (!kats[g.kat].zahlen) throw new Error(`${wo}: Kategorie "${h.kat}" hat keine Zahlen`);
          if (h.typ === "differenz") {
            if (typeof h.betrag !== "number") throw new Error(`${wo}: betrag fehlt`);
            g.betrag = h.betrag;
          }
          break;
        }
        default:
          throw new Error(`${wo}: unbekannter Hinweistyp "${h.typ}"`);
      }
      return g;
    });

    return { kats, n, K: kats.length, hinweise };
  }

  /* ---------- Netz: für jedes Kategorienpaar eine Möglichkeitsmatrix ----------
     netz[a][b] ist ein Uint8Array der Länge n*n, nur für a < b belegt.
     1 = "kann dieselbe Person sein", 0 = ausgeschlossen.                     */

  function neuesNetz(K, n) {
    const netz = [];
    for (let a = 0; a < K; a++) {
      netz.push([]);
      for (let b = 0; b < K; b++) {
        netz[a].push(b > a ? new Uint8Array(n * n).fill(1) : null);
      }
    }
    return netz;
  }

  function kopiereNetz(netz) {
    return netz.map(zeile => zeile.map(m => (m ? m.slice() : null)));
  }

  /* ---------- Zustand mit Zugriffs- und Änderungsfunktionen ---------- */

  function zustand(ctx, netz) {
    const n = ctx.n;
    let widerspruch = false;

    function moeglich(a, i, b, j) {
      if (a === b) return i === j;
      return a < b ? netz[a][b][i * n + j] === 1 : netz[b][a][j * n + i] === 1;
    }

    function streiche(a, i, b, j) {          // gibt true zurück, wenn etwas geändert wurde
      if (a === b) { if (i === j) widerspruch = true; return false; }
      const idx = a < b ? i * n + j : j * n + i;
      const m = a < b ? netz[a][b] : netz[b][a];
      if (m[idx] === 0) return false;
      m[idx] = 0;
      return true;
    }

    function setze(a, i, b, j) {             // fixiert ein Paar: Zeile und Spalte räumen
      if (a === b) { if (i !== j) widerspruch = true; return false; }
      if (!moeglich(a, i, b, j)) { widerspruch = true; return false; }
      let geaendert = false;
      for (let x = 0; x < n; x++) {
        if (x !== j) geaendert = streiche(a, i, b, x) || geaendert;
        if (x !== i) geaendert = streiche(a, x, b, j) || geaendert;
      }
      return geaendert;
    }

    function kandidaten(a, i, b) {           // mögliche Partner von (a,i) in Kategorie b
      if (a === b) return [i];
      const out = [];
      for (let j = 0; j < n; j++) if (moeglich(a, i, b, j)) out.push(j);
      return out;
    }

    return {
      get widerspruch() { return widerspruch; },
      melde() { widerspruch = true; },
      moeglich, streiche, setze, kandidaten, netz
    };
  }

  /* ---------- Propagation ---------- */

  function propagiere(ctx, z) {
    const { n, K, kats, hinweise } = ctx;
    let runde = 0;

    while (true) {
      let geaendert = false;
      if (z.widerspruch) return false;

      /* 1 — Hinweise anwenden */
      for (const h of hinweise) {
        geaendert = wendeHinweisAn(ctx, z, h) || geaendert;
        if (z.widerspruch) return false;
      }

      /* 2 — Eindeutigkeit in Zeilen und Spalten */
      for (let a = 0; a < K; a++) {
        for (let b = a + 1; b < K; b++) {
          for (let i = 0; i < n; i++) {
            const k = z.kandidaten(a, i, b);
            if (k.length === 0) { z.melde(); return false; }
            if (k.length === 1) geaendert = z.setze(a, i, b, k[0]) || geaendert;
          }
          for (let j = 0; j < n; j++) {
            const k = [];
            for (let i = 0; i < n; i++) if (z.moeglich(a, i, b, j)) k.push(i);
            if (k.length === 0) { z.melde(); return false; }
            if (k.length === 1) geaendert = z.setze(a, k[0], b, j) || geaendert;
          }
        }
      }

      /* 3 — Transitivität über einen Zwischenschritt:
             a~c nur möglich, wenn es ein b gibt, das zu beiden passt        */
      for (let a = 0; a < K; a++) {
        for (let c = 0; c < K; c++) {
          if (a === c) continue;
          for (let b = 0; b < K; b++) {
            if (b === a || b === c) continue;
            for (let i = 0; i < n; i++) {
              for (let k = 0; k < n; k++) {
                if (!z.moeglich(a, i, c, k)) continue;
                let bruecke = false;
                for (let j = 0; j < n; j++) {
                  if (z.moeglich(a, i, b, j) && z.moeglich(b, j, c, k)) { bruecke = true; break; }
                }
                if (!bruecke) geaendert = z.streiche(a, i, c, k) || geaendert;
              }
            }
          }
        }
      }

      if (z.widerspruch) return false;
      if (!geaendert) return true;
      if (++runde > 200) return true;        // Notbremse, sollte nie greifen
    }
  }

  /* ---------- Hinweistypen ---------- */

  function wendeHinweisAn(ctx, z, h) {
    switch (h.typ) {
      case "gleich":
        return z.setze(h.a.k, h.a.i, h.b.k, h.b.i);

      case "ungleich":
        return z.streiche(h.a.k, h.a.i, h.b.k, h.b.i);

      case "keinesVon": {
        let g = false;
        for (const b of h.liste) g = z.streiche(h.a.k, h.a.i, b.k, b.i) || g;
        return g;
      }

      case "kleiner":
        return ordnung(ctx, z, h, null);

      case "differenz":
        return ordnung(ctx, z, h, h.betrag);

      default:
        return false;
    }
  }

  /* Gemeinsame Logik für "kleiner als" und "genau um X kleiner/größer".
     betrag === null  →  zahl(a) <  zahl(b)
     betrag === d     →  zahl(b) === zahl(a) + d                            */
  function ordnung(ctx, z, h, betrag) {
    const zahlen = ctx.kats[h.kat].zahlen;
    const n = ctx.n;
    let geaendert = false;

    // Zwei verschiedene Personen (bei Differenz 0 wäre es dieselbe)
    if (betrag !== 0) geaendert = z.streiche(h.a.k, h.a.i, h.b.k, h.b.i) || geaendert;

    const kandA = z.kandidaten(h.a.k, h.a.i, h.kat);
    const kandB = z.kandidaten(h.b.k, h.b.i, h.kat);
    if (kandA.length === 0 || kandB.length === 0) { z.melde(); return geaendert; }

    const passt = (za, zb) => (betrag === null ? za < zb : zb - za === betrag);

    for (const ja of kandA) {
      if (!kandB.some(jb => passt(zahlen[ja], zahlen[jb]))) {
        geaendert = z.streiche(h.a.k, h.a.i, h.kat, ja) || geaendert;
      }
    }
    for (const jb of kandB) {
      if (!kandA.some(ja => passt(zahlen[ja], zahlen[jb]))) {
        geaendert = z.streiche(h.b.k, h.b.i, h.kat, jb) || geaendert;
      }
    }
    return geaendert;
  }

  /* ---------- Suche: zählt Lösungen, bricht bei zwei ab ---------- */

  function suche(ctx, netz, gefunden, grenze) {
    const z = zustand(ctx, netz);
    if (!propagiere(ctx, z)) return;

    // offenste Stelle suchen: Zeile mit den wenigsten, aber mehr als einem Kandidaten
    let beste = null;
    for (let a = 0; a < ctx.K && !beste; a++) {
      for (let b = a + 1; b < ctx.K; b++) {
        for (let i = 0; i < ctx.n; i++) {
          const k = z.kandidaten(a, i, b);
          if (k.length > 1 && (!beste || k.length < beste.k.length)) beste = { a, b, i, k };
        }
      }
    }

    if (!beste) {                                   // alles fixiert → eine Lösung
      gefunden.push(leseLoesung(ctx, z));
      return;
    }

    for (const j of beste.k) {
      if (gefunden.length >= grenze) return;
      const kopie = kopiereNetz(netz);
      const zk = zustand(ctx, kopie);
      zk.setze(beste.a, beste.i, beste.b, j);
      if (!zk.widerspruch) suche(ctx, kopie, gefunden, grenze);
    }
  }

  function leseLoesung(ctx, z) {
    const { kats, n, K } = ctx;
    const zeilen = [];
    for (let i = 0; i < n; i++) {
      const zeile = {};
      zeile[kats[0].name] = kats[0].werte[i];
      for (let b = 1; b < K; b++) {
        const k = z.kandidaten(0, i, b);
        zeile[kats[b].name] = k.length === 1 ? kats[b].werte[k[0]] : "?";
      }
      zeilen.push(zeile);
    }
    return zeilen;
  }

  /* ---------- Öffentliche Schnittstelle ---------- */

  function loese(raetsel) {
    const start = Date.now();
    const ctx = indiziere(raetsel);
    const gefunden = [];
    suche(ctx, neuesNetz(ctx.K, ctx.n), gefunden, 2);

    const status = gefunden.length === 0 ? "widerspruechlich"
                 : gefunden.length === 1 ? "eindeutig"
                 : "mehrdeutig";

    return {
      status,
      loesung: gefunden[0] || null,
      zweiteLoesung: gefunden[1] || null,
      dauerMs: Date.now() - start
    };
  }

  /* Auflösung als Tabelle, sortiert nach einer Kategorie — für die Kontrolle */
  function alsTabelle(loesung, nachKategorie) {
    if (!loesung) return "(keine Lösung)";
    const spalten = Object.keys(loesung[0]);
    const zeilen = nachKategorie
      ? [...loesung].sort((x, y) => String(x[nachKategorie]).localeCompare(String(y[nachKategorie]), "de"))
      : loesung;
    const breite = spalten.map(s => Math.max(s.length, ...zeilen.map(z => String(z[s]).length)));
    const linie = (zs) => zs.map((t, i) => String(t).padEnd(breite[i])).join("  ");
    return [linie(spalten), linie(breite.map(b => "-".repeat(b))), ...zeilen.map(z => linie(spalten.map(s => z[s])))].join("\n");
  }

  return { loese, alsTabelle };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Loeser;
if (typeof globalThis !== "undefined") globalThis.Loeser = Loeser;
