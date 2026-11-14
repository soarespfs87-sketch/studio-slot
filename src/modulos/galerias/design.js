// ────────────────────────────────────────────────────────────────
//  Galerias › Design  (#/galerias/<id>/design[/capitulos|/musica])
//
//  Três abas e a prévia ao vivo ao lado (a própria página da cliente
//  num iframe, em modo prévia). Cada mudança vai pra prévia na hora
//  por postMessage; só grava no banco ao tocar em "Salvar".
//    Visual              layout, capa, fonte, cores, grade
//    Capítulos e vídeos  capítulos (título + texto), fotos em cada um,
//                        vídeos por link (YouTube/Vimeo)
//    Música              nenhuma, arquivo MP3 ou link (Spotify/YouTube)
// ────────────────────────────────────────────────────────────────

import { esc } from '../../componentes/campos.js'
import { salvarGaleria, salvarCapitulosDasFotos, salvarDesignPadrao, mensagemDeErro } from './dados.js'
import { linksTemporarios, enviarMusica, apagarArquivos, TIPOS_MUSICA } from './arquivos.js'
import { DESIGN, designCompleto, coresDaPaleta, lerVideo, capaVideo, lerMusica, novoId, caminhoPublico } from './regras.js'

const ABAS = [
  { id: '', rotulo: 'Visual' },
  { id: 'capitulos', rotulo: 'Capítulos e vídeos' },
  { id: 'musica', rotulo: 'Música' },
]

// carrega as 5 fontes uma vez, pros cartões de escolha
function carregarFontesDasOpcoes() {
  if (document.querySelector('#gd-fontes')) return
  const fam = [...new Set(DESIGN.fonte.flatMap((f) => [f.titulo]))]
  const link = document.createElement('link')
  link.id = 'gd-fontes'
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?${fam.map((n) => `family=${n.replace(/ /g, '+')}:ital@0;1`).join('&')}&display=swap`
  document.head.appendChild(link)
}

// desenhinhos das capas
const MOCK_CAPA = {
  centro: '<i class="gm-foto gm-cheia"></i><b class="gm-titulo gm-meio"></b>',
  esquerda: '<i class="gm-foto gm-cheia"></i><b class="gm-titulo gm-canto"></b>',
  dividida: '<i class="gm-foto gm-metade"></i><b class="gm-titulo gm-direita"></b>',
  moldura: '<i class="gm-foto gm-moldura"></i><b class="gm-titulo gm-baixo"></b>',
  revista: '<b class="gm-titulo gm-topo"></b><i class="gm-foto gm-revista"></i>',
}
const MOCK_GRADE = {
  mosaico: '<span class="gm-mos"><i></i><i></i><i></i><i></i><i></i><i></i></span>',
  linhas: '<span class="gm-lin"><i></i><i></i><i></i><i></i><i></i></span>',
  quadrada: '<span class="gm-qua"><i></i><i></i><i></i><i></i><i></i><i></i></span>',
}
const MOCK_LAYOUT = {
  grade: MOCK_GRADE.mosaico,
  historia: '<span class="gm-his"><b></b><i class="gm-larga"></i><i></i><i></i></span>',
}

export async function renderDesign(el, ctx, { galeria, itens, designPadrao, aba = '' }) {
  carregarFontesDasOpcoes()
  const negocio = ctx.negocio
  // estado em edição (só vai pro banco no Salvar)
  const ed = {
    design: designCompleto(galeria.design, designPadrao),
    secoes: structuredClone(galeria.secoes || []),
    videos: structuredClone(galeria.videos || []),
    musica: galeria.musica ? { ...galeria.musica } : null,
    musicaArquivoNovo: null, // caminho recém-enviado (apaga se sair sem salvar)
    secaoDe: Object.fromEntries(itens.map((i) => [i.id, i.secao || null])),
    selecionadas: new Set(),
    filtroCap: 'todas',
    mudou: false,
  }
  let mini = {}
  try {
    mini = await linksTemporarios(itens.map((i) => i.caminho_mini))
  } catch {
    /* sem miniaturas */
  }

  el.innerHTML = `
    <section class="modulo modulo-largo gd">
      <a class="link-voltar-mod" href="#/galerias/${galeria.id}">&larr; ${esc(galeria.nome)}</a>
      <div class="leads-topo">
        <h1 class="titulo-grande">Design da galeria</h1>
        <div class="gd-topo-acoes">
          <a class="botao botao-fantasma" href="${caminhoPublico(galeria.codigo)}?previa=1" target="_blank" rel="noopener">Abrir prévia</a>
          <button class="botao" data-acao="salvar">Salvar</button>
        </div>
      </div>
      <p class="status-salvo" id="gd-status"></p>
      <nav class="abas" aria-label="Design">
        ${ABAS.map((a) => `<button type="button" class="aba ${a.id === aba ? 'aba-ativa' : ''}" data-aba="${a.id}">${a.rotulo}</button>`).join('')}
      </nav>
      <div class="gd-corpo">
        <div class="gd-controles" id="gd-controles"></div>
        <aside class="gd-previa">
          <div class="gd-previa-topo">
            <span>Prévia ao vivo</span>
            <div class="gd-aparelho" role="group" aria-label="Tamanho da prévia">
              <button type="button" data-aparelho="celular" class="on">Celular</button>
              <button type="button" data-aparelho="computador">Computador</button>
            </div>
          </div>
          <div class="gd-moldura gd-moldura-celular" id="gd-moldura">
            <iframe id="gd-iframe" title="Prévia da galeria" src="${caminhoPublico(galeria.codigo)}?previa=1"></iframe>
          </div>
        </aside>
      </div>
    </section>`

  const controles = el.querySelector('#gd-controles')
  const iframe = el.querySelector('#gd-iframe')
  const moldura = el.querySelector('#gd-moldura')
  const status = (msg, tipo = 'ok') => {
    const s = el.querySelector('#gd-status')
    s.textContent = msg
    s.dataset.tipo = tipo
  }

  // ── prévia ao vivo
  const mandarPrevia = () =>
    iframe.contentWindow?.postMessage(
      { tipo: 'galeria-previa', design: ed.design, secoes: ed.secoes, videos: ed.videos, secaoDe: ed.secaoDe },
      location.origin,
    )
  const aoMensagem = (e) => {
    if (e.origin === location.origin && e.source === iframe.contentWindow && e.data?.tipo === 'galeria-pronta') mandarPrevia()
  }
  window.addEventListener('message', aoMensagem)
  const mudou = () => {
    ed.mudou = true
    status('Alterações não salvas', 'aviso')
    mandarPrevia()
  }

  // celular (390px) ou computador (1280px reduzido pra caber)
  const ajustarEscala = () => {
    const comp = moldura.classList.contains('gd-moldura-computador')
    const larg = comp ? 1280 : 390
    const disponivel = moldura.parentElement.clientWidth - 2
    const escala = Math.min(1, disponivel / larg)
    iframe.style.width = `${larg}px`
    iframe.style.height = `${comp ? 800 : 760}px`
    iframe.style.transform = `scale(${escala})`
    moldura.style.height = `${(comp ? 800 : 760) * escala}px`
  }
  el.querySelectorAll('[data-aparelho]').forEach((b) =>
    b.addEventListener('click', () => {
      el.querySelectorAll('[data-aparelho]').forEach((x) => x.classList.toggle('on', x === b))
      moldura.classList.toggle('gd-moldura-computador', b.dataset.aparelho === 'computador')
      moldura.classList.toggle('gd-moldura-celular', b.dataset.aparelho !== 'computador')
      ajustarEscala()
    }),
  )
  const obs = new ResizeObserver(ajustarEscala)
  obs.observe(moldura.parentElement)

  // sair da tela: para de ouvir e avisa se tiver coisa não salva
  const aoSair = () => {
    if (!location.hash.startsWith(`#/galerias/${galeria.id}/design`)) {
      if (ed.mudou) setTimeout(() => alert('Saiu sem salvar: as mudanças do design foram descartadas.'), 0)
      window.removeEventListener('message', aoMensagem)
      window.removeEventListener('hashchange', aoSair)
      obs.disconnect()
      if (ed.musicaArquivoNovo) apagarArquivos([ed.musicaArquivoNovo]) // enviada e não salva
    }
  }
  window.addEventListener('hashchange', aoSair)

  // ── abas
  const opcoes = (chave, render) => `
    <div class="gd-opcoes gd-opcoes-${chave}" role="radiogroup">
      ${DESIGN[chave]
        .map(
          (o) => `
        <button type="button" role="radio" class="gd-opcao ${ed.design[chave] === o.id ? 'on' : ''}" data-chave="${chave}" data-valor="${o.id}" aria-checked="${ed.design[chave] === o.id}">
          ${render ? render(o) : ''}<span class="gd-opcao-nome">${o.rotulo}</span>
        </button>`,
        )
        .join('')}
    </div>`

  function abaVisual() {
    const historia = ed.design.layout === 'historia'
    controles.innerHTML = `
      <div class="cartao-bloco">
        <h2 class="bloco-titulo">Layout</h2>
        ${opcoes('layout', (o) => `<span class="gd-mock">${MOCK_LAYOUT[o.id]}</span><small>${o.dica}</small>`)}
        ${historia ? '<p class="campo-dica">Monte os capítulos na aba <button type="button" class="link-texto" data-ir-aba="capitulos">Capítulos e vídeos</button>.</p>' : ''}
      </div>
      <div class="cartao-bloco">
        <h2 class="bloco-titulo">Capa</h2>
        ${opcoes('capa', (o) => `<span class="gd-mock gd-mock-capa">${MOCK_CAPA[o.id]}</span>`)}
      </div>
      <div class="cartao-bloco">
        <h2 class="bloco-titulo">Fonte</h2>
        ${opcoes('fonte', (o) => `<span class="gd-fonte-amostra" style="font-family:'${o.titulo}',serif">Aa</span>`)}
      </div>
      <div class="cartao-bloco">
        <h2 class="bloco-titulo">Cores</h2>
        ${opcoes('paleta', (o) => {
          const c = coresDaPaleta(o.id, negocio.tema)
          return `<span class="gd-cor" style="background:${c.fundo};color:${c.texto}"><i style="background:${c.destaque}"></i>Aa</span>`
        })}
      </div>
      <div class="cartao-bloco">
        <h2 class="bloco-titulo">Grade de fotos</h2>
        ${historia ? '<p class="campo-dica">Na História a grade aparece quando a cliente filtra as favoritas.</p>' : ''}
        ${opcoes('grade', (o) => `<span class="gd-mock">${MOCK_GRADE[o.id]}</span>`)}
        <div class="gd-linha2">
          <div><span class="gd-sub">Espaço entre fotos</span>${opcoes('espaco')}</div>
          <div><span class="gd-sub">Tamanho</span>${opcoes('tamanho')}</div>
        </div>
      </div>
      <label class="termo dono-check gd-padrao"><input type="checkbox" id="gd-padrao" />
        <span>Usar este visual como padrão nas próximas galerias</span></label>`
    controles.querySelector('[data-ir-aba]')?.addEventListener('click', () => irPraAba('capitulos'))
    controles.querySelectorAll('[data-chave]').forEach((b) =>
      b.addEventListener('click', () => {
        ed.design[b.dataset.chave] = b.dataset.valor
        mudou()
        abaVisual()
      }),
    )
  }

  function abaCapitulos() {
    const nomeCap = (id) => {
      const k = ed.secoes.findIndex((s) => s.id === id)
      return k < 0 ? 'Abertura' : ed.secoes[k].titulo || `Capítulo ${k + 1}`
    }
    const opcoesCap = (atual) =>
      `<option value="">Abertura (antes dos capítulos)</option>${ed.secoes
        .map((s, k) => `<option value="${s.id}" ${s.id === atual ? 'selected' : ''}>${esc(s.titulo || `Capítulo ${k + 1}`)}</option>`)
        .join('')}`
    const contar = (id) => itens.filter((i) => (ed.secaoDe[i.id] || null) === id).length
    const visiveis = itens.filter((i) => ed.filtroCap === 'todas' || (ed.secaoDe[i.id] || '') === ed.filtroCap)

    controles.innerHTML = `
      ${ed.design.layout !== 'historia' ? `<p class="alerta alerta-amarelo">Capítulos aparecem no layout <strong>História</strong>. <button type="button" class="mini-btn" data-acao="virar-historia">Usar História</button></p>` : ''}
      <div class="cartao-bloco">
        <div class="bloco-cabeca"><h2 class="bloco-titulo">Capítulos</h2><button type="button" class="mini-btn mini-btn-primario" data-acao="novo-cap">+ Capítulo</button></div>
        <p class="campo-dica">Ex.: "Making of", "Cerimônia", "Festa". O app monta o ritmo das fotos sozinho: deitadas de ponta a ponta, em pé lado a lado.</p>
        ${
          ed.secoes.length
            ? ed.secoes
                .map(
                  (s, k) => `
            <div class="gd-cap" data-cap="${s.id}">
              <div class="gd-cap-topo">
                <span class="gd-cap-num">${String(k + 1).padStart(2, '0')}</span>
                <input class="entrada" data-campo="titulo" value="${esc(s.titulo)}" placeholder="Título do capítulo" maxlength="120" />
                <button type="button" class="mini-btn" data-mover="-1" ${k === 0 ? 'disabled' : ''} aria-label="Subir">↑</button>
                <button type="button" class="mini-btn" data-mover="1" ${k === ed.secoes.length - 1 ? 'disabled' : ''} aria-label="Descer">↓</button>
                <button type="button" class="mini-btn mini-btn-perigo" data-tirar aria-label="Apagar capítulo">✕</button>
              </div>
              <textarea class="entrada" data-campo="texto" rows="3" maxlength="3000" placeholder="Um texto curto contando esse momento (opcional)">${esc(s.texto)}</textarea>
              <small class="campo-dica">${contar(s.id)} fotos neste capítulo</small>
            </div>`,
                )
                .join('')
            : '<p class="vazio-mini">Nenhum capítulo ainda: as fotos aparecem todas na abertura.</p>'
        }
      </div>

      <div class="cartao-bloco">
        <h2 class="bloco-titulo">Fotos em cada capítulo</h2>
        <div class="gd-fotos-filtro">
          <select class="entrada entrada-auto" id="gd-filtro-cap">
            <option value="todas" ${ed.filtroCap === 'todas' ? 'selected' : ''}>Todas as fotos (${itens.length})</option>
            <option value="" ${ed.filtroCap === '' ? 'selected' : ''}>Abertura (${contar(null)})</option>
            ${ed.secoes.map((s, k) => `<option value="${s.id}" ${ed.filtroCap === s.id ? 'selected' : ''}>${esc(s.titulo || `Capítulo ${k + 1}`)} (${contar(s.id)})</option>`).join('')}
          </select>
          <button type="button" class="mini-btn" data-acao="sel-todas">${visiveis.every((i) => ed.selecionadas.has(i.id)) && visiveis.length ? 'Desmarcar' : 'Marcar'} todas</button>
        </div>
        <div class="gd-mover" ${ed.selecionadas.size ? '' : 'hidden'}>
          <span>${ed.selecionadas.size} ${ed.selecionadas.size === 1 ? 'marcada' : 'marcadas'} →</span>
          <select class="entrada entrada-auto" id="gd-destino">${opcoesCap(null)}</select>
          <button type="button" class="botao" data-acao="mover">Mover</button>
        </div>
        <div class="gal-grade gd-grade">
          ${
            visiveis.length
              ? visiveis
                  .map(
                    (i) => `
            <button type="button" class="gal-mini gd-sel ${ed.selecionadas.has(i.id) ? 'gd-sel-on' : ''}" data-sel="${i.id}" aria-pressed="${ed.selecionadas.has(i.id)}">
              ${mini[i.caminho_mini] ? `<img src="${esc(mini[i.caminho_mini])}" alt="${esc(i.nome_arquivo)}" loading="lazy" />` : '<div class="gal-mini-vazio"></div>'}
              <span class="gd-sel-marca">✓</span>
              <figcaption>${esc(nomeCap(ed.secaoDe[i.id]))}</figcaption>
            </button>`,
                  )
                  .join('')
              : '<p class="vazio-mini">Nenhuma foto aqui.</p>'
          }
        </div>
      </div>

      <div class="cartao-bloco">
        <div class="bloco-cabeca"><h2 class="bloco-titulo">Vídeos</h2><button type="button" class="mini-btn mini-btn-primario" data-acao="novo-video">+ Vídeo</button></div>
        <p class="campo-dica">Cole o link do YouTube ou do Vimeo (pode ser "não listado"). O vídeo toca direto na galeria.</p>
        ${
          ed.videos.length
            ? ed.videos
                .map((v) => {
                  const lido = lerVideo(v.url)
                  const thumb = capaVideo(lido)
                  return `
            <div class="gd-video" data-video="${v.id}">
              <div class="gd-video-thumb ${lido ? '' : 'gd-video-ruim'}" ${thumb ? `style="background-image:url('${esc(thumb)}')"` : ''}>${lido ? '▶' : '?'}</div>
              <div class="gd-video-campos">
                <input class="entrada" data-campo="url" value="${esc(v.url)}" placeholder="https://youtu.be/…" inputmode="url" />
                ${v.url && !lido ? '<small class="form-erro">Esse link não é de um vídeo do YouTube ou Vimeo.</small>' : ''}
                <div class="gd-video-linha">
                  <input class="entrada" data-campo="titulo" value="${esc(v.titulo)}" placeholder="Título (opcional)" maxlength="120" />
                  <select class="entrada entrada-auto" data-campo="secao">${opcoesCap(v.secao)}</select>
                  <button type="button" class="mini-btn mini-btn-perigo" data-tirar-video aria-label="Tirar vídeo">✕</button>
                </div>
              </div>
            </div>`
                })
                .join('')
            : '<p class="vazio-mini">Nenhum vídeo. Que tal o filme do casamento ou um teaser do ensaio?</p>'
        }
      </div>`

    const redesenhar = () => abaCapitulos()
    controles.querySelector('[data-acao="virar-historia"]')?.addEventListener('click', () => {
      ed.design.layout = 'historia'
      mudou()
      redesenhar()
    })
    controles.querySelector('[data-acao="novo-cap"]').addEventListener('click', () => {
      ed.secoes.push({ id: novoId(), titulo: '', texto: '' })
      mudou()
      redesenhar()
      controles.querySelector('.gd-cap:last-of-type [data-campo="titulo"]')?.focus()
    })
    controles.querySelectorAll('.gd-cap').forEach((box) => {
      const s = ed.secoes.find((x) => x.id === box.dataset.cap)
      box.querySelectorAll('[data-campo]').forEach((inp) =>
        inp.addEventListener('input', () => {
          s[inp.dataset.campo] = inp.value
          mudou()
        }),
      )
      box.querySelectorAll('[data-mover]').forEach((b) =>
        b.addEventListener('click', () => {
          const k = ed.secoes.indexOf(s)
          const j = k + Number(b.dataset.mover)
          ;[ed.secoes[k], ed.secoes[j]] = [ed.secoes[j], ed.secoes[k]]
          mudou()
          redesenhar()
        }),
      )
      box.querySelector('[data-tirar]').addEventListener('click', () => {
        const n = itens.filter((i) => ed.secaoDe[i.id] === s.id).length
        if (!confirm(`Apagar o capítulo "${s.titulo || 'sem título'}"?${n ? ` As ${n} fotos dele voltam pra abertura.` : ''}`)) return
        ed.secoes = ed.secoes.filter((x) => x !== s)
        for (const i of itens) if (ed.secaoDe[i.id] === s.id) ed.secaoDe[i.id] = null
        for (const v of ed.videos) if (v.secao === s.id) v.secao = null
        if (ed.filtroCap === s.id) ed.filtroCap = 'todas'
        mudou()
        redesenhar()
      })
    })
    controles.querySelector('#gd-filtro-cap').addEventListener('change', (e) => {
      ed.filtroCap = e.target.value
      ed.selecionadas.clear()
      redesenhar()
    })
    controles.querySelector('[data-acao="sel-todas"]').addEventListener('click', () => {
      const todas = visiveis.every((i) => ed.selecionadas.has(i.id))
      visiveis.forEach((i) => (todas ? ed.selecionadas.delete(i.id) : ed.selecionadas.add(i.id)))
      redesenhar()
    })
    controles.querySelectorAll('[data-sel]').forEach((b) =>
      b.addEventListener('click', () => {
        const id = b.dataset.sel
        ed.selecionadas.has(id) ? ed.selecionadas.delete(id) : ed.selecionadas.add(id)
        redesenhar()
      }),
    )
    controles.querySelector('[data-acao="mover"]')?.addEventListener('click', () => {
      const destino = controles.querySelector('#gd-destino').value || null
      for (const id of ed.selecionadas) ed.secaoDe[id] = destino
      ed.selecionadas.clear()
      mudou()
      redesenhar()
    })
    controles.querySelector('[data-acao="novo-video"]').addEventListener('click', () => {
      ed.videos.push({ id: novoId(), url: '', titulo: '', secao: null })
      redesenhar()
      controles.querySelector('.gd-video:last-of-type [data-campo="url"]')?.focus()
    })
    controles.querySelectorAll('.gd-video').forEach((box) => {
      const v = ed.videos.find((x) => x.id === box.dataset.video)
      box.querySelectorAll('[data-campo]').forEach((inp) => {
        const evento = inp.tagName === 'SELECT' ? 'change' : inp.dataset.campo === 'url' ? 'change' : 'input'
        inp.addEventListener(evento, () => {
          v[inp.dataset.campo] = inp.value.trim() || (inp.dataset.campo === 'secao' ? null : '')
          mudou()
          if (inp.dataset.campo === 'url') redesenhar() // atualiza a miniatura
        })
      })
      box.querySelector('[data-tirar-video]').addEventListener('click', () => {
        ed.videos = ed.videos.filter((x) => x !== v)
        mudou()
        redesenhar()
      })
    })
  }

  function abaMusica() {
    const m = ed.musica
    const tipo = m?.tipo || 'nenhuma'
    const lido = tipo === 'link' && m.url ? lerMusica(m.url) : null
    controles.innerHTML = `
      <div class="cartao-bloco">
        <h2 class="bloco-titulo">Música de fundo</h2>
        <p class="campo-dica">Começa quando a cliente toca em "Ver as fotos" (o celular não deixa tocar sozinho) e pausa quando ela abre um vídeo. Ela pode pausar quando quiser.</p>
        <div class="gal-tipos gd-musica-tipos">
          ${[
            ['nenhuma', 'Sem música', 'Só as fotos.'],
            ['arquivo', 'Arquivo MP3', 'Toca como fundo, sem anúncio.'],
            ['link', 'Link', 'Spotify ou YouTube, num player pequeno.'],
          ]
            .map(
              ([id, rot, dica]) => `
            <label class="gal-tipo ${tipo === id ? 'gal-tipo-on' : ''}">
              <input type="radio" name="gd-musica" value="${id}" ${tipo === id ? 'checked' : ''} />
              <strong>${rot}</strong><small>${dica}</small>
            </label>`,
            )
            .join('')}
        </div>
        ${
          tipo === 'arquivo'
            ? `<label class="gal-drop gd-musica-drop">
                <input type="file" id="gd-musica-arq" accept="${Object.keys(TIPOS_MUSICA).join(',')},.mp3,.m4a" hidden />
                <strong>${m.caminho ? '♪ ' + esc(m.titulo || 'Música enviada') : 'Escolher MP3 ou M4A'}</strong>
                <small>${m.caminho ? 'Toque pra trocar.' : 'Até 15 MB.'}</small>
              </label>
              <p class="foto-status" id="gd-musica-status"></p>`
            : ''
        }
        ${
          tipo === 'link'
            ? `<label class="campo dono-campo"><span>Link da música</span>
                <input id="gd-musica-url" value="${esc(m.url || '')}" placeholder="https://open.spotify.com/track/…" inputmode="url" /></label>
              ${m.url && !lido ? '<p class="form-erro">Use um link do Spotify (faixa, álbum ou playlist) ou do YouTube.</p>' : ''}
              ${lido ? `<p class="campo-dica">✓ ${lido.provedor === 'spotify' ? 'Spotify' : 'YouTube'}: a cliente toca no botão ♪ pra abrir o player.</p>` : ''}`
            : ''
        }
        ${
          tipo !== 'nenhuma'
            ? `<label class="campo dono-campo"><span>Nome da música (aparece pra cliente)</span>
                <input id="gd-musica-titulo" value="${esc(m?.titulo || '')}" maxlength="120" placeholder="Ex.: Nossa canção" /></label>
              <p class="campo-dica">Use músicas que você tem direito de usar (compradas, livres de direitos ou autorizadas).</p>`
            : ''
        }
      </div>`

    controles.querySelectorAll('[name="gd-musica"]').forEach((r) =>
      r.addEventListener('change', () => {
        const t = r.value
        if (t === 'nenhuma') ed.musica = null
        else if (t === 'link') ed.musica = { tipo: 'link', url: m?.tipo === 'link' ? m.url : '', titulo: m?.titulo || '' }
        else ed.musica = { tipo: 'arquivo', caminho: m?.tipo === 'arquivo' ? m.caminho : null, titulo: m?.titulo || '' }
        mudou()
        abaMusica()
      }),
    )
    controles.querySelector('#gd-musica-titulo')?.addEventListener('input', (e) => {
      ed.musica.titulo = e.target.value
      mudou()
    })
    controles.querySelector('#gd-musica-url')?.addEventListener('change', (e) => {
      ed.musica.url = e.target.value.trim()
      mudou()
      abaMusica()
    })
    controles.querySelector('#gd-musica-arq')?.addEventListener('change', async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const st = controles.querySelector('#gd-musica-status')
      st.textContent = 'Enviando…'
      try {
        const caminho = await enviarMusica(file, { estudioId: negocio.id, galeriaId: galeria.id })
        if (ed.musicaArquivoNovo) apagarArquivos([ed.musicaArquivoNovo]) // troca antes de salvar
        ed.musicaArquivoNovo = caminho
        ed.musica = { tipo: 'arquivo', caminho, titulo: ed.musica?.titulo || file.name.replace(/\.[^.]+$/, '') }
        mudou()
        abaMusica()
        controles.querySelector('#gd-musica-status').textContent = 'Pronto ✓ Salve pra valer na galeria.'
      } catch (err) {
        st.textContent = 'Falhou: ' + mensagemDeErro(err)
      }
    })
  }

  // ── salvar
  el.querySelector('[data-acao="salvar"]').addEventListener('click', async (e) => {
    const ruins = ed.videos.filter((v) => v.url && !lerVideo(v.url))
    if (ruins.length) return status('Tem link de vídeo que não é do YouTube ou Vimeo. Corrija ou tire o vídeo.', 'erro')
    if (ed.musica?.tipo === 'link' && !lerMusica(ed.musica.url)) return status('Confira o link da música (Spotify ou YouTube).', 'erro')
    if (ed.musica?.tipo === 'arquivo' && !ed.musica.caminho) return status('Escolha o arquivo da música ou mude pra "Sem música".', 'erro')
    e.target.disabled = true
    const musicaAntiga = galeria.musica?.tipo === 'arquivo' ? galeria.musica.caminho : null
    const campos = {
      design: ed.design,
      secoes: ed.secoes.map((s) => ({ id: s.id, titulo: s.titulo.trim(), texto: s.texto.trim() })),
      videos: ed.videos.filter((v) => v.url).map((v) => ({ id: v.id, url: v.url, titulo: (v.titulo || '').trim(), secao: v.secao || null })),
      musica: ed.musica,
    }
    const mudaram = Object.fromEntries(Object.entries(ed.secaoDe).filter(([id, s]) => (itens.find((i) => i.id === id).secao || null) !== s))
    const r1 = await salvarGaleria(campos, galeria.id)
    const r2 = r1.error ? r1 : await salvarCapitulosDasFotos(mudaram)
    const padrao = el.querySelector('#gd-padrao')?.checked
    const r3 = r2.error || !padrao ? r2 : await salvarDesignPadrao(negocio.id, ed.design)
    e.target.disabled = false
    const error = r1.error || r2.error || r3.error
    if (error) return status(mensagemDeErro(error), 'erro')
    // música trocada: apaga o arquivo antigo do armário
    if (musicaAntiga && musicaAntiga !== ed.musica?.caminho) apagarArquivos([musicaAntiga])
    Object.assign(galeria, campos)
    for (const i of itens) i.secao = ed.secaoDe[i.id]
    ed.musicaArquivoNovo = null
    ed.mudou = false
    status(padrao ? 'Salvo ✓ e virou o padrão das próximas galerias.' : 'Salvo ✓')
    iframe.src = iframe.src // recarrega a prévia com o que ficou salvo (música inclusive)
  })

  // troca de aba sem recarregar a tela (não perde o que ainda não foi salvo)
  function irPraAba(id) {
    el.querySelectorAll('[data-aba]').forEach((b) => b.classList.toggle('aba-ativa', b.dataset.aba === id))
    history.replaceState(null, '', `#/galerias/${galeria.id}/design${id ? '/' + id : ''}`)
    if (id === 'capitulos') abaCapitulos()
    else if (id === 'musica') abaMusica()
    else abaVisual()
  }
  el.querySelectorAll('[data-aba]').forEach((b) => b.addEventListener('click', () => irPraAba(b.dataset.aba)))
  irPraAba(aba)
  ajustarEscala()
}
