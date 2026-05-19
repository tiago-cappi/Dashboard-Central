import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/AuthContext.jsx';
import AppShell from './components/layout/AppShell.jsx';
import Overview from './pages/Overview.jsx';
import Forestos from './pages/Forestos.jsx';
import Financas from './pages/Financas.jsx';
import Login from './pages/Login.jsx';
import { FinancasProvider } from './features/financas/FinancasContext.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1a0f06]">
        <div className="text-center">
          <div className="text-[#a88a3d] mb-4">carregando...</div>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  if (user) {
    return (
      <AppShell>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/forestos" element={<Forestos />} />
          <Route
            path="/financas"
            element={
              <FinancasProvider>
                <Financas />
              </FinancasProvider>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
