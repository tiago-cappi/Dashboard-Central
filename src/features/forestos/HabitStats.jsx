import { useMemo } from 'react';
import Panel from '../../components/layout/Panel.jsx';
import { useHabits } from './hooks/useHabits.js';

function Stat({ label, value, color = '#1f1408', hint }) {
  return (
    <div className="habit-stat">
      <div className="font-num text-[24px] font-semibold leading-none" style={{ color }}>
        {value}
      </div>
      <div className="font-eb text-[10px] uppercase tracking-[.12em] text-[#5b4423] mt-1">
        {label}
      </div>
      {hint && <div className="font-lora italic text-[10px] text-[#7a6442] mt-0.5">{hint}</div>}
    </div>
  );
}

export default function HabitStats() {
  const { activeHabits, dueToday, completedToday, loading } = useHabits();

  const stats = useMemo(() => {
    if (!activeHabits?.length) {
      return { total: 0, bestStreak: 0, currentBest: 0, dailyAvg: 0 };
    }
    const bestStreak = activeHabits.reduce((m, h) => Math.max(m, Number(h.best_streak ?? 0)), 0);
    const currentBest = activeHabits.reduce((m, h) => Math.max(m, Number(h.current_streak ?? 0)), 0);
    return {
      total: activeHabits.length,
      bestStreak,
      currentBest,
    };
  }, [activeHabits]);

  const totalToday = dueToday.length + completedToday.length;
  const progressPct = totalToday === 0 ? 0 : Math.round((completedToday.length / totalToday) * 100);

  return (
    <Panel title="Hábitos · estatísticas" subtitle="ritmo das rotinas" accent="teal">
      {loading ? (
        <div className="font-eb text-[12px] text-[#5b4423]">carregando…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Ativos" value={stats.total} color="#2a5a6b" />
            <Stat
              label="Hoje"
              value={`${completedToday.length}/${totalToday}`}
              color="#4a6b3a"
              hint={totalToday > 0 ? `${progressPct}% concluídos` : 'sem devidos'}
            />
            <Stat label="🔥 Streak atual" value={stats.currentBest} color="#a88a3d" hint="melhor entre os ativos" />
            <Stat label="🏆 Melhor histórico" value={stats.bestStreak} color="#7a2230" hint="recorde geral" />
          </div>

          {totalToday > 0 && (
            <div className="mt-3">
              <div className="habit-progress" title={`${completedToday.length}/${totalToday}`}>
                <div className="habit-progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}

        </>
      )}
    </Panel>
  );
}
