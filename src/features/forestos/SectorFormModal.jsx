import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { useTreeMutations } from './hooks/useTreeMutations.js';

const INPUT_CLASSES =
  'w-full bg-[#fbf3d8] border border-[#a88a3d] px-2 py-1.5 font-lora text-[14px] text-[#1f1408] outline-none focus:border-[#7a2230] focus:ring-1 focus:ring-[#7a2230]';

const SECTOR_PALETTE = [
  { name: 'Vinho', value: '#7a2230' },
  { name: 'Azul-marinho', value: '#1f3a5f' },
  { name: 'Ouro velho', value: '#c9a14a' },
  { name: 'Verde-musgo', value: '#4a6b3a' },
  { name: 'Terracota', value: '#a8553a' },
  { name: 'Ardósia', value: '#4a5568' },
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

export default function SectorFormModal({ open, onClose, sector }) {
  const editing = Boolean(sector?.id);
  const { createSector, updateSector } = useTreeMutations();

  const [name, setName] = useState('');
  const [color, setColor] = useState(SECTOR_PALETTE[0].value);
  const [archived, setArchived] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    if (editing && sector) {
      setName(sector.name ?? '');
      setColor(sector.color ?? SECTOR_PALETTE[0].value);
      setArchived(Boolean(sector.archived));
    } else {
      setName('');
      setColor(SECTOR_PALETTE[0].value);
      setArchived(false);
    }
    setError(null);
  }, [open, editing, sector]);

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
    if (!name.trim()) {
      setError('Nome é obrigatório.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = { name: name.trim(), color, archived };
      if (editing) await updateSector(sector.id, payload);
      else await createSector(payload);
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
      <section className="panel modal-panel" style={{ width: 'min(520px, 100%)' }}>
        <header className="panel-header">
          <div className="flex-1 min-w-0">
            <div className="title">{editing ? 'Editar setor' : 'Novo setor'}</div>
            <div className="sub">{editing ? sector.name : 'instaurar uma nova câmara'}</div>
          </div>
        </header>
        <form onSubmit={onSubmit} className="modal-body">
          <div className="grid grid-cols-1 gap-3">
            <Field label="Nome">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={INPUT_CLASSES}
                autoFocus
                maxLength={80}
              />
            </Field>

            <Field label="Cor heráldica">
              <div className="flex flex-wrap gap-2 mt-1">
                {SECTOR_PALETTE.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    title={c.name}
                    aria-label={c.name}
                    className="w-7 h-7 border-2 transition-transform hover:scale-110"
                    style={{
                      background: c.value,
                      borderColor: color === c.value ? '#1f1408' : '#a88a3d',
                      boxShadow: color === c.value ? 'inset 0 0 0 2px #fbf3d8' : 'none',
                    }}
                  />
                ))}
              </div>
            </Field>

            {editing && (
              <label className="flex items-center gap-2 font-eb text-[12px] text-[#5b4423] cursor-pointer">
                <input
                  type="checkbox"
                  checked={archived}
                  onChange={(e) => setArchived(e.target.checked)}
                />
                Arquivar este setor (não aparece na árvore principal)
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
              {submitting ? 'salvando…' : editing ? 'Salvar alterações' : 'Criar setor'}
            </button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
