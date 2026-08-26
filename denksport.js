/* ============================================================
   DIE STRANDRÄTSEL · js/denksport.js
   Denksportaufgaben — reine Wortlogik, kurzer Text, eine Antwort

   Drei Gattungen, alle erzeugt und auf Eindeutigkeit geprüft:
     nomen   — "Genau eine der Aussagen ist wahr", Zuordnung gesucht
     arbeit  — Textaufgabe über Arbeitszeiten, Zahl gesucht
     alter   — Textaufgabe über Lebensalter, Zahl gesucht

   Jede Aufgabe bringt ihren Lösungsweg mit.
   ============================================================ */

const Denksport = (function () {

  /* ---------- Zufall mit Saat ---------- */

  function saatAusText(t) {
    let h = 2166136261;
    for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function wuerfel(saat) {
    let a = saat >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const eins = (r, l) => l[Math.floor(r() * l.length)];
  function mische(r, l) {
    const a = l.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function permutationen(n) {
    const aus = [];
    const gebaut = [];
    const benutzt = new Array(n).fill(false);
    (function weiter() {
      if (gebaut.length === n) { aus.push(gebaut.slice()); return; }
      for (let i = 0; i < n; i++) {
        if (benutzt[i]) continue;
        benutzt[i] = true; gebaut.push(i);
        weiter();
        gebaut.pop(); benutzt[i] = false;
      }
    })();
    return aus;
  }

  /* =========================================================
     1 — NOMEN NON EST OMEN
     Personen tragen Berufsnamen als Nachnamen; gesucht ist,
     wer welchen Beruf ausübt. Genau eine Aussage ist wahr.
     ========================================================= */

  const BERUFSPAARE = [
    { nach: "Müller",   beruf: "Müller",   artikel: "der" },
    { nach: "Schneider",beruf: "Schneider",artikel: "der" },
    { nach: "Fischer",  beruf: "Fischer",  artikel: "der" },
    { nach: "Bäcker",   beruf: "Bäcker",   artikel: "der" },
    { nach: "Schäfer",  beruf: "Schäfer",  artikel: "der" },
    { nach: "Schmied",  beruf: "Schmied",  artikel: "der" },
    { nach: "Weber",    beruf: "Weber",    artikel: "der" },
    { nach: "Köhler",   beruf: "Köhler",   artikel: "der" }
  ];

  function nomen(r) {
    const n = 3;
    const leute = mische(r, BERUFSPAARE).slice(0, n);
    const namen = leute.map(l => l.nach);

    const alleP = permutationen(n);                       // p[i] = Beruf von Person i

    // Kandidatenaussagen: "Herr X ist (nicht) der Y"
    const kandidaten = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        kandidaten.push({
          text: `Herr ${namen[i]} ist der ${namen[j]}.`,
          gilt: p => p[i] === j
        });
        kandidaten.push({
          text: `Herr ${namen[i]} ist nicht der ${namen[j]}.`,
          gilt: p => p[i] !== j
        });
      }
    }

    // Erst die Verteilung festlegen: niemand übt den Beruf seines Namens aus.
    // Dann eine wahre und drei falsche Aussagen dazu wählen und prüfen,
    // ob diese Verteilung die einzige mit genau einer wahren Aussage ist.
    const derangements = alleP.filter(p => p.every((j, i) => j !== i));

    for (let versuch = 0; versuch < 400; versuch++) {
      const p = eins(r, derangements);
      const wahre = mische(r, kandidaten.filter(a => a.gilt(p)));
      const falsche = mische(r, kandidaten.filter(a => !a.gilt(p)));
      if (!wahre.length || falsche.length < 3) continue;

      const wahl = mische(r, [wahre[0]].concat(falsche.slice(0, 3)));
      const passend = alleP.filter(q => wahl.filter(a => a.gilt(q)).length === 1);
      if (passend.length !== 1 || passend[0].join() !== p.join()) continue;

      const buchstabe = i => "ABCD"[i];
      const wahrIndex = wahl.findIndex(a => a.gilt(p));
      return {
        gattung: "nomen",
        titel: "Nomen non est omen",
        text: `Der ${namen[0]}, der ${namen[1]} und der ${namen[2]} heißen mit Nachnamen ` +
              `${namen[0]}, ${namen[1]} und ${namen[2]}. Der Name sagt hier nichts über den Beruf. ` +
              `Genau eine der vier Aussagen ist wahr:`,
        aussagen: wahl.map((a, i) => `${buchstabe(i)}. ${a.text}`),
        frage: "Wer übt welchen Beruf aus?",
        form: "zuordnung",
        felder: namen.map(nm => ({ name: `Herr ${nm}`, auswahl: namen })),
        loesung: p.map(j => namen[j]),
        weg: `Nur bei einer einzigen Verteilung trifft genau eine der vier Aussagen zu — ` +
             `nämlich Aussage ${buchstabe(wahrIndex)}. Jede andere Verteilung macht entweder ` +
             `keine oder mehrere Aussagen wahr.\n\n` +
             p.map((j, i) => `Herr ${namen[i]} ist der ${namen[j]}.`).join("\n")
      };
    }
    return null;
  }

  /* =========================================================
     2 — ARBEITSZEIT
     Meister braucht x Stunden, Geselle x+d.
     Zusammen brauchen sie v Stunden weniger als der Meister allein:
        1/x + 1/(x+d) = 1/(x-v)     →     x² - 2vx - dv = 0
     ========================================================= */

  const HANDWERK = [
    { meister: "Maurermeister", geselle: "Geselle", werk: "eine Mauer" },
    { meister: "Reetdachdecker", geselle: "Lehrling", werk: "ein Dach" },
    { meister: "Bootsbauer", geselle: "Geselle", werk: "einen Bootsrumpf" },
    { meister: "Tischlermeister", geselle: "Geselle", werk: "eine Treppe" },
    { meister: "Deichbaumeister", geselle: "Gehilfe", werk: "einen Deichabschnitt" }
  ];

  function arbeit(r) {
    // Ganzzahlige Fälle sammeln: x = v + √(v² + d·v)
    const faelle = [];
    for (let v = 2; v <= 12; v++) {
      for (let d = 4; d <= 30; d++) {
        const w = v * v + d * v;
        const s = Math.round(Math.sqrt(w));
        if (s * s !== w) continue;
        const x = v + s;
        if (x <= v + 1 || x > 40) continue;
        faelle.push({ x, d, v });
      }
    }
    if (!faelle.length) return null;
    const f = eins(r, faelle);
    const h = eins(r, HANDWERK);

    return {
      gattung: "arbeit",
      titel: `Der ${h.meister}`,
      text: `Ein ${h.meister} benötigt für ${h.werk} ` +
            `${f.d} Stunden weniger Zeit als sein ${h.geselle}. Arbeiten die beiden zusammen, ` +
            `brauchen sie ${f.v} Stunden weniger, als wenn der ${h.meister} allein arbeiten würde.`,
      frage: `Wie lange braucht der ${h.meister} allein?`,
      form: "zahl",
      einheit: "Stunden",
      loesung: f.x,
      weg: `Der Meister braucht x Stunden, der ${h.geselle} also x + ${f.d}. ` +
           `Zusammen schaffen sie in einer Stunde 1/x + 1/(x+${f.d}) der Arbeit, ` +
           `und gemeinsam brauchen sie x − ${f.v} Stunden:\n\n` +
           `1/x + 1/(x+${f.d}) = 1/(x−${f.v})\n\n` +
           `Multiplizieren und zusammenfassen ergibt x² − ${2 * f.v}x − ${f.d * f.v} = 0, ` +
           `also x = ${f.v} + √(${f.v * f.v} + ${f.d * f.v}) = ${f.x}.\n\n` +
           `Probe: 1/${f.x} + 1/${f.x + f.d} = 1/${f.x - f.v}. ` +
           `Der Meister braucht ${f.x} Stunden, der ${h.geselle} ${f.x + f.d}, zusammen ${f.x - f.v}.`
    };
  }

  /* =========================================================
     3 — LEBENSALTER
     Heute ist A a Jahre alt, B ist b Jahre alt.
     Vor j Jahren war A k-mal so alt wie B.
     ========================================================= */

  const PAARE = [
    { alt: "der Leuchtturmwärter", jung: "sein Enkel" },
    { alt: "die Hafenmeisterin", jung: "ihre Tochter" },
    { alt: "der Kapitän", jung: "sein Neffe" },
    { alt: "die Fährfrau", jung: "ihr Sohn" }
  ];

  function alter(r) {
    const faelle = [];
    for (let k = 2; k <= 5; k++) {
      for (let j = 2; j <= 20; j++) {
        for (let bJung = 4; bJung <= 30; bJung++) {
          const jungDamals = bJung - j;
          if (jungDamals < 2) continue;
          const altDamals = k * jungDamals;
          const aAlt = altDamals + j;
          if (aAlt <= bJung + 14 || aAlt > 75) continue;
          const summe = aAlt + bJung;
          faelle.push({ aAlt, bJung, j, k, summe });
        }
      }
    }
    if (!faelle.length) return null;
    const f = eins(r, faelle);
    const p = eins(r, PAARE);

    // Eindeutigkeit: Summe und Verhältnis vor j Jahren legen beide Alter fest
    const treffer = [];
    for (let a = 1; a <= 100; a++) {
      const b = f.summe - a;
      if (b < 1) continue;
      if (a - f.j >= 1 && b - f.j >= 1 && a - f.j === f.k * (b - f.j)) treffer.push([a, b]);
    }
    if (treffer.length !== 1) return null;

    const malWort = { 2: "doppelt", 3: "dreimal", 4: "viermal", 5: "fünfmal" }[f.k];
    const verglich = f.k === 2 ? "doppelt so alt" : `${malWort} so alt`;

    return {
      gattung: "alter",
      titel: "Zwei Lebensalter",
      text: `Zusammen sind ${p.alt} und ${p.jung} heute ${f.summe} Jahre alt. ` +
            `Vor ${f.j} Jahren war ${p.alt} genau ${verglich} wie ${p.jung}.`,
      frage: `Wie alt ist ${p.alt} heute?`,
      form: "zahl",
      einheit: "Jahre",
      loesung: f.aAlt,
      weg: `Sei x das heutige Alter von ${p.alt}. Dann ist ${p.jung} heute ${f.summe} − x Jahre alt.\n\n` +
           `Vor ${f.j} Jahren: x − ${f.j} = ${f.k} · (${f.summe} − x − ${f.j})\n\n` +
           `Auflösen ergibt x = ${f.aAlt}. Damit ist ${p.jung} heute ${f.bJung} Jahre alt.\n\n` +
           `Probe: vor ${f.j} Jahren ${f.aAlt - f.j} und ${f.bJung - f.j} Jahre — ` +
           `und ${f.aAlt - f.j} = ${f.k} · ${f.bJung - f.j}.`
    };
  }

  /* ---------- Auswahl und Tagesaufgabe ---------- */

  const GATTUNGEN = [nomen, arbeit, alter];

  function erzeuge(opt = {}) {
    const r = wuerfel(typeof opt.saat === "string" ? saatAusText(opt.saat) : (opt.saat ?? 1));
    const reihe = opt.gattung
      ? GATTUNGEN.filter(g => g.name === opt.gattung)
      : mische(r, GATTUNGEN);
    for (const g of reihe) {
      const a = g(r);
      if (a) return a;
    }
    return null;
  }

  function tagesRaetsel(datum, opt = {}) {
    const d = datum instanceof Date ? datum : new Date(datum);
    const tag = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    for (let anlauf = 0; anlauf < 30; anlauf++) {
      const a = erzeuge({ ...opt, saat: `denksport|${tag}|${anlauf}` });
      if (a) return a;
    }
    return null;
  }

  function pruefe(aufgabe, antwort) {
    if (aufgabe.form === "zahl") {
      const z = parseFloat(String(antwort).replace(",", "."));
      return Number.isFinite(z) && Math.abs(z - aufgabe.loesung) < 1e-9;
    }
    if (!Array.isArray(antwort) || antwort.length !== aufgabe.loesung.length) return false;
    return aufgabe.loesung.every((l, i) => antwort[i] === l);
  }

  return { erzeuge, tagesRaetsel, pruefe };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Denksport;
if (typeof globalThis !== "undefined") globalThis.Denksport = Denksport;
