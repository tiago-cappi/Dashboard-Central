import { useState } from 'react';
import { useFocus } from './FocusContext.jsx';
import HarvestModal from './HarvestModal.jsx';
import { useSectors } from './hooks/useSectors.js';
import { pesoOf, pesoTier } from './lib/productivity.js';

function formatHMS(totalSec) {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function FocusBar() {
  const { isActive, focusMission, elapsedSec, pauseFocus, busy } = useFocus();
  const { byId } = useSectors();
  const [confirmHarvest, setConfirmHarvest] = useState(false);

  if (!isActive || !focusMission) return null;

  const sector = byId.get(focusMission.sector_id);
  const peso = pesoOf(focusMission);
  const tier = pesoTier(peso);

  return (
    <>
      <div className="focus-bar" role="region" aria-label="Sessão de foco ativa">
        <div className="focus-bar-inner">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="dot focus-pulse"
              style={{ background: tier.color, width: 14, height: 14, boxShadow: 'none' }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="font-eb text-[11px] tracking-[.08em] text-[#cdb37a]">
                Em foco · {sector?.name ?? 'Sem setor'}
              </div>
              <div
                className="font-cormorant text-[18px] font-semibold text-[#f5e8b8] truncate"
                title={focusMission.title}
              >
                {focusMission.title}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="font-eb text-[10px] tracking-[.12em] text-[#cdb37a]">tempo decorrido</div>
              <div className="font-num text-[26px] text-[#f5e8b8] leading-none">
                {formatHMS(elapsedSec)}
              </div>
            </div>
            <button
              type="button"
              className="seal"
              onClick={() => pauseFocus()}
              disabled={busy}
            >
              ▌▌ Pausar
            </button>
            <button
              type="button"
              className="seal dark"
              onClick={() => setConfirmHarvest(true)}
              disabled={busy}
            >
              ✓ Concluir & Colher
            </button>
          </div>
        </div>
      </div>

      {confirmHarvest && (
        <HarvestModal
          mission={focusMission}
          open={confirmHarvest}
          onClose={() => setConfirmHarvest(false)}
        />
      )}
    </>
  );
}
