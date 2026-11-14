-- ────────────────────────────────────────────────────────────────
--  Galerias G1 + G2 — entrega e seleção de fotos
--  galerias, galeria_itens (fotos), galeria_favoritas (seleção da cliente)
--  + bucket privado 'galerias' no Storage.
--
--  Quem lê/escreve:
--    • o fotógrafo: só as galerias do próprio negócio (RLS eh_dono)
--    • a cliente: NUNCA direto no banco. Tudo passa pela Edge Function
--      `galeria`, que confere código + senha + expiração e usa a
--      chave de servidor.
--  (Aplicado no Supabase como a migração "galerias_g1g2".)
-- ────────────────────────────────────────────────────────────────

-- Espaço por fotógrafo (o admin pode mudar por negócio)
alter table public.estudios
  add column galeria_limite_gb integer not null default 20 check (galeria_limite_gb >= 0);

-- só a plataforma muda o espaço (o fotógrafo edita a própria linha de estudios)
create or replace function private.protege_limite_galeria()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.galeria_limite_gb is distinct from old.galeria_limite_gb
     and not private.eh_admin()
     and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    raise exception 'Só a plataforma pode mudar o espaço de galerias.';
  end if;
  return new;
end;
$$;
create trigger trg_protege_limite_galeria before update on public.estudios
  for each row execute function private.protege_limite_galeria();

create table public.galerias (
  id uuid primary key default gen_random_uuid(),
  estudio_id uuid not null references public.estudios (id) on delete cascade,
  cliente_id uuid,
  lead_id uuid,
  nome text not null check (length(trim(nome)) > 0),
  -- código do link: 16 caracteres aleatórios (studioslot.app.br/g/<codigo>)
  codigo text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16),
  tipo text not null check (tipo in ('selecao', 'entrega')),
  status text not null default 'rascunho'
    check (status in ('rascunho', 'publicada', 'selecao_enviada', 'concluida')),
  senha text check (senha is null or length(senha) between 4 and 40),
  expira_em date,
  incluidas integer check (incluidas is null or incluidas > 0),
  preco_extra_centavos integer not null default 0 check (preco_extra_centavos >= 0),
  download_liberado boolean not null default true,
  marca_dagua boolean not null default true,
  mensagem text not null default '',
  capa_item_id uuid,
  n_itens integer not null default 0,
  bytes bigint not null default 0,
  publicada_em timestamptz,
  selecao_enviada_em timestamptz,
  extras_lancamento_id uuid references public.lancamentos (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, estudio_id),
  foreign key (cliente_id, estudio_id) references public.clientes (id, estudio_id) on delete set null (cliente_id),
  foreign key (lead_id, estudio_id) references public.leads (id, estudio_id) on delete set null (lead_id)
);
create index galerias_estudio on public.galerias (estudio_id, created_at desc);
create index galerias_cliente on public.galerias (cliente_id);
create index galerias_lead on public.galerias (lead_id);
create index galerias_extras on public.galerias (extras_lancamento_id);

create table public.galeria_itens (
  id uuid primary key default gen_random_uuid(),
  galeria_id uuid not null,
  estudio_id uuid not null,
  tipo text not null default 'foto' check (tipo in ('foto', 'video')),
  nome_arquivo text not null,
  caminho_mini text not null,
  caminho_web text not null,
  caminho_original text,
  largura integer,
  altura integer,
  bytes bigint not null default 0 check (bytes >= 0),
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  foreign key (galeria_id, estudio_id) references public.galerias (id, estudio_id) on delete cascade
);
create index galeria_itens_galeria on public.galeria_itens (galeria_id, ordem);

alter table public.galerias
  add constraint galerias_capa foreign key (capa_item_id) references public.galeria_itens (id) on delete set null;
create index galerias_capa_idx on public.galerias (capa_item_id);

create table public.galeria_favoritas (
  item_id uuid primary key references public.galeria_itens (id) on delete cascade,
  galeria_id uuid not null references public.galerias (id) on delete cascade,
  estudio_id uuid not null references public.estudios (id) on delete cascade,
  comentario text not null default '' check (length(comentario) <= 500),
  created_at timestamptz not null default now()
);
create index galeria_favoritas_galeria on public.galeria_favoritas (galeria_id);
create index galeria_favoritas_estudio on public.galeria_favoritas (estudio_id);

alter table public.galerias enable row level security;
alter table public.galeria_itens enable row level security;
alter table public.galeria_favoritas enable row level security;
create policy "galerias: só o dono" on public.galerias
  for all to authenticated using (private.eh_dono(estudio_id)) with check (private.eh_dono(estudio_id));
create policy "galeria_itens: só o dono" on public.galeria_itens
  for all to authenticated using (private.eh_dono(estudio_id)) with check (private.eh_dono(estudio_id));
-- favoritas: o fotógrafo lê e pode limpar; quem marca é a cliente (pela função `galeria`)
create policy "galeria_favoritas: dono lê" on public.galeria_favoritas
  for select to authenticated using (private.eh_dono(estudio_id));
create policy "galeria_favoritas: dono apaga" on public.galeria_favoritas
  for delete to authenticated using (private.eh_dono(estudio_id));

-- updated_at
create or replace function private.galerias_antes()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  if new.status = 'publicada' and new.publicada_em is null then new.publicada_em := now(); end if;
  return new;
end;
$$;
create trigger galerias_antes before update on public.galerias
  for each row execute function private.galerias_antes();

-- Contador de fotos e espaço da galeria + trava do limite do negócio.
create or replace function private.galeria_itens_conta()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_limite bigint;
  v_usado bigint;
begin
  if tg_op = 'INSERT' then
    select galeria_limite_gb::bigint * 1024 * 1024 * 1024 into v_limite
      from public.estudios where id = new.estudio_id;
    select coalesce(sum(bytes), 0) into v_usado from public.galerias where estudio_id = new.estudio_id;
    if v_usado + new.bytes > v_limite then
      raise exception 'Seu espaço de galerias acabou (limite de % GB).', v_limite / 1024 / 1024 / 1024
        using errcode = 'P0001', hint = 'limite_galerias';
    end if;
    update public.galerias set n_itens = n_itens + 1, bytes = bytes + new.bytes where id = new.galeria_id;
    return new;
  end if;
  update public.galerias set n_itens = greatest(0, n_itens - 1), bytes = greatest(0, bytes - old.bytes)
   where id = old.galeria_id;
  return old;
end;
$$;
revoke execute on function private.galeria_itens_conta() from public, anon, authenticated;
create trigger galeria_itens_conta after insert or delete on public.galeria_itens
  for each row execute function private.galeria_itens_conta();

-- Favorita sempre de uma foto da mesma galeria e do mesmo negócio da galeria (evita misturar).
create or replace function private.galeria_filho_confere()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.galerias g where g.id = new.galeria_id and g.estudio_id = new.estudio_id) then
    raise exception 'Galeria não encontrada.';
  end if;
  if not exists (select 1 from public.galeria_itens i where i.id = new.item_id and i.galeria_id = new.galeria_id) then
    raise exception 'Foto não é desta galeria.';
  end if;
  return new;
end;
$$;
create trigger galeria_favoritas_confere before insert or update on public.galeria_favoritas
  for each row execute function private.galeria_filho_confere();

-- Reabrir seleção: volta pra "publicada" e tira o lançamento de extras
-- se ele ainda estiver só PREVISTO (o que já foi recebido fica).
create or replace function public.reabrir_selecao(p_galeria_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
declare
  g public.galerias;
begin
  select * into g from public.galerias where id = p_galeria_id for update;
  if not found then raise exception 'Galeria não encontrada.'; end if;
  if g.extras_lancamento_id is not null then
    delete from public.lancamentos where id = g.extras_lancamento_id and status = 'previsto';
  end if;
  update public.galerias
     set status = 'publicada', selecao_enviada_em = null,
         extras_lancamento_id = case when exists (select 1 from public.lancamentos where id = g.extras_lancamento_id)
                                     then g.extras_lancamento_id end
   where id = p_galeria_id;
end;
$$;
revoke execute on function public.reabrir_selecao(uuid) from public, anon;
grant execute on function public.reabrir_selecao(uuid) to authenticated;

-- Envio da seleção (chamado SÓ pela função `galeria`, com a chave de servidor):
-- trava a galeria, e se tiver extras com preço cria a entrada prevista no Financeiro.
create or replace function public.enviar_selecao_galeria(p_galeria_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g public.galerias;
  v_n integer;
  v_extras integer;
  v_valor integer;
  v_lanc uuid;
  v_cliente text;
begin
  select * into g from public.galerias where id = p_galeria_id for update;
  if not found then raise exception 'Galeria não encontrada.'; end if;
  if g.tipo <> 'selecao' or g.status <> 'publicada' then raise exception 'Esta seleção já foi enviada.'; end if;
  select count(*) into v_n from public.galeria_favoritas where galeria_id = g.id;
  if v_n = 0 then raise exception 'Escolha pelo menos uma foto.'; end if;
  v_extras := case when g.incluidas is null then 0 else greatest(0, v_n - g.incluidas) end;
  v_valor := v_extras * g.preco_extra_centavos;
  if v_valor > 0 then
    select nome into v_cliente from public.clientes where id = g.cliente_id;
    insert into public.lancamentos
      (estudio_id, grupo, categoria, descricao, valor_centavos, status, vencimento, lead_id, servico_id)
    values
      (g.estudio_id, 'receita_op', 'Fotos extras',
       coalesce(v_cliente || ' · ', '') || v_extras
         || case when v_extras = 1 then ' foto extra · ' else ' fotos extras · ' end || g.nome,
       v_valor, 'previsto', current_date + 7, g.lead_id,
       (select servico_id from public.leads where id = g.lead_id))
    returning id into v_lanc;
  end if;
  update public.galerias
     set status = 'selecao_enviada', selecao_enviada_em = now(), extras_lancamento_id = v_lanc
   where id = g.id;
  return jsonb_build_object('escolhidas', v_n, 'extras', v_extras, 'valor_centavos', v_valor);
end;
$$;
revoke execute on function public.enviar_selecao_galeria(uuid) from public, anon, authenticated;
grant execute on function public.enviar_selecao_galeria(uuid) to service_role;

-- ── Storage: bucket privado. O fotógrafo mexe só na pasta do negócio dele.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('galerias', 'galerias', false, 52428800,
        array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'])
on conflict (id) do nothing;

-- primeira pasta do caminho -> uuid (ou null se não for uuid)
create or replace function private.pasta_estudio(p_nome text)
returns uuid language sql immutable set search_path = public as $$
  select case when split_part(p_nome, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then split_part(p_nome, '/', 1)::uuid end
$$;

create policy "galerias: dono lê os arquivos" on storage.objects
  for select to authenticated
  using (bucket_id = 'galerias' and private.eh_dono(private.pasta_estudio(name)));
create policy "galerias: dono envia" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'galerias' and private.eh_dono(private.pasta_estudio(name)));
create policy "galerias: dono apaga" on storage.objects
  for delete to authenticated
  using (bucket_id = 'galerias' and private.eh_dono(private.pasta_estudio(name)));
