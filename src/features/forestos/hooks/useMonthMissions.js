import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase, SUPABASE_CONFIGURED } from '../../../lib/supabase.js';
import { firstDayOfMonth, lastDayOfMonth, toISO } from '../lib/calendar.js';

export function useMonthMissions(year, monthIdx, refreshKey = 0) {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) {
      setLoading(false);
      setError(new Error('Supabase não configurado. Preencha o .env.'));
      return;
    }
    setLoading(true);
    setError(null);
    const first = toISO(firstDayOfMonth(year, monthIdx));
    const last = toISO(lastDayOfMonth(year, monthIdx));
    const { data, error: err } = await supabase
      .from('missions')
      .select('id, title, sector_id, goal_id, importance, difficulty, focus_minutes, xp_gained, completed_at, status')
      .gte('completed_at', first)
      .lte('completed_at', last)
      .not('completed_at', 'is', null);
    if (err) {
      setError(err);
      setMissions([]);
    } else {
      setMissions(data ?? []);
    }
    setLoading(false);
  }, [year, monthIdx]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [load, refreshKey]);

  const byDay = useMemo(() => {
    const map = new Map();
    for (const m of missions) {
      if (!m.completed_at) continue;
      const arr = map.get(m.completed_at) ?? [];
      arr.push(m);
      map.set(m.completed_at, arr);
    }
    return map;
  }, [missions]);

  return { missions, byDay, loading, error, refetch: load };
}

export function useActiveMissions() {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) {
      setLoading(false);
      return;
    }
    const { data, error: err } = await supabase
      .from('missions')
      .select('id, title, sector_id, importance, difficulty, focus_minutes, xp_gained, status, due_date, sort_order')
      .neq('status', 'done')
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('importance', { ascending: false })
      .order('difficulty', { ascending: false });
    if (err) setError(err);
    else setMissions(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  return { missions, loading, error, refetch: load };
}
