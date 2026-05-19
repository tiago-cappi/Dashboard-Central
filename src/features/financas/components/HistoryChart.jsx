import { useState } from 'react';
import { useHistorySeries } from '../hooks/useHistorySeries.js';
import { formatBRL } from '../lib/money.js';
import { formatMonthLabel } from '../lib/dates.js';

const W = 560;
const H = 200;
const PAD = { top: 16, right: 12, bottom: 32, left: 64 };

function barChart(series, key, color, maxVal) {
  if (series.length === 0) return null;
  const xRange = W - PAD.left - PAD.right;
  const yRange = H - PAD.top - PAD.bottom;
  const barW = Math.max(4, xRange / series.length - 4);

  return series.map((s, i) => {
    const x = PAD.left + (i / series.length) * xRange + (xRange / series.length - barW) / 2;
    const val = s[key] ?? 0;
    const barH = maxVal > 0 ? (val / maxVal) * yRange : 0;
    const y = PAD.top + yRange - barH;
    return <rect key={i} x={x} y={y} width={barW} height={barH} fill={color} opacity="0.85" rx="1" />;
  });
}

export default function HistoryChart() {
  const [granularity, setGranularity] = useState('mensal');
  const { data: series, loading, error } = useHistorySeries(granularity, 12);
  const [tooltip, setTooltip] = useState(null);

  const maxVal = series.reduce((m, s) => Math.max(m, s.income ?? 0, s.expense ?? 0), 0);
  const xRange = W - PAD.left - PAD.right;
  const yRange = H - PAD.top - PAD.bottom;

  function labelFor(s) {
    if (granularity === 'anual') return s.year;
    return formatMonthLabel(s.month);
  }

  return (
    <div className="panel">
      <header className="panel-header wine">
        <div className="title">Histórico Receitas × Despesas</div>
        <div className="flex gap-1 ml-auto">
          {[['mensal', 'Mensal'], ['anual', 'Anual']].map(([val, lbl]) => (
            <button
              key={val}
              type="button"
              className={`seal sm ${granularity === val ? 'dark' : 'ghost'}`}
              onClick={() => setGranularity(val)}
            >
              {lbl}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4">
        {loading && <div className="h-[200px] bg-[#e8d8b0]/40 animate-pulse" />}
        {error && <div className="font-lora text-[13px] text-[#6b1f2a]">Erro: {error.message}</div>}
        {!loading && !error && series.length < 2 && (
          <div className="h-[200px] flex items-center justify-center font-eb smallcaps text-[12px] text-[#a88a3d]">
            Dados insuficientes — cadastre lançamentos em pelo menos 2 períodos
          </div>
        )}
        {!loading && !error && series.length >= 2 && (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 200 }}>
            {/* Y-axis labels */}
            {[0, maxVal / 2, maxVal].map((v, i) => (
              <text
                key={i}
                x={PAD.left - 4}
                y={PAD.top + yRange - (v / maxVal) * yRange + 4}
                textAnchor="end"
                fontFamily="IBM Plex Mono"
                fontSize="9"
                fill="#7a6442"
              >
                {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}
              </text>
            ))}

            {/* Income bars */}
            {barChart(series, 'income', '#4a6b3a', maxVal)}
            {/* Expense bars — offset by half barWidth */}
            {series.map((s, i) => {
              const barW = Math.max(4, xRange / series.length - 4);
              const x = PAD.left + (i / series.length) * xRange + (xRange / series.length - barW) / 2 + barW / 2;
              const val = s.expense ?? 0;
              const barH = maxVal > 0 ? (val / maxVal) * yRange : 0;
              const y = PAD.top + yRange - barH;
              return <rect key={i} x={x} y={y} width={barW / 2} height={barH} fill="#6b1f2a" opacity="0.85" rx="1" />;
            })}

            {/* X-axis labels */}
            {series.map((s, i) => (
              <text
                key={i}
                x={PAD.left + (i / series.length) * xRange + xRange / series.length / 2}
                y={H - 6}
                textAnchor="middle"
                fontFamily="IBM Plex Mono"
                fontSize="9"
                fill="#7a6442"
              >
                {labelFor(s)}
              </text>
            ))}
          </svg>
        )}

        {/* Legenda */}
        <div className="flex gap-4 mt-2">
          {[['#4a6b3a', 'Receitas'], ['#6b1f2a', 'Despesas']].map(([color, label]) => (
            <div key={label} className="flex items-center gap-1">
              <span className="inline-block w-3 h-3" style={{ background: color }} />
              <span className="font-eb smallcaps text-[11px] text-[#5b4423]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
