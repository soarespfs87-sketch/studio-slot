// ────────────────────────────────────────────────────────────────
//  Módulo Galerias (entrega e seleção de fotos). Endereços:
//    #/galerias                 lista
//    #/galerias/nova[/<cliente>] nova galeria (já com a cliente)
//    #/galerias/<id>            galeria: enviar fotos, link, seleção
//    #/galerias/<id>/editar     editar
//  A página da cliente é outra: /g/<codigo> (publica.js).
// ────────────────────────────────────────────────────────────────

import { supabase } from '../../supabase.js'
import { esc } from '../../componentes/campos.js'
import { hojeISO } from '../../format.js'
import { formatarReais } from '../../calculos.js'
import { carregarClientes } from '../clientes/dados.js'
import { carregarLeads } from '../leads/dados.js'
import { carregarPrecos } from '../precos/dados.js'
import { dataBR, linkWhatsMsg } from '../clientes/ui.js'
import {
  carregarGalerias,
  carregarGaleria,
  salvarGaleria,
  registrarItem,
  apagarItens,
  apagarGaleria,
  reabrirSelecao,
  salvarTextosPortal,
  mensagemDeErro,
} from './dados.js'
import { enviarFoto, linksTemporarios, emParalelo, apagarArquivos, TIPOS_OK } from './arquivos.js'
import {
  STATUS,
  TIPOS,
  contarSelecao,
  textoContador,
  listaLightroom,
  compararNomes,
  diasParaExpirar,
  formatarBytes,
  mensagemLink,
  caminhoPublico,
  urlPortal,
  mensagemPortal,
} from './regras.js'
import { renderFormulario } from './formulario.js'
import { renderDesign } from './design.js'

const urlPublica = (codigo) => `${location.origin}${caminhoPublico(codigo)}`
let _negocio = null
const ctxNegocio = () => _negocio
let _enviando = false // trava sair da tela no meio do envio

window.addEventListener('beforeunload', (e) => {
  if (_enviando) {
    e.preventDefault()
    e.returnValue = ''
  }
})

function seloStatus(g) {
  const s = STATUS[g.status]
  const dias = diasParaExpirar(g.expira_em, hojeISO())
  const exp =
    dias == null || g.status === 'rascunho'
      ? ''
      : dias < 0
        ? '<span class="gal-st gal-st-expirada">Expirada</span>'
        : dias <= 3
          ? `<span class="gal-st gal-st-expira">Expira ${dias === 0 ? 'hoje' : `em ${dias} ${dias === 1 ? 'dia' : 'dias'}`}</span>`
          : ''
  return `<span class="gal-st ${s.classe}">${s.rotulo}</span>${exp}`
}

// ── Lista ───────────────────────────────────────────────────────
// "Ensaio gestante · 12/10/2026" (da compra ligada) — o nome do ensaio na lista e no portal
function rotuloEnsaio(g, leads, servicos) {
  const l = g.lead_id && leads.find((x) => x.id === g.lead_id)
  if (!l) return ''
  const serv = servicos.find((s) => s.id === l.servico_id)?.nome || 'Ensaio'
  return `${serv}${l.data_sessao ? ` · ${dataBR(l.data_sessao)}` : ''}`
}

function cardGaleria(g, capas, ensaio) {
  return `
    <a class="gal-card" href="#/galerias/${g.id}">
      <div class="gal-card-capa">${capas[g.id] ? `<img src="${esc(capas[g.id])}" alt="" loading="lazy" />` : '<span>sem fotos</span>'}</div>
      <div class="gal-card-texto">
        ${ensaio ? `<span class="gal-ensaio">${esc(ensaio)}</span>` : ''}
        <strong>${esc(g.nome)}</strong>
        <span class="lead-meta">${TIPOS[g.tipo].rotulo} · ${g.n_itens} ${g.n_itens === 1 ? 'foto' : 'fotos'} · ${formatarBytes(g.bytes)}</span>
        <div class="gal-selos">${seloStatus(g)}</div>
      </div>
    </a>`
}

// Lista agrupada por cliente (cada cliente com os ensaios dela) + link do portal.
function renderLista(el, { galerias, limiteGb, clientes, capas, leads, servicos, portal = {} }) {
  const usado = galerias.reduce((s, g) => s + Number(g.bytes || 0), 0)
  const limite = limiteGb * 1024 ** 3
  const pct = limite ? Math.min(100, (usado / limite) * 100) : 100

  // grupos: clientes na ordem da galeria mais recente; "Sem cliente" no fim
  const grupos = []
  for (const g of galerias) {
    const chave = g.cliente_id || ''
    let gr = grupos.find((x) => x.chave === chave)
    if (!gr) grupos.push((gr = { chave, cliente: clientes.find((c) => c.id === g.cliente_id) || null, galerias: [] }))
    gr.galerias.push(g)
  }
  grupos.sort((a, b) => (a.chave ? 0 : 1) - (b.chave ? 0 : 1))
  // dentro da cliente: galerias do mesmo ensaio juntas
  for (const gr of grupos) {
    const ordemEnsaio = [...new Set(gr.galerias.map((g) => g.lead_id || g.id))]
    gr.galerias.sort((a, b) => ordemEnsaio.indexOf(a.lead_id || a.id) - ordemEnsaio.indexOf(b.lead_id || b.id))
  }

  el.innerHTML = `
    <section class="modulo modulo-largo">
      <div class="leads-topo">
        <h1 class="titulo-grande">Galerias</h1>
        <a class="botao" href="#/galerias/nova">+ Nova galeria</a>
      </div>
      <div class="gal-espaco" title="${formatarBytes(usado)} de ${limiteGb} GB">
        <div class="gal-espaco-barra"><span style="width:${pct.toFixed(1)}%" class="${pct > 90 ? 'gal-espaco-cheio' : ''}"></span></div>
        <small>${formatarBytes(usado)} de ${limiteGb} GB usados</small>
      </div>
      <p class="status-salvo" id="gal-status"></p>
      <details class="cartao-bloco gal-portal-cfg">
        <summary><strong>Portal da cliente</strong> <span class="campo-dica">texto que a cliente vê ao abrir o portal dela</span></summary>
        <form id="form-portal" class="dono-form" novalidate>
          <label class="campo dono-campo"><span>Título</span>
            <input id="pt-titulo" maxlength="120" value="${esc(portal.titulo || '')}" placeholder="Olá, {nome}" /></label>
          <label class="campo dono-campo"><span>Frase de abertura</span>
            <textarea id="pt-msg" rows="3" maxlength="1000" placeholder="Aqui ficam guardadas todas as suas memórias com a gente.">${esc(portal.mensagem || '')}</textarea>
            <small class="campo-dica">Escreva <strong>{nome}</strong> onde quiser o primeiro nome da cliente. Vale pro portal de todas as clientes.</small></label>
          <div class="gal-acoes">
            <button class="botao" type="submit">Salvar texto</button>
            ${clientes.find((c) => galerias.some((g) => g.cliente_id === c.id)) ? `<a class="botao botao-fantasma" target="_blank" rel="noopener" href="/c/${esc(clientes.find((c) => galerias.some((g) => g.cliente_id === c.id)).portal_codigo)}">Ver um portal</a>` : ''}
          </div>
        </form>
      </details>
      ${
        galerias.length
          ? grupos
              .map(
                (gr) => `
            <section class="gal-grupo">
              <div class="gal-grupo-topo">
                <h2>${gr.cliente ? `<a href="#/clientes/${gr.cliente.id}">${esc(gr.cliente.nome)}</a>` : 'Sem cliente'}</h2>
                ${
                  gr.cliente
                    ? `<div class="gal-acoes" style="margin-top:0">
                        <button type="button" class="mini-btn" data-portal="${esc(gr.cliente.portal_codigo)}">Copiar link do portal</button>
                        ${gr.cliente.whatsapp ? `<a class="mini-btn" target="_blank" rel="noopener" href="${linkWhatsMsg(gr.cliente.whatsapp, mensagemPortal(gr.cliente, ctxNegocio()))}">Mandar portal no WhatsApp</a>` : ''}
                      </div>`
                    : '<small class="campo-dica">Ligue a galeria a uma cliente pra ela aparecer no portal dela.</small>'
                }
              </div>
              <div class="gal-lista">${gr.galerias.map((g) => cardGaleria(g, capas, rotuloEnsaio(g, leads, servicos))).join('')}</div>
            </section>`,
              )
              .join('')
          : `<div class="em-breve">
              <p class="em-breve-frase">Entregue as fotos com a sua cara.</p>
              <p class="modulo-intro">Crie uma galeria de <strong>seleção</strong> (a cliente escolhe as favoritas, e as extras viram venda no Financeiro) ou de <strong>entrega</strong> (fotos prontas pra baixar). Ela recebe um link pelo WhatsApp, sem precisar de conta, e tem um <strong>portal</strong> com uma pasta pra cada ensaio.</p>
              <a class="botao" href="#/galerias/nova" style="display:inline-block;margin-top:14px;text-decoration:none">+ Criar a primeira galeria</a>
            </div>`
      }
    </section>`

  el.querySelector('#form-portal').addEventListener('submit', async (e) => {
    e.preventDefault()
    const s = el.querySelector('#gal-status')
    const titulo = el.querySelector('#pt-titulo').value.trim()
    const mensagem = el.querySelector('#pt-msg').value.trim()
    const { error } = await salvarTextosPortal(ctxNegocio().id, { titulo, mensagem })
    s.textContent = error ? mensagemDeErro(error) : 'Texto do portal salvo ✓'
    s.dataset.tipo = error ? 'erro' : 'ok'
  })

  el.querySelectorAll('[data-portal]').forEach((b) =>
    b.addEventListener('click', async () => {
      const s = el.querySelector('#gal-status')
      try {
        await navigator.clipboard.writeText(urlPortal(b.dataset.portal))
        s.textContent = 'Link do portal copiado ✓'
        s.dataset.tipo = 'ok'
      } catch {
        s.textContent = urlPortal(b.dataset.portal)
        s.dataset.tipo = 'ok'
      }
    }),
  )
}

// ── Galeria aberta ─────────────────────────────────────────────
function blocoLink(g, cliente, negocio) {
  if (g.status === 'rascunho') {
    return `
      <div class="cartao-bloco gal-publicar">
        <div>
          <h2 class="bloco-titulo">Pronta pra mandar?</h2>
          <p class="campo-dica">Enquanto estiver em rascunho, o link não abre pra ninguém.</p>
        </div>
        <button class="botao" data-acao="publicar" ${g.n_itens ? '' : 'disabled title="Envie fotos primeiro"'}>Publicar galeria</button>
      </div>`
  }
  const url = urlPublica(g.codigo)
  const msg = mensagemLink({ galeria: g, cliente, negocio: negocio.nome, url, senha: g.senha })
  return `
    <div class="cartao-bloco">
      <h2 class="bloco-titulo">Link da cliente</h2>
      <div class="gal-link">
        <input class="entrada" readonly value="${esc(url)}" id="gal-url" />
        <button class="mini-btn" data-acao="copiar-link">Copiar</button>
      </div>
      ${g.senha ? `<p class="campo-dica">Senha: <strong>${esc(g.senha)}</strong></p>` : ''}
      ${
        cliente
          ? `<p class="campo-dica">Também aparece no <a href="${esc(urlPortal(cliente.portal_codigo))}" target="_blank" rel="noopener">portal de ${esc(cliente.nome.split(' ')[0])}</a>, junto com os outros ensaios dela.</p>`
          : '<p class="campo-dica">Ligue a uma cliente (Editar) pra galeria entrar no portal dela.</p>'
      }
      <div class="gal-acoes">
        ${cliente?.whatsapp ? `<a class="botao botao-whats" href="${linkWhatsMsg(cliente.whatsapp, msg)}" target="_blank" rel="noopener">Mandar no WhatsApp</a>` : `<button class="botao botao-fantasma" data-acao="copiar-msg">Copiar mensagem</button>`}
        <a class="botao botao-fantasma" href="${esc(url)}" target="_blank" rel="noopener">Ver como a cliente</a>
      </div>
    </div>`
}

function blocoSelecao(g, itens, favoritas) {
  if (g.tipo !== 'selecao' || g.status === 'rascunho') return ''
  const c = contarSelecao({ favoritas: favoritas.length, incluidas: g.incluidas, precoExtraCentavos: g.preco_extra_centavos })
  const recebida = g.status === 'selecao_enviada' || g.status === 'concluida'
  const nomes = favoritas.map((f) => itens.find((i) => i.id === f.item_id)?.nome_arquivo).filter(Boolean).sort(compararNomes)
  const comentarios = favoritas
    .filter((f) => f.comentario)
    .map((f) => ({ ...f, nome: itens.find((i) => i.id === f.item_id)?.nome_arquivo || '' }))
    .sort((a, b) => compararNomes(a.nome, b.nome))
  return `
    <div class="cartao-bloco ${recebida ? 'gal-recebida' : ''}">
      <h2 class="bloco-titulo">${recebida ? `Seleção recebida${g.selecao_enviada_em ? ` em ${dataBR(g.selecao_enviada_em.slice(0, 10))}` : ''}` : 'Seleção em andamento'}</h2>
      <p class="gal-contador">${textoContador(c, formatarReais)}</p>
      ${recebida && c.valorExtrasCentavos > 0 ? `<p class="campo-dica">${formatarReais(c.valorExtrasCentavos)} de fotos extras lançados como <a href="#/financeiro">previsto no Financeiro</a>.</p>` : ''}
      ${!recebida ? '<p class="campo-dica">A cliente ainda está escolhendo. Você vê as favoritas aparecendo aqui.</p>' : ''}
      ${
        nomes.length
          ? `<div class="gal-acoes">
              <button class="botao ${recebida ? '' : 'botao-fantasma'}" data-acao="lightroom">Copiar lista pro Lightroom</button>
              ${recebida && g.status !== 'concluida' ? '<button class="botao botao-fantasma" data-acao="concluir">Marcar como concluída</button>' : ''}
              ${recebida ? '<button class="mini-btn" data-acao="reabrir">Reabrir pra cliente mexer</button>' : ''}
            </div>
            <small class="campo-dica">No Lightroom: Biblioteca › filtro Texto › Nome do arquivo › Contém, e cole.</small>
            <textarea class="entrada gal-lr" readonly rows="2" id="gal-lr">${esc(listaLightroom(nomes))}</textarea>`
          : ''
      }
      ${
        comentarios.length
          ? `<h3 class="gal-sub">Pedidos da cliente</h3>
            <ul class="gal-comentarios">${comentarios.map((f) => `<li><strong>${esc(f.nome)}</strong> ${esc(f.comentario)}</li>`).join('')}</ul>`
          : ''
      }
    </div>`
}

async function renderGaleria(el, ctx, { galeria: g, itens, favoritas, cliente, aviso }) {
  const negocio = ctx.negocio
  let links = {}
  try {
    links = await linksTemporarios(itens.map((i) => i.caminho_mini))
  } catch {
    /* sem miniaturas: a grade mostra só os nomes */
  }
  const favSet = new Map(favoritas.map((f) => [f.item_id, f]))
  let soFavoritas = false

  const redesenharGrade = () => {
    const lista = soFavoritas ? itens.filter((i) => favSet.has(i.id)) : itens
    el.querySelector('#gal-grade').innerHTML = lista.length
      ? lista
          .map(
            (i) => `
        <figure class="gal-mini ${favSet.has(i.id) ? 'gal-mini-fav' : ''} ${g.capa_item_id === i.id ? 'gal-mini-capa' : ''}" data-item="${i.id}">
          ${links[i.caminho_mini] ? `<img src="${esc(links[i.caminho_mini])}" alt="${esc(i.nome_arquivo)}" loading="lazy" />` : '<div class="gal-mini-vazio"></div>'}
          ${favSet.has(i.id) ? `<span class="gal-mini-coracao" title="${esc(favSet.get(i.id).comentario || 'Favorita')}">♥${favSet.get(i.id).comentario ? ' 💬' : ''}</span>` : ''}
          <figcaption>${esc(i.nome_arquivo)}</figcaption>
          <div class="gal-mini-acoes">
            <button type="button" title="Usar como capa" data-capa="${i.id}">★</button>
            <button type="button" title="Apagar" data-apagar="${i.id}">✕</button>
          </div>
        </figure>`,
          )
          .join('')
      : `<p class="vazio-mini">${soFavoritas ? 'Nenhuma favorita ainda.' : 'Nenhuma foto ainda. Envie acima.'}</p>`
  }

  el.innerHTML = `
    <section class="modulo modulo-largo">
      <a class="link-voltar-mod" href="#/galerias">&larr; Galerias</a>
      <div class="leads-topo">
        <div>
          <h1 class="titulo-grande">${esc(g.nome)}</h1>
          <p class="lead-meta">${TIPOS[g.tipo].rotulo}${cliente ? ` · <a href="#/clientes/${cliente.id}">${esc(cliente.nome)}</a>` : ''} · ${g.n_itens} ${g.n_itens === 1 ? 'foto' : 'fotos'} · ${formatarBytes(g.bytes)}${g.expira_em ? ` · no ar até ${dataBR(g.expira_em)}` : ''}</p>
          <div class="gal-selos">${seloStatus(g)}</div>
        </div>
        <div class="gal-acoes" style="margin-top:0">
          <a class="botao" href="#/galerias/${g.id}/design">🎨 Design</a>
          <a class="botao botao-fantasma" href="#/galerias/${g.id}/editar">Editar</a>
        </div>
      </div>
      <p class="status-salvo" id="gal-status"></p>

      ${blocoLink(g, cliente, negocio)}
      ${blocoSelecao(g, itens, favoritas)}

      <div class="cartao-bloco">
        <h2 class="bloco-titulo">Fotos</h2>
        <label class="gal-drop" id="gal-drop">
          <input type="file" id="gal-arquivos" accept="${TIPOS_OK.join(',')}" multiple hidden />
          <strong>Arraste as fotos aqui</strong> ou toque pra escolher
          <small>${g.tipo === 'selecao' ? `JPG, PNG ou WEBP. Viram versões leves${g.marca_dagua ? ' com marca d’água' : ''}; o original não é guardado.` : 'JPG, PNG ou WEBP até 50 MB. O original fica guardado pra cliente baixar.'}</small>
        </label>
        <div class="gal-progresso" id="gal-progresso" hidden>
          <div class="gal-espaco-barra"><span id="gal-prog-barra"></span></div>
          <small id="gal-prog-txt"></small>
        </div>
        <ul class="gal-erros" id="gal-erros" hidden></ul>
        ${
          itens.length
            ? `<div class="gal-filtros">
                ${g.tipo === 'selecao' ? `<button type="button" class="chip-filtro" data-acao="so-fav">♥ Só favoritas (${favoritas.length})</button>` : ''}
                <button type="button" class="mini-btn" data-acao="apagar-todas">Apagar todas as fotos</button>
              </div>`
            : ''
        }
        <div class="gal-grade" id="gal-grade"></div>
      </div>

      <div class="gal-rodape">
        <button class="mini-btn mini-btn-perigo" data-acao="apagar-galeria">Apagar galeria</button>
      </div>
    </section>`

  redesenharGrade()
  const status = (msg, tipo = 'ok') => {
    const s = el.querySelector('#gal-status')
    s.textContent = msg
    s.dataset.tipo = tipo
  }
  if (aviso) status(aviso)
  const recarregar = (msg) => render(el, ctx, msg)
  const copiar = async (texto, ok) => {
    try {
      await navigator.clipboard.writeText(texto)
      status(ok)
    } catch {
      status('Não consegui copiar. Selecione e copie à mão.', 'erro')
    }
  }
  const acao = (nome, fn) => el.querySelector(`[data-acao="${nome}"]`)?.addEventListener('click', fn)

  acao('publicar', async (e) => {
    e.target.disabled = true
    const { error } = await salvarGaleria({ status: 'publicada', capa_item_id: g.capa_item_id || itens[0]?.id || null }, g.id)
    if (error) return status(mensagemDeErro(error), 'erro')
    recarregar('Galeria publicada ✓ Agora é só mandar o link.')
  })
  acao('copiar-link', () => copiar(urlPublica(g.codigo), 'Link copiado ✓'))
  acao('copiar-msg', () =>
    copiar(mensagemLink({ galeria: g, cliente, negocio: negocio.nome, url: urlPublica(g.codigo), senha: g.senha }), 'Mensagem copiada ✓'),
  )
  acao('lightroom', () => copiar(el.querySelector('#gal-lr').value, 'Lista copiada ✓ Cole no filtro do Lightroom.'))
  acao('concluir', async () => {
    const { error } = await salvarGaleria({ status: 'concluida' }, g.id)
    if (error) return status(mensagemDeErro(error), 'erro')
    recarregar('Seleção concluída ✓')
  })
  acao('reabrir', async () => {
    const extras = g.extras_lancamento_id ? ' O lançamento de extras ainda previsto sai do Financeiro (volta quando ela enviar de novo).' : ''
    if (!confirm(`Reabrir a seleção pra cliente mudar as favoritas?${extras}`)) return
    const { error } = await reabrirSelecao(g.id)
    if (error) return status(mensagemDeErro(error), 'erro')
    recarregar('Seleção reaberta ✓')
  })
  acao('so-fav', (e) => {
    soFavoritas = !soFavoritas
    e.target.classList.toggle('chip-on', soFavoritas)
    redesenharGrade()
  })
  acao('apagar-todas', async () => {
    if (!confirm(`Apagar as ${itens.length} fotos desta galeria? Não dá pra desfazer.`)) return
    const { error } = await apagarItens(itens)
    if (error) return status(mensagemDeErro(error), 'erro')
    recarregar('Fotos apagadas.')
  })
  acao('apagar-galeria', async () => {
    if (!confirm(`Apagar a galeria "${g.nome}" com as ${itens.length} fotos? O link para de funcionar e não dá pra desfazer.`)) return
    const { error } = await apagarGaleria(g, itens)
    if (error) return status(mensagemDeErro(error), 'erro')
    location.hash = '#/galerias'
  })

  el.querySelector('#gal-grade').addEventListener('click', async (e) => {
    const capa = e.target.closest('[data-capa]')?.dataset.capa
    const apagar = e.target.closest('[data-apagar]')?.dataset.apagar
    if (capa) {
      const { error } = await salvarGaleria({ capa_item_id: capa }, g.id)
      if (error) return status(mensagemDeErro(error), 'erro')
      g.capa_item_id = capa
      redesenharGrade()
      status('Capa trocada ✓')
    }
    if (apagar) {
      const item = itens.find((i) => i.id === apagar)
      const fav = favSet.has(apagar) ? ' Ela está nas favoritas da cliente.' : ''
      if (!confirm(`Apagar ${item.nome_arquivo}?${fav}`)) return
      const { error } = await apagarItens([item])
      if (error) return status(mensagemDeErro(error), 'erro')
      recarregar('Foto apagada.')
    }
  })

  // ── Envio de fotos
  const entrada = el.querySelector('#gal-arquivos')
  const drop = el.querySelector('#gal-drop')
  entrada.addEventListener('change', () => enviar([...entrada.files]))
  drop.addEventListener('dragover', (e) => {
    e.preventDefault()
    drop.classList.add('gal-drop-on')
  })
  drop.addEventListener('dragleave', () => drop.classList.remove('gal-drop-on'))
  drop.addEventListener('drop', (e) => {
    e.preventDefault()
    drop.classList.remove('gal-drop-on')
    enviar([...e.dataTransfer.files])
  })

  async function enviar(arquivos) {
    if (_enviando || !arquivos.length) return
    const jaTem = new Set(itens.map((i) => i.nome_arquivo))
    const fotos = arquivos.filter((f) => TIPOS_OK.includes(f.type)).sort((a, b) => compararNomes(a.name, b.name))
    const erros = arquivos.filter((f) => !TIPOS_OK.includes(f.type)).map((f) => `${f.name}: use JPG, PNG ou WEBP.`)
    const repetidas = fotos.filter((f) => jaTem.has(f.name))
    const fila = fotos.filter((f) => !jaTem.has(f.name))
    if (repetidas.length) erros.push(`${repetidas.length} ${repetidas.length === 1 ? 'foto já estava' : 'fotos já estavam'} na galeria (mesmo nome) e ${repetidas.length === 1 ? 'foi pulada' : 'foram puladas'}.`)

    const prog = el.querySelector('#gal-progresso')
    const barra = el.querySelector('#gal-prog-barra')
    const txt = el.querySelector('#gal-prog-txt')
    const mostrarErros = () => {
      const ul = el.querySelector('#gal-erros')
      ul.innerHTML = erros.map((x) => `<li>${esc(x)}</li>`).join('')
      ul.hidden = !erros.length
    }
    mostrarErros()
    if (!fila.length) return

    _enviando = true
    drop.classList.add('gal-drop-off')
    prog.hidden = false
    let feitas = 0
    let enviadas = 0
    let primeira = null
    let parar = false
    const base = itens.length
    const atualizar = () => {
      barra.style.width = `${((feitas / fila.length) * 100).toFixed(1)}%`
      txt.textContent = `Enviando ${feitas} de ${fila.length}… não feche esta tela.`
    }
    atualizar()

    await emParalelo(fila, 3, async (file, k) => {
      if (parar) return
      try {
        const item = await enviarFoto(file, {
          estudioId: negocio.id,
          galeriaId: g.id,
          comOriginal: g.tipo === 'entrega',
          marca: g.tipo === 'selecao' && g.marca_dagua ? negocio.nome : null,
        })
        const { item: salvo, error } = await registrarItem(g.id, item, base + k)
        if (!error && k === 0 && !g.capa_item_id) primeira = salvo.id
        if (error) {
          await apagarArquivos([item.caminho_mini, item.caminho_web, item.caminho_original])
          if (error.hint === 'limite_galerias' || /espaço de galerias/i.test(error.message || '')) parar = true
          throw error
        }
        enviadas++
      } catch (e) {
        erros.push(`${file.name}: ${mensagemDeErro(e)}`)
        mostrarErros()
      }
      feitas++
      atualizar()
    })

    _enviando = false
    const ok = enviadas
    if (primeira) await salvarGaleria({ capa_item_id: primeira }, g.id)
    if (parar) erros.push('Envio interrompido: o espaço de galerias acabou. Apague galerias antigas ou fale com a gente.')
    await recarregar(`${Math.max(0, ok)} ${ok === 1 ? 'foto enviada' : 'fotos enviadas'} ✓`)
    if (erros.length) {
      const ul = el.querySelector('#gal-erros')
      if (ul) {
        ul.innerHTML = erros.map((x) => `<li>${esc(x)}</li>`).join('')
        ul.hidden = false
      }
    }
  }
}

// ── Roteador do módulo ─────────────────────────────────────────
export async function render(el, ctx, aviso) {
  const [, a, b, c] = location.hash.replace(/^#\/?/, '').split('/')
  if (!el.querySelector('.modulo')) {
    el.innerHTML = '<section class="modulo"><h1 class="titulo-grande">Galerias</h1><p class="vazio">Carregando…</p></section>'
  }
  const [rg, rc, rl, rp] = await Promise.all([
    carregarGalerias(ctx.negocio.id),
    carregarClientes(ctx.negocio.id),
    carregarLeads(ctx.negocio.id, { recarregar: true }),
    carregarPrecos(ctx.negocio.id),
  ])
  if (location.hash.replace(/^#\/?/, '').split('/')[0] !== 'galerias') return
  const error = rg.error || rc.error || rl.error || rp.error
  if (error) {
    el.innerHTML = `
      <section class="modulo"><h1 class="titulo-grande">Galerias</h1>
        <p class="form-erro">Não consegui carregar suas galerias: ${mensagemDeErro(error)}</p>
        <button class="botao" data-acao="tentar">Tentar de novo</button></section>`
    el.querySelector('[data-acao="tentar"]').addEventListener('click', () => render(el, ctx))
    return
  }
  const clientes = rc.dados.clientes
  _negocio = ctx.negocio
  const comuns = { clientes, leads: rl.leads, servicos: rp.dados.servicos }

  if (!a) {
    const capas = {}
    const comCapa = rg.dados.galerias.filter((g) => g.capa_item_id)
    if (comCapa.length) {
      // capa = miniatura do item escolhido (ou do primeiro)
      const { data } = await supabase.from('galeria_itens').select('id, caminho_mini').in('id', comCapa.map((g) => g.capa_item_id))
      try {
        const links = await linksTemporarios((data || []).map((i) => i.caminho_mini))
        for (const g of comCapa) {
          const it = (data || []).find((i) => i.id === g.capa_item_id)
          if (it) capas[g.id] = links[it.caminho_mini]
        }
      } catch {
        /* sem capas */
      }
    }
    return renderLista(el, { ...rg.dados, clientes, capas, leads: rl.leads, servicos: rp.dados.servicos })
  }
  if (a === 'nova') return renderFormulario(el, { galeria: null, clienteInicial: b || null, designPadrao: rg.dados.designPadrao, ...comuns })

  const r = await carregarGaleria(a)
  if (r.error || !r.dados.galeria) {
    el.innerHTML = '<section class="modulo"><p class="vazio-mini">Não encontrei essa galeria. <a href="#/galerias">Voltar</a></p></section>'
    return
  }
  if (b === 'editar') return renderFormulario(el, { galeria: r.dados.galeria, ...comuns })
  if (b === 'design') {
    return renderDesign(el, ctx, { galeria: r.dados.galeria, itens: r.dados.itens, designPadrao: rg.dados.designPadrao, aba: c || '' })
  }
  const cliente = clientes.find((c) => c.id === r.dados.galeria.cliente_id) || null
  return renderGaleria(el, ctx, { ...r.dados, cliente, aviso })
}
