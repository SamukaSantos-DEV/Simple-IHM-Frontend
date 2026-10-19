import { useCallback, useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, Calendar, Wrench, User, FileText, Loader } from 'lucide-react';
import { apiErrorMessage, apiFetch } from '../../api';
import { isMaintenanceEditor } from '../../auth/session';
import { useAuth } from '../../auth/useAuth';

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

export default function MaintenancePage() {
  const { user } = useAuth();
  const canEdit = isMaintenanceEditor(user?.perfil);
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchMachines();
      void fetchTasks();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchMachines, fetchTasks]);

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

  return (
    <div className="min-h-screen p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-black tracking-tighter mb-2">Manutenção Preventiva</h1>
            <p className="text-sm opacity-60">
              {canEdit
                ? 'Agende e monitore as intervenções preventivas dos equipamentos'
                : 'Consulta de manutenções em modo somente leitura'}
            </p>
          </div>
          {canEdit && <button
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

        {error && (
          <div role="alert" className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Form */}
        {canEdit && showForm && (
          <div className="seamless-panel rounded-2xl p-8 mb-12 animate-in fade-in slide-in-from-top-4 duration-300">
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
        <div className="seamless-panel rounded-2xl p-8">
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
        </div>
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
    </div>
  );
}
