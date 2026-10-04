/* Il TabacchInes: funzionamento offline.
   Cambia VERSION a ogni nuova versione del gioco per aggiornare la cache. */
const VERSION = 'tabacchines-b152';
const CORE = ['./', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon-32.png'];

self.addEventListener('install', e => {
  // scarica sempre dalla rete, mai dalla cache del browser, così la versione nuova è davvero nuova
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(CORE.map(u =>
    fetch(u, {cache: 'reload'}).then(r => { if (r.ok) return c.put(u, r); })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Caratteri di Google Fonts: dalla cache, scaricati una volta sola
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(VERSION).then(c => c.match(req).then(hit => hit ||
      fetch(req).then(res => { c.put(req, res.clone()); return res; }).catch(() => hit))));
    return;
  }
  if (url.origin !== location.origin) return;

  // La pagina del gioco: prima dalla rete (così si vede sempre l'ultima versione), dalla cache solo senza rete
  if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    e.respondWith(fetch(req, {cache: 'no-store'}).then(res => {
      if (res.ok) caches.open(VERSION).then(c => c.put('./index.html', res.clone()));
      return res;
    }).catch(() => caches.open(VERSION).then(c => c.match('./index.html'))));
    return;
  }

  // Icone e altri file: dalla cache, aggiornati in sottofondo quando c'è rete
  e.respondWith(caches.open(VERSION).then(c => c.match(req).then(hit => {
    const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })));
});
