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

export function isReminderDueToday(reminder, dateIso = todayIso()) {
  if (!reminder || reminder.active === false) return false;
  const last = reminder.last_acked_at || null;
  if (last === dateIso) return false;
  const freq = reminder.frequency || 'daily';
  if (freq === 'once') {
    if (reminder.acknowledged) return false;
    if (reminder.due_at) return reminder.due_at <= dateIso;
    return true;
  }
  if (freq === 'daily') return true;
  if (freq === 'weekly') {
    if (!last) return true;
    return diffDays(last, dateIso) >= 7;
  }
  if (freq === 'custom') {
    const dow = new Date(`${dateIso}T00:00:00`).getDay();
    const days = Array.isArray(reminder.custom_days) ? reminder.custom_days.map(Number) : [];
    return days.includes(dow);
  }
  return false;
}

export function isReminderAckedToday(reminder, dateIso = todayIso()) {
  return reminder?.last_acked_at === dateIso;
}

export function useReminders() {
  const [reminders, setReminders] = useState([]);
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
        .from('reminders')
        .select('*')
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('title');
      if (err) throw err;
      setReminders(data ?? []);
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
    const active = reminders.filter((r) => r.active !== false);
    const due = active.filter((r) => isReminderDueToday(r, today));
    const ackedToday = active.filter((r) => isReminderAckedToday(r, today));
    return { active, due, ackedToday };
  }, [reminders, today]);

  return {
    reminders,
    activeReminders: groups.active,
    dueToday: groups.due,
    ackedToday: groups.ackedToday,
    loading,
    error,
    refetch: load,
    today,
  };
}
