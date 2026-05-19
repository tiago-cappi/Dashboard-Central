import { useCallback, useEffect, useState } from 'react';
import { supabase, SUPABASE_CONFIGURED, FINANCAS_SCHEMA } from '../../../lib/supabase.js';
import { useFinancas } from '../FinancasContext.jsx';
import { computeSummary } from '../lib/aggregations.js';
import { listMonths, monthEnd, monthStart, deriveStatus, addMonths, todayYYYYMM } from '../lib/dates.js';

const db = () => supabase.schema(FINANCAS_SCHEMA);

export function useHistorySeries(granularity = 'mensal', months = 12) {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { subscribe } = useFinancas();

  const fetch = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) { setError(new Error('Supabase não configurado.')); return; }
    setLoading(true);
    setError(null);

    const endMonth = todayYYYYMM();
    const startMonth = addMonths(endMonth, -(months - 1));
    const start = monthStart(startMonth);
    const end = monthEnd(endMonth);

    const { data, error: err } = await db()
      .from('transactions')
      .select('type, amount, date, unconfirmed')
      .gte('date', start)
      .lte('date', end);

    if (err) { setError(err); setLoading(false); return; }

    const rows = (data ?? []).map((t) => ({ ...t, status: deriveStatus(t.date, t.unconfirmed) }));

    if (granularity === 'mensal') {
      const monthList = listMonths(startMonth, endMonth);
      const result = monthList.map((m) => {
        const monthTx = rows.filter((t) => t.date.startsWith(m));
        const { income, expense, balance } = computeSummary(monthTx);
        return { month: m, income, expense, balance };
      });
      setSeries(result);
    } else {
      // Anual
      const years = new Set(rows.map((t) => t.date.slice(0, 4)));
      const result = Array.from(years).sort().map((year) => {
        const yearTx = rows.filter((t) => t.date.startsWith(year));
        const { income, expense, balance } = computeSummary(yearTx);
        return { year, income, expense, balance };
      });
      setSeries(result);
    }

    setLoading(false);
  }, [granularity, months]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => subscribe(fetch), [subscribe, fetch]);

  return { data: series, loading, error, refetch: fetch };
}
