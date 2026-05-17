import { createPortal } from 'react-dom';
import { useEffect } from 'react';

export default function ConfirmDialog({
  open,
  title = 'Confirmar ação',
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') onCancel?.();
      if (e.key === 'Enter') onConfirm?.();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onCancel, onConfirm]);

  if (!open) return null;
  return createPortal(
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel?.();
      }}
    >
      <section className="panel modal-panel" style={{ width: 'min(440px, 100%)' }}>
        <header className={`panel-header ${destructive ? '' : 'navy'}`}>
          <div className="flex-1 min-w-0">
            <div className="title">{title}</div>
          </div>
        </header>
        <div className="modal-body">
          <p className="font-lora text-[14px] leading-relaxed text-[#3a2a18]">{message}</p>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="seal ghost" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`seal ${destructive ? 'dark' : ''}`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
