import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/AuthContext.jsx';
import Crest from '../ornaments/Crest.jsx';

function ResourcePill({ icon, label, value, tone }) {
  return (
    <div className="res">
      {icon && <span className="ico">{icon}</span>}
      <div className="leading-tight">
        <div className="lbl">{label}</div>
        <div className={`val ${tone === 'pos' ? 'pos' : tone === 'neg' ? 'neg' : ''}`}>{value}</div>
      </div>
    </div>
  );
}

const ICONS = {
  scroll: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 4h11a3 3 0 013 3v10a3 3 0 003 3H8a3 3 0 01-3-3V4z" />
      <path d="M5 4a3 3 0 00-3 3v0a3 3 0 003 3" />
    </svg>
  ),
  tree: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3l5 7h-3l4 6h-4l3 4H7l3-4H6l4-6H7l5-7z" />
      <path d="M12 20v3" />
    </svg>
  ),
  star: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2l3 6 7 .8-5 4.6 1.4 7L12 16.8 5.6 20.4 7 13.4 2 8.8 9 8z" />
    </svg>
  ),
  clock: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  bell: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 16V11a6 6 0 0112 0v5l2 2H4z" />
      <path d="M10 20a2 2 0 004 0" />
    </svg>
  ),
};

export default function Topbar({ profile, todayLabel }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const hhmmss = clock.toLocaleTimeString('pt-BR', { hour12: false });
  const totalXp = profile?.total_xp ?? '—';
  const level = profile?.level ?? '—';
  const missions = profile?.counter_missions ?? '—';
  const habits = profile?.counter_habits ?? '—';

  return (
    <header className="topbar h-16 flex items-center px-4 gap-4 relative" style={{ zIndex: 5 }}>
      <div className="flex items-center gap-3 relative">
        <Crest size={42} />
        <div className="leading-tight">
          <div className="font-cinzel uppercase text-[14px] font-semibold tracking-[.18em] text-[#f5e8b8]">
            Central de Comando
          </div>
          <div className="font-eb text-[12px] text-[#cdb37a]">
            Gabinete Executivo · {todayLabel ?? '—'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-6 flex-wrap">
        <ResourcePill icon={ICONS.star} label="XP Total" value={Number(totalXp).toLocaleString('pt-BR') || '—'} />
        <ResourcePill icon={ICONS.tree} label="Nível" value={String(level)} />
        <ResourcePill icon={ICONS.scroll} label="Missões" value={String(missions)} />
        <ResourcePill icon={ICONS.tree} label="Hábitos" value={String(habits)} />
        <ResourcePill icon={ICONS.clock} label="Tempo Real" value={hhmmss} />
        <ResourcePill icon={ICONS.bell} label="Alertas" value="0" tone="pos" />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button className="seal sm dark" type="button" onClick={handleLogout}>
          Sair
        </button>
        <button className="seal sm dark" type="button">◄</button>
        <button className="seal sm" type="button">II</button>
        <button className="seal sm dark" type="button">►</button>
      </div>
    </header>
  );
}
