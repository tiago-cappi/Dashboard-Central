# Implementation Plan: Controle de Finanças (Central de Comando)

**Branch**: `002-controle-financas` | **Date**: 2026-05-19 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-controle-financas/spec.md`

## Summary

Nova área da dashboard — **Controle de Finanças** — independente do domínio
ForestOS, para registro de receitas/despesas e geração de painel mensal,
análise histórica, categorização, recorrências, orçamentos, metas com aportes
e insights automáticos. Abordagem técnica: novo domínio isolado em
`src/features/financas/` (hooks, lib, componentes próprios), nova rota
`/financas` reaproveitando `AppShell`/`Panel`/`Sidebar`, persistência em
**schema Supabase dedicado `financas`** acessado via `supabase.schema()` sem
novo cliente, gráficos renderizados em **SVG nativo** (sem nova dependência
pesada, seguindo o padrão já existente de `FocusHeatmap`/`HabitHeatmap`), e
um barramento de revalidação próprio do domínio (`FinancasContext`) para não
acoplar finanças ao `FocusContext` do ForestOS.

## Technical Context

**Language/Version**: JavaScript (ES Modules) + React 18.3 (JSX, sem TypeScript — consistente com o projeto)

**Primary Dependencies**: React 18.3, React Router 6.26, Tailwind CSS 3.4, `@supabase/supabase-js` 2.45 (todas já presentes — **nenhuma nova dependência**)

**Storage**: Supabase/PostgreSQL — schema dedicado `financas` (isolado do schema `forestos`), acessado pelo cliente único via `supabase.schema('financas')`

**Testing**: Sem framework de testes automatizados no projeto atualmente; validação manual via `quickstart.md` e cenários de aceitação da spec (mantém KISS/YAGNI; não introduzir runner sem necessidade)

**Target Platform**: Web (SPA Vite servida em navegador desktop; `npm run dev` porta 5173)

**Project Type**: Single-project web app (frontend React + backend gerenciado Supabase)

**Performance Goals**: Recálculo de indicadores derivados < 1s após CRUD (SC-005); painel mensal pintado com indicadores principais em < 5s percebidos (SC-002); agregações client-side sobre janela de até ~12 meses de lançamentos de um único usuário

**Constraints**: Estética *grand strategy* inegociável (Princípio I); isolamento total entre domínios financas e forestos (FR-002, SC-006); moeda única BRL; entrada manual apenas (v1); sem nova dependência pesada sem justificativa

**Scale/Scope**: 1 usuário (uso pessoal); ordem de magnitude de centenas a poucos milhares de lançamentos/ano; ~7 entidades; ~6–8 telas/painéis; 7 user stories priorizadas (P1→P3)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Avaliação inicial | Status |
|-----------|-------------------|--------|
| **I. Fidelidade ao Sistema Visual** | Todos os componentes usarão tokens de `grand-strategy.css` e classes (`.panel`, `.font-cinzel`, `.num`, `.smallcaps`); gráficos em SVG monocromático ouro/tinta; sem libs de chart com estética SaaS. | ✅ PASS |
| **II. Planejamento Antes de Visualização** | Este plano + bullets por visualização nos contratos; nenhuma viz codada antes do plano. | ✅ PASS |
| **III. Arquitetura Modular por Domínio** | `src/features/financas/{hooks,lib}` + componentes; rota em `src/pages`; reúso de `components/layout`. Hooks de leitura `useX → {data,loading,error,refetch}`; mutações `useXMutations` + `notify()` via barramento próprio. | ✅ PASS |
| **IV. Reaproveitamento e Sem Código Legado** | Reúso de `AppShell`, `Panel`, `Sidebar` (item "Tesouraria & Finanças" já existe desabilitado), padrão SVG de heatmap. Sem código legado a remover (feature nova). | ✅ PASS |
| **V. Tratamento Explícito de Erros e Estado** | Todo hook expõe `error`; UI trata loading/erro/vazio explicitamente; cliente Supabase nunca derruba app (padrão `SUPABASE_CONFIGURED`). | ✅ PASS |
| **Restrições Técnicas** | Stack fixa respeitada; **sem nova dependência**. Adições mínimas: variável `VITE_FINANCAS_SCHEMA` em `.env.example` e acessor de schema em `src/lib/supabase.js` (não é dependência nem nova camada — extensão pontual). PT-BR. | ✅ PASS (ver Complexity Tracking) |

**Gate inicial: APROVADO.** Nenhuma violação. A única adição transversal
(acessor de schema `financas`) está justificada na tabela de complexidade.

## Project Structure

### Documentation (this feature)

```text
specs/002-controle-financas/
├── plan.md              # Este arquivo (/speckit-plan)
├── research.md          # Phase 0 — decisões técnicas
├── data-model.md        # Phase 1 — entidades e schema
├── quickstart.md        # Phase 1 — setup e validação
├── contracts/           # Phase 1 — contratos da camada de dados/hooks
│   ├── data-access.md
│   └── hooks-api.md
├── checklists/
│   └── requirements.md  # (já criado em /speckit-specify)
└── tasks.md             # Phase 2 (/speckit-tasks — NÃO criado aqui)
```

### Source Code (repository root)

Novo domínio isolado, espelhando o padrão de `src/features/forestos/`:

```text
src/
├── App.jsx                         # + rota <Route path="/financas" .../>
├── lib/
│   └── supabase.js                 # + acessor schema 'financas' + FINANCAS_SCHEMA
├── components/
│   └── layout/
│       └── Sidebar.jsx             # habilitar item "Tesouraria & Finanças" → /financas
├── pages/
│   └── Financas.jsx                # rota raiz da página (compõe os painéis)
└── features/
    └── financas/                   # DOMÍNIO ISOLADO (novo)
        ├── FinancasContext.jsx     # barramento de revalidação próprio (notify/subscribe)
        ├── hooks/
        │   ├── useTransactions.js          # leitura + filtros (mês, tipo, categoria, busca)
        │   ├── useTransactionMutations.js  # create/update/delete + materializar recorrência
        │   ├── useCategories.js
        │   ├── useCategoryMutations.js
        │   ├── useRecurrences.js
        │   ├── useRecurrenceMutations.js
        │   ├── useBudgets.js
        │   ├── useBudgetMutations.js
        │   ├── useGoals.js
        │   ├── useGoalMutations.js          # metas + aportes
        │   ├── useMonthlySummary.js          # indicadores derivados do mês
        │   ├── useHistorySeries.js           # série histórica mensal/anual
        │   └── useInsights.js                # insights automáticos
        ├── lib/
        │   ├── money.js                      # formatação BRL, validação de valores
        │   ├── dates.js                      # mês/ano, navegação, status previsto/realizado
        │   ├── recurrence.js                 # projeção virtual de ocorrências + exceções
        │   ├── aggregations.js               # totais, taxa de poupança, top-5, por categoria
        │   ├── insights.js                   # regras 25% / 3 meses / ausência recorrência
        │   └── seed-categories.js            # categorias sugeridas iniciais
        └── components/
            ├── FinancasPage.jsx              # layout/abas internas do domínio
            ├── TransactionForm.jsx           # criar/editar lançamento (modal)
            ├── TransactionList.jsx           # tabela + filtros + status visual
            ├── MonthNavigator.jsx            # navegação entre meses
            ├── SummaryCards.jsx              # cartões: receita/despesa/saldo/poupança
            ├── BalanceEvolutionChart.jsx     # SVG: saldo acumulado diário
            ├── CategoryCompositionChart.jsx  # SVG: donut despesas por categoria
            ├── TopExpensesList.jsx           # top 5 despesas do mês
            ├── HistoryChart.jsx              # SVG: receita×despesa×saldo (mês/ano)
            ├── PeriodComparison.jsx          # comparativo de 2 períodos
            ├── CategoryHeatmap.jsx           # SVG: heatmap mês×categoria (reusa padrão FocusHeatmap)
            ├── CategoryManager.jsx           # CRUD categorias + subcategorias
            ├── BudgetPanel.jsx               # orçamento por categoria + barras 80/100%
            ├── GoalsPanel.jsx                # metas + aportes + projeção
            └── InsightsPanel.jsx             # cartões de insight
```

**Structure Decision**: Adotado o padrão de domínio já consolidado em
`src/features/forestos/` (subpastas `hooks/` e `lib/`, componentes coesos).
O novo domínio `src/features/financas/` é autocontido; o acoplamento com o
resto da dashboard limita-se a: (1) uma rota em `App.jsx`, (2) um item de
navegação em `Sidebar.jsx` (já previsto e hoje desabilitado), (3) reúso de
`AppShell`/`Panel`, e (4) o acessor de schema em `supabase.js`. Não há
dependência sobre `FocusContext` nem sobre qualquer tabela do schema
`forestos`, satisfazendo FR-002 e SC-006.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Acessor de schema `financas` em `src/lib/supabase.js` (não é violação de princípio, mas é mudança transversal fora do domínio) | FR-002/FR-026 exigem dados financeiros isolados do schema `forestos`; o cliente Supabase é único e fixado a um schema na criação | Usar o mesmo schema `forestos` com prefixo de tabela `fin_` foi rejeitado por enfraquecer o isolamento de domínio e misturar superfícies de dados; criar um segundo `createClient` foi rejeitado por duplicar config/auth (DRY) — `supabase.schema('financas')` reaproveita cliente e sessão |
| `FinancasContext` (novo contexto além do `FocusContext`) | Padrão constitucional manda mutações dispararem revalidação global; reusar `FocusContext` acoplaria finanças ao ForestOS, violando o isolamento (FR-002) | Reutilizar `FocusContext.notify/subscribe` foi rejeitado: criaria dependência cruzada entre domínios que devem ser independentes (SC-006) |
