// ────────────────────────────────────────────────────────────────
//  Financeiro › O mês: dinheiro na conta, fluxo de caixa em cascata
//  (a DRE da planilha), previstos e lançamentos pagos.
// ────────────────────────────────────────────────────────────────

import { esc } from '../../componentes/campos.js'
import {
  GRUPOS_DRE,
  fluxoDeCaixa,
  somarMeses,
  mesDe,
  formatarReais,
  paraCentavos,
} from '../../calculos.js'
import { hojeISO } from '../../format.js'
import { salvarConfig } from '../precos/dados.js'
import { marcarPago, lancarCustosFixos, mensagemDeErro } from './dados.js'

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const nomeMes = (mes) => {
  const [a, m] = mes.split('-').map(Number)
  return `${MESES[m - 1]} de ${a}`
}
const dataCurta = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const sinalDe = (grupo) => GRUPOS_DRE.find((g) => g.id === grupo)?.sinal || 1
const reaisSinal = (c) => (c < 0 ? '− ' : '') + formatarReais(Math.abs(c))

// ---- primeiro acesso ----
function telaConfigurar(mesHoje) {
  return `
    <section class="modulo">
      <h1 class="titulo-grande">Financeiro</h1>
      <form class="cartao-bloco dono-form" id="form-inicio" novalidate>
        <h2 class="bloco-titulo">Vamos começar</h2>
        <p class="modulo-intro">O Financeiro controla só o dinheiro do <strong>negócio</strong>. Pra calcular o saldo de cada mês,
          ele precisa saber de onde partir.</p>
        <label class="campo dono-campo"><span>Quanto tem hoje na conta do negócio?</span>
          <div class="entrada-prefixo"><em>R$</em><input type="text" inputmode="decimal" id="i-saldo" placeholder="0" /></div>
          <small class="campo-dica">Se ainda não separa conta PF e PJ, coloque o que está reservado pro negócio. Pode ser negativo.</small></label>
        <label class="campo dono-campo"><span>A partir de que mês você vai lançar tudo?</span>
          <input type="month" id="i-mes" value="${mesHoje}" /></label>
        <p class="form-erro" id="i-erro" hidden></p>
        <button type="submit" class="botao botao-grande">Começar</button>
      </form>
    </section>`
}

// ---- pedaços do mês ----
function linhaCascata(rotulo, valor, { cls = '', grupo = null, detalhes = null } = {}) {
  if (detalhes && Object.keys(detalhes).length) {
    const itens = Object.entries(detalhes)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, v]) => `<div class="cx-cat"><span>${esc(cat)}</span><span>${formatarReais(v)}</span></div>`)
      .join('')
    return `
      <details class="cx-linha cx-grupo ${cls}">
        <summary><span>${rotulo}</span><span>${reaisSinal(valor)}</span></summary>
        ${itens}
      </details>`
  }
  return `<div class="cx-linha ${cls}" ${grupo ? `data-grupo="${grupo}"` : ''}><span>${rotulo}</span><span>${reaisSinal(valor)}</span></div>`
}

function cascata(r) {
  const g = (id) => r.porGrupo[id]
  return `
    <div class="cartao-bloco cascata">
      <h2 class="bloco-titulo">Fluxo de caixa</h2>
      ${linhaCascata('Saldo inicial', r.saldoInicial, { cls: 'cx-saldo' })}
      ${linhaCascata('Receitas operacionais', g('receita_op').total, { detalhes: g('receita_op').categorias })}
      ${linhaCascata('Custo direto', -g('custo_direto').total, { detalhes: g('custo_direto').categorias })}
      ${linhaCascata('Margem', r.margem, { cls: 'cx-sub' })}
      ${linhaCascata('Custo variável', -g('custo_variavel').total, { detalhes: g('custo_variavel').categorias })}
      ${linhaCascata('Margem de contribuição', r.margemContribuicao, { cls: 'cx-sub' })}
      ${linhaCascata('Custos fixos <small>(com seu salário)</small>', -g('custo_fixo').total, { detalhes: g('custo_fixo').categorias })}
      ${linhaCascata('Margem líquida', r.margemLiquida, { cls: 'cx-sub ' + (r.margemLiquida < 0 ? 'cx-neg' : '') })}
      ${linhaCascata('Receitas não operacionais', g('receita_nao_op').total, { detalhes: g('receita_nao_op').categorias })}
      ${linhaCascata('Despesas não operacionais', -g('despesa_nao_op').total, { detalhes: g('despesa_nao_op').categorias })}
      ${linhaCascata('Desgaste dos equipamentos <small>(automático)</small>', -r.depreciacao)}
      ${linhaCascata('Resultado do mês', r.resultado, { cls: 'cx-sub ' + (r.resultado < 0 ? 'cx-neg' : '') })}
      ${linhaCascata('Saldo final', r.saldoFinal, { cls: 'cx-saldo cx-final' })}
    </div>`
}

function alertas(r) {
  const txt = {
    'margem-negativa': (a) => `<strong>O faturamento deste mês não pagou seus custos fixos</strong> (incluindo seu salário) — faltaram ${formatarReais(a.valor)}.`,
    'retirada-extra': (a) => `Você tirou <strong>${formatarReais(a.valor)} além do seu salário</strong> do caixa do negócio.`,
    'separar-imposto': (a) => `Você recebeu ${formatarReais(a.base)}. <strong>Separe ${formatarReais(a.valor)} de imposto.</strong>`,
  }
  return r.alertas
    .map((a) => `<p class="alerta ${a.tipo === 'separar-imposto' ? 'alerta-amarelo' : 'alerta-vermelho'}">${txt[a.tipo](a)}</p>`)
    .join('')
}

function itemLancamento(l, { comBotao = false, hoje } = {}) {
  const entrada = sinalDe(l.grupo) > 0
  const data = l.status === 'pago' ? l.pago_em : l.vencimento
  const atrasado = l.status === 'previsto' && l.vencimento < hoje
  return `
    <li class="lanc ${atrasado ? 'lanc-atrasado' : ''}">
      <a class="lanc-link" href="#/financeiro/lancamento/${l.id}">
        <span class="lanc-data">${dataCurta(data)}${atrasado ? ' · atrasado' : ''}</span>
        <span class="lanc-desc"><strong>${esc(l.descricao || l.categoria)}</strong>${l.descricao ? `<small>${esc(l.categoria)}</small>` : ''}</span>
        <span class="lanc-valor ${entrada ? 'lanc-entra' : 'lanc-sai'}">${entrada ? '+' : '−'} ${formatarReais(l.valor_centavos)}</span>
      </a>
      ${comBotao ? `<button type="button" class="mini-btn mini-btn-primario" data-pagar="${l.id}">${entrada ? 'Recebi' : 'Paguei'}</button>` : ''}
    </li>`
}

// ════════════════════════════════════════════════════════════════
export function renderMes(el, { mes, precos, lancamentos, base, recarregar }) {
  const cfg = precos.config
  const hoje = hojeISO()
  const mesHoje = mesDe(hoje)

  if (cfg.saldo_inicial_centavos == null || !cfg.mes_inicio) {
    el.innerHTML = telaConfigurar(mesHoje)
    const form = el.querySelector('#form-inicio')
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const txt = form.querySelector('#i-saldo').value.trim()
      const saldo = txt ? paraCentavos(txt) : 0
      const mesIni = form.querySelector('#i-mes').value
      const erro = form.querySelector('#i-erro')
      if (saldo == null) return ((erro.textContent = 'Confira o valor.'), (erro.hidden = false))
      if (!mesIni) return ((erro.textContent = 'Escolha o mês de início.'), (erro.hidden = false))
      form.querySelector('button').disabled = true
      const { error } = await salvarConfig({ saldo_inicial_centavos: saldo, mes_inicio: `${mesIni}-01` })
      if (error) {
        form.querySelector('button').disabled = false
        return ((erro.textContent = mensagemDeErro(error)), (erro.hidden = false))
      }
      location.hash = `#/financeiro/mes/${mesIni}`
      recarregar()
    })
    return
  }

  const mesInicio = mesDe(cfg.mes_inicio)
  const r = fluxoDeCaixa({
    lancamentos,
    equipamentos: precos.equipamentos,
    saldoInicialInformado: cfg.saldo_inicial_centavos,
    mesInicio,
    mes,
    custosFixosMes: base.custosFixosMes,
    impostoPct: cfg.imposto_pct,
  })

  const pagosNoMes = lancamentos
    .filter((l) => l.status === 'pago' && mesDe(l.pago_em) === mes)
    .sort((a, b) => b.pago_em.localeCompare(a.pago_em))
  // previstos do mês + os atrasados de antes (quando olhando o mês atual)
  const previstos = lancamentos
    .filter((l) => l.status === 'previsto' && (mesDe(l.vencimento) === mes || (mes === mesHoje && l.vencimento < `${mes}-01`)))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
  const soma = (lista, entra) => lista.filter((l) => (sinalDe(l.grupo) > 0) === entra).reduce((t, l) => t + l.valor_centavos, 0)

  el.innerHTML = `
    <section class="modulo modulo-largo">
      <div class="leads-topo">
        <h1 class="titulo-grande">Financeiro</h1>
        <div class="fin-botoes">
          <a class="botao" href="#/financeiro/novo/entrada/${mes}">+ Entrada</a>
          <a class="botao botao-escuro" href="#/financeiro/novo/saida/${mes}">+ Saída</a>
        </div>
      </div>

      <nav class="mes-nav" aria-label="Mês">
        ${mes > mesInicio ? `<a href="#/financeiro/mes/${somarMeses(mes, -1)}" aria-label="Mês anterior">‹</a>` : '<span></span>'}
        <strong>${nomeMes(mes).replace(/^./, (x) => x.toUpperCase())}</strong>
        <a href="#/financeiro/mes/${somarMeses(mes, 1)}" aria-label="Próximo mês">›</a>
      </nav>

      ${
        !r.ok
          ? `<p class="alerta alerta-amarelo">Seu controle começa em ${nomeMes(mesInicio)}. <a href="#/financeiro/mes/${mesInicio}">Ir pra ${nomeMes(mesInicio)}</a></p>`
          : `
      ${alertas(r)}
      <div class="fin-cards">
        <div class="fin-card fin-card-destaque">
          <span>Dinheiro na conta ${mes === mesHoje ? 'hoje' : 'no fim do mês'}</span>
          <strong>${reaisSinal(r.dinheiroNaConta)}</strong>
          <small>${r.reservaEquipamento > 0 ? `${formatarReais(r.reservaEquipamento)} disso é a reserva pra trocar equipamento` : 'o que o extrato deve mostrar'}</small>
        </div>
        <div class="fin-card">
          <span>Resultado do mês</span>
          <strong class="${r.resultado < 0 ? 'txt-vermelho' : 'txt-verde'}">${reaisSinal(r.resultado)}</strong>
          <small>margem líquida ${reaisSinal(r.margemLiquida)}</small>
        </div>
        <div class="fin-card">
          <span>Fôlego</span>
          <strong>${r.folego == null ? '—' : r.folego === 0 ? 'menos de 1 mês' : `${r.folego} ${r.folego === 1 ? 'mês' : 'meses'}`}</strong>
          <small>${r.folego == null ? 'cadastre seus custos fixos em Preços' : 'de custos fixos que seu saldo aguenta'}</small>
        </div>
      </div>

      <div class="fin-grid">
        ${cascata(r)}
        <div>
          <div class="cartao-bloco">
            <div class="bloco-cabeca">
              <h2 class="bloco-titulo">Previsto${mes === mesHoje ? ' e atrasado' : ''}</h2>
              <button type="button" class="mini-btn" data-acao="fixos">Lançar custos fixos do mês</button>
            </div>
            <p class="campo-dica fin-prev-resumo">Vai entrar ${formatarReais(soma(previstos, true))} · vai sair ${formatarReais(soma(previstos, false))}</p>
            <p class="status-salvo" id="fin-status"></p>
            ${
              previstos.length
                ? `<ul class="lanc-lista">${previstos.map((l) => itemLancamento(l, { comBotao: true, hoje })).join('')}</ul>`
                : '<p class="vazio-mini">Nada previsto.</p>'
            }
          </div>
          <div class="cartao-bloco">
            <h2 class="bloco-titulo">Pago e recebido no mês</h2>
            ${
              pagosNoMes.length
                ? `<ul class="lanc-lista">${pagosNoMes.map((l) => itemLancamento(l, { hoje })).join('')}</ul>`
                : '<p class="vazio-mini">Nenhum lançamento pago neste mês.</p>'
            }
          </div>
        </div>
      </div>`
      }
    </section>`

  const status = (msg, tipo = 'ok') => {
    const s = el.querySelector('#fin-status')
    if (!s) return
    s.textContent = msg
    s.dataset.tipo = tipo
  }

  el.querySelectorAll('[data-pagar]').forEach((b) =>
    b.addEventListener('click', async () => {
      b.disabled = true
      const { error } = await marcarPago(b.dataset.pagar, hoje)
      if (error) {
        b.disabled = false
        return status(mensagemDeErro(error), 'erro')
      }
      recarregar()
    }),
  )

  el.querySelector('[data-acao="fixos"]')?.addEventListener('click', async (e) => {
    e.target.disabled = true
    const { criados, error } = await lancarCustosFixos(mes)
    if (error) {
      e.target.disabled = false
      return status(mensagemDeErro(error), 'erro')
    }
    await recarregar()
    const s = el.querySelector('#fin-status')
    if (s) {
      s.textContent = criados
        ? `${criados} ${criados === 1 ? 'custo lançado' : 'custos lançados'} como previstos ✓`
        : 'Os custos fixos deste mês já estavam lançados (ou estão zerados em Preços).'
      s.dataset.tipo = criados ? 'ok' : 'info'
    }
  })
}

