// ────────────────────────────────────────────────────────────────
//  Dados de exemplo do "Estúdio Lúmen"
//  Rodam uma única vez, na primeira abertura do app, só para você
//  ter o que ver e clicar. Depois o dono cadastra as salas de verdade
//  (Fase 5). Para recomeçar do zero: limparTudo() no console.
// ────────────────────────────────────────────────────────────────

import { read, write, novoId } from './db.js'

// Fotos de exemplo (ficção — só pra vitrine). Ficam em `public/fotos/`,
// então o endereço começa com `/fotos/`. Na Fase 5 o dono sobe as dele.
const FOTOS_EXEMPLO = {
  sala_branca: ['/fotos/sala-branca.jpg'],
  sala_industrial: ['/fotos/sala-industrial.jpg'],
  cenario_natal: ['/fotos/cenario-natal.jpg'],
}

const SALAS_EXEMPLO = [
  {
    id: 'sala_branca',
    nome: 'Sala Branca',
    tipo: 'fixa',
    descricao: 'Infinito branco (ciclorama) com luz natural controlável.',
    fotos: FOTOS_EXEMPLO.sala_branca,
    corFoto: '#E7E2DB',
    capacidadeMax: 8,
    metragem: 40,
    equipamento: ['Ciclorama branco', 'Set de flash 3x', 'Tripés', 'Rebatedores'],
    ativa: true,
    slotMinutos: 60,
    precos: { diaUtil: 180, fimDeSemana: 230, feriado: 260 },
    bufferAntes: 0,
    bufferDepois: 0,
    disponivelDe: null,
    disponivelAte: null,
  },
  {
    id: 'sala_industrial',
    nome: 'Sala Industrial',
    tipo: 'fixa',
    descricao: 'Pé-direito alto, tijolo aparente e portões metálicos.',
    fotos: FOTOS_EXEMPLO.sala_industrial,
    corFoto: '#C9BBA8',
    capacidadeMax: 12,
    metragem: 60,
    equipamento: ['Tijolo aparente', 'Portão metálico', 'Set de flash 2x', 'Praticáveis'],
    ativa: true,
    slotMinutos: 60,
    precos: { diaUtil: 220, fimDeSemana: 280, feriado: 320 },
    bufferAntes: 0,
    bufferDepois: 30, // desmontar sets pesados leva tempo
    disponivelDe: null,
    disponivelAte: null,
  },
  {
    id: 'cenario_natal',
    nome: 'Cenário Natal Aconchego',
    tipo: 'sazonal',
    descricao: 'Lareira, árvore decorada e luz quente — montado só na temporada.',
    fotos: FOTOS_EXEMPLO.cenario_natal,
    corFoto: '#B45C3A',
    capacidadeMax: 6,
    metragem: 25,
    equipamento: ['Lareira cenográfica', 'Árvore de Natal', 'Luz quente', 'Tapete e poltronas'],
    ativa: true,
    slotMinutos: 120,
    precos: { diaUtil: 260, fimDeSemana: 340, feriado: 380 },
    bufferAntes: 15,
    bufferDepois: 15,
    disponivelDe: '2026-10-10',
    disponivelAte: '2026-12-23',
  },
]

const EXTRAS_EXEMPLO = [
  { id: novoId('extra'), nome: 'Set de flash extra', valor: 90, salas: ['sala_branca', 'sala_industrial'] },
  { id: novoId('extra'), nome: 'Camarim com espelho', valor: 60, salas: ['sala_branca', 'sala_industrial', 'cenario_natal'] },
  { id: novoId('extra'), nome: 'Hora extra', valor: 150, salas: ['sala_branca', 'sala_industrial', 'cenario_natal'] },
]

export function garantirDadosExemplo() {
  if (read('salas', null) === null) {
    write('salas', SALAS_EXEMPLO)
  }
  if (read('extras', null) === null) {
    write('extras', EXTRAS_EXEMPLO)
  }
  if (read('reservas', null) === null) {
    write('reservas', [])
  }
  migrarSalasExemplo()
}

// Agora que existe o Painel do Dono (Fase 5), a migração NÃO sobrescreve
// mais o que o dono editou. Só completa campos que faltam em salas antigas
// (de antes das faixas de preço / da temporada / do buffer), pra nada
// quebrar. Some de vez quando tudo vier do banco (fase Final).
const CAMPOS_PADRAO = {
  tipo: 'fixa',
  slotMinutos: 60,
  bufferAntes: 0,
  bufferDepois: 0,
  disponivelDe: null,
  disponivelAte: null,
}

function migrarSalasExemplo() {
  const canon = Object.fromEntries(SALAS_EXEMPLO.map((s) => [s.id, s]))
  const salas = read('salas', [])
  let mudou = false

  const atualizadas = salas.map((s) => {
    const nova = { ...s }

    // fotos de exemplo, só se a sala de exemplo estiver sem foto
    const base = canon[s.id]
    if (base && (!nova.fotos || nova.fotos.length === 0)) {
      nova.fotos = base.fotos
      mudou = true
    }

    // tabela de faixas: deriva do valorHoraBase quando ainda não existe
    if (!nova.precos) {
      const util = nova.valorHoraBase || 0
      const maior = Math.round((util * 1.3) / 10) * 10
      nova.precos = { diaUtil: util, fimDeSemana: maior, feriado: maior }
      mudou = true
    }

    // completa campos que salas bem antigas podem não ter
    for (const [campo, valor] of Object.entries(CAMPOS_PADRAO)) {
      if (!(campo in nova)) {
        nova[campo] = valor
        mudou = true
      }
    }
    return nova
  })

  if (mudou) write('salas', atualizadas)
}
