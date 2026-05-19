import { supabase, SUPABASE_CONFIGURED, FINANCAS_SCHEMA } from '../../../lib/supabase.js';
import { useFinancas } from '../FinancasContext.jsx';
import { isValidAmount } from '../lib/money.js';

const db = () => supabase.schema(FINANCAS_SCHEMA);

export function useTransactionMutations() {
  const { notify } = useFinancas();

  async function create(payload) {
    if (!SUPABASE_CONFIGURED) return { ok: false, error: new Error('Supabase não configurado.') };
    if (!isValidAmount(payload.amount)) return { ok: false, error: new Error('Valor deve ser maior que zero.') };
    if (!payload.category_id) return { ok: false, error: new Error('Categoria obrigatória.') };
    if (!payload.date) return { ok: false, error: new Error('Data obrigatória.') };
    if (!payload.description?.trim()) return { ok: false, error: new Error('Descrição obrigatória.') };

    const { error } = await db().from('transactions').insert({
      type: payload.type,
      amount: Number(payload.amount),
      date: payload.date,
      description: payload.description.trim(),
      category_id: payload.category_id,
      unconfirmed: payload.unconfirmed ?? false,
    });

    if (error) return { ok: false, error };
    notify();
    return { ok: true };
  }

  async function update(id, patch) {
    if (!SUPABASE_CONFIGURED) return { ok: false, error: new Error('Supabase não configurado.') };
    if (patch.amount !== undefined && !isValidAmount(patch.amount)) {
      return { ok: false, error: new Error('Valor deve ser maior que zero.') };
    }

    const clean = { ...patch, updated_at: new Date().toISOString() };
    if (clean.amount) clean.amount = Number(clean.amount);

    const { error } = await db().from('transactions').update(clean).eq('id', id);
    if (error) return { ok: false, error };
    notify();
    return { ok: true };
  }

  async function remove(id) {
    if (!SUPABASE_CONFIGURED) return { ok: false, error: new Error('Supabase não configurado.') };
    const { error } = await db().from('transactions').delete().eq('id', id);
    if (error) return { ok: false, error };
    notify();
    return { ok: true };
  }

  async function materializeOccurrence(recurrenceId, occurrenceDate, patch = {}) {
    if (!SUPABASE_CONFIGURED) return { ok: false, error: new Error('Supabase não configurado.') };

    const { data: rec } = await db()
      .from('recurrences')
      .select('*')
      .eq('id', recurrenceId)
      .maybeSingle();

    if (!rec) return { ok: false, error: new Error('Recorrência não encontrada.') };

    const { data: tx, error: txErr } = await db()
      .from('transactions')
      .insert({
        type: rec.type,
        amount: Number(patch.amount ?? rec.amount),
        date: patch.date ?? occurrenceDate,
        description: patch.description ?? rec.description,
        category_id: patch.category_id ?? rec.category_id,
        recurrence_id: recurrenceId,
        unconfirmed: false,
      })
      .select()
      .maybeSingle();

    if (txErr) return { ok: false, error: txErr };

    const { error: exErr } = await db().from('recurrence_exceptions').upsert({
      recurrence_id: recurrenceId,
      occurrence_date: occurrenceDate,
      kind: 'materialized',
      transaction_id: tx.id,
    }, { onConflict: 'recurrence_id,occurrence_date' });

    if (exErr) return { ok: false, error: exErr };

    notify();
    return { ok: true };
  }

  async function setUnconfirmed(id, value) {
    if (!SUPABASE_CONFIGURED) return { ok: false, error: new Error('Supabase não configurado.') };
    const { error } = await db()
      .from('transactions')
      .update({ unconfirmed: Boolean(value), updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { ok: false, error };
    notify();
    return { ok: true };
  }

  return { create, update, remove, materializeOccurrence, setUnconfirmed };
}
