import { describe, it, expect } from 'vitest'
import {
  contarSelecao,
  textoContador,
  listaLightroom,
  semExtensao,
  compararNomes,
  expirou,
  diasParaExpirar,
  encaixar,
  formatarBytes,
  emLotes,
  mensagemLink,
} from './regras.js'

const reais = (c) => `R$ ${(c / 100).toFixed(2).replace('.', ',')}`

describe('seleção: incluídas e extras', () => {
  it('dentro do pacote não tem extra', () => {
    const c = contarSelecao({ favoritas: 12, incluidas: 30, precoExtraCentavos: 1500 })
    expect(c).toMatchObject({ escolhidas: 12, incluidas: 30, extras: 0, faltam: 18, valorExtrasCentavos: 0 })
    expect(textoContador(c, reais)).toBe('12 de 30 incluídas')
  })
  it('passou do pacote: extras × preço', () => {
    const c = contarSelecao({ favoritas: 33, incluidas: 30, precoExtraCentavos: 1500 })
    expect(c.extras).toBe(3)
    expect(c.valorExtrasCentavos).toBe(4500)
    expect(textoContador(c, reais)).toBe('33 escolhidas · 3 extras · R$ 45,00')
  })
  it('sem limite: nunca tem extra', () => {
    const c = contarSelecao({ favoritas: 80, incluidas: null, precoExtraCentavos: 1500 })
    expect(c.extras).toBe(0)
    expect(textoContador(c, reais)).toBe('80 escolhidas')
    expect(contarSelecao({ favoritas: 80, incluidas: 0, precoExtraCentavos: 1 }).extras).toBe(0)
  })
  it('extra sem preço conta, mas não cobra', () => {
    const c = contarSelecao({ favoritas: 31, incluidas: 30, precoExtraCentavos: 0 })
    expect(c.extras).toBe(1)
    expect(textoContador(c, reais)).toBe('31 escolhidas · 1 extra')
  })
})

describe('Lightroom e nomes', () => {
  it('tira a extensão e repetidos', () => {
    expect(semExtensao('IMG_0042.CR3')).toBe('IMG_0042')
    expect(semExtensao('foto.final.jpg')).toBe('foto.final')
    expect(listaLightroom(['A_1.jpg', 'A_2.JPG', 'A_1.jpg'])).toBe('A_1, A_2')
  })
  it('ordena como gente: 2 antes de 10', () => {
    expect(['IMG_10.jpg', 'IMG_2.jpg', 'IMG_1.jpg'].sort(compararNomes)).toEqual([
      'IMG_1.jpg',
      'IMG_2.jpg',
      'IMG_10.jpg',
    ])
  })
})

describe('expiração', () => {
  it('o dia de expirar ainda abre', () => {
    expect(expirou('2026-11-14', '2026-11-14')).toBe(false)
    expect(expirou('2026-11-13', '2026-11-14')).toBe(true)
    expect(expirou(null, '2026-11-14')).toBe(false)
  })
  it('conta os dias', () => {
    expect(diasParaExpirar('2026-11-17', '2026-11-14')).toBe(3)
    expect(diasParaExpirar('2026-11-14', '2026-11-14')).toBe(0)
    expect(diasParaExpirar('2026-11-10', '2026-11-14')).toBe(-4)
    expect(diasParaExpirar(null, '2026-11-14')).toBe(null)
  })
})

describe('imagens e arquivos', () => {
  it('encaixa sem aumentar', () => {
    expect(encaixar(6000, 4000, 2048)).toEqual({ largura: 2048, altura: 1365 })
    expect(encaixar(4000, 6000, 560)).toEqual({ largura: 373, altura: 560 })
    expect(encaixar(800, 600, 2048)).toEqual({ largura: 800, altura: 600 })
  })
  it('formata bytes', () => {
    expect(formatarBytes(512 * 1024)).toBe('512 KB')
    expect(formatarBytes(1.5 * 1024 * 1024)).toBe('1,5 MB')
    expect(formatarBytes(20 * 1024 ** 3)).toBe('20 GB')
  })
  it('divide em lotes pelo tamanho', () => {
    const itens = [{ bytes: 40 }, { bytes: 40 }, { bytes: 40 }, { bytes: 150 }, { bytes: 10 }]
    expect(emLotes(itens, 100).map((l) => l.length)).toEqual([2, 1, 1, 1])
    expect(emLotes([], 100)).toEqual([])
  })
})

describe('mensagem do WhatsApp', () => {
  it('seleção com senha e prazo', () => {
    const m = mensagemLink({
      galeria: { tipo: 'selecao', incluidas: 30, expira_em: '2026-12-01' },
      cliente: { nome: 'Ana Souza' },
      negocio: 'Estúdio Luz',
      url: 'https://studioslot.app.br/g/abc',
      senha: '1234',
    })
    expect(m).toContain('Oi, Ana!')
    expect(m).toContain('inclui 30 fotos')
    expect(m).toContain('Senha: 1234')
    expect(m).toContain('até 01/12')
    expect(m.endsWith('Estúdio Luz')).toBe(true)
  })
  it('entrega sem cliente', () => {
    const m = mensagemLink({ galeria: { tipo: 'entrega' }, cliente: null, negocio: 'X', url: 'u' })
    expect(m.startsWith('Oi! Suas fotos estão prontas')).toBe(true)
    expect(m).not.toContain('Senha')
  })
})

import {
  designCompleto,
  coresDaPaleta,
  lerVideo,
  embedVideo,
  lerMusica,
  embedMusica,
  agruparPorCapitulo,
  ritmoHistoria,
} from './regras.js'

describe('design', () => {
  it('completa com o padrão e ignora lixo', () => {
    expect(designCompleto({ capa: 'moldura', fonte: 'xxx' })).toEqual({
      layout: 'grade',
      capa: 'moldura',
      fonte: 'classica',
      paleta: 'claro',
      grade: 'mosaico',
      espaco: 'justo',
      tamanho: 'normal',
    })
  })
  it('galeria vence o padrão do negócio', () => {
    expect(designCompleto({ paleta: 'escuro' }, { paleta: 'rose', grade: 'linhas' })).toMatchObject({
      paleta: 'escuro',
      grade: 'linhas',
    })
  })
  it('"minha marca" usa as cores do negócio', () => {
    const c = coresDaPaleta('marca', { superficie: '#fafafa', primaria: '#123456' })
    expect(c.fundo).toBe('#fafafa')
    expect(c.destaque).toBe('#123456')
    expect(coresDaPaleta('oliva').fundo).toBe('#eef0e8')
  })
})

describe('links de vídeo', () => {
  it('YouTube em vários formatos', () => {
    for (const u of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://m.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
    ]) {
      expect(lerVideo(u)).toEqual({ provedor: 'youtube', id: 'dQw4w9WgXcQ' })
    }
  })
  it('Vimeo, com e sem hash privado', () => {
    expect(lerVideo('https://vimeo.com/76979871')).toEqual({ provedor: 'vimeo', id: '76979871', hash: null })
    expect(lerVideo('https://vimeo.com/76979871/abc123def0')).toMatchObject({ hash: 'abc123def0' })
    expect(embedVideo(lerVideo('https://vimeo.com/76979871'))).toContain('player.vimeo.com/video/76979871')
  })
  it('recusa o que não é vídeo conhecido', () => {
    expect(lerVideo('javascript:alert(1)')).toBe(null)
    expect(lerVideo('https://evil.com/watch?v=dQw4w9WgXcQ')).toBe(null)
    expect(lerVideo('https://youtube.com/watch?v=curto')).toBe(null)
    expect(lerVideo('')).toBe(null)
  })
  it('player do YouTube sem cookies', () => {
    expect(embedVideo({ provedor: 'youtube', id: 'dQw4w9WgXcQ' })).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/)
  })
})

describe('links de música', () => {
  it('Spotify faixa e playlist', () => {
    expect(lerMusica('https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=x')).toEqual({
      provedor: 'spotify',
      tipo: 'track',
      id: '4uLU6hMCjMI75M1A2tKUQC',
    })
    expect(embedMusica(lerMusica('https://open.spotify.com/intl-pt/playlist/37i9dQZF1DXcBWIGoYBM5M'))).toBe(
      'https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator',
    )
  })
  it('YouTube também vale, outros não', () => {
    expect(lerMusica('https://youtu.be/dQw4w9WgXcQ')?.provedor).toBe('youtube')
    expect(lerMusica('https://soundcloud.com/x/y')).toBe(null)
  })
})

describe('história', () => {
  const foto = (id, l, a, secao = null) => ({ id, largura: l, altura: a, secao })
  it('agrupa por capítulo, sem capítulo vai pro começo', () => {
    const itens = [foto('a', 1, 1, 's2'), foto('b', 1, 1), foto('c', 1, 1, 's1'), foto('d', 1, 1, 'apagado')]
    const g = agruparPorCapitulo(itens, [{ id: 's1' }, { id: 's2' }])
    expect(g.map((x) => [x.secao?.id ?? null, x.itens.map((i) => i.id)])).toEqual([
      [null, ['b', 'd']],
      ['s1', ['c']],
      ['s2', ['a']],
    ])
  })
  it('ritmo: deitada inteira, em pé em dupla, trio a cada 3 linhas', () => {
    const P = (id) => foto(id, 2, 3) // em pé
    const D = (id) => foto(id, 3, 2) // deitada
    const r = ritmoHistoria([D('1'), D('2'), P('3'), P('4'), P('5'), P('6'), P('7'), P('8'), P('9')])
    expect(r.map((g) => [g.tipo, g.itens.map((i) => i.id).join('')])).toEqual([
      ['inteira', '1'],
      ['linha', '23'],
      ['linha', '45'],
      ['linha', '678'],
      ['sozinha', '9'],
    ])
  })
  it('nunca duas inteiras seguidas', () => {
    const D = (id) => foto(id, 3, 2)
    const r = ritmoHistoria([D('1'), D('2'), D('3'), D('4')])
    expect(r.map((g) => g.tipo)).toEqual(['inteira', 'linha', 'inteira'])
  })
})

import { urlPortal, mensagemPortal } from './regras.js'
describe('portal da cliente', () => {
  it('link e mensagem', () => {
    expect(urlPortal('abc', 'https://studioslot.app.br')).toBe('https://studioslot.app.br/c/abc')
    const m = mensagemPortal({ nome: 'Ana Souza', portal_codigo: 'abc' }, { nome: 'Estúdio Luz' }, 'https://x.com')
    expect(m.startsWith('Oi, Ana!')).toBe(true)
    expect(m).toContain('https://x.com/c/abc')
    expect(m.endsWith('Estúdio Luz')).toBe(true)
  })
})

import { textoDoPortal } from './regras.js'
describe('textos do portal', () => {
  it('troca {nome} e arruma quando não tem nome', () => {
    expect(textoDoPortal('Olá, {nome}', 'Ana')).toBe('Olá, Ana')
    expect(textoDoPortal('Olá, {nome}', '')).toBe('Olá')
    expect(textoDoPortal('{Nome}, que alegria!', 'Bia')).toBe('Bia, que alegria!')
    expect(textoDoPortal('', 'Ana')).toBe('')
  })
})
