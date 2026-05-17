import { useMemo } from 'react';
import Panel from '../../components/layout/Panel.jsx';
import { formatMinutes } from './lib/productivity.js';

export default function SectorBreakdown({ missions, sectorsById }) {
  const rows = useMemo(() => {
    const map = new Map();
    for (const m of missions ?? []) {
      const id = m.sector_id || '__none__';
      const cur = map.get(id) ?? { id, focus: 0, count: 0 };
      cur.focus += Number(m.focus_minutes ?? 0);
      cur.count += 1;
      map.set(id, cur);
    }
    const list = Array.from(map.values()).sort((a, b) => b.focus - a.focus);
    const max = list[0]?.focus || 1;
    return list.map((r) => {
      const sector = r.id === '__none__' ? null : sectorsById?.get?.(r.id);
      return {
        ...r,
        name: sector?.name || (r.id === '__none__' ? 'Sem setor' : '—'),
        color: sector?.color || '#5b4423',
        pct: (r.focus / max) * 100,
      };
    });
  }, [missions, sectorsById]);

  return (
    <Panel
      title="Setores do mês"
      subtitle="tempo de foco por área do gabinete"
      accent="wine"
    >
      {rows.length === 0 ? (
        <div className="font-lora italic text-[12px] text-[#7a6442]">
          Nenhum registro de foco neste mês.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((r) => (
            <div key={r.id} className="grid grid-cols-[140px_minmax(0,1fr)_80px] items-center gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="dot"
                  style={{ background: r.color, boxShadow: 'none' }}
                  aria-hidden="true"
                />
                <span className="font-cormorant text-[14px] font-semibold text-[#1f1408] truncate">
                  {r.name}
                </span>
              </div>
              <div className="meter">
                <div
                  className="fill"
                  style={{
                    width: `${Math.max(2, r.pct)}%`,
                    background: `linear-gradient(180deg, ${r.color} 0%, ${r.color}cc 100%)`,
                  }}
                />
              </div>
              <div className="text-right font-num text-[12px] text-[#5b4423]">
                {formatMinutes(r.focus)} · {r.count}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
