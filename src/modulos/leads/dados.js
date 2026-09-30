// ────────────────────────────────────────────────────────────────
//  Leads — leitura e gravação no banco (tabelas leads e lead_eventos)
//  O histórico de "criado" e de mudança de etapa é gravado pelo banco
//  (trigger); aqui só gravamos notas e follow-ups feitos.
// ────────────────────────────────────────────────────────────────

import { supabase } from '../../supabase.js'

let _estudioId = null
let _leads = null

export const leadsCarregados = () => _leads || []
export const acharLead = (id) => (_leads || []).find((l) => l.id === id) || null

export async function carregarLeads(estudioId, { recarregar = false } = {}) {
  if (_leads && _estudioId === estudioId && !recarregar) return { leads: _leads, error: null }
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('estudio_id', estudioId)
    .order('created_at', { ascending: false })
  if (error) return { leads: null, error }
  _estudioId = estudioId
  _leads = data
  return { leads: _leads, error: null }
}

function trocarNoCache(lead) {
  const i = _leads.findIndex((l) => l.id === lead.id)
  if (i >= 0) _leads[i] = lead
  else _leads.unshift(lead)
}

export async function criarLead(campos) {
  const { data, error } = await supabase
    .from('leads')
    .insert({ ...campos, estudio_id: _estudioId })
    .select()
    .single()
  if (!error) trocarNoCache(data)
  return { lead: data, error }
}

export async function atualizarLead(id, patch) {
  const { data, error } = await supabase.from('leads').update(patch).eq('id', id).select().single()
  if (!error) trocarNoCache(data)
  return { lead: data, error }
}

export async function apagarLead(id) {
  const { error } = await supabase.from('leads').delete().eq('id', id)
  if (!error) _leads = _leads.filter((l) => l.id !== id)
  return { error }
}

// ---- Histórico ----
export async function carregarEventos(leadId) {
  const { data, error } = await supabase
    .from('lead_eventos')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })
  return { eventos: data || [], error }
}

export async function registrarEvento(leadId, tipo, texto = '', dados = {}) {
  const { error } = await supabase
    .from('lead_eventos')
    .insert({ estudio_id: _estudioId, lead_id: leadId, tipo, texto, dados })
  return { error }
}

// Follow-up feito: registra no histórico e marca a próxima data (ou nenhuma).
export async function concluirFollowup(lead, proximaData) {
  const { error } = await registrarEvento(lead.id, 'followup', '', { data: lead.proximo_followup })
  if (error) return { error }
  return atualizarLead(lead.id, { proximo_followup: proximaData || null })
}

export function mensagemDeErro(error) {
  const m = (error?.message || '').toLowerCase()
  if (m.includes('whatsapp')) return 'Confira o WhatsApp (DDD + número).'
  if (m.includes('check constraint')) return 'Algum dado está fora do permitido. Confira o formulário.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sem conexão. Tente de novo.'
  return error?.message || 'Não deu certo. Tente de novo.'
}
