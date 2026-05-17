import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { useSectors } from './hooks/useSectors.js';
import { supabase, SUPABASE_CONFIGURED } from '../../lib/supabase.js';
import { useReminderMutations } from './hooks/useReminderMutations.js';

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="font-eb text-[11px] text-[#5b4423] block mb-1">{label}</label>
      {children}
      {hint && <div className="font-eb text-[10px] text-[#7a6442] mt-0.5">{hint}</div>}
    </div>
  );
}

const INPUT_CLASSES =
  'w-full bg-[#fbf3d8] border border-[#a88a3d] px-2 py-1.5 font-lora text-[14px] text-[#1f1408] outline-none focus:border-[#7a2230] focus:ring-1 focus:ring-[#7a2230]';

const DAYS = [
  { v: 0, l: 'Dom' },
  { v: 1, l: 'Seg' },
  { v: 2, l: 'Ter' },
  { v: 3, l: 'Qua' },
  { v: 4, l: 'Qui' },
  { v: 5, l: 'Sex' },
  { v: 6, l: 'Sáb' },
];

const FREQUENCIES = [
  { v: 'once', l: 'Único' },
  { v: 'daily', l: 'Diário' },
  { v: 'weekly', l: 'Semanal' },
  { v: 'custom', l: 'Dias da semana' },
];

export default function ReminderFormModal({ open, onClose, reminder, defaultValues }) {
  const editing = Boolean(reminder?.id);
  const { sectors } = useSectors();
  const { createReminder, updateReminder } = useReminderMutations();

  const [title, setTitle] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [goalId, setGoalId] = useState('');
  const [goals, setGoals] = useState([]);
  const [frequency, setFrequency] = useState('daily');
  const [customDays, setCustomDays] = useState([]);
  const [timeOfDay, setTimeOfDay] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    if (editing && reminder) {
      setTitle(reminder.title ?? reminder.message ?? '');
      setSectorId(reminder.sector_id ?? '');
      setGoalId(reminder.goal_id ?? '');
      setFrequency(reminder.frequency ?? 'daily');
      setCustomDays(Array.isArray(reminder.custom_days) ? reminder.custom_days.map(Number) : []);
      setTimeOfDay(reminder.time_of_day ?? '');
      setDueAt(reminder.due_at ?? '');
      setActive(reminder.active ?? true);
    } else {
      setTitle(defaultValues?.title ?? '');
      setSectorId(defaultValues?.sector_id ?? '');
      setGoalId(defaultValues?.goal_id ?? '');
      setFrequency('daily');
      setCustomDays([]);
      setTimeOfDay('');
      setDueAt('');
      setActive(true);
    }
    setError(null);
  }, [open, editing, reminder, defaultValues]);

  useEffect(() => {
    if (!open || !SUPABASE_CONFIGURED) return;
    let cancelled = false;
    let query = supabase.from('goals').select('id, title, sector_id');
    if (sectorId) query = query.eq('sector_id', sectorId);
    query.order('title').then(({ data }) => {
      if (!cancelled) setGoals(data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [open, sectorId]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape' && !submitting) onClose?.();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, submitting]);

  if (!open) return null;

  function toggleDay(d) {
    setCustomDays((arr) => (arr.includes(d) ? arr.filter((x) => x !== d) : [...arr, d].sort()));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Título é obrigatório.');
      return;
    }
    if (frequency === 'custom' && customDays.length === 0) {
      setError('Selecione ao menos um dia para frequência personalizada.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        sector_id: sectorId || null,
        goal_id: goalId || null,
        frequency,
        custom_days: frequency === 'custom' ? customDays : null,
        time_of_day: timeOfDay || null,
        due_at: frequency === 'once' && dueAt ? dueAt : null,
        active,
      };
      if (editing) {
        await updateReminder(reminder.id, payload);
      } else {
        await createReminder(payload);
      }
      onClose?.();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose?.();
      }}
    >
      <section className="panel modal-panel" style={{ width: 'min(560px, 100%)' }}>
        <header
          className="panel-header"
          style={{ background: 'linear-gradient(180deg, #a88a3d 0%, #5b4423 100%)' }}
        >
          <div className="flex-1 min-w-0">
            <div className="title">{editing ? 'Editar lembrete' : 'Novo lembrete'}</div>
            <div className="sub">{editing ? (reminder.title || reminder.message) : 'forjar um aviso recorrente'}</div>
          </div>
        </header>
        <form onSubmit={onSubmit} className="modal-body">
          <div className="grid grid-cols-1 gap-3">
            <Field label="Mensagem">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={INPUT_CLASSES}
                autoFocus
                maxLength={200}
                placeholder="ex.: Tomar Lamotrigina"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Setor (opcional)">
                <select
                  value={sectorId}
                  onChange={(e) => {
                    setSectorId(e.target.value);
                    setGoalId('');
                  }}
                  className={INPUT_CLASSES}
                >
                  <option value="">— sem setor —</option>
                  {sectors
                    .filter((s) => !s.archived)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </select>
              </Field>

              <Field label="Objetivo (opcional)">
                <select
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                  className={INPUT_CLASSES}
                  disabled={goals.length === 0}
                >
                  <option value="">— sem objetivo —</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Frequência">
              <div className="flex gap-2 flex-wrap">
                {FREQUENCIES.map((f) => (
                  <button
                    key={f.v}
                    type="button"
                    className={`seal sm${frequency === f.v ? '' : ' ghost'}`}
                    onClick={() => setFrequency(f.v)}
                  >
                    {f.l}
                  </button>
                ))}
              </div>
            </Field>

            {frequency === 'custom' && (
              <Field label="Dias da semana">
                <div className="flex gap-1 flex-wrap">
                  {DAYS.map((d) => (
                    <button
                      key={d.v}
                      type="button"
                      onClick={() => toggleDay(d.v)}
                      className={`seal sm${customDays.includes(d.v) ? '' : ' ghost'}`}
                      style={{ minWidth: 48 }}
                    >
                      {d.l}
                    </button>
                  ))}
                </div>
              </Field>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Horário (opcional)" hint="hh:mm — apenas exibido">
                <input
                  type="time"
                  value={timeOfDay}
                  onChange={(e) => setTimeOfDay(e.target.value)}
                  className={INPUT_CLASSES}
                />
              </Field>

              {frequency === 'once' && (
                <Field label="Data limite (opcional)">
                  <input
                    type="date"
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    className={INPUT_CLASSES}
                  />
                </Field>
              )}
            </div>

            {editing && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!active}
                  onChange={(e) => setActive(!e.target.checked)}
                />
                <span className="font-eb text-[12px] text-[#5b4423]">Arquivar lembrete</span>
              </label>
            )}

            {error && (
              <div className="font-eb text-[12px] text-[#7a2230] border border-[#7a2230] bg-[#7a2230]/10 px-2 py-1">
                {error}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="seal ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className="seal dark" disabled={submitting}>
              {submitting ? 'salvando…' : editing ? 'Salvar alterações' : 'Criar lembrete'}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
