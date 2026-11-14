// ────────────────────────────────────────────────────────────────
//  Galerias — arquivos (fotos) e o "armário" onde ficam
//
//  Tudo que fala com o armário está AQUI. Hoje é o Supabase Storage
//  (bucket privado 'galerias'); pra trocar pro Cloudflare R2 depois,
//  só este arquivo e a função `galeria` mudam.
//
//  O processamento é feito no navegador do fotógrafo, antes de enviar:
//    mini  — até 560 px (grade)
//    web   — até 2048 px (tela cheia); com marca d'água na seleção
//    orig  — o arquivo original, só na entrega (é o que a cliente baixa)
//  Caminho: <negocio>/<galeria>/<aleatorio>-<versao>.jpg
// ────────────────────────────────────────────────────────────────

import { supabase } from '../../supabase.js'
import { encaixar, MAX_WEB, MAX_MINI } from './regras.js'

const BUCKET = 'galerias'
export const TIPOS_OK = ['image/jpeg', 'image/png', 'image/webp']
export const LIMITE_ARQUIVO = 50 * 1024 * 1024 // 50 MB por foto

// Abre a imagem já virada certo (fotos de celular vêm com "orientação" no EXIF).
async function abrirImagem(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* cai pro <img> abaixo */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Marca d'água: o nome do negócio repetido na diagonal, branco translúcido
// com contorno escuro leve (aparece em foto clara e escura).
function desenharMarca(ctx, w, h, texto) {
  const tam = Math.max(16, Math.round(Math.min(w, h) / 14))
  ctx.save()
  ctx.font = `600 ${tam}px Inter, system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255,255,255,0.32)'
  ctx.strokeStyle = 'rgba(0,0,0,0.14)'
  ctx.lineWidth = Math.max(1, tam / 22)
  ctx.translate(w / 2, h / 2)
  ctx.rotate(-Math.PI / 6)
  const passoX = ctx.measureText(texto).width + tam * 2.5
  const passoY = tam * 4
  const alcance = Math.hypot(w, h)
  for (let y = -alcance / 2; y < alcance / 2; y += passoY) {
    const desloc = (Math.round(y / passoY) % 2) * (passoX / 2)
    for (let x = -alcance / 2 - desloc; x < alcance / 2; x += passoX) {
      ctx.strokeText(texto, x, y)
      ctx.fillText(texto, x, y)
    }
  }
  ctx.restore()
}

function paraJpeg(img, max, marca, qualidade) {
  const lw = img.width
  const lh = img.height
  const { largura, altura } = encaixar(lw, lh, max)
  const canvas = document.createElement('canvas')
  canvas.width = largura
  canvas.height = altura
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = '#fff' // PNG transparente não fica preto no JPEG
  ctx.fillRect(0, 0, largura, altura)
  ctx.drawImage(img, 0, 0, largura, altura)
  if (marca) desenharMarca(ctx, largura, altura, marca)
  return new Promise((ok, falha) =>
    canvas.toBlob((b) => (b ? ok(b) : falha(new Error('Não consegui processar a foto.'))), 'image/jpeg', qualidade),
  )
}

// Gera as versões de uma foto. `marca` = texto da marca d'água (ou null).
export async function processarFoto(file, { marca = null } = {}) {
  const img = await abrirImagem(file)
  try {
    const web = await paraJpeg(img, MAX_WEB, marca, 0.86)
    const mini = await paraJpeg(img, MAX_MINI, marca, 0.8)
    return { web, mini, largura: img.width, altura: img.height }
  } finally {
    img.close?.()
  }
}

async function guardar(caminho, blob, contentType) {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, blob, { contentType, upsert: false, cacheControl: '31536000' })
  if (error) throw error
  return caminho
}

// Processa e guarda uma foto. Devolve os dados pro banco (galeria_itens).
// Se algo falhar no meio, apaga o que já tinha subido.
export async function enviarFoto(file, { estudioId, galeriaId, comOriginal, marca }) {
  if (!TIPOS_OK.includes(file.type)) throw new Error('Use fotos JPG, PNG ou WEBP.')
  if (file.size > LIMITE_ARQUIVO) throw new Error('Foto maior que 50 MB.')
  const v = await processarFoto(file, { marca })
  const base = `${estudioId}/${galeriaId}/${crypto.randomUUID()}`
  const subidos = []
  try {
    subidos.push(await guardar(`${base}-mini.jpg`, v.mini, 'image/jpeg'))
    subidos.push(await guardar(`${base}-web.jpg`, v.web, 'image/jpeg'))
    let original = null
    if (comOriginal) {
      const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type]
      original = await guardar(`${base}-orig.${ext}`, file, file.type)
      subidos.push(original)
    }
    return {
      tipo: 'foto',
      nome_arquivo: file.name,
      caminho_mini: subidos[0],
      caminho_web: subidos[1],
      caminho_original: original,
      largura: v.largura,
      altura: v.altura,
      bytes: v.mini.size + v.web.size + (comOriginal ? file.size : 0),
    }
  } catch (e) {
    if (subidos.length) await apagarArquivos(subidos)
    throw e
  }
}

// Música de fundo (MP3/M4A até 15 MB). Devolve o caminho no armário.
export const TIPOS_MUSICA = { 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'aac' }
export const LIMITE_MUSICA = 15 * 1024 * 1024
export async function enviarMusica(file, { estudioId, galeriaId }) {
  const ext = TIPOS_MUSICA[file.type]
  if (!ext) throw new Error('Use um arquivo MP3 ou M4A.')
  if (file.size > LIMITE_MUSICA) throw new Error('A música passa de 15 MB.')
  return guardar(`${estudioId}/${galeriaId}/musica-${crypto.randomUUID()}.${ext}`, file, file.type)
}

export async function apagarArquivos(caminhos) {
  const lista = caminhos.filter(Boolean)
  for (let i = 0; i < lista.length; i += 100) {
    await supabase.storage.from(BUCKET).remove(lista.slice(i, i + 100))
  }
}

// Links temporários pro fotógrafo ver as próprias fotos (bucket é privado).
export async function linksTemporarios(caminhos, segundos = 3600) {
  const lista = [...new Set(caminhos.filter(Boolean))]
  const mapa = {}
  for (let i = 0; i < lista.length; i += 500) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(lista.slice(i, i + 500), segundos)
    if (error) throw error
    for (const d of data) if (d.signedUrl) mapa[d.path] = d.signedUrl
  }
  return mapa
}

// Roda `tarefa` em cada item, `n` por vez (envio de várias fotos).
export async function emParalelo(itens, n, tarefa) {
  let i = 0
  const trabalhador = async () => {
    while (i < itens.length) {
      const k = i++
      await tarefa(itens[k], k)
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, itens.length) }, trabalhador))
}
