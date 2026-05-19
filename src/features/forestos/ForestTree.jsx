import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForestTree } from './hooks/useForestTree.js';
import { useTreeMutations } from './hooks/useTreeMutations.js';
import { useHabitMutations } from './hooks/useHabitMutations.js';
import { useReminderMutations } from './hooks/useReminderMutations.js';
import { useFocus } from './FocusContext.jsx';
import TreeNode from './TreeNode.jsx';
import TreeToolbar from './TreeToolbar.jsx';
import TreeInspector from './TreeInspector.jsx';
import SectorFormModal from './SectorFormModal.jsx';
import ProjectFormModal from './ProjectFormModal.jsx';
import GoalFormModal from './GoalFormModal.jsx';
import MissionFormModal from './MissionFormModal.jsx';
import HabitFormModal from './HabitFormModal.jsx';
import ReminderFormModal from './ReminderFormModal.jsx';
import HarvestModal from './HarvestModal.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import CompletedMissionsModal from './CompletedMissionsModal.jsx';
import Divider from '../../components/ornaments/Divider.jsx';

const STORAGE_KEY = 'forestos.tree.expanded';

function loadExpanded() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function saveExpanded(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    /* ignore */
  }
}

// === Modal kind helpers ===
const MODAL_KIND = {
  SECTOR: 'sector',
  PROJECT: 'project',
  GOAL: 'goal',
  SUBGOAL: 'subgoal',
  MISSION: 'mission',
  SUBMISSION: 'submission',
  HABIT: 'habit',
  REMINDER: 'reminder',
};

export default function ForestTree() {
  const { trees, orphans, indexes, sectors, loading, error, refetch } = useForestTree();
  const mutations = useTreeMutations();
  const habitMutations = useHabitMutations();
  const reminderMutations = useReminderMutations();
  const { openFocusModal, openFocusModalForHabit, openFocusModalForMultiSession, isActive, profile } = useFocus();
  const focusMissionId = profile?.current_focus_mission_id ?? null;
  const focusHabitId = profile?.current_focus_habit_id ?? null;

  const [expanded, setExpanded] = useState(loadExpanded);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [selected, setSelected] = useState(null);

  // Modal state
  const [modal, setModal] = useState({ kind: null, payload: null, defaults: null });
  const [confirm, setConfirm] = useState(null); // { node, type, title, message }
  const [harvest, setHarvest] = useState(null); // mission data object para HarvestModal
  const [completedView, setCompletedView] = useState(null); // { contextTitle, contextType, missions }

  // Quando trees mudam (após mutate), o selected pode estar stale — atualiza o data.
  useEffect(() => {
    if (!selected) return;
    const fresh = findNode(trees, selected.id) || findNode(allOrphans(orphans), selected.id);
    if (fresh) setSelected(fresh);
    else setSelected(null);
  }, [trees, orphans, selected]);

  useEffect(() => saveExpanded(expanded), [expanded]);

  // expansão automática para nós que casam com a busca
  useEffect(() => {
    if (!search.trim()) return;
    const matches = new Set();
    collectMatchingAncestors(trees, search, matches);
    collectMatchingAncestors(allOrphans(orphans), search, matches);
    if (matches.size > 0) {
      setExpanded((prev) => {
        const next = new Set(prev);
        matches.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [search, trees, orphans]);

  const toggleExpand = useCallback((id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const all = new Set();
    walkTrees([...trees, ...allOrphans(orphans)], (n) => all.add(n.id));
    setExpanded(all);
  }, [trees, orphans]);

  const collapseAll = useCallback(() => setExpanded(new Set()), []);

  // === handlers de CRUD ===
  const onSelect = useCallback((node) => setSelected(node), []);

  const onAddChild = useCallback((node, childType) => {
    const { type, data } = node;
    switch (childType) {
      case 'project':
        setModal({
          kind: MODAL_KIND.PROJECT,
          defaults: { sector_id: data.id },
          payload: null,
        });
        break;
      case 'goal':
        setModal({
          kind: MODAL_KIND.GOAL,
          defaults: {
            sector_id: type === 'sector' ? data.id : data.sector_id,
            project_id: type === 'project' ? data.id : undefined,
          },
          payload: null,
        });
        break;
      case 'subgoal':
        setModal({
          kind: MODAL_KIND.SUBGOAL,
          defaults: { sector_id: data.sector_id, parent_goal_id: data.id },
          payload: null,
        });
        break;
      case 'mission':
        setModal({
          kind: MODAL_KIND.MISSION,
          defaults: {
            sector_id: type === 'sector' ? data.id : data.sector_id,
            goal_id: type === 'goal' || type === 'subgoal' ? data.id : undefined,
          },
          payload: null,
        });
        break;
      case 'submission':
        setModal({
          kind: MODAL_KIND.SUBMISSION,
          defaults: {
            sector_id: data.sector_id,
            goal_id: type === 'goal' || type === 'subgoal' ? data.id : data.goal_id,
            parent_mission_id: type === 'mission' ? data.id : null,
          },
          payload: null,
        });
        break;
      case 'habit':
        setModal({
          kind: MODAL_KIND.HABIT,
          defaults: {
            sector_id: type === 'sector' ? data.id : data.sector_id,
            goal_id: type === 'goal' || type === 'subgoal' ? data.id : data.goal_id,
          },
          payload: null,
        });
        break;
      case 'reminder':
        setModal({
          kind: MODAL_KIND.REMINDER,
          defaults: {
            sector_id: type === 'sector' ? data.id : data.sector_id,
            goal_id: type === 'goal' || type === 'subgoal' ? data.id : data.goal_id,
          },
          payload: null,
        });
        break;
      default:
        break;
    }
  }, []);

  const onFocus = useCallback(
    (node) => {
      if (node.type !== 'mission') return;
      openFocusModal(node.data);
    },
    [openFocusModal],
  );

  const onHarvest = useCallback((node) => {
    if (node.type !== 'mission') return;
    setHarvest(node.data);
  }, []);

  const onShowCompleted = useCallback((node) => {
    const LABEL = { project: 'Projeto', goal: 'Objetivo', subgoal: 'Sub-objetivo' };
    const doneMissions = [];
    (function walk(n) {
      for (const child of n.children || []) {
        if (child.type === 'mission' && child.data?.status === 'done') {
          doneMissions.push(child.data);
        }
        walk(child);
      }
    })(node);
    setCompletedView({
      contextTitle: node.title,
      contextType: LABEL[node.type] || node.type,
      missions: doneMissions,
    });
  }, []);

  const onHabitToggle = useCallback(
    async (node) => {
      if (node.type !== 'habit') return;
      const todayIso = (() => {
        const t = new Date();
        return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
      })();
      try {
        if (node.data?.last_completed_at === todayIso) {
          await habitMutations.uncompleteHabit(node.id);
        } else {
          await habitMutations.completeHabit(node.id);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[ForestTree] habit toggle failed', err);
      }
    },
    [habitMutations],
  );

  const onHabitFocus = useCallback(
    (node) => {
      if (node.type !== 'habit') return;
      openFocusModalForHabit(node.data);
    },
    [openFocusModalForHabit],
  );

  const onReminderAck = useCallback(
    async (node) => {
      if (node.type !== 'reminder') return;
      const todayIso = (() => {
        const t = new Date();
        return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
      })();
      try {
        if (node.data?.last_acked_at === todayIso) {
          await reminderMutations.unacknowledgeReminder(node.id);
        } else {
          await reminderMutations.acknowledgeReminder(node.id);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[ForestTree] reminder ack failed', err);
      }
    },
    [reminderMutations],
  );

  const onEdit = useCallback((node) => {
    const { type, data } = node;
    let kind = type;
    if (type === 'mission' && data?.parent_mission_id) kind = MODAL_KIND.SUBMISSION;
    if (type === 'subgoal') kind = MODAL_KIND.SUBGOAL;
    if (type === 'habit') kind = MODAL_KIND.HABIT;
    if (type === 'reminder') kind = MODAL_KIND.REMINDER;
    setModal({ kind, defaults: null, payload: data });
  }, []);

  const onDelete = useCallback((node) => {
    const { type } = node;
    const messages = {
      sector:
        'Excluir este setor? Projetos, objetivos e missões deste setor perderão a referência e serão movidos para o Bosque Livre.',
      project:
        'Excluir este projeto? Os objetivos perderão a referência ao projeto, mas continuarão associados ao setor.',
      goal:
        'Excluir este objetivo? Sub-objetivos perderão a referência ao pai e missões perderão a referência ao objetivo.',
      subgoal: 'Excluir este sub-objetivo? Missões associadas perderão a referência ao objetivo.',
      mission:
        'Excluir esta missão? Sub-missões filhas perderão a referência e ficarão soltas.',
      submission: 'Excluir esta sub-missão?',
      habit: 'Excluir este hábito? O histórico de eventos será preservado.',
      reminder: 'Excluir este lembrete?',
    };
    const displayType =
      type === 'mission' && node.data?.parent_mission_id ? 'submission' : type;
    setConfirm({
      node,
      type: displayType,
      title: `Excluir ${displayType}`,
      message: messages[displayType] || 'Confirmar exclusão?',
    });
  }, []);

  const performDelete = useCallback(async () => {
    if (!confirm) return;
    const { node } = confirm;
    try {
      switch (node.type) {
        case 'sector':
          await mutations.deleteSector(node.id);
          break;
        case 'project':
          await mutations.deleteProject(node.id);
          break;
        case 'goal':
        case 'subgoal':
          await mutations.deleteGoal(node.id);
          break;
        case 'mission':
          await mutations.deleteMission(node.id);
          break;
        case 'habit':
          await habitMutations.deleteHabit(node.id);
          break;
        case 'reminder':
          await reminderMutations.deleteReminder(node.id);
          break;
        default:
          break;
      }
      if (selected?.id === node.id) setSelected(null);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[ForestTree] delete failed', err);
      alert(`Falha ao excluir: ${err.message || err}`);
    } finally {
      setConfirm(null);
    }
  }, [confirm, mutations, habitMutations, reminderMutations, selected]);

  const closeModal = useCallback(() => setModal({ kind: null, payload: null, defaults: null }), []);

  // === filtro por setor ===
  const visibleTrees = useMemo(() => {
    if (!sectorFilter) return trees;
    return trees.filter((t) => t.id === sectorFilter);
  }, [trees, sectorFilter]);

  // contagem total
  const totalCount = useMemo(() => {
    let n = 0;
    walkTrees([...trees, ...allOrphans(orphans)], () => n++);
    return n;
  }, [trees, orphans]);

  return (
    <div className="fadein">
      <TreeToolbar
        search={search}
        setSearch={setSearch}
        sectorFilter={sectorFilter}
        setSectorFilter={setSectorFilter}
        sectors={sectors}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        onNewSector={() => setModal({ kind: MODAL_KIND.SECTOR, payload: null, defaults: null })}
        onOpenMultiFocus={openFocusModalForMultiSession}
        multiFocusDisabled={isActive}
        count={totalCount}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-3 items-start">
        <div className="xl:col-span-2 min-w-0">
          <section className="panel">
            <header className="panel-header">
              <div className="flex-1 min-w-0">
                <div className="title">Floresta · árvores por setor</div>
                <div className="sub">hierarquia operacional do gabinete</div>
              </div>
            </header>

            <div className="p-3">
              {loading && (
                <div className="font-eb text-[12px] text-[#7a6442] py-4 text-center">
                  carregando floresta…
                </div>
              )}
              {error && (
                <div className="font-eb text-[12px] text-[#7a2230] py-2">
                  erro ao carregar: {error.message}
                  <button className="seal sm ghost ml-2" onClick={refetch}>
                    tentar de novo
                  </button>
                </div>
              )}
              {!loading && !error && visibleTrees.length === 0 && (
                <div className="font-lora italic text-[13px] text-[#5b4423] py-4 text-center">
                  Nenhum setor encontrado. Crie o primeiro setor para começar a plantar sua floresta.
                </div>
              )}
              {!loading && !error && (
                <div className="tree-root">
                  {visibleTrees.map((node) => (
                    <TreeNode
                      key={`${node.type}-${node.id}`}
                      node={node}
                      expanded={expanded}
                      toggleExpand={toggleExpand}
                      selectedId={selected?.id}
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
                      searchMatch={search.trim()}
                    />
                  ))}
                </div>
              )}

              {/* === BOSQUE LIVRE === */}
              {!loading && !error && (
                <>
                  <div className="mt-5 mb-2">
                    <Divider />
                    <div className="font-cinzel uppercase text-[11px] tracking-[.18em] text-[#5b4423] text-center mt-2">
                      Bosque Livre — elementos sem pertencimento
                    </div>
                    <div className="font-eb text-[11px] text-[#7a6442] text-center">
                      itens órfãos cujo pai foi removido ou nunca atribuído
                    </div>
                  </div>

                  <div className="tree-root orphan-section">
                    <OrphanGroup
                      label="Projetos sem setor"
                      nodes={orphans.projects}
                      expanded={expanded}
                      toggleExpand={toggleExpand}
                      selectedId={selected?.id}
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
                      searchMatch={search.trim()}
                    />
                    <OrphanGroup
                      label="Objetivos soltos"
                      nodes={orphans.goals}
                      expanded={expanded}
                      toggleExpand={toggleExpand}
                      selectedId={selected?.id}
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
                      searchMatch={search.trim()}
                    />
                    <OrphanGroup
                      label="Missões soltas"
                      nodes={orphans.missions}
                      collapsible
                      onAdd={() => setModal({ kind: MODAL_KIND.MISSION, payload: null, defaults: {} })}
                      expanded={expanded}
                      toggleExpand={toggleExpand}
                      selectedId={selected?.id}
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
                      searchMatch={search.trim()}
                    />
                    <OrphanGroup
                      label="Hábitos soltos"
                      nodes={orphans.habits}
                      collapsible
                      onAdd={() => setModal({ kind: MODAL_KIND.HABIT, payload: null, defaults: {} })}
                      expanded={expanded}
                      toggleExpand={toggleExpand}
                      selectedId={selected?.id}
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
                      searchMatch={search.trim()}
                    />
                    <OrphanGroup
                      label="Lembretes soltos"
                      nodes={orphans.reminders}
                      collapsible
                      onAdd={() => setModal({ kind: MODAL_KIND.REMINDER, payload: null, defaults: {} })}
                      expanded={expanded}
                      toggleExpand={toggleExpand}
                      selectedId={selected?.id}
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
                      searchMatch={search.trim()}
                    />
                  </div>
                </>
              )}
            </div>
          </section>
        </div>

        <div className="xl:col-span-1 min-w-0">
          <TreeInspector
            node={selected}
            indexes={indexes}
            onEdit={onEdit}
            onDelete={onDelete}
            onFocus={onFocus}
            onHarvest={onHarvest}
            onHabitToggle={onHabitToggle}
            onHabitFocus={onHabitFocus}
            focusMissionId={focusMissionId}
            focusHabitId={focusHabitId}
          />
        </div>
      </div>

      {/* ===== Modais CRUD ===== */}
      <SectorFormModal
        open={modal.kind === MODAL_KIND.SECTOR}
        sector={modal.payload}
        onClose={closeModal}
      />
      <ProjectFormModal
        open={modal.kind === MODAL_KIND.PROJECT}
        project={modal.payload}
        defaultValues={modal.defaults}
        onClose={closeModal}
      />
      <GoalFormModal
        open={modal.kind === MODAL_KIND.GOAL || modal.kind === MODAL_KIND.SUBGOAL}
        goal={modal.payload}
        defaultValues={modal.defaults}
        isSubgoal={modal.kind === MODAL_KIND.SUBGOAL}
        onClose={closeModal}
      />
      <MissionFormModal
        open={modal.kind === MODAL_KIND.MISSION || modal.kind === MODAL_KIND.SUBMISSION}
        mission={modal.payload}
        defaultValues={modal.defaults}
        onClose={closeModal}
      />
      <HabitFormModal
        open={modal.kind === MODAL_KIND.HABIT}
        habit={modal.payload}
        defaultValues={modal.defaults}
        onClose={closeModal}
      />
      <ReminderFormModal
        open={modal.kind === MODAL_KIND.REMINDER}
        reminder={modal.payload}
        defaultValues={modal.defaults}
        onClose={closeModal}
      />

      <HarvestModal
        mission={harvest}
        open={Boolean(harvest)}
        onClose={() => setHarvest(null)}
      />

      <CompletedMissionsModal
        open={Boolean(completedView)}
        contextTitle={completedView?.contextTitle || ''}
        contextType={completedView?.contextType || ''}
        missions={completedView?.missions || []}
        onClose={() => setCompletedView(null)}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title || 'Confirmar exclusão'}
        message={confirm?.message}
        confirmLabel="Excluir"
        destructive
        onConfirm={performDelete}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function OrphanGroup({ label, nodes, collapsible = false, onAdd, ...rest }) {
  const [open, setOpen] = useState(!collapsible);

  if (!collapsible && (!nodes || nodes.length === 0)) return null;

  return (
    <div className="orphan-group">
      <div
        className="orphan-label"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: collapsible ? 'pointer' : 'default',
          userSelect: 'none',
        }}
        onClick={collapsible ? () => setOpen((v) => !v) : undefined}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {collapsible && (
            <svg
              viewBox="0 0 12 12"
              width="9"
              height="9"
              style={{ transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}
            >
              <path d="M4 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          )}
          {label}
          {nodes && nodes.length > 0 && (
            <span
              style={{
                fontSize: 10,
                fontFamily: 'var(--font-eb)',
                background: 'rgba(168,138,61,0.18)',
                color: '#5b4423',
                borderRadius: 2,
                padding: '0 5px',
                lineHeight: '16px',
              }}
            >
              {nodes.length}
            </span>
          )}
        </span>
        {onAdd && (
          <button
            type="button"
            className="seal sm ghost"
            style={{ fontSize: 10, padding: '1px 7px', lineHeight: '16px' }}
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            aria-label={`Adicionar em ${label}`}
          >
            + Novo
          </button>
        )}
      </div>
      {open && nodes && nodes.map((node) => (
        <TreeNode key={`${node.type}-${node.id}`} node={node} orphan {...rest} />
      ))}
    </div>
  );
}

function walkTrees(nodes, visit) {
  for (const n of nodes) {
    visit(n);
    if (n.children) walkTrees(n.children, visit);
  }
}

function findNode(nodes, id) {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const r = findNode(n.children, id);
      if (r) return r;
    }
  }
  return null;
}

function collectMatchingAncestors(nodes, query, out, ancestors = []) {
  const q = query.toLowerCase();
  for (const n of nodes) {
    const matches = n.title?.toLowerCase().includes(q);
    if (matches) ancestors.forEach((id) => out.add(id));
    if (n.children) collectMatchingAncestors(n.children, query, out, [...ancestors, n.id]);
  }
}

function allOrphans(o) {
  if (!o) return [];
  return [
    ...(o.projects || []),
    ...(o.goals || []),
    ...(o.missions || []),
    ...(o.habits || []),
    ...(o.reminders || []),
  ];
}

function hasOrphans(o) {
  return allOrphans(o).length > 0;
}
