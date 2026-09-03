// ────────────────────────────────────────────────────────────────
//  Ponto de entrada do app
//  Tudo vem do Supabase agora. (O antigo `seed.js` só serviu como
//  fonte da migração única do Estúdio Lúmen — já feita.)
// ────────────────────────────────────────────────────────────────

import './styles.css'
import { montarPortao } from './portao.js'

montarPortao()

// PWA: registra o service worker (só quando publicado, em https)
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
