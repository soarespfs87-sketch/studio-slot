# Como rodar o Studio Slot

```
npm install      # só na primeira vez
npm run dev
```

Abra no navegador:
- App: http://localhost:5173/
- Preview celular + computador: http://localhost:5173/preview.html

Testes das contas: `npm test`

## v2 — app de gestão pro fotógrafo (em construção)
Plano em `PLANO.md`, regras em `briefing-v2-mvp-crm-precificacao-financeiro.md`,
prompts de cada fase em `PROMPTS.md`.

- [x] Fase 0 — Reorganizar a casa: menu de 5 itens (Início, Leads, Preços, Financeiro,
      Ajustes), código separado por módulo, Vitest, cadastro só de fotógrafo
- [x] Fase 1 — Preços: base do negócio, pacotes, campanhas temáticas, calculadora rápida
- [x] Fase 2 — Leads: funil, ficha, follow-up, WhatsApp, fechar/perder/reabrir, histórico
- [ ] Fase 3 — Financeiro · [ ] Fase 4 — Clientes + lembretes · [ ] Fase 5 — Contratos · [ ] Fase 6 — Início · [ ] Final — Publicar

## Onde está cada coisa (v2)
- `src/portao.js` — decide o que mostrar: login → "nome do seu negócio" → "falta liberar a assinatura" → app
- `src/app.js` — o menu e a troca de telas (endereço `#/leads`, `#/precos`…)
- `src/modulos/<parte>/index.js` — cada parte do app (`inicio`, `leads`, `precos`, `financeiro`, `ajustes`, `plataforma`)
- `src/negocio.js` — nome, marca e cores do negócio (tabela `estudios`)
- `src/modulos/leads/` — `funil.js`, `ficha.js`, `formulario.js`, `regras.js` (com testes), `dados.js` (banco)
- `src/modulos/precos/` — `base.js`, `servicos.js` (pacotes e campanhas), `calculadora.js`, `dados.js` (banco)
- `banco/` — o SQL de cada fase, como registro do que foi criado no Supabase
- `src/calculos.js` — todas as contas (com testes em `calculos.test.js`); dinheiro em centavos
- `src/componentes/` — campos de formulário, ícones, estado "em breve"
- `src/styles.css` — cores do semáforo (`--sinal-*`) são fixas, não seguem o tema
- `src/legado/` — o app de reserva de sala da v1, guardado pra quando a agenda voltar (fora do app)
- Painel da plataforma (admin): Ajustes → "Painel da plataforma"

---

# Histórico da v1 (reserva de sala — guardada em src/legado/)

## Status das fases (v1)
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

- [x] Monetização do SaaS — controle **manual** pelo LastLink. No Painel da
      plataforma cada estúdio tem faixa do plano (R$197/297/497), data da
      próxima cobrança (mostra "vence em X dias" / "vencido há Y") e o link
      do LastLink. Cobrança recorrente é feita no LastLink; o admin liga/desliga
      o `plano_ativo` na mão conforme o pagamento. Automação por webhook fica
      pra quando tiver volume.

## Backlog da v1
- Notificações automáticas por e-mail (confirmação + lembrete 24h/2h) — adiado
- Gateway de pagamento real da RESERVA (Pix + cartão) — hoje é Pix manual
- Webhook do LastLink → liga/desliga `plano_ativo` sozinho (fase 2 da monetização)
- Multi-idioma PT/EN e multi-moeda BRL/USD (lançamento comercial 2027)
