import { useCallback, useEffect, useState } from 'react';
import { supabase, SUPABASE_CONFIGURED, FINANCAS_SCHEMA } from '../../../lib/supabase.js';
import { useFinancas } from '../FinancasContext.jsx';
import { monthEnd, monthStart, deriveStatus } from '../lib/dates.js';
import { projectOccurrences } from '../lib/recurrence.js';

const db = () => supabase.schema(FINANCAS_SCHEMA);

export function useTransactions(filters = {}) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { subscribe } = useFinancas();

  const { month, type, categoryId, query, status } = filters;

  const fetch = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) {
      setError(new Error('Supabase não configurado.'));
      return;
    }
    setLoading(true);
    setError(null);

    // Período da consulta
    const start = monthStart(month || '2020-01');
    const end = monthEnd(month || '2099-12');

    let q = db()
      .from('transactions')
      .select('*, categories(id, name, type, color, parent_id)')
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false });

    if (type) q = q.eq('type', type);
    if (categoryId) q = q.eq('category_id', categoryId);
    if (query) q = q.ilike('description', `%${query}%`);

    const { data, error: err } = await q;

    if (err) {
      setError(err);
      setLoading(false);
      return;
    }

    let rows = (data ?? []).map((t) => ({
      ...t,
      status: deriveStatus(t.date, t.unconfirmed),
      isVirtual: false,
    }));

    // Integrar ocorrências virtuais de recorrências (FR-013)
    if (month) {
      const { data: recs } = await db()
        .from('recurrences')
        .select('*')
        .eq('active', true);

      const { data: exceptions } = await db()
        .from('recurrence_exceptions')
        .select('*')
        .gte('occurrence_date', start)
        .lte('occurrence_date', end);

      const exMap = new Map();
      for (const ex of exceptions ?? []) {
        exMap.set(`${ex.recurrence_id}:${ex.occurrence_date}`, ex);
      }

      const materializedTxIds = new Set(
        (exceptions ?? [])
          .filter((ex) => ex.kind === 'materialized' && ex.transaction_id)
          .map((ex) => ex.transaction_id),
      );

      const virtual = projectOccurrences(recs ?? [], month, exMap);
      rows = rows.filter((t) => !materializedTxIds.has(t.id) || !t.recurrence_id);
      rows = [...rows, ...virtual].sort((a, b) => b.date.localeCompare(a.date));
    }

    // Filtro de status após derivação
    if (status) {
      rows = rows.filter((t) => t.status === status);
    }

    setTransactions(rows);
    setLoading(false);
  }, [month, type, categoryId, query, status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetch(); }, [fetch]);
  useEffect(() => subscribe(fetch), [subscribe, fetch]);

  return { data: transactions, loading, error, refetch: fetch };
}
