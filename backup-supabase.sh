#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────
#  backup-supabase.sh — cópia de segurança do banco de dados
#
#  Baixa TODO o banco do Supabase (estrutura + dados + logins),
#  criptografa com AES-256 e guarda em backups/supabase/.
#  Só o arquivo .enc (embaralhado) entra no Git — nunca o .sql cru.
#
#  Configuração (uma vez só): veja backups/supabase/COMO-CONFIGURAR.md
#
#  Uso:
#    ./backup-supabase.sh        (roda sozinho dentro do ./salvar.sh)
# ────────────────────────────────────────────────────────────────
set -uo pipefail
cd "$(dirname "$0")" || exit 1

PGDUMP="/opt/homebrew/opt/libpq/bin/pg_dump"
OUTDIR="backups/supabase"
SERV_DBURL="studioslot-supabase-dburl"       # nome no Keychain
SERV_PASS="studioslot-backup-passphrase"     # nome no Keychain
MANTER=30                                    # quantos backups guardar

# 1. Pega os segredos do Chaveiro (Keychain) do macOS — nada em arquivo.
DBURL=$(security find-generic-password -a "$USER" -s "$SERV_DBURL" -w 2>/dev/null || true)
PASS=$(security find-generic-password -a "$USER" -s "$SERV_PASS" -w 2>/dev/null || true)

if [ -z "$DBURL" ] || [ -z "$PASS" ]; then
  echo "⚠ Backup do banco ainda não configurado."
  echo "  Siga o passo a passo:  backups/supabase/COMO-CONFIGURAR.md"
  exit 1
fi

if [ ! -x "$PGDUMP" ]; then
  echo "✗ pg_dump não encontrado em $PGDUMP"
  echo "  Instale com:  brew install libpq"
  exit 1
fi

mkdir -p "$OUTDIR"
STAMP=$(date '+%Y-%m-%d-%H%M')
TMP=$(mktemp -t studioslot-db)
trap 'rm -f "$TMP" "$TMP.auth"' EXIT

# 2. Estrutura + dados do schema "public" (é onde vive tudo do app).
echo "Baixando o banco do Supabase…"
if ! "$PGDUMP" "$DBURL" --no-owner --no-privileges --schema=public --file "$TMP"; then
  echo "✗ Falha ao baixar o banco. Confira a conexão em COMO-CONFIGURAR.md"
  exit 1
fi

# 3. Lista de logins (auth.users / auth.identities) — só os dados, best-effort.
#    Serve pra, num restore, os perfis voltarem ligados às contas certas.
if "$PGDUMP" "$DBURL" --no-owner --data-only \
     --table='auth.users' --table='auth.identities' --file "$TMP.auth" 2>/dev/null; then
  {
    echo ""
    echo "-- ─── dados de auth.users / auth.identities ───"
    cat "$TMP.auth"
  } >> "$TMP"
else
  echo "  (aviso: não deu pra incluir a lista de logins; o resto do backup seguiu)"
fi

# 4. Criptografa (AES-256, senha do Keychain). Sem a senha, o arquivo é inútil.
OUT="$OUTDIR/studioslot-$STAMP.sql.enc"
openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt \
  -in "$TMP" -out "$OUT" -pass "pass:$PASS"
cp "$OUT" "$OUTDIR/latest.sql.enc"

# 5. Mantém só os últimos $MANTER.
ls -1t "$OUTDIR"/studioslot-*.sql.enc 2>/dev/null | tail -n "+$((MANTER + 1))" \
  | while read -r velho; do rm -f "$velho"; done

TAM=$(du -h "$OUT" | cut -f1)
echo "✓ Backup do banco criptografado: $OUT ($TAM)"
