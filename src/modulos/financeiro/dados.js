// ────────────────────────────────────────────────────────────────
//  Financeiro — leitura e gravação (tabela lancamentos + funções)
//  Carrega todos os lançamentos do negócio: o saldo de um mês depende
//  de todos os meses anteriores (saldo encadeado).
// ────────────────────────────────────────────────────────────────

import { supabase } from '../../supabase.js'

let _estudioId = null
let _lancamentos = null

export const lancamentosCarregados = () => _lancamentos || []

// Sempre relê do banco: fechar lead, marcar tarifa etc. mudam lançamentos por fora.
export async function carregarLancamentos(estudioId) {
  const { data, error } = await supabase
    .from('lancamentos')
    .select('*')
    .eq('estudio_id', estudioId)
    .order('created_at')
  if (error) return { lancamentos: null, error }
  _estudioId = estudioId
  _lancamentos = data
  return { lancamentos: data, error: null }
}

const recarregar = () => carregarLancamentos(_estudioId)

export async function salvarLancamento(l) {
  const { id, created_at, estudio_id, ...campos } = l
  const { error } = id
    ? await supabase.from('lancamentos').update(campos).eq('id', id)
    : await supabase.from('lancamentos').insert({ ...campos, estudio_id: _estudioId })
  if (error) return { error }
  return recarregar() // o banco pode ter criado/removido a tarifa de cartão
}

export async function marcarPago(id, pagoEm) {
  const { error } = await supabase.from('lancamentos').update({ status: 'pago', pago_em: pagoEm }).eq('id', id)
  if (error) return { error }
  return recarregar()
}

export async function apagarLancamento(id) {
  const { error } = await supabase.from('lancamentos').delete().eq('id', id)
  if (error) return { error }
  return recarregar()
}

export async function lancarCustosFixos(mesISO) {
  const { data, error } = await supabase.rpc('lancar_custos_fixos', {
    p_estudio_id: _estudioId,
    p_mes: `${mesISO}-01`,
  })
  if (error) return { criados: 0, error }
  await recarregar()
  return { criados: data, error: null }
}

export function mensagemDeErro(error) {
  const m = (error?.message || '').toLowerCase()
  if (m.includes('check constraint')) return 'Algum valor está fora do permitido. Confira o formulário.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sem conexão. Tente de novo.'
  return error?.message || 'Não deu certo. Tente de novo.'
}
