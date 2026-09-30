// ────────────────────────────────────────────────────────────────
//  Todas as contas do app moram aqui — funções puras, sem banco e
//  sem tela, cobertas por testes (calculos.test.js).
//
//  Dinheiro: o banco guarda em CENTAVOS (número inteiro). As contas
//  rodam com precisão total e só arredondam no resultado final.
//  As fórmulas de preço (Fase 1) e do mês (Fase 3) entram aqui.
// ────────────────────────────────────────────────────────────────

// Arredonda um valor em centavos pro centavo inteiro (meio pra cima).
// O Number.EPSILON evita que 0,5 "vire" 0,4999… na conta do computador.
export function arredondarCentavos(centavos) {
  return Math.sign(centavos) * Math.round(Math.abs(centavos) + Number.EPSILON * 100)
}

// "1.278,45" / "1278,45" / "12.50" / 1278.45 -> centavos · "" ou texto -> null
export function paraCentavos(reais) {
  let n
  if (typeof reais === 'number') n = reais
  else {
    let s = String(reais ?? '').trim().replace(/^R\$\s*/, '')
    if (s === '') return null
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.') // vírgula = decimal
    else if (!/^\d+\.\d{1,2}$/.test(s)) s = s.replace(/\./g, '') // "1.278" = milhar
    n = Number(s)
  }
  if (!Number.isFinite(n)) return null
  return arredondarCentavos(n * 100)
}

// 127845 -> "R$ 1.278,45" (arredonda o centavo antes, meio pra cima)
export function formatarReais(centavos) {
  return (arredondarCentavos(centavos) / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

// 127845 -> "1278,45" · 80000 -> "800" (pra preencher um campo de valor)
export function centavosParaCampo(centavos) {
  if (centavos == null || centavos === '') return ''
  const c = arredondarCentavos(Number(centavos))
  return c % 100 === 0 ? String(c / 100) : (c / 100).toFixed(2).replace('.', ',')
}

// "12,5" -> 12.5 · "" -> null
export function paraNumero(texto) {
  const s = String(texto ?? '').trim().replace(',', '.')
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

// 21.623 -> "21,6%"
export const formatarPct = (n, casas = 1) =>
  n == null || !Number.isFinite(n) ? '—' : n.toFixed(casas).replace('.', ',') + '%'

// ════════════════════════════════════════════════════════════════
//  Preços (briefing, seção 3). Tudo em centavos; percentuais em %.
//  Cada função devolve { ok: true, ... } ou { ok: false, falta: '...' }
//  pra tela mostrar o que falta em vez de NaN/Infinity.
// ════════════════════════════════════════════════════════════════

const soma = (lista, f) => (lista || []).reduce((t, x) => t + (Number(f(x)) || 0), 0)

// ---- Base do negócio (3.2) ----
export function depreciacaoMensal(equipamentos) {
  return soma(
    (equipamentos || []).filter((e) => e.ativo !== false && e.vida_util_meses > 0),
    (e) => (e.valor_compra_centavos - (e.valor_revenda_centavos || 0)) / e.vida_util_meses,
  )
}

export function baseDoNegocio({ custosFixos, equipamentos, prolaboreCentavos }) {
  const custosFixosMes =
    soma((custosFixos || []).filter((c) => c.ativo !== false), (c) => c.valor_mensal_centavos) +
    (prolaboreCentavos || 0)
  const depreciacaoMes = depreciacaoMensal(equipamentos)
  return { custosFixosMes, depreciacaoMes, baseRateio: custosFixosMes + depreciacaoMes }
}

// ---- Pacote / campanha (3.3 e 3.4) ----
export const custoDosItens = (itens) =>
  soma(itens, (i) => (Number(i.valor_unit_centavos) || 0) * (Number(i.quantidade) || 0))

// servico: { tipo, limite_operacional, itens, margem_pct, comissao_pct, imposto_pct,
//            taxa_pct, preco_final_centavos, vagas, usos_cenario, investimento }
export function precoDoServico(servico, baseRateio) {
  const s = servico
  const limite = Number(s.limite_operacional)
  if (!(limite > 0)) return { ok: false, falta: 'Diga quantos você consegue entregar por mês (limite operacional).' }

  const pctVenda = (Number(s.comissao_pct) || 0) + (Number(s.imposto_pct) || 0)
  const pctTotal = pctVenda + (Number(s.taxa_pct) || 0)
  if (pctTotal >= 100) return { ok: false, falta: 'Comissão + imposto + taxa passam de 100% — o preço ficaria infinito.' }

  const ehCampanha = s.tipo === 'campanha'
  let investimentoNesta = 0
  let cenarioPorSessao = 0
  if (ehCampanha) {
    const vagas = Number(s.vagas)
    const usos = Number(s.usos_cenario) || 1
    if (!(vagas > 0)) return { ok: false, falta: 'Diga quantas vagas você vai abrir na campanha.' }
    if (!(usos > 0)) return { ok: false, falta: 'O cenário é usado em pelo menos 1 campanha.' }
    investimentoNesta = soma(s.investimento, (i) => i.valor_centavos) / usos
    cenarioPorSessao = investimentoNesta / vagas
  }

  const custoItens = custoDosItens(s.itens)
  const cfo = (baseRateio || 0) / limite
  const custoTotal = custoItens + cfo + cenarioPorSessao
  const comMargem = custoTotal * (1 + (Number(s.margem_pct) || 0) / 100)

  const precoAVista = comMargem / (1 - pctVenda / 100)
  const precoAPrazo = comMargem / (1 - pctTotal / 100)
  const precoMinimo = custoTotal / (1 - pctTotal / 100)

  const precoFinal = Number(s.preco_final_centavos) > 0 ? Number(s.preco_final_centavos) : null
  const precoCobrado = precoFinal ?? precoAPrazo
  const descontos = (precoCobrado * pctTotal) / 100
  const lucro = precoCobrado - descontos - custoTotal
  const lucratividade = precoCobrado > 0 ? (lucro / precoCobrado) * 100 : 0
  const margemReal = custoTotal > 0 ? (lucro / custoTotal) * 100 : null

  // semáforo (compara em centavos inteiros pra não piscar por fração)
  const r = arredondarCentavos
  const semaforo =
    r(precoCobrado) < r(precoMinimo) ? 'vermelho' : r(precoCobrado) < r(precoAPrazo) ? 'amarelo' : 'verde'

  const liquidoPorVenda = precoCobrado * (1 - pctTotal / 100)
  const contribuicao = liquidoPorVenda - custoItens
  const pacotesParaFixos = contribuicao > 0 && baseRateio > 0 ? Math.ceil(baseRateio / contribuicao) : null

  const resultado = {
    ok: true,
    custoItens,
    cfo,
    custoTotal,
    precoAVista,
    precoAPrazo,
    precoMinimo,
    precoCobrado,
    usaPrecoFinal: precoFinal != null,
    descontos,
    lucro,
    lucratividade,
    margemReal,
    semaforo,
    contribuicao,
    prejuizoPorVenda: contribuicao <= 0,
    pacotesParaFixos,
    naoPagaFixosNoLimite: pacotesParaFixos != null && pacotesParaFixos > limite,
  }

  if (ehCampanha) {
    const sobraParaCenario = liquidoPorVenda - custoItens - cfo
    const sessoesParaCenario =
      investimentoNesta <= 0 ? 0 : sobraParaCenario > 0 ? Math.ceil(investimentoNesta / sobraParaCenario) : null
    Object.assign(resultado, {
      investimentoNesta,
      cenarioPorSessao,
      sobraParaCenario,
      sessoesParaCenario, // null = nesse preço o cenário nunca se paga
      cenarioNaoSePaga: sessoesParaCenario == null || sessoesParaCenario > Number(s.vagas),
    })
  }
  return resultado
}

// Preço sugerido arredondado pra cima de R$ 10 em R$ 10.
export const arredondarPraCimaDe10 = (centavos) => Math.ceil(centavos / 1000 - 1e-9) * 1000

// ---- Calculadora rápida (3.5) ----
export function calculadoraRapida({
  baseRateio,
  horasDia,
  diasSemana,
  horasSessao,
  deslocamento = 0,
  alimentacao = 0,
  outros = 0,
  markup,
  precoVenda,
  pctTotal,
}) {
  const horasMes = Number(horasDia) * Number(diasSemana) * 4
  if (!(horasMes > 0)) return { ok: false, falta: 'Preencha horas por dia e dias por semana em Base do negócio.' }
  if (!(Number(horasSessao) > 0)) return { ok: false, falta: 'Quantas horas a sessão usa?' }

  const custoHora = (baseRateio || 0) / horasMes
  const custoSessao = horasSessao * custoHora + (deslocamento || 0) + (alimentacao || 0) + (outros || 0)
  const preco = Number(precoVenda) > 0 ? Number(precoVenda) : custoSessao * (Number(markup) || 0)
  if (!(preco > 0)) return { ok: false, falta: 'Informe o markup ou um preço de venda.' }

  const custoVariavel = (preco * (pctTotal || 0)) / 100
  const vendaLiquida = preco - custoVariavel
  const lucro = vendaLiquida - custoSessao
  return {
    ok: true,
    custoHora,
    custoSessao,
    preco,
    custoVariavel,
    vendaLiquida,
    lucro,
    lucratividade: (lucro / preco) * 100,
  }
}
