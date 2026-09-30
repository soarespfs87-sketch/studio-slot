import { describe, it, expect } from 'vitest'
import { calcularLembretes, aniversarioNoAno, idadeEm, cpfValido, somarMesesData } from './regras.js'

// Exemplos do briefing, seção 12 ("hoje" = 30/09/2026)
const HOJE = '2026-09-30'
const CFG = { lembrete_aniv_dias: 3, lembrete_festa_dias: 60, lembrete_parto_dias: 7, lembrete_recompra_meses: 11 }
const clientes = [
  { id: 'c1', nome: 'Maria Souza', data_nascimento: '1990-10-02', familiares: [] },
  { id: 'c2', nome: 'Ana Lima', familiares: [{ id: 'f1', nome: 'Theo', parentesco: 'filho', data_nascimento: '2025-11-29' }] },
  { id: 'c3', nome: 'Bia Costa', familiares: [{ id: 'f2', nome: '', parentesco: 'gestacao', data_prevista_parto: '2026-10-05' }] },
  { id: 'c4', nome: 'Carla Dias', familiares: [], ultimaCompra: '2025-10-20' },
]
const achar = (lista, tipo) => lista.find((l) => l.tipo === tipo)

describe('lembretes — exemplos da seção 12', () => {
  const l = calcularLembretes({ clientes, config: CFG, hoje: HOJE, negocio: 'Ana Lima Fotografia' })
  it('aniversário da cliente em 2 dias', () => {
    const a = achar(l, 'aniversario')
    expect(a.titulo).toBe('Aniversário de Maria em 2 dias · faz 36 anos')
    expect(a.chave).toBe('aniv:c1:2026')
  })
  it('festa do Theo: 1 aninho em 60 dias (ação de venda)', () => {
    const f = achar(l, 'festa')
    expect(f.titulo).toBe('Festa: 1 aninho do Theo em 60 dias (Ana)')
    expect(f.venda).toBe(true)
  })
  it('parto previsto em 5 dias', () => {
    expect(achar(l, 'parto').titulo).toBe('Parto de Bia previsto em 5 dias')
  })
  it('recompra 11 meses depois da última compra', () => {
    const r = achar(l, 'recompra')
    expect(r.data).toBe('2026-09-20')
    expect(r.chave).toBe('recompra:c4:2025-10-20')
  })
  it('vem em ordem de data', () => {
    expect(l.map((x) => x.tipo)).toEqual(['recompra', 'aniversario', 'parto', 'festa'])
  })
})

describe('feito some e volta no ano seguinte', () => {
  it('aniversário marcado em 2026 some', () => {
    const l = calcularLembretes({ clientes, config: CFG, hoje: HOJE, feitos: new Set(['aniv:c1:2026']) })
    expect(achar(l, 'aniversario')).toBe(undefined)
  })
  it('e volta em 2027', () => {
    const l = calcularLembretes({ clientes, config: CFG, hoje: '2027-10-01', feitos: new Set(['aniv:c1:2026']) })
    expect(achar(l, 'aniversario').chave).toBe('aniv:c1:2027')
  })
})

describe('janelas', () => {
  it('aniversário aparece 3 dias antes e até 7 depois', () => {
    const c = [{ id: 'x', nome: 'Zé', data_nascimento: '1980-10-10', familiares: [] }]
    const tem = (hoje) => calcularLembretes({ clientes: c, config: CFG, hoje }).length
    expect(tem('2026-10-06')).toBe(0)
    expect(tem('2026-10-07')).toBe(1)
    expect(tem('2026-10-17')).toBe(1)
    expect(tem('2026-10-18')).toBe(0)
  })
  it('aniversário na virada do ano (31/12 visto em 02/01)', () => {
    const c = [{ id: 'x', nome: 'Zé', data_nascimento: '1980-12-31', familiares: [] }]
    const l = calcularLembretes({ clientes: c, config: CFG, hoje: '2027-01-02' })
    expect(l[0].chave).toBe('aniv:x:2026')
    expect(l[0].titulo).toContain('foi há 2 dias')
  })
  it('bebê chegou? depois da data prevista vira ação de venda', () => {
    const l = calcularLembretes({ clientes, config: CFG, hoje: '2026-10-08' })
    const p = achar(l, 'parto')
    expect(p.titulo).toBe('O bebê de Bia já chegou? (data prevista há 3 dias)')
    expect(p.venda).toBe(true)
  })
  it('antecedência 0 desliga o tipo', () => {
    const l = calcularLembretes({ clientes, config: { ...CFG, lembrete_festa_dias: 0, lembrete_recompra_meses: 0 }, hoje: HOJE })
    expect(l.map((x) => x.tipo)).toEqual(['aniversario', 'parto'])
  })
})

describe('datas', () => {
  it('29/02 vira 28/02 em ano que não é bissexto', () => {
    expect(aniversarioNoAno('2000-02-29', 2027)).toBe('2027-02-28')
    expect(aniversarioNoAno('2000-02-29', 2028)).toBe('2028-02-29')
  })
  it('idade', () => {
    expect(idadeEm('1990-10-02', '2026-10-01')).toBe(35)
    expect(idadeEm('1990-10-02', '2026-10-02')).toBe(36)
  })
  it('somar meses respeita o fim do mês', () => {
    expect(somarMesesData('2026-01-31', 1)).toBe('2026-02-28')
  })
})

it('CPF', () => {
  expect(cpfValido('529.982.247-25')).toBe(true)
  expect(cpfValido('529.982.247-24')).toBe(false)
  expect(cpfValido('111.111.111-11')).toBe(false)
})
