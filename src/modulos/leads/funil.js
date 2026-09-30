// ────────────────────────────────────────────────────────────────
//  Leads › Funil
//  Celular: abas por etapa (uma lista por vez).
//  Computador: todas as etapas em colunas (kanban).
// ────────────────────────────────────────────────────────────────

import { esc } from '../../componentes/campos.js'
import { formatarReais } from '../../calculos.js'
import { hojeISO } from '../../format.js'
import { atualizarLead, mensagemDeErro } from './dados.js'
import {
  ETAPAS,
  ETAPAS_ABERTAS,
  proximaEtapa,
  rotuloEtapa,
  rotuloOrigem,
  situacaoFollowup,
  linkWhatsApp,
} from './regras.js'
import { iconeWhats, seloFollowup, dataCurtaBR } from './ui.js'

// Filtros que continuam valendo enquanto a pessoa navega.
let _busca = ''
let _soFollowups = false

function cartaoLead(l, servicos, negocio, hoje) {
  const serv = servicos.find((s) => s.id === l.servico_id)
  const valor = l.etapa === 'fechado' ? l.valor_fechado_centavos : l.valor_estimado_centavos
  const prox = proximaEtapa(l.etapa)
  const aberto = ETAPAS_ABERTAS.includes(l.etapa)
  const acao = !aberto
    ? ''
    : prox === 'fechado'
      ? `<a class="mini-btn mini-btn-primario" href="#/leads/${l.id}/fechar">Fechar negócio</a>`
      : `<button type="button" class="mini-btn" data-avancar="${l.id}" data-para="${prox}">→ ${rotuloEtapa(prox)}</button>`
  return `
    <article class="lead-card">
      <a class="lead-link" href="#/leads/${l.id}">
        <strong>${esc(l.nome)}</strong>
        ${serv || valor ? `<span class="lead-servico">${serv ? esc(serv.nome) : ''}${serv && valor ? ' · ' : ''}${valor ? formatarReais(valor) : ''}</span>` : ''}
        <span class="lead-meta">${rotuloOrigem(l.origem)}${l.data_prevista ? ` · ensaio ${dataCurtaBR(l.data_prevista)}` : ''}${
          l.etapa === 'fechado' && l.data_sessao ? ` · sessão ${dataCurtaBR(l.data_sessao)}` : ''
        }</span>
        ${aberto ? seloFollowup(l.proximo_followup, hoje) : ''}
      </a>
      <div class="lead-acoes">
        <a class="btn-whats" href="${linkWhatsApp(l.whatsapp, l.nome, negocio.nome)}" target="_blank" rel="noopener" aria-label="WhatsApp de ${esc(l.nome)}">${iconeWhats}</a>
        ${acao}
      </div>
    </article>`
}

function filtrar(leads, hoje) {
  const q = _busca.trim().toLowerCase()
  const qDig = q.replace(/\D/g, '')
  return leads.filter((l) => {
    if (q && !l.nome.toLowerCase().includes(q) && !(qDig && l.whatsapp.includes(qDig))) return false
    if (_soFollowups) {
      const s = situacaoFollowup(l.proximo_followup, hoje)
      if (!ETAPAS_ABERTAS.includes(l.etapa) || (s !== 'atrasado' && s !== 'hoje')) return false
    }
    return true
  })
}

export function renderFunil(el, { leads, servicos, negocio, etapaAba }) {
  const hoje = hojeISO()
  const abertos = leads.filter((l) => ETAPAS_ABERTAS.includes(l.etapa))
  const atrasados = abertos.filter((l) => situacaoFollowup(l.proximo_followup, hoje) === 'atrasado').length
  const deHoje = abertos.filter((l) => situacaoFollowup(l.proximo_followup, hoje) === 'hoje').length
  const visiveis = filtrar(leads, hoje)
  const porEtapa = Object.fromEntries(ETAPAS.map((e) => [e.id, visiveis.filter((l) => l.etapa === e.id)]))

  // aba do celular: a do endereço, senão a primeira etapa aberta com gente
  const aba =
    ETAPAS.some((e) => e.id === etapaAba) ? etapaAba : ETAPAS_ABERTAS.find((e) => porEtapa[e].length) || 'novo'

  el.innerHTML = `
    <section class="modulo modulo-largo">
      <div class="leads-topo">
        <h1 class="titulo-grande">Leads</h1>
        <a class="botao" href="#/leads/novo">+ Novo lead</a>
      </div>

      ${
        leads.length
          ? `<div class="leads-filtros">
              <input type="search" class="entrada" id="busca" placeholder="Buscar por nome ou WhatsApp" value="${esc(_busca)}" />
              <button type="button" class="chip-filtro ${_soFollowups ? 'chip-on' : ''}" data-acao="so-followups" aria-pressed="${_soFollowups}">
                Follow-ups pendentes${atrasados + deHoje ? ` <b>${atrasados + deHoje}</b>` : ''}
              </button>
            </div>
            ${
              atrasados || deHoje
                ? `<p class="leads-aviso">${[
                    atrasados ? `<span class="txt-vermelho">${atrasados} atrasado${atrasados > 1 ? 's' : ''}</span>` : '',
                    deHoje ? `${deHoje} pra hoje` : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}</p>`
                : ''
            }
            <nav class="abas abas-etapas" aria-label="Etapas">
              ${ETAPAS.map(
                (e) => `<a class="aba ${e.id === aba ? 'aba-ativa' : ''}" href="#/leads/etapa/${e.id}">${e.curto} <span>${porEtapa[e.id].length}</span></a>`,
              ).join('')}
            </nav>
            <div class="funil">
              ${ETAPAS.map(
                (e) => `
                <div class="funil-coluna ${e.id === aba ? 'coluna-ativa' : ''} ${ETAPAS_ABERTAS.includes(e.id) ? '' : 'coluna-final'}">
                  <h2 class="funil-titulo">${e.rotulo} <span>${porEtapa[e.id].length}</span></h2>
                  <div class="funil-cartoes">
                    ${
                      porEtapa[e.id].length
                        ? porEtapa[e.id].map((l) => cartaoLead(l, servicos, negocio, hoje)).join('')
                        : '<p class="funil-vazio">Ninguém aqui.</p>'
                    }
                  </div>
                </div>`,
              ).join('')}
            </div>
            <p class="status-salvo" id="funil-status"></p>`
          : `<div class="em-breve">
              <p class="em-breve-frase">Todo mundo que pedir orçamento entra aqui.</p>
              <p class="modulo-intro">Cadastre o primeiro lead — pode ser alguém que te chamou hoje no Instagram ou no WhatsApp.</p>
              <a class="botao" href="#/leads/novo" style="display:inline-block;margin-top:14px;text-decoration:none">+ Cadastrar primeiro lead</a>
            </div>`
      }
    </section>`

  const redesenhar = () => renderFunil(el, { leads, servicos, negocio, etapaAba: aba })

  const busca = el.querySelector('#busca')
  busca?.addEventListener('input', () => {
    _busca = busca.value
    const pos = busca.selectionStart
    redesenhar()
    const nova = el.querySelector('#busca')
    nova.focus()
    nova.setSelectionRange(pos, pos)
  })
  el.querySelector('[data-acao="so-followups"]')?.addEventListener('click', () => {
    _soFollowups = !_soFollowups
    redesenhar()
  })

  el.querySelectorAll('[data-avancar]').forEach((b) =>
    b.addEventListener('click', async () => {
      b.disabled = true
      const { error } = await atualizarLead(b.dataset.avancar, { etapa: b.dataset.para })
      if (error) {
        b.disabled = false
        el.querySelector('#funil-status').textContent = mensagemDeErro(error)
        el.querySelector('#funil-status').dataset.tipo = 'erro'
        return
      }
      redesenhar()
    }),
  )
}
