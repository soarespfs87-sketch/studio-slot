// ────────────────────────────────────────────────────────────────
//  Página da cliente: studioslot.app.br/g/<codigo>
//
//  Sem login. Fala só com a Edge Function `galeria` (que confere
//  código, senha e expiração). Mostra a galeria com o DESIGN que o
//  fotógrafo escolheu (capa, fonte, cores, grade) em dois layouts:
//    Grade    — fotos lado a lado (mosaico, linhas ou quadrada)
//    História — capítulos com texto, fotos grandes no ritmo e vídeos
//  + vídeos por link (YouTube/Vimeo), música de fundo (arquivo ou link).
//    Seleção: ♥ nas favoritas, comentário, contador, "Enviar seleção"
//    Entrega: ver em tela cheia, baixar uma ou todas (.zip em partes)
//
//  Prévia (?previa=1): o fotógrafo logado vê a galeria antes de
//  publicar, só pra olhar. Dentro da tela de Design ela também recebe
//  o design por postMessage e redesenha na hora, sem salvar.
// ────────────────────────────────────────────────────────────────

import { SUPABASE_URL, SUPABASE_KEY, supabase } from '../../supabase.js'
import { esc } from '../../componentes/campos.js'
import { formatarReais } from '../../calculos.js'
import {
  contarSelecao,
  textoContador,
  emLotes,
  designCompleto,
  opcao,
  coresDaPaleta,
  lerVideo,
  embedVideo,
  capaVideo,
  lerMusica,
  embedMusica,
  agruparPorCapitulo,
  ritmoHistoria,
} from './regras.js'
import { dataBR } from '../clientes/ui.js'

const app = document.querySelector('#app')
const FUNCAO = `${SUPABASE_URL}/functions/v1/galeria`
const LOTE_ZIP = 400 * 1024 * 1024 // cada .zip com até ~400 MB (cabe na memória do celular)

let codigo = ''
let senha = ''
let previa = false
let tokenPrevia = null
let estado = null // resposta do "abrir"
let design = null
let filtro = 'todas'
let aberta = -1 // índice da foto em tela cheia
let audio = null // música em arquivo
let observador = null
let portalDe = null // veio do portal da cliente? (/c/<codigo>) -> mostra "Suas galerias"

const guardaSenha = {
  ler: () => {
    try {
      return sessionStorage.getItem(`gal-senha-${codigo}`) || ''
    } catch {
      return ''
    }
  },
  gravar: (s) => {
    try {
      sessionStorage.setItem(`gal-senha-${codigo}`, s)
    } catch {
      /* sem armazenamento: pede de novo na próxima vez */
    }
  },
}

async function chamar(acao, extra = {}) {
  let res
  try {
    res = await fetch(FUNCAO, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        ...(tokenPrevia ? { Authorization: `Bearer ${tokenPrevia}` } : {}),
      },
      body: JSON.stringify({ acao, codigo, senha, ...(previa ? { previa: true } : {}), ...extra }),
    })
  } catch {
    return { status: 0, dados: { erro: 'Sem conexão. Confira a internet e tente de novo.' } }
  }
  let dados = {}
  try {
    dados = await res.json()
  } catch {
    /* corpo vazio */
  }
  return { status: res.status, dados }
}

// ── Aparência: cores, fontes ───────────────────────────────────
function carregarFontes(f) {
  const familia = (n) => `family=${n.replace(/ /g, '+')}:ital,wght@0,300;0,400;0,500;0,600;1,400`
  const nomes = [...new Set([f.titulo, f.texto])]
  const href = `https://fonts.googleapis.com/css2?${nomes.map(familia).join('&')}&display=swap`
  let link = document.querySelector('#pub-fontes')
  if (!link) {
    link = document.createElement('link')
    link.id = 'pub-fontes'
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  if (link.href !== href) link.href = href
}

export function aplicarAparencia(negocio, d) {
  const cores = coresDaPaleta(d.paleta, negocio?.tema)
  const f = opcao('fonte', d.fonte)
  carregarFontes(f)
  const raiz = document.documentElement.style
  raiz.setProperty('--pub-fundo', cores.fundo)
  raiz.setProperty('--pub-texto', cores.texto)
  raiz.setProperty('--pub-suave', cores.suave)
  raiz.setProperty('--pub-linha', cores.linha)
  raiz.setProperty('--pub-destaque', cores.destaque)
  raiz.setProperty('--pub-fonte-titulo', `'${f.titulo}', Georgia, serif`)
  raiz.setProperty('--pub-fonte-texto', `'${f.texto}', system-ui, sans-serif`)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', cores.fundo)
  document.body.style.background = cores.fundo
  const icone = negocio?.logo || '/favicon.png'
  document.querySelector('#fav-icon')?.setAttribute('href', icone)
}

export function marca(negocio) {
  if (!negocio) return ''
  const logo = negocio.logo ? `<img class="pub-logo" src="${esc(negocio.logo)}" alt="${esc(negocio.nome)}" />` : ''
  const nome = negocio.logo && negocio.logoComNome ? '' : `<span class="pub-marca-nome">${esc(negocio.nome)}</span>`
  return `<div class="pub-marca">${logo}${nome}</div>`
}

function telaAviso(negocio, titulo, texto) {
  aplicarAparencia(negocio, designCompleto(negocio?.designPadrao))
  app.innerHTML = `
    <main class="pub pub-aviso">
      ${marca(negocio)}
      <h1>${titulo}</h1>
      <p>${texto}</p>
    </main>`
}

function telaSenha(d, errada) {
  aplicarAparencia(d.negocio, designCompleto(d.negocio?.designPadrao))
  app.innerHTML = `
    <main class="pub pub-aviso">
      ${marca(d.negocio)}
      <h1>${esc(d.nome || 'Sua galeria')}</h1>
      <p>Digite a senha que veio junto com o link.</p>
      <form id="pub-senha" class="pub-senha" novalidate>
        <input class="entrada" id="pub-senha-in" type="password" autocomplete="off" placeholder="Senha" aria-label="Senha" />
        <button class="pub-botao" type="submit">Entrar</button>
      </form>
      ${errada ? '<p class="pub-erro">Senha errada. Confira e tente de novo.</p>' : ''}
    </main>`
  const f = app.querySelector('#pub-senha')
  f.querySelector('input').focus()
  f.addEventListener('submit', (e) => {
    e.preventDefault()
    senha = f.querySelector('input').value.trim()
    if (!senha) return
    f.querySelector('button').disabled = true
    abrir()
  })
}

async function abrir() {
  const { status, dados } = await chamar('abrir')
  if (status === 401) return telaSenha(dados, !!senha)
  if (status === 410) return telaAviso(dados.negocio, 'Esta galeria expirou', 'Fale com o seu fotógrafo pra pedir um novo link.')
  if (status !== 200) {
    return telaAviso(
      null,
      status === 0 ? 'Sem conexão' : 'Galeria não encontrada',
      esc(dados.erro || 'Confira se o link está completo.'),
    )
  }
  if (senha) guardaSenha.gravar(senha)
  estado = dados
  estado.fav = new Map(dados.favoritas.map((f) => [f.item_id, f.comentario || '']))
  design = designCompleto(dados.galeria.design)
  document.title = `${dados.galeria.nome} · ${dados.negocio.nome}`
  desenhar()
  // dentro da tela de Design: avisa que está pronta pra receber o design ao vivo
  if (previa && window.parent !== window) window.parent.postMessage({ tipo: 'galeria-pronta' }, location.origin)
}

// ── Contas da seleção ──────────────────────────────────────────
const ehSelecao = () => estado.galeria.tipo === 'selecao'
const selecaoAberta = () => !previa && ehSelecao() && estado.galeria.status === 'publicada'
const ehHistoria = () => design.layout === 'historia'
const contagem = () =>
  contarSelecao({
    favoritas: estado.fav.size,
    incluidas: estado.galeria.incluidas,
    precoExtraCentavos: estado.galeria.preco_extra_centavos,
  })

function barra() {
  const g = estado.galeria
  if (ehSelecao()) {
    const c = contagem()
    if (g.status !== 'publicada') {
      return `<div class="pub-barra-txt"><strong>Seleção enviada ✓</strong><span>${c.escolhidas} fotos${g.selecao_enviada_em ? ` em ${dataBR(g.selecao_enviada_em.slice(0, 10))}` : ''}. Seu fotógrafo já recebeu.</span></div>`
    }
    return `
      <div class="pub-barra-txt"><strong id="pub-contador">${textoContador(c, formatarReais)}</strong>
        <span>${c.incluidas && c.faltam ? `Faltam ${c.faltam} pra completar o pacote` : 'Toque no ♥ das que você mais gostar'}</span></div>
      <button class="pub-botao" data-acao="enviar" ${c.escolhidas && !previa ? '' : 'disabled'}>Enviar seleção</button>`
  }
  if (!g.download_liberado) return `<div class="pub-barra-txt"><strong>${estado.itens.length} fotos</strong></div>`
  return `
    <div class="pub-barra-txt"><strong>${estado.itens.length} fotos</strong><span>Baixe uma a uma ou todas de uma vez</span></div>
    <button class="pub-botao" data-acao="baixar-tudo" ${previa ? 'disabled' : ''}>Baixar todas</button>`
}

// Ordem das fotos na tela (e na tela cheia).
function listaVisivel() {
  if (filtro === 'favoritas') return estado.itens.filter((i) => estado.fav.has(i.id))
  if (ehHistoria()) return agruparPorCapitulo(estado.itens, estado.galeria.secoes).flatMap((g) => g.itens)
  return estado.itens
}

// ── Pedaços da página ──────────────────────────────────────────
const proporcao = (i) => (i.largura && i.altura ? i.largura / i.altura : 1.5)

function foto(i, extra = '') {
  const fav = estado.fav.has(i.id)
  return `
    <figure class="pub-foto pub-revela" data-abrir="${i.id}" style="--r:${proporcao(i).toFixed(4)}" ${extra}>
      <img src="${esc(i.mini)}" ${i.web ? `data-web="${esc(i.web)}"` : ''} alt="" loading="lazy" draggable="false" />
      ${
        ehSelecao()
          ? `<button type="button" class="pub-coracao ${fav ? 'pub-coracao-on' : ''}" data-fav="${i.id}" aria-label="${fav ? 'Tirar das favoritas' : 'Favoritar'}" aria-pressed="${fav}" ${selecaoAberta() ? '' : 'disabled'}>♥</button>`
          : ''
      }
      ${estado.fav.get(i.id) ? '<span class="pub-tem-coment" title="Tem comentário">💬</span>' : ''}
    </figure>`
}

function video(v) {
  const lido = lerVideo(v.url)
  if (!lido) return ''
  const thumb = capaVideo(lido)
  return `
    <figure class="pub-video pub-revela">
      <button type="button" class="pub-video-play" data-video="${esc(v.id)}" aria-label="Assistir ${esc(v.titulo || 'vídeo')}"
        ${thumb ? `style="background-image:url('${esc(thumb)}')"` : ''}>
        <span class="pub-video-icone">▶</span>
      </button>
      ${v.titulo ? `<figcaption>${esc(v.titulo)}</figcaption>` : ''}
    </figure>`
}

function capa() {
  const { galeria: g, negocio, itens } = estado
  const c = itens.find((i) => i.id === g.capa_item_id) || itens[0]
  const img = c?.web ? `<img class="pub-capa-foto" src="${esc(c.web)}" alt="" fetchpriority="high" />` : ''
  const oi = g.cliente ? `<p class="pub-capa-oi">${ehSelecao() ? `${esc(g.cliente)}, escolha suas favoritas` : `Pra você, ${esc(g.cliente)}`}</p>` : ''
  return `
    <header class="pub-capa pub-capa-${design.capa}">
      <div class="pub-capa-img">${img}</div>
      <div class="pub-capa-texto">
        ${marca(negocio)}
        <h1>${esc(g.nome)}</h1>
        ${oi}
        <button type="button" class="pub-capa-ver" data-acao="ver">Ver as fotos</button>
      </div>
    </header>`
}

function paragrafos(texto) {
  return String(texto || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

function corpoGrade(lista) {
  if (!lista.length) return '<p class="pub-vazio">Nenhuma favorita ainda. Toque no ♥ das fotos que você mais gostar.</p>'
  return `<section class="pub-grade">${lista.map((i) => foto(i)).join('')}</section>`
}

function corpoHistoria() {
  const { galeria: g, itens } = estado
  const grupos = agruparPorCapitulo(itens, g.secoes)
  const videosDe = (id) => (g.videos || []).filter((v) => (v.secao || null) === id && lerVideo(v.url))
  let n = 0
  return grupos
    .map(({ secao, itens: fotos }) => {
      const vids = videosDe(secao?.id || null)
      if (!fotos.length && !vids.length && !secao?.titulo && !secao?.texto) return ''
      if (secao) n++
      const cabeca = secao
        ? `<header class="pub-cap-cabeca pub-revela">
            <span class="pub-cap-num">Capítulo ${String(n).padStart(2, '0')}</span>
            ${secao.titulo ? `<h2>${esc(secao.titulo)}</h2>` : ''}
            ${secao.texto ? `<div class="pub-cap-texto">${paragrafos(secao.texto)}</div>` : ''}
          </header>`
        : ''
      const linhas = ritmoHistoria(fotos)
        .map((r) => {
          // soma das proporções: a linha nunca fica mais alta que a tela (ver .pub-linha no CSS)
          const soma = r.itens.reduce((t, i) => t + proporcao(i), 0)
          return `<div class="pub-linha pub-linha-${r.tipo}" style="--soma:${soma.toFixed(4)}">${r.itens.map((i) => foto(i)).join('')}</div>`
        })
        .join('')
      return `
        <section class="pub-capitulo">
          ${cabeca}
          ${vids.length ? `<div class="pub-videos">${vids.map(video).join('')}</div>` : ''}
          ${linhas}
        </section>`
    })
    .join('')
}

function blocoMusica() {
  const m = estado.galeria.musica
  if (!m) return ''
  if (m.tipo === 'arquivo' && m.url) {
    return `<button type="button" class="pub-musica" data-acao="musica" aria-pressed="false" title="${esc(m.titulo || 'Música')}">
      <span class="pub-musica-icone" aria-hidden="true">♪</span><span class="pub-musica-txt">Tocar música</span></button>`
  }
  const lido = m.tipo === 'link' && lerMusica(m.url)
  if (!lido) return ''
  return `<button type="button" class="pub-musica" data-acao="musica-link" aria-expanded="false" title="${esc(m.titulo || 'Música')}">
      <span class="pub-musica-icone" aria-hidden="true">♪</span><span class="pub-musica-txt">Música</span></button>
    <div class="pub-musica-painel" id="pub-musica-painel" hidden></div>`
}

function corpo() {
  const lista = listaVisivel()
  if (filtro === 'favoritas' || !ehHistoria()) {
    const vids = filtro === 'todas' ? (estado.galeria.videos || []).filter((v) => lerVideo(v.url)) : []
    return `${vids.length ? `<div class="pub-videos pub-videos-grade">${vids.map(video).join('')}</div>` : ''}${corpoGrade(lista)}`
  }
  return corpoHistoria()
}

function desenhar() {
  const { galeria: g, negocio, itens } = estado
  aplicarAparencia(negocio, design)
  const classes = [
    'pub',
    `pub-layout-${design.layout}`,
    `pub-grade-${design.grade}`,
    `pub-espaco-${design.espaco}`,
    `pub-tam-${design.tamanho}`,
    ehSelecao() ? 'pub-selecao' : '',
    previa ? 'pub-em-previa' : '',
  ].join(' ')
  app.innerHTML = `
    <main class="${classes}">
      ${previa ? '<div class="pub-previa-aviso">Prévia · é assim que a cliente vai ver</div>' : ''}
      ${portalDe && !previa ? `<a class="pub-voltar-portal" href="/c/${portalDe}">← Suas galerias</a>` : ''}
      ${capa()}
      <div id="fotos" class="pub-ancora"></div>
      ${g.mensagem ? `<div class="pub-recado pub-revela">${paragrafos(g.mensagem)}</div>` : ''}
      ${
        ehSelecao() && g.status === 'publicada'
          ? `<p class="pub-como">${g.incluidas ? `Seu pacote inclui <strong>${g.incluidas} fotos</strong>.` : ''} Toque no ♥ das que você mais gostar. Pode mudar quantas vezes quiser, fica salvo sozinho. No fim, toque em <strong>Enviar seleção</strong>.${
              g.incluidas && g.preco_extra_centavos ? ` Fotos além do pacote saem ${formatarReais(g.preco_extra_centavos)} cada.` : ''
            }</p>`
          : ''
      }
      <div class="pub-barra" id="pub-barra">${barra()}</div>
      ${
        ehSelecao()
          ? `<nav class="pub-filtro">
              <button type="button" data-filtro="todas" class="${filtro === 'todas' ? 'on' : ''}">Todas (${itens.length})</button>
              <button type="button" data-filtro="favoritas" class="${filtro === 'favoritas' ? 'on' : ''}">♥ Favoritas (<span id="pub-nfav">${estado.fav.size}</span>)</button>
            </nav>`
          : ''
      }
      <div id="pub-corpo">${corpo()}</div>
      <footer class="pub-rodape">
        ${marca(negocio)}
        <small>${g.expira_em ? `Galeria no ar até ${dataBR(g.expira_em)} · ` : ''}feita com <a href="https://studioslot.app.br" target="_blank" rel="noopener">Studio Slot</a></small>
      </footer>
      ${blocoMusica()}
      <div class="pub-aviso-flutuante" id="pub-toast" hidden></div>
    </main>
    <div class="pub-luz" id="pub-luz" hidden></div>`
  ligar()
  revelar()
}

// fotos e textos aparecem suavemente ao rolar
function revelar() {
  observador?.disconnect()
  const els = app.querySelectorAll('.pub-revela')
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach((e) => e.classList.add('pub-visivel'))
    return
  }
  observador = new IntersectionObserver(
    (entradas) =>
      entradas.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('pub-visivel')
          observador.unobserve(en.target)
        }
      }),
    { rootMargin: '0px 0px -8% 0px' },
  )
  els.forEach((e) => observador.observe(e))
}

function redesenharCorpo() {
  app.querySelector('#pub-corpo').innerHTML = corpo()
  revelar()
}

function toast(msg) {
  const t = app.querySelector('#pub-toast')
  t.textContent = msg
  t.hidden = false
  clearTimeout(toast._t)
  toast._t = setTimeout(() => (t.hidden = true), 3200)
}

function atualizarContadores() {
  app.querySelector('#pub-barra').innerHTML = barra()
  const n = app.querySelector('#pub-nfav')
  if (n) n.textContent = estado.fav.size
  ligarBarra()
}

async function alternarFavorita(id, { comentario } = {}) {
  if (!selecaoAberta()) return
  const tinha = estado.fav.has(id)
  const antes = estado.fav.get(id)
  const marcar = comentario !== undefined ? true : !tinha
  if (marcar) estado.fav.set(id, comentario !== undefined ? comentario : antes || '')
  else estado.fav.delete(id)
  redesenharFoto(id)
  atualizarContadores()
  const { status, dados } = await chamar('favoritar', { item_id: id, marcar, ...(comentario !== undefined ? { comentario } : {}) })
  if (status !== 200) {
    if (tinha) estado.fav.set(id, antes)
    else estado.fav.delete(id)
    redesenharFoto(id)
    atualizarContadores()
    if (status === 409) return abrir() // seleção já enviada (outra aba)
    toast(dados.erro || 'Não consegui salvar. Tente de novo.')
  }
}

function redesenharFoto(id) {
  if (filtro === 'favoritas') {
    redesenharCorpo()
  } else {
    app.querySelectorAll(`[data-fav="${id}"]`).forEach((b) => {
      const on = estado.fav.has(id)
      b.classList.toggle('pub-coracao-on', on)
      b.setAttribute('aria-pressed', on)
      b.setAttribute('aria-label', on ? 'Tirar das favoritas' : 'Favoritar')
    })
  }
  if (aberta >= 0) desenharLuz()
}

// ── Música ─────────────────────────────────────────────────────
function tocarMusica(ligar) {
  const m = estado.galeria.musica
  if (!m || m.tipo !== 'arquivo' || !m.url) return
  if (!audio) {
    audio = new Audio(m.url)
    audio.loop = true
    audio.volume = 0.7
  }
  const botao = app.querySelector('[data-acao="musica"]')
  const tocar = ligar ?? audio.paused
  if (tocar) audio.play().catch(() => {})
  else audio.pause()
  botao?.setAttribute('aria-pressed', String(tocar))
  botao?.classList.toggle('pub-musica-on', tocar)
  const txt = botao?.querySelector('.pub-musica-txt')
  if (txt) txt.textContent = tocar ? 'Pausar música' : 'Tocar música'
}

function abrirPainelMusica() {
  const painel = app.querySelector('#pub-musica-painel')
  const botao = app.querySelector('[data-acao="musica-link"]')
  if (!painel) return
  const abrindo = painel.hidden
  painel.hidden = !abrindo
  botao.setAttribute('aria-expanded', String(abrindo))
  if (abrindo && !painel.innerHTML) {
    const lido = lerMusica(estado.galeria.musica.url)
    const alto = lido.provedor === 'spotify' ? 152 : 180
    painel.innerHTML = `<iframe src="${esc(embedMusica(lido))}" height="${alto}" loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" title="Música"></iframe>`
  }
}

// ── Ligações ───────────────────────────────────────────────────
function ligarBarra() {
  app.querySelector('[data-acao="enviar"]')?.addEventListener('click', enviarSelecao)
  app.querySelector('[data-acao="baixar-tudo"]')?.addEventListener('click', baixarTudo)
}

function ligar() {
  ligarBarra()
  app.querySelector('[data-acao="ver"]')?.addEventListener('click', () => {
    app.querySelector('#fotos').scrollIntoView({ behavior: 'smooth' })
    tocarMusica(true) // celular só deixa tocar depois de um toque
  })
  app.querySelector('[data-acao="musica"]')?.addEventListener('click', () => tocarMusica())
  app.querySelector('[data-acao="musica-link"]')?.addEventListener('click', abrirPainelMusica)
  app.querySelectorAll('[data-filtro]').forEach((b) =>
    b.addEventListener('click', () => {
      filtro = b.dataset.filtro
      app.querySelectorAll('[data-filtro]').forEach((x) => x.classList.toggle('on', x === b))
      redesenharCorpo()
    }),
  )
  app.querySelector('#pub-corpo').addEventListener('click', (e) => {
    const fav = e.target.closest('[data-fav]')
    if (fav) {
      e.stopPropagation()
      return alternarFavorita(fav.dataset.fav)
    }
    const vid = e.target.closest('[data-video]')
    if (vid) return tocarVideo(vid)
    const fig = e.target.closest('[data-abrir]')
    if (fig) abrirLuz(listaVisivel().findIndex((i) => i.id === fig.dataset.abrir))
  })
  // seleção: dificulta salvar a foto com o botão direito (a marca d'água já protege)
  if (ehSelecao()) app.oncontextmenu = (e) => (e.target.tagName === 'IMG' ? e.preventDefault() : undefined)
}

function tocarVideo(botao) {
  const v = estado.galeria.videos.find((x) => x.id === botao.dataset.video)
  const src = embedVideo(lerVideo(v?.url), { autoplay: true })
  if (!src) return
  tocarMusica(false) // o vídeo tem som: pausa a música
  const fr = document.createElement('iframe')
  fr.src = src
  fr.title = v.titulo || 'Vídeo'
  fr.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media'
  fr.allowFullscreen = true
  botao.replaceWith(fr)
}

// ── Tela cheia ─────────────────────────────────────────────────
function abrirLuz(i) {
  if (i < 0) return
  aberta = i
  desenharLuz()
  document.body.classList.add('pub-sem-rolagem')
}
function fecharLuz() {
  aberta = -1
  const luz = app.querySelector('#pub-luz')
  luz.hidden = true
  luz.innerHTML = ''
  document.body.classList.remove('pub-sem-rolagem')
}
function moverLuz(d) {
  const n = listaVisivel().length
  if (!n) return fecharLuz()
  aberta = (aberta + d + n) % n
  desenharLuz()
}

function desenharLuz() {
  const lista = listaVisivel()
  const it = lista[aberta]
  if (!it) return fecharLuz()
  const luz = app.querySelector('#pub-luz')
  const fav = estado.fav.has(it.id)
  const coment = estado.fav.get(it.id) || ''
  const g = estado.galeria
  luz.hidden = false
  luz.innerHTML = `
    <div class="pub-luz-topo">
      <span>${aberta + 1} / ${lista.length}</span>
      <button type="button" data-luz="fechar" aria-label="Fechar">✕</button>
    </div>
    <div class="pub-luz-foto">
      <button type="button" class="pub-luz-seta" data-luz="ant" aria-label="Anterior">‹</button>
      <img src="${esc(it.web)}" alt="" draggable="false" />
      <button type="button" class="pub-luz-seta" data-luz="prox" aria-label="Próxima">›</button>
    </div>
    <div class="pub-luz-base">
      ${
        ehSelecao()
          ? `<button type="button" class="pub-coracao pub-coracao-grande ${fav ? 'pub-coracao-on' : ''}" data-luz="fav" ${selecaoAberta() ? '' : 'disabled'} aria-pressed="${fav}">♥ ${fav ? 'Favorita' : 'Favoritar'}</button>
             ${selecaoAberta() ? `<button type="button" class="pub-luz-btn" data-luz="coment">💬 ${coment ? 'Editar pedido' : 'Pedir ajuste'}</button>` : ''}`
          : g.download_liberado && !previa
            ? '<button type="button" class="pub-luz-btn" data-luz="baixar">⬇ Baixar esta foto</button>'
            : ''
      }
      ${coment ? `<p class="pub-luz-coment">“${esc(coment)}”</p>` : ''}
    </div>`
  luz.querySelector('[data-luz="fechar"]').onclick = fecharLuz
  luz.querySelector('[data-luz="ant"]').onclick = () => moverLuz(-1)
  luz.querySelector('[data-luz="prox"]').onclick = () => moverLuz(1)
  luz.querySelector('[data-luz="fav"]')?.addEventListener('click', () => alternarFavorita(it.id))
  luz.querySelector('[data-luz="baixar"]')?.addEventListener('click', () => baixarUma(it))
  luz.querySelector('[data-luz="coment"]')?.addEventListener('click', () => {
    const txt = prompt('O que você quer pedir pra esta foto? (ex.: tirar a marca no braço)', coment)
    if (txt === null) return
    alternarFavorita(it.id, { comentario: txt.trim().slice(0, 500) })
  })
  // deslizar no celular
  let x0 = null
  luz.ontouchstart = (e) => (x0 = e.touches[0].clientX)
  luz.ontouchend = (e) => {
    if (x0 == null) return
    const dx = e.changedTouches[0].clientX - x0
    if (Math.abs(dx) > 50) moverLuz(dx < 0 ? 1 : -1)
    x0 = null
  }
}

document.addEventListener('keydown', (e) => {
  if (aberta < 0) return
  if (e.key === 'Escape') fecharLuz()
  if (e.key === 'ArrowLeft') moverLuz(-1)
  if (e.key === 'ArrowRight') moverLuz(1)
})

// ── Enviar seleção ─────────────────────────────────────────────
async function enviarSelecao(e) {
  const c = contagem()
  const extras = c.extras
    ? `\n\n${c.incluidas} incluídas no pacote + ${c.extras} ${c.extras === 1 ? 'extra' : 'extras'}${c.valorExtrasCentavos ? ` (${formatarReais(c.valorExtrasCentavos)})` : ''}.`
    : c.faltam
      ? `\n\nSeu pacote inclui ${c.incluidas}: ainda dá pra escolher mais ${c.faltam}.`
      : ''
  if (!confirm(`Enviar ${c.escolhidas} ${c.escolhidas === 1 ? 'foto' : 'fotos'} pro seu fotógrafo?${extras}\n\nDepois de enviar, não dá pra mudar por aqui.`)) return
  e.target.disabled = true
  const { status, dados } = await chamar('enviar')
  if (status !== 200) {
    e.target.disabled = false
    return toast(dados.erro || 'Não consegui enviar. Tente de novo.')
  }
  await abrir()
  toast('Seleção enviada ✓ Obrigada!')
}

// ── Baixar ─────────────────────────────────────────────────────
function salvarComo(href, nome) {
  const a = document.createElement('a')
  a.href = href
  if (nome) a.download = nome
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

async function baixarUma(it) {
  const { status, dados } = await chamar('baixar', { item_id: it.id })
  if (status !== 200 || !dados.arquivos?.[0]?.url) return toast(dados.erro || 'Não consegui baixar. Tente de novo.')
  salvarComo(dados.arquivos[0].url, dados.arquivos[0].nome)
}

// nomes repetidos no .zip viram "foto (2).jpg"
function nomesUnicos(arquivos) {
  const vistos = new Map()
  return arquivos.map((a) => {
    const n = vistos.get(a.nome) || 0
    vistos.set(a.nome, n + 1)
    if (!n) return a
    const i = a.nome.lastIndexOf('.')
    return { ...a, nome: i > 0 ? `${a.nome.slice(0, i)} (${n + 1})${a.nome.slice(i)}` : `${a.nome} (${n + 1})` }
  })
}

async function baixarTudo(e) {
  const btn = e.target
  btn.disabled = true
  const original = btn.textContent
  try {
    const { status, dados } = await chamar('baixar')
    if (status !== 200 || !dados.arquivos?.length) return toast(dados.erro || 'Não consegui baixar. Tente de novo.')
    const { Zip, ZipPassThrough } = await import('fflate')
    const lotes = emLotes(nomesUnicos(dados.arquivos), LOTE_ZIP)
    let feitas = 0
    for (let k = 0; k < lotes.length; k++) {
      const partes = []
      let fim
      const pronto = new Promise((ok, falha) => (fim = { ok, falha }))
      const zip = new Zip((err, pedaco, final) => {
        if (err) return fim.falha(err)
        partes.push(pedaco)
        if (final) fim.ok()
      })
      for (const a of lotes[k]) {
        const res = await fetch(a.url)
        if (!res.ok) throw new Error('falha ao baixar ' + a.nome)
        const arq = new ZipPassThrough(a.nome)
        zip.add(arq)
        arq.push(new Uint8Array(await res.arrayBuffer()), true)
        feitas++
        btn.textContent = `Preparando ${feitas} de ${dados.arquivos.length}…`
      }
      zip.end()
      await pronto
      const blob = new Blob(partes, { type: 'application/zip' })
      const sufixo = lotes.length > 1 ? ` (parte ${k + 1} de ${lotes.length})` : ''
      const url = URL.createObjectURL(blob)
      salvarComo(url, `${estado.galeria.nome}${sufixo}.zip`)
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    }
    toast(lotes.length > 1 ? `Pronto ✓ ${lotes.length} arquivos .zip baixados.` : 'Pronto ✓')
  } catch {
    toast('O download parou no meio. Confira a internet e tente de novo.')
  } finally {
    btn.disabled = false
    btn.textContent = original
  }
}

// Prévia ao vivo: a tela de Design manda o design (e capítulos/vídeos/música)
// sem salvar, e a página redesenha na hora.
window.addEventListener('message', (e) => {
  if (!previa || e.origin !== location.origin || !estado) return
  const m = e.data
  if (m?.tipo !== 'galeria-previa') return
  if (m.design) design = designCompleto(m.design)
  if (Array.isArray(m.secoes)) estado.galeria.secoes = m.secoes
  if (Array.isArray(m.videos)) estado.galeria.videos = m.videos
  if (m.secaoDe) estado.itens.forEach((i) => (i.secao = m.secaoDe[i.id] ?? i.secao))
  if (m.capa_item_id) estado.galeria.capa_item_id = m.capa_item_id
  if (m.nome) estado.galeria.nome = m.nome
  if ('mensagem' in m) estado.galeria.mensagem = m.mensagem
  const y = window.scrollY
  desenhar()
  window.scrollTo(0, y)
})

export async function montarGaleriaPublica(cod) {
  codigo = cod
  const q = new URLSearchParams(location.search)
  previa = q.has('previa')
  portalDe = /^[0-9a-f]{16}$/.test(q.get('de') || '') ? q.get('de') : null
  senha = guardaSenha.ler()
  app.innerHTML = '<main class="pub pub-aviso"><p>Abrindo a galeria…</p></main>'
  if (previa) {
    const { data } = await supabase.auth.getSession()
    tokenPrevia = data?.session?.access_token || null
    if (!tokenPrevia) previa = false // sem login: abre como cliente
  }
  abrir()
}
