// Telas da Fase 3: Minha Reserva, detalhe da reserva, cancelar e remarcar.

import { brl, dataBR, hojeISO } from '../format.js'
import { valorDoSlot, faixaDoDia, NOME_FAIXA } from '../agenda.js'
import { slotBotao, tagTemporada, painelForaTemporada } from './agenda.js'

// Link do WhatsApp a partir de um telefone brasileiro digitado de qualquer jeito.
function linkWhatsApp(telefone) {
  const so = String(telefone || '').replace(/\D/g, '')
  if (so.length < 10) return null
  const comDDI = so.length <= 11 ? `55${so}` : so
  return `https://wa.me/${comDDI}`
}

// Link "como chegar" — abre o endereço no mapa.
function linkMapa(endereco) {
  const e = String(endereco || '').trim()
  return e ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e)}` : null
}

const ROTULO_STATUS = {
  confirmada: 'Confirmada',
  aguardando_pagamento: 'Aguardando confirmação',
  cancelada: 'Cancelada',
}

// Lista de extras já contratados, em linhas de total.
function linhasExtras(extras) {
  if (!extras || !extras.length) return ''
  return extras
    .map(
      (e) =>
        `<div class="total-linha"><span>${e.nome}${e.quantidade > 1 ? ` ×${e.quantidade}` : ''}</span><span>${brl(e.valor * e.quantidade)}</span></div>`,
    )
    .join('')
}

// ---- Lista: "Minhas reservas" ----
export function telaMinhasReservas({ reservas }) {
  return `
    <div class="topo-nav">
      <button class="link-voltar" data-ir="inicio">&larr; Início</button>
    </div>

    <div class="reservar-corpo">
      <h1 class="titulo-grande">Minhas reservas</h1>

      ${
        reservas.length
          ? `<div class="lista-reservas">
              ${reservas.map(cardReserva).join('')}
             </div>`
          : `<p class="vazio">Você ainda não tem reservas. Volte ao início e escolha uma sala.</p>`
      }
    </div>`
}

function cardReserva(r) {
  const nomeSala = r.sala ? r.sala.nome : 'Sala removida'
  return `
    <button class="card-reserva" data-reserva="${r.id}">
      <div class="cr-topo">
        <span class="cr-sala">${nomeSala}</span>
        <span class="badge-status badge-${r.status}">${ROTULO_STATUS[r.status] || r.status}</span>
      </div>
      <p class="cr-quando">${dataBR(r.data)} &middot; ${r.horaInicio} às ${r.horaFim}</p>
      <p class="cr-valor">${brl(r.valorTotal)}</p>
    </button>`
}

// Bloco "no dia da sessão": check-in, como chegar, falar com o estúdio, regras.
function blocoDoDia(config, reserva) {
  const tel = config.contato?.telefone || ''
  const endereco = config.contato?.endereco || ''
  const wa = linkWhatsApp(tel)
  const mapa = linkMapa(endereco)
  const regras = (config.regrasGerais || '').trim()

  return `
    <div class="checkin-info">
      Check-in liberado a partir das <strong>${reserva.horaInicio}</strong> — o início da sua sessão.
    </div>

    <div class="reserva-acessos">
      ${
        mapa
          ? `<a class="botao botao-fantasma" href="${mapa}" target="_blank" rel="noopener">Como chegar</a>`
          : ''
      }
      ${
        wa
          ? `<a class="botao botao-fantasma" href="${wa}" target="_blank" rel="noopener">Falar com o estúdio no WhatsApp</a>`
          : tel
            ? `<a class="botao botao-fantasma" href="tel:${tel.replace(/[^\d+]/g, '')}">Ligar para o estúdio</a>`
            : ''
      }
    </div>
    ${endereco ? `<p class="acao-motivo">${endereco}</p>` : ''}

    ${
      regras
        ? `<details class="regras">
             <summary>Regras do estúdio</summary>
             <p>${regras}</p>
           </details>`
        : ''
    }`
}

// ---- Detalhe de uma reserva ----
export function telaReservaDetalhe({ sala, reserva, config, podeRemarcar, horasAteSessao, prazoRemarcar }) {
  const cancelada = reserva.status === 'cancelada'
  const aguardando = reserva.status === 'aguardando_pagamento'
  const rotuloTotal = cancelada ? 'Total da reserva' : aguardando ? 'Total (Pix avisado)' : 'Total pago'

  return `
    <div class="topo-nav">
      <button class="link-voltar" data-ir="minhaReserva">&larr; Minhas reservas</button>
    </div>

    <div class="reservar-corpo">
      <div class="resumo">
        <h1 class="titulo-grande">${sala.nome}</h1>
        <p>${dataBR(reserva.data)} &middot; ${reserva.horaInicio} às ${reserva.horaFim}</p>
        <span class="badge-status badge-${reserva.status} badge-solo">${ROTULO_STATUS[reserva.status] || reserva.status}</span>
      </div>

      ${
        aguardando
          ? `<p class="aviso-inline">Aguardando o estúdio confirmar o recebimento do Pix. O horário já está garantido pra você.</p>`
          : ''
      }

      <div class="total-bloco">
        <div class="total-linha"><span>Sala</span><span>${brl(reserva.valorSala)}</span></div>
        ${linhasExtras(reserva.extras)}
        <div class="total-linha total-final"><span>${rotuloTotal}</span><span>${brl(reserva.valorTotal)}</span></div>
        <div class="total-linha"><span>Forma de pagamento</span><span>Pix</span></div>
      </div>

      ${cancelada ? '' : blocoDoDia(config, reserva)}

      ${
        cancelada
          ? `<div class="aviso-inline">
               Reserva cancelada. Devolvido (simulado): <strong>${brl(reserva.valorDevolvido ?? reserva.valorTotal)}</strong>.
               ${reserva.valorRetido ? `Retido pelo estúdio: <strong>${brl(reserva.valorRetido)}</strong>.` : ''}
             </div>`
          : `
            <div class="acoes-reserva">
              <button class="botao botao-grande" data-acao="ir-remarcar" ${podeRemarcar ? '' : 'disabled'}>
                Remarcar
              </button>
              <button class="botao botao-grande botao-perigo" data-acao="ir-cancelar">
                Cancelar reserva
              </button>
            </div>
            ${
              podeRemarcar
                ? ''
                : `<p class="acao-motivo">${
                    aguardando
                      ? 'Só dá para remarcar depois que o estúdio confirmar o pagamento. Você ainda pode cancelar.'
                      : `Só dá para remarcar até ${prazoRemarcar}h antes da sessão${
                          horasAteSessao > 0 ? ` (faltam ${Math.round(horasAteSessao)}h)` : ''
                        }. Você ainda pode cancelar.`
                  }</p>`
            }`
      }
    </div>`
}

// ---- Cancelar: mostra a política antes de confirmar ----
export function telaCancelar({ config, sala, reserva, calc }) {
  const faltamTexto =
    calc.horas <= 0
      ? 'A sessão já começou ou já passou.'
      : `Faltam cerca de <strong>${Math.round(calc.horas)}h</strong> para a sessão.`

  return `
    <div class="topo-nav">
      <button class="link-voltar" data-ir="reservaDetalhe">&larr; Voltar</button>
    </div>

    <div class="reservar-corpo">
      <h1 class="titulo-grande">Cancelar reserva</h1>
      <p class="detalhe-desc">${sala.nome} &middot; ${dataBR(reserva.data)} &middot; ${reserva.horaInicio} às ${reserva.horaFim}</p>

      <div class="politica-bloco ${calc.gratis ? 'politica-ok' : 'politica-taxa'}">
        <p>${faltamTexto}</p>
        ${
          calc.gratis
            ? `<p>Cancelamento <strong>gratuito</strong>. Você recebe o valor integral de volta (simulado).</p>`
            : `<p>Como faltam menos de ${calc.prazoGratis}h, o estúdio retém <strong>${calc.taxaPercent}%</strong> do valor.</p>`
        }
      </div>

      <div class="total-bloco">
        <div class="total-linha"><span>Total da reserva</span><span>${brl(reserva.valorTotal)}</span></div>
        <div class="total-linha"><span>Retido pelo estúdio</span><span>${brl(calc.valorRetido)}</span></div>
        <div class="total-linha total-final"><span>Você recebe de volta</span><span>${brl(calc.valorDevolvido)}</span></div>
      </div>

      <details class="regras">
        <summary>Ver política completa</summary>
        <p>${config.politicaCancelamento}</p>
      </details>

      <p class="nota-simulacao">Simulação: nenhum estorno real é feito nesta fase.</p>

      <button class="botao botao-grande botao-perigo" data-acao="confirmar-cancelamento">
        Confirmar cancelamento
      </button>
    </div>`
}

// ---- Cancelamento concluído ----
export function telaCanceladaOk({ sala, reserva }) {
  return `
    <div class="feito">
      <div class="feito-check feito-neutro">&#10003;</div>
      <h1 class="titulo-grande">Reserva cancelada</h1>
      <p>${sala.nome} &middot; ${dataBR(reserva.data)} &middot; ${reserva.horaInicio} às ${reserva.horaFim}</p>

      <div class="total-bloco conf-bloco">
        <div class="total-linha"><span>Retido pelo estúdio</span><span>${brl(reserva.valorRetido || 0)}</span></div>
        <div class="total-linha total-final"><span>Devolvido (simulado)</span><span>${brl(reserva.valorDevolvido ?? reserva.valorTotal)}</span></div>
      </div>

      <button class="botao botao-grande" data-ir="minhaReserva">Ver minhas reservas</button>
      <button class="link-voltar link-centro" data-ir="inicio">Voltar ao início</button>
    </div>`
}

// ---- Remarcar: escolher novo dia e horário ----
export function telaRemarcar({ sala, reserva, data, slots, infoSazonal, feriados = [] }) {
  const valor = valorDoSlot(sala, data)
  const temLivre = slots.some((s) => s.disponivel)
  const foraDeTemporada = infoSazonal && !infoSazonal.dentro
  const faixa = NOME_FAIXA[faixaDoDia(data, feriados)].toLowerCase()

  return `
    <div class="topo-nav">
      <button class="link-voltar" data-ir="reservaDetalhe">&larr; Voltar</button>
    </div>

    <div class="agenda-cab">
      <h1 class="titulo-grande">Remarcar</h1>
      <p class="detalhe-desc">
        Hoje: ${dataBR(reserva.data)} &middot; ${reserva.horaInicio} às ${reserva.horaFim}.
        Escolha um novo horário para a ${sala.nome} — os extras continuam iguais.
      </p>
      <label class="campo">
        <span>Novo dia</span>
        <input type="date" id="data-remarcar" value="${data}" min="${hojeISO()}" />
      </label>
      <p class="agenda-info">
        ${dataBR(data)} &middot; ${faixa}
        &middot; ${brl(valor)} por sessão de ${sala.slotMinutos} min
      </p>
      ${tagTemporada(infoSazonal)}
    </div>

    ${
      foraDeTemporada
        ? painelForaTemporada(sala, infoSazonal)
        : `
          <div class="grade-slots">
            ${slots.map(slotBotao).join('')}
          </div>
          ${temLivre ? '' : '<p class="vazio">Nenhum horário livre nesse dia. Tente outra data.</p>'}`
    }`
}

// ---- Remarcar: conferir a troca antes de confirmar ----
export function telaRemarcarConfirmar({ sala, reserva, data, inicio, fim, novoValorSala, novoTotal, diferenca }) {
  return `
    <div class="topo-nav">
      <button class="link-voltar" data-ir="remarcar">&larr; Voltar</button>
    </div>

    <div class="reservar-corpo">
      <h1 class="titulo-grande">Confirmar remarcação</h1>

      <div class="de-para">
        <div class="dp-linha dp-de">
          <span class="dp-rotulo">De</span>
          <span>${dataBR(reserva.data)} &middot; ${reserva.horaInicio} às ${reserva.horaFim}</span>
        </div>
        <div class="dp-seta">&darr;</div>
        <div class="dp-linha dp-para">
          <span class="dp-rotulo">Para</span>
          <span>${dataBR(data)} &middot; ${inicio} às ${fim}</span>
        </div>
      </div>

      <div class="total-bloco">
        <div class="total-linha"><span>Sala (novo dia)</span><span>${brl(novoValorSala)}</span></div>
        <div class="total-linha"><span>Extras</span><span>${brl(reserva.valorExtras)}</span></div>
        <div class="total-linha total-final"><span>Novo total</span><span>${brl(novoTotal)}</span></div>
      </div>

      ${
        diferenca === 0
          ? `<p class="nota-simulacao">O valor não muda com o novo dia.</p>`
          : diferenca > 0
            ? `<p class="nota-simulacao">O novo dia é mais caro: diferença de <strong>${brl(diferenca)}</strong> (cobrada na simulação).</p>`
            : `<p class="nota-simulacao">O novo dia é mais barato: <strong>${brl(-diferenca)}</strong> voltam para você (simulado).</p>`
      }

      <button class="botao botao-grande" data-acao="confirmar-remarcacao">Confirmar remarcação</button>
    </div>`
}

// ---- Remarcação concluída ----
export function telaRemarcadaOk({ sala, reserva }) {
  return `
    <div class="feito">
      <div class="feito-check">&#10003;</div>
      <h1 class="titulo-grande">Reserva remarcada!</h1>
      <p>${sala.nome}</p>
      <p>${dataBR(reserva.data)} &middot; ${reserva.horaInicio} às ${reserva.horaFim}</p>

      <button class="botao botao-grande" data-ir="minhaReserva">Ver minhas reservas</button>
      <button class="link-voltar link-centro" data-ir="inicio">Voltar ao início</button>
    </div>`
}
