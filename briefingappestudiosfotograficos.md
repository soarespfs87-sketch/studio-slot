# Briefing de Produto — Sistema de Gestão e Reservas para Estúdios Fotográficos

Documento para handoff técnico (VS Code / ferramenta de IA de código / desenvolvedor).
Preparado em 02/09/2026.

## Como usar esse documento

Isso não é só um brainstorm reorganizado. É um briefing pra sair codando: tem decisão de escopo, modelo de dados, stack recomendada e o que fica de fora do MVP de propósito. Onde eu bati o martelo numa decisão, deixei explícito — é pra você aprovar ou trocar antes de mandar pro dev, não pra ficar em aberto.

## 1. O problema

Estúdio que aluga sala e cenário pra fotógrafo hoje resolve tudo por WhatsApp: agenda manual, confirmação manual, cobrança manual, dúvida sobre regra do espaço manual. Isso não escala, trava em época de pico (Natal é o caso extremo: cenário datado, alta rotatividade, montagem/desmontagem, lista de espera) e o estúdio não tem dado nenhum sobre o próprio negócio — não sabe qual sala vende mais, qual horário lota, quem é cliente recorrente.

## 2. Posicionamento

Não é "app de agenda". Agenda todo mundo tem — Calendly, Google Calendar, um Google Sheets. O produto é a operação completa de locação de estúdio fotográfico: da descoberta da sala até o pagamento e o check-out, com regras específicas de quem aluga espaço criativo por hora (buffer entre sessões, cenário com data de validade, cobrança de extras, contrato por reserva). Isso cria categoria própria em vez de competir em preço com ferramenta de agenda genérica.

## 3. Nome do produto

Minha recomendação: **Studio Slot**. Funciona em português e inglês (importante — sua operação é Brasil + Orlando), fica bem em domínio, e escala pro nome do marketplace futuro ("encontrou um Studio Slot disponível perto de você").

Alternativas, se quiser um nome mais afetivo em português: **Ensaio** (usa a palavra que fotógrafo brasileiro já usa no dia a dia pra sessão de fotos) ou **SlotStudio**. Meu voto continua no Studio Slot — o negócio nasce bilíngue, então o nome deveria nascer bilíngue também.

## 4. Modelo de negócio

Dois produtos, dois momentos:

**Produto 1 — SaaS para o estúdio.** Mensalidade por estúdio, escalando por número de salas/funcionalidades: R$197 (até 2 salas, Fase 1), R$297 (até 5 salas + Fase 2), R$497 (ilimitado + Fase 2 completa). É o produto que existe desde o MVP.

**Produto 2 — Marketplace entre estúdios.** Fica pra Fase 3, depois que existir uma base de estúdios ativos usando o SaaS. Aí sim cobra mensalidade + comissão por reserva feita via marketplace. Não faz sentido nascer com isso — marketplace sem oferta cadastrada não tem o que mostrar pro fotógrafo.

## 5. Quem usa o sistema

- **Fotógrafo** — cliente do estúdio, reserva sala/cenário e paga.
- **Dono/gestor do estúdio** — cadastra espaço, define regras e preço, acompanha operação e faturamento.
- **Admin da plataforma** — você / ShineWay, gerencia estúdios cadastrados, planos e suporte.
- **Prestador parceiro** (maquiadora, assistente, videomaker) — só entra na Fase 3, no marketplace interno.

## 6. Decisão sobre timing — o Natal 2026 é beta, não lançamento

Hoje é 2 de setembro. Cenário de Natal costuma abrir reserva em outubro e a operação pesada é novembro/dezembro. Isso dá uma janela real de ~6 a 7 semanas pra ter um MVP rodando — apertado, mas dá, **desde que o escopo seja o mínimo que gera receita e resolve a dor**, não a lista inteira dos 20 itens do brainstorm.

Minha recomendação: trate o Natal 2026 como **beta pago com 1 a 3 estúdios parceiros da própria carteira da agência** (não lançamento público). Isso valida operação, cobrança e módulo de cenário datado com risco controlado, gera case e depoimento reais, e o lançamento comercial do SaaS completo (Fase 2) mira 2027. Vender "produto pronto com 20 funcionalidades" pra estúdio que não te conhece em 6 semanas é a receita pra atrasar tudo e não lançar nada a tempo do Natal.

## 7. Escopo do MVP — Fase 1 ("Beta Natal 2026")

Isso é o que precisa existir pra rodar uma reserva paga de ponta a ponta:

**Perfil do estúdio** — nome, endereço, fotos, descrição, regras gerais.

**Salas e cenários cadastráveis** — cada um com nome, fotos, capacidade máxima, agenda própria e independente das outras salas.

**Agenda por sala com preço por faixa** — o dono define granularidade do slot (30min / 1h / 2h / diária) e tabelas de preço diferentes por período (dia útil, fim de semana, temporada Natal). O calendário de Natal precisa suportar data de início/fim do cenário (ex.: cenário disponível só de 10/10 a 23/12).

**Buffer automático entre sessões** — o dono configura quantos minutos de entrada/saída ficam bloqueados automaticamente antes e depois de cada reserva.

**Reserva com pagamento integrado** — Pix e cartão (via gateway, sem a plataforma nunca tocar em dado de cartão). Hold temporário de 10 minutos no horário escolhido enquanto o pagamento não é confirmado; expirou, volta pra agenda.

**Extras na reserva** — lista de adicionais cadastrável pelo estúdio (flash, camarim, tempo extra etc.), somados ao total antes do pagamento.

**Aceite de termo por reserva** — checkbox "li e concordo com as regras", gerando um registro simples com nome, data, sala, horário e valor vinculado à reserva (contrato completo em PDF fica pra Fase 2).

**Cancelamento/reagendamento com regra configurável** — o dono define prazo (ex.: até 72h antes = grátis, depois = taxa), o fotógrafo resolve sozinho dentro do app.

**Notificações automáticas** — confirmação na hora, lembrete 24h antes, lembrete 2h antes (e-mail e/ou WhatsApp).

**"Minha reserva" do fotógrafo** — tela com sala, data, horário, horário de check-in liberado, e os botões como chegar / regras / contrato / falar com o estúdio.

**Dashboard básico do dono** — reservas do dia, horas vendidas, faturamento do dia/mês, taxa de ocupação por sala.

## 8. Fora do escopo do MVP (de propósito)

Fica pra Fase 2 ou 3, não trava o beta do Natal: CRM avançado de fotógrafos, planos mensais recorrentes, crédito de horas pré-pago, lista de espera automática, check-in por QR code, cobrança automática de hora excedente, avaliação do espaço, liberação escalonada por nível (VIP/recorrente/geral), tour 360°/making of do cenário, marketplace de prestadores parceiros, marketplace entre estúidios, white-label.

Isso é a diferença entre lançar em outubro e não lançar. Cada item acima é bom — só não é essencial pra cobrar de um fotógrafo em novembro.

## 9. Roadmap de fases

**Fase 1 — MVP / Beta Natal 2026** (meta: rodando até meados de outubro). Escopo da seção 7. Vendido informalmente pra 1-3 estúdios parceiros, não como produto de prateleira ainda.

**Fase 2 — Studio Pro** (mira Q1/Q2 2027, depois de validar o beta). Créditos de horas, planos mensais para fotógrafos, CRM de fotógrafos, lista de espera automática, contrato em PDF completo, check-in por QR code, cobrança de excedente, cupons, avaliação do espaço, liberação escalonada (VIP). Esse é o produto que vira SaaS de verdade, vendido como R$197/297/497.

**Fase 3 — Plataforma** (2027 em diante, com base de estúdios ativa). Marketplace de estúdios por localização (fotógrafo busca "estúdio disponível perto de mim"), marketplace de prestadores parceiros com comissão pra plataforma, app único do fotógrafo, white-label pra estúdios grandes.

## 10. Jornada do fotógrafo

Busca o estúdio (ou entra direto no link do estúdio) → escolhe sala/cenário → vê fotos, medidas, equipamento disponível → escolhe data e horário na agenda em tempo real → adiciona extras → paga (Pix/cartão, hold de 10min) → recebe confirmação automática → acessa "Minha Reserva" com check-in, regras, contrato e chat com o estúdio.

## 11. Jornada do dono do estúdio

Cadastra o estúdio → cadastra salas/cenários com fotos e specs → configura preço por faixa, buffer e política de cancelamento → acompanha agenda em tempo real → acompanha dashboard de faturamento e ocupação → responde fotógrafo dentro do app.

## 12. Modelo de dados — entidades principais

Isso é o ponto de partida pro schema, não o schema final — mas já dá pra levar direto pro Supabase/Postgres.

**Studio** — id, nome, slug, endereço, telefone, descrição, fotos[], regras_gerais, plano (fk), criado_em.

**Room** (sala/cenário) — id, studio_id (fk), nome, tipo (sala fixa / cenário sazonal), fotos[], capacidade_max, metragem, equipamento_disponivel[], data_inicio_disponibilidade, data_fim_disponibilidade (nulo pra sala permanente).

**PriceRule** — id, room_id (fk), dia_semana_ou_periodo, hora_inicio, hora_fim, valor_hora, granularidade_slot (30/60/120/diária).

**BufferRule** — id, room_id (fk), minutos_antes, minutos_depois.

**Booking** — id, room_id (fk), photographer_id (fk), data, hora_inicio, hora_fim, status (hold/confirmada/cancelada/concluída), hold_expira_em, valor_sala, valor_extras, valor_total, forma_pagamento, aceite_termo_em.

**Extra** (adicional) — id, studio_id (fk), nome, valor, disponivel_para_rooms[].

**BookingExtra** — booking_id (fk), extra_id (fk), quantidade, valor.

**Photographer** (usuário) — id, nome, e-mail, telefone, cpf, criado_em.

**Payment** — id, booking_id (fk), gateway_transaction_id, status, valor, metodo, criado_em. (Nunca guarda dado de cartão — isso fica só no gateway.)

**Notification** — id, booking_id (fk), tipo (confirmação/lembrete_24h/lembrete_2h), canal (email/whatsapp), enviado_em.

## 13. Arquitetura técnica recomendada

Minha recomendação, direto: **web app responsivo (PWA), multi-tenant desde o dia 1**. Nada de app nativo agora — validar rápido importa mais do que estar na loja de app, e web funciona bem em navegador mobile pro fotógrafo reservar do celular. App nativo é conversa pra Fase 3, quando já tiver estúdio pagando.

Multi-tenant desde o início porque o modelo de negócio já é "vários estúdios, um sistema" — tentar fazer single-tenant agora e migrar depois é retrabalho puro. Cada estúdio é um tenant identificado por slug (ex.: `studioslot.app/studiolumi`), pronto pra virar subdomínio próprio na Fase 2.

Stack sugerida: **Next.js + TypeScript** no front, **Supabase** (Postgres + Auth + Storage) no backend — resolve banco, autenticação e upload de foto num pacote só, e tem suporte forte de ferramenta de IA de código. Gateway de pagamento com Pix nativo e suporte a cartão internacional (Mercado Pago ou Pagar.me pro Brasil; se o volume dos EUA crescer, Stripe entra em paralelo pra cobrança em USD). Notificação automática via serviço de e-mail transacional (Resend/SendGrid) + WhatsApp via API oficial (Twilio ou similar) — não robô não-oficial, se não a conta do estúdio corre risco de ban. Deploy em Vercel (front) + Supabase (backend), que é o caminho de menor atrito pra começar a codar direto no VS Code.

## 14. Requisitos não funcionais

**Privacidade e dado de cliente** — operação nasce Brasil + EUA (Orlando), então o texto de termos e a política de privacidade têm que existir em PT-BR e EN desde o MVP, e o tratamento de dado do fotógrafo (nome, CPF/documento, contato) segue LGPD.

**Pagamento** — nunca armazenar número de cartão; tokenização sempre via gateway.

**Multi-idioma** — PT-BR e EN na interface, não só nos termos.

**Multi-moeda** — BRL para estúdios brasileiros, USD pronto pra quando entrar estúdio em Orlando (mesmo que no MVP só opere em BRL, o campo de moeda já nasce no schema pra não precisar migração depois).

**Performance em pico** — a agenda de Natal é o momento de maior concorrência de acesso simultâneo (vários fotógrafos tentando o mesmo horário); o hold de 10 minutos e o lock de slot têm que ser atômicos no banco pra não vender o mesmo horário duas vezes.

## 15. Telas do MVP

Perfil público do estúdio · Lista de salas/cenários com filtro de data · Detalhe da sala (fotos, specs, preço, agenda) · Fluxo de reserva (data → horário → extras → pagamento) · Tela de hold/pagamento com contador de 10min · Confirmação de reserva · "Minha Reserva" (fotógrafo) · Login/cadastro simples · Painel do dono: agenda geral, cadastro de sala, cadastro de preço/buffer, cadastro de extras, dashboard de faturamento/ocupação.

## 16. Métricas de sucesso do beta

Número de estúdios parceiros ativos · taxa de ocupação das salas cadastradas · ticket médio por reserva · % de reservas com pelo menos um extra · tempo médio entre início da reserva e pagamento confirmado · reservas perdidas por expiração do hold (indica se 10min é tempo suficiente).

## 17. Próximos passos práticos

1. Validar esse escopo com 1 a 3 estúdios reais da carteira da agência antes de escrever qualquer linha de código — confirmar se o buffer, a tabela de preço e o fluxo de extras batem com a operação real deles.
2. Levar este arquivo pro VS Code com a ferramenta de IA de código (Claude Code, Copilot etc.) e usar as seções 12 e 13 como ponto de partida pra estrutura do projeto (schema Supabase + scaffold Next.js).
3. Fechar nome definitivo e abrir domínio.
4. Abrir conta de gateway de pagamento (PJ) e confirmar taxa/prazo de repasse — isso trava o fluxo de reserva inteiro se não estiver pronto antes.
5. Rodar Fase 1 com os estúdios piloto até meados de outubro, mirando a operação real de novembro/dezembro 2026.
