// ────────────────────────────────────────────────────────────────
//  Formatação e contas de data/hora
// ────────────────────────────────────────────────────────────────

export const brl = (n) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

// Data de hoje no formato AAAA-MM-DD (respeitando o fuso local).
export function hojeISO() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

export function ehFimDeSemana(iso) {
  const dia = new Date(iso + 'T12:00:00').getDay()
  return dia === 0 || dia === 6
}

// "segunda-feira, 08 de setembro"
export function dataBR(iso) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })
}

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

// "10 de out" — usada nas janelas de temporada dos cenários sazonais.
export function dataCurta(iso) {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} de ${MESES_CURTOS[m - 1]}`
}

export const hhmmParaMin = (s) => {
  const [h, m] = s.split(':').map(Number)
  return h * 60 + m
}

export const minParaHHMM = (t) =>
  `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`

// Milissegundos -> "MM:SS"
export function mmss(ms) {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}
