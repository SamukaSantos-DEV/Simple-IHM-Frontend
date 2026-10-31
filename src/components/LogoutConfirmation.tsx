import { useEffect } from 'react';
import { LogOut, X } from 'lucide-react';

interface LogoutConfirmationProps {
  onCancel: () => void;
  onConfirm: () => void;
}

export default function LogoutConfirmation({ onCancel, onConfirm }: LogoutConfirmationProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-md animate-in fade-in duration-200 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirmation-title"
        aria-describedby="logout-confirmation-description"
        className="relative my-auto w-full max-w-md overflow-hidden rounded-[1rem]  bg-white p-6 text-slate-900 shadow-[0_24px_80px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-200 dark:border-white/10 dark:bg-slate-900 dark:text-white sm:p-8"
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancelar saída"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <X size={18} />
        </button>

        

        <div className="text-center">
          <h2 id="logout-confirmation-title" className="text-xl font-bold tracking-tight sm:text-2xl">
            Deseja realmente sair?
          </h2>
          <p id="logout-confirmation-description" className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            Sua sessão será encerrada e você precisará entrar novamente para acessar a plataforma.
          </p>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            autoFocus
            onClick={onCancel}
            className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-slate-100 px-5 text-sm font-bold text-slate-700 transition-all hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-400/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-full bg-red-600 px-5 text-sm font-bold text-white transition-all hover:bg-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-500/30"
          >
            <LogOut size={16} />
            Confirmar saída
          </button>
        </div>
      </section>
    </div>
  );
}
