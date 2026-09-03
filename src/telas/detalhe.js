// Tela: Detalhe da sala — fotos, specs, equipamento, preço e o caminho para a agenda

import { brl, dataCurta } from '../format.js'
import { precosDaSala } from '../agenda.js'
import { bufferTexto } from './agenda.js'
import { capaSala } from '../ui.js'

export function telaDetalhe({ sala }) {
  const p = precosDaSala(sala)
  const sazonal =
    sala.tipo === 'sazonal' && sala.disponivelDe
      ? `<div class="info-faixa"><strong>Cenário sazonal.</strong> Montado de ${dataCurta(sala.disponivelDe)} a ${dataCurta(sala.disponivelAte)} — reservas só nesse período.</div>`
      : ''
  const buffer =
    sala.bufferAntes || sala.bufferDepois
      ? `<div class="info-faixa">Intervalo de ${bufferTexto(sala)} entre sessões para montagem e desmontagem.</div>`
      : ''

  return `
    <div class="topo-nav">
      <button class="link-voltar" data-ir="inicio">&larr; Salas</button>
    </div>

    ${capaSala(sala, { classe: 'detalhe-foto', apertureCls: 'aperture-grande' })}

    <div class="detalhe-corpo">
      <h1 class="titulo-grande">${sala.nome}</h1>
      <p class="detalhe-desc">${sala.descricao}</p>

      <div class="meta">
        <span>Até ${sala.capacidadeMax} pessoas</span>
        <span>${sala.metragem} m²</span>
        <span>Duração ${sala.slotMinutos} min</span>
      </div>

      ${sazonal}
      ${buffer}

      <h2 class="bloco-titulo">Equipamento incluso</h2>
      <ul class="lista-equip">
        ${sala.equipamento.map((e) => `<li>${e}</li>`).join('')}
      </ul>

      <h2 class="bloco-titulo">Preço por hora</h2>
      <div class="tabela-preco">
        <div><span>Dia útil</span><strong>${brl(p.diaUtil)} /h</strong></div>
        <div><span>Fim de semana</span><strong>${brl(p.fimDeSemana)} /h</strong></div>
        <div><span>Feriado</span><strong>${brl(p.feriado)} /h</strong></div>
      </div>

      <button class="botao botao-grande" data-ir="agenda">Ver agenda e reservar</button>
    </div>`
}
