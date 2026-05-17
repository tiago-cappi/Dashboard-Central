import { useEffect, useState } from 'react';
import Panel from '../../components/layout/Panel.jsx';
import { useReminders, isReminderAckedToday } from './hooks/useReminders.js';
import { useReminderMutations } from './hooks/useReminderMutations.js';
import ReminderFormModal from './ReminderFormModal.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';

const FREQ_LABEL = {
  once: 'único',
  daily: 'diário',
  weekly: 'semanal',
  custom: 'dias',
};

const PAGE_SIZE = 5;

function reorderArray(arr, fromId, toId) {
  const fromIdx = arr.findIndex((x) => x.id === fromId);
  const toIdx = arr.findIndex((x) => x.id === toId);
  if (fromIdx === -1 || toIdx === -1) return arr;
  const next = [...arr];
  const [removed] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, removed);
  return next;
}

function Pagination({ page, total, onPrev, onNext }) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#a88a3d]/20">
      <button type="button" className="seal sm ghost" onClick={onPrev} disabled={page === 0}>◄</button>
      <span className="font-eb text-[11px] text-[#7a6442]">{page + 1} / {totalPages}</span>
      <button type="button" className="seal sm ghost" onClick={onNext} disabled={page >= totalPages - 1}>►</button>
    </div>
  );
}

function ReminderRow({
  reminder, sectorsById, acked, onToggle, onEdit, onDelete,
  dragging, dragOver, onDragStart, onDragEnd, onDragOver, onDrop,
}) {
  const sector = reminder.sector_id ? sectorsById?.get?.(reminder.sector_id) : null;
  const sectorColor = sector?.color || '#a88a3d';
  const message = reminder.title || reminder.message;
  const isDragging = dragging === reminder.id;
  const isOver = dragOver === reminder.id && !isDragging;

  return (
    <div
      className="habit-row"
      draggable={!acked}
      onDragStart={!acked ? onDragStart : undefined}
      onDragEnd={!acked ? onDragEnd : undefined}
      onDragOver={!acked ? onDragOver : undefined}
      onDrop={!acked ? onDrop : undefined}
      style={{
        borderLeft: `4px solid ${sectorColor}`,
        opacity: acked ? 0.55 : isDragging ? 0.4 : 1,
        outline: isOver ? '2px solid #a88a3d' : undefined,
        cursor: acked ? 'default' : 'grab',
      }}
    >
      {!acked && (
        <span
          className="text-[#a88a3d]/40 hover:text-[#a88a3d] select-none flex-none transition mr-1"
          title="arrastar para reordenar"
          style={{ fontSize: 14, lineHeight: 1 }}
        >
          ⠿
        </span>
      )}
      <button
        type="button"
        className={`habit-check ${acked ? 'done' : ''}`}
        onClick={() => onToggle(reminder)}
        title={acked ? 'Desmarcar' : 'Marcar como feito'}
        aria-label={acked ? 'Desmarcar' : 'Marcar como feito'}
      >
        {acked ? (
          <svg viewBox="0 0 16 16" width="12" height="12">
            <path d="M2 9l4 4 8-8" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        ) : null}
      </button>

      <div className="flex-1 min-w-0">
        <div
          className="font-eb text-[13px] text-[#1f1408] truncate"
          style={{ textDecoration: acked ? 'line-through' : 'none' }}
        >
          {message}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] font-eb text-[#7a6442]">
          <span>{FREQ_LABEL[reminder.frequency] || reminder.frequency}</span>
          {reminder.time_of_day && (
            <>
              <span>·</span>
              <span>{reminder.time_of_day}</span>
            </>
          )}
          {reminder.due_at && reminder.frequency === 'once' && (
            <>
              <span>·</span>
              <span>até {reminder.due_at}</span>
            </>
          )}
          {sector && (
            <>
              <span>·</span>
              <span style={{ color: sectorColor }}>{sector.name}</span>
            </>
          )}
        </div>
      </div>

      <div className="habit-actions">
        <button
          type="button"
          className="habit-act"
          onClick={() => onEdit(reminder)}
          title="Editar"
          aria-label="editar"
        >
          <svg viewBox="0 0 16 16" width="11" height="11">
            <path d="M11 2l3 3-8 8H3v-3l8-8z" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
        <button
          type="button"
          className="habit-act danger"
          onClick={() => onDelete(reminder)}
          title="Excluir"
          aria-label="excluir"
        >
          <svg viewBox="0 0 16 16" width="11" height="11">
            <path d="M3 5h10M6 5V3h4v2M5 5l1 9h4l1-9" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function TodayReminders({ sectorsById }) {
  const { dueToday, ackedToday, activeReminders, loading, today } = useReminders();
  const { acknowledgeReminder, unacknowledgeReminder, deleteReminder, reorderReminders } = useReminderMutations();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [sortedDue, setSortedDue] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [pageDue, setPageDue] = useState(0);
  const [pageAcked, setPageAcked] = useState(0);

  useEffect(() => {
    if (!draggingId) setSortedDue(dueToday);
  }, [dueToday, draggingId]);

  useEffect(() => {
    const total = Math.ceil(sortedDue.length / PAGE_SIZE);
    if (pageDue > 0 && pageDue >= total) setPageDue(Math.max(0, total - 1));
  }, [sortedDue.length, pageDue]);

  useEffect(() => {
    const total = Math.ceil(ackedToday.length / PAGE_SIZE);
    if (pageAcked > 0 && pageAcked >= total) setPageAcked(Math.max(0, total - 1));
  }, [ackedToday.length, pageAcked]);

  const ackedTotalPages = Math.max(1, Math.ceil(ackedToday.length / PAGE_SIZE));
  const safeAckedPage = Math.min(pageAcked, ackedTotalPages - 1);
  const pageDueItems = sortedDue.slice(pageDue * PAGE_SIZE, (pageDue + 1) * PAGE_SIZE);
  const pageAckedItems = ackedToday.slice(safeAckedPage * PAGE_SIZE, (safeAckedPage + 1) * PAGE_SIZE);
  const dueTotalPages = Math.ceil(sortedDue.length / PAGE_SIZE);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(reminder) {
    setEditing(reminder);
    setFormOpen(true);
  }
  async function onToggle(reminder) {
    const isAcked = isReminderAckedToday(reminder, today);
    if (isAcked) {
      await unacknowledgeReminder(reminder.id);
    } else {
      await acknowledgeReminder(reminder.id);
    }
  }
  function onDelete(reminder) {
    setConfirmDel(reminder);
  }
  async function performDelete() {
    if (!confirmDel) return;
    try {
      await deleteReminder(confirmDel.id);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[TodayReminders] delete failed', err);
    } finally {
      setConfirmDel(null);
    }
  }

  async function handleDrop(targetId) {
    const fromId = draggingId;
    setDraggingId(null);
    setDragOverId(null);
    if (!fromId || fromId === targetId) return;
    const newSorted = reorderArray(sortedDue, fromId, targetId);
    setSortedDue(newSorted);
    await reorderReminders(newSorted.map((r) => r.id));
  }

  const headerActions = (
    <button className="seal sm dark" type="button" onClick={openCreate}>
      + Novo
    </button>
  );

  const total = sortedDue.length + ackedToday.length;
  const progress = total === 0 ? 0 : ackedToday.length / total;

  return (
    <>
      <Panel title="Lembretes de hoje" subtitle="avisos do dia" accent="gold" actions={headerActions}>
        {loading ? (
          <div className="font-eb text-[12px] text-[#5b4423]">carregando…</div>
        ) : (
          <>
            {total > 0 && (
              <div className="habit-progress" title={`${ackedToday.length}/${total} concluídos`}>
                <div className="habit-progress-fill" style={{ width: `${progress * 100}%` }} />
              </div>
            )}

            {activeReminders.length === 0 && (
              <div className="font-lora italic text-[13px] text-[#5b4423] py-4 text-center">
                Nenhum lembrete ativo. Crie um para nunca esquecer um ritual ou tarefa.
              </div>
            )}

            {sortedDue.length > 0 && (
              <>
                <div className="flex flex-col gap-1.5 mb-2">
                  {pageDueItems.map((r) => (
                    <ReminderRow
                      key={r.id}
                      reminder={r}
                      sectorsById={sectorsById}
                      acked={false}
                      onToggle={onToggle}
                      onEdit={openEdit}
                      onDelete={onDelete}
                      dragging={draggingId}
                      dragOver={dragOverId}
                      onDragStart={() => setDraggingId(r.id)}
                      onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                      onDragOver={(e) => { e.preventDefault(); setDragOverId(r.id); }}
                      onDrop={(e) => { e.preventDefault(); handleDrop(r.id); }}
                    />
                  ))}
                </div>
                <Pagination
                  page={pageDue}
                  total={sortedDue.length}
                  onPrev={() => setPageDue((p) => Math.max(0, p - 1))}
                  onNext={() => setPageDue((p) => Math.min(dueTotalPages - 1, p + 1))}
                />
              </>
            )}

            {ackedToday.length > 0 && (
              <>
                <div className="font-eb text-[10px] uppercase tracking-[.15em] text-[#7a6442] mt-2 mb-1">
                  Feitos hoje
                </div>
                <div className="flex flex-col gap-1.5">
                  {pageAckedItems.map((r) => (
                    <ReminderRow
                      key={r.id}
                      reminder={r}
                      sectorsById={sectorsById}
                      acked
                      onToggle={onToggle}
                      onEdit={openEdit}
                      onDelete={onDelete}
                      dragging={null}
                      dragOver={null}
                    />
                  ))}
                </div>
                <Pagination
                  page={safeAckedPage}
                  total={ackedToday.length}
                  onPrev={() => setPageAcked((p) => Math.max(0, p - 1))}
                  onNext={() => setPageAcked((p) => Math.min(ackedTotalPages - 1, p + 1))}
                />
              </>
            )}

            {activeReminders.length > 0 && sortedDue.length === 0 && ackedToday.length === 0 && (
              <div className="font-lora italic text-[12px] text-[#5b4423] py-3 text-center">
                Nenhum lembrete devido hoje.
              </div>
            )}
          </>
        )}
      </Panel>

      <ReminderFormModal
        open={formOpen}
        reminder={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmDel)}
        title="Excluir lembrete"
        message={confirmDel ? `Excluir "${confirmDel.title || confirmDel.message}"?` : ''}
        confirmLabel="Excluir"
        destructive
        onConfirm={performDelete}
        onCancel={() => setConfirmDel(null)}
      />
    </>
  );
}
