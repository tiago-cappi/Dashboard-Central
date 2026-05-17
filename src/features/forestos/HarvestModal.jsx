import { createPortal } from 'react-dom';
import { useEffect, useMemo, useState } from 'react';
import { useFocus } from './FocusContext.jsx';
import { formatMinutes, pesoOf, pesoTier } from './lib/productivity.js';
import { supabase } from '../../lib/supabase.js';

// Modal exibido ao concluir/colher uma missão. Mostra os totais acumulados
// e confirma a transferência de XP para o profile.
export default function HarvestModal({ mission, open, onClose }) {
  const { harvestMission, pauseFocus, isActive, profile, elapsedSec, busy } = useFocus();
  const [finalMission, setFinalMission] = useState(mission);
  const [working, setWorking] = useState(false);

  const isFocusOnThisMission = isActive && profile?.current_focus_mission_id === mission?.id;

  // Se estamos em foco nessa missão, mostra os totais incluindo a sessão corrente.
  const previewFocus = useMemo(() => {
    if (!finalMission) return 0;
    const base = Number(finalMission.focus_minutes ?? 0);
    return isFocusOnThisMission ? base + Math.floor(elapsedSec / 60) : base;
  }, [finalMission, isFocusOnThisMission, elapsedSec]);

  const previewXp = useMemo(() => {
    if (!finalMission) return 0;
    const baseXp = Number(finalMission.xp_gained ?? 0);
    if (!isFocusOnThisMission) return baseXp;
    const imp = Math.max(1, Number(finalMission.importance ?? 1));
    const dif = Math.max(1, Number(finalMission.difficulty ?? 1));
    const liveMin = Math.floor(elapsedSec / 60);
    const liveXp = Math.round((liveMin * imp * dif) / 10);
    return baseXp + liveXp;
  }, [finalMission, isFocusOnThisMission, elapsedSec]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape' && !working) onClose?.();
    }
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose, working]);

  // refetch da missão para garantir números atualizados
  useEffect(() => {
    if (!open || !mission?.id) return;
    let cancelled = false;
    supabase
      .from('missions')
      .select('*')
      .eq('id', mission.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setFinalMission(data);
      });
    return () => {
      cancelled = true;
    };
  }, [open, mission?.id]);

  if (!open || !finalMission) return null;

  async function onConfirm() {
    setWorking(true);
    await harvestMission(finalMission.id);
    setWorking(false);
    onClose?.();
  }

  async function onPauseOnly() {
    setWorking(true);
    await pauseFocus();
    setWorking(false);
    onClose?.();
  }

  const peso = pesoOf(finalMission);
  const tier = pesoTier(peso);

  return createPortal(
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !working) onClose?.();
      }}
    >
      <section className="panel modal-panel" style={{ width: 'min(560px, 100%)' }}>
        <header className="panel-header">
          <div className="flex-1 min-w-0">
            <div className="title">Colher Recompensa</div>
            <div className="sub">confirmar conclusão da missão</div>
          </div>
        </header>
        <div className="modal-body">
          <p className="font-lora text-[14px] leading-relaxed mb-3 text-[#3a2a18]">
            Você está prestes a concluir a missão{' '}
            <span className="font-cormorant text-[16px] font-semibold text-[#1f1408]">
              {finalMission.title}
            </span>
            . Toda a XP acumulada será transferida ao seu personagem.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <Stat label="Tempo total" value={formatMinutes(previewFocus)} />
            <Stat label="XP acumulada" value={`+${previewXp.toLocaleString('pt-BR')}`} color="#4a6b3a" />
            <Stat label="Peso" value={`${peso}`} color={tier.color} />
          </div>
          <div className="font-eb text-[11px] text-[#5b4423] mb-3">
            depois de colhida: <span className="font-num">XP total = {Number(profile?.total_xp ?? 0).toLocaleString('pt-BR')} + {previewXp.toLocaleString('pt-BR')} → {(Number(profile?.total_xp ?? 0) + previewXp).toLocaleString('pt-BR')}</span>
          </div>

          <div className="flex items-center justify-end gap-2 mt-2">
            <button className="seal ghost" type="button" onClick={onClose} disabled={working}>
              Cancelar
            </button>
            {isFocusOnThisMission && (
              <button className="seal" type="button" onClick={onPauseOnly} disabled={working || busy}>
                Apenas pausar
              </button>
            )}
            <button className="seal dark" type="button" onClick={onConfirm} disabled={working || busy}>
              {working ? 'colhendo…' : 'Colher & Concluir'}
            </button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}

function Stat({ label, value, color = '#1f1408' }) {
  return (
    <div className="decree p-2.5">
      <div className="font-eb text-[10px] text-[#5b4423]">{label}</div>
      <div className="font-num text-[18px] mt-1" style={{ color }}>{value}</div>
    </div>
  );
}
