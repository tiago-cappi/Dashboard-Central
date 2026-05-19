import { deriveStatus, monthEnd, monthStart } from './dates.js';

export function computeSummary(transactions) {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (deriveStatus(t.date, t.unconfirmed) !== 'realizado') continue;
    if (t.type === 'receita') income += Number(t.amount);
    else expense += Number(t.amount);
  }
  const balance = income - expense;
  const savingsRate = income > 0 ? balance / income : 0;
  return { income, expense, balance, savingsRate };
}

export function computeByCategory(transactions) {
  const map = new Map();
  for (const t of transactions) {
    if (deriveStatus(t.date, t.unconfirmed) !== 'realizado') continue;
    const key = t.category_id;
    map.set(key, (map.get(key) ?? 0) + Number(t.amount));
  }
  return map;
}

export function computeDailyBalance(transactions, yyyymm) {
  const start = monthStart(yyyymm);
  const end = monthEnd(yyyymm);
  const [, , lastDay] = end.split('-').map(Number);
  const [y, m] = yyyymm.split('-').map(Number);

  const realized = transactions.filter((t) => deriveStatus(t.date, t.unconfirmed) === 'realizado');
  const byDay = new Map();
  for (const t of realized) {
    const delta = t.type === 'receita' ? Number(t.amount) : -Number(t.amount);
    byDay.set(t.date, (byDay.get(t.date) ?? 0) + delta);
  }

  const points = [];
  let running = 0;
  for (let d = 1; d <= lastDay; d++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    running += byDay.get(dateStr) ?? 0;
    points.push({ date: dateStr, balance: running });
  }
  return points;
}

export function topExpenses(transactions, n = 5) {
  return transactions
    .filter((t) => t.type === 'despesa' && deriveStatus(t.date, t.unconfirmed) === 'realizado')
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, n);
}

export function computeSavingsStreak(monthlySummaries) {
  let streak = 0;
  for (let i = monthlySummaries.length - 1; i >= 0; i--) {
    if (monthlySummaries[i].savingsRate > 0) streak++;
    else break;
  }
  return streak;
}
