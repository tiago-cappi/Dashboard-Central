import { useInsights } from '../hooks/useInsights.js';

const KIND_CONFIG = {
  anomalia: { color: '#6b1f2a', bg: '#fdf0f1', border: '#6b1f2a40', icon: '⚠' },
  conquista: { color: '#4a6b3a', bg: '#f0f5ef', border: '#4a6b3a40', icon: '★' },
  alerta:   { color: '#a88a3d', bg: '#faf3e0', border: '#a88a3d50', icon: '!' },
};

export default function InsightsPanel({ month }) {
  const { data: insights, loading, error, insufficient, refetch } = useInsights(month);

  if (loading) return (
    <div className="panel">
      <header className="panel-header navy"><div className="title">Insights</div></header>
      <div className="m-4 h-24 bg-[#e8d8b0]/40 animate-pulse" />
    </div>
  );

  if (error) return (
    <div className="panel">
      <header className="panel-header navy"><div className="title">Insights</div></header>
      <div className="p-4 font-lora text-[13px] text-[#6b1f2a]">
        Erro: {error.message}
        <button className="seal sm ml-2" onClick={refetch}>Tentar</button>
      </div>
    </div>
  );

  if (insufficient) return (
    <div className="panel">
      <header className="panel-header navy"><div className="title">Insights</div></header>
      <div className="p-6 text-center">
        <div className="font-cinzel uppercase text-[12px] tracking-widest text-[#a88a3d] mb-2">
          Dados insuficientes
        </div>
        <div className="font-lora text-[13px] text-[#5b4423]">
          Registre lançamentos em pelo menos 3 meses para gerar insights automáticos.
        </div>
      </div>
    </div>
  );

  return (
    <div className="panel">
      <header className="panel-header navy">
        <div className="title">Insights Acionáveis</div>
        <div className="sub">análise automática</div>
      </header>

      <div className="p-4 flex flex-col gap-3">
        {insights.length === 0 && (
          <div className="font-eb smallcaps text-[12px] text-[#a88a3d] text-center py-4">
            Nenhum insight para este mês. Continue registrando seus lançamentos!
          </div>
        )}

        {insights.map((insight, i) => {
          const cfg = KIND_CONFIG[insight.kind] ?? KIND_CONFIG.alerta;
          return (
            <div
              key={i}
              className="flex gap-3 border p-3"
              style={{ borderColor: cfg.border, background: cfg.bg }}
            >
              <span
                className="font-cinzel text-[16px] mt-0.5 flex-none"
                style={{ color: cfg.color }}
              >
                {cfg.icon}
              </span>
              <div className="flex flex-col gap-0.5">
                <div
                  className="font-cinzel uppercase text-[11px] tracking-wider"
                  style={{ color: cfg.color }}
                >
                  {insight.kind === 'anomalia' ? 'Anomalia Detectada' :
                   insight.kind === 'conquista' ? 'Conquista' : 'Alerta'}
                </div>
                <div className="font-lora text-[13px] text-[#3a2a18] font-semibold">
                  {insight.title}
                </div>
                <div className="font-lora text-[12px] text-[#5b4423]">
                  {insight.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
