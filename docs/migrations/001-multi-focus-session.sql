-- Migration: 001-multi-focus-session
-- Feature: Sessão de Foco Multi-Missão (specs/001-multi-mission-focus)
-- Aplique este SQL no schema `forestos` do seu projeto Supabase.
--
-- O que cria:
--   1. Tabela `multi_focus_sessions` — guarda cada sessão multi-missão (ativa, concluída ou descartada).
--   2. Coluna `current_multi_focus_session_id` em `profile` — espelha o padrão existente
--      `current_focus_mission_id` / `current_focus_habit_id` para indicar qual sessão multi está em foco.
--
-- Rollback no fim do arquivo (comentado).

set search_path to forestos, public;

-- 1) Nova tabela
create table if not exists multi_focus_sessions (
  id                       text primary key,
  mode                     text not null check (mode in ('stopwatch', 'pomodoro')),
  pomo_duration_min        integer,
  importance               integer not null check (importance between 1 and 5),
  difficulty               integer not null check (difficulty between 1 and 5),
  mini_missions            jsonb not null default '[]'::jsonb,
  started_at               timestamptz not null default now(),
  ended_at                 timestamptz,
  focus_minutes            integer not null default 0,
  xp_gained                integer not null default 0,
  consolidated_mission_id  text,
  status                   text not null default 'active' check (status in ('active', 'completed', 'discarded'))
);

create index if not exists multi_focus_sessions_status_idx
  on multi_focus_sessions (status);

create index if not exists multi_focus_sessions_started_at_idx
  on multi_focus_sessions (started_at desc);

-- 2) Coluna no profile
alter table profile
  add column if not exists current_multi_focus_session_id text;

-- 3) Permissões + Row Level Security — alinha com o padrão das demais tabelas do schema forestos
--    IMPORTANTE: o role `anon` (usado pela chave pública do cliente) precisa de GRANT explícito;
--    apenas a política RLS NÃO basta — sem GRANT, o PostgREST retorna 403.
grant usage on schema forestos to anon, authenticated, service_role;

grant select, insert, update, delete on table multi_focus_sessions
  to anon, authenticated, service_role;

alter table multi_focus_sessions enable row level security;

drop policy if exists "allow_all_multi_focus_sessions" on multi_focus_sessions;
create policy "allow_all_multi_focus_sessions"
  on multi_focus_sessions
  for all
  to anon, authenticated, service_role
  using (true)
  with check (true);

-- Força o PostgREST a recarregar o schema (caso esteja cacheando permissões antigas)
notify pgrst, 'reload schema';

-- 4) (Opcional) Comentários para documentação
comment on table multi_focus_sessions is
  'Sessões de foco com lista de mini-missões em texto livre. Ao encerrar gera uma Mission consolidada em `missions`.';
comment on column multi_focus_sessions.mini_missions is
  'Array JSON: [{ id, title, status: "pending"|"done", order, completed_at }]';
comment on column multi_focus_sessions.consolidated_mission_id is
  'FK lógico para missions.id — preenchido ao encerrar a sessão com tempo >= 1 minuto.';
comment on column profile.current_multi_focus_session_id is
  'ID da sessão multi-missão ativa (mutuamente exclusivo com current_focus_mission_id e current_focus_habit_id).';


-- ────────────────────────────────────────────────────────────
-- ROLLBACK (executar manualmente se precisar reverter):
--
-- drop policy if exists "allow_all_multi_focus_sessions" on multi_focus_sessions;
-- alter table profile drop column if exists current_multi_focus_session_id;
-- drop table if exists multi_focus_sessions;
-- ────────────────────────────────────────────────────────────
