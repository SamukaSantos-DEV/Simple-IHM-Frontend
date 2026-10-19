import { useCallback, useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, User, Mail, Briefcase, Clock } from 'lucide-react';
import { apiErrorMessage, apiFetch } from '../../api';
import { isUserProfile, type UserProfile } from '../../auth/session';

interface Funcionario {
  id?: number;
  nome: string;
  cargo: string;
  turno_trabalho: number;
  ativo?: boolean;
  email: string;
  senha?: string;
  perfil: UserProfile;
}

export default function FuncionariosPage() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<Funcionario>({
    nome: '',
    cargo: '',
    turno_trabalho: 1,
    email: '',
    senha: '',
    perfil: 'OPERADOR',
  });

  const fetchFuncionarios = useCallback(async () => {
    try {
      const response = await apiFetch('/funcionarios');
      if (response.ok) {
        const data = await response.json();
        setFuncionarios(data);
      } else {
        setError(await apiErrorMessage(response, 'Não foi possível carregar os funcionários.'));
        setFuncionarios([]);
      }
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
      setError('Não foi possível conectar à API para carregar os funcionários.');
      setFuncionarios([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void fetchFuncionarios(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchFuncionarios]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const payload: Partial<Funcionario> = {
        nome: formData.nome,
        cargo: formData.cargo,
        turno_trabalho: Number(formData.turno_trabalho),
        email: formData.email,
        perfil: formData.perfil,
      };

      if (!editingId) {
        payload.senha = formData.senha;
      }

      const response = await apiFetch(editingId ? `/funcionarios/${editingId}` : '/funcionarios', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setError(await apiErrorMessage(response, 'A API não permitiu salvar o funcionário.'));
        return;
      }
      await fetchFuncionarios();
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar funcionário:', error);
      setError('Não foi possível salvar o funcionário na API.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (func: Funcionario) => {
    setFormData({
      nome: func.nome,
      cargo: func.cargo,
      turno_trabalho: func.turno_trabalho,
      email: func.email,
      senha: '',
      perfil: func.perfil,
    });
    setEditingId(func.id || null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja deletar este funcionário?')) return;

    try {
      setError('');
      const response = await apiFetch(`/funcionarios/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        setError(await apiErrorMessage(response, 'A API não permitiu remover o funcionário.'));
        return;
      }
      await fetchFuncionarios();
    } catch (error) {
      console.error('Erro ao deletar funcionário:', error);
      setError('Não foi possível remover o funcionário na API.');
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      cargo: '',
      turno_trabalho: 1,
      email: '',
      senha: '',
      perfil: 'OPERADOR',
    });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-black tracking-tighter mb-2">Gerenciar Funcionários</h1>
            <p className="text-sm opacity-60">Cadastre e gerencie a equipe de técnicos e operadores</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex cursor-pointer items-center gap-2 px-6 py-3 bg-ios-blue hover:bg-ios-blue/90 text-white rounded-full font-bold transition-all hover:scale-105"
          >
            <Plus size={20} />
            Novo Funcionário
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="seamless-panel rounded-2xl p-8 mb-12 animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
              <User size={24} />
              {editingId ? 'Editar Funcionário' : 'Cadastrar Novo Funcionário'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold mb-2 opacity-70">Nome Completo *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 ring-ios-blue/30 transition-all text-slate-800 dark:text-slate-100"
                    placeholder="Ex: João da Silva"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 opacity-70">Cargo / Função *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 ring-ios-blue/30 transition-all text-slate-800 dark:text-slate-100"
                    placeholder="Ex: Técnico Mecânico, Operador"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 opacity-70">E-mail *</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 ring-ios-blue/30 transition-all text-slate-800 dark:text-slate-100"
                    placeholder="Ex: joao@empresa.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 opacity-70">Turno de Trabalho *</label>
                <select
                  required
                  value={formData.turno_trabalho}
                  onChange={(e) => setFormData({ ...formData, turno_trabalho: Number(e.target.value) })}
                  className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 ring-ios-blue/30 transition-all cursor-pointer text-slate-800 dark:text-slate-100"
                >
                  <option value={1} className="text-black dark:text-white bg-slate-100 dark:bg-slate-900">Turno 1 (06:00 - 14:00)</option>
                  <option value={2} className="text-black dark:text-white bg-slate-100 dark:bg-slate-900">Turno 2 (14:00 - 22:00)</option>
                  <option value={3} className="text-black dark:text-white bg-slate-100 dark:bg-slate-900">Turno 3 (22:00 - 06:00)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 opacity-70">Perfil de Acesso *</label>
                <select
                  required
                  value={formData.perfil}
                  onChange={(e) => {
                    if (isUserProfile(e.target.value)) {
                      setFormData({ ...formData, perfil: e.target.value });
                    }
                  }}
                  className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 ring-ios-blue/30 transition-all cursor-pointer text-slate-800 dark:text-slate-100"
                >
                  <option value="ADMIN" className="text-black dark:text-white bg-slate-100 dark:bg-slate-900">Administrador</option>
                  <option value="OPERADOR" className="text-black dark:text-white bg-slate-100 dark:bg-slate-900">Operador</option>
                  <option value="MANUTENCAO" className="text-black dark:text-white bg-slate-100 dark:bg-slate-900">Manutenção</option>
                </select>
              </div>

              {!editingId && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold mb-2 opacity-70">Senha de Acesso *</label>
                  <input
                    type="password"
                    required
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    className="w-full md:w-1/2 bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-1 ring-ios-blue/30 transition-all text-slate-800 dark:text-slate-100"
                    placeholder="Digite a senha inicial"
                  />
                </div>
              )}

              <div className="md:col-span-2 flex gap-4 mt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-ios-green hover:bg-ios-green/90 text-white rounded-full font-bold transition-all disabled:opacity-50 cursor-pointer text-sm"
                >
                  <Check size={18} />
                  {editingId ? 'Salvar Alterações' : 'Cadastrar'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gray-500/20 hover:bg-gray-500/30 text-gray-600 dark:text-gray-300 rounded-full font-bold transition-all cursor-pointer text-sm"
                >
                  <X size={18} />
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Employees List */}
        <div className="seamless-panel rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-6">
            Funcionários Cadastrados ({funcionarios.length})
          </h2>

          {loading && !showForm ? (
            <div className="text-center py-12 opacity-60">Carregando...</div>
          ) : funcionarios.length === 0 ? (
            <div className="text-center py-12 opacity-60">
              <p className="mb-4">Nenhum funcionário cadastrado</p>
              <button
                onClick={() => setShowForm(true)}
                className="text-ios-blue hover:underline font-bold cursor-pointer"
              >
                Cadastrar primeiro funcionário
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {funcionarios.map((func) => (
                <div
                  key={func.id}
                  className="border border-black/10 dark:border-white/10 rounded-xl p-6 hover:bg-black/5 dark:hover:bg-white/5 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4 gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-ios-blue/15 text-ios-blue flex items-center justify-center font-bold">
                          {func.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg leading-tight">{func.nome}</h3>
                          <span className="text-xs opacity-60 flex items-center gap-1 mt-1">
                            <Briefcase size={12} />
                            {func.cargo}
                          </span>
                          <span className="mt-1 block text-[10px] font-bold uppercase tracking-wide text-ios-blue">
                            {func.perfil === 'ADMIN' ? 'Administrador' : func.perfil === 'MANUTENCAO' ? 'Manutenção' : 'Operador'}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border whitespace-nowrap
                        ${func.ativo ? 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-400/50' : 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-400/50'}`}>
                        {func.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 text-xs opacity-75 border-t border-black/5 dark:border-white/5 pt-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="opacity-60" />
                        <span>{func.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="opacity-60" />
                        <span>Turno: <strong>Turno {func.turno_trabalho}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end border-t border-black/5 dark:border-white/5 pt-3">
                    <button
                      onClick={() => handleEdit(func)}
                      className="p-2 hover:bg-ios-blue/20 rounded-lg transition-all text-ios-blue cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => func.id && handleDelete(func.id)}
                      className="p-2 hover:bg-ios-red/20 rounded-lg transition-all text-ios-red cursor-pointer"
                      title="Deletar"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
