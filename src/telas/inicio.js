// Tela: Início do estúdio — identidade + filtro de data + lista de salas

import { brl, dataCurta, hojeISO } from '../format.js'
import { precoHora } from '../agenda.js'
import { aperture, capaSala, rodapeStudioSlot } from '../ui.js'

function cardSala(sala, dataFiltro) {
  const sazonal =
    sala.tipo === 'sazonal' && sala.disponivelDe
      ? `<p class="tag-temporada">Sazonal &middot; ${dataCurta(sala.disponivelDe)} a ${dataCurta(sala.disponivelAte)}</p>`
      : ''
  return `
    <article class="card-sala" data-sala="${sala.id}" role="button" tabindex="0">
      ${capaSala(sala, { classe: 'foto', apertureCls: 'aperture' })}
      <div class="corpo">
        <h3 class="nome-sala">${sala.nome}</h3>
        <p class="desc-sala">${sala.descricao}</p>
        ${sazonal}
        <div class="meta">
          <span>Até ${sala.capacidadeMax} pessoas</span>
          <span>${sala.metragem} m²</span>
          <span>Duração ${sala.slotMinutos} min</span>
        </div>
        <div class="rodape">
          <span class="preco">a partir de ${brl(precoHora(sala, dataFiltro))}<small> /h</small></span>
          <span class="ver-mais">Ver agenda &rarr;</span>
        </div>
      </div>
    </article>`
}

export function telaInicio({ config, salas, filtroData, ehAdmin, ehDono }) {
  return `
    <header class="cabecalho">
      <div class="cab-topo">
        <div class="marca">
          ${
            config.logo
              ? `<img class="marca-logo" src="${config.logo}" alt="${config.nome}" />`
              : aperture()
          }
          ${config.logo && config.logoComNome ? '' : `<span class="nome">${config.nome}</span>`}
        </div>
        <button class="link-minhas" data-ir="minhaReserva">Minhas reservas</button>
      </div>
      <p class="descricao">${config.descricao}</p>
    </header>

    <div class="barra-filtro">
      <label for="filtro-data">Data da sessão</label>
      <input type="date" id="filtro-data" value="${filtroData}" min="${hojeISO()}" />
    </div>

    <h2 class="secao-titulo">Salas e cenários</h2>
    <div class="lista-salas">
      ${salas.map((s) => cardSala(s, filtroData)).join('')}
    </div>

    <footer class="rodape-app">
      ${rodapeStudioSlot()}
      <div class="rodape-links">
        ${ehDono ? '<button class="link-dono" data-ir="donoHome">Área do dono</button>' : ''}
        ${ehAdmin ? '<button class="link-dono" data-ir="plataforma">Painel da plataforma</button>' : ''}
        <button class="link-dono" data-acao="sair">Sair</button>
      </div>
      <div class="rodape-legal">
        <button class="link-legal" data-ir="privacidade">Privacidade</button>
        <span>&middot;</span>
        <button class="link-legal" data-ir="termos">Termos de uso</button>
      </div>
    </footer>`
}
