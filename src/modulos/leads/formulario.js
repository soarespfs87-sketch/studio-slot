// ────────────────────────────────────────────────────────────────
//  Leads › Novo lead / Editar lead
// ────────────────────────────────────────────────────────────────

import { esc } from '../../componentes/campos.js'
import { precoDoServico, centavosParaCampo, paraCentavos, arredondarCentavos } from '../../calculos.js'
import { hojeISO } from '../../format.js'
import { criarLead, atualizarLead, mensagemDeErro } from './dados.js'
import { ORIGENS, normalizarWhatsApp, normalizarInstagram, formatarWhatsApp } from './regras.js'

// Preço que o fotógrafo cobra hoje por um pacote (null se não dá pra calcular).
export function precoCobradoDe(servico, baseRateio) {
  if (!servico) return null
  const r = precoDoServico(servico, baseRateio)
  return r.ok ? arredondarCentavos(r.precoCobrado) : null
}

// <select> de pacotes e campanhas (agrupados)
export function opcoesServico(servicos, selecionado) {
  const grupo = (tipo, rotulo) => {
    const lista = servicos.filter((s) => s.tipo === tipo)
    return lista.length
      ? `<optgroup label="${rotulo}">${lista
          .map((s) => `<option value="${s.id}" ${s.id === selecionado ? 'selected' : ''}>${esc(s.nome)}</option>`)
          .join('')}</optgroup>`
      : ''
  }
  return `<option value="">${servicos.length ? 'Ainda não sei' : 'Cadastre seus pacotes em Preços'}</option>
    ${grupo('pacote', 'Pacotes')}${grupo('campanha', 'Campanhas temáticas')}`
}

export function renderFormulario(el, { lead, servicos, baseRateio }) {
  const ehNovo = !lead
  const l = lead || { origem: 'instagram', proximo_followup: hojeISO() }

  el.innerHTML = `
    <section class="modulo">
      <a class="link-voltar-mod" href="${ehNovo ? '#/leads' : `#/leads/${l.id}`}">&larr; ${ehNovo ? 'Leads' : esc(l.nome)}</a>
      <h1 class="titulo-editor">${ehNovo ? 'Novo lead' : 'Editar lead'}</h1>
      <form id="form-lead" class="dono-form" novalidate>
        <div class="cartao-bloco">
          <h2 class="bloco-titulo">Quem é</h2>
          <label class="campo dono-campo"><span>Nome *</span>
            <input type="text" id="l-nome" value="${esc(l.nome)}" autocomplete="off" /></label>
          <label class="campo dono-campo"><span>WhatsApp *</span>
            <input type="tel" id="l-whats" value="${esc(l.whatsapp ? formatarWhatsApp(l.whatsapp) : '')}" placeholder="(11) 99999-8888" /></label>
          <div class="dono-grid2">
            <label class="campo dono-campo"><span>Instagram</span>
              <input type="text" id="l-insta" value="${esc(l.instagram ? '@' + l.instagram : '')}" placeholder="@perfil" autocomplete="off" /></label>
            <label class="campo dono-campo"><span>E-mail</span>
              <input type="email" id="l-email" value="${esc(l.email)}" /></label>
          </div>
          <label class="campo dono-campo"><span>Como chegou até você</span>
            <select id="l-origem">${ORIGENS.map(([v, r]) => `<option value="${v}" ${l.origem === v ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
        </div>

        <div class="cartao-bloco">
          <h2 class="bloco-titulo">O que procura</h2>
          <label class="campo dono-campo"><span>Pacote ou campanha de interesse</span>
            <select id="l-servico">${opcoesServico(servicos, l.servico_id)}</select></label>
          <div class="dono-grid2">
            <label class="campo dono-campo"><span>Data prevista do ensaio</span>
              <input type="date" id="l-data" value="${l.data_prevista || ''}" /></label>
            <label class="campo dono-campo"><span>Valor estimado</span>
              <div class="entrada-prefixo"><em>R$</em>
                <input type="text" inputmode="decimal" id="l-valor" value="${esc(centavosParaCampo(l.valor_estimado_centavos))}" autocomplete="off" /></div>
              <small class="campo-dica">Vem do preço do pacote; pode mudar.</small></label>
          </div>
          <label class="campo dono-campo"><span>Observações</span>
            <textarea id="l-obs" rows="3" placeholder="O que contou, o que imaginou pro ensaio…">${esc(l.observacoes)}</textarea></label>
        </div>

        <div class="cartao-bloco">
          <h2 class="bloco-titulo">Próximo contato</h2>
          <label class="campo dono-campo"><span>Quando falar de novo</span>
            <input type="date" id="l-followup" value="${l.proximo_followup || ''}" />
            <small class="campo-dica">Aparece como lembrete no dia. Deixe em branco se não precisar.</small></label>
        </div>

        <p class="form-erro" id="l-erro" hidden></p>
        <div class="barra-salvar">
          <a class="botao botao-fantasma" href="${ehNovo ? '#/leads' : `#/leads/${l.id}`}">Cancelar</a>
          <button type="submit" class="botao">${ehNovo ? 'Cadastrar lead' : 'Salvar'}</button>
        </div>
      </form>
    </section>`

  const form = el.querySelector('#form-lead')
  const campoValor = form.querySelector('#l-valor')
  const erroEl = form.querySelector('#l-erro')

  // escolher o pacote preenche o valor (se a pessoa não digitou outro)
  let valorAuto = ehNovo || !l.valor_estimado_centavos
  campoValor.addEventListener('input', () => (valorAuto = false))
  form.querySelector('#l-servico').addEventListener('change', (e) => {
    if (!valorAuto && campoValor.value.trim()) return
    const preco = precoCobradoDe(servicos.find((s) => s.id === e.target.value), baseRateio)
    campoValor.value = preco ? centavosParaCampo(preco) : ''
    valorAuto = true
  })

  const mostrarErro = (msg) => {
    erroEl.textContent = msg
    erroEl.hidden = false
    erroEl.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const nome = form.querySelector('#l-nome').value.trim()
    const whatsapp = normalizarWhatsApp(form.querySelector('#l-whats').value)
    const valorTxt = campoValor.value.trim()
    const valor = valorTxt ? paraCentavos(valorTxt) : null
    const email = form.querySelector('#l-email').value.trim()

    if (!nome) return mostrarErro('Qual é o nome do lead?')
    if (!whatsapp) return mostrarErro('Confira o WhatsApp: DDD + número, ex.: (11) 99999-8888.')
    if (valorTxt && (valor == null || valor < 0)) return mostrarErro('Confira o valor estimado.')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return mostrarErro('Confira o e-mail.')

    const campos = {
      nome,
      whatsapp,
      instagram: normalizarInstagram(form.querySelector('#l-insta').value),
      email: email || null,
      origem: form.querySelector('#l-origem').value,
      servico_id: form.querySelector('#l-servico').value || null,
      data_prevista: form.querySelector('#l-data').value || null,
      valor_estimado_centavos: valor,
      observacoes: form.querySelector('#l-obs').value.trim(),
      proximo_followup: form.querySelector('#l-followup').value || null,
    }
    erroEl.hidden = true
    const btn = form.querySelector('button[type="submit"]')
    btn.disabled = true
    const { lead: salvo, error } = ehNovo ? await criarLead(campos) : await atualizarLead(l.id, campos)
    if (error) {
      btn.disabled = false
      return mostrarErro(mensagemDeErro(error))
    }
    location.hash = `#/leads/${salvo.id}`
  })

  if (ehNovo) form.querySelector('#l-nome').focus()
}
