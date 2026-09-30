// ────────────────────────────────────────────────────────────────
//  Controlador do app — monta o menu e troca de tela
//
//  Cada parte do app é um módulo em src/modulos/<nome>/index.js que
//  exporta render(el, ctx). A tela aberta fica no endereço
//  (#/leads, #/precos…), então recarregar volta pro mesmo lugar.
//  (O app de reserva de sala da v1 está guardado em src/legado/.)
// ────────────────────────────────────────────────────────────────

import { aplicarTema } from './theme.js'
import { souAdmin, meuEstudio, sessaoAtual } from './auth.js'
import { carregarNegocio, getNegocio } from './negocio.js'
import { esc } from './componentes/campos.js'
import { icones } from './componentes/icones.js'
import { rodapeStudioSlot } from './ui.js'
import * as inicio from './modulos/inicio/index.js'
import * as leads from './modulos/leads/index.js'
import * as precos from './modulos/precos/index.js'
import * as financeiro from './modulos/financeiro/index.js'
import * as ajustes from './modulos/ajustes/index.js'
import * as plataforma from './modulos/plataforma/index.js'

// Itens do menu, na ordem em que aparecem.
const MENU = [
  { id: 'inicio', rotulo: 'Início', modulo: inicio },
  { id: 'leads', rotulo: 'Leads', modulo: leads },
  { id: 'precos', rotulo: 'Preços', modulo: precos },
  { id: 'financeiro', rotulo: 'Financeiro', modulo: financeiro },
  { id: 'ajustes', rotulo: 'Ajustes', modulo: ajustes },
]
// Telas que existem mas não ficam no menu.
const FORA_DO_MENU = { plataforma }

const app = document.querySelector('#app')
let ctx = null
let telaAtual = null

// "#/leads" -> "leads"; qualquer coisa desconhecida -> "inicio"
function telaDoEndereco() {
  const id = location.hash.replace(/^#\/?/, '').split('/')[0]
  if (MENU.some((m) => m.id === id) || id in FORA_DO_MENU) return id
  return 'inicio'
}

function marcaHTML(negocio) {
  const logo = negocio.logo
    ? `<img class="marca-logo" src="${esc(negocio.logo)}" alt="${esc(negocio.nome)}" />`
    : ''
  const nome = negocio.logo && negocio.logoComNome ? '' : `<span class="nome">${esc(negocio.nome)}</span>`
  return `<div class="marca">${logo}${nome}</div>`
}

function montarCasca() {
  app.classList.add('app-casca')
  app.innerHTML = `
    <header class="casca-topo" data-marca></header>
    <nav class="casca-menu" aria-label="Menu principal">
      <div class="casca-menu-marca" data-marca></div>
      ${MENU.map(
        (m) => `
        <a class="casca-item" href="#/${m.id}" data-tela="${m.id}">
          ${icones[m.id]}<span>${m.rotulo}</span>
        </a>`,
      ).join('')}
      <div class="casca-menu-selo">${rodapeStudioSlot()}</div>
    </nav>
    <main class="casca-conteudo" id="conteudo"></main>`
  atualizarMarca()
}

// Nome/logo no topo e no menu + cores e ícone do app.
function atualizarMarca() {
  const negocio = getNegocio()
  aplicarTema(negocio)
  app.querySelectorAll('[data-marca]').forEach((el) => (el.innerHTML = marcaHTML(negocio)))
}

function render() {
  const id = telaDoEndereco()
  if (telaAtual === 'ajustes' && id !== 'ajustes') ajustes.sairDaTela()
  telaAtual = id

  app.querySelectorAll('.casca-item').forEach((a) => {
    const ativo = a.dataset.tela === id
    a.classList.toggle('casca-item-ativo', ativo)
    if (ativo) a.setAttribute('aria-current', 'page')
    else a.removeAttribute('aria-current')
  })

  const conteudo = app.querySelector('#conteudo')
  const modulo = MENU.find((m) => m.id === id)?.modulo || FORA_DO_MENU[id]
  modulo.render(conteudo, ctx)
  window.scrollTo(0, 0)
}

export async function iniciar() {
  const [ehAdmin, est, sessao] = await Promise.all([
    souAdmin().catch(() => false),
    meuEstudio().catch(() => null),
    sessaoAtual(),
  ])
  ctx = {
    ehAdmin,
    email: sessao?.user?.email || '',
    atualizarMarca,
    get negocio() {
      return getNegocio() // sempre a versão mais recente (Ajustes pode ter mudado)
    },
  }

  // admin sem negócio próprio: só o Painel da Plataforma
  if (!est) {
    app.innerHTML = '<div id="conteudo"></div>'
    return plataforma.render(app.querySelector('#conteudo'), ctx, { comSair: true })
  }

  carregarNegocio(est)
  montarCasca()
  window.addEventListener('hashchange', render)
  render()
}
