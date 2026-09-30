import { describe, it, expect } from 'vitest'
import { valorPorExtenso, numeroPorExtenso, dataPorExtenso, descreverPagamento, preencher, LINHA_EM_BRANCO } from './regras.js'

describe('valor por extenso', () => {
  it('exemplos do briefing', () => {
    expect(valorPorExtenso(255000)).toBe('dois mil, quinhentos e cinquenta reais')
    expect(valorPorExtenso(100000150)).toBe('um milhão e um reais e cinquenta centavos')
  })
  it('casos comuns', () => {
    expect(valorPorExtenso(100)).toBe('um real')
    expect(valorPorExtenso(1)).toBe('um centavo')
    expect(valorPorExtenso(10000)).toBe('cem reais')
    expect(valorPorExtenso(10100)).toBe('cento e um reais')
    expect(valorPorExtenso(250000)).toBe('dois mil e quinhentos reais')
    expect(valorPorExtenso(100100)).toBe('mil e um reais')
    expect(valorPorExtenso(76550)).toBe('setecentos e sessenta e cinco reais e cinquenta centavos')
    expect(valorPorExtenso(100000000)).toBe('um milhão de reais')
    expect(valorPorExtenso(125000000)).toBe('um milhão, duzentos e cinquenta mil reais')
    expect(valorPorExtenso(1600000)).toBe('dezesseis mil reais')
  })
  it('números', () => {
    expect(numeroPorExtenso(19)).toBe('dezenove')
    expect(numeroPorExtenso(2021)).toBe('dois mil e vinte e um')
  })
})

it('data por extenso', () => {
  expect(dataPorExtenso('2026-09-30')).toBe('30 de setembro de 2026')
  expect(dataPorExtenso('2026-10-01')).toBe('1º de outubro de 2026')
})

describe('forma de pagamento', () => {
  const E = (parcela, valor, venc, extra = {}) => ({ grupo: 'receita_op', parcela, valor_centavos: valor, status: 'previsto', vencimento: venc, forma_pagamento: 'pix', ...extra })
  it('sinal + saldo', () => {
    expect(descreverPagamento([E('sinal', 76500, '2026-10-15'), E('saldo', 178500, '2026-11-10')]).replace(/\s/g, ' ')).toBe(
      'sinal de R$ 765,00 até 15/10/2026 e saldo de R$ 1.785,00 até 10/11/2026, via Pix',
    )
  })
  it('à vista (usa a data do pagamento quando já pago)', () => {
    expect(descreverPagamento([E('integral', 255000, '2026-11-10', { status: 'pago', pago_em: '2026-10-02', forma_pagamento: 'cartao' })]).replace(/\s/g, ' ')).toBe(
      'R$ 2.550,00 à vista até 02/10/2026, via cartão',
    )
  })
  it('sem entradas: vazio (vira "falta")', () => {
    expect(descreverPagamento([])).toBe('')
  })
})

describe('preencher o modelo', () => {
  it('troca as etiquetas, marca o que falta e avisa etiqueta desconhecida', () => {
    const r = preencher('Contrato de {cliente_nome}, CPF {cliente_cpf}. {cliente_cpf} {inventada}', {
      cliente_nome: 'Maria',
      cliente_cpf: '',
    })
    expect(r.texto).toBe(`Contrato de Maria, CPF ${LINHA_EM_BRANCO}. ${LINHA_EM_BRANCO} {inventada}`)
    expect(r.faltando).toEqual(['CPF da cliente'])
    expect(r.desconhecidas).toEqual(['{inventada}'])
  })
})
