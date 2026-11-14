// ────────────────────────────────────────────────────────────────
//  Portal da cliente: studioslot.app.br/c/<codigo-da-cliente>
//
//  Um link só por cliente. Mostra uma PASTA por ensaio (as galerias
//  da mesma compra ficam juntas: seleção + entrega), com a marca e o
//  design padrão do fotógrafo. Título e frase de abertura são escritos
//  pelo fotógrafo (Galerias › Portal da cliente; {nome} = primeiro nome).
//  Cada galeria abre em /g/<codigo>?de=…, que mostra "← Suas galerias".
// ────────────────────────────────────────────────────────────────

import { SUPABASE_URL, SUPABASE_KEY } from '../../supabase.js'
import { esc } from '../../componentes/campos.js'
import { designCompleto, textoDoPortal } from './regras.js'
import { aplicarAparencia, marca } from './publica.js'

const app = document.querySelector('#app')
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const mesAno = (iso) => (iso ? `${MESES[Number(iso.slice(5, 7)) - 1]} de ${iso.slice(0, 4)}` : '')

const linkGaleria = (g, portal) => `/g/${g.codigo}?de=${portal}`
const rotuloTipo = (g) => (g.tipo === 'entrega' ? 'Fotos prontas' : g.status === 'publicada' ? 'Escolher favoritas' : 'Seleção enviada')
const esperando = (g) => g.tipo === 'selecao' && g.status === 'publicada'

function pasta(p, portal) {
  const capa = p.capa ? `<img src="${esc(p.capa)}" alt="" loading="lazy" />` : '<span class="por-capa-vazia" aria-hidden="true">🔒</span>'
  const fotos = p.galerias.reduce((t, g) => t + (g.n_itens || 0), 0)
  const unica = p.galerias.length === 1 ? p.galerias[0] : null
  const pendente = p.galerias.some(esperando)
  const corpo = `
    <div class="por-capa ${p.galerias.length > 1 ? 'por-capa-pilha' : ''}">
      <div class="por-capa-foto">${capa}</div>
      ${pendente ? '<span class="por-fita">Aguardando sua escolha</span>' : ''}
    </div>
    <div class="por-texto">
      <span class="por-data">${esc(mesAno(p.data))}</span>
      <h2>${esc(p.titulo)}</h2>
      <span class="por-meta">${fotos} ${fotos === 1 ? 'foto' : 'fotos'}${unica ? ` · ${rotuloTipo(unica)}` : ` · ${p.galerias.length} galerias`}${unica?.tem_senha ? ' · 🔒' : ''}</span>
    </div>`
  if (unica) return `<a class="por-pasta pub-revela" href="${linkGaleria(unica, portal)}">${corpo}</a>`
  return `
    <article class="por-pasta pub-revela">
      ${corpo}
      <nav class="por-galerias" aria-label="Galerias de ${esc(p.titulo)}">
        ${p.galerias
          .map(
            (g) => `<a href="${linkGaleria(g, portal)}" class="${esperando(g) ? 'por-gal-acao' : ''}">
              <span>${esc(g.nome)}</span><small>${rotuloTipo(g)}${g.tem_senha ? ' · 🔒' : ''}</small><b aria-hidden="true">→</b></a>`,
          )
          .join('')}
      </nav>
    </article>`
}

export async function montarPortal(codigo) {
  app.innerHTML = '<main class="pub pub-aviso"><p>Abrindo suas galerias…</p></main>'
  let status = 0
  let dados = {}
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/galeria`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY },
      body: JSON.stringify({ acao: 'portal', codigo }),
    })
    status = res.status
    dados = await res.json().catch(() => ({}))
  } catch {
    /* sem conexão */
  }
  if (status !== 200) {
    app.innerHTML = `<main class="pub pub-aviso"><h1>${status === 0 ? 'Sem conexão' : 'Acesso não encontrado'}</h1>
      <p>${status === 0 ? 'Confira a internet e tente de novo.' : 'Confira se o link está completo ou peça um novo pro seu fotógrafo.'}</p></main>`
    return
  }
  const { negocio, cliente, pastas, textos = {} } = dados
  aplicarAparencia(negocio, designCompleto(negocio.designPadrao))
  document.title = `${cliente ? cliente + ' · ' : ''}${negocio.nome}`
  const titulo = textoDoPortal(textos.titulo, cliente) || (cliente ? `Olá, ${cliente}` : 'Suas galerias')
  const mensagem = textoDoPortal(textos.mensagem, cliente)
  const pendentes = pastas.flatMap((p) => p.galerias).filter(esperando)
  const nFotos = pastas.reduce((t, p) => t + p.galerias.reduce((s, g) => s + (g.n_itens || 0), 0), 0)

  app.innerHTML = `
    <main class="pub por">
      <header class="por-barra">${marca(negocio)}</header>
      <section class="por-topo">
        <h1>${esc(titulo)}</h1>
        ${mensagem ? `<p class="por-mensagem">${esc(mensagem).replace(/\n/g, '<br>')}</p>` : ''}
        ${
          pastas.length
            ? `<p class="por-resumo">${pastas.length} ${pastas.length === 1 ? 'ensaio' : 'ensaios'} · ${nFotos} fotos</p>`
            : '<p class="por-resumo">Suas galerias aparecem aqui assim que ficarem prontas.</p>'
        }
      </section>
      ${
        pendentes.length
          ? `<a class="por-aviso" href="${linkGaleria(pendentes[0], codigo)}">
              <span><strong>${pendentes.length === 1 ? 'Tem uma seleção esperando por você' : `Tem ${pendentes.length} seleções esperando por você`}</strong>
              Escolha suas fotos favoritas</span><b aria-hidden="true">→</b></a>`
          : ''
      }
      <section class="por-grade">${pastas.map((p) => pasta(p, codigo)).join('')}</section>
      <footer class="pub-rodape"><small>${esc(negocio.nome)} · feito com <a href="https://studioslot.app.br" target="_blank" rel="noopener">Studio Slot</a></small></footer>
    </main>`

  const els = app.querySelectorAll('.pub-revela')
  if (!('IntersectionObserver' in window)) return els.forEach((e) => e.classList.add('pub-visivel'))
  const obs = new IntersectionObserver((en) =>
    en.forEach((x) => {
      if (x.isIntersecting) {
        x.target.classList.add('pub-visivel')
        obs.unobserve(x.target)
      }
    }),
  )
  els.forEach((e) => obs.observe(e))
}

