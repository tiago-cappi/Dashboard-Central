import { supabase, SUPABASE_CONFIGURED, FINANCAS_SCHEMA } from '../../../lib/supabase.js';
import { useFinancas } from '../FinancasContext.jsx';
import { isValidAmount } from '../lib/money.js';
import { todayISO } from '../lib/dates.js';

const db = () => supabase.schema(FINANCAS_SCHEMA);

export function useGoalMutations() {
  const { notify } = useFinancas();

  async function create(payload) {
    if (!SUPABASE_CONFIGURED) return { ok: false, error: new Error('Supabase não configurado.') };
    if (!payload.name?.trim()) return { ok: false, error: new Error('Nome é obrigatório.') };
    if (!isValidAmount(payload.target_amount)) return { ok: false, error: new Error('Valor-alvo deve ser maior que zero.') };

    const { error } = await db().from('goals').insert({
      name: payload.name.trim(),
      target_amount: Number(payload.target_amount),
      target_date: payload.target_date ?? null,
      archived: false,
    });
    if (error) return { ok: false, error };
    notify();
    return { ok: true };
  }

  async function update(id, patch) {
    if (!SUPABASE_CONFIGURED) return { ok: false, error: new Error('Supabase não configurado.') };
    const clean = {};
    if (patch.name !== undefined) clean.name = patch.name.trim();
    if (patch.target_amount !== undefined) clean.target_amount = Number(patch.target_amount);
    if (patch.target_date !== undefined) clean.target_date = patch.target_date || null;

    const { error } = await db().from('goals').update(clean).eq('id', id);
    if (error) return { ok: false, error };
    notify();
    return { ok: true };
  }

  async function archive(id) {
    if (!SUPABASE_CONFIGURED) return { ok: false, error: new Error('Supabase não configurado.') };
    const { error } = await db().from('goals').update({ archived: true }).eq('id', id);
    if (error) return { ok: false, error };
    notify();
    return { ok: true };
  }

  async function addContribution(goalId, payload) {
    if (!SUPABASE_CONFIGURED) return { ok: false, error: new Error('Supabase não configurado.') };
    if (!isValidAmount(payload.amount)) return { ok: false, error: new Error('Valor deve ser maior que zero.') };

    const { error } = await db().from('contributions').insert({
      goal_id: goalId,
      amount: Number(payload.amount),
      date: payload.date ?? todayISO(),
      description: payload.description?.trim() ?? null,
    });
    if (error) return { ok: false, error };
    notify();
    return { ok: true };
  }

  async function updateContribution(id, patch) {
    if (!SUPABASE_CONFIGURED) return { ok: false, error: new Error('Supabase não configurado.') };
    const clean = {};
    if (patch.amount !== undefined) clean.amount = Number(patch.amount);
    if (patch.date !== undefined) clean.date = patch.date;
    if (patch.description !== undefined) clean.description = patch.description?.trim() ?? null;

    const { error } = await db().from('contributions').update(clean).eq('id', id);
    if (error) return { ok: false, error };
    notify();
    return { ok: true };
  }

  async function removeContribution(id) {
    if (!SUPABASE_CONFIGURED) return { ok: false, error: new Error('Supabase não configurado.') };
    const { error } = await db().from('contributions').delete().eq('id', id);
    if (error) return { ok: false, error };
    notify();
    return { ok: true };
  }

  return { create, update, archive, addContribution, updateContribution, removeContribution };
}
