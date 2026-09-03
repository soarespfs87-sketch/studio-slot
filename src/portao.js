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
  traduzErroAuth,
} from './auth.js'
import { telaEntrar, telaCadastro, telaAguardando } from './telas/acesso.js'
import { iniciar } from './app.js'

const app = document.querySelector('#app')

export async function montarPortao() {
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
  app.innerHTML = qual === 'cadastro' ? telaCadastro(dados) : telaEntrar(dados)

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

  const fCad = app.querySelector('#form-cadastro')
  if (fCad) ligarCadastro(fCad)
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
