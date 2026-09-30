// ────────────────────────────────────────────────────────────────
//  Regras do CRM — funções puras (testadas em regras.test.js)
// ────────────────────────────────────────────────────────────────

import { precoDoServico, arredondarCentavos } from '../../calculos.js'

export const ETAPAS = [
  { id: 'novo', rotulo: 'Novo', curto: 'Novo' },
  { id: 'contato', rotulo: 'Contato iniciado', curto: 'Contato' },
  { id: 'proposta', rotulo: 'Proposta enviada', curto: 'Proposta' },
  { id: 'negociacao', rotulo: 'Negociação', curto: 'Negociação' },
  { id: 'fechado', rotulo: 'Fechado', curto: 'Fechados' },
  { id: 'perdido', rotulo: 'Perdido', curto: 'Perdidos' },
]
export const ETAPAS_ABERTAS = ['novo', 'contato', 'proposta', 'negociacao']
export const rotuloEtapa = (id) => ETAPAS.find((e) => e.id === id)?.rotulo || id

// Próxima etapa do funil (negociação -> fechado passa pelo formulário de fechamento).
export function proximaEtapa(etapa) {
  const i = ETAPAS_ABERTAS.indexOf(etapa)
  if (i < 0) return null
  return i < ETAPAS_ABERTAS.length - 1 ? ETAPAS_ABERTAS[i + 1] : 'fechado'
}

export const ORIGENS = [
  ['instagram', 'Instagram'],
  ['indicacao', 'Indicação'],
  ['site', 'Site'],
  ['whatsapp', 'WhatsApp'],
  ['outro', 'Outro'],
]
export const rotuloOrigem = (id) => ORIGENS.find(([v]) => v === id)?.[1] || id

export const MOTIVOS_PERDA = [
  ['preco', 'Preço'],
  ['data', 'Data indisponível'],
  ['sumiu', 'Parou de responder'],
  ['concorrente', 'Escolheu outro fotógrafo'],
  ['outro', 'Outro'],
]
// motivo_perda guarda a chave, ou "outro: texto livre"
export function rotuloMotivo(motivo) {
  if (!motivo) return ''
  if (motivo.startsWith('outro:')) return motivo.slice(6).trim() || 'Outro'
  return MOTIVOS_PERDA.find(([v]) => v === motivo)?.[1] || motivo
}

// "(11) 99999-8888" / "+55 11 99999-8888" / "011999998888" -> "5511999998888"
// Devolve null se não parecer um celular/telefone brasileiro.
export function normalizarWhatsApp(texto) {
  let d = String(texto ?? '').replace(/\D/g, '').replace(/^0+/, '')
  if (d.length === 10 || d.length === 11) d = '55' + d
  return /^55\d{10,11}$/.test(d) ? d : null
}

// "5511999998888" -> "(11) 99999-8888"
export function formatarWhatsApp(numero) {
  const d = String(numero ?? '').replace(/^55/, '')
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return numero || ''
}

export function linkWhatsApp(numero, nomeLead, nomeNegocio) {
  const primeiro = String(nomeLead || '').trim().split(/\s+/)[0] || ''
  const texto = `Oi${primeiro ? ', ' + primeiro : ''}! Aqui é ${nomeNegocio}, tudo bem?`
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
}

// "@ana.foto" / "instagram.com/ana.foto/" -> "ana.foto"
export function normalizarInstagram(texto) {
  const s = String(texto ?? '').trim()
  if (!s) return null
  const m = s.match(/instagram\.com\/([^/?#\s]+)/i)
  return (m ? m[1] : s).replace(/^@/, '').trim() || null
}

// Follow-up: 'atrasado' | 'hoje' | 'futuro' | null (datas 'AAAA-MM-DD')
export function situacaoFollowup(dataISO, hojeISO) {
  if (!dataISO) return null
  if (dataISO < hojeISO) return 'atrasado'
  if (dataISO === hojeISO) return 'hoje'
  return 'futuro'
}

// Fechar abaixo do mínimo do pacote? (null se não dá pra saber)
export function checarMinimo(valorFechadoCentavos, servico, baseRateio) {
  if (!servico || !(valorFechadoCentavos > 0)) return null
  const r = precoDoServico(servico, baseRateio)
  if (!r.ok) return null
  const minimo = arredondarCentavos(r.precoMinimo)
  return {
    minimo,
    abaixo: valorFechadoCentavos < minimo,
    diferenca: Math.max(0, minimo - valorFechadoCentavos),
  }
}
