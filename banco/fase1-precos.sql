-- ────────────────────────────────────────────────────────────────
--  Fase 1 — Preços: base do negócio, custos fixos, equipamentos,
--  pacotes e campanhas temáticas.
--  Dinheiro em centavos (integer). Só o dono do negócio lê e escreve.
--  (Aplicado no Supabase como a migração "fase1_precos".)
-- ────────────────────────────────────────────────────────────────

-- Dados gerais do negócio (1 linha por estúdio)
create table public.config_negocio (
  estudio_id uuid primary key references public.estudios (id) on delete cascade,
  regime text check (regime in ('mei', 'simples', 'pf')),
  imposto_pct numeric(5,2) not null default 10 check (imposto_pct between 0 and 50),
  comissao_pct numeric(5,2) not null default 0 check (comissao_pct between 0 and 50),
  taxa_pct numeric(5,2) not null default 5 check (taxa_pct between 0 and 20),
  margem_pct numeric(6,2) not null default 30 check (margem_pct between 0 and 500),
  prolabore_centavos integer not null default 0 check (prolabore_centavos >= 0),
  horas_dia numeric(4,1) not null default 6 check (horas_dia > 0 and horas_dia <= 24),
  dias_semana integer not null default 5 check (dias_semana between 1 and 7),
  saldo_inicial_centavos integer,          -- Fase 3 (financeiro)
  mes_inicio date,                         -- Fase 3 (financeiro)
  updated_at timestamptz not null default now()
);

create table public.custos_fixos (
  id uuid primary key default gen_random_uuid(),
  estudio_id uuid not null references public.estudios (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  valor_mensal_centavos integer not null default 0 check (valor_mensal_centavos >= 0),
  dia_vencimento integer not null default 10 check (dia_vencimento between 1 and 28),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create index custos_fixos_estudio on public.custos_fixos (estudio_id);

create table public.equipamentos (
  id uuid primary key default gen_random_uuid(),
  estudio_id uuid not null references public.estudios (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  valor_compra_centavos integer not null check (valor_compra_centavos >= 0),
  valor_revenda_centavos integer not null default 0 check (valor_revenda_centavos >= 0),
  vida_util_meses integer not null default 60 check (vida_util_meses > 0),
  data_compra date,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  check (valor_revenda_centavos <= valor_compra_centavos)
);
create index equipamentos_estudio on public.equipamentos (estudio_id);

-- Pacotes E campanhas temáticas
create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  estudio_id uuid not null references public.estudios (id) on delete cascade,
  tipo text not null default 'pacote' check (tipo in ('pacote', 'campanha')),
  nome text not null check (length(trim(nome)) > 0),
  entregaveis text not null default '',
  limite_operacional integer not null check (limite_operacional > 0),
  -- [{ "grupo": "equipe|deslocamento|extra|kit|embalagem|outro",
  --    "nome": "Deslocamento", "valor_unit_centavos": 6000, "quantidade": 3 }]
  itens jsonb not null default '[]'::jsonb check (jsonb_typeof(itens) = 'array'),
  margem_pct numeric(6,2) not null check (margem_pct between 0 and 500),
  comissao_pct numeric(5,2) not null check (comissao_pct between 0 and 50),
  imposto_pct numeric(5,2) not null check (imposto_pct between 0 and 50),
  taxa_pct numeric(5,2) not null check (taxa_pct between 0 and 20),
  preco_final_centavos integer check (preco_final_centavos > 0), -- a linha "VENDA"; null = preço a prazo
  -- só campanha:
  inicio date,
  fim date,
  vagas integer check (vagas > 0),
  usos_cenario integer not null default 1 check (usos_cenario > 0),
  -- [{ "nome": "Cenário", "valor_centavos": 120000 }]
  investimento jsonb not null default '[]'::jsonb check (jsonb_typeof(investimento) = 'array'),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  check (comissao_pct + imposto_pct + taxa_pct < 100),
  check (fim is null or inicio is null or fim >= inicio),
  check (tipo = 'pacote' or (inicio is not null and fim is not null and vagas is not null))
);
create index servicos_estudio on public.servicos (estudio_id);

-- RLS: só o dono do negócio (dados financeiros não aparecem nem pro admin)
alter table public.config_negocio enable row level security;
alter table public.custos_fixos enable row level security;
alter table public.equipamentos enable row level security;
alter table public.servicos enable row level security;

create policy "config_negocio: só o dono" on public.config_negocio
  for all to authenticated
  using (private.eh_dono(estudio_id)) with check (private.eh_dono(estudio_id));
create policy "custos_fixos: só o dono" on public.custos_fixos
  for all to authenticated
  using (private.eh_dono(estudio_id)) with check (private.eh_dono(estudio_id));
create policy "equipamentos: só o dono" on public.equipamentos
  for all to authenticated
  using (private.eh_dono(estudio_id)) with check (private.eh_dono(estudio_id));
create policy "servicos: só o dono" on public.servicos
  for all to authenticated
  using (private.eh_dono(estudio_id)) with check (private.eh_dono(estudio_id));

-- Primeiro acesso a Preços: cria os dados gerais com o padrão e as linhas
-- de custo fixo da planilha, zeradas. Não faz nada se já existir.
create or replace function public.iniciar_precos(p_estudio_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.config_negocio (estudio_id) values (p_estudio_id)
  on conflict (estudio_id) do nothing;
  if not found then
    return; -- já tinha sido iniciado
  end if;

  insert into public.custos_fixos (estudio_id, nome)
  select p_estudio_id, n
  from unnest(array[
    'Água', 'Energia', 'Aluguel', 'Telefone', 'Internet', 'Combustível',
    'Capacitação', 'Sistemas (Adobe etc.)', 'Segurança', 'Marketing', 'Folha de pagamento'
  ]) as n;
end;
$$;
revoke execute on function public.iniciar_precos(uuid) from public, anon;
grant execute on function public.iniciar_precos(uuid) to authenticated;
