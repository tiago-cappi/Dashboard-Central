import { supabase, SUPABASE_CONFIGURED, FINANCAS_SCHEMA } from '../../../lib/supabase.js';
import { useFinancas } from '../FinancasContext.jsx';
import { seedDefaults } from './useCategories.js';

const db = () => supabase.schema(FINANCAS_SCHEMA);

export function useCategoryMutations() {
  const { notify } = useFinancas();

  async function create(payload) {
    if (!SUPABASE_CONFIGURED) return { ok: false, error: new Error('Supabase não configurado.') };
    if (!payload.name?.trim()) return { ok: false, error: new Error('Nome é obrigatório.') };
    if (!payload.type) return { ok: false, error: new Error('Tipo é obrigatório.') };

    // Valida máximo 1 nível de aninhamento: o pai não pode ter pai (FR-011)
    if (payload.parent_id) {
      const { data: parent } = await db()
        .from('categories')
        .select('parent_id')
        .eq('id', payload.parent_id)
        .maybeSingle();
      if (parent?.parent_id) {
        return { ok: false, error: new Error('Subcategorias não podem ter subcategorias (máximo 1 nível).') };
      }
    }

    const { error } = await db().from('categories').insert({
      name: payload.name.trim(),
      type: payload.type,
      color: payload.color ?? '#a88a3d',
      parent_id: payload.parent_id ?? null,
      is_system_suggested: false,
    });
    if (error) return { ok: false, error };
    notify();
    return { ok: true };
  }

  async function update(id, patch) {
    if (!SUPABASE_CONFIGURED) return { ok: false, error: new Error('Supabase não configurado.') };
    const clean = {};
    if (patch.name !== undefined) clean.name = patch.name.trim();
    if (patch.color !== undefined) clean.color = patch.color;

    const { error } = await db().from('categories').update(clean).eq('id', id);
    if (error) return { ok: false, error };
    notify();
    return { ok: true };
  }

  async function remove(id, reassignToId) {
    if (!SUPABASE_CONFIGURED) return { ok: false, error: new Error('Supabase não configurado.') };

    // Verifica se há transações vinculadas
    const { data: linked } = await db()
      .from('transactions')
      .select('id')
      .eq('category_id', id)
      .limit(1);

    if (linked?.length > 0 && !reassignToId) {
      return { ok: false, error: new Error('Categoria possui lançamentos. Selecione uma categoria para realocação.') };
    }

    // Realoca transações se necessário
    if (linked?.length > 0 && reassignToId) {
      const { error: reErr } = await db()
        .from('transactions')
        .update({ category_id: reassignToId })
        .eq('category_id', id);
      if (reErr) return { ok: false, error: reErr };
    }

    const { error } = await db().from('categories').delete().eq('id', id);
    if (error) return { ok: false, error };
    notify();
    return { ok: true };
  }

  return { create, update, remove, seedDefaults: () => seedDefaults().then((r) => { if (r.ok) notify(); return r; }) };
}
