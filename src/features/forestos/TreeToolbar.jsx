export default function TreeToolbar({
  search,
  setSearch,
  sectorFilter,
  setSectorFilter,
  sectors,
  onExpandAll,
  onCollapseAll,
  onNewSector,
  onOpenMultiFocus,
  multiFocusDisabled,
  count,
}) {
  return (
    <div className="tree-toolbar">
      <div className="tree-toolbar-search">
        <svg viewBox="0 0 20 20" width="14" height="14" className="text-[#5b4423]">
          <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M14 14l4 4" stroke="currentColor" strokeWidth="1.6" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="buscar na floresta…"
          className="tree-toolbar-input"
        />
        {search && (
          <button type="button" className="tree-toolbar-clear" onClick={() => setSearch('')}>
            ×
          </button>
        )}
      </div>

      <select
        value={sectorFilter}
        onChange={(e) => setSectorFilter(e.target.value)}
        className="tree-toolbar-select"
        aria-label="filtrar por setor"
      >
        <option value="">todos os setores</option>
        {sectors
          .filter((s) => !s.archived)
          .map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
      </select>

      <div className="flex items-center gap-1">
        <button type="button" className="seal sm ghost" onClick={onExpandAll}>
          expandir tudo
        </button>
        <button type="button" className="seal sm ghost" onClick={onCollapseAll}>
          recolher tudo
        </button>
      </div>

      <div className="flex-1" />

      {typeof count === 'number' && (
        <div className="font-eb text-[11px] text-[#7a6442]">
          {count} {count === 1 ? 'elemento' : 'elementos'}
        </div>
      )}

      {onOpenMultiFocus && (
        <button
          type="button"
          className="seal sm"
          onClick={onOpenMultiFocus}
          disabled={multiFocusDisabled}
          title={multiFocusDisabled ? 'Já há uma sessão de foco ativa' : 'Iniciar uma sessão de foco com várias mini-missões'}
        >
          🍅 sessão multi-missão
        </button>
      )}

      <button type="button" className="seal sm dark" onClick={onNewSector}>
        + novo setor
      </button>
    </div>
  );
}
