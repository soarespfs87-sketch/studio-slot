// ────────────────────────────────────────────────────────────────
//  Guarda-tudo local (localStorage)
//  Enquanto o app não tem banco de dados de verdade, tudo é salvo
//  aqui no navegador. Cada "coleção" (salas, extras, reservas...)
//  fica numa chave separada.
//  Na fase Final isto é trocado por Supabase.
// ────────────────────────────────────────────────────────────────

const NS = 'studioslot:v1:'

export function read(colecao, valorPadrao = []) {
  try {
    const bruto = localStorage.getItem(NS + colecao)
    return bruto ? JSON.parse(bruto) : valorPadrao
  } catch {
    return valorPadrao
  }
}

export function write(colecao, valor) {
  try {
    localStorage.setItem(NS + colecao, JSON.stringify(valor))
  } catch {
    // navegador sem localStorage (aba privada, etc.) — o app segue funcionando na sessão
  }
}

export function limparTudo() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(NS))
      .forEach((k) => localStorage.removeItem(k))
  } catch {
    /* ignora */
  }
}

// Gera um id simples e único o suficiente para uso local.
export function novoId(prefixo = 'id') {
  return `${prefixo}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}
