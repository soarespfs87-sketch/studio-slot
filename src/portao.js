// ────────────────────────────────────────────────────────────────
//  Portão de entrada:
//   sem login              -> tela de acesso (entrar / criar conta)
//   logado sem negócio     -> "qual é o nome do seu negócio?"
//   negócio sem plano ativo -> tela "falta liberar sua assinatura"
//   resto (e admin)        -> o app (app.js)
// ────────────────────────────────────────────────────────────────

import {
  sessaoAtual,
  entrar,
  cadastrar,
  sair,
  souAdmin,
  meuEstudio,
  criarMeuEstudio,
  pedirRecuperacaoSenha,
  definirNovaSenha,
  traduzErroAuth,
} from './auth.js'
import {
  telaEntrar,
  telaCadastro,
  telaAguardando,
  telaEsqueciSenha,
  telaNovaSenha,
  telaCriarNegocio,
} from './telas/acesso.js'
import { telaPrivacidade, telaTermos } from './telas/legal.js'
import { iniciar } from './app.js'

const app = document.querySelector('#app')

// Privacidade / Termos abertos direto pela URL (#privacidade, #termos) —
// funcionam com ou sem login, inclusive numa aba nova.
function paginaLegalDoHash() {
  const h = location.hash.replace(/^#\/?/, '')
  return h === 'privacidade' || h === 'termos' ? h : null
}

function mostrarLegal(qual) {
  app.innerHTML =
    qual === 'termos' ? telaTermos({ standalone: true }) : telaPrivacidade({ standalone: true })
}

// A pessoa veio de um link de "esqueci minha senha"? O Supabase manda o
// link com "#...type=recovery..." — a gente confere ANTES de qualquer
// outra coisa (inclusive antes do slugDaURL do app.js ler o # como estúdio).
function veioDeRecuperacaoSenha() {
  const h = new URLSearchParams(location.hash.replace(/^#/, ''))
  return h.get('type') === 'recovery'
}

export async function montarPortao() {
  if (veioDeRecuperacaoSenha()) return mostrarNovaSenha()

  const legal = paginaLegalDoHash()
  if (legal) return mostrarLegal(legal)

  const s = await sessaoAtual()
  if (!s) return mostrarAcesso('entrar')

  // admin da plataforma entra sempre (tem o Painel da Plataforma)
  if (await souAdmin()) return iniciar()

  const est = await meuEstudio()
  if (!est) return mostrarCriarNegocio()
  if (!est.plano_ativo) return mostrarAguardando(est)

  return iniciar()
}

function mostrarAguardando(est) {
  app.innerHTML = telaAguardando({ estudio: est })
  app.querySelector('[data-acao="recarregar"]').addEventListener('click', () => location.reload())
  app.querySelector('[data-acao="sair"]').addEventListener('click', async () => {
    await sair()
    location.reload()
  })
}

function mostrarCriarNegocio(dados = {}) {
  app.innerHTML = telaCriarNegocio(dados)
  app.querySelector('[data-acao="sair"]').addEventListener('click', async () => {
    await sair()
    location.reload()
  })
  app.querySelector('#form-negocio').addEventListener('submit', async (e) => {
    e.preventDefault()
    const nome = app.querySelector('#n-nome').value.trim()
    if (nome.length < 2) return mostrarCriarNegocio({ erro: 'Dê um nome ao seu negócio.' })
    e.target.querySelector('button').disabled = true
    const { error } = await criarMeuEstudio(nome)
    if (error) return mostrarCriarNegocio({ erro: 'Não deu pra criar: ' + (error.message || '') })
    location.reload()
  })
}

function mostrarAcesso(qual, dados = {}) {
  app.innerHTML =
    qual === 'cadastro'
      ? telaCadastro(dados)
      : qual === 'esqueci'
        ? telaEsqueciSenha(dados)
        : telaEntrar(dados)

  app.querySelectorAll('[data-ir-acesso]').forEach((b) =>
    b.addEventListener('click', () => mostrarAcesso(b.dataset.irAcesso)),
  )

  const fEntrar = app.querySelector('#form-entrar')
  fEntrar?.addEventListener('submit', async (e) => {
    e.preventDefault()
    fEntrar.querySelector('button').disabled = true
    const { error } = await entrar({
      email: app.querySelector('#e-email').value.trim(),
      senha: app.querySelector('#e-senha').value,
    })
    if (error) return mostrarAcesso('entrar', { erro: traduzErroAuth(error) })
    location.reload()
  })

  const fEsqueci = app.querySelector('#form-esqueci')
  fEsqueci?.addEventListener('submit', async (e) => {
    e.preventDefault()
    fEsqueci.querySelector('button').disabled = true
    const { error } = await pedirRecuperacaoSenha(app.querySelector('#es-email').value.trim())
    if (error) return mostrarAcesso('esqueci', { erro: traduzErroAuth(error) })
    mostrarAcesso('esqueci', { enviado: true })
  })

  const fCad = app.querySelector('#form-cadastro')
  if (fCad) ligarCadastro(fCad)
}

// Passo 2 da recuperação: definir a senha nova (a sessão de recuperação já
// foi montada sozinha pelo supabase-js a partir do link do e-mail).
function mostrarNovaSenha(dados = {}) {
  app.innerHTML = telaNovaSenha(dados)

  app.querySelector('#form-nova-senha').addEventListener('submit', async (e) => {
    e.preventDefault()
    const senha = app.querySelector('#np-senha').value
    if (senha.length < 6) {
      return mostrarNovaSenha({ erro: 'A senha precisa de pelo menos 6 caracteres.' })
    }
    e.target.querySelector('button').disabled = true
    const { error } = await definirNovaSenha(senha)
    if (error) return mostrarNovaSenha({ erro: traduzErroAuth(error) })
    // limpa o link da URL e entra normal, já com a senha nova
    history.replaceState(null, '', location.pathname + location.search)
    location.reload()
  })
}

function ligarCadastro(fCad) {
  fCad.addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = fCad.querySelector('button[type="submit"]')
    const nomeNegocio = fCad.querySelector('#c-negocio').value.trim()
    if (nomeNegocio.length < 2) {
      return mostrarAcesso('cadastro', { erro: 'Dê um nome ao seu negócio.' })
    }
    btn.disabled = true

    const { session, error } = await cadastrar({
      email: app.querySelector('#c-email').value.trim(),
      senha: app.querySelector('#c-senha').value,
      nome: app.querySelector('#c-nome').value.trim(),
      telefone: app.querySelector('#c-tel').value.trim(),
      tipo: 'dono',
    })
    if (error) return mostrarAcesso('cadastro', { erro: traduzErroAuth(error) })
    if (!session) {
      return mostrarAcesso('entrar', {
        erro: 'Conta criada! Confirme pelo e-mail e entre. (Nos testes, desligue "Confirm email" no Supabase.)',
      })
    }

    const { error: errNeg } = await criarMeuEstudio(nomeNegocio)
    // se falhar aqui, a conta já existe: ao recarregar, o portão pede o nome de novo
    if (errNeg) console.error('Não deu pra criar o negócio:', errNeg)
    location.reload()
  })
}
