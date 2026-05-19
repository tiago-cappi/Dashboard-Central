import { useCallback, useEffect, useState } from 'react';
import { useTransactions } from './useTransactions.js';
import { computeSummary } from '../lib/aggregations.js';
import { prevMonth } from '../lib/dates.js';

export function useMonthlySummary(month) {
  const { data: currentTx, loading, error, refetch } = useTransactions({ month });
  const { data: prevTx } = useTransactions({ month: prevMonth(month) });

  const [summary, setSummary] = useState(null);

  useEffect(() => {
    const cur = computeSummary(currentTx);
    const prev = computeSummary(prevTx);

    const deltaIncome = prev.income > 0
      ? (cur.income - prev.income) / prev.income
      : null;
    const deltaExpense = prev.expense > 0
      ? (cur.expense - prev.expense) / prev.expense
      : null;
    const deltaBalance = prev.balance !== 0
      ? (cur.balance - prev.balance) / Math.abs(prev.balance)
      : null;

    setSummary({
      ...cur,
      deltaIncome,
      deltaExpense,
      deltaBalance,
      deltaVsPrevMonth: { income: deltaIncome, expense: deltaExpense, balance: deltaBalance },
    });
  }, [currentTx, prevTx]);

  return { data: summary, loading, error, refetch };
}
