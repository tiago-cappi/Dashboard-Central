import { useCallback } from 'react';
import { supabase } from '../../../lib/supabase.js';
import { useFocus } from '../FocusContext.jsx';

function genId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useMissionMutations() {
  const { notify } = useFocus();

  const createMission = useCallback(
    async (input) => {
      const today = new Date();
      const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const row = {
        id: input.id ?? genId(),
        title: input.title?.trim() || 'Missão sem nome',
        description: input.description ?? null,
        sector_id: input.sector_id ?? null,
        goal_id: input.goal_id ?? null,
        parent_mission_id: input.parent_mission_id ?? null,
        importance: Math.max(1, Math.min(5, Number(input.importance ?? 3))),
        difficulty: Math.max(1, Math.min(5, Number(input.difficulty ?? 3))),
        status: 'active',
        harvested: false,
        focus_minutes: 0,
        xp_gained: 0,
        due_date: input.due_date || null,
        created_at: todayIso,
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
      const { error } = await supabase.from('missions').delete().eq('id', id);
      if (error) throw error;
      notify();
    },
    [notify],
  );

  const reorderMissions = useCallback(
    async (orderedIds) => {
      await Promise.all(
        orderedIds.map((id, i) =>
          supabase.from('missions').update({ sort_order: (i + 1) * 10 }).eq('id', id),
        ),
      );
      notify();
    },
    [notify],
  );

  return { createMission, updateMission, deleteMission, reorderMissions };
}
