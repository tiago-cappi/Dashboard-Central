import { useCallback, useEffect, useState } from 'react';
import { supabase, SUPABASE_CONFIGURED, FINANCAS_SCHEMA } from '../../../lib/supabase.js';
import { useFinancas } from '../FinancasContext.jsx';
import { computeByCategory } from '../lib/aggregations.js';
import { useTransactions } from './useTransactions.js';

const db = () => supabase.schema(FINANCAS_SCHEMA);

function bandFor(pct) {
  if (pct >= 1) return 'over';
  if (pct >= 0.8) return 'warning';
  return 'ok';
}

export function useBudgets(month) {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { subscribe } = useFinancas();

  const { data: txList } = useTransactions({ month, type: 'despesa' });
  const spentByCategory = computeByCategory(txList);

  const fetch = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) { setError(new Error('Supabase não configurado.')); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await db()
      .from('budgets')
      .select('*, categories(id, name, color)')
      .eq('month', `${month}-01`);
    if (err) { setError(err); setLoading(false); return; }
    setBudgets(data ?? []);
    setLoading(false);
  }, [month]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => subscribe(fetch), [subscribe, fetch]);

  const withUsage = budgets.map((b) => {
    const spent = spentByCategory.get(b.category_id) ?? 0;
    const pct = b.planned_amount > 0 ? spent / b.planned_amount : 0;
    return { ...b, spent, percent: pct, band: bandFor(pct) };
  });

  return { data: withUsage, loading, error, refetch: fetch };
}
