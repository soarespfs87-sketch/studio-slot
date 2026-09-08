#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────
#  restaurar-supabase.sh — abre um backup do banco
#
#  Descriptografa um arquivo .sql.enc e devolve um .sql legível.
#  NÃO aplica nada no banco sozinho — só te entrega o arquivo.
#  Pra jogar de volta num projeto Supabase (com MUITO cuidado):
#      psql "SUA_CONEXAO" -f backups/supabase/restore.sql
#
#  Uso:
#    ./restaurar-supabase.sh                         (usa o latest.sql.enc)
#    ./restaurar-supabase.sh studioslot-2026-09-08-1530.sql.enc
# ────────────────────────────────────────────────────────────────
set -uo pipefail
cd "$(dirname "$0")" || exit 1

OUTDIR="backups/supabase"
SERV_PASS="studioslot-backup-passphrase"
ENTRADA="${1:-latest.sql.enc}"
[ -f "$ENTRADA" ] || ENTRADA="$OUTDIR/$ENTRADA"

if [ ! -f "$ENTRADA" ]; then
  echo "✗ Não achei o arquivo: $ENTRADA"
  echo "  Disponíveis:"
  ls -1t "$OUTDIR"/*.sql.enc 2>/dev/null | sed 's/^/    /'
  exit 1
fi

PASS=$(security find-generic-password -a "$USER" -s "$SERV_PASS" -w 2>/dev/null || true)
if [ -z "$PASS" ]; then
  printf "Senha do backup (a que você guardou no gerenciador de senhas): "
  read -rs PASS; echo
fi

SAIDA="$OUTDIR/restore.sql"
if openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 \
     -in "$ENTRADA" -out "$SAIDA" -pass "pass:$PASS"; then
  echo "✓ Backup aberto em: $SAIDA"
  echo "  ($(wc -l < "$SAIDA" | tr -d ' ') linhas de SQL)"
  echo
  echo "  Esse arquivo tem dados pessoais em texto puro."
  echo "  Apague quando terminar:  rm $SAIDA"
else
  echo "✗ Não consegui abrir. Senha errada ou arquivo corrompido."
  rm -f "$SAIDA"
  exit 1
fi
