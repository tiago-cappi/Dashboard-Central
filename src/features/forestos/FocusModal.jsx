import { useEffect, useRef, useState } from 'react';
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

export default function FocusModal() {
  const {
    pendingMission,
    pendingHabit,
    focusMission,
    focusHabit,
    focusEntityType,
    isActive,
    elapsedSec: dbElapsedSec,
    startFocus,
    pauseFocus,
    cancelFocus,
    busy,
  } = useFocus();
  const { byId: sectorsById } = useSectors();

  // determina entidade ativa: pendente OU em foco
  const pendingEntity = pendingMission ?? pendingHabit ?? null;
  const pendingType = pendingMission ? 'mission' : pendingHabit ? 'habit' : null;
  const activeEntity = isActive
    ? (focusEntityType === 'habit' ? focusHabit : focusMission)
    : null;
  const activeType = isActive ? focusEntityType : null;

  const mission = activeEntity ?? pendingEntity;
  const entityType = activeType ?? pendingType ?? 'mission';
  const isHabit = entityType === 'habit';
  const open = Boolean(mission);

  // phase: 'select' | 'running' | 'paused' | 'done'
  const [phase, setPhase] = useState('select');
  const [mode, setMode] = useState('stopwatch');
  const [pomoDur, setPomoDur] = useState(25);
  const [customPomo, setCustomPomo] = useState('');
  const [displaySec, setDisplaySec] = useState(0);

  const accRef = useRef(0);       // accumulated seconds from completed runs
  const startRef = useRef(null);  // wall-clock when last started
  const timerRef = useRef(null);

  // When modal opens with an already-active DB session (e.g. page refresh)
  useEffect(() => {
    if (isActive && activeEntity && phase === 'select') {
      accRef.current = dbElapsedSec;
      startRef.current = Date.now() - dbElapsedSec * 1000;
      setDisplaySec(dbElapsedSec);
      setMode('stopwatch');
      setPhase('running');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, activeEntity?.id]);

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

  // Reset local state when modal closes
  useEffect(() => {
    if (!open) {
      clearInterval(timerRef.current);
      setPhase('select');
      setDisplaySec(0);
      setMode('stopwatch');
      setPomoDur(25);
      setCustomPomo('');
      accRef.current = 0;
      startRef.current = null;
    }
  }, [open]);

  async function handleStart() {
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

  if (!open) return null;

  const sector = mission?.sector_id ? sectorsById?.get?.(mission.sector_id) : null;
  const peso = mission ? pesoOf(mission) : 1;
  const tier = pesoTier(peso);
  const pomoTotal = pomoDur * 60;
  const displayTime = mode === 'pomodoro' ? Math.max(0, pomoTotal - displaySec) : displaySec;
  const progress = mode === 'pomodoro' ? Math.min(1, displaySec / pomoTotal) : 0;
  const xp = calcXp(displaySec, mission);
  const clockClass = `focus-clock${phase === 'paused' ? ' paused' : phase === 'done' ? ' done' : ''}`;
  const clockSize = displayTime >= 3600 ? 52 : 68;

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
            <div className="title">✦ Sessão de Foco {isHabit ? '· Hábito' : ''}</div>
            <div className="font-lora italic" style={{ fontSize: 12, color: 'rgba(245,233,200,.8)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
              {mission?.title}
            </div>
          </div>
          <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
            {sector && (
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

              {/* Peso badge */}
              <div className="flex items-center gap-2 justify-center">
                <span className="font-eb text-[11px] text-[#5b4423]">Peso {isHabit ? 'do hábito' : 'da missão'}:</span>
                <span className="font-num text-[13px] font-semibold" style={{ color: tier.color }}>
                  {tier.label} ({peso})
                </span>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  className="seal"
                  onClick={handleStart}
                  disabled={busy}
                  style={{ padding: '8px 24px', fontSize: 13 }}
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
                  +{xp.toLocaleString('pt-BR')}
                </div>
                <div className="font-num text-[10px] text-[#7a6442]" style={{ marginTop: 3 }}>
                  imp {mission?.importance ?? 1} × dif {mission?.difficulty ?? 1} × {Math.floor(displaySec / 60)}min ÷ 10
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 justify-center flex-wrap">
                {phase !== 'done' && (
                  <button
                    type="button"
                    className="seal dark"
                    onClick={handlePause}
                    disabled={busy}
                  >
                    {phase === 'running' ? '⏸ Pausar' : '▶ Retomar'}
                  </button>
                )}
                <button
                  type="button"
                  className="seal"
                  onClick={handleConcluir}
                  disabled={busy || displaySec < 30}
                  title={displaySec < 30 ? 'Sessão mínima de 30 segundos' : 'Salvar tempo e XP na missão'}
                >
                  ✓ Concluir Sessão
                </button>
              </div>

              <div className="font-lora italic text-[11px] text-[#7a6442] text-center" style={{ maxWidth: 320 }}>
                O XP será acumulado {isHabit ? 'no hábito' : 'na missão'}. Use {isHabit ? '"Marcar concluído hoje"' : '"Concluir & Colher"'} para creditar ao personagem.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
