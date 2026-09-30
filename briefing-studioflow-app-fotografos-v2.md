# Briefing de Produto v2 — App Completo de Gestão para Fotógrafos

Substitui o briefing original do Studio Slot (reserva de sala em estúdio) e incorpora o módulo de CRM/precificação/financeiro que estava sendo desenhado pro site da cliente fotógrafa. Agora é um produto só: um app completo pra fotógrafo autônomo rodar o negócio inteiro.
Preparado em 30/09/2026.

## 0. O que mudou desde a v1

A v1 vendia "reserva de sala de estúdio" pro dono do estúdio. Não vingou — os estúdios não sentiram necessidade suficiente pra pagar. A decisão agora é virar o público: o comprador deixa de ser o estúdio e passa a ser o fotógrafo autônomo, e o produto deixa de ser "agenda de sala" e passa a ser gestão completa do negócio dele. O motor de agenda que já existia não morre — ele muda de dono (de "estúdio agenda sala pro fotógrafo" pra "fotógrafo agenda sessão com o cliente dele"), e ganha companhia de CRM, precificação, financeiro e mais três módulos que apareceram como lacuna na pesquisa de concorrentes abaixo.

## 1. Pesquisa de concorrentes — o que existe hoje

Fui atrás dos dois links que você mandou e mais alguns nomes que apareceram na pesquisa. Isso importa porque muda onde vale a pena focar.

**Fstop CRM** (EUA, fstopcrm.com) — CRM feito por um fotógrafo, pra fotógrafo de casamento/evento: pipeline de leads, contrato inteligente com assinatura eletrônica, cobrança dividida (sinal + saldo) via Stripe próprio, portal do cliente (assina, paga, app nativo), galeria de fotos com armazenamento, coordenação de equipe (segundo fotógrafo). Não tem plano gratuito permanente — só trial de 7 dias pedindo cartão. Planos: Essentials US$29,99/mês, Studio US$49,99/mês, Pro US$69,99/mês (caem pra US$19,99/34,99/49,99 no anual). Se posiciona contra HoneyBook (US$29–109/mês), Dubsado (US$335/ano) e 17hats — CRMs genéricos, não feitos pra fotografia.

**Luma** (Brasil, da Liga da Fotografia) — não é um CRM tradicional, é uma IA de atendimento e negociação: responde e negocia com o cliente 24h, especializada em casamento, newborn e corporativo. É automação da conversa de venda, não gestão de back-office.

**Lumi CRM** (Brasil) — site profissional + seleção de fotos + galeria de entrega + agenda + CRM + pagamentos, com plano gratuito de entrada.

O padrão nos três: agenda, CRM, contrato/pagamento e galeria de entrega/seleção de fotos andam juntos — ninguém vende isso fatiado. E nenhum dos três tem calculadora de formação de preço nem controle financeiro com separação PF/PJ e pró-labore — essa é a lacuna real, é o que nenhum concorrente citado oferece, e é a dor que você já validou como forte. Esse é o gancho.

## 2. Posicionamento

Não é "mais um CRM de fotógrafo" (categoria já disputada pelo Fstop, Lumi, HoneyBook). É o único que, além de agenda + CRM + contrato + galeria, também mostra pro fotógrafo quanto ele precisa cobrar pra não trabalhar no vermelho e quanto pode tirar de pró-labore sem confundir com o caixa da empresa. Concorrente resolve "atender e cobrar o cliente". Esse resolve isso e resolve "saber se o negócio é lucrativo".

## 3. Nome

"Studio Slot" não serve mais — "slot" empurra pra agenda/reserva, que agora é só um dos sete módulos. Minha recomendação: **StudioFlow**. Mantém "studio" (no meio fotográfico, "studio" já significa "meu negócio de fotografia", não uma sala física — é como o mercado já fala) e tira "slot". É um nome de trabalho, troca fácil depois.

## 4. Quem compra e quem usa

Comprador e usuário são a mesma pessoa agora: o **fotógrafo autônomo** (wedding, newborn, gestante, corporativo, eventos — os mesmos segmentos que Fstop e Luma atacam). A reserva de sala de estúdio de terceiros, que era o produto inteiro na v1, vira um recurso opcional dentro do módulo de agenda — útil pra quem aluga espaço ocasionalmente, mas não é mais o motivo de compra.

## 5. Módulos do app

**5.1 Agenda** — reaproveita o motor já construído na v1 (calendário, bloqueio de horário, confirmação, hold temporário), só que agora o fotógrafo agenda sessão com o próprio cliente dele, não sala de estúdio. Reserva de sala de terceiros continua existindo como opção dentro do mesmo módulo, pra quem precisa.

**5.2 CRM de leads** — reaproveitado do briefing da cliente fotógrafa: pipeline (novo lead → contato iniciado → proposta enviada → negociação → fechado/perdido), ficha do lead com histórico, lembrete de follow-up, e fechamento de negócio alimentando o financeiro automaticamente.

**5.3 Precificação** — reaproveitado do briefing da cliente: calculadora com custo fixo, custo variável por sessão, depreciação de equipamento, horas reais por sessão, impostos (MEI/Simples), taxa de cartão, margem desejada. Saída: preço mínimo viável, preço sugerido, alerta se o preço praticado está abaixo do ponto de equilíbrio. Esse é o diferencial que nenhum concorrente pesquisado tem.

**5.4 Financeiro** — reaproveitado do briefing da cliente: entradas (automáticas via CRM fechado, ou manuais), saídas por categoria, cálculo de pró-labore sugerido separado de reserva de imposto e reserva de emergência, regra visual de nunca pagar conta pessoal direto da conta PJ, relatório mensal simples (faturamento bruto → custos e impostos → pró-labore sugerido → saldo retido).

**5.5 Contratos com assinatura eletrônica** — módulo novo, resposta direta ao que o Fstop tem e o app ainda não: contrato gerado a partir de template, assinatura eletrônica, armazenado vinculado à sessão/cliente.

**5.6 Propostas comerciais** — já desenhado no briefing da cliente (`/proposta/[serviço]`): estrutura editorial com vídeo, portfólio, o que está incluído, valores, opcionais, depoimentos — generalizar pra qualquer fotógrafo, não só pra essa cliente.

**5.7 Galeria de entrega e seleção de fotos** — módulo novo, gap real vs. Fstop e Lumi CRM: upload de fotos pro cliente ver, selecionar as favoritas (pré-entrega) e baixar a entrega final, com armazenamento.

**5.8 Portal do cliente** — módulo novo: uma tela única onde o cliente do fotógrafo vê proposta, assina contrato, paga e acessa a galeria — sem precisar ficar recebendo link solto por e-mail/WhatsApp.

**5.9 Pagamento com split** — módulo novo: cobrança dividida em sinal + saldo (igual ao Fstop), Pix e cartão, sem a plataforma tocar em dado de cartão.

**5.10 Agente de atendimento automático (IA)** — fica de olho no que o Luma faz (responder e negociar 24h), mas não entra agora: é engenharia pesada (IA conversacional) e não é onde está a lacuna competitiva — a lacuna é precificação e financeiro. Fica como diferencial de fase futura, não de lançamento.

## 6. Escopo do MVP — minha recomendação

Lançar com 5.1 (agenda), 5.2 (CRM), 5.3 (precificação), 5.4 (financeiro) e 5.6 (propostas, em versão simples). Esses cinco já estão especificados ou reaproveitados de trabalho que você já fez — não é escopo novo, é reunir o que já existe. E 5.3 + 5.4 são o gancho que nenhum concorrente tem, então são o motivo de alguém trocar de ferramenta.

Contratos com assinatura eletrônica (5.5), galeria de entrega/seleção (5.7), portal do cliente unificado (5.8) e pagamento com split (5.9) exigem integração nova (provedor de assinatura eletrônica, storage de galeria com UI de seleção, split de pagamento no gateway) — ficam pra Fase 2, logo depois do MVP, porque são featured pesados mas não é o que diferencia, é o que iguala ao Fstop.

Agente de IA (5.10), coordenação de equipe/segundo fotógrafo e o marketplace de estúdios (herdado da v1) ficam pra Fase 3.

## 7. Modelo de negócio

B2C direto pro fotógrafo, assinatura mensal — muda da v1, que era B2B pro estúdio. Referência de mercado: Fstop não tem free permanente (só trial de 7 dias com cartão) e cobra US$29,99 a US$69,99/mês (US$19,99 a US$49,99 no anual); Lumi CRM tem entrada gratuita de verdade. Isso é importante: quem compete em free hoje é a Lumi, não o Fstop — então um free bem cortado te diferencia dos dois ao mesmo tempo (do Fstop por não pedir cartão pra testar, da Lumi por ter um caminho claro de upgrade pro que elas não oferecem). Estrutura de planos:

**Free** — agenda (1 usuário) + CRM básico com limite de leads ativos (ex.: até 10) + 1 proposta comercial padrão. Sem precificação, sem financeiro, sem contrato, sem galeria. Serve pra competir em tração com o free da Lumi CRM, não pra entregar o diferencial de graça.

**Pro** (plano de entrada pago, recomendo algo como R$49–79/mês ou US$14,99/mês) — agenda e CRM sem limite, mais precificação e financeiro completos. É o plano que carrega o motivo real de pagar, porque é onde mora o que nenhum concorrente pesquisado oferece.

**Completo** (quando Fase 2 estiver pronta — contrato com assinatura, galeria de entrega, portal do cliente, pagamento com split) — tier acima do Pro, ainda abaixo do teto do Fstop (US$69,99), pra manter vantagem de preço mesmo com paridade de recursos.

Distribuição: usar a carteira de clientes da própria ShineWay como primeiros usuários — a cliente fotógrafa do site que já está em produção é a beta natural, porque o módulo CRM/precificação/financeiro já está sendo construído pra ela mesmo. Por isso o free serve mais pra quando o produto crescer além da carteira direta da agência do que pra essa fase inicial.

## 8. Modelo de dados — o que muda/entra

Reaproveita as entidades já especificadas (Booking, Photographer, Payment, PriceRule etc. da v1; Lead, Proposal implícitas do briefing da cliente) e soma:

**Contract** — id, session_id/lead_id (fk), template_usado, status (rascunho/enviado/assinado), assinado_em, arquivo.

**Gallery** — id, session_id (fk), fotos[] (url, status: proof/selecionada/entrega final), data_entrega.

**ClientPortalAccess** — id, client_id (fk), token_de_acesso, itens_visiveis (proposta/contrato/galeria/pagamento).

**Payment** (revisado) — ganha campo `tipo` (sinal/saldo/integral) pra suportar split.

## 9. Próximos passos

1. Confirmar o nome (StudioFlow ou outro) antes de padronizar em qualquer material.
2. Levar este arquivo + o briefing da cliente fotógrafa (que já tem CRM/precificação/financeiro especificados em detalhe) pro VS Code como ponto de partida do schema e do scaffold.
3. Construir o módulo CRM/precificação/financeiro uma vez só, de forma reutilizável (multi-tenant), não preso ao site de uma cliente — é o mesmo módulo que vira o core do StudioFlow.
4. Rodar o MVP (seção 6) com a cliente fotógrafa atual como primeira usuária real antes de abrir pra mais gente.
