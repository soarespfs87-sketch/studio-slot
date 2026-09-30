// Telas de acesso da v1 (fotógrafo que reservava sala em estúdio).
// Guardadas pra quando a agenda voltar.

import { DOMINIO } from '../../ui.js'

const moldura = (conteudo) => `<div class="acesso"><div class="acesso-caixa">${conteudo}</div></div>`

// Fotógrafo abriu o app sem link de estúdio (e nunca abriu nenhum).
export function telaSemEstudio() {
  return moldura(`
    <h1 class="titulo-grande">Abra pelo link do estúdio</h1>
    <p class="acesso-sub">
      Este app é personalizado para cada estúdio. Use o link que o estúdio
      te enviou — ou instale o app a partir dele.
    </p>
    <form id="form-slug" class="dono-form">
      <label class="campo">
        <span>Tem o endereço do estúdio?</span>
        <div class="endereco-linha">
          <span>${DOMINIO}/</span>
          <input type="text" id="s-slug" placeholder="nome-do-estudio" />
        </div>
      </label>
      <button class="botao botao-grande" type="submit">Abrir estúdio</button>
    </form>
    <button class="link-troca" data-acao="sair">Sair</button>
  `)
}

// Fotógrafo escolhe em qual estúdio quer reservar.
export function telaEscolherEstudio({ estudios, ehAdmin }) {
  return `
    <div class="reservar-corpo">
      <h1 class="titulo-grande">Escolha um estúdio</h1>
      <p class="detalhe-desc">Onde você quer reservar?</p>

      <div class="lista-reservas">
        ${
          estudios.length
            ? estudios
                .map(
                  (e) => `
              <button class="card-reserva" data-estudio-slug="${e.slug}">
                <div class="cr-topo"><span class="cr-sala">${e.nome}</span></div>
                <p class="cr-quando">${DOMINIO}/${e.slug}</p>
              </button>`,
                )
                .join('')
            : '<p class="vazio">Nenhum estúdio disponível ainda.</p>'
        }
      </div>

      <div class="rodape-links" style="margin-top: 22px">
        ${ehAdmin ? '<button class="link-dono" data-ir="plataforma">Painel da plataforma</button>' : ''}
        <button class="link-dono" data-acao="sair">Sair</button>
      </div>
    </div>`
}

