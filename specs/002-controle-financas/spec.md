# Feature Specification: Controle de Finanças (Central de Comando)

**Feature Branch**: `002-controle-financas`

**Created**: 2026-05-19

**Status**: Draft

**Input**: User description: "Eu quero criar uma página totalmente nova nesta Dashboard que estou criando que se chama temporariamente de 'Central de Comando'. Essa página deve ser totalmente separada da página que existe atualmente 'ForestOS'. Os novos arquivos de código e estrutura de pastas também devem ficar separadas, sendo necessário somente integrar tudo depois para que ambas as páginas existam na mesma Dashboard. Essa nova página será para 'Controle de Finanças' e servirá para colocar todos os meus ganhos e despesas. A partir disso, gerar diversos gráficos, tabelas, visualizações e analises de como estão meus gastos e meus ganhos, para permitir eu tomar medidas para melhorar a minha condição financeira ao longo do tempo."

## Visão Geral

Nova área da dashboard, paralela e independente da seção ForestOS, dedicada ao
**Controle de Finanças Pessoais**. O usuário cadastra todas as suas receitas e
despesas e a partir desses lançamentos obtém um panorama completo da sua
saúde financeira, com visualizações, comparativos históricos, indicadores
de desempenho e análises que apoiem decisões para melhorar a condição
financeira ao longo do tempo.

A página deve coexistir com ForestOS sob a mesma dashboard (mesma navegação,
mesma autenticação, mesmo sistema visual *grand strategy*), mas com domínio,
dados, telas e fluxos completamente isolados.

## Clarifications

### Session 2026-05-19

- Q: Meta de Poupança — qual a origem do "valor acumulado"? → A: Aportes
  explícitos. O usuário registra ações de "destinar X para a meta Y", que
  alimentam o acumulado da meta. Suporta múltiplas metas concorrentes e
  desacopla o progresso da meta da contabilidade geral de receitas/despesas.
- Q: Lançamentos recorrentes — ocorrências futuras são persistidas ou
  calculadas? → A: Híbrido com persistência sob demanda. Apenas a regra de
  recorrência é persistida; ocorrências futuras são projetadas
  virtualmente como "previstas". Uma ocorrência só é materializada como
  lançamento real no momento em que o usuário interage com ela (edição
  pontual, confirmação de realização ou exclusão específica), ficando
  registrada como exceção vinculada à série.
- Q: Lançamentos previstos — quando viram realizados? → A: Automático na
  data, com flag opcional de não-confirmação. Ao alcançar/passar a data do
  lançamento, ele passa por padrão a contar como realizado e impacta o
  saldo do período. O usuário pode marcar uma ocorrência específica como
  "não confirmada" caso a movimentação esperada não tenha ocorrido,
  mantendo-a como prevista (e fora do saldo realizado) até resolução.
- Q: Heatmap — qual a visualização prioritária? → A: Heatmap **mês ×
  categoria** (últimos 12 meses), com células coloridas pelo total gasto.
  Calendário diário (dia × valor) está fora do escopo da v1.
- Q: Parâmetros numéricos de painel e insights — quais defaults? → A:
  Defaults fixos na v1, sem UI de configuração. **Top N de maiores
  despesas = 5**. **Insight de anomalia de categoria**: variação ≥ 25%
  versus a média dos últimos 3 meses. **Manutenção de taxa de poupança
  positiva**: 3 meses consecutivos. Esses valores são constantes do
  sistema; ajustes ficam para evolução pós-v1.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Registro Rápido de Lançamentos Financeiros (Priority: P1)

Como usuário da dashboard, eu quero registrar de forma rápida cada receita e
cada despesa (com data, valor, categoria e descrição) para que todas as
análises e visualizações financeiras sejam alimentadas por dados reais e
atualizados.

**Why this priority**: Sem lançamentos não existe nenhuma análise. Este é o
alicerce de todo o restante do controle de finanças e, isolado, já entrega
valor (uma trilha de registros financeiros consultável).

**Independent Test**: É possível abrir a página, cadastrar uma receita e uma
despesa, ver ambas listadas em uma tabela de lançamentos com filtros básicos
de mês/categoria e ver os totais de entradas, saídas e saldo do mês recalcular
em tempo real.

**Acceptance Scenarios**:

1. **Given** o usuário está na página de Controle de Finanças sem nenhum
   lançamento, **When** ele preenche e confirma um novo lançamento de receita
   (data, valor, categoria, descrição), **Then** o lançamento aparece na lista
   do mês e o total de receitas e o saldo do mês são atualizados.
2. **Given** o usuário possui lançamentos no mês, **When** ele edita o valor
   ou a categoria de um lançamento existente, **Then** os totais, o gráfico
   de evolução e o detalhamento por categoria refletem a alteração sem exigir
   recarregamento manual.
3. **Given** o usuário possui um lançamento incorreto, **When** ele aciona a
   exclusão e confirma, **Then** o lançamento desaparece da lista e todos os
   indicadores derivados são recalculados.
4. **Given** o usuário aplica filtros por intervalo de datas, tipo
   (receita/despesa) e categoria, **When** os filtros são aplicados, **Then**
   a tabela e os totais agregados respeitam o conjunto filtrado.

---

### User Story 2 — Painel Mensal de Saúde Financeira (Priority: P1)

Como usuário, eu quero abrir a página e ver imediatamente o panorama do mês
corrente — total de receitas, total de despesas, saldo, taxa de poupança,
top categorias de gasto e evolução diária — para entender em segundos se
estou no rumo certo.

**Why this priority**: É a tela de impacto visual e a principal razão de
existir da página. Junto com a P1, forma o MVP funcional.

**Independent Test**: Com um conjunto mínimo de lançamentos no mês, abrir a
página e visualizar: (a) cartões de indicadores do mês, (b) gráfico de
evolução de saldo acumulado dia a dia, (c) gráfico de composição de despesas
por categoria, (d) lista das 5 maiores despesas do mês.

**Acceptance Scenarios**:

1. **Given** o usuário tem lançamentos no mês corrente, **When** abre a
   página, **Then** vê cartões com Receitas, Despesas, Saldo, Taxa de
   Poupança (poupado / receita) e variação percentual frente ao mês anterior.
2. **Given** existem lançamentos diários no mês, **When** o painel é
   renderizado, **Then** um gráfico de evolução do saldo acumulado dia a dia
   é exibido com linha de tendência sobre o mês.
3. **Given** o usuário tem despesas em várias categorias, **When** o painel
   é renderizado, **Then** um gráfico de composição (donut ou treemap)
   mostra a distribuição percentual e absoluta por categoria.
4. **Given** o usuário deseja explorar, **When** clica em uma categoria do
   gráfico de composição, **Then** a lista de lançamentos é filtrada
   automaticamente por essa categoria no mês.

---

### User Story 3 — Análise Histórica e Tendências (Priority: P2)

Como usuário, eu quero comparar meses e anos e visualizar tendências de
receita, despesa e poupança ao longo do tempo para identificar padrões
sazonais, regressões e progressos.

**Why this priority**: Decisões de melhoria financeira dependem de leitura
histórica; é onde o usuário começa a "tomar medidas para melhorar a condição
financeira ao longo do tempo".

**Independent Test**: Com pelo menos três meses de lançamentos, é possível
ver um gráfico de linhas/barras com receita × despesa × poupança por mês,
trocar a granularidade entre meses e anos e comparar dois períodos lado a
lado.

**Acceptance Scenarios**:

1. **Given** existem dados de múltiplos meses, **When** o usuário acessa a
   visão histórica, **Then** um gráfico exibe receita, despesa e saldo mês a
   mês com possibilidade de alternar para visão anual.
2. **Given** o usuário escolhe "comparar períodos", **When** seleciona dois
   meses (ou dois anos), **Then** uma visualização comparativa apresenta as
   variações absolutas e percentuais por categoria.
3. **Given** existe sazonalidade nos gastos, **When** o usuário abre a análise
   anual, **Then** consegue identificar visualmente meses recorrentemente
   mais caros por meio do heatmap **mês × categoria** (últimos 12 meses),
   onde linhas representam categorias de despesa e colunas os meses, com
   intensidade da célula proporcional ao total gasto.

---

### User Story 4 — Categorização Estruturada e Decomposição de Gastos (Priority: P2)

Como usuário, eu quero organizar receitas e despesas em categorias (e
opcionalmente subcategorias) para conseguir explicar para onde meu dinheiro
está indo e identificar onde cortar.

**Why this priority**: É o que transforma uma lista plana em análise útil.
Sem categorização clara, gráficos viram ruído.

**Independent Test**: É possível criar/editar/excluir categorias,
classificá-las como receita ou despesa, atribuí-las a lançamentos e ver a
decomposição agregada por categoria em qualquer período selecionado.

**Acceptance Scenarios**:

1. **Given** o usuário acessa a gestão de categorias, **When** cria uma nova
   categoria de despesa com nome e cor, **Then** ela passa a estar disponível
   no cadastro de lançamentos e nas visualizações.
2. **Given** existem despesas categorizadas, **When** o usuário abre a
   decomposição de gastos, **Then** vê o gráfico de composição com totais,
   percentuais e ordenação por valor.
3. **Given** o usuário deseja agrupar, **When** atribui subcategoria a uma
   categoria, **Then** a decomposição permite expandir/colapsar entre o nível
   categoria e subcategoria.

---

### User Story 5 — Transações Recorrentes (Priority: P2)

Como usuário, eu quero cadastrar lançamentos recorrentes (salário, aluguel,
assinaturas) para não precisar redigitá-los todo mês e para que os
indicadores antecipem corretamente as receitas/despesas previstas.

**Why this priority**: Reduz fricção de uso e habilita previsões realistas.
Pode ser entregue após o registro manual estar consolidado.

**Independent Test**: É possível marcar um lançamento como recorrente
(frequência: semanal, mensal, anual), com data de início e fim opcional, e
verificar que as próximas ocorrências aparecem automaticamente no painel
mensal correspondente.

**Acceptance Scenarios**:

1. **Given** o usuário cria um lançamento recorrente mensal de despesa fixa,
   **When** avança o mês na navegação do painel, **Then** a despesa aparece
   no novo mês sem necessidade de novo cadastro.
2. **Given** existe uma recorrência ativa, **When** o usuário a encerra,
   **Then** ocorrências futuras deixam de ser geradas, sem alterar
   lançamentos passados.
3. **Given** uma ocorrência específica de uma recorrência precisa ser
   ajustada, **When** o usuário edita aquele lançamento, **Then** a alteração
   afeta apenas aquela ocorrência (ou, mediante confirmação, toda a série
   futura).

---

### User Story 6 — Orçamentos e Metas (Priority: P3)

Como usuário, eu quero definir um orçamento mensal por categoria e metas de
poupança para acompanhar visualmente o quanto já gastei do planejado e o
quanto falta para atingir cada meta.

**Why this priority**: Acelera a tomada de ação ("estou em 80% do orçamento
de Restaurantes faltando 10 dias do mês"), mas depende da base de
lançamentos e categorias.

**Independent Test**: É possível definir orçamento mensal por categoria e
uma meta de poupança, e ver, durante o mês, barras de progresso por
categoria e a evolução da meta.

**Acceptance Scenarios**:

1. **Given** o usuário define um orçamento mensal para a categoria
   "Restaurantes", **When** acumula gastos nessa categoria, **Then** uma
   barra mostra valor gasto, percentual usado e saldo do orçamento, com
   destaque visual quando ultrapassa 80% e 100%.
2. **Given** existe uma meta de poupança com prazo, **When** o usuário
   registra um aporte explícito (valor, data, opcionalmente origem), **Then**
   o valor acumulado da meta aumenta no valor do aporte, o progresso
   percentual é recalculado e a projeção de conclusão é atualizada com base
   no ritmo médio de aportes.
3. **Given** o usuário possui múltiplas metas ativas em paralelo, **When**
   abre a tela de metas, **Then** vê cada meta com seu próprio acumulado,
   percentual e projeção, sem que aportes de uma afetem o acumulado das
   demais.

---

### User Story 7 — Insights Acionáveis (Priority: P3)

Como usuário, eu quero que a página destaque automaticamente fatos
relevantes — picos de gasto, categorias em alta, redução de receitas, dias
sem lançamento — para que eu não precise procurar onde tomar atitude.

**Why this priority**: É o que diferencia "um dashboard bonito" de "uma
ferramenta que melhora a vida financeira". Vem por último porque depende de
volume histórico de dados.

**Independent Test**: Com pelo menos três meses de dados, uma seção
"Insights do Período" exibe, em linguagem natural, observações baseadas
nos limiares definidos para a v1 (≥ 25% de variação por categoria sobre a
média dos últimos 3 meses, taxa de poupança positiva por ≥ 3 meses
consecutivos, ausência de ocorrência recorrente esperada).

**Acceptance Scenarios**:

1. **Given** uma categoria teve crescimento **≥ 25%** versus a média dos
   últimos 3 meses, **When** o usuário abre o painel, **Then** um cartão de
   insight destaca a anomalia com o valor absoluto e a variação percentual.
2. **Given** o usuário manteve taxa de poupança positiva por **≥ 3 meses
   consecutivos**, **When** abre os insights, **Then** vê uma observação
   de conquista reforçando o padrão.
3. **Given** uma despesa fixa esperada (recorrência) não foi lançada no mês,
   **When** abre o painel após a data prevista, **Then** vê um alerta
   sugerindo lançar ou confirmar a ausência.

---

### Edge Cases

- Mês sem nenhum lançamento: painel deve apresentar estado vazio coerente,
  sem gráficos quebrados, com chamada para registrar o primeiro lançamento.
- Lançamento com valor zero ou negativo: deve ser bloqueado com mensagem
  clara; valores são sempre positivos e o sinal é dado pelo tipo
  (receita/despesa).
- Lançamento em moeda diferente do padrão: fora de escopo na v1
  (única moeda: BRL); ver Assumptions.
- Exclusão de uma categoria com lançamentos associados: deve exigir
  realocação para outra categoria (ou marcação como "Sem categoria"), nunca
  apagar lançamentos.
- Conflito de recorrência: se a regra de recorrência foi editada após
  ocorrências terem sido geradas, o sistema deve preservar ocorrências
  passadas e aplicar a nova regra apenas a futuras.
- Comparação de períodos com volumes muito diferentes (ex.: mês recém-iniciado
  versus mês completo): a UI precisa indicar parcialidade do período para
  evitar leitura enganosa.
- Lançamentos em datas futuras: permitidos e exibidos como "previstos",
  sem afetar o saldo realizado até a data atual. Ao alcançar a data, o
  lançamento passa automaticamente a "realizado" e entra no saldo, salvo
  se o usuário tiver marcado a ocorrência como "não confirmada".
- Despesa/receita prevista que não se concretizou: o usuário pode marcar a
  ocorrência como "não confirmada", reativando o status de prevista (fora
  do saldo realizado) até decidir confirmar, editar ou excluir.

## Requirements *(mandatory)*

### Functional Requirements

**Identidade visual e isolamento**

- **FR-001**: O sistema DEVE oferecer uma nova área da dashboard, distinta de
  ForestOS, acessível pela mesma navegação principal, dedicada exclusivamente
  ao Controle de Finanças.
- **FR-002**: O sistema DEVE manter o domínio de Controle de Finanças isolado
  do domínio ForestOS: dados, telas, fluxos e arquivos de código separados,
  compartilhando apenas a infraestrutura comum da dashboard (autenticação,
  navegação e sistema visual *grand strategy*).
- **FR-003**: Toda a interface DEVE seguir o sistema visual *grand strategy*
  definido na constituição do projeto (paleta, tipografia, molduras e
  ornamentos), sem introduzir estética de SaaS moderno.

**Cadastro e gestão de lançamentos**

- **FR-004**: Usuários DEVEM poder criar lançamentos de receita ou despesa
  informando, no mínimo, tipo, valor, data, categoria e descrição.
- **FR-005**: Usuários DEVEM poder editar e excluir qualquer lançamento já
  registrado, com recálculo imediato de todos os indicadores derivados.
- **FR-006**: O sistema DEVE listar lançamentos com filtros por intervalo de
  datas, tipo (receita/despesa), categoria e busca textual na descrição.
- **FR-007**: O sistema DEVE impedir lançamentos inválidos (valor zero ou
  negativo, data ausente, categoria ausente) com mensagens explícitas.

**Categorias**

- **FR-008**: Usuários DEVEM poder criar, editar e excluir categorias de
  receita e de despesa, com nome e cor associada.
- **FR-009**: O sistema DEVE oferecer um conjunto inicial de categorias
  sugeridas para receita (ex.: Salário, Renda Extra, Investimentos) e despesa
  (ex.: Moradia, Alimentação, Transporte, Saúde, Lazer, Educação,
  Assinaturas, Outros).
- **FR-010**: O sistema DEVE bloquear a exclusão de uma categoria que possua
  lançamentos vinculados sem antes oferecer realocação para outra categoria.
- **FR-011**: O sistema DEVE suportar subcategorias (um nível de aninhamento)
  para permitir decomposição mais fina sem explosão de categorias raiz.

**Lançamentos recorrentes**

- **FR-012**: Usuários DEVEM poder marcar um lançamento como recorrente,
  definindo frequência (semanal, mensal, anual), data de início e data de
  término opcional.
- **FR-013**: O sistema DEVE **projetar virtualmente** as ocorrências futuras
  de lançamentos recorrentes a partir da regra, exibindo-as nas visões
  mensais correspondentes como lançamentos "previstos", **sem persisti-las
  fisicamente** antes de qualquer interação do usuário.
- **FR-013a**: Uma ocorrência projetada DEVE ser **materializada** (criada
  fisicamente como lançamento vinculado à série) somente quando o usuário
  interage com ela — ao editá-la pontualmente, ao confirmá-la como realizada
  ou ao excluí-la individualmente.
- **FR-013b**: O sistema DEVE manter, por série recorrente, um registro de
  **exceções** (ocorrências materializadas individualmente: editadas,
  excluídas ou confirmadas), de modo que a projeção virtual respeite essas
  exceções e não as duplique nem as sobreponha.
- **FR-014**: Edições em uma ocorrência específica DEVEM, por padrão, afetar
  apenas aquela ocorrência (materializada como exceção da série); ao editar
  a série, o sistema DEVE solicitar confirmação e aplicar a alteração às
  ocorrências futuras projetadas, sem alterar lançamentos já materializados
  no passado.

**Painel mensal e indicadores**

- **FR-015**: O painel principal DEVE apresentar, para um mês selecionado:
  total de receitas, total de despesas, saldo, taxa de poupança e variação
  percentual versus mês anterior.
- **FR-016**: O painel DEVE exibir gráfico de evolução do saldo acumulado
  dia a dia no mês selecionado.
- **FR-017**: O painel DEVE exibir um gráfico de composição (donut ou
  treemap) das despesas por categoria, com totais absolutos e percentuais.
- **FR-018**: O painel DEVE exibir a lista das **5 maiores despesas
  individuais** do mês (top 5), ordenadas por valor decrescente.
- **FR-019**: O usuário DEVE poder navegar entre meses (anterior, atual,
  próximo, seleção direta) com recarregamento de todos os indicadores.
- **FR-019a**: O sistema DEVE transicionar automaticamente lançamentos
  previstos para o status "realizado" assim que a data do lançamento for
  alcançada (com base na data atual do sistema), passando a contá-los no
  saldo realizado do período.
- **FR-019b**: O usuário DEVE poder marcar uma ocorrência específica como
  **"não confirmada"**, revertendo-a ao status de prevista (fora do saldo
  realizado) até decisão posterior. Essa marcação aplica-se tanto a
  lançamentos avulsos quanto a ocorrências de séries recorrentes (sendo,
  no segundo caso, registrada como exceção da série conforme FR-013b).
- **FR-019c**: O sistema DEVE distinguir visualmente, em listas e gráficos,
  lançamentos previstos, realizados e não confirmados, e DEVE permitir
  filtrar a visualização por esses status.

**Visão histórica e comparativos**

- **FR-020**: O sistema DEVE oferecer uma visão histórica com gráfico de
  receita, despesa e saldo mês a mês, com possibilidade de alternar
  granularidade entre mensal e anual.
- **FR-021**: O sistema DEVE permitir comparar dois períodos (ex.: dois meses
  ou dois anos) lado a lado, com variações absolutas e percentuais por
  categoria.
- **FR-022**: O sistema DEVE oferecer uma visualização do tipo **heatmap
  mês × categoria** (linhas = categorias de despesa, colunas = meses,
  intensidade da célula = total gasto), cobrindo por padrão os últimos 12
  meses, para apoiar identificação de sazonalidade e crescimento de
  categorias ao longo do tempo.
- **FR-022a**: As células do heatmap DEVEM exibir o valor agregado da
  categoria no mês ao hover/seleção, e o clique em uma célula DEVE
  filtrar a lista de lançamentos para aquela categoria e aquele mês.

**Orçamentos e metas**

- **FR-023**: Usuários DEVEM poder definir orçamento mensal por categoria de
  despesa, com indicadores visuais de uso (cores ou barras) ao atingir 80%,
  100% e ultrapassagem.
- **FR-024**: Usuários DEVEM poder definir metas de poupança com valor-alvo
  e prazo, suportando múltiplas metas concorrentes e isoladas entre si.
- **FR-024a**: Usuários DEVEM poder registrar **aportes explícitos** em uma
  meta (valor, data, descrição opcional). O valor acumulado da meta é a
  soma dos seus aportes; aportes podem ser editados e excluídos com
  recálculo imediato do acumulado e da projeção.
- **FR-024b**: O sistema DEVE exibir, para cada meta, valor-alvo, valor
  acumulado, percentual atingido, valor restante e projeção de data de
  conclusão calculada a partir do ritmo médio de aportes do usuário.

**Insights**

- **FR-025**: O sistema DEVE apresentar uma seção de insights automáticos
  baseada nos dados disponíveis, incluindo, no mínimo:
  - **Anomalia de categoria**: destacar categorias cuja despesa do mês
    corrente esteja **≥ 25% acima** da média dos últimos 3 meses;
  - **Conquista de poupança**: destacar quando a taxa de poupança
    (poupado / receita) tiver sido positiva por **≥ 3 meses consecutivos**;
  - **Ausência de recorrência esperada**: alertar quando uma ocorrência
    de série recorrente não tiver sido confirmada nem materializada após
    a data prevista.
- **FR-025a**: Os limiares e janelas de tempo dos insights (25%, 3 meses,
  3 meses consecutivos) são **constantes do sistema na v1**, sem UI de
  configuração pelo usuário.

**Persistência e integridade**

- **FR-026**: Todos os dados financeiros (lançamentos, categorias,
  recorrências, orçamentos, metas) DEVEM ser persistidos por usuário
  autenticado, isolados por conta.
- **FR-027**: O sistema DEVE tratar e exibir explicitamente estados de
  carregamento, erro e vazio em todas as visualizações, sem falhas
  silenciosas (conforme princípio constitucional V).

### Key Entities

- **Lançamento (Transaction)**: registro individual de movimento financeiro.
  Atributos essenciais: tipo (receita ou despesa), valor, data, descrição,
  categoria, subcategoria (opcional), vínculo opcional com uma série
  recorrente, status (**previsto** | **realizado** | **não confirmado**).
  Status default é derivado da data (futuro → previsto; data alcançada →
  realizado automaticamente, conforme FR-019a), com a marcação "não
  confirmada" como override explícito do usuário.
- **Categoria**: agrupamento de lançamentos por finalidade. Atributos: nome,
  cor, tipo (receita/despesa), categoria pai (no caso de subcategoria), flag
  de "categoria sugerida pelo sistema".
- **Série Recorrente (Recurrence)**: regra que **projeta virtualmente**
  lançamentos repetidos. Atributos: frequência, data de início, data de fim
  opcional, lançamento base (valor, categoria, descrição), conjunto de
  **exceções** materializadas (ocorrências individuais já editadas,
  confirmadas ou excluídas). Ocorrências projetadas que ainda não viraram
  exceção não existem como entidade própria — são derivadas em tempo de
  consulta a partir da regra.
- **Orçamento Mensal (Budget)**: limite planejado por categoria em um mês.
  Atributos: categoria, mês de referência, valor planejado.
- **Meta de Poupança (Goal)**: objetivo financeiro com prazo. Atributos:
  nome, valor-alvo, data-alvo. O valor acumulado é derivado da soma dos
  **Aportes** associados (ver entidade abaixo).
- **Aporte (Contribution)**: registro de destinação explícita de dinheiro a
  uma meta. Atributos: meta vinculada, valor, data, descrição opcional.
  Aportes não são lançamentos de receita/despesa do caixa; vivem em um
  registro próprio para preservar o isolamento entre a contabilidade geral
  e o acompanhamento de metas.
- **Insight**: observação derivada automaticamente dos dados, com tipo
  (anomalia, conquista, alerta), descrição textual e período de referência.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O usuário consegue registrar um novo lançamento completo
  (tipo, valor, data, categoria, descrição) em até 20 segundos a partir da
  abertura do formulário.
- **SC-002**: Ao abrir a página, o usuário identifica em até 5 segundos os
  três indicadores principais do mês corrente (receita, despesa, saldo) sem
  precisar rolar a tela.
- **SC-003**: Após inserir 30 dias de lançamentos, o usuário consegue
  responder, em até 1 minuto, "qual foi minha maior categoria de gasto neste
  mês e quanto representa do total?" usando exclusivamente a página.
- **SC-004**: Com pelo menos 3 meses de dados, o usuário consegue identificar
  em até 2 minutos a categoria com maior crescimento percentual no período,
  usando as visões histórica e comparativa.
- **SC-005**: Em 95% das interações de CRUD de lançamento (criar, editar,
  excluir), a interface reflete a mudança em todos os indicadores derivados
  em menos de 1 segundo após confirmação.
- **SC-006**: A página de Controle de Finanças pode ser ativada/desativada
  sem qualquer impacto perceptível sobre o funcionamento da página ForestOS
  (e vice-versa), comprovando o isolamento de domínio.
- **SC-007**: Em uso contínuo por 3 meses, o usuário consegue elencar pelo
  menos uma decisão de melhoria financeira (corte de despesa, redirecionamento
  para meta, mudança de orçamento) que foi diretamente motivada por uma
  visualização ou insight da página.

## Assumptions

- **Usuário único e privado**: a página atende a um usuário final pessoal,
  autenticado, com seus dados financeiros isolados por conta. Não há
  compartilhamento, multi-tenant explícito ou perfis colaborativos na v1.
- **Moeda única**: todos os valores são em Real Brasileiro (BRL); suporte a
  múltiplas moedas e conversão cambial está fora do escopo da v1.
- **Entrada manual primeiro**: a v1 considera apenas lançamento manual.
  Importação de extratos bancários, integração com Open Finance, OFX/CSV ou
  cartão de crédito ficam para versões futuras.
- **Sem múltiplas contas/carteiras**: não há separação por conta bancária,
  carteira ou cartão na v1. Todos os lançamentos compõem um único "caixa"
  pessoal. Esse desdobramento pode vir como evolução.
- **Persistência compartilhada**: a infraestrutura de dados (Supabase) e
  autenticação já existentes na dashboard serão reutilizadas; o domínio de
  Controle de Finanças usará um conjunto próprio de tabelas/coleções
  separadas das de ForestOS.
- **Sistema visual existente**: serão reutilizados os *design tokens*,
  classes e ornamentos do *grand strategy* já estabelecidos; a página não
  introduz novo sistema visual.
- **Lançamentos previstos vs realizados**: lançamentos com data futura são
  tratados como "previstos" e não impactam o saldo realizado até a data
  atual, mas alimentam projeções. Ao alcançar a data, transicionam
  automaticamente para "realizado" e entram no saldo, salvo se o usuário
  os marcar manualmente como "não confirmados".
- **Recorrência simples**: a primeira versão suporta frequências semanal,
  mensal e anual. Padrões complexos (a cada 2 meses, exceto feriados, etc.)
  ficam para evolução.
- **Janela analítica**: os comparativos e insights consideram, por padrão,
  janela móvel de 12 meses; o histórico completo permanece disponível para
  navegação manual.
- **Idioma e formatação**: toda a interface, categorias sugeridas e textos
  de insights são em Português do Brasil, com formatação monetária e de
  datas no padrão brasileiro.
