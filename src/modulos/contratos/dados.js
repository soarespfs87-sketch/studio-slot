// ────────────────────────────────────────────────────────────────
//  Contratos — leitura e gravação (contrato_modelos, contratos)
// ────────────────────────────────────────────────────────────────

import { supabase } from '../../supabase.js'

let _estudioId = null

export async function carregarContratos(estudioId) {
  const [m, c] = await Promise.all([
    supabase.from('contrato_modelos').select('*').eq('estudio_id', estudioId).order('created_at'),
    supabase.from('contratos').select('*').eq('estudio_id', estudioId).order('created_at', { ascending: false }),
  ])
  const error = m.error || c.error
  if (error) return { dados: null, error }
  _estudioId = estudioId
  return { dados: { modelos: m.data, contratos: c.data }, error: null }
}

export async function salvarModelo(campos, id) {
  const { data, error } = id
    ? await supabase.from('contrato_modelos').update(campos).eq('id', id).select().single()
    : await supabase.from('contrato_modelos').insert({ ...campos, estudio_id: _estudioId }).select().single()
  return { modelo: data, error }
}

export async function apagarModelo(id) {
  const { error } = await supabase.from('contrato_modelos').delete().eq('id', id)
  return { error }
}

export async function salvarContrato(campos, id) {
  const { data, error } = id
    ? await supabase.from('contratos').update(campos).eq('id', id).select().single()
    : await supabase.from('contratos').insert({ ...campos, estudio_id: _estudioId }).select().single()
  return { contrato: data, error }
}

export async function apagarContrato(id) {
  const { error } = await supabase.from('contratos').delete().eq('id', id)
  return { error }
}

export function mensagemDeErro(error) {
  const m = (error?.message || '').toLowerCase()
  if (m.includes('assinado')) return error.message
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sem conexão. Tente de novo.'
  return error?.message || 'Não deu certo. Tente de novo.'
}
