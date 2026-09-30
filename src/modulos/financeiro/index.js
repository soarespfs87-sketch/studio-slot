// ────────────────────────────────────────────────────────────────
//  Módulo Financeiro. Endereços:
//    #/financeiro                    mês atual
//    #/financeiro/mes/AAAA-MM        um mês
//    #/financeiro/novo/entrada|saida/AAAA-MM
//    #/financeiro/lancamento/<id>    editar
// ────────────────────────────────────────────────────────────────

import { carregarLancamentos, lancamentosCarregados, mensagemDeErro } from './dados.js'
import { carregarPrecos } from '../precos/dados.js'
import { carregarLeads } from '../leads/dados.js'
import { baseAtual } from '../precos/ui.js'
import { mesDe } from '../../calculos.js'
import { hojeISO } from '../../format.js'
import { renderMes } from './mes.js'
import { renderFormulario } from './formulario.js'

const MES_OK = /^\d{4}-(0[1-9]|1[0-2])$/

export async function render(el, ctx) {
  const [, a, b, c] = location.hash.replace(/^#\/?/, '').split('/')

  if (!el.querySelector('.modulo')) {
    el.innerHTML = '<section class="modulo"><h1 class="titulo-grande">Financeiro</h1><p class="vazio">Carregando…</p></section>'
  }
  const [rl, rp, rleads] = await Promise.all([
    carregarLancamentos(ctx.negocio.id),
    carregarPrecos(ctx.negocio.id),
    carregarLeads(ctx.negocio.id),
  ])
  if (location.hash.replace(/^#\/?/, '').split('/')[0] !== 'financeiro') return

  const error = rl.error || rp.error || rleads.error
  if (error) {
    el.innerHTML = `
      <section class="modulo">
        <h1 class="titulo-grande">Financeiro</h1>
        <p class="form-erro">Não consegui carregar o financeiro: ${mensagemDeErro(error)}</p>
        <button class="botao" data-acao="tentar">Tentar de novo</button>
      </section>`
    el.querySelector('[data-acao="tentar"]').addEventListener('click', () => render(el, ctx))
    return
  }

  const mesAtual = mesDe(hojeISO())
  const servicos = rp.dados.servicos
  const leads = rleads.leads

  if (a === 'novo') {
    return renderFormulario(el, {
      lancamento: null,
      tipo: b === 'saida' ? 'saida' : 'entrada',
      servicos,
      leads,
      mesVolta: MES_OK.test(c || '') ? c : mesAtual,
    })
  }
  if (a === 'lancamento') {
    const l = lancamentosCarregados().find((x) => x.id === b)
    if (!l) {
      el.innerHTML = '<section class="modulo"><p class="vazio-mini">Não encontrei esse lançamento. <a href="#/financeiro">Voltar</a></p></section>'
      return
    }
    return renderFormulario(el, {
      lancamento: l,
      servicos,
      leads,
      mesVolta: mesDe(l.status === 'pago' ? l.pago_em : l.vencimento),
    })
  }

  const mes = a === 'mes' && MES_OK.test(b || '') ? b : mesAtual
  renderMes(el, {
    mes,
    precos: rp.dados,
    lancamentos: rl.lancamentos,
    base: baseAtual(rp.dados),
    recarregar: () => render(el, ctx),
  })
}
