// Tela: Extras — adicionais da reserva, com total ao vivo

import { brl } from '../format.js'
import { barraContador } from './parciais.js'

// selecionados: mapa { [extraId]: quantidade }
function linhaExtra(extra, qtd) {
  const subtotal = extra.valor * qtd
  return `
    <div class="extra ${qtd > 0 ? 'extra-on' : ''}" data-extra="${extra.id}">
      <div class="extra-info">
        <span class="extra-nome">${extra.nome}</span>
        <span class="extra-valor">${brl(extra.valor)} cada</span>
      </div>
      <div class="stepper">
        <button class="stepper-btn" data-passo="-1" ${qtd === 0 ? 'disabled' : ''}>&minus;</button>
        <span class="stepper-qtd">${qtd}</span>
        <button class="stepper-btn" data-passo="1">+</button>
      </div>
      <span class="extra-subtotal">${subtotal > 0 ? brl(subtotal) : '—'}</span>
    </div>`
}

export function telaExtras({ sala, reserva, extrasDisponiveis, selecionados, restanteMs }) {
  const valorExtras = extrasDisponiveis.reduce(
    (s, e) => s + e.valor * (selecionados[e.id] || 0),
    0,
  )
  const total = reserva.valorSala + valorExtras

  return `
    <div class="topo-nav">
      <button class="link-voltar" data-acao="cancelar-trava">&larr; Cancelar e voltar</button>
    </div>

    <div class="reservar-corpo">
      ${barraContador(restanteMs)}

      <h1 class="titulo-grande">Extras</h1>
      <p class="detalhe-desc">${sala.nome} &middot; ${reserva.horaInicio} às ${reserva.horaFim}</p>

      ${
        extrasDisponiveis.length
          ? `<div class="lista-extras">
              ${extrasDisponiveis.map((e) => linhaExtra(e, selecionados[e.id] || 0)).join('')}
             </div>`
          : `<p class="vazio">Esta sala não tem extras cadastrados.</p>`
      }

      <div class="total-bloco">
        <div class="total-linha"><span>Sala</span><span>${brl(reserva.valorSala)}</span></div>
        <div class="total-linha"><span>Extras</span><span id="linha-extras">${brl(valorExtras)}</span></div>
        <div class="total-linha total-final"><span>Total</span><span id="linha-total">${brl(total)}</span></div>
      </div>

      <button class="botao botao-grande" data-acao="ir-dados">Continuar</button>
    </div>`
}
