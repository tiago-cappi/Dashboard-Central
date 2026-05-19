import { useState } from 'react';
import { useTransactions } from '../hooks/useTransactions.js';
import { useCategories } from '../hooks/useCategories.js';
import { computeByCategory, computeSummary } from '../lib/aggregations.js';
import { formatBRL, formatPercent } from '../lib/money.js';
import { prevMonth, formatMonthFull, todayYYYYMM } from '../lib/dates.js';

function MonthPicker({ value, onChange, label }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-eb smallcaps text-[11px] text-[#7a6442]">{label}</span>
      <input
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        max={todayYYYYMM()}
        className="num text-[13px] border border-[#a88a3d]/50 bg-[#faf3e0] px-2 py-1 text-[#3a2a18] focus:outline-none focus:border-[#a88a3d]"
      />
    </label>
  );
}

export default function PeriodComparison() {
  const today = todayYYYYMM();
  const [periodA, setPeriodA] = useState(prevMonth(today));
  const [periodB, setPeriodB] = useState(today);

  const { data: txA } = useTransactions({ month: periodA });
  const { data: txB } = useTransactions({ month: periodB });
  const { data: { flat } } = useCategories();

  const catMap = Object.fromEntries(flat.map((c) => [c.id, c]));

  const sumA = computeSummary(txA);
  const sumB = computeSummary(txB);

  const byCatA = computeByCategory(txA);
  const byCatB = computeByCategory(txB);
  const allCatIds = new Set([...byCatA.keys(), ...byCatB.keys()]);

  const rows = Array.from(allCatIds)
    .map((id) => {
      const a = byCatA.get(id) ?? 0;
      const b = byCatB.get(id) ?? 0;
      const delta = b - a;
      const pct = a > 0 ? (b - a) / a : null;
      return { id, cat: catMap[id], a, b, delta, pct };
    })
    .filter((r) => r.a > 0 || r.b > 0)
    .sort((r1, r2) => r2.b - r1.b);

  function deltaColor(v) {
    if (v === null) return '#7a6442';
    return v > 0 ? '#6b1f2a' : '#4a6b3a';
  }

  return (
    <div className="panel">
      <header className="panel-header wine">
        <div className="title">Comparação de Períodos</div>
      </header>
      <div className="p-4 flex flex-col gap-4">
        <div className="flex gap-4">
          <MonthPicker value={periodA} onChange={setPeriodA} label="Período A" />
          <MonthPicker value={periodB} onChange={setPeriodB} label="Período B" />
        </div>

        {/* Totais */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Receitas A', val: sumA.income, color: '#4a6b3a' },
            { label: 'Receitas B', val: sumB.income, color: '#4a6b3a' },
            {
              label: 'Δ Receitas',
              val: sumB.income - sumA.income,
              color: (sumB.income - sumA.income) >= 0 ? '#4a6b3a' : '#6b1f2a',
            },
            { label: 'Despesas A', val: sumA.expense, color: '#6b1f2a' },
            { label: 'Despesas B', val: sumB.expense, color: '#6b1f2a' },
            {
              label: 'Δ Despesas',
              val: sumB.expense - sumA.expense,
              color: (sumB.expense - sumA.expense) <= 0 ? '#4a6b3a' : '#6b1f2a',
            },
          ].map((item) => (
            <div key={item.label} className="flex flex-col">
              <span className="font-eb smallcaps text-[10px] text-[#7a6442]">{item.label}</span>
              <span className="num text-[13px] font-semibold" style={{ color: item.color }}>
                {item.val >= 0 ? '' : '-'}{formatBRL(Math.abs(item.val))}
              </span>
            </div>
          ))}
        </div>

        {/* Por categoria */}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[#a88a3d]/30">
                  <th className="font-eb smallcaps text-left py-1 px-2 text-[#5b4423] font-normal">Categoria</th>
                  <th className="font-eb smallcaps text-right py-1 px-2 text-[#5b4423] font-normal">
                    {formatMonthFull(periodA)}
                  </th>
                  <th className="font-eb smallcaps text-right py-1 px-2 text-[#5b4423] font-normal">
                    {formatMonthFull(periodB)}
                  </th>
                  <th className="font-eb smallcaps text-right py-1 px-2 text-[#5b4423] font-normal">Variação</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-[#a88a3d]/15 hover:bg-[#f5ead5]/60">
                    <td className="py-1 px-2 font-eb smallcaps text-[#3a2a18]">
                      {r.cat?.name ?? r.id}
                    </td>
                    <td className="py-1 px-2 num text-right text-[#5b4423]">{formatBRL(r.a)}</td>
                    <td className="py-1 px-2 num text-right text-[#5b4423]">{formatBRL(r.b)}</td>
                    <td className="py-1 px-2 num text-right" style={{ color: deltaColor(r.pct) }}>
                      {r.pct !== null ? `${r.pct >= 0 ? '+' : ''}${formatPercent(r.pct, 0)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
