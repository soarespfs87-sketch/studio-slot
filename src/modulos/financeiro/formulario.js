// ────────────────────────────────────────────────────────────────
//  Financeiro › Nova entrada / Nova saída / Editar lançamento
//  Inclui a regra PF/PJ: conta pessoal não vira custo do negócio.
// ────────────────────────────────────────────────────────────────

import { esc } from '../../componentes/campos.js'
import { GRUPOS_DRE, CATEGORIA_RETIRADA, centavosParaCampo, paraCentavos, formatarReais } from '../../calculos.js'
import { hojeISO } from '../../format.js'
import { salvarLancamento, apagarLancamento, mensagemDeErro } from './dados.js'

// Categorias da planilha, por grupo (a pessoa pode digitar outra).
export const CATEGORIAS = {
  receita_op: ['Receita de serviços', 'Receita de produtos'],
  custo_direto: ['Compra de produtos/álbuns', 'Embalagem', 'Frete sobre compras', 'Kit de boas-vindas'],
  custo_variavel: ['Comissão sobre vendas', 'Imposto', 'Tarifa de cartão', 'Tarifa de boleto', 'Custo de ensaio teste', 'Café', 'Voucher VIP', 'Equipe (fotógrafo, assistente, editor)', 'Deslocamento'],
  custo_fixo: ['Água', 'Energia', 'Aluguel', 'Telefone', 'Internet', 'Combustível', 'Capacitação', 'Sistemas (Adobe etc.)', 'Segurança', 'Marketing', 'Folha de pagamento', 'Seu salário (pró-labore)'],
  receita_nao_op: ['Venda de equipamento', 'Reembolso de frete', 'Aporte do sócio'],
  despesa_nao_op: ['Investimento', 'Amortização de empréstimo', 'Juros', 'IOF', CATEGORIA_RETIRADA],
}
const DICA_GRUPO = {
  receita_op: 'O que você recebe pelos seus ensaios e produtos.',
  custo_direto: 'O que você compra pra entregar: álbum, caixa, embalagem, frete.',
  custo_variavel: 'Custos que só existem quando você vende: imposto, cartão, comissão, equipe.',
  custo_fixo: 'Contas que vêm todo mês, trabalhando ou não — inclusive seu salário.',
  receita_nao_op: 'Dinheiro que não vem de ensaio: venda de equipamento, aporte seu.',
  despesa_nao_op: 'Investimentos (ex.: cenário de campanha), empréstimos e juros.',
}
const FORMAS = [
  ['', '—'],
  ['pix', 'Pix'],
  ['cartao', 'Cartão'],
  ['dinheiro', 'Dinheiro'],
  ['transferencia', 'Transferência'],
  ['boleto', 'Boleto'],
]
const ENTRADAS = ['receita_op', 'receita_nao_op']
const ehEntrada = (grupo) => ENTRADAS.includes(grupo)

export function renderFormulario(el, { lancamento, tipo, servicos, leads, mesVolta }) {
  const ehNovo = !lancamento
  const l = lancamento || {
    grupo: tipo === 'entrada' ? 'receita_op' : 'custo_fixo',
    status: 'pago',
    pago_em: hojeISO(),
    vencimento: hojeISO(),
  }
  let entrada = ehEntrada(l.grupo)
  const voltar = `#/financeiro/mes/${mesVolta}`
  const lead = l.lead_id ? leads.find((x) => x.id === l.lead_id) : null

  el.innerHTML = `
    <section class="modulo">
      <a class="link-voltar-mod" href="${voltar}">&larr; Financeiro</a>
      <h1 class="titulo-editor" id="titulo-form"></h1>
      ${l.origem_id ? '<p class="alerta alerta-amarelo">Criada automaticamente pela entrada paga no cartão. Pode ajustar o valor se a maquininha cobrou diferente.</p>' : ''}
      ${lead ? `<p class="campo-dica" style="margin-top:8px">Veio do lead <a href="#/leads/${lead.id}">${esc(lead.nome)}</a>.</p>` : ''}
      <form id="form-lanc" class="dono-form" novalidate>
        <div class="cartao-bloco">
          <div class="alternar" role="radiogroup" aria-label="Tipo">
            <label><input type="radio" name="tipo" value="entrada" ${entrada ? 'checked' : ''} /><span>Entrada</span></label>
            <label><input type="radio" name="tipo" value="saida" ${entrada ? '' : 'checked'} /><span>Saída</span></label>
          </div>
          <label class="campo dono-campo"><span>Grupo</span><select id="x-grupo"></select>
            <small class="campo-dica" id="x-grupo-dica"></small></label>
          <label class="campo dono-campo"><span>Categoria</span>
            <input type="text" id="x-categoria" list="x-categorias" value="${esc(l.categoria)}" autocomplete="off" />
            <datalist id="x-categorias"></datalist></label>
          <label class="campo dono-campo"><span>Descrição (opcional)</span>
            <input type="text" id="x-descricao" value="${esc(l.descricao)}" /></label>
          <label class="campo dono-campo"><span>Valor</span>
            <div class="entrada-prefixo"><em>R$</em>
              <input type="text" inputmode="decimal" id="x-valor" value="${esc(centavosParaCampo(l.valor_centavos))}" autocomplete="off" /></div></label>
        </div>

        <div class="cartao-bloco">
          <div class="alternar" role="radiogroup" aria-label="Situação">
            <label><input type="radio" name="status" value="pago" ${l.status === 'pago' ? 'checked' : ''} /><span id="rot-pago"></span></label>
            <label><input type="radio" name="status" value="previsto" ${l.status === 'previsto' ? 'checked' : ''} /><span id="rot-prev"></span></label>
          </div>
          <div class="dono-grid2">
            <label class="campo dono-campo" id="c-pago"><span>Em que dia</span>
              <input type="date" id="x-pago" value="${l.pago_em || hojeISO()}" /></label>
            <label class="campo dono-campo" id="c-venc"><span>Vence em</span>
              <input type="date" id="x-venc" value="${l.vencimento || hojeISO()}" /></label>
            <label class="campo dono-campo"><span>Forma de pagamento</span>
              <select id="x-forma">${FORMAS.map(([v, r]) => `<option value="${v}" ${(l.forma_pagamento || '') === v ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
            <label class="campo dono-campo"><span>Pacote ou campanha (opcional)</span>
              <select id="x-servico"><option value="">—</option>${servicos
                .map((s) => `<option value="${s.id}" ${l.servico_id === s.id ? 'selected' : ''}>${esc(s.nome)}</option>`)
                .join('')}</select></label>
          </div>
          <small class="campo-dica" id="x-cartao-dica" hidden>Entrada paga no cartão: a tarifa da maquininha é lançada sozinha como custo variável.</small>
        </div>

        <div class="cartao-bloco" id="bloco-pessoal">
          <label class="termo dono-check">
            <input type="checkbox" id="x-pessoal" />
            <span>É uma conta pessoal? (mercado, aluguel de casa, escola…)</span>
          </label>
          <div id="aviso-pessoal" hidden>
            <p class="alerta alerta-vermelho"><strong>Conta pessoal se paga com o seu salário, não com o caixa da empresa.</strong>
              Se o dinheiro já saiu da conta do negócio, lance como <em>Retirada extra do sócio</em> — ela aparece em vermelho no mês.</p>
          </div>
        </div>

        <p class="form-erro" id="x-erro" hidden></p>
        <div class="barra-salvar">
          <a class="botao botao-fantasma" href="${voltar}">Cancelar</a>
          <button type="submit" class="botao" id="x-salvar">Salvar</button>
        </div>
        ${ehNovo ? '' : '<button type="button" class="link-arquivar" data-acao="apagar">Apagar lançamento</button>'}
      </form>
    </section>`

  const form = el.querySelector('#form-lanc')
  const $ = (s) => form.querySelector(s)
  const grupoSel = $('#x-grupo')

  const montarGrupos = (grupoAtual) => {
    const lista = GRUPOS_DRE.filter((g) => ehEntrada(g.id) === entrada)
    grupoSel.innerHTML = lista
      .map((g) => `<option value="${g.id}" ${g.id === grupoAtual ? 'selected' : ''}>${g.rotulo}</option>`)
      .join('')
  }
  const atualizar = () => {
    const g = grupoSel.value
    $('#x-grupo-dica').textContent = DICA_GRUPO[g] || ''
    $('#x-categorias').innerHTML = (CATEGORIAS[g] || []).map((c) => `<option value="${esc(c)}">`).join('')
    const pago = form.querySelector('input[name="status"]:checked').value === 'pago'
    el.querySelector('#titulo-form').textContent = ehNovo ? (entrada ? 'Nova entrada' : 'Nova saída') : 'Editar lançamento'
    $('#rot-pago').textContent = entrada ? 'Já recebi' : 'Já paguei'
    $('#rot-prev').textContent = entrada ? 'Vou receber' : 'Vou pagar'
    $('#c-pago').hidden = !pago
    $('#c-venc').hidden = pago
    $('#bloco-pessoal').hidden = entrada
    $('#x-cartao-dica').hidden = !(g === 'receita_op' && $('#x-forma').value === 'cartao' && pago)
    const pessoal = !entrada && $('#x-pessoal').checked
    $('#aviso-pessoal').hidden = !pessoal
    $('#x-salvar').textContent = pessoal ? 'Lançar como retirada extra do sócio' : 'Salvar'
    $('#x-salvar').classList.toggle('botao-perigo', pessoal)
  }

  montarGrupos(l.grupo)
  atualizar()
  form.querySelectorAll('input[name="tipo"]').forEach((r) =>
    r.addEventListener('change', () => {
      entrada = r.value === 'entrada'
      montarGrupos(entrada ? 'receita_op' : 'custo_fixo')
      $('#x-categoria').value = ''
      atualizar()
    }),
  )
  grupoSel.addEventListener('change', () => {
    $('#x-categoria').value = ''
    atualizar()
  })
  form.addEventListener('change', atualizar)

  const erro = (msg) => {
    $('#x-erro').textContent = msg
    $('#x-erro').hidden = false
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const pessoal = !entrada && $('#x-pessoal').checked
    const valor = paraCentavos($('#x-valor').value)
    const pago = form.querySelector('input[name="status"]:checked').value === 'pago'
    const dados = {
      ...(ehNovo ? {} : { id: l.id }),
      grupo: pessoal ? 'despesa_nao_op' : grupoSel.value,
      categoria: pessoal ? CATEGORIA_RETIRADA : $('#x-categoria').value.trim(),
      descricao: $('#x-descricao').value.trim(),
      valor_centavos: valor,
      status: pago ? 'pago' : 'previsto',
      pago_em: pago ? $('#x-pago').value || null : null,
      vencimento: pago ? l.vencimento || $('#x-pago').value || null : $('#x-venc').value || null,
      forma_pagamento: $('#x-forma').value || null,
      servico_id: $('#x-servico').value || null,
    }
    if (!dados.categoria) return erro('Escolha ou escreva uma categoria.')
    if (!(valor > 0)) return erro('Informe um valor maior que zero.')
    if (pago && !dados.pago_em) return erro('Em que dia foi pago?')
    if (!pago && !dados.vencimento) return erro('Quando vence?')
    if (pessoal && !confirm(`Lançar ${formatarReais(valor)} como retirada extra do sócio?`)) return

    $('#x-erro').hidden = true
    $('#x-salvar').disabled = true
    const { error } = await salvarLancamento(dados)
    if (error) {
      $('#x-salvar').disabled = false
      return erro(mensagemDeErro(error))
    }
    const mes = (dados.pago_em || dados.vencimento).slice(0, 7)
    location.hash = `#/financeiro/mes/${mes}`
  })

  form.querySelector('[data-acao="apagar"]')?.addEventListener('click', async () => {
    const extra = l.origem_id ? '' : ' (se tiver tarifa de cartão ligada, ela vai junto)'
    if (!confirm(`Apagar este lançamento${extra}?`)) return
    const { error } = await apagarLancamento(l.id)
    if (error) return erro(mensagemDeErro(error))
    location.hash = voltar
  })
}
