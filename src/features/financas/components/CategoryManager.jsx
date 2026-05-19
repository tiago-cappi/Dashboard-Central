import { useState } from 'react';
import { useCategories } from '../hooks/useCategories.js';
import { useCategoryMutations } from '../hooks/useCategoryMutations.js';

const PALETTE = ['#6b1f2a','#a8553a','#4a5568','#a88a3d','#1f3a5f','#4a6b3a','#7a2230','#5b4423','#3a2818','#4a5568'];

function CategoryRow({ cat, children, onEdit, onDelete, indent }) {
  return (
    <div>
      <div
        className={`flex items-center gap-2 py-1.5 px-3 border-b border-[#a88a3d]/20 hover:bg-[#f5ead5]/60 transition-colors ${indent ? 'pl-8' : ''}`}
      >
        <span
          className="inline-block w-3 h-3 flex-none border border-[#a88a3d]/30"
          style={{ background: cat.color }}
        />
        <span className="font-eb smallcaps text-[13px] text-[#3a2a18] flex-1">{cat.name}</span>
        <span className="font-eb smallcaps text-[10px] text-[#7a6442] border border-[#a88a3d]/30 px-1">
          {cat.type === 'receita' ? 'Receita' : 'Despesa'}
        </span>
        {cat.is_system_suggested && (
          <span className="font-eb smallcaps text-[10px] text-[#a88a3d] border border-[#a88a3d]/30 px-1">
            sugerida
          </span>
        )}
        <button type="button" className="seal sm ghost" onClick={() => onEdit(cat)}>Editar</button>
        <button
          type="button"
          className="seal sm ghost"
          style={{ color: '#6b1f2a', borderColor: '#6b1f2a60' }}
          onClick={() => onDelete(cat)}
        >
          Excluir
        </button>
      </div>
      {children}
    </div>
  );
}

function EditModal({ cat, allCats, onClose, mutations }) {
  const [name, setName] = useState(cat.name);
  const [color, setColor] = useState(cat.color ?? '#a88a3d');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  async function save() {
    setSaving(true);
    setErr(null);
    const r = await mutations.update(cat.id, { name, color });
    setSaving(false);
    if (r.ok) onClose();
    else setErr(r.error?.message);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(26,15,6,0.72)' }}>
      <div className="panel w-full max-w-sm mx-4">
        <header className="panel-header wine"><div className="title">Editar Categoria</div></header>
        <div className="p-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="font-eb smallcaps text-[12px] text-[#5b4423]">Nome</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="font-lora border border-[#a88a3d]/60 bg-[#faf3e0] px-3 py-2 text-[14px] text-[#1f1408]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-eb smallcaps text-[12px] text-[#5b4423]">Cor</span>
            <div className="flex flex-wrap gap-1">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-6 h-6 border-2"
                  style={{ background: c, borderColor: color === c ? '#a88a3d' : 'transparent' }}
                />
              ))}
            </div>
          </label>
          {err && <div className="font-lora text-[13px] text-[#6b1f2a]">{err}</div>}
          <div className="flex gap-2 justify-end">
            <button type="button" className="seal ghost" onClick={onClose}>Cancelar</button>
            <button type="button" className="seal dark" onClick={save} disabled={saving}>Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ cat, allCats, onClose, mutations }) {
  const [reassignId, setReassignId] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const others = allCats.filter((c) => c.id !== cat.id && c.type === cat.type);

  async function confirm() {
    setSaving(true);
    setErr(null);
    const r = await mutations.remove(cat.id, reassignId || undefined);
    setSaving(false);
    if (r.ok) onClose();
    else setErr(r.error?.message);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(26,15,6,0.72)' }}>
      <div className="panel w-full max-w-sm mx-4">
        <header className="panel-header wine"><div className="title">Excluir Categoria</div></header>
        <div className="p-5 flex flex-col gap-4">
          <p className="font-lora text-[13px] text-[#3a2a18]">
            Excluir <strong>{cat.name}</strong>? Se houver lançamentos, selecione uma categoria para realocá-los.
          </p>
          <select
            value={reassignId}
            onChange={(e) => setReassignId(e.target.value)}
            className="font-lora border border-[#a88a3d]/60 bg-[#faf3e0] px-3 py-2 text-[13px] text-[#1f1408]"
          >
            <option value="">— Sem realocação (excluir se vazia) —</option>
            {others.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {err && <div className="font-lora text-[13px] text-[#6b1f2a]">{err}</div>}
          <div className="flex gap-2 justify-end">
            <button type="button" className="seal ghost" onClick={onClose}>Cancelar</button>
            <button type="button" className="seal dark" onClick={confirm} disabled={saving}>Excluir</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddModal({ onClose, mutations, allCats }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('despesa');
  const [color, setColor] = useState('#6b1f2a');
  const [parentId, setParentId] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  const roots = allCats.filter((c) => c.type === type && !c.parent_id);

  async function save() {
    setSaving(true);
    setErr(null);
    const r = await mutations.create({ name, type, color, parent_id: parentId || null });
    setSaving(false);
    if (r.ok) onClose();
    else setErr(r.error?.message);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(26,15,6,0.72)' }}>
      <div className="panel w-full max-w-sm mx-4">
        <header className="panel-header wine"><div className="title">Nova Categoria</div></header>
        <div className="p-5 flex flex-col gap-4">
          <div className="flex gap-2">
            {(['despesa', 'receita']).map((t) => (
              <button key={t} type="button" className={`seal flex-1 ${type === t ? 'dark' : 'ghost'}`} onClick={() => { setType(t); setParentId(''); }}>
                {t === 'despesa' ? 'Despesa' : 'Receita'}
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-1">
            <span className="font-eb smallcaps text-[12px] text-[#5b4423]">Nome</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="font-lora border border-[#a88a3d]/60 bg-[#faf3e0] px-3 py-2 text-[14px] text-[#1f1408]"
            />
          </label>
          {roots.length > 0 && (
            <label className="flex flex-col gap-1">
              <span className="font-eb smallcaps text-[12px] text-[#5b4423]">Subcategoria de (opcional)</span>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="font-lora border border-[#a88a3d]/60 bg-[#faf3e0] px-3 py-2 text-[13px]"
              >
                <option value="">— Categoria raiz —</option>
                {roots.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="font-eb smallcaps text-[12px] text-[#5b4423]">Cor</span>
            <div className="flex flex-wrap gap-1">
              {PALETTE.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} className="w-6 h-6 border-2"
                  style={{ background: c, borderColor: color === c ? '#a88a3d' : 'transparent' }} />
              ))}
            </div>
          </label>
          {err && <div className="font-lora text-[13px] text-[#6b1f2a]">{err}</div>}
          <div className="flex gap-2 justify-end">
            <button type="button" className="seal ghost" onClick={onClose}>Cancelar</button>
            <button type="button" className="seal dark" onClick={save} disabled={saving}>Criar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CategoryManager() {
  const { data: { flat, tree }, loading, error, refetch } = useCategories();
  const mutations = useCategoryMutations();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="panel">
      <header className="panel-header wine">
        <div className="title">Categorias</div>
        <button type="button" className="seal sm ml-auto" onClick={() => setAdding(true)}>
          + Nova
        </button>
      </header>

      {loading && <div className="h-32 m-4 bg-[#e8d8b0]/40 animate-pulse" />}
      {error && (
        <div className="p-4 font-lora text-[13px] text-[#6b1f2a]">
          Erro: {error.message}
          <button className="seal sm ml-2" onClick={refetch}>Tentar</button>
        </div>
      )}

      {!loading && !error && flat.length === 0 && (
        <div className="p-4 font-eb smallcaps text-[12px] text-[#a88a3d]">
          Nenhuma categoria.{' '}
          <button type="button" className="seal sm" onClick={() => mutations.seedDefaults()}>
            Carregar sugeridas
          </button>
        </div>
      )}

      {!loading && !error && flat.length > 0 && (
        <div>
          {tree.map((cat) => (
            <CategoryRow key={cat.id} cat={cat} onEdit={setEditing} onDelete={setDeleting} indent={false}>
              {cat.children?.map((sub) => (
                <CategoryRow key={sub.id} cat={sub} onEdit={setEditing} onDelete={setDeleting} indent />
              ))}
            </CategoryRow>
          ))}
        </div>
      )}

      {editing && (
        <EditModal cat={editing} allCats={flat} mutations={mutations} onClose={() => setEditing(null)} />
      )}
      {deleting && (
        <DeleteModal cat={deleting} allCats={flat} mutations={mutations} onClose={() => setDeleting(null)} />
      )}
      {adding && (
        <AddModal allCats={flat} mutations={mutations} onClose={() => setAdding(false)} />
      )}
    </div>
  );
}
