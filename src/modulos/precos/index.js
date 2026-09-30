// ────────────────────────────────────────────────────────────────
//  Módulo Preços — 4 abas: Base do negócio · Pacotes · Campanhas ·
//  Calculadora rápida. Endereços:
//    #/precos/base  #/precos/pacotes  #/precos/campanhas  #/precos/calculadora
//    #/precos/pacote/<id|novo>   #/precos/campanha/<id|novo>
// ────────────────────────────────────────────────────────────────

import { carregarPrecos, mensagemDeErro } from './dados.js'
import { renderBase } from './base.js'
import { renderLista, renderEditor } from './servicos.js'
import { renderCalculadora } from './calculadora.js'

const ABAS = [
  ['base', 'Base do negócio'],
  ['pacotes', 'Pacotes'],
  ['campanhas', 'Campanhas'],
  ['calculadora', 'Calculadora rápida'],
]

export async function render(el, ctx) {
  const [, aba, id] = location.hash.replace(/^#\/?/, '').split('/')

  if (!ctx.negocio) return
  el.innerHTML = '<section class="modulo"><h1 class="titulo-grande">Preços</h1><p class="vazio">Carregando…</p></section>'
  const { dados, error } = await carregarPrecos(ctx.negocio.id)
  if (location.hash.replace(/^#\/?/, '').split('/')[0] !== 'precos') return // saiu enquanto carregava
  if (error) {
    el.innerHTML = `
      <section class="modulo">
        <h1 class="titulo-grande">Preços</h1>
        <p class="form-erro">Não consegui carregar seus preços: ${mensagemDeErro(error)}</p>
        <button class="botao" data-acao="tentar">Tentar de novo</button>
      </section>`
    el.querySelector('[data-acao="tentar"]').addEventListener('click', () => render(el, ctx))
    return
  }

  // editor de pacote/campanha: tela própria, sem as abas
  if (aba === 'pacote' || aba === 'campanha') {
    el.innerHTML = '<section class="modulo modulo-largo" id="precos-corpo"></section>'
    return renderEditor(el.querySelector('#precos-corpo'), dados, aba, id)
  }

  // sem aba no endereço: começa pela base até existir o primeiro pacote
  const abaAtual = ABAS.some(([a]) => a === aba) ? aba : dados.servicos.length ? 'pacotes' : 'base'

  el.innerHTML = `
    <section class="modulo modulo-largo">
      <h1 class="titulo-grande">Preços</h1>
      <nav class="abas" aria-label="Partes da precificação">
        ${ABAS.map(
          ([a, rotulo]) =>
            `<a class="aba ${a === abaAtual ? 'aba-ativa' : ''}" href="#/precos/${a}" ${a === abaAtual ? 'aria-current="page"' : ''}>${rotulo}</a>`,
        ).join('')}
      </nav>
      <div id="precos-corpo"></div>
    </section>`

  const corpo = el.querySelector('#precos-corpo')
  if (abaAtual === 'base') renderBase(corpo, dados)
  else if (abaAtual === 'pacotes') renderLista(corpo, dados, 'pacote')
  else if (abaAtual === 'campanhas') renderLista(corpo, dados, 'campanha')
  else renderCalculadora(corpo, dados)
}
