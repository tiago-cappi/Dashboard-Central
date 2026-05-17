import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Divider from '../../components/ornaments/Divider.jsx';
import { formatLongDate, weekNumber, WEEKDAY_NAMES_FULL } from './lib/calendar.js';
import { pesoOf, pesoTier, summarizeMissions, formatMinutes } from './lib/productivity.js';
import { useGoalsByIds } from './hooks/useGoals.js';

function Stars({ value, max = 5, color = '#7a2230' }) {
  return (
    <span style={{ color }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ opacity: i < value ? 1 : 0.25 }}>
          ★
        </span>
      ))}
    </span>
  );
}

function Blades({ value, max = 5, color = '#1f3a5f' }) {
  return (
    <span style={{ color }} className="font-num">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ opacity: i < value ? 1 : 0.25 }}>
          ◆
        </span>
      ))}
    </span>
  );
}

function SectorChip({ sector }) {
  if (!sector) return <span className="chip">sem setor</span>;
  const c = sector.color || '#5b4423';
  return (
    <span
      className="chip"
      style={{
        color: c,
        borderColor: c,
        background: `${c}14`,
      }}
    >
      <span className="dot" style={{ background: c, boxShadow: 'none' }} />
      {sector.name}
    </span>
  );
}

function DiaryItem({ mission, sector, goal }) {
  const peso = pesoOf(mission);
  const tier = pesoTier(peso);
  return (
    <article className={`diary-item peso-${tier.id} fadein`}>
      <div className="stripe" />
      <div className="py-1.5 pr-2 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <SectorChip sector={sector} />
          <span className="peso-tag" style={{ color: tier.color }}>
            {tier.label} · peso {peso}
          </span>
        </div>
        <div className="title">{mission.title}</div>
        <div className="meta">
          <span>⏱ {formatMinutes(mission.focus_minutes)}</span>
          <span>★ Imp <Stars value={Math.min(5, mission.importance || 0)} color={tier.color} /></span>
          <span>◆ Dif <Blades value={Math.min(5, mission.difficulty || 0)} color={tier.color} /></span>
          {mission.xp_gained != null && <span>✦ +{Number(mission.xp_gained).toLocaleString('pt-BR')} XP</span>}
        </div>
        {goal && <div className="goal-link">↳ rumo a: <em>{goal.title}</em></div>}
      </div>
    </article>
  );
}

export default function DayDetailModal({ open, onClose, date, missions = [], sectorsById }) {
  const goalIds = useMemo(() => missions.map((m) => m.goal_id).filter(Boolean), [missions]);
  const { goals } = useGoalsByIds(goalIds);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || !date) return null;

  const summary = summarizeMissions(missions);
  const longDate = formatLongDate(date).toUpperCase();
  const sub = `${WEEKDAY_NAMES_FULL[date.getDay()]} · Semana ${weekNumber(date)}`;

  return createPortal(
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Diário do dia ${longDate}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <section className="panel modal-panel">
        <header className="panel-header">
          <div className="flex-1 min-w-0">
            <div className="title truncate">Diário de Gabinete — {longDate}</div>
            <div className="sub truncate">{sub}</div>
          </div>
          <button
            type="button"
            className="seal sm"
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>

        <div className="modal-body">
          <div className="grid grid-cols-4 gap-3 mb-3">
            <Stat label="Tempo total em foco" value={formatMinutes(summary.totalFocus)} />
            <Stat label="Missões concluídas" value={String(summary.count)} />
            <Stat label="XP do dia" value={summary.totalXp ? `+${Number(summary.totalXp).toLocaleString('pt-BR')}` : '—'} />
            <Stat label="Score produtivo" value={Number(summary.totalScore).toLocaleString('pt-BR')} />
          </div>

          <Divider className="my-3" />

          {missions.length === 0 ? (
            <div className="text-center py-8">
              <div className="font-eb text-[14px] text-[#5b4423]">Sem registros para este dia.</div>
              <div className="font-lora italic text-[12px] text-[#7a6442] mt-1">
                O gabinete repousou.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 fadein-stagger">
              {missions
                .slice()
                .sort((a, b) => pesoOf(b) - pesoOf(a))
                .map((m) => (
                  <DiaryItem
                    key={m.id}
                    mission={m}
                    sector={sectorsById?.get?.(m.sector_id)}
                    goal={goals.get(m.goal_id)}
                  />
                ))}
            </div>
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}

function Stat({ label, value }) {
  return (
    <div className="decree p-2.5">
      <div className="font-eb text-[10px] text-[#5b4423]">{label}</div>
      <div className="font-num text-[18px] text-[#1f1408] mt-1">{value}</div>
    </div>
  );
}
