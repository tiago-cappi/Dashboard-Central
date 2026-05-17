import { useEffect, useState } from 'react';
import { supabase, SUPABASE_CONFIGURED } from '../../../lib/supabase.js';

export function useGoalsByIds(ids) {
  const [goals, setGoals] = useState(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!SUPABASE_CONFIGURED) return;
    const uniq = Array.from(new Set((ids ?? []).filter(Boolean)));
    if (uniq.length === 0) {
      setGoals(new Map());
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from('goals')
      .select('id, title, sector_id, horizon, status')
      .in('id', uniq)
      .then(({ data }) => {
        if (cancelled) return;
        setGoals(new Map((data ?? []).map((g) => [g.id, g])));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify((ids ?? []).slice().sort())]);

  return { goals, loading };
}
