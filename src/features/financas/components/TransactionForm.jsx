import { useEffect, useState } from 'react';
import { useCategories } from '../hooks/useCategories.js';
import { useTransactionMutations } from '../hooks/useTransactionMutations.js';
import { useRecurrenceMutations } from '../hooks/useRecurrenceMutations.js';
import { todayISO } from '../lib/dates.js';

const TYPE_LABELS = { receita: 'Receita', despesa: 'Despesa' };
const FREQ_LABELS = { semanal: 'Semanal', mensal: 'Mensal', anual: 'Anual' };

export default function TransactionForm({ transaction, onClose }) {
  const isEdit = Boolean(transaction && !transaction.isVirtual);
  const [type, setType] = useState(transaction?.type ?? 'despesa');
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '');
  const [date, setDate] = useState(transaction?.date ?? todayISO());
  const [description, setDescription] = useState(transaction?.description ?? '');
  const [categoryId, setCategoryId] = useState(transaction?.category_id ?? '');
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [frequency, setFrequency] = useState('mensal');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  const { data: { flat } } = useCategories();
  const mutations = useTransactionMutations();
  const recMutations = useRecurrenceMutations();

  const filteredCategories = flat.filter((c) => c.type === type && !c.parent_id);
  const subCategories = categoryId
    ? flat.filter((c) => c.parent_id === categoryId || c.id === categoryId)
    : [];

  // Reset categoria ao trocar tipo
  useEffect(() => {
    setCategoryId('');
  }, [type]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError(null);

    const amountNum = parseFloat(String(amount).replace(',', '.'));
    if (!amountNum || amountNum <= 0) {
      setFormError('Valor deve ser maior que zero.');
      return;
    }
    if (!categoryId) {
      setFormError('Selecione uma categoria.');
      return;
    }
    if (!description.trim()) {
      setFormError('Descrição é obrigatória.');
      return;
    }

    setSaving(true);
    const payload = { type, amount: amountNum, date, description: description.trim(), category_id: categoryId };

    let result;
    if (!isEdit && isRecurrent) {
      // Cria recorrência em vez de transação avulsa
      result = await recMutations.create({
        type,
        amount: amountNum,
        description: description.trim(),
        category_id: categoryId,
        frequency,
        start_date: date,
        end_date: endDate || null,
      });
    } else {
      result = isEdit
        ? await mutations.update(transaction.id, payload)
        : await mutations.create(payload);
    }

    setSaving(false);
    if (result.ok) {
      onClose();
    } else {
      setFormError(result.error?.message ?? 'Erro ao salvar.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(26,15,6,0.72)' }}
    >
      <div className="panel w-full max-w-md mx-4">
        <header className="panel-header wine">
          <div className="title">{isEdit ? 'Editar Lançamento' : 'Novo Lançamento'}</div>
        </header>

        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Tipo */}
          <div className="flex gap-2">
            {(['receita', 'despesa']).map((t) => (
              <button
                key={t}
                type="button"
                className={`seal flex-1 ${type === t ? 'dark' : 'ghost'}`}
                onClick={() => setType(t)}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          {/* Valor */}
          <label className="flex flex-col gap-1">
            <span className="font-eb smallcaps text-[12px] text-[#5b4423]">Valor (R$)</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="num border border-[#a88a3d]/60 bg-[#faf3e0] px-3 py-2 text-[14px] text-[#1f1408] focus:outline-none focus:border-[#a88a3d]"
              placeholder="0,00"
            />
          </label>

          {/* Data */}
          <label className="flex flex-col gap-1">
            <span className="font-eb smallcaps text-[12px] text-[#5b4423]">Data</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="num border border-[#a88a3d]/60 bg-[#faf3e0] px-3 py-2 text-[14px] text-[#1f1408] focus:outline-none focus:border-[#a88a3d]"
            />
          </label>

          {/* Descrição */}
          <label className="flex flex-col gap-1">
            <span className="font-eb smallcaps text-[12px] text-[#5b4423]">Descrição</span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              maxLength={200}
              className="font-lora border border-[#a88a3d]/60 bg-[#faf3e0] px-3 py-2 text-[14px] text-[#1f1408] focus:outline-none focus:border-[#a88a3d]"
              placeholder="Ex.: Conta de luz"
            />
          </label>

          {/* Categoria */}
          <label className="flex flex-col gap-1">
            <span className="font-eb smallcaps text-[12px] text-[#5b4423]">Categoria</span>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="font-lora border border-[#a88a3d]/60 bg-[#faf3e0] px-3 py-2 text-[14px] text-[#1f1408] focus:outline-none focus:border-[#a88a3d]"
            >
              <option value="">— Selecione —</option>
              {filteredCategories.map((c) => {
                const subs = flat.filter((s) => s.parent_id === c.id);
                if (subs.length > 0) {
                  return (
                    <optgroup key={c.id} label={c.name}>
                      <option value={c.id}>{c.name} (geral)</option>
                      {subs.map((s) => (
                        <option key={s.id} value={s.id}>— {s.name}</option>
                      ))}
                    </optgroup>
                  );
                }
                return <option key={c.id} value={c.id}>{c.name}</option>;
              })}
            </select>
          </label>

          {/* Recorrência (apenas para novos lançamentos) */}
          {!isEdit && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRecurrent}
                onChange={(e) => setIsRecurrent(e.target.checked)}
                className="w-4 h-4 accent-[#6b1f2a]"
              />
              <span className="font-eb smallcaps text-[12px] text-[#5b4423]">Lançamento recorrente</span>
            </label>
          )}

          {!isEdit && isRecurrent && (
            <div className="flex flex-col gap-3 border border-[#a88a3d]/40 bg-[#faf3e0] p-3">
              <label className="flex flex-col gap-1">
                <span className="font-eb smallcaps text-[11px] text-[#7a6442]">Frequência</span>
                <div className="flex gap-1">
                  {Object.entries(FREQ_LABELS).map(([val, lbl]) => (
                    <button
                      key={val}
                      type="button"
                      className={`seal sm flex-1 ${frequency === val ? 'dark' : 'ghost'}`}
                      onClick={() => setFrequency(val)}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-eb smallcaps text-[11px] text-[#7a6442]">Término (opcional)</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="num border border-[#a88a3d]/60 bg-white px-3 py-1.5 text-[13px] text-[#1f1408]"
                />
              </label>
            </div>
          )}

          {formError && (
            <div className="font-lora text-[13px] text-[#6b1f2a] border border-[#6b1f2a]/40 bg-[#fdf0f1] px-3 py-2">
              {formError}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" className="seal ghost" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="seal dark" disabled={saving}>
              {saving ? 'Salvando...' : isEdit ? 'Salvar' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
