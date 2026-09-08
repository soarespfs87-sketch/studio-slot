#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────
#  salvar.sh — backup do Studio Slot em um comando só
#
#  O que faz: junta tudo o que mudou, registra no histórico do Git
#  e envia pro GitHub (github.com/soarespfs87-sketch/studio-slot).
#
#  Como usar:
#    ./salvar.sh                  → pergunta a descrição
#    ./salvar.sh "o que mudou"    → já com a descrição
#    npm run salvar               → mesma coisa, pelo npm
# ────────────────────────────────────────────────────────────────

cd "$(dirname "$0")" || exit 1

# 1. Tem alguma mudança pra salvar?
if [ -z "$(git status --porcelain)" ]; then
  echo "✓ Nada mudou desde o último backup."
  if git push 2>/dev/null; then
    echo "✓ GitHub está em dia."
  fi
  exit 0
fi

echo "Isto vai entrar no backup:"
git -c color.ui=always status --short
echo

# 2. Descrição do que mudou
msg="$*"
if [ -z "$msg" ]; then
  printf "Descreva em poucas palavras o que mudou: "
  read -r msg
fi
if [ -z "$msg" ]; then
  msg="Backup $(date '+%d/%m/%Y %H:%M')"
fi

# 3. Registra no histórico
git add -A
if ! git commit -m "$msg"; then
  echo "✗ Não consegui registrar. Veja a mensagem acima."
  exit 1
fi

# 4. Envia pro GitHub
echo
if git push; then
  echo
  echo "✓ Backup feito e enviado pro GitHub."
else
  echo
  echo "✗ Salvei no seu computador, mas o envio pro GitHub falhou."
  echo "  Provável causa: falta fazer login uma vez. Rode:  gh auth login"
  echo "  Depois é só rodar  ./salvar.sh  de novo."
  exit 1
fi
