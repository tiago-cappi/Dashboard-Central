import { supabase, SUPABASE_CONFIGURED, FINANCAS_SCHEMA } from '../../../lib/supabase.js';
import { useFinancas } from '../FinancasContext.jsx';
import { isValidAmount } from '../lib/money.js';

const db = () => supabase.schema(FINANCAS_SCHEMA);

export function useRecurrenceMutations() {
  const { notify } = useFinancas();

  async function create(payload) {
    if (!SUPABASE_CONFIGURED) return { ok: false, error: new Error('Supabase não configurado.') };
    if (!isValidAmount(payload.amount)) return { ok: false, error: new Error('Valor deve ser maior que zero.') };
    if (!payload.category_id) return { ok: false, error: new Error('Categoria obrigatória.') };
    if (!payload.start_date) return { ok: false, error: new Error('Data de início obrigatória.') };

    const { error } = await db().from('recurrences').insert({
      type: payload.type,
      amount: Number(payload.amount),
      description: payload.description?.trim() ?? '',
      category_id: payload.category_id,
      frequency: payload.frequency ?? 'mensal',
      start_date: payload.start_date,
      end_date: payload.end_date ?? null,
      active: true,
    });
    if (error) return { ok: false, error };
    notify();
    return { ok: true };
  }

  // scope: 'serie' — afeta toda a série a partir de agora (passado materializado intacto)
  async function updateSeries(id, patch) {
    if (!SUPABASE_CONFIGURED) return { ok: false, error: new Error('Supabase não configurado.') };
    const clean = {};
    if (patch.amount !== undefined) clean.amount = Number(patch.amount);
    if (patch.description !== undefined) clean.description = patch.description.trim();
    if (patch.category_id !== undefined) clean.category_id = patch.category_id;
    if (patch.end_date !== undefined) clean.end_date = patch.end_date || null;

    const { error } = await db().from('recurrences').update(clean).eq('id', id);
    if (error) return { ok: false, error };
    notify();
    return { ok: true };
  }

  async function end(id) {
    if (!SUPABASE_CONFIGURED) return { ok: false, error: new Error('Supabase não configurado.') };
    const { error } = await db().from('recurrences').update({ active: false }).eq('id', id);
    if (error) return { ok: false, error };
    notify();
    return { ok: true };
  }

  return { create, updateSeries, end };
}
