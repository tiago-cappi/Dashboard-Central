import { useEffect, useState } from 'react';
import { supabase, SUPABASE_CONFIGURED, FINANCAS_SCHEMA } from '../../../lib/supabase.js';
import { useFinancas } from '../FinancasContext.jsx';
import { computeInsights } from '../lib/insights.js';
import { computeSummary } from '../lib/aggregations.js';
import { addMonths, deriveStatus, listMonths, monthEnd, monthStart, todayYYYYMM } from '../lib/dates.js';

const db = () => supabase.schema(FINANCAS_SCHEMA);

export function useInsights(month) {
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [insufficient, setInsufficient] = useState(false);
  const { subscribe } = useFinancas();

  async function fetch() {
    if (!SUPABASE_CONFIGURED) { setError(new Error('Supabase não configurado.')); return; }
    setLoading(true);
    setError(null);

    const windowStart = addMonths(month, -11);
    const start = monthStart(windowStart);
    const end = monthEnd(month);

    const [txRes, catRes, recRes, exRes] = await Promise.all([
      db().from('transactions').select('type, amount, date, category_id, unconfirmed').gte('date', start).lte('date', end),
      db().from('categories').select('id, name, color, type'),
      db().from('recurrences').select('*').eq('active', true),
      db().from('recurrence_exceptions').select('*').gte('occurrence_date', monthStart(month)).lte('occurrence_date', end),
    ]);

    if (txRes.error) { setError(txRes.error); setLoading(false); return; }

    const transactions = (txRes.data ?? []).map((t) => ({ ...t, status: deriveStatus(t.date, t.unconfirmed) }));

    // Verifica se há dados suficientes (≥3 meses distintos)
    const monthsWithData = new Set(transactions.map((t) => t.date.slice(0, 7)));
    if (monthsWithData.size < 3) {
      setInsufficient(true);
      setInsights([]);
      setLoading(false);
      return;
    }

    setInsufficient(false);

    // Calcula sumários mensais para detecção de streak
    const monthList = listMonths(windowStart, month);
    const monthlySummaries = monthList.map((m) => {
      const monthTx = transactions.filter((t) => t.date.startsWith(m));
      return computeSummary(monthTx);
    });

    const result = computeInsights({
      currentMonth: month,
      transactions,
      recurrences: recRes.data ?? [],
      exceptions: exRes.data ?? [],
      categories: catRes.data ?? [],
      monthlySummaries,
    });

    setInsights(result);
    setLoading(false);
  }

  useEffect(() => { fetch(); }, [month]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => subscribe(fetch), [subscribe]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data: insights, loading, error, insufficient, refetch: fetch };
}
