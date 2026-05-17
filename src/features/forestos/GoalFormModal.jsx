import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { useSectors } from './hooks/useSectors.js';
import { supabase, SUPABASE_CONFIGURED } from '../../lib/supabase.js';
import { useTreeMutations } from './hooks/useTreeMutations.js';

const INPUT_CLASSES =
  'w-full bg-[#fbf3d8] border border-[#a88a3d] px-2 py-1.5 font-lora text-[14px] text-[#1f1408] outline-none focus:border-[#7a2230] focus:ring-1 focus:ring-[#7a2230]';

const HORIZONS = [
  { value: '', label: '— sem horizonte —' },
  { value: 'quarter', label: 'trimestre' },
  { value: 'year', label: 'ano' },
  { value: 'multi_year', label: 'plurianual' },
];

const STATUSES = [
  { value: 'active', label: 'ativo' },
  { value: 'paused', label: 'pausado' },
  { value: 'done', label: 'concluído' },
  { value: 'abandoned', label: 'abandonado' },
];

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="font-eb text-[11px] text-[#5b4423] block mb-1">{label}</label>
      {children}
      {hint && <div className="font-eb text-[10px] text-[#7a6442] mt-0.5">{hint}</div>}
    </div>
  );
}

/**
 * Goal modal. `isSubgoal` é cosmético — o que define se é sub-objetivo é o
 * preenchimento de `parent_goal_id`.
 */
export default function GoalFormModal({ open, onClose, goal, defaultValues, isSubgoal = false }) {
  const editing = Boolean(goal?.id);
  const { sectors } = useSectors();
  const { createGoal, updateGoal } = useTreeMutations();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [parentGoalId, setParentGoalId] = useState('');
  const [horizon, setHorizon] = useState('');
  const [status, setStatus] = useState('active');
  const [targetDate, setTargetDate] = useState('');

  const [projects, setProjects] = useState([]);
  const [parentGoals, setParentGoals] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    if (editing && goal) {
      setTitle(goal.title ?? '');
      setDescription(goal.description ?? '');
      setSectorId(goal.sector_id ?? '');
      setProjectId(goal.project_id ?? '');
      setParentGoalId(goal.parent_goal_id ?? '');
      setHorizon(goal.horizon ?? '');
      setStatus(goal.status ?? 'active');
      setTargetDate(goal.target_date ?? '');
    } else {
      setTitle('');
      setDescription('');
      setSectorId(defaultValues?.sector_id ?? '');
      setProjectId(defaultValues?.project_id ?? '');
      setParentGoalId(defaultValues?.parent_goal_id ?? '');
      setHorizon('');
      setStatus('active');
      setTargetDate('');
    }
    setError(null);
  }, [open, editing, goal, defaultValues]);

  // projetos filtrados por setor
  useEffect(() => {
    if (!open || !SUPABASE_CONFIGURED) return;
    let cancelled = false;
    let q = supabase.from('projects').select('id, title, sector_id, status');
    if (sectorId) q = q.eq('sector_id', sectorId);
    q.order('title').then(({ data }) => {
      if (!cancelled) setProjects(data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [open, sectorId]);

  // possíveis pais (outros goals do mesmo setor, excluindo o próprio)
  useEffect(() => {
    if (!open || !SUPABASE_CONFIGURED) return;
    let cancelled = false;
    let q = supabase.from('goals').select('id, title, sector_id');
    if (sectorId) q = q.eq('sector_id', sectorId);
    q.order('title').then(({ data }) => {
      if (cancelled) return;
      const list = (data ?? []).filter((g) => g.id !== goal?.id);
      setParentGoals(list);
    });
    return () => {
      cancelled = true;
    };
  }, [open, sectorId, goal?.id]);

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

  async function onSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      setError('Título é obrigatório.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        sector_id: sectorId || null,
        project_id: projectId || null,
        parent_goal_id: parentGoalId || null,
        horizon: horizon || null,
        status,
        target_date: targetDate || null,
      };
      if (editing) await updateGoal(goal.id, payload);
      else await createGoal(payload);
      onClose?.();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const headerClass = isSubgoal || parentGoalId ? 'panel-header' : 'panel-header navy';
  const headerStyle =
    isSubgoal || parentGoalId
      ? { background: 'linear-gradient(180deg, #4a6b3a 0%, #3a5430 100%)' }
      : undefined;

  return createPortal(
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose?.();
      }}
    >
      <section className="panel modal-panel" style={{ width: 'min(620px, 100%)' }}>
        <header className={headerClass} style={headerStyle}>
          <div className="flex-1 min-w-0">
            <div className="title">
              {editing
                ? parentGoalId
                  ? 'Editar sub-objetivo'
                  : 'Editar objetivo'
                : isSubgoal || parentGoalId
                  ? 'Novo sub-objetivo'
                  : 'Novo objetivo'}
            </div>
            <div className="sub">{editing ? goal.title : 'hastear uma nova bandeira'}</div>
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
                maxLength={160}
              />
            </Field>

            <Field label="Descrição (opcional)">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={INPUT_CLASSES}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Setor">
                <select
                  value={sectorId}
                  onChange={(e) => {
                    setSectorId(e.target.value);
                    setProjectId('');
                    setParentGoalId('');
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

              <Field label="Projeto (opcional)">
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className={INPUT_CLASSES}
                  disabled={projects.length === 0}
                >
                  <option value="">— sem projeto —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field
              label="Objetivo-pai (opcional)"
              hint="preencha para transformar este em sub-objetivo"
            >
              <select
                value={parentGoalId}
                onChange={(e) => setParentGoalId(e.target.value)}
                className={INPUT_CLASSES}
                disabled={parentGoals.length === 0}
              >
                <option value="">— sem pai (objetivo top-level) —</option>
                {parentGoals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Horizonte">
                <select
                  value={horizon}
                  onChange={(e) => setHorizon(e.target.value)}
                  className={INPUT_CLASSES}
                >
                  {HORIZONS.map((h) => (
                    <option key={h.value} value={h.value}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Status">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={INPUT_CLASSES}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Prazo">
                <input
                  type="date"
                  value={targetDate || ''}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className={INPUT_CLASSES}
                />
              </Field>
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
              {submitting ? 'salvando…' : editing ? 'Salvar alterações' : 'Criar objetivo'}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
