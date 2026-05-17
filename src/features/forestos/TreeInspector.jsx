const TYPE_TITLE = {
  sector: 'Setor',
  project: 'Projeto',
  goal: 'Objetivo',
  subgoal: 'Sub-objetivo',
  mission: 'Missão',
  submission: 'Sub-missão',
  habit: 'Hábito',
};

const FREQ_LABEL = {
  daily: 'diário',
  weekly: 'semanal',
  custom: 'dias da semana',
};

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function todayIsoLocal() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

function Stars({ value, color = '#7a2230' }) {
  return (
    <span style={{ color, letterSpacing: '2px' }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ opacity: n <= value ? 1 : 0.25 }}>
          ★
        </span>
      ))}
    </span>
  );
}

function Row({ label, children }) {
  if (children == null || children === '') return null;
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 py-1 border-b border-[#a88a3d]/25 last:border-0">
      <div className="font-eb text-[11px] text-[#5b4423]">{label}</div>
      <div className="font-lora text-[13px] text-[#1f1408]">{children}</div>
    </div>
  );
}

export default function TreeInspector({ node, indexes, onEdit, onDelete, onFocus, onHarvest, onHabitToggle, onHabitFocus, focusMissionId, focusHabitId }) {
  if (!node) {
    return (
      <section className="panel">
        <header className="panel-header navy">
          <div className="title">Inspetor</div>
        </header>
        <div className="p-4 font-lora text-[13px] italic text-[#5b4423]">
          Selecione um elemento na árvore à esquerda para inspecionar seus detalhes.
        </div>
      </section>
    );
  }

  const { type, data } = node;
  const isMissionNode = type === 'mission';
  const isHabitNode = type === 'habit';
  const isDone = data?.status === 'done';
  const isFocused = isMissionNode && focusMissionId === node.id;
  const isHabitFocused = isHabitNode && focusHabitId === node.id;
  const habitCompletedToday = isHabitNode && data?.last_completed_at === todayIsoLocal();
  const displayType = type === 'mission' && data?.parent_mission_id ? 'submission' : type;

  const sectorName = data?.sector_id ? indexes?.sectorById?.get(data.sector_id)?.name : null;
  const projectName = data?.project_id ? indexes?.projectById?.get(data.project_id)?.title : null;
  const parentGoalName = data?.parent_goal_id
    ? indexes?.goalById?.get(data.parent_goal_id)?.title
    : null;
  const goalName = data?.goal_id ? indexes?.goalById?.get(data.goal_id)?.title : null;
  const parentMissionName = data?.parent_mission_id
    ? indexes?.missionById?.get(data.parent_mission_id)?.title
    : null;

  return (
    <section className="panel">
      <header className={`panel-header ${headerTone(displayType)}`} style={headerStyle(displayType)}>
        <div className="flex-1 min-w-0">
          <div className="title">Inspetor · {TYPE_TITLE[displayType]}</div>
          <div className="sub truncate">{node.title}</div>
        </div>
      </header>
      <div className="p-4">
        <div className="font-cormorant text-[20px] text-[#1f1408] leading-tight mb-2">
          {node.title}
        </div>

        {data?.description && (
          <div className="font-lora italic text-[13px] text-[#3a2a18] mb-3 border-l-2 border-[#a88a3d] pl-2">
            {data.description}
          </div>
        )}

        <div className="mt-2">
          {sectorName && <Row label="Setor">{sectorName}</Row>}
          {projectName && <Row label="Projeto">{projectName}</Row>}
          {parentGoalName && <Row label="Obj. pai">{parentGoalName}</Row>}
          {goalName && <Row label="Objetivo">{goalName}</Row>}
          {parentMissionName && <Row label="Missão pai">{parentMissionName}</Row>}
          {data?.horizon && <Row label="Horizonte">{data.horizon}</Row>}
          {data?.status && <Row label="Status">{data.status}</Row>}
          {data?.importance != null && (
            <Row label="Importância">
              <Stars value={data.importance} color="#7a2230" />
            </Row>
          )}
          {data?.difficulty != null && (
            <Row label="Dificuldade">
              <Stars value={data.difficulty} color="#1f3a5f" />
            </Row>
          )}
          {data?.target_date && <Row label="Prazo">{data.target_date}</Row>}
          {data?.due_date && <Row label="Prazo">{data.due_date}</Row>}
          {data?.completed_at && <Row label="Concluído em">{data.completed_at}</Row>}
          {data?.focus_minutes != null && (
            <Row label="Foco (min)">
              <span className="font-num">{data.focus_minutes}</span>
            </Row>
          )}
          {data?.xp_gained != null && Number(data.xp_gained) > 0 && (
            <Row label="XP acumulado">
              <span className="font-num">{Number(data.xp_gained).toFixed(0)}</span>
            </Row>
          )}
          {/* === Campos específicos de hábito === */}
          {isHabitNode && (
            <>
              <Row label="Frequência">
                {FREQ_LABEL[data?.frequency] || data?.frequency}
                {data?.frequency === 'custom' && Array.isArray(data?.custom_days) && data.custom_days.length > 0 && (
                  <span className="text-[#7a6442] font-eb text-[11px] ml-1">
                    ({data.custom_days.map((d) => DAY_NAMES[Number(d)]).join(', ')})
                  </span>
                )}
              </Row>
              <Row label="🔥 Streak atual">
                <span className="font-num">{data?.current_streak ?? 0}</span>
              </Row>
              <Row label="🏆 Melhor streak">
                <span className="font-num">{data?.best_streak ?? 0}</span>
              </Row>
              {data?.last_completed_at && (
                <Row label="Último check-in">{data.last_completed_at}</Row>
              )}
              <Row label="Status hoje">
                <span style={{ color: habitCompletedToday ? '#4a6b3a' : '#a88a3d' }}>
                  {habitCompletedToday ? '✓ concluído hoje' : '○ pendente'}
                </span>
              </Row>
            </>
          )}
          <Row label="ID">
            <span className="font-num text-[11px] text-[#7a6442]">{node.id}</span>
          </Row>
        </div>

        {isHabitNode && (
          <div className="flex gap-2 mt-4 pt-3 border-t border-[#a88a3d]/30">
            {isHabitFocused ? (
              <button
                type="button"
                className="seal sm"
                style={{
                  background: 'linear-gradient(180deg, #4a6b3a 0%, #3a5430 100%)',
                  color: '#f5e8b8',
                  borderColor: '#2a3f22',
                }}
                onClick={() => onHabitFocus?.(node)}
              >
                <svg viewBox="0 0 16 16" width="11" height="11" style={{ marginRight: 4 }}>
                  <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="8" cy="8" r="2" fill="currentColor" />
                </svg>
                Em foco · ver sessão
              </button>
            ) : (
              !habitCompletedToday && (
                <button
                  type="button"
                  className="seal sm"
                  style={{
                    background: 'linear-gradient(180deg, #4a6b3a 0%, #3a5430 100%)',
                    color: '#f5e8b8',
                    borderColor: '#2a3f22',
                  }}
                  onClick={() => onHabitFocus?.(node)}
                >
                  <svg viewBox="0 0 16 16" width="11" height="11" style={{ marginRight: 4 }}>
                    <path d="M5 3l8 5-8 5V3z" fill="currentColor" />
                  </svg>
                  Iniciar foco
                </button>
              )
            )}
            <button
              type="button"
              className="seal sm"
              style={{
                background: habitCompletedToday
                  ? 'linear-gradient(180deg, #7a6442 0%, #5b4423 100%)'
                  : 'linear-gradient(180deg, #c9a14a 0%, #8a6e2d 100%)',
                color: habitCompletedToday ? '#f5e8b8' : '#1f1408',
                borderColor: '#5b4423',
              }}
              onClick={() => onHabitToggle?.(node)}
            >
              <svg viewBox="0 0 16 16" width="11" height="11" style={{ marginRight: 4 }}>
                {habitCompletedToday ? (
                  <path d="M2 8h12" fill="none" stroke="currentColor" strokeWidth="1.8" />
                ) : (
                  <path d="M2 9l4 4 8-8" fill="none" stroke="currentColor" strokeWidth="1.8" />
                )}
              </svg>
              {habitCompletedToday ? 'Desmarcar hoje' : 'Marcar concluído hoje'}
            </button>
          </div>
        )}

        {isMissionNode && !isDone && (
          <div className="flex gap-2 mt-4 pt-3 border-t border-[#a88a3d]/30">
            {isFocused ? (
              <button
                type="button"
                className="seal sm"
                style={{
                  background: 'linear-gradient(180deg, #4a6b3a 0%, #3a5430 100%)',
                  color: '#f5e8b8',
                  borderColor: '#2a3f22',
                }}
                onClick={() => onFocus?.(node)}
              >
                <svg viewBox="0 0 16 16" width="11" height="11" style={{ marginRight: 4 }}>
                  <circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                  <circle cx="8" cy="8" r="2" fill="currentColor" />
                </svg>
                Em foco · ver sessão
              </button>
            ) : (
              <button
                type="button"
                className="seal sm"
                style={{
                  background: 'linear-gradient(180deg, #4a6b3a 0%, #3a5430 100%)',
                  color: '#f5e8b8',
                  borderColor: '#2a3f22',
                }}
                onClick={() => onFocus?.(node)}
              >
                <svg viewBox="0 0 16 16" width="11" height="11" style={{ marginRight: 4 }}>
                  <path d="M5 3l8 5-8 5V3z" fill="currentColor" />
                </svg>
                Iniciar foco
              </button>
            )}
            <button
              type="button"
              className="seal sm"
              style={{
                background: 'linear-gradient(180deg, #c9a14a 0%, #8a6e2d 100%)',
                color: '#1f1408',
                borderColor: '#5b4423',
              }}
              onClick={() => onHarvest?.(node)}
            >
              <svg viewBox="0 0 16 16" width="11" height="11" style={{ marginRight: 4 }}>
                <path d="M2 9l4 4 8-8" fill="none" stroke="currentColor" strokeWidth="1.8" />
              </svg>
              Colher & Concluir
            </button>
          </div>
        )}

        <div className="flex gap-2 mt-3">
          <button type="button" className="seal sm" onClick={() => onEdit?.(node)}>
            Editar
          </button>
          <button type="button" className="seal sm dark" onClick={() => onDelete?.(node)}>
            Excluir
          </button>
        </div>
      </div>
    </section>
  );
}

function headerTone(type) {
  switch (type) {
    case 'sector':
      return ''; // wine (default)
    case 'project':
      return 'wood';
    case 'goal':
      return 'navy';
    default:
      return '';
  }
}

function headerStyle(type) {
  switch (type) {
    case 'subgoal':
      return { background: 'linear-gradient(180deg, #4a6b3a 0%, #3a5430 100%)' };
    case 'mission':
      return { background: 'linear-gradient(180deg, #a88a3d 0%, #5b4423 100%)' };
    case 'submission':
      return { background: 'linear-gradient(180deg, #a8553a 0%, #7a3b25 100%)' };
    case 'habit':
      return { background: 'linear-gradient(180deg, #2a5a6b 0%, #1a3a4a 100%)' };
    default:
      return undefined;
  }
}
