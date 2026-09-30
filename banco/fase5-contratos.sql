-- ────────────────────────────────────────────────────────────────
--  Fase 5 — Contratos em PDF
--  Modelos com etiquetas ({cliente_nome}, {valor}…), contratos com a
--  cópia fixa do texto final e status rascunho → enviado → assinado.
--  Assinado não muda mais (trava no banco).
--  (Aplicado no Supabase como a migração "fase5_contratos".)
-- ────────────────────────────────────────────────────────────────

alter table public.config_negocio
  add column contratada_nome text,
  add column contratada_documento text,  -- CPF ou CNPJ, só dígitos
  add column contratada_endereco text,
  add column foro_cidade text;

create table public.contrato_modelos (
  id uuid primary key default gen_random_uuid(),
  estudio_id uuid not null references public.estudios (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  texto text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, estudio_id)
);

create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  estudio_id uuid not null,
  cliente_id uuid not null,
  lead_id uuid,
  modelo_id uuid,
  titulo text not null check (length(trim(titulo)) > 0),
  texto text not null,            -- cópia fixa: mudar o modelo não altera contratos já gerados
  status text not null default 'rascunho' check (status in ('rascunho', 'enviado', 'assinado')),
  enviado_em timestamptz,
  assinado_em date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (cliente_id, estudio_id) references public.clientes (id, estudio_id) on delete cascade,
  foreign key (lead_id, estudio_id) references public.leads (id, estudio_id) on delete set null (lead_id),
  foreign key (modelo_id, estudio_id) references public.contrato_modelos (id, estudio_id) on delete set null (modelo_id),
  check (status <> 'assinado' or assinado_em is not null)
);
create index contratos_cliente on public.contratos (cliente_id);

alter table public.contrato_modelos enable row level security;
alter table public.contratos enable row level security;
create policy "contrato_modelos: só o dono" on public.contrato_modelos
  for all to authenticated using (private.eh_dono(estudio_id)) with check (private.eh_dono(estudio_id));
create policy "contratos: só o dono" on public.contratos
  for all to authenticated using (private.eh_dono(estudio_id)) with check (private.eh_dono(estudio_id));

create or replace function private.modelos_antes()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger contrato_modelos_antes before update on public.contrato_modelos
  for each row execute function private.modelos_antes();

-- Contrato assinado: não muda texto, não volta de status e não é apagado sozinho.
-- (Mudanças em cascata — apagar a cliente, o lead ou o modelo — passam: pg_trigger_depth() > 1.)
create or replace function private.contratos_trava()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'assinado' and pg_trigger_depth() = 1 then
      raise exception 'Contrato assinado não pode ser apagado.';
    end if;
    return old;
  end if;
  if old.status = 'assinado' and pg_trigger_depth() = 1 then
    raise exception 'Contrato assinado não pode ser alterado.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
create trigger contratos_trava before update or delete on public.contratos
  for each row execute function private.contratos_trava();
