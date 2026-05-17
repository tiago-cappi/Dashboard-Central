import { useEffect, useState } from 'react';
import { supabase, SUPABASE_CONFIGURED } from '../../../lib/supabase.js';

// Cache em módulo — sectors raramente mudam durante a sessão.
let _cache = null;
let _cachePromise = null;

async function fetchSectors() {
  if (_cache) return _cache;
  if (_cachePromise) return _cachePromise;
  _cachePromise = (async () => {
    if (!SUPABASE_CONFIGURED) return [];
    const { data, error } = await supabase
      .from('sectors')
      .select('id, name, color, archived')
      .order('name', { ascending: true });
    if (error) {
      _cachePromise = null;
      throw error;
    }
    _cache = data ?? [];
    return _cache;
  })();
  return _cachePromise;
}

export function useSectors() {
  const [sectors, setSectors] = useState(_cache ?? []);
  const [loading, setLoading] = useState(!_cache);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (_cache) return;
    let cancelled = false;
    fetchSectors()
      .then((data) => {
        if (cancelled) return;
        setSectors(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byId = new Map(sectors.map((s) => [s.id, s]));
  return { sectors, byId, loading, error };
}
