// ────────────────────────────────────────────────────────────────
//  Regras de "depois que já reservou" (Fase 3)
//  Quantas horas faltam para a sessão, se ainda dá pra remarcar
//  e quanto o estúdio retém quando o cancelamento é em cima da hora.
// ────────────────────────────────────────────────────────────────

const HORA_MS = 60 * 60 * 1000

// Prazos, em horas antes do começo da sessão.
export const PRAZO_REMARCAR = 48 // depois disso, não dá mais pra remarcar
export const PRAZO_CANCELAR_GRATIS = 72 // dentro disso, cancelamento sem taxa
export const TAXA_CANCELAMENTO = 0.5 // 50% retido depois do prazo

// Momento em que a sessão começa (data + hora de início).
export function inicioDaSessao(reserva) {
  return new Date(`${reserva.data}T${reserva.horaInicio}:00`)
}

// Horas de agora até o começo da sessão. Pode ser negativo (já passou).
export function horasAteSessao(reserva, agora = Date.now()) {
  return (inicioDaSessao(reserva).getTime() - agora) / HORA_MS
}

// Só dá pra remarcar uma reserva confirmada e com mais de 48h de folga.
export function podeRemarcar(reserva, agora = Date.now()) {
  return reserva.status === 'confirmada' && horasAteSessao(reserva, agora) >= PRAZO_REMARCAR
}

// Cancelamento: é grátis? quanto o estúdio retém? quanto volta pro cliente?
export function calculoCancelamento(reserva, agora = Date.now()) {
  const horas = horasAteSessao(reserva, agora)
  const gratis = horas >= PRAZO_CANCELAR_GRATIS
  const total = reserva.valorTotal
  const valorRetido = gratis ? 0 : Math.round(total * TAXA_CANCELAMENTO)

  return {
    horas, // pode ser negativo se a sessão já começou
    gratis,
    taxaPercent: gratis ? 0 : Math.round(TAXA_CANCELAMENTO * 100),
    valorRetido,
    valorDevolvido: total - valorRetido,
  }
}
