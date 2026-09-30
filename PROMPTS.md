# Prompts de construção — Studio Slot v2

Se você fechar a conversa e voltar outro dia, cole o prompt da fase onde parou (ou peça "continue meu app da Fase X").

---

## Prompt — Fase 0: Reorganizar a casa

Leia o PLANO.md e o briefing-v2-mvp-crm-precificacao-financeiro.md. Estou transformando o Studio Slot (hoje: reserva de sala de estúdio) num app de gestão pro fotógrafo autônomo: precificação, leads e financeiro.
Agora vamos construir SÓ a Fase 0: reorganizar o app pra receber os módulos novos.

Nesta fase:
- Tirar da navegação as telas de reserva de sala (início público, detalhe da sala, reservar, extras, minhas reservas, painel do dono de salas). O código delas não é apagado — fica guardado em `src/legado/` pra quando a agenda voltar. As tabelas do banco ficam intocadas.
- Depois do login, o fotógrafo cai num app com menu de 5 itens: Início, Leads, Preços, Financeiro, Ajustes (barra inferior no celular, lateral no computador). Os 4 primeiros mostram um estado vazio caprichado dizendo o que vai ter ali.
- Ajustes reaproveita a Identidade da v1 (nome, logo, ícone, cores) + link pra termos/privacidade + sair.
- Separar o código por área (`src/modulos/inicio`, `leads`, `precos`, `financeiro`, `ajustes`) em vez de tudo no `app.js`.
- Login, recuperação de senha, portão do plano (`portao.js`), painel da plataforma e páginas legais continuam funcionando.
- Instalar Vitest e criar `src/calculos.js` (vazio por enquanto) com um teste de exemplo passando (`npm test`).
- Cores do semáforo (vermelho/amarelo/verde) como variáveis fixas no CSS, fora do tema editável.

Identidade visual: cores escolhidas por cada fotógrafo (editor da v1), fontes Fraunces + Inter, mobile-first.
Não faça ainda: nenhuma tabela nova no banco, nenhuma tela de preço/lead/financeiro de verdade.
Vá me explicando o que está fazendo em linguagem simples e me avise quando eu puder testar.

Está pronto quando:
- [ ] Abro o `preview.html`, entro com meu login e vejo o menu de 5 itens no celular e no computador
- [ ] Clico em cada item do menu e a tela certa aparece (celular e computador)
- [ ] Em Ajustes troco a cor principal e o app muda na hora; recarrego e continua
- [ ] `npm test` passa e `npm run build` gera o app sem erro

---

## Prompt — Fase 1: Preços (core)

Leia o PLANO.md e o briefing (seção 3 inteira e seção 7). Já concluí a Fase 0. Agora vamos construir SÓ a Fase 1: o módulo Preços, baseado nas planilhas reais da fotógrafa.

Nesta fase:
- Criar no Supabase (migração) as tabelas `config_negocio`, `custos_fixos`, `equipamentos`, `servicos`, com RLS "só o dono do estúdio" e dinheiro em centavos.
- Tela Preços com 4 abas: Base do negócio · Pacotes · Campanhas · Calculadora rápida.
- Base: dados gerais (regime, % padrão, pró-labore, horas/dia, dias/semana), custos fixos com as linhas da planilha zeradas no primeiro acesso + "Seu salário (pró-labore)" fixo, equipamentos. Resumo: custos fixos do mês, depreciação e base do rateio.
- Pacotes: limite operacional, custos por grupo (valor × quantidade), % próprios, preço final ajustado à mão. Mostrar à vista, a prazo, mínimo, lucro, margem real × pedida, semáforo, alertas e o botão "Usar preço sugerido".
- Campanhas temáticas: pacote + período, vagas, investimento e reaproveitamento do cenário. Mostrar "N sessões pra o cenário se pagar" e os alertas.
- Calculadora rápida (Modelo A), que não salva nada.
- Todas as fórmulas das seções 3.2 a 3.5 em `src/calculos.js` (funções puras, conta "por dentro") + testes com os 3 exemplos da seção 3.7.
- Validações da seção 3.6 (nada de NaN/Infinity na tela).

Identidade visual: tema do fotógrafo, semáforo com cores fixas, mobile-first.
Não faça ainda: leads, financeiro, painel do início.
Vá me explicando em linguagem simples e me avise quando eu puder testar.

Está pronto quando:
- [ ] `npm test` passa com os 3 exemplos: "As quatro estações" (a prazo R$ 2.725,67, mínimo R$ 2.096,67, amarelo, margem real 21,62%), "Minissessão de Natal" (8 sessões pra pagar o cenário) e a calculadora rápida (lucratividade 25%)
- [ ] Cadastro os números do exemplo na tela e vejo os mesmos resultados
- [ ] Apago o limite operacional e a tela diz o que falta, sem quebrar
- [ ] Saio, entro de novo e está tudo salvo

---

## Prompt — Fase 2: Leads

Leia o PLANO.md e o briefing (seção 4 e seção 7). Já concluí as Fases 0 e 1. Agora vamos construir SÓ a Fase 2: o CRM de leads.

Nesta fase:
- Migração: tabelas `leads` e `lead_eventos` com RLS.
- Pipeline Novo → Contato iniciado → Proposta enviada → Negociação → Fechado / Perdido (abas no celular, colunas no computador, botão "Avançar").
- Ficha do lead com os campos da seção 4.2; o pacote ou campanha de interesse vem da tela Preços e preenche o valor estimado.
- Histórico automático (criado, mudança de etapa, follow-up feito) + notas livres.
- Botão WhatsApp (`wa.me`) com mensagem pronta.
- Follow-up: data de próximo contato; ao marcar feito, pede a próxima.
- Perdido pede motivo. Fechado, por enquanto, pede só valor fechado e data da sessão (a ligação com o financeiro é a Fase 3) e avisa se o valor está abaixo do preço mínimo do pacote.

Identidade visual: tema do fotógrafo, mobile-first.
Não faça ainda: lançamentos financeiros, painel do início.
Vá me explicando em linguagem simples e me avise quando eu puder testar.

Está pronto quando:
- [ ] Cadastro um lead, avanço até Negociação e vejo cada mudança no histórico
- [ ] Clico em WhatsApp e abre a conversa com a mensagem pronta
- [ ] Fecho um lead do pacote "As quatro estações" por R$ 2.000 e o app avisa que está abaixo do mínimo (R$ 2.096,67)
- [ ] Perco um lead e o motivo fica gravado

---

## Prompt — Fase 3: Financeiro

Leia o PLANO.md e o briefing (seção 5, seção 4.4 e seção 7). Já concluí as Fases 0 a 2. Agora vamos construir SÓ a Fase 3: o fluxo de caixa mensal no formato da planilha.

Nesta fase:
- Migração: tabela `lancamentos` (grupos da DRE) com RLS + função `fechar_lead(...)` (RPC) que atualiza o lead, cria as entradas previstas (integral, ou sinal % + saldo) e registra o evento, tudo de uma vez.
- Primeiro acesso: pedir o saldo de partida e o mês de início.
- Lançamentos por grupo/categoria, "Marcar como recebido/pago", botão "Lançar custos fixos do mês" (sem duplicar), tarifa de cartão automática, oferta de lançar o investimento da campanha.
- Regra PF/PJ: "É uma conta pessoal?" → aviso; se o dinheiro saiu da PJ, vira "Retirada extra do sócio" em vermelho.
- Fluxo de caixa do mês em cascata (seção 5.3) com depreciação automática, saldo encadeado a partir do histórico, dinheiro na conta, fôlego, previstos e alertas. Navegação entre meses.
- Campanha em Preços passa a mostrar vagas vendidas e faturamento.
- Fórmulas em `src/calculos.js` + teste com o exemplo da seção 5.4.

Identidade visual: tema do fotógrafo, mobile-first.
Não faça ainda: painel do início.
Vá me explicando em linguagem simples e me avise quando eu puder testar.

Está pronto quando:
- [ ] `npm test` passa com o exemplo do mês (margem líquida −R$ 1.088,50, saldo final R$ 1.911,50, dinheiro na conta R$ 2.111,50)
- [ ] Fecho um lead com sinal de 30% e aparecem duas entradas previstas com as datas certas
- [ ] Clico em "Lançar custos fixos do mês" duas vezes e eles não duplicam
- [ ] Corrijo um lançamento do mês passado e o saldo inicial deste mês muda sozinho
- [ ] Tento lançar o mercado de casa e o app não deixa como custo do negócio

---

## Prompt — Fase 4: Clientes + lembretes

Leia o PLANO.md e o briefing (seções 11, 12 e 7). Já concluí as Fases 0 a 3. Agora vamos construir SÓ a Fase 4: clientes e lembretes.

Nesta fase:
- Migração: tabelas `clientes`, `familiares`, `lembretes_feitos`, coluna `leads.cliente_id` e antecedências em `config_negocio`, com RLS "só o dono". A função `fechar_lead` passa a criar a cliente (ou ligar à existente pelo WhatsApp). Os leads que já estão fechados viram clientes na migração.
- Novo item "Clientes" no menu (6 itens), com as abas Clientes e Lembretes.
- Ficha: dados pessoais, dados pro contrato (CPF validado, endereço), família (filhos, cônjuge, bebê a caminho com data do parto, botão "O bebê nasceu?"), compras com total e última compra, observações.
- Lista com busca, "aniversariantes do mês" e ordem por última compra. "+ Nova cliente" pra quem comprou antes do app.
- Lembretes calculados das datas (seção 12), cada um com WhatsApp e mensagem pronta e "Feito ✓", mais as antecedências configuráveis. Regras em funções puras + testes com os exemplos da seção 12.
- Ficha do lead fechado: link "Completar cadastro da cliente".

Identidade visual: tema do fotógrafo, mobile-first.
Não faça ainda: contratos, painel do Início.
Vá me explicando em linguagem simples e me avise quando eu puder testar.

Está pronto quando:
- [ ] `npm test` passa com os exemplos de lembrete (aniversário em 2 dias, festa do Theo em 60 dias, parto em 5 dias, recompra, 29/02)
- [ ] Fecho um lead e a cliente aparece com a compra; fecho outro lead com o mesmo WhatsApp e ele entra na mesma ficha
- [ ] Cadastro um bebê a caminho e o lembrete do parto aparece perto da data; clico "O bebê nasceu?" e vira filho
- [ ] Marco um lembrete como feito e ele some

---

## Prompt — Fase 5: Contratos

Leia o PLANO.md e o briefing (seção 13 e 7). Já concluí as Fases 0 a 4. Agora vamos construir SÓ a Fase 5: contratos em PDF.

Nesta fase:
- Migração: `contrato_modelos`, `contratos` e os campos de "dados pro contrato" em `config_negocio`, com RLS.
- Ajustes › Dados pro contrato (seu nome/razão social, CPF/CNPJ, endereço, cidade do foro).
- Modelos: editor de texto com botões que inserem as etiquetas; modelo inicial de exemplo com o aviso "revise com seu advogado".
- Gerar na ficha da cliente: escolher compra e modelo → prévia preenchida com ⚠ no que falta → ajuste opcional → "Salvar e baixar PDF" (guarda cópia fixa; PDF pela impressão do navegador com layout de documento) → "Enviar pelo WhatsApp" (status enviado) → marcar assinado (trava a edição).
- `{valor_extenso}` e `{data_hoje}` por extenso em funções puras testadas.

Identidade visual: tema do fotógrafo na tela; o PDF é sóbrio (preto e branco, nome do negócio no cabeçalho).
Não faça ainda: assinatura eletrônica, link de aceite, painel do Início.
Vá me explicando em linguagem simples e me avise quando eu puder testar.

Está pronto quando:
- [ ] `npm test` passa: 2.550,00 → "dois mil, quinhentos e cinquenta reais"; 1.000.001,50 por extenso
- [ ] Gero o contrato de uma compra e todos os campos vêm preenchidos; sem CPF, aparece o aviso do que falta
- [ ] Baixo o PDF e ele sai com cara de documento (margens, páginas numeradas)
- [ ] Mudo o modelo e o contrato já gerado continua igual

---

## Prompt — Fase 6: Início

Leia o PLANO.md e o briefing (seções 4.5, 6 e 12). Já concluí as Fases 0 a 5. Agora vamos construir SÓ a Fase 6: o painel do Início.

Nesta fase:
- Lembretes da seção 12 agrupados em Hoje / Esta semana / Ações de venda, com WhatsApp e "Feito ✓".
- Follow-ups de hoje e atrasados (com WhatsApp), leads por etapa (clicáveis), recebido × previsto e margem líquida do mês, campanhas em andamento (vagas vendidas e quantas faltam pro cenário se pagar), pacotes com semáforo vermelho.
- Métricas do CRM do mês: leads novos, taxa de conversão (fechados ÷ fechados + perdidos), valor fechado, motivo de perda mais comum.
- Checklist de primeiro acesso: dados gerais → custos fixos → equipamentos → primeiro pacote → saldo de partida → primeiro lead; some quando tudo estiver feito.

Identidade visual: tema do fotógrafo, mobile-first.
Não faça ainda: publicar/cobrança.
Vá me explicando em linguagem simples e me avise quando eu puder testar.

Está pronto quando:
- [ ] Com uma conta nova, o checklist me guia e some no fim
- [ ] Um follow-up de ontem aparece em vermelho em "Atrasados"
- [ ] Os números do mês batem com o relatório do Financeiro

---

## Prompt — Fase Final: Publicar

Leia o PLANO.md. Já concluí as Fases 0 a 6. Agora vamos publicar a v2.

Use a skill do back-end ("vamos construir o back-end do meu app") pra revisar a segurança do banco: RLS de todas as tabelas novas, advisors do Supabase sem alerta de segurança, backup (`npm run salvar`) antes de subir.

Nesta fase:
- Tela de assinatura (portão) com o plano Pro R$ 59/mês ou R$ 590/ano e o link do LastLink; sem plano gratuito.
- Painel da plataforma mostrando os planos novos.
- Atualizar termos/privacidade pro novo propósito do app: o fotógrafo é controlador dos dados dos clientes dele (incluindo CPF e dados de crianças) e o Studio Slot é operador (briefing 13.3). Atualizar o manifesto do PWA.
- Avaliar o plano pago do Supabase (o gratuito pausa o banco sem uso).
- Deploy no Netlify (studioslot.app.br) e teste instalando no celular.
- Criar as contas da cliente beta e dos 3–5 fotógrafos do teste.

Está pronto quando:
- [ ] Abro studioslot.app.br no celular, instalo e entro
- [ ] Conta sem plano ativo vê a tela de assinatura; com plano ativo entra no app
- [ ] Advisors do Supabase sem alerta de segurança
- [ ] Cliente beta consegue entrar e cadastrar os números dela
