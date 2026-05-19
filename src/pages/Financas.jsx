import Divider from '../components/ornaments/Divider.jsx';
import FinancasPage from '../features/financas/components/FinancasPage.jsx';

export default function Financas() {
  return (
    <div className="fadein">
      <div className="mb-3">
        <div className="font-cinzel uppercase text-[18px] tracking-[.18em] text-[#1f1408]">
          Tesouraria &amp; Finanças
        </div>
        <div className="font-eb text-[13px] text-[#5b4423]">
          controle de receitas, despesas e metas financeiras
        </div>
        <Divider className="mt-2" />
      </div>
      <FinancasPage />
    </div>
  );
}
