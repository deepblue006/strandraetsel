/* ============================================================
   DER STRANDWEG · v0.1 · Baustein 2
   generator.js — erzeugt eindeutige Zuordnungsrätsel

   Weg: Lösung zufällig ziehen → alle wahren Hinweise sammeln →
        so viele aufnehmen, bis der Solver "eindeutig" meldet →
        rückwärts wieder ausdünnen, solange eindeutig bleibt.
   Ergebnis: ein minimaler Hinweissatz, aus dem sich genau eine
   Zuordnung ableiten lässt — ohne Raten.

   Braucht: loeser.js
   ============================================================ */

const Generator = (function () {

  const L = (typeof require !== "undefined") ? require("./loeser.js") : globalThis.Loeser;

  /* ---------- Zufall mit Saat: gleiche Saat, gleiches Rätsel ---------- */

  function saatAusText(text) {                       // FNV-1a
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function wuerfel(saat) {                           // mulberry32
    let a = saat >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const zieheEins = (r, liste) => liste[Math.floor(r() * liste.length)];

  function mische(r, liste) {
    const a = liste.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function ziehe(r, liste, anzahl) { return mische(r, liste).slice(0, anzahl); }

  /* ---------- Wortvorrat ---------- */

  const VORNAMEN = ["Bruno", "Lena", "Ove", "Silke", "Hauke", "Frauke", "Jasper", "Mareike",
                    "Tede", "Wiebke", "Momme", "Antje", "Boye", "Insa", "Keno", "Thies"];
  const NACHNAMEN = ["Ahrens", "Dettmer", "Kruse", "Vollmer", "Jansen", "Petersen", "Lorenzen",
                     "Boysen", "Hinrichs", "Nommensen", "Feddersen", "Riewerts"];
  const ZIELE = ["Husum", "Flensburg", "Itzehoe", "Niebüll", "Heide", "Rendsburg", "Meldorf"];
  const GETRAENKE = ["Milchkaffee", "Ostfriesentee", "Buttermilch", "Apfelschorle", "Espresso", "Kakao"];
  const KUCHEN = ["Rote Grütze", "Butterkuchen", "Friesentorte", "Streuselschnecke", "Apfeltasche"];
  const GEPAECK = ["Seesack", "Hartschalenkoffer", "Weidenkorb", "Rucksack", "Hutschachtel", "Werkzeugkiste"];

  /* ---------- Kategorienbausteine ----------
     Jeder Baustein liefert Werte und die Sätze, in denen er vorkommt.
     Die Logik kennt nur Indizes — hier entsteht die Sprache.          */

  function katVorname(r, n) {
    return {
      name: "Vorname",
      werte: ziehe(r, VORNAMEN, n),
      nennbar: true,
      subjekt: w => w,
      praedikat: w => `heißt mit Vornamen ${w}`,
      verneint: w => `heißt mit Vornamen nicht ${w}`,
      wederNoch: (a, b) => `heißt mit Vornamen weder ${a} noch ${b}`
    };
  }

  function katNachname(r, n) {
    return {
      name: "Nachname",
      werte: ziehe(r, NACHNAMEN, n),
      nennbar: true,
      subjekt: w => w,
      praedikat: w => `heißt ${w}`,
      verneint: w => `heißt nicht ${w}`,
      wederNoch: (a, b) => `heißt weder ${a} noch ${b}`
    };
  }

  function katAuswahl(r, n, name, vorrat, verb) {
    return {
      name,
      werte: ziehe(r, vorrat, n),
      subjekt: w => `wer ${verb.subjekt(w)}`,
      praedikat: w => verb.praedikat(w),
      verneint: w => verb.verneint(w),
      wederNoch: (a, b) => verb.wederNoch(a, b)
    };
  }

  function katNumerisch(r, n, name, wortFuer, saetze) {
    const zahlen = Array.from({ length: n }, (_, i) => i + 1);
    return {
      name,
      werte: zahlen.map(wortFuer),
      zahlen,
      numerisch: true,
      subjekt: w => `wer ${saetze.an(w)}`,
      praedikat: w => saetze.praedikat(w),
      verneint: w => saetze.verneint(w),
      wederNoch: (w1, w2) => saetze.wederNoch(w1, w2),
      kleinerSatz: (sa, sb) => saetze.kleiner(sa, sb),
      differenzSatz: (sa, sb, d) => saetze.differenz(sa, sb, d)
    };
  }

  /* ---------- Szenarien ---------- */

  const SZENARIEN = [

    { id: "bahnsteig", maxKategorien: 5,
      baue(r, katZahl, n) {
        const bank = katNumerisch(r, n, "Bank", i => `Bank ${i}`, {
          an: w => `auf ${w} sitzt`,
          praedikat: w => `sitzt auf ${w}`,
          verneint: w => `sitzt nicht auf ${w}`,
          wederNoch: (a, b) => `sitzt weder auf ${a} noch auf ${b}`,
          kleiner: (sa, sb) => `${sa} sitzt auf einer Bank mit kleinerer Nummer als ${sb}`,
          differenz: (sa, sb, d) =>
            `Die Nummer der Bank von ${sa} ist um ${zahlwort(d)} kleiner als die von ${sb}`
        });
        const ziel = katAuswahl(r, n, "Ziel", ZIELE, {
          subjekt: w => `nach ${w} will`,
          praedikat: w => `fährt nach ${w}`,
          verneint: w => `fährt nicht nach ${w}`,
          wederNoch: (a, b) => `fährt weder nach ${a} noch nach ${b}`
        });
        const gepaeck = katAuswahl(r, n, "Gepäck", GEPAECK, {
          subjekt: w => `${w} dabeihat`,
          praedikat: w => `hat ${w} dabei`,
          verneint: w => `hat ${w} nicht dabei`,
          wederNoch: (a, b) => `hat weder ${a} noch ${b} dabei`
        });
        return {
          titel: "Die Bank am Gleis",
          einleitung: `${zahlwort(n, true)} Reisende warten auf den Zug, der Verspätung hat. Sie haben sich auf ${zahlwort(n)} Bänke verteilt — von Bank 1 am Treppenaufgang bis Bank ${n} am windigen Ende des Bahnsteigs.`,
          kategorien: [katVorname(r, n), katNachname(r, n), bank, ziel, gepaeck].slice(0, katZahl)
        };
      }
    },

    { id: "cafe", maxKategorien: 5,
      baue(r, katZahl, n) {
        const tisch = katNumerisch(r, n, "Tisch", i => `Tisch ${i}`, {
          an: w => `an ${w} sitzt`,
          praedikat: w => `sitzt an ${w}`,
          verneint: w => `sitzt nicht an ${w}`,
          wederNoch: (a, b) => `sitzt weder an ${a} noch an ${b}`,
          kleiner: (sa, sb) => `${sa} sitzt an einem Tisch mit kleinerer Nummer als ${sb}`,
          differenz: (sa, sb, d) =>
            `Die Nummer des Tisches von ${sa} ist um ${zahlwort(d)} kleiner als die von ${sb}`
        });
        const getraenk = katAuswahl(r, n, "Getränk", GETRAENKE, {
          subjekt: w => `${w} bestellt hat`,
          praedikat: w => `trinkt ${w}`,
          verneint: w => `hat ${w} nicht bestellt`,
          wederNoch: (a, b) => `hat weder ${a} noch ${b} bestellt`
        });
        const kuchen = katAuswahl(r, n, "Kuchen", KUCHEN, {
          subjekt: w => `${w} isst`,
          praedikat: w => `isst ${w}`,
          verneint: w => `isst nicht ${w}`,
          wederNoch: (a, b) => `isst weder ${a} noch ${b}`
        });
        return {
          titel: "Am langen Tisch",
          einleitung: `Im Strandcafé sind ${zahlwort(n)} Tische besetzt — Tisch 1 steht am Fenster mit Blick aufs Wasser, Tisch ${n} an der Theke.`,
          kategorien: [katVorname(r, n), katNachname(r, n), tisch, getraenk, kuchen].slice(0, katZahl)
        };
      }
    }
  ];

  function zahlwort(z, gross) {
    const w = { 1: "eins", 2: "zwei", 3: "drei", 4: "vier", 5: "fünf", 6: "sechs" }[z] || String(z);
    return gross ? w.charAt(0).toUpperCase() + w.slice(1) : w;
  }

  /* ---------- Kandidaten: alle Hinweise, die zur Lösung passen ---------- */

  function baueKandidaten(r, kats, ent) {
    const K = kats.length, n = ent.length;
    const A = (k, i) => ({ kat: kats[k].name, wert: kats[k].werte[i] });
    const aus = [];

    // Gleichsetzung und Verneinung
    for (let k1 = 0; k1 < K; k1++) {
      for (let k2 = k1 + 1; k2 < K; k2++) {
        for (let i = 0; i < n; i++) {
          aus.push({ typ: "gleich", a: A(k1, ent[i][k1]), b: A(k2, ent[i][k2]) });
          for (let j = 0; j < n; j++) {
            if (j !== ent[i][k2]) aus.push({ typ: "ungleich", a: A(k1, ent[i][k1]), b: A(k2, j) });
          }
        }
      }
    }

    // Mehrfachausschluss: zwei falsche Werte in einer anderen Kategorie
    for (let k1 = 0; k1 < K; k1++) {
      for (let k2 = 0; k2 < K; k2++) {
        if (k1 === k2) continue;
        for (let i = 0; i < n; i++) {
          const falsche = [];
          for (let j = 0; j < n; j++) if (j !== ent[i][k2]) falsche.push(j);
          const paar = ziehe(r, falsche, 2);
          if (paar.length === 2) {
            aus.push({ typ: "keinesVon", a: A(k1, ent[i][k1]), b: [A(k2, paar[0]), A(k2, paar[1])] });
          }
        }
      }
    }

    // Ordnung und feste Differenz auf numerischen Kategorien
    for (let kn = 0; kn < K; kn++) {
      if (!kats[kn].zahlen) continue;
      const zahl = i => kats[kn].zahlen[ent[i][kn]];
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === j || zahl(i) >= zahl(j)) continue;
          for (let ka = 0; ka < K; ka++) {
            if (ka === kn || !kats[ka].nennbar) continue;
            for (let kb = 0; kb < K; kb++) {
              if (kb === kn || !kats[kb].nennbar) continue;
              aus.push({ typ: "kleiner", kat: kats[kn].name, a: A(ka, ent[i][ka]), b: A(kb, ent[j][kb]) });
              aus.push({ typ: "differenz", kat: kats[kn].name, betrag: zahl(j) - zahl(i),
                         a: A(ka, ent[i][ka]), b: A(kb, ent[j][kb]) });
            }
          }
        }
      }
    }
    return aus;
  }

  /* ---------- Schwierigkeit: wie oft welcher Typ vorn landet ---------- */

  const GEWICHTE = {
    leicht: { gleich: 6, ungleich: 3, keinesVon: 3, kleiner: 1.2, differenz: 0.8 },
    mittel: { gleich: 2, ungleich: 3, keinesVon: 3, kleiner: 3, differenz: 2 },
    schwer: { gleich: 0.6, ungleich: 2, keinesVon: 2, kleiner: 4, differenz: 3 }
  };

  function gewichtetMischen(r, kandidaten, stufe) {
    const g = GEWICHTE[stufe] || GEWICHTE.mittel;
    return kandidaten
      .map(h => ({ h, rang: -Math.log(1 - r()) / (g[h.typ] || 1) })) // gewichtete Ziehung
      .sort((x, y) => x.rang - y.rang)
      .map(x => x.h);
  }

  /* ---------- Satzbau ---------- */

  function satz(kats, h) {
    const kat = name => kats.find(k => k.name === name);
    const roh = a => kat(a.kat).subjekt(a.wert);
    const s = a => { const t = roh(a); return t.startsWith("wer ") ? t + "," : t; };
    const p = a => kat(a.kat).praedikat(a.wert);
    const v = a => kat(a.kat).verneint(a.wert);
    const gross = t => t.charAt(0).toUpperCase() + t.slice(1);

    switch (h.typ) {
      case "gleich":    return gross(`${s(h.a)} ${p(h.b)}.`);
      case "ungleich":  return gross(`${s(h.a)} ${v(h.b)}.`);
      case "keinesVon": {
        const k = kat(h.b[0].kat);
        if (k.wederNoch) return gross(`${s(h.a)} ${k.wederNoch(h.b[0].wert, h.b[1].wert)}.`);
        return gross(`${s(h.a)} ${k.verneint(h.b[0].wert)} und ${k.verneint(h.b[1].wert)}.`);
      }
      case "kleiner":   return gross(`${kat(h.kat).kleinerSatz(s(h.a), s(h.b))}.`);
      case "differenz": return gross(`${kat(h.kat).differenzSatz(s(h.a), s(h.b), h.betrag)}.`);
      default:          return "";
    }
  }

  /* ---------- Hauptfunktion ---------- */

  function erzeuge(opt = {}) {
    const start = Date.now();
    const stufe = opt.schwierigkeit || "mittel";
    const n = opt.groesse || 4;
    const katZahl = opt.kategorien || 3;
    const r = wuerfel(typeof opt.saat === "string" ? saatAusText(opt.saat) : (opt.saat ?? 1));

    const tauglich = SZENARIEN.filter(s => (s.maxKategorien || 3) >= katZahl);
    if (tauglich.length === 0) throw new Error(`Kein Szenario mit ${katZahl} Kategorien vorhanden`);
    const gewuenscht = opt.szenario ? tauglich.find(s => s.id === opt.szenario) : null;
    const szenario = gewuenscht || zieheEins(r, tauglich);

    const bau = szenario.baue(r, katZahl, n);
    const kats = bau.kategorien;
    if (kats.length !== katZahl) {
      throw new Error(`Szenario "${szenario.id}" liefert ${kats.length} statt ${katZahl} Kategorien`);
    }
    const K = kats.length;

    // Lösung ziehen: Kategorie 0 in fester Reihenfolge, alle anderen als Permutation
    const ent = Array.from({ length: n }, (_, i) => [i]);
    for (let k = 1; k < K; k++) {
      const perm = mische(r, Array.from({ length: n }, (_, i) => i));
      for (let i = 0; i < n; i++) ent[i].push(perm[i]);
    }

    const grundRaetsel = { kategorien: kats.map(k => ({ name: k.name, werte: k.werte, zahlen: k.zahlen })) };
    const pruefe = hinweise => L.loese({ ...grundRaetsel, hinweise });

    // Aufbau: Hinweise aufnehmen, bis genau eine Lösung übrig bleibt
    const vorrat = gewichtetMischen(r, baueKandidaten(r, kats, ent), stufe);
    const gewaehlt = [];
    let solverLaeufe = 0;
    for (const h of vorrat) {
      gewaehlt.push(h);
      if (gewaehlt.length < 3) continue;
      solverLaeufe++;
      if (pruefe(gewaehlt).status === "eindeutig") break;
    }
    if (pruefe(gewaehlt).status !== "eindeutig") return null;   // sollte nicht vorkommen

    // Ausdünnen: von hinten nach vorn versuchen wegzulassen
    let minimal = gewaehlt.slice();
    for (let i = minimal.length - 1; i >= 0; i--) {
      const ohne = minimal.filter((_, k) => k !== i);
      solverLaeufe++;
      if (ohne.length >= 2 && pruefe(ohne).status === "eindeutig") minimal = ohne;
    }

    // Hinweise in eine lesbare Reihenfolge bringen und beschriften
    const hinweise = mische(r, minimal).map((h, i) => ({ ...h, nr: i + 1, text: satz(kats, h) }));

    const loesung = ent.map(zeile => {
      const o = {};
      kats.forEach((k, ki) => { o[k.name] = k.werte[zeile[ki]]; });
      return o;
    });

    return {
      titel: bau.titel,
      einleitung: bau.einleitung,
      frage: `Wer sitzt wo, und wer ist wer?`,
      szenario: szenario.id,
      schwierigkeit: stufe,
      raetsel: { ...grundRaetsel, hinweise },   // genau das, was loeser.js erwartet
      loesung,
      statistik: {
        hinweise: hinweise.length,
        typen: hinweise.reduce((z, h) => (z[h.typ] = (z[h.typ] || 0) + 1, z), {}),
        solverLaeufe,
        dauerMs: Date.now() - start
      }
    };
  }

  /* Tagesrätsel: dasselbe Datum liefert immer dasselbe Rätsel */
  function tagesRaetsel(datum, opt = {}) {
    const d = datum instanceof Date ? datum : new Date(datum);
    const tag = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return erzeuge({ ...opt, saat: `logik|${tag}` });
  }

  return { erzeuge, tagesRaetsel, saatAusText, wuerfel };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Generator;
if (typeof globalThis !== "undefined") globalThis.Generator = Generator;
