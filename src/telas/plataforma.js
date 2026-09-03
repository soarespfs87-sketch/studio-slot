// Painel da Plataforma — só pra você (admin). Libera o plano dos estúdios
// e guarda o controle manual da mensalidade (faixa, vencimento, link LastLink).

import { supabase } from '../supabase.js'

export const FAIXAS_PLANO = [
  ['basico', 'Básico · R$197 (até 2 salas)'],
  ['plus', 'Plus · R$297 (até 5 salas)'],
  ['ilimitado', 'Ilimitado · R$497'],
]
const rotuloFaixa = (v) => FAIXAS_PLANO.find(([k]) => k === v)?.[1] || 'sem faixa definida'

export async function carregarEstudios() {
  const { data, error } = await supabase
    .from('estudios')
    .select(
      'id, nome, slug, plano_ativo, ativado_em, created_at, plano_faixa, cobranca_proxima, lastlink_url',
    )
    .order('created_at', { ascending: false })
  return { estudios: data || [], error }
}

export async function definirPlano(id, ativo) {
  return supabase.from('estudios').update({ plano_ativo: ativo }).eq('id', id)
}

// Salva os campos de cobrança (controle manual).
export async function salvarCobranca(id, dados) {
  return supabase
    .from('estudios')
    .update({
      plano_faixa: dados.plano_faixa || null,
      cobranca_proxima: dados.cobranca_proxima || null,
      lastlink_url: dados.lastlink_url || null,
    })
    .eq('id', id)
}

// "vence em 5 dias" / "vence hoje" / "vencido há 3 dias" — com uma classe de cor.
function statusVencimento(dataISO, hoje) {
  if (!dataISO) return null
  const diff = Math.round(
    (Date.parse(dataISO + 'T12:00:00') - Date.parse(hoje + 'T12:00:00')) / 86400000,
  )
  if (diff < 0) return { texto: `vencido há ${-diff} dia${-diff > 1 ? 's' : ''}`, classe: 'venc-vermelho' }
  if (diff === 0) return { texto: 'vence hoje', classe: 'venc-amarelo' }
  if (diff <= 7) return { texto: `vence em ${diff} dia${diff > 1 ? 's' : ''}`, classe: 'venc-amarelo' }
  return { texto: `vence em ${diff} dias`, classe: 'venc-ok' }
}

function linhaEstudio(e, hoje) {
  const venc = statusVencimento(e.cobranca_proxima, hoje)
  const opcoesFaixa = [
    `<option value="">— faixa —</option>`,
    ...FAIXAS_PLANO.map(
      ([k, r]) => `<option value="${k}" ${e.plano_faixa === k ? 'selected' : ''}>${r}</option>`,
    ),
  ].join('')

  return `
    <div class="dono-linha plat-linha ${e.plano_ativo ? '' : 'dono-linha-off'}">
      <div class="dl-info">
        <span class="dl-nome">${e.nome}</span>
        <span class="dl-sub">
          studioslot.app/${e.slug} &middot; ${e.plano_ativo ? 'plano ativo' : 'pendente'}
          &middot; ${rotuloFaixa(e.plano_faixa)}
          ${venc ? `&middot; <span class="${venc.classe}">${venc.texto}</span>` : ''}
        </span>
      </div>
      <div class="dl-acoes">
        <button class="mini-btn ${e.plano_ativo ? '' : 'mini-btn-primario'}"
          data-acao="${e.plano_ativo ? 'suspender' : 'liberar'}" data-id="${e.id}">
          ${e.plano_ativo ? 'Suspender' : 'Liberar plano'}
        </button>
      </div>
    </div>

    <form class="plat-cobranca" data-cobranca="${e.id}">
      <label class="campo">
        <span>Faixa do plano</span>
        <select name="plano_faixa">${opcoesFaixa}</select>
      </label>
      <label class="campo">
        <span>Próxima cobrança</span>
        <input type="date" name="cobranca_proxima" value="${e.cobranca_proxima || ''}" />
      </label>
      <label class="campo">
        <span>Link do LastLink</span>
        <input type="url" name="lastlink_url" value="${e.lastlink_url || ''}"
          placeholder="https://lastlink.com/p/..." />
      </label>
      <div class="plat-cobranca-acoes">
        <button type="submit" class="mini-btn mini-btn-primario">Salvar cobrança</button>
        ${
          e.lastlink_url
            ? `<button type="button" class="mini-btn" data-acao="copiar-lastlink" data-id="${e.id}">Copiar link</button>
               <a class="mini-btn" href="${e.lastlink_url}" target="_blank" rel="noopener">Abrir</a>`
            : ''
        }
        <span class="foto-status" data-cobranca-status="${e.id}"></span>
      </div>
    </form>`
}

export function telaPlataforma({ estudios, podeImportar, nomeDemo, hoje }) {
  return `
    <div class="topo-nav">
      <button class="link-voltar" data-ir="inicio">&larr; Voltar</button>
    </div>

    <div class="reservar-corpo">
      <h1 class="titulo-grande">Painel da Plataforma</h1>
      <p class="detalhe-desc">
        Libere o plano depois de confirmar o pagamento no LastLink. A faixa, o
        vencimento e o link ficam aqui só como registro — a cobrança é feita no LastLink.
      </p>

      <div class="dono-lista">
        ${
          estudios.length
            ? estudios.map((e) => linhaEstudio(e, hoje)).join('')
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
