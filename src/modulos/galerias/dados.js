// ────────────────────────────────────────────────────────────────
//  Galerias — leitura e gravação do fotógrafo
//  (galerias, galeria_itens, galeria_favoritas). A cliente usa
//  publica.js, que fala só com a função `galeria`.
// ────────────────────────────────────────────────────────────────

import { supabase } from '../../supabase.js'
import { apagarArquivos } from './arquivos.js'

let _estudioId = null

export async function carregarGalerias(estudioId) {
  const [g, e] = await Promise.all([
    supabase.from('galerias').select('*').eq('estudio_id', estudioId).order('created_at', { ascending: false }),
    supabase.from('estudios').select('galeria_limite_gb, galeria_design_padrao, portal_titulo, portal_mensagem').eq('id', estudioId).single(),
  ])
  const error = g.error || e.error
  if (error) return { dados: null, error }
  _estudioId = estudioId
  return {
    dados: {
      galerias: g.data,
      limiteGb: e.data.galeria_limite_gb,
      designPadrao: e.data.galeria_design_padrao || {},
      portal: { titulo: e.data.portal_titulo, mensagem: e.data.portal_mensagem },
    },
    error: null,
  }
}

export async function carregarGaleria(id) {
  const [g, i, f] = await Promise.all([
    supabase.from('galerias').select('*').eq('id', id).maybeSingle(),
    supabase.from('galeria_itens').select('*').eq('galeria_id', id).order('ordem').order('nome_arquivo'),
    supabase.from('galeria_favoritas').select('*').eq('galeria_id', id),
  ])
  const error = g.error || i.error || f.error
  if (error) return { dados: null, error }
  return { dados: { galeria: g.data, itens: i.data, favoritas: f.data }, error: null }
}

export async function salvarGaleria(campos, id) {
  const { data, error } = id
    ? await supabase.from('galerias').update(campos).eq('id', id).select().single()
    : await supabase.from('galerias').insert({ ...campos, estudio_id: _estudioId }).select().single()
  return { galeria: data, error }
}

export async function registrarItem(galeriaId, item, ordem) {
  const { data, error } = await supabase
    .from('galeria_itens')
    .insert({ ...item, galeria_id: galeriaId, estudio_id: _estudioId, ordem })
    .select()
    .single()
  return { item: data, error }
}

export async function apagarItens(itens) {
  const ids = itens.map((i) => i.id)
  const { error } = await supabase.from('galeria_itens').delete().in('id', ids)
  if (error) return { error }
  await apagarArquivos(itens.flatMap((i) => [i.caminho_mini, i.caminho_web, i.caminho_original]))
  return { error: null }
}

export async function apagarGaleria(galeria, itens) {
  const { error } = await supabase.from('galerias').delete().eq('id', galeria.id)
  if (error) return { error }
  await apagarArquivos([
    ...itens.flatMap((i) => [i.caminho_mini, i.caminho_web, i.caminho_original]),
    galeria.musica?.caminho,
  ])
  return { error: null }
}

// Fotos -> capítulo: { itemId: secaoId|null } agrupado numa atualização por capítulo.
export async function salvarCapitulosDasFotos(secaoDe) {
  const porSecao = new Map()
  for (const [id, secao] of Object.entries(secaoDe)) {
    const k = secao || ''
    if (!porSecao.has(k)) porSecao.set(k, [])
    porSecao.get(k).push(id)
  }
  for (const [secao, ids] of porSecao) {
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await supabase.from('galeria_itens').update({ secao: secao || null }).in('id', ids.slice(i, i + 200))
      if (error) return { error }
    }
  }
  return { error: null }
}

export async function salvarDesignPadrao(estudioId, design) {
  const { error } = await supabase.from('estudios').update({ galeria_design_padrao: design }).eq('id', estudioId)
  return { error }
}

export async function salvarTextosPortal(estudioId, { titulo, mensagem }) {
  const { error } = await supabase.from('estudios').update({ portal_titulo: titulo, portal_mensagem: mensagem }).eq('id', estudioId)
  return { error }
}

export async function reabrirSelecao(id) {
  const { error } = await supabase.rpc('reabrir_selecao', { p_galeria_id: id })
  return { error }
}

export function mensagemDeErro(error) {
  const m = (error?.message || '').toLowerCase()
  if (error?.hint === 'limite_galerias' || m.includes('espaço de galerias')) return error.message
  if (m.includes('senha') && m.includes('check')) return 'A senha precisa ter de 4 a 40 caracteres.'
  if (m.includes('check constraint')) return 'Algum dado está fora do padrão. Confira o formulário.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sem conexão. Tente de novo.'
  if (m.includes('payload too large') || m.includes('exceeded the maximum')) return 'Arquivo grande demais.'
  return error?.message || 'Não deu certo. Tente de novo.'
}
