import { useEffect, useMemo, useState } from 'react';
import Panel from '../../components/layout/Panel.jsx';
import { supabase, SUPABASE_CONFIGURED } from '../../lib/supabase.js';
import { useFocus } from './FocusContext.jsx';
import { buildMonthGrid, DAY_LABELS, MONTH_NAMES_FULL, isSameDay, toISO } from './lib/calendar.js';
import HabitDayDetailModal from './HabitDayDetailModal.jsx';

const HABIT_HEAT_TIERS = [
  { id: 0, color: 'transparent', label: 'sem registro' },
  { id: 1, color: '#bcd0a8', label: '1 hábito' },
  { id: 2, color: '#7a9c5e', label: '2-3 hábitos' },
  { id: 3, color: '#4a6b3a', label: '4-5 hábitos' },
  { id: 4, color: '#2a3f22', label: '6+ hábitos' },
];

function tierFor(count) {
  if (count <= 0) return HABIT_HEAT_TIERS[0];
  if (count === 1) return HABIT_HEAT_TIERS[1];
  if (count <= 3) return HABIT_HEAT_TIERS[2];
  if (count <= 5) return HABIT_HEAT_TIERS[3];
  return HABIT_HEAT_TIERS[4];
}

function MiniLegend() {
  return (
    <div className="flex items-center gap-2 mt-3">
      <span className="font-eb text-[11px] text-[#5b4423]">menos</span>
      <div className="flex">
        {HABIT_HEAT_TIERS.map((t) => (
          <span
            key={t.id}
            className="block"
            style={{
              width: 16,
              height: 12,
              background: t.color === 'transparent' ? '#fbf3d8' : t.color,
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

/**
 * Heatmap mensal de hábitos. Conta eventos com entity_type='habit' (tipos:
 * habit_complete OU xp_event quando entity_type=habit) por dia.
 */
export default function HabitHeatmap({ year, monthIdx, onPrev, onNext, onToday }) {
  const [byDay, setByDay] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null); // { date, iso, events }
  const { subscribe } = useFocus();

  const today = new Date();
  const grid = useMemo(() => buildMonthGrid(year, monthIdx), [year, monthIdx]);

  const load = async () => {
    if (!SUPABASE_CONFIGURED) return;
    setLoading(true);
    setError(null);
    try {
      const start = new Date(year, monthIdx, 1).toISOString();
      const end = new Date(year, monthIdx + 1, 1).toISOString();
      const { data, error: err } = await supabase
        .from('events')
        .select('id, occurred_at, entity_id, entity_type, entity_title, type, xp_gained, focus_minutes, data')
        .eq('entity_type', 'habit')
        .gte('occurred_at', start)
        .lt('occurred_at', end);
      if (err) throw err;
      const map = new Map();
      for (const e of data ?? []) {
        const d = new Date(e.occurred_at);
        const iso = toISO(d);
        const arr = map.get(iso) ?? [];
        arr.push(e);
        map.set(iso, arr);
      }
      setByDay(map);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, monthIdx]);

  useEffect(() => subscribe(() => load()), [subscribe, year, monthIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const { totals } = useMemo(() => {
    let totalCompletions = 0;
    let bestDay = { iso: null, count: 0 };
    for (const [iso, events] of byDay.entries()) {
      totalCompletions += events.length;
      if (events.length > bestDay.count) bestDay = { iso, count: events.length };
    }
    return { totals: { totalCompletions, bestDay, daysActive: byDay.size } };
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
      title={`Hábitos — ${monthLabel}`}
      subtitle="cada dia colorido por quantos hábitos foram concluídos"
      accent="moss"
      actions={headerActions}
    >
      <div className="flex flex-wrap items-end gap-x-6 gap-y-1 mb-3">
        <div>
          <div className="font-eb text-[11px] text-[#5b4423]">Total no mês</div>
          <div className="font-num text-[18px] text-[#1f1408]">{totals.totalCompletions}</div>
        </div>
        <div>
          <div className="font-eb text-[11px] text-[#5b4423]">Melhor dia</div>
          <div className="font-num text-[18px] text-[#1f1408]">
            {totals.bestDay.iso
              ? `${totals.bestDay.iso.slice(8, 10)} ${MONTH_NAMES_FULL[Number(totals.bestDay.iso.slice(5, 7)) - 1].slice(0, 3)} · ${totals.bestDay.count}`
              : '—'}
          </div>
        </div>
        <div>
          <div className="font-eb text-[11px] text-[#5b4423]">Dias ativos</div>
          <div className="font-num text-[18px] text-[#1f1408]">{totals.daysActive}</div>
        </div>
        <div className="ml-auto">
          {loading && <span className="font-eb text-[12px] text-[#5b4423]">consultando…</span>}
          {error && (
            <span className="font-eb text-[12px] text-[#7a2230]">erro: {String(error.message || error)}</span>
          )}
        </div>
      </div>

      <div className="habit-heatmap">
        <div className="habit-heatmap-row">
          {DAY_LABELS.map((d) => (
            <div key={d} className="habit-heatmap-dow">{d}</div>
          ))}
        </div>
        {grid.map((week, wi) => (
          <div key={wi} className="habit-heatmap-row">
            {week.map((cell) => {
              const events = byDay.get(cell.iso) ?? [];
              const count = events.length;
              const tier = tierFor(count);
              const isToday = isSameDay(cell.date, today);
              return (
                <button
                  type="button"
                  key={cell.iso}
                  className={`habit-heatmap-cell${cell.inMonth ? '' : ' off'}${isToday ? ' today' : ''}${count > 0 ? ' clickable' : ''}`}
                  style={{ background: tier.color === 'transparent' ? undefined : tier.color }}
                  title={count > 0 ? `${cell.iso} · ${count} registro${count > 1 ? 's' : ''}` : cell.iso}
                  onClick={() => {
                    if (count === 0) return;
                    setSelectedDay({ date: cell.date, iso: cell.iso, events });
                  }}
                  disabled={count === 0}
                >
                  <span className="habit-heatmap-day">{cell.date.getDate()}</span>
                  {count > 0 && <span className="habit-heatmap-count">{count}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <MiniLegend />

      <HabitDayDetailModal
        open={Boolean(selectedDay)}
        date={selectedDay?.date ?? null}
        events={selectedDay?.events ?? []}
        onClose={() => setSelectedDay(null)}
      />
    </Panel>
  );
}
