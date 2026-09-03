// ────────────────────────────────────────────────────────────────
//  Controlador do app — decide qual tela mostrar e liga os botões
//  Fluxo: inicio -> detalhe -> agenda -> extras -> dados
//                                   -> pagamento (Pix) -> aguardandoPagamento
//         O dono confirma o recebimento no Painel ("Pagamentos pendentes")
//         e só aí a reserva vira "confirmada".
//         (trava de 10 min expira em qualquer passo -> expirada)
// ────────────────────────────────────────────────────────────────

import { aplicarTema } from './theme.js'
import {
  getConfig,
  setConfig,
  getSalas,
  getSalasAtivas,
  getSala,
  salvarSala,
  removerSala,
  salaTemReservaAtiva,
  getReservas,
  getReserva,
  getMinhasReservas,
  getExtras,
  getExtrasDaSala,
  salvarExtra,
  removerExtra,
  addReserva,
  updateReserva,
  removeReserva,
  cancelarReserva,
  remarcarReserva,
  addPagamento,
  limparTravasExpiradas,
  getFotografo,
  setFotografo,
  novoId,
  listarPagamentosPendentes,
  confirmarPagamento,
  listarReservasDoEstudio,
  reservaSeguraOHorario,
} from './dados.js'
import { gerarSlots, valorDoSlot, infoTemporada } from './agenda.js'
import { podeRemarcar, calculoCancelamento, horasAteSessao, regrasReserva } from './reserva.js'
import { hojeISO, mmss, dataBR, hhmmParaMin } from './format.js'
import { telaInicio } from './telas/inicio.js'
import { telaDetalhe } from './telas/detalhe.js'
import { telaAgenda } from './telas/agenda.js'
import { telaExtras } from './telas/extras.js'
import {
  telaDados,
  telaPagamento,
  telaAguardandoPagamento,
  telaExpirada,
} from './telas/reservar.js'
import {
  telaMinhasReservas,
  telaReservaDetalhe,
  telaCancelar,
  telaCanceladaOk,
  telaRemarcar,
  telaRemarcarConfirmar,
  telaRemarcadaOk,
} from './telas/minhas.js'
import {
  telaDonoHome,
  telaDonoSalas,
  telaDonoSalaForm,
  telaDonoExtras,
  telaDonoExtraForm,
  telaDonoBloqueios,
  telaDonoBloqueioForm,
  telaDonoIdentidade,
  telaDonoPagamentos,
  telaDonoDashboard,
  telaDonoAgenda,
  telaDonoAgendaDia,
  salaEmBranco,
  extraEmBranco,
  bloqueioEmBranco,
} from './telas/dono.js'
import { sair, souAdmin, meuEstudio } from './auth.js'
import { telaPlataforma, carregarEstudios, definirPlano } from './telas/plataforma.js'
import {
  carregarEstudio,
  getEstudioId,
  estaNoBanco,
  buscarEstudioPorSlug,
  listarEstudiosAtivos,
  carregarPerfil,
  carregarMinhasReservas,
  ocupacaoDaAgenda,
  getBloqueios,
  salvarBloqueio,
  removerBloqueio,
} from './dados.js'
import { enviarImagem } from './upload.js'
import { telaEscolherEstudio, telaSemEstudio } from './telas/acesso.js'
import { telaPrivacidade, telaTermos } from './telas/legal.js'
import { migrarEstudioLumen } from './migracao.js'

const DEZ_MINUTOS = 10 * 60 * 1000

// Config do estúdio — recarregada a cada render (o dono pode ter editado).
let config = getConfig()

// Definidos no iniciar(): a pessoa é admin da plataforma? é dona de um estúdio?
let ehAdmin = false
let ehDono = false

let estado = {
  tela: 'inicio',
  filtroData: hojeISO(),
  salaId: null,
  dataAgenda: null,
  reservaId: null,
  extrasSel: {}, // { [extraId]: quantidade }
  remarcarSlot: null, // "HH:MM|HH:MM" escolhido na remarcação
  donoSalaId: null, // sala em edição no painel (null = nova)
  donoExtraId: null, // extra em edição no painel (null = novo)
  donoBloqueioId: null, // bloqueio em edição no painel (null = novo)
  donoErro: null, // mensagem de erro do formulário atual
  donoConfirmar: false, // pedindo confirmação de exclusão
  dashPeriodo: 'mesAtual', // período do dashboard: mesAtual | mesPassado | 7dias
  agendaMes: null, // mês aberto no calendário do dono ('AAAA-MM')
  agendaDia: null, // dia aberto no detalhe da agenda do dono (ISO)
}

let intervaloContador = null
// Cache das reservas do estúdio enquanto o dono navega pelo Resumo / Agenda
// (trocar período ou dia não volta ao banco). render() limpa ao sair.
let _reservasEstudio = null
const TELAS_COM_RESERVAS_ESTUDIO = new Set(['donoDashboard', 'donoAgenda', 'donoAgendaDia'])
async function reservasDoEstudio(recarregar = false) {
  if (recarregar || !_reservasEstudio) _reservasEstudio = await listarReservasDoEstudio()
  return _reservasEstudio
}
const app = document.querySelector('#app')

function irPara(patch) {
  Object.assign(estado, patch)
  render()
}

function ligarNavegacao() {
  app.querySelectorAll('[data-ir]').forEach((el) => {
    el.addEventListener('click', () => irPara({ tela: el.dataset.ir }))
  })
}

// A trava ainda está de pé?
const travaViva = (r) =>
  !!r && r.status === 'travada' && r.travaExpiraEm > Date.now()

// Usada no começo de cada passo do fluxo: se a trava caiu, manda pra tela
// "expirada". Se a pessoa já tinha clicado "já paguei" (ex.: apertou voltar
// no navegador), manda pra tela de espera em vez de dizer que expirou.
function exigirTravaViva(reserva) {
  if (travaViva(reserva)) return true
  if (reserva?.status === 'aguardando_pagamento') {
    irPara({ tela: 'aguardandoPagamento' })
    return false
  }
  if (reserva) void removeReserva(reserva.id)
  irPara({ tela: 'expirada' })
  return false
}

// Contador de 10 minutos, compartilhado por extras / dados / pagamento.
function iniciarContador(reserva) {
  const caixa = app.querySelector('.contador')
  const span = app.querySelector('#contador')
  intervaloContador = setInterval(() => {
    const restante = reserva.travaExpiraEm - Date.now()
    if (restante <= 0) {
      clearInterval(intervaloContador)
      intervaloContador = null
      void removeReserva(reserva.id)
      irPara({ tela: 'expirada' })
      return
    }
    if (span) span.textContent = mmss(restante)
    if (restante < 60000) caixa?.classList.add('contador-alerta')
  }, 1000)
}

function render() {
  if (intervaloContador) {
    clearInterval(intervaloContador)
    intervaloContador = null
  }
  limparTravasExpiradas()
  config = getConfig() // sempre a versão mais recente
  aplicarTema(config)

  // saiu do Resumo/Agenda: joga fora o cache de reservas do estúdio
  if (!TELAS_COM_RESERVAS_ESTUDIO.has(estado.tela)) _reservasEstudio = null

  switch (estado.tela) {
    case 'inicio':
      return renderInicio()
    case 'detalhe':
      return renderDetalhe()
    case 'agenda':
      return renderAgenda()
    case 'extras':
      return renderExtras()
    case 'dados':
      return renderDados()
    case 'pagamento':
      return renderPagamento()
    case 'aguardandoPagamento':
      return renderAguardandoPagamento()
    case 'expirada':
      app.innerHTML = telaExpirada({ sala: getSala(estado.salaId) })
      return ligarNavegacao()
    case 'minhaReserva':
      return renderMinhaReserva()
    case 'reservaDetalhe':
      return renderReservaDetalhe()
    case 'cancelar':
      return renderCancelar()
    case 'canceladaOk':
      return renderCanceladaOk()
    case 'remarcar':
      return renderRemarcar()
    case 'remarcarConfirmar':
      return renderRemarcarConfirmar()
    case 'remarcadaOk':
      return renderRemarcadaOk()
    case 'donoHome':
      return renderDonoHome()
    case 'donoSalas':
      return renderDonoSalas()
    case 'donoSalaForm':
      return renderDonoSalaForm()
    case 'donoExtras':
      return renderDonoExtras()
    case 'donoExtraForm':
      return renderDonoExtraForm()
    case 'donoBloqueios':
      return renderDonoBloqueios()
    case 'donoBloqueioForm':
      return renderDonoBloqueioForm()
    case 'donoIdentidade':
      return renderDonoIdentidade()
    case 'donoPagamentos':
      return renderDonoPagamentos()
    case 'donoDashboard':
      return renderDonoDashboard()
    case 'donoAgenda':
      return renderDonoAgenda()
    case 'donoAgendaDia':
      return renderDonoAgendaDia()
    case 'plataforma':
      return renderPlataforma()
    case 'escolherEstudio':
      return renderEscolherEstudio()
    case 'semEstudio':
      return renderSemEstudio()
    case 'privacidade':
    case 'termos':
      return renderLegal()
  }
}

function renderLegal() {
  app.innerHTML =
    estado.tela === 'termos' ? telaTermos({ standalone: false }) : telaPrivacidade({ standalone: false })
  ligarNavegacao()
}

// ---- Início ----
function renderInicio() {
  estado.extrasSel = {}

  app.innerHTML = telaInicio({
    config,
    salas: getSalasAtivas(),
    filtroData: estado.filtroData,
    ehAdmin,
    ehDono,
  })

  app.querySelector('#filtro-data')?.addEventListener('change', (e) => {
    estado.filtroData = e.target.value
  })

  ligarNavegacao() // links "Minhas reservas", "Área do dono", "Painel da plataforma"

  app.querySelector('[data-acao="sair"]')?.addEventListener('click', async () => {
    await sair()
    location.reload()
  })

  app.querySelectorAll('[data-sala]').forEach((el) => {
    const abrir = () =>
      irPara({ tela: 'detalhe', salaId: el.dataset.sala, dataAgenda: estado.filtroData })
    el.addEventListener('click', abrir)
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        abrir()
      }
    })
  })
}

// ---- Detalhe ----
function renderDetalhe() {
  app.innerHTML = telaDetalhe({ sala: getSala(estado.salaId) })
  ligarNavegacao()
}

// ---- Agenda ----
async function renderAgenda() {
  const sala = getSala(estado.salaId)
  const data = estado.dataAgenda || estado.filtroData
  const slots = gerarSlots(sala, data, await ocupacaoDaAgenda(sala.id, data), getBloqueios())

  app.innerHTML = telaAgenda({
    sala,
    data,
    slots,
    infoSazonal: infoTemporada(sala, data),
    feriados: config.feriados || [],
  })
  ligarNavegacao()

  app.querySelector('#data-agenda')?.addEventListener('change', (e) => {
    irPara({ dataAgenda: e.target.value })
  })

  app.querySelectorAll('[data-slot]').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.disabled = true
      const [inicio, fim] = btn.dataset.slot.split('|')
      criarTrava(sala, data, inicio, fim)
    })
  })
}

async function criarTrava(sala, data, inicio, fim) {
  const valor = valorDoSlot(sala, data)
  const reserva = {
    id: novoId('res'),
    salaId: sala.id,
    data,
    horaInicio: inicio,
    horaFim: fim,
    status: 'travada',
    criadaEm: Date.now(),
    travaExpiraEm: Date.now() + DEZ_MINUTOS,
    valorSala: valor,
    valorExtras: 0,
    valorTotal: valor,
    extras: [],
    formaPagamento: null,
    pagoEm: null,
    aceiteTermoEm: null,
    fotografoNome: null,
  }
  const { id, error } = await addReserva(reserva)
  if (error) {
    // outro fotógrafo pegou o horário — volta pra agenda atualizada
    return irPara({ tela: 'agenda' })
  }
  irPara({
    tela: 'extras',
    reservaId: id,
    dataAgenda: data,
    extrasSel: {},
  })
}

// ---- Extras ----
function renderExtras() {
  const reserva = getReserva(estado.reservaId)
  if (!exigirTravaViva(reserva)) return

  const sala = getSala(estado.salaId)
  const extrasDisponiveis = getExtrasDaSala(sala.id)

  app.innerHTML = telaExtras({
    sala,
    reserva,
    extrasDisponiveis,
    selecionados: estado.extrasSel,
    restanteMs: reserva.travaExpiraEm - Date.now(),
  })
  iniciarContador(reserva)

  app.querySelector('[data-acao="cancelar-trava"]').addEventListener('click', async () => {
    await removeReserva(reserva.id)
    irPara({ tela: 'agenda' })
  })

  app.querySelectorAll('.stepper-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.closest('[data-extra]').dataset.extra
      const passo = Number(btn.dataset.passo)
      const atual = estado.extrasSel[id] || 0
      const novo = Math.max(0, Math.min(20, atual + passo))
      estado.extrasSel = { ...estado.extrasSel, [id]: novo }
      render()
    })
  })

  app.querySelector('[data-acao="ir-dados"]').addEventListener('click', async () => {
    const extras = extrasDisponiveis
      .filter((e) => (estado.extrasSel[e.id] || 0) > 0)
      .map((e) => ({
        extraId: e.id,
        nome: e.nome,
        valor: e.valor,
        quantidade: estado.extrasSel[e.id],
      }))
    const valorExtras = extras.reduce((s, e) => s + e.valor * e.quantidade, 0)
    await updateReserva(reserva.id, {
      extras,
      valorExtras,
      valorTotal: reserva.valorSala + valorExtras,
    })
    irPara({ tela: 'dados' })
  })
}

// ---- Dados + termo ----
function renderDados() {
  const reserva = getReserva(estado.reservaId)
  if (!exigirTravaViva(reserva)) return

  const sala = getSala(estado.salaId)
  app.innerHTML = telaDados({
    config,
    sala,
    reserva,
    fotografo: getFotografo(),
    restanteMs: reserva.travaExpiraEm - Date.now(),
  })
  iniciarContador(reserva)

  app.querySelector('[data-acao="voltar-extras"]').addEventListener('click', () => {
    irPara({ tela: 'extras' })
  })

  const nome = app.querySelector('#f-nome')
  const email = app.querySelector('#f-email')
  const tel = app.querySelector('#f-tel')
  const aceite = app.querySelector('#aceite')
  const btn = app.querySelector('#btn-ir-pagamento')

  const validar = () => {
    btn.disabled = !(nome.value.trim().length >= 3 && aceite.checked)
  }
  ;[nome, email, tel].forEach((i) => i.addEventListener('input', validar))
  aceite.addEventListener('change', validar)

  btn.addEventListener('click', async () => {
    btn.disabled = true
    await setFotografo({
      nome: nome.value.trim(),
      email: email.value.trim(),
      telefone: tel.value.trim(),
    })
    await updateReserva(reserva.id, {
      aceiteTermoEm: Date.now(),
      fotografoNome: nome.value.trim(),
    })
    irPara({ tela: 'pagamento' })
  })
}

// ---- Pagamento por Pix (o dono confirma o recebimento depois) ----
function renderPagamento() {
  const reserva = getReserva(estado.reservaId)
  if (!exigirTravaViva(reserva)) return

  const sala = getSala(estado.salaId)
  app.innerHTML = telaPagamento({
    sala,
    reserva,
    chavePix: config.chavePix,
    restanteMs: reserva.travaExpiraEm - Date.now(),
  })
  iniciarContador(reserva)

  app.querySelector('[data-acao="voltar-dados"]').addEventListener('click', () => {
    irPara({ tela: 'dados' })
  })

  app.querySelector('#btn-copiar-pix')?.addEventListener('click', async () => {
    const status = app.querySelector('#pix-copiado-status')
    try {
      await navigator.clipboard.writeText(config.chavePix || '')
      if (status) status.textContent = 'Copiado ✓'
    } catch {
      if (status) status.textContent = 'Não deu para copiar — selecione o texto manualmente.'
    }
  })

  app.querySelector('#btn-ja-paguei')?.addEventListener('click', async (e) => {
    e.target.disabled = true
    const id = reserva.id
    await updateReserva(id, {
      status: 'aguardando_pagamento',
      formaPagamento: 'pix',
    })
    await addPagamento({
      id: novoId('pag'),
      reservaId: id,
      valor: reserva.valorTotal,
      metodo: 'pix',
      status: 'aguardando_confirmacao',
      criadoEm: Date.now(),
    })
    irPara({ tela: 'aguardandoPagamento' })
  })
}

// ---- Aguardando o estúdio confirmar o Pix ----
function renderAguardandoPagamento() {
  const reserva = getReserva(estado.reservaId)
  if (!reserva) return irPara({ tela: 'inicio' })
  app.innerHTML = telaAguardandoPagamento({ sala: getSala(reserva.salaId), reserva })
  ligarNavegacao()
}

// ════════════════════════════════════════════════════════════════
//  Fase 3 — Minha Reserva: ver, cancelar e remarcar
// ════════════════════════════════════════════════════════════════

// Confirmadas e aguardando confirmação primeiro; dentro de cada grupo,
// da mais próxima pra mais distante.
function ordenarReservas(a, b) {
  const peso = (r) => (r.status === 'confirmada' || r.status === 'aguardando_pagamento' ? 0 : 1)
  return (
    peso(a) - peso(b) ||
    a.data.localeCompare(b.data) ||
    a.horaInicio.localeCompare(b.horaInicio)
  )
}

// ---- Lista "Minhas reservas" ----
function renderMinhaReserva() {
  const reservas = getMinhasReservas()
    .map((r) => ({ ...r, sala: getSala(r.salaId) }))
    .sort(ordenarReservas)

  app.innerHTML = telaMinhasReservas({ reservas })
  ligarNavegacao()

  app.querySelectorAll('[data-reserva]').forEach((el) => {
    el.addEventListener('click', () =>
      irPara({ tela: 'reservaDetalhe', reservaId: el.dataset.reserva }),
    )
  })
}

// ---- Detalhe de uma reserva ----
function renderReservaDetalhe() {
  const reserva = getReserva(estado.reservaId)
  if (!reserva) return irPara({ tela: 'minhaReserva' })

  const sala = getSala(reserva.salaId)
  app.innerHTML = telaReservaDetalhe({
    sala,
    reserva,
    config,
    podeRemarcar: podeRemarcar(reserva),
    horasAteSessao: horasAteSessao(reserva),
    prazoRemarcar: regrasReserva().prazoRemarcar,
  })
  ligarNavegacao()

  app.querySelector('[data-acao="ir-remarcar"]')?.addEventListener('click', () => {
    irPara({ tela: 'remarcar', salaId: sala.id, dataAgenda: reserva.data, remarcarSlot: null })
  })
  app.querySelector('[data-acao="ir-cancelar"]')?.addEventListener('click', () => {
    irPara({ tela: 'cancelar' })
  })
}

// ---- Cancelar (mostra a política) ----
function renderCancelar() {
  const reserva = getReserva(estado.reservaId)
  if (!reserva || !['confirmada', 'aguardando_pagamento'].includes(reserva.status))
    return irPara({ tela: 'minhaReserva' })

  const sala = getSala(reserva.salaId)
  const calc = calculoCancelamento(reserva)
  app.innerHTML = telaCancelar({ config, sala, reserva, calc })
  ligarNavegacao()

  app.querySelector('[data-acao="confirmar-cancelamento"]').addEventListener('click', async (e) => {
    e.target.disabled = true
    await cancelarReserva(reserva.id, calc)
    irPara({ tela: 'canceladaOk' })
  })
}

function renderCanceladaOk() {
  const reserva = getReserva(estado.reservaId)
  if (!reserva) return irPara({ tela: 'minhaReserva' })
  app.innerHTML = telaCanceladaOk({ sala: getSala(reserva.salaId), reserva })
  ligarNavegacao()
}

// ---- Remarcar: escolher novo dia/horário da mesma sala ----
async function renderRemarcar() {
  const reserva = getReserva(estado.reservaId)
  if (!reserva || !podeRemarcar(reserva)) return irPara({ tela: 'reservaDetalhe' })

  const sala = getSala(reserva.salaId)
  const data = estado.dataAgenda || reserva.data
  // O horário atual da própria reserva continua aparecendo como "ocupado" —
  // não faz sentido remarcar para exatamente o mesmo dia e hora.
  const slots = gerarSlots(sala, data, await ocupacaoDaAgenda(sala.id, data), getBloqueios())

  app.innerHTML = telaRemarcar({
    sala,
    reserva,
    data,
    slots,
    infoSazonal: infoTemporada(sala, data),
    feriados: config.feriados || [],
  })
  ligarNavegacao()

  app.querySelector('#data-remarcar')?.addEventListener('change', (e) => {
    irPara({ dataAgenda: e.target.value })
  })

  app.querySelectorAll('[data-slot]').forEach((btn) => {
    btn.addEventListener('click', () => {
      irPara({ tela: 'remarcarConfirmar', dataAgenda: data, remarcarSlot: btn.dataset.slot })
    })
  })
}

// ---- Remarcar: conferir a troca ----
function renderRemarcarConfirmar() {
  const reserva = getReserva(estado.reservaId)
  if (!reserva || !estado.remarcarSlot) return irPara({ tela: 'reservaDetalhe' })

  const sala = getSala(reserva.salaId)
  const data = estado.dataAgenda
  const [inicio, fim] = estado.remarcarSlot.split('|')
  const novoValorSala = valorDoSlot(sala, data)
  const novoTotal = novoValorSala + reserva.valorExtras

  app.innerHTML = telaRemarcarConfirmar({
    sala,
    reserva,
    data,
    inicio,
    fim,
    novoValorSala,
    novoTotal,
    diferenca: novoTotal - reserva.valorTotal,
  })
  ligarNavegacao()

  app.querySelector('[data-acao="confirmar-remarcacao"]').addEventListener('click', async (e) => {
    e.target.disabled = true
    const { error } = await remarcarReserva(reserva.id, {
      data,
      horaInicio: inicio,
      horaFim: fim,
      valorSala: novoValorSala,
      valorTotal: novoTotal,
    })
    if (error) return irPara({ tela: 'remarcar' }) // horário foi pego — volta pra agenda
    irPara({ tela: 'remarcadaOk', remarcarSlot: null })
  })
}

function renderRemarcadaOk() {
  const reserva = getReserva(estado.reservaId)
  if (!reserva) return irPara({ tela: 'minhaReserva' })
  app.innerHTML = telaRemarcadaOk({ sala: getSala(reserva.salaId), reserva })
  ligarNavegacao()
}

// ════════════════════════════════════════════════════════════════
//  Fase 5 — Painel do Dono
// ════════════════════════════════════════════════════════════════

// Lê um número não-negativo de um input do formulário.
const numDe = (sel) => Math.max(0, Number(app.querySelector(sel)?.value) || 0)
const textoDe = (sel) => app.querySelector(sel)?.value.trim() || ''
const linhasDe = (sel) =>
  textoDe(sel)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

async function renderDonoHome() {
  const nB = getBloqueios().length
  const pendentes = await listarPagamentosPendentes()
  app.innerHTML = telaDonoHome({
    config,
    nSalas: getSalas().length,
    nExtras: getExtras().length,
    nBloqueios: nB === 0 ? 'nenhum' : nB === 1 ? '1 bloqueio' : `${nB} bloqueios`,
    nPagamentosPendentes: pendentes.length,
  })
  ligarNavegacao()
}

// ---- Salas: lista ----
function renderDonoSalas() {
  app.innerHTML = telaDonoSalas({ salas: getSalas() })
  ligarNavegacao()

  app.querySelector('[data-acao="nova-sala"]').addEventListener('click', () =>
    irPara({ tela: 'donoSalaForm', donoSalaId: null, donoErro: null, donoConfirmar: false }),
  )
  app.querySelectorAll('[data-acao="editar-sala"]').forEach((b) =>
    b.addEventListener('click', () =>
      irPara({ tela: 'donoSalaForm', donoSalaId: b.dataset.id, donoErro: null, donoConfirmar: false }),
    ),
  )
  app.querySelectorAll('[data-acao="toggle-sala"]').forEach((b) =>
    b.addEventListener('click', async () => {
      b.disabled = true
      const s = getSala(b.dataset.id)
      await salvarSala({ ...s, ativa: !s.ativa })
      render()
    }),
  )
}

// Liga um campo "Escolher imagem" (campoFoto): envia pro armário e guarda a URL.
function ligarCampoFoto(idBase, pasta) {
  const arquivo = app.querySelector(`#${idBase}-arquivo`)
  if (!arquivo) return
  const escondido = app.querySelector(`#${idBase}`)
  const preview = app.querySelector(`#${idBase}-preview`)
  const status = app.querySelector(`#${idBase}-status`)
  const remover = app.querySelector(`#${idBase}-remover`)

  arquivo.addEventListener('change', async () => {
    const file = arquivo.files[0]
    if (!file) return
    status.textContent = 'Enviando…'
    const { url, error } = await enviarImagem(file, getEstudioId(), pasta)
    if (error) {
      status.textContent = 'Falhou: ' + (error.message || 'tente outra imagem')
      return
    }
    escondido.value = url
    preview.src = url
    preview.hidden = false
    remover?.removeAttribute('hidden')
    status.textContent = 'Pronto ✓'
  })

  remover?.addEventListener('click', () => {
    escondido.value = ''
    preview.hidden = true
    remover.hidden = true
    status.textContent = ''
  })
}

// ---- Salas: formulário ----
function renderDonoSalaForm() {
  const ehNova = !estado.donoSalaId
  const sala = ehNova ? salaEmBranco() : getSala(estado.donoSalaId)
  if (!sala) return irPara({ tela: 'donoSalas' })

  app.innerHTML = telaDonoSalaForm({
    sala,
    ehNova,
    erro: estado.donoErro,
    confirmarExclusao: estado.donoConfirmar,
  })
  ligarNavegacao()

  // mostra/esconde a janela de temporada conforme o tipo
  const selTipo = app.querySelector('#f-tipo')
  selTipo.addEventListener('change', () => {
    app.querySelector('.dono-sazonal').hidden = selTipo.value !== 'sazonal'
  })

  ligarCampoFoto('f-foto', 'salas')

  app.querySelector('#form-sala').addEventListener('submit', async (e) => {
    e.preventDefault()
    const nome = textoDe('#f-nome')
    if (nome.length < 2) return irPara({ donoErro: 'Dê um nome para a sala.' })

    const tipo = app.querySelector('#f-tipo').value
    const foto = textoDe('#f-foto')
    const btn = app.querySelector('#form-sala button[type="submit"]')
    btn.disabled = true
    const { error } = await salvarSala({
      ...sala,
      id: sala.id || novoId('sala'),
      nome,
      descricao: textoDe('#f-descricao'),
      tipo,
      disponivelDe: tipo === 'sazonal' ? app.querySelector('#f-de').value || null : null,
      disponivelAte: tipo === 'sazonal' ? app.querySelector('#f-ate').value || null : null,
      fotos: foto ? [foto] : [],
      corFoto: app.querySelector('#f-cor').value,
      capacidadeMax: numDe('#f-capacidade') || 1,
      metragem: numDe('#f-metragem') || 1,
      equipamento: linhasDe('#f-equipamento'),
      slotMinutos: Number(app.querySelector('#f-slot').value) || 60,
      bufferAntes: numDe('#f-buf-antes'),
      bufferDepois: numDe('#f-buf-depois'),
      precos: {
        diaUtil: numDe('#f-preco-util'),
        fimDeSemana: numDe('#f-preco-fds'),
        feriado: numDe('#f-preco-fer'),
      },
      ativa: app.querySelector('#f-ativa').checked,
    })
    if (error) return irPara({ donoErro: 'Não deu pra salvar: ' + (error.message || '') })
    irPara({ tela: 'donoSalas', donoErro: null, donoConfirmar: false })
  })

  app.querySelector('[data-acao="excluir-sala"]')?.addEventListener('click', () => {
    if (salaTemReservaAtiva(sala.id)) {
      return irPara({ donoErro: 'Esta sala tem reservas ativas. Desative-a em vez de excluir.' })
    }
    irPara({ donoConfirmar: true, donoErro: null })
  })
  app.querySelector('[data-acao="excluir-sala-ok"]')?.addEventListener('click', async () => {
    await removerSala(sala.id)
    irPara({ tela: 'donoSalas', donoConfirmar: false })
  })
  app.querySelector('[data-acao="cancelar-exclusao"]')?.addEventListener('click', () =>
    irPara({ donoConfirmar: false }),
  )
}

// ---- Extras: lista ----
function renderDonoExtras() {
  app.innerHTML = telaDonoExtras({ extras: getExtras() })
  ligarNavegacao()

  app.querySelector('[data-acao="novo-extra"]').addEventListener('click', () =>
    irPara({ tela: 'donoExtraForm', donoExtraId: null, donoErro: null, donoConfirmar: false }),
  )
  app.querySelectorAll('[data-acao="editar-extra"]').forEach((b) =>
    b.addEventListener('click', () =>
      irPara({ tela: 'donoExtraForm', donoExtraId: b.dataset.id, donoErro: null, donoConfirmar: false }),
    ),
  )
}

// ---- Extras: formulário ----
function renderDonoExtraForm() {
  const ehNovo = !estado.donoExtraId
  const extra = ehNovo
    ? extraEmBranco()
    : getExtras().find((x) => x.id === estado.donoExtraId)
  if (!extra) return irPara({ tela: 'donoExtras' })

  app.innerHTML = telaDonoExtraForm({
    extra,
    salas: getSalas(),
    ehNovo,
    erro: estado.donoErro,
    confirmarExclusao: estado.donoConfirmar,
  })
  ligarNavegacao()

  app.querySelector('#form-extra').addEventListener('submit', async (e) => {
    e.preventDefault()
    const nome = textoDe('#f-nome')
    if (nome.length < 2) return irPara({ donoErro: 'Dê um nome para o extra.' })

    const salasSel = [...app.querySelectorAll('input[name="sala"]:checked')].map((i) => i.value)
    const btn = app.querySelector('#form-extra button[type="submit"]')
    btn.disabled = true
    const { error } = await salvarExtra({
      ...extra,
      id: extra.id || novoId('extra'),
      nome,
      valor: numDe('#f-valor'),
      salas: salasSel,
    })
    if (error) return irPara({ donoErro: 'Não deu pra salvar: ' + (error.message || '') })
    irPara({ tela: 'donoExtras', donoErro: null, donoConfirmar: false })
  })

  app.querySelector('[data-acao="excluir-extra"]')?.addEventListener('click', () =>
    irPara({ donoConfirmar: true, donoErro: null }),
  )
  app.querySelector('[data-acao="excluir-extra-ok"]')?.addEventListener('click', async () => {
    await removerExtra(extra.id)
    irPara({ tela: 'donoExtras', donoConfirmar: false })
  })
  app.querySelector('[data-acao="cancelar-exclusao"]')?.addEventListener('click', () =>
    irPara({ donoConfirmar: false }),
  )
}

// ---- Bloqueios: lista ----
function renderDonoBloqueios() {
  app.innerHTML = telaDonoBloqueios({ bloqueios: getBloqueios(), salas: getSalas() })
  ligarNavegacao()

  app.querySelector('[data-acao="novo-bloqueio"]').addEventListener('click', () =>
    irPara({ tela: 'donoBloqueioForm', donoBloqueioId: null, donoErro: null, donoConfirmar: false }),
  )
  app.querySelectorAll('[data-acao="editar-bloqueio"]').forEach((b) =>
    b.addEventListener('click', () =>
      irPara({
        tela: 'donoBloqueioForm',
        donoBloqueioId: b.dataset.id,
        donoErro: null,
        donoConfirmar: false,
      }),
    ),
  )
}

// ---- Bloqueios: formulário ----
function renderDonoBloqueioForm() {
  const ehNovo = !estado.donoBloqueioId
  const bloqueio = ehNovo
    ? bloqueioEmBranco()
    : getBloqueios().find((b) => b.id === estado.donoBloqueioId)
  if (!bloqueio) return irPara({ tela: 'donoBloqueios' })

  app.innerHTML = telaDonoBloqueioForm({
    bloqueio,
    salas: getSalas(),
    ehNovo,
    erro: estado.donoErro,
    confirmarExclusao: estado.donoConfirmar,
  })
  ligarNavegacao()

  const selTipo = app.querySelector('#f-tipo')
  selTipo.addEventListener('change', () => {
    app.querySelector('.dono-bloq-data').hidden = selTipo.value !== 'data'
  })

  app.querySelector('#form-bloqueio').addEventListener('submit', async (e) => {
    e.preventDefault()
    const motivo = textoDe('#f-motivo')
    const tipo = selTipo.value
    if (tipo === 'data' && !app.querySelector('#f-data').value) {
      return irPara({ donoErro: 'Escolha a data do bloqueio.' })
    }
    const diaTodo = app.querySelector('#f-dia-todo').checked
    const btn = app.querySelector('#form-bloqueio button[type="submit"]')
    btn.disabled = true
    const { error } = await salvarBloqueio({
      ...bloqueio,
      id: bloqueio.id || novoId('bloq'),
      motivo,
      tipo,
      data: tipo === 'data' ? app.querySelector('#f-data').value : '',
      horaInicio: diaTodo ? '00:00' : textoDe('#f-hora-inicio') || '00:00',
      horaFim: diaTodo ? '23:59' : textoDe('#f-hora-fim') || '23:59',
      salaId: app.querySelector('#f-sala').value || null,
    })
    if (error) return irPara({ donoErro: 'Não deu pra salvar: ' + (error.message || '') })
    irPara({ tela: 'donoBloqueios', donoErro: null, donoConfirmar: false })
  })

  app.querySelector('[data-acao="excluir-bloqueio"]')?.addEventListener('click', () =>
    irPara({ donoConfirmar: true, donoErro: null }),
  )
  app.querySelector('[data-acao="excluir-bloqueio-ok"]')?.addEventListener('click', async () => {
    await removerBloqueio(bloqueio.id)
    irPara({ tela: 'donoBloqueios', donoConfirmar: false })
  })
  app.querySelector('[data-acao="cancelar-exclusao"]')?.addEventListener('click', () =>
    irPara({ donoConfirmar: false }),
  )
}

// ---- Identidade do estúdio ----
function renderDonoIdentidade() {
  app.innerHTML = telaDonoIdentidade({ config, erro: estado.donoErro })
  ligarNavegacao()

  ligarCampoFoto('f-logo', 'marca')
  ligarCampoFoto('f-icone', 'marca')

  app.querySelector('#form-identidade').addEventListener('submit', async (e) => {
    e.preventDefault()
    const nome = textoDe('#f-nome')
    if (nome.length < 2) return irPara({ donoErro: 'O estúdio precisa de um nome.' })

    const btn = app.querySelector('#form-identidade button[type="submit"]')
    btn.disabled = true
    const { error } = await setConfig({
      nome,
      descricao: textoDe('#f-descricao'),
      logo: textoDe('#f-logo') || null,
      logoComNome: app.querySelector('#f-logo-com-nome').checked,
      icone: textoDe('#f-icone') || null,
      regrasGerais: textoDe('#f-regras'),
      politicaCancelamento: textoDe('#f-cancelamento'),
      contato: { telefone: textoDe('#f-telefone'), endereco: textoDe('#f-endereco') },
      horarioFuncionamento: {
        abre: textoDe('#f-abre') || '08:00',
        fecha: textoDe('#f-fecha') || '20:00',
      },
      tema: {
        primaria: app.querySelector('#f-cor-primaria').value,
        fundo: app.querySelector('#f-cor-fundo').value,
        superficie: app.querySelector('#f-cor-superficie').value,
        textoSuave: app.querySelector('#f-cor-texto').value,
      },
      feriados: linhasDe('#f-feriados').filter((l) => /^\d{4}-\d{2}-\d{2}$/.test(l)),
      chavePix: textoDe('#f-chave-pix'),
      regrasReserva: {
        prazoRemarcar: numDe('#f-prazo-remarcar'),
        prazoCancelarGratis: numDe('#f-prazo-cancelar'),
        taxaCancelamento: Math.min(100, numDe('#f-taxa-cancelar')),
      },
    })
    if (error) return irPara({ donoErro: 'Não deu pra salvar: ' + (error.message || '') })
    irPara({ tela: 'donoHome', donoErro: null })
  })
}

// ---- Pagamentos pendentes: confirmação manual do Pix ----
async function renderDonoPagamentos() {
  app.innerHTML = '<div class="reservar-corpo"><p class="vazio">Carregando…</p></div>'
  const brutos = await listarPagamentosPendentes()
  const pendentes = brutos
    .map((r) => ({ ...r, salaNome: getSala(r.salaId)?.nome, dataBR: dataBR(r.data) }))
    .sort((a, b) => a.data.localeCompare(b.data) || a.horaInicio.localeCompare(b.horaInicio))

  app.innerHTML = telaDonoPagamentos({ pendentes })
  ligarNavegacao()

  app.querySelectorAll('[data-acao="confirmar-pagamento"]').forEach((b) =>
    b.addEventListener('click', async () => {
      b.disabled = true
      await confirmarPagamento(b.dataset.id)
      renderDonoPagamentos()
    }),
  )
}

// ---- Resumo do estúdio: dashboard do dono (Fase 6) ----
const arredonda1 = (n) => Math.round(n * 10) / 10
const isoDia = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const nomeMes = (ano, mes1a12) =>
  new Date(ano, mes1a12 - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })

// Traduz a chave do período num intervalo [de, ate] (datas ISO, inclusivo)
// + rótulos pra tela.
function intervaloDoPeriodo(chave, hojeISO) {
  const [y, m] = hojeISO.split('-').map(Number)
  if (chave === 'mesPassado') {
    const py = m === 1 ? y - 1 : y
    const pm = m === 1 ? 12 : m - 1
    const ult = new Date(py, pm, 0).getDate()
    return {
      de: `${py}-${String(pm).padStart(2, '0')}-01`,
      ate: `${py}-${String(pm).padStart(2, '0')}-${String(ult).padStart(2, '0')}`,
      titulo: 'Mês passado',
      rotulo: nomeMes(py, pm),
    }
  }
  if (chave === '7dias') {
    const ini = new Date(hojeISO + 'T12:00:00')
    ini.setDate(ini.getDate() - 6)
    return { de: isoDia(ini), ate: hojeISO, titulo: 'Últimos 7 dias', rotulo: 'últimos 7 dias' }
  }
  const ult = new Date(y, m, 0).getDate()
  return {
    de: `${hojeISO.slice(0, 7)}-01`,
    ate: `${hojeISO.slice(0, 7)}-${String(ult).padStart(2, '0')}`,
    titulo: 'Este mês',
    rotulo: nomeMes(y, m),
  }
}

// Dias de funcionamento entre 'de' e 'ate' (sem contar o futuro nem feriados).
function diasFuncionamento(de, ate, hojeISO, feriados) {
  const fim = ate < hojeISO ? ate : hojeISO
  if (fim < de) return 0
  const dias = Math.round((Date.parse(fim + 'T12:00:00') - Date.parse(de + 'T12:00:00')) / 86400000) + 1
  const feriadosNoTrecho = (feriados || []).filter((f) => f >= de && f <= fim).length
  return Math.max(0, dias - feriadosNoTrecho)
}

async function renderDonoDashboard() {
  if (!_reservasEstudio) {
    app.innerHTML = '<div class="reservar-corpo"><p class="vazio">Carregando resumo…</p></div>'
  }
  const reservas = await reservasDoEstudio()

  const hoje = hojeISO()
  const chavePeriodo = estado.dashPeriodo || 'mesAtual'
  const { de, ate, titulo, rotulo } = intervaloDoPeriodo(chavePeriodo, hoje)

  const horasDe = (r) => Math.max(0, (hhmmParaMin(r.horaFim) - hhmmParaMin(r.horaInicio)) / 60)
  const vendida = (r) => r.status === 'confirmada' || r.status === 'aguardando_pagamento'
  const seguraHorario = (r) =>
    vendida(r) || (r.status === 'travada' && r.travaExpiraEm > Date.now())

  // ── Hoje ──
  const deHoje = reservas
    .filter((r) => r.data === hoje && seguraHorario(r))
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
  const sessoesHoje = deHoje.filter(vendida)
  const hojeResumo = {
    sessoes: sessoesHoje.length,
    horas: arredonda1(sessoesHoje.reduce((s, r) => s + horasDe(r), 0)),
    faturamento: sessoesHoje
      .filter((r) => r.status === 'confirmada')
      .reduce((s, r) => s + r.valorTotal, 0),
    aConfirmar: sessoesHoje.filter((r) => r.status === 'aguardando_pagamento').length,
    lista: deHoje.map((r) => ({
      hora: r.horaInicio,
      salaNome: getSala(r.salaId)?.nome || 'Sala',
      fotografo: r.fotografoNome,
      status: r.status,
    })),
  }

  // ── Período escolhido ──
  const noPeriodo = (r) => r.data >= de && r.data <= ate
  const confP = reservas.filter((r) => r.status === 'confirmada' && noPeriodo(r))
  const canceladasP = reservas.filter((r) => r.status === 'cancelada' && noPeriodo(r))
  const fatP = confP.reduce((s, r) => s + r.valorTotal, 0)
  const horasP = confP.reduce((s, r) => s + horasDe(r), 0)
  const comExtra = confP.filter((r) => (r.extras || []).length > 0).length
  const periodoResumo = {
    faturamento: fatP,
    retido: canceladasP.reduce((s, r) => s + (r.valorRetido || 0), 0),
    sessoes: confP.length,
    horas: arredonda1(horasP),
    ticket: confP.length ? Math.round(fatP / confP.length) : 0,
    comExtra: confP.length ? Math.round((comExtra / confP.length) * 100) : 0,
  }

  // ── Ocupação por sala no período (descontados feriados e dias por vir) ──
  const { abre, fecha } = config.horarioFuncionamento
  const horasPorDia = Math.max(0, (hhmmParaMin(fecha) - hhmmParaMin(abre)) / 60)
  const nDias = diasFuncionamento(de, ate, hoje, config.feriados)
  const horasDisponiveis = arredonda1(horasPorDia * nDias)
  const ocupacao = getSalas().map((sala) => {
    const vendidas = confP
      .filter((r) => r.salaId === sala.id)
      .reduce((s, r) => s + horasDe(r), 0)
    return {
      salaNome: sala.nome,
      horasVendidas: arredonda1(vendidas),
      horasDisponiveis,
      pct: horasDisponiveis ? Math.round((vendidas / horasDisponiveis) * 100) : 0,
    }
  })

  app.innerHTML = telaDonoDashboard({
    resumo: {
      periodoAtivo: chavePeriodo,
      periodoTitulo: titulo,
      periodoRotulo: rotulo,
      semDados: reservas.length === 0,
      hoje: hojeResumo,
      periodo: periodoResumo,
      ocupacao,
    },
  })
  ligarNavegacao()

  app.querySelectorAll('[data-dash-periodo]').forEach((b) =>
    b.addEventListener('click', () => irPara({ dashPeriodo: b.dataset.dashPeriodo })),
  )
  app.querySelector('[data-acao="atualizar-resumo"]')?.addEventListener('click', async () => {
    await reservasDoEstudio(true)
    render()
  })
}

// ---- Agenda do estúdio: calendário do mês ----
function gradeDoMes(mesISO) {
  const [y, m] = mesISO.split('-').map(Number)
  const diaSemInicio = new Date(y, m - 1, 1).getDay() // 0 = domingo
  const totalDias = new Date(y, m, 0).getDate()
  const celulas = []
  for (let i = 0; i < diaSemInicio; i++) celulas.push(null)
  for (let d = 1; d <= totalDias; d++) celulas.push(`${mesISO}-${String(d).padStart(2, '0')}`)
  while (celulas.length % 7 !== 0) celulas.push(null)
  return celulas
}

const mesVizinho = (mesISO, passo) => {
  const [y, m] = mesISO.split('-').map(Number)
  const d = new Date(y, m - 1 + passo, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Contagem de horários livres / reservados de um dia, somando as salas ativas.
function resumoDoDia(dataISO, salasAtivas, reservas, bloqueios) {
  let livres = 0
  let ocupados = 0
  let total = 0
  for (const sala of salasAtivas) {
    for (const s of gerarSlots(sala, dataISO, reservas, bloqueios)) {
      if (s.motivo === 'passou') continue
      total++
      if (s.disponivel) livres++
      else if (s.motivo === 'ocupado') ocupados++
    }
  }
  const nivel =
    total === 0 ? 'fechado' : livres === 0 ? 'cheio' : ocupados === 0 ? 'livre' : 'parcial'
  return { livres, ocupados, total, nivel }
}

async function renderDonoAgenda() {
  if (!_reservasEstudio) {
    app.innerHTML = '<div class="reservar-corpo"><p class="vazio">Carregando agenda…</p></div>'
  }
  const reservas = await reservasDoEstudio()
  const hoje = hojeISO()
  const mes = estado.agendaMes || hoje.slice(0, 7)
  const salasAtivas = getSalas().filter((s) => s.ativa)
  const bloqueios = getBloqueios()

  const dias = gradeDoMes(mes).map((iso) => {
    if (!iso) return null
    return {
      iso,
      dia: Number(iso.slice(8, 10)),
      passado: iso < hoje,
      ehHoje: iso === hoje,
      ...resumoDoDia(iso, salasAtivas, reservas, bloqueios),
    }
  })

  const mesLabel = new Date(mes + '-01T12:00:00').toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  app.innerHTML = telaDonoAgenda({
    mesLabel,
    mesAnterior: mesVizinho(mes, -1),
    mesSeguinte: mesVizinho(mes, 1),
    dias,
    semDados: salasAtivas.length === 0,
  })
  ligarNavegacao()

  app.querySelectorAll('[data-agenda-mes]').forEach((b) =>
    b.addEventListener('click', () => irPara({ agendaMes: b.dataset.agendaMes })),
  )
  app.querySelectorAll('[data-agenda-dia]').forEach((b) =>
    b.addEventListener('click', () =>
      irPara({ tela: 'donoAgendaDia', agendaDia: b.dataset.agendaDia }),
    ),
  )
}

// ---- Agenda do estúdio: horários de um dia, sala por sala ----
async function renderDonoAgendaDia() {
  if (!_reservasEstudio) {
    app.innerHTML = '<div class="reservar-corpo"><p class="vazio">Carregando…</p></div>'
  }
  const reservas = await reservasDoEstudio()
  const hoje = hojeISO()
  const dataISO = estado.agendaDia || hoje
  const bloqueios = getBloqueios()

  const blocos = getSalas()
    .filter((s) => s.ativa)
    .map((sala) => {
      const info = infoTemporada(sala, dataISO)
      if (info && !info.dentro) return { sala, foraTemporada: true }
      const slots = gerarSlots(sala, dataISO, reservas, bloqueios).map((s) => {
        if (s.motivo !== 'ocupado') return s
        const r = reservas.find(
          (r) =>
            r.salaId === sala.id &&
            r.data === dataISO &&
            r.horaInicio <= s.inicio &&
            s.inicio < r.horaFim &&
            reservaSeguraOHorario(r),
        )
        return { ...s, fotografo: r?.fotografoNome || '', statusReserva: r?.status || '' }
      })
      return {
        sala,
        slots,
        ocupados: slots.filter((s) => s.motivo === 'ocupado').length,
        total: slots.filter((s) => s.motivo !== 'passou').length,
      }
    })

  const dataLabel = new Date(dataISO + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  })

  app.innerHTML = telaDonoAgendaDia({ dataISO, dataLabel, hojeISO: hoje, blocos })
  ligarNavegacao()

  app.querySelector('#agenda-dia-data')?.addEventListener('change', (e) => {
    if (e.target.value) irPara({ agendaDia: e.target.value })
  })
}

// ════════════════════════════════════════════════════════════════
//  Painel da Plataforma (só admin)
// ════════════════════════════════════════════════════════════════
async function renderPlataforma() {
  if (!ehAdmin) return irPara({ tela: 'inicio' })

  app.innerHTML = '<div class="reservar-corpo"><p class="vazio">Carregando estúdios…</p></div>'
  const { estudios, error } = await carregarEstudios()
  if (error) {
    app.innerHTML = `<div class="reservar-corpo"><p class="form-erro">${error.message}</p></div>`
    return
  }

  // tem Estúdio Lúmen de teste no navegador e ainda não foi importado?
  const salasDemo = !estaNoBanco() ? getSalas() : []
  const jaImportou = estudios.some((e) => e.slug.startsWith('estudio-lumen'))
  const podeImportar = salasDemo.length > 0 && !jaImportou

  app.innerHTML = telaPlataforma({
    estudios,
    podeImportar,
    nomeDemo: podeImportar ? getConfig().nome : '',
  })
  ligarNavegacao()

  app.querySelectorAll('[data-acao="liberar"], [data-acao="suspender"]').forEach((b) =>
    b.addEventListener('click', async () => {
      b.disabled = true
      await definirPlano(b.dataset.id, b.dataset.acao === 'liberar')
      renderPlataforma()
    }),
  )

  app.querySelector('[data-acao="importar-lumen"]')?.addEventListener('click', async (e) => {
    e.target.disabled = true
    const status = app.querySelector('#status-import')
    status.textContent = 'Importando (pode levar alguns segundos)…'
    const { estudio, error } = await migrarEstudioLumen()
    if (error) {
      status.textContent = 'Falhou: ' + (error.message || '')
      e.target.disabled = false
      return
    }
    status.textContent = 'Pronto! Abrindo o estúdio…'
    location.hash = estudio.slug
    location.reload()
  })
}

// Slug do estúdio pedido na URL: studioslot.app/nome, ?e=nome ou #nome
function slugDaURL() {
  const q = new URLSearchParams(location.search).get('e')
  const h = location.hash.replace(/^#\/?/, '')
  const seg = location.pathname.replace(/^\/+/, '').split('/')[0]
  const p = seg && !seg.includes('.') ? seg : '' // ignora /favicon.svg etc.
  return (q || h || p || '').trim() || null
}

// ---- Fotógrafo sem link de estúdio ----
function renderSemEstudio() {
  app.innerHTML = telaSemEstudio()

  app.querySelector('#form-slug').addEventListener('submit', (e) => {
    e.preventDefault()
    const slug = app.querySelector('#s-slug').value.trim().replace(/^.*\//, '')
    if (!slug) return
    location.hash = slug
    location.reload()
  })
  app.querySelector('[data-acao="sair"]').addEventListener('click', async () => {
    await sair()
    location.reload()
  })
}

// ---- Admin escolhe em qual estúdio entrar ----
async function renderEscolherEstudio() {
  app.innerHTML = '<div class="reservar-corpo"><p class="vazio">Carregando estúdios…</p></div>'
  const { estudios } = await listarEstudiosAtivos()

  app.innerHTML = telaEscolherEstudio({ estudios, ehAdmin })
  ligarNavegacao()

  app.querySelectorAll('[data-estudio-slug]').forEach((b) =>
    b.addEventListener('click', () => {
      location.hash = b.dataset.estudioSlug
      location.reload()
    }),
  )
  app.querySelector('[data-acao="sair"]')?.addEventListener('click', async () => {
    await sair()
    location.reload()
  })
}

export async function iniciar() {
  ehAdmin = await souAdmin().catch(() => false)

  const est = await meuEstudio().catch(() => null)
  ehDono = !!est

  try {
    if (est && est.plano_ativo) {
      await carregarEstudio(est) // dono → o estúdio dele
    } else {
      // fotógrafo: o estúdio vem do link (?e= / #slug) ou do último que ele abriu
      const slug = slugDaURL() || lerUltimoEstudio()
      if (slug) {
        const { estudio } = await buscarEstudioPorSlug(slug)
        if (estudio) {
          await carregarEstudio(estudio)
          guardarUltimoEstudio(estudio.slug) // o app fica "casado" com esse estúdio
        }
      }
    }
  } catch (e) {
    console.error('Não consegui carregar o estúdio:', e)
  }

  if (estaNoBanco()) {
    await carregarPerfil().catch(() => {})
    await carregarMinhasReservas().catch(() => {})
  } else if (!ehDono) {
    // admin sem link → lista pra escolher; fotógrafo sem link → "abra pelo link"
    estado.tela = ehAdmin ? 'escolherEstudio' : 'semEstudio'
  }

  render()
}

const CHAVE_ULTIMO = 'studioslot:ultimoEstudio'
const lerUltimoEstudio = () => {
  try {
    return localStorage.getItem(CHAVE_ULTIMO)
  } catch {
    return null
  }
}
const guardarUltimoEstudio = (slug) => {
  try {
    localStorage.setItem(CHAVE_ULTIMO, slug)
  } catch {
    /* aba privada, etc. */
  }
}
