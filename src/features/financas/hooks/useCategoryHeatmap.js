import { useCallback, useEffect, useState } from 'react';
import { supabase, SUPABASE_CONFIGURED, FINANCAS_SCHEMA } from '../../../lib/supabase.js';
import { useFinancas } from '../FinancasContext.jsx';
import { addMonths, listMonths, monthEnd, monthStart, todayYYYYMM, deriveStatus } from '../lib/dates.js';

const db = () => supabase.schema(FINANCAS_SCHEMA);

export function useCategoryHeatmap(months = 12) {
  const [heatmap, setHeatmap] = useState({ categories: [], months: [], cells: [] });
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

    const [txRes, catRes] = await Promise.all([
      db().from('transactions').select('type, amount, date, category_id, unconfirmed').gte('date', start).lte('date', end).eq('type', 'despesa'),
      db().from('categories').select('id, name, color, type').eq('type', 'despesa').is('parent_id', null),
    ]);

    if (txRes.error) { setError(txRes.error); setLoading(false); return; }
    if (catRes.error) { setError(catRes.error); setLoading(false); return; }

    const monthList = listMonths(startMonth, endMonth);
    const categories = catRes.data ?? [];

    // cells[catIdx][monthIdx] = total
    const cells = categories.map((cat) =>
      monthList.map((m) => {
        const sum = (txRes.data ?? [])
          .filter((t) =>
            t.category_id === cat.id &&
            t.date.startsWith(m) &&
            deriveStatus(t.date, t.unconfirmed) === 'realizado'
          )
          .reduce((acc, t) => acc + Number(t.amount), 0);
        return sum;
      })
    );

    setHeatmap({ categories, months: monthList, cells });
    setLoading(false);
  }, [months]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => subscribe(fetch), [subscribe, fetch]);

  return { data: heatmap, loading, error, refetch: fetch };
}
