import Panel from '../components/layout/Panel.jsx';
import Divider from '../components/ornaments/Divider.jsx';
import { Link } from 'react-router-dom';

export default function Overview() {
  return (
    <div className="fadein">
      <div className="mb-3">
        <div className="font-cinzel uppercase text-[18px] tracking-[.18em] text-[#1f1408]">
          Visão Geral · Gabinete Executivo
        </div>
        <div className="font-eb text-[13px] text-[#5b4423]">
          panorama unificado de todos os domínios
        </div>
        <Divider className="mt-2" />
      </div>

      <Panel title="Câmaras Disponíveis" subtitle="navegação rápida" accent="wine">
        <p className="font-lora text-[14px] text-[#3a2a18] leading-relaxed mb-3">
          Este é o início da Super Dashboard. À medida que cada câmara for sendo construída, surgirá
          aqui o painel correspondente em estilo de gabinete renascentista. Por ora, a primeira
          câmara funcional é a do ForestOS.
        </p>
        <Link to="/forestos" className="seal dark">
          Entrar na Câmara do ForestOS →
        </Link>
      </Panel>
    </div>
  );
}
