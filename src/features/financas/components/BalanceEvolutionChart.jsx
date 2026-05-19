import { useTransactions } from '../hooks/useTransactions.js';
import { computeDailyBalance } from '../lib/aggregations.js';
import { formatBRL } from '../lib/money.js';
import { formatDateDisplay } from '../lib/dates.js';
import { useState } from 'react';

const W = 600;
const H = 200;
const PAD = { top: 16, right: 16, bottom: 28, left: 64 };

function buildPath(points, minY, maxY) {
  if (points.length === 0) return '';
  const xRange = W - PAD.left - PAD.right;
  const yRange = H - PAD.top - PAD.bottom;
  const scaleX = (i) => PAD.left + (i / (points.length - 1)) * xRange;
  const scaleY = (v) => {
    const span = maxY - minY || 1;
    return PAD.top + yRange - ((v - minY) / span) * yRange;
  };

  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i).toFixed(1)},${scaleY(p.balance).toFixed(1)}`)
    .join(' ');
}

export default function BalanceEvolutionChart({ month }) {
  const { data: transactions, loading, error } = useTransactions({ month });
  const [tooltip, setTooltip] = useState(null);

  const points = computeDailyBalance(transactions, month);
  const values = points.map((p) => p.balance);
  const minY = Math.min(0, ...values);
  const maxY = Math.max(0, ...values);

  const xRange = W - PAD.left - PAD.right;
  const yRange = H - PAD.top - PAD.bottom;
  const scaleX = (i) => PAD.left + (i / Math.max(points.length - 1, 1)) * xRange;
  const scaleY = (v) => {
    const span = maxY - minY || 1;
    return PAD.top + yRange - ((v - minY) / span) * yRange;
  };

  const zeroY = scaleY(0);
  const pathD = buildPath(points, minY, maxY);
  const areaD = points.length > 1
    ? `${pathD} L${scaleX(points.length - 1).toFixed(1)},${zeroY.toFixed(1)} L${PAD.left.toFixed(1)},${zeroY.toFixed(1)} Z`
    : '';

  return (
    <div className="panel">
      <header className="panel-header wine">
        <div className="title">Evolução do Saldo</div>
        <div className="sub">acumulado diário</div>
      </header>
      <div className="p-3">
        {loading && <div className="h-[200px] bg-[#e8d8b0]/40 animate-pulse" />}
        {error && <div className="font-lora text-[13px] text-[#6b1f2a] p-2">Erro: {error.message}</div>}
        {!loading && !error && points.length === 0 && (
          <div className="h-[200px] flex items-center justify-center font-eb smallcaps text-[12px] text-[#a88a3d]">
            Nenhum lançamento realizado neste mês
          </div>
        )}
        {!loading && !error && points.length > 0 && (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            style={{ height: 200 }}
            onMouseLeave={() => setTooltip(null)}
          >
            {/* Zero line */}
            <line
              x1={PAD.left} y1={zeroY} x2={W - PAD.right} y2={zeroY}
              stroke="#a88a3d" strokeWidth="0.5" strokeDasharray="4,3" opacity="0.5"
            />

            {/* Area fill */}
            {areaD && (
              <path d={areaD} fill="#a88a3d" opacity="0.08" />
            )}

            {/* Line */}
            <path d={pathD} fill="none" stroke="#a88a3d" strokeWidth="1.5" />

            {/* Y-axis labels */}
            {[minY, (minY + maxY) / 2, maxY].map((v, i) => (
              <text
                key={i}
                x={PAD.left - 4}
                y={scaleY(v) + 4}
                textAnchor="end"
                fontFamily="IBM Plex Mono"
                fontSize="9"
                fill="#7a6442"
              >
                {v >= 0 ? '' : '-'}{Math.abs(v / 1000) >= 1 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}
              </text>
            ))}

            {/* X-axis labels — day 1, 10, 20, last */}
            {points.filter((_, i) => i === 0 || (i + 1) % 10 === 0 || i === points.length - 1).map((p, _, arr) => {
              const idx = points.indexOf(p);
              return (
                <text
                  key={idx}
                  x={scaleX(idx)}
                  y={H - 6}
                  textAnchor="middle"
                  fontFamily="IBM Plex Mono"
                  fontSize="9"
                  fill="#7a6442"
                >
                  {p.date.slice(8)}
                </text>
              );
            })}

            {/* Hover targets */}
            {points.map((p, i) => (
              <rect
                key={i}
                x={scaleX(i) - (xRange / points.length / 2)}
                y={PAD.top}
                width={xRange / points.length}
                height={yRange}
                fill="transparent"
                onMouseEnter={() => setTooltip({ ...p, x: scaleX(i), y: scaleY(p.balance) })}
              />
            ))}

            {/* Tooltip */}
            {tooltip && (
              <g>
                <line
                  x1={tooltip.x} y1={PAD.top}
                  x2={tooltip.x} y2={H - PAD.bottom}
                  stroke="#a88a3d" strokeWidth="0.8" strokeDasharray="3,2" opacity="0.7"
                />
                <circle cx={tooltip.x} cy={tooltip.y} r="3" fill="#a88a3d" />
                <rect
                  x={Math.min(tooltip.x + 6, W - 130)}
                  y={tooltip.y - 22}
                  width="120"
                  height="22"
                  fill="#fbf2d8"
                  stroke="#a88a3d"
                  strokeWidth="0.8"
                />
                <text
                  x={Math.min(tooltip.x + 66, W - 70)}
                  y={tooltip.y - 7}
                  textAnchor="middle"
                  fontFamily="IBM Plex Mono"
                  fontSize="10"
                  fill="#3a2a18"
                >
                  {formatDateDisplay(tooltip.date)}: {formatBRL(tooltip.balance)}
                </text>
              </g>
            )}
          </svg>
        )}
      </div>
    </div>
  );
}
