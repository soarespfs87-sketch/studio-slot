# Studio Slot v2 — Briefing do MVP de teste: CRM + Precificação + Financeiro

Preparado em 30/09/2026. Complementa o `briefing-studioflow-app-fotografos-v2.md` e **substitui as seções 3 (nome), 6 (escopo do MVP) e 7 (planos)** dele.

**Revisão 30/09/2026:** as seções 3 (Preços) e 5 (Financeiro) foram refeitas a partir das planilhas reais da fotógrafa (`Planilha Gestão - MEU NEGÓCIO` e `Precificação Experiências PS`, descritas no anexo "Modelo de Financeiro e Precificação"). A estrutura, os campos e a ordem são os da planilha. Mudam só três pontos, explicados onde aparecem:
1. comissão, imposto e cartão calculados **por dentro**, e não em cascata (decisão aprovada);
2. a depreciação dos equipamentos entra no custo fixo que é rateado entre os pacotes;
3. surge a **campanha temática** (Natal, Dia das Mães), com o investimento em cenário.

---

## 0. Decisões já tomadas

| Tema | Decisão |
|---|---|
| Nome | Continua **Studio Slot** (domínio studioslot.app.br mantido). |
| Público | Fotógrafo autônomo (gestante, newborn, infantil, corporativo, eventos, casamento). |
| v1 (reserva de sala) | Não há estúdios usando. As tabelas antigas ficam no banco, só somem da interface. A agenda volta depois do teste. |
| Escopo do teste | Só **CRM + Precificação + Financeiro**. Sem agenda, sem proposta, sem contrato, sem galeria. |
| Planos | **Sem plano gratuito e sem trial.** Um plano só por enquanto: **Pro — R$ 59/mês** (faixa estudada: R$ 49–79) ou **R$ 590/ano** (2 meses de desconto). |
| Cobrança | Igual à v1: LastLink + `plano_ativo` ligado na mão pelo admin. |
| Primeira usuária | A cliente fotógrafa da agência, como beta com cortesia durante o teste (não é plano gratuito público). |
| Fonte das fórmulas | As planilhas reais da fotógrafa (ver revisão acima). A IA de código implementa as fórmulas deste briefing e não inventa outras. |

---

## 1. O teste: o que queremos descobrir

**Hipótese:** um fotógrafo autônomo usa toda semana, e pagaria R$ 59/mês, por uma ferramenta que diz **quanto cobrar** por pacote e **se o negócio fechou o mês no azul**, pagando o salário dele, com os leads organizados no mesmo lugar.

**Duração:** 6 semanas de uso real, pra pegar pelo menos um fechamento de mês completo.

**Participantes:** a cliente beta + **3 a 5 fotógrafos da carteira da agência**. Uma pessoa só não valida um produto; quatro já mostram um padrão.

**Critérios de sucesso** (definidos antes, pra não mudar a régua depois):

1. Cadastra custos, equipamentos e pelo menos 3 pacotes ou campanhas na primeira semana.
2. Registra no CRM pelo menos 80% dos leads que chegam (conferir com o WhatsApp dela).
3. Abre o app 3 ou mais vezes por semana nas semanas 3 a 6.
4. Fecha o mês no financeiro (todas as entradas e saídas lançadas).
5. Muda pelo menos um preço ou uma decisão por causa do que o app mostrou.
6. **Sinal definitivo:** no fim do teste, pelo menos metade dos participantes paga a primeira mensalidade.

**Critério de parada:** se até a semana 3 a maioria parou de abrir o app, a gente conversa com cada um antes de construir mais qualquer coisa (agenda, proposta etc.).

---

## 2. Navegação do app

Menu com 5 itens (celular: barra inferior; computador: lateral):

1. **Início** — painel do dia
2. **Leads** — CRM
3. **Preços** — pacotes, campanhas temáticas e calculadora rápida
4. **Financeiro** — lançamentos e fluxo de caixa do mês
5. **Ajustes** — identidade, plano, sair

Login, recuperação de senha, termos, privacidade, tema/identidade e painel da plataforma continuam os da v1.

---

## 3. Módulo Preços (precificação)

É o diferencial do produto e não depende dos outros módulos, por isso é construído primeiro. A tela tem 4 abas: **Base do negócio · Pacotes · Campanhas · Calculadora rápida**.

### 3.1 Base do negócio

**Dados gerais** (uma vez, editável):

| Campo | Padrão | Regra |
|---|---|---|
| Regime tributário | — | MEI / Simples Nacional / Pessoa Física |
| Imposto sobre a venda (%) | 10 | 0 a 50 (MEI que paga só o DAS fixo: 0, e o DAS entra como custo fixo) |
| Comissão de venda (%) | 0 | 0 a 50 |
| Taxa administrativa / cartão (%) | 5 | 0 a 20 |
| Margem de lucro (%) | 30 | 0 a 500 (é sobre o custo, igual à planilha) |
| Seu salário (pró-labore) (R$/mês) | — | ≥ 0 |
| Horas disponíveis por dia | 6 | > 0 (só pra calculadora rápida) |
| Dias trabalhados por semana | 5 | 1 a 7 (só pra calculadora rápida) |

Os 4 percentuais são o **padrão**: cada pacote ou campanha nasce com eles e pode mudar.

**Custos fixos mensais** (lista livre): nome, valor mensal, dia do vencimento (1 a 28), ativo.
- No primeiro acesso aparecem as linhas da planilha, com valor zerado: água, energia, aluguel, telefone, internet, combustível, capacitação, sistemas (Adobe etc.), segurança, marketing, folha de pagamento (e DAS, se for MEI).
- **"Seu salário (pró-labore)"** aparece sempre como uma linha fixa, com o valor dos dados gerais. **O pró-labore é salário, não sobra de caixa.**

**Equipamentos:** nome, valor de compra, vida útil em meses (padrão 60, como na planilha), valor de revenda no fim (opcional, padrão 0), data de compra.

### 3.2 Fórmulas da base

```
custos_fixos_mes   = Σ custos fixos ativos + prolabore
depreciacao_mes    = Σ (valor_compra − valor_revenda) / vida_util_meses     [equipamentos ativos]
base_rateio        = custos_fixos_mes + depreciacao_mes
```

> **Diferença para a planilha:** a planilha rateia só os custos fixos, e a depreciação aparece apenas no fluxo de caixa. Aqui a depreciação também entra no rateio, porque senão nenhum pacote paga a próxima câmera.

### 3.3 Pacotes (o motor principal, "Modelo B" da planilha)

**Campos:**
- Nome, entregáveis (texto).
- **Limite operacional:** quantos desses pacotes você consegue entregar por mês mantendo seu padrão de qualidade. É inteiro e maior que 0. Ex.: 10 ensaios simples, mas só 3 "Relicário".
- **Custos do pacote**, em grupos. Cada item tem nome, valor unitário e quantidade (a planilha usa, por exemplo, deslocamento 60 × 3):
  - Equipe: 1º fotógrafo, 2º fotógrafo, assistente, editor de foto, editor de vídeo
  - Deslocamento
  - Extras (ex.: Extra Plano Gestante, Vídeomaker)
  - Kit de boas-vindas
  - Embalagem e entrega
  - Outros
- Percentuais: margem, comissão, imposto, taxa (vêm do padrão, editáveis).
- **Preço final cobrado:** opcional, é a linha "VENDA" da planilha. Se ficar em branco, vale o preço a prazo calculado. O app guarda os dois.

**Fórmulas** (por dentro: o que sai do preço é calculado sobre o preço final):

```
custo_itens      = Σ (valor_unitario × quantidade)
cfo              = base_rateio / limite_operacional            ← custo fixo rateado por capacidade
custo_total      = custo_itens + cfo
com_margem       = custo_total × (1 + margem/100)

preco_a_vista    = com_margem / (1 − (comissao + imposto) / 100)
preco_a_prazo    = com_margem / (1 − (comissao + imposto + taxa) / 100)
preco_minimo     = custo_total / (1 − (comissao + imposto + taxa) / 100)   ← sem lucro nenhum

preco_cobrado    = preco_final ?? preco_a_prazo
descontos        = preco_cobrado × (comissao + imposto + taxa) / 100       ← pior caso: cliente pagou no cartão
lucro            = preco_cobrado − descontos − custo_total
lucratividade    = lucro / preco_cobrado                                   ← % do preço
margem_real      = lucro / custo_total                                     ← % sobre o custo (compara com a margem pedida)

contribuicao     = preco_cobrado × (1 − (comissao + imposto + taxa)/100) − custo_itens
pacotes_p_fixos  = teto( base_rateio / contribuicao )   ← quantos por mês pagam TODOS os custos fixos sozinhos
```

**O que a tela mostra por pacote:**
- Preço à vista, preço a prazo, preço mínimo e o preço cobrado.
- Lucro, lucratividade e **margem real × margem pedida** (ex.: "você pediu 30%, está tendo 21,6%").
- **Semáforo do preço cobrado:**
  - vermelho se está abaixo do mínimo;
  - amarelo se está entre o mínimo e o preço a prazo;
  - verde se está no preço a prazo ou acima.
- Se `contribuicao ≤ 0`: "**Cada pacote dá prejuízo**, o preço não cobre nem os custos do próprio pacote."
- Se `pacotes_p_fixos > limite_operacional`: "Mesmo no seu limite de X por mês, esse pacote sozinho não paga seus custos fixos."
- Botão "Usar preço sugerido": preenche o preço final com o preço a prazo, arredondado pra cima de R$ 10 em R$ 10.
- **Resumo no topo da aba:** custos fixos do mês, depreciação do mês, base do rateio.

### 3.4 Campanhas temáticas (Natal, Dia das Mães, Páscoa…)

É um pacote com três coisas a mais, pensado pra ensaio em que o fotógrafo **investe em cenário**:

| Campo | Regra |
|---|---|
| Período (início e fim) | fim ≥ início |
| Vagas que vai abrir | inteiro > 0 |
| Investimento da campanha (lista livre) | cenário, objetos de cena, aluguel de espaço, anúncios, outros |
| Vai reaproveitar o cenário em quantas campanhas? | inteiro ≥ 1, padrão 1 (ex.: o cenário de Natal serve 2 anos → 2) |

O limite operacional aqui é o de **sessões desse tipo por mês** (minissessões costumam ter limite alto).

```
investimento_nesta   = Σ investimento / usos_do_cenario
cenario_por_sessao   = investimento_nesta / vagas
custo_total          = custo_itens + cfo + cenario_por_sessao        ← o resto das fórmulas é igual ao pacote

sobra_p_cenario      = preco_cobrado × (1 − (comissao + imposto + taxa)/100) − custo_itens − cfo
sessoes_p_cenario    = teto( investimento_nesta / sobra_p_cenario )
```

**A tela mostra**, além do que o pacote mostra:
- "**Você precisa vender N sessões pra o cenário se pagar**" (de V vagas).
- Se `sessoes_p_cenario > vagas`: alerta "Com as vagas que você abriu, o cenário não se paga. Suba o preço ou abra mais vagas."
- Se `sobra_p_cenario ≤ 0`: alerta "Nesse preço o cenário nunca se paga."
- Depois do Financeiro (Fase 3), a tela também mostra quanto já foi vendido. Os leads fechados com essa campanha contam como vagas vendidas, e as entradas ligadas a ela somam o faturamento.

### 3.5 Calculadora rápida ("Modelo A" da planilha)

Pra estimar uma sessão avulsa sem montar pacote. **Não salva nada.**

```
custo_hora        = base_rateio / (horas_por_dia × dias_por_semana × 4)
custo_sessao      = horas_da_sessao × custo_hora + deslocamento + alimentacao + outros
preco_venda       = custo_sessao × markup                         ← markup padrão 2
custo_variavel    = preco_venda × (taxa + imposto + comissao) / 100
venda_liquida     = preco_venda − custo_variavel
lucro_liquido     = venda_liquida − custo_sessao
lucratividade     = lucro_liquido / preco_venda
```

A pessoa também pode digitar um preço no lugar do markup, e aí a calculadora mostra o lucro e a lucratividade desse preço.

### 3.6 Validações e casos de borda

- `limite_operacional`, `vagas`, `usos_do_cenario`, `vida_util_meses` e horas/dias da calculadora ≤ 0 bloqueiam o cálculo, com mensagem dizendo o que falta.
- `comissao + imposto + taxa ≥ 100` bloqueia ("os percentuais passam de 100%, o preço ficaria infinito"). Acima de 50% aparece só um aviso.
- `valor_revenda > valor_compra` bloqueia o salvamento.
- Campanha com fim antes do início bloqueia o salvamento.
- Pacote ou campanha usado em lead ou lançamento não é apagado: é desativado (`ativo = false`).
- Sem custos fixos cadastrados, o app calcula mesmo assim, mas mostra "Cadastre seus custos fixos, senão o preço não paga suas contas".

### 3.7 Exemplos de referência (viram testes automatizados)

**Base.** Os custos fixos são ilustrativos; a depreciação e o pró-labore são os da planilha.

| Item | Valor |
|---|---|
| Custos fixos: aluguel 800 + energia 150 + internet/telefone 150 + sistemas 180 + combustível 200 + marketing 300 + capacitação 100 | R$ 1.880,00 |
| Pró-labore | R$ 2.500,00 |
| `custos_fixos_mes` | **R$ 4.380,00** |
| Equipamento: 12.000 / 60 (`depreciacao_mes`) | **R$ 200,00** |
| `base_rateio` | **R$ 4.580,00** |

Percentuais em todos os exemplos: margem 30%, comissão 10%, imposto 10%, taxa 5%.

**Pacote "As quatro estações"** (itens da planilha: deslocamento 60 × 3 = 180, Extra Plano Gestante 180 × 3 = 540, kit 130, embalagem + entrega 150). Limite operacional 8/mês, preço final R$ 2.550.

| Saída | Valor esperado |
|---|---|
| custo_itens | R$ 1.000,00 |
| cfo | 4.580 / 8 = **R$ 572,50** |
| custo_total | **R$ 1.572,50** |
| preço à vista | 2.044,25 / 0,80 = **R$ 2.555,31** |
| preço a prazo | 2.044,25 / 0,75 = **R$ 2.725,67** |
| preço mínimo | 1.572,50 / 0,75 = **R$ 2.096,67** |
| semáforo (cobra 2.550) | **amarelo** |
| lucro | 2.550 − 637,50 − 1.572,50 = **R$ 340,00** |
| lucratividade / margem real | **13,33%** / **21,62%** (pediu 30%) |
| pacotes pra pagar os fixos | teto(4.580 / 912,50) = **6** (≤ 8, sem alerta) |
| *comparação: cascata da planilha* | *R$ 2.597,22, perto dos R$ 2.550 que ela cobra hoje* |

**Campanha "Minissessão de Natal"**:
- Itens: edição 40 + impressão/brinde 25.
- Limite operacional 40/mês, 20 vagas, preço final R$ 390.
- Investimento: cenário 1.200 + objetos 300 + anúncios 300, reaproveitado em 2 campanhas.

| Saída | Valor esperado |
|---|---|
| investimento_nesta | 1.800 / 2 = **R$ 900,00** |
| cenario_por_sessao | 900 / 20 = **R$ 45,00** |
| cfo | 4.580 / 40 = **R$ 114,50** |
| custo_total | 65 + 114,50 + 45 = **R$ 224,50** |
| preço à vista / a prazo / mínimo | **R$ 364,81 / R$ 389,13 / R$ 299,33** |
| semáforo (cobra 390) | **verde** |
| lucro por sessão | 390 − 97,50 − 224,50 = **R$ 68,00** |
| sobra_p_cenario | 292,50 − 65 − 114,50 = **R$ 113,00** |
| sessões pra pagar o cenário | teto(900 / 113) = **8 de 20 vagas** |

**Calculadora rápida:** 6 h × 5 dias × 4 = 120 h. Sessão de 3 h, deslocamento 60, alimentação 30, markup 2.

| Saída | Valor esperado |
|---|---|
| custo_hora | 4.580 / 120 = **R$ 38,17** |
| custo_sessao | **R$ 204,50** |
| preço de venda | **R$ 409,00** |
| custo variável (25%) | **R$ 102,25** |
| lucro / lucratividade | **R$ 102,25 / 25%** |

---

## 4. Módulo Leads (CRM)

### 4.1 Pipeline

`Novo` → `Contato iniciado` → `Proposta enviada` → `Negociação` → **`Fechado`** ou **`Perdido`**

- **Celular:** lista com abas por etapa e contador em cada uma.
- **Computador:** colunas (kanban). Mudança de etapa por botão "Avançar"; arrastar é opcional.

### 4.2 Ficha do lead

| Campo | Regra |
|---|---|
| Nome | obrigatório |
| WhatsApp | obrigatório; guardado só com dígitos, com DDI 55 |
| Instagram, e-mail | opcionais |
| Origem | Instagram / Indicação / Site / WhatsApp / Outro |
| Pacote ou campanha de interesse | escolhido entre os cadastrados em Preços |
| Data prevista do ensaio | opcional |
| Valor estimado | pré-preenchido com o preço cobrado do pacote, editável |
| Próximo follow-up | data |
| Observações | texto livre |

**Histórico automático:** criação, cada mudança de etapa e cada follow-up concluído viram eventos com data. O fotógrafo também adiciona notas livres.

**Botão WhatsApp:** abre `wa.me/<número>` com a mensagem "Oi, <primeiro nome>! Aqui é <nome do negócio>, tudo bem?".

### 4.3 Follow-up

- O Início mostra **"Follow-ups de hoje"** e **"Atrasados"** (em vermelho).
- Ao marcar como feito, o app pede a próxima data, ou "sem próximo".
- Sem e-mail e sem push no teste: o lembrete é dentro do app.

### 4.4 Fechar negócio (liga o CRM ao financeiro)

Ao mover para **Fechado**, abre um formulário obrigatório:

- Valor fechado.
- Pacote ou campanha.
- Data da sessão.
- Condição de pagamento:
  - **à vista**: 1 entrada integral;
  - **sinal + saldo**: sinal em % (padrão 30%) com vencimento em uma data, saldo com vencimento na data da sessão.
- Forma de pagamento prevista: Pix, cartão, dinheiro ou transferência.

Ao confirmar:
- O app cria as **entradas previstas** no financeiro (grupo Receitas operacionais, categoria "Receita de serviços"), ligadas ao lead e ao pacote ou campanha.
- Se o valor fechado estiver **abaixo do preço mínimo** do pacote, aparece um aviso antes de salvar: "Você está fechando R$ X abaixo do seu mínimo. Confirmar mesmo assim?".

**Mover para Perdido** pede o motivo: preço, data indisponível, parou de responder, escolheu outro fotógrafo ou outro.

**Reabrir um lead fechado:** apaga as entradas dele ainda **previstas**. As já **recebidas** ficam, e o app avisa.

### 4.5 Métricas do CRM (do mês)

- Leads novos no mês.
- Taxa de conversão = fechados ÷ (fechados + perdidos), contando pela data de fechamento. Leads em aberto não entram na conta.
- Valor fechado no mês.
- Motivo de perda mais comum.

---

## 5. Módulo Financeiro — fluxo de caixa mensal (a DRE da planilha)

Controla **só o dinheiro do negócio (PJ)**. Regime de caixa: um lançamento só conta no mês em que foi **pago/recebido**.

### 5.1 Grupos e categorias (os mesmos da planilha)

| Grupo | Sinal | Categorias sugeridas (a pessoa pode criar outras) |
|---|---|---|
| Receitas operacionais | + | Receita de serviços, Receita de produtos |
| Custo direto | − | Compra de produtos/álbuns, Embalagem, Frete sobre compras |
| Custo variável | − | Comissão sobre vendas, Imposto (ISS/MEI/Simples), Tarifa de cartão, Tarifa de boleto, Custo de ensaio teste, Café, Voucher VIP |
| Custos fixos | − | Água, Energia, Aluguel, Telefone, Internet, Combustível, Capacitação, Sistemas, Segurança, Marketing, Folha de pagamento, **Seu salário (pró-labore)** |
| Receitas não operacionais | + | Venda de equipamento, Reembolso de frete, Aporte do sócio |
| Despesas não operacionais | − | Amortização de empréstimo, Juros, IOF, **Investimento (ex.: cenário de campanha)**, Retirada extra do sócio |

**Depreciação:** não é lançamento. O app calcula todo mês a partir dos equipamentos e mostra como linha automática em Despesas não operacionais, igual à planilha (`-12000/60`).

### 5.2 Lançamentos

| Campo | Regra |
|---|---|
| Grupo + categoria | obrigatórios; o grupo define o sinal |
| Descrição, valor | obrigatórios; valor > 0 (sempre positivo; o sinal vem do grupo) |
| Status | **previsto** / **pago** |
| Vencimento, pago em | datas; "pago em" é obrigatório quando status = pago |
| Forma de pagamento | Pix / cartão / dinheiro / transferência / boleto |
| Parcela | integral / sinal / saldo (vindo do CRM) |
| Lead, pacote/campanha | opcionais, servem pra acompanhar a campanha |

**Automatismos:**
- **Fechar lead** cria as entradas previstas (seção 4.4).
- **"Lançar custos fixos do mês"** (um botão) cria os custos fixos do mês como previstos, cada um no seu dia de vencimento, com o pró-labore incluído. Não duplica se já foram lançados naquele mês.
- **Entrada no cartão marcada como recebida** cria junto a "Tarifa de cartão" (Custo variável, paga) = valor × taxa. O valor da tarifa pode ser editado.
- **Investimento de campanha:** ao cadastrar uma campanha, o app oferece lançar o investimento como previsto em Despesas não operacionais → Investimento, ligado à campanha.

**Regra PF/PJ:** o formulário de saída pergunta "É uma conta pessoal?" (mercado, aluguel de casa, escola...). Se sim, não vira custo do negócio. O app mostra o aviso "Conta pessoal se paga com o seu salário, não com o caixa da empresa". Se mesmo assim o dinheiro saiu da conta PJ, lança como **Retirada extra do sócio**, e isso aparece em vermelho no mês.

### 5.3 Fluxo de caixa do mês (em cascata, igual à planilha)

```
receitas_op          = Σ Receitas operacionais pagas no mês
margem               = receitas_op − Σ Custo direto
margem_contribuicao  = margem − Σ Custo variável
margem_liquida       = margem_contribuicao − Σ Custos fixos                       ← já inclui o pró-labore
resultado_mes        = margem_liquida + Σ Receitas não op. − Σ Despesas não op. − depreciacao_mes

saldo_inicial(mês)   = saldo_inicial_informado + Σ resultado_mes de todos os meses anteriores (desde o mês de início)
saldo_final(mês)     = saldo_inicial(mês) + resultado_mes
reserva_equipamento  = Σ depreciacao_mes desde o mês de início
dinheiro_na_conta    = saldo_final + reserva_equipamento                          ← o que o extrato deve mostrar
```

- **Saldo encadeado:** o saldo inicial de cada mês é calculado a partir do histórico, e não guardado. Se a pessoa corrigir um lançamento de janeiro, fevereiro em diante se ajusta sozinho.
- **Saldo de partida:** no primeiro uso, o app pede "quanto tem hoje na conta do negócio" e o mês de início.

**A tela mostra:**
- A cascata linha a linha, com os subtotais em destaque, e cada grupo abre pra mostrar as categorias. Navegação entre meses.
- **Dinheiro na conta:** "Seu extrato deve mostrar R$ X. R$ Y disso é a reserva pra trocar equipamento."
- **Fôlego:** "Seu saldo cobre N meses de custos fixos" (`teto_para_baixo(saldo_final / custos_fixos_mes)`; se for 0, mostra "menos de 1 mês").
- **Previsto do mês:** entradas e saídas ainda previstas com vencimento no mês.

**Alertas:**
- `margem_liquida < 0`: "O faturamento deste mês não pagou seus custos fixos (incluindo seu salário)."
- Retirada extra do sócio > 0: "Você tirou R$ X além do seu salário."
- Imposto % > 0, receitas_op > 0 e nenhum lançamento de imposto no mês: "Você recebeu R$ X. Separe R$ Y de imposto."

### 5.4 Exemplo de referência (mesmo negócio da seção 3.7, teste automatizado)

Primeiro mês de uso, com saldo de partida de R$ 5.000:
- Receitas: 1 pacote "As quatro estações" de R$ 2.550 (cartão) e 4 minissessões de Natal de R$ 390 (Pix).
- Custo direto: álbum/embalagem 150 + kit 130.
- Custo variável: tarifa de cartão 5% de 2.550 e imposto 10% das receitas.
- Custos fixos: 1.880 + pró-labore 2.500, todos pagos.
- Despesas não operacionais: investimento no cenário de Natal de R$ 1.800, pago.

| Linha | Cálculo | Valor esperado |
|---|---|---|
| receitas_op | 2.550 + 4 × 390 | **R$ 4.110,00** |
| margem | − 280 | **R$ 3.830,00** |
| margem_contribuicao | − (127,50 + 411,00) | **R$ 3.291,50** |
| margem_liquida | − 4.380 | **−R$ 1.088,50** → alerta |
| resultado_mes | − 1.800 − 200 (depreciação) | **−R$ 3.088,50** |
| saldo_final | 5.000 − 3.088,50 | **R$ 1.911,50** |
| dinheiro_na_conta | 1.911,50 + 200 | **R$ 2.111,50** |
| fôlego | 1.911,50 / 4.380 | **menos de 1 mês** |
| saldo_inicial do mês seguinte | | **R$ 1.911,50** |

---

## 6. Início (painel)

- Follow-ups de hoje e atrasados, com botão de WhatsApp.
- Leads por etapa (números clicáveis).
- Mês atual: recebido × previsto e margem líquida até agora.
- **Campanhas em andamento:** "Natal: 5 de 20 vagas vendidas, faltam 3 pra o cenário se pagar".
- **Pacotes com preço abaixo do mínimo** (semáforo vermelho), com link pra Preços.
- Primeiro acesso: **checklist de configuração** (dados gerais → custos fixos → equipamentos → primeiro pacote → saldo de partida → primeiro lead). Sem dados de exemplo: a pessoa usa os números dela desde o primeiro dia.

---

## 7. Banco de dados (Supabase)

O inquilino continua sendo a tabela **`estudios`** (1 por fotógrafo, com `dono_id`, `slug`, identidade e `plano_ativo`). As tabelas `salas`, `extras`, `bloqueios` e `reservas` ficam intocadas pra quando a agenda voltar.

**Regras gerais:**
- Todo valor em dinheiro é guardado em **centavos (integer)**.
- Percentuais em `numeric(5,2)`.
- Datas em `date`, no fuso `America/Sao_Paulo`.
- Todas as tabelas têm `estudio_id` e RLS "só o dono do estúdio lê e escreve".

```
config_negocio (1:1 com estudios)
  estudio_id pk/fk, regime ('mei'|'simples'|'pf'),
  imposto_pct, comissao_pct, taxa_pct, margem_pct numeric,
  prolabore_centavos int, horas_dia numeric, dias_semana int,
  saldo_inicial_centavos int, mes_inicio date, updated_at

custos_fixos
  id, estudio_id, nome, valor_mensal_centavos int, dia_vencimento int (1–28), ativo bool, created_at

equipamentos
  id, estudio_id, nome, valor_compra_centavos int, valor_revenda_centavos int default 0,
  vida_util_meses int check (> 0) default 60, data_compra date, ativo bool, created_at

servicos                                   -- pacotes E campanhas
  id, estudio_id, tipo ('pacote'|'campanha'), nome, entregaveis text,
  limite_operacional int check (> 0),
  itens jsonb  -- [{ "grupo": "equipe|deslocamento|extra|kit|embalagem|outro",
               --    "nome": "Deslocamento", "valor_unit_centavos": 6000, "quantidade": 3 }]
  margem_pct, comissao_pct, imposto_pct, taxa_pct numeric,
  preco_final_centavos int null,           -- a linha "VENDA"; null = usa o preço a prazo
  -- só campanha:
  inicio date, fim date, vagas int, usos_cenario int default 1,
  investimento jsonb  -- [{ "nome": "Cenário", "valor_centavos": 120000 }]
  ativo bool, created_at

leads
  id, estudio_id, nome, whatsapp, instagram, email, origem, servico_id fk null,
  etapa ('novo'|'contato'|'proposta'|'negociacao'|'fechado'|'perdido'),
  data_prevista date, valor_estimado_centavos int, valor_fechado_centavos int,
  data_sessao date, motivo_perda, proximo_followup date, observacoes,
  fechado_em date, created_at, updated_at

lead_eventos
  id, estudio_id, lead_id fk (on delete cascade), tipo ('criado'|'etapa'|'nota'|'followup'),
  texto, created_at

lancamentos
  id, estudio_id,
  grupo ('receita_op'|'custo_direto'|'custo_variavel'|'custo_fixo'|'receita_nao_op'|'despesa_nao_op'),
  categoria text, descricao, valor_centavos int check (> 0),
  status ('previsto'|'pago'), vencimento date, pago_em date,
  forma_pagamento, parcela ('integral'|'sinal'|'saldo'),
  lead_id fk null, servico_id fk null,
  custo_fixo_id fk null,                    -- gerado pelo "lançar custos fixos do mês"
  origem_id fk null (lancamentos),          -- ex.: a tarifa de cartão aponta pra entrada que a gerou
  created_at
  unique (custo_fixo_id, mês do vencimento) -- não duplica custo fixo no mesmo mês
```

**Transação no banco:** fechar negócio (atualizar lead + criar entradas + registrar evento) roda numa função `fechar_lead(...)` (RPC), pra não ficar metade salvo se a internet cair.

---

## 8. Regras técnicas pra "rodar perfeitamente"

- **Cálculos num arquivo só** (`src/calculos.js`): funções puras sem acesso ao banco, cobertas por testes (Vitest) com todos os exemplos das seções 3.7 e 5.4. As telas só chamam essas funções.
- **Arredondamento:** calcular com precisão total e arredondar pra centavo só no resultado final (meio pra cima). Exibir em pt-BR (`R$ 1.278,45`).
- **Divisão por zero:** nenhuma fórmula divide sem checar o divisor. Quando falta dado, a tela mostra o que falta em vez de "NaN" ou "Infinity".
- **Organização do código:** um módulo por área (`src/modulos/leads/`, `precos/`, `financeiro/`, `inicio/`). ✅ feito na Fase 0.
- **Sem dados de exemplo em produção.**
- O portão de plano (`portao.js`) continua: sem `plano_ativo`, o app mostra a tela de assinatura.

---

## 9. Fases de construção do teste

| Fase | Entrega | Pronto quando |
|---|---|---|
| **0. Reorganização** ✅ | Menu de 5 itens, código por módulo, Vitest, cadastro só de fotógrafo | App abre, faz login, navega pelos 5 itens no celular e no computador |
| **1. Preços** | Base do negócio, pacotes, campanhas temáticas, calculadora rápida, semáforo | Testes dos 3 exemplos da seção 3.7 passam; a cliente beta cadastra os pacotes reais dela |
| **2. Leads** | Pipeline, ficha, histórico, follow-up, WhatsApp, perdido com motivo | Cadastrar, avançar, perder e reabrir um lead funciona |
| **3. Financeiro** | Lançamentos por grupo, automatismos, fechar negócio (RPC), regra PF/PJ, fluxo de caixa em cascata com saldo encadeado | Teste do exemplo 5.4 passa; fechar um lead gera as entradas certas; a campanha mostra as vagas vendidas |
| **4. Início** | Painel, campanhas em andamento, checklist de primeiro acesso, métricas do CRM | Um fotógrafo novo consegue se configurar sozinho, sem ajuda |
| **F. (opcional)** | Formulário público de lead (`studioslot.app.br/<slug>/contato`) com as perguntas do formulário conversacional do site da cliente, gravando direto como lead `Novo` via RPC | Lead enviado pelo site aparece no CRM |

Depois da Fase 4: começam as 6 semanas de teste.

---

## 10. Fora do escopo do teste

- Agenda (volta na próxima etapa se o teste passar)
- Propostas comerciais · contratos com assinatura · galeria · portal do cliente · pagamento com split
- IA de atendimento · notificações por e-mail/WhatsApp · mais de um usuário por conta · inglês/dólar · integração bancária automática
- **Vindos da planilha, ficam pra Versão 2:**
  - Clube de Memórias (assinatura em camadas Pocket/Standard/Luxo)
  - Catálogo de fornecedores de álbum com comparação (RED LAB, Silcolor, Inova, LolyBel, Casarte)
  - Construção de cenários anuais (pessimista/provável/otimista)
