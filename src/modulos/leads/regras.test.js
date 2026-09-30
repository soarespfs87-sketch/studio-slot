import { describe, it, expect } from 'vitest'
import {
  proximaEtapa,
  normalizarWhatsApp,
  formatarWhatsApp,
  linkWhatsApp,
  normalizarInstagram,
  situacaoFollowup,
  checarMinimo,
  rotuloMotivo,
} from './regras.js'

describe('funil', () => {
  it('avança uma etapa por vez e termina em fechado', () => {
    expect(proximaEtapa('novo')).toBe('contato')
    expect(proximaEtapa('proposta')).toBe('negociacao')
    expect(proximaEtapa('negociacao')).toBe('fechado')
    expect(proximaEtapa('fechado')).toBe(null)
  })
  it('mostra o motivo da perda', () => {
    expect(rotuloMotivo('preco')).toBe('Preço')
    expect(rotuloMotivo('outro: foi pra praia')).toBe('foi pra praia')
  })
})

describe('WhatsApp', () => {
  it('normaliza pra 55 + DDD + número', () => {
    expect(normalizarWhatsApp('(11) 99999-8888')).toBe('5511999998888')
    expect(normalizarWhatsApp('+55 11 99999-8888')).toBe('5511999998888')
    expect(normalizarWhatsApp('011 99999-8888')).toBe('5511999998888')
    expect(normalizarWhatsApp('(11) 3333-4444')).toBe('551133334444')
    expect(normalizarWhatsApp('9999-8888')).toBe(null)
    expect(normalizarWhatsApp('')).toBe(null)
  })
  it('formata e monta o link com a mensagem pronta', () => {
    expect(formatarWhatsApp('5511999998888')).toBe('(11) 99999-8888')
    expect(linkWhatsApp('5511999998888', 'Maria Clara Souza', 'Ana Lima Fotografia')).toBe(
      'https://wa.me/5511999998888?text=' +
        encodeURIComponent('Oi, Maria! Aqui é Ana Lima Fotografia, tudo bem?'),
    )
  })
})

it('Instagram vira só o @ sem arroba', () => {
  expect(normalizarInstagram('@ana.foto')).toBe('ana.foto')
  expect(normalizarInstagram('https://www.instagram.com/ana.foto/')).toBe('ana.foto')
  expect(normalizarInstagram('  ')).toBe(null)
})

it('follow-up atrasado / hoje / futuro', () => {
  expect(situacaoFollowup('2026-09-29', '2026-09-30')).toBe('atrasado')
  expect(situacaoFollowup('2026-09-30', '2026-09-30')).toBe('hoje')
  expect(situacaoFollowup('2026-10-01', '2026-09-30')).toBe('futuro')
  expect(situacaoFollowup(null, '2026-09-30')).toBe(null)
})

describe('fechar abaixo do mínimo', () => {
  // pacote "As quatro estações" com base de R$ 4.580 (mínimo R$ 2.096,67)
  const pacote = {
    tipo: 'pacote',
    limite_operacional: 8,
    itens: [{ valor_unit_centavos: 100000, quantidade: 1 }],
    margem_pct: 30,
    comissao_pct: 10,
    imposto_pct: 10,
    taxa_pct: 5,
  }
  it('avisa quando fecha abaixo', () => {
    const r = checarMinimo(200000, pacote, 458000)
    expect(r.minimo).toBe(209667)
    expect(r.abaixo).toBe(true)
    expect(r.diferenca).toBe(9667)
  })
  it('não avisa no mínimo ou acima', () => {
    expect(checarMinimo(209667, pacote, 458000).abaixo).toBe(false)
    expect(checarMinimo(255000, pacote, 458000).abaixo).toBe(false)
  })
  it('sem pacote não dá pra saber', () => {
    expect(checarMinimo(200000, null, 458000)).toBe(null)
  })
})
