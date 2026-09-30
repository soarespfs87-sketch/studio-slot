// Pedacinhos de tela do módulo Leads.

import { situacaoFollowup } from './regras.js'

export const iconeWhats = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 11.6a8.4 8.4 0 01-12.4 7.4L3.5 20.5l1.6-4.4A8.4 8.4 0 1120.5 11.6z"/><path d="M9 8.8c.2 2.6 2.4 4.9 5.2 5.6l1.1-1.2 1.9.9-.4 1.6c-3.9.3-8.2-3.7-8.5-7.6l1.6-.5.9 1.9L9 8.8z"/></svg>`

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

// '2026-10-02' -> '02/10'
export const dataCurtaBR = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '')

// '2026-10-02' -> 'sex, 02/10'
export function dataComDia(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  return `${DIAS[d.getDay()]}, ${dataCurtaBR(iso)}`
}

// ISO de hoje + n dias
export function somarDias(isoHoje, n) {
  const d = new Date(isoHoje + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

// timestamp do banco -> '30/09 às 14:05'
export function quando(ts) {
  const d = new Date(ts)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm} às ${hh}:${mi}`
}

export function seloFollowup(data, hoje) {
  const s = situacaoFollowup(data, hoje)
  if (!s) return ''
  if (s === 'atrasado') return `<span class="selo-fu selo-fu-atrasado">Follow-up atrasado · ${dataCurtaBR(data)}</span>`
  if (s === 'hoje') return '<span class="selo-fu selo-fu-hoje">Follow-up hoje</span>'
  return `<span class="selo-fu">Follow-up ${dataCurtaBR(data)}</span>`
}
