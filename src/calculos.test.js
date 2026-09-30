import { describe, it, expect } from 'vitest'
import {
  arredondarCentavos,
  paraCentavos,
  formatarReais,
  baseDoNegocio,
  precoDoServico,
  calculadoraRapida,
  arredondarPraCimaDe10,
} from './calculos.js'

describe('dinheiro em centavos', () => {
  it('arredonda meio centavo pra cima', () => {
    expect(arredondarCentavos(72576.315)).toBe(72576)
    expect(arredondarCentavos(68947.5)).toBe(68948)
    expect(arredondarCentavos(-150.5)).toBe(-151)
  })

  it('converte reais digitados em centavos', () => {
    expect(paraCentavos('1.278,45')).toBe(127845)
    expect(paraCentavos('920')).toBe(92000)
    expect(paraCentavos(0.1 + 0.2)).toBe(30)
    expect(paraCentavos('abc')).toBe(null)
    expect(paraCentavos('12.50')).toBe(1250)
    expect(paraCentavos('1.278')).toBe(127800)
    expect(paraCentavos('R$ 2.550,00')).toBe(255000)
    expect(paraCentavos('')).toBe(null)
  })

  it('formata em reais no padrão brasileiro', () => {
    // o Intl usa espaço não separável depois do "R$"
    expect(formatarReais(127845).replace(/\s/g, ' ')).toBe('R$ 1.278,45')
  })
})

// ── Exemplos do briefing, seção 3.7 (números da planilha) ──────────

const reais = (centavos) => Math.round(centavos) / 100
const custo = (nome, reaisValor) => ({ nome, valor_mensal_centavos: reaisValor * 100, ativo: true })
const item = (grupo, nome, unit, qtd = 1) => ({ grupo, nome, valor_unit_centavos: unit * 100, quantidade: qtd })
const PCTS = { margem_pct: 30, comissao_pct: 10, imposto_pct: 10, taxa_pct: 5 }

const base = baseDoNegocio({
  custosFixos: [
    custo('Aluguel', 800),
    custo('Energia', 150),
    custo('Internet/Telefone', 150),
    custo('Sistemas', 180),
    custo('Combustível', 200),
    custo('Marketing', 300),
    custo('Capacitação', 100),
    { nome: 'Inativo', valor_mensal_centavos: 99900, ativo: false },
  ],
  equipamentos: [{ valor_compra_centavos: 1200000, vida_util_meses: 60 }],
  prolaboreCentavos: 250000,
})

describe('base do negócio', () => {
  it('soma custos fixos + pró-labore e calcula a depreciação', () => {
    expect(base.custosFixosMes).toBe(438000)
    expect(base.depreciacaoMes).toBe(20000)
    expect(base.baseRateio).toBe(458000)
  })
})

describe('pacote "As quatro estações"', () => {
  const r = precoDoServico(
    {
      tipo: 'pacote',
      limite_operacional: 8,
      itens: [
        item('deslocamento', 'Deslocamento', 60, 3),
        item('extra', 'Extra Plano Gestante', 180, 3),
        item('kit', 'Kit de boas-vindas', 130),
        item('embalagem', 'Embalagem + entrega', 150),
      ],
      ...PCTS,
      preco_final_centavos: 255000,
    },
    base.baseRateio,
  )
  it('calcula custos e preços', () => {
    expect(reais(r.custoItens)).toBe(1000)
    expect(reais(r.cfo)).toBe(572.5)
    expect(reais(r.custoTotal)).toBe(1572.5)
    expect(reais(r.precoAVista)).toBe(2555.31)
    expect(reais(r.precoAPrazo)).toBe(2725.67)
    expect(reais(r.precoMinimo)).toBe(2096.67)
  })
  it('avalia o preço cobrado (R$ 2.550)', () => {
    expect(r.semaforo).toBe('amarelo')
    expect(reais(r.lucro)).toBe(340)
    expect(r.lucratividade.toFixed(2)).toBe('13.33')
    expect(r.margemReal.toFixed(2)).toBe('21.62')
    expect(r.pacotesParaFixos).toBe(6)
    expect(r.naoPagaFixosNoLimite).toBe(false)
  })
})

describe('campanha "Minissessão de Natal"', () => {
  const r = precoDoServico(
    {
      tipo: 'campanha',
      limite_operacional: 40,
      vagas: 20,
      usos_cenario: 2,
      investimento: [
        { nome: 'Cenário', valor_centavos: 120000 },
        { nome: 'Objetos', valor_centavos: 30000 },
        { nome: 'Anúncios', valor_centavos: 30000 },
      ],
      itens: [item('equipe', 'Edição', 40), item('outro', 'Impressão/brinde', 25)],
      ...PCTS,
      preco_final_centavos: 39000,
    },
    base.baseRateio,
  )
  it('divide o cenário pelas vagas e pelos usos', () => {
    expect(reais(r.investimentoNesta)).toBe(900)
    expect(reais(r.cenarioPorSessao)).toBe(45)
    expect(reais(r.cfo)).toBe(114.5)
    expect(reais(r.custoTotal)).toBe(224.5)
  })
  it('calcula preços e quantas sessões pagam o cenário', () => {
    expect(reais(r.precoAVista)).toBe(364.81)
    expect(reais(r.precoAPrazo)).toBe(389.13)
    expect(reais(r.precoMinimo)).toBe(299.33)
    expect(r.semaforo).toBe('verde')
    expect(reais(r.lucro)).toBe(68)
    expect(reais(r.sobraParaCenario)).toBe(113)
    expect(r.sessoesParaCenario).toBe(8)
    expect(r.cenarioNaoSePaga).toBe(false)
  })
  it('avisa quando o cenário nunca se paga', () => {
    const barato = precoDoServico(
      { tipo: 'campanha', limite_operacional: 40, vagas: 20, usos_cenario: 1,
        investimento: [{ valor_centavos: 180000 }], itens: [], ...PCTS, preco_final_centavos: 10000 },
      base.baseRateio,
    )
    expect(barato.sessoesParaCenario).toBe(null)
    expect(barato.cenarioNaoSePaga).toBe(true)
    expect(barato.semaforo).toBe('vermelho')
  })
})

describe('calculadora rápida', () => {
  const r = calculadoraRapida({
    baseRateio: base.baseRateio,
    horasDia: 6,
    diasSemana: 5,
    horasSessao: 3,
    deslocamento: 6000,
    alimentacao: 3000,
    markup: 2,
    pctTotal: 25,
  })
  it('bate com o exemplo', () => {
    expect(reais(r.custoHora)).toBe(38.17)
    expect(reais(r.custoSessao)).toBe(204.5)
    expect(reais(r.preco)).toBe(409)
    expect(reais(r.custoVariavel)).toBe(102.25)
    expect(reais(r.lucro)).toBe(102.25)
    expect(r.lucratividade).toBeCloseTo(25, 10)
  })
})

describe('validações (nada de NaN/Infinity)', () => {
  it('pede o que falta', () => {
    expect(precoDoServico({ limite_operacional: 0, ...PCTS }, 458000).ok).toBe(false)
    expect(precoDoServico({ limite_operacional: 5, margem_pct: 30, comissao_pct: 50, imposto_pct: 45, taxa_pct: 5 }, 1).ok).toBe(false)
    expect(precoDoServico({ tipo: 'campanha', limite_operacional: 5, vagas: 0, ...PCTS }, 1).ok).toBe(false)
    expect(calculadoraRapida({ baseRateio: 1, horasDia: 0, diasSemana: 5, horasSessao: 2, markup: 2 }).ok).toBe(false)
  })
  it('funciona sem custos fixos', () => {
    const r = precoDoServico({ limite_operacional: 5, itens: [], ...PCTS }, 0)
    expect(r.ok).toBe(true)
    expect(r.precoMinimo).toBe(0)
    expect(r.pacotesParaFixos).toBe(null)
  })
  it('arredonda o sugerido pra cima de 10 em 10', () => {
    expect(arredondarPraCimaDe10(272567)).toBe(273000)
    expect(arredondarPraCimaDe10(273000)).toBe(273000)
  })
})
