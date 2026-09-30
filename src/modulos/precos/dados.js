// ────────────────────────────────────────────────────────────────
//  Preços — leitura e gravação no banco (Supabase)
//  Tabelas: config_negocio, custos_fixos, equipamentos, servicos.
//  Tudo fica num cache em memória enquanto a pessoa usa a tela.
// ────────────────────────────────────────────────────────────────

import { supabase } from '../../supabase.js'

let _estudioId = null
let _dados = null // { config, custos, equipamentos, servicos }

export const dadosPrecos = () => _dados

// Carrega tudo (e cria o padrão no primeiro acesso). Usa o cache se já carregou.
export async function carregarPrecos(estudioId, { recarregar = false } = {}) {
  if (_dados && _estudioId === estudioId && !recarregar) return { dados: _dados, error: null }

  const { error: errIni } = await supabase.rpc('iniciar_precos', { p_estudio_id: estudioId })
  if (errIni) return { dados: null, error: errIni }

  const [cfg, custos, equip, serv] = await Promise.all([
    supabase.from('config_negocio').select('*').eq('estudio_id', estudioId).single(),
    supabase.from('custos_fixos').select('*').eq('estudio_id', estudioId).order('created_at'),
    supabase.from('equipamentos').select('*').eq('estudio_id', estudioId).order('created_at'),
    supabase
      .from('servicos')
      .select('*')
      .eq('estudio_id', estudioId)
      .eq('ativo', true)
      .order('created_at'),
  ])
  const error = cfg.error || custos.error || equip.error || serv.error
  if (error) return { dados: null, error }

  _estudioId = estudioId
  _dados = {
    config: normalizarConfig(cfg.data),
    custos: custos.data,
    equipamentos: equip.data,
    servicos: serv.data.map(normalizarServico),
  }
  return { dados: _dados, error: null }
}

// O banco devolve numeric como texto: vira número aqui.
const num = (v) => (v == null ? v : Number(v))
function normalizarConfig(c) {
  return {
    ...c,
    imposto_pct: num(c.imposto_pct),
    comissao_pct: num(c.comissao_pct),
    taxa_pct: num(c.taxa_pct),
    margem_pct: num(c.margem_pct),
    horas_dia: num(c.horas_dia),
  }
}
function normalizarServico(s) {
  return {
    ...s,
    margem_pct: num(s.margem_pct),
    comissao_pct: num(s.comissao_pct),
    imposto_pct: num(s.imposto_pct),
    taxa_pct: num(s.taxa_pct),
  }
}

// ---- Dados gerais ----
export async function salvarConfig(patch) {
  const { data, error } = await supabase
    .from('config_negocio')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('estudio_id', _estudioId)
    .select()
    .single()
  if (!error) _dados.config = normalizarConfig(data)
  return { error }
}

// ---- Listas simples (custos fixos, equipamentos) ----
const TABELA = { custos: 'custos_fixos', equipamentos: 'equipamentos' }

export async function adicionarLinha(lista, valores) {
  const { data, error } = await supabase
    .from(TABELA[lista])
    .insert({ ...valores, estudio_id: _estudioId })
    .select()
    .single()
  if (!error) _dados[lista].push(data)
  return { linha: data, error }
}

export async function atualizarLinha(lista, id, patch) {
  const { data, error } = await supabase.from(TABELA[lista]).update(patch).eq('id', id).select().single()
  if (!error) _dados[lista] = _dados[lista].map((l) => (l.id === id ? data : l))
  return { error }
}

export async function removerLinha(lista, id) {
  const { error } = await supabase.from(TABELA[lista]).delete().eq('id', id)
  if (!error) _dados[lista] = _dados[lista].filter((l) => l.id !== id)
  return { error }
}

// ---- Pacotes e campanhas ----
export async function salvarServico(servico) {
  const { id, created_at, estudio_id, ...campos } = servico
  const resp = id
    ? await supabase.from('servicos').update(campos).eq('id', id).select().single()
    : await supabase
        .from('servicos')
        .insert({ ...campos, estudio_id: _estudioId })
        .select()
        .single()
  if (resp.error) return { servico: null, error: resp.error }

  const salvo = normalizarServico(resp.data)
  _dados.servicos = id
    ? _dados.servicos.map((s) => (s.id === id ? salvo : s))
    : [..._dados.servicos, salvo]
  return { servico: salvo, error: null }
}

// Arquiva (não apaga): leads e lançamentos futuros podem apontar pra ele.
export async function arquivarServico(id) {
  const { error } = await supabase.from('servicos').update({ ativo: false }).eq('id', id)
  if (!error) _dados.servicos = _dados.servicos.filter((s) => s.id !== id)
  return { error }
}

// Traduz os erros mais comuns do banco pra português simples.
export function mensagemDeErro(error) {
  const m = (error?.message || '').toLowerCase()
  if (m.includes('check constraint')) return 'Algum valor está fora do permitido. Confira os números.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sem conexão. Tente de novo.'
  return error?.message || 'Não deu certo. Tente de novo.'
}
