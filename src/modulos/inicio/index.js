// Módulo Início (painel do dia) — construído na Fase 4.
// Por enquanto: boas-vindas + o que vem em cada parte do app.

import { esc } from '../../componentes/campos.js'
import { icones } from '../../componentes/icones.js'

const PARTES = [
  ['precos', 'Preços', 'Descubra quanto cobrar', null],
  ['leads', 'Leads', 'Organize quem pediu orçamento', null],
  ['financeiro', 'Financeiro', 'Separe o caixa do seu bolso', null],
]

export function render(el, { negocio }) {
  el.innerHTML = `
    <section class="modulo">
      <p class="modulo-sobre">Bem-vindo(a) ao</p>
      <h1 class="titulo-grande">${esc(negocio.nome)}</h1>
      <p class="modulo-intro">
        Aqui vai ficar o resumo do seu dia: follow-ups, leads por etapa e como está o mês.
        Enquanto isso, comece por aqui:
      </p>
      <div class="inicio-partes">
        ${PARTES.map(
          ([id, nome, frase, fase]) => `
          <a class="inicio-parte" href="#/${id}">
            <span class="inicio-parte-icone">${icones[id]}</span>
            <span class="inicio-parte-txt"><strong>${nome}</strong><small>${frase}</small></span>
            ${fase ? `<span class="em-breve-selo">${fase}</span>` : '<span class="em-breve-selo selo-pronto">Pronto</span>'}
          </a>`,
        ).join('')}
      </div>
    </section>`
}
