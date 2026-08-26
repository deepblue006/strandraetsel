/* DIE STRANDRÄTSEL · sw.js — Offline-Betrieb
   Bei jeder Änderung an den Dateien die Version hochzählen,
   sonst behält das iPhone die alte Fassung. */
const VERSION = "strandraetsel-v0.10.2";

const DATEIEN = [
  "./", "./index.html", "./manifest.webmanifest", "./woerter.json", "./stellungen.json",
  "./js/loeser.js", "./js/generator.js", "./js/wahrheit.js", "./js/denksport.js",
  "./js/wort.js", "./js/schach.js", "./js/logik.js", "./js/saetze.js", "./js/aufgabe.js",
  "./js/wortfeld.js", "./js/brett.js", "./js/app.js",
  "./fonts/cormorant-garamond-latin-600-normal.woff2",
  "./fonts/cormorant-garamond-latin-700-normal.woff2",
  "./fonts/cormorant-garamond-latin-600-italic.woff2",
  "./fonts/alegreya-sans-latin-500-normal.woff2",
  "./fonts/alegreya-sans-latin-700-normal.woff2",
  "./fonts/alegreya-sans-latin-800-normal.woff2",
  "./icon-180.png", "./icon-192.png", "./icon-512.png", "./icon-maskable.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(namen => Promise.all(namen.filter(n => n !== VERSION).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(treffer =>
      treffer || fetch(e.request).catch(() => caches.match("./index.html")))
  );
});
