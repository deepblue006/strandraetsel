/* ============================================================
   DIE STRANDRÄTSEL · js/wahrheit.js
   Wahrheitsrätsel — reine Logik in Sätzen, ohne Gitter

   Eine Runde Leute steht am Strand. Wer ehrlich ist, sagt
   ausschließlich Wahres; wer flunkert, ausschließlich Falsches.
   Aus den Aussagen folgt genau eine Verteilung.

   Solver: alle 2^n Belegungen durchprobieren. Bei höchstens
   sechs Personen sind das 64 Fälle — Brute Force genügt.
   ============================================================ */

const Wahrheit = (function () {

  const NAMEN = ["Bruno", "Lena", "Ove", "Silke", "Hauke", "Frauke", "Jasper", "Mareike",
                 "Tede", "Wiebke", "Momme", "Antje", "Boye", "Insa", "Keno", "Thies"];

  const KULISSEN = [
    "stehen auf der Mole und warten auf das Ausflugsboot",
    "warten am Strandkorbverleih auf einen freien Korb",
    "sitzen vor der Fischbude und teilen sich eine Tüte Pommes",
    "sind auf die Aussichtsdüne gestiegen und schauen aufs Wasser",
    "sammeln am Spülsaum Muscheln"
  ];

  /* ---------- Zufall mit Saat ---------- */

  function saatAusText(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
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

  /* ---------- Aussagearten ----------
     Jede Aussage ist eine Behauptung über die Verteilung.
     pruefe(belegung) sagt, ob die Behauptung bei dieser
     Verteilung zutrifft. true = ehrlich, false = flunkert.     */

  function baueAussagen(r, namen) {
    const n = namen.length;
    const alle = [];
    const zaehle = b => b.filter(Boolean).length;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        alle.push({ art: "istEhrlich", von: i, ueber: j,
          satz: `${namen[j]} sagt die Wahrheit.`, pruefe: b => b[j] === true });
        alle.push({ art: "luegt", von: i, ueber: j,
          satz: `${namen[j]} flunkert.`, pruefe: b => b[j] === false });
      }
      // Aussagen über die Gesamtzahl
      for (let k = 0; k <= n; k++) {
        alle.push({ art: "genau", von: i, zahl: k,
          satz: k === 0 ? `Keiner von uns sagt die Wahrheit.`
              : k === 1 ? `Genau einer von uns sagt die Wahrheit.`
              : `Genau ${zahlwort(k)} von uns sagen die Wahrheit.`,
          pruefe: b => zaehle(b) === k });
      }
      for (let k = 1; k < n; k++) {
        alle.push({ art: "mindestens", von: i, zahl: k,
          satz: k === 1 ? `Mindestens einer von uns flunkert.`
                        : `Mindestens ${zahlwort(k)} von uns flunkern.`,
          pruefe: b => n - zaehle(b) >= k });
      }
      // Paarige Aussagen
      for (let j = 0; j < n; j++) {
        for (let k = j + 1; k < n; k++) {
          if (j === i || k === i) continue;
          alle.push({ art: "beide", von: i, a: j, b: k,
            satz: `${namen[j]} und ${namen[k]} sagen beide die Wahrheit.`,
            pruefe: b => b[j] && b[k] });
          alle.push({ art: "genauEiner", von: i, a: j, b: k,
            satz: `Von ${namen[j]} und ${namen[k]} flunkert genau einer.`,
            pruefe: b => (b[j] ? 0 : 1) + (b[k] ? 0 : 1) === 1 });
        }
      }
      // Selbstbezug
      alle.push({ art: "wieIch", von: i, ueber: (i + 1) % n,
        satz: `${namen[(i + 1) % n]} und ich sind uns einig: entweder flunkern wir beide oder keiner von uns.`,
        pruefe: b => b[i] === b[(i + 1) % n] });
    }
    return alle;
  }

  function zahlwort(z) {
    return { 0: "keiner", 1: "einer", 2: "zwei", 3: "drei", 4: "vier", 5: "fünf", 6: "sechs" }[z] || String(z);
  }

  /* ---------- Solver: alle Belegungen durchgehen ---------- */

  function loese(n, aussagen) {
    const treffer = [];
    for (let maske = 0; maske < (1 << n); maske++) {
      const b = Array.from({ length: n }, (_, i) => !!(maske & (1 << i)));
      // Wer ehrlich ist, muss Wahres sagen; wer flunkert, Falsches
      const stimmig = aussagen.every(a => a.pruefe(b) === b[a.von]);
      if (stimmig) { treffer.push(b); if (treffer.length > 1) break; }
    }
    return treffer;
  }

  /* ---------- Generator ---------- */

  function erzeuge(opt = {}) {
    const start = Date.now();
    const n = opt.personen || 4;
    const r = wuerfel(typeof opt.saat === "string" ? saatAusText(opt.saat) : (opt.saat ?? 1));
    const namen = mische(r, NAMEN).slice(0, n);
    const kulisse = eins(r, KULISSEN);

    // Verteilung ziehen — nie alle gleich, das wäre langweilig
    let wahrheit;
    do {
      wahrheit = Array.from({ length: n }, () => r() < 0.5);
    } while (wahrheit.every(Boolean) || wahrheit.every(x => !x));

    // Nur Aussagen, die zur gezogenen Verteilung passen
    const vorrat = mische(r, baueAussagen(r, namen))
      .filter(a => a.pruefe(wahrheit) === wahrheit[a.von]);

    // Jede Person sagt genau einen Satz. Die Sätze werden nach
    // Personenindex abgelegt, damit beim Tauschen niemand zwei
    // Sätze bekommt und ein anderer keinen.
    const satzVon = new Array(n).fill(null);
    for (const a of vorrat) {
      if (!satzVon[a.von]) satzVon[a.von] = a;
    }
    if (satzVon.some(x => !x)) return null;

    const stimmig = () => loese(n, satzVon).length === 1;

    if (!stimmig()) {
      for (let versuch = 0; versuch < 500; versuch++) {
        const i = Math.floor(r() * n);
        const ersatz = vorrat.filter(a => a.von === i && a !== satzVon[i]);
        if (ersatz.length === 0) continue;
        const vorher = satzVon[i];
        satzVon[i] = eins(r, ersatz);
        if (stimmig()) break;
        if (versuch === 499) satzVon[i] = vorher;
      }
    }
    if (!stimmig()) return null;

    const sortiert = satzVon.slice();
    const treffer = loese(n, sortiert);
    return {
      eindeutig: treffer.length === 1,
      titel: "Wer sagt die Wahrheit?",
      einleitung: `${zahlwortGross(n)} Leute ${kulisse}. ` +
                  `Wer ehrlich ist, sagt nur Wahres; wer flunkert, sagt nur Falsches. ` +
                  `Dazwischen gibt es nichts.`,
      frage: "Nur eine Geschichte stimmt — welche?",
      namen,
      aussagen: sortiert.map((a, i) => ({ nr: i + 1, von: a.von, name: namen[a.von], satz: a.satz })),
      loesung: wahrheit,
      statistik: { personen: n, dauerMs: Date.now() - start }
    };
  }

  function zahlwortGross(z) {
    return { 3: "Drei", 4: "Vier", 5: "Fünf", 6: "Sechs" }[z] || String(z);
  }

  function tagesRaetsel(datum, opt = {}) {
    const d = datum instanceof Date ? datum : new Date(datum);
    const tag = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    for (let anlauf = 0; anlauf < 20; anlauf++) {
      const r = erzeuge({ ...opt, saat: `wahrheit|${tag}|${anlauf}` });
      if (r) return r;
    }
    return null;
  }

  return { erzeuge, tagesRaetsel, loese };
})();

if (typeof module !== "undefined" && module.exports) module.exports = Wahrheit;
if (typeof globalThis !== "undefined") globalThis.Wahrheit = Wahrheit;
