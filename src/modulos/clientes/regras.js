// ────────────────────────────────────────────────────────────────
//  Regras de Clientes e Lembretes — funções puras (regras.test.js)
//  Os lembretes não ficam guardados: saem das datas da ficha.
//  Só o "feito" é guardado (chave), pra sumir e voltar no ano seguinte.
// ────────────────────────────────────────────────────────────────

export const PARENTESCOS = [
  ['filho', 'Filho'],
  ['filha', 'Filha'],
  ['conjuge', 'Cônjuge'],
  ['gestacao', 'Bebê a caminho'],
  ['outro', 'Outro'],
]
export const rotuloParentesco = (p) => PARENTESCOS.find(([v]) => v === p)?.[1] || p
const ehFilho = (f) => f.parentesco === 'filho' || f.parentesco === 'filha'
const doDa = (f) => (f.parentesco === 'filha' ? 'da' : f.parentesco === 'filho' ? 'do' : 'de')

// ---- datas (sempre 'AAAA-MM-DD', meio-dia pra não sofrer com fuso) ----
const d = (iso) => new Date(iso + 'T12:00:00')
const iso = (dt) => dt.toISOString().slice(0, 10)
export const somarDias = (s, n) => {
  const x = d(s)
  x.setDate(x.getDate() + n)
  return iso(x)
}
export const diasEntre = (de, ate) => Math.round((d(ate) - d(de)) / 86400000)
export function somarMesesData(s, n) {
  const [a, m, dia] = s.split('-').map(Number)
  const t = a * 12 + (m - 1) + n
  const ano = Math.floor(t / 12)
  const mes = (t % 12) + 1
  const ultimo = new Date(ano, mes, 0).getDate()
  return `${ano}-${String(mes).padStart(2, '0')}-${String(Math.min(dia, ultimo)).padStart(2, '0')}`
}
const bissexto = (a) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0

// Aniversário de quem nasceu em `nascimento`, no ano `ano` (29/02 vira 28/02).
export function aniversarioNoAno(nascimento, ano) {
  let [, m, dia] = nascimento.split('-').map(Number)
  if (m === 2 && dia === 29 && !bissexto(ano)) dia = 28
  return `${ano}-${String(m).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

// Idade (anos completos) numa data.
export function idadeEm(nascimento, dataISO) {
  const [a1] = nascimento.split('-').map(Number)
  const [a2] = dataISO.split('-').map(Number)
  return a2 - a1 - (dataISO < aniversarioNoAno(nascimento, a2) ? 1 : 0)
}

export const textoIdade = (n) => (n === 1 ? '1 aninho' : `${n} anos`)
const primeiroNome = (nome) => String(nome || '').trim().split(/\s+/)[0] || ''

function quandoTexto(dias) {
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'amanhã'
  if (dias > 1) return `em ${dias} dias`
  if (dias === -1) return 'foi ontem'
  return `foi há ${-dias} dias`
}

// ---- CPF / CEP ----
export function cpfValido(texto) {
  const c = String(texto ?? '').replace(/\D/g, '')
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false
  const dig = (n) => {
    let s = 0
    for (let i = 0; i < n; i++) s += Number(c[i]) * (n + 1 - i)
    const r = (s * 10) % 11
    return r === 10 ? 0 : r
  }
  return dig(9) === Number(c[9]) && dig(10) === Number(c[10])
}
export const formatarCpf = (c) => (c && c.length === 11 ? `${c.slice(0, 3)}.${c.slice(3, 6)}.${c.slice(6, 9)}-${c.slice(9)}` : c || '')
export const formatarCep = (c) => (c && c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : c || '')

// ════════════════════════════════════════════════════════════════
//  Lembretes
//  clientes: [{ id, nome, data_nascimento, familiares: [...], ultimaCompra }]
//  config:   { lembrete_aniv_dias, lembrete_festa_dias, lembrete_parto_dias, lembrete_recompra_meses }
//  feitos:   Set de chaves marcadas como feitas
//  Devolve lembretes ordenados pela data do acontecimento.
// ════════════════════════════════════════════════════════════════
export function calcularLembretes({ clientes, config, hoje, feitos = new Set(), negocio = '' }) {
  const antesAniv = config.lembrete_aniv_dias ?? 3
  const antesFesta = config.lembrete_festa_dias ?? 60
  const antesParto = config.lembrete_parto_dias ?? 7
  const mesesRecompra = config.lembrete_recompra_meses ?? 11
  const anoHoje = Number(hoje.slice(0, 4))
  const lista = []
  const add = (l) => {
    if (!feitos.has(l.chave)) lista.push({ ...l, dias: diasEntre(hoje, l.data) })
  }
  // um aniversário "cai" na janela se hoje está entre (data - antes) e (data + depois)
  const ocorrencias = (nasc, antes, depois) =>
    [anoHoje - 1, anoHoje, anoHoje + 1]
      .map((ano) => ({ ano, data: aniversarioNoAno(nasc, ano) }))
      .filter(({ data }) => hoje >= somarDias(data, -antes) && hoje <= somarDias(data, depois))

  for (const c of clientes || []) {
    const pn = primeiroNome(c.nome)

    // aniversário da cliente
    if (antesAniv > 0 && c.data_nascimento) {
      for (const { ano, data } of ocorrencias(c.data_nascimento, antesAniv, 7)) {
        const idade = idadeEm(c.data_nascimento, data)
        const dias = diasEntre(hoje, data)
        add({
          chave: `aniv:${c.id}:${ano}`,
          tipo: 'aniversario',
          clienteId: c.id,
          cliente: c.nome,
          data,
          titulo: `Aniversário de ${pn} ${quandoTexto(dias)} · ${dias < 0 ? 'fez' : 'faz'} ${idade} anos`,
          mensagem: `Feliz aniversário, ${pn}! 🎉 Que seu novo ano seja lindo. Um abraço${negocio ? `, ${negocio}` : ''}!`,
        })
      }
    }

    for (const f of c.familiares || []) {
      // aniversário e festa dos filhos
      if (ehFilho(f) && f.data_nascimento) {
        if (antesAniv > 0) {
          for (const { ano, data } of ocorrencias(f.data_nascimento, antesAniv, 7)) {
            const idade = idadeEm(f.data_nascimento, data)
            if (idade < 1) continue
            const dias = diasEntre(hoje, data)
            add({
              chave: `aniv:${f.id}:${ano}`,
              tipo: 'aniversario-filho',
              clienteId: c.id,
              cliente: c.nome,
              data,
              titulo: `Aniversário ${doDa(f)} ${f.nome} (${pn}) ${quandoTexto(dias)} · ${textoIdade(idade)}`,
              mensagem: `Oi, ${pn}! ${dias === 0 ? 'Hoje é' : dias > 0 ? 'Tá chegando' : 'Foi'} o aniversário ${doDa(f)} ${f.nome} 🎈 ${textoIdade(idade)}! Manda um beijo — ${negocio}`.trim(),
            })
          }
        }
        if (antesFesta > 0) {
          for (const ano of [anoHoje, anoHoje + 1]) {
            const data = aniversarioNoAno(f.data_nascimento, ano)
            const idade = idadeEm(f.data_nascimento, data)
            if (idade < 1 || idade > 12) continue
            if (hoje < somarDias(data, -antesFesta) || hoje >= data) continue
            const dias = diasEntre(hoje, data)
            add({
              chave: `festa:${f.id}:${ano}`,
              tipo: 'festa',
              venda: true,
              clienteId: c.id,
              cliente: c.nome,
              data,
              titulo: `Festa: ${textoIdade(idade)} ${doDa(f)} ${f.nome} em ${dias} dias (${pn})`,
              mensagem: `Oi, ${pn}! Faltam ${dias} dias pro ${textoIdade(idade)} ${doDa(f)} ${f.nome} 🎂 Já pensou em registrar esse momento? Tenho horários pra smash the cake e cobertura da festa. Quer que eu te mande as opções?`,
            })
          }
        }
      }

      // parto chegando / bebê chegou?
      if (f.parentesco === 'gestacao' && f.data_prevista_parto && antesParto > 0) {
        const data = f.data_prevista_parto
        if (hoje >= somarDias(data, -antesParto) && hoje <= somarDias(data, 21)) {
          const dias = diasEntre(hoje, data)
          const antes = dias > 0
          add({
            chave: `parto:${f.id}`,
            tipo: 'parto',
            venda: !antes,
            clienteId: c.id,
            cliente: c.nome,
            data,
            titulo: antes
              ? `Parto de ${pn} previsto ${quandoTexto(dias)}`
              : `O bebê de ${pn} já chegou? (data prevista ${dias === 0 ? 'hoje' : `há ${-dias} dias`})`,
            mensagem: antes
              ? `Oi, ${pn}! Pensando em você nessa reta final 💛 Como vocês estão? Qualquer coisa, tô por aqui.`
              : `Oi, ${pn}! O bebê já chegou? 💛 Quando quiserem, vamos agendar o newborn — os primeiros dias passam rápido!`,
          })
        }
      }
    }

    // recompra
    if (mesesRecompra > 0 && c.ultimaCompra) {
      const data = somarMesesData(c.ultimaCompra, mesesRecompra)
      if (hoje >= data && hoje <= somarDias(data, 60)) {
        add({
          chave: `recompra:${c.id}:${c.ultimaCompra}`,
          tipo: 'recompra',
          venda: true,
          clienteId: c.id,
          cliente: c.nome,
          data,
          titulo: `${pn}: ${mesesRecompra} meses desde a última compra`,
          mensagem: `Oi, ${pn}! Faz quase um ano do seu ensaio 💛 Que tal registrar como vocês estão agora? Tenho novidades pra te mostrar.`,
        })
      }
    }
  }
  return lista.sort((a, b) => a.data.localeCompare(b.data) || a.titulo.localeCompare(b.titulo))
}
