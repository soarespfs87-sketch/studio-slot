// ────────────────────────────────────────────────────────────────
//  Portão de entrada:
//   sem login          -> tela de acesso (entrar / criar conta)
//   dono sem plano ativo -> tela "estúdio em análise"
//   resto              -> o app normal (app.js)
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

  // dono de estúdio ainda pendente?
  const est = await meuEstudio()
  if (est && !est.plano_ativo) return mostrarAguardando(est)

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
  const campoEstudio = fCad.querySelector('.campo-estudio')

  fCad.querySelectorAll('input[name="tipo"]').forEach((r) =>
    r.addEventListener('change', () => {
      fCad.querySelectorAll('.tipo-op').forEach((op) =>
        op.classList.toggle('tipo-op-on', op.querySelector('input').checked),
      )
      campoEstudio.hidden = fCad.querySelector('input[name="tipo"]:checked').value !== 'dono'
    }),
  )

  fCad.addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = fCad.querySelector('button[type="submit"]')
    const tipo = fCad.querySelector('input[name="tipo"]:checked').value
    const nomeEstudio = fCad.querySelector('#c-estudio')?.value.trim() || ''

    if (tipo === 'dono' && nomeEstudio.length < 2) {
      return mostrarAcesso('cadastro', { erro: 'Dê um nome ao seu estúdio.', tipo })
    }
    btn.disabled = true

    const { session, error } = await cadastrar({
      email: app.querySelector('#c-email').value.trim(),
      senha: app.querySelector('#c-senha').value,
      nome: app.querySelector('#c-nome').value.trim(),
      telefone: app.querySelector('#c-tel').value.trim(),
      tipo,
    })
    if (error) return mostrarAcesso('cadastro', { erro: traduzErroAuth(error), tipo })
    if (!session) {
      return mostrarAcesso('entrar', {
        erro: 'Conta criada! Confirme pelo e-mail e entre. (Nos testes, desligue "Confirm email" no Supabase.)',
      })
    }

    if (tipo === 'dono') {
      const { error: errEst } = await criarMeuEstudio(nomeEstudio)
      if (errEst) {
        return mostrarAcesso('cadastro', {
          erro: 'Conta criada, mas não deu pra criar o estúdio: ' + (errEst.message || ''),
          tipo,
        })
      }
    }
    location.reload()
  })
}
