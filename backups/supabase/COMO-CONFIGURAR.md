# Backup do banco de dados (Supabase) — configurar uma vez só

O `backup-supabase.sh` baixa o banco inteiro, **criptografa** e guarda aqui
nesta pasta. Só o arquivo `.sql.enc` (embaralhado) vai pro GitHub — o `.sql`
legível nunca sai do seu computador.

Pra funcionar, ele precisa de **2 segredos** guardados no Chaveiro do macOS
(Keychain). Você configura isso uma vez e nunca mais mexe.

---

## Passo 1 — Pegar a conexão do banco no Supabase

1. Abra <https://supabase.com/dashboard/project/fyehxweazcecxjnhkbnc/settings/database>
2. Na seção **Connection string**, escolha a aba **URI**.
3. No seletor de modo, use **Session pooler** (porta `5432`).
   → é o que funciona com o `pg_dump` na maioria das internets de casa.
   O texto se parece com:
   ```
   postgresql://postgres.fyehxweazcecxjnhkbnc:[YOUR-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
   ```
4. Troque `[YOUR-PASSWORD]` pela senha do banco. Se não lembra, clique em
   **Reset database password** na mesma página e gere uma nova.

## Passo 2 — Escolher a senha do backup

Invente uma senha forte (ex.: 4 palavras aleatórias + números).
**Guarde essa senha no seu gerenciador de senhas AGORA.**
Sem ela, os arquivos `.sql.enc` viram lixo — não há recuperação.

## Passo 3 — Guardar os dois segredos no Chaveiro

No Terminal, dentro da pasta do projeto, rode os dois comandos
(troque o que está entre aspas):

```sh
security add-generic-password -U -a "$USER" -s "studioslot-supabase-dburl" \
  -w 'postgresql://postgres.fyehxweazcecxjnhkbnc:SUA_SENHA_DO_BANCO@aws-0-sa-east-1.pooler.supabase.com:5432/postgres'

security add-generic-password -U -a "$USER" -s "studioslot-backup-passphrase" \
  -w 'SUA_SENHA_DO_BACKUP_DO_PASSO_2'
```

## Passo 4 — Testar

```sh
./backup-supabase.sh
```

Deve aparecer `✓ Backup do banco criptografado: ...`.
A partir daí, todo `./salvar.sh` já faz o backup do banco junto.

---

## Como recuperar um backup

```sh
./restaurar-supabase.sh                # abre o mais recente
./restaurar-supabase.sh studioslot-2026-09-08-1530.sql.enc
```

Gera um `backups/supabase/restore.sql` legível. Pra jogar de volta num
projeto Supabase vazio:

```sh
psql "SUA_CONEXAO_DO_BANCO" -f backups/supabase/restore.sql
rm backups/supabase/restore.sql        # apague depois — tem dados pessoais
```

## O que este backup cobre

- ✅ Todas as tabelas do app (`reservas`, `salas`, `extras`, `perfis`,
  `estudios`, `bloqueios`, `admins_plataforma`…) — estrutura + dados
- ✅ Lista de logins (`auth.users` / `auth.identities`), pra os perfis
  voltarem ligados às contas certas
- ⚠️ **Não** cobre: arquivos no Storage (fotos que o dono subir pelo
  Painel), políticas internas do Supabase, Edge Functions. Pra proteção
  total disso, o caminho é o plano **Pro** do Supabase (backup diário
  gerenciado + PITR).
