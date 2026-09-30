-- ────────────────────────────────────────────────────────────────
--  Fase Final — segurança antes de publicar
--  A v2 não tem mais "vitrine" pública de estúdios: cada fotógrafo só
--  vê o próprio negócio (e o admin vê todos). As tabelas da v1 (salas,
--  extras, bloqueios) ficam guardadas, mas deixam de ser públicas.
--  Nada é apagado.
--  (Aplicado no Supabase como a migração "final_seguranca".)
-- ────────────────────────────────────────────────────────────────

-- estudios: sai a leitura pública (tinha dados de cobrança do LastLink)
drop policy "estudios: vitrine (ativos) + o seu + admin" on public.estudios;
create policy "estudios: o seu + admin" on public.estudios
  for select to authenticated
  using (dono_id = auth.uid() or private.eh_admin());

-- tabelas da v1: só o dono e o admin
drop policy "salas: vitrine (estúdio ativo) + dono + admin" on public.salas;
create policy "salas: dono + admin" on public.salas
  for select to authenticated
  using (private.eh_dono(estudio_id) or private.eh_admin());

drop policy "extras: vitrine (estúdio ativo) + dono + admin" on public.extras;
create policy "extras: dono + admin" on public.extras
  for select to authenticated
  using (private.eh_dono(estudio_id) or private.eh_admin());

drop policy "bloqueios: vitrine (estúdio ativo) + dono + admin" on public.bloqueios;
create policy "bloqueios: dono + admin" on public.bloqueios
  for select to authenticated
  using (private.eh_dono(estudio_id) or private.eh_admin());

-- função de horários de sala da v1: ninguém de fora chama mais
revoke execute on function public.horarios_ocupados(uuid, date) from public, anon, authenticated;
