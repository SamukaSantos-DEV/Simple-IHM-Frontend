import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { ClipboardList, LogOut, Wrench, Settings, Users } from 'lucide-react';
import logo from '../../assets/hero.png';
import { useAuth } from '../../auth/useAuth';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.perfil === 'ADMIN';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-700 bg-slate-50 text-slate-900 dark:bg-black dark:text-white">
      <header className="flex flex-col md:flex-row justify-between items-center px-6 py-4 border-b border-black/10 dark:border-white/10 gap-4 bg-white/20 dark:bg-black/20 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-4">
          <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
          <div>
            <h1 className="font-bold tracking-tight">Simple <span className="opacity-50">IHM</span></h1>
            <p className="text-[10px] uppercase tracking-wider opacity-60">{user?.perfil}</p>
          </div>
        </Link>
        
        <div className="flex flex-wrap items-center justify-center gap-2 bg-black/5 dark:bg-white/5 p-1 rounded-xl">
          <Link
            to="/admin/machines"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all
              ${location.pathname === '/admin/machines'
                ? 'bg-ios-blue text-white shadow-md shadow-ios-blue/25'
                : 'opacity-70 hover:opacity-100'
              }`}
          >
            <Settings size={14} />
            MÁQUINAS
          </Link>
          {isAdmin && (
            <Link
              to="/admin/funcionarios"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all
                ${location.pathname === '/admin/funcionarios'
                  ? 'bg-ios-blue text-white shadow-md shadow-ios-blue/25'
                  : 'opacity-70 hover:opacity-100'
                }`}
            >
              <Users size={14} />
              FUNCIONÁRIOS
            </Link>
          )}
          <Link
            to="/admin/maintenance"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all
              ${location.pathname === '/admin/maintenance'
                ? 'bg-ios-blue text-white shadow-md shadow-ios-blue/25'
                : 'opacity-70 hover:opacity-100'
              }`}
          >
            <Wrench size={14} />
            MANUTENÇÕES
          </Link>
          {isAdmin && (
            <Link
              to="/admin/audit"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all
                ${location.pathname === '/admin/audit'
                  ? 'bg-ios-blue text-white shadow-md shadow-ios-blue/25'
                  : 'opacity-70 hover:opacity-100'
                }`}
            >
              <ClipboardList size={14} />
              AUDITORIA
            </Link>
          )}
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden lg:block text-xs opacity-60">{user?.nome}</span>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 py-2 px-4 rounded-lg cursor-pointer text-xs font-bold opacity-80 hover:opacity-100 transition-colors border border-red-200/50 dark:border-red-900/30"
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
