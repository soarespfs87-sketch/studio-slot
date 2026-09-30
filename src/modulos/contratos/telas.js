// ────────────────────────────────────────────────────────────────
//  Contratos — telas
//   • Modelos (lista + editor com botões de etiqueta)
//   • Gerar contrato de uma compra (prévia com o que falta)
//   • Ver contrato: baixar PDF, enviar pelo WhatsApp, marcar assinado
// ────────────────────────────────────────────────────────────────

import { esc } from '../../componentes/campos.js'
import { hojeISO } from '../../format.js'
import { formatarReais } from '../../calculos.js'
import { salvarModelo, apagarModelo, salvarContrato, apagarContrato, mensagemDeErro } from './dados.js'
import { ETIQUETAS, MODELO_EXEMPLO, preencher } from './regras.js'
import { documentoHTML, baixarPDF } from './documento.js'
import { linkWhatsMsg, dataBR } from '../clientes/ui.js'

export const ROTULO_STATUS = { rascunho: 'Rascunho', enviado: 'Enviado', assinado: 'Assinado' }
export const pilulaStatus = (s) => `<span class="st-contrato st-${s}">${ROTULO_STATUS[s]}</span>`

// ════════════════════════════════════════════════════════════════
//  Modelos
// ════════════════════════════════════════════════════════════════
export function renderModelos(el, { modelos, abas, recarregar }) {
  el.innerHTML = `
    <section class="modulo modulo-largo">
      <div class="leads-topo">
        <h1 class="titulo-grande">Clientes</h1>
        <a class="botao" href="#/clientes/modelos/novo">+ Novo modelo</a>
      </div>
      ${abas}
      <p class="modulo-intro">Cole o texto do seu contrato e marque os campos com etiquetas — o app preenche com os dados de cada cliente.</p>
      ${modelos.length ? `<p class="alerta alerta-verde">Pra gerar um contrato: abra uma <a href="#/clientes">cliente</a> e clique em <strong>+ Gerar contrato</strong>.</p>` : ''}
      <p class="status-salvo" id="mod-status"></p>
      ${
        modelos.length
          ? `<div class="clientes-lista">${modelos
              .map(
                (m) => `<a class="cliente-card" href="#/clientes/modelos/${m.id}">
                  <strong>${esc(m.nome)}</strong>
                  <span class="lead-meta">atualizado em ${dataBR(m.updated_at.slice(0, 10))}</span></a>`,
              )
              .join('')}</div>`
          : `<div class="em-breve">
              <p class="em-breve-frase">Nenhum modelo ainda.</p>
              <p class="modulo-intro">Comece pelo modelo de exemplo e ajuste com o seu texto — ou crie do zero.</p>
              <button class="botao" data-acao="exemplo" style="margin-top:14px">Começar pelo modelo de exemplo</button>
            </div>`
      }
    </section>`
  el.querySelector('[data-acao="exemplo"]')?.addEventListener('click', async (e) => {
    e.target.disabled = true
    const { modelo, error } = await salvarModelo({ nome: 'Ensaio fotográfico (exemplo)', texto: MODELO_EXEMPLO })
    if (error) {
      e.target.disabled = false
      el.querySelector('#mod-status').textContent = mensagemDeErro(error)
      return
    }
    location.hash = `#/clientes/modelos/${modelo.id}`
    recarregar()
  })
}

export function renderEditorModelo(el, { modelo }) {
  const ehNovo = !modelo
  const m = modelo || { nome: '', texto: '' }
  const grupos = [...new Set(ETIQUETAS.map((e) => e.grupo))]
  el.innerHTML = `
    <section class="modulo modulo-largo">
      <a class="link-voltar-mod" href="#/clientes/modelos">&larr; Modelos de contrato</a>
      <h1 class="titulo-editor">${ehNovo ? 'Novo modelo' : esc(m.nome)}</h1>
      <p class="alerta alerta-amarelo">O app não dá orientação jurídica. Revise seu contrato com um advogado.</p>
      <form id="form-modelo" class="dono-form" novalidate>
        <div class="editor-grid">
          <div class="cartao-bloco editor-form">
            <label class="campo dono-campo"><span>Nome do modelo</span>
              <input type="text" id="m-nome" value="${esc(m.nome)}" placeholder="Ex.: Ensaio gestante" /></label>
            <label class="campo dono-campo"><span>Texto do contrato</span>
              <textarea id="m-texto" rows="22" class="texto-contrato">${esc(m.texto)}</textarea>
              <small class="campo-dica">Linha em MAIÚSCULAS vira título. Linha em branco separa parágrafos.</small></label>
          </div>
          <aside class="editor-resultado">
            <div class="resultado">
              <h2 class="bloco-titulo" style="margin-top:0">Etiquetas</h2>
              <p class="campo-dica">Clique pra colocar no texto, onde está o cursor.</p>
              ${grupos
                .map(
                  (g) => `<h3 class="sub-titulo">${g}</h3><div class="atalhos">${ETIQUETAS.filter((e) => e.grupo === g)
                    .map((e) => `<button type="button" class="mini-btn" data-etiqueta="${e.chave}" title="{${e.chave}}">${e.rotulo}</button>`)
                    .join('')}</div>`,
                )
                .join('')}
            </div>
          </aside>
        </div>
        <p class="form-erro" id="m-erro" hidden></p>
        <div class="barra-salvar">
          <a class="botao botao-fantasma" href="#/clientes/modelos">Cancelar</a>
          <button type="submit" class="botao">Salvar modelo</button>
        </div>
        ${ehNovo ? '' : '<button type="button" class="link-arquivar" data-acao="apagar">Apagar modelo</button>'}
      </form>
    </section>`

  const form = el.querySelector('#form-modelo')
  const area = form.querySelector('#m-texto')
  const erro = (msg) => ((form.querySelector('#m-erro').textContent = msg), (form.querySelector('#m-erro').hidden = false))

  form.querySelectorAll('[data-etiqueta]').forEach((b) =>
    b.addEventListener('click', () => {
      const tag = `{${b.dataset.etiqueta}}`
      const ini = area.selectionStart ?? area.value.length
      const fim = area.selectionEnd ?? ini
      area.value = area.value.slice(0, ini) + tag + area.value.slice(fim)
      area.focus()
      area.setSelectionRange(ini + tag.length, ini + tag.length)
    }),
  )

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const nome = form.querySelector('#m-nome').value.trim()
    const texto = area.value
    if (!nome) return erro('Dê um nome ao modelo.')
    if (!texto.trim()) return erro('Cole o texto do contrato.')
    const { desconhecidas } = preencher(texto, {})
    if (desconhecidas.length && !confirm(`Essas etiquetas não existem e vão aparecer como estão: ${desconhecidas.join(', ')}. Salvar mesmo assim?`)) return
    form.querySelector('button[type="submit"]').disabled = true
    const { error } = await salvarModelo({ nome, texto }, m.id)
    if (error) {
      form.querySelector('button[type="submit"]').disabled = false
      return erro(mensagemDeErro(error))
    }
    location.hash = '#/clientes/modelos'
  })

  form.querySelector('[data-acao="apagar"]')?.addEventListener('click', async () => {
    if (!confirm(`Apagar o modelo "${m.nome}"? Contratos já gerados com ele continuam iguais.`)) return
    const { error } = await apagarModelo(m.id)
    if (error) return erro(mensagemDeErro(error))
    location.hash = '#/clientes/modelos'
  })
}

// ════════════════════════════════════════════════════════════════
//  Gerar contrato de uma compra
//  valoresDe(compra) -> valores das etiquetas (montado no index)
// ════════════════════════════════════════════════════════════════
export function renderGerar(el, { cliente, compras, modelos, negocio, valoresDe }) {
  if (!modelos.length) {
    el.innerHTML = `
      <section class="modulo">
        <a class="link-voltar-mod" href="#/clientes/${cliente.id}">&larr; ${esc(cliente.nome)}</a>
        <h1 class="titulo-editor">Gerar contrato</h1>
        <div class="em-breve"><p class="em-breve-frase">Primeiro, cadastre um modelo de contrato.</p>
          <a class="botao" href="#/clientes/modelos" style="display:inline-block;margin-top:14px;text-decoration:none">Ir pros modelos</a></div>
      </section>`
    return
  }
  const estado = { compraId: compras[0]?.id || '', modeloId: modelos[0].id, editado: false }

  el.innerHTML = `
    <section class="modulo modulo-largo">
      <a class="link-voltar-mod" href="#/clientes/${cliente.id}">&larr; ${esc(cliente.nome)}</a>
      <h1 class="titulo-editor">Gerar contrato</h1>
      <div class="dono-form">
        <div class="dono-grid2">
          <label class="campo dono-campo"><span>Compra</span>
            <select id="g-compra">
              ${compras
                .map(
                  (c) => `<option value="${c.id}">${esc(c.servicoNome || 'Ensaio')} · ${formatarReais(c.valor_fechado_centavos)}${c.data_sessao ? ` · ${dataBR(c.data_sessao)}` : ''}</option>`,
                )
                .join('')}
              <option value="">Sem compra ligada</option>
            </select></label>
          <label class="campo dono-campo"><span>Modelo</span>
            <select id="g-modelo">${modelos.map((m) => `<option value="${m.id}">${esc(m.nome)}</option>`).join('')}</select></label>
        </div>
      </div>
      <div id="g-avisos"></div>
      <div class="editor-grid gerar-grid">
        <div class="cartao-bloco editor-form">
          <label class="campo dono-campo"><span>Texto deste contrato <small>(pode ajustar só pra ele)</small></span>
            <textarea id="g-texto" rows="22" class="texto-contrato"></textarea></label>
        </div>
        <div class="doc-previa" id="g-previa" aria-label="Prévia"></div>
      </div>
      <p class="form-erro" id="g-erro" hidden></p>
      <div class="barra-salvar">
        <a class="botao botao-fantasma" href="#/clientes/${cliente.id}">Cancelar</a>
        <button type="button" class="botao" id="g-salvar">Salvar e baixar PDF</button>
      </div>
    </section>`

  const $ = (s) => el.querySelector(s)
  const area = $('#g-texto')
  const previa = () => ($('#g-previa').innerHTML = documentoHTML(area.value, { negocio: negocio.nome, destacarFaltas: true }))

  const montar = () => {
    const modelo = modelos.find((m) => m.id === estado.modeloId)
    const compra = compras.find((c) => c.id === estado.compraId) || null
    const r = preencher(modelo.texto, valoresDe(compra))
    area.value = r.texto
    estado.editado = false
    const linkFalta = (f) =>
      f.startsWith('seu') || f === 'cidade do foro'
        ? `<a href="#/ajustes">${f}</a>`
        : f.includes('cliente')
          ? `<a href="#/clientes/${cliente.id}/editar">${f}</a>`
          : f === 'o que está incluído' || f === 'pacote'
            ? `<a href="#/precos/pacotes">${f}</a>`
            : f
    $('#g-avisos').innerHTML =
      (r.faltando.length
        ? `<p class="alerta alerta-amarelo">⚠ Falta: ${r.faltando.map(linkFalta).join(', ')}. Vai sair uma linha em branco pra preencher à mão.</p>`
        : '<p class="alerta alerta-verde">Todos os campos preenchidos ✓</p>') +
      (r.desconhecidas.length ? `<p class="alerta alerta-amarelo">Etiquetas que o app não conhece: ${esc(r.desconhecidas.join(', '))}</p>` : '')
    previa()
  }

  $('#g-compra').addEventListener('change', (e) => {
    if (estado.editado && !confirm('Trocar a compra refaz o texto e perde seus ajustes. Continuar?')) {
      e.target.value = estado.compraId
      return
    }
    estado.compraId = e.target.value
    montar()
  })
  $('#g-modelo').addEventListener('change', (e) => {
    if (estado.editado && !confirm('Trocar o modelo refaz o texto e perde seus ajustes. Continuar?')) {
      e.target.value = estado.modeloId
      return
    }
    estado.modeloId = e.target.value
    montar()
  })
  area.addEventListener('input', () => {
    estado.editado = true
    previa()
  })
  montar()

  $('#g-salvar').addEventListener('click', async (e) => {
    const compra = compras.find((c) => c.id === estado.compraId)
    const modelo = modelos.find((m) => m.id === estado.modeloId)
    e.target.disabled = true
    const { contrato, error } = await salvarContrato({
      cliente_id: cliente.id,
      lead_id: compra?.id || null,
      modelo_id: modelo.id,
      titulo: `${modelo.nome.replace(/\s*\(exemplo\)\s*$/i, '')} · ${cliente.nome}`,
      texto: area.value,
    })
    if (error) {
      e.target.disabled = false
      $('#g-erro').textContent = mensagemDeErro(error)
      $('#g-erro').hidden = false
      return
    }
    // o PDF abre na tela do contrato (lá o documento já está desenhado)
    try {
      sessionStorage.setItem('baixarContrato', contrato.id)
    } catch {
      /* aba privada: a pessoa clica em "Baixar PDF" */
    }
    location.hash = `#/clientes/${cliente.id}/contrato/${contrato.id}`
  })
}

// ════════════════════════════════════════════════════════════════
//  Ver contrato
// ════════════════════════════════════════════════════════════════
export function renderContrato(el, { contrato, cliente, negocio, recarregar }) {
  const k = contrato
  const hoje = hojeISO()
  const tituloPDF = `Contrato - ${cliente.nome} - ${dataBR(k.created_at.slice(0, 10)).replace(/\//g, '-')}`
  const estado = { editando: false, assinando: false }

  const desenhar = () => {
    el.innerHTML = `
      <section class="modulo modulo-largo">
        <a class="link-voltar-mod" href="#/clientes/${cliente.id}">&larr; ${esc(cliente.nome)}</a>
        <div class="ficha-topo">
          <div>
            <h1 class="titulo-editor">${esc(k.titulo)}</h1>
            ${pilulaStatus(k.status)}
            <p class="campo-dica" style="margin-top:6px">Gerado em ${dataBR(k.created_at.slice(0, 10))}${
              k.enviado_em ? ` · enviado em ${dataBR(k.enviado_em.slice(0, 10))}` : ''
            }${k.assinado_em ? ` · assinado em ${dataBR(k.assinado_em)}` : ''}</p>
          </div>
        </div>
        <p class="status-salvo" id="k-status"></p>
        <div class="contrato-acoes">
          <button type="button" class="botao" data-acao="pdf">Baixar PDF</button>
          <a class="botao botao-whats" data-acao="enviar" href="${linkWhatsMsg(cliente.whatsapp, `Oi, ${cliente.nome.split(' ')[0]}! Segue o contrato do seu ensaio. 💛 Qualquer dúvida, me chama.`)}" target="_blank" rel="noopener">Enviar pelo WhatsApp</a>
          ${k.status !== 'assinado' ? '<button type="button" class="mini-btn mini-btn-primario" data-acao="assinar">Marcar como assinado</button>' : ''}
          ${k.status !== 'assinado' ? '<button type="button" class="mini-btn" data-acao="editar">Editar texto</button>' : ''}
        </div>
        ${k.status !== 'assinado' ? '<p class="campo-dica">O WhatsApp abre com a mensagem pronta — anexe o PDF que você baixou.</p>' : '<p class="campo-dica">Contrato assinado: não pode mais ser alterado.</p>'}
        ${
          estado.assinando
            ? `<form class="cartao-bloco fu-editor" id="form-assinar">
                 <p class="fu-pergunta">Em que dia foi assinado?</p>
                 <div class="fu-linha"><input type="date" class="entrada" id="k-data" value="${hoje}" max="${hoje}" />
                   <button class="botao" type="submit">Confirmar</button>
                   <button class="botao botao-fantasma" type="button" data-acao="cancelar">Cancelar</button></div>
               </form>`
            : ''
        }
        ${
          estado.editando
            ? `<form class="cartao-bloco" id="form-editar">
                 <textarea id="k-texto" rows="22" class="texto-contrato entrada">${esc(k.texto)}</textarea>
                 <div class="linha-acao"><button class="botao" type="submit">Salvar texto</button>
                   <button class="botao botao-fantasma" type="button" data-acao="cancelar">Cancelar</button></div>
               </form>`
            : ''
        }
        <div class="doc-previa doc-final">${documentoHTML(k.texto, { negocio: negocio.nome })}</div>
        ${k.status !== 'assinado' ? '<button type="button" class="link-arquivar" data-acao="apagar">Apagar contrato</button>' : ''}
      </section>`
    ligar()
  }

  const status = (msg, tipo = 'erro') => {
    const s = el.querySelector('#k-status')
    s.textContent = msg
    s.dataset.tipo = tipo
  }
  const gravar = async (campos, ok) => {
    const { contrato: novo, error } = await salvarContrato(campos, k.id)
    if (error) return status(mensagemDeErro(error))
    Object.assign(k, novo)
    estado.editando = false
    estado.assinando = false
    desenhar()
    status(ok, 'ok')
    recarregar?.()
  }

  function ligar() {
    const on = (s, fn) => el.querySelector(s)?.addEventListener('click', fn)
    on('[data-acao="pdf"]', () => baixarPDF(tituloPDF))
    on('[data-acao="enviar"]', () => {
      if (k.status === 'rascunho') gravar({ status: 'enviado', enviado_em: new Date().toISOString() }, 'Marcado como enviado ✓')
    })
    on('[data-acao="assinar"]', () => ((estado.assinando = true), (estado.editando = false), desenhar()))
    on('[data-acao="editar"]', () => ((estado.editando = true), (estado.assinando = false), desenhar()))
    el.querySelectorAll('[data-acao="cancelar"]').forEach((b) =>
      b.addEventListener('click', () => ((estado.editando = false), (estado.assinando = false), desenhar())),
    )
    el.querySelector('#form-assinar')?.addEventListener('submit', (e) => {
      e.preventDefault()
      const data = el.querySelector('#k-data').value
      if (!data || data > hoje) return status('Escolha uma data até hoje.')
      if (!confirm('Depois de assinado, o contrato não pode mais ser alterado. Confirmar?')) return
      gravar({ status: 'assinado', assinado_em: data }, 'Contrato assinado ✓')
    })
    el.querySelector('#form-editar')?.addEventListener('submit', (e) => {
      e.preventDefault()
      gravar({ texto: el.querySelector('#k-texto').value }, 'Texto salvo ✓')
    })
    on('[data-acao="apagar"]', async () => {
      if (!confirm('Apagar este contrato?')) return
      const { error } = await apagarContrato(k.id)
      if (error) return status(mensagemDeErro(error))
      location.hash = `#/clientes/${cliente.id}`
    })
  }

  desenhar()
  try {
    if (sessionStorage.getItem('baixarContrato') === k.id) {
      sessionStorage.removeItem('baixarContrato')
      setTimeout(() => baixarPDF(tituloPDF), 300)
    }
  } catch {
    /* sem sessionStorage: segue sem abrir o PDF sozinho */
  }
}
