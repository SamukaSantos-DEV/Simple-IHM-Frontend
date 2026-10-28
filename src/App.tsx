import { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { AuthProvider, RequireAuth, RequireProfile } from './auth/AuthContext';
import { useAuth } from './auth/useAuth';
import { apiFetch } from './api';
import { getAuthToken } from './auth/session';
import DashboardView from './components/DashboardView';
import ConnectionStatus from './components/ConnectionStatus';
import LoginPage from './components/admin/LoginPage';
import AdminLayout from './components/admin/AdminLayout';
import MachinesPage from './components/MachinesPage';
import MaintenancePage from './components/admin/MaintenancePage';
import FuncionariosPage from './components/admin/FuncionariosPage';
import AuditPage from './components/admin/AuditPage';
import { API_BASE_URL } from './config';

const socket = io(API_BASE_URL, {
  autoConnect: false,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 1,
  reconnectionDelay: 5000,
  timeout: 4000,
  extraHeaders: {
    'ngrok-skip-browser-warning': 'true',
  },
});

interface MachineTelemetry {
  uptimeSeconds: number;
  downtimeSeconds: number;
  status: boolean; // true = active (ON), false = inactive (OFF)
  power: number;
  voltage: number;
  current: number;
  vibrationHz: number;
  vibrationStructural: number;
  vibrationData: number[];
  liveValueData: number[];
  historyData: { time: string, status: number }[];
  stopsCount: number;
  isNgrok?: boolean;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </BrowserRouter>
  );
}

function AuthenticatedApp() {
  const { user } = useAuth();
  return <AppContent key={user?.id ?? 'signed-out'} />;
}

function AppContent() {
  const { user } = useAuth();
  const authenticatedUserId = user?.id;
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });
  
  const [status, setStatusState] = useState(true);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isInternetConnected, setIsInternetConnected] = useState(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [isServerSignal, setIsServerSignal] = useState(true);
  
  // Telemetria detalhada por máquina
  const [telemetryMap, setTelemetryMap] = useState<Record<string | number, MachineTelemetry>>({});
  
  // Estados de exibição da máquina selecionada
  const [vibrationData, setVibrationData] = useState<number[]>(new Array(20).fill(0));
  const [liveValueData, setLiveValueData] = useState<number[]>(new Array(30).fill(0));
  const [historyData, setHistoryData] = useState<{ time: string, status: number }[]>([]);
  const [uptime, setUptime] = useState('00:00:00');
  const [downtime, setDowntime] = useState('00:00:00');
  const [power, setPower] = useState(0);
  const [voltage, setVoltage] = useState(0);
  const [current, setCurrent] = useState(0);
  const [vibrationHz, setVibrationHz] = useState(0);
  const [vibrationStructural, setVibrationStructural] = useState(0);

  const [availableMachines, setAvailableMachines] = useState<{id: number | string, name: string, tag?: string}[]>([]);
  const availableMachinesRef = useRef(availableMachines);
  const [selectedMachineId, setSelectedMachineIdState] = useState<number | string | null>(null);
  const selectedMachineIdRef = useRef<number | string | null>(null);

  // Manutenções preventivas
  const [maintenanceTasks, setMaintenanceTasks] = useState<any[]>([]);

  // Histórico de logs de telemetria recebidos da API
  const [telemetryLogs, setTelemetryLogs] = useState<any[]>([]);

  // Rankings e Turnos
  const [productiveRanking, setProductiveRanking] = useState<{ name: string; efficiency: number }[]>([]);
  const [stopsRanking, setStopsRanking] = useState<{ name: string; stops: number }[]>([]);
  const [shiftProductivity, setShiftProductivity] = useState<{ shift: string; productivity: number }[]>([]);

  const formatTime = (totalSeconds: number): string => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  const initTelemetryForMachine = (_id: number | string): MachineTelemetry => {
    const isAtiva = Math.random() > 0.2; // 80% chance de iniciar ligada
    const uptimeSecs = Math.floor(15000 + Math.random() * 30000);
    const downtimeSecs = Math.floor(2000 + Math.random() * 8000);
    const stops = Math.floor(Math.random() * 6) + 1;

    const now = Date.now();
    const hist = Array.from({ length: 20 }).map((_, idx) => {
      const timeStr = new Date(now - (20 - idx) * 30000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return {
        time: timeStr,
        status: Math.random() > 0.15 ? 1 : 0
      };
    });

    return {
      uptimeSeconds: uptimeSecs,
      downtimeSeconds: downtimeSecs,
      status: isAtiva,
      power: isAtiva ? 450 + Math.random() * 150 : 22,
      voltage: 220,
      current: isAtiva ? 2.0 + Math.random() * 1.0 : 0.1,
      vibrationHz: isAtiva ? 58 + Math.random() * 4 : 0,
      vibrationStructural: isAtiva ? 0.8 + Math.random() * 0.8 : 0.05,
      vibrationData: new Array(20).fill(0).map(() => isAtiva ? 0.8 + Math.random() * 0.8 : 0.05),
      liveValueData: new Array(30).fill(0).map(() => isAtiva ? 58 + Math.random() * 4 : 0),
      historyData: hist,
      stopsCount: stops
    };
  };

  const applyTelemetryData = (data: any) => {
    if (!data || typeof data !== 'object') return;

    // Normalização do identificador da máquina
    const rawId = data.maquina_id ?? data.machine_id ?? data.id;
    const currentSelectedId = selectedMachineIdRef.current;
    const targetId = rawId !== undefined && rawId !== null ? rawId : currentSelectedId;
    if (targetId === null || targetId === undefined) return;

    // Normalização de status
    let isAtiva: boolean | undefined = undefined;
    if (typeof data.status_atual === 'string') {
      isAtiva = data.status_atual.toLowerCase() === 'ativa';
    } else if (typeof data.status === 'boolean') {
      isAtiva = data.status;
    } else if (typeof data.status === 'number') {
      isAtiva = data.status === 1;
    }

    // Normalização de métricas (suporte para chaves em português e inglês)
    const rawVibration = data.vibracao_rms ?? data.vibration ?? data.vibrationStructural;
    const vibration = rawVibration !== undefined ? Number(rawVibration) : undefined;

    const rawFrequency = data.frequencia_hz ?? data.frequency ?? data.vibrationHz;
    const frequency = rawFrequency !== undefined ? Number(rawFrequency) : undefined;

    const rawVoltage = data.tensao_volt ?? data.voltage;
    const voltageVal = rawVoltage !== undefined ? Number(rawVoltage) : undefined;

    const rawCurrent = data.corrente_ampere ?? data.current;
    const currentVal = rawCurrent !== undefined ? Number(rawCurrent) : undefined;

    const rawPower = data.potencia_watt ?? data.power;
    const powerVal = rawPower !== undefined
      ? Number(rawPower)
      : (voltageVal !== undefined && currentVal !== undefined ? voltageVal * currentVal : undefined);

    // 1. Atualizar lista de máquinas se houver metadados novos
    if (data.nome_maquina || data.tag_maquina) {
      setAvailableMachines(prev => {
        const newList = [...prev];
        const existingIndex = newList.findIndex(x => x.id.toString() === targetId.toString());
        const name = data.nome_maquina 
          ? `${data.tag_maquina ? data.tag_maquina + ' - ' : ''}${data.nome_maquina}`
          : (data.tag_maquina || `Máquina ${targetId}`);
        const tag = data.tag_maquina || `M${targetId}`;

        if (existingIndex === -1) {
          newList.push({ id: targetId, name, tag });
        }
        return newList;
      });
    }

    // 2. Atualizar histórico de logs de telemetria
    const readingTime = data.momento_da_leitura || new Date().toISOString();
    setTelemetryLogs(prev => {
      const exists = prev.some(log => log.maquina_id === targetId && log.momento_da_leitura === readingTime);
      if (!exists) {
        const maquinaRel = availableMachinesRef.current.find(x => x.id.toString() === targetId.toString());
        const name = maquinaRel ? maquinaRel.name : (data.nome_maquina || `Máquina ${targetId}`);
        const newLog = {
          maquina_id: targetId,
          name,
          status_atual: isAtiva !== undefined ? (isAtiva ? 'Ativa' : 'Inativa') : (data.status_atual || 'Ativa'),
          vibracao_rms: vibration ?? 0,
          corrente_ampere: currentVal ?? 0,
          tensao_volt: voltageVal ?? 0,
          potencia_watt: powerVal ?? 0,
          frequencia_hz: frequency ?? 0,
          momento_da_leitura: readingTime,
        };
        return [newLog, ...prev].slice(0, 25);
      }
      return prev;
    });

    // 3. Atualizar o telemetryMap
    setTelemetryMap(prev => {
      const prevTel = prev[targetId] ?? initTelemetryForMachine(targetId);
      const nextStatus = isAtiva !== undefined ? isAtiva : prevTel.status;
      const nextVib = vibration !== undefined ? vibration : prevTel.vibrationStructural;
      const nextFreq = nextStatus ? (frequency !== undefined ? frequency : (prevTel.vibrationHz || 60)) : 0;
      const nextVolt = voltageVal !== undefined ? voltageVal : prevTel.voltage;
      const nextCurr = currentVal !== undefined ? currentVal : prevTel.current;
      const nextPow = powerVal !== undefined ? powerVal : prevTel.power;

      const nextVibrationData = [...prevTel.vibrationData.slice(-19), nextVib];
      const nextLiveValueData = [...prevTel.liveValueData.slice(-29), nextFreq];

      let nextHistoryData = prevTel.historyData;
      const timeStr = new Date(readingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (prevTel.historyData.length === 0 || prevTel.status !== nextStatus) {
        nextHistoryData = [...prevTel.historyData.slice(-19), { time: timeStr, status: nextStatus ? 1 : 0 }];
      }

      const updatedTel: MachineTelemetry = {
        ...prevTel,
        status: nextStatus,
        power: nextPow,
        voltage: nextVolt,
        current: nextCurr,
        vibrationHz: nextFreq,
        vibrationStructural: nextVib,
        vibrationData: nextVibrationData,
        liveValueData: nextLiveValueData,
        historyData: nextHistoryData,
        isNgrok: true,
      };

      // 4. Sincronizar os estados visuais da máquina selecionada se for o alvo ativo
      if (currentSelectedId !== null && currentSelectedId.toString() === targetId.toString()) {
        setStatusState(updatedTel.status);
        setPower(updatedTel.power);
        setVoltage(updatedTel.voltage);
        setCurrent(updatedTel.current);
        setVibrationHz(updatedTel.vibrationHz);
        setVibrationStructural(updatedTel.vibrationStructural);
        setVibrationData(updatedTel.vibrationData);
        setLiveValueData(updatedTel.liveValueData);
        setHistoryData(updatedTel.historyData);
      }

      return {
        ...prev,
        [targetId]: updatedTel,
      };
    });
  };

  const setSelectedMachineId = async (id: number | string) => {
    setSelectedMachineIdState(id);
    selectedMachineIdRef.current = id;
    
    // Notifica backend se necessário via WebSocket
    if (socket.connected) {
      socket.emit('select_machine', { machine_id: id });
    }

    // Atualiza os estados instantaneamente com os dados da máquina no map se já existirem
    if (telemetryMap[id]) {
      const tel = telemetryMap[id];
      setStatusState(tel.status);
      setUptime(formatTime(tel.uptimeSeconds));
      setDowntime(formatTime(tel.downtimeSeconds));
      setPower(tel.power);
      setVoltage(tel.voltage);
      setCurrent(tel.current);
      setVibrationHz(tel.vibrationHz);
      setVibrationStructural(tel.vibrationStructural);
      setVibrationData(tel.vibrationData);
      setLiveValueData(tel.liveValueData);
      setHistoryData(tel.historyData);
    } else {
      // Carga inicial via HTTP caso a máquina selecionada ainda não tenha dados no map
      try {
        const resp = await apiFetch(`/status-maquinas/${id}`);
        if (resp.ok) {
          const m = await resp.json();
          if (m) applyTelemetryData(m);
        }
      } catch (e) {
        console.warn(`Não foi possível carregar status inicial da máquina ${id}:`, e);
      }
    }
  };

  const dailyUptimeData = [
    { day: 'Seg', onHours: 18, offHours: 6 },
    { day: 'Ter', onHours: 22, offHours: 2 },
    { day: 'Qua', onHours: 15, offHours: 9 },
    { day: 'Qui', onHours: 20, offHours: 4 },
    { day: 'Sex', onHours: 24, offHours: 0 },
    { day: 'Sab', onHours: 12, offHours: 12 },
    { day: 'Dom', onHours: 8, offHours: 16 },
  ];

  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Detecta queda/retorno de internet
  useEffect(() => {
    const handleOnline = () => setIsInternetConnected(true);
    const handleOffline = () => setIsInternetConnected(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkInternet = async () => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 5000);
      try {
        await fetch('https://www.gstatic.com/generate_204', {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal,
        });
        setIsInternetConnected(true);
      } catch {
        setIsInternetConnected(false);
      } finally {
        window.clearTimeout(timeoutId);
      }
    };

    checkInternet();
    const intervalId = window.setInterval(checkInternet, 5000);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.clearInterval(intervalId);
    };
  }, []);

  // Health check da API independente da recepção de telemetria.
  useEffect(() => {
    let activeController: AbortController | null = null;

    const checkApi = async () => {
      // Se o WebSocket já estiver conectado, o servidor está com sinal ativo
      if (socket.connected) {
        setIsServerSignal(true);
        return;
      }

      activeController?.abort();
      const controller = new AbortController();
      activeController = controller;
      const timeoutId = window.setTimeout(() => controller.abort(), 4500);

      try {
        const response = await fetch(API_BASE_URL, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });
        setIsServerSignal(response.ok);
      } catch {
        setIsServerSignal(false);
      } finally {
        window.clearTimeout(timeoutId);
        if (activeController === controller) activeController = null;
      }
    };

    void checkApi();
    const intervalId = window.setInterval(() => void checkApi(), 10000);
    return () => {
      window.clearInterval(intervalId);
      activeController?.abort();
    };
  }, []);

  // Loop de Simulação de Telemetria (Move os dados a cada segundo)
  useEffect(() => {
    const simulationInterval = setInterval(() => {
      setTelemetryMap(prevMap => {
        const nextMap = { ...prevMap };
        let mapChanged = false;

        availableMachines.forEach(machine => {
          const id = machine.id;
          if (!nextMap[id]) {
            nextMap[id] = initTelemetryForMachine(id);
            mapChanged = true;
          }

          const currentTel = nextMap[id];
          const isSelected = selectedMachineIdRef.current !== null && selectedMachineIdRef.current.toString() === id.toString();
          
          // Se for a máquina selecionada E temos sinal real de socket/ESP, deixa a lógica do socket agir
          // Caso contrário, simulamos os dados se movimentando
          let updatedTel = { ...currentTel };
          
          // Se for do ngrok ou se o WebSocket estiver conectado, preserva dados reais e apenas incrementa contadores de tempo
          if (currentTel.isNgrok || isSocketConnected) {
            if (currentTel.status) {
              updatedTel.uptimeSeconds += 1;
            } else {
              updatedTel.downtimeSeconds += 1;
            }
          } else if (currentTel.status) {
            // Modo offline/sem backend: simula dados variando
            updatedTel.uptimeSeconds += 1;
            updatedTel.voltage = 217 + Math.random() * 6; // 217 a 223 V
            updatedTel.current = Math.max(0.5, currentTel.current + (Math.random() - 0.5) * 0.2);
            updatedTel.power = updatedTel.voltage * updatedTel.current;
            updatedTel.vibrationHz = Math.max(1, 55 + Math.random() * 10);
            updatedTel.vibrationStructural = Math.max(0.1, currentTel.vibrationStructural + (Math.random() - 0.5) * 0.15);
            updatedTel.vibrationData = [...currentTel.vibrationData.slice(-19), updatedTel.vibrationStructural];
            updatedTel.liveValueData = [...currentTel.liveValueData.slice(-29), updatedTel.vibrationHz];
          } else {
            // Modo offline parado
            updatedTel.downtimeSeconds += 1;
            updatedTel.voltage = Math.random() > 0.95 ? 0 : 220; // Standby
            updatedTel.current = 0.1;
            updatedTel.power = updatedTel.voltage * updatedTel.current;
            updatedTel.vibrationHz = 0;
            updatedTel.vibrationStructural = 0.05 + Math.random() * 0.02;
            updatedTel.vibrationData = [...currentTel.vibrationData.slice(-19), updatedTel.vibrationStructural];
            updatedTel.liveValueData = [...currentTel.liveValueData.slice(-29), updatedTel.vibrationHz];
          }

          // Adiciona histórico a cada 5 segundos se não tiver socket conectado
          if (!isSocketConnected && updatedTel.uptimeSeconds % 5 === 0) {
            const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            updatedTel.historyData = [...currentTel.historyData.slice(-19), { time: timeNow, status: updatedTel.status ? 1 : 0 }];
          }

          nextMap[id] = updatedTel;
          mapChanged = true;

          // Se for a selecionada, reflete nos estados individuais imediatamente para renderizar
          if (isSelected) {
            setUptime(formatTime(updatedTel.uptimeSeconds));
            setDowntime(formatTime(updatedTel.downtimeSeconds));
            if (!currentTel.isNgrok && !isSocketConnected) {
              setStatusState(updatedTel.status);
              setPower(updatedTel.power);
              setVoltage(updatedTel.voltage);
              setCurrent(updatedTel.current);
              setVibrationHz(updatedTel.vibrationHz);
              setVibrationStructural(updatedTel.vibrationStructural);
              setVibrationData(updatedTel.vibrationData);
              setLiveValueData(updatedTel.liveValueData);
              setHistoryData(updatedTel.historyData);
            }
          }
        });

        // Atualizar rankings e turnos
        if (mapChanged || Object.keys(prevMap).length === 0) {
          const list = Object.entries(nextMap).map(([idKey, tel]) => {
            const mach = availableMachines.find(m => m.id.toString() === idKey.toString());
            const name = mach ? mach.name : `Máquina ${idKey}`;
            const total = tel.uptimeSeconds + tel.downtimeSeconds || 1;
            const efficiency = (tel.uptimeSeconds / total) * 100;
            return {
              id: idKey,
              name,
              efficiency: parseFloat(efficiency.toFixed(1)),
              stops: tel.stopsCount
            };
          });

          // Ranking Mais Produtivas (maior eficiência)
          const sortedProd = [...list].sort((a, b) => b.efficiency - a.efficiency);
          setProductiveRanking(sortedProd.map(x => ({ name: x.name, efficiency: x.efficiency })));

          // Ranking Mais Paradas (mais paradas)
          const sortedStops = [...list].sort((a, b) => b.stops - a.stops);
          setStopsRanking(sortedStops.map(x => ({ name: x.name, stops: x.stops })));

          // Produtividade por Turno da máquina selecionada
          const activeId = selectedMachineIdRef.current;
          if (activeId !== null && nextMap[activeId]) {
            const activeTel = nextMap[activeId];
            // Divide o uptime em 3 turnos simulados
            const totalUp = activeTel.uptimeSeconds || 3600;
            setShiftProductivity([
              { shift: 'Turno 1 (06:00 - 14:00)', productivity: Math.round(totalUp * 0.45) },
              { shift: 'Turno 2 (14:00 - 22:00)', productivity: Math.round(totalUp * 0.35) },
              { shift: 'Turno 3 (22:00 - 06:00)', productivity: Math.round(totalUp * 0.20) }
            ]);
          }
        }

        return nextMap;
      });
    }, 1000);

    return () => clearInterval(simulationInterval);
  }, [availableMachines]);

  // Carga inicial única do servidor e conexão WebSocket para telemetria em tempo real (sem polling)
  useEffect(() => {
    if (!authenticatedUserId) return;

    const fetchInitialData = async () => {
      // 1. Carregar lista de máquinas
      try {
        const localResponse = await apiFetch('/maquinas');
        if (localResponse.ok) {
          const machinesLocal = await localResponse.json();
          if (machinesLocal && machinesLocal.length > 0) {
            setAvailableMachines(machinesLocal.map((m: any) => ({
              id: m.id,
              name: m.nome_maquina,
              tag: m.tag_maquina || m.nome_maquina
            })));
            
            localStorage.setItem('local_machines', JSON.stringify(machinesLocal));

            if (selectedMachineIdRef.current === null) {
              setSelectedMachineIdState(machinesLocal[0].id);
              selectedMachineIdRef.current = machinesLocal[0].id;
            }
          }
        }
      } catch (e) {
        console.warn("Backend local offline para carregar máquinas. Carregando dados locais...");
        const stored = localStorage.getItem('local_machines');
        if (stored) {
           const parsed = JSON.parse(stored);
          setAvailableMachines(parsed.map((m: any) => ({
            id: m.id,
            name: m.nome_maquina || m.name,
            tag: m.tag_maquina || m.tag || m.nome_maquina || m.name
          })));
          if (selectedMachineIdRef.current === null && parsed.length > 0) {
            setSelectedMachineIdState(parsed[0].id);
            selectedMachineIdRef.current = parsed[0].id;
          }
        } else {
          // Mock padrão
          const defaultMachines = [{ id: 1, name: 'Torno CNC Romi', tag: 'CNC-01' }];
          setAvailableMachines(defaultMachines);
          setSelectedMachineIdState(1);
          selectedMachineIdRef.current = 1;
        }
      }

      // Carga inicial pontual do status da máquina ativa para exibição imediata
      const activeId = selectedMachineIdRef.current;
      if (activeId !== null) {
        try {
          const initialStatusResponse = await apiFetch(`/status-maquinas/${activeId}`);
          if (initialStatusResponse.ok) {
            const m = await initialStatusResponse.json();
            if (m) applyTelemetryData(m);
          }
        } catch (e) {
          console.warn("Status inicial HTTP indisponível.");
        }
      }

      // 2. Carregar manutenções preventivas (carga inicial)
      try {
        const maintenanceResponse = await apiFetch('/manutencoes');
        if (maintenanceResponse.ok) {
          const maintenanceData = await maintenanceResponse.json();
          
          const normalizeMaint = (list: any[]) => list.map((t: any) => ({
            id: t.id,
            machineId: t.maquina_id !== undefined ? t.maquina_id : t.machineId,
            taskName: t.descricao_servico !== undefined ? t.descricao_servico : t.taskName,
            description: t.tipo_manutencao !== undefined ? t.tipo_manutencao : t.description,
            scheduledDate: t.data_agendada !== undefined ? t.data_agendada : t.scheduledDate,
            status: t.concluida !== undefined 
              ? (t.concluida ? 'completed' : (new Date(t.data_agendada) < new Date(new Date().setHours(0,0,0,0)) ? 'overdue' : 'pending'))
              : t.status,
            technician: t.nome_funcionario !== undefined ? (t.nome_funcionario || '') : (t.technician || ''),
          }));

          const normalized = normalizeMaint(maintenanceData);
          setMaintenanceTasks(normalized);
        } else {
          console.error(`A API recusou o carregamento das manutenções: HTTP ${maintenanceResponse.status}.`);
          setMaintenanceTasks([]);
        }
      } catch (error) {
        console.error('Erro ao carregar manutenções para o dashboard:', error);
        setMaintenanceTasks([]);
      }
    };

    void fetchInitialData();

    // Configuração e conexão do WebSocket em tempo real
    const token = getAuthToken();
    if (token) {
      socket.auth = { token };
    }

    const handleConnect = () => {
      console.log('WebSocket conectado com sucesso.');
      setIsSocketConnected(true);
      setIsServerSignal(true);
      if (selectedMachineIdRef.current !== null) {
        socket.emit('select_machine', { machine_id: selectedMachineIdRef.current });
      }
    };

    const handleDisconnect = (reason: string) => {
      console.warn('WebSocket desconectado:', reason);
      setIsSocketConnected(false);
    };

    const handleConnectError = (error: Error) => {
      console.warn('WebSocket indisponível no servidor (modo HTTP ativo):', error.message);
      setIsSocketConnected(false);
      socket.disconnect();
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('dashboard_update', applyTelemetryData);
    socket.on('telemetria', applyTelemetryData);
    socket.on('esp32_data', applyTelemetryData);

    if (!socket.connected) {
      socket.connect();
    }

    // Polling de sincronização HTTP contínuo (ativo como fallback caso o WebSocket não esteja disponível)
    const syncInterval = window.setInterval(async () => {
      if (socket.connected) return; // Elimina requisições periódicas caso o WebSocket esteja conectado

      const activeId = selectedMachineIdRef.current;
      if (activeId !== null) {
        try {
          const resp = await apiFetch(`/status-maquinas/${activeId}`);
          if (resp.ok) {
            const m = await resp.json();
            if (m) applyTelemetryData(m);
            setIsServerSignal(true);
          }
        } catch {
          // Mantém integridade sem travar
        }
      }
    }, 8000);

    return () => {
      window.clearInterval(syncInterval);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('dashboard_update', applyTelemetryData);
      socket.off('telemetria', applyTelemetryData);
      socket.off('esp32_data', applyTelemetryData);
      socket.disconnect();
    };
  }, [authenticatedUserId]);

  return (
      <div className="min-h-screen font-sans transition-colors duration-700">
        {/* Notificações globais de conexão */}
        <ConnectionStatus 
          isConnected={isInternetConnected} 
          isServerSignal={isServerSignal}
        />

        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />
          <Route element={<RequireAuth />}>
            <Route
              path="/"
              element={
              <DashboardView 
                darkMode={darkMode}
                setDarkMode={setDarkMode}
                status={status}
                isSocketConnected={isSocketConnected}
                isServerSignal={isServerSignal}
                uptime={uptime}
                downtime={downtime}
                power={power}
                voltage={voltage}
                current={current}
                vibrationHz={vibrationHz}
                vibrationStructural={vibrationStructural}
                vibrationData={vibrationData}
                liveValueData={liveValueData}
                historyData={historyData}
                dailyUptimeData={dailyUptimeData}
                availableMachines={availableMachines}
                selectedMachineId={selectedMachineId}
                setSelectedMachineId={setSelectedMachineId}
                productiveRanking={productiveRanking}
                stopsRanking={stopsRanking}
                shiftProductivity={shiftProductivity}
                maintenanceTasks={maintenanceTasks}
                telemetryLogs={telemetryLogs}
              />
              }
            />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/machines" replace />} />
              <Route path="machines" element={<MachinesPage />} />
              <Route path="funcionarios" element={
                <RequireProfile allowedProfiles={['ADMIN']}>
                  <FuncionariosPage />
                </RequireProfile>
              } />
              <Route path="maintenance" element={<MaintenancePage />} />
              <Route path="audit" element={
                <RequireProfile allowedProfiles={['ADMIN']}>
                  <AuditPage />
                </RequireProfile>
              } />
            </Route>
          </Route>
          
          {/* Rota Curinga */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
  );
}
