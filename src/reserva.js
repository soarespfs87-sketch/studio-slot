// ────────────────────────────────────────────────────────────────
//  Regras de "depois que já reservou" (Fase 3)
//  Quantas horas faltam para a sessão, se ainda dá pra remarcar
//  e quanto o estúdio retém quando o cancelamento é em cima da hora.
//
//  Os prazos e a taxa saem da config do estúdio (o dono edita no
//  Painel → Identidade). Os valores abaixo são só o ponto de partida.
// ────────────────────────────────────────────────────────────────

import { getConfig } from './dados.js'

const HORA_MS = 60 * 60 * 1000

// Padrões, usados quando o estúdio ainda não mexeu nas regras.
export const REGRAS_RESERVA_PADRAO = {
  prazoRemarcar: 48, // horas antes: depois disso, não dá mais pra remarcar
  prazoCancelarGratis: 72, // horas antes: dentro disso, cancelamento sem taxa
  taxaCancelamento: 50, // % retido depois do prazo grátis
}

// Regras do estúdio atual, já com os padrões preenchendo o que faltar.
export function regrasReserva() {
  const r = getConfig().regrasReserva || {}
  const num = (v, padrao) => {
    const n = Number(v)
    return Number.isFinite(n) && n >= 0 ? n : padrao
  }
  return {
    prazoRemarcar: num(r.prazoRemarcar, REGRAS_RESERVA_PADRAO.prazoRemarcar),
    prazoCancelarGratis: num(r.prazoCancelarGratis, REGRAS_RESERVA_PADRAO.prazoCancelarGratis),
    taxaCancelamento: num(r.taxaCancelamento, REGRAS_RESERVA_PADRAO.taxaCancelamento),
  }
}

// Momento em que a sessão começa (data + hora de início).
export function inicioDaSessao(reserva) {
  return new Date(`${reserva.data}T${reserva.horaInicio}:00`)
}

// Horas de agora até o começo da sessão. Pode ser negativo (já passou).
export function horasAteSessao(reserva, agora = Date.now()) {
  return (inicioDaSessao(reserva).getTime() - agora) / HORA_MS
}

// Só dá pra remarcar uma reserva confirmada e com folga suficiente.
export function podeRemarcar(reserva, agora = Date.now()) {
  return (
    reserva.status === 'confirmada' &&
    horasAteSessao(reserva, agora) >= regrasReserva().prazoRemarcar
  )
}

// Cancelamento: é grátis? quanto o estúdio retém? quanto volta pro cliente?
export function calculoCancelamento(reserva, agora = Date.now()) {
  const { prazoCancelarGratis, taxaCancelamento } = regrasReserva()
  const horas = horasAteSessao(reserva, agora)
  const gratis = horas >= prazoCancelarGratis
  const total = reserva.valorTotal
  const valorRetido = gratis ? 0 : Math.round((total * taxaCancelamento) / 100)

  return {
    horas, // pode ser negativo se a sessão já começou
    gratis,
    prazoGratis: prazoCancelarGratis,
    taxaPercent: gratis ? 0 : taxaCancelamento,
    valorRetido,
    valorDevolvido: total - valorRetido,
  }
}
