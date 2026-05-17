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

export function useReminderMutations() {
  const { notify } = useFocus();

  const createReminder = useCallback(
    async (input) => {
      const row = {
        id: input.id ?? genId('rem'),
        title: input.title?.trim() || 'Lembrete sem título',
        message: input.title?.trim() || 'Lembrete sem título',
        frequency: input.frequency ?? 'daily',
        custom_days: input.custom_days ?? null,
        time_of_day: input.time_of_day ?? null,
        sector_id: input.sector_id ?? null,
        goal_id: input.goal_id ?? null,
        due_at: input.due_at ?? null,
        last_acked_at: null,
        acknowledged: false,
        active: input.active ?? true,
        created_at: todayIso(),
        repeat: input.frequency === 'once' ? 'none' : (input.frequency ?? 'daily'),
      };
      const { data, error } = await supabase
        .from('reminders')
        .insert(row)
        .select()
        .maybeSingle();
      if (error) throw error;
      notify();
      return data;
    },
    [notify],
  );

  const updateReminder = useCallback(
    async (id, patch) => {
      const clean = { ...patch };
      if (clean.title != null) {
        clean.title = String(clean.title).trim();
        clean.message = clean.title;
      }
      if (clean.frequency != null) {
        clean.repeat = clean.frequency === 'once' ? 'none' : clean.frequency;
      }
      const { data, error } = await supabase
        .from('reminders')
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

  const deleteReminder = useCallback(
    async (id) => {
      const { error } = await supabase.from('reminders').delete().eq('id', id);
      if (error) throw error;
      notify();
    },
    [notify],
  );

  const acknowledgeReminder = useCallback(
    async (reminderId) => {
      const today = todayIso();
      const { data: r } = await supabase
        .from('reminders')
        .select('*')
        .eq('id', reminderId)
        .maybeSingle();
      if (!r) return null;
      if (r.last_acked_at === today) return r; // idempotente

      const patch = { last_acked_at: today };
      if (r.frequency === 'once') patch.acknowledged = true;

      await supabase.from('reminders').update(patch).eq('id', reminderId);

      await supabase.from('events').insert({
        type: 'reminder_ack',
        entity_type: 'reminder',
        entity_id: reminderId,
        entity_title: r.title || r.message,
        focus_minutes: 0,
        xp_gained: 0,
        data: { frequency: r.frequency },
      });

      notify();
      return { reminderId, ackedAt: today };
    },
    [notify],
  );

  const unacknowledgeReminder = useCallback(
    async (reminderId) => {
      const today = todayIso();
      const { data: r } = await supabase
        .from('reminders')
        .select('*')
        .eq('id', reminderId)
        .maybeSingle();
      if (!r || r.last_acked_at !== today) return null;
      const patch = { last_acked_at: null };
      if (r.frequency === 'once') patch.acknowledged = false;
      await supabase.from('reminders').update(patch).eq('id', reminderId);
      notify();
      return { reminderId };
    },
    [notify],
  );

  const reorderReminders = useCallback(
    async (orderedIds) => {
      await Promise.all(
        orderedIds.map((id, i) =>
          supabase.from('reminders').update({ sort_order: (i + 1) * 10 }).eq('id', id),
        ),
      );
      notify();
    },
    [notify],
  );

  return {
    createReminder,
    updateReminder,
    deleteReminder,
    acknowledgeReminder,
    unacknowledgeReminder,
    reorderReminders,
  };
}
