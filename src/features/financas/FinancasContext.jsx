import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const FinancasContext = createContext(null);

function todayYYYYMM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function FinancasProvider({ children }) {
  const subscribersRef = useRef(new Set());
  const [selectedMonth, setSelectedMonth] = useState(todayYYYYMM);
  // activeFilters: { categoryId?, type?, query?, status? } — compartilhado para drill-down (FR-017)
  const [activeFilters, setActiveFilters] = useState({});

  const notify = useCallback(() => {
    for (const fn of subscribersRef.current) fn();
  }, []);

  const subscribe = useCallback((fn) => {
    subscribersRef.current.add(fn);
    return () => subscribersRef.current.delete(fn);
  }, []);

  const value = useMemo(
    () => ({ notify, subscribe, selectedMonth, setSelectedMonth, activeFilters, setActiveFilters }),
    [notify, subscribe, selectedMonth, activeFilters],
  );

  return <FinancasContext.Provider value={value}>{children}</FinancasContext.Provider>;
}

export function useFinancas() {
  const ctx = useContext(FinancasContext);
  if (!ctx) throw new Error('useFinancas precisa de <FinancasProvider>');
  return ctx;
}
