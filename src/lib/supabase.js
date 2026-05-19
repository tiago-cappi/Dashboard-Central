import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const schema = import.meta.env.VITE_FORESTOS_SCHEMA || 'forestos';

const key = publishableKey || anonKey;

if (!url || !key) {
  // Aviso no console — não derruba o app; a UI mostra estado de erro nos hooks.
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] VITE_SUPABASE_URL e/ou chave (PUBLISHABLE/ANON) ausentes. Copie .env.example para .env e preencha as variáveis.',
  );
}

export const supabase = createClient(url ?? '', key ?? '', {
  db: { schema },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

export const SUPABASE_CONFIGURED = Boolean(url && key);
export const FORESTOS_SCHEMA = schema;
export const FINANCAS_SCHEMA = import.meta.env.VITE_FINANCAS_SCHEMA || 'financas';
