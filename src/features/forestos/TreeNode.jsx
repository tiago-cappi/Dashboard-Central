import { useEffect, useMemo, useState } from 'react';

const NODE_ICON = {
  sector: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M12 3l8 3v5c0 4.5-3.4 8.5-8 10-4.6-1.5-8-5.5-8-10V6l8-3z" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  ),
  project: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M6 21V6l6-3 6 3v15" />
      <path d="M9 21v-6h6v6M9 10h6" />
    </svg>
  ),
  goal: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M5 21V4h11l-2 3 2 3H5" />
    </svg>
  ),
  subgoal: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M12 3c3 4 3 8 0 12-3-4-3-8 0-12z" />
      <path d="M12 15v6" />
    </svg>
  ),
  mission: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M5 5l14 14M14 5h5v5" />
      <path d="M19 19l-3-3M5 19l6-6" />
    </svg>
  ),
  submission: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M4 12h12M10 6l6 6-6 6" />
    </svg>
  ),
  habit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="7" cy="6" r="2" fill="currentColor" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <circle cx="17" cy="18" r="2" fill="currentColor" />
    </svg>
  ),
  reminder: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
};

const NODE_LABEL = {
  sector: 'Setor',
  project: 'Projeto',
  goal: 'Objetivo',
  subgoal: 'Sub-objetivo',
  mission: 'Missão',
  submission: 'Sub-missão',
  habit: 'Hábito',
  reminder: 'Lembrete',
};

const VALID_CHILDREN = {
  sector:     ['project', 'goal', 'mission', 'habit', 'reminder'],
  project:    ['goal', 'mission'],
  goal:       ['subgoal', 'mission', 'submission', 'habit', 'reminder'],
  subgoal:    ['mission', 'submission', 'habit', 'reminder'],
  mission:    ['submission'],
  submission: [],
  habit:      [],
  reminder:   [],
};

function StatusDot({ status }) {
  const map = {
    active: 'moss',
    inbox: 'gold',
    focus: 'navy',
    paused: 'gold',
    done: 'moss',
    abandoned: 'wine',
  };
  const cls = map[status] || 'navy';
  return <span className={`dot ${cls}`} title={status} />;
}

function todayIsoLocal() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

const CAN_SHOW_COMPLETED = new Set(['project', 'goal', 'subgoal']);

function countDoneMissionsUnder(node) {
  if (!node) return 0;
  let n = 0;
  for (const child of node.children || []) {
    if (child.type === 'mission' && child.data?.status === 'done') n += 1;
    n += countDoneMissionsUnder(child);
  }
  return n;
}

export default function TreeNode({
  node,
  depth = 0,
  expanded,
  toggleExpand,
  selectedId,
  onSelect,
  onAddChild,
  onEdit,
  onDelete,
  onFocus,
  onHarvest,
  onHabitToggle,
  onHabitFocus,
  onReminderAck,
  onShowCompleted,
  focusMissionId,
  focusHabitId,
  searchMatch,
  orphan = false,
}) {
  const { type, id, title, data, children } = node;
  const visibleChildren = useMemo(
    () => (children || []).filter((c) => !(c.type === 'mission' && c.data?.status === 'done')),
    [children],
  );
  const hasChildren = visibleChildren.length > 0;
  const isExpanded = expanded.has(id);
  const isSelected = selectedId === id;
  const displayType = type === 'mission' && depth > 0 && isMissionParent(node) ? 'submission' : type;
  const doneCount = CAN_SHOW_COMPLETED.has(displayType) ? countDoneMissionsUnder(node) : 0;

  const isMissionNode = type === 'mission';
  const isHabitNode = type === 'habit';
  const isReminderNode = type === 'reminder';
  const isDone = data?.status === 'done';
  const isFocused = isMissionNode && focusMissionId === id;
  const isHabitFocused = isHabitNode && focusHabitId === id;
  const habitCompletedToday = isHabitNode && data?.last_completed_at === todayIsoLocal();
  const reminderAckedToday = isReminderNode && data?.last_acked_at === todayIsoLocal();

  const validChildren = VALID_CHILDREN[displayType] || [];
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  useEffect(() => {
    if (!addMenuOpen) return;
    const close = () => setAddMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [addMenuOpen]);

  const isMatch = useMemo(() => {
    if (!searchMatch) return false;
    return title?.toLowerCase().includes(searchMatch.toLowerCase());
  }, [searchMatch, title]);

  return (
    <div className={`tree-node-wrap level-${displayType}`}>
      <div
        className={`tree-node level-${displayType} ${isSelected ? 'is-selected' : ''} ${
          isMatch ? 'is-match' : ''
        } ${orphan ? 'is-orphan' : ''}`}
        onClick={() => onSelect?.(node)}
      >
        <button
          type="button"
          className="tree-caret"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) toggleExpand(id);
          }}
          aria-label={isExpanded ? 'recolher' : 'expandir'}
          disabled={!hasChildren}
        >
          {hasChildren ? (
            <svg viewBox="0 0 12 12" width="10" height="10">
              {isExpanded ? (
                <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
              ) : (
                <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
              )}
            </svg>
          ) : (
            <span className="tree-bullet" />
          )}
        </button>

        <span className="tree-color" style={{ background: data?.color || undefined }} />
        <span className="tree-icon">{NODE_ICON[displayType]}</span>
        <span className="tree-type">{NODE_LABEL[displayType]}</span>
        <span className="tree-title">{title}</span>

        <span className="tree-meta">
          {data?.status && <StatusDot status={data.status} />}
          {hasChildren && <span className="tree-count">{visibleChildren.length}</span>}
          {doneCount > 0 && (
            <button
              type="button"
              className="tree-done-badge"
              data-tip="Ver missões concluídas"
              onClick={(e) => {
                e.stopPropagation();
                onShowCompleted?.(node);
              }}
              aria-label="ver missões concluídas"
            >
              ✓ {doneCount}
            </button>
          )}
        </span>

        <div className="tree-actions" onClick={(e) => e.stopPropagation()}>
          {/* Missão: foco e colheita */}
          {isMissionNode && !isDone && (
            <>
              {isFocused ? (
                <button
                  type="button"
                  className="tree-act focus-active"
                  data-tip="Ver sessão de foco"
                  onClick={() => onFocus?.(node)}
                  aria-label="ver foco"
                >
                  <svg viewBox="0 0 16 16" width="12" height="12">
                    <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                    <circle cx="8" cy="8" r="2" fill="currentColor" />
                  </svg>
                </button>
              ) : (
                <button
                  type="button"
                  className="tree-act focus-btn"
                  data-tip="Iniciar foco"
                  onClick={() => onFocus?.(node)}
                  aria-label="iniciar foco"
                >
                  <svg viewBox="0 0 16 16" width="12" height="12">
                    <path d="M5 3l8 5-8 5V3z" fill="currentColor" stroke="none" />
                  </svg>
                </button>
              )}
              <button
                type="button"
                className="tree-act harvest-btn"
                data-tip="Colher & Concluir"
                onClick={() => onHarvest?.(node)}
                aria-label="colher missão"
              >
                <svg viewBox="0 0 16 16" width="12" height="12">
                  <path d="M2 9l4 4 8-8" fill="none" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </button>
            </>
          )}

          {/* Hábito: foco + check-in */}
          {isHabitNode && (
            <>
              {isHabitFocused ? (
                <button
                  type="button"
                  className="tree-act focus-active"
                  data-tip="Ver sessão de foco"
                  onClick={() => onHabitFocus?.(node)}
                  aria-label="ver foco"
                >
                  <svg viewBox="0 0 16 16" width="12" height="12">
                    <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                    <circle cx="8" cy="8" r="2" fill="currentColor" />
                  </svg>
                </button>
              ) : (
                !habitCompletedToday && (
                  <button
                    type="button"
                    className="tree-act focus-btn"
                    data-tip="Iniciar foco no hábito"
                    onClick={() => onHabitFocus?.(node)}
                    aria-label="iniciar foco hábito"
                  >
                    <svg viewBox="0 0 16 16" width="12" height="12">
                      <path d="M5 3l8 5-8 5V3z" fill="currentColor" stroke="none" />
                    </svg>
                  </button>
                )
              )}
              <button
                type="button"
                className="tree-act harvest-btn"
                data-tip={habitCompletedToday ? 'Desmarcar conclusão de hoje' : 'Marcar concluído hoje'}
                onClick={() => onHabitToggle?.(node)}
                aria-label="completar hábito"
                style={habitCompletedToday ? { opacity: 0.7 } : undefined}
              >
                {habitCompletedToday ? (
                  <svg viewBox="0 0 16 16" width="12" height="12">
                    <path d="M2 8h12" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" width="12" height="12">
                    <path d="M2 9l4 4 8-8" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                )}
              </button>
            </>
          )}

          {/* Lembrete: marcar/desmarcar para hoje */}
          {isReminderNode && (
            <button
              type="button"
              className="tree-act harvest-btn"
              data-tip={reminderAckedToday ? 'Desmarcar lembrete de hoje' : 'Marcar como feito hoje'}
              onClick={() => onReminderAck?.(node)}
              aria-label="marcar lembrete"
              style={reminderAckedToday ? { opacity: 0.7 } : undefined}
            >
              {reminderAckedToday ? (
                <svg viewBox="0 0 16 16" width="12" height="12">
                  <path d="M2 8h12" fill="none" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              ) : (
                <svg viewBox="0 0 16 16" width="12" height="12">
                  <path d="M2 9l4 4 8-8" fill="none" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              )}
            </button>
          )}

          {validChildren.length > 0 && (
            <div className="tree-add-menu-wrap">
              <button
                type="button"
                className="tree-act"
                data-tip="Adicionar filho"
                onClick={(e) => { e.stopPropagation(); setAddMenuOpen((v) => !v); }}
                aria-label="adicionar filho"
              >
                <svg viewBox="0 0 16 16" width="12" height="12">
                  <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.6" fill="none" />
                </svg>
              </button>
              {addMenuOpen && (
                <div className="tree-add-menu">
                  {validChildren.map((ct) => (
                    <button
                      key={ct}
                      type="button"
                      className="tree-add-menu-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddMenuOpen(false);
                        onAddChild?.(node, ct);
                      }}
                    >
                      <span className="tree-add-menu-icon">{NODE_ICON[ct]}</span>
                      {NODE_LABEL[ct]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            className="tree-act"
            data-tip="Editar"
            onClick={() => onEdit?.(node)}
            aria-label="editar"
          >
            <svg viewBox="0 0 16 16" width="12" height="12">
              <path d="M11 2l3 3-8 8H3v-3l8-8z" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>
          <button
            type="button"
            className="tree-act danger"
            data-tip="Excluir"
            onClick={() => onDelete?.(node)}
            aria-label="excluir"
          >
            <svg viewBox="0 0 16 16" width="12" height="12">
              <path d="M3 5h10M6 5V3h4v2M5 5l1 9h4l1-9" fill="none" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="tree-children">
          {visibleChildren.map((child) => (
            <TreeNode
              key={`${child.type}-${child.id}`}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              toggleExpand={toggleExpand}
              selectedId={selectedId}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              onFocus={onFocus}
              onHarvest={onHarvest}
              onHabitToggle={onHabitToggle}
              onHabitFocus={onHabitFocus}
              onReminderAck={onReminderAck}
              onShowCompleted={onShowCompleted}
              focusMissionId={focusMissionId}
              focusHabitId={focusHabitId}
              searchMatch={searchMatch}
              orphan={orphan}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function isMissionParent(node) {
  return Boolean(node?.data?.parent_mission_id);
}
