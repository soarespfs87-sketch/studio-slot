-- ────────────────────────────────────────────────────────────────
--  Galerias G4 — design, história, vídeo por link e música
--    galerias.design   escolhas visuais (capa, fonte, cores, grade, layout)
--    galerias.secoes   capítulos da história [{id, titulo, texto}]
--    galerias.videos   vídeos por link [{id, url, titulo, secao}]
--    galerias.musica   {tipo:'arquivo', caminho, titulo} | {tipo:'link', url, titulo}
--    galeria_itens.secao  capítulo de cada foto (id do capítulo, ou null)
--    estudios.galeria_design_padrao  design que as galerias novas já recebem
--  Os links de vídeo/música são validados no app e na página da cliente:
--  só YouTube, Vimeo e Spotify viram player (nunca o link "cru").
--  (Aplicado no Supabase como a migração "galerias_g4_design".)
-- ────────────────────────────────────────────────────────────────

alter table public.galerias
  add column design jsonb not null default '{}'::jsonb check (jsonb_typeof(design) = 'object' and pg_column_size(design) < 4000),
  add column secoes jsonb not null default '[]'::jsonb check (jsonb_typeof(secoes) = 'array' and pg_column_size(secoes) < 60000),
  add column videos jsonb not null default '[]'::jsonb check (jsonb_typeof(videos) = 'array' and pg_column_size(videos) < 20000),
  add column musica jsonb check (musica is null or (jsonb_typeof(musica) = 'object' and pg_column_size(musica) < 2000));

alter table public.galeria_itens
  add column secao text check (secao is null or length(secao) <= 40);

alter table public.estudios
  add column galeria_design_padrao jsonb not null default '{}'::jsonb
    check (jsonb_typeof(galeria_design_padrao) = 'object' and pg_column_size(galeria_design_padrao) < 4000);

-- música em arquivo vai pro mesmo armário privado
update storage.buckets
   set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime',
                                  'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac']
 where id = 'galerias';
