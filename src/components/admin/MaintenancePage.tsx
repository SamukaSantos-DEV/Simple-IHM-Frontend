import { useCallback, useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, Calendar, Wrench, User, FileText, Loader, Bell, BrainCircuit, ShieldCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { apiErrorMessage, apiFetch } from '../../api';
import { getAuthToken, isMaintenanceEditor } from '../../auth/session';
import { useAuth } from '../../auth/useAuth';
import { API_BASE_URL } from '../../config';

interface MaintenanceTask {
  id?: number;
  maquina_id: number;
  tag_maquina?: string;
  nome_maquina?: string;
  descricao_servico: string;
  data_agendada: string;
  concluida: boolean;
  data_conclusao_real?: string | null;
  funcionario_id?: number | null;
  nome_funcionario?: string | null;
  tipo_manutencao: string;
}

interface Machine {
  id: number;
  tag_maquina: string;
  nome_maquina: string;
  setor: string;
}

interface PredictiveAlert {
  id: number;
  maquina_id: number;
  tag_maquina: string;
  nome_maquina: string;
  diagnostico?: string | null;
  confianca?: number | null;
  pontuacao: number;
  severidade: 'baixa' | 'media' | 'alta';
  mensagem: string;
  minutos_ate_limite?: number | null;
  criado_em: string;
  atualizado_em: string;
  encerrado_em?: string | null;
  reconhecido_em?: string | null;
  reconhecido_por_nome?: string | null;
  manutencao_id?: number | null;
  manutencao_status?: 'pendente' | 'aprovada' | 'rejeitada' | null;
  manutencao_descricao?: string | null;
  manutencao_data_sugerida?: string | null;
  analisado_por_nome?: string | null;
  analisado_em?: string | null;
  analise_observacao?: string | null;
}

export default function MaintenancePage() {
  const { user } = useAuth();
  const canEdit = isMaintenanceEditor(user?.perfil);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [alerts, setAlerts] = useState<PredictiveAlert[]>([]);
  const [alertQueue, setAlertQueue] = useState<PredictiveAlert[]>([]);
  const [activeSection, setActiveSection] = useState<'maintenance' | 'predictive'>('maintenance');
  const [queueFilter, setQueueFilter] = useState<'pendente' | 'todos'>('pendente');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [approveAlert, setApproveAlert] = useState<PredictiveAlert | null>(null);
  const [rejectAlert, setRejectAlert] = useState<PredictiveAlert | null>(null);
  const [approvalDescription, setApprovalDescription] = useState('');
  const [approvalDate, setApprovalDate] = useState('');
  const [approvalObservation, setApprovalObservation] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dados do Formulário
  const [formData, setFormData] = useState({
    maquina_id: '',
    descricao_servico: '',
    data_agendada: new Date().toISOString().split('T')[0],
    tipo_manutencao: 'Preventiva',
  });

  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);

  const fetchMachines = useCallback(async () => {
    try {
      const response = await apiFetch('/maquinas');
      if (response.ok) {
        const data = await response.json();
        setMachines(data);
        if (data.length > 0) {
          setFormData(prev => prev.maquina_id ? prev : { ...prev, maquina_id: data[0].id.toString() });
        }
      } else {
        setError(await apiErrorMessage(response, 'Não foi possível carregar as máquinas.'));
      }
    } catch (error) {
      console.error('Erro ao carregar máquinas:', error);
      setError('Não foi possível conectar à API para carregar as máquinas.');
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const response = await apiFetch('/manutencoes');
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      } else {
        setError(await apiErrorMessage(response, 'Não foi possível carregar as manutenções.'));
        setTasks([]);
      }
    } catch (error) {
      console.error('Erro ao carregar tarefas de manutenção:', error);
      setError('Não foi possível conectar à API para carregar as manutenções.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPredictiveData = useCallback(async () => {
    try {
      const [alertsResponse, queueResponse] = await Promise.all([
        apiFetch('/alertas?apenas_abertos=true&limite=50'),
        apiFetch(`/alertas/solicitacoes?situacao=${queueFilter === 'todos' ? 'todas' : 'pendente'}&limite=50`),
      ]);

      if (alertsResponse.ok) setAlerts(await alertsResponse.json());
      if (queueResponse.ok) setAlertQueue(await queueResponse.json());
    } catch (error) {
      console.error('Erro ao carregar dados preditivos:', error);
    }
  }, [queueFilter]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchMachines();
      void fetchTasks();
      void fetchPredictiveData();
    }, 0);
    const pollId = window.setInterval(() => void fetchPredictiveData(), 15000);

    const token = getAuthToken();
    let alertSocket: WebSocket | null = null;
    if (token) {
      const socketUrl = new URL('/ws/alertas', API_BASE_URL);
      socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      socketUrl.searchParams.set('token', token);
      alertSocket = new WebSocket(socketUrl.toString());
      alertSocket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.alerta) void fetchPredictiveData();
        } catch {
          void fetchPredictiveData();
        }
      };
    }

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(pollId);
      if (alertSocket) alertSocket.close();
    };
  }, [fetchMachines, fetchTasks, fetchPredictiveData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    try {
      setLoading(true);
      setError('');

      const payload = {
        descricao_servico: formData.descricao_servico,
        data_agendada: formData.data_agendada,
        tipo_manutencao: formData.tipo_manutencao,
        ...(!editingId && { maquina_id: Number(formData.maquina_id) }),
      };
      const response = await apiFetch(editingId ? `/manutencoes/${editingId}` : '/manutencoes', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setError(await apiErrorMessage(response, 'A API não permitiu salvar a manutenção.'));
        return;
      }
      await fetchTasks();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar manutenção:', error);
      setError('Não foi possível salvar a manutenção na API.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (task: MaintenanceTask) => {
    if (!canEdit) return;
    setFormData({
      maquina_id: task.maquina_id.toString(),
      descricao_servico: task.descricao_servico,
      data_agendada: task.data_agendada,
      tipo_manutencao: task.tipo_manutencao,
    });
    setEditingId(task.id || null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!canEdit) return;
    if (!window.confirm('Tem certeza que deseja deletar esta manutenção?')) return;

    try {
      setError('');
      const response = await apiFetch(`/manutencoes/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        setError(await apiErrorMessage(response, 'A API não permitiu remover a manutenção.'));
        return;
      }
      await fetchTasks();
    } catch (error) {
      console.error('Erro ao deletar manutenção:', error);
      setError('Não foi possível remover a manutenção na API.');
    }
  };

  const handleOpenCompleteModal = (taskId: number) => {
    if (!canEdit) return;
    setCompletingTaskId(taskId);
  };

  const handleConfirmComplete = async () => {
    if (!completingTaskId) return;

    try {
      setLoading(true);
      setError('');
      const response = await apiFetch(`/manutencoes/${completingTaskId}/concluir`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        setError(await apiErrorMessage(response, 'A API não permitiu concluir a manutenção.'));
        return;
      }
      await fetchTasks();
    } catch (error) {
      console.error('Erro ao concluir manutenção:', error);
      setError('Não foi possível concluir a manutenção na API.');
    } finally {
      setCompletingTaskId(null);
      setLoading(false);
    }
  };

  const openApproveModal = (alert: PredictiveAlert) => {
    setApprovalDescription(alert.manutencao_descricao || '');
    setApprovalDate(alert.manutencao_data_sugerida || new Date().toISOString().split('T')[0]);
    setApprovalObservation('');
    setApproveAlert(alert);
  };

  const handleApprove = async () => {
    if (!approveAlert) return;
    try {
      setActionLoading(true);
      setError('');
      const response = await apiFetch(`/alertas/${approveAlert.id}/manutencao/aprovar`, {
        method: 'PATCH',
        body: JSON.stringify({
          descricao_servico: approvalDescription.trim() || null,
          data_agendada: approvalDate || null,
          observacao: approvalObservation.trim() || null,
        }),
      });
      if (!response.ok) {
        setError(await apiErrorMessage(response, 'Não foi possível aprovar a manutenção preditiva.'));
        return;
      }
      setApproveAlert(null);
      await Promise.all([fetchTasks(), fetchPredictiveData()]);
    } catch (error) {
      console.error('Erro ao aprovar manutenção preditiva:', error);
      setError('Não foi possível aprovar a manutenção preditiva.');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (alert: PredictiveAlert) => {
    setRejectionReason('');
    setRejectAlert(alert);
  };

  const handleReject = async () => {
    if (!rejectAlert) return;
    if (rejectionReason.trim().length < 3) {
      setError('Informe um motivo de rejeição com pelo menos 3 caracteres.');
      return;
    }
    try {
      setActionLoading(true);
      setError('');
      const response = await apiFetch(`/alertas/${rejectAlert.id}/manutencao/rejeitar`, {
        method: 'PATCH',
        body: JSON.stringify({ observacao: rejectionReason.trim() }),
      });
      if (!response.ok) {
        setError(await apiErrorMessage(response, 'Não foi possível rejeitar a solicitação preditiva.'));
        return;
      }
      setRejectAlert(null);
      await fetchPredictiveData();
    } catch (error) {
      console.error('Erro ao rejeitar manutenção preditiva:', error);
      setError('Não foi possível rejeitar a solicitação preditiva.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefreshPredictiveData = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    const startedAt = Date.now();
    await fetchPredictiveData();
    const remaining = Math.max(0, 650 - (Date.now() - startedAt));
    window.setTimeout(() => setIsRefreshing(false), remaining);
  };

  const resetForm = () => {
    setFormData({
      maquina_id: machines[0]?.id.toString() || '',
      descricao_servico: '',
      data_agendada: new Date().toISOString().split('T')[0],
      tipo_manutencao: 'Preventiva',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getStatusBadge = (concluida: boolean, dataAgendada: string) => {
    if (concluida) {
      return 'bg-green-500/20 text-green-600 border-green-400/50';
    }
    const isOverdue = new Date(dataAgendada) < new Date(new Date().setHours(0,0,0,0));
    if (isOverdue) {
      return 'bg-red-500/20 text-red-600 border-red-400/50';
    }
    return 'bg-yellow-500/20 text-yellow-600 border-yellow-400/50';
  };

  const getStatusLabel = (concluida: boolean, dataAgendada: string) => {
    if (concluida) return 'Concluída';
    const isOverdue = new Date(dataAgendada) < new Date(new Date().setHours(0,0,0,0));
    if (isOverdue) return 'Atrasada';
    return 'Agendada';
  };

  const getDiagnosisLabel = (diagnostico?: string | null) => {
    const labels: Record<string, string> = {
      desgaste_rolamento: 'Desgaste de rolamento',
      sobrecarga: 'Sobrecarga',
      queda_tensao: 'Queda de tensão',
      desbalanceamento: 'Desbalanceamento',
    };
    return diagnostico ? labels[diagnostico] || diagnostico.replaceAll('_', ' ') : 'Diagnóstico em andamento';
  };

  const predictiveTasks = tasks.filter((task) => task.tipo_manutencao?.toLowerCase() === 'preditiva');
  const preventiveTasks = tasks.filter((task) => task.tipo_manutencao?.toLowerCase() !== 'preditiva');

  return (
    <div className="min-h-screen p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tighter mb-2">Manutenções</h1>
            <p className="text-sm opacity-60">
              {canEdit
                ? 'Planeje intervenções preventivas e analise sugestões do monitor preditivo'
                : 'Consulta de manutenções e alertas preditivos'}
            </p>
          </div>
          {activeSection === 'maintenance' && canEdit && <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex cursor-pointer items-center gap-2 px-6 py-3 bg-ios-blue hover:bg-ios-blue/90 text-white rounded-full font-bold transition-all hover:scale-105"
          >
            <Plus size={20} />
            Agendar Manutenção
          </button>}
        </div>

        <div className="grid grid-cols-1 gap-3 mb-6 sm:grid-cols-3">
          <div className="seamless-panel rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-50">Preventivas</p>
                <p className="mt-1 text-2xl font-black">{preventiveTasks.length}</p>
              </div>
              <Wrench className="text-ios-blue opacity-70" size={22} />
            </div>
          </div>
          <div className="seamless-panel rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-50">Preditivas</p>
                <p className="mt-1 text-2xl font-black">{predictiveTasks.length}</p>
              </div>
              <BrainCircuit className="text-violet-500 opacity-70" size={22} />
            </div>
          </div>
          <div className="seamless-panel rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider opacity-50">Alertas abertos</p>
                <p className="mt-1 text-2xl font-black">{alerts.length}</p>
              </div>
              <Bell className="text-ios-orange opacity-70" size={22} />
            </div>
          </div>
        </div>

        <div className="maintenance-tab-shell mb-6 w-full sm:w-[430px]">
          <span
            aria-hidden="true"
            className="maintenance-tab-highlight"
            style={{
              transform: activeSection === 'maintenance' ? 'translateX(0)' : 'translateX(100%)',
            }}
          />
          <button
            type="button"
            onClick={() => setActiveSection('maintenance')}
            className={`maintenance-tab-button ${activeSection === 'maintenance' ? 'text-white' : 'opacity-70 hover:opacity-100'}`}
          >
            <Wrench size={15} />
            Manutenções
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('predictive')}
            className={`maintenance-tab-button ${activeSection === 'predictive' ? 'text-white' : 'opacity-70 hover:opacity-100'}`}
          >
            <BrainCircuit size={15} />
            Monitor preditivo
            {alertQueue.filter((item) => item.manutencao_status === 'pendente').length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-ios-red px-1 text-[10px] text-white">
                {alertQueue.filter((item) => item.manutencao_status === 'pendente').length}
              </span>
            )}
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        {activeSection === 'predictive' && (
          <div key="predictive-section" className="maintenance-section-enter space-y-6">
            <div className="seamless-panel rounded-2xl p-6">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold">Fila de aprovação</h2>
                  <p className="mt-1 text-xs opacity-60">A IA sugere. ADMIN ou MANUTENÇÃO decide.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="predictive-filter-shell">
                    <span
                      aria-hidden="true"
                      className="predictive-filter-highlight"
                      style={{ transform: queueFilter === 'pendente' ? 'translateX(0)' : 'translateX(100%)' }}
                    />
                    <button type="button" onClick={() => setQueueFilter('pendente')} className={`predictive-filter-button ${queueFilter === 'pendente' ? 'text-slate-900 dark:text-white' : 'opacity-60'}`}>Pendentes</button>
                    <button type="button" onClick={() => setQueueFilter('todos')} className={`predictive-filter-button ${queueFilter === 'todos' ? 'text-slate-900 dark:text-white' : 'opacity-60'}`}>Todas</button>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRefreshPredictiveData()}
                    disabled={isRefreshing}
                    className="flex h-10 items-center justify-center gap-2 rounded-full bg-black/5 px-3 text-xs font-bold transition-colors hover:bg-black/10 disabled:opacity-70 dark:bg-white/10 dark:hover:bg-white/15"
                    title="Atualizar fila"
                  >
                    <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
                    <span className="hidden sm:inline">Atualizar</span>
                  </button>
                </div>
              </div>

              {alertQueue.length === 0 ? (
                <div className="py-10 text-center">
                  <ShieldCheck className="mx-auto mb-3 text-ios-green" size={34} />
                  <p className="text-sm font-bold">Nenhuma solicitação nesta fila</p>
                  <p className="mt-1 text-xs opacity-60">Novos alertas aparecerão aqui automaticamente.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {alertQueue.map((alert) => (
                    <article key={alert.id} className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-300">
                            {alert.tag_maquina} · {alert.nome_maquina}
                          </span>
                          <h3 className="mt-1.5 font-bold">{getDiagnosisLabel(alert.diagnostico)}</h3>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase ${
                          alert.severidade === 'alta' ? 'border-red-400/50 bg-red-500/15 text-red-600 dark:text-red-300'
                            : alert.severidade === 'media' ? 'border-orange-400/50 bg-orange-500/15 text-orange-600 dark:text-orange-300'
                            : 'border-blue-400/50 bg-blue-500/15 text-blue-600 dark:text-blue-300'
                        }`}>
                          {alert.severidade}
                        </span>
                      </div>

                      <p className="mt-3 text-xs leading-relaxed opacity-70">{alert.mensagem}</p>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        {typeof alert.confianca === 'number' && (
                          <div className="rounded-xl bg-black/5 p-3 dark:bg-white/5">
                            <span className="block text-[9px] font-bold uppercase opacity-50">Confiança</span>
                            <strong>{Math.round(alert.confianca * 100)}%</strong>
                          </div>
                        )}
                        {typeof alert.minutos_ate_limite === 'number' && (
                          <div className="rounded-xl bg-black/5 p-3 dark:bg-white/5">
                            <span className="block text-[9px] font-bold uppercase opacity-50">Limite estimado</span>
                            <strong>{alert.minutos_ate_limite > 60 ? `${Math.round(alert.minutos_ate_limite / 60)} h` : `${Math.round(alert.minutos_ate_limite)} min`}</strong>
                          </div>
                        )}
                      </div>

                      {alert.manutencao_descricao && (
                        <div className="mt-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
                          <p className="text-[10px] font-bold uppercase opacity-50">Sugestão do modelo</p>
                          <p className="mt-1 text-xs">{alert.manutencao_descricao}</p>
                          {alert.manutencao_data_sugerida && (
                            <p className="mt-1 text-[11px] opacity-60">Data sugerida: {new Date(`${alert.manutencao_data_sugerida}T12:00:00`).toLocaleDateString('pt-BR')}</p>
                          )}
                        </div>
                      )}

                      {alert.manutencao_status === 'pendente' && canEdit ? (
                        <div className="mt-4 flex gap-2 border-t border-black/5 pt-4 dark:border-white/5">
                          <button type="button" onClick={() => openApproveModal(alert)} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ios-green px-4 py-2.5 text-xs font-bold text-white">
                            <Check size={15} /> Aprovar
                          </button>
                          <button type="button" onClick={() => openRejectModal(alert)} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-ios-red/10 px-4 py-2.5 text-xs font-bold text-ios-red">
                            <X size={15} /> Rejeitar
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4 border-t border-black/5 pt-3 text-xs dark:border-white/5">
                          {alert.manutencao_status === 'aprovada' && <span className="font-bold text-ios-green">Aprovada por {alert.analisado_por_nome || 'um técnico'}</span>}
                          {alert.manutencao_status === 'rejeitada' && (
                            <span className="font-bold text-ios-red">Rejeitada: {alert.analise_observacao || 'sem observação'}</span>
                          )}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </div>

            {alerts.length > 0 && (
              <div className="seamless-panel rounded-2xl p-6">
                <h2 className="mb-4 text-lg font-bold">Alertas ativos</h2>
                <div className="space-y-2">
                  {alerts.slice(0, 8).map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between gap-3 rounded-xl border border-black/5 px-4 py-3 dark:border-white/5">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold">{alert.tag_maquina} · {getDiagnosisLabel(alert.diagnostico)}</p>
                        <p className="mt-0.5 truncate text-[11px] opacity-60">{alert.mensagem}</p>
                      </div>
                      <AlertTriangle className={alert.severidade === 'alta' ? 'text-ios-red' : 'text-ios-orange'} size={18} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        {activeSection === 'maintenance' && canEdit && showForm && (
          <div key="maintenance-form" className="seamless-panel maintenance-section-enter rounded-2xl p-8 mb-12">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
              <Wrench size={24} />
              {editingId ? 'Editar Manutenção' : 'Agendar Nova Manutenção'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {!editingId && (
                <div>
                  <label className="block text-sm font-bold mb-2 opacity-70">Máquina *</label>
                  <select
                    required
                    value={formData.maquina_id}
                    onChange={(e) => setFormData({ ...formData, maquina_id: e.target.value })}
                    className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 ring-ios-blue/30 transition-all cursor-pointer text-slate-800 dark:text-slate-100"
                  >
                    {machines.map(m => (
                      <option key={m.id} value={m.id} className="text-black dark:text-white bg-slate-100 dark:bg-slate-900">
                        {m.nome_maquina} ({m.tag_maquina}) - Setor {m.setor}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className={editingId ? 'md:col-span-2' : ''}>
                <label className="block text-sm font-bold mb-2 opacity-70">Descrição do Serviço *</label>
                <input
                  type="text"
                  required
                  value={formData.descricao_servico}
                  onChange={(e) => setFormData({ ...formData, descricao_servico: e.target.value })}
                  className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 ring-ios-blue/30 transition-all text-slate-800 dark:text-slate-100"
                  placeholder="Ex: Troca de Filtros, Calibração de Eixo"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 opacity-70">Data Programada *</label>
                <input
                  type="date"
                  required
                  value={formData.data_agendada}
                  onChange={(e) => setFormData({ ...formData, data_agendada: e.target.value })}
                  className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 ring-ios-blue/30 transition-all text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 opacity-70">Tipo de Manutenção *</label>
                <select
                  required
                  value={formData.tipo_manutencao}
                  onChange={(e) => setFormData({ ...formData, tipo_manutencao: e.target.value })}
                  className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 ring-ios-blue/30 transition-all cursor-pointer text-slate-800 dark:text-slate-100"
                >
                  <option value="Preventiva" className="text-black dark:text-white bg-slate-100 dark:bg-slate-900">Preventiva</option>
                  <option value="Corretiva" className="text-black dark:text-white bg-slate-100 dark:bg-slate-900">Corretiva</option>
                  <option value="Preditiva" className="text-black dark:text-white bg-slate-100 dark:bg-slate-900">Preditiva</option>
                </select>
              </div>

              <div className="md:col-span-2 flex gap-4 mt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-ios-green hover:bg-ios-green/90 text-white rounded-full font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Check size={18} />
                  {editingId ? 'Atualizar' : 'Agendar'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gray-500/20 hover:bg-gray-500/30 text-gray-600 dark:text-gray-300 rounded-full font-bold transition-all cursor-pointer"
                >
                  <X size={18} />
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tasks List */}
        {activeSection === 'maintenance' && <div key="maintenance-list" className="seamless-panel maintenance-section-enter rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-6">
            Cronograma de Manutenções ({tasks.length})
          </h2>

          {loading && !showForm && completingTaskId === null ? (
            <div className="text-center py-12 opacity-60">Carregando...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 opacity-60">
              <p className="mb-4">Nenhuma manutenção agendada</p>
              {canEdit && <button
                onClick={() => setShowForm(true)}
                className="text-ios-blue hover:underline font-bold cursor-pointer"
              >
                Agendar primeira preventiva
              </button>}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`border border-black/10 dark:border-white/10 rounded-xl p-6 transition-all flex flex-col justify-between hover:bg-black/5 dark:hover:bg-white/5
                    ${task.concluida ? 'opacity-70' : ''}`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <div className="flex-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-black/5 dark:bg-white/10 rounded-md text-ios-blue">
                          {task.tag_maquina || `M-${task.maquina_id}`} - {task.nome_maquina}
                        </span>
                        <h3 className="font-bold text-lg mt-1.5">{task.descricao_servico}</h3>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap ${getStatusBadge(task.concluida, task.data_agendada)}`}>
                        {getStatusLabel(task.concluida, task.data_agendada)}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs opacity-65 mb-4 border-t border-black/5 dark:border-white/5 pt-3">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        <span>Agendado para: <strong>{new Date(task.data_agendada).toLocaleDateString('pt-BR')}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText size={14} />
                        <span>Tipo: <strong>{task.tipo_manutencao}</strong></span>
                      </div>
                      {task.concluida && (
                        <>
                          <div className="flex items-center gap-2 text-ios-green font-semibold">
                            <Check size={14} />
                            <span>Conclusão: {task.data_conclusao_real ? new Date(task.data_conclusao_real).toLocaleDateString('pt-BR') : ''}</span>
                          </div>
                          {task.nome_funcionario && (
                            <div className="flex items-center gap-2">
                              <User size={14} />
                              <span>Realizado por: <strong>{task.nome_funcionario}</strong></span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-between items-center mt-2 border-t border-black/5 dark:border-white/5 pt-3">
                    {canEdit && !task.concluida ? (
                      <label 
                        onClick={() => task.id && handleOpenCompleteModal(task.id)}
                        className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold opacity-80 hover:opacity-100 transition-opacity"
                      >
                        <input
                          type="checkbox"
                          checked={false}
                          readOnly
                          className="w-4 h-4 rounded text-ios-green focus:ring-0 border-black/20 dark:border-white/20 cursor-pointer"
                        />
                        <span>Concluir Manutenção</span>
                      </label>
                    ) : task.concluida ? (
                      <span className="text-xs font-bold text-ios-green flex items-center gap-1 select-none">
                        <Check size={14} />
                        Concluída
                      </span>
                    ) : <span />}

                    {canEdit && <div className="flex gap-1">
                      {!task.concluida && (
                        <button
                          onClick={() => handleEdit(task)}
                          className="p-2 hover:bg-ios-blue/20 rounded-lg transition-all text-ios-blue cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => task.id && handleDelete(task.id)}
                        className="p-2 hover:bg-ios-red/20 rounded-lg transition-all text-ios-red cursor-pointer"
                        title="Deletar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>}
      </div>

      {/* Modal de Conclusão */}
      {completingTaskId !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1a1a2e] border border-black/10 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Check className="text-ios-green" />
              Finalizar Manutenção
            </h3>
            <p className="text-xs opacity-75">
              A conclusão será registrada para o usuário autenticado: {user?.nome}.
            </p>

            <div className="flex gap-3 justify-end mt-4">
              <button
                onClick={handleConfirmComplete}
                className="px-5 py-2 bg-ios-green hover:bg-ios-green/90 text-white rounded-full font-bold text-xs cursor-pointer flex items-center gap-1.5"
              >
                {loading ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
                Confirmar Conclusão
              </button>
              <button
                onClick={() => setCompletingTaskId(null)}
                className="px-5 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-700 dark:text-gray-300 rounded-full font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {approveAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1a1a2e]">
            <h3 className="flex items-center gap-2 text-xl font-bold">
              <ShieldCheck className="text-ios-green" size={22} />
              Aprovar manutenção preditiva
            </h3>
            <p className="mt-2 text-xs opacity-65">
              {approveAlert.tag_maquina} · {getDiagnosisLabel(approveAlert.diagnostico)}
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="mb-2 block text-xs font-bold opacity-70">Descrição do serviço</span>
                <input
                  value={approvalDescription}
                  onChange={(event) => setApprovalDescription(event.target.value)}
                  minLength={5}
                  className="w-full rounded-xl border-none bg-black/5 px-4 py-3 text-sm outline-none ring-ios-blue/30 focus:ring-1 dark:bg-white/5"
                />
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold opacity-70">Data agendada</span>
                <input
                  type="date"
                  value={approvalDate}
                  onChange={(event) => setApprovalDate(event.target.value)}
                  className="w-full rounded-xl border-none bg-black/5 px-4 py-3 text-sm outline-none ring-ios-blue/30 focus:ring-1 dark:bg-white/5"
                />
              </label>
              <label>
                <span className="mb-2 block text-xs font-bold opacity-70">Observação</span>
                <input
                  value={approvalObservation}
                  onChange={(event) => setApprovalObservation(event.target.value)}
                  maxLength={500}
                  placeholder="Opcional"
                  className="w-full rounded-xl border-none bg-black/5 px-4 py-3 text-sm outline-none ring-ios-blue/30 focus:ring-1 dark:bg-white/5"
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setApproveAlert(null)} className="rounded-full bg-gray-500/20 px-5 py-2.5 text-xs font-bold opacity-80">
                Cancelar
              </button>
              <button type="button" onClick={() => void handleApprove()} disabled={actionLoading} className="flex items-center gap-2 rounded-full bg-ios-green px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">
                {actionLoading ? <Loader className="animate-spin" size={14} /> : <Check size={14} />}
                Aprovar e criar ordem
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#1a1a2e]">
            <h3 className="flex items-center gap-2 text-xl font-bold">
              <X className="text-ios-red" size={22} />
              Rejeitar solicitação
            </h3>
            <p className="mt-2 text-xs opacity-65">
              Informe o motivo. O nível atual da máquina será usado como novo normal pelo monitor.
            </p>
            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-bold opacity-70">Motivo da rejeição *</span>
              <textarea
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                minLength={3}
                maxLength={500}
                rows={4}
                className="w-full resize-none rounded-xl border-none bg-black/5 px-4 py-3 text-sm outline-none ring-ios-red/30 focus:ring-1 dark:bg-white/5"
                placeholder="Ex.: o equipamento está em inspeção e o comportamento é esperado"
              />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setRejectAlert(null)} className="rounded-full bg-gray-500/20 px-5 py-2.5 text-xs font-bold opacity-80">
                Cancelar
              </button>
              <button type="button" onClick={() => void handleReject()} disabled={actionLoading} className="flex items-center gap-2 rounded-full bg-ios-red px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">
                {actionLoading ? <Loader className="animate-spin" size={14} /> : <X size={14} />}
                Confirmar rejeição
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
