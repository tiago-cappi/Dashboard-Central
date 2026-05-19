import { useState } from 'react';
import { useBudgets } from '../hooks/useBudgets.js';
import { useBudgetMutations } from '../hooks/useBudgetMutations.js';
import { useCategories } from '../hooks/useCategories.js';
import { formatBRL } from '../lib/money.js';

const BAND_COLORS = {
  ok:      { bar: '#4a6b3a', label: 'ok' },
  warning: { bar: '#a88a3d', label: '80–100%' },
  over:    { bar: '#6b1f2a', label: 'ultrapassado' },
};

function AddBudgetForm({ month, allCategories, onClose, mutations }) {
  const [catId, setCatId] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const despesas = allCategories.filter((c) => c.type === 'despesa' && !c.parent_id);

  async function save() {
    setSaving(true);
    setErr(null);
    const r = await mutations.upsert(catId, month, parseFloat(String(amount).replace(',', '.')));
    setSaving(false);
    if (r.ok) onClose();
    else setErr(r.error?.message);
  }

  return (
    <div className="border border-[#a88a3d]/40 bg-[#faf3e0] p-3 flex flex-col gap-3">
      <div className="flex gap-2 flex-wrap">
        <select
          value={catId}
          onChange={(e) => setCatId(e.target.value)}
          className="font-lora text-[13px] border border-[#a88a3d]/50 bg-white px-2 py-1 text-[#3a2a18] flex-1 min-w-[140px]"
        >
          <option value="">— Categoria —</option>
          {despesas.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Limite (R$)"
          className="num text-[13px] border border-[#a88a3d]/50 bg-white px-2 py-1 text-[#3a2a18] w-32"
        />
        <button type="button" className="seal dark" onClick={save} disabled={saving || !catId || !amount}>
          {saving ? '...' : 'Definir'}
        </button>
        <button type="button" className="seal ghost" onClick={onClose}>Cancelar</button>
      </div>
      {err && <div className="font-lora text-[12px] text-[#6b1f2a]">{err}</div>}
    </div>
  );
}

export default function BudgetPanel({ month }) {
  const { data: budgets, loading, error, refetch } = useBudgets(month);
  const mutations = useBudgetMutations();
  const { data: { flat } } = useCategories();
  const [showAdd, setShowAdd] = useState(false);

  async function handleRemove(id) {
    if (!window.confirm('Remover orçamento?')) return;
    await mutations.remove(id);
  }

  return (
    <div className="panel">
      <header className="panel-header wine">
        <div className="title">Orçamentos Mensais</div>
        <button type="button" className="seal sm ml-auto" onClick={() => setShowAdd(true)}>
          + Definir
        </button>
      </header>

      <div className="p-4 flex flex-col gap-3">
        {showAdd && (
          <AddBudgetForm
            month={month}
            allCategories={flat}
            mutations={mutations}
            onClose={() => setShowAdd(false)}
          />
        )}

        {loading && <div className="h-24 bg-[#e8d8b0]/40 animate-pulse" />}
        {error && <div className="font-lora text-[13px] text-[#6b1f2a]">Erro: {error.message} <button className="seal sm ml-1" onClick={refetch}>Tentar</button></div>}

        {!loading && !error && budgets.length === 0 && (
          <div className="font-eb smallcaps text-[12px] text-[#a88a3d] text-center py-4">
            Nenhum orçamento definido para este mês.
          </div>
        )}

        {!loading && !error && budgets.map((b) => {
          const pctDisplay = Math.min(b.percent * 100, 100);
          const band = BAND_COLORS[b.band];
          return (
            <div key={b.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block w-2 h-2"
                  style={{ background: b.categories?.color ?? '#a88a3d' }}
                />
                <span className="font-eb smallcaps text-[12px] text-[#3a2a18] flex-1">
                  {b.categories?.name ?? b.category_id}
                </span>
                <span className="num text-[12px] text-[#5b4423]">
                  {formatBRL(b.spent)} / {formatBRL(b.planned_amount)}
                </span>
                <span
                  className="font-eb smallcaps text-[10px] px-1 py-0.5"
                  style={{ color: band.bar, background: `${band.bar}18` }}
                >
                  {band.label}
                </span>
                <button
                  type="button"
                  className="seal sm ghost"
                  style={{ color: '#6b1f2a', borderColor: '#6b1f2a60' }}
                  onClick={() => handleRemove(b.id)}
                >
                  ✕
                </button>
              </div>
              <div className="h-2 bg-[#e8d8b0] rounded-none">
                <div
                  className="h-full transition-all"
                  style={{ width: `${pctDisplay}%`, background: band.bar }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
