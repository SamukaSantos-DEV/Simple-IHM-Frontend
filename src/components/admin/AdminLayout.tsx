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
    'flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-xs font-bold transition-all shrink-0',
    active
      ? 'bg-ios-blue text-white shadow-md shadow-ios-blue/20'
      : 'bg-slate-200/70 text-slate-800 hover:bg-slate-300/80 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15',
  ].join(' ');

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-700 bg-slate-50 text-slate-900 dark:bg-black dark:text-white">
      <header className="border-b border-black/10 bg-white/30 px-3 py-2.5 backdrop-blur-md dark:border-white/10 dark:bg-black/20 md:px-6 md:py-3.5">
        <div className="mx-auto flex max-w-7xl flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
          
          {/* Topo: Seta para o Dashboard à esquerda, Logo no centro, Sair à direita (no mobile) */}
          <div className="flex w-full items-center justify-between md:w-auto md:justify-start md:gap-4">
            <Link
              to="/"
              aria-label="Voltar ao Dashboard"
              title="Voltar ao Dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200/70 text-slate-800 hover:bg-slate-300/90 dark:bg-white/10 dark:text-slate-100 dark:hover:bg-white/15 transition-all shadow-sm shrink-0"
            >
              <ArrowLeft size={18} />
            </Link>

            <div className="flex items-center gap-2">
              <img src={logo} alt="Simple IHM" className="h-8 w-auto object-contain sm:h-10" />
              <span className="text-[10px] font-black uppercase tracking-wider opacity-70 px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-white/10">
                {user?.perfil}
              </span>
            </div>

            {/* Botão Sair no topo direito (mobile) */}
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Sair da plataforma"
              title="Sair"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white transition-colors hover:bg-red-700 shadow-sm shrink-0 md:hidden"
            >
              <LogOut size={16} />
            </button>
          </div>

          {/* Opções de telas organizadas no espaço */}
          <nav
            aria-label="Navegação do painel"
            className="flex w-full items-center justify-start gap-1.5 overflow-x-auto py-1 scrollbar-clean sm:justify-center md:w-auto md:overflow-visible"
          >
            <Link
              to="/admin/machines"
              className={navigationButton(location.pathname === '/admin/machines')}
            >
              <Settings size={14} className="shrink-0" />
              <span>MÁQUINAS</span>
            </Link>
            {isAdmin && (
              <Link
                to="/admin/funcionarios"
                className={navigationButton(location.pathname === '/admin/funcionarios')}
              >
                <Users size={14} className="shrink-0" />
                <span>FUNCIONÁRIOS</span>
              </Link>
            )}
            <Link
              to="/admin/maintenance"
              className={navigationButton(location.pathname === '/admin/maintenance')}
            >
              <Wrench size={14} className="shrink-0" />
              <span>MANUTENÇÕES</span>
            </Link>
            {isAdmin && (
              <Link
                to="/admin/audit"
                className={navigationButton(location.pathname === '/admin/audit')}
              >
                <ClipboardList size={14} className="shrink-0" />
                <span>AUDITORIA</span>
              </Link>
            )}
          </nav>

          {/* Usuário e Botão Sair no topo direito (desktop) */}
          <div className="hidden items-center gap-3 md:flex">
            <span className="max-w-32 truncate text-xs font-bold opacity-80 lg:block">{user?.nome}</span>
            <button
              type="button"
              onClick={handleLogout}
              className="flex h-10 items-center justify-center gap-2 rounded-full bg-red-600 px-4 text-xs font-bold text-white transition-colors hover:bg-red-700 shadow-sm"
              title="Sair"
            >
              <LogOut size={14} />
              <span>SAIR</span>
            </button>
          </div>

        </div>
      </header>
      
      <main className="flex-1 bg-transparent">
        <Outlet />
      </main>
    </div>
  );
}
