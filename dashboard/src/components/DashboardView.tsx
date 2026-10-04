import { useState } from 'react';
import {
  Clock, Zap, Sun, Moon, Filter,
  Activity as ActivityIcon, ChevronDown, Check, BarChart3,
  TrendingUp, AlertTriangle, ShieldCheck, Wrench, ShieldAlert,
  ListFilter
} from 'lucide-react';
import VibrationChart from './VibrationChart';
import HistoryChart from './HistoryChart';
import UptimeDailyChart from './UptimeDailyChart';
import LiveMetricChart from './LiveMetricChart';
import StatusIndicator from './StatusIndicator';
import Grainient from './Grainient';
import logo from '../assets/hero.png';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';

const BRAND_GRADIENT = 'linear-gradient(135deg, #812FFF 0%, #5CE1E6 100%)';

interface DashboardViewProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  status: boolean;
  isSocketConnected: boolean;
  isServerSignal: boolean;
  uptime: string;
  downtime: string;
  power: number;
  voltage: number;
  current: number;
  vibrationHz: number;
  vibrationStructural: number;
  vibrationData: number[];
  liveValueData: number[];
  historyData: { time: string; status: number }[];
  dailyUptimeData: any[];
  availableMachines?: { id: number | string, name: string, tag?: string }[];
  selectedMachineId?: number | string | null;
  setSelectedMachineId?: (id: number | string) => void;
  productiveRanking?: { name: string, efficiency: number }[];
  stopsRanking?: { name: string, stops: number }[];
  shiftProductivity?: { shift: string, productivity: number }[];
  maintenanceTasks?: any[];
  telemetryLogs?: any[];
}

export default function DashboardView(props: DashboardViewProps) {
  const {
    darkMode, setDarkMode,
    status,
    isSocketConnected, isServerSignal,
    uptime, downtime, power, voltage, current,
    vibrationHz, vibrationStructural,
    vibrationData, liveValueData, historyData, dailyUptimeData,
    availableMachines, selectedMachineId, setSelectedMachineId,
    productiveRanking = [], stopsRanking = [], shiftProductivity = [],
    maintenanceTasks = [], telemetryLogs = []
  } = props;

  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'monitoring' | 'reports' | 'maintenance'>('monitoring');
  const [historyPeriod, setHistoryPeriod] = useState<'day' | 'week' | 'month'>('day');

  // Filtrar tarefas de manutenção para a máquina selecionada
  const activeMaintenance = maintenanceTasks.filter(t =>
    selectedMachineId !== undefined && selectedMachineId !== null && t.machineId.toString() === selectedMachineId.toString()
  );

  const pendingCount = activeMaintenance.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  const overdueCount = activeMaintenance.filter(t => t.status === 'overdue').length;
  const completedCount = activeMaintenance.filter(t => t.status === 'completed').length;

  // Opção do gráfico de turno em ECharts
  const shiftChartOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}s ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      bottom: '0%',
      left: 'center',
      textStyle: { color: darkMode ? '#fff' : '#000', fontSize: 10 }
    },
    series: [
      {
        name: 'Produtividade por Turno',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['50%', '40%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: darkMode ? '#121212' : '#fff',
          borderWidth: 2
        },
        label: { show: false },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
            color: darkMode ? '#fff' : '#000'
          }
        },
        labelLine: { show: false },
        data: shiftProductivity.map((s, idx) => {
          const colors = ['#812FFF', '#5CE1E6', '#FF9500'];
          return {
            value: s.productivity,
            name: s.shift,
            itemStyle: { color: colors[idx % colors.length] }
          };
        })
      }
    ]
  };

  // Gráfico mensal de eficiência
  const monthlyChartOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'category',
      data: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
      axisLine: { lineStyle: { color: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' } },
      axisLabel: { color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { formatter: '{value}%', color: darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' },
      splitLine: { lineStyle: { color: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' } }
    },
    series: [{
      data: [89, 92, 85, 94],
      type: 'bar',
      itemStyle: {
        color: '#5CE1E6',
        borderRadius: [4, 4, 0, 0]
      }
    }]
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-400/50';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-400/50';
      case 'overdue':
        return 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-400/50';
      case 'pending':
      default:
        return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-400/50';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluída';
      case 'in_progress':
        return 'Em Andamento';
      case 'overdue':
        return 'Atrasada';
      case 'pending':
      default:
        return 'Agendada';
    }
  };

  return (
    <div className="p-6 md:p-12 min-h-screen overflow-x-hidden">
      {/* Background aurora fluid effect */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <Grainient
          color1={darkMode ? "#350046" : "#dbc8ff"}
          color2={darkMode ? "#00222d" : "#cbfcff"}
          color3={darkMode ? "#111111" : "#eeeeee"}
          timeSpeed={0.15}
          colorBalance={0}
          warpStrength={1}
          warpFrequency={4}
          warpSpeed={4}
          warpAmplitude={40}
          blendAngle={0}
          blendSoftness={0.1}
          rotationAmount={300}
          noiseScale={1.5}
          grainAmount={0.05}
          grainScale={1.5}
          grainAnimated={true}
          contrast={darkMode ? 1.3 : 1.05}
          gamma={1}
          saturation={darkMode ? 1.1 : 0.7}
          centerX={0}
          centerY={0}
          zoom={1}
        />
      </div>
      <div className="scroll-reveal-mask" />

      {/* Header */}
      <header className="flex justify-between items-center mb-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <img
              src={logo}
              alt="Logo"
              className={`w-14 h-14 object-contain transition-all duration-700 ${darkMode ? 'brightness-125 contrast-125 drop-shadow-[0_0_15px_rgba(129,47,255,0.6)]' : 'brightness-100'}`}
            />
            <div className="absolute inset-0 bg-ios-blue/30 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-3xl font-black tracking-tighter leading-none ">
              Simple <span className="bg-clip-text text-transparent italic pr-1" style={{ backgroundImage: BRAND_GRADIENT }}>IHM</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-40 mt-1 font-bold">Industrial Control System</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <StatusIndicator isConnected={isSocketConnected} isServerSignal={isServerSignal} />

          {availableMachines && availableMachines.length > 0 && setSelectedMachineId && (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-2 text-sm font-bold outline-none hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer backdrop-blur-md text-slate-500 whitespace-nowrap shrink-0"
              >
                <span className="hidden md:inline">
                  {availableMachines.find(m => m.id.toString() === selectedMachineId?.toString())?.name || 'Selecione a Máquina'}
                </span>
                <span className="inline md:hidden">
                  {availableMachines.find(m => m.id.toString() === selectedMachineId?.toString())?.tag || availableMachines.find(m => m.id.toString() === selectedMachineId?.toString())?.name || 'Máquina'}
                </span>
                <ChevronDown size={16} className={`transition-transform duration-300 shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-white/95 dark:bg-[#1a1a2e]/95 border border-black/10 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 backdrop-blur-xl transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-1.5 flex flex-col gap-1">
                      {availableMachines.map(m => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setSelectedMachineId(m.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between text-left px-3 py-2.5 text-xs rounded-lg transition-all duration-200 cursor-pointer gap-2
                            ${selectedMachineId?.toString() === m.id.toString()
                              ? 'bg-ios-blue text-white font-bold shadow-md shadow-ios-blue/20'
                              : 'text-slate-700 dark:text-white hover:bg-black/5 dark:hover:bg-white/10 font-bold'
                            }`}
                        >
                          <span className="hidden md:inline truncate">{m.name}</span>
                          <span className="inline md:hidden truncate">{m.tag || m.name}</span>
                          {selectedMachineId?.toString() === m.id.toString() && <Check size={16} className="text-white shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <button
            onClick={() => setDarkMode(!darkMode)}
            className="theme-btn"
          >
            {darkMode ? <Sun size={24} className="text-yellow-400" /> : <Moon size={24} className="text-slate-600" />}
            <span className="theme-btn-text">{darkMode ? 'Dark' : 'Light'}</span>
          </button>
        </div>
      </header>

      {/* Tabs Navigation (Horizontal) */}
      <div className="flex justify-center mb-12 max-w-7xl mx-auto w-full">
        <div className={`flex p-1.5 rounded-2xl border backdrop-blur-md shadow-lg gap-2 overflow-hidden ${darkMode
          ? 'bg-black/10 border-white/5 shadow-black/40'
          : 'bg-white/80 border-black/10 shadow-black/5'
          }`}>
          <button
            onClick={() => setActiveTab('monitoring')}
            className={`px-6 py-3 rounded-xl text-xs md:text-sm font-bold tracking-tight transition-all duration-300 cursor-pointer flex items-center gap-2 border
              ${activeTab === 'monitoring'
                ? 'bg-gradient-to-r from-[#2B0A5C] to-[#063A63] text-white shadow-lg shadow-purple-900/10 border-black/50' : darkMode
                  ? 'bg-white/5 border-white/5 hover:bg-white/15 text-slate-200'
                  : 'bg-black/5 border-black/5 hover:bg-black/10 text-slate-800'
              }`}
          >
            <TrendingUp size={16} />
            Monitoramento
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-6 py-3 rounded-xl text-xs md:text-sm font-bold tracking-tight transition-all duration-300 cursor-pointer flex items-center gap-2 border
              ${activeTab === 'reports'
                ? 'bg-gradient-to-r from-[#2B0A5C] to-[#063A63] text-white shadow-lg shadow-purple-900/10 border-black/50'
                : darkMode
                  ? 'bg-white/5 border-white/5 hover:bg-white/15 text-slate-200'
                  : 'bg-black/5 border-black/5 hover:bg-black/10 text-slate-800'
              }`}
          >
            <BarChart3 size={16} />
            Relatórios & Rankings
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`px-6 py-3 rounded-xl text-xs md:text-sm font-bold tracking-tight transition-all duration-300 cursor-pointer flex items-center gap-2 relative border
              ${activeTab === 'maintenance'
                ? 'bg-gradient-to-r from-[#2B0A5C] to-[#063A63] text-white shadow-lg shadow-purple-900/10 border-black/50'
                : darkMode
                  ? 'bg-white/5 border-white/5 hover:bg-white/15 text-slate-200'
                  : 'bg-black/5 border-black/5 hover:bg-black/10 text-slate-800'
              }`}
          >
            <Wrench size={16} />
            Manutenção Preventiva
            {overdueCount > 0 && (
              <span className="w-2.5 h-2.5 bg-ios-red rounded-full shadow-md shadow-ios-red/50 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* Main Grid Views based on Tab */}
      <main
          className={`max-w-7xl mx-auto min-h-[500px] transition-transform duration-300`}
      >
        {activeTab === 'monitoring' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* TELEMETRY DETAILS & CHARTS */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

              {/* Left Column: System Status */}
              <div className="md:col-span-3 flex flex-col items-center gap-8">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs font-black uppercase tracking-widest opacity-35">Status do Sistema</p>
                  <div className={`flex items-center gap-3 rounded-full border px-6 py-4 ${
                    status
                      ? 'border-ios-green/30 bg-ios-green/10 text-ios-green'
                      : 'border-ios-red/30 bg-ios-red/10 text-ios-red'
                  }`}>
                    <span className={`h-3 w-3 rounded-full ${status ? 'bg-ios-green' : 'bg-ios-red'} ${status ? 'animate-pulse' : ''}`} />
                    <span className="text-sm font-black tracking-widest">
                      SISTEMA {status ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>

                <div className="w-full flex flex-col gap-4">
                  {/* Uptime and Downtime Counters */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="seamless-panel rounded-ios p-4 flex flex-col items-center justify-center text-center">
                      <div className="flex items-center gap-1.5 opacity-60 mb-1">
                        <Clock size={12} className="text-ios-green" />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Produção</span>
                      </div>
                      <h2 className="text-lg font-mono font-bold tracking-tight text-ios-green">{uptime}</h2>
                    </div>

                    <div className="seamless-panel rounded-ios p-4 flex flex-col items-center justify-center text-center">
                      <div className="flex items-center gap-1.5 opacity-60 mb-1">
                        <Clock size={12} className="text-ios-red" />
                        <span className="text-[9px] font-bold uppercase tracking-wider">Parado</span>
                      </div>
                      <h2 className="text-lg font-mono font-bold tracking-tight text-ios-red">{downtime}</h2>
                    </div>
                  </div>

                  <div className="seamless-panel rounded-ios p-6">
                    <div className="flex items-center gap-3 opacity-60 mb-2">
                      <Filter size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Filtro de Data</span>
                    </div>
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-1 ring-ios-blue/30 transition-all text-slate-800 dark:text-white"
                    />
                  </div>

                   <div className="seamless-panel rounded-ios p-6 w-full overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-[0.2em] opacity-40">Logs de Leitura</h3>
                      <span className="text-[15px] uppercase font-bold text-red-500 animate-pulse">◉
                      </span>
                    </div>
                    <div className="max-h-[220px] overflow-y-auto pr-1 scrollbar-clean">
                      <table className="w-full text-left text-[10px]">
                        <thead>
                          <tr className="opacity-30 border-b border-black/5 dark:border-white/5">
                            <th className="pb-2 font-bold">Hora/Máquina</th>
                            <th className="pb-2 font-bold text-right">Métricas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                          {telemetryLogs && telemetryLogs.length > 0 ? (
                            telemetryLogs.map((log: any, idx: number) => {
                              const timeStr = new Date(log.momento_da_leitura).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                              return (
                                <tr key={idx} className="group hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                  <td className="py-2">
                                    <div className="font-mono text-ios-blue">{timeStr}</div>
                                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">{log.name}</div>
                                  </td>
                                  <td className="py-2 text-right font-mono">
                                    <div className={`${log.status_atual?.toLowerCase() === 'ativa' ? 'text-ios-green' : 'text-ios-red'} font-bold`}>
                                      {(log.status_atual || 'Inativa').toUpperCase()}
                                    </div>
                                    <div className="text-[9px] opacity-60">
                                      {log.potencia_watt?.toFixed(0)}W | {log.vibracao_rms?.toFixed(2)}G
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={2} className="py-8 text-center opacity-50">
                                Aguardando leituras da API...
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Energy Metrics */}
                  <div className="seamless-panel rounded-ios p-6">
                    <div className="flex items-center gap-3 opacity-60 mb-2">
                      <Zap size={16} className="text-yellow-500" />
                      <span className="text-xs font-bold uppercase tracking-wider">Potência</span>
                    </div>
                    <h2 className="text-3xl font-mono font-bold tracking-tight">{power.toFixed(0)}<span className="text-sm opacity-50 ml-1">W</span></h2>
                  </div>

                  <div className="seamless-panel rounded-ios p-6">
                    <div className="flex items-center gap-3 opacity-60 mb-2">
                      <ActivityIcon size={16} className="text-ios-blue" />
                      <span className="text-xs font-bold uppercase tracking-wider">Tensão</span>
                    </div>
                    <h2 className="text-3xl font-mono font-bold tracking-tight">{voltage.toFixed(1)}<span className="text-sm opacity-50 ml-1">V</span></h2>
                  </div>

                  <div className="seamless-panel rounded-ios p-6">
                    <div className="flex items-center gap-3 opacity-60 mb-2">
                      <ActivityIcon size={16} className="text-ios-green" />
                      <span className="text-xs font-bold uppercase tracking-wider">Corrente</span>
                    </div>
                    <h2 className="text-3xl font-mono font-bold tracking-tight">{current.toFixed(2)}<span className="text-sm opacity-50 ml-1">A</span></h2>
                  </div>

                  {/* Vibration & Frequency Metrics */}
                  <div className="seamless-panel rounded-ios p-6">
                    <div className="flex items-center gap-3 opacity-60 mb-2">
                      <ActivityIcon size={16} className="text-purple-500" />
                      <span className="text-xs font-bold uppercase tracking-wider">Freq. Processo</span>
                    </div>
                    <h2 className="text-3xl font-mono font-bold tracking-tight">{vibrationHz.toFixed(1)}<span className="text-sm opacity-50 ml-1">Hz</span></h2>
                  </div>

                  <div className="seamless-panel rounded-ios p-6">
                    <div className="flex items-center gap-3 opacity-60 mb-2">
                      <ActivityIcon size={16} className="text-cyan-500" />
                      <span className="text-xs font-bold uppercase tracking-wider">Vib. Estrutural</span>
                    </div>
                    <h2 className="text-3xl font-mono font-bold tracking-tight">{vibrationStructural.toFixed(2)}<span className="text-sm opacity-50 ml-1">G</span></h2>
                  </div>

                </div>
              </div>

              {/* Right Column: Live Charts & Historical Analysis */}
              <div className="md:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Process Frequency Live Chart */}
                <div className="md:col-span-2 seamless-panel rounded-ios p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                      <ActivityIcon size={16} className="text-purple-500" />
                      Frequência do Processo (Hz)
                    </h3>
                    <span className="text-xs opacity-50 font-mono">Rotação / Ciclos Atuais</span>
                  </div>
                  <LiveMetricChart data={liveValueData} title="Frequência (Hz)" darkMode={darkMode} />
                </div>

                {/* Structural Vibration Live Chart */}
                <div className="md:col-span-1 seamless-panel rounded-ios p-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                    <ActivityIcon size={16} className="text-cyan-500" />
                    Vibração Estrutural (Gs)
                  </h3>
                  <VibrationChart data={vibrationData} darkMode={darkMode} />
                </div>

                {/* Uptime Distribution Chart */}
                <div className="md:col-span-1 seamless-panel rounded-ios p-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Clock size={16} className="text-ios-green" />
                    Distribuição Diária de Uptime
                  </h3>
                  <UptimeDailyChart data={dailyUptimeData} darkMode={darkMode} />
                </div>

                {/* Device Status History with Period Filter */}
                <div className="md:col-span-2 seamless-panel rounded-ios p-6 mb-12">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                      <ListFilter size={16} />
                      Histórico de Operação do Equipamento
                    </h3>

                    {/* Period filter buttons */}
                    <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-black/5 dark:border-white/5">
                      <button
                        onClick={() => setHistoryPeriod('day')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all
                          ${historyPeriod === 'day' ? 'bg-ios-blue text-white shadow-sm' : 'opacity-65 text-slate-800 dark:text-slate-200'}`}
                      >
                        DIA
                      </button>
                      <button
                        onClick={() => setHistoryPeriod('week')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all
                          ${historyPeriod === 'week' ? 'bg-ios-blue text-white shadow-sm' : 'opacity-65 text-slate-800 dark:text-slate-200'}`}
                      >
                        SEMANA
                      </button>
                      <button
                        onClick={() => setHistoryPeriod('month')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all
                          ${historyPeriod === 'month' ? 'bg-ios-blue text-white shadow-sm' : 'opacity-65 text-slate-800 dark:text-slate-200'}`}
                      >
                        MÊS
                      </button>
                    </div>
                  </div>

                  {historyPeriod === 'day' && (
                    <HistoryChart data={historyData} darkMode={darkMode} />
                  )}
                  {historyPeriod === 'week' && (
                    <UptimeDailyChart data={dailyUptimeData} darkMode={darkMode} />
                  )}
                  {historyPeriod === 'month' && (
                    <ReactECharts option={monthlyChartOption} style={{ height: '200px' }} />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Shift Productivity Doughnut Chart */}
            <div className="md:col-span-5 seamless-panel rounded-ios p-6 md:p-8 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold tracking-tight mb-2">Produtividade por Turno</h3>
                <p className="text-xs opacity-60 mb-6">Eficiência ativa acumulada distribuída pelas jornadas de trabalho</p>
              </div>
              <div className="flex justify-center items-center py-6">
                {shiftProductivity.length > 0 ? (
                  <ReactECharts option={shiftChartOption} style={{ width: '100%', height: '260px' }} />
                ) : (
                  <p className="opacity-45 text-sm py-20 text-center">Inicie a máquina para ver a distribuição por turno</p>
                )}
              </div>
              <div className="border-t border-black/5 dark:border-white/5 pt-4 text-xs opacity-50 leading-relaxed">
                * Turno 1 (Manhã/Tarde), Turno 2 (Tarde/Noite), Turno 3 (Noite/Madrugada). A distribuição calcula o tempo ativo.
              </div>
            </div>

            {/* Rankings Lists (Most Productive & Most Stops) */}
            <div className="md:col-span-7 flex flex-col gap-6">

              {/* Ranking 1: Most Productive Machines */}
              <div className="seamless-panel rounded-ios p-6 md:p-8">
                <h3 className="text-lg font-bold tracking-tight mb-2 flex items-center gap-2">
                  <ShieldCheck className="text-ios-green" size={20} />
                  Ranking das Máquinas Mais Produtivas
                </h3>
                <p className="text-xs opacity-60 mb-6">Equipamentos ordenados por taxa de eficiência (% de tempo em produção)</p>

                <div className="flex flex-col gap-5">
                  {productiveRanking.map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-1.5">
                      <div className="flex justify-between items-center text-xs md:text-sm">
                        <span className="font-bold flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white
                            ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-600' : 'bg-black/30 dark:bg-white/20'}`}>
                            {idx + 1}
                          </span>
                          {item.name}
                        </span>
                        <span className="font-mono font-bold text-ios-green">{item.efficiency}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-linear-to-r from-ios-green to-[#812FFF] rounded-full transition-all duration-1000"
                          style={{ width: `${item.efficiency}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ranking 2: Machines with Most Stops */}
              <div className="seamless-panel rounded-ios p-6 md:p-8">
                <h3 className="text-lg font-bold tracking-tight mb-2 flex items-center gap-2">
                  <ShieldAlert className="text-ios-red" size={20} />
                  Máquinas com Mais Paradas de Processo
                </h3>
                <p className="text-xs opacity-60 mb-6">Equipamentos ordenados pela frequência de interrupções/desligamentos</p>

                <div className="flex flex-col gap-4">
                  {stopsRanking.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b border-black/5 dark:border-white/5 pb-3 last:border-b-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black opacity-30">#{idx + 1}</span>
                        <span className="text-sm font-bold">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-ios-red">{item.stops} paradas</span>
                        {item.stops > 4 && (
                          <span title="Alto índice de interrupções">
                            <AlertTriangle className="text-ios-orange" size={14} />
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mb-12">

            {/* Preventative Maintenance Status Widget */}
            <div className="md:col-span-4 flex flex-col gap-4">
              <div className="seamless-panel rounded-ios p-6 flex flex-col gap-3">
                <h3 className="text-sm font-black uppercase tracking-widest opacity-40">Resumo de Manutenção</h3>

                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="flex flex-col items-center bg-yellow-500/10 dark:bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 text-center">
                    <span className="text-lg font-black text-yellow-600 dark:text-yellow-400">{pendingCount}</span>
                    <span className="text-[8px] font-bold opacity-70">Agendadas</span>
                  </div>
                  <div className="flex flex-col items-center bg-red-500/10 dark:bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-center">
                    <span className="text-lg font-black text-ios-red">{overdueCount}</span>
                    <span className="text-[8px] font-bold opacity-70">Atrasadas</span>
                  </div>
                  <div className="flex flex-col items-center bg-green-500/10 dark:bg-green-500/5 border border-green-500/20 rounded-xl p-3 text-center">
                    <span className="text-lg font-black text-ios-green">{completedCount}</span>
                    <span className="text-[8px] font-bold opacity-70">Concluídas</span>
                  </div>
                </div>

                {overdueCount > 0 ? (
                  <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl mt-4">
                    <AlertTriangle className="text-ios-red animate-bounce shrink-0" size={18} />
                    <p className="text-[10px] md:text-xs font-semibold text-ios-red leading-tight">
                      Atenção: Há manutenções preventivas programadas em atraso para este equipamento!
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl mt-4">
                    <ShieldCheck className="text-ios-green shrink-0" size={18} />
                    <p className="text-[10px] md:text-xs font-semibold text-ios-green leading-tight">
                      Manutenções em dia! O cronograma preventivo do equipamento está atualizado.
                    </p>
                  </div>
                )}
              </div>

              <div className="seamless-panel rounded-ios p-6 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-sm mb-1.5">Importância da Preventiva</h4>
                  <p className="text-[11px] opacity-60 leading-relaxed mb-4">
                    A manutenção preventiva diminui paradas não programadas e paradas catastróficas, garantindo maior produtividade e vida útil dos maquinários e sensores da HMI.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/admin/login')}
                  className="w-full text-center py-2.5 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 rounded-xl border border-black/10 dark:border-white/10 text-xs font-bold transition-all cursor-pointer"
                >
                  Ir para Painel do Técnico
                </button>
              </div>
            </div>

            {/* List of Scheduled Tasks for selected machine */}
            <div className="md:col-span-8 seamless-panel rounded-ios p-6 md:p-8">
              <h3 className="text-lg font-bold tracking-tight mb-1.5 flex items-center gap-2">
                <Wrench size={20} className="text-ios-blue" />
                Cronograma de Intervenções Preventivas
              </h3>
              <p className="text-xs opacity-60 mb-6">Lista de tarefas programadas especificamente para a máquina atual selecionada</p>

              {activeMaintenance.length === 0 ? (
                <div className="text-center py-20 opacity-55 flex flex-col items-center gap-2">
                  <Check className="text-ios-green w-10 h-10 p-2 bg-green-500/10 rounded-full border border-green-500/20" />
                  <p className="text-sm font-semibold">Tudo Limpo!</p>
                  <p className="text-xs">Nenhuma manutenção preventiva cadastrada para este equipamento no momento.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {activeMaintenance.map((task) => (
                    <div
                      key={task.id}
                      className={`border border-black/10 dark:border-white/10 rounded-xl p-5 hover:bg-black/5 dark:hover:bg-white/5 transition-all flex flex-col md:flex-row justify-between md:items-center gap-4
                        ${task.status === 'completed' ? 'opacity-65' : ''}`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm md:text-base">{task.taskName}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${getStatusBadge(task.status)}`}>
                            {getStatusLabel(task.status)}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-xs opacity-75">{task.description}</p>
                        )}
                        <div className="flex gap-4 text-[10px] opacity-55 mt-1">
                          <span>Data: <strong>{new Date(task.scheduledDate).toLocaleDateString('pt-BR')}</strong></span>
                          {task.technician && (
                            <span>Técnico: <strong>{task.technician}</strong></span>
                          )}
                        </div>
                      </div>

                      {task.status !== 'completed' && (
                        <div className="shrink-0 flex items-center justify-end">
                          <span className="text-[10px] uppercase font-bold text-ios-orange flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-ios-orange rounded-full animate-ping" />
                            Aguardando técnico
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs opacity-35 max-w-7xl mx-auto w-full">
        <p>Simple IHM Dashboard &copy; 2026 - Conexão via Bridge Local</p>
        <button onClick={() => navigate('/admin')} className="underline hover:opacity-100 transition-opacity cursor-pointer mb-16">Acesso Administrativo (Técnico)</button>
      </footer>
    </div>
  );
}
