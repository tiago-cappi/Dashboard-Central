import { useEffect, useState } from 'react';
import Panel from '../../components/layout/Panel.jsx';
import { useHabits, isHabitCompletedToday } from './hooks/useHabits.js';
import { useHabitMutations } from './hooks/useHabitMutations.js';
import { useFocus } from './FocusContext.jsx';
import HabitFormModal from './HabitFormModal.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';

const PAGE_SIZE = 5;

const FREQ_LABEL = {
  daily: 'diário',
  weekly: 'semanal',
  custom: 'dias',
};

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

function HabitRow({ habit, sectorsById, completed, onToggle, onFocus, onEdit, onDelete, dragging, dragOver, onDragStart, onDragEnd, onDragOver, onDrop }) {
  const sector = habit.sector_id ? sectorsById?.get?.(habit.sector_id) : null;
  const sectorColor = sector?.color || habit.color || '#2a5a6b';
  const streak = Number(habit.current_streak ?? 0);
  const isDragging = dragging === habit.id;
  const isOver = dragOver === habit.id && !isDragging;

  return (
    <div
      className="habit-row"
      draggable={!completed}
      onDragStart={!completed ? onDragStart : undefined}
      onDragEnd={!completed ? onDragEnd : undefined}
      onDragOver={!completed ? onDragOver : undefined}
      onDrop={!completed ? onDrop : undefined}
      style={{
        borderLeft: `4px solid ${sectorColor}`,
        opacity: completed ? 0.55 : isDragging ? 0.4 : 1,
        outline: isOver ? '2px solid #a88a3d' : undefined,
        cursor: completed ? 'default' : 'grab',
      }}
    >
      {!completed && (
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
        className={`habit-check ${completed ? 'done' : ''}`}
        onClick={() => onToggle(habit)}
        title={completed ? 'Desmarcar' : 'Marcar concluído hoje'}
        aria-label={completed ? 'Desmarcar' : 'Marcar concluído hoje'}
      >
        {completed ? (
          <svg viewBox="0 0 16 16" width="12" height="12">
            <path d="M2 9l4 4 8-8" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        ) : null}
      </button>

      <div className="flex-1 min-w-0">
        <div className="font-eb text-[13px] text-[#1f1408] truncate" style={{ textDecoration: completed ? 'line-through' : 'none' }}>
          {habit.title}
        </div>
        <div className="flex items-center gap-2 mt-0.5 text-[10px] font-eb text-[#7a6442]">
          <span>{FREQ_LABEL[habit.frequency] || habit.frequency}</span>
          {sector && (
            <>
              <span>·</span>
              <span style={{ color: sectorColor }}>{sector.name}</span>
            </>
          )}
        </div>
      </div>

      <div className="habit-streak" title={`Melhor: ${habit.best_streak ?? 0}`}>
        <span className="habit-flame">🔥</span>
        <span className="font-num text-[12px]">{streak}</span>
      </div>

      <div className="habit-actions">
        {!completed && (
          <button
            type="button"
            className="habit-act focus-btn"
            onClick={() => onFocus(habit)}
            title="Iniciar foco"
            aria-label="iniciar foco"
          >
            <svg viewBox="0 0 16 16" width="11" height="11">
              <path d="M5 3l8 5-8 5V3z" fill="currentColor" />
            </svg>
          </button>
        )}
        <button type="button" className="habit-act" onClick={() => onEdit(habit)} title="Editar" aria-label="editar">
          <svg viewBox="0 0 16 16" width="11" height="11">
            <path d="M11 2l3 3-8 8H3v-3l8-8z" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
        <button type="button" className="habit-act danger" onClick={() => onDelete(habit)} title="Excluir" aria-label="excluir">
          <svg viewBox="0 0 16 16" width="11" height="11">
            <path d="M3 5h10M6 5V3h4v2M5 5l1 9h4l1-9" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function TodayHabits({ sectorsById }) {
  const { dueToday, completedToday, activeHabits, loading, today } = useHabits();
  const { completeHabit, uncompleteHabit, deleteHabit, reorderHabits } = useHabitMutations();
  const { openFocusModalForHabit } = useFocus();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [sortedDue, setSortedDue] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [pageDue, setPageDue] = useState(0);
  const [pageComp, setPageComp] = useState(0);

  useEffect(() => {
    if (!draggingId) setSortedDue(dueToday);
  }, [dueToday, draggingId]);

  useEffect(() => {
    const total = Math.ceil(sortedDue.length / PAGE_SIZE);
    if (pageDue > 0 && pageDue >= total) setPageDue(Math.max(0, total - 1));
  }, [sortedDue.length, pageDue]);

  useEffect(() => {
    const total = Math.ceil(completedToday.length / PAGE_SIZE);
    if (pageComp > 0 && pageComp >= total) setPageComp(Math.max(0, total - 1));
  }, [completedToday.length, pageComp]);

  function openCreate() { setEditing(null); setFormOpen(true); }
  function openEdit(habit) { setEditing(habit); setFormOpen(true); }

  async function onToggle(habit) {
    const isDone = isHabitCompletedToday(habit, today);
    if (isDone) await uncompleteHabit(habit.id);
    else await completeHabit(habit.id);
  }
  function onFocus(habit) { openFocusModalForHabit(habit); }
  function onDelete(habit) { setConfirmDel(habit); }

  async function performDelete() {
    if (!confirmDel) return;
    try {
      await deleteHabit(confirmDel.id);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[TodayHabits] delete failed', err);
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
    await reorderHabits(newSorted.map((h) => h.id));
  }

  const headerActions = (
    <button className="seal sm dark" type="button" onClick={openCreate}>+ Novo</button>
  );

  const total = sortedDue.length + completedToday.length;
  const progress = total === 0 ? 0 : completedToday.length / total;

  const pageDueItems = sortedDue.slice(pageDue * PAGE_SIZE, (pageDue + 1) * PAGE_SIZE);
  const pageCompItems = completedToday.slice(pageComp * PAGE_SIZE, (pageComp + 1) * PAGE_SIZE);
  const dueTotalPages = Math.ceil(sortedDue.length / PAGE_SIZE);
  const compTotalPages = Math.ceil(completedToday.length / PAGE_SIZE);

  return (
    <>
      <Panel title="Hábitos de hoje" subtitle="rotinas devidas no dia" accent="moss" actions={headerActions}>
        {loading ? (
          <div className="font-eb text-[12px] text-[#5b4423]">carregando…</div>
        ) : (
          <>
            {total > 0 && (
              <div className="habit-progress" title={`${completedToday.length}/${total} concluídos`}>
                <div className="habit-progress-fill" style={{ width: `${progress * 100}%` }} />
              </div>
            )}

            {activeHabits.length === 0 && (
              <div className="font-lora italic text-[13px] text-[#5b4423] py-4 text-center">
                Nenhum hábito ativo. Crie o primeiro para começar a forjar uma rotina.
              </div>
            )}

            {sortedDue.length > 0 && (
              <>
                <div className="flex flex-col gap-1.5 mb-2">
                  {pageDueItems.map((h) => (
                    <HabitRow
                      key={h.id}
                      habit={h}
                      sectorsById={sectorsById}
                      completed={false}
                      onToggle={onToggle}
                      onFocus={onFocus}
                      onEdit={openEdit}
                      onDelete={onDelete}
                      dragging={draggingId}
                      dragOver={dragOverId}
                      onDragStart={() => setDraggingId(h.id)}
                      onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                      onDragOver={(e) => { e.preventDefault(); setDragOverId(h.id); }}
                      onDrop={(e) => { e.preventDefault(); handleDrop(h.id); }}
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

            {completedToday.length > 0 && (
              <>
                <div className="font-eb text-[10px] uppercase tracking-[.15em] text-[#7a6442] mt-2 mb-1">
                  Concluídos hoje
                </div>
                <div className="flex flex-col gap-1.5">
                  {pageCompItems.map((h) => (
                    <HabitRow
                      key={h.id}
                      habit={h}
                      sectorsById={sectorsById}
                      completed
                      onToggle={onToggle}
                      onFocus={onFocus}
                      onEdit={openEdit}
                      onDelete={onDelete}
                      dragging={null}
                      dragOver={null}
                    />
                  ))}
                </div>
                <Pagination
                  page={pageComp}
                  total={completedToday.length}
                  onPrev={() => setPageComp((p) => Math.max(0, p - 1))}
                  onNext={() => setPageComp((p) => Math.min(compTotalPages - 1, p + 1))}
                />
              </>
            )}

            {activeHabits.length > 0 && sortedDue.length === 0 && completedToday.length === 0 && (
              <div className="font-lora italic text-[12px] text-[#5b4423] py-3 text-center">
                Nenhum hábito devido hoje. Aproveite o descanso.
              </div>
            )}
          </>
        )}
      </Panel>

      <HabitFormModal
        open={formOpen}
        habit={editing}
        onClose={() => { setFormOpen(false); setEditing(null); }}
      />

      <ConfirmDialog
        open={Boolean(confirmDel)}
        title="Excluir hábito"
        message={confirmDel ? `Excluir "${confirmDel.title}"? O histórico de eventos será preservado.` : ''}
        confirmLabel="Excluir"
        destructive
        onConfirm={performDelete}
        onCancel={() => setConfirmDel(null)}
      />
    </>
  );
}
