-- ────────────────────────────────────────────────────────────────
--  Fase 3 — Financeiro: lançamentos (grupos da DRE da planilha) +
--  fechar/reabrir lead e lançar custos fixos do mês (tudo ou nada) +
--  tarifa de cartão automática. Só o dono do negócio lê e escreve.
--  (Aplicado no Supabase como a migração "fase3_financeiro".)
-- ────────────────────────────────────────────────────────────────

create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  estudio_id uuid not null references public.estudios (id) on delete cascade,
  grupo text not null check (grupo in (
    'receita_op', 'custo_direto', 'custo_variavel', 'custo_fixo', 'receita_nao_op', 'despesa_nao_op')),
  categoria text not null check (length(trim(categoria)) > 0),
  descricao text not null default '',
  valor_centavos integer not null check (valor_centavos > 0), -- sempre positivo; o sinal vem do grupo
  status text not null default 'pago' check (status in ('previsto', 'pago')),
  vencimento date,
  pago_em date,
  forma_pagamento text check (forma_pagamento in ('pix', 'cartao', 'dinheiro', 'transferencia', 'boleto')),
  parcela text check (parcela in ('integral', 'sinal', 'saldo')),
  lead_id uuid,
  servico_id uuid,
  fixo_chave text,      -- custo fixo que gerou (id do custo, ou 'prolabore')
  competencia date,     -- mês do custo fixo (dia 1)
  origem_id uuid references public.lancamentos (id) on delete cascade, -- tarifa -> entrada
  created_at timestamptz not null default now(),
  check (status <> 'pago' or pago_em is not null),
  check (status <> 'previsto' or vencimento is not null),
  foreign key (lead_id, estudio_id) references public.leads (id, estudio_id) on delete set null (lead_id),
  foreign key (servico_id, estudio_id) references public.servicos (id, estudio_id) on delete set null (servico_id)
);
create index lancamentos_estudio_pago on public.lancamentos (estudio_id, pago_em);
create index lancamentos_estudio_venc on public.lancamentos (estudio_id, vencimento);
create index lancamentos_lead on public.lancamentos (lead_id);
create index lancamentos_origem on public.lancamentos (origem_id);
create unique index lancamentos_fixo_mes on public.lancamentos (estudio_id, fixo_chave, competencia)
  where fixo_chave is not null;

alter table public.lancamentos enable row level security;
create policy "lancamentos: só o dono" on public.lancamentos
  for all to authenticated
  using (private.eh_dono(estudio_id)) with check (private.eh_dono(estudio_id));

-- Tarifa de cartão: entrada operacional paga no cartão gera a tarifa
-- (custo variável) com a taxa do negócio. Desfaz se deixar de ser paga/cartão.
create or replace function private.lancamentos_tarifa()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_taxa numeric;
begin
  if new.grupo = 'receita_op' and new.forma_pagamento = 'cartao' and new.status = 'pago' then
    if exists (select 1 from public.lancamentos where origem_id = new.id) then
      update public.lancamentos set pago_em = new.pago_em
      where origem_id = new.id and pago_em is distinct from new.pago_em;
    else
      select taxa_pct into v_taxa from public.config_negocio where estudio_id = new.estudio_id;
      if coalesce(v_taxa, 0) > 0 then
        insert into public.lancamentos
          (estudio_id, grupo, categoria, descricao, valor_centavos, status, pago_em,
           origem_id, lead_id, servico_id)
        values
          (new.estudio_id, 'custo_variavel', 'Tarifa de cartão',
           'Tarifa: ' || coalesce(nullif(new.descricao, ''), new.categoria),
           greatest(1, round(new.valor_centavos * v_taxa / 100)::integer), 'pago', new.pago_em,
           new.id, new.lead_id, new.servico_id);
      end if;
    end if;
  elsif tg_op = 'UPDATE' then
    delete from public.lancamentos where origem_id = new.id;
  end if;
  return null;
end;
$$;

create trigger lancamentos_tarifa
  after insert or update of status, forma_pagamento, grupo, pago_em on public.lancamentos
  for each row when (new.origem_id is null)
  execute function private.lancamentos_tarifa();

-- Fechar negócio: lead fechado + entradas previstas, tudo de uma vez.
create or replace function public.fechar_lead(
  p_lead_id uuid,
  p_valor_centavos integer,
  p_data_sessao date,
  p_servico_id uuid,
  p_condicao text,            -- 'avista' | 'sinal'
  p_sinal_pct numeric,        -- só pra 'sinal'
  p_sinal_vencimento date,    -- só pra 'sinal'
  p_avista_vencimento date,   -- só pra 'avista'
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
         servico_id = p_servico_id, proximo_followup = null
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

-- Reabrir: volta pra negociação e apaga só as entradas ainda PREVISTAS.
-- Devolve quantas entradas já recebidas continuam no financeiro.
create or replace function public.reabrir_lead(p_lead_id uuid)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_pagas integer;
begin
  delete from public.lancamentos
   where lead_id = p_lead_id and grupo = 'receita_op' and status = 'previsto';
  update public.leads set etapa = 'negociacao' where id = p_lead_id;
  if not found then raise exception 'Lead não encontrado.'; end if;
  select count(*) into v_pagas from public.lancamentos
   where lead_id = p_lead_id and grupo = 'receita_op' and status = 'pago';
  return v_pagas;
end;
$$;

-- Lança os custos fixos do mês (e o pró-labore) como previstos. Não duplica.
create or replace function public.lancar_custos_fixos(p_estudio_id uuid, p_mes date)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_comp date := date_trunc('month', p_mes)::date;
  v_n integer := 0;
  v_m integer := 0;
  v_pl integer;
begin
  insert into public.lancamentos
    (estudio_id, grupo, categoria, valor_centavos, status, vencimento, fixo_chave, competencia)
  select p_estudio_id, 'custo_fixo', c.nome, c.valor_mensal_centavos, 'previsto',
         v_comp + (c.dia_vencimento - 1), c.id::text, v_comp
    from public.custos_fixos c
   where c.estudio_id = p_estudio_id and c.ativo and c.valor_mensal_centavos > 0
  on conflict (estudio_id, fixo_chave, competencia) where fixo_chave is not null do nothing;
  get diagnostics v_n = row_count;

  select prolabore_centavos into v_pl from public.config_negocio where estudio_id = p_estudio_id;
  if coalesce(v_pl, 0) > 0 then
    insert into public.lancamentos
      (estudio_id, grupo, categoria, valor_centavos, status, vencimento, fixo_chave, competencia)
    values
      (p_estudio_id, 'custo_fixo', 'Seu salário (pró-labore)', v_pl, 'previsto', v_comp + 4, 'prolabore', v_comp)
    on conflict (estudio_id, fixo_chave, competencia) where fixo_chave is not null do nothing;
    get diagnostics v_m = row_count;
  end if;
  return v_n + v_m;
end;
$$;

revoke execute on function public.fechar_lead(uuid, integer, date, uuid, text, numeric, date, date, text) from public, anon;
revoke execute on function public.reabrir_lead(uuid) from public, anon;
revoke execute on function public.lancar_custos_fixos(uuid, date) from public, anon;
grant execute on function public.fechar_lead(uuid, integer, date, uuid, text, numeric, date, date, text) to authenticated;
grant execute on function public.reabrir_lead(uuid) to authenticated;
grant execute on function public.lancar_custos_fixos(uuid, date) to authenticated;
