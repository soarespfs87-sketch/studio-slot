// ────────────────────────────────────────────────────────────────
//  Clientes › Nova cliente / Editar cadastro
// ────────────────────────────────────────────────────────────────

import { esc } from '../../componentes/campos.js'
import { hojeISO } from '../../format.js'
import { salvarCliente, mensagemDeErro } from './dados.js'
import { normalizarWhatsApp, normalizarInstagram, formatarWhatsApp } from '../leads/regras.js'
import { cpfValido, formatarCpf, formatarCep } from './regras.js'

const campo = (id, rotulo, valor, opc = {}) => `
  <label class="campo dono-campo ${opc.cls || ''}"><span>${rotulo}</span>
    <input type="${opc.tipo || 'text'}" id="${id}" value="${esc(valor)}" ${opc.attrs || ''}
      ${opc.placeholder ? `placeholder="${esc(opc.placeholder)}"` : ''} autocomplete="off" />
    ${opc.dica ? `<small class="campo-dica">${opc.dica}</small>` : ''}</label>`

export function renderFormulario(el, { cliente }) {
  const ehNova = !cliente
  const c = cliente || {}
  const voltar = ehNova ? '#/clientes' : `#/clientes/${c.id}`
  el.innerHTML = `
    <section class="modulo">
      <a class="link-voltar-mod" href="${voltar}">&larr; ${ehNova ? 'Clientes' : esc(c.nome)}</a>
      <h1 class="titulo-editor">${ehNova ? 'Nova cliente' : 'Editar cadastro'}</h1>
      ${ehNova ? '<p class="campo-dica" style="margin-top:6px">Pra quem comprou antes de você usar o app. Quem fecha pelo funil de Leads vira cliente sozinha.</p>' : ''}
      <form id="form-cliente" class="dono-form" novalidate>
        <div class="cartao-bloco">
          <h2 class="bloco-titulo">Dados pessoais</h2>
          ${campo('c-nome', 'Nome *', c.nome)}
          ${campo('c-whats', 'WhatsApp *', c.whatsapp ? formatarWhatsApp(c.whatsapp) : '', { tipo: 'tel', placeholder: '(11) 99999-8888' })}
          <div class="dono-grid2">
            ${campo('c-email', 'E-mail', c.email, { tipo: 'email' })}
            ${campo('c-insta', 'Instagram', c.instagram ? '@' + c.instagram : '', { placeholder: '@perfil' })}
            ${campo('c-nasc', 'Data de nascimento', c.data_nascimento, { tipo: 'date', dica: 'Pro lembrete de aniversário.' })}
          </div>
        </div>
        <div class="cartao-bloco">
          <h2 class="bloco-titulo">Pro contrato</h2>
          <p class="campo-dica">Opcional agora — o contrato avisa se faltar.</p>
          <div class="dono-grid2">
            ${campo('c-cpf', 'CPF', formatarCpf(c.cpf), { attrs: 'inputmode="numeric"', placeholder: '000.000.000-00' })}
            ${campo('c-cep', 'CEP', formatarCep(c.cep), { attrs: 'inputmode="numeric"', placeholder: '00000-000' })}
          </div>
          ${campo('c-rua', 'Rua', c.rua)}
          <div class="dono-grid2">
            ${campo('c-numero', 'Número', c.numero)}
            ${campo('c-compl', 'Complemento', c.complemento)}
            ${campo('c-bairro', 'Bairro', c.bairro)}
            ${campo('c-cidade', 'Cidade', c.cidade)}
            ${campo('c-uf', 'UF', c.uf, { attrs: 'maxlength="2"', placeholder: 'SP' })}
          </div>
        </div>
        <div class="cartao-bloco">
          <label class="campo dono-campo"><span>Observações</span>
            <textarea id="c-obs" rows="3" placeholder="Preferências, história da família…">${esc(c.observacoes)}</textarea></label>
        </div>
        <p class="form-erro" id="c-erro" hidden></p>
        <div class="barra-salvar">
          <a class="botao botao-fantasma" href="${voltar}">Cancelar</a>
          <button type="submit" class="botao">${ehNova ? 'Cadastrar' : 'Salvar'}</button>
        </div>
      </form>
    </section>`

  const form = el.querySelector('#form-cliente')
  const v = (id) => form.querySelector(id).value.trim()
  const erro = (msg) => {
    const e = form.querySelector('#c-erro')
    e.textContent = msg
    e.hidden = false
    e.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const whatsapp = normalizarWhatsApp(v('#c-whats'))
    const cpf = v('#c-cpf').replace(/\D/g, '')
    const cep = v('#c-cep').replace(/\D/g, '')
    const uf = v('#c-uf').toUpperCase()
    const email = v('#c-email')
    if (!v('#c-nome')) return erro('Qual é o nome?')
    if (!whatsapp) return erro('Confira o WhatsApp: DDD + número.')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return erro('Confira o e-mail.')
    if (cpf && !cpfValido(cpf)) return erro('Esse CPF não é válido. Confira os números.')
    if (cep && cep.length !== 8) return erro('O CEP tem 8 números.')
    if (uf && !/^[A-Z]{2}$/.test(uf)) return erro('UF: duas letras, ex.: SP.')
    if (v('#c-nasc') && v('#c-nasc') > hojeISO()) return erro('A data de nascimento não pode ser no futuro.')

    const campos = {
      nome: v('#c-nome'),
      whatsapp,
      email: email || null,
      instagram: normalizarInstagram(v('#c-insta')),
      data_nascimento: v('#c-nasc') || null,
      cpf: cpf || null,
      cep: cep || null,
      rua: v('#c-rua') || null,
      numero: v('#c-numero') || null,
      complemento: v('#c-compl') || null,
      bairro: v('#c-bairro') || null,
      cidade: v('#c-cidade') || null,
      uf: uf || null,
      observacoes: v('#c-obs'),
    }
    const btn = form.querySelector('button[type="submit"]')
    btn.disabled = true
    const { cliente: salvo, error } = await salvarCliente(campos, c.id)
    if (error) {
      btn.disabled = false
      return erro(mensagemDeErro(error))
    }
    location.hash = `#/clientes/${salvo.id}`
  })

  if (ehNova) form.querySelector('#c-nome').focus()
}
