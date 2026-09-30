// ────────────────────────────────────────────────────────────────
//  Clientes › Ficha: lembretes dela, dados, família (com "o bebê
//  nasceu?"), compras e observações.
// ────────────────────────────────────────────────────────────────

import { esc } from '../../componentes/campos.js'
import { formatarReais } from '../../calculos.js'
import { hojeISO } from '../../format.js'
import { formatarWhatsApp, linkWhatsApp } from '../leads/regras.js'
import { iconeWhats } from '../leads/ui.js'
import { salvarFamiliar, apagarFamiliar, apagarCliente, marcarLembreteFeito, mensagemDeErro } from './dados.js'
import { PARENTESCOS, rotuloParentesco, idadeEm, textoIdade, formatarCpf, formatarCep } from './regras.js'
import { itemLembrete, dataBR } from './ui.js'

function enderecoTexto(c) {
  const linha1 = [c.rua, c.numero].filter(Boolean).join(', ')
  const partes = [linha1 + (c.complemento ? ` — ${c.complemento}` : ''), c.bairro, [c.cidade, c.uf].filter(Boolean).join('/'), c.cep ? `CEP ${formatarCep(c.cep)}` : '']
  return partes.filter((p) => p && p.trim()).join(' · ')
}

// O que o contrato vai pedir e ainda não tem.
function faltaProContrato(c) {
  const f = []
  if (!c.cpf) f.push('CPF')
  if (!c.rua || !c.cidade) f.push('endereço')
  return f
}

function itemFamiliar(f, hoje, editando, nascendo) {
  if (editando) return formFamiliar(f)
  if (nascendo) {
    return `
      <li class="fam-item fam-editando">
        <form class="fam-form" data-nasceu="${f.id}">
          <p class="fu-pergunta">Que alegria! 💛 Conta como foi:</p>
          <div class="dono-grid2">
            <label class="campo dono-campo"><span>Nome do bebê</span><input type="text" name="nome" required /></label>
            <label class="campo dono-campo"><span>É</span><select name="parentesco"><option value="filha">Menina</option><option value="filho">Menino</option></select></label>
            <label class="campo dono-campo"><span>Nasceu em</span><input type="date" name="data" value="${f.data_prevista_parto > hoje ? hoje : f.data_prevista_parto}" max="${hoje}" /></label>
          </div>
          <div class="linha-acao"><button class="botao" type="submit">Salvar</button><button class="botao botao-fantasma" type="button" data-cancelar-fam>Cancelar</button></div>
        </form>
      </li>`
  }
  const info =
    f.parentesco === 'gestacao'
      ? `parto previsto ${dataBR(f.data_prevista_parto)}`
      : f.data_nascimento
        ? `${dataBR(f.data_nascimento)} · ${(() => {
            const i = idadeEm(f.data_nascimento, hoje)
            return i < 1 ? 'menos de 1 ano' : textoIdade(i)
          })()}`
        : 'sem data de nascimento'
  return `
    <li class="fam-item">
      <div class="fam-texto"><strong>${esc(f.nome || 'Bebê a caminho')}</strong><small>${f.parentesco === 'gestacao' ? info : `${rotuloParentesco(f.parentesco)} · ${info}`}</small></div>
      <div class="fam-acoes">
        ${f.parentesco === 'gestacao' ? `<button type="button" class="mini-btn mini-btn-primario" data-nasceu-abrir="${f.id}">O bebê nasceu?</button>` : ''}
        <button type="button" class="mini-btn" data-editar-fam="${f.id}">Editar</button>
      </div>
    </li>`
}

function formFamiliar(f = null) {
  const p = f?.parentesco || 'filho'
  return `
    <li class="fam-item fam-editando">
      <form class="fam-form" data-fam="${f?.id || ''}">
        <div class="dono-grid2">
          <label class="campo dono-campo"><span>Quem é</span>
            <select name="parentesco">${PARENTESCOS.map(([v, r]) => `<option value="${v}" ${p === v ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
          <label class="campo dono-campo" data-nome><span>Nome</span><input type="text" name="nome" value="${esc(f?.nome)}" /></label>
          <label class="campo dono-campo" data-nasc><span>Data de nascimento</span><input type="date" name="nasc" value="${f?.data_nascimento || ''}" max="${hojeISO()}" /></label>
          <label class="campo dono-campo" data-dpp><span>Data prevista do parto</span><input type="date" name="dpp" value="${f?.data_prevista_parto || ''}" /></label>
        </div>
        <p class="form-erro" data-erro hidden></p>
        <div class="linha-acao">
          <button class="botao" type="submit">Salvar</button>
          <button class="botao botao-fantasma" type="button" data-cancelar-fam>Cancelar</button>
          ${f ? `<button class="link-arquivar" type="button" data-apagar-fam="${f.id}">Remover</button>` : ''}
        </div>
      </form>
    </li>`
}

export function renderFicha(el, { cliente, compras, lembretes, negocio, recarregar }) {
  const c = cliente
  const hoje = hojeISO()
  const estado = { editandoFam: null, nascendo: null, novoFam: false }
  const total = compras.reduce((t, l) => t + (l.valor_fechado_centavos || 0), 0)
  const ultima = compras[0]?.data_sessao
  const falta = faltaProContrato(c)

  const desenhar = () => {
    const linha = (rot, val) => (val ? `<div class="rl"><dt>${rot}</dt><dd>${val}</dd></div>` : '')
    el.innerHTML = `
      <section class="modulo modulo-largo">
        <a class="link-voltar-mod" href="#/clientes">&larr; Clientes</a>
        <div class="ficha-topo">
          <div>
            <h1 class="titulo-editor">${esc(c.nome)}</h1>
            <span class="etapa-pill etapa-fechado">${compras.length} ${compras.length === 1 ? 'compra' : 'compras'}${ultima ? ` · última em ${dataBR(ultima)}` : ''}</span>
          </div>
          <a class="btn-whats btn-whats-grande" href="${linkWhatsApp(c.whatsapp, c.nome, negocio.nome)}" target="_blank" rel="noopener">${iconeWhats}<span>WhatsApp</span></a>
        </div>
        <p class="status-salvo" id="cli-status"></p>

        ${
          lembretes.length
            ? `<div class="cartao-bloco"><h2 class="bloco-titulo">Lembretes</h2>
                 <ul class="lembretes">${lembretes.map((l) => itemLembrete(l, c.whatsapp, { comCliente: false })).join('')}</ul></div>`
            : ''
        }

        <div class="ficha-grid">
          <div>
            <div class="cartao-bloco">
              <div class="bloco-cabeca"><h2 class="bloco-titulo">Dados</h2><a class="mini-btn" href="#/clientes/${c.id}/editar">Editar</a></div>
              <dl class="res-detalhe ficha-dados">
                ${linha('WhatsApp', formatarWhatsApp(c.whatsapp))}
                ${linha('E-mail', c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '')}
                ${linha('Instagram', c.instagram ? `<a href="https://instagram.com/${encodeURIComponent(c.instagram)}" target="_blank" rel="noopener">@${esc(c.instagram)}</a>` : '')}
                ${linha('Nascimento', c.data_nascimento ? `${dataBR(c.data_nascimento)} · ${idadeEm(c.data_nascimento, hoje)} anos` : '')}
                ${linha('CPF', c.cpf ? formatarCpf(c.cpf) : '')}
                ${linha('Endereço', esc(enderecoTexto(c)))}
              </dl>
              ${
                falta.length
                  ? `<p class="alerta alerta-amarelo">Pro contrato falta: <strong>${falta.join(' e ')}</strong>. <a href="#/clientes/${c.id}/editar">Completar</a></p>`
                  : ''
              }
              ${!c.data_nascimento ? '<p class="campo-dica" style="margin-top:8px">Sem data de nascimento: sem lembrete de aniversário.</p>' : ''}
              ${c.observacoes ? `<p class="ficha-obs">${esc(c.observacoes).replace(/\n/g, '<br>')}</p>` : ''}
            </div>

            <div class="cartao-bloco">
              <h2 class="bloco-titulo">Família</h2>
              <ul class="fam-lista">
                ${c.familiares.map((f) => itemFamiliar(f, hoje, estado.editandoFam === f.id, estado.nascendo === f.id)).join('')}
                ${estado.novoFam ? formFamiliar() : ''}
              </ul>
              ${
                estado.novoFam
                  ? ''
                  : `<button type="button" class="mini-btn mini-btn-primario" data-acao="novo-fam">+ Adicionar ${c.familiares.length ? 'mais alguém' : 'filho, cônjuge ou bebê a caminho'}</button>`
              }
            </div>
          </div>

          <div>
            <div class="cartao-bloco">
              <h2 class="bloco-titulo">Compras</h2>
              ${
                compras.length
                  ? `<ul class="lanc-lista">${compras
                      .map(
                        (l) => `
                    <li class="lanc"><a class="lanc-link" href="#/leads/${l.id}">
                      <span class="lanc-data">${l.data_sessao ? dataBR(l.data_sessao).slice(0, 5) + '<br>' + l.data_sessao.slice(0, 4) : ''}</span>
                      <span class="lanc-desc"><strong>${esc(l.servicoNome || 'Ensaio')}</strong><small>sessão</small></span>
                      <span class="lanc-valor">${formatarReais(l.valor_fechado_centavos)}</span></a></li>`,
                      )
                      .join('')}</ul>
                    <div class="rl rl-forte" style="margin-top:6px"><dt>Total</dt><dd>${formatarReais(total)}</dd></div>`
                  : '<p class="vazio-mini">Nenhuma compra ligada ainda.</p>'
              }
            </div>
            <button type="button" class="link-arquivar" data-acao="apagar">Apagar cliente</button>
          </div>
        </div>
      </section>`
    ligar()
  }

  const status = (msg, tipo = 'erro') => {
    const s = el.querySelector('#cli-status')
    s.textContent = msg
    s.dataset.tipo = tipo
  }

  function ligar() {
    el.querySelector('[data-acao="novo-fam"]')?.addEventListener('click', () => {
      estado.novoFam = true
      estado.editandoFam = null
      desenhar()
    })
    el.querySelectorAll('[data-editar-fam]').forEach((b) =>
      b.addEventListener('click', () => {
        estado.editandoFam = b.dataset.editarFam
        estado.novoFam = false
        desenhar()
      }),
    )
    el.querySelectorAll('[data-nasceu-abrir]').forEach((b) =>
      b.addEventListener('click', () => ((estado.nascendo = b.dataset.nasceuAbrir), desenhar())),
    )
    el.querySelectorAll('[data-cancelar-fam]').forEach((b) =>
      b.addEventListener('click', () => {
        estado.novoFam = false
        estado.editandoFam = null
        estado.nascendo = null
        desenhar()
      }),
    )

    // formulário de familiar: mostra nome/nascimento ou data do parto conforme o parentesco
    el.querySelectorAll('form[data-fam]').forEach((form) => {
      const ajustar = () => {
        const gest = form.parentesco.value === 'gestacao'
        form.querySelector('[data-nome]').hidden = gest
        form.querySelector('[data-nasc]').hidden = gest
        form.querySelector('[data-dpp]').hidden = !gest
      }
      ajustar()
      form.parentesco.addEventListener('change', ajustar)
      form.addEventListener('submit', async (e) => {
        e.preventDefault()
        const gest = form.parentesco.value === 'gestacao'
        const campos = {
          cliente_id: c.id,
          parentesco: form.parentesco.value,
          nome: gest ? '' : form.nome.value.trim(),
          data_nascimento: gest ? null : form.nasc.value || null,
          data_prevista_parto: gest ? form.dpp.value || null : null,
        }
        const erro = form.querySelector('[data-erro]')
        if (!gest && !campos.nome) return ((erro.textContent = 'Qual é o nome?'), (erro.hidden = false))
        if (gest && !campos.data_prevista_parto) return ((erro.textContent = 'Qual a data prevista do parto?'), (erro.hidden = false))
        if (campos.data_nascimento && campos.data_nascimento > hojeISO()) return ((erro.textContent = 'A data de nascimento não pode ser no futuro.'), (erro.hidden = false))
        form.querySelector('button[type="submit"]').disabled = true
        const { error } = await salvarFamiliar(campos, form.dataset.fam || null)
        if (error) {
          form.querySelector('button[type="submit"]').disabled = false
          return ((erro.textContent = mensagemDeErro(error)), (erro.hidden = false))
        }
        recarregar('Salvo ✓')
      })
      form.querySelector('[data-apagar-fam]')?.addEventListener('click', async (e) => {
        if (!confirm('Remover essa pessoa da família?')) return
        const { error } = await apagarFamiliar(e.target.dataset.apagarFam)
        if (error) return status(mensagemDeErro(error))
        recarregar('Removido ✓')
      })
    })

    // "o bebê nasceu?": vira filho/filha com a data de nascimento
    el.querySelectorAll('form[data-nasceu]').forEach((form) =>
      form.addEventListener('submit', async (e) => {
        e.preventDefault()
        if (!form.nome.value.trim()) return form.nome.focus()
        if (form.data.value > hojeISO()) return status('A data de nascimento não pode ser no futuro.')
        const { error } = await salvarFamiliar(
          {
            parentesco: form.parentesco.value,
            nome: form.nome.value.trim(),
            data_nascimento: form.data.value || null,
            data_prevista_parto: null,
          },
          form.dataset.nasceu,
        )
        if (error) return status(mensagemDeErro(error))
        recarregar('Bem-vindo(a) ao mundo! 💛')
      }),
    )

    el.querySelectorAll('[data-feito]').forEach((b) =>
      b.addEventListener('click', async () => {
        b.disabled = true
        const { error } = await marcarLembreteFeito(b.dataset.cliente, b.dataset.feito)
        if (error) {
          b.disabled = false
          return status(mensagemDeErro(error))
        }
        recarregar('Feito ✓')
      }),
    )

    el.querySelector('[data-acao="apagar"]').addEventListener('click', async () => {
      if (!confirm(`Apagar a ficha de "${c.nome}"? A família e os lembretes vão junto. As compras continuam nos Leads e no Financeiro.`)) return
      const { error } = await apagarCliente(c.id)
      if (error) return status(mensagemDeErro(error))
      location.hash = '#/clientes'
    })
  }

  desenhar()
}
