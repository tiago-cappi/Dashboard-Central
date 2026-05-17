import { useEffect, useState } from 'react';
import Panel from '../../components/layout/Panel.jsx';
import { useActiveMissions } from './hooks/useMonthMissions.js';
import { pesoOf, pesoTier, formatMinutes } from './lib/productivity.js';
import { parseISO, formatLongDate } from './lib/calendar.js';
import { useFocus } from './FocusContext.jsx';
import { useMissionMutations } from './hooks/useMissionMutations.js';
import MissionFormModal from './MissionFormModal.jsx';
import HarvestModal from './HarvestModal.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';

const PAGE_SIZE = 5;

function IconBtn({ title, onClick, children, tone = 'neutral', disabled }) {
  const colors =
    tone === 'danger'
      ? { color: '#7a2230', border: '#7a2230' }
      : tone === 'go'
      ? { color: '#4a6b3a', border: '#4a6b3a' }
      : tone === 'gold'
      ? { color: '#a88a3d', border: '#a88a3d' }
      : { color: '#5b4423', border: '#5b4423' };
  return (
    <button
      type="button"
      data-tip={title}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center w-7 h-7 hover:bg-[#a88a3d]/15 transition"
      style={{
        color: colors.color,
        border: `1px solid ${colors.border}`,
        background: 'rgba(255,245,212,.4)',
        fontSize: 13,
        lineHeight: 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

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
    <div className="flex items-center justify-between pt-2 mt-2 border-t border-[#a88a3d]/20">
      <button type="button" className="seal sm ghost" onClick={onPrev} disabled={page === 0}>
        ◄
      </button>
      <span className="font-eb text-[11px] text-[#7a6442]">
        {page + 1} / {totalPages}
      </span>
      <button type="button" className="seal sm ghost" onClick={onNext} disabled={page >= totalPages - 1}>
        ►
      </button>
    </div>
  );
}

export default function ActiveMissions({ sectorsById }) {
  const { missions: hookMissions, loading, refetch } = useActiveMissions();
  const { openFocusModal, isActive, profile, busy, subscribe } = useFocus();
  const { deleteMission, reorderMissions } = useMissionMutations();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [harvest, setHarvest] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [sorted, setSorted] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [page, setPage] = useState(0);

  useEffect(() => subscribe(() => refetch()), [subscribe, refetch]);

  useEffect(() => {
    if (!draggingId) setSorted(hookMissions);
  }, [hookMissions, draggingId]);

  useEffect(() => {
    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
    if (page > 0 && page >= totalPages) setPage(Math.max(0, totalPages - 1));
  }, [sorted.length, page]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(m) {
    setEditing(m);
    setFormOpen(true);
  }

  async function handleDrop(targetId) {
    const fromId = draggingId;
    setDraggingId(null);
    setDragOverId(null);
    if (!fromId || fromId === targetId) return;
    const newSorted = reorderArray(sorted, fromId, targetId);
    setSorted(newSorted);
    await reorderMissions(newSorted.map((m) => m.id));
  }

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageMissions = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const headerActions = (
    <button className="seal sm dark" type="button" onClick={openCreate}>
      + Nova
    </button>
  );

  return (
    <Panel title="Missões em curso" subtitle="próximas frentes do gabinete" accent="wood" actions={headerActions}>
      {loading ? (
        <div className="font-eb text-[12px] text-[#5b4423]">consultando…</div>
      ) : sorted.length === 0 ? (
        <div className="font-lora italic text-[12px] text-[#7a6442]">
          Nenhuma missão ativa. Crie a primeira clicando em + Nova.
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {pageMissions.map((m) => {
              const peso = pesoOf(m);
              const tier = pesoTier(peso);
              const sector = sectorsById?.get?.(m.sector_id);
              const due = m.due_date ? parseISO(m.due_date) : null;
              const focusOnThis = isActive && profile?.current_focus_mission_id === m.id;
              const accumulatedXp = Number(m.xp_gained ?? 0);
              const isDragging = draggingId === m.id;
              const isOver = dragOverId === m.id && !isDragging;
              return (
                <div
                  key={m.id}
                  className="decree hoverlift"
                  draggable
                  onDragStart={() => setDraggingId(m.id)}
                  onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                  onDragOver={(e) => { e.preventDefault(); setDragOverId(m.id); }}
                  onDrop={(e) => { e.preventDefault(); handleDrop(m.id); }}
                  style={{
                    opacity: isDragging ? 0.4 : 1,
                    outline: isOver ? '2px solid #a88a3d' : undefined,
                    cursor: 'grab',
                  }}
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className="text-[#a88a3d]/40 hover:text-[#a88a3d] select-none flex-none transition"
                      title="arrastar para reordenar"
                      style={{ fontSize: 16, lineHeight: 1 }}
                    >
                      ⠿
                    </span>
                    {sector && (
                      <span
                        className="chip"
                        style={{ color: sector.color || '#5b4423', borderColor: sector.color || '#5b4423' }}
                      >
                        <span className="dot" style={{ background: sector.color || '#5b4423', boxShadow: 'none' }} />
                        {sector.name}
                      </span>
                    )}
                    <span className="font-eb text-[11px]" style={{ color: tier.color }}>
                      {tier.label} · peso {peso}
                    </span>
                    {focusOnThis && (
                      <span className="font-eb text-[11px] text-[#4a6b3a]">● em foco</span>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                      {focusOnThis ? (
                        <IconBtn title="Ver sessão de foco" tone="gold" onClick={() => openFocusModal(m)}>
                          ⏱
                        </IconBtn>
                      ) : (
                        <IconBtn
                          title="Iniciar foco"
                          tone="go"
                          onClick={() => openFocusModal(m)}
                          disabled={busy}
                        >
                          ▶
                        </IconBtn>
                      )}
                      <IconBtn title="Concluir & colher" tone="gold" onClick={() => setHarvest(m)} disabled={busy}>
                        ✓
                      </IconBtn>
                      <IconBtn title="Editar" onClick={() => openEdit(m)}>✎</IconBtn>
                      <IconBtn title="Excluir" tone="danger" onClick={() => setConfirmDel(m)}>✕</IconBtn>
                    </div>
                  </div>
                  <div className="font-cormorant text-[15px] font-semibold text-[#1f1408] leading-snug">
                    {m.title}
                  </div>
                  <div className="font-num text-[11px] text-[#5b4423] mt-1 flex gap-3 flex-wrap">
                    <span>⏱ {formatMinutes(m.focus_minutes)}</span>
                    <span>★ {m.importance}</span>
                    <span>◆ {m.difficulty}</span>
                    {accumulatedXp > 0 && (
                      <span style={{ color: '#4a6b3a' }}>✦ {accumulatedXp.toLocaleString('pt-BR')} XP acum.</span>
                    )}
                    {due && <span>prazo: {formatLongDate(due)}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination
            page={page}
            total={sorted.length}
            onPrev={() => setPage((p) => Math.max(0, p - 1))}
            onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          />
        </>
      )}

      {formOpen && (
        <MissionFormModal open={formOpen} mission={editing} onClose={() => setFormOpen(false)} />
      )}

      {harvest && (
        <HarvestModal mission={harvest} open={Boolean(harvest)} onClose={() => setHarvest(null)} />
      )}

      {confirmDel && (
        <ConfirmDialog
          open={Boolean(confirmDel)}
          title="Excluir missão"
          message={`Tem certeza que deseja excluir "${confirmDel.title}"? Esta ação é permanente.`}
          confirmLabel="Excluir"
          destructive
          onCancel={() => setConfirmDel(null)}
          onConfirm={async () => {
            await deleteMission(confirmDel.id);
            setConfirmDel(null);
          }}
        />
      )}
    </Panel>
  );
}
