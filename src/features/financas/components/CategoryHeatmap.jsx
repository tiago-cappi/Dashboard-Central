import { useState } from 'react';
import { useCategoryHeatmap } from '../hooks/useCategoryHeatmap.js';
import { useFinancas } from '../FinancasContext.jsx';
import { formatBRL } from '../lib/money.js';
import { formatMonthLabel } from '../lib/dates.js';

export default function CategoryHeatmap() {
  const { data: { categories, months, cells }, loading, error } = useCategoryHeatmap(12);
  const { setActiveFilters, setSelectedMonth } = useFinancas();
  const [tooltip, setTooltip] = useState(null);

  if (loading) return (
    <div className="panel">
      <header className="panel-header wine"><div className="title">Mapa de Calor</div></header>
      <div className="h-40 m-4 bg-[#e8d8b0]/40 animate-pulse" />
    </div>
  );

  if (error) return (
    <div className="panel">
      <div className="p-4 font-lora text-[13px] text-[#6b1f2a]">Erro: {error.message}</div>
    </div>
  );

  if (categories.length === 0 || months.length === 0) return (
    <div className="panel">
      <header className="panel-header wine"><div className="title">Mapa de Calor · Sazonalidade</div></header>
      <div className="p-4 font-eb smallcaps text-[12px] text-[#a88a3d]">
        Sem dados suficientes — registre despesas ao longo de pelo menos 3 meses.
      </div>
    </div>
  );

  // Escala de cor por coluna (categoria)
  function cellColor(catIdx, monthIdx) {
    const val = cells[catIdx]?.[monthIdx] ?? 0;
    if (val === 0) return 'transparent';
    const col = cells[catIdx] ?? [];
    const maxInCol = Math.max(...col, 1);
    const intensity = val / maxInCol;
    const cat = categories[catIdx];
    const hex = cat?.color ?? '#6b1f2a';
    return `${hex}${Math.round(intensity * 200 + 20).toString(16).padStart(2, '0')}`;
  }

  function handleClick(catIdx, monthIdx) {
    const cat = categories[catIdx];
    const m = months[monthIdx];
    if (!cat || !m) return;
    setActiveFilters({ categoryId: cat.id, type: 'despesa' });
    setSelectedMonth(m);
  }

  const CELL_W = 36;
  const CELL_H = 22;
  const LABEL_W = 120;
  const svgW = LABEL_W + months.length * CELL_W + 8;
  const svgH = 28 + categories.length * CELL_H + 8;

  return (
    <div className="panel">
      <header className="panel-header wine">
        <div className="title">Mapa de Calor · Sazonalidade</div>
        <div className="sub">despesas por categoria × mês</div>
      </header>
      <div className="p-4 overflow-x-auto" onMouseLeave={() => setTooltip(null)}>
        <svg width={svgW} height={svgH}>
          {/* Month headers */}
          {months.map((m, mi) => (
            <text
              key={mi}
              x={LABEL_W + mi * CELL_W + CELL_W / 2}
              y={16}
              textAnchor="middle"
              fontFamily="IBM Plex Mono"
              fontSize="9"
              fill="#7a6442"
            >
              {formatMonthLabel(m)}
            </text>
          ))}

          {/* Rows */}
          {categories.map((cat, ci) => (
            <g key={cat.id}>
              <text
                x={LABEL_W - 6}
                y={28 + ci * CELL_H + CELL_H / 2 + 4}
                textAnchor="end"
                fontFamily="EB Garamond"
                fontSize="11"
                fill="#5b4423"
              >
                {cat.name}
              </text>
              {months.map((m, mi) => {
                const val = cells[ci]?.[mi] ?? 0;
                const bg = cellColor(ci, mi);
                return (
                  <g key={mi}>
                    <rect
                      x={LABEL_W + mi * CELL_W + 1}
                      y={28 + ci * CELL_H + 1}
                      width={CELL_W - 2}
                      height={CELL_H - 2}
                      fill={val > 0 ? bg : '#f0e4c4'}
                      stroke="#a88a3d"
                      strokeWidth="0.3"
                      style={{ cursor: val > 0 ? 'pointer' : 'default' }}
                      onMouseEnter={() => val > 0 && setTooltip({ cat, m, val, x: LABEL_W + mi * CELL_W + CELL_W / 2, y: 28 + ci * CELL_H })}
                      onClick={() => val > 0 && handleClick(ci, mi)}
                    />
                  </g>
                );
              })}
            </g>
          ))}

          {/* Tooltip */}
          {tooltip && (
            <g>
              <rect
                x={Math.min(tooltip.x - 60, svgW - 130)}
                y={tooltip.y - 30}
                width={130}
                height={22}
                fill="#fbf2d8"
                stroke="#a88a3d"
                strokeWidth="0.8"
              />
              <text
                x={Math.min(tooltip.x - 60, svgW - 130) + 65}
                y={tooltip.y - 15}
                textAnchor="middle"
                fontFamily="IBM Plex Mono"
                fontSize="10"
                fill="#3a2a18"
              >
                {formatMonthLabel(tooltip.m)}: {formatBRL(tooltip.val)}
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
