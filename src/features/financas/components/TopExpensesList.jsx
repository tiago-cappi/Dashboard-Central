import { useTransactions } from '../hooks/useTransactions.js';
import { useCategories } from '../hooks/useCategories.js';
import { topExpenses } from '../lib/aggregations.js';
import { formatBRL } from '../lib/money.js';
import { formatDateDisplay } from '../lib/dates.js';

export default function TopExpensesList({ month }) {
  const { data: txList, loading, error } = useTransactions({ month, type: 'despesa' });
  const { data: { flat } } = useCategories();
  const catMap = Object.fromEntries(flat.map((c) => [c.id, c]));

  const top = topExpenses(txList, 5);
  const maxVal = top.length > 0 ? Number(top[0].amount) : 1;

  return (
    <div className="panel h-full">
      <header className="panel-header wine">
        <div className="title">Top 5 Despesas</div>
      </header>
      <div className="p-4 flex flex-col gap-3">
        {loading && [...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-[#e8d8b0]/60 animate-pulse" />
        ))}
        {error && <div className="font-lora text-[13px] text-[#6b1f2a]">Erro: {error.message}</div>}
        {!loading && !error && top.length === 0 && (
          <div className="font-eb smallcaps text-[12px] text-[#a88a3d] text-center py-4">
            Sem despesas realizadas
          </div>
        )}
        {!loading && !error && top.map((tx, i) => {
          const cat = catMap[tx.category_id];
          const pct = (Number(tx.amount) / maxVal) * 100;
          return (
            <div key={tx.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="num text-[10px] text-[#7a6442] w-4">{i + 1}</span>
                <span className="font-lora text-[12px] text-[#3a2a18] truncate flex-1">
                  {tx.description}
                </span>
                <span className="num text-[12px] font-semibold text-[#6b1f2a] whitespace-nowrap">
                  {formatBRL(tx.amount)}
                </span>
              </div>
              <div className="flex items-center gap-2 pl-6">
                <div className="flex-1 h-1.5 bg-[#e8d8b0]">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${pct}%`, background: cat?.color ?? '#6b1f2a' }}
                  />
                </div>
                {cat && (
                  <span
                    className="font-eb smallcaps text-[10px] whitespace-nowrap"
                    style={{ color: cat.color }}
                  >
                    {cat.name}
                  </span>
                )}
              </div>
              <div className="pl-6 font-lora text-[10px] text-[#7a6442]">
                {formatDateDisplay(tx.date)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
