import { useMemo, useState } from 'react';
import Panel from '../../components/layout/Panel.jsx';
import { buildMonthGrid, DAY_LABELS, MONTH_NAMES_FULL, isSameDay } from './lib/calendar.js';
import { heatTierFor, HEAT_TIERS, missionScore, formatMinutes } from './lib/productivity.js';

function MiniLegend() {
  return (
    <div className="flex items-center gap-2 mt-3">
      <span className="font-eb text-[11px] text-[#5b4423]">menos</span>
      <div className="flex">
        {HEAT_TIERS.map((t) => (
          <span
            key={t.id}
            className="block"
            style={{
              width: 16,
              height: 12,
              background: t.color,
              border: '1px solid #a88a3d',
              marginLeft: t.id === 0 ? 0 : -1,
            }}
            title={t.label}
          />
        ))}
      </div>
      <span className="font-eb text-[11px] text-[#5b4423]">mais</span>
    </div>
  );
}

export default function FocusHeatmap({
  year,
  monthIdx,
  onPrev,
  onNext,
  onToday,
  byDay,
  onSelectDay,
  loading,
  error,
}) {
  const today = new Date();
  const grid = useMemo(() => buildMonthGrid(year, monthIdx), [year, monthIdx]);

  const { dayScores, maxScore, totalFocus, bestDay } = useMemo(() => {
    const scoresByIso = new Map();
    let max = 0;
    let totalF = 0;
    let best = { iso: null, focus: 0 };
    for (const [iso, missions] of byDay.entries()) {
      const score = missions.reduce((acc, m) => acc + missionScore(m), 0);
      const focus = missions.reduce((acc, m) => acc + Number(m.focus_minutes ?? 0), 0);
      scoresByIso.set(iso, { score, focus, count: missions.length });
      if (score > max) max = score;
      totalF += focus;
      if (focus > best.focus) best = { iso, focus };
    }
    return { dayScores: scoresByIso, maxScore: max, totalFocus: totalF, bestDay: best };
  }, [byDay]);

  const monthLabel = `${MONTH_NAMES_FULL[monthIdx]} de ${year}`.toUpperCase();

  const headerActions = (
    <>
      <button className="seal sm" onClick={onPrev} type="button" data-tip="mês anterior">◄</button>
      <button className="seal sm dark" onClick={onToday} type="button">Hoje</button>
      <button className="seal sm" onClick={onNext} type="button" data-tip="próximo mês">►</button>
    </>
  );

  return (
    <Panel
      title={`Agenda de Foco — ${monthLabel}`}
      subtitle="cada dia colorido pelo tempo produtivo (foco × importância × dificuldade)"
      accent="wine"
      actions={headerActions}
    >
      <div className="flex flex-wrap items-end gap-x-6 gap-y-1 mb-3">
        <div>
          <div className="font-eb text-[11px] text-[#5b4423]">Total do mês</div>
          <div className="font-num text-[18px] text-[#1f1408]">{formatMinutes(totalFocus)}</div>
        </div>
        <div>
          <div className="font-eb text-[11px] text-[#5b4423]">Melhor dia</div>
          <div className="font-num text-[18px] text-[#1f1408]">
            {bestDay.iso
              ? `${bestDay.iso.slice(8, 10)} ${MONTH_NAMES_FULL[Number(bestDay.iso.slice(5, 7)) - 1].slice(0, 3)} · ${formatMinutes(bestDay.focus)}`
              : '—'}
          </div>
        </div>
        <div>
          <div className="font-eb text-[11px] text-[#5b4423]">Dias produtivos</div>
          <div className="font-num text-[18px] text-[#1f1408]">{dayScores.size}</div>
        </div>
        <div className="ml-auto">
          {loading && <span className="font-eb text-[12px] text-[#5b4423]">consultando arquivos…</span>}
          {error && (
            <span className="font-eb text-[12px] text-[#7a2230]">erro: {String(error.message || error)}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px mb-1 px-px">
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            className="font-eb text-[12px] text-center text-[#5b4423] py-1 border-b border-[#a88a3d]/40"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px bg-[#a88a3d]/30 p-px">
        {grid.flat().map((cell) => {
          const data = dayScores.get(cell.iso);
          const tier = heatTierFor(data?.score ?? 0, maxScore);
          const isToday = isSameDay(cell.date, today);
          const tip = data
            ? `${cell.date.getDate()}/${cell.date.getMonth() + 1} · ${data.count} miss. · ${formatMinutes(data.focus)}`
            : `${cell.date.getDate()}/${cell.date.getMonth() + 1} · sem atividade`;
          return (
            <button
              key={cell.iso}
              type="button"
              data-tip={tip}
              onClick={() => cell.inMonth && onSelectDay?.(cell)}
              className={[
                'heatcell',
                `tier-${tier.id}`,
                cell.inMonth ? '' : 'outside',
                isToday ? 'today' : '',
              ].join(' ')}
            >
              <span className="daynum">{cell.date.getDate()}</span>
              {data?.count > 0 && <span className="count">{data.count}</span>}
              {data?.focus > 0 && <span className="focus">{formatMinutes(data.focus)}</span>}
            </button>
          );
        })}
      </div>

      <MiniLegend />
    </Panel>
  );
}
