import { useMonthlySummary } from '../hooks/useMonthlySummary.js';
import { formatBRL, formatPercent } from '../lib/money.js';

function DeltaTag({ value }) {
  if (value === null || value === undefined) return null;
  const isPos = value >= 0;
  return (
    <span
      className="num text-[10px] ml-1 px-1 py-0.5"
      style={{
        color: isPos ? '#4a6b3a' : '#6b1f2a',
        background: isPos ? '#4a6b3a18' : '#6b1f2a18',
      }}
    >
      {isPos ? '+' : ''}{formatPercent(value, 0)}
    </span>
  );
}

function Card({ label, value, delta, color, loading }) {
  return (
    <div className="panel flex flex-col gap-1 p-4">
      <div className="font-eb smallcaps text-[11px] text-[#7a6442]">{label}</div>
      {loading ? (
        <div className="h-7 bg-[#e8d8b0]/60 animate-pulse rounded" />
      ) : (
        <div className="flex items-baseline gap-1">
          <span className="num text-[20px] font-bold" style={{ color }}>
            {value}
          </span>
          <DeltaTag value={delta} />
        </div>
      )}
    </div>
  );
}

export default function SummaryCards({ month }) {
  const { data: s, loading, error } = useMonthlySummary(month);

  if (error) return (
    <div className="font-lora text-[13px] text-[#6b1f2a] p-2">
      Erro ao carregar indicadores: {error.message}
    </div>
  );

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      <Card label="Receitas" value={formatBRL(s?.income ?? 0)} delta={s?.deltaIncome} color="#4a6b3a" loading={loading} />
      <Card label="Despesas" value={formatBRL(s?.expense ?? 0)} delta={s?.deltaExpense} color="#6b1f2a" loading={loading} />
      <Card
        label="Saldo"
        value={formatBRL(s?.balance ?? 0)}
        delta={s?.deltaBalance}
        color={(s?.balance ?? 0) >= 0 ? '#4a6b3a' : '#6b1f2a'}
        loading={loading}
      />
      <Card
        label="Taxa de Poupança"
        value={s ? formatPercent(s.savingsRate) : '—'}
        delta={null}
        color="#1f3a5f"
        loading={loading}
      />
    </div>
  );
}
