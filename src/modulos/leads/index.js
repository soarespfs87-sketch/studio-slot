// Módulo Leads (CRM) — construído na Fase 2.

import { telaEmBreve } from '../../componentes/vazio.js'

export function render(el) {
  el.innerHTML = telaEmBreve({
    titulo: 'Leads',
    frase: 'Todo mundo que pediu orçamento, organizado do primeiro "oi" até o fechamento.',
    itens: [
      'Etapas: novo, contato iniciado, proposta enviada, negociação, fechado ou perdido',
      'Ficha de cada lead com histórico e botão de WhatsApp',
      'Lembrete de follow-up pra ninguém ficar sem resposta',
      'Aviso quando você fecha abaixo do seu preço mínimo',
    ],
    fase: 'Fase 2',
  })
}
