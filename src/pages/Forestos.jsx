import { useEffect, useMemo, useState } from 'react';
import FocusHeatmap from '../features/forestos/FocusHeatmap.jsx';
import HabitHeatmap from '../features/forestos/HabitHeatmap.jsx';
import HabitStats from '../features/forestos/HabitStats.jsx';
import TodayHabits from '../features/forestos/TodayHabits.jsx';
import TodayReminders from '../features/forestos/TodayReminders.jsx';
import DayDetailModal from '../features/forestos/DayDetailModal.jsx';
import MonthSummary from '../features/forestos/MonthSummary.jsx';
import ActiveMissions from '../features/forestos/ActiveMissions.jsx';
import ForestTree from '../features/forestos/ForestTree.jsx';
import { useMonthMissions } from '../features/forestos/hooks/useMonthMissions.js';
import { useSectors } from '../features/forestos/hooks/useSectors.js';
import { useFocus } from '../features/forestos/FocusContext.jsx';
import Divider from '../components/ornaments/Divider.jsx';
import { SUPABASE_CONFIGURED } from '../lib/supabase.js';

function NotConfiguredBanner() {
  return (
    <div className="panel mb-4">
      <header className="panel-header navy">
        <div className="title">Configuração pendente</div>
      </header>
      <div className="p-4 font-lora text-[14px] text-[#3a2a18] leading-relaxed">
        Copie <code className="font-num">.env.example</code> para <code className="font-num">.env</code> na raiz
        do projeto e preencha as variáveis <code className="font-num">VITE_SUPABASE_URL</code> e{' '}
        <code className="font-num">VITE_SUPABASE_PUBLISHABLE_KEY</code> (ou{' '}
        <code className="font-num">VITE_SUPABASE_ANON_KEY</code>). Após isso, reinicie{' '}
        <code className="font-num">npm run dev</code>.
        <br />
        <br />
        Verifique também se o schema <code className="font-num">forestos</code> está listado em{' '}
        <em>Supabase Dashboard → Settings → API → Exposed schemas</em>.
      </div>
    </div>
  );
}

const TABS = [
  { id: 'panel', label: 'Painel', sub: 'foco e missões' },
  { id: 'cartography', label: 'Cartografia', sub: 'árvore hierárquica' },
];

const TAB_STORAGE_KEY = 'forestos.activeTab';

function PanelTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIdx, setMonthIdx] = useState(now.getMonth());
  const [selected, setSelected] = useState(null);

  const { subscribe } = useFocus();
  const { missions, byDay, loading, error, refetch } = useMonthMissions(year, monthIdx);
  const { byId: sectorsById } = useSectors();

  useEffect(() => subscribe(() => refetch()), [subscribe, refetch]);

  const selectedMissions = useMemo(() => {
    if (!selected) return [];
    return byDay.get(selected.iso) ?? [];
  }, [selected, byDay]);

  function goPrev() {
    if (monthIdx === 0) {
      setMonthIdx(11);
      setYear((y) => y - 1);
    } else {
      setMonthIdx((m) => m - 1);
    }
  }
  function goNext() {
    if (monthIdx === 11) {
      setMonthIdx(0);
      setYear((y) => y + 1);
    } else {
      setMonthIdx((m) => m + 1);
    }
  }
  function goToday() {
    const t = new Date();
    setYear(t.getFullYear());
    setMonthIdx(t.getMonth());
  }

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 fadein-stagger items-start">
        <div className="xl:col-span-2 flex flex-col gap-4 min-w-0">
          <FocusHeatmap
            year={year}
            monthIdx={monthIdx}
            onPrev={goPrev}
            onNext={goNext}
            onToday={goToday}
            byDay={byDay}
            onSelectDay={(cell) => setSelected(cell)}
            loading={loading}
            error={error}
          />
          <HabitStats />
          <HabitHeatmap
            year={year}
            monthIdx={monthIdx}
            onPrev={goPrev}
            onNext={goNext}
            onToday={goToday}
          />
        </div>

        <div className="xl:col-span-1 flex flex-col gap-4 min-w-0">
          <MonthSummary
            year={year}
            monthIdx={monthIdx}
            missions={missions}
            sectorsById={sectorsById}
          />
          <ActiveMissions sectorsById={sectorsById} />
          <TodayHabits sectorsById={sectorsById} />
          <TodayReminders sectorsById={sectorsById} />
        </div>
      </div>

      <DayDetailModal
        open={Boolean(selected)}
        date={selected?.date ?? null}
        missions={selectedMissions}
        sectorsById={sectorsById}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

export default function Forestos() {
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return localStorage.getItem(TAB_STORAGE_KEY) || 'panel';
    } catch {
      return 'panel';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(TAB_STORAGE_KEY, activeTab);
    } catch {
      /* ignore */
    }
  }, [activeTab]);

  return (
    <div className="fadein">
      <div className="mb-3">
        <div className="font-cinzel uppercase text-[18px] tracking-[.18em] text-[#1f1408]">
          ForestOS · Foco, Missões & Hábitos
        </div>
        <div className="font-eb text-[13px] text-[#5b4423]">
          painel de gabinete dedicado ao seu progresso pessoal
        </div>
        <Divider className="mt-2" />
      </div>

      {!SUPABASE_CONFIGURED && <NotConfiguredBanner />}

      <div className="forestos-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            className={`forestos-tab ${activeTab === t.id ? 'is-active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'panel' && <PanelTab />}
      {activeTab === 'cartography' && <ForestTree />}
    </div>
  );
}
