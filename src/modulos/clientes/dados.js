// ────────────────────────────────────────────────────────────────
//  Clientes — leitura e gravação (clientes, familiares, lembretes_feitos)
//  Sempre relê do banco: fechar um lead cria cliente por fora.
// ────────────────────────────────────────────────────────────────

import { supabase } from '../../supabase.js'

let _estudioId = null
let _dados = { clientes: [], feitos: new Set() }

export const clientesCarregados = () => _dados.clientes
export const acharCliente = (id) => _dados.clientes.find((c) => c.id === id) || null

export async function carregarClientes(estudioId) {
  const [c, f, l] = await Promise.all([
    supabase.from('clientes').select('*').eq('estudio_id', estudioId).order('nome'),
    supabase.from('familiares').select('*').eq('estudio_id', estudioId).order('created_at'),
    supabase.from('lembretes_feitos').select('chave').eq('estudio_id', estudioId),
  ])
  const error = c.error || f.error || l.error
  if (error) return { dados: null, error }
  _estudioId = estudioId
  const porCliente = {}
  for (const x of f.data) (porCliente[x.cliente_id] ||= []).push(x)
  _dados = {
    clientes: c.data.map((cl) => ({ ...cl, familiares: porCliente[cl.id] || [] })),
    feitos: new Set(l.data.map((x) => x.chave)),
  }
  return { dados: _dados, error: null }
}

export async function salvarCliente(campos, id) {
  const { data, error } = id
    ? await supabase.from('clientes').update(campos).eq('id', id).select().single()
    : await supabase.from('clientes').insert({ ...campos, estudio_id: _estudioId }).select().single()
  return { cliente: data, error }
}

export async function apagarCliente(id) {
  const { error } = await supabase.from('clientes').delete().eq('id', id)
  return { error }
}

export async function salvarFamiliar(campos, id) {
  const { error } = id
    ? await supabase.from('familiares').update(campos).eq('id', id)
    : await supabase.from('familiares').insert({ ...campos, estudio_id: _estudioId })
  return { error }
}

export async function apagarFamiliar(id) {
  const { error } = await supabase.from('familiares').delete().eq('id', id)
  return { error }
}

export async function marcarLembreteFeito(clienteId, chave) {
  const { error } = await supabase
    .from('lembretes_feitos')
    .insert({ estudio_id: _estudioId, cliente_id: clienteId, chave })
  if (!error || error.code === '23505') _dados.feitos.add(chave) // 23505 = já estava marcado
  return { error: error?.code === '23505' ? null : error }
}

export function mensagemDeErro(error) {
  const m = (error?.message || '').toLowerCase()
  if (error?.code === '23505' || m.includes('duplicate')) return 'Já existe uma cliente com esse WhatsApp.'
  if (m.includes('whatsapp')) return 'Confira o WhatsApp (DDD + número).'
  if (m.includes('check constraint')) return 'Algum dado está fora do padrão. Confira o formulário.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sem conexão. Tente de novo.'
  return error?.message || 'Não deu certo. Tente de novo.'
}
