import { useEffect, useState } from 'react';
import { supabase, SUPABASE_CONFIGURED } from '../../../lib/supabase.js';

export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!SUPABASE_CONFIGURED) {
        setLoading(false);
        return;
      }
      const { data, error: err } = await supabase
        .from('profile')
        .select(
          'id, total_xp, level, counter_sectors, counter_projects, counter_goals, counter_missions, counter_habits, counter_reminders, counter_notes, studies_counter, updated_at',
        )
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (err) setError(err);
      else setProfile(data);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { profile, loading, error };
}
