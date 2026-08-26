/* ============================================================
   DIE STRANDRÄTSEL · js/app.js
   Gerüst: Tagesrätsel, Liegengebliebenes, Einstellungen, Speicher

   Grundsätze:
   - Keine Folge, keine Serie, keine Zählung von Tagen.
   - Kein Wochenraster. Angefangenes bleibt liegen, bis es gelöst
     ist oder weggelegt wird — ohne Aufforderung, ohne Frist.
   ============================================================ */

const App = (function () {

  const ZUSCHNITTE = [
    { id: "3x4", kategorien: 3, groesse: 4, name: "kurzer Weg · 3 × 4" },
    { id: "4x4", kategorien: 4, groesse: 4, name: "Runde · 4 × 4" },
    { id: "4x5", kategorien: 4, groesse: 5, name: "lange Runde · 4 × 5" },
    { id: "5x5", kategorien: 5, groesse: 5, name: "Tagestour · 5 × 5" }
  ];
  const STUFEN = [
    { id: "leicht", name: "Rückenwind" },
    { id: "mittel", name: "leichte Brise" },
    { id: "schwer", name: "steife Brise" }
  ];
  const LIEGT_MAX = 14;          // so weit wird höchstens zurückgeschaut

  const KEY = {
    zuordnung: (d, z, s) => `strandraetsel.zuordnung.${d}.${z}.${s}`,
    wahrheit: d => `strandraetsel.wahrheit.${d}`,
    aufgabe: d => `strandraetsel.aufgabe.${d}`,
    wort: d => `strandraetsel.wort.${d}`,
    schach: d => `strandraetsel.schach.${d}`,
    einst: "strandraetsel.einstellungen"
  };

  let heute, offenerTag, einst;
  let zRaetsel, zStand, wRaetsel, wStand, aRaetsel, aStand, tagesWort, tStand, sAufgabe, sStand;

  /* ---------- Speicher ---------- */

  const notablage = {};
  function speicher() {
    try {
      localStorage.setItem("strandraetsel.probe", "1");
      localStorage.removeItem("strandraetsel.probe");
      return localStorage;
    } catch (e) {
      return { getItem: k => (k in notablage ? notablage[k] : null),
               setItem: (k, v) => { notablage[k] = v; },
               removeItem: k => { delete notablage[k]; } };
    }
  }
  function lade(key, ersatz) {
    try { const roh = speicher().getItem(key); return roh ? JSON.parse(roh) : ersatz; }
    catch (e) { return ersatz; }
  }
  function sichere(key, wert) {
    try { speicher().setItem(key, JSON.stringify(wert)); } catch (e) { /* still */ }
  }
  function loesche(key) {
    try { speicher().removeItem(key); } catch (e) { /* still */ }
  }

  /* ---------- Datum ---------- */

  const WOCHENTAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni",
                  "Juli", "August", "September", "Oktober", "November", "Dezember"];
  const alsText = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const alsDatum = t => { const [j, m, g] = t.split("-").map(Number); return new Date(j, m - 1, g); };
  const langText = d => `${WOCHENTAGE[d.getDay()]}, ${d.getDate()}. ${MONATE[d.getMonth()]}`;
  const kurzText = d => `${d.getDate()}. ${MONATE[d.getMonth()]}`;
  const zurueck = (t, n) => { const d = alsDatum(t); d.setDate(d.getDate() - n); return alsText(d); };

  const zuschnitt = () => ZUSCHNITTE.find(z => z.id === einst.zuschnitt) || ZUSCHNITTE[0];

  /* ---------- Start ---------- */

  async function start() {
    heute = alsText(new Date());
    einst = lade(KEY.einst, { autoStreichen: true, zuschnitt: "3x4", schwierigkeit: "mittel", personen: 4 });

    baueEinstellungen();

    // Wortlisten laden; ohne sie bleibt die Wortkarte ausgeblendet
    try { await Wort.ladeListen("woerter.json"); }
    catch (e) { document.getElementById("karte-wort").hidden = true; }

    // Stellungen: fehlt der Lichess-Auszug, greift der Notvorrat im Modul
    await Schach.ladeStellungen("stellungen.json");

    oeffneTag(heute);

    an("karte-zuordnung", () => zeige("gitter"));
    an("karte-wahrheit", () => zeige("saetze"));
    an("karte-aufgabe", () => zeige("aufgabe"));
    an("karte-wort", () => zeige("wort"));
    an("karte-schach", () => zeige("schach"));
    an("s-zurueck", () => zeige("weg"));
    an("s-neu", () => Brett.zurueck());
    an("s-aufgeben", () => { if (confirm("Die Lösung zeigen? Danach ist die Station gelaufen.")) Brett.aufgeben(); });
    an("wort-zurueck", () => zeige("weg"));
    an("a-zurueck", () => zeige("weg"));
    an("a-pruefen", () => Aufgabe.pruefe());
    an("a-leeren", () => Aufgabe.leeren());
    an("a-aufgeben", () => { if (confirm("Den Lösungsweg zeigen? Danach ist die Station gelaufen.")) Aufgabe.aufgeben(); });
    an("zurueck", () => zeige("weg"));
    an("w-zurueck", () => zeige("weg"));

    an("btn-pruefen", () => Logik.pruefe());
    an("btn-leeren", () => Logik.leeren());
    an("btn-aufloesung", () => { if (confirm("Die Auflösung zeigen? Danach ist die Station gelaufen.")) Logik.aufgeben(); });
    an("w-pruefen", () => Saetze.pruefe());
    an("w-leeren", () => Saetze.leeren());
    an("w-aufgeben", () => { if (confirm("Die Auflösung zeigen? Danach ist die Station gelaufen.")) Saetze.aufgeben(); });

    document.getElementById("auto-schalter").addEventListener("change", e => {
      einst.autoStreichen = e.target.checked;
      sichere(KEY.einst, einst);
      Logik.setzeEinstellung(einst);
    });
  }

  const an = (id, fn) => document.getElementById(id).addEventListener("click", fn);

  function baueEinstellungen() {
    const zs = document.getElementById("wahl-zuschnitt");
    zs.innerHTML = ZUSCHNITTE.map(z => `<option value="${z.id}">${z.name}</option>`).join("");
    zs.value = einst.zuschnitt;
    zs.addEventListener("change", e => {
      einst.zuschnitt = e.target.value; sichere(KEY.einst, einst); oeffneTag(offenerTag);
    });

    const st = document.getElementById("wahl-stufe");
    st.innerHTML = STUFEN.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
    st.value = einst.schwierigkeit;
    st.addEventListener("change", e => {
      einst.schwierigkeit = e.target.value; sichere(KEY.einst, einst); oeffneTag(offenerTag);
    });

    const pe = document.getElementById("wahl-personen");
    pe.innerHTML = [3, 4, 5].map(p => `<option value="${p}">${p} Köpfe</option>`).join("");
    pe.value = einst.personen || 4;
    pe.addEventListener("change", e => {
      einst.personen = +e.target.value; sichere(KEY.einst, einst); oeffneTag(offenerTag);
    });

    document.getElementById("auto-schalter").checked = !!einst.autoStreichen;
  }

  /* ---------- Einen Tag öffnen ---------- */

  function oeffneTag(datum) {
    offenerTag = datum;
    const z = zuschnitt();

    zRaetsel = Generator.tagesRaetsel(alsDatum(datum), {
      kategorien: z.kategorien, groesse: z.groesse, schwierigkeit: einst.schwierigkeit
    });
    if (!zRaetsel) throw new Error("Zuordnungsrätsel für " + datum + " nicht erzeugbar.");
    zStand = lade(KEY.zuordnung(datum, z.id, einst.schwierigkeit),
                  { zellen: {}, haken: {}, geloest: false, anteil: 0 });

    wRaetsel = Wahrheit.tagesRaetsel(alsDatum(datum), { personen: einst.personen || 4 });
    if (!wRaetsel) throw new Error("Wahrheitsrätsel für " + datum + " nicht erzeugbar.");
    wStand = lade(KEY.wahrheit(datum), { wahl: {}, geloest: false, anteil: 0 });

    aRaetsel = Denksport.tagesRaetsel(alsDatum(datum));
    if (!aRaetsel) throw new Error("Denksportaufgabe für " + datum + " nicht erzeugbar.");
    aStand = lade(KEY.aufgabe(datum), { antwort: null, geloest: false, anteil: 0 });

    tStand = lade(KEY.wort(datum), { zeilen: [], geloest: false, anteil: 0, beendet: false });
    sAufgabe = Schach.tagesAufgabe(alsDatum(datum));
    sStand = lade(KEY.schach(datum), { schritt: 0, beendet: false, geloest: false, anteil: 0 });
    try { tagesWort = Wort.tagesWort(alsDatum(datum)); } catch (e) { tagesWort = null; }

    const d = alsDatum(datum);
    document.getElementById("datumszeile").textContent =
      datum === heute ? langText(d) : `${langText(d)} · vom Wegesrand`;

    document.getElementById("z-kartentitel").textContent = zRaetsel.titel;
    document.getElementById("z-kartensatz").textContent =
      `${z.kategorien} Kategorien, ${zRaetsel.raetsel.hinweise.length} Hinweise. ` +
      `Nur eine Ordnung hält allen stand.`;
    document.getElementById("w-kartentitel").textContent = wRaetsel.titel;
    document.getElementById("w-kartensatz").textContent =
      `${wRaetsel.namen.length} Leute, ${wRaetsel.aussagen.length} Aussagen. Nur eine Geschichte stimmt.`;
    document.getElementById("a-kartentitel").textContent = aRaetsel.titel;
    document.getElementById("a-kartensatz").textContent =
      aRaetsel.form === "zahl" ? "Eine Baustelle für den Kopf. Am Ende steht eine Zahl."
                               : "Vier Aussagen, genau eine ist wahr. Der Rest führt in die Irre.";

    Logik.starte(zRaetsel, zStand, einst, s => merke("z", s));
    Saetze.starte(wRaetsel, wStand, s => merke("w", s));
    Aufgabe.starte(aRaetsel, aStand, s => merke("a", s));
    if (tagesWort) Wortfeld.starte(tagesWort, tStand, s => merke("t", s));
    Brett.starte(sAufgabe, sStand, s => merke("s", s));

    zeichneWeg();
    zeichneLiegendes();
  }

  /* ---------- Sichern nach jeder Aktion ---------- */

  function merke(welches, stand) {
    if (welches === "z") {
      zStand = { zellen: stand.zellen, haken: stand.haken, anteil: stand.anteil,
                 geloest: zStand.geloest || stand.geloest, zeit: new Date().toISOString() };
      sichere(KEY.zuordnung(offenerTag, zuschnitt().id, einst.schwierigkeit), zStand);
    } else if (welches === "w") {
      wStand = { wahl: stand.wahl, anteil: stand.anteil,
                 geloest: wStand.geloest || stand.geloest, zeit: new Date().toISOString() };
      sichere(KEY.wahrheit(offenerTag), wStand);
    } else if (welches === "a") {
      aStand = { antwort: stand.antwort, anteil: stand.anteil,
                 geloest: aStand.geloest || stand.geloest, zeit: new Date().toISOString() };
      sichere(KEY.aufgabe(offenerTag), aStand);
    } else if (welches === "t") {
      tStand = { zeilen: stand.zeilen, anteil: stand.anteil, beendet: stand.beendet,
                 geloest: tStand.geloest || stand.geloest, zeit: new Date().toISOString() };
      sichere(KEY.wort(offenerTag), tStand);
    } else {
      sStand = { schritt: stand.schritt, beendet: stand.beendet, anteil: stand.anteil,
                 geloest: sStand.geloest || stand.geloest, zeit: new Date().toISOString() };
      sichere(KEY.schach(offenerTag), sStand);
    }
    zeichneWeg();
    zeichneLiegendes();
  }

  /* ---------- Szene ---------- */

  function zeichneWeg() {
    const staende = tagesWort ? [zStand, wStand, aStand, tStand, sStand]
                              : [zStand, wStand, aStand, sStand];
    const geloest = staende.filter(s => s.geloest).length;
    const angefangen = staende.some(s => (s.anteil || 0) > 0 && !s.geloest);
    const fertig = geloest === staende.length;
    // Vier Wegabschnitte für drei Rätsel: gelöste zählen voll, Angefangenes einen Schritt
    const abschnitte = fertig ? 4
      : Math.min(3, Math.round(geloest * 4 / staende.length) + (angefangen ? 1 : 0));

    document.querySelectorAll(".weg-teil").forEach(t =>
      t.classList.toggle("gegangen", +t.dataset.teil <= abschnitte));
    document.querySelectorAll(".pfosten").forEach(p =>
      p.classList.toggle("hell", +p.dataset.teil <= abschnitte));
    document.getElementById("szene").classList.toggle("fertig", fertig);

    zustandKarte("karte-zuordnung", "z-kartenstand", zStand);
    zustandKarte("karte-wahrheit", "w-kartenstand", wStand);
    zustandKarte("karte-aufgabe", "a-kartenstand", aStand);
    zustandKarte("karte-schach", "s-kartenstand", sStand);
    if (tagesWort) {
      zustandKarte("karte-wort", "wort-kartenstand", tStand);
      if (tStand.beendet && !tStand.geloest)
        document.getElementById("wort-kartenstand").textContent = "vorbei";
    }

    const geblieben = staende.length - geloest;
    document.getElementById("ansagetext").textContent = fertig
      ? "Angekommen. Das Feuer brennt — morgen früh liegt der Weg wieder da."
      : geloest === 0
        ? `${["", "Ein", "Zwei", "Drei", "Vier", "Fünf"][staende.length]} Rätsel liegen heute auf dem Weg für dich. ` +
          `Du hast Zeit. Das Meer hat sie schließlich auch.`
        : `Noch ${geblieben === 1 ? "eines wartet" : geblieben + " warten"} auf dem Weg. ` +
          `Du hast Zeit. Das Meer hat sie schließlich auch.`;
    document.getElementById("fussnote").textContent =
      fertig ? "„Das Feuer brennt." : "„Das Meer kennt keine Eile.";
  }

  function zustandKarte(karteId, standId, stand) {
    const karte = document.getElementById(karteId);
    const begonnen = !stand.geloest && (stand.anteil || 0) > 0;
    karte.classList.toggle("gelöst", !!stand.geloest);
    karte.classList.toggle("begonnen", begonnen);
    document.getElementById(standId).textContent =
      stand.geloest ? "geschafft" : begonnen ? "unterwegs" : "wartet noch";
  }

  /* ---------- Liegengebliebenes ----------
     Kein Kalender: gezeigt wird nur, was tatsächlich angefangen
     und nicht gelöst wurde. Wer nichts liegen hat, sieht nichts.   */

  function zeichneLiegendes() {
    const z = zuschnitt();
    const eintraege = [];

    for (let i = 1; i <= LIEGT_MAX; i++) {
      const t = zurueck(heute, i);
      const zs = lade(KEY.zuordnung(t, z.id, einst.schwierigkeit), null);
      const ws = lade(KEY.wahrheit(t), null);
      const as = lade(KEY.aufgabe(t), null);
      const ts = lade(KEY.wort(t), null);
      const offen = [];
      if (zs && zs.anteil > 0 && !zs.geloest) offen.push("Zuordnung");
      if (ws && ws.anteil > 0 && !ws.geloest) offen.push("Wahrheit");
      if (as && as.anteil > 0 && !as.geloest) offen.push("Denksport");
      if (ts && ts.anteil > 0 && !ts.geloest && !ts.beendet) offen.push("Wort");
      const ss = lade(KEY.schach(t), null);
      if (ss && ss.anteil > 0 && !ss.geloest) offen.push("Stellung");
      if (offen.length) eintraege.push({ tag: t, was: offen });
    }

    const abschnitt = document.getElementById("abschnitt-liegend");
    const liste = document.getElementById("liegendes");
    abschnitt.hidden = eintraege.length === 0;
    if (!eintraege.length) return;

    liste.innerHTML = eintraege.map(e => `
      <div class="liegend${e.tag === offenerTag ? " offen" : ""}">
        <button type="button" class="liegend-oeffnen" data-tag="${e.tag}">
          <span class="l-datum">${kurzText(alsDatum(e.tag))}</span>
          <span class="l-was">${e.was.join(" · ")}</span>
        </button>
        <button type="button" class="liegend-weg" data-weg="${e.tag}" aria-label="Liegen lassen">liegen lassen</button>
      </div>`).join("");

    liste.querySelectorAll(".liegend-oeffnen").forEach(b =>
      b.addEventListener("click", () => oeffneTag(b.dataset.tag)));
    liste.querySelectorAll(".liegend-weg").forEach(b =>
      b.addEventListener("click", () => {
        const t = b.dataset.weg;
        loesche(KEY.zuordnung(t, zuschnitt().id, einst.schwierigkeit));
        loesche(KEY.wahrheit(t));
        loesche(KEY.aufgabe(t));
        loesche(KEY.wort(t));
        loesche(KEY.schach(t));
        if (offenerTag === t) oeffneTag(heute); else zeichneLiegendes();
      }));
  }

  /* ---------- Navigation ---------- */

  function zeige(welche) {
    document.getElementById("ansicht-weg").hidden = welche !== "weg";
    document.getElementById("ansicht-gitter").hidden = welche !== "gitter";
    document.getElementById("ansicht-saetze").hidden = welche !== "saetze";
    document.getElementById("ansicht-aufgabe").hidden = welche !== "aufgabe";
    document.getElementById("ansicht-wort").hidden = welche !== "wort";
    document.getElementById("ansicht-schach").hidden = welche !== "schach";
    window.scrollTo(0, 0);
  }

  return { start, zeige, ZUSCHNITTE };
})();

if (typeof globalThis !== "undefined") globalThis.App = App;

function starteApp() {
  try { Promise.resolve(App.start()).catch(zeigeFehler); }
  catch (e) { zeigeFehler(e); }
}

function zeigeFehler(e) {
  {
    const bar = document.getElementById("fehlerbalken");
    if (bar) { bar.textContent = "Fehler beim Start: " + (e && e.message ? e.message : e); bar.hidden = false; }
    console.error(e);
  }
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", starteApp);
else starteApp();

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
