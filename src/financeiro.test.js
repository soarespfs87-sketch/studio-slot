import { describe, it, expect } from 'vitest'
import { fluxoDeCaixa, depreciacaoNoMes, somarMeses, dividirSinal } from './calculos.js'

// Exemplo do briefing, seção 5.4 (primeiro mês = 2026-09, saldo de partida R$ 5.000)
const L = (grupo, categoria, reais, pago_em = '2026-09-15', extra = {}) => ({
  grupo, categoria, valor_centavos: Math.round(reais * 100), status: 'pago', pago_em, ...extra,
})
const lancamentos = [
  L('receita_op', 'Receita de serviços', 2550, '2026-09-05', { forma_pagamento: 'cartao' }),
  ...[1, 2, 3, 4].map(() => L('receita_op', 'Receita de serviços', 390)),
  L('custo_direto', 'Compra de produtos/álbuns', 150),
  L('custo_direto', 'Kit de boas-vindas', 130),
  L('custo_variavel', 'Tarifa de cartão', 127.5),
  L('custo_variavel', 'Imposto', 411),
  L('custo_fixo', 'Vários', 1880),
  L('custo_fixo', 'Seu salário (pró-labore)', 2500),
  L('despesa_nao_op', 'Investimento', 1800),
  // previsto não conta; pago antes do início não conta
  { grupo: 'receita_op', categoria: 'x', valor_centavos: 999900, status: 'previsto', vencimento: '2026-09-20' },
  L('receita_op', 'Receita de serviços', 9999, '2026-08-30'),
]
const equipamentos = [{ valor_compra_centavos: 1200000, vida_util_meses: 60 }]
const base = { lancamentos, equipamentos, saldoInicialInformado: 500000, mesInicio: '2026-09', custosFixosMes: 438000, impostoPct: 10 }
const reais = (c) => Math.round(c) / 100

describe('fluxo de caixa — exemplo 5.4', () => {
  const r = fluxoDeCaixa({ ...base, mes: '2026-09' })
  it('monta a cascata', () => {
    expect(reais(r.receitasOp)).toBe(4110)
    expect(reais(r.margem)).toBe(3830)
    expect(reais(r.margemContribuicao)).toBe(3291.5)
    expect(reais(r.margemLiquida)).toBe(-1088.5)
    expect(reais(r.resultado)).toBe(-3088.5)
  })
  it('saldo, dinheiro na conta e fôlego', () => {
    expect(reais(r.saldoInicial)).toBe(5000)
    expect(reais(r.saldoFinal)).toBe(1911.5)
    expect(reais(r.dinheiroNaConta)).toBe(2111.5)
    expect(r.folego).toBe(0)
  })
  it('avisa margem líquida negativa e não pede imposto (já lançado)', () => {
    expect(r.alertas.map((a) => a.tipo)).toEqual(['margem-negativa'])
  })
})

describe('saldo encadeado', () => {
  it('o mês seguinte começa com o saldo final do anterior', () => {
    const r = fluxoDeCaixa({ ...base, mes: '2026-10' })
    expect(reais(r.saldoInicial)).toBe(1911.5)
    expect(reais(r.resultado)).toBe(-200) // só a depreciação
    expect(reais(r.saldoFinal)).toBe(1711.5)
    expect(reais(r.reservaEquipamento)).toBe(400)
    expect(reais(r.dinheiroNaConta)).toBe(2111.5) // o extrato não muda: a depreciação não sai da conta
  })
  it('corrigir um lançamento antigo muda os meses seguintes', () => {
    const corrigido = lancamentos.map((l) => (l.categoria === 'Investimento' ? { ...l, valor_centavos: 100000 } : l))
    expect(reais(fluxoDeCaixa({ ...base, lancamentos: corrigido, mes: '2026-10' }).saldoInicial)).toBe(2711.5)
  })
  it('antes do mês de início / sem configurar', () => {
    expect(fluxoDeCaixa({ ...base, mes: '2026-08' }).falta).toBe('antes-do-inicio')
    expect(fluxoDeCaixa({ ...base, saldoInicialInformado: null, mes: '2026-09' }).falta).toBe('configurar')
  })
})

describe('alertas', () => {
  it('pede pra separar imposto e mostra retirada extra', () => {
    const r = fluxoDeCaixa({
      ...base,
      lancamentos: [L('receita_op', 'Receita de serviços', 1000), L('despesa_nao_op', 'Retirada extra do sócio', 300)],
      mes: '2026-09',
    })
    const tipos = Object.fromEntries(r.alertas.map((a) => [a.tipo, a.valor]))
    expect(tipos['separar-imposto']).toBe(10000)
    expect(tipos['retirada-extra']).toBe(30000)
  })
})

describe('depreciação por mês', () => {
  const eq = [{ valor_compra_centavos: 600000, vida_util_meses: 3, data_compra: '2026-09-20' }]
  it('só entre a compra e o fim da vida útil', () => {
    expect(depreciacaoNoMes(eq, '2026-08')).toBe(0)
    expect(depreciacaoNoMes(eq, '2026-09')).toBe(200000)
    expect(depreciacaoNoMes(eq, '2026-11')).toBe(200000)
    expect(depreciacaoNoMes(eq, '2026-12')).toBe(0)
  })
  it('vira o ano certinho', () => {
    expect(somarMeses('2026-12', 1)).toBe('2027-01')
    expect(somarMeses('2027-01', -1)).toBe('2026-12')
  })
})

it('sinal + saldo', () => {
  expect(dividirSinal(255000, 30)).toEqual({ sinal: 76500, saldo: 178500 })
  expect(dividirSinal(100001, 50)).toEqual({ sinal: 50001, saldo: 50000 })
})
