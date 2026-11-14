-- ────────────────────────────────────────────────────────────────
--  Portal da cliente: um link só por cliente (studioslot.app.br/c/<codigo>)
--  com uma pasta por ensaio (as galerias ligadas à mesma compra ficam
--  juntas: seleção + entrega). Quem lê é a função `galeria` (ação
--  "portal"), que mostra só galerias publicadas e no prazo.
--  Cada cliente (as que já existiam também) ganha um código aleatório.
--  (Aplicado no Supabase como a migração "galerias_portal_cliente".)
-- ────────────────────────────────────────────────────────────────

alter table public.clientes
  add column portal_codigo text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);

-- Textos do portal que o fotógrafo escreve ({nome} = primeiro nome da cliente)
-- (Aplicado como a migração "galerias_portal_textos".)
alter table public.estudios
  add column portal_titulo text not null default 'Olá, {nome}' check (length(portal_titulo) <= 120),
  add column portal_mensagem text not null default 'Aqui ficam guardadas todas as suas memórias com a gente. Cada ensaio tem a sua pasta.' check (length(portal_mensagem) <= 1000);
