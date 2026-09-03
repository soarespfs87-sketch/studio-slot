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
  faturamento/sessões/horas/ticket médio do mês, % de reservas com extra e
  barra de ocupação por sala (horas reservadas ÷ horas de funcionamento no mês)
- **Salas** — criar/editar/excluir, ativar/desativar, definir fotos, tipo (fixa/sazonal),
  janela de temporada, buffer, duração do slot e **preço em 3 faixas** (dia útil / fim de semana / feriado)
- **Extras** — criar/editar/excluir, valor e em quais salas aparece
- **Identidade** — nome, **logo no topo** + **ícone do app no celular** (viram o favicon/apple-touch-icon),
  descrição, cores (tema muda na hora), horário, feriados, regras, política, contato

## Status das fases
- [x] Fase 0 — Setup + identidade + preview duplo
- [x] Fase 1 — Core: ver a sala, agenda, travar horário 10 min, aceite do termo
- [x] Fase 2 — Extras + pagamento simulado + confirmação
- [x] Fase 3 — Minha Reserva + cancelar/remarcar
      (remarcar até 48h antes; cancelamento grátis até 72h antes, depois retém 50%)
- [x] Fase 4 — Cenário sazonal + buffer
      (sala sazonal só reserva entre `disponivelDe`/`disponivelAte`; buffer por sala
      bloqueia os horários colados numa reserva — aparecem como "preparo")
- [x] Fase 5 — Painel do dono: salas, preços (3 faixas) e extras + identidade editável
- [x] Fase 6 — Painel do dono: dashboard ("Resumo do estúdio")
      reservas do dia, horas vendidas, faturamento do dia/mês, ticket médio,
      % com extra e ocupação por sala no mês
- [x] Fase Final — Publicar (Supabase + login + recuperação de senha + deploy Netlify + PWA)
      pagamento por Pix confirmado manualmente pelo dono
