# Contract — API dos Hooks do Domínio `financas`

Padrão constitucional (Princípio III): leitura `useX → { data, loading,
error, refetch }`; mutações `useXMutations` disparam `notify()` do
`FinancasContext` para revalidação global. Hooks de leitura se inscrevem
via `subscribe()` e refazem fetch ao receber `notify`.

## Contexto

```text
FinancasProvider           // envolve a página /financas
useFinancas() → {
  notify(),                // dispara revalidação global do domínio
  subscribe(fn),           // hooks de leitura se inscrevem
  selectedMonth,           // 'YYYY-MM' — estado de navegação do painel
  setSelectedMonth(m),
}
```

## Hooks de leitura

| Hook | Retorno `data` | Observações |
|------|----------------|-------------|
| `useTransactions(filters)` | `Transaction[]` (com `status` derivado) | filtros: período, type, categoryId, query; inclui ocorrências **virtuais** de recorrências projetadas no período |
| `useCategories()` | `{ flat: Category[], tree: CategoryNode[] }` | árvore de 1 nível |
| `useRecurrences(activeOnly?)` | `Recurrence[]` | |
| `useBudgets(month)` | `BudgetWithUsage[]` | `{ ...budget, spent, percent, band }` |
| `useGoals(includeArchived?)` | `GoalWithProgress[]` | `{ ...goal, accumulated, percent, projectedDate }` |
| `useMonthlySummary(month)` | `{ income, expense, balance, savingsRate, deltaVsPrevMonth }` | derivado em `lib/aggregations.js` |
| `useHistorySeries(granularity, range)` | `SeriesPoint[]` | `granularity ∈ {mensal, anual}` |
| `useCategoryHeatmap(months=12)` | `{ categories[], months[], cells[][] }` | heatmap mês×categoria |
| `useInsights(month)` | `Insight[]` | regras v1 (25% / 3 meses) |

Todos: `loading` boolean, `error` Error|null, `refetch()`.

## Hooks de mutação

| Hook | Métodos | Efeito |
|------|---------|--------|
| `useTransactionMutations()` | `create`, `update`, `remove`, `materializeOccurrence`, `setUnconfirmed` | valida `amount>0`, coerência `type/categoria`; `notify()` ao concluir |
| `useCategoryMutations()` | `create`, `update`, `remove(id, reassignToId)`, `seedDefaults` | bloqueia remove sem realocação (FR-010) |
| `useRecurrenceMutations()` | `create`, `updateSeries`, `end` | edição afeta só projeções futuras (FR-014) |
| `useBudgetMutations()` | `upsert`, `remove` | |
| `useGoalMutations()` | `create`, `update`, `archive`, `addContribution`, `updateContribution`, `removeContribution` | acumulado recalculado na leitura |

Contrato de retorno de mutação: `Promise<{ ok: boolean, error?: Error }>`.
Em erro, **não** lança silenciosamente — retorna `error` para a UI exibir.

## Contrato de UI (estados obrigatórios)

Todo componente que consome um hook de leitura DEVE renderizar
explicitamente (Princípio V, FR-027):
- **loading** → skeleton/placeholder no estilo *grand strategy*
- **error** → painel de erro legível (sem stack crua), com ação de retry
- **empty** → estado vazio com chamada para ação (ex.: "registrar primeiro
  lançamento") — nunca gráfico quebrado (Edge Case mês vazio)

## Contrato visual (todas as visualizações)

- SVG nativo; cores via tokens `--gold*`, `--wine*`, `--navy*`, `--paper*`.
- Tipografia: `.font-cinzel` em títulos, `.num` em valores, `.smallcaps`
  em rótulos. Moeda formatada por `lib/money.js` (BRL, padrão pt-BR).
- Sem cantos muito arredondados, sombras Material, gradientes neon ou
  emojis como ícones (Princípio I).
- Interações de drill-down: clique em fatia/célula filtra a
  `TransactionList` (FR-017/FR-022a).
