// ────────────────────────────────────────────────────────────────
//  Login, cadastro e sessão (Supabase Auth)
//  Estúdios e fotógrafos usam o MESMO login. O que muda é o "tipo"
//  guardado no cadastro (usado nas próximas etapas).
// ────────────────────────────────────────────────────────────────

import { supabase } from './supabase.js'

export async function cadastrar({ email, senha, nome, telefone = '', tipo = 'fotografo' }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { data: { nome, telefone, tipo } },
  })
  return { user: data?.user ?? null, session: data?.session ?? null, error }
}

export async function entrar({ email, senha }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha })
  return { user: data?.user ?? null, error }
}

export async function sair() {
  await supabase.auth.signOut()
}

// Manda um e-mail com um link pra criar uma senha nova.
export async function pedirRecuperacaoSenha(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + '/',
  })
  return { error }
}

// Define a senha nova (chamada depois que a pessoa clica no link do e-mail).
export async function definirNovaSenha(senha) {
  const { error } = await supabase.auth.updateUser({ password: senha })
  return { error }
}

export async function sessaoAtual() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

// A pessoa logada é admin da plataforma? (a tabela só deixa você ver a si mesma)
export async function souAdmin() {
  const s = await sessaoAtual()
  if (!s) return false
  const { data } = await supabase
    .from('admins_plataforma')
    .select('user_id')
    .eq('user_id', s.user.id)
    .maybeSingle()
  return !!data
}

// O estúdio da pessoa logada (se ela for dona de um), mesmo pendente.
export async function meuEstudio() {
  const s = await sessaoAtual()
  if (!s) return null
  const { data } = await supabase
    .from('estudios')
    .select('*')
    .eq('dono_id', s.user.id)
    .maybeSingle()
  return data
}

// vira "Estúdio Lúmen" -> "estudio-lumen"
export function paraSlug(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Cria o estúdio da pessoa logada (nasce pendente). Acha um endereço livre.
export async function criarMeuEstudio(nome) {
  const s = await sessaoAtual()
  if (!s) return { estudio: null, error: { message: 'Precisa estar logado.' } }

  const base = paraSlug(nome) || 'estudio'
  for (let n = 1; n <= 20; n++) {
    const slug = n === 1 ? base : `${base}-${n}`
    const { data, error } = await supabase
      .from('estudios')
      .insert({ slug, nome: nome.trim(), dono_id: s.user.id })
      .select()
      .single()
    if (!error) return { estudio: data, error: null }
    if (error.code !== '23505') return { estudio: null, error } // 23505 = endereço repetido
  }
  return { estudio: null, error: { message: 'Não consegui gerar um endereço livre.' } }
}

// Erros do Supabase traduzidos pra português simples.
export function traduzErroAuth(error) {
  if (!error) return ''
  const m = (error.message || '').toLowerCase()
  if (m.includes('invalid login credentials')) return 'E-mail ou senha errados.'
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Esse e-mail já tem conta. Tente entrar.'
  if (m.includes('password should be at least'))
    return 'A senha precisa de pelo menos 6 caracteres.'
  if (m.includes('invalid email') || m.includes('unable to validate email'))
    return 'E-mail inválido.'
  if (m.includes('email not confirmed'))
    return 'E-mail ainda não confirmado. (Nos testes, desligue "Confirm email" no Supabase.)'
  if (m.includes('security purposes') || m.includes('after '))
    return 'Espera um minutinho antes de pedir de novo.'
  if (m.includes('session missing') || m.includes('session_not_found'))
    return 'Esse link de recuperação expirou ou já foi usado. Peça um novo link.'
  return error.message || 'Não deu certo. Tente de novo.'
}
