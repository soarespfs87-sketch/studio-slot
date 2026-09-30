// Módulo Financeiro — construído na Fase 3.

import { telaEmBreve } from '../../componentes/vazio.js'

export function render(el) {
  el.innerHTML = telaEmBreve({
    titulo: 'Financeiro',
    frase: 'O caixa do negócio mês a mês — separado do seu bolso.',
    itens: [
      'Entradas que chegam sozinhas quando você fecha um lead',
      'Fluxo de caixa em cascata: faturamento, margens e saldo final',
      'Seu salário como custo fixo, sem misturar conta pessoal',
      'Quanto deveria ter na conta e quantos meses seu saldo aguenta',
    ],
    fase: 'Fase 3',
  })
}
