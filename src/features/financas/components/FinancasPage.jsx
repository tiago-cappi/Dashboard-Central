import { useEffect, useState } from 'react';
import { SUPABASE_CONFIGURED } from '../../../lib/supabase.js';
import MonthNavigator from './MonthNavigator.jsx';
import SummaryCards from './SummaryCards.jsx';
import TransactionList from './TransactionList.jsx';
import TransactionForm from './TransactionForm.jsx';
import BalanceEvolutionChart from './BalanceEvolutionChart.jsx';
import CategoryCompositionChart from './CategoryCompositionChart.jsx';
import TopExpensesList from './TopExpensesList.jsx';
import HistoryChart from './HistoryChart.jsx';
import PeriodComparison from './PeriodComparison.jsx';
import CategoryHeatmap from './CategoryHeatmap.jsx';
import CategoryManager from './CategoryManager.jsx';
import BudgetPanel from './BudgetPanel.jsx';
import GoalsPanel from './GoalsPanel.jsx';
import InsightsPanel from './InsightsPanel.jsx';
import { useFinancas } from '../FinancasContext.jsx';

const TABS = [
  { id: 'painel',       label: 'Painel',       sub: 'saúde do mês' },
  { id: 'lancamentos',  label: 'Lançamentos',  sub: 'registro e filtros' },
  { id: 'historico',    label: 'Histórico',    sub: 'tendências' },
  { id: 'categorias',   label: 'Categorias',   sub: 'estrutura' },
  { id: 'orcamentos',   label: 'Orçamentos',   sub: 'metas mensais' },
  { id: 'insights',     label: 'Insights',     sub: 'análise automática' },
];

const TAB_STORAGE_KEY = 'financas.activeTab';

function NotConfiguredBanner() {
  return (
    <div className="panel mb-4">
      <header className="panel-header navy">
        <div className="title">Configuração pendente</div>
      </header>
      <div className="p-4 font-lora text-[14px] text-[#3a2a18] leading-relaxed">
        Copie <code className="font-num">.env.example</code> para{' '}
        <code className="font-num">.env</code> e preencha as variáveis de ambiente do Supabase.
        <br />
        Verifique também se o schema <code className="font-num">financas</code> está listado em{' '}
        <em>Supabase → Settings → API → Exposed schemas</em>.
      </div>
    </div>
  );
}

export default function FinancasPage() {
  const { selectedMonth, setSelectedMonth } = useFinancas();
  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem(TAB_STORAGE_KEY) || 'painel'; } catch { return 'painel'; }
  });
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);

  useEffect(() => {
    try { localStorage.setItem(TAB_STORAGE_KEY, activeTab); } catch { /* ignore */ }
  }, [activeTab]);

  function handleEditTransaction(tx) {
    setEditingTransaction(tx);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditingTransaction(null);
  }

  return (
    <div className="fadein">
      {!SUPABASE_CONFIGURED && <NotConfiguredBanner />}

      <div
        className="forestos-tabs"
        role="tablist"
        style={{ marginBottom: '1rem' }}
      >
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

      {activeTab === 'painel' && (
        <div className="flex flex-col gap-4">
          <MonthNavigator month={selectedMonth} onChange={setSelectedMonth} />
          <SummaryCards month={selectedMonth} />
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 flex flex-col gap-4">
              <BalanceEvolutionChart month={selectedMonth} />
              <CategoryCompositionChart month={selectedMonth} />
            </div>
            <div className="xl:col-span-1">
              <TopExpensesList month={selectedMonth} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'lancamentos' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <MonthNavigator month={selectedMonth} onChange={setSelectedMonth} />
            <button
              type="button"
              className="seal"
              onClick={() => { setEditingTransaction(null); setShowForm(true); }}
            >
              + Novo Lançamento
            </button>
          </div>
          <TransactionList month={selectedMonth} onEdit={handleEditTransaction} />
        </div>
      )}

      {activeTab === 'historico' && (
        <div className="flex flex-col gap-4">
          <HistoryChart />
          <PeriodComparison />
          <CategoryHeatmap />
        </div>
      )}

      {activeTab === 'categorias' && (
        <CategoryManager />
      )}

      {activeTab === 'orcamentos' && (
        <div className="flex flex-col gap-4">
          <MonthNavigator month={selectedMonth} onChange={setSelectedMonth} />
          <BudgetPanel month={selectedMonth} />
          <GoalsPanel />
        </div>
      )}

      {activeTab === 'insights' && (
        <InsightsPanel month={selectedMonth} />
      )}

      {showForm && (
        <TransactionForm
          transaction={editingTransaction}
          onClose={handleCloseForm}
        />
      )}
    </div>
  );
}
