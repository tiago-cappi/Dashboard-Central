import { useState } from 'react';
import { useTransactions } from '../hooks/useTransactions.js';
import { useTransactionMutations } from '../hooks/useTransactionMutations.js';
import { useFinancas } from '../FinancasContext.jsx';
import { formatBRL } from '../lib/money.js';
import { formatDateDisplay } from '../lib/dates.js';
import { computeSummary } from '../lib/aggregations.js';

const STATUS_LABELS = {
  realizado: { label: 'Realizado', color: '#4a6b3a' },
  previsto: { label: 'Previsto', color: '#a88a3d' },
  nao_confirmado: { label: 'Não confirmado', color: '#6b1f2a' },
};

function Skeleton() {
  return (
    <div className="flex flex-col gap-2 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-10 bg-[#e8d8b0]/60 animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-8 text-center">
      <div className="font-cinzel text-[13px] uppercase tracking-widest text-[#a88a3d] mb-2">
        Nenhum lançamento
      </div>
      <div className="font-lora text-[13px] text-[#5b4423]">
        Registre sua primeira receita ou despesa clicando em "Novo Lançamento".
      </div>
    </div>
  );
}

export default function TransactionList({ month, onEdit }) {
  const { activeFilters, setActiveFilters } = useFinancas();
  const [localType, setLocalType] = useState('');
  const [localQuery, setLocalQuery] = useState('');

  const filters = {
    month,
    type: activeFilters.type || localType || undefined,
    categoryId: activeFilters.categoryId || undefined,
    query: localQuery || undefined,
  };

  const { data: transactions, loading, error, refetch } = useTransactions(filters);
  const mutations = useTransactionMutations();

  const summary = computeSummary(transactions);

  async function handleDelete(tx) {
    if (!window.confirm(`Excluir "${tx.description}"?`)) return;
    const result = await mutations.remove(tx.id);
    if (!result.ok) alert(result.error?.message ?? 'Erro ao excluir.');
  }

  async function handleToggleUnconfirmed(tx) {
    if (tx.isVirtual) return;
    await mutations.setUnconfirmed(tx.id, !tx.unconfirmed);
  }

  function clearDrillDown() {
    setActiveFilters({});
  }

  if (loading) return <div className="panel"><Skeleton /></div>;

  if (error) return (
    <div className="panel">
      <div className="p-4 font-lora text-[13px] text-[#6b1f2a]">
        Erro ao carregar lançamentos: {error.message}
        <button className="seal sm ml-3" onClick={refetch}>Tentar novamente</button>
      </div>
    </div>
  );

  return (
    <div className="panel">
      <header className="panel-header wine">
        <div className="title">Lançamentos</div>
        {activeFilters.categoryId && (
          <button type="button" className="seal sm ml-auto" onClick={clearDrillDown}>
            ✕ Limpar filtro
          </button>
        )}
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 p-3 border-b border-[#a88a3d]/30">
        <select
          value={localType}
          onChange={(e) => setLocalType(e.target.value)}
          className="font-eb smallcaps text-[12px] border border-[#a88a3d]/50 bg-[#faf3e0] px-2 py-1 text-[#3a2a18]"
        >
          <option value="">Todos</option>
          <option value="receita">Receitas</option>
          <option value="despesa">Despesas</option>
        </select>

        <input
          type="search"
          placeholder="Buscar descrição..."
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          className="font-lora text-[13px] border border-[#a88a3d]/50 bg-[#faf3e0] px-3 py-1 text-[#3a2a18] flex-1 min-w-[160px] focus:outline-none focus:border-[#a88a3d]"
        />
      </div>

      {/* Totalizadores */}
      <div className="grid grid-cols-3 border-b border-[#a88a3d]/30">
        {[
          { label: 'Receitas', value: formatBRL(summary.income), color: '#4a6b3a' },
          { label: 'Despesas', value: formatBRL(summary.expense), color: '#6b1f2a' },
          { label: 'Saldo', value: formatBRL(summary.balance), color: summary.balance >= 0 ? '#4a6b3a' : '#6b1f2a' },
        ].map((item) => (
          <div key={item.label} className="p-3 text-center">
            <div className="font-eb smallcaps text-[11px] text-[#7a6442]">{item.label}</div>
            <div className="num text-[14px] font-semibold" style={{ color: item.color }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* Lista */}
      {transactions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#a88a3d]/30 bg-[#f0e4c4]/60">
                <th className="font-eb smallcaps text-left px-3 py-2 text-[#5b4423] font-normal">Data</th>
                <th className="font-eb smallcaps text-left px-3 py-2 text-[#5b4423] font-normal">Descrição</th>
                <th className="font-eb smallcaps text-left px-3 py-2 text-[#5b4423] font-normal">Categoria</th>
                <th className="font-eb smallcaps text-right px-3 py-2 text-[#5b4423] font-normal">Valor</th>
                <th className="font-eb smallcaps text-center px-3 py-2 text-[#5b4423] font-normal">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => {
                const st = STATUS_LABELS[tx.status] ?? STATUS_LABELS.realizado;
                const isIncome = tx.type === 'receita';
                return (
                  <tr
                    key={tx.id}
                    className="border-b border-[#a88a3d]/20 hover:bg-[#f5ead5]/70 transition-colors"
                  >
                    <td className="num px-3 py-2 text-[#5b4423] whitespace-nowrap">
                      {formatDateDisplay(tx.date)}
                    </td>
                    <td className="font-lora px-3 py-2 text-[#3a2a18]">
                      {tx.description}
                      {tx.isVirtual && (
                        <span className="ml-1 font-eb smallcaps text-[10px] text-[#a88a3d]">previsto</span>
                      )}
                      {tx.recurrence_id && !tx.isVirtual && (
                        <span className="ml-1 font-eb smallcaps text-[10px] text-[#5b4423]">↻</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="font-eb smallcaps text-[11px] px-1.5 py-0.5 border"
                        style={{
                          color: tx.categories?.color ?? '#5b4423',
                          borderColor: `${tx.categories?.color ?? '#a88a3d'}60`,
                          background: `${tx.categories?.color ?? '#a88a3d'}15`,
                        }}
                      >
                        {tx.categories?.name ?? '—'}
                      </span>
                    </td>
                    <td
                      className="num px-3 py-2 text-right font-semibold whitespace-nowrap"
                      style={{ color: isIncome ? '#4a6b3a' : '#6b1f2a' }}
                    >
                      {isIncome ? '+' : '-'} {formatBRL(tx.amount)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        title={tx.status === 'realizado' ? 'Marcar como não confirmado' : 'Marcar como realizado'}
                        className="font-eb smallcaps text-[10px] px-1.5 py-0.5 border cursor-pointer hover:opacity-80 transition-opacity"
                        style={{
                          color: st.color,
                          borderColor: `${st.color}60`,
                          background: `${st.color}12`,
                        }}
                        onClick={() => handleToggleUnconfirmed(tx)}
                        disabled={tx.isVirtual}
                      >
                        {st.label}
                      </button>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {!tx.isVirtual && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="seal sm ghost"
                            onClick={() => onEdit(tx)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="seal sm ghost"
                            style={{ color: '#6b1f2a', borderColor: '#6b1f2a60' }}
                            onClick={() => handleDelete(tx)}
                          >
                            Excluir
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
