// ────────────────────────────────────────────────────────────────
//  Conexão com o Supabase — o "telefone" do app para o banco de dados
//
//  As duas informações abaixo PODEM ficar no código: a chave é a
//  "publishable" (a chave da porta da frente do prédio). Quem protege
//  cada dado é o RLS, lá no Supabase. NUNCA coloque aqui a chave
//  "service_role" (essa é a chave-mestra e não pode sair do servidor).
// ────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fyehxweazcecxjnhkbnc.supabase.co'
const SUPABASE_KEY = 'sb_publishable_4eH9OhD1ZHLgLAoNt2e9lw_7gJWyii7'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
