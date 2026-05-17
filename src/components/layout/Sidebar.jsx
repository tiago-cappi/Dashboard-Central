import { NavLink } from 'react-router-dom';

const SVG = {
  overview: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="8" height="8" />
      <rect x="13" y="3" width="8" height="5" />
      <rect x="13" y="10" width="8" height="11" />
      <rect x="3" y="13" width="8" height="8" />
    </svg>
  ),
  tree: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3l5 7h-3l4 6h-4l3 4H7l3-4H6l4-6H7l5-7z" />
      <path d="M12 20v3" />
    </svg>
  ),
  coin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9h5a2 2 0 010 4H10a2 2 0 000 4h5" />
    </svg>
  ),
  people: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="10" r="2" />
      <path d="M3 20c0-3 3-5 6-5s6 2 6 5" />
      <path d="M15 18c0-2 2-3 4-3s2 1 2 2" />
    </svg>
  ),
  gear: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4 12H1M23 12h-3M6 6L4 4M20 20l-2-2M6 18l-2 2M20 4l-2 2" />
    </svg>
  ),
  scales: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 3v18M5 7h14" />
      <path d="M3 11l2-4 2 4a3 3 0 11-4 0z" />
      <path d="M17 11l2-4 2 4a3 3 0 11-4 0z" />
    </svg>
  ),
  flask: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 3h6M10 3v6L4 20a2 2 0 002 2h12a2 2 0 002-2l-6-11V3" />
    </svg>
  ),
  scroll: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 4h11a3 3 0 013 3v10a3 3 0 003 3H8a3 3 0 01-3-3V4z" />
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  map: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  ),
};

const ITEMS = [
  { to: '/', icon: SVG.overview, label: 'Visão Geral', sub: 'panorama do gabinete' },
  { to: '/forestos', icon: SVG.tree, label: 'ForestOS', sub: 'foco · missões · hábitos', badge: 'AO VIVO' },
  { to: '#', icon: SVG.coin, label: 'Tesouraria & Finanças', sub: 'fluxos e reservas', disabled: true },
  { to: '#', icon: SVG.people, label: 'População & RH', sub: 'quadro de colaboradores', disabled: true },
  { to: '#', icon: SVG.gear, label: 'Operações & Produção', sub: 'linhas em curso', disabled: true },
  { to: '#', icon: SVG.scales, label: 'Comércio & Mercados', sub: 'rotas e parceiros', disabled: true },
  { to: '#', icon: SVG.flask, label: 'Tecnologia & Inovação', sub: 'pesquisas ativas', disabled: true },
  { to: '#', icon: SVG.scroll, label: 'Decretos & Políticas', sub: 'normas em vigor', disabled: true },
  { to: '#', icon: SVG.eye, label: 'Inteligência & Relatórios', sub: 'observatório', disabled: true },
  { to: '#', icon: SVG.map, label: 'Mapa Operacional', sub: 'visão geográfica', disabled: true },
];

export default function Sidebar() {
  return (
    <aside
      className="border-r border-[#a88a3d] bg-[#f0e4c4] relative"
      style={{ minHeight: '100%' }}
    >
      <div className="px-3 py-3 border-b border-[#a88a3d]/60">
        <div className="font-cinzel uppercase text-[11px] tracking-[.18em] text-[#5b4423]">
          Câmaras do Gabinete
        </div>
        <div className="font-eb text-[11px] text-[#7a6442] mt-0.5">
          navegação principal
        </div>
      </div>
      <nav className="flex flex-col">
        {ITEMS.map((item, i) =>
          item.disabled ? (
            <div key={i} className="nav-item disabled" aria-disabled="true">
              <span className="ico">{item.icon}</span>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="lbl">{item.label}</span>
                <span className="sub">{item.sub}</span>
              </div>
            </div>
          ) : (
            <NavLink
              key={i}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="ico">{item.icon}</span>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="lbl">{item.label}</span>
                <span className="sub">{item.sub}</span>
              </div>
              {item.badge && <span className="badge">{item.badge}</span>}
            </NavLink>
          ),
        )}
      </nav>
    </aside>
  );
}
