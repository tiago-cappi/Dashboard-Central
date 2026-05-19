---
description: "Task list — Controle de Finanças (Central de Comando)"
---

# Tasks: Controle de Finanças (Central de Comando)

**Input**: Design documents from `/specs/002-controle-financas/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: NÃO solicitados na spec; projeto não possui test runner
(`quickstart.md` valida manualmente). Nenhuma tarefa de teste gerada.

**Organization**: Tarefas agrupadas por user story para implementação e
validação independentes, em ordem de prioridade (P1 → P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: User story à qual a tarefa pertence (US1..US7)
- Caminhos de arquivo são exatos (estrutura de `plan.md`)

## Path Conventions

Web app single-project: domínio isolado em `src/features/financas/`;
adições transversais limitadas a `src/App.jsx`,
`src/components/layout/Sidebar.jsx`, `src/lib/supabase.js`,
`.env.example` e migração SQL em `db/migrations/financas/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialização do domínio e pontos de integração com a dashboard

- [X] T0 Criar estrutura de pastas do domínio em `src/features/financas/` (`hooks/`, `lib/`, `components/`)
- [X] T0 [P] Adicionar `VITE_FINANCAS_SCHEMA=financas` em `.env.example` com comentário sobre Exposed schemas
- [X] T0 [P] Adicionar acessor de schema (`export const FINANCAS_SCHEMA`) em `src/lib/supabase.js` sem alterar o cliente/domínio forestos
- [X] T0 Criar `FinancasContext` + `FinancasProvider` (notify/subscribe, selectedMonth) em `src/features/financas/FinancasContext.jsx`
- [X] T0 Adicionar rota `/financas` envolvendo a página com `FinancasProvider` em `src/App.jsx`
- [X] T0 Habilitar item "Tesouraria & Finanças" → `/financas` (remover `disabled`) em `src/components/layout/Sidebar.jsx`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura central que DEVE estar pronta antes de qualquer user story

**⚠️ CRITICAL**: Nenhuma user story pode começar até esta fase completar

- [X] T0 Criar migração do schema `financas` e 7 tabelas (categories, transactions, recurrences, recurrence_exceptions, budgets, goals, contributions) + índices/uniques conforme `data-model.md` em `db/migrations/financas/001_schema.sql`
- [X] T0 [P] Implementar utilitário monetário (formatação BRL pt-BR, validação `> 0`) em `src/features/financas/lib/money.js`
- [X] T0 [P] Implementar utilitário de datas e derivação de status (previsto/realizado/não confirmado, navegação de mês) em `src/features/financas/lib/dates.js`
- [X] T0 [P] Definir categorias sugeridas iniciais (FR-009) em `src/features/financas/lib/seed-categories.js`
- [X] T0 [US-shared] Implementar hook de leitura `useCategories` ({ flat, tree }) em `src/features/financas/hooks/useCategories.js`
- [X] T0 Implementar seeding idempotente de categorias (`seedDefaults`) acionado na primeira carga, consumindo T010, em `src/features/financas/hooks/useCategories.js`
- [X] T0 Implementar agregações base (totais, saldo, taxa de poupança) em `src/features/financas/lib/aggregations.js`
- [X] T0 Criar shell da página com navegação por abas internas e primitivas de loading/erro/vazio no estilo grand-strategy em `src/features/financas/components/FinancasPage.jsx` e `src/pages/Financas.jsx`

**Checkpoint**: Fundação pronta — user stories podem iniciar

---

## Phase 3: User Story 1 — Registro Rápido de Lançamentos (Priority: P1) 🎯 MVP

**Goal**: Cadastrar/editar/excluir receitas e despesas avulsas com filtros e recálculo imediato de totais.

**Independent Test**: Cadastrar uma receita e uma despesa, vê-las na lista filtrável e ver receita/despesa/saldo do mês recalcularem em < 1s (SC-001/SC-005).

### Implementation for User Story 1

- [X] T0 [P] [US1] Implementar `useTransactions` (filtros: período, tipo, categoria, busca textual) em `src/features/financas/hooks/useTransactions.js`
- [X] T0 [P] [US1] Implementar `useTransactionMutations` (create/update/remove, validação `amount>0`, coerência tipo↔categoria, `notify()`) em `src/features/financas/hooks/useTransactionMutations.js`
- [X] T0 [US1] Implementar `TransactionForm` (modal criar/editar, mensagens de erro explícitas FR-007) em `src/features/financas/components/TransactionForm.jsx`
- [X] T0 [US1] Implementar `TransactionList` (tabela + filtros + badges de status derivado) em `src/features/financas/components/TransactionList.jsx`
- [X] T0 [US1] Conectar recálculo de totais via `FinancasContext` notify/subscribe (depende de T013, T015, T016)
- [X] T0 [US1] Tratar estados loading/erro/vazio da lista e formulário (FR-027) e integrar US1 na `FinancasPage`

**Checkpoint**: US1 totalmente funcional e testável isoladamente (MVP parcial)

---

## Phase 4: User Story 2 — Painel Mensal de Saúde Financeira (Priority: P1) 🎯 MVP

**Goal**: Painel do mês com cartões de indicadores, evolução diária do saldo, composição por categoria e top 5 despesas, com drill-down.

**Independent Test**: Com lançamentos no mês, abrir a página e ver cartões + evolução + donut + top 5 sem rolar; clicar numa categoria filtra a lista (SC-002).

### Implementation for User Story 2

- [X] T0 [P] [US2] Implementar `MonthNavigator` (anterior/atual/próximo/seleção) em `src/features/financas/components/MonthNavigator.jsx`
- [X] T0 [P] [US2] Implementar `useMonthlySummary` (income, expense, balance, savingsRate, deltaVsPrevMonth) em `src/features/financas/hooks/useMonthlySummary.js`
- [X] T0 [P] [US2] Implementar `SummaryCards` (Receitas/Despesas/Saldo/Taxa de Poupança + variação) em `src/features/financas/components/SummaryCards.jsx`
- [X] T0 [P] [US2] Implementar `BalanceEvolutionChart` (SVG saldo acumulado diário) em `src/features/financas/components/BalanceEvolutionChart.jsx`
- [X] T0 [P] [US2] Implementar `CategoryCompositionChart` (SVG donut, totais absolutos e %) em `src/features/financas/components/CategoryCompositionChart.jsx`
- [X] T0 [P] [US2] Implementar `TopExpensesList` (top 5 por valor desc, FR-018) em `src/features/financas/components/TopExpensesList.jsx`
- [X] T0 [US2] Implementar drill-down: clique em categoria/fatia filtra `TransactionList` via filtro compartilhado no `FinancasContext` (FR-017)
- [X] T0 [US2] Compor painel mensal na `FinancasPage` com estados vazio/erro/loading (Edge Case mês vazio)

**Checkpoint**: US1 + US2 funcionam independentemente — MVP completo

---

## Phase 5: User Story 3 — Análise Histórica e Tendências (Priority: P2)

**Goal**: Série histórica receita×despesa×saldo (mensal/anual), comparação de 2 períodos e heatmap mês×categoria.

**Independent Test**: Com ≥3 meses, ver gráfico histórico, alternar granularidade, comparar 2 períodos e ler o heatmap de sazonalidade (SC-004).

### Implementation for User Story 3

- [X] T0 [P] [US3] Implementar `useHistorySeries` (granularidade mensal/anual, janela 12m) em `src/features/financas/hooks/useHistorySeries.js`
- [X] T0 [P] [US3] Implementar `useCategoryHeatmap` (matriz categorias×12 meses) em `src/features/financas/hooks/useCategoryHeatmap.js`
- [X] T0 [P] [US3] Implementar `HistoryChart` (SVG linhas/barras, toggle mensal/anual, FR-020) em `src/features/financas/components/HistoryChart.jsx`
- [X] T0 [P] [US3] Implementar `PeriodComparison` (2 períodos, variação abs/% por categoria, FR-021, indicar parcialidade) em `src/features/financas/components/PeriodComparison.jsx`
- [X] T0 [US3] Implementar `CategoryHeatmap` (SVG mês×categoria reaproveitando padrão de `FocusHeatmap`, hover + clique → filtro FR-022/022a) em `src/features/financas/components/CategoryHeatmap.jsx`
- [X] T0 [US3] Compor view histórica na `FinancasPage` com estado vazio para < 3 meses de dados

**Checkpoint**: US1 + US2 + US3 independentes

---

## Phase 6: User Story 4 — Categorização Estruturada e Decomposição (Priority: P2)

**Goal**: CRUD de categorias e subcategorias (1 nível), realocação na exclusão e decomposição expansível.

**Independent Test**: Criar categoria + subcategoria, tentar excluir categoria com lançamentos (exige realocação), expandir/colapsar decomposição.

### Implementation for User Story 4

- [X] T0 [P] [US4] Implementar `useCategoryMutations` (create/update; delete com realocação obrigatória FR-010; subcategoria 1 nível FR-011) em `src/features/financas/hooks/useCategoryMutations.js`
- [X] T0 [US4] Implementar `CategoryManager` (UI CRUD + cor + subcategoria + diálogo de realocação) em `src/features/financas/components/CategoryManager.jsx`
- [X] T0 [US4] Adicionar expand/colapso categoria↔subcategoria no `CategoryCompositionChart` (US4 cenário 3)
- [X] T0 [US4] Tratar estados vazio/erro da gestão de categorias e integrar na `FinancasPage`

**Checkpoint**: US1–US4 independentes

---

## Phase 7: User Story 5 — Transações Recorrentes (Priority: P2)

**Goal**: Recorrências projetadas virtualmente com materialização sob demanda, exceções, transição previsto→realizado e override "não confirmado".

**Independent Test**: Criar recorrência mensal; navegar p/ mês futuro vê ocorrência prevista; editar/encerrar afeta só futuro; marcar "não confirmada" reverte status.

### Implementation for User Story 5

- [X] T0 [P] [US5] Implementar projeção de recorrência (datas teóricas + aplicação de exceções) em `src/features/financas/lib/recurrence.js`
- [X] T0 [P] [US5] Implementar `useRecurrences` e `useRecurrenceMutations` (create/updateSeries/end, FR-012/014) em `src/features/financas/hooks/useRecurrences.js` e `src/features/financas/hooks/useRecurrenceMutations.js`
- [X] T0 [US5] Adicionar campos de recorrência (frequência/início/fim, marcar recorrente) ao `TransactionForm`
- [X] T0 [US5] Integrar ocorrências virtuais ao `useTransactions` para os meses navegados (FR-013), respeitando exceções
- [X] T0 [US5] Implementar materialização na interação + escrita em `recurrence_exceptions` (FR-013a/013b) no `useTransactionMutations`
- [X] T0 [US5] Implementar toggle "não confirmado" + distinção visual e filtro por status na `TransactionList` (FR-019a/b/c)
- [X] T0 [US5] Implementar semântica de editar/encerrar série (FR-014) + estados vazio/erro

**Checkpoint**: US1–US5 independentes

---

## Phase 8: User Story 6 — Orçamentos e Metas (Priority: P3)

**Goal**: Orçamento mensal por categoria com faixas 80/100% e metas de poupança por aportes explícitos, múltiplas e isoladas.

**Independent Test**: Definir orçamento e acumular gasto (barra muda em 80%/100%); criar 2 metas, registrar aportes, ver acumulado/projeção isolados por meta.

### Implementation for User Story 6

- [X] T0 [P] [US6] Implementar `useBudgets` (com consumo derivado) e `useBudgetMutations` (upsert/remove) em `src/features/financas/hooks/useBudgets.js` e `src/features/financas/hooks/useBudgetMutations.js`
- [X] T0 [P] [US6] Implementar `useGoals` (acumulado/projeção derivados) e `useGoalMutations` (goal CRUD + add/update/remove contribution) em `src/features/financas/hooks/useGoals.js` e `src/features/financas/hooks/useGoalMutations.js`
- [X] T0 [US6] Implementar `BudgetPanel` (orçamento por categoria, barras com destaque 80%/100%/ultrapassagem FR-023) em `src/features/financas/components/BudgetPanel.jsx`
- [X] T0 [US6] Implementar `GoalsPanel` (metas + aportes + valor-alvo/acumulado/%/projeção, múltiplas isoladas FR-024/024a/024b) em `src/features/financas/components/GoalsPanel.jsx`
- [X] T0 [US6] Tratar estados vazio/erro de orçamentos e metas e integrar na `FinancasPage`

**Checkpoint**: US1–US6 independentes

---

## Phase 9: User Story 7 — Insights Acionáveis (Priority: P3)

**Goal**: Seção de insights automáticos com limiares fixos da v1 (anomalia ≥25%/3m, conquista 3m consecutivos, ausência de recorrência esperada).

**Independent Test**: Com ≥3 meses, ver cartões de insight para anomalia de categoria, conquista de poupança e alerta de recorrência ausente.

### Implementation for User Story 7

- [X] T0 [P] [US7] Implementar regras e constantes de insight (TOP=5, 25%/3m, streak 3m, janela 12m — FR-025/025a) em `src/features/financas/lib/insights.js`
- [X] T0 [P] [US7] Implementar `useInsights` (consome aggregations + recurrence) em `src/features/financas/hooks/useInsights.js`
- [X] T0 [US7] Implementar `InsightsPanel` (cartões anomalia/conquista/alerta em linguagem natural) em `src/features/financas/components/InsightsPanel.jsx`
- [X] T0 [US7] Tratar estado vazio (< 3 meses) e integrar na `FinancasPage`

**Checkpoint**: Todas as user stories independentes e funcionais

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Conformidade, isolamento e validação final

- [X] T0 [P] Executar roteiro de validação de `quickstart.md` (17 passos) e registrar resultados
- [X] T0 Verificar isolamento de domínio: nenhum import de `forestos`/`FocusContext`; ForestOS inalterado salvo `App.jsx`/`Sidebar.jsx`/`supabase.js`/`.env.example` (SC-006, FR-002)
- [X] T0 [P] Passagem de conformidade visual: tokens grand-strategy, SVG ouro/tinta, sem estética SaaS (Princípio I, FR-003)
- [X] T0 Varredura final de estados loading/erro/vazio em todos os painéis (Princípio V, FR-027)
- [X] T0 [P] Limpeza final: sem código morto/legado/duplicado; atualizar `docs/` se necessário (checklist constitucional de finalização)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — inicia imediatamente
- **Foundational (Phase 2)**: depende do Setup — BLOQUEIA todas as user stories
- **User Stories (Phase 3+)**: dependem do Foundational; depois podem ser paralelas ou sequenciais por prioridade (P1 → P2 → P3)
- **Polish (Phase 10)**: depende das user stories desejadas concluídas

### User Story Dependencies

- **US1 (P1)**: após Foundational — sem dependência de outras stories
- **US2 (P1)**: após Foundational — consome agregações; drill-down integra (não acopla) com a lista de US1
- **US3 (P2)**: após Foundational — independente; reaproveita padrão de heatmap existente
- **US4 (P2)**: após Foundational — independente; estende o donut de US2 (graceful se US2 ausente)
- **US5 (P2)**: após Foundational — estende `useTransactions`/`TransactionForm` de US1 mantendo testabilidade isolada
- **US6 (P3)**: após Foundational — independente
- **US7 (P3)**: após Foundational — consome agregações; degrada com < 3 meses

### Within Each User Story

- Hooks de leitura/lib antes dos componentes
- Componentes antes da composição na `FinancasPage`
- Estados vazio/erro/loading antes do checkpoint da story

### Parallel Opportunities

- Setup: T002, T003 em paralelo
- Foundational: T008, T009, T010 em paralelo (libs independentes)
- US1: T015, T016 em paralelo
- US2: T021–T026 em paralelo (componentes/hook independentes)
- US3: T029–T032 em paralelo
- US5: T039, T040 em paralelo
- US6: T046, T047 em paralelo
- US7: T051, T052 em paralelo
- Polish: T055, T057, T059 em paralelo

---

## Parallel Example: User Story 2

```bash
# Após Foundational + US1, lançar em paralelo os blocos de US2:
Task: "MonthNavigator em src/features/financas/components/MonthNavigator.jsx"
Task: "useMonthlySummary em src/features/financas/hooks/useMonthlySummary.js"
Task: "SummaryCards em src/features/financas/components/SummaryCards.jsx"
Task: "BalanceEvolutionChart em src/features/financas/components/BalanceEvolutionChart.jsx"
Task: "CategoryCompositionChart em src/features/financas/components/CategoryCompositionChart.jsx"
Task: "TopExpensesList em src/features/financas/components/TopExpensesList.jsx"
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Fase 1: Setup
2. Fase 2: Foundational (CRÍTICO — bloqueia tudo)
3. Fase 3: US1 (registro de lançamentos)
4. Fase 4: US2 (painel mensal)
5. **PARAR e VALIDAR**: testar US1+US2 isoladamente — este é o MVP funcional
6. Demonstrar

### Incremental Delivery

1. Setup + Foundational → fundação pronta
2. + US1 → validar → MVP parcial
3. + US2 → validar → MVP completo (P1)
4. + US3, US4, US5 (P2) → validar cada uma → entregar
5. + US6, US7 (P3) → validar cada uma → entregar
6. Cada story agrega valor sem quebrar as anteriores

### Parallel Team Strategy

Após Foundational, com mais de um desenvolvedor: US1/US2 primeiro (MVP),
depois US3/US4/US5 em paralelo, depois US6/US7.

---

## Notes

- [P] = arquivos diferentes, sem dependências
- [Story] mapeia a tarefa à user story para rastreabilidade
- Cada user story é completável e testável isoladamente
- Sem tarefas de teste (não solicitadas; validação via quickstart.md)
- Commit após cada tarefa ou grupo lógico
- Parar em qualquer checkpoint para validar a story
- Evitar: tarefas vagas, conflito no mesmo arquivo, dependências cruzadas que quebrem independência
