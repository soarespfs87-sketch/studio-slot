// ────────────────────────────────────────────────────────────────
//  O negócio do fotógrafo (tabela `estudios` no banco)
//  Cada fotógrafo tem 1 negócio. Aqui ficam o nome, a marca e as
//  cores — o resto (preços, leads, financeiro) chega nas próximas fases.
// ────────────────────────────────────────────────────────────────

import { supabase } from './supabase.js'

// Cores de partida de um negócio novo (o fotógrafo troca em Ajustes).
export const TEMA_PADRAO = {
  primaria: '#C2410C', // botões, destaques
  fundo: '#1C1917', // topo e menu
  superficie: '#FDFCFB', // cartões e áreas de conteúdo
  textoSuave: '#78716C', // textos secundários
}

let _negocio = null

function doBanco(e) {
  return {
    id: e.id,
    slug: e.slug,
    nome: e.nome,
    logo: e.logo || null,
    logoComNome: !!e.logo_com_nome,
    icone: e.icone || null,
    tema: { ...TEMA_PADRAO, ...(e.tema || {}) },
  }
}

export function carregarNegocio(estudio) {
  _negocio = doBanco(estudio)
  return _negocio
}

export const getNegocio = () => _negocio

// Salva nome, marca e cores.
export async function salvarIdentidade({ nome, logo, logoComNome, icone, tema }) {
  const { data, error } = await supabase
    .from('estudios')
    .update({ nome, logo, logo_com_nome: logoComNome, icone, tema })
    .eq('id', _negocio.id)
    .select()
    .single()
  if (!error && data) _negocio = doBanco(data)
  return { error }
}
