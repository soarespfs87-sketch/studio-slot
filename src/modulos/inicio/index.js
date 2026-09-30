// ────────────────────────────────────────────────────────────────
//  Início — o painel do dia
//  Checklist de primeiro acesso, o que fazer hoje (follow-ups e
//  lembretes), ações de venda, o mês, o funil, campanhas e preços
//  abaixo do mínimo. Só lê: cada item leva pra tela certa.
// ────────────────────────────────────────────────────────────────

import { esc } from '../../componentes/campos.js'
import { hojeISO } from '../../format.js'
import {
  formatarReais,
  formatarPct,
  precoDoServico,
  resultadoDoMes,
  depreciacaoNoMes,
  mesDe,
} from '../../calculos.js'
import { carregarPrecos } from '../precos/dados.js'
import { baseAtual } from '../precos/ui.js'
import { calcularVendas } from '../precos/vendas.js'
import { carregarLeads } from '../leads/dados.js'
import { ETAPAS, ETAPAS_ABERTAS, situacaoFollowup, linkWhatsApp, rotuloEtapa } from '../leads/regras.js'
import { carregarLancamentos } from '../financeiro/dados.js'
import { nomeMes } from '../financeiro/mes.js'
import { carregarClientes, marcarLembreteFeito, mensagemDeErro } from '../clientes/dados.js'
import { calcularLembretes } from '../clientes/regras.js'
import { itemLembrete } from '../clientes/ui.js'
import { iconeWhats, dataCurtaBR } from '../leads/ui.js'
import { metricasCRM, checklist, campanhasAtivas } from './regras.js'

const DIAS_SEMANA = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado']

function saudacao() {
  const h = new Date().getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

function blocoChecklist(c) {
  if (c.completo) return ''
  return `
    <div class="cartao-bloco checklist">
      <div class="bloco-cabeca">
        <h2 class="bloco-titulo">Primeiros passos</h2>
        <span class="checklist-conta">${c.feitos} de ${c.total}</span>
      </div>
      <div class="cv-barra"><span style="width:${Math.round((c.feitos / c.total) * 100)}%"></span></div>
      <ol class="checklist-lista">
        ${c.passos
          .map((p) =>
            p.feito
              ? `<li class="ck-feito"><span class="ck-marca">✓</span><s>${p.texto}</s></li>`
              : `<li><span class="ck-marca"></span><a href="${p.link}">${p.texto} →</a></li>`,
          )
          .join('')}
      </ol>
    </div>`
}

function itemFollowup(l, negocio, hoje) {
  const s = situacaoFollowup(l.proximo_followup, hoje)
  return `
    <li class="lembrete ${s === 'atrasado' ? 'lembrete-atrasado' : 'lembrete-hoje'}">
      <div class="lb-texto">
        <span class="lb-tag">${s === 'atrasado' ? `📌 Follow-up atrasado · era ${dataCurtaBR(l.proximo_followup)}` : '📌 Follow-up de hoje'}</span>
        <strong><a href="#/leads/${l.id}">${esc(l.nome)}</a></strong>
        <span class="lb-cliente">${rotuloEtapa(l.etapa)}</span>
      </div>
      <div class="lb-acoes">
        <a class="btn-whats" href="${linkWhatsApp(l.whatsapp, l.nome, negocio.nome)}" target="_blank" rel="noopener" aria-label="WhatsApp de ${esc(l.nome)}">${iconeWhats}</a>
        <a class="mini-btn" href="#/leads/${l.id}">Abrir</a>
      </div>
    </li>`
}

export async function render(el, ctx) {
  if (!el.querySelector('.modulo')) {
    el.innerHTML = `<section class="modulo"><h1 class="titulo-grande">${esc(ctx.negocio.nome)}</h1><p class="vazio">Carregando…</p></section>`
  }
  const id = ctx.negocio.id
  const [rp, rl, rf, rc] = await Promise.all([
    carregarPrecos(id),
    carregarLeads(id, { recarregar: true }),
    carregarLancamentos(id),
    carregarClientes(id),
  ])
  if (location.hash.replace(/^#\/?/, '').split('/')[0] !== 'inicio' && location.hash.replace(/^#\/?/, '') !== '') return
  const error = rp.error || rl.error || rf.error || rc.error
  if (error) {
    el.innerHTML = `<section class="modulo"><h1 class="titulo-grande">${esc(ctx.negocio.nome)}</h1>
      <p class="form-erro">Não consegui carregar o painel: ${mensagemDeErro(error)}</p>
      <button class="botao" data-acao="tentar">Tentar de novo</button></section>`
    el.querySelector('[data-acao="tentar"]').addEventListener('click', () => render(el, ctx))
    return
  }

  const hoje = hojeISO()
  const mes = mesDe(hoje)
  const { config, custos, equipamentos, servicos } = rp.dados
  const leads = rl.leads
  const lancamentos = rf.lancamentos
  const base = baseAtual(rp.dados)
  const negocio = ctx.negocio

  // ---- o que fazer ----
  const followups = leads
    .filter((l) => ETAPAS_ABERTAS.includes(l.etapa) && ['atrasado', 'hoje'].includes(situacaoFollowup(l.proximo_followup, hoje)))
    .sort((a, b) => a.proximo_followup.localeCompare(b.proximo_followup))

  // clientes com compras (pra recompra) e lembretes
  const porCliente = {}
  for (const l of leads) if (l.etapa === 'fechado' && l.cliente_id && l.data_sessao) {
    if (!porCliente[l.cliente_id] || l.data_sessao > porCliente[l.cliente_id]) porCliente[l.cliente_id] = l.data_sessao
  }
  const clientes = rc.dados.clientes.map((c) => ({ ...c, ultimaCompra: porCliente[c.id] || null }))
  const whats = Object.fromEntries(clientes.map((c) => [c.id, c.whatsapp]))
  const lembretes = calcularLembretes({ clientes, config, hoje, feitos: rc.dados.feitos, negocio: negocio.nome })
  const carinhoDaSemana = lembretes.filter((l) => !l.venda && l.dias <= 7)
  const vendas = lembretes.filter((l) => l.venda)

  // ---- o mês ----
  const pagosNoMes = lancamentos.filter((l) => l.status === 'pago' && mesDe(l.pago_em) === mes)
  const r = resultadoDoMes(pagosNoMes, depreciacaoNoMes(equipamentos, mes))
  const aReceber = lancamentos
    .filter((l) => l.status === 'previsto' && l.grupo === 'receita_op' && mesDe(l.vencimento) <= mes)
    .reduce((t, l) => t + l.valor_centavos, 0)
  const financeiroPronto = config.saldo_inicial_centavos != null

  // ---- funil, CRM, campanhas, preços ----
  const porEtapa = Object.fromEntries(ETAPAS.map((e) => [e.id, leads.filter((l) => l.etapa === e.id).length]))
  const crm = metricasCRM(leads, mes)
  const vendasServ = calcularVendas(leads, lancamentos)
  const campanhas = campanhasAtivas(servicos, hoje).map((s) => ({ s, r: precoDoServico(s, base.baseRateio), v: vendasServ[s.id] || { vendidas: 0 } }))
  const abaixo = servicos
    .map((s) => ({ s, r: precoDoServico(s, base.baseRateio) }))
    .filter(({ r }) => r.ok && r.semaforo === 'vermelho')
  const ck = checklist({ config, custos, equipamentos, servicos, leads })

  const d = new Date()
  const nadaPraHoje = !followups.length && !carinhoDaSemana.length

  el.innerHTML = `
    <section class="modulo modulo-largo">
      <p class="modulo-sobre">${DIAS_SEMANA[d.getDay()]}, ${d.getDate()} de ${nomeMes(mes).split(' de ')[0]}</p>
      <h1 class="titulo-grande">${saudacao()}! <span class="inicio-negocio">${esc(negocio.nome)}</span></h1>
      <p class="status-salvo" id="ini-status"></p>

      ${blocoChecklist(ck)}

      <div class="fin-grid inicio-grid">
        <div>
          <div class="cartao-bloco">
            <h2 class="bloco-titulo">Pra fazer</h2>
            ${
              nadaPraHoje
                ? '<p class="vazio-mini">Nenhum follow-up ou lembrete pra esta semana. 🌿</p>'
                : `<ul class="lembretes">
                    ${followups.map((l) => itemFollowup(l, negocio, hoje)).join('')}
                    ${carinhoDaSemana.map((l) => itemLembrete(l, whats[l.clienteId])).join('')}
                  </ul>`
            }
          </div>
          ${
            vendas.length
              ? `<div class="cartao-bloco">
                  <h2 class="bloco-titulo">Ações de venda</h2>
                  <ul class="lembretes">${vendas.map((l) => itemLembrete(l, whats[l.clienteId])).join('')}</ul>
                </div>`
              : ''
          }
          ${
            campanhas.length
              ? `<div class="cartao-bloco">
                  <h2 class="bloco-titulo">Campanhas</h2>
                  ${campanhas
                    .map(({ s, r, v }) => {
                      const faltam = r.ok && r.sessoesParaCenario != null ? Math.max(0, r.sessoesParaCenario - v.vendidas) : null
                      const pct = Math.min(100, Math.round((v.vendidas / s.vagas) * 100))
                      return `
                      <a class="campanha-item" href="#/precos/campanha/${s.id}">
                        <div class="bloco-cabeca"><strong>${esc(s.nome)}</strong><span class="lead-meta">${dataCurtaBR(s.inicio)} a ${dataCurtaBR(s.fim)}</span></div>
                        <div class="cv-barra"><span style="width:${pct}%"></span></div>
                        <span class="lead-servico">${v.vendidas} de ${s.vagas} vagas vendidas${
                          faltam == null ? ' · o cenário não se paga nesse preço' : faltam > 0 ? ` · faltam ${faltam} pro cenário se pagar` : ' · cenário pago ✓'
                        }</span>
                      </a>`
                    })
                    .join('')}
                </div>`
              : ''
          }
        </div>

        <div>
          <a class="cartao-bloco inicio-mes" href="#/financeiro">
            <div class="bloco-cabeca"><h2 class="bloco-titulo">${nomeMes(mes).replace(/^./, (x) => x.toUpperCase())}</h2><span class="lead-meta">Financeiro →</span></div>
            <div class="fin-cards inicio-cards">
              <div class="fin-card"><span>Recebido</span><strong class="txt-verde">${formatarReais(r.receitasOp)}</strong></div>
              <div class="fin-card"><span>A receber</span><strong>${formatarReais(aReceber)}</strong><small>no mês e atrasado</small></div>
              <div class="fin-card"><span>Margem líquida</span><strong class="${r.margemLiquida < 0 ? 'txt-vermelho' : ''}">${formatarReais(r.margemLiquida)}</strong><small>depois dos custos fixos e do seu salário</small></div>
            </div>
            ${financeiroPronto ? '' : '<p class="alerta alerta-amarelo">Informe o saldo do negócio pra ver o dinheiro na conta.</p>'}
          </a>

          <div class="cartao-bloco">
            <div class="bloco-cabeca"><h2 class="bloco-titulo">Leads</h2><a class="lead-meta" href="#/leads">funil →</a></div>
            <div class="funil-mini">
              ${ETAPAS_ABERTAS.map((e) => `<a href="#/leads/etapa/${e}"><strong>${porEtapa[e]}</strong><span>${rotuloEtapa(e)}</span></a>`).join('')}
            </div>
            <dl class="res-detalhe">
              <div class="rl"><dt>Leads novos no mês</dt><dd>${crm.novos}</dd></div>
              <div class="rl"><dt>Conversão <small>(fechados ÷ decididos no mês)</small></dt><dd>${crm.conversao == null ? '—' : formatarPct(crm.conversao, 0)} <small>${crm.fechados} de ${crm.fechados + crm.perdidos}</small></dd></div>
              <div class="rl"><dt>Valor fechado no mês</dt><dd>${formatarReais(crm.valorFechado)}</dd></div>
              ${crm.motivoMaisComum ? `<div class="rl"><dt>Mais perde por</dt><dd>${esc(crm.motivoMaisComum)}</dd></div>` : ''}
            </dl>
          </div>

          ${
            abaixo.length
              ? `<div class="cartao-bloco">
                  <h2 class="bloco-titulo">Preços abaixo do mínimo</h2>
                  <ul class="lanc-lista">${abaixo
                    .map(
                      ({ s, r }) => `<li class="lanc"><a class="lanc-link lanc-link-2" href="#/precos/${s.tipo}/${s.id}">
                        <span class="lanc-desc"><strong>${esc(s.nome)}</strong><small>mínimo ${formatarReais(r.precoMinimo)}</small></span>
                        <span class="lanc-valor txt-vermelho">${formatarReais(r.precoCobrado)}</span></a></li>`,
                    )
                    .join('')}</ul>
                </div>`
              : ''
          }
        </div>
      </div>
    </section>`

  el.querySelectorAll('[data-feito]').forEach((b) =>
    b.addEventListener('click', async () => {
      b.disabled = true
      const { error: e } = await marcarLembreteFeito(b.dataset.cliente, b.dataset.feito)
      if (e) {
        b.disabled = false
        const s = el.querySelector('#ini-status')
        s.textContent = mensagemDeErro(e)
        s.dataset.tipo = 'erro'
        return
      }
      render(el, ctx)
    }),
  )
}
