// ────────────────────────────────────────────────────────────────
//  Enviar imagem para o armário (Supabase Storage, bucket 'imagens')
//  Guarda em  <id-do-estudio>/<pasta>/<aleatorio>.<ext>  e devolve a URL.
// ────────────────────────────────────────────────────────────────

import { supabase } from './supabase.js'

const EXT_OK = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }
const LIMITE = 5 * 1024 * 1024 // 5 MB

export async function enviarImagem(file, estudioId, pasta) {
  if (!file) return { url: null, error: { message: 'Nenhum arquivo escolhido.' } }
  if (!EXT_OK[file.type]) return { url: null, error: { message: 'Use PNG, JPEG ou WEBP.' } }
  if (file.size > LIMITE) return { url: null, error: { message: 'A imagem passa de 5 MB.' } }

  const caminho = `${estudioId}/${pasta}/${crypto.randomUUID()}.${EXT_OK[file.type]}`
  const { error } = await supabase.storage
    .from('imagens')
    .upload(caminho, file, { contentType: file.type, upsert: false })
  if (error) return { url: null, error }

  const { data } = supabase.storage.from('imagens').getPublicUrl(caminho)
  return { url: data.publicUrl, error: null }
}
