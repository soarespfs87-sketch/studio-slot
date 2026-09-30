// ────────────────────────────────────────────────────────────────
//  Preços › Pacotes e Campanhas temáticas
//  Lista com o semáforo de cada um + editor que recalcula o preço
//  enquanto a pessoa digita (fórmulas em src/calculos.js).
// ────────────────────────────────────────────────────────────────

import { salvarServico, arquivarServico, mensagemDeErro } from './dados.js'
import {
  esc,
  formatarReais,
  formatarPct,
  baseAtual,
  resumoBase,
  campoDinheiro,
  campoNumero,
  lerCentavos,
  lerNumero,
  lerTexto,
  pilulaSemaforo,
} from './ui.js'
import { precoDoServico, arredondarPraCimaDe10, centavosParaCampo, paraCentavos, paraNumero } from '../../calculos.js'
import { dataCurta } from '../../format.js'

const GRUPOS = [
  ['equipe', 'Equipe'],
  ['deslocamento', 'Deslocamento'],
  ['extra', 'Extra'],
  ['kit', 'Kit de boas-vindas'],
  ['embalagem', 'Embalagem e entrega'],
  ['outro', 'Outro'],
]
// Atalhos pra adicionar custo (os nomes da planilha).
const ATALHOS = [
  ['equipe', '1º fotógrafo'],
  ['equipe', '2º fotógrafo'],
  ['equipe', 'Assistente'],
  ['equipe', 'Editor de foto'],
  ['equipe', 'Editor de vídeo'],
  ['deslocamento', 'Deslocamento'],
  ['extra', 'Extra'],
  ['kit', 'Kit de boas-vindas'],
  ['embalagem', 'Embalagem e entrega'],
]
const INVESTIMENTOS = ['Cenário', 'Objetos de cena', 'Aluguel de espaço', 'Anúncios']

const NOME = {
  pacote: { um: 'pacote', novo: 'Novo pacote', lista: 'pacotes', titulo: 'Pacotes' },
  campanha: { um: 'campanha', novo: 'Nova campanha', lista: 'campanhas', titulo: 'Campanhas temáticas' },
}

// ════════════════════════════════════════════════════════════════
//  Lista
// ════════════════════════════════════════════════════════════════
function cartaoServico(s, baseRateio) {
  const r = precoDoServico(s, baseRateio)
  const periodo =
    s.tipo === 'campanha' && s.inicio ? `<span>${dataCurta(s.inicio)} a ${dataCurta(s.fim)}</span>` : ''
  if (!r.ok) {
    return `
      <a class="servico-card" href="#/precos/${s.tipo}/${s.id}">
        <div class="sc-topo"><strong>${esc(s.nome)}</strong></div>
        <p class="sc-falta">${r.falta}</p>
      </a>`
  }
  return `
    <a class="servico-card" href="#/precos/${s.tipo}/${s.id}">
      <div class="sc-topo"><strong>${esc(s.nome)}</strong>${pilulaSemaforo(r.semaforo)}</div>
      <div class="sc-precos">
        <div><span>Você cobra</span><strong>${formatarReais(r.precoCobrado)}</strong></div>
        <div><span>Sugerido</span><strong>${formatarReais(r.precoAPrazo)}</strong></div>
        <div><span>Mínimo</span><strong>${formatarReais(r.precoMinimo)}</strong></div>
      </div>
      <div class="sc-sub">
        <span>Margem real ${formatarPct(r.margemReal)} (pediu ${formatarPct(s.margem_pct, 0)})</span>
        ${
          s.tipo === 'campanha'
            ? `<span>${r.sessoesParaCenario == null ? 'o cenário não se paga' : `${r.sessoesParaCenario} de ${s.vagas} vagas pagam o cenário`}</span>${periodo}`
            : `<span>até ${s.limite_operacional}/mês</span>`
        }
      </div>
    </a>`
}

export function renderLista(el, dados, tipo) {
  const base = baseAtual(dados)
  const itens = dados.servicos.filter((s) => s.tipo === tipo)
  const n = NOME[tipo]
  el.innerHTML = `
    ${resumoBase(base, { comLink: true })}
    <div class="lista-topo">
      <p class="campo-dica">${
        tipo === 'campanha'
          ? 'Ensaios de data especial (Natal, Dia das Mães…) em que você investe em cenário.'
          : 'Cada pacote carrega uma parte dos seus custos fixos, conforme quantos você consegue entregar por mês.'
      }</p>
      <a class="botao" href="#/precos/${tipo}/novo">+ ${n.novo}</a>
    </div>
    <div class="servicos-lista">
      ${
        itens.length
          ? itens.map((s) => cartaoServico(s, base.baseRateio)).join('')
          : `<p class="vazio-mini">Nenhum${tipo === 'campanha' ? 'a campanha' : ' pacote'} ainda.</p>`
      }
    </div>`
}

// ════════════════════════════════════════════════════════════════
//  Editor
// ════════════════════════════════════════════════════════════════
function servicoEmBranco(tipo, config) {
  return {
    tipo,
    nome: '',
    entregaveis: '',
    limite_operacional: null,
    itens: [],
    margem_pct: config.margem_pct,
    comissao_pct: config.comissao_pct,
    imposto_pct: config.imposto_pct,
    taxa_pct: config.taxa_pct,
    preco_final_centavos: null,
    inicio: null,
    fim: null,
    vagas: null,
    usos_cenario: 1,
    investimento: [],
  }
}

function linhaItem(it, i) {
  return `
    <div class="linha-edit linha-item" data-i="${i}">
      <select class="entrada" data-campo="grupo" aria-label="Grupo">
        ${GRUPOS.map(([v, r]) => `<option value="${v}" ${it.grupo === v ? 'selected' : ''}>${r}</option>`).join('')}
      </select>
      <input class="entrada" data-campo="nome" value="${esc(it.nome)}" placeholder="Descrição" aria-label="Descrição" />
      <div class="entrada-prefixo"><em>R$</em>
        <input class="entrada" data-campo="valor" inputmode="decimal" value="${esc(centavosParaCampo(it.valor_unit_centavos))}" aria-label="Valor unitário" /></div>
      <div class="entrada-prefixo li-qtd"><em>×</em>
        <input class="entrada" data-campo="qtd" inputmode="decimal" value="${esc(String(it.quantidade ?? 1).replace('.', ','))}" aria-label="Quantidade" /></div>
      <span class="li-sub" data-sub></span>
      <button type="button" class="btn-remover" data-remover-item="${i}" aria-label="Remover">&times;</button>
    </div>`
}

function linhaInvest(inv, i) {
  return `
    <div class="linha-edit linha-invest" data-i="${i}">
      <input class="entrada" data-campo="nome" value="${esc(inv.nome)}" placeholder="Descrição" aria-label="Descrição" />
      <div class="entrada-prefixo"><em>R$</em>
        <input class="entrada" data-campo="valor" inputmode="decimal" value="${esc(centavosParaCampo(inv.valor_centavos))}" aria-label="Valor" /></div>
      <button type="button" class="btn-remover" data-remover-invest="${i}" aria-label="Remover">&times;</button>
    </div>`
}

function formEditor(s, ehNovo) {
  const n = NOME[s.tipo]
  const campanha = s.tipo === 'campanha'
  return `
    <form id="form-servico" class="dono-form" novalidate>
      <div class="cartao-bloco">
        <h2 class="bloco-titulo">${campanha ? 'A campanha' : 'O pacote'}</h2>
        <label class="campo dono-campo"><span>Nome</span>
          <input type="text" id="s-nome" value="${esc(s.nome)}" placeholder="${campanha ? 'Ex.: Minissessão de Natal' : 'Ex.: As quatro estações'}" /></label>
        <label class="campo dono-campo"><span>O que está incluído</span>
          <textarea id="s-entregaveis" rows="2" placeholder="Ex.: 3 sessões, 30 fotos editadas, álbum 20x20">${esc(s.entregaveis)}</textarea></label>
        ${campoNumero('s-limite', campanha ? 'Quantas sessões dessas você consegue fazer por mês' : 'Quantos desses você consegue entregar por mês', s.limite_operacional, {
          inteiro: true,
          dica: 'Mantendo seu padrão de qualidade. É o que divide seus custos fixos.',
        })}
      </div>

      ${
        campanha
          ? `<div class="cartao-bloco">
              <h2 class="bloco-titulo">Período e investimento</h2>
              <div class="dono-grid2">
                <label class="campo dono-campo"><span>Começa em</span><input type="date" id="s-inicio" value="${s.inicio || ''}" /></label>
                <label class="campo dono-campo"><span>Termina em</span><input type="date" id="s-fim" value="${s.fim || ''}" /></label>
                ${campoNumero('s-vagas', 'Vagas que vai abrir', s.vagas, { inteiro: true })}
                ${campoNumero('s-usos', 'Vai usar o cenário em quantas campanhas?', s.usos_cenario, {
                  inteiro: true,
                  dica: 'Ex.: o cenário de Natal serve 2 anos → 2.',
                })}
              </div>
              <h3 class="sub-titulo">Investimento da campanha</h3>
              <div class="linhas" id="lista-invest">${s.investimento.map(linhaInvest).join('')}</div>
              <div class="atalhos">
                ${INVESTIMENTOS.map((nm) => `<button type="button" class="mini-btn" data-add-invest="${esc(nm)}">+ ${nm}</button>`).join('')}
                <button type="button" class="mini-btn" data-add-invest="">+ Outro</button>
              </div>
            </div>`
          : ''
      }

      <div class="cartao-bloco">
        <h2 class="bloco-titulo">Custos ${campanha ? 'de cada sessão' : 'do pacote'}</h2>
        <p class="campo-dica">Valor × quantidade (ex.: deslocamento R$ 60 × 3 sessões).</p>
        <div class="linhas" id="lista-itens">${s.itens.map(linhaItem).join('')}</div>
        <div class="atalhos">
          ${ATALHOS.map(([g, nm]) => `<button type="button" class="mini-btn" data-add-item="${g}|${esc(nm)}">+ ${nm}</button>`).join('')}
          <button type="button" class="mini-btn" data-add-item="outro|">+ Outro</button>
        </div>
      </div>

      <div class="cartao-bloco">
        <h2 class="bloco-titulo">Percentuais</h2>
        <p class="campo-dica">Vêm da sua base do negócio. Mude só se ${campanha ? 'esta campanha' : 'este pacote'} for diferente.</p>
        <div class="dono-grid2">
          ${campoNumero('s-margem', 'Margem de lucro', s.margem_pct, { sufixo: '%' })}
          ${campoNumero('s-comissao', 'Comissão de venda', s.comissao_pct, { sufixo: '%' })}
          ${campoNumero('s-imposto', 'Imposto', s.imposto_pct, { sufixo: '%' })}
          ${campoNumero('s-taxa', 'Taxa do cartão', s.taxa_pct, { sufixo: '%' })}
        </div>
      </div>

      <div class="cartao-bloco">
        <h2 class="bloco-titulo">Quanto você cobra</h2>
        ${campoDinheiro('s-preco', 'Preço final (o que você cobra de verdade)', s.preco_final_centavos, {
          placeholder: 'Em branco = o preço sugerido',
          dica: 'É a linha "VENDA" da sua planilha. Pode arredondar do seu jeito.',
        })}
      </div>

      <p class="form-erro" id="s-erro" hidden></p>
      <div class="barra-salvar">
        <div class="mini-resumo" id="mini-resumo" aria-hidden="true"></div>
        <a class="botao botao-fantasma" href="#/precos/${n.lista}">Cancelar</a>
        <button type="submit" class="botao">Salvar ${n.um}</button>
      </div>
      ${ehNovo ? '' : `<button type="button" class="link-arquivar" data-acao="arquivar">Arquivar ${n.um}</button>`}
    </form>`
}

function painelResultado(s, r) {
  if (!r.ok) {
    return `<div class="resultado"><p class="resultado-falta">${r.falta}</p></div>`
  }
  const campanha = s.tipo === 'campanha'
  const pctTotal = (s.comissao_pct || 0) + (s.imposto_pct || 0) + (s.taxa_pct || 0)
  const sugeridoRedondo = arredondarPraCimaDe10(r.precoAPrazo)

  const alertas = []
  if (r.prejuizoPorVenda)
    alertas.push(['vermelho', `<strong>Cada ${campanha ? 'sessão' : 'pacote'} dá prejuízo</strong> — o preço não cobre nem os custos ${campanha ? 'da sessão' : 'do pacote'}.`])
  if (campanha && r.sessoesParaCenario == null && r.investimentoNesta > 0)
    alertas.push(['vermelho', 'Nesse preço o cenário <strong>nunca se paga</strong>.'])
  else if (campanha && r.cenarioNaoSePaga)
    alertas.push(['amarelo', `Com ${s.vagas} vagas o cenário não se paga (precisa de ${r.sessoesParaCenario}). Suba o preço ou abra mais vagas.`])
  if (!campanha && r.naoPagaFixosNoLimite)
    alertas.push(['amarelo', `Mesmo no seu limite de ${s.limite_operacional} por mês, esse pacote sozinho não paga seus custos fixos (precisaria de ${r.pacotesParaFixos}).`])

  const linha = (rotulo, valor, cls = '') => `<div class="rl ${cls}"><dt>${rotulo}</dt><dd>${valor}</dd></div>`

  return `
    <div class="resultado">
      <div class="res-cobrado res-${r.semaforo}">
        <span>${r.usaPrecoFinal ? 'Você cobra' : 'Preço sugerido'}</span>
        <strong>${formatarReais(r.precoCobrado)}</strong>
        ${pilulaSemaforo(r.semaforo)}
      </div>

      <dl class="res-precos">
        ${linha('A prazo <small>sugerido · cartão</small>', formatarReais(r.precoAPrazo))}
        ${linha('À vista <small>Pix/dinheiro, sem taxa</small>', formatarReais(r.precoAVista))}
        ${linha('Mínimo <small>sem lucro nenhum</small>', formatarReais(r.precoMinimo))}
      </dl>
      ${
        r.usaPrecoFinal && sugeridoRedondo !== Math.round(r.precoCobrado)
          ? `<button type="button" class="mini-btn mini-btn-primario" data-acao="usar-sugerido">Usar preço sugerido (${formatarReais(sugeridoRedondo)})</button>`
          : ''
      }

      ${
        campanha && r.investimentoNesta > 0 && r.sessoesParaCenario != null
          ? `<div class="res-destaque">Você precisa vender <strong>${r.sessoesParaCenario} ${r.sessoesParaCenario === 1 ? 'sessão' : 'sessões'}</strong> pra o cenário se pagar <small>(de ${s.vagas} vagas)</small></div>`
          : ''
      }
      ${alertas.map(([cor, txt]) => `<p class="alerta alerta-${cor}">${txt}</p>`).join('')}

      <dl class="res-detalhe">
        ${linha(campanha ? 'Custos da sessão' : 'Custos do pacote', formatarReais(r.custoItens))}
        ${linha('Parte dos custos fixos', formatarReais(r.cfo))}
        ${campanha ? linha('Parte do cenário', formatarReais(r.cenarioPorSessao)) : ''}
        ${linha('Custo total', formatarReais(r.custoTotal), 'rl-forte')}
        ${linha(`Comissão + imposto + taxa (${formatarPct(pctTotal, 0)})`, '− ' + formatarReais(r.descontos))}
        ${linha('Lucro', formatarReais(r.lucro), 'rl-forte' + (r.lucro < 0 ? ' rl-neg' : ''))}
        ${linha('Lucratividade', formatarPct(r.lucratividade))}
        ${linha('Margem real sobre o custo', `${formatarPct(r.margemReal)} <small>(pediu ${formatarPct(s.margem_pct, 0)})</small>`)}
        ${!campanha && r.pacotesParaFixos ? linha('Pagam todos os custos fixos', `${r.pacotesParaFixos} por mês`) : ''}
      </dl>
    </div>`
}

// Lê o formulário inteiro pro rascunho (s). Não valida — só lê.
function lerFormulario(form, s) {
  s.nome = lerTexto(form, '#s-nome')
  s.entregaveis = lerTexto(form, '#s-entregaveis')
  s.limite_operacional = lerNumero(form, '#s-limite')
  s.margem_pct = lerNumero(form, '#s-margem')
  s.comissao_pct = lerNumero(form, '#s-comissao')
  s.imposto_pct = lerNumero(form, '#s-imposto')
  s.taxa_pct = lerNumero(form, '#s-taxa')
  s.preco_final_centavos = lerCentavos(form, '#s-preco')
  s.itens = [...form.querySelectorAll('.linha-item')].map((l) => ({
    grupo: l.querySelector('[data-campo="grupo"]').value,
    nome: l.querySelector('[data-campo="nome"]').value.trim(),
    valor_unit_centavos: paraCentavos(l.querySelector('[data-campo="valor"]').value),
    quantidade: paraNumero(l.querySelector('[data-campo="qtd"]').value),
  }))
  if (s.tipo === 'campanha') {
    s.inicio = form.querySelector('#s-inicio').value || null
    s.fim = form.querySelector('#s-fim').value || null
    s.vagas = lerNumero(form, '#s-vagas')
    s.usos_cenario = lerNumero(form, '#s-usos')
    s.investimento = [...form.querySelectorAll('.linha-invest')].map((l) => ({
      nome: l.querySelector('[data-campo="nome"]').value.trim(),
      valor_centavos: paraCentavos(l.querySelector('[data-campo="valor"]').value),
    }))
  }
}

function validar(s) {
  const inteiroPositivo = (v) => Number.isInteger(v) && v > 0
  if (!s.nome) return 'Dê um nome.'
  if (!inteiroPositivo(s.limite_operacional)) return 'Quantos por mês: um número inteiro maior que zero.'
  if (s.margem_pct == null || s.margem_pct < 0 || s.margem_pct > 500) return 'Margem: de 0% a 500%.'
  for (const [v, nome, max] of [
    [s.comissao_pct, 'Comissão', 50],
    [s.imposto_pct, 'Imposto', 50],
    [s.taxa_pct, 'Taxa do cartão', 20],
  ]) {
    if (v == null || v < 0 || v > max) return `${nome}: de 0% a ${max}%.`
  }
  if (s.comissao_pct + s.imposto_pct + s.taxa_pct >= 100) return 'Comissão + imposto + taxa passam de 100%.'
  for (const it of s.itens) {
    if (it.valor_unit_centavos == null || it.valor_unit_centavos < 0) return `Confira o valor de "${it.nome || 'um custo'}".`
    if (it.quantidade == null || it.quantidade <= 0) return `Confira a quantidade de "${it.nome || 'um custo'}".`
  }
  if (s.preco_final_centavos != null && s.preco_final_centavos <= 0) return 'O preço final precisa ser maior que zero (ou deixe em branco).'
  if (s.tipo === 'campanha') {
    if (!s.inicio || !s.fim) return 'Preencha o período da campanha.'
    if (s.fim < s.inicio) return 'A campanha termina antes de começar.'
    if (!inteiroPositivo(s.vagas)) return 'Vagas: um número inteiro maior que zero.'
    if (!inteiroPositivo(s.usos_cenario)) return 'Uso do cenário: pelo menos 1 campanha.'
    for (const inv of s.investimento) {
      if (inv.valor_centavos == null || inv.valor_centavos < 0) return `Confira o valor de "${inv.nome || 'um investimento'}".`
    }
  }
  return null
}

export function renderEditor(el, dados, tipo, id) {
  const ehNovo = !id || id === 'novo'
  const existente = ehNovo ? null : dados.servicos.find((s) => s.id === id && s.tipo === tipo)
  if (!ehNovo && !existente) {
    el.innerHTML = `<p class="vazio-mini">Não encontrei ess${tipo === 'campanha' ? 'a campanha' : 'e pacote'}. <a href="#/precos/${NOME[tipo].lista}">Voltar</a></p>`
    return
  }
  // rascunho: cópia (as listas também) pra não mexer no cache até salvar
  const s = existente
    ? { ...existente, itens: existente.itens.map((i) => ({ ...i })), investimento: existente.investimento.map((i) => ({ ...i })) }
    : servicoEmBranco(tipo, dados.config)
  desenhar(el, dados, s, ehNovo)
}

function desenhar(el, dados, s, ehNovo, focar) {
  const n = NOME[s.tipo]
  el.innerHTML = `
    <a class="link-voltar-mod" href="#/precos/${n.lista}">&larr; ${n.titulo}</a>
    <h2 class="titulo-editor">${ehNovo ? n.novo : esc(s.nome)}</h2>
    <div class="editor-grid">
      <div class="editor-form">${formEditor(s, ehNovo)}</div>
      <aside class="editor-resultado" id="resultado" aria-live="polite"></aside>
    </div>`

  const form = el.querySelector('#form-servico')
  const baseRateio = baseAtual(dados).baseRateio

  const recalcular = () => {
    lerFormulario(form, s)
    form.querySelectorAll('.linha-item').forEach((l, i) => {
      const it = s.itens[i]
      const sub = (it.valor_unit_centavos || 0) * (it.quantidade || 0)
      l.querySelector('[data-sub]').textContent = sub ? '= ' + formatarReais(sub) : ''
    })
    const r = precoDoServico(s, baseRateio)
    el.querySelector('#resultado').innerHTML = painelResultado(s, r)
    // no celular o painel fica lá embaixo: o preço vai junto da barra de salvar
    el.querySelector('#mini-resumo').innerHTML = r.ok
      ? `<strong>${formatarReais(r.precoCobrado)}</strong>${pilulaSemaforo(r.semaforo)}`
      : ''
  }
  recalcular()
  form.addEventListener('input', recalcular)

  const redesenhar = (foco) => desenhar(el, dados, s, ehNovo, foco)

  // adicionar / remover custos e investimentos
  form.addEventListener('click', (e) => {
    const b = e.target.closest('button')
    if (!b) return
    if (b.dataset.addItem != null) {
      lerFormulario(form, s)
      const [grupo, nome] = b.dataset.addItem.split('|')
      s.itens.push({ grupo, nome, valor_unit_centavos: null, quantidade: 1 })
      redesenhar(`.linha-item[data-i="${s.itens.length - 1}"] [data-campo="${nome ? 'valor' : 'nome'}"]`)
    } else if (b.dataset.removerItem != null) {
      lerFormulario(form, s)
      s.itens.splice(Number(b.dataset.removerItem), 1)
      redesenhar()
    } else if (b.dataset.addInvest != null) {
      lerFormulario(form, s)
      const nome = b.dataset.addInvest
      s.investimento.push({ nome, valor_centavos: null })
      redesenhar(`.linha-invest[data-i="${s.investimento.length - 1}"] [data-campo="${nome ? 'valor' : 'nome'}"]`)
    } else if (b.dataset.removerInvest != null) {
      lerFormulario(form, s)
      s.investimento.splice(Number(b.dataset.removerInvest), 1)
      redesenhar()
    }
  })

  // "Usar preço sugerido" fica no painel (fora do form)
  el.querySelector('#resultado').addEventListener('click', (e) => {
    if (!e.target.closest('[data-acao="usar-sugerido"]')) return
    const r = precoDoServico(s, baseRateio)
    if (!r.ok) return
    form.querySelector('#s-preco').value = centavosParaCampo(arredondarPraCimaDe10(r.precoAPrazo))
    recalcular()
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    lerFormulario(form, s)
    const erroEl = form.querySelector('#s-erro')
    const erro = validar(s)
    if (erro) {
      erroEl.textContent = erro
      erroEl.hidden = false
      return
    }
    erroEl.hidden = true
    const btn = form.querySelector('button[type="submit"]')
    btn.disabled = true
    const payload = { ...s, itens: s.itens.map((i) => ({ ...i, nome: i.nome || rotuloGrupo(i.grupo) })) }
    const { error } = await salvarServico(payload)
    if (error) {
      btn.disabled = false
      erroEl.textContent = mensagemDeErro(error)
      erroEl.hidden = false
      return
    }
    location.hash = `#/precos/${n.lista}`
  })

  form.querySelector('[data-acao="arquivar"]')?.addEventListener('click', async () => {
    if (!confirm(`Arquivar "${s.nome}"? Ele some da lista (dá pra criar de novo depois).`)) return
    const { error } = await arquivarServico(s.id)
    if (error) {
      const erroEl = form.querySelector('#s-erro')
      erroEl.textContent = mensagemDeErro(error)
      erroEl.hidden = false
      return
    }
    location.hash = `#/precos/${n.lista}`
  })

  if (focar) el.querySelector(focar)?.focus()
}

const rotuloGrupo = (g) => GRUPOS.find(([v]) => v === g)?.[1] || 'Custo'
