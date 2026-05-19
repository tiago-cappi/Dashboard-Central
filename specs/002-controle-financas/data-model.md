# Phase 1 — Data Model: Controle de Finanças

**Schema**: `financas` (PostgreSQL/Supabase, isolado de `forestos`)
**Moeda**: BRL; valores monetários em `numeric(14,2)` positivos (sinal vem do `type`)
**Idioma**: nomes técnicos em inglês (consistência com schema `forestos`); UI em PT-BR

Princípios aplicados: status previsto/realizado **derivado** (R5);
recorrências **projetadas virtualmente** (R4); aportes desacoplados do caixa
(Clarifications Q1).

---

## Entidade: `categories`

Categorias e subcategorias (um nível de aninhamento — FR-011).

| Campo | Tipo | Regras |
|-------|------|--------|
| `id` | uuid PK | default `gen_random_uuid()` |
| `name` | text NOT NULL | único por (tipo, parent) |
| `type` | text NOT NULL | `receita` \| `despesa` |
| `color` | text NOT NULL | hex; default da paleta *grand strategy* |
| `parent_id` | uuid NULL FK→categories.id | se preenchido, é subcategoria; pai deve ter mesmo `type` e `parent_id` nulo |
| `is_system_suggested` | boolean NOT NULL | default `false`; categorias do seed (FR-009) |
| `created_at` | timestamptz | default `now()` |

**Validações**: aninhamento máximo 1 nível (parent não pode ter parent);
`type` da subcategoria == `type` do pai. **Exclusão**: bloqueada se houver
`transactions` vinculadas sem realocação (FR-010) — tratado na camada de
mutação.

---

## Entidade: `transactions`

Lançamento individual de receita/despesa (FR-004..FR-007).

| Campo | Tipo | Regras |
|-------|------|--------|
| `id` | uuid PK | |
| `type` | text NOT NULL | `receita` \| `despesa` |
| `amount` | numeric(14,2) NOT NULL | `> 0` (FR-007; sinal vem de `type`) |
| `date` | date NOT NULL | data do fato (pode ser futura → previsto) |
| `description` | text NOT NULL | |
| `category_id` | uuid NOT NULL FK→categories.id | obrigatória (FR-007) |
| `recurrence_id` | uuid NULL FK→recurrences.id | preenchido em ocorrências materializadas |
| `unconfirmed` | boolean NOT NULL | default `false`; override que mantém "previsto" mesmo após a data (R5/FR-019b) |
| `created_at` | timestamptz | default `now()` |
| `updated_at` | timestamptz | default `now()` |

**Status derivado** (não persistido — `lib/dates.js`):
- `unconfirmed = true` → **não confirmado** (fora do saldo realizado)
- senão `date > hoje` → **previsto** (fora do saldo realizado)
- senão → **realizado** (entra no saldo)

`type`/`category_id.type` devem coincidir.

---

## Entidade: `recurrences`

Regra que projeta lançamentos repetidos (FR-012..FR-014; R4).

| Campo | Tipo | Regras |
|-------|------|--------|
| `id` | uuid PK | |
| `type` | text NOT NULL | `receita` \| `despesa` |
| `amount` | numeric(14,2) NOT NULL | `> 0` |
| `description` | text NOT NULL | |
| `category_id` | uuid NOT NULL FK→categories.id | |
| `frequency` | text NOT NULL | `semanal` \| `mensal` \| `anual` |
| `start_date` | date NOT NULL | primeira ocorrência |
| `end_date` | date NULL | término opcional; null = sem fim |
| `active` | boolean NOT NULL | default `true`; encerrar = `false` (não apaga passado — FR-014) |
| `created_at` | timestamptz | default `now()` |

Ocorrências futuras **não** são linhas — são derivadas por
`lib/recurrence.js` no intervalo consultado.

---

## Entidade: `recurrence_exceptions`

Materialização/anulação de uma ocorrência específica (FR-013a/013b).

| Campo | Tipo | Regras |
|-------|------|--------|
| `id` | uuid PK | |
| `recurrence_id` | uuid NOT NULL FK→recurrences.id | |
| `occurrence_date` | date NOT NULL | data teórica projetada que esta exceção cobre; único por (recurrence_id, occurrence_date) |
| `kind` | text NOT NULL | `materialized` (virou transaction) \| `skipped` (removida pontualmente) |
| `transaction_id` | uuid NULL FK→transactions.id | preenchido quando `kind='materialized'` |
| `created_at` | timestamptz | default `now()` |

Regra de projeção: ao gerar ocorrências, datas com exceção `skipped` são
omitidas; `materialized` são substituídas pela `transaction` real.

---

## Entidade: `budgets`

Orçamento mensal por categoria de despesa (FR-023).

| Campo | Tipo | Regras |
|-------|------|--------|
| `id` | uuid PK | |
| `category_id` | uuid NOT NULL FK→categories.id | categoria deve ser `type='despesa'` |
| `month` | date NOT NULL | primeiro dia do mês de referência; único por (category_id, month) |
| `planned_amount` | numeric(14,2) NOT NULL | `> 0` |
| `created_at` | timestamptz | default `now()` |

Consumo (gasto/percentual) é derivado: soma de `transactions` realizadas da
categoria no mês ÷ `planned_amount`. Faixas visuais: < 80%, 80–100%, > 100%.

---

## Entidade: `goals`

Meta de poupança (FR-024; Clarifications Q1).

| Campo | Tipo | Regras |
|-------|------|--------|
| `id` | uuid PK | |
| `name` | text NOT NULL | |
| `target_amount` | numeric(14,2) NOT NULL | `> 0` |
| `target_date` | date NULL | prazo opcional |
| `archived` | boolean NOT NULL | default `false` |
| `created_at` | timestamptz | default `now()` |

Acumulado é **derivado** da soma de `contributions`. Metas são
independentes entre si (FR-024/cenário 3).

---

## Entidade: `contributions`

Aporte explícito a uma meta (FR-024a; **não** afeta o caixa).

| Campo | Tipo | Regras |
|-------|------|--------|
| `id` | uuid PK | |
| `goal_id` | uuid NOT NULL FK→goals.id ON DELETE CASCADE | |
| `amount` | numeric(14,2) NOT NULL | `> 0` |
| `date` | date NOT NULL | |
| `description` | text NULL | origem opcional |
| `created_at` | timestamptz | default `now()` |

---

## Entidade: `Insight` (derivada — sem tabela)

Computada em `lib/insights.js` a cada render (R6); **não persistida**.
Formato: `{ kind: 'anomalia'|'conquista'|'alerta', title, detail, period }`.
Regras v1 (FR-025/025a):
- **anomalia**: despesa da categoria no mês ≥ 25% acima da média de 3 meses
- **conquista**: taxa de poupança positiva por ≥ 3 meses consecutivos
- **alerta**: ocorrência recorrente esperada não materializada/confirmada
  após `occurrence_date`

---

## Relações (resumo)

```text
categories 1──* categories            (parent_id, 1 nível)
categories 1──* transactions
categories 1──* recurrences
categories 1──* budgets
recurrences 1──* recurrence_exceptions
recurrences 1──0..1 transactions       (via exceção materializada)
goals      1──* contributions          (cascade)
```

## Índices recomendados

- `transactions(date)`, `transactions(category_id)`, `transactions(recurrence_id)`
- `recurrence_exceptions(recurrence_id, occurrence_date)` UNIQUE
- `budgets(category_id, month)` UNIQUE
- `contributions(goal_id)`
- `categories(type, parent_id)`

## Estados e transições

**Lançamento** (derivado, não persistido salvo `unconfirmed`):

```text
data futura ──(chega a data)──► realizado
   │ previsto                      │
   └────────── unconfirmed=true ◄──┘  (override do usuário; volta a "previsto")
```

**Recorrência**: `active=true` → (encerrar) → `active=false`
(projeção cessa daí pra frente; exceções/materializados preservados).

**Ocorrência projetada**: `virtual/previsto` → (interação) →
`recurrence_exceptions.kind = materialized|skipped`.
