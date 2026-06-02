import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X, Settings } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface Machine {
  id?: number;
  tag_maquina: string;
  nome_maquina: string;
  setor: string;
  data_cadastro?: string;
}

export default function MachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Machine>({
    tag_maquina: '',
    nome_maquina: '',
    setor: '',
  });

  // Carregar máquinas do servidor
  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/maquinas`, {
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMachines(data);
        localStorage.setItem('local_machines', JSON.stringify(data));
      } else {
        loadFallbackMachines();
      }
    } catch (error) {
      console.error('Erro ao carregar máquinas:', error);
      loadFallbackMachines();
    } finally {
      setLoading(false);
    }
  };

  const loadFallbackMachines = () => {
    const local = localStorage.getItem('local_machines');
    if (local) {
      setMachines(JSON.parse(local));
    } else {
      const mock: Machine[] = [
        { id: 1, tag_maquina: 'CNC-01', nome_maquina: 'Torno CNC Romi', setor: 'Usinagem' },
        { id: 4, tag_maquina: 'EST-01', nome_maquina: 'Esteira Transportadora Central', setor: 'Logistica' }
      ];
      setMachines(mock);
      localStorage.setItem('local_machines', JSON.stringify(mock));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const isLocalOnly = !window.navigator.onLine;
      let success = false;

      const payload = {
        tag_maquina: formData.tag_maquina,
        nome_maquina: formData.nome_maquina,
        setor: formData.setor,
      };
      
      if (!isLocalOnly) {
        try {
          if (editingId) {
            // Atualizar máquina existente
            const response = await fetch(`${API_BASE_URL}/maquinas/${editingId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
              },
              body: JSON.stringify(payload),
            });
            
            if (response.ok) {
              success = true;
            }
          } else {
            // Criar nova máquina
            const response = await fetch(`${API_BASE_URL}/maquinas`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
              },
              body: JSON.stringify(payload),
            });
            
            if (response.ok) {
              success = true;
            }
          }
        } catch {
          success = false;
        }
      }

      if (!success) {
        // Fallback local
        let updatedList = [...machines];
        if (editingId) {
          updatedList = machines.map(m => m.id === editingId ? { ...m, ...payload } : m);
        } else {
          const newMachine = {
            ...payload,
            id: Date.now(),
            data_cadastro: new Date().toISOString()
          };
          updatedList.push(newMachine);
        }
        setMachines(updatedList);
        localStorage.setItem('local_machines', JSON.stringify(updatedList));
        resetForm();
      } else {
        await fetchMachines();
        resetForm();
      }
    } catch (error) {
      console.error('Erro ao salvar máquina:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (machine: Machine) => {
    setFormData({
      tag_maquina: machine.tag_maquina,
      nome_maquina: machine.nome_maquina,
      setor: machine.setor,
    });
    setEditingId(machine.id || null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja deletar esta máquina?')) return;

    try {
      let success = false;
      try {
        const response = await fetch(`${API_BASE_URL}/maquinas/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          }
        });
        if (response.ok) {
          success = true;
        }
      } catch {
        success = false;
      }
      
      if (!success) {
        const updated = machines.filter(m => m.id !== id);
        setMachines(updated);
        localStorage.setItem('local_machines', JSON.stringify(updated));
      } else {
        await fetchMachines();
      }
    } catch (error) {
      console.error('Erro ao deletar máquina:', error);
    }
  };

  const resetForm = () => {
    setFormData({ tag_maquina: '', nome_maquina: '', setor: '' });
    setEditingId(null);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-black tracking-tighter mb-2">Gerenciar Máquinas</h1>
            <p className="text-sm opacity-60">Cadastre e gerencie as máquinas do seu sistema</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex cursor-pointer items-center gap-2 px-6 py-3 bg-ios-blue hover:bg-ios-blue/90 text-white rounded-full font-bold transition-all hover:scale-105"
          >
            <Plus size={20} />
            Nova Máquina
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="seamless-panel rounded-ios p-8 mb-12 animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
              <Settings size={24} />
              {editingId ? 'Editar Máquina' : 'Criar Nova Máquina'}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold mb-2 opacity-70">Tag da Máquina *</label>
                <input
                  type="text"
                  required
                  value={formData.tag_maquina}
                  onChange={(e) => setFormData({ ...formData, tag_maquina: e.target.value })}
                  className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 ring-ios-blue/30 transition-all text-slate-800 dark:text-slate-100"
                  placeholder="Ex: CNC-01"
                />
              </div>

              <div>
                <label className="block text-sm font-bold mb-2 opacity-70">Nome da Máquina *</label>
                <input
                  type="text"
                  required
                  value={formData.nome_maquina}
                  onChange={(e) => setFormData({ ...formData, nome_maquina: e.target.value })}
                  className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 ring-ios-blue/30 transition-all text-slate-800 dark:text-slate-100"
                  placeholder="Ex: Torno CNC Romi"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-2 opacity-70">Setor *</label>
                <input
                  type="text"
                  required
                  value={formData.setor}
                  onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
                  className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 ring-ios-blue/30 transition-all text-slate-800 dark:text-slate-100"
                  placeholder="Ex: Usinagem, Logística"
                />
              </div>

              <div className="md:col-span-2 flex gap-4 mt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-ios-green hover:bg-ios-green/90 text-white rounded-full font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Check size={18} />
                  {editingId ? 'Atualizar' : 'Criar'}
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

        {/* Machines List */}
        <div className="seamless-panel rounded-ios p-8">
          <h2 className="text-xl font-bold mb-6">
            Máquinas Cadastradas ({machines.length})
          </h2>

          {loading && !showForm ? (
            <div className="text-center py-12 opacity-60">Carregando...</div>
          ) : machines.length === 0 ? (
            <div className="text-center py-12 opacity-60">
              <p className="mb-4">Nenhuma máquina cadastrada</p>
              <button
                onClick={() => setShowForm(true)}
                className="text-ios-blue hover:underline font-bold cursor-pointer"
              >
                Criar primeira máquina
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {machines.map((machine) => (
                <div
                  key={machine.id}
                  className="border border-black/10 dark:border-white/10 rounded-xl p-6 hover:bg-black/5 dark:hover:bg-white/5 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-ios-blue/15 text-ios-blue rounded-md">
                          {machine.tag_maquina}
                        </span>
                        <h3 className="font-bold text-lg mt-2 mb-1">{machine.nome_maquina}</h3>
                        <p className="text-xs opacity-60">Setor: <strong>{machine.setor}</strong></p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end border-t border-black/5 dark:border-white/5 pt-3 mt-4">
                    <button
                      onClick={() => handleEdit(machine)}
                      className="p-2 hover:bg-ios-blue/20 rounded-lg transition-all text-ios-blue cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => machine.id && handleDelete(machine.id)}
                      className="p-2 hover:bg-ios-red/20 rounded-lg transition-all text-ios-red cursor-pointer"
                      title="Deletar"
                    >
                      <Trash2 size={16} />
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
