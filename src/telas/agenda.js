// Tela: Agenda da sala — escolher o dia e um horário livre

import { brl, dataBR, dataCurta, hojeISO } from '../format.js'
import { valorDoSlot, faixaDoDia, NOME_FAIXA } from '../agenda.js'

export function slotBotao(slot) {
  if (slot.disponivel) {
    return `
      <button class="slot" data-slot="${slot.inicio}|${slot.fim}">
        <span class="slot-hora">${slot.inicio}</span>
        <span class="slot-tag">livre</span>
      </button>`
  }
  const texto =
    slot.motivo === 'passou'
      ? 'passou'
      : slot.motivo === 'preparo'
        ? 'preparo'
        : slot.motivo === 'bloqueado'
          ? (slot.nota || 'fechado').toLowerCase()
          : 'ocupado'
  return `
    <button class="slot slot-off slot-${slot.motivo}" disabled>
      <span class="slot-hora">${slot.inicio}</span>
      <span class="slot-tag">${texto}</span>
    </button>`
}

// "15 min antes e 15 min depois" / "30 min depois" — o intervalo de preparo da sala.
export function bufferTexto(sala) {
  const a = sala.bufferAntes || 0
  const d = sala.bufferDepois || 0
  if (a && d) return `${a} min antes e ${d} min depois`
  if (d) return `${d} min depois`
  if (a) return `${a} min antes`
  return ''
}

// Etiqueta "cenário sazonal · montado de X a Y" (recebe o infoTemporada).
export function tagTemporada(info) {
  if (!info) return ''
  return `<p class="tag-temporada">Cenário sazonal &middot; montado de ${dataCurta(info.de)} a ${dataCurta(info.ate)}</p>`
}

// Painel que substitui a grade quando a data está fora da temporada.
export function painelForaTemporada(sala, info) {
  return `
    <div class="fora-temporada">
      <p><strong>${sala.nome}</strong> ${
        info.aindaVaiAbrir ? 'ainda não está montado' : 'já saiu de cartaz'
      } nessa data.</p>
      <p>Fica disponível de <strong>${dataCurta(info.de)}</strong> a <strong>${dataCurta(info.ate)}</strong>. Escolha uma data nesse período.</p>
    </div>`
}

export function telaAgenda({ sala, data, slots, infoSazonal, feriados = [] }) {
  const valor = valorDoSlot(sala, data)
  const temLivre = slots.some((s) => s.disponivel)
  const foraDeTemporada = infoSazonal && !infoSazonal.dentro
  const temBuffer = (sala.bufferAntes || 0) + (sala.bufferDepois || 0) > 0
  const faixa = NOME_FAIXA[faixaDoDia(data, feriados)].toLowerCase()

  return `
    <div class="topo-nav">
      <button class="link-voltar" data-ir="detalhe">&larr; ${sala.nome}</button>
    </div>

    <div class="agenda-cab">
      <h1 class="titulo-grande">Agenda</h1>
      <label class="campo">
        <span>Escolha o dia</span>
        <input type="date" id="data-agenda" value="${data}" min="${hojeISO()}" />
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
    }

    <p class="aviso-fase">
      Ao escolher um horário, ele fica <strong>travado por 10 minutos</strong>
      para você adicionar os extras e pagar.${
        temBuffer
          ? ` Esta sala guarda ${bufferTexto(sala)} entre sessões para montagem e desmontagem, então horários colados numa reserva aparecem como <strong>preparo</strong>.`
          : ''
      }
    </p>`
}
