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

function diffDays(a, b) {
  if (!a || !b) return Infinity;
  const da = new Date(`${a}T00:00:00`);
  const db = new Date(`${b}T00:00:00`);
  return Math.round((db.getTime() - da.getTime()) / 86400000);
}

/**
 * Calcula próximo streak ao completar um hábito hoje.
 * - daily: se last era ontem (diff===1) ou completou hoje (manter), +1
 * - weekly: se diff <= 7, +1
 * - custom: se diff <= 7, +1 (heurística simples)
 * - caso contrário: reseta para 1
 */
function nextStreak(habit, today) {
  const last = habit.last_completed_at;
  if (!last) return 1;
  if (last === today) return habit.current_streak || 1;
  const diff = diffDays(last, today);
  if (habit.frequency === 'daily') {
    return diff === 1 ? (habit.current_streak || 0) + 1 : 1;
  }
  if (habit.frequency === 'weekly') {
    return diff <= 7 ? (habit.current_streak || 0) + 1 : 1;
  }
  if (habit.frequency === 'custom') {
    return diff <= 7 ? (habit.current_streak || 0) + 1 : 1;
  }
  return 1;
}

/**
 * Mutations para hábitos. Espelha useTreeMutations no estilo, e usa
 * notify() do FocusContext para refetch global.
 */
export function useHabitMutations() {
  const { notify, reloadProfile } = useFocus();

  const createHabit = useCallback(
    async (input) => {
      const row = {
        id: input.id ?? genId('h'),
        title: input.title?.trim() || 'Hábito sem título',
        description: input.description ?? null,
        sector_id: input.sector_id ?? null,
        goal_id: input.goal_id ?? null,
        project_id: input.project_id ?? null,
        frequency: input.frequency ?? 'daily',
        custom_days: input.custom_days ?? null,
        importance: Number(input.importance ?? 3),
        difficulty: Number(input.difficulty ?? 3),
        current_streak: 0,
        best_streak: 0,
        last_completed_at: null,
        created_at: todayIso(),
        active: input.active ?? true,
        color: input.color ?? null,
        focus_minutes: 0,
        xp_gained: 0,
      };
      const { data, error } = await supabase
        .from('habits')
        .insert(row)
        .select()
        .maybeSingle();
      if (error) throw error;
      notify();
      return data;
    },
    [notify],
  );

  const updateHabit = useCallback(
    async (id, patch) => {
      const clean = { ...patch };
      if (clean.title != null) clean.title = String(clean.title).trim();
      const { data, error } = await supabase
        .from('habits')
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

  const deleteHabit = useCallback(
    async (id) => {
      const { error } = await supabase.from('habits').delete().eq('id', id);
      if (error) throw error;
      notify();
    },
    [notify],
  );

  /**
   * Marca o hábito como completo hoje, incrementa streak e registra evento.
   * O XP é colhido automaticamente ao fim de cada sessão de foco (ver
   * FocusContext.pauseFocus), portanto a conclusão em si não credita XP novo.
   */
  const completeHabit = useCallback(
    async (habitId) => {
      const today = todayIso();
      const { data: h } = await supabase
        .from('habits')
        .select('*')
        .eq('id', habitId)
        .maybeSingle();
      if (!h) return null;
      if (h.last_completed_at === today) return h; // idempotente

      const newCurrent = nextStreak(h, today);
      const newBest = Math.max(Number(h.best_streak ?? 0), newCurrent);

      await supabase
        .from('habits')
        .update({
          last_completed_at: today,
          current_streak: newCurrent,
          best_streak: newBest,
        })
        .eq('id', habitId);

      await supabase.from('events').insert({
        type: 'habit_complete',
        entity_type: 'habit',
        entity_id: habitId,
        entity_title: h.title,
        focus_minutes: 0,
        xp_gained: 0,
        streak_before: Number(h.current_streak ?? 0),
        streak_after: newCurrent,
        data: { frequency: h.frequency },
      });

      await reloadProfile?.();
      notify();
      return { habitId, newCurrent, newBest };
    },
    [notify, reloadProfile],
  );

  /**
   * Desfaz a marcação de "completo hoje" (útil para corrigir cliques acidentais).
   * Decrementa streak e remove last_completed_at se for hoje.
   */
  const uncompleteHabit = useCallback(
    async (habitId) => {
      const today = todayIso();
      const { data: h } = await supabase
        .from('habits')
        .select('*')
        .eq('id', habitId)
        .maybeSingle();
      if (!h || h.last_completed_at !== today) return null;
      const newCurrent = Math.max(0, Number(h.current_streak ?? 0) - 1);
      await supabase
        .from('habits')
        .update({
          last_completed_at: null,
          current_streak: newCurrent,
        })
        .eq('id', habitId);
      notify();
      return { habitId, newCurrent };
    },
    [notify],
  );

  const reorderHabits = useCallback(
    async (orderedIds) => {
      await Promise.all(
        orderedIds.map((id, i) =>
          supabase.from('habits').update({ sort_order: (i + 1) * 10 }).eq('id', id),
        ),
      );
      notify();
    },
    [notify],
  );

  return {
    createHabit,
    updateHabit,
    deleteHabit,
    completeHabit,
    uncompleteHabit,
    reorderHabits,
  };
}
