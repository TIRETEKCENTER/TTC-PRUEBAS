/*
 * Service Worker de la APP DE REVENDEDORES — Urbiola Llantas (05/11/2026, Ricardo).
 * Vive en la carpeta revendedores/ (alcance propio, no choca con el sw.js de la app de vendedores).
 * - La página SIEMPRE se pide primero a internet (red primero): así los precios nuevos llegan solos
 *   y nunca se queda una copia vieja. Sin internet, abre la última copia guardada.
 * - Íconos y manifest: copia guardada primero.
 * - Nunca toca las peticiones a Google (pedidos / Mis pedidos) ni las revisiones de versión (__ver=).
 * - Solo borra cachés de SU prefijo (revp-): no afecta a la app de vendedores (mismo dominio).
 */
const PREFIJO = 'revp-';
const CACHE = PREFIJO + 'v1';
const BASICOS = ['./', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(BASICOS).catch(function () {}); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf(PREFIJO) === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.hostname.indexOf('google.com') !== -1 && url.hostname.indexOf('fonts') === -1) return;
  if (url.search.indexOf('__ver=') !== -1) return;
  var esPagina = req.mode === 'navigate' || /\/(index\.html)?$/.test(url.pathname);
  if (esPagina) {
    var red = fetch(req, { cache: 'no-store' });
    e.respondWith(red.then(function (resp) { return resp.clone(); }).catch(function () { return caches.match('./'); }));
    // Guardar la copia nueva sin que el navegador apague el service worker a medias.
    e.waitUntil(red.then(function (resp) {
      if (resp && resp.status === 200) return caches.open(CACHE).then(function (c) { return c.put('./', resp); });
    }).catch(function () {}));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(req).then(function (resp) {
      if (resp && resp.status === 200 && url.origin === location.origin) { var c2 = resp.clone(); caches.open(CACHE).then(function (c) { c.put(req, c2); }); }
      return resp;
    });
  }));
});
