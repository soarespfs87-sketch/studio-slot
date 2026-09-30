// ────────────────────────────────────────────────────────────────
//  Preços › Calculadora rápida ("Modelo A" da planilha)
//  Estima uma sessão avulsa pelo custo-hora. Não salva nada.
// ────────────────────────────────────────────────────────────────

import { calculadoraRapida } from '../../calculos.js'
import {
  formatarReais,
  formatarPct,
  baseAtual,
  campoDinheiro,
  campoNumero,
  lerCentavos,
  lerNumero,
} from './ui.js'

// Guarda o que foi digitado enquanto a pessoa troca de aba.
let _ultimo = { horas: 3, deslocamento: null, alimentacao: null, outros: null, markup: 2, preco: null }

export function renderCalculadora(el, dados) {
  const c = dados.config
  const pctTotal = (c.taxa_pct || 0) + (c.imposto_pct || 0) + (c.comissao_pct || 0)
  const u = _ultimo
  el.innerHTML = `
    <p class="campo-dica">Pra estimar uma sessão avulsa, sem montar pacote. Usa suas
      ${c.horas_dia} h por dia × ${c.dias_semana} dias por semana e os percentuais da
      <a href="#/precos/base">base do negócio</a> (${formatarPct(pctTotal, 0)} de taxas).</p>
    <div class="editor-grid">
      <form class="dono-form cartao-bloco editor-form" id="form-calc" novalidate>
        <div class="dono-grid2">
          ${campoNumero('c-horas', 'Horas que a sessão usa', u.horas, { sufixo: 'h', dica: 'Atendimento + sessão + edição + entrega.' })}
          ${campoDinheiro('c-desloc', 'Deslocamento', u.deslocamento)}
          ${campoDinheiro('c-alim', 'Alimentação', u.alimentacao)}
          ${campoDinheiro('c-outros', 'Outros custos', u.outros)}
          ${campoNumero('c-markup', 'Markup', u.markup, { sufixo: '×', dica: 'Preço = custo × markup.' })}
          ${campoDinheiro('c-preco', 'Ou digite um preço', u.preco, { placeholder: 'Opcional', dica: 'Se preencher, ignora o markup.' })}
        </div>
      </form>
      <aside class="editor-resultado" id="calc-resultado" aria-live="polite"></aside>
    </div>`

  const form = el.querySelector('#form-calc')
  const calcular = () => {
    _ultimo = {
      horas: lerNumero(form, '#c-horas'),
      deslocamento: lerCentavos(form, '#c-desloc'),
      alimentacao: lerCentavos(form, '#c-alim'),
      outros: lerCentavos(form, '#c-outros'),
      markup: lerNumero(form, '#c-markup'),
      preco: lerCentavos(form, '#c-preco'),
    }
    const r = calculadoraRapida({
      baseRateio: baseAtual(dados).baseRateio,
      horasDia: c.horas_dia,
      diasSemana: c.dias_semana,
      horasSessao: _ultimo.horas,
      deslocamento: _ultimo.deslocamento || 0,
      alimentacao: _ultimo.alimentacao || 0,
      outros: _ultimo.outros || 0,
      markup: _ultimo.markup,
      precoVenda: _ultimo.preco,
      pctTotal,
    })
    const linha = (rot, val, cls = '') => `<div class="rl ${cls}"><dt>${rot}</dt><dd>${val}</dd></div>`
    el.querySelector('#calc-resultado').innerHTML = r.ok
      ? `<div class="resultado">
          <div class="res-cobrado ${r.lucro < 0 ? 'res-vermelho' : 'res-verde'}">
            <span>Preço de venda</span><strong>${formatarReais(r.preco)}</strong>
          </div>
          <dl class="res-detalhe">
            ${linha('Custo da sua hora', formatarReais(r.custoHora))}
            ${linha('Custo da sessão', formatarReais(r.custoSessao), 'rl-forte')}
            ${linha(`Taxas e impostos (${formatarPct(pctTotal, 0)})`, '− ' + formatarReais(r.custoVariavel))}
            ${linha('Venda líquida', formatarReais(r.vendaLiquida))}
            ${linha('Lucro líquido', formatarReais(r.lucro), 'rl-forte' + (r.lucro < 0 ? ' rl-neg' : ''))}
            ${linha('Lucratividade', formatarPct(r.lucratividade))}
          </dl>
        </div>`
      : `<div class="resultado"><p class="resultado-falta">${r.falta}</p></div>`
  }
  calcular()
  form.addEventListener('input', calcular)
}
