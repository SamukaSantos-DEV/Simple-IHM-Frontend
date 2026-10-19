import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ClipboardList, LogOut, Wrench, Settings, Users } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import blackLogo from '../../assets/fonte preta.png';
import whiteLogo from '../../assets/fonte branca.png';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.perfil === 'ADMIN';
  const logo = document.documentElement.dataset.theme === 'dark' ? whiteLogo : blackLogo;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const navigationButton = (active = false) => [
    'flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 sm:px-4 text-xs font-bold transition-colors',
    active
      ? 'bg-ios-blue text-white shadow-sm'
      : 'bg-slate-200/70 text-slate-800 hover:bg-slate-300/80 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15',
  ].join(' ');

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-700 bg-slate-50 text-slate-900 dark:bg-black dark:text-white">
      <header className="flex flex-col items-center justify-between gap-4 border-b border-black/10 bg-white/30 px-4 py-4 backdrop-blur-md dark:border-white/10 dark:bg-black/20 md:flex-row md:px-6">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Simple IHM" className="h-16 w-24 object-contain" />
          <p className="text-[10px] font-black uppercase tracking-wider opacity-70">{user?.perfil}</p>
        </div>
        
        <nav aria-label="Navegação do painel" className="flex w-full flex-wrap items-center justify-center gap-2 md:w-auto">
          <Link to="/" className={navigationButton()}>
            <ArrowLeft size={14} />
            DASHBOARD
          </Link>
          <Link
            to="/admin/machines"
            className={navigationButton(location.pathname === '/admin/machines')}
          >
            <Settings size={14} />
            MÁQUINAS
          </Link>
          {isAdmin && (
            <Link
              to="/admin/funcionarios"
              className={navigationButton(location.pathname === '/admin/funcionarios')}
            >
              <Users size={14} />
              FUNCIONÁRIOS
            </Link>
          )}
          <Link
            to="/admin/maintenance"
            className={navigationButton(location.pathname === '/admin/maintenance')}
          >
            <Wrench size={14} />
            MANUTENÇÕES
          </Link>
          {isAdmin && (
            <Link
              to="/admin/audit"
              className={navigationButton(location.pathname === '/admin/audit')}
            >
              <ClipboardList size={14} />
              AUDITORIA
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4">
          <span className="hidden max-w-32 truncate text-xs font-bold opacity-80 lg:block">{user?.nome}</span>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-12 min-w-28 items-center justify-center gap-2 rounded-full bg-red-600 px-5 text-xs font-bold text-white transition-colors hover:bg-red-700"
          >
            <LogOut size={14} />
            <span>SAIR</span>
          </button>
        </div>
      </header>
      
      <main className="flex-1 bg-transparent">
        <Outlet />
      </main>
    </div>
  );
}
