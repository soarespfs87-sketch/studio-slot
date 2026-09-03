# Como rodar o Studio Slot

```
npm install      # só na primeira vez
npm run dev
```

Abra no navegador:
- App: http://localhost:5173/
- Preview celular + computador: http://localhost:5173/preview.html

Para recomeçar os dados do zero: abra o Console do navegador (F12) e rode
`localStorage.clear()` e recarregue.

## Onde está cada coisa
- `estudio.config.js` — identidade INICIAL do estúdio; a partir da Fase 5 o dono edita tudo no Painel (fica na chave `config` do navegador)
- `src/seed.js` — dados de exemplo (salas, extras, fotos)
- `public/fotos/` — fotos de exemplo das salas (ficção; o dono troca no Painel)
- `src/dados.js` — leitura/escrita no navegador (inclui `getConfig`/`setConfig`, `salvarSala`, `salvarExtra`)
- `src/agenda.js` — faixas de preço (útil/fds/feriado), geração dos horários, temporada e buffer
- `src/reserva.js` — regras de remarcar/cancelar (prazos de 48h e 72h, taxa)
- `src/app.js` — controla qual tela aparece
- `src/telas/` — cada tela do app (`minhas.js` = Minha Reserva, `dono.js` = Painel do Dono)

## Painel do dono
Link "Área do dono" no rodapé do início. De lá dá pra:
- **Resumo do estúdio** — sessões e faturamento de hoje, lista das sessões do dia,
  faturamento/sessões/horas/ticket médio, % de reservas com extra e barra de
  ocupação por sala. O bloco do período tem botões **Este mês / Mês passado /
  7 dias**; a ocupação desconta feriados e dias que ainda não chegaram. Botão
  **Atualizar** recarrega os números do banco.
- **Agenda do estúdio** — calendário do mês inteiro: cada dia mostra se está
  livre / parcial / cheio (e quantos horários sobram), navegação entre meses.
  Toque num dia para ver os horários sala por sala — quem reservou, o status
  (aguardando Pix / segurando), preparo (buffer) e bloqueios.
- **Salas** — criar/editar/excluir, ativar/desativar, definir fotos, tipo (fixa/sazonal),
  janela de temporada, buffer, duração do slot e **preço em 3 faixas** (dia útil / fim de semana / feriado)
- **Extras** — criar/editar/excluir, valor e em quais salas aparece
- **Identidade** — nome, **logo no topo** + **ícone do app no celular** (viram o favicon/apple-touch-icon),
  descrição, cores (tema muda na hora), horário, feriados, regras, política, contato,
  **prazos de remarcação/cancelamento e a taxa** (antes ficavam fixos no código)

## Status das fases
- [x] Fase 0 — Setup + identidade + preview duplo
- [x] Fase 1 — Core: ver a sala, agenda, travar horário 10 min, aceite do termo
- [x] Fase 2 — Extras + pagamento simulado + confirmação
- [x] Fase 3 — Minha Reserva + cancelar/remarcar
      (prazos de remarcação/cancelamento e taxa configuráveis pelo dono na Identidade;
      padrão: remarcar até 48h antes, grátis até 72h antes, depois retém 50%)
      Minha Reserva tem "como chegar" (mapa), "falar no WhatsApp" e horário de check-in
- [x] Fase 4 — Cenário sazonal + buffer
      (sala sazonal só reserva entre `disponivelDe`/`disponivelAte`; buffer por sala
      bloqueia os horários colados numa reserva — aparecem como "preparo")
- [x] Fase 5 — Painel do dono: salas, preços (3 faixas) e extras + identidade editável
- [x] Fase 6 — Painel do dono: dashboard ("Resumo do estúdio")
      reservas do dia, horas vendidas, faturamento do dia/período, ticket médio,
      % com extra e ocupação por sala; filtro Este mês / Mês passado / 7 dias
      (ocupação desconta feriados e dias futuros)
      + "Agenda do estúdio": calendário do mês (livre/parcial/cheio) e os
      horários de cada dia sala por sala, com quem reservou e o status
- [x] Fase Final — Publicar (Supabase + login + recuperação de senha + deploy Netlify + PWA)
      pagamento por Pix confirmado manualmente pelo dono
- [x] Política de Privacidade + Termos de Uso (LGPD, PT-BR)
      `src/telas/legal.js` — abre pelo rodapé do início, pela tela de login
      (`#privacidade` / `#termos`) e pelo aceite na hora de reservar.
      ⚠️ Troque o e-mail `privacidade@studioslot.app` (const `CONTATO_PRIVACIDADE`)
      pelo canal real antes do beta. Versão em inglês fica para 2027.

- [x] Status "concluída" — reserva confirmada cuja sessão já acabou aparece como
      "Concluída" (calculado, não gravado no banco). "Minhas reservas" separa
      **Próximas** de **Anteriores**; a Agenda do dono marca "realizada".

## Ainda pra fazer (backlog do MVP)
- Notificações automáticas por e-mail (confirmação + lembrete 24h/2h) — adiado
- Gateway de pagamento real (Pix + cartão) — hoje é Pix manual
- Multi-idioma PT/EN e multi-moeda BRL/USD (lançamento comercial 2027)
