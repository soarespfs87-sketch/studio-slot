// Pedacinhos de tela do módulo Preços.

import { esc } from '../../componentes/campos.js'
import {
  baseDoNegocio,
  centavosParaCampo,
  formatarReais,
  formatarPct,
  paraCentavos,
  paraNumero,
} from '../../calculos.js'

export { esc, formatarReais, formatarPct }

// Custos fixos + depreciação + base do rateio, a partir do que está carregado.
export const baseAtual = (dados) =>
  baseDoNegocio({
    custosFixos: dados.custos,
    equipamentos: dados.equipamentos,
    prolaboreCentavos: dados.config.prolabore_centavos,
  })

// Campo de dinheiro com "R$" na frente. O valor vem/volta em centavos.
export function campoDinheiro(id, rotulo, centavos, opc = {}) {
  return `
    <label class="campo dono-campo">
      <span>${rotulo}</span>
      <div class="entrada-prefixo"><em>R$</em>
        <input type="text" inputmode="decimal" id="${id}" value="${esc(centavosParaCampo(centavos))}"
          ${opc.placeholder ? `placeholder="${esc(opc.placeholder)}"` : ''} autocomplete="off" />
      </div>
      ${opc.dica ? `<small class="campo-dica">${opc.dica}</small>` : ''}
    </label>`
}

// Campo numérico simples (percentual, meses, quantidade...).
export function campoNumero(id, rotulo, valor, opc = {}) {
  return `
    <label class="campo dono-campo">
      <span>${rotulo}</span>
      <div class="${opc.sufixo ? 'entrada-prefixo entrada-sufixo' : 'entrada-simples'}">
        <input type="text" inputmode="${opc.inteiro ? 'numeric' : 'decimal'}" id="${id}"
          value="${esc(valor == null ? '' : String(valor).replace('.', ','))}" autocomplete="off"
          ${opc.placeholder ? `placeholder="${esc(opc.placeholder)}"` : ''} />
        ${opc.sufixo ? `<em>${opc.sufixo}</em>` : ''}
      </div>
      ${opc.dica ? `<small class="campo-dica">${opc.dica}</small>` : ''}
    </label>`
}

// Lê campos do formulário.
export const lerCentavos = (raiz, sel) => paraCentavos(raiz.querySelector(sel)?.value ?? '')
export const lerNumero = (raiz, sel) => paraNumero(raiz.querySelector(sel)?.value ?? '')
export const lerTexto = (raiz, sel) => (raiz.querySelector(sel)?.value ?? '').trim()

export const ROTULO_SEMAFORO = {
  vermelho: 'Abaixo do mínimo',
  amarelo: 'Abaixo do sugerido',
  verde: 'No preço',
}

export const pilulaSemaforo = (cor) =>
  `<span class="semaforo semaforo-${cor}">${ROTULO_SEMAFORO[cor]}</span>`

// Os 3 números do topo (custos fixos, depreciação, base do rateio).
export function resumoBase(base, { comLink = false } = {}) {
  return `
    <div class="precos-resumo">
      <div class="pr-item"><span>Custos fixos do mês</span><strong>${formatarReais(base.custosFixosMes)}</strong><small>com seu salário</small></div>
      <div class="pr-item"><span>Desgaste dos equipamentos</span><strong>${formatarReais(base.depreciacaoMes)}</strong><small>por mês</small></div>
      <div class="pr-item pr-destaque"><span>Base do rateio</span><strong>${formatarReais(base.baseRateio)}</strong><small>${
        comLink ? '<a href="#/precos/base">editar a base →</a>' : 'dividida entre os pacotes'
      }</small></div>
    </div>
    ${
      base.baseRateio <= 0
        ? `<p class="alerta alerta-amarelo">Cadastre seus custos fixos e seu salário em
             <a href="#/precos/base">Base do negócio</a> — senão o preço não paga suas contas.</p>`
        : ''
    }`
}

// Status "Salvando… / Salvo ✓ / erro" que some sozinho.
export function avisar(el, texto, tipo = 'ok') {
  if (!el) return
  el.textContent = texto
  el.dataset.tipo = tipo
  clearTimeout(el._t)
  if (tipo === 'ok') el._t = setTimeout(() => (el.textContent = ''), 1800)
}
