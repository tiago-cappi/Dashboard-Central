import { useCallback, useEffect, useState } from 'react';
import { supabase, SUPABASE_CONFIGURED, FINANCAS_SCHEMA } from '../../../lib/supabase.js';
import { useFinancas } from '../FinancasContext.jsx';

const db = () => supabase.schema(FINANCAS_SCHEMA);

export function useRecurrences(activeOnly = false) {
  const [recurrences, setRecurrences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { subscribe } = useFinancas();

  const fetch = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) { setError(new Error('Supabase não configurado.')); return; }
    setLoading(true);
    setError(null);
    let q = db().from('recurrences').select('*, categories(id, name, color, type)').order('start_date', { ascending: false });
    if (activeOnly) q = q.eq('active', true);
    const { data, error: err } = await q;
    if (err) setError(err);
    else setRecurrences(data ?? []);
    setLoading(false);
  }, [activeOnly]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => subscribe(fetch), [subscribe, fetch]);

  return { data: recurrences, loading, error, refetch: fetch };
}
