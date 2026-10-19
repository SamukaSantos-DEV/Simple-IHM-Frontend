import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, RefreshCw } from 'lucide-react';
import { apiErrorMessage, apiFetch } from '../../api';

interface AuditLog {
  id: number;
  usuario_id?: number | null;
  usuario_nome?: string | null;
  usuario_email?: string | null;
  usuario_perfil?: string | null;
  acao: string;
  entidade: string;
  entidade_id?: number | null;
  detalhes?: string | null;
  criado_em: string;
}

function isAuditLog(value: unknown): value is AuditLog {
  return typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof value.id === 'number' &&
    'acao' in value &&
    typeof value.acao === 'string' &&
    'entidade' in value &&
    typeof value.entidade === 'string' &&
    'criado_em' in value &&
    typeof value.criado_em === 'string';
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAuditLogs = useCallback(async () => {
    try {
      const response = await apiFetch('/auditoria?limite=100');
      setError('');
      if (!response.ok) {
        setError(await apiErrorMessage(response, 'Não foi possível carregar os logs de auditoria.'));
        return;
      }
      const data: unknown = await response.json();
      if (!Array.isArray(data) || !data.every(isAuditLog)) {
        setError('A resposta de auditoria da API está em um formato inválido.');
        return;
      }
      setLogs(data);
    } catch (requestError) {
      console.error('Erro ao carregar auditoria:', requestError);
      setError('Não foi possível conectar à API para carregar a auditoria.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadAuditLogs(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadAuditLogs]);

  return (
    <div className="min-h-screen p-6 md:p-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter mb-2 flex items-center gap-3">
              <ClipboardList size={28} />
              Logs de Auditoria
            </h1>
            <p className="text-sm opacity-60">Registro somente leitura das ações realizadas na plataforma.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void loadAuditLogs();
            }}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-3 bg-ios-blue text-white rounded-full font-bold disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="seamless-panel rounded-2xl overflow-hidden">
          {loading && logs.length === 0 ? (
            <p className="p-8 text-center opacity-60">Carregando auditoria...</p>
          ) : logs.length === 0 ? (
            <p className="p-8 text-center opacity-60">Nenhum registro de auditoria encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="audit-table w-full min-w-[900px] text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-5 py-4">Data e hora</th>
                    <th className="px-5 py-4">Usuário</th>
                    <th className="px-5 py-4">Perfil</th>
                    <th className="px-5 py-4">Ação</th>
                    <th className="px-5 py-4">Entidade</th>
                    <th className="px-5 py-4">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {logs.map(log => (
                    <tr key={log.id} className="align-top transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                      <td className="px-5 py-4 whitespace-nowrap">
                        {new Date(log.criado_em).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold">{log.usuario_nome || 'Sistema'}</div>
                        <div className="text-xs opacity-60">{log.usuario_email || '—'}</div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">{log.usuario_perfil || '—'}</td>
                      <td className="px-5 py-4 font-semibold whitespace-nowrap">{log.acao}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {log.entidade}{log.entidade_id !== null && log.entidade_id !== undefined ? ` #${log.entidade_id}` : ''}
                      </td>
                      <td className="px-5 py-4 min-w-56">{log.detalhes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="border-t border-black/5 dark:border-white/5 px-5 py-3 text-xs opacity-60">
            Exibindo até 100 registros mais recentes.
          </p>
        </div>
      </div>
    </div>
  );
}
