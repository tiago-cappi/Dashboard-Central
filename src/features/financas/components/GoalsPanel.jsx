import { useState } from 'react';
import { useGoals } from '../hooks/useGoals.js';
import { useGoalMutations } from '../hooks/useGoalMutations.js';
import { formatBRL, formatPercent } from '../lib/money.js';
import { formatDateDisplay, todayISO } from '../lib/dates.js';

function GoalCard({ goal, mutations }) {
  const [showAdd, setShowAdd] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const pctDisplay = Math.min(goal.percent * 100, 100);
  const barColor = goal.percent >= 1 ? '#4a6b3a' : goal.percent >= 0.8 ? '#a88a3d' : '#1f3a5f';

  async function addContrib() {
    setSaving(true);
    setErr(null);
    const r = await mutations.addContribution(goal.id, {
      amount: parseFloat(String(amount).replace(',', '.')),
      date,
      description: desc,
    });
    setSaving(false);
    if (r.ok) { setShowAdd(false); setAmount(''); setDesc(''); }
    else setErr(r.error?.message);
  }

  async function removeContrib(cid) {
    if (!window.confirm('Remover aporte?')) return;
    await mutations.removeContribution(cid);
  }

  return (
    <div className="border border-[#a88a3d]/30 bg-[#faf3e0] flex flex-col gap-3 p-4">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <div className="font-cinzel uppercase text-[12px] tracking-wider text-[#1f1408]">
            {goal.name}
          </div>
          {goal.target_date && (
            <div className="font-lora text-[11px] text-[#7a6442]">
              Prazo: {formatDateDisplay(goal.target_date)}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="num text-[14px] font-bold" style={{ color: barColor }}>
            {formatBRL(goal.accumulated)}
          </div>
          <div className="num text-[11px] text-[#7a6442]">
            de {formatBRL(goal.target_amount)} ({formatPercent(goal.percent)})
          </div>
        </div>
        <button
          type="button"
          className="seal sm ghost"
          style={{ color: '#6b1f2a', borderColor: '#6b1f2a60' }}
          onClick={() => mutations.archive(goal.id)}
        >
          Arquivar
        </button>
      </div>

      {/* Barra de progresso */}
      <div className="h-2 bg-[#e8d8b0]">
        <div className="h-full transition-all" style={{ width: `${pctDisplay}%`, background: barColor }} />
      </div>

      {goal.projectedDate && (
        <div className="font-lora text-[11px] text-[#7a6442]">
          Projeção: {formatDateDisplay(goal.projectedDate)} (com base nos aportes recentes)
        </div>
      )}

      {/* Aportes */}
      <div>
        <div className="flex items-center gap-1 mb-2">
          <span className="font-eb smallcaps text-[11px] text-[#7a6442]">Aportes</span>
          <button type="button" className="seal sm ghost ml-auto" onClick={() => setShowAdd(!showAdd)}>
            + Aporte
          </button>
        </div>

        {showAdd && (
          <div className="flex flex-wrap gap-2 mb-2">
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Valor (R$)"
              className="num text-[13px] border border-[#a88a3d]/50 bg-white px-2 py-1 w-28"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="num text-[13px] border border-[#a88a3d]/50 bg-white px-2 py-1"
            />
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Descrição (opcional)"
              className="font-lora text-[13px] border border-[#a88a3d]/50 bg-white px-2 py-1 flex-1 min-w-[120px]"
            />
            <button type="button" className="seal dark" onClick={addContrib} disabled={saving || !amount}>
              {saving ? '...' : 'Adicionar'}
            </button>
            <button type="button" className="seal ghost" onClick={() => setShowAdd(false)}>Cancelar</button>
            {err && <span className="font-lora text-[12px] text-[#6b1f2a] w-full">{err}</span>}
          </div>
        )}

        {goal.contributions?.length > 0 && (
          <div className="flex flex-col gap-1">
            {[...goal.contributions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-[12px]">
                <span className="num text-[#3a2a18] w-24">{formatDateDisplay(c.date)}</span>
                <span className="num font-semibold text-[#4a6b3a]">+{formatBRL(c.amount)}</span>
                {c.description && <span className="font-lora text-[#7a6442] truncate flex-1">{c.description}</span>}
                <button
                  type="button"
                  className="font-eb smallcaps text-[10px] text-[#6b1f2a] hover:underline"
                  onClick={() => removeContrib(c.id)}
                >
                  remover
                </button>
              </div>
            ))}
          </div>
        )}

        {!goal.contributions?.length && (
          <div className="font-lora text-[12px] text-[#a88a3d]">Nenhum aporte registrado.</div>
        )}
      </div>
    </div>
  );
}

function AddGoalForm({ onClose, mutations }) {
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  async function save() {
    setSaving(true);
    setErr(null);
    const r = await mutations.create({
      name,
      target_amount: parseFloat(String(target).replace(',', '.')),
      target_date: date || null,
    });
    setSaving(false);
    if (r.ok) onClose();
    else setErr(r.error?.message);
  }

  return (
    <div className="border border-[#a88a3d]/40 bg-[#faf3e0] p-4 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da meta"
          className="font-lora text-[13px] border border-[#a88a3d]/50 bg-white px-3 py-2 flex-1 min-w-[140px]"
        />
        <input
          type="number"
          step="0.01"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Valor-alvo (R$)"
          className="num text-[13px] border border-[#a88a3d]/50 bg-white px-2 py-2 w-36"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="num text-[13px] border border-[#a88a3d]/50 bg-white px-2 py-2"
        />
        <button type="button" className="seal dark" onClick={save} disabled={saving || !name || !target}>
          {saving ? '...' : 'Criar Meta'}
        </button>
        <button type="button" className="seal ghost" onClick={onClose}>Cancelar</button>
      </div>
      {err && <div className="font-lora text-[12px] text-[#6b1f2a]">{err}</div>}
    </div>
  );
}

export default function GoalsPanel() {
  const { data: goals, loading, error, refetch } = useGoals();
  const mutations = useGoalMutations();
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="panel">
      <header className="panel-header navy">
        <div className="title">Metas de Poupança</div>
        <button type="button" className="seal sm ml-auto" onClick={() => setShowAdd(true)}>
          + Nova Meta
        </button>
      </header>

      <div className="p-4 flex flex-col gap-4">
        {showAdd && <AddGoalForm mutations={mutations} onClose={() => setShowAdd(false)} />}

        {loading && <div className="h-24 bg-[#e8d8b0]/40 animate-pulse" />}
        {error && (
          <div className="font-lora text-[13px] text-[#6b1f2a]">
            Erro: {error.message}
            <button className="seal sm ml-1" onClick={refetch}>Tentar</button>
          </div>
        )}

        {!loading && !error && goals.length === 0 && (
          <div className="font-eb smallcaps text-[12px] text-[#a88a3d] text-center py-4">
            Nenhuma meta ativa. Crie a sua primeira meta acima.
          </div>
        )}

        {!loading && !error && goals.map((g) => (
          <GoalCard key={g.id} goal={g} mutations={mutations} />
        ))}
      </div>
    </div>
  );
}
