// Telas da Fase 5 — Painel do Dono
// O estúdio cadastra salas, define preços em faixas, cria extras e
// ajusta a própria identidade. Tudo fica salvo no navegador (localStorage).

import { brl } from '../format.js'
import { precosDaSala } from '../agenda.js'

// ---- pedacinhos de formulário reaproveitados ----
const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

function campoTexto(id, rotulo, valor, opc = {}) {
  return `
    <label class="campo dono-campo">
      <span>${rotulo}</span>
      <input type="${opc.tipo || 'text'}" id="${id}" value="${esc(valor)}"
        ${opc.placeholder ? `placeholder="${esc(opc.placeholder)}"` : ''} />
      ${opc.dica ? `<small class="campo-dica">${opc.dica}</small>` : ''}
    </label>`
}

function campoNumero(id, rotulo, valor, opc = {}) {
  return `
    <label class="campo dono-campo">
      <span>${rotulo}${opc.sufixo ? ` (${opc.sufixo})` : ''}</span>
      <input type="number" id="${id}" value="${esc(valor)}" step="1"
        ${opc.min != null ? `min="${opc.min}"` : ''} ${opc.max != null ? `max="${opc.max}"` : ''} />
    </label>`
}

function campoArea(id, rotulo, valor, opc = {}) {
  return `
    <label class="campo dono-campo">
      <span>${rotulo}</span>
      <textarea id="${id}" rows="${opc.linhas || 3}">${esc(valor)}</textarea>
      ${opc.dica ? `<small class="campo-dica">${opc.dica}</small>` : ''}
    </label>`
}

function campoSelect(id, rotulo, valor, opcoes) {
  return `
    <label class="campo dono-campo">
      <span>${rotulo}</span>
      <select id="${id}">
        ${opcoes
          .map(
            ([v, l]) =>
              `<option value="${esc(v)}" ${String(v) === String(valor) ? 'selected' : ''}>${l}</option>`,
          )
          .join('')}
      </select>
    </label>`
}

function campoCor(id, rotulo, valor) {
  return `
    <label class="campo dono-campo dono-campo-cor">
      <span>${rotulo}</span>
      <input type="color" id="${id}" value="${esc(valor)}" />
    </label>`
}

function campoCheck(id, rotulo, marcado) {
  return `
    <label class="termo dono-check">
      <input type="checkbox" id="${id}" ${marcado ? 'checked' : ''} />
      <span>${rotulo}</span>
    </label>`
}

// Campo de imagem: botão "Escolher imagem" + prévia. Guarda a URL num
// input escondido (o formulário lê esse valor, igual antes).
function campoFoto(id, rotulo, valor, dica) {
  const tem = !!valor
  return `
    <div class="campo dono-campo">
      <span>${rotulo}</span>
      <div class="foto-campo">
        <img class="foto-preview" id="${id}-preview" src="${esc(valor || '')}" alt="" ${tem ? '' : 'hidden'} />
        <label class="botao botao-fantasma foto-escolher">
          Escolher imagem
          <input type="file" id="${id}-arquivo" accept="image/png,image/jpeg,image/webp" hidden />
        </label>
        <button type="button" class="mini-btn" id="${id}-remover" ${tem ? '' : 'hidden'}>Tirar</button>
        <span class="foto-status" id="${id}-status"></span>
      </div>
      <input type="hidden" id="${id}" value="${esc(valor || '')}" />
      ${dica ? `<small class="campo-dica">${dica}</small>` : ''}
    </div>`
}

function barraExcluir(acao, rotulo, confirmar) {
  if (!confirmar) {
    return `<button type="button" class="botao botao-grande botao-perigo" data-acao="${acao}">${rotulo}</button>`
  }
  return `
    <div class="dono-confirma">
      <p>Tem certeza? Isso não dá para desfazer.</p>
      <div class="dono-confirma-botoes">
        <button type="button" class="botao botao-perigo" data-acao="${acao}-ok">Excluir de vez</button>
        <button type="button" class="botao botao-fantasma" data-acao="cancelar-exclusao">Cancelar</button>
      </div>
    </div>`
}

// Modelos em branco para "criar novo"
export function salaEmBranco() {
  return {
    id: null,
    nome: '',
    tipo: 'fixa',
    descricao: '',
    fotos: [],
    corFoto: '#E7E2DB',
    capacidadeMax: 6,
    metragem: 30,
    equipamento: [],
    ativa: true,
    slotMinutos: 60,
    precos: { diaUtil: 150, fimDeSemana: 190, feriado: 210 },
    bufferAntes: 0,
    bufferDepois: 0,
    disponivelDe: null,
    disponivelAte: null,
  }
}

export function extraEmBranco() {
  return { id: null, nome: '', valor: 0, salas: [] }
}

export function bloqueioEmBranco() {
  return { id: null, salaId: null, tipo: 'diario', data: '', horaInicio: '12:00', horaFim: '13:00', motivo: '' }
}

// ════════════════════════════════════════════════════════════════
//  Home do painel
// ════════════════════════════════════════════════════════════════
export function telaDonoHome({ config, nSalas, nExtras, nBloqueios, nPagamentosPendentes }) {
  return `
    <div class="topo-nav">
      <button class="link-voltar" data-ir="inicio">&larr; Voltar para o app</button>
    </div>

    <div class="reservar-corpo">
      <h1 class="titulo-grande">Painel do dono</h1>
      <p class="detalhe-desc">${config.nome}</p>

      <div class="dono-menu">
        ${
          nPagamentosPendentes > 0
            ? `
        <button class="dono-item dono-item-alerta" data-ir="donoPagamentos">
          <span class="dono-item-nome">Pagamentos pendentes <span class="dono-badge">${nPagamentosPendentes}</span></span>
          <span class="dono-item-sub">Pix avisado pelo fotógrafo, esperando sua confirmação</span>
        </button>`
            : ''
        }
        <button class="dono-item" data-ir="donoDashboard">
          <span class="dono-item-nome">Resumo do estúdio</span>
          <span class="dono-item-sub">reservas do dia, horas vendidas, faturamento e ocupação</span>
        </button>
        <button class="dono-item" data-ir="donoAgenda">
          <span class="dono-item-nome">Agenda do estúdio</span>
          <span class="dono-item-sub">calendário do mês — dias cheios, vagos e horários por sala</span>
        </button>
        <button class="dono-item" data-ir="donoSalas">
          <span class="dono-item-nome">Salas e cenários</span>
          <span class="dono-item-sub">${nSalas} cadastrada(s) &middot; fotos, preços, temporada, intervalos</span>
        </button>
        <button class="dono-item" data-ir="donoExtras">
          <span class="dono-item-nome">Extras</span>
          <span class="dono-item-sub">${nExtras} cadastrado(s) &middot; nome, valor, em quais salas</span>
        </button>
        <button class="dono-item" data-ir="donoBloqueios">
          <span class="dono-item-nome">Bloqueios de agenda</span>
          <span class="dono-item-sub">${nBloqueios} &middot; almoço, feriado, manutenção — horários que não atende</span>
        </button>
        <button class="dono-item" data-ir="donoIdentidade">
          <span class="dono-item-nome">Identidade do estúdio</span>
          <span class="dono-item-sub">nome, cores, horário, regras, feriados, chave Pix</span>
        </button>
      </div>
    </div>`
}

// ════════════════════════════════════════════════════════════════
//  Resumo do estúdio (Fase 6) — dashboard do dono
// ════════════════════════════════════════════════════════════════
const ROTULO_STATUS_DASH = {
  confirmada: 'Confirmada',
  aguardando_pagamento: 'Aguardando Pix',
  travada: 'Segurando horário',
  cancelada: 'Cancelada',
}

function cartao(rotulo, valor, sub) {
  return `
    <div class="dash-card">
      <span class="dash-num">${valor}</span>
      <span class="dash-rotulo">${rotulo}</span>
      ${sub ? `<span class="dash-sub">${sub}</span>` : ''}
    </div>`
}

function linhaDoDia(s) {
  return `
    <div class="dash-dia-linha">
      <span class="dash-dia-hora">${s.hora}</span>
      <span class="dash-dia-info">
        <span class="dash-dia-sala">${esc(s.salaNome)}</span>
        <span class="dash-dia-fot">${esc(s.fotografo || 'Fotógrafo')}</span>
      </span>
      <span class="badge-status badge-${s.status}">${ROTULO_STATUS_DASH[s.status] || s.status}</span>
    </div>`
}

function barraOcupacao(o) {
  return `
    <div class="dash-ocup-linha">
      <div class="dash-ocup-topo">
        <span class="dash-ocup-nome">${esc(o.salaNome)}</span>
        <span class="dash-ocup-pct">${o.pct}%</span>
      </div>
      <div class="dash-ocup-trilho">
        <div class="dash-ocup-preenche" style="width:${Math.min(100, o.pct)}%"></div>
      </div>
      <span class="dash-ocup-detalhe">${o.horasVendidas} h de ${o.horasDisponiveis} h de funcionamento</span>
    </div>`
}

const PERIODOS_DASH = [
  ['mesAtual', 'Este mês'],
  ['mesPassado', 'Mês passado'],
  ['7dias', '7 dias'],
]

function seletorPeriodo(ativo) {
  return `
    <div class="dash-periodo" role="tablist">
      ${PERIODOS_DASH.map(
        ([chave, rot]) => `
        <button type="button" class="dash-periodo-btn ${chave === ativo ? 'is-ativo' : ''}"
          data-dash-periodo="${chave}">${rot}</button>`,
      ).join('')}
    </div>`
}

export function telaDonoDashboard({ resumo }) {
  const { periodoAtivo, periodoTitulo, periodoRotulo, semDados, hoje, periodo, ocupacao } = resumo

  const cabecalho = `
    <div class="topo-nav">
      <button class="link-voltar" data-ir="donoHome">&larr; Painel</button>
    </div>
    <div class="reservar-corpo">
      <div class="dono-cab">
        <h1 class="titulo-grande">Resumo do estúdio</h1>
        <button type="button" class="mini-btn" data-acao="atualizar-resumo">Atualizar</button>
      </div>`

  if (semDados) {
    return `${cabecalho}
      <p class="vazio">Ainda não há reservas por aqui. Quando os fotógrafos começarem a reservar, os números aparecem nesta tela.</p>
    </div>`
  }

  return `${cabecalho}

      <h2 class="dash-titulo">Hoje</h2>
      <div class="dash-grid">
        ${cartao('sessões hoje', hoje.sessoes, hoje.aConfirmar ? `${hoje.aConfirmar} esperando Pix` : '')}
        ${cartao('horas reservadas', `${hoje.horas} h`)}
        ${cartao('faturamento do dia', brl(hoje.faturamento), 'já confirmado')}
      </div>

      ${
        hoje.lista.length
          ? `<div class="dash-dia-lista">${hoje.lista.map(linhaDoDia).join('')}</div>`
          : '<p class="vazio">Nenhuma sessão marcada para hoje.</p>'
      }

      <h2 class="dash-titulo">${periodoTitulo} &middot; ${periodoRotulo}</h2>
      ${seletorPeriodo(periodoAtivo)}
      <div class="dash-grid">
        ${cartao('faturamento', brl(periodo.faturamento), periodo.retido ? `+ ${brl(periodo.retido)} retido de cancelamentos` : 'confirmado')}
        ${cartao('sessões', periodo.sessoes)}
        ${cartao('horas vendidas', `${periodo.horas} h`)}
        ${cartao('ticket médio', brl(periodo.ticket))}
        ${cartao('reservas com extra', `${periodo.comExtra}%`)}
      </div>

      <h2 class="dash-titulo">Ocupação por sala &middot; ${periodoRotulo}</h2>
      ${
        ocupacao.length
          ? `<div class="dash-ocup-lista">${ocupacao.map(barraOcupacao).join('')}</div>`
          : '<p class="vazio">Cadastre salas para acompanhar a ocupação.</p>'
      }
      <p class="campo-dica">Ocupação = horas reservadas ÷ horas de funcionamento da sala no período (descontados feriados e dias que ainda não chegaram).</p>
    </div>`
}

// ════════════════════════════════════════════════════════════════
//  Agenda do estúdio (Fase 6) — calendário do mês + horários do dia
// ════════════════════════════════════════════════════════════════
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function celulaDia(c) {
  if (!c) return '<div class="cal-dia cal-dia-vazio"></div>'
  const classes = ['cal-dia', `cal-dia-${c.passado ? 'passado' : c.nivel}`]
  if (c.ehHoje) classes.push('cal-dia-hoje')
  // dia futuro/hoje: nº de horários livres (ou "cheio"); dia passado: nº de sessões
  let tag = ''
  if (c.passado) tag = c.ocupados ? `${c.ocupados} ✓` : ''
  else if (c.nivel === 'cheio') tag = 'cheio'
  else if (c.nivel === 'livre' || c.nivel === 'parcial') tag = `${c.livres} liv.`
  return `
    <button class="${classes.join(' ')}" data-agenda-dia="${c.iso}" aria-label="dia ${c.dia}">
      <span class="cal-dia-num">${c.dia}</span>
      <span class="cal-dia-tag">${tag}</span>
    </button>`
}

export function telaDonoAgenda({ mesLabel, mesAnterior, mesSeguinte, dias, semDados }) {
  return `
    <div class="topo-nav">
      <button class="link-voltar" data-ir="donoHome">&larr; Painel</button>
    </div>

    <div class="reservar-corpo">
      <h1 class="titulo-grande">Agenda do estúdio</h1>

      <div class="cal-nav">
        <button type="button" class="mini-btn" data-agenda-mes="${mesAnterior}">&larr;</button>
        <span class="cal-mes">${mesLabel}</span>
        <button type="button" class="mini-btn" data-agenda-mes="${mesSeguinte}">&rarr;</button>
      </div>

      ${
        semDados
          ? '<p class="vazio">Nenhuma sala ativa. Ative uma sala em “Salas e cenários” para a agenda aparecer.</p>'
          : `
      <div class="cal-semana-cab">
        ${DIAS_SEMANA.map((d) => `<span>${d}</span>`).join('')}
      </div>
      <div class="cal-grade">
        ${dias.map(celulaDia).join('')}
      </div>
      <div class="cal-legenda">
        <span><i class="cal-pt cal-pt-livre"></i> livre</span>
        <span><i class="cal-pt cal-pt-parcial"></i> parcial</span>
        <span><i class="cal-pt cal-pt-cheio"></i> cheio</span>
      </div>
      <p class="campo-dica">Toque num dia para ver os horários de cada sala.</p>`
      }
    </div>`
}

function slotAgendaDono(s) {
  if (s.disponivel) {
    return `
      <div class="slot">
        <span class="slot-hora">${s.inicio}</span>
        <span class="slot-tag">livre</span>
      </div>`
  }
  if (s.motivo === 'ocupado') {
    const extra =
      s.statusReserva === 'aguardando_pagamento'
        ? '<span class="slot-mini">aguardando Pix</span>'
        : s.statusReserva === 'travada'
          ? '<span class="slot-mini">segurando</span>'
          : ''
    return `
      <div class="slot slot-off slot-ocupado">
        <span class="slot-hora">${s.inicio}</span>
        <span class="slot-tag">${esc(s.fotografo || 'reservado')}</span>
        ${extra}
      </div>`
  }
  const texto =
    s.motivo === 'passou'
      ? 'passou'
      : s.motivo === 'preparo'
        ? 'preparo'
        : s.motivo === 'bloqueado'
          ? (s.nota || 'fechado').toLowerCase()
          : 'ocupado'
  return `
    <div class="slot slot-off slot-${s.motivo}">
      <span class="slot-hora">${s.inicio}</span>
      <span class="slot-tag">${esc(texto)}</span>
    </div>`
}

function blocoSalaDia(b) {
  if (b.foraTemporada) {
    return `
      <div class="cal-sala">
        <h2 class="dash-titulo">${esc(b.sala.nome)}</h2>
        <p class="vazio">Cenário sazonal fora de temporada nesta data.</p>
      </div>`
  }
  return `
    <div class="cal-sala">
      <h2 class="dash-titulo">${esc(b.sala.nome)}</h2>
      <p class="agenda-info">${b.ocupados} de ${b.total} horários reservados</p>
      <div class="grade-slots grade-slots-dono">
        ${b.slots.map(slotAgendaDono).join('')}
      </div>
    </div>`
}

export function telaDonoAgendaDia({ dataISO, dataLabel, hojeISO, blocos }) {
  const passou = dataISO < hojeISO
  return `
    <div class="topo-nav">
      <button class="link-voltar" data-ir="donoAgenda">&larr; Agenda</button>
    </div>

    <div class="reservar-corpo">
      <h1 class="titulo-grande">${dataLabel}</h1>
      <label class="campo dono-campo">
        <span>Ver outro dia</span>
        <input type="date" id="agenda-dia-data" value="${dataISO}" />
      </label>
      ${passou ? '<p class="campo-dica">Dia já passado — visão do que aconteceu.</p>' : ''}

      ${
        blocos.length
          ? blocos.map(blocoSalaDia).join('')
          : '<p class="vazio">Nenhuma sala ativa nesta data.</p>'
      }
    </div>`
}

// ════════════════════════════════════════════════════════════════
//  Pagamentos pendentes — confirmação manual do Pix
// ════════════════════════════════════════════════════════════════
function linhaPagamento(r) {
  return `
    <div class="dono-linha dono-linha-pagamento">
      <div class="dl-info">
        <span class="dl-nome">${esc(r.fotografoNome || 'Fotógrafo')} &middot; ${esc(r.salaNome || '')}</span>
        <span class="dl-sub">${r.dataBR} &middot; ${r.horaInicio} às ${r.horaFim} &middot; ${brl(r.valorTotal)}</span>
      </div>
      <div class="dl-acoes">
        <button class="mini-btn mini-btn-primario" data-acao="confirmar-pagamento" data-id="${r.id}">Confirmar pagamento</button>
      </div>
    </div>`
}

export function telaDonoPagamentos({ pendentes }) {
  return `
    <div class="topo-nav">
      <button class="link-voltar" data-ir="donoHome">&larr; Painel</button>
    </div>

    <div class="reservar-corpo">
      <h1 class="titulo-grande">Pagamentos pendentes</h1>
      <p class="detalhe-desc">O fotógrafo avisou que já pagou o Pix. Confira na sua conta e confirme — só depois disso a reserva vira definitiva.</p>

      <div class="dono-lista">
        ${pendentes.map(linhaPagamento).join('') || '<p class="vazio">Nenhum pagamento esperando confirmação.</p>'}
      </div>
    </div>`
}

// ════════════════════════════════════════════════════════════════
//  Salas — lista
// ════════════════════════════════════════════════════════════════
function linhaSala(s) {
  return `
    <div class="dono-linha ${s.ativa ? '' : 'dono-linha-off'}">
      <div class="dl-info">
        <span class="dl-nome">${s.nome}</span>
        <span class="dl-sub">
          ${s.tipo === 'sazonal' ? 'Sazonal' : 'Fixa'} &middot; ${s.slotMinutos} min &middot; ${brl(precosDaSala(s).diaUtil)}/h
        </span>
      </div>
      <div class="dl-acoes">
        <button class="mini-btn" data-acao="toggle-sala" data-id="${s.id}">${s.ativa ? 'Ativa' : 'Inativa'}</button>
        <button class="mini-btn mini-btn-primario" data-acao="editar-sala" data-id="${s.id}">Editar</button>
      </div>
    </div>`
}

export function telaDonoSalas({ salas }) {
  return `
    <div class="topo-nav">
      <button class="link-voltar" data-ir="donoHome">&larr; Painel</button>
    </div>

    <div class="reservar-corpo">
      <div class="dono-cab">
        <h1 class="titulo-grande">Salas e cenários</h1>
        <button class="botao" data-acao="nova-sala">+ Nova sala</button>
      </div>

      <div class="dono-lista">
        ${salas.map(linhaSala).join('') || '<p class="vazio">Nenhuma sala ainda.</p>'}
      </div>
    </div>`
}

// ════════════════════════════════════════════════════════════════
//  Salas — formulário
// ════════════════════════════════════════════════════════════════
export function telaDonoSalaForm({ sala, ehNova, erro, confirmarExclusao }) {
  const p = sala.precos || precosDaSala(sala)
  return `
    <div class="topo-nav">
      <button class="link-voltar" data-ir="donoSalas">&larr; Salas</button>
    </div>

    <form class="reservar-corpo dono-form" id="form-sala">
      <h1 class="titulo-grande">${ehNova ? 'Nova sala' : esc(sala.nome)}</h1>
      ${erro ? `<p class="form-erro">${erro}</p>` : ''}

      ${campoTexto('f-nome', 'Nome', sala.nome)}
      ${campoArea('f-descricao', 'Descrição', sala.descricao, { linhas: 2 })}
      ${campoSelect('f-tipo', 'Tipo', sala.tipo, [
        ['fixa', 'Sala fixa (sempre no ar)'],
        ['sazonal', 'Cenário sazonal (só numa temporada)'],
      ])}

      <div class="dono-sazonal dono-grid2" ${sala.tipo === 'sazonal' ? '' : 'hidden'}>
        ${campoTexto('f-de', 'Disponível de', sala.disponivelDe || '', { tipo: 'date' })}
        ${campoTexto('f-ate', 'Disponível até', sala.disponivelAte || '', { tipo: 'date' })}
      </div>

      ${campoFoto('f-foto', 'Foto da sala', sala.fotos?.[0] || '', 'PNG, JPEG ou WEBP até 5 MB. Sem foto, aparece só a cor de fundo.')}
      ${campoCor('f-cor', 'Cor de fundo', sala.corFoto || '#E7E2DB')}

      <div class="dono-grid2">
        ${campoNumero('f-capacidade', 'Capacidade', sala.capacidadeMax, { min: 1 })}
        ${campoNumero('f-metragem', 'Metragem', sala.metragem, { min: 1, sufixo: 'm²' })}
      </div>

      ${campoArea('f-equipamento', 'Equipamento (um por linha)', (sala.equipamento || []).join('\n'), {
        linhas: 4,
      })}

      <h2 class="bloco-titulo">Agenda</h2>
      ${campoSelect('f-slot', 'Duração de cada horário', String(sala.slotMinutos), [
        ['30', '30 min'],
        ['60', '1 hora'],
        ['90', '1h30'],
        ['120', '2 horas'],
      ])}
      <p class="campo-dica">Tempo reservado entre uma sessão e a próxima, para montar e desmontar o set:</p>
      <div class="dono-grid2">
        ${campoNumero('f-buf-antes', 'Preparo antes', sala.bufferAntes || 0, { min: 0, sufixo: 'min' })}
        ${campoNumero('f-buf-depois', 'Desmontagem depois', sala.bufferDepois || 0, { min: 0, sufixo: 'min' })}
      </div>

      <h2 class="bloco-titulo">Preço por hora</h2>
      <div class="dono-grid3">
        ${campoNumero('f-preco-util', 'Dia útil', p.diaUtil, { min: 0, sufixo: 'R$' })}
        ${campoNumero('f-preco-fds', 'Fim de semana', p.fimDeSemana, { min: 0, sufixo: 'R$' })}
        ${campoNumero('f-preco-fer', 'Feriado', p.feriado, { min: 0, sufixo: 'R$' })}
      </div>

      ${campoCheck('f-ativa', 'Sala ativa (aparece para os clientes)', sala.ativa)}

      <button type="submit" class="botao botao-grande">Salvar sala</button>
      ${ehNova ? '' : barraExcluir('excluir-sala', 'Excluir sala', confirmarExclusao)}
    </form>`
}

// ════════════════════════════════════════════════════════════════
//  Extras — lista
// ════════════════════════════════════════════════════════════════
function linhaExtra(e) {
  return `
    <div class="dono-linha">
      <div class="dl-info">
        <span class="dl-nome">${e.nome}</span>
        <span class="dl-sub">${brl(e.valor)} &middot; ${e.salas.length} sala(s)</span>
      </div>
      <div class="dl-acoes">
        <button class="mini-btn mini-btn-primario" data-acao="editar-extra" data-id="${e.id}">Editar</button>
      </div>
    </div>`
}

export function telaDonoExtras({ extras }) {
  return `
    <div class="topo-nav">
      <button class="link-voltar" data-ir="donoHome">&larr; Painel</button>
    </div>

    <div class="reservar-corpo">
      <div class="dono-cab">
        <h1 class="titulo-grande">Extras</h1>
        <button class="botao" data-acao="novo-extra">+ Novo extra</button>
      </div>

      <div class="dono-lista">
        ${extras.map(linhaExtra).join('') || '<p class="vazio">Nenhum extra ainda.</p>'}
      </div>
    </div>`
}

// ════════════════════════════════════════════════════════════════
//  Extras — formulário
// ════════════════════════════════════════════════════════════════
export function telaDonoExtraForm({ extra, salas, ehNovo, erro, confirmarExclusao }) {
  return `
    <div class="topo-nav">
      <button class="link-voltar" data-ir="donoExtras">&larr; Extras</button>
    </div>

    <form class="reservar-corpo dono-form" id="form-extra">
      <h1 class="titulo-grande">${ehNovo ? 'Novo extra' : esc(extra.nome)}</h1>
      ${erro ? `<p class="form-erro">${erro}</p>` : ''}

      ${campoTexto('f-nome', 'Nome', extra.nome)}
      ${campoNumero('f-valor', 'Valor', extra.valor, { min: 0, sufixo: 'R$' })}

      <fieldset class="dono-check-lista">
        <legend>Disponível nas salas</legend>
        ${
          salas.length
            ? salas
                .map(
                  (s) => `
              <label class="check-linha">
                <input type="checkbox" name="sala" value="${s.id}" ${extra.salas.includes(s.id) ? 'checked' : ''} />
                <span>${s.nome}</span>
              </label>`,
                )
                .join('')
            : '<p class="vazio">Cadastre uma sala primeiro.</p>'
        }
      </fieldset>

      <button type="submit" class="botao botao-grande">Salvar extra</button>
      ${ehNovo ? '' : barraExcluir('excluir-extra', 'Excluir extra', confirmarExclusao)}
    </form>`
}

// ════════════════════════════════════════════════════════════════
//  Bloqueios de agenda
// ════════════════════════════════════════════════════════════════
function textoBloqueio(b, salas) {
  const quando =
    b.tipo === 'diario'
      ? 'Todo dia'
      : b.data
        ? new Date(b.data + 'T12:00:00').toLocaleDateString('pt-BR')
        : 'Uma data'
  const diaTodo = (b.horaInicio || '00:00') <= '00:00' && (b.horaFim || '23:59') >= '23:59'
  const faixa = diaTodo ? 'dia todo' : `${b.horaInicio} às ${b.horaFim}`
  const ondeSala = b.salaId ? salas.find((s) => s.id === b.salaId)?.nome || 'uma sala' : 'todas as salas'
  return { quando, faixa, ondeSala }
}

function linhaBloqueio(b, salas) {
  const { quando, faixa, ondeSala } = textoBloqueio(b, salas)
  return `
    <div class="dono-linha">
      <div class="dl-info">
        <span class="dl-nome">${b.motivo || 'Bloqueado'}</span>
        <span class="dl-sub">${quando} &middot; ${faixa} &middot; ${ondeSala}</span>
      </div>
      <div class="dl-acoes">
        <button class="mini-btn mini-btn-primario" data-acao="editar-bloqueio" data-id="${b.id}">Editar</button>
      </div>
    </div>`
}

export function telaDonoBloqueios({ bloqueios, salas }) {
  return `
    <div class="topo-nav">
      <button class="link-voltar" data-ir="donoHome">&larr; Painel</button>
    </div>

    <div class="reservar-corpo">
      <div class="dono-cab">
        <h1 class="titulo-grande">Bloqueios de agenda</h1>
        <button class="botao" data-acao="novo-bloqueio">+ Novo bloqueio</button>
      </div>
      <p class="detalhe-desc">Faixas de horário ou dias que o estúdio não atende. Elas somem da agenda dos clientes.</p>

      <div class="dono-lista">
        ${
          bloqueios.length
            ? bloqueios.map((b) => linhaBloqueio(b, salas)).join('')
            : '<p class="vazio">Nenhum bloqueio. A agenda segue o horário de funcionamento.</p>'
        }
      </div>
    </div>`
}

export function telaDonoBloqueioForm({ bloqueio, salas, ehNovo, erro, confirmarExclusao }) {
  const b = bloqueio
  return `
    <div class="topo-nav">
      <button class="link-voltar" data-ir="donoBloqueios">&larr; Bloqueios</button>
    </div>

    <form class="reservar-corpo dono-form" id="form-bloqueio">
      <h1 class="titulo-grande">${ehNovo ? 'Novo bloqueio' : esc(b.motivo || 'Bloqueio')}</h1>
      ${erro ? `<p class="form-erro">${erro}</p>` : ''}

      ${campoTexto('f-motivo', 'Motivo (aparece na agenda)', b.motivo, { placeholder: 'Ex.: Almoço' })}

      ${campoSelect('f-tipo', 'Quando', b.tipo, [
        ['diario', 'Todo dia (ex.: almoço)'],
        ['data', 'Uma data específica'],
      ])}

      <label class="campo dono-campo dono-bloq-data" ${b.tipo === 'data' ? '' : 'hidden'}>
        <span>Data</span>
        <input type="date" id="f-data" value="${esc(b.data || '')}" />
      </label>

      <div class="dono-grid2">
        ${campoTexto('f-hora-inicio', 'Das', b.horaInicio || '', { tipo: 'time' })}
        ${campoTexto('f-hora-fim', 'Até', b.horaFim || '', { tipo: 'time' })}
      </div>
      <label class="termo dono-check">
        <input type="checkbox" id="f-dia-todo" ${
          (b.horaInicio || '00:00') <= '00:00' && (b.horaFim || '23:59') >= '23:59' ? 'checked' : ''
        } />
        <span>Dia todo (ignora os horários acima)</span>
      </label>

      ${campoSelect('f-sala', 'Vale para', b.salaId || '', [
        ['', 'Todas as salas'],
        ...salas.map((s) => [s.id, s.nome]),
      ])}

      <button type="submit" class="botao botao-grande">Salvar bloqueio</button>
      ${ehNovo ? '' : barraExcluir('excluir-bloqueio', 'Excluir bloqueio', confirmarExclusao)}
    </form>`
}

// ════════════════════════════════════════════════════════════════
//  Identidade do estúdio
// ════════════════════════════════════════════════════════════════
export function telaDonoIdentidade({ config, erro }) {
  const t = config.tema
  const rr = config.regrasReserva || {}
  return `
    <div class="topo-nav">
      <button class="link-voltar" data-ir="donoHome">&larr; Painel</button>
    </div>

    <form class="reservar-corpo dono-form" id="form-identidade">
      <h1 class="titulo-grande">Identidade do estúdio</h1>
      ${erro ? `<p class="form-erro">${erro}</p>` : ''}

      ${campoTexto('f-nome', 'Nome do estúdio', config.nome)}
      ${campoArea('f-descricao', 'Descrição curta', config.descricao, { linhas: 2 })}

      <h2 class="bloco-titulo">Marca</h2>
      ${campoFoto('f-logo', 'Logo (aparece no topo do app)', config.logo || '', 'Em branco = ícone padrão + o nome em texto.')}
      ${campoCheck(
        'f-logo-com-nome',
        'Minha logo já mostra o nome do estúdio (esconder o texto no topo)',
        config.logoComNome,
      )}
      ${campoFoto('f-icone', 'Ícone do app no celular', config.icone || '', 'Imagem quadrada. Em branco = usa a logo. Vira o ícone na tela inicial do celular e na aba.')}

      <h2 class="bloco-titulo">Cores</h2>
      <div class="dono-grid2">
        ${campoCor('f-cor-primaria', 'Primária', t.primaria)}
        ${campoCor('f-cor-fundo', 'Fundo do topo', t.fundo)}
        ${campoCor('f-cor-superficie', 'Cartões', t.superficie)}
        ${campoCor('f-cor-texto', 'Texto suave', t.textoSuave)}
      </div>

      <h2 class="bloco-titulo">Funcionamento</h2>
      <div class="dono-grid2">
        ${campoTexto('f-abre', 'Abre', config.horarioFuncionamento.abre, { tipo: 'time' })}
        ${campoTexto('f-fecha', 'Fecha', config.horarioFuncionamento.fecha, { tipo: 'time' })}
      </div>
      ${campoArea(
        'f-feriados',
        'Feriados (uma data AAAA-MM-DD por linha)',
        (config.feriados || []).join('\n'),
        { linhas: 4, dica: 'Nesses dias vale a faixa de preço "feriado".' },
      )}

      <h2 class="bloco-titulo">Cancelamento e remarcação</h2>
      <div class="dono-grid3">
        ${campoNumero('f-prazo-remarcar', 'Remarcar até', rr.prazoRemarcar ?? 48, { min: 0, sufixo: 'h antes' })}
        ${campoNumero('f-prazo-cancelar', 'Cancelar grátis até', rr.prazoCancelarGratis ?? 72, { min: 0, sufixo: 'h antes' })}
        ${campoNumero('f-taxa-cancelar', 'Taxa depois do prazo', rr.taxaCancelamento ?? 50, { min: 0, max: 100, sufixo: '%' })}
      </div>
      <small class="campo-dica">Passado o prazo grátis, o estúdio retém essa % do valor da reserva. Vale para todas as salas.</small>

      <h2 class="bloco-titulo">Textos</h2>
      ${campoArea('f-regras', 'Regras gerais', config.regrasGerais, { linhas: 3 })}
      ${campoArea('f-cancelamento', 'Política de cancelamento (texto para o cliente)', config.politicaCancelamento, { linhas: 2 })}

      <h2 class="bloco-titulo">Contato</h2>
      ${campoTexto('f-telefone', 'Telefone', config.contato.telefone)}
      ${campoTexto('f-endereco', 'Endereço', config.contato.endereco)}

      <h2 class="bloco-titulo">Pagamento</h2>
      ${campoTexto('f-chave-pix', 'Chave Pix', config.chavePix || '', {
        placeholder: 'CPF, CNPJ, e-mail, telefone ou chave aleatória',
        dica: 'É essa chave que o fotógrafo vê na hora de pagar a reserva.',
      })}

      <button type="submit" class="botao botao-grande">Salvar identidade</button>
    </form>`
}
