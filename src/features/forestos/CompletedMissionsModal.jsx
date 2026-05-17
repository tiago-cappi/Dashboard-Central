import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Divider from '../../components/ornaments/Divider.jsx';
import { pesoOf, pesoTier, formatMinutes } from './lib/productivity.js';

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

function CompletedItem({ mission }) {
  const peso = pesoOf(mission);
  const tier = pesoTier(peso);
  return (
    <article className={`diary-item peso-${tier.id} fadein`}>
      <div className="stripe" />
      <div className="py-1.5 pr-2 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="peso-tag" style={{ color: tier.color }}>
            {tier.label} · peso {peso}
          </span>
          {mission.completed_at && (
            <span className="font-eb text-[10px] text-[#7a6442]">
              concluída em {mission.completed_at}
            </span>
          )}
        </div>
        <div className="title">{mission.title}</div>
        <div className="meta">
          <span>⏱ {formatMinutes(mission.focus_minutes)}</span>
          <span>★ Imp <Stars value={Math.min(5, mission.importance || 0)} color={tier.color} /></span>
          <span>◆ Dif <Blades value={Math.min(5, mission.difficulty || 0)} color={tier.color} /></span>
          {mission.xp_gained != null && Number(mission.xp_gained) > 0 && (
            <span>✦ +{Number(mission.xp_gained).toLocaleString('pt-BR')} XP</span>
          )}
        </div>
      </div>
    </article>
  );
}

export default function CompletedMissionsModal({ open, onClose, contextTitle, contextType, missions = [] }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const sorted = useMemo(() => {
    return [...missions].sort((a, b) => {
      const da = a.completed_at || '';
      const db = b.completed_at || '';
      if (da !== db) return db.localeCompare(da);
      return pesoOf(b) - pesoOf(a);
    });
  }, [missions]);

  if (!open) return null;

  const totalXp = sorted.reduce((acc, m) => acc + Number(m.xp_gained || 0), 0);
  const totalFocus = sorted.reduce((acc, m) => acc + Number(m.focus_minutes || 0), 0);

  return createPortal(
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <section className="panel modal-panel">
        <header className="panel-header" style={{ background: 'linear-gradient(180deg, #4a6b3a 0%, #3a5430 100%)' }}>
          <div className="flex-1 min-w-0">
            <div className="title truncate">Missões concluídas · {contextType}</div>
            <div className="sub truncate">{contextTitle}</div>
          </div>
          <button type="button" className="seal sm" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>

        <div className="modal-body">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <Stat label="Concluídas" value={String(sorted.length)} />
            <Stat label="Foco total" value={formatMinutes(totalFocus)} />
            <Stat label="XP gerado" value={totalXp ? `+${totalXp.toLocaleString('pt-BR')}` : '—'} />
          </div>

          <Divider className="my-3" />

          {sorted.length === 0 ? (
            <div className="text-center py-8">
              <div className="font-eb text-[14px] text-[#5b4423]">Nenhuma missão concluída ainda.</div>
              <div className="font-lora italic text-[12px] text-[#7a6442] mt-1">
                O gabinete aguarda a primeira colheita.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 fadein-stagger">
              {sorted.map((m) => (
                <CompletedItem key={m.id} mission={m} />
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
