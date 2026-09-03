// ────────────────────────────────────────────────────────────────
//  Migração única: leva o "Estúdio Lúmen" (dados de teste que estão
//  no navegador) para o Supabase, como um estúdio de verdade, ativo.
//  As fotos das salas (arquivos em /fotos/…) são reenviadas pro armário.
// ────────────────────────────────────────────────────────────────

import { supabase } from './supabase.js'
import { paraSlug } from './auth.js'
import { getConfig, getSalas, getExtras } from './dados.js'

// Baixa uma imagem servida pelo próprio app e reenvia pro Storage.
async function reenviarFoto(caminho, estudioId) {
  try {
    const resp = await fetch(caminho)
    if (!resp.ok) return null
    const blob = await resp.blob()
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg'
    const nome = `${estudioId}/salas/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage
      .from('imagens')
      .upload(nome, blob, { contentType: blob.type || 'image/jpeg' })
    if (error) return null
    return supabase.storage.from('imagens').getPublicUrl(nome).data.publicUrl
  } catch {
    return null
  }
}

export async function migrarEstudioLumen() {
  const s = (await supabase.auth.getSession()).data.session
  if (!s) return { error: { message: 'Faça login primeiro.' } }
  const uid = s.user.id

  const cfg = getConfig()
  const salasLocais = getSalas()
  const extrasLocais = getExtras()

  // 1. cria o estúdio (a política exige nascer pendente)
  const base = paraSlug(cfg.nome) || 'estudio-lumen'
  let estudio = null
  for (let n = 1; n <= 20 && !estudio; n++) {
    const slug = n === 1 ? base : `${base}-${n}`
    const { data, error } = await supabase
      .from('estudios')
      .insert({
        slug,
        nome: cfg.nome,
        descricao: cfg.descricao,
        regras_gerais: cfg.regrasGerais,
        politica_cancelamento: cfg.politicaCancelamento,
        contato: cfg.contato,
        horario_funcionamento: cfg.horarioFuncionamento,
        feriados: cfg.feriados,
        tema: cfg.tema,
        regras_reserva: cfg.regrasReserva,
        logo_com_nome: !!cfg.logoComNome,
        dono_id: uid,
      })
      .select()
      .single()
    if (!error) estudio = data
    else if (error.code !== '23505') return { error }
  }
  if (!estudio) return { error: { message: 'Não achei um endereço livre.' } }

  // 2. ativa (quem roda isto é admin — o gatilho deixa passar)
  await supabase.from('estudios').update({ plano_ativo: true }).eq('id', estudio.id)

  // 3. salas + fotos
  for (const sala of salasLocais) {
    const urls = []
    for (const cam of sala.fotos || []) {
      const u = await reenviarFoto(cam, estudio.id)
      if (u) urls.push(u)
    }
    await supabase.from('salas').insert({
      estudio_id: estudio.id,
      nome: sala.nome,
      descricao: sala.descricao,
      tipo: sala.tipo,
      fotos: urls,
      cor_foto: sala.corFoto,
      capacidade_max: sala.capacidadeMax,
      metragem: sala.metragem,
      equipamento: sala.equipamento,
      ativa: sala.ativa,
      slot_minutos: sala.slotMinutos,
      precos: sala.precos,
      buffer_antes: sala.bufferAntes,
      buffer_depois: sala.bufferDepois,
      disponivel_de: sala.disponivelDe || null,
      disponivel_ate: sala.disponivelAte || null,
    })
  }

  // 4. extras — remapeia os ids locais das salas pros novos ids do banco (pelo nome)
  const { data: salasNovas } = await supabase
    .from('salas')
    .select('id, nome')
    .eq('estudio_id', estudio.id)
  const idPorNome = Object.fromEntries((salasNovas || []).map((x) => [x.nome, x.id]))
  const nomePorIdLocal = Object.fromEntries(salasLocais.map((x) => [x.id, x.nome]))

  for (const ex of extrasLocais) {
    const novasSalas = (ex.salas || [])
      .map((idLocal) => idPorNome[nomePorIdLocal[idLocal]])
      .filter(Boolean)
    await supabase.from('extras').insert({
      estudio_id: estudio.id,
      nome: ex.nome,
      valor: ex.valor,
      salas: novasSalas,
    })
  }

  return { estudio, error: null }
}
