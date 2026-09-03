// ────────────────────────────────────────────────────────────────
//  Montagem da agenda de uma sala
//  Preço em faixas (dia útil / fim de semana / feriado) e a lista
//  de horários do dia.
//  Cenário sazonal: só reserva dentro da janela de temporada.
//  Buffer: a sala guarda um tempo antes/depois de cada sessão para
//  montagem e desmontagem — horários colados numa reserva viram "preparo".
// ────────────────────────────────────────────────────────────────

import { ehFimDeSemana, hhmmParaMin, minParaHHMM, hojeISO } from './format.js'
import { reservaSeguraOHorario, getConfig } from './dados.js'

export const NOME_FAIXA = {
  diaUtil: 'Dia útil',
  fimDeSemana: 'Fim de semana',
  feriado: 'Feriado',
}

// Qual faixa vale numa data: feriado > fim de semana > dia útil.
export function faixaDoDia(dataISO, feriados = []) {
  if (feriados.includes(dataISO)) return 'feriado'
  return ehFimDeSemana(dataISO) ? 'fimDeSemana' : 'diaUtil'
}

// A tabela de faixas da sala. Sala antiga (só `valorHoraBase`) ganha
// uma tabela derivada (fim de semana e feriado = base + 30%).
export function precosDaSala(sala) {
  if (sala.precos) return sala.precos
  const util = sala.valorHoraBase || 0
  const maior = Math.round((util * 1.3) / 10) * 10
  return { diaUtil: util, fimDeSemana: maior, feriado: maior }
}

export function precoHora(sala, dataISO) {
  const feriados = getConfig().feriados || []
  return precosDaSala(sala)[faixaDoDia(dataISO, feriados)]
}

// Quanto custa um slot inteiro (o slot pode ser de 30, 60, 120 min...).
export function valorDoSlot(sala, dataISO) {
  return Math.round(precoHora(sala, dataISO) * (sala.slotMinutos / 60))
}

// Sala sazonal só pode ser reservada dentro da janela de temporada.
// Sala fixa está sempre no ar. (Datas ISO comparam direto como texto.)
export function dentroDaTemporada(sala, dataISO) {
  if (sala.tipo !== 'sazonal') return true
  if (sala.disponivelDe && dataISO < sala.disponivelDe) return false
  if (sala.disponivelAte && dataISO > sala.disponivelAte) return false
  return true
}

// Info da temporada pronta pra tela — null quando a sala não é sazonal.
export function infoTemporada(sala, dataISO) {
  if (sala.tipo !== 'sazonal') return null
  return {
    dentro: dentroDaTemporada(sala, dataISO),
    de: sala.disponivelDe,
    ate: sala.disponivelAte,
    aindaVaiAbrir: !!sala.disponivelDe && dataISO < sala.disponivelDe,
  }
}

// Devolve a lista de horários do dia: [{ inicio, fim, disponivel, motivo, nota }]
// motivo: 'passou' | 'ocupado' | 'preparo' | 'bloqueado' | null
export function gerarSlots(sala, dataISO, reservas, bloqueios = []) {
  // Sala sazonal fora da temporada: nenhum horário nesse dia.
  if (!dentroDaTemporada(sala, dataISO)) return []

  const { abre, fecha } = getConfig().horarioFuncionamento
  const inicioMin = hhmmParaMin(abre)
  const fimMin = hhmmParaMin(fecha)
  const passo = sala.slotMinutos
  const bufAntes = sala.bufferAntes || 0
  const bufDepois = sala.bufferDepois || 0

  const agora = Date.now()
  const ehHoje = dataISO === hojeISO()
  const agoraMin = new Date().getHours() * 60 + new Date().getMinutes()

  // Cada reserva que segura o horário vira dois intervalos em minutos:
  // [ini, fim] = a sessão em si;
  // [de, ate] = a sessão + o tempo de montagem/desmontagem em volta.
  const ocupados = reservas
    .filter((r) => r.salaId === sala.id && r.data === dataISO && reservaSeguraOHorario(r, agora))
    .map((r) => {
      const ini = hhmmParaMin(r.horaInicio)
      const fim = hhmmParaMin(r.horaFim)
      return { ini, fim, de: ini - bufAntes, ate: fim + bufDepois }
    })

  // dois intervalos se cruzam quando um começa antes de o outro terminar
  const cruza = (aIni, aFim, bIni, bFim) => aIni < bFim && aFim > bIni

  // Bloqueios que valem pra ESTA sala NESTE dia, em minutos.
  const bloqueiosHoje = (bloqueios || [])
    .filter(
      (b) =>
        (!b.salaId || b.salaId === sala.id) &&
        (b.tipo === 'diario' || (b.tipo === 'data' && b.data === dataISO)),
    )
    .map((b) => ({
      ini: hhmmParaMin(b.horaInicio || '00:00'),
      fim: hhmmParaMin(b.horaFim || '23:59'),
      motivo: b.motivo || '',
    }))

  const slots = []
  for (let t = inicioMin; t + passo <= fimMin; t += passo) {
    const fimT = t + passo
    const passou = ehHoje && t <= agoraMin
    const conflitoDireto = ocupados.some((o) => cruza(t, fimT, o.ini, o.fim))
    const conflitoBuffer = ocupados.some((o) => cruza(t, fimT, o.de, o.ate))
    const bloqueio = bloqueiosHoje.find((b) => cruza(t, fimT, b.ini, b.fim))

    let motivo = null
    if (passou) motivo = 'passou'
    else if (conflitoDireto) motivo = 'ocupado'
    else if (bloqueio) motivo = 'bloqueado'
    else if (conflitoBuffer) motivo = 'preparo'

    slots.push({
      inicio: minParaHHMM(t),
      fim: minParaHHMM(fimT),
      disponivel: !motivo,
      motivo,
      nota: bloqueio ? bloqueio.motivo : '',
    })
  }
  return slots
}
