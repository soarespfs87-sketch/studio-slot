// ────────────────────────────────────────────────────────────────
//  Galerias — regras sem banco (testadas em regras.test.js)
//  Usadas pelo app do fotógrafo E pela página pública da cliente.
// ────────────────────────────────────────────────────────────────

export const LIMITE_GB_PADRAO = 20 // espaço por fotógrafo no teste
export const MAX_WEB = 2048 // lado maior da versão leve (tela cheia)
export const MAX_MINI = 560 // lado maior da miniatura (grade)

export const STATUS = {
  rascunho: { rotulo: 'Rascunho', classe: 'gal-st-rascunho' },
  publicada: { rotulo: 'Publicada', classe: 'gal-st-publicada' },
  selecao_enviada: { rotulo: 'Seleção recebida', classe: 'gal-st-recebida' },
  concluida: { rotulo: 'Concluída', classe: 'gal-st-concluida' },
}

export const TIPOS = {
  selecao: { rotulo: 'Seleção', dica: 'A cliente escolhe as favoritas. Fotos leves com marca d’água.' },
  entrega: { rotulo: 'Entrega', dica: 'Fotos prontas em alta, pra cliente baixar.' },
}

// Contas da seleção: quantas incluídas, quantas extras e quanto custam.
// incluidas null/0 = sem limite (nenhuma extra).
export function contarSelecao({ favoritas, incluidas, precoExtraCentavos }) {
  const n = Math.max(0, favoritas | 0)
  const lim = incluidas > 0 ? incluidas : null
  const extras = lim == null ? 0 : Math.max(0, n - lim)
  return {
    escolhidas: n,
    incluidas: lim,
    extras,
    faltam: lim == null ? 0 : Math.max(0, lim - n),
    valorExtrasCentavos: extras * Math.max(0, precoExtraCentavos | 0),
  }
}

// Texto do contador da cliente: "12 de 30 incluídas" / "32 escolhidas · 2 extras"
export function textoContador(c, formatar) {
  if (c.incluidas == null) return `${c.escolhidas} ${c.escolhidas === 1 ? 'escolhida' : 'escolhidas'}`
  if (c.extras === 0) return `${c.escolhidas} de ${c.incluidas} incluídas`
  const valor = c.valorExtrasCentavos > 0 ? ` · ${formatar(c.valorExtrasCentavos)}` : ''
  return `${c.escolhidas} escolhidas · ${c.extras} ${c.extras === 1 ? 'extra' : 'extras'}${valor}`
}

// Nome sem extensão: "IMG_0042.CR3" -> "IMG_0042"
export const semExtensao = (nome) => String(nome || '').replace(/\.[^./\\]+$/, '')

// Lista pra colar no filtro do Lightroom (Biblioteca › Texto › Nome do arquivo › Contém).
export function listaLightroom(nomes) {
  return [...new Set(nomes.map(semExtensao).filter(Boolean))].join(', ')
}

// Ordem "natural": IMG_2 antes de IMG_10.
const _ordem = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' })
export const compararNomes = (a, b) => _ordem.compare(a, b)

// Venceu? (expira_em é o último dia em que ainda abre)
export function expirou(expiraEm, hojeISO) {
  return !!expiraEm && expiraEm < hojeISO
}

// Dias até expirar (0 = hoje é o último dia; negativo = já expirou; null = não expira)
export function diasParaExpirar(expiraEm, hojeISO) {
  if (!expiraEm) return null
  const d = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))
  return Math.round((d(expiraEm) - d(hojeISO)) / 86400000)
}

// Tamanho final de uma imagem respeitando o lado maior (nunca aumenta).
export function encaixar(largura, altura, max) {
  const maior = Math.max(largura, altura)
  if (maior <= max) return { largura, altura }
  const f = max / maior
  return { largura: Math.round(largura * f), altura: Math.round(altura * f) }
}

// 1536000 -> "1,5 MB"
export function formatarBytes(b) {
  const n = Number(b) || 0
  if (n < 1024 * 1024) return `${Math.max(0, Math.round(n / 1024))} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
  return `${(n / 1024 ** 3).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} GB`
}

// Divide arquivos em lotes de até `maxBytes` (pra baixar tudo em partes de .zip).
export function emLotes(itens, maxBytes) {
  const lotes = []
  let atual = []
  let soma = 0
  for (const it of itens) {
    const b = it.bytes || 0
    if (atual.length && soma + b > maxBytes) {
      lotes.push(atual)
      atual = []
      soma = 0
    }
    atual.push(it)
    soma += b
  }
  if (atual.length) lotes.push(atual)
  return lotes
}

// Endereço público da galeria.
export const caminhoPublico = (codigo) => `/g/${codigo}`

// Mensagem pronta do WhatsApp pra mandar o link.
export function mensagemLink({ galeria, cliente, negocio, url, senha }) {
  const primeiro = (cliente?.nome || '').trim().split(/\s+/)[0]
  const oi = primeiro ? `Oi, ${primeiro}!` : 'Oi!'
  const corpo =
    galeria.tipo === 'selecao'
      ? `Suas fotos chegaram pra você escolher as favoritas 💛${
          galeria.incluidas ? ` Seu pacote inclui ${galeria.incluidas} fotos.` : ''
        } É só tocar no coração das que você mais gostar e, no fim, em "Enviar seleção".`
      : 'Suas fotos estão prontas 💛 Você pode ver e baixar todas por aqui.'
  const linhaSenha = senha ? `\nSenha: ${senha}` : ''
  const prazo = galeria.expira_em
    ? `\nO link fica no ar até ${galeria.expira_em.slice(8, 10)}/${galeria.expira_em.slice(5, 7)}.`
    : ''
  return `${oi} ${corpo}\n\n${url}${linhaSenha}${prazo}\n\n${negocio}`
}

// ════════════════════════════════════════════════════════════════
//  G4 — design, história, vídeo e música
// ════════════════════════════════════════════════════════════════

// Opções que o fotógrafo escolhe. A primeira de cada lista é o padrão.
export const DESIGN = {
  layout: [
    { id: 'grade', rotulo: 'Grade', dica: 'Todas as fotos lado a lado, rápido de ver e escolher.' },
    { id: 'historia', rotulo: 'História', dica: 'Capítulos com texto, fotos grandes e vídeo, como uma revista.' },
  ],
  capa: [
    { id: 'centro', rotulo: 'Centro' },
    { id: 'esquerda', rotulo: 'Canto' },
    { id: 'dividida', rotulo: 'Dividida' },
    { id: 'moldura', rotulo: 'Moldura' },
    { id: 'revista', rotulo: 'Revista' },
  ],
  fonte: [
    { id: 'classica', rotulo: 'Clássica', titulo: 'Cormorant Garamond', texto: 'Inter' },
    { id: 'moderna', rotulo: 'Moderna', titulo: 'Jost', texto: 'Jost' },
    { id: 'editorial', rotulo: 'Editorial', titulo: 'Playfair Display', texto: 'Lato' },
    { id: 'delicada', rotulo: 'Delicada', titulo: 'Italiana', texto: 'Mulish' },
    { id: 'marcante', rotulo: 'Marcante', titulo: 'Bodoni Moda', texto: 'Work Sans' },
  ],
  paleta: [
    { id: 'claro', rotulo: 'Claro', fundo: '#ffffff', texto: '#1f1f1f', suave: '#7a7a7a', linha: '#ececec', destaque: '#1f1f1f' },
    { id: 'areia', rotulo: 'Areia', fundo: '#f6f1ea', texto: '#3b3128', suave: '#8b7d6e', linha: '#e6ddd1', destaque: '#a0764f' },
    { id: 'rose', rotulo: 'Rosé', fundo: '#f8eeec', texto: '#4a2f2f', suave: '#a07d7a', linha: '#ecdcd9', destaque: '#b9706a' },
    { id: 'oliva', rotulo: 'Oliva', fundo: '#eef0e8', texto: '#2f3427', suave: '#7c8370', linha: '#dde1d3', destaque: '#6b7a4b' },
    { id: 'terracota', rotulo: 'Terracota', fundo: '#f5ebe4', texto: '#3d2a22', suave: '#93786b', linha: '#e8d8cd', destaque: '#b5553a' },
    { id: 'escuro', rotulo: 'Escuro', fundo: '#141414', texto: '#f2f0ec', suave: '#9a968f', linha: '#2a2a2a', destaque: '#d8c3a5' },
    { id: 'marca', rotulo: 'Minha marca', fundo: null, texto: null, suave: null, linha: null, destaque: null },
  ],
  grade: [
    { id: 'mosaico', rotulo: 'Mosaico', dica: 'Cada foto no formato dela, em colunas.' },
    { id: 'linhas', rotulo: 'Linhas', dica: 'Fileiras da mesma altura, como um álbum.' },
    { id: 'quadrada', rotulo: 'Quadrada', dica: 'Todas recortadas em quadrado.' },
  ],
  espaco: [
    { id: 'justo', rotulo: 'Justo' },
    { id: 'arejado', rotulo: 'Arejado' },
  ],
  tamanho: [
    { id: 'normal', rotulo: 'Normal' },
    { id: 'grande', rotulo: 'Grande' },
  ],
}

// Design completo: preenche o que faltar com o padrão e ignora valores desconhecidos.
export function designCompleto(...fontes) {
  const d = {}
  for (const [chave, opcoes] of Object.entries(DESIGN)) {
    const escolhido = fontes.map((f) => f?.[chave]).find((v) => opcoes.some((o) => o.id === v))
    d[chave] = escolhido || opcoes[0].id
  }
  return d
}

export const opcao = (chave, id) => DESIGN[chave].find((o) => o.id === id) || DESIGN[chave][0]

// Cores da paleta "Minha marca" a partir do tema do negócio.
export function coresDaPaleta(id, tema = {}) {
  const p = opcao('paleta', id)
  if (p.id !== 'marca') return p
  return {
    ...p,
    fundo: tema.superficie || '#fdfcfb',
    texto: '#1c1917',
    suave: tema.textoSuave || '#78716c',
    linha: '#e7e2dc',
    destaque: tema.primaria || '#c2410c',
  }
}

// Link de vídeo -> { provedor, id } (só YouTube e Vimeo; o resto é recusado).
export function lerVideo(url) {
  let u
  try {
    u = new URL(String(url || '').trim())
  } catch {
    return null
  }
  if (!/^https?:$/.test(u.protocol)) return null
  const host = u.hostname.replace(/^www\.|^m\./, '')
  const idYT = /^[\w-]{11}$/
  if (host === 'youtu.be') {
    const id = u.pathname.slice(1).split('/')[0]
    return idYT.test(id) ? { provedor: 'youtube', id } : null
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const id = u.searchParams.get('v') || (/^\/(embed|shorts|live)\/([\w-]{11})/.exec(u.pathname) || [])[2]
    return id && idYT.test(id) ? { provedor: 'youtube', id } : null
  }
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = /\/(?:video\/)?(\d{6,12})(?:\/([0-9a-f]{6,20}))?/.exec(u.pathname)
    return m ? { provedor: 'vimeo', id: m[1], hash: m[2] || u.searchParams.get('h') || null } : null
  }
  return null
}

// Endereço do player (montado por nós, nunca o link colado).
export function embedVideo(v, { autoplay = false } = {}) {
  if (!v) return null
  if (v.provedor === 'youtube') {
    return `https://www.youtube-nocookie.com/embed/${v.id}?rel=0&modestbranding=1&playsinline=1${autoplay ? '&autoplay=1' : ''}`
  }
  if (v.provedor === 'vimeo') {
    return `https://player.vimeo.com/video/${v.id}?dnt=1&title=0&byline=0&portrait=0${v.hash ? `&h=${v.hash}` : ''}${autoplay ? '&autoplay=1' : ''}`
  }
  return null
}

export const capaVideo = (v) => (v?.provedor === 'youtube' ? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg` : null)

// Link de música -> player (Spotify ou YouTube).
export function lerMusica(url) {
  let u
  try {
    u = new URL(String(url || '').trim())
  } catch {
    return null
  }
  if (!/^https?:$/.test(u.protocol)) return null
  const host = u.hostname.replace(/^www\./, '')
  if (host === 'open.spotify.com') {
    const m = /^\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode)\/([A-Za-z0-9]{10,40})/.exec(u.pathname)
    return m ? { provedor: 'spotify', tipo: m[1], id: m[2] } : null
  }
  const v = lerVideo(url)
  return v?.provedor === 'youtube' ? v : null
}

export function embedMusica(m) {
  if (!m) return null
  if (m.provedor === 'spotify') return `https://open.spotify.com/embed/${m.tipo}/${m.id}?utm_source=generator`
  if (m.provedor === 'youtube') return embedVideo(m)
  return null
}

// Fotos em ordem de capítulo: os capítulos na ordem da lista; fotos sem
// capítulo (ou de capítulo apagado) vão pro começo, num capítulo sem título.
export function agruparPorCapitulo(itens, secoes) {
  const ids = new Set((secoes || []).map((s) => s.id))
  const grupos = [{ secao: null, itens: itens.filter((i) => !i.secao || !ids.has(i.secao)) }]
  for (const s of secoes || []) grupos.push({ secao: s, itens: itens.filter((i) => i.secao === s.id) })
  return grupos
}

const ehPaisagem = (i) => i.largura && i.altura && i.largura / i.altura > 1.2

// Ritmo da história: foto deitada sozinha vira "inteira" (de ponta a ponta);
// o resto vai em linhas de 2 e, a cada 3 linhas, uma de 3. Nunca duas inteiras seguidas.
export function ritmoHistoria(itens) {
  const grupos = []
  let i = 0
  let linhas = 0
  while (i < itens.length) {
    const a = itens[i]
    const ultimaInteira = grupos.at(-1)?.tipo === 'inteira'
    if (ehPaisagem(a) && !ultimaInteira) {
      grupos.push({ tipo: 'inteira', itens: [a] })
      i++
      continue
    }
    const tam = linhas % 3 === 2 ? 3 : 2
    const linha = itens.slice(i, i + tam)
    i += linha.length
    linhas++
    grupos.push({ tipo: linha.length === 1 ? 'sozinha' : 'linha', itens: linha })
  }
  return grupos
}

// id curto pra capítulo/vídeo
export const novoId = () => Math.random().toString(36).slice(2, 10)

// Portal da cliente: um link com todas as galerias dela (uma pasta por ensaio).
export const urlPortal = (codigo, origem = globalThis.location?.origin || 'https://studioslot.app.br') => `${origem}/c/${codigo}`

export function mensagemPortal(cliente, negocio, origem) {
  const primeiro = (cliente?.nome || '').trim().split(/\s+/)[0]
  return `Oi${primeiro ? `, ${primeiro}` : ''}! Este é o seu espaço com todas as suas fotos 💛 Cada ensaio fica numa pasta, é só abrir:\n\n${urlPortal(cliente.portal_codigo, origem)}\n\n${negocio?.nome || ''}`.trim()
}

// Textos do portal: troca {nome} pelo primeiro nome da cliente.
export function textoDoPortal(texto, nome) {
  return String(texto || '')
    .replace(/\{nome\}/gi, nome || '')
    .replace(/,\s*$/, '')
    .replace(/\s+([,!.?])/g, '$1')
    .trim()
}
