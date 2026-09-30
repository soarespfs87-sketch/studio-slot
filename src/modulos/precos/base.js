// ────────────────────────────────────────────────────────────────
//  Preços › Base do negócio
//  Dados gerais, custos fixos (salvam sozinhos ao sair do campo) e
//  equipamentos. O resumo do topo se atualiza a cada mudança.
// ────────────────────────────────────────────────────────────────

import { salvarConfig, adicionarLinha, atualizarLinha, removerLinha, mensagemDeErro } from './dados.js'
import {
  esc,
  formatarReais,
  baseAtual,
  resumoBase,
  campoDinheiro,
  campoNumero,
  lerCentavos,
  lerNumero,
  lerTexto,
  avisar,
} from './ui.js'
import { centavosParaCampo, depreciacaoMensal } from '../../calculos.js'

const REGIMES = [
  ['', 'Escolha…'],
  ['mei', 'MEI'],
  ['simples', 'Simples Nacional'],
  ['pf', 'Pessoa Física'],
]

function formGerais(c) {
  return `
    <form id="form-gerais" class="dono-form cartao-bloco" novalidate>
      <h2 class="bloco-titulo">Dados gerais</h2>
      <p class="campo-dica">Os percentuais são o padrão de todo pacote novo — cada pacote pode mudar os seus.</p>
      <div class="dono-grid2">
        <label class="campo dono-campo">
          <span>Regime tributário</span>
          <select id="g-regime">
            ${REGIMES.map(([v, r]) => `<option value="${v}" ${c.regime === v || (!c.regime && !v) ? 'selected' : ''}>${r}</option>`).join('')}
          </select>
        </label>
        ${campoDinheiro('g-prolabore', 'Seu salário (pró-labore) por mês', c.prolabore_centavos)}
        ${campoNumero('g-margem', 'Margem de lucro', c.margem_pct, { sufixo: '%', dica: 'Sobre o custo, como na planilha.' })}
        ${campoNumero('g-comissao', 'Comissão de venda', c.comissao_pct, { sufixo: '%' })}
        ${campoNumero('g-imposto', 'Imposto sobre a venda', c.imposto_pct, {
          sufixo: '%',
          dica: c.regime === 'mei' ? 'MEI que paga só o DAS fixo: use 0% e lance o DAS nos custos fixos.' : '',
        })}
        ${campoNumero('g-taxa', 'Taxa do cartão / administrativa', c.taxa_pct, { sufixo: '%' })}
        ${campoNumero('g-horas', 'Horas disponíveis por dia', c.horas_dia, { sufixo: 'h', dica: 'Usado na calculadora rápida.' })}
        ${campoNumero('g-dias', 'Dias trabalhados por semana', c.dias_semana, { inteiro: true })}
      </div>
      <div class="linha-acao">
        <button type="submit" class="botao">Salvar dados gerais</button>
        <span class="status-salvo" id="g-status"></span>
      </div>
    </form>`
}

function linhaCusto(c) {
  return `
    <div class="linha-edit linha-custo" data-id="${c.id}">
      <input class="entrada" data-campo="nome" value="${esc(c.nome)}" aria-label="Nome do custo" />
      <div class="entrada-prefixo"><em>R$</em>
        <input class="entrada" data-campo="valor" inputmode="decimal" value="${esc(centavosParaCampo(c.valor_mensal_centavos))}" aria-label="Valor por mês" />
      </div>
      <label class="lc-dia"><span>dia</span>
        <input class="entrada" data-campo="dia" inputmode="numeric" value="${c.dia_vencimento}" aria-label="Dia do vencimento" />
      </label>
      <button type="button" class="btn-remover" data-remover aria-label="Remover ${esc(c.nome)}">&times;</button>
    </div>`
}

function linhaEquipamento(e) {
  const dep = depreciacaoMensal([e])
  return `
    <div class="linha-edit linha-equip" data-id="${e.id}">
      <input class="entrada le-nome" data-campo="nome" value="${esc(e.nome)}" aria-label="Nome do equipamento" />
      <label class="le-campo"><span>Valor de compra</span>
        <div class="entrada-prefixo"><em>R$</em><input class="entrada" data-campo="compra" inputmode="decimal" value="${esc(centavosParaCampo(e.valor_compra_centavos))}" /></div></label>
      <label class="le-campo"><span>Vida útil</span>
        <div class="entrada-prefixo entrada-sufixo"><input class="entrada" data-campo="vida" inputmode="numeric" value="${e.vida_util_meses}" /><em>meses</em></div></label>
      <label class="le-campo"><span>Revenda no fim</span>
        <div class="entrada-prefixo"><em>R$</em><input class="entrada" data-campo="revenda" inputmode="decimal" value="${esc(centavosParaCampo(e.valor_revenda_centavos))}" /></div></label>
      <label class="le-campo"><span>Comprado em</span>
        <input class="entrada" type="date" data-campo="data" value="${e.data_compra || ''}" /></label>
      <div class="le-rodape">
        <span class="le-dep">= <strong>${formatarReais(dep)}</strong> por mês</span>
        <button type="button" class="btn-remover" data-remover aria-label="Remover ${esc(e.nome)}">&times;</button>
      </div>
    </div>`
}

function tela(dados) {
  const c = dados.config
  return `
    <div id="base-resumo">${resumoBase(baseAtual(dados))}</div>
    ${formGerais(c)}

    <div class="cartao-bloco">
      <h2 class="bloco-titulo">Custos fixos do mês</h2>
      <p class="campo-dica">Tudo que você paga todo mês, trabalhando ou não. Salva sozinho quando você sai do campo.</p>
      <div class="linhas" id="lista-custos">
        <div class="linha-edit linha-custo linha-fixa">
          <span class="entrada entrada-lida">Seu salário (pró-labore)</span>
          <span class="entrada entrada-lida">${formatarReais(c.prolabore_centavos || 0)}</span>
          <small class="lc-nota">muda em Dados gerais</small>
        </div>
        ${dados.custos.map(linhaCusto).join('')}
      </div>
      <div class="linha-acao">
        <button type="button" class="mini-btn mini-btn-primario" data-acao="add-custo">+ Adicionar custo</button>
        <span class="status-salvo" id="custos-status"></span>
      </div>
    </div>

    <div class="cartao-bloco">
      <h2 class="bloco-titulo">Equipamentos</h2>
      <p class="campo-dica">O desgaste (valor ÷ vida útil) entra no custo dos pacotes — é o que paga a próxima câmera.</p>
      <div class="linhas" id="lista-equip">
        ${dados.equipamentos.length ? dados.equipamentos.map(linhaEquipamento).join('') : '<p class="vazio-mini">Nenhum equipamento ainda.</p>'}
      </div>
      <div class="linha-acao">
        <button type="button" class="mini-btn mini-btn-primario" data-acao="add-equip">+ Adicionar equipamento</button>
        <span class="status-salvo" id="equip-status"></span>
      </div>
    </div>`
}

export function renderBase(el, dados) {
  el.innerHTML = tela(dados)
  const atualizarResumo = () => {
    el.querySelector('#base-resumo').innerHTML = resumoBase(baseAtual(dados))
  }

  // ---- Dados gerais ----
  const form = el.querySelector('#form-gerais')
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const status = el.querySelector('#g-status')
    const v = {
      regime: form.querySelector('#g-regime').value || null,
      prolabore_centavos: lerCentavos(form, '#g-prolabore') ?? 0,
      margem_pct: lerNumero(form, '#g-margem'),
      comissao_pct: lerNumero(form, '#g-comissao') ?? 0,
      imposto_pct: lerNumero(form, '#g-imposto') ?? 0,
      taxa_pct: lerNumero(form, '#g-taxa') ?? 0,
      horas_dia: lerNumero(form, '#g-horas'),
      dias_semana: lerNumero(form, '#g-dias'),
    }
    const erro = validarGerais(v)
    if (erro) return avisar(status, erro, 'erro')

    avisar(status, 'Salvando…', 'info')
    const { error } = await salvarConfig(v)
    if (error) return avisar(status, mensagemDeErro(error), 'erro')

    // MEI: garante uma linha do DAS nos custos fixos
    if (v.regime === 'mei' && !dados.custos.some((c) => /^das\b/i.test(c.nome))) {
      await adicionarLinha('custos', { nome: 'DAS (MEI)' })
    }
    renderBase(el, dados)
    avisar(el.querySelector('#g-status'), 'Salvo ✓')
  })

  // ---- Custos fixos ----
  ligarLista(el, {
    lista: 'custos',
    container: '#lista-custos',
    status: '#custos-status',
    lerPatch: (linha) => {
      const nome = lerTexto(linha, '[data-campo="nome"]')
      const valor = lerCentavos(linha, '[data-campo="valor"]') ?? 0
      const dia = lerNumero(linha, '[data-campo="dia"]')
      if (!nome) return { erro: 'O custo precisa de um nome.' }
      if (valor < 0) return { erro: 'O valor não pode ser negativo.' }
      if (!Number.isInteger(dia) || dia < 1 || dia > 28) return { erro: 'Dia do vencimento: de 1 a 28.' }
      return { patch: { nome, valor_mensal_centavos: valor, dia_vencimento: dia } }
    },
    aoMudar: atualizarResumo,
  })
  el.querySelector('[data-acao="add-custo"]').addEventListener('click', async () => {
    const { linha, error } = await adicionarLinha('custos', { nome: 'Novo custo' })
    if (error) return avisar(el.querySelector('#custos-status'), mensagemDeErro(error), 'erro')
    renderBase(el, dados)
    focarNome(el, linha.id)
  })

  // ---- Equipamentos ----
  ligarLista(el, {
    lista: 'equipamentos',
    container: '#lista-equip',
    status: '#equip-status',
    lerPatch: (linha) => {
      const nome = lerTexto(linha, '[data-campo="nome"]')
      const compra = lerCentavos(linha, '[data-campo="compra"]')
      const vida = lerNumero(linha, '[data-campo="vida"]')
      const revenda = lerCentavos(linha, '[data-campo="revenda"]') ?? 0
      const data = linha.querySelector('[data-campo="data"]').value || null
      if (!nome) return { erro: 'O equipamento precisa de um nome.' }
      if (compra == null || compra < 0) return { erro: 'Informe o valor de compra.' }
      if (!Number.isInteger(vida) || vida <= 0) return { erro: 'Vida útil: um número inteiro de meses.' }
      if (revenda < 0 || revenda > compra) return { erro: 'A revenda não pode passar do valor de compra.' }
      return {
        patch: {
          nome,
          valor_compra_centavos: compra,
          vida_util_meses: vida,
          valor_revenda_centavos: revenda,
          data_compra: data,
        },
      }
    },
    aoMudar: (linha, salvo) => {
      atualizarResumo()
      linha.querySelector('.le-dep strong').textContent = formatarReais(depreciacaoMensal([salvo]))
    },
  })
  el.querySelector('[data-acao="add-equip"]').addEventListener('click', async () => {
    const { linha, error } = await adicionarLinha('equipamentos', {
      nome: 'Novo equipamento',
      valor_compra_centavos: 0,
    })
    if (error) return avisar(el.querySelector('#equip-status'), mensagemDeErro(error), 'erro')
    renderBase(el, dados)
    focarNome(el, linha.id)
  })
}

function validarGerais(v) {
  if (v.margem_pct == null || v.margem_pct < 0 || v.margem_pct > 500) return 'Margem: de 0% a 500%.'
  if (v.comissao_pct < 0 || v.comissao_pct > 50) return 'Comissão: de 0% a 50%.'
  if (v.imposto_pct < 0 || v.imposto_pct > 50) return 'Imposto: de 0% a 50%.'
  if (v.taxa_pct < 0 || v.taxa_pct > 20) return 'Taxa do cartão: de 0% a 20%.'
  if (v.comissao_pct + v.imposto_pct + v.taxa_pct >= 100) return 'Comissão + imposto + taxa passam de 100%.'
  if (v.prolabore_centavos < 0) return 'O salário não pode ser negativo.'
  if (!(v.horas_dia > 0 && v.horas_dia <= 24)) return 'Horas por dia: entre 1 e 24.'
  if (!Number.isInteger(v.dias_semana) || v.dias_semana < 1 || v.dias_semana > 7) return 'Dias por semana: de 1 a 7.'
  return null
}

// Salva uma linha quando a pessoa sai de um campo dela; remove com confirmação.
function ligarLista(el, { lista, container, status, lerPatch, aoMudar }) {
  const caixa = el.querySelector(container)
  const st = el.querySelector(status)

  caixa.addEventListener('change', async (e) => {
    const linha = e.target.closest('[data-id]')
    if (!linha) return
    const { patch, erro } = lerPatch(linha)
    linha.classList.toggle('linha-erro', !!erro)
    if (erro) return avisar(st, erro, 'erro')

    avisar(st, 'Salvando…', 'info')
    const { error } = await atualizarLinha(lista, linha.dataset.id, patch)
    if (error) {
      linha.classList.add('linha-erro')
      return avisar(st, mensagemDeErro(error), 'erro')
    }
    avisar(st, 'Salvo ✓')
    aoMudar(linha, { ...patch })
  })

  caixa.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-remover]')
    if (!btn) return
    const linha = btn.closest('[data-id]')
    const nome = lerTexto(linha, '[data-campo="nome"]') || 'este item'
    if (!confirm(`Remover "${nome}"?`)) return
    const { error } = await removerLinha(lista, linha.dataset.id)
    if (error) return avisar(st, mensagemDeErro(error), 'erro')
    linha.remove()
    aoMudar(linha, {})
    avisar(st, 'Removido ✓')
  })
}

function focarNome(el, id) {
  const input = el.querySelector(`[data-id="${id}"] [data-campo="nome"]`)
  input?.focus()
  input?.select()
}
