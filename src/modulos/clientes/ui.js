// Pedacinhos de tela de Clientes (também usados no Início).

import { esc } from '../../componentes/campos.js'

const ROTULO_TIPO = {
  aniversario: '🎂 Aniversário',
  'aniversario-filho': '🎈 Aniversário do filho',
  festa: '🎉 Ação de venda · festa',
  parto: '👶 Parto',
  recompra: '🔁 Ação de venda · recompra',
}

export const linkWhatsMsg = (numero, msg) => `https://wa.me/${numero}?text=${encodeURIComponent(msg)}`

// '2026-10-02' -> '02/10/2026'
export const dataBR = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '')

// Um lembrete com WhatsApp (mensagem pronta) e "Feito ✓".
export function itemLembrete(l, whatsapp, { comCliente = true } = {}) {
  const tag = l.tipo === 'parto' && l.venda ? '👶 Ação de venda · newborn' : ROTULO_TIPO[l.tipo]
  return `
    <li class="lembrete ${l.venda ? 'lembrete-venda' : ''} ${l.dias < 0 ? 'lembrete-passou' : l.dias === 0 ? 'lembrete-hoje' : ''}">
      <div class="lb-texto">
        <span class="lb-tag">${tag}</span>
        <strong>${esc(l.titulo)}</strong>
        ${comCliente ? `<a class="lb-cliente" href="#/clientes/${l.clienteId}">${esc(l.cliente)} →</a>` : ''}
      </div>
      <div class="lb-acoes">
        ${whatsapp ? `<a class="botao botao-whats" href="${linkWhatsMsg(whatsapp, l.mensagem)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        <button type="button" class="mini-btn" data-feito="${esc(l.chave)}" data-cliente="${l.clienteId}">Feito ✓</button>
      </div>
    </li>`
}
