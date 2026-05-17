import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { useSectors } from './hooks/useSectors.js';
import { useTreeMutations } from './hooks/useTreeMutations.js';

const INPUT_CLASSES =
  'w-full bg-[#fbf3d8] border border-[#a88a3d] px-2 py-1.5 font-lora text-[14px] text-[#1f1408] outline-none focus:border-[#7a2230] focus:ring-1 focus:ring-[#7a2230]';

const STATUSES = [
  { value: 'active', label: 'ativo' },
  { value: 'paused', label: 'pausado' },
  { value: 'done', label: 'concluído' },
  { value: 'abandoned', label: 'abandonado' },
];

function Field({ label, children }) {
  return (
    <div>
      <label className="font-eb text-[11px] text-[#5b4423] block mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function ProjectFormModal({ open, onClose, project, defaultValues }) {
  const editing = Boolean(project?.id);
  const { sectors } = useSectors();
  const { createProject, updateProject } = useTreeMutations();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sectorId, setSectorId] = useState('');
  const [status, setStatus] = useState('active');
  const [targetDate, setTargetDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    if (editing && project) {
      setTitle(project.title ?? '');
      setDescription(project.description ?? '');
      setSectorId(project.sector_id ?? '');
      setStatus(project.status ?? 'active');
      setTargetDate(project.target_date ?? '');
    } else {
      setTitle('');
      setDescription('');
      setSectorId(defaultValues?.sector_id ?? '');
      setStatus('active');
      setTargetDate('');
    }
    setError(null);
  }, [open, editing, project, defaultValues]);

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
        status,
        target_date: targetDate || null,
      };
      if (editing) await updateProject(project.id, payload);
      else await createProject(payload);
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
      <section className="panel modal-panel" style={{ width: 'min(580px, 100%)' }}>
        <header className="panel-header wood">
          <div className="flex-1 min-w-0">
            <div className="title">{editing ? 'Editar projeto' : 'Novo projeto'}</div>
            <div className="sub">{editing ? project.title : 'erguer um novo pilar'}</div>
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
                rows={3}
                className={INPUT_CLASSES}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Setor">
                <select
                  value={sectorId}
                  onChange={(e) => setSectorId(e.target.value)}
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
            </div>

            <Field label="Prazo (opcional)">
              <input
                type="date"
                value={targetDate || ''}
                onChange={(e) => setTargetDate(e.target.value)}
                className={INPUT_CLASSES}
              />
            </Field>

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
              {submitting ? 'salvando…' : editing ? 'Salvar alterações' : 'Criar projeto'}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
