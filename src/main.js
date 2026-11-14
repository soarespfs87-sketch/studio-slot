// ────────────────────────────────────────────────────────────────
//  Ponto de entrada do app
//  Tudo vem do Supabase agora. (O antigo `seed.js` só serviu como
//  fonte da migração única do Estúdio Lúmen — já feita.)
// ────────────────────────────────────────────────────────────────

import './styles.css'
import { montarPortao } from './portao.js'

// Galeria da cliente (/g/<codigo>): abre sem login, fora do app do fotógrafo.
// Portal da cliente (/c/<codigo>): as pastas dos ensaios dela, também sem login.
const galeria = /^\/g\/([0-9a-f]{16})\/?$/.exec(location.pathname)
const portal = /^\/c\/([0-9a-f]{16})\/?$/.exec(location.pathname)
if (galeria) {
  import('./modulos/galerias/publica.js').then((m) => m.montarGaleriaPublica(galeria[1]))
} else if (portal) {
  import('./modulos/galerias/portal.js').then((m) => m.montarPortal(portal[1]))
} else {
  montarPortao()
}

// PWA: registra o service worker (só quando publicado, em https)
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
