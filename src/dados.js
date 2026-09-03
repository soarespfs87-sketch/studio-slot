// ────────────────────────────────────────────────────────────────
//  Acesso aos dados do app
//
//  Dois modos:
//   • 'local' — navegador (localStorage). É o modo demo / sem estúdio.
//   • 'banco' — Supabase. Liga quando um DONO logado abre o estúdio dele.
//
//  Config, salas e extras já usam o banco (Etapa 6.4c).
//  Reservas e fotógrafo ainda são locais (entram na Etapa 6.4d).
// ────────────────────────────────────────────────────────────────

import { read, write, novoId } from './db.js'
import { estudioConfig as configPadrao } from '../estudio.config.js'
import { supabase } from './supabase.js'

export { novoId }

let _modo = 'local'
let _estudioId = null
let _cache = { config: null, salas: [], extras: [], bloqueios: [] }
let _reservas = [] // reservas da pessoa logada (modo banco)
let _perfil = { nome: '', telefone: '', email: '' }

export const estaNoBanco = () => _modo === 'banco'
export const getEstudioId = () => _estudioId

const _uid = async () => (await supabase.auth.getSession()).data.session?.user?.id || null

// Carrega um estúdio (config + salas + extras) para a memória e liga o modo banco.
export async function carregarEstudio(estudio) {
  const [{ data: salas }, { data: extras }, { data: bloqueios }] = await Promise.all([
    supabase.from('salas').select('*').eq('estudio_id', estudio.id).order('created_at'),
    supabase.from('extras').select('*').eq('estudio_id', estudio.id).order('created_at'),
    supabase.from('bloqueios').select('*').eq('estudio_id', estudio.id).order('created_at'),
  ])
  _estudioId = estudio.id
  _cache = {
    config: estudioParaConfig(estudio),
    salas: (salas || []).map(salaDoBanco),
    extras: (extras || []).map(extraDoBanco),
    bloqueios: (bloqueios || []).map(bloqueioDoBanco),
  }
  _modo = 'banco'
}

// Acha um estúdio pelo endereço (slug). RLS só devolve se estiver ativo (ou seu).
export async function buscarEstudioPorSlug(slug) {
  const { data, error } = await supabase
    .from('estudios')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  return { estudio: data, error }
}

// Lista os estúdios ativos (para o fotógrafo escolher onde reservar).
export async function listarEstudiosAtivos() {
  const { data, error } = await supabase
    .from('estudios')
    .select('id, nome, slug')
    .eq('plano_ativo', true)
    .order('nome')
  return { estudios: data || [], error }
}

// Carrega o perfil (nome/telefone) + e-mail da pessoa logada.
export async function carregarPerfil() {
  const s = (await supabase.auth.getSession()).data.session
  if (!s) return
  const { data } = await supabase
    .from('perfis')
    .select('nome, telefone')
    .eq('id', s.user.id)
    .maybeSingle()
  _perfil = { nome: data?.nome || '', telefone: data?.telefone || '', email: s.user.email || '' }
}

// Carrega as reservas da pessoa logada (as "minhas").
export async function carregarMinhasReservas() {
  const uid = await _uid()
  if (!uid) return
  const { data } = await supabase
    .from('reservas')
    .select('*')
    .eq('fotografo_id', uid)
    .order('data')
  _reservas = (data || []).map(reservaDoBanco)
}

// ── Mapeadores banco <-> app ────────────────────────────────────
function estudioParaConfig(e) {
  return {
    slug: e.slug,
    nome: e.nome,
    descricao: e.descricao || '',
    regrasGerais: e.regras_gerais || '',
    politicaCancelamento: e.politica_cancelamento || '',
    contato: e.contato || { telefone: '', endereco: '' },
    horarioFuncionamento: e.horario_funcionamento || { abre: '08:00', fecha: '20:00' },
    feriados: e.feriados || [],
    tema: e.tema || configPadrao.tema,
    logo: e.logo || null,
    logoComNome: !!e.logo_com_nome,
    icone: e.icone || null,
    chavePix: e.chave_pix || '',
  }
}

function configParaEstudio(c) {
  const m = {}
  const par = {
    nome: 'nome',
    descricao: 'descricao',
    regrasGerais: 'regras_gerais',
    politicaCancelamento: 'politica_cancelamento',
    contato: 'contato',
    horarioFuncionamento: 'horario_funcionamento',
    feriados: 'feriados',
    tema: 'tema',
    logo: 'logo',
    logoComNome: 'logo_com_nome',
    icone: 'icone',
    chavePix: 'chave_pix',
  }
  for (const [appKey, dbKey] of Object.entries(par)) {
    if (appKey in c) m[dbKey] = c[appKey]
  }
  return m
}

function salaDoBanco(s) {
  return {
    id: s.id,
    nome: s.nome,
    descricao: s.descricao || '',
    tipo: s.tipo,
    fotos: s.fotos || [],
    corFoto: s.cor_foto,
    capacidadeMax: s.capacidade_max,
    metragem: s.metragem,
    equipamento: s.equipamento || [],
    ativa: s.ativa,
    slotMinutos: s.slot_minutos,
    precos: s.precos,
    bufferAntes: s.buffer_antes,
    bufferDepois: s.buffer_depois,
    disponivelDe: s.disponivel_de,
    disponivelAte: s.disponivel_ate,
  }
}

function salaParaBanco(s) {
  return {
    estudio_id: _estudioId,
    nome: s.nome,
    descricao: s.descricao || '',
    tipo: s.tipo,
    fotos: s.fotos || [],
    cor_foto: s.corFoto,
    capacidade_max: s.capacidadeMax,
    metragem: s.metragem,
    equipamento: s.equipamento || [],
    ativa: s.ativa,
    slot_minutos: s.slotMinutos,
    precos: s.precos,
    buffer_antes: s.bufferAntes,
    buffer_depois: s.bufferDepois,
    disponivel_de: s.disponivelDe || null,
    disponivel_ate: s.disponivelAte || null,
  }
}

const extraDoBanco = (e) => ({ id: e.id, nome: e.nome, valor: Number(e.valor), salas: e.salas || [] })

const bloqueioDoBanco = (b) => ({
  id: b.id,
  salaId: b.sala_id,
  tipo: b.tipo,
  data: b.data,
  horaInicio: b.hora_inicio,
  horaFim: b.hora_fim,
  motivo: b.motivo || '',
})
const bloqueioParaBanco = (b) => ({
  estudio_id: _estudioId,
  sala_id: b.salaId || null,
  tipo: b.tipo,
  data: b.tipo === 'data' ? b.data || null : null,
  hora_inicio: b.horaInicio || '00:00',
  hora_fim: b.horaFim || '23:59',
  motivo: b.motivo || '',
})

const _ms = (iso) => (iso ? Date.parse(iso) : null)
const _iso = (ms) => (ms == null ? null : new Date(ms).toISOString())
const _num = (v) => (v == null ? null : Number(v))

function reservaDoBanco(r) {
  return {
    id: r.id,
    salaId: r.sala_id,
    estudioId: r.estudio_id,
    data: r.data,
    horaInicio: r.hora_inicio,
    horaFim: r.hora_fim,
    status: r.status,
    criadaEm: _ms(r.created_at),
    travaExpiraEm: _ms(r.trava_expira_em),
    valorSala: Number(r.valor_sala),
    valorExtras: Number(r.valor_extras),
    valorTotal: Number(r.valor_total),
    extras: r.extras || [],
    formaPagamento: r.forma_pagamento,
    pagoEm: _ms(r.pago_em),
    aceiteTermoEm: _ms(r.aceite_termo_em),
    canceladaEm: _ms(r.cancelada_em),
    valorRetido: _num(r.valor_retido),
    valorDevolvido: _num(r.valor_devolvido),
    remarcadaEm: _ms(r.remarcada_em),
    remarcacoes: r.remarcacoes || [],
    fotografoNome: r.fotografo_nome || '',
  }
}

// Converte um patch em formato-app para colunas do banco.
function reservaParaBanco(p) {
  const m = {}
  const ts = {
    travaExpiraEm: 'trava_expira_em',
    pagoEm: 'pago_em',
    aceiteTermoEm: 'aceite_termo_em',
    canceladaEm: 'cancelada_em',
    remarcadaEm: 'remarcada_em',
  }
  const plain = {
    salaId: 'sala_id',
    data: 'data',
    horaInicio: 'hora_inicio',
    horaFim: 'hora_fim',
    status: 'status',
    valorSala: 'valor_sala',
    valorExtras: 'valor_extras',
    valorTotal: 'valor_total',
    extras: 'extras',
    formaPagamento: 'forma_pagamento',
    valorRetido: 'valor_retido',
    valorDevolvido: 'valor_devolvido',
    remarcacoes: 'remarcacoes',
    fotografoNome: 'fotografo_nome',
  }
  for (const [k, v] of Object.entries(p)) {
    if (k in ts) m[ts[k]] = _iso(v)
    else if (k in plain) m[plain[k]] = v
  }
  return m
}
const ehIdNovo = (id) => !id || /^(sala|extra|bloq)_/.test(String(id))

// ── Config do estúdio ──────────────────────────────────────────
function mesclar(base, over) {
  const r = { ...base }
  for (const chave of Object.keys(over || {})) {
    const v = over[chave]
    r[chave] =
      v && typeof v === 'object' && !Array.isArray(v) ? { ...(base[chave] || {}), ...v } : v
  }
  return r
}

export const getConfig = () =>
  _modo === 'banco' ? _cache.config : mesclar(configPadrao, read('config', {}))

export async function setConfig(patch) {
  if (_modo === 'banco') {
    const { data, error } = await supabase
      .from('estudios')
      .update(configParaEstudio(patch))
      .eq('id', _estudioId)
      .select()
      .single()
    if (!error && data) _cache.config = estudioParaConfig(data)
    return { error }
  }
  write('config', mesclar(read('config', {}), patch))
  return { error: null }
}

// ── Salas ─────────────────────────────────────────────────────
export const getSalas = () => (_modo === 'banco' ? _cache.salas : read('salas', []))
export const getSalasAtivas = () => getSalas().filter((s) => s.ativa)
export const getSala = (id) => getSalas().find((s) => s.id === id) || null

export async function salvarSala(sala) {
  if (_modo === 'banco') {
    const payload = salaParaBanco(sala)
    const resp = ehIdNovo(sala.id)
      ? await supabase.from('salas').insert(payload).select().single()
      : await supabase.from('salas').update(payload).eq('id', sala.id).select().single()
    if (resp.error) return { error: resp.error }
    const nova = salaDoBanco(resp.data)
    const i = _cache.salas.findIndex((s) => s.id === nova.id)
    if (i >= 0) _cache.salas[i] = nova
    else _cache.salas.push(nova)
    return { error: null }
  }
  const todas = read('salas', [])
  const i = todas.findIndex((s) => s.id === sala.id)
  if (i >= 0) todas[i] = sala
  else todas.push(sala)
  write('salas', todas)
  return { error: null }
}

export async function removerSala(id) {
  if (_modo === 'banco') {
    const { error } = await supabase.from('salas').delete().eq('id', id)
    if (!error) _cache.salas = _cache.salas.filter((s) => s.id !== id)
    return { error }
  }
  write(
    'salas',
    read('salas', []).filter((s) => s.id !== id),
  )
  return { error: null }
}

// Uma sala pode ser excluída se não tem reserva ativa apontando pra ela.
export const salaTemReservaAtiva = (id) =>
  getReservas().some((r) => r.salaId === id && r.status !== 'cancelada')

// ── Extras ────────────────────────────────────────────────────
export const getExtras = () => (_modo === 'banco' ? _cache.extras : read('extras', []))
export const getExtrasDaSala = (salaId) => getExtras().filter((e) => e.salas.includes(salaId))

export async function salvarExtra(extra) {
  if (_modo === 'banco') {
    const payload = {
      estudio_id: _estudioId,
      nome: extra.nome,
      valor: extra.valor,
      salas: extra.salas || [],
    }
    const resp = ehIdNovo(extra.id)
      ? await supabase.from('extras').insert(payload).select().single()
      : await supabase.from('extras').update(payload).eq('id', extra.id).select().single()
    if (resp.error) return { error: resp.error }
    const novo = extraDoBanco(resp.data)
    const i = _cache.extras.findIndex((e) => e.id === novo.id)
    if (i >= 0) _cache.extras[i] = novo
    else _cache.extras.push(novo)
    return { error: null }
  }
  const todos = read('extras', [])
  const i = todos.findIndex((e) => e.id === extra.id)
  if (i >= 0) todos[i] = extra
  else todos.push(extra)
  write('extras', todos)
  return { error: null }
}

export async function removerExtra(id) {
  if (_modo === 'banco') {
    const { error } = await supabase.from('extras').delete().eq('id', id)
    if (!error) _cache.extras = _cache.extras.filter((e) => e.id !== id)
    return { error }
  }
  write(
    'extras',
    read('extras', []).filter((e) => e.id !== id),
  )
  return { error: null }
}

// ── Bloqueios de agenda (almoço, feriado, manutenção...) ──────
export const getBloqueios = () => (_modo === 'banco' ? _cache.bloqueios : [])

export async function salvarBloqueio(bloqueio) {
  if (_modo !== 'banco') return { error: { message: 'Disponível só com o estúdio no banco.' } }
  const payload = bloqueioParaBanco(bloqueio)
  const resp = ehIdNovo(bloqueio.id)
    ? await supabase.from('bloqueios').insert(payload).select().single()
    : await supabase.from('bloqueios').update(payload).eq('id', bloqueio.id).select().single()
  if (resp.error) return { error: resp.error }
  const novo = bloqueioDoBanco(resp.data)
  const i = _cache.bloqueios.findIndex((b) => b.id === novo.id)
  if (i >= 0) _cache.bloqueios[i] = novo
  else _cache.bloqueios.push(novo)
  return { error: null }
}

export async function removerBloqueio(id) {
  if (_modo !== 'banco') return { error: null }
  const { error } = await supabase.from('bloqueios').delete().eq('id', id)
  if (!error) _cache.bloqueios = _cache.bloqueios.filter((b) => b.id !== id)
  return { error }
}

// ════════════════════════════════════════════════════════════════
//  Reservas — banco (fotógrafo logado) ou navegador (demo)
// ════════════════════════════════════════════════════════════════
export const getReservas = () => (_modo === 'banco' ? _reservas : read('reservas', []))
export const getReserva = (id) => getReservas().find((r) => r.id === id) || null

export async function addReserva(reserva) {
  if (_modo === 'banco') {
    const uid = await _uid()
    const payload = {
      ...reservaParaBanco(reserva),
      estudio_id: _estudioId,
      fotografo_id: uid,
      fotografo_nome: reserva.fotografoNome || _perfil.nome || '',
    }
    const { data, error } = await supabase.from('reservas').insert(payload).select().single()
    if (error) return { id: null, error }
    const nova = reservaDoBanco(data)
    _reservas.push(nova)
    return { id: nova.id, error: null }
  }
  const todas = read('reservas', [])
  todas.push(reserva)
  write('reservas', todas)
  return { id: reserva.id, error: null }
}

export async function updateReserva(id, patch) {
  if (_modo === 'banco') {
    const { data, error } = await supabase
      .from('reservas')
      .update(reservaParaBanco(patch))
      .eq('id', id)
      .select()
      .single()
    if (!error && data) {
      const i = _reservas.findIndex((r) => r.id === id)
      if (i >= 0) _reservas[i] = reservaDoBanco(data)
    }
    return { error }
  }
  write(
    'reservas',
    read('reservas', []).map((r) => (r.id === id ? { ...r, ...patch } : r)),
  )
  return { error: null }
}

export async function removeReserva(id) {
  if (_modo === 'banco') {
    const { error } = await supabase.from('reservas').delete().eq('id', id)
    if (!error) _reservas = _reservas.filter((r) => r.id !== id)
    return { error }
  }
  write(
    'reservas',
    read('reservas', []).filter((r) => r.id !== id),
  )
  return { error: null }
}

export function reservaSeguraOHorario(r, agora = Date.now()) {
  return (
    r.status === 'confirmada' ||
    r.status === 'aguardando_pagamento' ||
    (r.status === 'travada' && r.travaExpiraEm > agora)
  )
}

// No modo banco, a portinha 'horarios_ocupados' já ignora trava vencida.
export function limparTravasExpiradas() {
  if (_modo === 'banco') return
  const agora = Date.now()
  const antes = read('reservas', [])
  const depois = antes.filter((r) => !(r.status === 'travada' && r.travaExpiraEm <= agora))
  if (depois.length !== antes.length) write('reservas', depois)
}

// Horários ocupados de uma sala num dia — no banco vem da portinha
// (só início/fim, sem revelar quem reservou).
export async function ocupacaoDaAgenda(salaId, dataISO) {
  if (_modo === 'banco') {
    const { data } = await supabase.rpc('horarios_ocupados', {
      p_sala_id: salaId,
      p_data: dataISO,
    })
    return (data || []).map((h) => ({
      salaId,
      data: dataISO,
      horaInicio: h.hora_inicio,
      horaFim: h.hora_fim,
      status: 'confirmada',
    }))
  }
  return read('reservas', [])
}

export async function addPagamento(pagamento) {
  if (_modo === 'banco') return // no banco, o pagamento fica na própria reserva
  const todos = read('pagamentos', [])
  todos.push(pagamento)
  write('pagamentos', todos)
}

// ── Fotógrafo (os "seus dados") ────────────────────────────────
export const getFotografo = () =>
  _modo === 'banco' ? { ..._perfil } : read('fotografo', null)

export async function setFotografo(dados) {
  if (_modo === 'banco') {
    const uid = await _uid()
    const { error } = await supabase
      .from('perfis')
      .update({ nome: dados.nome, telefone: dados.telefone })
      .eq('id', uid)
    if (!error) _perfil = { ..._perfil, nome: dados.nome, telefone: dados.telefone }
    return { error }
  }
  write('fotografo', dados)
  return { error: null }
}

export const getMinhasReservas = () =>
  getReservas().filter((r) =>
    ['confirmada', 'aguardando_pagamento', 'cancelada'].includes(r.status),
  )

export async function cancelarReserva(id, calculo) {
  return updateReserva(id, {
    status: 'cancelada',
    canceladaEm: Date.now(),
    valorRetido: calculo.valorRetido,
    valorDevolvido: calculo.valorDevolvido,
  })
}

// ── Pagamento Pix confirmado pelo dono ─────────────────────────
// Todas as reservas do estúdio (de qualquer fotógrafo) que estão
// esperando o dono confirmar que o Pix caiu na conta.
export async function listarPagamentosPendentes() {
  if (_modo !== 'banco' || !_estudioId) return []
  const { data } = await supabase
    .from('reservas')
    .select('*')
    .eq('estudio_id', _estudioId)
    .eq('status', 'aguardando_pagamento')
    .order('data')
  return (data || []).map(reservaDoBanco)
}

export async function confirmarPagamento(id) {
  return updateReserva(id, { status: 'confirmada', pagoEm: Date.now() })
}

export async function remarcarReserva(id, { data, horaInicio, horaFim, valorSala, valorTotal }) {
  const atual = getReserva(id)
  const historico = atual.remarcacoes || []
  historico.push({
    de: { data: atual.data, horaInicio: atual.horaInicio, horaFim: atual.horaFim },
    em: Date.now(),
  })
  return updateReserva(id, {
    data,
    horaInicio,
    horaFim,
    valorSala,
    valorTotal,
    remarcadaEm: Date.now(),
    remarcacoes: historico,
  })
}
