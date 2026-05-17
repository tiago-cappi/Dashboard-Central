import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, SUPABASE_CONFIGURED } from '../../../lib/supabase.js';
import { useFocus } from '../FocusContext.jsx';

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
 * Decide se um hábito está "devido" em um dia específico.
 * - daily: sempre, exceto se já completou hoje
 * - weekly: completou há >= 7 dias (ou nunca)
 * - custom: o dia da semana atual está em custom_days (0=Dom, 6=Sáb) e não completou hoje
 */
export function isHabitDueToday(habit, dateIso = todayIso()) {
  if (!habit || !habit.active) return false;
  const last = habit.last_completed_at || null;
  if (last === dateIso) return false; // já completou hoje
  const freq = habit.frequency || 'daily';
  if (freq === 'daily') return true;
  if (freq === 'weekly') {
    if (!last) return true;
    return diffDays(last, dateIso) >= 7;
  }
  if (freq === 'custom') {
    const dow = new Date(`${dateIso}T00:00:00`).getDay();
    const days = Array.isArray(habit.custom_days) ? habit.custom_days.map(Number) : [];
    return days.includes(dow);
  }
  return false;
}

export function isHabitCompletedToday(habit, dateIso = todayIso()) {
  return habit?.last_completed_at === dateIso;
}

export function useHabits() {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { subscribe } = useFocus();

  const load = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) {
      setLoading(false);
      setError(new Error('Supabase não configurado.'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('habits')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('title');
      if (err) throw err;
      setHabits(data ?? []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => subscribe(() => load()), [subscribe, load]);

  const today = todayIso();

  const groups = useMemo(() => {
    const active = habits.filter((h) => h.active);
    const due = active.filter((h) => isHabitDueToday(h, today));
    const completedToday = active.filter((h) => isHabitCompletedToday(h, today));
    return { active, due, completedToday };
  }, [habits, today]);

  return {
    habits,
    activeHabits: groups.active,
    dueToday: groups.due,
    completedToday: groups.completedToday,
    loading,
    error,
    refetch: load,
    today,
  };
}
