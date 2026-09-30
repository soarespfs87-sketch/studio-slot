import { describe, it, expect } from 'vitest'
import { metricasCRM, checklist, campanhasAtivas } from './regras.js'

describe('métricas do CRM do mês', () => {
  const L = (etapa, extra = {}) => ({ etapa, created_at: '2026-09-10T15:00:00Z', ...extra })
  const leads = [
    L('novo'),
    L('contato', { created_at: '2026-08-10T15:00:00Z' }),
    L('fechado', { fechado_em: '2026-09-12', valor_fechado_centavos: 255000 }),
    L('fechado', { fechado_em: '2026-09-20', valor_fechado_centavos: 39000 }),
    L('fechado', { fechado_em: '2026-08-30', valor_fechado_centavos: 99900 }),
    L('perdido', { fechado_em: '2026-09-15', motivo_perda: 'preco' }),
    L('perdido', { fechado_em: '2026-09-16', motivo_perda: 'preco' }),
    L('perdido', { fechado_em: '2026-09-17', motivo_perda: 'outro: viajou' }),
  ]
  const m = metricasCRM(leads, '2026-09')
  it('conta novos, fechados e perdidos do mês', () => {
    expect(m.novos).toBe(7)
    expect(m.fechados).toBe(2)
    expect(m.perdidos).toBe(3)
  })
  it('conversão = fechados ÷ (fechados + perdidos)', () => {
    expect(m.conversao).toBe(40)
  })
  it('valor fechado e motivo de perda mais comum', () => {
    expect(m.valorFechado).toBe(294000)
    expect(m.motivoMaisComum).toBe('Preço')
  })
  it('mês sem decisões: sem conversão (não divide por zero)', () => {
    expect(metricasCRM(leads, '2026-07').conversao).toBe(null)
  })
})

describe('checklist de primeiro acesso', () => {
  it('conta o que falta', () => {
    const c = checklist({ config: { regime: 'mei' }, custos: [{ valor_mensal_centavos: 0 }], equipamentos: [], servicos: [], leads: [] })
    expect(c.feitos).toBe(1)
    expect(c.completo).toBe(false)
  })
  it('some quando tudo está feito', () => {
    const c = checklist({
      config: { regime: 'simples', saldo_inicial_centavos: 0 },
      custos: [{ valor_mensal_centavos: 10000 }],
      equipamentos: [{}],
      servicos: [{}],
      leads: [{}],
    })
    expect(c.completo).toBe(true)
  })
})

it('campanhas em andamento ou começando em até 30 dias', () => {
  const s = [
    { id: 'natal', tipo: 'campanha', inicio: '2026-10-20', fim: '2026-12-20' },
    { id: 'maes', tipo: 'campanha', inicio: '2027-04-20', fim: '2027-05-10' },
    { id: 'pascoa', tipo: 'campanha', inicio: '2026-03-01', fim: '2026-04-05' },
    { id: 'pac', tipo: 'pacote' },
  ]
  expect(campanhasAtivas(s, '2026-09-30').map((x) => x.id)).toEqual(['natal'])
})
