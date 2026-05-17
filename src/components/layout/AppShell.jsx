import { useEffect } from 'react';
import Topbar from './Topbar.jsx';
import Sidebar from './Sidebar.jsx';
import { FocusProvider, useFocus } from '../../features/forestos/FocusContext.jsx';
import FocusModal from '../../features/forestos/FocusModal.jsx';

const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function Shell({ children }) {
  const { profile } = useFocus();
  const now = new Date();
  const todayLabel = `${DAY_NAMES[now.getDay()]}, ${now.getDate()} ${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="app flex flex-col min-h-screen">
      <Topbar profile={profile} todayLabel={todayLabel} />
      <div className="col-3 flex-1">
        <Sidebar />
        <main className="min-w-0 px-5 py-5 overflow-x-hidden">{children}</main>
      </div>
      <FocusModal />
    </div>
  );
}

export default function AppShell({ children }) {
  return (
    <FocusProvider>
      <Shell>{children}</Shell>
    </FocusProvider>
  );
}
