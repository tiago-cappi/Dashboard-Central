import { supabase, SUPABASE_CONFIGURED, FINANCAS_SCHEMA } from '../../../lib/supabase.js';
import { useFinancas } from '../FinancasContext.jsx';
import { isValidAmount } from '../lib/money.js';

const db = () => supabase.schema(FINANCAS_SCHEMA);

export function useBudgetMutations() {
  const { notify } = useFinancas();

  async function upsert(categoryId, month, plannedAmount) {
    if (!SUPABASE_CONFIGURED) return { ok: false, error: new Error('Supabase não configurado.') };
    if (!isValidAmount(plannedAmount)) return { ok: false, error: new Error('Valor deve ser maior que zero.') };

    const { error } = await db().from('budgets').upsert({
      category_id: categoryId,
      month: `${month}-01`,
      planned_amount: Number(plannedAmount),
    }, { onConflict: 'category_id,month' });

    if (error) return { ok: false, error };
    notify();
    return { ok: true };
  }

  async function remove(id) {
    if (!SUPABASE_CONFIGURED) return { ok: false, error: new Error('Supabase não configurado.') };
    const { error } = await db().from('budgets').delete().eq('id', id);
    if (error) return { ok: false, error };
    notify();
    return { ok: true };
  }

  return { upsert, remove };
}
