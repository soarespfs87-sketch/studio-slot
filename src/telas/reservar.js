// Telas do fluxo de reserva: dados + termo, pagamento (simulado),
// processando, confirmação e "tempo esgotado".

import { brl, dataBR } from '../format.js'
import { barraContador } from './parciais.js'

function listaExtrasResumo(extras) {
  if (!extras || !extras.length) return ''
  return `
    <div class="conf-extras">
      ${extras
        .map(
          (e) =>
            `<div class="total-linha"><span>${e.nome}${e.quantidade > 1 ? ` ×${e.quantidade}` : ''}</span><span>${brl(e.valor * e.quantidade)}</span></div>`,
        )
        .join('')}
    </div>`
}

// ---- Passo: seus dados + aceite do termo ----
export function telaDados({ config, sala, reserva, fotografo, restanteMs }) {
  const f = fotografo || {}
  return `
    <div class="topo-nav">
      <button class="link-voltar" data-acao="voltar-extras">&larr; Voltar aos extras</button>
    </div>

    <div class="reservar-corpo">
      ${barraContador(restanteMs)}

      <div class="resumo">
        <h1 class="titulo-grande">${sala.nome}</h1>
        <p>${dataBR(reserva.data)} &middot; ${reserva.horaInicio} às ${reserva.horaFim}</p>
        <p class="resumo-valor">${brl(reserva.valorTotal)}</p>
      </div>

      <h2 class="bloco-titulo">Seus dados</h2>
      <label class="campo">
        <span>Nome completo</span>
        <input type="text" id="f-nome" value="${f.nome || ''}" placeholder="Como no seu documento" />
      </label>
      <label class="campo">
        <span>E-mail</span>
        <input type="email" id="f-email" value="${f.email || ''}" placeholder="voce@email.com" />
      </label>
      <label class="campo">
        <span>Telefone</span>
        <input type="tel" id="f-tel" value="${f.telefone || ''}" placeholder="(11) 90000-0000" />
      </label>

      <label class="termo">
        <input type="checkbox" id="aceite" />
        <span>Li e concordo com as regras do estúdio e a política de cancelamento.</span>
      </label>

      <details class="regras">
        <summary>Ver regras completas</summary>
        <p>${config.regrasGerais}</p>
        <p>${config.politicaCancelamento}</p>
      </details>

      <button class="botao botao-grande" id="btn-ir-pagamento" disabled>Ir para o pagamento</button>
    </div>`
}

// ---- Passo: pagamento simulado ----
export function telaPagamento({ sala, reserva, metodo, restanteMs }) {
  return `
    <div class="topo-nav">
      <button class="link-voltar" data-acao="voltar-dados">&larr; Voltar</button>
    </div>

    <div class="reservar-corpo">
      ${barraContador(restanteMs)}

      <div class="resumo">
        <h1 class="titulo-grande">Pagamento</h1>
        <p>${sala.nome} &middot; ${dataBR(reserva.data)} &middot; ${reserva.horaInicio} às ${reserva.horaFim}</p>
        <p class="resumo-valor">${brl(reserva.valorTotal)}</p>
      </div>

      <h2 class="bloco-titulo">Como você quer pagar?</h2>
      <div class="metodos">
        <button class="metodo ${metodo === 'pix' ? 'metodo-on' : ''}" data-metodo="pix">
          <strong>Pix</strong><span>aprovação na hora</span>
        </button>
        <button class="metodo ${metodo === 'cartao' ? 'metodo-on' : ''}" data-metodo="cartao">
          <strong>Cartão de crédito</strong><span>em 1x</span>
        </button>
      </div>

      <p class="nota-simulacao">
        Simulação: nenhum pagamento real é feito nesta fase. O gateway de verdade entra depois.
      </p>

      <button class="botao botao-grande" id="btn-pagar" ${metodo ? '' : 'disabled'}>
        Pagar ${brl(reserva.valorTotal)}
      </button>
    </div>`
}

export function telaProcessando() {
  return `
    <div class="feito">
      <div class="spinner"></div>
      <h1 class="titulo-grande">Processando pagamento…</h1>
      <p>Só um instante.</p>
    </div>`
}

// ---- Passo: confirmação ----
export function telaConfirmacao({ sala, reserva }) {
  const metodoTexto = reserva.formaPagamento === 'pix' ? 'Pix' : 'Cartão de crédito'
  return `
    <div class="feito">
      <div class="feito-check">&#10003;</div>
      <h1 class="titulo-grande">Reserva confirmada!</h1>
      <p>${sala.nome}</p>
      <p>${dataBR(reserva.data)} &middot; ${reserva.horaInicio} às ${reserva.horaFim}</p>

      <div class="total-bloco conf-bloco">
        <div class="total-linha"><span>Sala</span><span>${brl(reserva.valorSala)}</span></div>
        ${listaExtrasResumo(reserva.extras)}
        <div class="total-linha total-final"><span>Total pago</span><span>${brl(reserva.valorTotal)}</span></div>
        <div class="total-linha"><span>Forma de pagamento</span><span>${metodoTexto}</span></div>
      </div>

      <button class="botao botao-grande" data-ir="minhaReserva">Ver minhas reservas</button>
      <button class="link-voltar link-centro" data-ir="inicio">Voltar ao início</button>
    </div>`
}

// ---- Trava expirada ----
export function telaExpirada({ sala }) {
  return `
    <div class="feito">
      <div class="feito-check feito-x">&times;</div>
      <h1 class="titulo-grande">O tempo acabou</h1>
      <p>A trava de 10 minutos expirou e o horário${sala ? ` da ${sala.nome}` : ''} voltou para a agenda.</p>
      <button class="botao botao-grande" data-ir="agenda">Ver a agenda de novo</button>
    </div>`
}
