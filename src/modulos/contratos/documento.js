// ────────────────────────────────────────────────────────────────
//  O contrato como documento (tela e PDF)
//  Linha só em MAIÚSCULAS vira título; linha em branco separa parágrafos.
//  Na prévia, o que falta aparece destacado.
// ────────────────────────────────────────────────────────────────

import { esc } from '../../componentes/campos.js'
import { LINHA_EM_BRANCO } from './regras.js'

const ehTitulo = (linha) => /[A-ZÀ-Ú]/.test(linha) && linha === linha.toUpperCase() && linha.length < 120

export function documentoHTML(texto, { negocio, destacarFaltas = false } = {}) {
  const blocos = String(texto || '')
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
  const corpo = blocos
    .map((b) => {
      const linhas = b.split('\n')
      if (linhas.length === 1 && ehTitulo(linhas[0])) return `<h3 class="doc-titulo">${esc(linhas[0])}</h3>`
      let html = linhas.map((l) => (ehTitulo(l) ? `<strong>${esc(l)}</strong>` : esc(l))).join('<br>')
      if (destacarFaltas) html = html.split(LINHA_EM_BRANCO).join(`<mark class="doc-falta">${LINHA_EM_BRANCO}</mark>`)
      return `<p>${html}</p>`
    })
    .join('')
  return `
    <article class="contrato-doc">
      ${negocio ? `<header class="doc-cabeca">${esc(negocio)}</header>` : ''}
      ${corpo}
    </article>`
}

// Abre a impressão do navegador ("Salvar como PDF") só com o documento.
export function baixarPDF(titulo) {
  const antes = document.title
  document.title = titulo // vira o nome do arquivo
  document.body.classList.add('imprimindo-contrato')
  const voltar = () => {
    document.title = antes
    document.body.classList.remove('imprimindo-contrato')
    window.removeEventListener('afterprint', voltar)
  }
  window.addEventListener('afterprint', voltar)
  window.print()
  setTimeout(voltar, 1000) // navegadores que não disparam afterprint
}
