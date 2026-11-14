// ────────────────────────────────────────────────────────────────
//  Edge Function `galeria` — a porta da cliente
//
//  A cliente não tem conta: abre studioslot.app.br/g/<codigo>. Esta
//  função é a ÚNICA que lê galeria pra ela. Em toda chamada confere:
//  código existe, galeria publicada, negócio com plano ativo, não
//  expirou e senha certa (se tiver). Só então devolve links
//  temporários (4 h) das fotos — o bucket é privado.
//
//  Ações (POST JSON { acao, codigo, senha, ... }):
//    abrir                     → galeria + negócio + fotos + favoritas
//    favoritar { item_id, marcar, comentario? }   (só seleção aberta)
//    enviar                    → trava a seleção (+ extras no Financeiro)
//    baixar { item_id? }       → link do original (um) ou de todos (entrega)
//    portal { codigo = código da CLIENTE } → as pastas (ensaios) dela,
//                                cada uma com as galerias publicadas e no prazo
//
//  Publicada com verify_jwt = false (a cliente não tem login); a
//  segurança é o código aleatório de 16 caracteres + senha opcional.
//
//  Prévia: se vier { previa: true } com o login do DONO da galeria
//  (Authorization: Bearer <token>), abre mesmo em rascunho, expirada ou
//  com senha — só pra ver (favoritar/enviar/baixar continuam bloqueados).
// ────────────────────────────────────────────────────────────────

import { createClient } from 'npm:@supabase/supabase-js@2.49.4'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const HORAS = 4 * 3600
const BUCKET = 'galerias'

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
const erro = (mensagem: string, status = 400, extra: Record<string, unknown> = {}) =>
  resposta({ erro: mensagem, ...extra }, status)

const hojeBR = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })

// comparação sem "vazar" pelo tempo quantos caracteres acertou
function iguais(a: string, b: string) {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

type Galeria = Record<string, any>

// O pedido vem do dono da galeria logado? (pra prévia)
async function ehDono(req: Request, donoId: string) {
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token || token.split('.').length !== 3) return false
  const { data } = await db.auth.getUser(token)
  return !!data?.user && data.user.id === donoId
}

// Busca e confere a galeria. Devolve { g, negocio, previa } ou uma Response de erro.
async function liberar(
  req: Request,
  codigo: unknown,
  senha: unknown,
  previa: boolean,
): Promise<{ g: Galeria; negocio: any; previa: boolean } | Response> {
  if (typeof codigo !== 'string' || !/^[0-9a-f]{16}$/.test(codigo)) return erro('Galeria não encontrada.', 404)
  const { data: g } = await db
    .from('galerias')
    .select('*, estudios!inner(nome, logo, logo_com_nome, tema, plano_ativo, dono_id, galeria_design_padrao), clientes(nome)')
    .eq('codigo', codigo)
    .maybeSingle()
  if (!g) return erro('Galeria não encontrada.', 404)
  const negocio = {
    nome: g.estudios.nome,
    logo: g.estudios.logo,
    logoComNome: !!g.estudios.logo_com_nome,
    tema: g.estudios.tema || {},
    designPadrao: g.estudios.galeria_design_padrao || {},
  }
  if (previa && (await ehDono(req, g.estudios.dono_id))) return { g, negocio, previa: true }
  if (g.status === 'rascunho' || !g.estudios?.plano_ativo) return erro('Galeria não encontrada.', 404)
  if (g.expira_em && g.expira_em < hojeBR()) return erro('Esta galeria expirou.', 410, { negocio })
  if (g.senha && !(typeof senha === 'string' && iguais(senha.trim(), g.senha))) {
    return erro(senha ? 'Senha errada.' : 'Esta galeria tem senha.', 401, { precisaSenha: true, negocio, nome: g.nome })
  }
  return { g, negocio, previa: false }
}

async function abrir(g: Galeria, negocio: any, previa: boolean) {
  const [{ data: itens }, { data: favs }] = await Promise.all([
    db
      .from('galeria_itens')
      .select('id, tipo, nome_arquivo, caminho_mini, caminho_web, largura, altura, secao')
      .eq('galeria_id', g.id)
      .order('ordem')
      .order('nome_arquivo'),
    db.from('galeria_favoritas').select('item_id, comentario').eq('galeria_id', g.id),
  ])
  const caminhos = (itens || []).flatMap((i) => [i.caminho_mini, i.caminho_web])
  if (g.musica?.tipo === 'arquivo' && typeof g.musica.caminho === 'string') caminhos.push(g.musica.caminho)
  const links: Record<string, string> = {}
  for (let k = 0; k < caminhos.length; k += 1000) {
    const { data } = await db.storage.from(BUCKET).createSignedUrls(caminhos.slice(k, k + 1000), HORAS)
    for (const d of data || []) if (d.signedUrl && d.path) links[d.path] = d.signedUrl
  }
  const texto = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
  const musica =
    g.musica?.tipo === 'arquivo'
      ? { tipo: 'arquivo', url: links[g.musica.caminho] || null, titulo: texto(g.musica.titulo, 120) }
      : g.musica?.tipo === 'link'
        ? { tipo: 'link', url: texto(g.musica.url, 500), titulo: texto(g.musica.titulo, 120) }
        : null
  const { designPadrao, ...negocioPublico } = negocio
  return resposta({
    previa,
    negocio: negocioPublico,
    galeria: {
      design: { ...(designPadrao || {}), ...(g.design || {}) },
      secoes: (Array.isArray(g.secoes) ? g.secoes : []).map((s: any) => ({
        id: texto(s?.id, 40),
        titulo: texto(s?.titulo, 120),
        texto: texto(s?.texto, 3000),
      })),
      videos: (Array.isArray(g.videos) ? g.videos : []).map((v: any) => ({
        id: texto(v?.id, 40),
        url: texto(v?.url, 500),
        titulo: texto(v?.titulo, 120),
        secao: v?.secao ? texto(v.secao, 40) : null,
      })),
      musica,
      nome: g.nome,
      tipo: g.tipo,
      status: g.status,
      cliente: (g.clientes?.nome || '').trim().split(/\s+/)[0] || '',
      incluidas: g.incluidas,
      preco_extra_centavos: g.preco_extra_centavos,
      download_liberado: g.download_liberado,
      mensagem: g.mensagem,
      expira_em: g.expira_em,
      capa_item_id: g.capa_item_id,
      selecao_enviada_em: g.selecao_enviada_em,
    },
    itens: (itens || []).map((i) => ({
      id: i.id,
      tipo: i.tipo,
      nome: i.nome_arquivo,
      largura: i.largura,
      altura: i.altura,
      secao: i.secao,
      mini: links[i.caminho_mini] || null,
      web: links[i.caminho_web] || null,
    })),
    favoritas: favs || [],
  })
}

async function favoritar(g: Galeria, corpo: any) {
  if (g.tipo !== 'selecao' || g.status !== 'publicada') return erro('A seleção já foi enviada.', 409)
  const itemId = corpo.item_id
  if (typeof itemId !== 'string') return erro('Foto inválida.')
  const { data: item } = await db.from('galeria_itens').select('id').eq('id', itemId).eq('galeria_id', g.id).maybeSingle()
  if (!item) return erro('Foto não encontrada.', 404)
  if (corpo.marcar === false) {
    await db.from('galeria_favoritas').delete().eq('item_id', itemId)
    return resposta({ ok: true })
  }
  const comentario = typeof corpo.comentario === 'string' ? corpo.comentario.slice(0, 500) : undefined
  const linha: Record<string, unknown> = { item_id: itemId, galeria_id: g.id, estudio_id: g.estudio_id }
  if (comentario !== undefined) linha.comentario = comentario
  const { error } = await db.from('galeria_favoritas').upsert(linha, { onConflict: 'item_id' })
  if (error) return erro('Não consegui salvar. Tente de novo.', 500)
  return resposta({ ok: true })
}

async function enviar(g: Galeria) {
  const { data, error } = await db.rpc('enviar_selecao_galeria', { p_galeria_id: g.id })
  if (error) return erro(error.message || 'Não consegui enviar.', 409)
  return resposta({ ok: true, ...data })
}

async function baixar(g: Galeria, corpo: any) {
  if (g.tipo !== 'entrega' || !g.download_liberado) return erro('O download não está liberado.', 403)
  let q = db.from('galeria_itens').select('id, nome_arquivo, caminho_original, bytes').eq('galeria_id', g.id)
  if (typeof corpo.item_id === 'string') q = q.eq('id', corpo.item_id)
  const { data: itens } = await q.order('ordem').order('nome_arquivo')
  const comArquivo = (itens || []).filter((i) => i.caminho_original)
  if (!comArquivo.length) return erro('Nada pra baixar.', 404)

  if (typeof corpo.item_id === 'string') {
    const i = comArquivo[0]
    const { data } = await db.storage.from(BUCKET).createSignedUrl(i.caminho_original, HORAS, { download: i.nome_arquivo })
    return resposta({ arquivos: [{ id: i.id, nome: i.nome_arquivo, url: data?.signedUrl, bytes: i.bytes }] })
  }
  const links: Record<string, string> = {}
  for (let k = 0; k < comArquivo.length; k += 1000) {
    const { data } = await db.storage
      .from(BUCKET)
      .createSignedUrls(comArquivo.slice(k, k + 1000).map((i) => i.caminho_original), HORAS)
    for (const d of data || []) if (d.signedUrl && d.path) links[d.path] = d.signedUrl
  }
  return resposta({
    arquivos: comArquivo.map((i) => ({ id: i.id, nome: i.nome_arquivo, url: links[i.caminho_original], bytes: i.bytes })),
  })
}

// Portal da cliente: uma pasta por ensaio (galerias da mesma compra juntas).
async function portal(codigo: unknown) {
  if (typeof codigo !== 'string' || !/^[0-9a-f]{16}$/.test(codigo)) return erro('Acesso não encontrado.', 404)
  const { data: c } = await db
    .from('clientes')
    .select('id, nome, estudio_id, estudios!inner(nome, logo, logo_com_nome, tema, plano_ativo, galeria_design_padrao, portal_titulo, portal_mensagem)')
    .eq('portal_codigo', codigo)
    .maybeSingle()
  if (!c || !c.estudios?.plano_ativo) return erro('Acesso não encontrado.', 404)
  const hoje = hojeBR()
  const { data: gs } = await db
    .from('galerias')
    .select('id, codigo, nome, tipo, status, senha, expira_em, capa_item_id, n_itens, lead_id, publicada_em, created_at')
    .eq('cliente_id', c.id)
    .neq('status', 'rascunho')
    .order('created_at', { ascending: false })
  const vivas = (gs || []).filter((g) => !g.expira_em || g.expira_em >= hoje)

  // capas (só de galeria sem senha — com senha a capa também fica fechada)
  const capaIds = vivas.filter((g) => !g.senha && g.capa_item_id).map((g) => g.capa_item_id)
  const capas: Record<string, string> = {}
  if (capaIds.length) {
    const { data: its } = await db.from('galeria_itens').select('id, caminho_web').in('id', capaIds)
    const { data: assinadas } = await db.storage.from(BUCKET).createSignedUrls((its || []).map((i) => i.caminho_web), HORAS)
    const porCaminho = Object.fromEntries((assinadas || []).map((d) => [d.path, d.signedUrl]))
    for (const i of its || []) capas[i.id] = porCaminho[i.caminho_web]
  }

  // nome e data do ensaio (compra)
  const leadIds = [...new Set(vivas.map((g) => g.lead_id).filter(Boolean))]
  const ensaios: Record<string, { titulo: string; data: string | null }> = {}
  if (leadIds.length) {
    const { data: ls } = await db.from('leads').select('id, data_sessao, servico_id').in('id', leadIds)
    const servIds = [...new Set((ls || []).map((l) => l.servico_id).filter(Boolean))]
    const { data: ss } = servIds.length ? await db.from('servicos').select('id, nome').in('id', servIds) : { data: [] }
    for (const l of ls || []) {
      ensaios[l.id] = { titulo: (ss || []).find((x) => x.id === l.servico_id)?.nome || 'Ensaio', data: l.data_sessao }
    }
  }

  const pastas: any[] = []
  for (const g of vivas) {
    const chave = g.lead_id || `g-${g.id}`
    let p = pastas.find((x) => x.id === chave)
    if (!p) {
      const e = g.lead_id ? ensaios[g.lead_id] : null
      p = { id: chave, titulo: e?.titulo || g.nome, data: e?.data || (g.publicada_em || g.created_at).slice(0, 10), capa: null, galerias: [] }
      pastas.push(p)
    }
    const capa = g.capa_item_id ? capas[g.capa_item_id] || null : null
    if (!p.capa && capa) p.capa = capa
    p.galerias.push({
      codigo: g.codigo,
      nome: g.nome,
      tipo: g.tipo,
      status: g.status,
      tem_senha: !!g.senha,
      expira_em: g.expira_em,
      n_itens: g.n_itens,
      capa,
    })
  }
  pastas.sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')))
  return resposta({
    negocio: {
      nome: c.estudios.nome,
      logo: c.estudios.logo,
      logoComNome: !!c.estudios.logo_com_nome,
      tema: c.estudios.tema || {},
      designPadrao: c.estudios.galeria_design_padrao || {},
    },
    cliente: (c.nome || '').trim().split(/\s+/)[0] || '',
    textos: {
      titulo: String(c.estudios.portal_titulo || '').slice(0, 120),
      mensagem: String(c.estudios.portal_mensagem || '').slice(0, 1000),
    },
    pastas,
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return erro('Use POST.', 405)
  let corpo: any
  try {
    corpo = await req.json()
  } catch {
    return erro('Pedido inválido.')
  }
  if (corpo?.acao === 'portal') return portal(corpo.codigo)
  const ok = await liberar(req, corpo?.codigo, corpo?.senha, corpo?.previa === true && corpo?.acao === 'abrir')
  if (ok instanceof Response) return ok
  const { g, negocio, previa } = ok
  switch (corpo.acao) {
    case 'abrir':
      return abrir(g, negocio, previa)
    case 'favoritar':
      return favoritar(g, corpo)
    case 'enviar':
      return enviar(g)
    case 'baixar':
      return baixar(g, corpo)
    default:
      return erro('Ação desconhecida.')
  }
})
