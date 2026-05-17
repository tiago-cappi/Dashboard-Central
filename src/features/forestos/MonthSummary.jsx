import Panel from '../../components/layout/Panel.jsx';
import Divider from '../../components/ornaments/Divider.jsx';
import { formatMinutes, summarizeMissions } from './lib/productivity.js';
import { MONTH_NAMES_FULL } from './lib/calendar.js';
import { useFocus } from './FocusContext.jsx';

function Stat({ label, value, accent = '#1f1408' }) {
  return (
    <div className="flex items-baseline justify-between py-1.5 border-b border-[#a88a3d]/25 last:border-b-0">
      <span className="font-eb text-[12px] text-[#5b4423]">{label}</span>
      <span className="font-num text-[15px]" style={{ color: accent }}>{value}</span>
    </div>
  );
}

export default function MonthSummary({ year, monthIdx, missions, sectorsById }) {
  const { profile } = useFocus();
  const s = summarizeMissions(missions ?? []);

  // melhor sector do mês
  const focusBySector = new Map();
  for (const m of missions ?? []) {
    if (!m.sector_id) continue;
    focusBySector.set(m.sector_id, (focusBySector.get(m.sector_id) ?? 0) + Number(m.focus_minutes ?? 0));
  }
  let topSectorId = null;
  let topSectorMin = 0;
  for (const [id, min] of focusBySector) {
    if (min > topSectorMin) {
      topSectorMin = min;
      topSectorId = id;
    }
  }
  const topSector = topSectorId ? sectorsById?.get?.(topSectorId) : null;

  return (
    <Panel
      title={`Resumo · ${MONTH_NAMES_FULL[monthIdx]} ${year}`}
      subtitle="indicadores do mês"
      accent="navy"
    >
      <Stat label="Tempo total em foco" value={formatMinutes(s.totalFocus)} />
      <Stat label="Missões concluídas" value={String(s.count)} />
      <Stat
        label="XP ganho no mês"
        value={s.totalXp ? `+${Number(s.totalXp).toLocaleString('pt-BR')}` : '—'}
        accent="#4a6b3a"
      />
      <Stat label="Score produtivo" value={Number(s.totalScore).toLocaleString('pt-BR')} />

      <Divider className="my-3" />

      <div className="font-eb text-[11px] text-[#5b4423] mb-1">Setor mais ativo</div>
      {topSector ? (
        <div className="flex items-center gap-2">
          <span className="dot" style={{ background: topSector.color || '#5b4423', boxShadow: 'none' }} />
          <span className="font-cormorant text-[16px] font-semibold text-[#1f1408]">{topSector.name}</span>
          <span className="ml-auto font-num text-[13px] text-[#5b4423]">{formatMinutes(topSectorMin)}</span>
        </div>
      ) : (
        <div className="font-lora italic text-[12px] text-[#7a6442]">Nenhum setor predominante</div>
      )}

      <Divider className="my-3" />

      <div className="font-eb text-[11px] text-[#5b4423] mb-1">Perfil do gabinete</div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Nível" value={profile?.level ?? '—'} accent="#7a2230" />
        <Stat label="XP total" value={profile ? Number(profile.total_xp).toLocaleString('pt-BR') : '—'} />
        <Stat label="Setores" value={profile?.counter_sectors ?? '—'} />
        <Stat label="Hábitos" value={profile?.counter_habits ?? '—'} />
      </div>
    </Panel>
  );
}
