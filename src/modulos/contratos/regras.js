// ────────────────────────────────────────────────────────────────
//  Contratos — funções puras (regras.test.js)
//  Valor e data por extenso, forma de pagamento em texto, etiquetas
//  e o preenchimento do modelo.
// ────────────────────────────────────────────────────────────────

import { formatarReais } from '../../calculos.js'

// ---- valor por extenso ----
const UNID = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove']
const DEZ = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa']
const CEM = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos']

// 0..999
function ate999(n) {
  if (n === 0) return ''
  if (n === 100) return 'cem'
  const c = Math.floor(n / 100)
  const r = n % 100
  const partes = []
  if (c) partes.push(CEM[c])
  if (r) partes.push(r < 20 ? UNID[r] : DEZ[Math.floor(r / 10)] + (r % 10 ? ' e ' + UNID[r % 10] : ''))
  return partes.join(' e ')
}

// número inteiro por extenso (até bilhões)
export function numeroPorExtenso(n) {
  if (n === 0) return 'zero'
  const escalas = [
    [1e9, 'bilhão', 'bilhões'],
    [1e6, 'milhão', 'milhões'],
    [1e3, 'mil', 'mil'],
    [1, '', ''],
  ]
  const grupos = []
  let resto = n
  for (const [valor, um, varios] of escalas) {
    const g = Math.floor(resto / valor)
    resto %= valor
    if (!g) continue
    let txt
    if (valor === 1e3) txt = g === 1 ? 'mil' : `${ate999(g)} mil`
    else if (valor === 1) txt = ate999(g)
    else txt = `${ate999(g)} ${g === 1 ? um : varios}`
    grupos.push({ g, txt })
  }
  // "e" antes do último grupo quando ele é < 100 ou uma centena redonda; senão vírgula
  return grupos
    .map((x, i) => {
      if (i === 0) return x.txt
      const ultimo = i === grupos.length - 1
      const liga = ultimo && (x.g < 100 || x.g % 100 === 0) ? ' e ' : ', '
      return liga + x.txt
    })
    .join('')
}

// 255000 -> "dois mil, quinhentos e cinquenta reais"
export function valorPorExtenso(centavos) {
  const total = Math.round(Number(centavos) || 0)
  const reais = Math.floor(total / 100)
  const cent = total % 100
  const partes = []
  if (reais > 0) {
    const redondoMilhao = reais >= 1e6 && reais % 1e6 === 0
    partes.push(`${numeroPorExtenso(reais)} ${reais === 1 ? 'real' : redondoMilhao ? 'de reais' : 'reais'}`)
  }
  if (cent > 0) partes.push(`${numeroPorExtenso(cent)} ${cent === 1 ? 'centavo' : 'centavos'}`)
  return partes.length ? partes.join(' e ') : 'zero reais'
}

// ---- datas ----
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export function dataPorExtenso(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${d === 1 ? '1º' : d} de ${MESES[m - 1]} de ${a}`
}
const dataBR = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '')

// ---- forma de pagamento (a partir das entradas do lead no Financeiro) ----
const FORMA = { pix: 'Pix', cartao: 'cartão', dinheiro: 'dinheiro', transferencia: 'transferência', boleto: 'boleto' }
export function descreverPagamento(entradas) {
  const lista = (entradas || []).filter((l) => l.grupo === 'receita_op')
  if (!lista.length) return ''
  const data = (l) => dataBR(l.status === 'pago' ? l.pago_em : l.vencimento)
  const forma = lista.find((l) => l.forma_pagamento)?.forma_pagamento
  const via = forma ? `, via ${FORMA[forma] || forma}` : ''
  const sinal = lista.find((l) => l.parcela === 'sinal')
  const saldo = lista.find((l) => l.parcela === 'saldo')
  if (sinal && saldo) {
    return `sinal de ${formatarReais(sinal.valor_centavos)} até ${data(sinal)} e saldo de ${formatarReais(saldo.valor_centavos)} até ${data(saldo)}${via}`
  }
  if (lista.length === 1) return `${formatarReais(lista[0].valor_centavos)} à vista até ${data(lista[0])}${via}`
  return lista.map((l) => `${formatarReais(l.valor_centavos)} até ${data(l)}`).join('; ') + via
}

// ---- etiquetas ----
export const ETIQUETAS = [
  { chave: 'cliente_nome', rotulo: 'nome da cliente', grupo: 'Cliente' },
  { chave: 'cliente_cpf', rotulo: 'CPF da cliente', grupo: 'Cliente' },
  { chave: 'cliente_endereco', rotulo: 'endereço da cliente', grupo: 'Cliente' },
  { chave: 'cliente_nascimento', rotulo: 'nascimento da cliente', grupo: 'Cliente' },
  { chave: 'cliente_whatsapp', rotulo: 'WhatsApp da cliente', grupo: 'Cliente' },
  { chave: 'cliente_email', rotulo: 'e-mail da cliente', grupo: 'Cliente' },
  { chave: 'pacote', rotulo: 'pacote', grupo: 'Compra' },
  { chave: 'entregaveis', rotulo: 'o que está incluído', grupo: 'Compra' },
  { chave: 'valor', rotulo: 'valor', grupo: 'Compra' },
  { chave: 'valor_extenso', rotulo: 'valor por extenso', grupo: 'Compra' },
  { chave: 'data_sessao', rotulo: 'data da sessão', grupo: 'Compra' },
  { chave: 'forma_pagamento', rotulo: 'forma de pagamento', grupo: 'Compra' },
  { chave: 'contratada_nome', rotulo: 'seu nome / razão social', grupo: 'Você' },
  { chave: 'contratada_documento', rotulo: 'seu CPF/CNPJ', grupo: 'Você' },
  { chave: 'contratada_endereco', rotulo: 'seu endereço', grupo: 'Você' },
  { chave: 'foro_cidade', rotulo: 'cidade do foro', grupo: 'Você' },
  { chave: 'data_hoje', rotulo: 'data de hoje', grupo: 'Você' },
]
const ROTULO = Object.fromEntries(ETIQUETAS.map((e) => [e.chave, e.rotulo]))
export const LINHA_EM_BRANCO = '________________'

// Monta o valor de cada etiqueta a partir dos dados (vazio = falta).
export function montarValores({ cliente, compra, servico, entradas, config, hoje, formatarCpf, formatarDocumento, endereco }) {
  return {
    cliente_nome: cliente?.nome || '',
    cliente_cpf: cliente?.cpf ? formatarCpf(cliente.cpf) : '',
    cliente_endereco: cliente ? endereco(cliente) : '',
    cliente_nascimento: cliente?.data_nascimento ? dataBR(cliente.data_nascimento) : '',
    cliente_whatsapp: cliente?.whatsappFormatado || '',
    cliente_email: cliente?.email || '',
    pacote: servico?.nome || '',
    entregaveis: servico?.entregaveis || '',
    valor: compra?.valor_fechado_centavos ? formatarReais(compra.valor_fechado_centavos) : '',
    valor_extenso: compra?.valor_fechado_centavos ? valorPorExtenso(compra.valor_fechado_centavos) : '',
    data_sessao: compra?.data_sessao ? dataPorExtenso(compra.data_sessao) : '',
    forma_pagamento: descreverPagamento(entradas),
    contratada_nome: config?.contratada_nome || '',
    contratada_documento: config?.contratada_documento ? formatarDocumento(config.contratada_documento) : '',
    contratada_endereco: config?.contratada_endereco || '',
    foro_cidade: config?.foro_cidade || '',
    data_hoje: dataPorExtenso(hoje),
  }
}

// Troca as etiquetas pelo valor. O que falta vira uma linha em branco
// (pra preencher à mão) e entra na lista "faltando".
export function preencher(texto, valores) {
  const faltando = []
  const desconhecidas = []
  const saida = String(texto || '').replace(/\{([a-z_]+)\}/g, (inteiro, chave) => {
    if (!(chave in ROTULO)) {
      if (!desconhecidas.includes(inteiro)) desconhecidas.push(inteiro)
      return inteiro
    }
    const v = valores[chave]
    if (v) return v
    if (!faltando.includes(ROTULO[chave])) faltando.push(ROTULO[chave])
    return LINHA_EM_BRANCO
  })
  return { texto: saida, faltando, desconhecidas }
}

// ---- modelo inicial ----
export const MODELO_EXEMPLO = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS FOTOGRÁFICOS

(Modelo de exemplo do Studio Slot — revise com seu advogado antes de usar.)

CONTRATANTE: {cliente_nome}, CPF {cliente_cpf}, residente em {cliente_endereco}.

CONTRATADA: {contratada_nome}, CPF/CNPJ {contratada_documento}, com endereço em {contratada_endereco}.

CLÁUSULA 1 — DO OBJETO
A CONTRATADA prestará serviços de fotografia referentes ao pacote "{pacote}", com sessão marcada para {data_sessao}. Estão incluídos: {entregaveis}.

CLÁUSULA 2 — DO VALOR E DO PAGAMENTO
O valor total é de {valor} ({valor_extenso}), pago da seguinte forma: {forma_pagamento}.

CLÁUSULA 3 — DA REMARCAÇÃO E DO CANCELAMENTO
A sessão pode ser remarcada uma vez, sem custo, com aviso de pelo menos 7 dias. Em caso de cancelamento pela CONTRATANTE, o sinal não será devolvido.

CLÁUSULA 4 — DA ENTREGA
As fotos editadas serão entregues em até 30 dias após a sessão, em galeria online.

CLÁUSULA 5 — DO USO DE IMAGEM
A CONTRATANTE autoriza / não autoriza (riscar o que não se aplica) o uso das imagens no portfólio e nas redes sociais da CONTRATADA.

CLÁUSULA 6 — DO FORO
Fica eleito o foro da comarca de {foro_cidade} para resolver qualquer questão deste contrato.

{foro_cidade}, {data_hoje}.


____________________________________
CONTRATANTE: {cliente_nome}


____________________________________
CONTRATADA: {contratada_nome}`
