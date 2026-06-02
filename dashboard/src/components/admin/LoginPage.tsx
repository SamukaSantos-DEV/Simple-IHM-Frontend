import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User } from 'lucide-react';
import logo from '../../assets/hero.png';
import { API_BASE_URL } from '../../config';

const BRAND_GRADIENT = 'linear-gradient(135deg, #812FFF 0%, #5CE1E6 100%)';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

      if (response.ok) {
        const result = await response.json();
        if (result && result.status === 'Sucesso') {
          // Login bem-sucedido
          sessionStorage.setItem('admin_auth_token', `token_${result.usuario_id}`);
          sessionStorage.setItem('admin_user_name', result.nome);
          sessionStorage.setItem('admin_user_email', username.trim());
          navigate('/admin/machines');
        } else {
          setError(result?.mensagem || 'Falha ao autenticar. E-mail ou senha incorretos.');
        }
      } else {
        if (response.status === 401 || response.status === 400 || response.status === 404) {
          setError('E-mail ou senha incorretos.');
        } else {
          // Fallback local caso a API não responda ok
          const local = localStorage.getItem('local_funcionarios');
          if (local) {
            const list = JSON.parse(local);
            const user = list.find((f: any) => f.email?.toLowerCase().trim() === username.toLowerCase().trim());
            if (user) {
              if (user.ativo === false) {
                setError('Funcionário inativo no sistema.');
                setLoading(false);
                return;
              }
              sessionStorage.setItem('admin_auth_token', `token_${user.id}`);
              sessionStorage.setItem('admin_user_name', user.nome);
              sessionStorage.setItem('admin_user_email', user.email);
              navigate('/admin/machines');
              setLoading(false);
              return;
            }
          }
          setError('Erro ao validar login com a API.');
        }
      }
    } catch (err) {
      console.error(err);
      // Fallback local se estiver totalmente offline
      const local = localStorage.getItem('local_funcionarios');
      if (local) {
        const list = JSON.parse(local);
        const user = list.find((f: any) => f.email?.toLowerCase().trim() === username.toLowerCase().trim());
        if (user) {
          if (user.ativo === false) {
            setError('Funcionário inativo no sistema.');
            setLoading(false);
            return;
          }
          sessionStorage.setItem('admin_auth_token', `token_${user.id}`);
          sessionStorage.setItem('admin_user_name', user.nome);
          sessionStorage.setItem('admin_user_email', user.email);
          navigate('/admin/machines');
          setLoading(false);
          return;
        }
      }
      setError('Erro ao conectar ao servidor de autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 text-white">
      <div className="absolute inset-0 bg-linear-to-br from-[#0f172a] to-[#000000] -z-10" />

      <div className="bg-[#060d1c] border border-white/15 rounded-3xl p-8 md:p-12 w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="Logo" className="w-16 h-16 mb-4 brightness-125 contrast-125" />
          <h1 className="text-2xl font-black tracking-tighter">
            Admin <span className="bg-clip-text text-transparent italic pr-2" style={{ backgroundImage: BRAND_GRADIENT }}>Portal</span>
          </h1>
          <p className="text-xs opacity-50 mt-1 uppercase tracking-widest">Restricted Access</p>
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
              type="text"
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

        <button
          onClick={() => navigate('/')}
          className="w-full cursor-pointer text-center text-xs opacity-50 hover:opacity-100 transition-opacity mt-6 underline"
        >
          Voltar para a Dashboard Pública
        </button>
      </div>
    </div>
  );
}
