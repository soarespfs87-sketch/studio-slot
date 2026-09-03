// ────────────────────────────────────────────────────────────────
//  Service worker — deixa o app instalável e abrível offline no básico.
//  Regra de ouro: NUNCA cacheia chamadas ao Supabase (dados sempre frescos).
//  Ao publicar uma versão nova, troque o número do cache (v1 -> v2).
// ────────────────────────────────────────────────────────────────

const CACHE = 'studioslot-v2'
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.png', '/studio-slot-logo.png']

self.addEventListener('install', (e) => {
  self.skipWaiting()
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(APP_SHELL))
      .catch(() => {}),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // Supabase (banco, login, storage): sempre pela rede, nunca do cache.
  if (url.hostname.endsWith('supabase.co')) return

  // Abrir o app: tenta a rede; se estiver offline, usa o index.html salvo.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/index.html')))
    return
  }

  // Arquivos do próprio app (JS, CSS, imagens): usa o cache e atualiza atrás.
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then((cached) => {
        const daRede = fetch(req)
          .then((res) => {
            if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()))
            return res
          })
          .catch(() => cached)
        return cached || daRede
      }),
    )
  }
})
