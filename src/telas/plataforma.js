// Painel da Plataforma — só pra você (admin). Libera o plano dos estúdios.

import { supabase } from '../supabase.js'

export async function carregarEstudios() {
  const { data, error } = await supabase
    .from('estudios')
    .select('id, nome, slug, plano_ativo, ativado_em, created_at')
    .order('created_at', { ascending: false })
  return { estudios: data || [], error }
}

export async function definirPlano(id, ativo) {
  return supabase.from('estudios').update({ plano_ativo: ativo }).eq('id', id)
}

function linhaEstudio(e) {
  return `
    <div class="dono-linha ${e.plano_ativo ? '' : 'dono-linha-off'}">
      <div class="dl-info">
        <span class="dl-nome">${e.nome}</span>
        <span class="dl-sub">studioslot.app/${e.slug} &middot; ${e.plano_ativo ? 'plano ativo' : 'pendente'}</span>
      </div>
      <div class="dl-acoes">
        <button class="mini-btn ${e.plano_ativo ? '' : 'mini-btn-primario'}"
          data-acao="${e.plano_ativo ? 'suspender' : 'liberar'}" data-id="${e.id}">
          ${e.plano_ativo ? 'Suspender' : 'Liberar plano'}
        </button>
      </div>
    </div>`
}

export function telaPlataforma({ estudios, podeImportar, nomeDemo }) {
  return `
    <div class="topo-nav">
      <button class="link-voltar" data-ir="inicio">&larr; Voltar</button>
    </div>

    <div class="reservar-corpo">
      <h1 class="titulo-grande">Painel da Plataforma</h1>
      <p class="detalhe-desc">Libere o plano de um estúdio depois de confirmar o pagamento.</p>

      <div class="dono-lista">
        ${
          estudios.length
            ? estudios.map(linhaEstudio).join('')
            : '<p class="vazio">Nenhum estúdio cadastrado ainda.</p>'
        }
      </div>

      ${
        podeImportar
          ? `<div class="info-faixa" style="margin-top: 24px">
               <strong>Dados de teste no navegador.</strong>
               <p>Você tem o "${nomeDemo}" salvo aqui do protótipo. Traz pro banco como um estúdio seu, já ativo?</p>
               <button class="botao" data-acao="importar-lumen">Importar ${nomeDemo}</button>
               <span class="foto-status" id="status-import"></span>
             </div>`
          : ''
      }
    </div>`
}
