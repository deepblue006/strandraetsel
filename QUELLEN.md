# Herkunft der Wortlisten

`woerter.json` enthält zwei Listen für das *Wort des Tages*:

- **loesungen** (905 Wörter) — die möglichen Tageswörter. Deutsche Substantive im
  Nominativ Singular, fünf Buchstaben, ohne ß, ohne Eigennamen, mit mindestens
  vier verschiedenen Buchstaben.
- **rateworte** (23.784 Wörter) — alles, was als Rateversuch angenommen wird.

## Quellen und Lizenzen

| Quelle | Verwendung | Lizenz |
|---|---|---|
| [wordfreq](https://github.com/rspeer/wordfreq) | Worthäufigkeiten, Auswahl der geläufigen Wörter | Apache 2.0 |
| [german-nouns](https://github.com/gambolputty/german-nouns) | Erkennung von Substantiven und ihren Singularformen | MIT |

Beides sind freie Sprachdaten, keine Rätselinhalte. Übernommen wurden ausschließlich
Wortformen und Häufigkeitswerte, keine Texte.

## Neu erzeugen

Die Listen wurden einmalig erzeugt und liegen als statische Datei im Repo. Ein
Neuaufbau ist nur nötig, wenn die Auswahlkriterien geändert werden sollen.

## Schriften

| Schrift | Verwendung | Lizenz |
|---|---|---|
| Cormorant Garamond | Überschriften, Rätseltitel | SIL Open Font License 1.1 |
| Alegreya Sans | Fließtext, Bedienelemente | SIL Open Font License 1.1 |

Beide liegen als woff2 im Ordner `fonts/` (Latin-Teilmenge, je rund 23 KB).
Die App lädt nichts von fremden Servern nach und läuft damit vollständig offline.
