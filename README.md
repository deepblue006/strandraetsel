# Die Strandrätsel

Eine private PWA mit einer täglichen Ration deduktiver Rätsel.
Keine Konten, kein Server, keine Analytics, keine Serien — alles bleibt auf dem Gerät.

## Die Tagesration

| Rätsel | Was es ist |
|---|---|
| **Zuordnungsrätsel** | Kreuztabelle im Stil des *P.M. Logik Trainers*, 3×4 bis 5×5, drei Schwierigkeitsstufen |
| **Wahrheitsrätsel** | Wer sagt die Wahrheit, wer flunkert — reine Logik in Sätzen |
| **Denksportaufgabe** | Textaufgabe mit einer Antwort und einem Lösungsweg |
| **Wort des Tages** | Deutsche Wordle-Variante, fünf Buchstaben, sechs Versuche |
| **Stellung des Tages** | Schachtaktik aus der Lichess-Datenbank (CC0), Zug per Antippen |

Alle Rätsel werden **im Gerät erzeugt**, aus einem Datums-Hash. Derselbe Tag liefert
immer dasselbe Rätsel; ein Reload ändert nichts. Kein Rätselinhalt stammt aus fremden Quellen.

## Auf GitHub Pages veröffentlichen

1. Neues Repository anlegen, diesen Ordnerinhalt hineinlegen.
2. `Settings → Pages → Source: Deploy from a branch`, Branch `main`, Ordner `/ (root)`.
3. Nach ein paar Minuten liegt die App unter `https://<name>.github.io/<repo>/`.

Wichtig: **kein** `.nojekyll` nötig, aber die App muss über `https` laufen —
sonst startet der Service Worker nicht und der Offline-Betrieb fehlt.

## Auf dem iPhone installieren

Adresse in Safari öffnen → Teilen-Symbol → *Zum Home-Bildschirm*.
Danach läuft die App im Vollbild und vollständig offline.

## Nach jeder Änderung

In `sw.js` die Zeile `const VERSION = "strandraetsel-v0.10.0"` hochzählen.
Ohne das behält das iPhone die alte Fassung im Cache.

## Aufbau

```
index.html              Oberfläche, Szene (SVG), alle Stile
manifest.webmanifest    Installationsdaten
sw.js                   Offline-Cache
woerter.json            Wortlisten für das Wort des Tages
stellungen.json         Schachaufgaben (mit lichess-auszug.py erzeugt)
fonts/                  Cormorant Garamond, Alegreya Sans (SIL OFL)
icon-*.png              App-Icons
icon.svg                Quelle des Icons
js/
  loeser.js             Constraint-Solver für Zuordnungsrätsel
  generator.js          erzeugt Zuordnungsrätsel, prüft Eindeutigkeit
  wahrheit.js           erzeugt Wahrheitsrätsel
  denksport.js          erzeugt Denksportaufgaben
  wort.js               Wortlogik, Tageswort, Bewertung
  schach.js             FEN, Zugmechanik, Tagesstellung
  logik.js              Kreuztabellen-Oberfläche
  saetze.js             Oberfläche Wahrheitsrätsel
  aufgabe.js            Oberfläche Denksportaufgabe
  wortfeld.js           Oberfläche Wort des Tages
  brett.js              Oberfläche Stellung des Tages
  app.js                Gerüst: Tageswahl, Speicher, Szene, Navigation
```

## Tests

Die Testdateien laufen mit Node und jsdom, außerhalb des Repos:

```
npm install jsdom
node gesamt-test.js
```

## Noch offen

- **stellungen.json** erzeugen. Das Schachmodul läuft bereits; fehlt die Datei,
  greift ein kleiner eigener Notvorrat von vier Aufgaben. Für den echten Vorrat
  `lichess-auszug.py` auf einem Rechner mit der Lichess-Datenbank laufen lassen
  und die erzeugte `stellungen.json` neben `index.html` legen.
- Standardzuschnitt festlegen, sobald das Gitter auf dem iPhone geprüft ist.

## Herkunft der Daten

Siehe `QUELLEN.md`. Kurz: Wortlisten aus *wordfreq* (Apache 2.0) und
*german-nouns* (MIT), Schriften unter der SIL Open Font License.
Alle Rätsel sind eigene Erzeugnisse.
