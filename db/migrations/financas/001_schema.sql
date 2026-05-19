-- =============================================================================
-- Migração: schema financas — Controle de Finanças
-- Aplicar em: Supabase → SQL Editor
-- Depois adicionar "financas" em: Settings → API → Exposed schemas
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS financas;

-- =============================================================================
-- categories
-- =============================================================================
CREATE TABLE IF NOT EXISTS financas.categories (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text        NOT NULL,
  type                text        NOT NULL CHECK (type IN ('receita', 'despesa')),
  color               text        NOT NULL DEFAULT '#a88a3d',
  parent_id           uuid        REFERENCES financas.categories(id) ON DELETE RESTRICT,
  is_system_suggested boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT categories_name_type_parent_unique UNIQUE (name, type, parent_id)
  -- Aninhamento máximo 1 nível é validado na camada de mutação (useCategoryMutations),
  -- pois CHECK constraints não permitem subqueries no PostgreSQL.
);

CREATE INDEX IF NOT EXISTS categories_type_parent_idx
  ON financas.categories (type, parent_id);

-- =============================================================================
-- recurrences (precisa existir antes de transactions por FK)
-- =============================================================================
CREATE TABLE IF NOT EXISTS financas.recurrences (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text        NOT NULL CHECK (type IN ('receita', 'despesa')),
  amount      numeric(14,2) NOT NULL CHECK (amount > 0),
  description text        NOT NULL,
  category_id uuid        NOT NULL REFERENCES financas.categories(id) ON DELETE RESTRICT,
  frequency   text        NOT NULL CHECK (frequency IN ('semanal', 'mensal', 'anual')),
  start_date  date        NOT NULL,
  end_date    date,
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- transactions
-- =============================================================================
CREATE TABLE IF NOT EXISTS financas.transactions (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  type          text          NOT NULL CHECK (type IN ('receita', 'despesa')),
  amount        numeric(14,2) NOT NULL CHECK (amount > 0),
  date          date          NOT NULL,
  description   text          NOT NULL,
  category_id   uuid          NOT NULL REFERENCES financas.categories(id) ON DELETE RESTRICT,
  recurrence_id uuid          REFERENCES financas.recurrences(id) ON DELETE SET NULL,
  unconfirmed   boolean       NOT NULL DEFAULT false,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_date_idx         ON financas.transactions (date);
CREATE INDEX IF NOT EXISTS transactions_category_idx     ON financas.transactions (category_id);
CREATE INDEX IF NOT EXISTS transactions_recurrence_idx   ON financas.transactions (recurrence_id);

-- =============================================================================
-- recurrence_exceptions
-- =============================================================================
CREATE TABLE IF NOT EXISTS financas.recurrence_exceptions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  recurrence_id   uuid        NOT NULL REFERENCES financas.recurrences(id) ON DELETE CASCADE,
  occurrence_date date        NOT NULL,
  kind            text        NOT NULL CHECK (kind IN ('materialized', 'skipped')),
  transaction_id  uuid        REFERENCES financas.transactions(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT recurrence_exceptions_unique UNIQUE (recurrence_id, occurrence_date)
);

CREATE INDEX IF NOT EXISTS recurrence_exceptions_rec_date_idx
  ON financas.recurrence_exceptions (recurrence_id, occurrence_date);

-- =============================================================================
-- budgets
-- =============================================================================
CREATE TABLE IF NOT EXISTS financas.budgets (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     uuid          NOT NULL REFERENCES financas.categories(id) ON DELETE CASCADE,
  month           date          NOT NULL,
  planned_amount  numeric(14,2) NOT NULL CHECK (planned_amount > 0),
  created_at      timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT budgets_category_month_unique UNIQUE (category_id, month)
);

-- =============================================================================
-- goals
-- =============================================================================
CREATE TABLE IF NOT EXISTS financas.goals (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text          NOT NULL,
  target_amount numeric(14,2) NOT NULL CHECK (target_amount > 0),
  target_date   date,
  archived      boolean       NOT NULL DEFAULT false,
  created_at    timestamptz   NOT NULL DEFAULT now()
);

-- =============================================================================
-- contributions
-- =============================================================================
CREATE TABLE IF NOT EXISTS financas.contributions (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id     uuid          NOT NULL REFERENCES financas.goals(id) ON DELETE CASCADE,
  amount      numeric(14,2) NOT NULL CHECK (amount > 0),
  date        date          NOT NULL,
  description text,
  created_at  timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contributions_goal_idx ON financas.contributions (goal_id);
