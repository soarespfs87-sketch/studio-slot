// ────────────────────────────────────────────────────────────────
//  Leads › Ficha do lead
//  Etapas, follow-up, fechar (com aviso de preço mínimo), perder,
//  reabrir, dados e histórico com notas.
// ────────────────────────────────────────────────────────────────

import { esc } from '../../componentes/campos.js'
import { formatarReais, centavosParaCampo, paraCentavos, dividirSinal } from '../../calculos.js'
import { hojeISO } from '../../format.js'
import {
  atualizarLead,
  fecharLead,
  reabrirLead,
  apagarLead,
  carregarEventos,
  registrarEvento,
  concluirFollowup,
  mensagemDeErro,
} from './dados.js'
import {
  ETAPAS,
  ETAPAS_ABERTAS,
  proximaEtapa,
  rotuloEtapa,
  rotuloOrigem,
  rotuloMotivo,
  MOTIVOS_PERDA,
  formatarWhatsApp,
  linkWhatsApp,
  situacaoFollowup,
  checarMinimo,
} from './regras.js'
import { iconeWhats, dataComDia, dataCurtaBR, somarDias, quando } from './ui.js'
import { opcoesServico, precoCobradoDe } from './formulario.js'

// ---- pedaços ----
function passos(etapa) {
  const final = etapa === 'perdido' ? 'perdido' : 'fechado'
  const ordem = [...ETAPAS_ABERTAS, final]
  const atual = ordem.indexOf(etapa)
  return `
    <ol class="passos">
      ${ordem
        .map((id, i) => {
          const cls = i < atual ? 'passo-feito' : i === atual ? `passo-atual passo-${id}` : ''
          return `<li class="passo ${cls}"><span>${ETAPAS.find((e) => e.id === id).curto.replace(/s$/, '')}</span></li>`
        })
        .join('')}
    </ol>`
}

function blocoFollowup(l, hoje, modo) {
  if (!ETAPAS_ABERTAS.includes(l.etapa)) return ''
  const s = situacaoFollowup(l.proximo_followup, hoje)
  const editor = (titulo, botao) => `
    <form class="fu-editor" id="form-fu">
      <p class="fu-pergunta">${titulo}</p>
      <div class="atalhos">
        <button type="button" class="mini-btn" data-dias="1">Amanhã</button>
        <button type="button" class="mini-btn" data-dias="3">Em 3 dias</button>
        <button type="button" class="mini-btn" data-dias="7">Em 1 semana</button>
        <button type="button" class="mini-btn" data-dias="">Sem próximo</button>
      </div>
      <div class="fu-linha">
        <input type="date" class="entrada" id="fu-data" value="${modo === 'mudar' ? l.proximo_followup || '' : somarDias(hoje, 3)}" min="${hoje}" />
        <button type="submit" class="botao">${botao}</button>
        <button type="button" class="botao botao-fantasma" data-acao="fu-cancelar">Cancelar</button>
      </div>
    </form>`

  if (modo === 'feito') return `<div class="cartao-bloco fu fu-aberto">${editor('Feito! Quando falar de novo?', 'Salvar')}</div>`
  if (modo === 'mudar') return `<div class="cartao-bloco fu fu-aberto">${editor('Qual a nova data?', 'Salvar data')}</div>`

  return `
    <div class="cartao-bloco fu ${s ? 'fu-' + s : ''}">
      ${
        l.proximo_followup
          ? `<p class="fu-texto"><span>Próximo contato</span><strong>${dataComDia(l.proximo_followup)}</strong>${
              s === 'atrasado' ? '<em>atrasado</em>' : s === 'hoje' ? '<em>hoje</em>' : ''
            }</p>
            <div class="fu-botoes">
              <button type="button" class="botao" data-acao="fu-feito">Já falei ✓</button>
              <button type="button" class="mini-btn" data-acao="fu-mudar">Mudar data</button>
            </div>`
          : `<p class="fu-texto"><span>Próximo contato</span><strong>nenhum marcado</strong></p>
             <div class="fu-botoes"><button type="button" class="mini-btn mini-btn-primario" data-acao="fu-mudar">Marcar data</button></div>`
      }
    </div>`
}

function acoesEtapa(l) {
  const prox = proximaEtapa(l.etapa)
  if (l.etapa === 'fechado' || l.etapa === 'perdido') {
    return `<div class="ficha-acoes">${
      l.etapa === 'fechado' && l.cliente_id
        ? `<a class="botao" href="#/clientes/${l.cliente_id}/contrato/novo">Gerar contrato</a>`
        : ''
    }<button type="button" class="mini-btn" data-acao="reabrir">Reabrir (voltar pra Negociação)</button></div>`
  }
  return `
    <div class="ficha-acoes">
      ${
        prox === 'fechado'
          ? '<button type="button" class="botao" data-acao="abrir-fechar">Fechar negócio</button>'
          : `<button type="button" class="botao" data-acao="avancar" data-para="${prox}">Avançar → ${rotuloEtapa(prox)}</button>
             <button type="button" class="mini-btn" data-acao="abrir-fechar">Já fechou</button>`
      }
      <button type="button" class="mini-btn mini-btn-perigo" data-acao="abrir-perder">Perdido</button>
    </div>`
}

function painelFechar(l, servicos) {
  return `
    <form class="cartao-bloco painel-acao" id="form-fechar" novalidate>
      <h2 class="bloco-titulo">Fechar negócio 🎉</h2>
      <label class="campo dono-campo"><span>Pacote ou campanha</span>
        <select id="f-servico">${opcoesServico(servicos, l.servico_id)}</select></label>
      <div class="dono-grid2">
        <label class="campo dono-campo"><span>Valor fechado *</span>
          <div class="entrada-prefixo"><em>R$</em>
            <input type="text" inputmode="decimal" id="f-valor" value="${esc(centavosParaCampo(l.valor_fechado_centavos || l.valor_estimado_centavos))}" autocomplete="off" /></div></label>
        <label class="campo dono-campo"><span>Data da sessão *</span>
          <input type="date" id="f-data" value="${l.data_sessao || l.data_prevista || ''}" /></label>
      </div>
      <h3 class="sub-titulo">Como vai pagar</h3>
      <div class="alternar" role="radiogroup" aria-label="Condição de pagamento">
        <label><input type="radio" name="condicao" value="sinal" checked /><span>Sinal + saldo</span></label>
        <label><input type="radio" name="condicao" value="avista" /><span>À vista</span></label>
      </div>
      <div class="dono-grid2">
        <label class="campo dono-campo" data-so="sinal"><span>Sinal</span>
          <div class="entrada-prefixo entrada-sufixo"><input type="text" inputmode="decimal" id="f-sinal-pct" value="30" /><em>%</em></div></label>
        <label class="campo dono-campo" data-so="sinal"><span>Sinal vence em</span>
          <input type="date" id="f-sinal-venc" value="${hojeISO()}" /></label>
        <label class="campo dono-campo" data-so="avista" hidden><span>Vence em</span>
          <input type="date" id="f-avista-venc" value="${hojeISO()}" /></label>
        <label class="campo dono-campo"><span>Forma de pagamento</span>
          <select id="f-forma">
            <option value="pix">Pix</option><option value="cartao">Cartão</option><option value="transferencia">Transferência</option>
            <option value="dinheiro">Dinheiro</option><option value="boleto">Boleto</option>
          </select></label>
      </div>
      <p class="campo-dica" id="f-divisao"></p>
      <p class="campo-dica">As entradas entram no Financeiro como previstas; você marca "recebi" quando o dinheiro cair.</p>
      <div id="f-aviso"></div>
      <p class="form-erro" id="f-erro" hidden></p>
      <div class="linha-acao">
        <button type="submit" class="botao" id="f-confirmar">Confirmar fechamento</button>
        <button type="button" class="botao botao-fantasma" data-acao="fechar-painel">Cancelar</button>
      </div>
    </form>`
}

function painelPerder() {
  return `
    <form class="cartao-bloco painel-acao" id="form-perder" novalidate>
      <h2 class="bloco-titulo">Por que não fechou?</h2>
      <div class="motivos">
        ${MOTIVOS_PERDA.map(
          ([v, r]) => `<label class="motivo"><input type="radio" name="motivo" value="${v}" /><span>${r}</span></label>`,
        ).join('')}
      </div>
      <input type="text" class="entrada" id="p-outro" placeholder="Conta rapidinho o motivo" hidden />
      <p class="form-erro" id="p-erro" hidden></p>
      <div class="linha-acao">
        <button type="submit" class="botao">Marcar como perdido</button>
        <button type="button" class="botao botao-fantasma" data-acao="fechar-painel">Cancelar</button>
      </div>
    </form>`
}

function dadosLead(l, servicos) {
  const serv = servicos.find((s) => s.id === l.servico_id)
  const linha = (rot, val) => (val ? `<div class="rl"><dt>${rot}</dt><dd>${val}</dd></div>` : '')
  return `
    <div class="cartao-bloco">
      <div class="bloco-cabeca">
        <h2 class="bloco-titulo">Dados</h2>
        <a class="mini-btn" href="#/leads/${l.id}/editar">Editar</a>
      </div>
      <dl class="res-detalhe ficha-dados">
        ${linha('WhatsApp', formatarWhatsApp(l.whatsapp))}
        ${linha('Instagram', l.instagram ? `<a href="https://instagram.com/${encodeURIComponent(l.instagram)}" target="_blank" rel="noopener">@${esc(l.instagram)}</a>` : '')}
        ${linha('E-mail', l.email ? `<a href="mailto:${esc(l.email)}">${esc(l.email)}</a>` : '')}
        ${linha('Origem', rotuloOrigem(l.origem))}
        ${linha('Interesse', serv ? esc(serv.nome) : '')}
        ${linha('Data prevista', l.data_prevista ? dataComDia(l.data_prevista) : '')}
        ${linha('Valor estimado', l.valor_estimado_centavos != null ? formatarReais(l.valor_estimado_centavos) : '')}
        ${l.etapa === 'fechado' ? linha('Valor fechado', `<strong>${formatarReais(l.valor_fechado_centavos)}</strong>`) : ''}
        ${l.etapa === 'fechado' ? linha('Sessão', dataComDia(l.data_sessao)) : ''}
        ${l.cliente_id ? linha('Cliente', `<a href="#/clientes/${l.cliente_id}">ver ficha / completar cadastro →</a>`) : ''}
        ${l.etapa === 'fechado' ? linha('Pagamento', `<a href="#/financeiro">ver no Financeiro →</a>`) : ''}
        ${l.etapa === 'perdido' ? linha('Motivo da perda', esc(rotuloMotivo(l.motivo_perda))) : ''}
      </dl>
      ${l.observacoes ? `<p class="ficha-obs">${esc(l.observacoes).replace(/\n/g, '<br>')}</p>` : ''}
      <button type="button" class="link-arquivar" data-acao="apagar">Apagar lead</button>
    </div>`
}

function textoEvento(e) {
  const d = e.dados || {}
  if (e.tipo === 'criado') return `Lead cadastrado${d.origem ? ` · veio de ${rotuloOrigem(d.origem)}` : ''}`
  if (e.tipo === 'nota') return esc(e.texto)
  if (e.tipo === 'followup') return `Follow-up feito${d.data ? ` (marcado pra ${dataCurtaBR(d.data)})` : ''}`
  if (e.tipo === 'etapa') {
    if (d.para === 'fechado') return `<strong>Fechado</strong>${d.valor_centavos ? ` por ${formatarReais(d.valor_centavos)}` : ''} 🎉`
    if (d.para === 'perdido') return `<strong>Perdido</strong>${d.motivo ? ` · ${esc(rotuloMotivo(d.motivo))}` : ''}`
    if (d.de === 'fechado' || d.de === 'perdido') return `Reaberto → ${rotuloEtapa(d.para)}`
    return `${rotuloEtapa(d.de)} → <strong>${rotuloEtapa(d.para)}</strong>`
  }
  return esc(e.texto)
}

function historico(eventos) {
  return `
    <div class="cartao-bloco">
      <h2 class="bloco-titulo">Histórico</h2>
      <form class="nota-form" id="form-nota">
        <textarea class="entrada" id="nota-texto" rows="2" placeholder="Anotar algo (ex.: mandei a proposta por e-mail)"></textarea>
        <button type="submit" class="mini-btn mini-btn-primario">Adicionar nota</button>
      </form>
      <ol class="linha-tempo">
        ${
          eventos === null
            ? '<li class="lt-vazio">Carregando…</li>'
            : eventos.length
              ? eventos
                  .map(
                    (e) => `<li class="lt-item lt-${e.tipo}${e.dados?.para ? ' lt-' + e.dados.para : ''}">
                      <time>${quando(e.created_at)}</time><p>${textoEvento(e)}</p></li>`,
                  )
                  .join('')
              : '<li class="lt-vazio">Nada ainda.</li>'
        }
      </ol>
    </div>`
}

// ════════════════════════════════════════════════════════════════
export function renderFicha(el, { lead, servicos, baseRateio, negocio, abrir }) {
  const estado = { painel: abrir === 'fechar' ? 'fechar' : null, fu: null, eventos: null, confirmarAbaixo: false }
  let l = lead

  const desenhar = () => {
    const hoje = hojeISO()
    el.innerHTML = `
      <section class="modulo modulo-largo">
        <a class="link-voltar-mod" href="#/leads/etapa/${l.etapa}">&larr; Leads</a>
        <div class="ficha-topo">
          <div>
            <h1 class="titulo-editor">${esc(l.nome)}</h1>
            <span class="etapa-pill etapa-${l.etapa}">${rotuloEtapa(l.etapa)}</span>
          </div>
          <a class="btn-whats btn-whats-grande" href="${linkWhatsApp(l.whatsapp, l.nome, negocio.nome)}" target="_blank" rel="noopener">${iconeWhats}<span>WhatsApp</span></a>
        </div>
        ${passos(l.etapa)}
        <p class="status-salvo" id="ficha-status"></p>
        <div class="ficha-grid">
          <div>
            ${estado.painel ? '' : acoesEtapa(l)}
            ${estado.painel === 'fechar' ? painelFechar(l, servicos) : ''}
            ${estado.painel === 'perder' ? painelPerder() : ''}
            ${estado.painel ? '' : blocoFollowup(l, hoje, estado.fu)}
            ${dadosLead(l, servicos)}
          </div>
          <div>${historico(estado.eventos)}</div>
        </div>
      </section>`
    ligar()
  }

  const recarregarEventos = async () => {
    const { eventos } = await carregarEventos(l.id)
    estado.eventos = eventos
    const alvo = el.querySelector('.linha-tempo')?.closest('.cartao-bloco')
    if (alvo) {
      const texto = el.querySelector('#nota-texto')?.value || ''
      alvo.outerHTML = historico(estado.eventos)
      ligarNota()
      el.querySelector('#nota-texto').value = texto
    }
  }

  const status = (msg, tipo = 'erro') => {
    const s = el.querySelector('#ficha-status')
    s.textContent = msg
    s.dataset.tipo = tipo
  }

  // acao: função que grava e devolve { lead, error }. Padrão: atualizar campos do lead.
  const salvar = async (patch, depois, acao = () => atualizarLead(l.id, patch)) => {
    const { lead: novo, error } = await acao()
    if (error) {
      status(mensagemDeErro(error))
      return false
    }
    l = novo
    estado.painel = null
    estado.fu = null
    estado.confirmarAbaixo = false
    desenhar()
    if (depois) status(depois, 'ok')
    recarregarEventos()
    return true
  }

  function ligarNota() {
    el.querySelector('#form-nota').addEventListener('submit', async (e) => {
      e.preventDefault()
      const campo = el.querySelector('#nota-texto')
      const texto = campo.value.trim()
      if (!texto) return campo.focus()
      e.target.querySelector('button').disabled = true
      const { error } = await registrarEvento(l.id, 'nota', texto)
      if (error) {
        e.target.querySelector('button').disabled = false
        return status(mensagemDeErro(error))
      }
      campo.value = ''
      recarregarEventos()
    })
  }

  function ligar() {
    const on = (sel, fn) => el.querySelector(sel)?.addEventListener('click', fn)

    on('[data-acao="avancar"]', (e) => {
      e.target.disabled = true
      salvar({ etapa: e.target.dataset.para })
    })
    on('[data-acao="abrir-fechar"]', () => ((estado.painel = 'fechar'), desenhar()))
    on('[data-acao="abrir-perder"]', () => ((estado.painel = 'perder'), desenhar()))
    el.querySelectorAll('[data-acao="fechar-painel"]').forEach((b) =>
      b.addEventListener('click', () => {
        estado.painel = null
        estado.confirmarAbaixo = false
        if (location.hash.endsWith('/fechar')) history.replaceState(null, '', `#/leads/${l.id}`)
        desenhar()
      }),
    )
    on('[data-acao="reabrir"]', async () => {
      const msg = l.etapa === 'fechado'
        ? 'Reabrir este lead? Ele volta pra Negociação e as entradas ainda não recebidas saem do Financeiro.'
        : 'Reabrir este lead? Ele volta pra Negociação.'
      if (!confirm(msg)) return
      let pagas = 0
      await salvar(null, null, async () => {
        const r = await reabrirLead(l.id)
        pagas = r.pagas || 0
        return r
      })
      status(
        pagas ? `Reaberto ✓ ${pagas} ${pagas === 1 ? 'entrada já recebida continua' : 'entradas já recebidas continuam'} no Financeiro.` : 'Reaberto ✓',
        pagas ? 'info' : 'ok',
      )
    })
    on('[data-acao="apagar"]', async () => {
      if (!confirm(`Apagar "${l.nome}" e todo o histórico? Não dá pra desfazer.`)) return
      const { error } = await apagarLead(l.id)
      if (error) return status(mensagemDeErro(error))
      location.hash = '#/leads'
    })

    // ---- follow-up ----
    on('[data-acao="fu-feito"]', () => ((estado.fu = 'feito'), desenhar()))
    on('[data-acao="fu-mudar"]', () => ((estado.fu = 'mudar'), desenhar()))
    on('[data-acao="fu-cancelar"]', () => ((estado.fu = null), desenhar()))
    const formFu = el.querySelector('#form-fu')
    if (formFu) {
      const hoje = hojeISO()
      const gravarFu = async (data) => {
        if (estado.fu === 'feito') {
          const { lead: novo, error } = await concluirFollowup(l, data)
          if (error) return status(mensagemDeErro(error))
          l = novo
          estado.fu = null
          desenhar()
          status(data ? `Anotado ✓ Próximo contato: ${dataComDia(data)}` : 'Anotado ✓', 'ok')
          recarregarEventos()
        } else {
          salvar({ proximo_followup: data || null }, 'Data salva ✓')
        }
      }
      formFu.querySelectorAll('[data-dias]').forEach((b) =>
        b.addEventListener('click', () => gravarFu(b.dataset.dias ? somarDias(hoje, Number(b.dataset.dias)) : null)),
      )
      formFu.addEventListener('submit', (e) => {
        e.preventDefault()
        gravarFu(formFu.querySelector('#fu-data').value || null)
      })
    }

    // ---- fechar ----
    const formF = el.querySelector('#form-fechar')
    if (formF) {
      const aviso = formF.querySelector('#f-aviso')
      const btn = formF.querySelector('#f-confirmar')
      const checar = () => {
        const serv = servicos.find((s) => s.id === formF.querySelector('#f-servico').value)
        const r = checarMinimo(paraCentavos(formF.querySelector('#f-valor').value), serv, baseRateio)
        aviso.innerHTML =
          r && r.abaixo
            ? `<p class="alerta alerta-vermelho">Você está fechando <strong>${formatarReais(r.diferenca)} abaixo do seu mínimo</strong>
                 (${formatarReais(r.minimo)}). Nesse valor, esse trabalho não paga seus custos.</p>`
            : r
              ? `<p class="alerta alerta-verde">Acima do seu mínimo (${formatarReais(r.minimo)}).</p>`
              : ''
        return r
      }
      // mudou valor ou pacote: a confirmação de "abaixo do mínimo" precisa ser dada de novo
      const desconfirmar = () => {
        estado.confirmarAbaixo = false
        btn.textContent = 'Confirmar fechamento'
        btn.classList.remove('botao-perigo')
      }
      formF.querySelector('#f-servico').addEventListener('change', (e) => {
        const campo = formF.querySelector('#f-valor')
        if (!campo.value.trim()) {
          const preco = precoCobradoDe(servicos.find((s) => s.id === e.target.value), baseRateio)
          if (preco) campo.value = centavosParaCampo(preco)
        }
        desconfirmar()
        checar()
      })
      formF.querySelector('#f-valor').addEventListener('input', () => (desconfirmar(), checar()))
      checar()

      // condição de pagamento: mostra os campos certos e a divisão sinal/saldo
      const condicao = () => formF.querySelector('input[name="condicao"]:checked').value
      const mostrarDivisao = () => {
        formF.querySelectorAll('[data-so]').forEach((c) => (c.hidden = c.dataset.so !== condicao()))
        const valor = paraCentavos(formF.querySelector('#f-valor').value)
        const pct = Number(String(formF.querySelector('#f-sinal-pct').value).replace(',', '.'))
        formF.querySelector('#f-divisao').innerHTML =
          condicao() === 'sinal' && valor > 0 && pct > 0 && pct < 100
            ? (() => {
                const d = dividirSinal(valor, pct)
                return `Sinal <strong>${formatarReais(d.sinal)}</strong> · saldo <strong>${formatarReais(d.saldo)}</strong> (vence na data da sessão)`
              })()
            : ''
      }
      formF.addEventListener('input', mostrarDivisao)
      formF.addEventListener('change', mostrarDivisao)
      mostrarDivisao()

      formF.addEventListener('submit', (e) => {
        e.preventDefault()
        const erro = formF.querySelector('#f-erro')
        const valor = paraCentavos(formF.querySelector('#f-valor').value)
        const data = formF.querySelector('#f-data').value
        const mostrar = (msg) => ((erro.textContent = msg), (erro.hidden = false))
        if (!(valor > 0)) return mostrar('Qual foi o valor fechado?')
        if (!data) return mostrar('Qual a data da sessão?')
        const cond = condicao()
        const sinalPct = Number(String(formF.querySelector('#f-sinal-pct').value).replace(',', '.'))
        if (cond === 'sinal' && !(sinalPct > 0 && sinalPct < 100)) return mostrar('O sinal precisa ser entre 1% e 99%.')
        erro.hidden = true

        const r = checar()
        if (r?.abaixo && !estado.confirmarAbaixo) {
          estado.confirmarAbaixo = true
          btn.textContent = 'Fechar mesmo assim'
          btn.classList.add('botao-perigo')
          return
        }
        btn.disabled = true
        salvar(null, 'Negócio fechado! 🎉 As entradas já estão no Financeiro como previstas.', () =>
          fecharLead(l.id, {
            valor,
            dataSessao: data,
            servicoId: formF.querySelector('#f-servico').value || null,
            condicao: cond,
            sinalPct,
            sinalVencimento: formF.querySelector('#f-sinal-venc').value || null,
            avistaVencimento: formF.querySelector('#f-avista-venc').value || null,
            forma: formF.querySelector('#f-forma').value,
          }),
        ).then((ok) => {
          if (ok && location.hash.endsWith('/fechar')) history.replaceState(null, '', `#/leads/${l.id}`)
          if (!ok) btn.disabled = false
        })
      })
    }

    // ---- perder ----
    const formP = el.querySelector('#form-perder')
    if (formP) {
      const outro = formP.querySelector('#p-outro')
      formP.addEventListener('change', () => {
        outro.hidden = formP.querySelector('input[name="motivo"]:checked')?.value !== 'outro'
        if (!outro.hidden) outro.focus()
      })
      formP.addEventListener('submit', (e) => {
        e.preventDefault()
        const m = formP.querySelector('input[name="motivo"]:checked')?.value
        if (!m) {
          const erro = formP.querySelector('#p-erro')
          erro.textContent = 'Escolha um motivo — ajuda a entender onde você perde clientes.'
          erro.hidden = false
          return
        }
        const motivo = m === 'outro' ? `outro: ${outro.value.trim()}` : m
        salvar({ etapa: 'perdido', motivo_perda: motivo, proximo_followup: null }, 'Marcado como perdido.')
      })
    }

    ligarNota()
  }

  desenhar()
  recarregarEventos()
}
