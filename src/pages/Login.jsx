import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext.jsx';
import Divider from '../components/ornaments/Divider.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1f1408] via-[#2a1f0e] to-[#1a0f06] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="panel">
          <header className="panel-header navy">
            <div className="title">Central de Dados</div>
          </header>

          <div className="p-6">
            <div className="mb-6 text-center">
              <h1 className="font-cinzel text-[24px] text-[#f5e8b8] tracking-[.12em] uppercase mb-2">
                {isSignup ? 'Criar Conta' : 'Entrar'}
              </h1>
              <Divider />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-eb text-[11px] text-[#5b4423] mb-2 uppercase">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 font-lora text-[13px] bg-[#f5e8b8] text-[#1f1408] border border-[#a88a3d] rounded focus:outline-none focus:ring-2 focus:ring-[#a88a3d]"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label className="block font-eb text-[11px] text-[#5b4423] mb-2 uppercase">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 font-lora text-[13px] bg-[#f5e8b8] text-[#1f1408] border border-[#a88a3d] rounded focus:outline-none focus:ring-2 focus:ring-[#a88a3d]"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="p-3 bg-[#7a2230]/20 border border-[#7a2230] rounded text-[#d9a5a0] text-[12px] font-eb">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="seal w-full mt-6"
                style={{
                  background: loading ? '#5b4423' : 'linear-gradient(180deg, #4a6b3a 0%, #3a5430 100%)',
                  color: '#f5e8b8',
                  borderColor: '#2a3f22',
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Carregando...' : isSignup ? 'Criar Conta' : 'Entrar'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignup(!isSignup);
                  setError(null);
                }}
                className="text-[#a88a3d] hover:text-[#f5d87a] text-[12px] font-eb"
              >
                {isSignup ? 'Já tem conta? Entrar' : 'Não tem conta? Criar'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-[11px] text-[#7a6442]">
          <p>Demo: Use qualquer email e senha para testar</p>
        </div>
      </div>
    </div>
  );
}
