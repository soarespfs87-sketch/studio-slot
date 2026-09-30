// ────────────────────────────────────────────────────────────────
//  Módulo Leads (CRM). Endereços:
//    #/leads                 funil      #/leads/etapa/<etapa>  funil numa aba
//    #/leads/novo            cadastro   #/leads/<id>           ficha
//    #/leads/<id>/editar     edição     #/leads/<id>/fechar    ficha com "fechar" aberto
//  Usa os pacotes de Preços (nome, preço cobrado e preço mínimo).
// ────────────────────────────────────────────────────────────────

import { carregarLeads, acharLead, mensagemDeErro } from './dados.js'
import { carregarPrecos } from '../precos/dados.js'
import { baseAtual } from '../precos/ui.js'
import { renderFunil } from './funil.js'
import { renderFormulario } from './formulario.js'
import { renderFicha } from './ficha.js'

export async function render(el, ctx) {
  const [, a, b] = location.hash.replace(/^#\/?/, '').split('/')

  el.innerHTML = '<section class="modulo"><h1 class="titulo-grande">Leads</h1><p class="vazio">Carregando…</p></section>'
  const [rl, rp] = await Promise.all([carregarLeads(ctx.negocio.id), carregarPrecos(ctx.negocio.id)])
  if (location.hash.replace(/^#\/?/, '').split('/')[0] !== 'leads') return // saiu enquanto carregava

  const error = rl.error || rp.error
  if (error) {
    el.innerHTML = `
      <section class="modulo">
        <h1 class="titulo-grande">Leads</h1>
        <p class="form-erro">Não consegui carregar seus leads: ${mensagemDeErro(error)}</p>
        <button class="botao" data-acao="tentar">Tentar de novo</button>
      </section>`
    el.querySelector('[data-acao="tentar"]').addEventListener('click', () => render(el, ctx))
    return
  }

  const servicos = rp.dados.servicos
  const baseRateio = baseAtual(rp.dados).baseRateio
  const negocio = ctx.negocio

  if (!a || a === 'etapa') {
    return renderFunil(el, { leads: rl.leads, servicos, negocio, etapaAba: b })
  }
  if (a === 'novo') return renderFormulario(el, { lead: null, servicos, baseRateio })

  const lead = acharLead(a)
  if (!lead) {
    el.innerHTML = `<section class="modulo"><p class="vazio-mini">Não encontrei esse lead. <a href="#/leads">Voltar pros leads</a></p></section>`
    return
  }
  if (b === 'editar') return renderFormulario(el, { lead, servicos, baseRateio })
  return renderFicha(el, { lead, servicos, baseRateio, negocio, abrir: b })
}
