import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Divider from '../../components/ornaments/Divider.jsx';
import { supabase } from '../../lib/supabase.js';
import { useFocus } from './FocusContext.jsx';
import { formatLongDate, weekNumber, WEEKDAY_NAMES_FULL, toISO } from './lib/calendar.js';

function eventKindLabel(ev) {
  if (ev.type === 'habit_complete') return '✓ Concluído';
  if (ev.type === 'xp_event') {
    const reason = ev.data?.reason;
    if (reason === 'auto_harvest') return '✦ Sessão de foco';
    return '✦ XP creditado';
  }
  return ev.type;
}

function EventRow({ ev, onDelete, busy }) {
  const xp = Number(ev.xp_gained ?? 0);
  const focus = Number(ev.focus_minutes ?? 0);
  return (
    <article className="diary-item peso-3 fadein">
      <div className="stripe" />
      <div className="py-1.5 pr-2 min-w-0 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="peso-tag" style={{ color: '#4a6b3a' }}>
              {eventKindLabel(ev)}
            </span>
            <span className="font-eb text-[10px] text-[#7a6442]">
              {new Date(ev.occurred_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="title">{ev.entity_title || '—'}</div>
          <div className="meta">
            {focus > 0 && <span>⏱ {focus} min</span>}
            {xp > 0 && <span>✦ +{xp.toLocaleString('pt-BR')} XP</span>}
            {ev.data?.frequency && <span>{ev.data.frequency}</span>}
          </div>
        </div>
        <button
          type="button"
          className="seal sm dark"
          onClick={() => onDelete(ev)}
          disabled={busy}
          aria-label="excluir conclusão"
          title="Excluir esta conclusão e reverter XP/streak"
        >
          ×
        </button>
      </div>
    </article>
  );
}

async function performDeleteEvent(ev) {
  const habitId = ev.entity_id;
  const xpRefund = Number(ev.xp_gained ?? 0);
  const eventDateIso = toISO(new Date(ev.occurred_at));

  // 1) Remover o evento
  const { error: delErr } = await supabase.from('events').delete().eq('id', ev.id);
  if (delErr) throw delErr;

  // 2) Devolver XP no profile
  if (xpRefund > 0) {
    const { data: prof } = await supabase.from('profile').select('*').limit(1).maybeSingle();
    const newTotal = Math.max(0, Number(prof?.total_xp ?? 0) - xpRefund);
    await supabase
      .from('profile')
      .update({ total_xp: newTotal })
      .eq('id', prof?.id ?? 1);
  }

  // 3) Se o evento era uma conclusão (habit_complete) E corresponde ao
  // last_completed_at atual, reverter streak e ajustar last_completed_at.
  if (ev.type === 'habit_complete') {
    const { data: h } = await supabase.from('habits').select('*').eq('id', habitId).maybeSingle();
    if (h && h.last_completed_at === eventDateIso) {
      // Encontrar a conclusão imediatamente anterior
      const { data: prevCompletions } = await supabase
        .from('events')
        .select('occurred_at')
        .eq('entity_type', 'habit')
        .eq('entity_id', habitId)
        .eq('type', 'habit_complete')
        .order('occurred_at', { ascending: false })
        .limit(1);
      const prevIso = prevCompletions?.[0]
        ? toISO(new Date(prevCompletions[0].occurred_at))
        : null;
      const newStreak = Math.max(0, Number(h.current_streak ?? 0) - 1);
      await supabase
        .from('habits')
        .update({
          last_completed_at: prevIso,
          current_streak: newStreak,
        })
        .eq('id', habitId);
    }
  }
}

export default function HabitDayDetailModal({ open, onClose, date, events = [] }) {
  const { notify, reloadProfile } = useFocus();
  const [busy, setBusy] = useState(false);
  const [localEvents, setLocalEvents] = useState(events);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLocalEvents(events);
    setError(null);
  }, [events]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape' && !busy) onClose?.();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, busy]);

  if (!open || !date) return null;

  async function handleDelete(ev) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await performDeleteEvent(ev);
      setLocalEvents((prev) => prev.filter((x) => x.id !== ev.id));
      await reloadProfile?.();
      notify?.();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[HabitDayDetailModal] delete failed', err);
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  const longDate = formatLongDate(date).toUpperCase();
  const sub = `${WEEKDAY_NAMES_FULL[date.getDay()]} · Semana ${weekNumber(date)}`;

  const totals = localEvents.reduce(
    (acc, e) => {
      acc.xp += Number(e.xp_gained ?? 0);
      acc.focus += Number(e.focus_minutes ?? 0);
      if (e.type === 'habit_complete') acc.completions += 1;
      return acc;
    },
    { xp: 0, focus: 0, completions: 0 },
  );

  return createPortal(
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Hábitos do dia ${longDate}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose?.();
      }}
    >
      <section className="panel modal-panel">
        <header className="panel-header" style={{ background: 'linear-gradient(180deg, #4a6b3a 0%, #3a5430 100%)' }}>
          <div className="flex-1 min-w-0">
            <div className="title truncate">Hábitos — {longDate}</div>
            <div className="sub truncate">{sub}</div>
          </div>
          <button type="button" className="seal sm" onClick={onClose} aria-label="Fechar" disabled={busy}>
            ×
          </button>
        </header>

        <div className="modal-body">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <Stat label="Conclusões" value={String(totals.completions)} />
            <Stat label="Foco total" value={`${totals.focus} min`} />
            <Stat label="XP do dia" value={totals.xp ? `+${totals.xp.toLocaleString('pt-BR')}` : '—'} />
          </div>

          <Divider className="my-3" />

          {error && (
            <div className="font-eb text-[12px] text-[#7a2230] border border-[#7a2230] bg-[#7a2230]/10 px-2 py-1 mb-2">
              {error}
            </div>
          )}

          {localEvents.length === 0 ? (
            <div className="text-center py-8">
              <div className="font-eb text-[14px] text-[#5b4423]">Sem registros de hábitos para este dia.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2 fadein-stagger">
              {localEvents
                .slice()
                .sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at))
                .map((ev) => (
                  <EventRow key={ev.id} ev={ev} onDelete={handleDelete} busy={busy} />
                ))}
            </div>
          )}

          <div className="font-eb text-[10px] text-[#7a6442] mt-3">
            Ao excluir, o XP gerado é devolvido ao perfil. Se era a conclusão mais recente do hábito,
            o streak é reduzido e a data de último check-in volta para a conclusão anterior.
          </div>
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
