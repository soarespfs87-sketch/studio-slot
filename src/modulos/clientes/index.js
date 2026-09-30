// ────────────────────────────────────────────────────────────────
//  Módulo Clientes. Endereços:
//    #/clientes                lista        #/clientes/lembretes   lembretes
//    #/clientes/nova           cadastro     #/clientes/<id>        ficha
//    #/clientes/<id>/editar    edição
//  Compras = leads fechados ligados à cliente (a função fechar_lead liga).
// ────────────────────────────────────────────────────────────────

import { esc } from '../../componentes/campos.js'
import { hojeISO } from '../../format.js'
import { carregarClientes, acharCliente, marcarLembreteFeito, mensagemDeErro } from './dados.js'
import { carregarLeads } from '../leads/dados.js'
import { carregarPrecos, salvarConfig } from '../precos/dados.js'
import { calcularLembretes, aniversarioNoAno, formatarCpf, formatarDocumento } from './regras.js'
import { itemLembrete, dataBR } from './ui.js'
import { renderFicha, enderecoTexto } from './ficha.js'
import { carregarContratos } from '../contratos/dados.js'
import { renderModelos, renderEditorModelo, renderGerar, renderContrato } from '../contratos/telas.js'
import { montarValores } from '../contratos/regras.js'
import { carregarLancamentos } from '../financeiro/dados.js'
import { renderFormulario } from './formulario.js'
import { formatarWhatsApp } from '../leads/regras.js'

let _busca = ''
let _filtro = 'todas' // 'todas' | 'aniversariantes'
let _ordem = 'nome' // 'nome' | 'compra'

// Junta as compras (leads fechados) em cada cliente.
function comCompras(clientes, leads, servicos) {
  const porCliente = {}
  for (const l of leads) {
    if (l.etapa !== 'fechado' || !l.cliente_id) continue
    ;(porCliente[l.cliente_id] ||= []).push({ ...l, servicoNome: servicos.find((s) => s.id === l.servico_id)?.nome })
  }
  return clientes.map((c) => {
    const compras = (porCliente[c.id] || []).sort((a, b) => (b.data_sessao || '').localeCompare(a.data_sessao || ''))
    return { ...c, compras, ultimaCompra: compras[0]?.data_sessao || null }
  })
}

function abas(atual, nLembretes) {
  return `
    <nav class="abas" aria-label="Clientes">
      <a class="aba ${atual === 'lista' ? 'aba-ativa' : ''}" href="#/clientes">Clientes</a>
      <a class="aba ${atual === 'lembretes' ? 'aba-ativa' : ''}" href="#/clientes/lembretes">Lembretes${nLembretes ? ` <span class="aba-num">${nLembretes}</span>` : ''}</a>
      <a class="aba ${atual === 'modelos' ? 'aba-ativa' : ''}" href="#/clientes/modelos">Modelos de contrato</a>
    </nav>`
}

function renderLista(el, { clientes, nLembretes }) {
  const hoje = hojeISO()
  const mesHoje = hoje.slice(5, 7)
  const q = _busca.trim().toLowerCase()
  const qDig = q.replace(/\D/g, '')
  let lista = clientes.filter(
    (c) => !q || c.nome.toLowerCase().includes(q) || (qDig && c.whatsapp.includes(qDig)),
  )
  if (_filtro === 'aniversariantes') {
    const doMes = (d) => d && d.slice(5, 7) === mesHoje
    lista = lista.filter((c) => doMes(c.data_nascimento) || c.familiares.some((f) => doMes(f.data_nascimento)))
  }
  lista.sort((a, b) =>
    _ordem === 'compra' ? (b.ultimaCompra || '').localeCompare(a.ultimaCompra || '') : a.nome.localeCompare(b.nome),
  )

  el.innerHTML = `
    <section class="modulo modulo-largo">
      <div class="leads-topo">
        <h1 class="titulo-grande">Clientes</h1>
        <a class="botao" href="#/clientes/nova">+ Nova cliente</a>
      </div>
      ${abas('lista', nLembretes)}
      ${
        clientes.length
          ? `<div class="leads-filtros">
              <input type="search" class="entrada" id="busca" placeholder="Buscar por nome ou WhatsApp" value="${esc(_busca)}" />
              <button type="button" class="chip-filtro ${_filtro === 'aniversariantes' ? 'chip-on' : ''}" data-acao="aniv">🎂 Do mês</button>
              <select class="entrada entrada-auto" id="ordem" aria-label="Ordenar">
                <option value="nome" ${_ordem === 'nome' ? 'selected' : ''}>A–Z</option>
                <option value="compra" ${_ordem === 'compra' ? 'selected' : ''}>Última compra</option>
              </select>
            </div>
            <div class="clientes-lista">
              ${
                lista.length
                  ? lista
                      .map((c) => {
                        const aniv = c.data_nascimento && c.data_nascimento.slice(5, 7) === mesHoje
                        const filhosMes = c.familiares.filter((f) => f.data_nascimento && f.data_nascimento.slice(5, 7) === mesHoje)
                        return `
                        <a class="cliente-card" href="#/clientes/${c.id}">
                          <strong>${esc(c.nome)}</strong>
                          <span class="lead-meta">${formatarWhatsApp(c.whatsapp)}</span>
                          <span class="lead-servico">${c.compras.length ? `${c.compras.length} ${c.compras.length === 1 ? 'compra' : 'compras'} · última ${dataBR(c.ultimaCompra)}` : 'sem compras ligadas'}</span>
                          ${aniv ? `<span class="selo-fu selo-fu-hoje">🎂 ${dataBR(aniversarioNoAno(c.data_nascimento, Number(hoje.slice(0, 4)))).slice(0, 5)}</span>` : ''}
                          ${filhosMes.map((f) => `<span class="selo-fu">🎈 ${esc(f.nome)} ${f.data_nascimento.slice(8, 10)}/${f.data_nascimento.slice(5, 7)}</span>`).join('')}
                        </a>`
                      })
                      .join('')
                  : '<p class="vazio-mini">Ninguém com esse filtro.</p>'
              }
            </div>`
          : `<div class="em-breve">
              <p class="em-breve-frase">Quem fecha com você vira cliente aqui — sozinha.</p>
              <p class="modulo-intro">Feche um lead no funil, ou cadastre quem comprou antes de você usar o app. É na ficha da cliente que você gera o contrato.</p>
              <a class="botao" href="#/clientes/nova" style="display:inline-block;margin-top:14px;text-decoration:none">+ Cadastrar cliente</a>
            </div>`
      }
    </section>`

  const redesenhar = () => renderLista(el, { clientes, nLembretes })
  const busca = el.querySelector('#busca')
  busca?.addEventListener('input', () => {
    _busca = busca.value
    const pos = busca.selectionStart
    redesenhar()
    const b = el.querySelector('#busca')
    b.focus()
    b.setSelectionRange(pos, pos)
  })
  el.querySelector('[data-acao="aniv"]')?.addEventListener('click', () => {
    _filtro = _filtro === 'aniversariantes' ? 'todas' : 'aniversariantes'
    redesenhar()
  })
  el.querySelector('#ordem')?.addEventListener('change', (e) => {
    _ordem = e.target.value
    redesenhar()
  })
}

function renderLembretes(el, { lembretes, clientes, config, recarregar }) {
  const whats = (id) => clientes.find((c) => c.id === id)?.whatsapp
  const vendas = lembretes.filter((l) => l.venda)
  const carinho = lembretes.filter((l) => !l.venda)
  const bloco = (titulo, lista, vazio) => `
    <div class="cartao-bloco">
      <h2 class="bloco-titulo">${titulo}</h2>
      ${lista.length ? `<ul class="lembretes">${lista.map((l) => itemLembrete(l, whats(l.clienteId))).join('')}</ul>` : `<p class="vazio-mini">${vazio}</p>`}
    </div>`
  const num = (id, rot, val, suf, max) => `
    <label class="campo dono-campo"><span>${rot}</span>
      <div class="entrada-prefixo entrada-sufixo"><input type="text" inputmode="numeric" id="${id}" value="${val}" data-max="${max}" /><em>${suf}</em></div></label>`

  el.innerHTML = `
    <section class="modulo modulo-largo">
      <div class="leads-topo"><h1 class="titulo-grande">Clientes</h1></div>
      ${abas('lembretes', lembretes.length)}
      <p class="status-salvo" id="lb-status"></p>
      <div class="fin-grid">
        <div>
          ${bloco('Ações de venda', vendas, 'Nenhuma festa, recompra ou newborn à vista.')}
          ${bloco('Carinho', carinho, 'Nenhum aniversário ou parto por perto.')}
        </div>
        <form class="cartao-bloco dono-form" id="form-antecedencia" novalidate>
          <h2 class="bloco-titulo">Quando avisar</h2>
          <p class="campo-dica">0 desliga aquele tipo de lembrete.</p>
          ${num('a-aniv', 'Aniversários (da cliente e dos filhos)', config.lembrete_aniv_dias, 'dias antes', 30)}
          ${num('a-festa', 'Festa dos filhos (ação de venda)', config.lembrete_festa_dias, 'dias antes', 180)}
          ${num('a-parto', 'Parto chegando', config.lembrete_parto_dias, 'dias antes', 60)}
          ${num('a-recompra', 'Recompra', config.lembrete_recompra_meses, 'meses depois', 36)}
          <p class="form-erro" id="a-erro" hidden></p>
          <button class="botao" type="submit" style="margin-top:14px">Salvar</button>
        </form>
      </div>
    </section>`

  el.querySelectorAll('[data-feito]').forEach((b) =>
    b.addEventListener('click', async () => {
      b.disabled = true
      const { error } = await marcarLembreteFeito(b.dataset.cliente, b.dataset.feito)
      if (error) {
        b.disabled = false
        const s = el.querySelector('#lb-status')
        s.textContent = mensagemDeErro(error)
        s.dataset.tipo = 'erro'
        return
      }
      recarregar()
    }),
  )

  const form = el.querySelector('#form-antecedencia')
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const ler = (id) => {
      const inp = form.querySelector(id)
      const n = Number(inp.value.trim())
      return Number.isInteger(n) && n >= 0 && n <= Number(inp.dataset.max) ? n : null
    }
    const v = {
      lembrete_aniv_dias: ler('#a-aniv'),
      lembrete_festa_dias: ler('#a-festa'),
      lembrete_parto_dias: ler('#a-parto'),
      lembrete_recompra_meses: ler('#a-recompra'),
    }
    const erro = form.querySelector('#a-erro')
    if (Object.values(v).some((x) => x == null)) {
      erro.textContent = 'Use números inteiros (aniversário até 30 dias, festa até 180, parto até 60, recompra até 36 meses).'
      erro.hidden = false
      return
    }
    erro.hidden = true
    const { error } = await salvarConfig(v)
    if (error) {
      erro.textContent = mensagemDeErro(error)
      erro.hidden = false
      return
    }
    recarregar()
  })
}

export async function render(el, ctx, aviso) {
  const [, a, b, c] = location.hash.replace(/^#\/?/, '').split('/')
  if (!el.querySelector('.modulo')) {
    el.innerHTML = '<section class="modulo"><h1 class="titulo-grande">Clientes</h1><p class="vazio">Carregando…</p></section>'
  }
  const [rc, rl, rp, rk] = await Promise.all([
    carregarClientes(ctx.negocio.id),
    carregarLeads(ctx.negocio.id, { recarregar: true }),
    carregarPrecos(ctx.negocio.id),
    carregarContratos(ctx.negocio.id),
  ])
  if (location.hash.replace(/^#\/?/, '').split('/')[0] !== 'clientes') return
  const error = rc.error || rl.error || rp.error || rk.error
  if (error) {
    el.innerHTML = `
      <section class="modulo"><h1 class="titulo-grande">Clientes</h1>
        <p class="form-erro">Não consegui carregar suas clientes: ${mensagemDeErro(error)}</p>
        <button class="botao" data-acao="tentar">Tentar de novo</button></section>`
    el.querySelector('[data-acao="tentar"]').addEventListener('click', () => render(el, ctx))
    return
  }

  const clientes = comCompras(rc.dados.clientes, rl.leads, rp.dados.servicos)
  const config = rp.dados.config
  const lembretes = calcularLembretes({
    clientes,
    config,
    hoje: hojeISO(),
    feitos: rc.dados.feitos,
    negocio: ctx.negocio.nome,
  })
  const recarregar = (msg) => render(el, ctx, msg)

  if (a === 'lembretes') return renderLembretes(el, { lembretes, clientes, config, recarregar })
  if (a === 'modelos') {
    if (!b) return renderModelos(el, { modelos: rk.dados.modelos, abas: abas('modelos', lembretes.length), recarregar })
    const modelo = b === 'novo' ? null : rk.dados.modelos.find((m) => m.id === b)
    if (b !== 'novo' && !modelo) {
      el.innerHTML = '<section class="modulo"><p class="vazio-mini">Não encontrei esse modelo. <a href="#/clientes/modelos">Voltar</a></p></section>'
      return
    }
    return renderEditorModelo(el, { modelo })
  }
  if (a === 'nova') return renderFormulario(el, { cliente: null })
  if (!a) return renderLista(el, { clientes, nLembretes: lembretes.length })

  const cliente = clientes.find((c) => c.id === a) || acharCliente(a)
  if (!cliente) {
    el.innerHTML = '<section class="modulo"><p class="vazio-mini">Não encontrei essa cliente. <a href="#/clientes">Voltar</a></p></section>'
    return
  }
  if (b === 'editar') return renderFormulario(el, { cliente })
  const contratosDela = rk.dados.contratos.filter((k) => k.cliente_id === cliente.id)
  if (b === 'contrato' && c === 'novo') {
    const { lancamentos } = await carregarLancamentos(ctx.negocio.id)
    const valoresDe = (compra) =>
      montarValores({
        cliente: { ...cliente, whatsappFormatado: formatarWhatsApp(cliente.whatsapp) },
        compra,
        servico: compra ? rp.dados.servicos.find((s) => s.id === compra.servico_id) : null,
        entradas: compra ? (lancamentos || []).filter((l) => l.lead_id === compra.id) : [],
        config,
        hoje: hojeISO(),
        formatarCpf,
        formatarDocumento,
        endereco: enderecoTexto,
      })
    return renderGerar(el, { cliente, compras: cliente.compras || [], modelos: rk.dados.modelos, negocio: ctx.negocio, valoresDe })
  }
  if (b === 'contrato' && c) {
    const contrato = contratosDela.find((k) => k.id === c)
    if (!contrato) {
      el.innerHTML = `<section class="modulo"><p class="vazio-mini">Não encontrei esse contrato. <a href="#/clientes/${cliente.id}">Voltar</a></p></section>`
      return
    }
    return renderContrato(el, { contrato, cliente, negocio: ctx.negocio })
  }
  renderFicha(el, {
    cliente,
    compras: cliente.compras || [],
    lembretes: lembretes.filter((l) => l.clienteId === cliente.id),
    contratos: contratosDela,
    negocio: ctx.negocio,
    recarregar,
  })
  if (aviso) {
    const s = el.querySelector('#cli-status')
    s.textContent = aviso
    s.dataset.tipo = 'ok'
  }
}
