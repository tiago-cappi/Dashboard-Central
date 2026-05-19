# Phase 0 — Research: Controle de Finanças

Decisões técnicas que removem incertezas antes do design. Não há marcadores
`NEEDS CLARIFICATION` na Technical Context; as decisões abaixo consolidam as
escolhas de arquitetura à luz da constituição e do código existente.

---

## R1 — Biblioteca de gráficos vs. SVG nativo

**Decision**: Renderizar todas as visualizações (evolução de saldo, donut de
composição, série histórica, heatmap mês×categoria, barras de orçamento) em
**SVG nativo + React**, sem biblioteca de charts.

**Rationale**:
- A constituição (Restrições Técnicas) exige justificativa explícita e
  aprovação para "novas dependências pesadas"; Recharts/Chart.js/visx pesam
  e trazem estética padrão de "SaaS moderno", proibida pelo Princípio I.
- O projeto já tem precedente consolidado: `FocusHeatmap.jsx` e
  `HabitHeatmap.jsx` são SVG desenhados à mão no estilo *grand strategy*.
  Reaproveitar esse padrão atende ao Princípio IV (reúso, sem duplicação).
- Escala é mínima (1 usuário, ~12 meses em tela): SVG declarativo é
  suficiente em performance para SC-005 (< 1s).

**Alternatives considered**:
- *Recharts*: rápido de montar, mas dependência pesada + visual sintético
  difícil de moldar aos tokens; rejeitado por Princípio I e Restrições.
- *Chart.js (canvas)*: difícil casar com molduras/ornamentos e com
  acessibilidade textual; rejeitado.
- *D3 isolado*: poder excessivo para o escopo (YAGNI); curva e peso
  injustificados para gráficos relativamente simples.

---

## R2 — Isolamento de dados entre `financas` e `forestos`

**Decision**: Criar um **schema PostgreSQL dedicado `financas`** no mesmo
projeto Supabase e acessá-lo pelo **cliente único** já existente via
`supabase.schema('financas')`. Adicionar `VITE_FINANCAS_SCHEMA` em
`.env.example` e exportar um acessor em `src/lib/supabase.js`.

**Rationale**:
- FR-002/FR-026 exigem dados financeiros isolados do domínio ForestOS;
  schema separado é o limite mais forte e natural no PostgREST/Supabase.
- `@supabase/supabase-js` 2.45 suporta `.schema(name)` por chamada,
  reutilizando URL, chave e sessão de auth — sem duplicar config (DRY) e
  sem segundo `createClient`.
- Mantém o padrão `SUPABASE_CONFIGURED` (Princípio V): ausência de config
  não derruba o app; hooks propagam erro.

**Alternatives considered**:
- *Mesmo schema `forestos` + prefixo `fin_`*: rejeitado — mistura
  superfícies de dados e enfraquece o isolamento exigido por SC-006.
- *Segundo `createClient` dedicado*: rejeitado — duplica configuração e
  gestão de sessão; viola DRY sem ganho real de isolamento.

**Ação de infra**: o schema `financas` precisa estar listado em
*Supabase → Project Settings → API → Exposed schemas* (mesma pegadinha já
documentada para `forestos` no `.env.example`).

---

## R3 — Barramento de revalidação isolado (`FinancasContext`)

**Decision**: Implementar um **contexto próprio do domínio**
(`FinancasContext`) expondo `notify()` / `subscribe()` (mesmo padrão de
`FocusContext`), consumido pelos hooks de leitura para refetch após mutações.

**Rationale**:
- O padrão constitucional (Princípio III) determina mutações disparando
  revalidação global. Reutilizar `FocusContext` acoplaria finanças ao
  ForestOS, violando o isolamento de domínio (FR-002, SC-006).
- O mecanismo `subscribersRef` + `notify`/`subscribe` de `FocusContext` é
  pequeno e bem-provado; replicá-lo enxuto no domínio financas é reúso de
  *padrão* (não duplicação problemática de lógica de negócio).

**Alternatives considered**:
- *Reusar FocusContext*: rejeitado por acoplamento cruzado.
- *Estado global externo (Zustand/Redux)*: nova dependência + camada;
  rejeitado por KISS/YAGNI e Restrições Técnicas.
- *React Query/SWR*: traria cache robusto mas é dependência nova não
  justificada para a escala de 1 usuário; rejeitado por YAGNI.

---

## R4 — Recorrências: projeção virtual + materialização sob demanda

**Decision**: Persistir apenas a **regra** (`recurrences`) e as **exceções**
(`recurrence_exceptions`). Ocorrências futuras são **calculadas em tempo de
consulta** por `lib/recurrence.js`; uma ocorrência só vira linha em
`transactions` quando o usuário interage (editar/confirmar/excluir),
gravando-se uma exceção que liga a data projetada ao lançamento real.

**Rationale**: Decisão já fixada nas Clarifications (Q2) e em
FR-013/013a/013b/014. Mantém o banco enxuto, evita "lixo" ao encerrar
recorrências e preserva a distinção previsto/realizado (FR-019a).

**Mecânica de projeção** (resumo para o design):
- Dada a regra (frequência semanal/mensal/anual, `start_date`, `end_date?`)
  e um intervalo de consulta (mês/ano), gerar as datas teóricas.
- Para cada data: se existe exceção `skip`/`materialized` → usar a exceção
  (ou ocultar); senão → emitir um "lançamento virtual" com
  `status='previsto'` (ou `realizado` se a data já passou, conforme R5).
- Edição de série altera a regra e afeta apenas projeções futuras; passado
  materializado permanece intacto (FR-014).

**Alternatives considered**: geração antecipada em lote e *lazy generation*
no acesso ao mês — ambas rejeitadas na fase de clarificação (Q2).

---

## R5 — Transição automática previsto → realizado

**Decision**: O status é **derivado** em tempo de leitura comparando
`transaction.date` com a data atual: data futura → `previsto`; data
alcançada/passada → `realizado`. O override **`não confirmado`** é um campo
explícito persistido que vence a derivação (mantém `previsto` fora do saldo).

**Rationale**: Fixado nas Clarifications (Q3) e FR-019a/019b/019c. Derivar
em vez de agendar job evita infra de cron (YAGNI) e mantém consistência
imediata no cliente. Apenas o override precisa de coluna persistida.

**Implicação de dados**: `transactions` carrega `unconfirmed boolean` (ou
`status` enum com persistência só de `nao_confirmado`); `previsto`/`realizado`
nunca são gravados — são computados por `lib/dates.js`.

---

## R6 — Cálculos derivados client-side

**Decision**: Indicadores (totais, saldo, taxa de poupança, top-5,
composição por categoria, série histórica, heatmap, insights) são computados
no cliente em `lib/aggregations.js` e `lib/insights.js` a partir dos
lançamentos do período carregados pelos hooks.

**Rationale**: Volume por usuário é baixo (R1); evita views/RPC no banco
(KISS) e mantém a lógica de negócio versionada no front, testável via
`quickstart.md`. SC-005 (< 1s) é folgado nessa escala.

**Constantes da v1** (FR-025a, Clarifications Q5), centralizadas em
`lib/insights.js`:
- `TOP_EXPENSES_COUNT = 5`
- `CATEGORY_ANOMALY_THRESHOLD = 0.25` sobre média móvel de `3` meses
- `SAVINGS_STREAK_MONTHS = 3`
- Janela analítica padrão: `12` meses.

**Alternatives considered**: agregação via SQL/Postgres views/RPC —
rejeitada por YAGNI nesta escala e por dispersar regra de negócio entre
front e banco.

---

## Resumo de saídas para Phase 1

- Schema `financas` com 7 entidades (ver `data-model.md`).
- Sem novas dependências npm.
- Adições transversais mínimas: `VITE_FINANCAS_SCHEMA`, acessor em
  `supabase.js`, rota em `App.jsx`, item de `Sidebar.jsx`.
- Toda viz em SVG nativo no estilo *grand strategy*.
