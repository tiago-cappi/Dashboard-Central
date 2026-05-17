import { useCallback } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { useFocus } from '../FocusContext.jsx';

function genId(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function todayIso() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

/**
 * CRUD unificado para todos os tipos da árvore. Cada operação emite notify()
 * via FocusContext para que useForestTree refaça o load automaticamente.
 */
export function useTreeMutations() {
  const { notify } = useFocus();

  // ===================== SECTOR =====================
  const createSector = useCallback(
    async (input) => {
      const row = {
        id: input.id ?? genId('s'),
        name: input.name?.trim() || 'Setor sem nome',
        color: input.color ?? null,
        archived: false,
        created_at: todayIso(),
      };
      const { data, error } = await supabase.from('sectors').insert(row).select().maybeSingle();
      if (error) throw error;
      notify();
      return data;
    },
    [notify],
  );

  const updateSector = useCallback(
    async (id, patch) => {
      const clean = { ...patch };
      if (clean.name != null) clean.name = String(clean.name).trim();
      const { data, error } = await supabase
        .from('sectors')
        .update(clean)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      notify();
      return data;
    },
    [notify],
  );

  const deleteSector = useCallback(
    async (id) => {
      // Desliga referências (set null) antes de excluir — itens viram órfãos.
      await supabase.from('missions').update({ sector_id: null }).eq('sector_id', id);
      await supabase.from('goals').update({ sector_id: null }).eq('sector_id', id);
      await supabase.from('projects').update({ sector_id: null }).eq('sector_id', id);
      const { error } = await supabase.from('sectors').delete().eq('id', id);
      if (error) throw error;
      notify();
    },
    [notify],
  );

  // ===================== PROJECT =====================
  const createProject = useCallback(
    async (input) => {
      const row = {
        id: input.id ?? genId('p'),
        title: input.title?.trim() || 'Projeto sem título',
        description: input.description ?? null,
        sector_id: input.sector_id ?? null,
        status: input.status ?? 'active',
        created_at: todayIso(),
        target_date: input.target_date ?? null,
      };
      const { data, error } = await supabase.from('projects').insert(row).select().maybeSingle();
      if (error) throw error;
      notify();
      return data;
    },
    [notify],
  );

  const updateProject = useCallback(
    async (id, patch) => {
      const clean = { ...patch };
      if (clean.title != null) clean.title = String(clean.title).trim();
      const { data, error } = await supabase
        .from('projects')
        .update(clean)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      notify();
      return data;
    },
    [notify],
  );

  const deleteProject = useCallback(
    async (id) => {
      await supabase.from('goals').update({ project_id: null }).eq('project_id', id);
      const { error } = await supabase.from('projects').delete().eq('id', id);
      if (error) throw error;
      notify();
    },
    [notify],
  );

  // ===================== GOAL =====================
  const createGoal = useCallback(
    async (input) => {
      const row = {
        id: input.id ?? genId('g'),
        title: input.title?.trim() || 'Objetivo sem título',
        description: input.description ?? null,
        sector_id: input.sector_id ?? null,
        project_id: input.project_id ?? null,
        parent_goal_id: input.parent_goal_id ?? null,
        horizon: input.horizon ?? null,
        status: input.status ?? 'active',
        created_at: todayIso(),
        target_date: input.target_date ?? null,
      };
      const { data, error } = await supabase.from('goals').insert(row).select().maybeSingle();
      if (error) throw error;
      notify();
      return data;
    },
    [notify],
  );

  const updateGoal = useCallback(
    async (id, patch) => {
      const clean = { ...patch };
      if (clean.title != null) clean.title = String(clean.title).trim();
      const { data, error } = await supabase
        .from('goals')
        .update(clean)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      notify();
      return data;
    },
    [notify],
  );

  const deleteGoal = useCallback(
    async (id) => {
      await supabase.from('missions').update({ goal_id: null }).eq('goal_id', id);
      await supabase.from('goals').update({ parent_goal_id: null }).eq('parent_goal_id', id);
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
      notify();
    },
    [notify],
  );

  // ===================== MISSION =====================
  const createMission = useCallback(
    async (input) => {
      const row = {
        id: input.id ?? genId('m'),
        title: input.title?.trim() || 'Missão sem nome',
        description: input.description ?? null,
        sector_id: input.sector_id ?? null,
        goal_id: input.goal_id ?? null,
        parent_mission_id: input.parent_mission_id ?? null,
        importance: Math.max(1, Math.min(5, Number(input.importance ?? 3))),
        difficulty: Math.max(1, Math.min(5, Number(input.difficulty ?? 3))),
        status: 'inbox',
        harvested: false,
        focus_minutes: 0,
        xp_gained: 0,
        due_date: input.due_date || null,
        created_at: todayIso(),
        completed_at: null,
        harvested_at: null,
      };
      const { data, error } = await supabase.from('missions').insert(row).select().maybeSingle();
      if (error) throw error;
      notify();
      return data;
    },
    [notify],
  );

  const updateMission = useCallback(
    async (id, patch) => {
      const clean = { ...patch };
      if (clean.importance != null) clean.importance = Math.max(1, Math.min(5, Number(clean.importance)));
      if (clean.difficulty != null) clean.difficulty = Math.max(1, Math.min(5, Number(clean.difficulty)));
      if (clean.title != null) clean.title = String(clean.title).trim();
      const { data, error } = await supabase
        .from('missions')
        .update(clean)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      notify();
      return data;
    },
    [notify],
  );

  const deleteMission = useCallback(
    async (id) => {
      await supabase.from('missions').update({ parent_mission_id: null }).eq('parent_mission_id', id);
      const { error } = await supabase.from('missions').delete().eq('id', id);
      if (error) throw error;
      notify();
    },
    [notify],
  );

  return {
    createSector,
    updateSector,
    deleteSector,
    createProject,
    updateProject,
    deleteProject,
    createGoal,
    updateGoal,
    deleteGoal,
    createMission,
    updateMission,
    deleteMission,
  };
}
