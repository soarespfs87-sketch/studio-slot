-- ────────────────────────────────────────────────────────────────
--  Fase 4 — Clientes + lembretes
--  Cliente nasce ao fechar um lead (ou é achada pelo WhatsApp: recompra).
--  Família (filhos, cônjuge, bebê a caminho) e "lembretes feitos".
--  Os lembretes em si são calculados no app a partir das datas.
--  (Aplicado no Supabase como a migração "fase4_clientes".)
-- ────────────────────────────────────────────────────────────────

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  estudio_id uuid not null references public.estudios (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  whatsapp text not null check (whatsapp ~ '^55[0-9]{10,11}$'),
  email text,
  instagram text,
  data_nascimento date,
  cpf text check (cpf ~ '^[0-9]{11}$'),
  cep text check (cep ~ '^[0-9]{8}$'),
  rua text, numero text, complemento text, bairro text, cidade text,
  uf text check (uf ~ '^[A-Z]{2}$'),
  observacoes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, estudio_id),
  unique (estudio_id, whatsapp)
);

create table public.familiares (
  id uuid primary key default gen_random_uuid(),
  estudio_id uuid not null,
  cliente_id uuid not null,
  nome text not null default '',
  parentesco text not null check (parentesco in ('filho', 'filha', 'conjuge', 'gestacao', 'outro')),
  data_nascimento date,
  data_prevista_parto date,
  created_at timestamptz not null default now(),
  foreign key (cliente_id, estudio_id) references public.clientes (id, estudio_id) on delete cascade,
  check (parentesco <> 'gestacao' or data_prevista_parto is not null),
  check (parentesco = 'gestacao' or length(trim(nome)) > 0)
);
create index familiares_cliente on public.familiares (cliente_id);

create table public.lembretes_feitos (
  id uuid primary key default gen_random_uuid(),
  estudio_id uuid not null,
  cliente_id uuid not null,
  chave text not null, -- ex.: 'aniv:<id>:2026', 'festa:<id>:2026', 'parto:<id>', 'recompra:<id>:2025-10-20'
  feito_em timestamptz not null default now(),
  foreign key (cliente_id, estudio_id) references public.clientes (id, estudio_id) on delete cascade,
  unique (estudio_id, chave)
);

alter table public.leads add column cliente_id uuid;
alter table public.leads add constraint leads_cliente_fk
  foreign key (cliente_id, estudio_id) references public.clientes (id, estudio_id) on delete set null (cliente_id);
create index leads_cliente on public.leads (cliente_id);

alter table public.config_negocio
  add column lembrete_aniv_dias integer not null default 3 check (lembrete_aniv_dias between 0 and 30),
  add column lembrete_festa_dias integer not null default 60 check (lembrete_festa_dias between 0 and 180),
  add column lembrete_parto_dias integer not null default 7 check (lembrete_parto_dias between 0 and 60),
  add column lembrete_recompra_meses integer not null default 11 check (lembrete_recompra_meses between 0 and 36);

alter table public.clientes enable row level security;
alter table public.familiares enable row level security;
alter table public.lembretes_feitos enable row level security;
create policy "clientes: só o dono" on public.clientes
  for all to authenticated using (private.eh_dono(estudio_id)) with check (private.eh_dono(estudio_id));
create policy "familiares: só o dono" on public.familiares
  for all to authenticated using (private.eh_dono(estudio_id)) with check (private.eh_dono(estudio_id));
create policy "lembretes_feitos: só o dono" on public.lembretes_feitos
  for all to authenticated using (private.eh_dono(estudio_id)) with check (private.eh_dono(estudio_id));

create or replace function private.clientes_antes()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger clientes_antes before update on public.clientes
  for each row execute function private.clientes_antes();

-- Acha a cliente pelo WhatsApp (recompra) ou cria a partir do lead.
create or replace function private.cliente_do_lead(l public.leads)
returns uuid language plpgsql set search_path = public as $$
declare
  v_id uuid;
begin
  select id into v_id from public.clientes where estudio_id = l.estudio_id and whatsapp = l.whatsapp;
  if v_id is null then
    insert into public.clientes (estudio_id, nome, whatsapp, email, instagram)
    values (l.estudio_id, l.nome, l.whatsapp, l.email, l.instagram)
    on conflict (estudio_id, whatsapp) do nothing
    returning id into v_id;
    if v_id is null then -- criada por outra aba ao mesmo tempo
      select id into v_id from public.clientes where estudio_id = l.estudio_id and whatsapp = l.whatsapp;
    end if;
  end if;
  return v_id;
end;
$$;

-- fechar_lead: igual à Fase 3 + liga o lead à cliente.
create or replace function public.fechar_lead(
  p_lead_id uuid,
  p_valor_centavos integer,
  p_data_sessao date,
  p_servico_id uuid,
  p_condicao text,
  p_sinal_pct numeric,
  p_sinal_vencimento date,
  p_avista_vencimento date,
  p_forma text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  l public.leads;
  v_sinal integer;
  v_desc text;
  v_serv text;
begin
  select * into l from public.leads where id = p_lead_id for update;
  if not found then raise exception 'Lead não encontrado.'; end if;
  if l.etapa = 'fechado' then raise exception 'Esse lead já está fechado.'; end if;
  if p_valor_centavos is null or p_valor_centavos <= 0 then raise exception 'Valor fechado inválido.'; end if;
  if p_condicao not in ('avista', 'sinal') then raise exception 'Condição de pagamento inválida.'; end if;

  update public.leads
     set etapa = 'fechado', valor_fechado_centavos = p_valor_centavos, data_sessao = p_data_sessao,
         servico_id = p_servico_id, proximo_followup = null,
         cliente_id = coalesce(l.cliente_id, private.cliente_do_lead(l))
   where id = p_lead_id;

  select nome into v_serv from public.servicos where id = p_servico_id;
  v_desc := l.nome || coalesce(' · ' || v_serv, '');

  if p_condicao = 'avista' then
    insert into public.lancamentos
      (estudio_id, grupo, categoria, descricao, valor_centavos, status, vencimento,
       forma_pagamento, parcela, lead_id, servico_id)
    values
      (l.estudio_id, 'receita_op', 'Receita de serviços', v_desc, p_valor_centavos, 'previsto',
       coalesce(p_avista_vencimento, p_data_sessao), p_forma, 'integral', l.id, p_servico_id);
  else
    if p_sinal_pct is null or p_sinal_pct <= 0 or p_sinal_pct >= 100 then
      raise exception 'O sinal precisa ser entre 1%% e 99%%.';
    end if;
    v_sinal := round(p_valor_centavos * p_sinal_pct / 100)::integer;
    insert into public.lancamentos
      (estudio_id, grupo, categoria, descricao, valor_centavos, status, vencimento,
       forma_pagamento, parcela, lead_id, servico_id)
    values
      (l.estudio_id, 'receita_op', 'Receita de serviços', v_desc || ' (sinal)', v_sinal, 'previsto',
       coalesce(p_sinal_vencimento, current_date), p_forma, 'sinal', l.id, p_servico_id),
      (l.estudio_id, 'receita_op', 'Receita de serviços', v_desc || ' (saldo)', p_valor_centavos - v_sinal,
       'previsto', p_data_sessao, p_forma, 'saldo', l.id, p_servico_id);
  end if;
end;
$$;

-- Leads que já estavam fechados viram clientes (mesma regra, sem duplicar por WhatsApp).
insert into public.clientes (estudio_id, nome, whatsapp, email, instagram)
select distinct on (estudio_id, whatsapp) estudio_id, nome, whatsapp, email, instagram
  from public.leads
 where etapa = 'fechado'
 order by estudio_id, whatsapp, fechado_em desc nulls last
on conflict (estudio_id, whatsapp) do nothing;

update public.leads l
   set cliente_id = c.id
  from public.clientes c
 where l.etapa = 'fechado' and l.cliente_id is null
   and c.estudio_id = l.estudio_id and c.whatsapp = l.whatsapp;
