# Contract — Camada de Acesso a Dados (Supabase, schema `financas`)

A "interface externa" desta feature web é a camada de dados Supabase. Este
contrato fixa como o domínio fala com o banco, isolado de `forestos`.

## Acessor de schema (`src/lib/supabase.js` — adição)

```js
// Adição (não altera o cliente existente nem o domínio forestos):
const financasSchema = import.meta.env.VITE_FINANCAS_SCHEMA || 'financas';
export const FINANCAS_SCHEMA = financasSchema;
// uso nos hooks: supabase.schema(FINANCAS_SCHEMA).from('transactions')...
```

`.env.example` (adição): `VITE_FINANCAS_SCHEMA=financas`
Schema deve estar em *Supabase → API → Exposed schemas*.

## Convenções de operação

- Toda query parte de `supabase.schema(FINANCAS_SCHEMA).from('<tabela>')`.
- Erros nunca são engolidos: `{ data, error }` do supabase-js é propagado
  pelo hook como `error` (Princípio V). `SUPABASE_CONFIGURED=false` ⇒ hooks
  retornam estado vazio + `error` informativo, sem derrubar a app.
- Datas trafegam como `YYYY-MM-DD` (string ISO date), sem timezone.
- Valores monetários como `number` com 2 casas; validação `> 0` na mutação.

## Operações por tabela (CRUD lógico)

### `transactions`
- **list(filtros)**: `select('*')` com `.gte('date',ini).lte('date',fim)`,
  `.eq('type',?)`, `.eq('category_id',?)`, `.ilike('description',%q%)`.
- **create(payload)**: valida `amount>0`, `category.type==type`.
- **update(id, patch)** / **delete(id)**.
- **materializeOccurrence(recurrenceId, occurrenceDate, patch?)**: cria
  `transactions` + `recurrence_exceptions(kind='materialized')` atômico.
- **setUnconfirmed(id, bool)**: alterna override de status.

### `categories`
- **list()** / **create** / **update** / **delete(id, reassignToId)**:
  delete exige `reassignToId` se houver transactions vinculadas (FR-010);
  a mutação primeiro reatribui, depois remove.
- **seedDefaults()**: insere categorias sugeridas (idempotente por nome+tipo).

### `recurrences`
- **list(activeOnly?)** / **create** / **update(id, patch, scope)** onde
  `scope ∈ {'serie'}` (passado materializado intacto) / **end(id)** =
  `active=false`.

### `recurrence_exceptions`
- **upsert(recurrenceId, occurrenceDate, kind, transactionId?)** —
  único por `(recurrence_id, occurrence_date)`.

### `budgets`
- **listByMonth(month)** / **upsert(categoryId, month, amount)** /
  **delete(id)**.

### `goals` / `contributions`
- **goals.list(includeArchived?)** / **create** / **update** /
  **archive(id)**.
- **contributions.listByGoal(goalId)** / **create** / **update** /
  **delete** — recálculo de acumulado é derivado, não persistido.

## Garantias transacionais

Operações compostas (materializar ocorrência; excluir categoria com
realocação) devem ser executadas como sequência verificada: se um passo
falha, o hook propaga `error` e **não** prossegue para o passo seguinte
(nada de estado parcial silencioso — Princípio V).
