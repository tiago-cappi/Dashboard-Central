import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, SUPABASE_CONFIGURED, FINANCAS_SCHEMA } from '../../../lib/supabase.js';
import { useFinancas } from '../FinancasContext.jsx';
import { DEFAULT_CATEGORIES } from '../lib/seed-categories.js';

const db = () => supabase.schema(FINANCAS_SCHEMA);

function buildTree(flat) {
  const roots = flat.filter((c) => !c.parent_id);
  return roots.map((root) => ({
    ...root,
    children: flat.filter((c) => c.parent_id === root.id),
  }));
}

export function useCategories() {
  const [flat, setFlat] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { subscribe } = useFinancas();
  const seededRef = useRef(false);

  const fetchCategories = useCallback(async () => {
    if (!SUPABASE_CONFIGURED) {
      setError(new Error('Supabase não configurado. Verifique as variáveis de ambiente.'));
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await db()
      .from('categories')
      .select('*')
      .order('type')
      .order('name');
    if (err) {
      setError(err);
    } else {
      setFlat(data ?? []);
      if (!seededRef.current && (data ?? []).length === 0) {
        seededRef.current = true;
        await seedDefaults();
        await fetchCategories();
        return;
      }
      seededRef.current = true;
    }
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => subscribe(fetchCategories), [subscribe, fetchCategories]);

  const tree = buildTree(flat);

  return { data: { flat, tree }, loading, error, refetch: fetchCategories };
}

export async function seedDefaults() {
  if (!SUPABASE_CONFIGURED) return { ok: false, error: new Error('Supabase não configurado') };
  const { data: existing } = await db().from('categories').select('name, type');
  const existingKeys = new Set((existing ?? []).map((c) => `${c.type}:${c.name}`));
  const toInsert = DEFAULT_CATEGORIES.filter(
    (c) => !existingKeys.has(`${c.type}:${c.name}`),
  );
  if (toInsert.length === 0) return { ok: true };
  const { error } = await db().from('categories').insert(toInsert);
  if (error) return { ok: false, error };
  return { ok: true };
}
