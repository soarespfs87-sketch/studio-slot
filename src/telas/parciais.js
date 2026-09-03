// Pedaços de tela usados em mais de um passo do fluxo de reserva

import { brl, dataBR, mmss } from '../format.js'

// Barra do contador de 10 minutos (aparece em extras, dados e pagamento).
export function barraContador(restanteMs) {
  return `
    <div class="contador ${restanteMs < 60000 ? 'contador-alerta' : ''}">
      Horário travado &middot; <strong id="contador">${mmss(restanteMs)}</strong> para concluir
    </div>`
}

// Resumo curto da reserva (sala, dia, horário) + valor da sala.
export function resumoReserva(sala, reserva) {
  return `
    <div class="resumo">
      <h1 class="titulo-grande">${sala.nome}</h1>
      <p>${dataBR(reserva.data)}</p>
      <p>${reserva.horaInicio} às ${reserva.horaFim}</p>
      <p class="resumo-linha"><span>Sala</span><span>${brl(reserva.valorSala)}</span></p>
    </div>`
}
