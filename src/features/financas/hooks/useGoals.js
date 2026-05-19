import { useCallback, useEffect, useState } from 'react';
import { supabase, SUPABASE_CONFIGURED, FINANCAS_SCHEMA } from '../../../lib/supabase.js';
import { useFinancas } from '../FinancasContext.jsx';
import { todayISO } from '../lib/dates.js';

const db = () => supabase.schema(FINANCAS_SCHEMA);

function projectDate(accumulated, targetAmount, contributions) {
  if (accumulated >= targetAmount) return null; // já atingida
  if (contributions.length < 2) return null;

  // Taxa média mensal dos últimos aportes
  const sorted = [...contributions].sort((a, b) => a.date.localeCompare(b.date));
  const totalAdded = sorted.reduce((s, c) => s + Number(c.amount), 0);
  const span = sorted.length;
  const avgPerMonth = totalAdded / span;
  if (avgPerMonth <= 0) return null;

  const remaining = targetAmount - accumulated;
  const monthsNeeded = Math.ceil(remaining / avgPerMonth);
  const d = new Date();
  d.setMonth(d.getMonth() + monthsNeeded);
  return d.toISOString().slice(0, 10);
}

export function useGoals(includeArchived = false) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { subscribe } = useFinancas();

  const fetch = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) { setError(new Error('Supabase não configurado.')); return; }
    setLoading(true);
    setError(null);

    let q = db().from('goals').select('*, contributions(*)').order('created_at');
    if (!includeArchived) q = q.eq('archived', false);

    const { data, error: err } = await q;
    if (err) { setError(err); setLoading(false); return; }

    const withProgress = (data ?? []).map((g) => {
      const contributions = g.contributions ?? [];
      const accumulated = contributions.reduce((s, c) => s + Number(c.amount), 0);
      const percent = g.target_amount > 0 ? accumulated / g.target_amount : 0;
      const projectedDate = projectDate(accumulated, g.target_amount, contributions);
      return { ...g, accumulated, percent, projectedDate };
    });

    setGoals(withProgress);
    setLoading(false);
  }, [includeArchived]);

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => subscribe(fetch), [subscribe, fetch]);

  return { data: goals, loading, error, refetch: fetch };
}
