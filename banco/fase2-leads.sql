-- ────────────────────────────────────────────────────────────────
--  Fase 2 — Leads (CRM): leads + histórico (lead_eventos).
--  O histórico de criação e de mudança de etapa é gravado por trigger,
--  então nunca fica faltando. Só o dono do negócio lê e escreve.
--  (Aplicado no Supabase como a migração "fase2_leads".)
-- ────────────────────────────────────────────────────────────────

-- permite FKs compostas (garante que lead/serviço são do MESMO negócio)
alter table public.servicos add constraint servicos_id_estudio unique (id, estudio_id);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  estudio_id uuid not null references public.estudios (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  whatsapp text not null check (whatsapp ~ '^55[0-9]{10,11}$'), -- só dígitos, com DDI 55
  instagram text,
  email text,
  origem text not null default 'instagram'
    check (origem in ('instagram', 'indicacao', 'site', 'whatsapp', 'outro')),
  servico_id uuid,
  etapa text not null default 'novo'
    check (etapa in ('novo', 'contato', 'proposta', 'negociacao', 'fechado', 'perdido')),
  data_prevista date,
  valor_estimado_centavos integer check (valor_estimado_centavos >= 0),
  valor_fechado_centavos integer check (valor_fechado_centavos > 0),
  data_sessao date,
  motivo_perda text,
  proximo_followup date,
  observacoes text not null default '',
  fechado_em date, -- data em que virou fechado OU perdido (métrica de conversão)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, estudio_id),
  foreign key (servico_id, estudio_id) references public.servicos (id, estudio_id)
    on delete set null (servico_id),
  check (etapa <> 'fechado' or (valor_fechado_centavos is not null and data_sessao is not null)),
  check (etapa <> 'perdido' or motivo_perda is not null)
);
create index leads_estudio_etapa on public.leads (estudio_id, etapa);
create index leads_followup on public.leads (estudio_id, proximo_followup);

create table public.lead_eventos (
  id uuid primary key default gen_random_uuid(),
  estudio_id uuid not null,
  lead_id uuid not null,
  tipo text not null check (tipo in ('criado', 'etapa', 'nota', 'followup')),
  texto text not null default '',
  dados jsonb not null default '{}'::jsonb, -- ex.: { "de": "novo", "para": "contato", "valor_centavos": 255000 }
  created_at timestamptz not null default now(),
  foreign key (lead_id, estudio_id) references public.leads (id, estudio_id) on delete cascade
);
create index lead_eventos_lead on public.lead_eventos (lead_id, created_at);

alter table public.leads enable row level security;
alter table public.lead_eventos enable row level security;

create policy "leads: só o dono" on public.leads
  for all to authenticated
  using (private.eh_dono(estudio_id)) with check (private.eh_dono(estudio_id));
create policy "lead_eventos: só o dono" on public.lead_eventos
  for all to authenticated
  using (private.eh_dono(estudio_id)) with check (private.eh_dono(estudio_id));

-- Antes de gravar: updated_at, fechado_em e limpeza ao reabrir.
create or replace function private.leads_antes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  if new.etapa in ('fechado', 'perdido')
     and (tg_op = 'INSERT' or old.etapa is distinct from new.etapa) then
    new.fechado_em := (now() at time zone 'America/Sao_Paulo')::date;
  elsif new.etapa not in ('fechado', 'perdido') then
    new.fechado_em := null;
    new.motivo_perda := null;
  end if;
  return new;
end;
$$;

-- Depois de gravar: registra no histórico.
create or replace function private.leads_historico()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.lead_eventos (estudio_id, lead_id, tipo, dados)
    values (new.estudio_id, new.id, 'criado', jsonb_build_object('origem', new.origem));
  elsif old.etapa is distinct from new.etapa then
    insert into public.lead_eventos (estudio_id, lead_id, tipo, dados)
    values (
      new.estudio_id, new.id, 'etapa',
      jsonb_strip_nulls(jsonb_build_object(
        'de', old.etapa,
        'para', new.etapa,
        'valor_centavos', case when new.etapa = 'fechado' then new.valor_fechado_centavos end,
        'motivo', case when new.etapa = 'perdido' then new.motivo_perda end
      ))
    );
  end if;
  return null;
end;
$$;

create trigger leads_antes before insert or update on public.leads
  for each row execute function private.leads_antes();
create trigger leads_historico after insert or update on public.leads
  for each row execute function private.leads_historico();
