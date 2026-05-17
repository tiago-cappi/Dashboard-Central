import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { useSectors } from './hooks/useSectors.js';
import { supabase, SUPABASE_CONFIGURED } from '../../lib/supabase.js';
import { useHabitMutations } from './hooks/useHabitMutations.js';

function StarSlider({ label, value, onChange, color = '#7a2230' }) {
  return (
    <div>
      <label className="font-eb text-[11px] text-[#5b4423]">{label}</label>
      <div className="flex items-center gap-1 mt-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`${label} ${n}`}
            className="px-1 cursor-pointer transition-transform hover:scale-110"
            style={{
              color,
              opacity: n <= value ? 1 : 0.25,
              fontSize: '22px',
              lineHeight: 1,
              background: 'transparent',
              border: 'none',
            }}
          >
            ★
          </button>
        ))}
        <span className="font-num text-[12px] text-[#5b4423] ml-2">{value}/5</span>
      </div>
    </div>
  );
}

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

export default function HabitFormModal({ open, onClose, habit, defaultValues }) {
  const editing = Boolean(habit?.id);
  const { sectors } = useSectors();
  const { createHabit, updateHabit } = useHabitMutations();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [goalId, setGoalId] = useState('');
  const [goals, setGoals] = useState([]);
  const [frequency, setFrequency] = useState('daily');
  const [customDays, setCustomDays] = useState([]);
  const [importance, setImportance] = useState(3);
  const [difficulty, setDifficulty] = useState(3);
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    if (editing && habit) {
      setTitle(habit.title ?? '');
      setDescription(habit.description ?? '');
      setSectorId(habit.sector_id ?? '');
      setGoalId(habit.goal_id ?? '');
      setFrequency(habit.frequency ?? 'daily');
      setCustomDays(Array.isArray(habit.custom_days) ? habit.custom_days.map(Number) : []);
      setImportance(habit.importance ?? 3);
      setDifficulty(habit.difficulty ?? 3);
      setActive(habit.active ?? true);
    } else {
      setTitle(defaultValues?.title ?? '');
      setDescription('');
      setSectorId(defaultValues?.sector_id ?? '');
      setGoalId(defaultValues?.goal_id ?? '');
      setFrequency('daily');
      setCustomDays([]);
      setImportance(3);
      setDifficulty(3);
      setActive(true);
    }
    setError(null);
  }, [open, editing, habit, defaultValues]);

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
        description: description.trim() || null,
        sector_id: sectorId || null,
        goal_id: goalId || null,
        frequency,
        custom_days: frequency === 'custom' ? customDays : null,
        importance,
        difficulty,
        active,
      };
      if (editing) {
        await updateHabit(habit.id, payload);
      } else {
        await createHabit(payload);
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
      <section className="panel modal-panel" style={{ width: 'min(640px, 100%)' }}>
        <header
          className="panel-header"
          style={{ background: 'linear-gradient(180deg, #2a5a6b 0%, #1a3a4a 100%)' }}
        >
          <div className="flex-1 min-w-0">
            <div className="title">{editing ? 'Editar hábito' : 'Novo hábito'}</div>
            <div className="sub">{editing ? habit.title : 'forjar um novo ritual'}</div>
          </div>
        </header>
        <form onSubmit={onSubmit} className="modal-body">
          <div className="grid grid-cols-1 gap-3">
            <Field label="Título">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={INPUT_CLASSES}
                autoFocus
                maxLength={140}
              />
            </Field>

            <Field label="Descrição (opcional)">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className={INPUT_CLASSES}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Setor">
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
              <div className="flex gap-2">
                {[
                  { v: 'daily', l: 'Diário' },
                  { v: 'weekly', l: 'Semanal' },
                  { v: 'custom', l: 'Dias da semana' },
                ].map((f) => (
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
              <StarSlider label="Importância" value={importance} onChange={setImportance} color="#7a2230" />
              <StarSlider label="Dificuldade" value={difficulty} onChange={setDifficulty} color="#1f3a5f" />
            </div>

            <div className="flex flex-col gap-1.5 pt-1">
              <div className="font-eb text-[10px] text-[#7a6442]">
                XP do hábito é colhido automaticamente ao encerrar cada sessão de foco
                (minutos × importância × dificuldade ÷ 10).
              </div>
              {editing && (
                <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input
                    type="checkbox"
                    checked={!active}
                    onChange={(e) => setActive(!e.target.checked)}
                  />
                  <span className="font-eb text-[12px] text-[#5b4423]">Arquivar hábito</span>
                </label>
              )}
            </div>

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
              {submitting ? 'salvando…' : editing ? 'Salvar alterações' : 'Criar hábito'}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
