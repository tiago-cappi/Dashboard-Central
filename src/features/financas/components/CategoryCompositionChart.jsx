import { useState } from 'react';
import { useTransactions } from '../hooks/useTransactions.js';
import { useCategories } from '../hooks/useCategories.js';
import { useFinancas } from '../FinancasContext.jsx';
import { computeByCategory } from '../lib/aggregations.js';
import { formatBRL, formatPercent } from '../lib/money.js';

const W = 200;
const CX = W / 2;
const CY = W / 2;
const R_OUT = 80;
const R_IN = 48;

function polarToXY(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slice(cx, cy, rOut, rIn, startDeg, endDeg) {
  const s = polarToXY(cx, cy, rOut, startDeg);
  const e = polarToXY(cx, cy, rOut, endDeg);
  const si = polarToXY(cx, cy, rIn, startDeg);
  const ei = polarToXY(cx, cy, rIn, endDeg);
  const lg = endDeg - startDeg > 180 ? 1 : 0;
  return [
    `M${s.x.toFixed(2)},${s.y.toFixed(2)}`,
    `A${rOut},${rOut} 0 ${lg},1 ${e.x.toFixed(2)},${e.y.toFixed(2)}`,
    `L${ei.x.toFixed(2)},${ei.y.toFixed(2)}`,
    `A${rIn},${rIn} 0 ${lg},0 ${si.x.toFixed(2)},${si.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

export default function CategoryCompositionChart({ month }) {
  const [typeView, setTypeView] = useState('despesa');
  const [hoverId, setHoverId] = useState(null);
  const { data: txList, loading, error } = useTransactions({ month, type: typeView });
  const { data: { flat } } = useCategories();
  const { setActiveFilters } = useFinancas();

  const byCategory = computeByCategory(txList);
  const catMap = Object.fromEntries(flat.map((c) => [c.id, c]));

  const total = Array.from(byCategory.values()).reduce((a, b) => a + b, 0);
  const slices = Array.from(byCategory.entries())
    .map(([id, val]) => ({ id, val, cat: catMap[id] }))
    .filter((s) => s.val > 0)
    .sort((a, b) => b.val - a.val);

  let currentAngle = 0;
  const segments = slices.map((s) => {
    const startDeg = currentAngle;
    const endDeg = currentAngle + (s.val / total) * 360;
    currentAngle = endDeg;
    return { ...s, startDeg, endDeg };
  });

  function handleClick(id) {
    setActiveFilters((f) => f.categoryId === id ? {} : { categoryId: id, type: typeView });
  }

  return (
    <div className="panel">
      <header className="panel-header wine">
        <div className="title">Composição por Categoria</div>
        <div className="flex gap-1 ml-auto">
          {(['despesa', 'receita']).map((t) => (
            <button
              key={t}
              type="button"
              className={`seal sm ${typeView === t ? 'dark' : 'ghost'}`}
              onClick={() => setTypeView(t)}
            >
              {t === 'despesa' ? 'Despesas' : 'Receitas'}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4 flex flex-col sm:flex-row gap-6 items-start">
        {loading && <div className="w-[200px] h-[200px] bg-[#e8d8b0]/40 animate-pulse rounded-full" />}
        {error && <div className="font-lora text-[13px] text-[#6b1f2a]">Erro: {error.message}</div>}
        {!loading && !error && total === 0 && (
          <div className="font-eb smallcaps text-[12px] text-[#a88a3d] flex items-center justify-center w-[200px] h-[200px]">
            Sem dados
          </div>
        )}

        {!loading && !error && total > 0 && (
          <>
            {/* Donut SVG */}
            <svg width={W} height={W} style={{ flexShrink: 0 }}>
              {segments.map((seg) => {
                const isHover = hoverId === seg.id;
                return (
                  <path
                    key={seg.id}
                    d={slice(CX, CY, isHover ? R_OUT + 4 : R_OUT, R_IN, seg.startDeg, seg.endDeg)}
                    fill={seg.cat?.color ?? '#a88a3d'}
                    opacity={hoverId && !isHover ? 0.55 : 1}
                    style={{ cursor: 'pointer', transition: 'd 0.1s' }}
                    onMouseEnter={() => setHoverId(seg.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onClick={() => handleClick(seg.id)}
                  />
                );
              })}
              {/* Centro: total */}
              <text x={CX} y={CY - 4} textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="11" fill="#3a2a18">
                {(total / 1000).toFixed(1)}k
              </text>
              <text x={CX} y={CY + 10} textAnchor="middle" fontFamily="EB Garamond" fontSize="10" fill="#7a6442">
                total
              </text>
            </svg>

            {/* Legenda */}
            <ul className="flex flex-col gap-1 flex-1 min-w-0">
              {segments.map((seg) => (
                <li
                  key={seg.id}
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  onMouseEnter={() => setHoverId(seg.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onClick={() => handleClick(seg.id)}
                >
                  <span
                    className="inline-block w-3 h-3 flex-none"
                    style={{ background: seg.cat?.color ?? '#a88a3d' }}
                  />
                  <span className="font-eb smallcaps text-[12px] text-[#3a2a18] truncate flex-1">
                    {seg.cat?.name ?? seg.id}
                  </span>
                  <span className="num text-[11px] text-[#5b4423] whitespace-nowrap">
                    {formatBRL(seg.val)}
                  </span>
                  <span className="num text-[10px] text-[#7a6442] whitespace-nowrap">
                    {formatPercent(seg.val / total)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
