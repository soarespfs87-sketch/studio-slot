# 📱 Studio Slot — Plano do MVP (v2)
> App de gestão pro fotógrafo autônomo: mostra quanto cobrar pra não trabalhar no vermelho, quanto dá pra tirar de pró-labore sem misturar com o caixa da empresa, e organiza os leads no mesmo lugar.

As regras de negócio completas (fórmulas, validações, exemplos numéricos, banco) estão em
**`briefing-v2-mvp-crm-precificacao-financeiro.md`**. Este plano diz *o que* construir e *em que ordem*; o briefing diz *exatamente como calcula*.

## 1. Decisões
| Tema | Decisão |
|---|---|
| Quem usa | O fotógrafo autônomo, sozinho. Cada fotógrafo vê só os próprios dados. |
| Login | Sim — reaproveita o login da v1 (Supabase Auth, recuperação de senha). |
| Dados | **Direto no Supabase** (exceção ao padrão do workshop: o app v1 já está publicado com banco e login). Tabelas da v1 ficam no banco, só somem da tela. |
| Formato | Mobile-first, funciona no computador. Preview duplo em `preview.html` (já existe). |
| Identidade | **Cada fotógrafo escolhe as cores** (editor da v1 continua em Ajustes) + logo e nome do negócio. Fontes: Fraunces (títulos) + Inter (texto). Cores do semáforo (vermelho/amarelo/verde) são **fixas**, não seguem o tema. |
| Plano | Sem plano gratuito, sem trial. Pro R$ 59/mês ou R$ 590/ano, cobrado pelo LastLink; `plano_ativo` liga/desliga na mão. |
| Stack | Vite + JavaScript puro + Supabase, deploy no Netlify (studioslot.app.br), PWA. Testes dos cálculos com Vitest. |
| Validação | Teste de 6 semanas com a cliente beta + 3–5 fotógrafos da carteira (critérios no briefing, seção 1). |

## 2. Telas do app
| Tela | O que o fotógrafo faz nela |
|---|---|
| **Início** | Lembretes (aniversários, parto, festa, recompra), follow-ups de hoje e atrasados, leads por etapa, recebido × previsto do mês, pacotes abaixo do mínimo, checklist de primeiro acesso |
| **Leads** | Cadastra lead, avança etapas, anota histórico, chama no WhatsApp, fecha (gera entradas no financeiro) ou perde (com motivo) |
| **Clientes** | Quem já comprou: ficha com dados pro contrato, família (filhos, bebê a caminho), compras e última compra; aba Lembretes; gera contrato em PDF |
| **Preços** | Base do negócio, pacotes, campanhas temáticas e calculadora rápida → preço à vista, a prazo, mínimo, semáforo, margem real |
| **Financeiro** | Lança entradas/saídas por grupo, marca como recebido, fluxo de caixa do mês em cascata até o saldo final |
| **Ajustes** | Nome, logo, cores, dados pro contrato (seu nome/CNPJ, endereço, foro), plano/assinatura, termos, sair |

## 3. O diferencial (detalhado)
**Precificação por pacote + fluxo de caixa**, a partir das planilhas reais da fotógrafa. É o que nenhum concorrente (Fstop, Lumi, Luma, HoneyBook) tem.

- **Base do negócio:** custos fixos (com o pró-labore como salário fixo), equipamentos (viram depreciação mensal) e os percentuais padrão (margem, comissão, imposto, cartão).
- **Pacotes:** cada pacote tem os custos dele (equipe, deslocamento, extras, kit, embalagem) e um **limite operacional** (quantos por mês dá pra entregar bem). O custo fixo é rateado por esse limite. O app calcula o preço à vista, a prazo e o mínimo "por dentro", pra que a margem pedida sobre de verdade. Mostra também o semáforo, a margem real e aceita um preço final ajustado à mão.
- **Campanhas temáticas** (Natal, Dia das Mães): pacote + investimento em cenário dividido pelas vagas (e pelas campanhas em que o cenário vai ser reaproveitado). Mostra "quantas sessões pra o cenário se pagar".
- **Calculadora rápida** por custo-hora, pra sessão avulsa.
- **Financeiro:** fluxo de caixa mensal em cascata (receitas → margem → margem de contribuição → margem líquida → saldo final), com saldo encadeado mês a mês, depreciação automática e regra PF/PJ.
- Ao fechar um lead abaixo do preço mínimo, o app avisa antes de salvar.

Fórmulas exatas: briefing, seções 3 e 5. Exemplos que viram teste: seções 3.7 e 5.4.

## 4. O que o app guarda
```
Negócio (1 por fotógrafo): nome, logo, cores, regime, % padrão (imposto, comissão, cartão, margem),
  pró-labore, horas/dia e dias/semana, saldo de partida e mês de início, plano ativo
Custo fixo: nome, valor mensal, dia do vencimento, ativo
Equipamento: nome, valor de compra, valor de revenda, vida útil (meses), data de compra
Pacote/Campanha: tipo, nome, entregáveis, limite operacional, custos (grupo, nome, valor, quantidade),
  % próprios, preço final ajustado; campanha: período, vagas, investimento, reaproveitamento do cenário
Lead: nome, WhatsApp, Instagram, e-mail, origem, pacote/campanha, etapa, datas, valores, motivo de perda, próximo follow-up
Evento do lead: tipo (criado/etapa/nota/follow-up), texto, data
Lançamento: grupo da DRE, categoria, descrição, valor, status (previsto/pago), vencimento, pago em,
  forma de pagamento, parcela, lead, pacote/campanha, custo fixo de origem
Cliente: nome, WhatsApp, e-mail, Instagram, nascimento, CPF, endereço, observações
Familiar: cliente, nome, parentesco (filho/filha/cônjuge/bebê a caminho/outro), nascimento ou data prevista do parto
Lembrete feito: qual lembrete (tipo + pessoa + ano), quando
Modelo de contrato: nome, texto com etiquetas ({cliente_nome}, {valor}…)
Contrato: cliente, compra, texto final (cópia fixa), status (rascunho/enviado/assinado), datas
```
Tudo pertence a um Negócio. Um lead fechado vira (ou se liga a) uma Cliente. Um lead fechado gera 1 ou 2 lançamentos (integral, ou sinal + saldo). Os lançamentos ligados a uma campanha mostram quanto ela já vendeu. Dinheiro sempre em centavos.

## 5. Fases de construção
| | Fase | O que entrega |
|---|---|---|
| ✅ | **0. Reorganizar a casa** | Telas de sala/reserva escondidas, menu novo, código separado por módulo, Vitest ligado, preview duplo e cores editáveis funcionando |
| ✅ | **1. Preços (core)** | Base do negócio, pacotes, campanhas temáticas e calculadora rápida salvando no Supabase; testes dos exemplos 3.7 passando |
| ✅ | **2. Leads** | CRM completo: pipeline, ficha, histórico, follow-up, WhatsApp, perdido com motivo |
| ✅ | **3. Financeiro** | Lançamentos por grupo da DRE, automatismos, fechar lead (RPC), regra PF/PJ, fluxo de caixa com saldo encadeado; teste do exemplo 5.4 passando |
| [ ] | **4. Clientes + lembretes** | Lead fechado vira cliente (sem duplicar), ficha com família e compras, "o bebê nasceu?", aba Lembretes (aniversários, festa dos filhos, parto, recompra) com WhatsApp pronto |
| [ ] | **5. Contratos** | Dados pro contrato, modelos com etiquetas, prévia com o que falta, PDF, envio pelo WhatsApp, status |
| [ ] | **6. Início** | Painel do dia com lembretes, campanhas em andamento, métricas do CRM, checklist de primeiro acesso |
| [ ] | **Final. Publicar** | Revisão de segurança (RLS/advisors), Privacidade/Termos com dados de clientes e crianças (LGPD), deploy Netlify, tela de assinatura LastLink R$ 59, início do teste de 6 semanas |

## 6. Versão 2 (fica pra depois)
- Formulário público de lead (`studioslot.app.br/<slug>/contato`) integrado ao site da cliente
- Agenda de sessões (motor da v1 adaptado) e reserva de sala de terceiros
- Propostas comerciais (`/proposta/[serviço]`)
- Assinatura eletrônica do contrato (ZapSign/Clicksign) · link de aceite online · anexar contrato assinado · galeria de entrega/seleção · portal do cliente · pagamento com split
- Notificações por e-mail/WhatsApp · webhook do LastLink · CEP automático · mensagens de lembrete editáveis
- Plano "Completo" · mais de um usuário por conta · inglês/dólar
- IA de atendimento (estilo Luma)
- Da planilha: Clube de Memórias (assinatura), catálogo de fornecedores de álbum, cenários anuais (pessimista/provável/otimista)
