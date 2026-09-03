// ────────────────────────────────────────────────────────────────
//  Aplica a identidade do estúdio na interface
//  Pega as cores do estúdio e transforma em variáveis CSS que o
//  styles.css usa em todo lugar. Também troca o título da aba e o
//  ícone do app no celular pela logo do estúdio.
// ────────────────────────────────────────────────────────────────

// Clareia ou escurece uma cor hex (fator negativo escurece).
function ajustar(hex, fator) {
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) & 255
  let g = (n >> 8) & 255
  let b = n & 255
  const mix = (c) => Math.max(0, Math.min(255, Math.round(c + (fator > 0 ? (255 - c) * fator : c * fator))))
  r = mix(r)
  g = mix(g)
  b = mix(b)
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

export function aplicarTema(config) {
  const t = config.tema
  const raiz = document.documentElement.style
  raiz.setProperty('--cor-primaria', t.primaria)
  raiz.setProperty('--cor-primaria-escura', ajustar(t.primaria, -0.25))
  raiz.setProperty('--cor-fundo', t.fundo)
  raiz.setProperty('--cor-superficie', t.superficie)
  raiz.setProperty('--cor-texto-suave', t.textoSuave)
  raiz.setProperty('--cor-borda', ajustar(t.superficie, -0.08))

  document.title = `${config.nome} · Studio Slot`

  // Ícone do app no celular / aba do navegador: ícone quadrado do dono,
  // senão a logo, senão o ícone padrão do Studio Slot (/favicon.png).
  const icone = config.icone || config.logo || '/favicon.png'
  document.querySelector('#fav-icon')?.setAttribute('href', icone)
  document.querySelector('#fav-apple')?.setAttribute('href', icone)
}
