import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFocus } from './FocusContext.jsx';
import { useSectors } from './hooks/useSectors.js';
import { pesoOf, pesoTier } from './lib/productivity.js';

const POMO_PRESETS = [15, 25, 45, 60];

function fmt(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function calcXp(sec, entity) {
  const min = sec / 60;
  const imp = Math.max(1, Number(entity?.importance ?? 1));
  const dif = Math.max(1, Number(entity?.difficulty ?? 1));
  return Math.round((min * imp * dif) / 10);
}

function genLocalId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `mm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export default function FocusModal() {
  const {
    pendingMission,
    pendingHabit,
    pendingMultiSession,
    focusMission,
    focusHabit,
    multiFocusSession,
    focusEntityType,
    isActive,
    elapsedSec: dbElapsedSec,
    startFocus,
    startMultiFocus,
    updateMultiSessionMiniMissions,
    pauseFocus,
    cancelFocus,
    busy,
  } = useFocus();
  const { byId: sectorsById } = useSectors();

  // ── Determina contexto: mission/habit (mono) vs multi ──
  const isMultiPending = pendingMultiSession && !isActive;
  const isMultiActive = isActive && focusEntityType === 'multi';
  const isMultiFlow = isMultiPending || isMultiActive;

  const pendingEntity = pendingMission ?? pendingHabit ?? null;
  const pendingType = pendingMission ? 'mission' : pendingHabit ? 'habit' : null;
  const activeEntity = isActive
    ? (focusEntityType === 'habit' ? focusHabit : focusEntityType === 'mission' ? focusMission : null)
    : null;
  const activeType = isActive ? focusEntityType : null;

  const monoEntity = activeEntity ?? pendingEntity;
  const entityType = activeType ?? pendingType ?? 'mission';
  const isHabit = entityType === 'habit';
  const open = isMultiFlow ? true : Boolean(monoEntity);

  // phase: 'select' | 'running' | 'paused' | 'done'
  const [phase, setPhase] = useState('select');
  const [mode, setMode] = useState('stopwatch');
  const [pomoDur, setPomoDur] = useState(25);
  const [customPomo, setCustomPomo] = useState('');
  const [displaySec, setDisplaySec] = useState(0);

  // Estado da sessão multi enquanto está sendo configurada (fase select)
  const [draftMiniMissions, setDraftMiniMissions] = useState([]);
  const [draftMiniInput, setDraftMiniInput] = useState('');
  const [draftImportance, setDraftImportance] = useState(0);
  const [draftDifficulty, setDraftDifficulty] = useState(0);

  // Editor de tempo manual + confirmação de cancelamento
  const [editTimeMode, setEditTimeMode] = useState(false);
  const [editTimeMinutes, setEditTimeMinutes] = useState(0);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Espelha mini_missions da sessão ativa em estado local
  const activeMiniMissions = useMemo(
    () => (isMultiActive && multiFocusSession?.mini_missions ? multiFocusSession.mini_missions : []),
    [isMultiActive, multiFocusSession?.mini_missions],
  );

  const accRef = useRef(0);       // accumulated seconds from completed runs
  const startRef = useRef(null);  // wall-clock when last started
  const timerRef = useRef(null);

  // Sincroniza UI quando modal abre com sessão já ativa (refresh de página)
  useEffect(() => {
    if (isActive && phase === 'select') {
      // Mono ou multi: retoma o cronômetro
      accRef.current = dbElapsedSec;
      startRef.current = Date.now() - dbElapsedSec * 1000;
      setDisplaySec(dbElapsedSec);
      if (isMultiActive && multiFocusSession?.mode === 'pomodoro') {
        setMode('pomodoro');
        setPomoDur(multiFocusSession.pomo_duration_min || 25);
      } else {
        setMode('stopwatch');
      }
      setPhase('running');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, isMultiActive, multiFocusSession?.id]);

  // Local tick
  useEffect(() => {
    if (phase === 'running') {
      timerRef.current = setInterval(() => {
        const sec = accRef.current + Math.floor((Date.now() - startRef.current) / 1000);
        setDisplaySec(sec);
        if (mode === 'pomodoro' && sec >= pomoDur * 60) {
          accRef.current = pomoDur * 60;
          setDisplaySec(pomoDur * 60);
          clearInterval(timerRef.current);
          setPhase('done');
        }
      }, 500);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [phase, mode, pomoDur]);

  // Reset de estado local quando modal fecha
  useEffect(() => {
    if (!open) {
      clearInterval(timerRef.current);
      setPhase('select');
      setDisplaySec(0);
      setMode('stopwatch');
      setPomoDur(25);
      setCustomPomo('');
      setDraftMiniMissions([]);
      setDraftMiniInput('');
      setDraftImportance(0);
      setDraftDifficulty(0);
      setEditTimeMode(false);
      setShowCancelConfirm(false);
      accRef.current = 0;
      startRef.current = null;
    }
  }, [open]);

  // ── Handlers comuns ──
  async function handleStart() {
    if (isMultiFlow) {
      const ok = await startMultiFocus({
        mode,
        pomoDuration: pomoDur,
        importance: draftImportance,
        difficulty: draftDifficulty,
        miniMissions: draftMiniMissions,
      });
      if (ok) {
        accRef.current = 0;
        startRef.current = Date.now();
        setDisplaySec(0);
        setPhase('running');
      }
      return;
    }
    const target = pendingEntity ?? activeEntity;
    if (!target) return;
    const ok = await startFocus(target, entityType);
    if (ok) {
      accRef.current = 0;
      startRef.current = Date.now();
      setDisplaySec(0);
      setPhase('running');
    }
  }

  function handlePause() {
    if (phase === 'running') {
      accRef.current += Math.floor((Date.now() - startRef.current) / 1000);
      setDisplaySec(accRef.current);
      setPhase('paused');
    } else if (phase === 'paused') {
      startRef.current = Date.now();
      setPhase('running');
    }
  }

  async function handleConcluir() {
    const sec = phase === 'running'
      ? accRef.current + Math.floor((Date.now() - startRef.current) / 1000)
      : accRef.current;
    const mins = Math.max(1, Math.floor(sec / 60));
    await pauseFocus(false, mins);
  }

  function handleCancel() {
    clearInterval(timerRef.current);
    cancelFocus();
    setPhase('select');
    setDisplaySec(0);
    accRef.current = 0;
    setShowCancelConfirm(false);
    setEditTimeMode(false);
  }

  function handleEditTimeOpen() {
    setEditTimeMinutes(Math.floor(displaySec / 60));
    setEditTimeMode(true);
  }

  function handleEditTimeSave() {
    const newSec = Math.max(0, Math.min(999 * 60, editTimeMinutes * 60));
    setDisplaySec(newSec);
    accRef.current = newSec;
    setEditTimeMode(false);
  }

  function handleEditTimeChange(val) {
    const n = Math.max(0, Math.min(999, Number(val) || 0));
    setEditTimeMinutes(n);
  }

  function handlePomoPreset(p) {
    setPomoDur(p);
    setCustomPomo('');
  }

  function handleCustomPomo(val) {
    setCustomPomo(val);
    const n = Number(val);
    if (n > 0) setPomoDur(n);
  }

  // ── Handlers da fase select MULTI (mini-missões draft) ──
  function addDraftMini() {
    const t = draftMiniInput.trim();
    if (!t) return;
    setDraftMiniMissions((prev) => [
      ...prev,
      { id: genLocalId(), title: t, status: 'pending', order: prev.length },
    ]);
    setDraftMiniInput('');
  }

  function removeDraftMini(id) {
    setDraftMiniMissions((prev) => prev.filter((m) => m.id !== id));
  }

  function moveDraftMini(id, dir) {
    setDraftMiniMissions((prev) => {
      const idx = prev.findIndex((m) => m.id === id);
      if (idx === -1) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const out = prev.slice();
      const [item] = out.splice(idx, 1);
      out.splice(next, 0, item);
      return out.map((m, i) => ({ ...m, order: i }));
    });
  }

  // ── Handlers durante sessão MULTI ativa ──
  async function toggleActiveMini(id) {
    const updated = activeMiniMissions.map((m) =>
      m.id === id
        ? { ...m, status: m.status === 'done' ? 'pending' : 'done', completed_at: m.status === 'done' ? null : new Date().toISOString() }
        : m,
    );
    await updateMultiSessionMiniMissions(multiFocusSession.id, updated);
  }

  async function addActiveMini(title) {
    const t = String(title || '').trim();
    if (!t) return;
    const updated = [
      ...activeMiniMissions,
      { id: genLocalId(), title: t, status: 'pending', order: activeMiniMissions.length, completed_at: null },
    ];
    await updateMultiSessionMiniMissions(multiFocusSession.id, updated);
  }

  async function removeActiveMini(id) {
    const updated = activeMiniMissions.filter((m) => m.id !== id);
    await updateMultiSessionMiniMissions(multiFocusSession.id, updated);
  }

  const [newActiveMiniInput, setNewActiveMiniInput] = useState('');

  if (!open) return null;

  // ── Métricas e estilos ──
  const sector = monoEntity?.sector_id ? sectorsById?.get?.(monoEntity.sector_id) : null;
  const peso = isMultiFlow
    ? Math.max(1, Number(draftImportance || multiFocusSession?.importance || 1)) *
      Math.max(1, Number(draftDifficulty || multiFocusSession?.difficulty || 1))
    : monoEntity
      ? pesoOf(monoEntity)
      : 1;
  const tier = pesoTier(peso);
  const pomoTotal = pomoDur * 60;
  const displayTime = mode === 'pomodoro' ? Math.max(0, pomoTotal - displaySec) : displaySec;
  const progress = mode === 'pomodoro' ? Math.min(1, displaySec / pomoTotal) : 0;

  // entidade efetiva para cálculo de XP (live) na fase running
  const xpEntity = isMultiFlow
    ? {
        importance: multiFocusSession?.importance ?? draftImportance ?? 1,
        difficulty: multiFocusSession?.difficulty ?? draftDifficulty ?? 1,
      }
    : monoEntity;
  const xp = calcXp(displaySec, xpEntity);
  const clockClass = `focus-clock${phase === 'paused' ? ' paused' : phase === 'done' ? ' done' : ''}`;
  const clockSize = displayTime >= 3600 ? 52 : 68;

  // Validação para habilitar Iniciar no modo multi
  const validDraftCount = draftMiniMissions.filter((m) => m.title.trim()).length;
  const canStartMulti = isMultiFlow && validDraftCount >= 1 && draftImportance >= 1 && draftDifficulty >= 1;

  const headerLabel = isMultiFlow
    ? '· Multi-Missão'
    : isHabit
      ? '· Hábito'
      : '';
  const headerTitle = isMultiFlow
    ? `${activeMiniMissions.length || draftMiniMissions.length} mini-missões`
    : monoEntity?.title;

  return createPortal(
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Sessão de foco"
      onKeyDown={(e) => e.key === 'Escape' && phase === 'select' && handleCancel()}
      tabIndex={-1}
    >
      <div className="modal-panel focus-modal-panel panel">
        {/* Header */}
        <header className="panel-header wine" style={{ justifyContent: 'space-between' }}>
          <div style={{ minWidth: 0 }}>
            <div className="title">✦ Sessão de Foco {headerLabel}</div>
            <div className="font-lora italic" style={{ fontSize: 12, color: 'rgba(245,233,200,.8)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
              {headerTitle}
            </div>
          </div>
          <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
            {sector && !isMultiFlow && (
              <span className="chip" style={{ color: sector.color || '#a88a3d', borderColor: sector.color || '#a88a3d', background: 'rgba(0,0,0,.2)', fontSize: 10 }}>
                <span className="dot" style={{ background: sector.color || '#a88a3d', boxShadow: 'none', width: 6, height: 6 }} />
                {sector.name}
              </span>
            )}
            {phase === 'select' && (
              <button
                type="button"
                className="seal sm dark"
                onClick={handleCancel}
                aria-label="Fechar"
                style={{ borderColor: 'rgba(255,245,212,.25)' }}
              >
                ✕
              </button>
            )}
          </div>
        </header>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

          {/* ─── PHASE: SELECT ─── */}
          {phase === 'select' && (
            <div className="flex flex-col gap-5">
              <div className="font-eb text-[12px] text-[#5b4423] text-center">
                Escolha o modo de foco
              </div>

              {/* Mode tabs */}
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  className={`seal${mode === 'stopwatch' ? '' : ' dark'}`}
                  onClick={() => setMode('stopwatch')}
                >
                  ⏱ Cronômetro
                </button>
                <button
                  type="button"
                  className={`seal${mode === 'pomodoro' ? '' : ' dark'}`}
                  onClick={() => setMode('pomodoro')}
                >
                  🍅 Pomodoro
                </button>
              </div>

              {/* Stopwatch description */}
              {mode === 'stopwatch' && (
                <div className="font-lora italic text-[12px] text-[#7a6442] text-center">
                  O cronômetro contará de zero até você pausar ou concluir a sessão.
                </div>
              )}

              {/* Pomodoro duration picker */}
              {mode === 'pomodoro' && (
                <div className="flex flex-col gap-3">
                  <div className="font-eb text-[11px] text-[#5b4423] text-center">Duração do Pomodoro</div>
                  <div className="flex gap-2 justify-center flex-wrap">
                    {POMO_PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`seal sm${pomoDur === p && !customPomo ? '' : ' dark'}`}
                        onClick={() => handlePomoPreset(p)}
                      >
                        {p} min
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 justify-center">
                    <input
                      type="number"
                      placeholder="Personalizado (min)"
                      value={customPomo}
                      onChange={(e) => handleCustomPomo(e.target.value)}
                      min={1}
                      max={480}
                      className="font-num text-center"
                      style={{
                        width: 160,
                        padding: '5px 10px',
                        border: '1px solid #a88a3d',
                        background: 'rgba(255,245,212,.7)',
                        fontSize: 13,
                        outline: 'none',
                        color: '#1f1408',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* ── Bloco específico do MULTI: lista + importance/difficulty ── */}
              {isMultiFlow && (
                <>
                  <div className="flex flex-col gap-2">
                    <div className="font-eb text-[11px] text-[#5b4423]">Mini-missões da sessão</div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={draftMiniInput}
                        onChange={(e) => setDraftMiniInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addDraftMini();
                          }
                        }}
                        placeholder="Adicionar mini-missão (Enter)"
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          border: '1px solid #a88a3d',
                          background: 'rgba(255,245,212,.7)',
                          fontSize: 13,
                          outline: 'none',
                          color: '#1f1408',
                        }}
                      />
                      <button
                        type="button"
                        className="seal sm"
                        onClick={addDraftMini}
                        disabled={!draftMiniInput.trim()}
                      >
                        +
                      </button>
                    </div>

                    {draftMiniMissions.length === 0 ? (
                      <div className="font-lora italic text-[11px] text-[#7a6442] text-center" style={{ padding: '8px 0' }}>
                        Nenhuma mini-missão adicionada. Adicione ao menos uma para iniciar.
                      </div>
                    ) : (
                      <ul style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: 0, padding: 0, listStyle: 'none' }}>
                        {draftMiniMissions.map((m, i) => (
                          <li
                            key={m.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '4px 8px',
                              background: 'rgba(255,245,212,.45)',
                              border: '1px solid rgba(168,138,61,.3)',
                              fontSize: 12,
                              color: '#1f1408',
                            }}
                          >
                            <span style={{ flex: 1 }}>{m.title}</span>
                            <button
                              type="button"
                              className="seal sm dark"
                              onClick={() => moveDraftMini(m.id, -1)}
                              disabled={i === 0}
                              style={{ padding: '0 6px', fontSize: 11 }}
                              aria-label="Mover para cima"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="seal sm dark"
                              onClick={() => moveDraftMini(m.id, +1)}
                              disabled={i === draftMiniMissions.length - 1}
                              style={{ padding: '0 6px', fontSize: 11 }}
                              aria-label="Mover para baixo"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              className="seal sm dark"
                              onClick={() => removeDraftMini(m.id)}
                              style={{ padding: '0 8px', fontSize: 11 }}
                              aria-label="Remover"
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="font-eb text-[11px] text-[#5b4423]">
                      Importância <span style={{ color: '#7a2230' }}>*</span>
                    </div>
                    <div className="flex gap-2 justify-center">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={`seal sm${draftImportance === n ? '' : ' dark'}`}
                          onClick={() => setDraftImportance(n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="font-eb text-[11px] text-[#5b4423]">
                      Dificuldade <span style={{ color: '#7a2230' }}>*</span>
                    </div>
                    <div className="flex gap-2 justify-center">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={`seal sm${draftDifficulty === n ? '' : ' dark'}`}
                          onClick={() => setDraftDifficulty(n)}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Peso badge */}
              <div className="flex items-center gap-2 justify-center">
                <span className="font-eb text-[11px] text-[#5b4423]">
                  {isMultiFlow ? 'Peso da sessão:' : `Peso ${isHabit ? 'do hábito' : 'da missão'}:`}
                </span>
                <span className="font-num text-[13px] font-semibold" style={{ color: tier.color }}>
                  {tier.label} ({peso})
                </span>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  className="seal"
                  onClick={handleStart}
                  disabled={busy || (isMultiFlow && !canStartMulti)}
                  style={{ padding: '8px 24px', fontSize: 13 }}
                  title={
                    isMultiFlow && !canStartMulti
                      ? 'Adicione ≥ 1 mini-missão e defina importância e dificuldade'
                      : undefined
                  }
                >
                  ▶ Iniciar Foco
                </button>
              </div>
            </div>
          )}

          {/* ─── PHASE: RUNNING / PAUSED / DONE ─── */}
          {(phase === 'running' || phase === 'paused' || phase === 'done') && (
            <div className="flex flex-col gap-4 items-center">

              {/* Mode label */}
              <div className="font-eb text-[11px] text-[#5b4423]">
                {mode === 'stopwatch' ? '⏱ Cronômetro' : `🍅 Pomodoro · ${pomoDur} min`}
              </div>

              {/* Pomodoro progress bar */}
              {mode === 'pomodoro' && (
                <div className="focus-pomo-track" style={{ width: '100%' }}>
                  <div
                    className="focus-pomo-fill"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
              )}

              {/* Big clock */}
              <div
                className={clockClass}
                style={{ fontSize: clockSize }}
                aria-live="off"
                aria-label={`Tempo: ${fmt(displayTime)}`}
              >
                {fmt(displayTime)}
              </div>

              {/* Status */}
              <div
                className="font-eb text-[12px]"
                style={{
                  color: phase === 'done' ? '#7a2230' : phase === 'paused' ? '#a88a3d' : '#4a6b3a',
                  letterSpacing: '.1em',
                }}
              >
                {phase === 'done' ? '✦ Pomodoro concluído!' : phase === 'paused' ? '⏸ Pausado' : '● Em foco'}
              </div>

              {/* XP preview box */}
              <div className="focus-xp-box" style={{ width: '100%' }}>
                <div className="font-eb text-[11px] text-[#5b4423]">XP acumulado nesta sessão</div>
                <div className="font-num" style={{ fontSize: 28, color: '#4a6b3a', lineHeight: 1.1, marginTop: 2 }}>
                  +{(editTimeMode ? calcXp(editTimeMinutes * 60, xpEntity) : xp).toLocaleString('pt-BR')}
                </div>
                <div className="font-num text-[10px] text-[#7a6442]" style={{ marginTop: 3 }}>
                  imp {xpEntity?.importance ?? 1} × dif {xpEntity?.difficulty ?? 1} × {editTimeMode ? editTimeMinutes : Math.floor(displaySec / 60)}min ÷ 10
                </div>
              </div>

              {/* Editor de tempo manual */}
              {editTimeMode ? (
                <div style={{ width: '100%', padding: '12px', background: 'rgba(255,245,212,.45)', border: '1px solid rgba(168,138,61,.3)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="font-eb text-[11px] text-[#5b4423]">Editar tempo de foco (minutos)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                    <button
                      type="button"
                      className="seal sm dark"
                      onClick={() => handleEditTimeChange(editTimeMinutes - 1)}
                      style={{ padding: '4px 8px', fontSize: 14 }}
                      aria-label="Diminuir 1 minuto"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={editTimeMinutes}
                      onChange={(e) => handleEditTimeChange(e.target.value)}
                      min={0}
                      max={999}
                      style={{
                        width: 70,
                        padding: '6px 8px',
                        border: '1px solid #a88a3d',
                        background: 'rgba(255,245,212,.7)',
                        fontSize: 14,
                        fontWeight: 'bold',
                        textAlign: 'center',
                        outline: 'none',
                        color: '#1f1408',
                      }}
                    />
                    <button
                      type="button"
                      className="seal sm dark"
                      onClick={() => handleEditTimeChange(editTimeMinutes + 1)}
                      style={{ padding: '4px 8px', fontSize: 14 }}
                      aria-label="Aumentar 1 minuto"
                    >
                      +
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button
                      type="button"
                      className="seal sm"
                      onClick={handleEditTimeSave}
                      style={{ flex: 1, fontSize: 12 }}
                    >
                      ✓ Salvar
                    </button>
                    <button
                      type="button"
                      className="seal sm dark"
                      onClick={() => setEditTimeMode(false)}
                      style={{ flex: 1, fontSize: 12 }}
                    >
                      ✕ Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="seal sm dark"
                  onClick={handleEditTimeOpen}
                  style={{ width: '100%', fontSize: 12 }}
                >
                  ⏱ Editar tempo
                </button>
              )}

              {/* Lista de mini-missões durante a sessão multi */}
              {isMultiActive && (
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div className="font-eb text-[11px] text-[#5b4423]">Mini-missões</div>
                  <ul style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: 0, padding: 0, listStyle: 'none', maxHeight: 200, overflowY: 'auto' }}>
                    {activeMiniMissions.map((m) => {
                      const done = m.status === 'done';
                      return (
                        <li
                          key={m.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '4px 8px',
                            background: done ? 'rgba(74,107,58,.12)' : 'rgba(255,245,212,.45)',
                            border: '1px solid rgba(168,138,61,.3)',
                            fontSize: 12,
                            color: '#1f1408',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => toggleActiveMini(m.id)}
                            aria-label={done ? 'Desmarcar' : 'Marcar concluída'}
                            style={{
                              width: 18,
                              height: 18,
                              border: '1px solid #a88a3d',
                              background: done ? '#4a6b3a' : 'rgba(255,245,212,.6)',
                              color: '#fff',
                              fontSize: 11,
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          >
                            {done ? '✓' : ''}
                          </button>
                          <span
                            style={{
                              flex: 1,
                              textDecoration: done ? 'line-through' : 'none',
                              opacity: done ? 0.7 : 1,
                            }}
                          >
                            {m.title}
                          </span>
                          <button
                            type="button"
                            className="seal sm dark"
                            onClick={() => removeActiveMini(m.id)}
                            style={{ padding: '0 6px', fontSize: 11 }}
                            aria-label="Remover"
                          >
                            ✕
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newActiveMiniInput}
                      onChange={(e) => setNewActiveMiniInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newActiveMiniInput.trim()) {
                          e.preventDefault();
                          addActiveMini(newActiveMiniInput);
                          setNewActiveMiniInput('');
                        }
                      }}
                      placeholder="Adicionar mini-missão"
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        border: '1px solid #a88a3d',
                        background: 'rgba(255,245,212,.7)',
                        fontSize: 12,
                        outline: 'none',
                        color: '#1f1408',
                      }}
                    />
                    <button
                      type="button"
                      className="seal sm"
                      onClick={() => {
                        if (newActiveMiniInput.trim()) {
                          addActiveMini(newActiveMiniInput);
                          setNewActiveMiniInput('');
                        }
                      }}
                      disabled={!newActiveMiniInput.trim()}
                    >
                      +
                    </button>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 justify-center flex-wrap">
                {phase !== 'done' && (
                  <button
                    type="button"
                    className="seal dark"
                    onClick={handlePause}
                    disabled={busy || editTimeMode}
                  >
                    {phase === 'running' ? '⏸ Pausar' : '▶ Retomar'}
                  </button>
                )}
                <button
                  type="button"
                  className="seal"
                  onClick={handleConcluir}
                  disabled={busy || displaySec < 30 || editTimeMode}
                  title={displaySec < 30 ? 'Sessão mínima de 30 segundos' : editTimeMode ? 'Feche o editor primeiro' : 'Salvar tempo e XP'}
                >
                  ✓ Concluir Sessão
                </button>
                {phase !== 'done' && (
                  <button
                    type="button"
                    className="seal dark"
                    onClick={() => setShowCancelConfirm(true)}
                    disabled={busy || editTimeMode}
                    style={{ color: '#7a2230' }}
                  >
                    ✕ Cancelar
                  </button>
                )}
              </div>

              <div className="font-lora italic text-[11px] text-[#7a6442] text-center" style={{ maxWidth: 320 }}>
                {isMultiFlow
                  ? 'O XP será creditado ao personagem ao encerrar, junto com o registro consolidado da sessão.'
                  : isHabit
                    ? 'O XP será acumulado no hábito. Use "Marcar concluído hoje" para creditar ao personagem.'
                    : 'O XP será acumulado na missão. Use "Concluir & Colher" para creditar ao personagem.'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmação para cancelar sessão */}
      {showCancelConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setShowCancelConfirm(false)}
        >
          <div
            className="panel"
            style={{
              padding: '1.5rem',
              maxWidth: 320,
              background: '#f5e8b8',
              border: '2px solid #a88a3d',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-cinzel text-[16px] font-semibold text-[#1f1408]" style={{ marginBottom: 12 }}>
              ⚠ Cancelar sessão?
            </div>
            <div className="font-lora text-[13px] text-[#5b4423]" style={{ marginBottom: 16 }}>
              Nenhum XP será gerado ou salvo. Esta ação não pode ser desfeita.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="seal"
                onClick={handleCancel}
                style={{ flex: 1, fontSize: 12 }}
              >
                Sim, cancelar
              </button>
              <button
                type="button"
                className="seal dark"
                onClick={() => setShowCancelConfirm(false)}
                style={{ flex: 1, fontSize: 12 }}
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
