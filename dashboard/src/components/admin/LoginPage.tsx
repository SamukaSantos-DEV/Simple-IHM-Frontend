import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Lock, User } from 'lucide-react';
import { API_BASE_URL } from '../../config';
import { useAuth } from '../../auth/useAuth';
import { isUserProfile } from '../../auth/session';

const BRAND_GRADIENT = 'linear-gradient(135deg, #812FFF 0%, #5CE1E6 100%)';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          email: username.trim(),
          senha: password
        })
      });

      if (!response.ok) {
        setError(response.status === 401
          ? 'E-mail ou senha incorretos.'
          : 'Não foi possível validar o acesso. Tente novamente.');
        return;
      }

      const result: unknown = await response.json();
      if (
        typeof result !== 'object' ||
        result === null ||
        !('access_token' in result) ||
        typeof result.access_token !== 'string' ||
        !('usuario' in result) ||
        typeof result.usuario !== 'object' ||
        result.usuario === null ||
        !('id' in result.usuario) ||
        typeof result.usuario.id !== 'number' ||
        !('nome' in result.usuario) ||
        typeof result.usuario.nome !== 'string' ||
        !('email' in result.usuario) ||
        typeof result.usuario.email !== 'string' ||
        !('perfil' in result.usuario) ||
        !isUserProfile(result.usuario.perfil)
      ) {
        setError('A resposta de autenticação da API está incompleta.');
        return;
      }

      login(result.access_token, {
        id: result.usuario.id,
        nome: result.usuario.nome,
        email: result.usuario.email,
        perfil: result.usuario.perfil,
      });
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Erro ao autenticar:', err);
      setError('Erro ao conectar ao servidor de autenticação.');
    } finally {
      setLoading(false);
    }
  };

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-white">
      <div className="absolute inset-0 bg-linear-to-br from-[#0f172a] to-[#000000] -z-10" />

      <div className="bg-[#060d1c] border border-white/15 rounded-3xl p-8 md:p-12 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-8">
          <h1 className="text-3xl font-black tracking-tighter">
            Simple <span className="bg-clip-text text-transparent italic pr-2" style={{ backgroundImage: BRAND_GRADIENT }}>IHM</span>
          </h1>
          <p className="text-xs opacity-50 mt-1 uppercase tracking-widest">Acesso à Plataforma</p>
        </div>

        {error && (
          <div className="mb-6 p-4 text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="relative">
            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ios-blue" />
            <input
              type="email"
              placeholder="E-mail do Funcionário"
              required
              disabled={loading}
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-black/80 border border-white/10 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-ios-blue transition-colors disabled:opacity-50"
            />
          </div>
          <div className="relative">
            <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ios-blue" />
            <input
              type="password"
              placeholder="Senha"
              required
              disabled={loading}
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-black/20 border border-white/10 rounded-xl pl-12 pr-4 py-3 outline-none focus:border-ios-blue transition-colors disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full cursor-pointer py-3 rounded-xl font-bold bg-white text-black hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ backgroundImage: BRAND_GRADIENT, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
          >
            {loading ? 'Verificando...' : 'Acessar Sistema'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs opacity-50">
          Acesso autorizado para funcionários cadastrados.
        </p>
      </div>
    </div>
  );
}
