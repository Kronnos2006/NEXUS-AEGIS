import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import {
  Cpu,
  Database,
  Activity,
  Server,
  Network,
  Clock,
  MessageSquare,
  Terminal,
  Zap,
  Play,
  Settings,
  Shield,
  User,
  Bot,
  Brain,
  Layout,
  Code,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Eye,
  Activity as ActivityIcon,
  Gamepad2,
  MousePointer2,
  Volume2,
  Ghost,
  Paperclip,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface Agent {
  id: string;
  name: string;
  type: string;
  status: string;
  last_action: string;
  last_report: string;
  role: string;
  version: string;
}

interface Setting {
  key: string;
  value: string;
}

interface WatchdogLog {
  id: number;
  timestamp: string;
  event: string;
  status: string;
  details: string;
}

interface AgentVersion {
  id: number;
  agent_id: string;
  version: string;
  changelog: string;
  timestamp: string;
}

interface Backup {
  id: number;
  timestamp: string;
  file_path: string;
  status: string;
  type: string;
}

interface PendingTask {
  id: string;
  agentId: string;
  task: any;
  priority: string;
}

interface SystemHealth {
  cpu: number;
  ram: number;
  cpu_temp: number;
}

interface Memory {
  id: number;
  timestamp: string;
  source: string;
  type: string;
  content: string;
  priority: string;
  metadata: string;
}

interface SecurityLog {
  id: number;
  timestamp: string;
  event_type: string;
  severity: string;
  description: string;
  source_ip: string;
  action_taken: string;
  is_nexus_blocked: boolean;
}

interface GameBot {
  id: string;
  game_name: string;
  bot_type: string;
  status: string;
  last_action: string;
  metrics: string;
  last_update: string;
}

interface UserPreference {
  key: string;
  value: string;
  category: string;
}

interface StrategicGoal {
  id: number;
  goal: string;
  progress: number;
  status: string;
  last_update: string;
}

interface AgentMetric {
  agent_id: string;
  avg_duration: number;
  success_rate: number;
  last_health_score: number;
}

export default function App() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [memory, setMemory] = useState<Memory[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [taskHistory, setTaskHistory] = useState<Memory[]>([]);
  const [watchdogLogs, setWatchdogLogs] = useState<WatchdogLog[]>([]);
  const [agentMetrics, setAgentMetrics] = useState<AgentMetric[]>([]);
  const [strategicGoals, setStrategicGoals] = useState<StrategicGoal[]>([]);
  const [health, setHealth] = useState<SystemHealth>({ cpu: 0, ram: 0, cpu_temp: 0 });
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'security' | 'agents' | 'system' | 'game' | 'chat'>('dashboard');
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [agentVersions, setAgentVersions] = useState<AgentVersion[]>([]);
  const [lockdownConfirm, setLockdownConfirm] = useState(false);
  const [auditStatus, setAuditStatus] = useState<{ isValid: boolean, failures: number[] } | null>(null);
  const [historyFilter, setHistoryFilter] = useState({ agent: 'all', status: 'all' });
  const [gameBots, setGameBots] = useState<GameBot[]>([]);
  const [userPrefs, setUserPrefs] = useState<UserPreference[]>([]);
  const [eccProposals, setEccProposals] = useState<Memory[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [memory, activeTab]);

  useEffect(() => {
    socketRef.current = io();

    socketRef.current.on("connect", () => setConnected(true));
    socketRef.current.on("disconnect", () => setConnected(false));

    socketRef.current.on("nexus_update", (data: { 
      agents: Agent[]; 
      memory: Memory[]; 
      securityLogs: SecurityLog[]; 
      settings: Setting[];
      backups: Backup[];
      pendingTasks: PendingTask[];
      taskHistory: Memory[];
      health: SystemHealth;
      watchdogLogs: WatchdogLog[];
      gameBots: GameBot[];
      agentMetrics: AgentMetric[];
      strategicGoals: StrategicGoal[];
    }) => {
      setAgents(data.agents);
      setMemory(data.memory);
      setSecurityLogs(data.securityLogs);
      setSettings(data.settings);
      setBackups(data.backups);
      setPendingTasks(data.pendingTasks);
      setTaskHistory(data.taskHistory);
      setWatchdogLogs(data.watchdogLogs);
      setGameBots(data.gameBots || []);
      setAgentMetrics(data.agentMetrics || []);
      setStrategicGoals(data.strategicGoals || []);
      if (data.health) setHealth(data.health);
      
      // Fetch ECC proposals if memory changed
      fetch("/api/ecc/proposals")
        .then(res => res.json())
        .then(setEccProposals);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      fetch(`/api/agents/${selectedAgent}/versions`)
        .then(res => res.json())
        .then(setAgentVersions);
    }
  }, [selectedAgent]);

  const updateSetting = async (key: string, value: string) => {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
    } catch (err) {
      console.error("Error updating setting:", err);
    }
  };

  const dispatchTask = async (agentId: string, taskName: string, priority: string = "medium") => {
    try {
      const res = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, task: { name: taskName }, priority }),
      });
      const data = await res.json();
      if (data.status === 'pending_approval') {
        // alert(`Acción bloqueada: ${data.message}`);
      }
    } catch (err) {
      console.error("Error al enviar tarea:", err);
    }
  };

  const approveTask = async (taskId: string) => {
    try {
      await fetch("/api/tasks/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
    } catch (err) {
      console.error("Error approving task:", err);
    }
  };

  const rejectTask = async (taskId: string) => {
    try {
      await fetch("/api/tasks/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
    } catch (err) {
      console.error("Error rejecting task:", err);
    }
  };

  const triggerBackup = async () => {
    try {
      await fetch("/api/backups/trigger", { method: "POST" });
    } catch (err) {
      console.error("Error triggering backup:", err);
    }
  };

  const triggerSystemRollback = async () => {
    if (!confirm("¿ESTÁS SEGURO? Esto restaurará el sistema al último backup exitoso y podría causar pérdida de datos recientes.")) return;
    try {
      const res = await fetch("/api/system/rollback", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
      } else {
        alert("Error: " + data.message);
      }
    } catch (err) {
      console.error("Error triggering system rollback:", err);
    }
  };

  const rollbackAgent = async (agentId: string, version: string) => {
    try {
      await fetch("/api/agents/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, version }),
      });
      setSelectedAgent(null);
    } catch (err) {
      console.error("Error rolling back agent:", err);
    }
  };

  const restartAgent = async (agentId: string) => {
    try {
      await fetch("/api/agents/restart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
    } catch (err) {
      console.error("Error restarting agent:", err);
    }
  };

  const verifyAuditChain = async () => {
    try {
      const res = await fetch("/api/system/audit/verify");
      const data = await res.json();
      setAuditStatus({ isValid: data.isValid, failures: data.failures });
    } catch (err) {
      console.error("Error verifying audit chain:", err);
    }
  };

  const controlGameBot = async (botId: string, action: 'start' | 'stop') => {
    try {
      await fetch("/api/game/bots/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botId, action }),
      });
    } catch (err) {
      console.error("Error controlling game bot:", err);
    }
  };

  const applyEccProposal = async (proposalId: string) => {
    try {
      await fetch("/api/ecc/proposals/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId }),
      });
    } catch (err) {
      console.error("Error applying ECC proposal:", err);
    }
  };

  const sendChatMessage = async () => {
    if (!chatMessage.trim() || isSending) return;
    setIsSending(true);
    try {
      // Obtener historial relevante (últimos 10 mensajes)
      const history = memory
        .filter(m => m.source === 'user' || m.source === 'valeria')
        .slice(0, 10)
        .reverse();

      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatMessage, history }),
      });
      setChatMessage("");
    } catch (err) {
      console.error("Error sending chat message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsSending(true);
    try {
      await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });
    } catch (err) {
      console.error("Error uploading file:", err);
    } finally {
      setIsSending(false);
    }
  };

  const getSettingValue = (key: string) => settings.find(s => s.key === key)?.value;

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const AgentCard = ({ agent, onHistory }: { agent: Agent, onHistory: () => void }) => (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[#141414] border border-[#222] p-5 rounded-2xl shadow-lg hover:border-blue-500/30 transition-all group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 group-hover:scale-110 transition-transform`}>
            {agent.type === "Web Developer" ? <Layout className="text-blue-500" size={20} /> : 
             agent.type === "Marketing" ? <TrendingUp className="text-emerald-500" size={20} /> :
             agent.type === "Security" ? <ShieldCheck className="text-red-500" size={20} /> :
             agent.type === "Sales" ? <Zap className="text-orange-500" size={20} /> :
             agent.type === "Code Auditor" ? <Code className="text-purple-500" size={20} /> :
             <ActivityIcon className="text-gray-500" size={20} />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">{agent.name}</h3>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">{agent.type}</span>
              <span className="text-[8px] bg-gray-800 text-gray-400 px-1 rounded">v{agent.version}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button 
            onClick={onHistory}
            className="p-1.5 text-gray-600 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
            title="Ver Historial"
          >
            <Clock size={14} />
          </button>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${agent.status === 'working' ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-[10px] text-gray-400 uppercase font-mono">{agent.status}</span>
          </div>
          <span className="text-[8px] text-gray-600 uppercase font-bold tracking-tighter">Role: {agent.role}</span>
        </div>
      </div>
      
      <div className="bg-[#0a0a0a] rounded-lg p-3 border border-[#1a1a1a] mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Terminal size={12} className="text-gray-600" />
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Última Acción</span>
        </div>
        <p className="text-xs text-gray-300 font-mono truncate">{agent.last_action}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={() => dispatchTask(agent.id, "Optimización")}
          className="flex items-center justify-center gap-2 py-2 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white border border-blue-600/20 rounded-lg text-[10px] font-bold transition-all active:scale-95"
        >
          <Play size={12} />
          <span>Normal</span>
        </button>
        <button 
          onClick={() => dispatchTask(agent.id, "Acción Crítica", "critical")}
          className="flex items-center justify-center gap-2 py-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/20 rounded-lg text-[10px] font-bold transition-all active:scale-95"
        >
          <AlertCircle size={12} />
          <span>Crítica</span>
        </button>
        <button 
          onClick={() => restartAgent(agent.id)}
          className="col-span-2 flex items-center justify-center gap-2 py-1.5 bg-gray-800/50 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg text-[8px] font-bold transition-all uppercase tracking-widest"
        >
          <Zap size={10} />
          <span>Reiniciar Agente</span>
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#1a1a1a] px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/20">
              <Shield className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">NEXUS AEGIS <span className="text-red-500 text-xs ml-1">v3.5 Alpha</span></h1>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
                  {connected ? "Cerebro Central Activo" : "Desconectado"}
                </span>
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-[#141414] p-1 rounded-xl border border-[#222]">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: Layout },
              { id: 'chat', label: 'Comandos', icon: MessageSquare },
              { id: 'security', label: 'Seguridad', icon: ShieldAlert },
              { id: 'agents', label: 'Agentes', icon: Bot },
              { id: 'game', label: 'Game Bots', icon: Gamepad2 },
              { id: 'system', label: 'Sistema', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.id 
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                    : "text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1a]"
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#141414] border border-[#222] rounded-full">
              <div className={`w-2 h-2 rounded-full ${getSettingValue('safe_mode') === 'true' ? 'bg-emerald-500' : 'bg-gray-600'}`} />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Safe Mode</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {activeTab === 'dashboard' && (
          <>
            {/* Pending Approvals */}
            {pendingTasks.length > 0 && (
              <section className="bg-red-600/5 border border-red-600/20 p-6 rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="text-red-500" size={20} />
                  <h2 className="text-lg font-bold text-white">Acciones Pendientes de Aprobación</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingTasks.map((pt) => (
                    <div key={pt.id} className="bg-[#141414] border border-[#222] p-4 rounded-xl flex justify-between items-center">
                      <div>
                        <p className="text-xs font-bold text-white">{pt.agentId}</p>
                        <p className="text-[10px] text-gray-500 font-mono">{JSON.stringify(pt.task)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => approveTask(pt.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded transition-colors"
                        >
                          Aprobar
                        </button>
                        <button 
                          onClick={() => rejectTask(pt.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold rounded transition-colors"
                        >
                          Rechazar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Security Overview */}
            <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-[#141414] border border-[#222] p-6 rounded-2xl shadow-lg flex items-center gap-4">
                <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                  <ShieldAlert className="text-red-500" size={24} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Alertas AEGIS</p>
                  <p className="text-2xl font-bold text-white">{securityLogs.length}</p>
                </div>
              </div>
              <div className="bg-[#141414] border border-[#222] p-6 rounded-2xl shadow-lg flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <Eye className="text-blue-500" size={24} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Safe Mode</p>
                  <p className={`text-2xl font-bold ${getSettingValue('safe_mode') === 'true' ? 'text-emerald-500' : 'text-gray-500'}`}>
                    {getSettingValue('safe_mode') === 'true' ? 'ACTIVE' : 'OFF'}
                  </p>
                </div>
              </div>
              <div className="bg-[#141414] border border-[#222] p-6 rounded-2xl shadow-lg flex items-center gap-4">
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <ShieldCheck className="text-emerald-500" size={24} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Agentes</p>
                  <p className="text-2xl font-bold text-emerald-500">{agents.length}</p>
                </div>
              </div>
              <div className="bg-[#141414] border border-[#222] p-6 rounded-2xl shadow-lg flex items-center gap-4">
                <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <Zap className="text-purple-500" size={24} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Experimental</p>
                  <p className={`text-2xl font-bold ${getSettingValue('experimental_mode') === 'true' ? 'text-purple-500' : 'text-gray-500'}`}>
                    {getSettingValue('experimental_mode') === 'true' ? 'ON' : 'OFF'}
                  </p>
                </div>
              </div>
            </section>

            {/* Valeria & Security Logs */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                      <Brain className="text-purple-500" size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Cerebro Central (Valeria)</h2>
                  </div>
                </div>

                <div className="bg-[#141414] border border-[#222] rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Brain size={120} className="text-purple-500" />
                  </div>
                  <div className="space-y-4 relative z-10">
                    <div className="flex items-center gap-3 p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-600/20">
                        <User className="text-white" size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Valeria</p>
                        <p className="text-xs text-gray-400 italic">"Analizando infraestructura AEGIS y optimizando defensas..."</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl text-center">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Memoria</p>
                        <p className="text-lg font-bold text-white">SQLite</p>
                      </div>
                      <div className="p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl text-center">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Backups</p>
                        <p className="text-lg font-bold text-white">{backups.length}</p>
                      </div>
                      <div className="p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl text-center">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Modelo</p>
                        <p className="text-lg font-bold text-white">Nemotron</p>
                      </div>
                      <div className="p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl text-center">
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Estado</p>
                        <p className="text-lg font-bold text-emerald-500">SECURE</p>
                      </div>
                    </div>

                    {/* Strategic Goals v4.0 */}
                    <div className="mt-6 space-y-4">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={14} className="text-emerald-500" /> Objetivos Estratégicos
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {strategicGoals.map(goal => (
                          <div key={goal.id} className="bg-[#0a0a0a] border border-[#1a1a1a] p-4 rounded-xl">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-bold text-white">{goal.goal}</span>
                              <span className="text-[10px] text-emerald-500 font-mono">{goal.progress}%</span>
                            </div>
                            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${goal.progress}%` }}
                                className="bg-emerald-500 h-full"
                              />
                            </div>
                          </div>
                        ))}
                        {strategicGoals.length === 0 && (
                          <p className="text-[10px] text-gray-600 italic">No hay objetivos estratégicos activos.</p>
                        )}
                      </div>
                    </div>

                    {/* Agent Health Metrics v4.0 */}
                    <div className="mt-6 space-y-4">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <ActivityIcon size={14} className="text-blue-500" /> Salud de Agentes
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {agentMetrics.map(metric => (
                          <div key={metric.agent_id} className="bg-[#0a0a0a] border border-[#1a1a1a] p-3 rounded-xl">
                            <p className="text-[10px] font-bold text-gray-300 mb-1 truncate">{metric.agent_id}</p>
                            <div className="flex justify-between items-end">
                              <span className="text-[10px] text-gray-500">Health</span>
                              <span className={`text-xs font-bold ${metric.last_health_score > 80 ? 'text-emerald-500' : 'text-orange-500'}`}>
                                {metric.last_health_score}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Memory Log */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Memoria Reciente</h3>
                  <div className="space-y-3">
                    {memory.slice(0, 5).map((m) => (
                      <div key={m.id} className="p-4 bg-[#141414] border border-[#222] rounded-xl flex gap-4">
                        <div className={`w-1 h-full rounded-full ${m.priority === 'critical' ? 'bg-red-500' : m.priority === 'high' ? 'bg-orange-500' : 'bg-blue-500'}`} />
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] uppercase tracking-widest font-bold ${m.source === 'user' ? 'text-blue-500' : 'text-purple-500'}`}>
                                {m.source}
                              </span>
                              <span className="text-[8px] bg-gray-800 text-gray-500 px-1 rounded uppercase">{m.type}</span>
                            </div>
                            <span className="text-[10px] text-gray-600 font-mono">{formatTime(m.timestamp)}</span>
                          </div>
                          <p className="text-sm text-gray-300">{m.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Security Logs Log */}
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                    <ShieldAlert className="text-red-500" size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Logs AEGIS</h2>
                </div>
                <div className="bg-[#141414] border border-[#222] rounded-2xl p-4 h-[500px] overflow-y-auto space-y-3 custom-scrollbar">
                  {securityLogs.map((log) => (
                    <div key={log.id} className={`p-3 bg-[#0a0a0a] border rounded-xl space-y-1 ${log.is_nexus_blocked ? 'border-red-500/50 bg-red-500/5' : 'border-[#1a1a1a]'}`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-[9px] uppercase tracking-widest font-bold ${log.severity === 'critical' ? 'text-red-500' : 'text-orange-500'}`}>
                          {log.event_type}
                        </span>
                        <span className="text-[9px] text-gray-600 font-mono">{formatTime(log.timestamp)}</span>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">{log.description}</p>
                      <div className="flex justify-between items-center pt-1 border-t border-[#1a1a1a] mt-1">
                        <span className="text-[8px] text-gray-500 font-mono">IP: {log.source_ip}</span>
                        <span className={`text-[8px] font-bold uppercase ${log.is_nexus_blocked ? 'text-red-500' : 'text-emerald-500'}`}>
                          {log.action_taken}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'chat' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100vh-180px)]">
            {/* Chat Interface */}
            <div className="lg:col-span-3 flex flex-col bg-[#141414] border border-[#222] rounded-3xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-[#222] flex justify-between items-center bg-[#1a1a1a]">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <Brain className="text-purple-500" size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Cerebro Central: Valeria</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Canal Directo de Comandos</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Online</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {memory.filter(m => m.source === 'user' || m.source === 'valeria').slice().reverse().map((m) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={m.id}
                    className={`flex ${m.source === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] p-4 rounded-2xl ${
                      m.source === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-[#0a0a0a] border border-[#222] text-gray-200 rounded-tl-none'
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-bold uppercase tracking-tighter opacity-60">
                          {m.source === 'user' ? 'José Mario' : 'Valeria'}
                        </span>
                        <span className="text-[8px] opacity-40 font-mono">{formatTime(m.timestamp)}</span>
                      </div>
                      <p className="text-sm leading-relaxed">{m.content}</p>
                    </div>
                  </motion.div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="p-6 bg-[#0a0a0a] border-t border-[#222]">
                <div className="flex gap-3">
                  <label className="p-4 bg-[#141414] border border-[#222] hover:border-purple-500/50 text-gray-400 hover:text-white rounded-2xl transition-all cursor-pointer">
                    <Paperclip size={20} />
                    <input type="file" className="hidden" onChange={uploadFile} />
                  </label>
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Escribe una orden para Valeria..."
                    className="flex-1 bg-[#141414] border border-[#222] rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-purple-500/50 transition-all"
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={isSending || !chatMessage.trim()}
                    className="p-4 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-2xl transition-all shadow-lg shadow-purple-600/20"
                  >
                    <Zap size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* Suggestions & Quick Actions */}
            <div className="space-y-6">
              <div className="bg-[#141414] border border-[#222] p-6 rounded-3xl space-y-6">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Brain className="text-purple-500" size={16} /> Sugerencias de Valeria
                </h3>
                <div className="space-y-3">
                  {[
                    "¿Cuál es el estado de la seguridad?",
                    "Ejecuta un escaneo de vulnerabilidades PRO",
                    "Optimiza el inventario en No Man's Sky",
                    "Muestra el historial de auditoría",
                  ].map((sug, i) => (
                    <button
                      key={i}
                      onClick={() => setChatMessage(sug)}
                      className="w-full text-left p-3 bg-[#0a0a0a] border border-[#1a1a1a] hover:border-purple-500/30 rounded-xl text-xs text-gray-400 hover:text-white transition-all group"
                    >
                      <span className="group-hover:text-purple-500 transition-colors">→</span> {sug}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-blue-600/5 border border-blue-600/20 p-6 rounded-3xl space-y-4">
                <h3 className="text-sm font-bold text-blue-500 flex items-center gap-2">
                  <ActivityIcon size={16} /> Contexto de Sesión
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-500">Agentes Activos</span>
                    <span className="text-white font-bold">{agents.length}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-500">Modo Seguro</span>
                    <span className="text-emerald-500 font-bold">{getSettingValue('safe_mode') === 'true' ? 'ON' : 'OFF'}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-500">Uptime Cerebro</span>
                    <span className="text-white font-bold">99.9%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-8">
            <div className="bg-[#141414] border border-[#222] p-8 rounded-3xl space-y-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <ShieldAlert className="text-red-500" /> AEGIS Override Controls
              </h2>
              <div className="flex gap-4">
                {getSettingValue('security_lockdown') === 'false' && !lockdownConfirm ? (
                  <button 
                    onClick={() => setLockdownConfirm(true)}
                    className="flex-1 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 bg-red-600/20 hover:bg-red-600/40 text-red-500 border border-red-600/30"
                  >
                    <Lock size={20} />
                    ACTIVATE EMERGENCY LOCKDOWN
                  </button>
                ) : getSettingValue('security_lockdown') === 'false' && lockdownConfirm ? (
                  <button 
                    onClick={() => {
                      updateSetting('security_lockdown', 'true');
                      setLockdownConfirm(false);
                    }}
                    className="flex-1 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/40 animate-pulse"
                  >
                    <AlertCircle size={20} />
                    CONFIRM LOCKDOWN NOW
                  </button>
                ) : (
                  <button 
                    onClick={() => updateSetting('security_lockdown', 'false')}
                    className="flex-1 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <ShieldCheck size={20} />
                    DEACTIVATE LOCKDOWN
                  </button>
                )}
                {lockdownConfirm && (
                  <button 
                    onClick={() => setLockdownConfirm(false)}
                    className="px-8 py-4 rounded-2xl font-bold bg-[#222] text-gray-400 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 italic">
                * El bloqueo de seguridad (Lockdown) pausa todos los ciclos autónomos de NEXUS y requiere aprobación manual para cualquier acción de agente.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-[#141414] border border-[#222] p-8 rounded-3xl space-y-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Lock className="text-red-500" /> Configuración de Seguridad
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                    <div>
                      <p className="font-bold text-white">Safe Mode (Modo Seguro)</p>
                      <p className="text-xs text-gray-500">Bloquea acciones críticas de NEXUS sin aprobación humana.</p>
                    </div>
                    <button 
                      onClick={() => updateSetting('safe_mode', getSettingValue('safe_mode') === 'true' ? 'false' : 'true')}
                      className={`w-12 h-6 rounded-full transition-all relative ${getSettingValue('safe_mode') === 'true' ? 'bg-emerald-500' : 'bg-gray-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${getSettingValue('safe_mode') === 'true' ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                    <div>
                      <p className="font-bold text-white">Experimental Mode</p>
                      <p className="text-xs text-gray-500">Permite a la IA probar nuevas lógicas en un entorno controlado.</p>
                    </div>
                    <button 
                      onClick={() => updateSetting('experimental_mode', getSettingValue('experimental_mode') === 'true' ? 'false' : 'true')}
                      className={`w-12 h-6 rounded-full transition-all relative ${getSettingValue('experimental_mode') === 'true' ? 'bg-purple-500' : 'bg-gray-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${getSettingValue('experimental_mode') === 'true' ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                    <div>
                      <p className="font-bold text-white">Low Power Mode (Bajo Consumo)</p>
                      <p className="text-xs text-gray-500">Aumenta el intervalo del loop cuando no hay actividad crítica.</p>
                    </div>
                    <button 
                      onClick={() => updateSetting('low_power_mode', getSettingValue('low_power_mode') === 'true' ? 'false' : 'true')}
                      className={`w-12 h-6 rounded-full transition-all relative ${getSettingValue('low_power_mode') === 'true' ? 'bg-blue-500' : 'bg-gray-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${getSettingValue('low_power_mode') === 'true' ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                    <div>
                      <p className="font-bold text-white">ECC Motor (Self-Improvement)</p>
                      <p className="text-xs text-gray-500">Permite a Valeria proponer mejoras de código y optimizaciones.</p>
                    </div>
                    <button 
                      onClick={() => updateSetting('ecc_motor_enabled', getSettingValue('ecc_motor_enabled') === 'true' ? 'false' : 'true')}
                      className={`w-12 h-6 rounded-full transition-all relative ${getSettingValue('ecc_motor_enabled') === 'true' ? 'bg-blue-600' : 'bg-gray-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${getSettingValue('ecc_motor_enabled') === 'true' ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                  <div className="p-4 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a] space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="font-bold text-white">Intervalo de Ciclo (Segundos)</p>
                      <span className="text-xs font-mono text-blue-500">{getSettingValue('autonomous_loop_interval')}s</span>
                    </div>
                    <input 
                      type="range" 
                      min="10" 
                      max="300" 
                      step="10"
                      value={getSettingValue('autonomous_loop_interval') || "60"}
                      onChange={(e) => updateSetting('autonomous_loop_interval', e.target.value)}
                      className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <p className="text-[10px] text-gray-500 italic">Ajusta qué tan agresivo es el loop autónomo de Valeria.</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#141414] border border-[#222] p-8 rounded-3xl space-y-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Network className="text-blue-500" /> Listas Blancas
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2 block">IPs Permitidas</label>
                    <div className="bg-[#0a0a0a] p-3 rounded-xl border border-[#1a1a1a] text-xs font-mono text-blue-400">
                      {getSettingValue('whitelist_ips')}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2 block">Procesos Protegidos</label>
                    <div className="bg-[#0a0a0a] p-3 rounded-xl border border-[#1a1a1a] text-xs font-mono text-emerald-400">
                      {getSettingValue('whitelist_processes')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Task History with Signatures */}
            <div className="bg-[#141414] border border-[#222] p-8 rounded-3xl space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <ShieldCheck className="text-emerald-500" /> Historial de Auditoría Criptográfica
                </h2>
                <div className="flex gap-3">
                  <button 
                    onClick={verifyAuditChain}
                    className="px-4 py-2 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white border border-blue-600/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                  >
                    <ActivityIcon size={14} />
                    Verificar Integridad
                  </button>
                  {auditStatus && (
                    <div className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 ${auditStatus.isValid ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                      {auditStatus.isValid ? <ShieldCheck size={14} /> : <AlertCircle size={14} />}
                      {auditStatus.isValid ? 'CADENA ÍNTEGRA' : 'CADENA CORRUPTA'}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 uppercase font-bold mb-2 block">Filtrar por Agente</label>
                  <select 
                    value={historyFilter.agent}
                    onChange={(e) => setHistoryFilter({...historyFilter, agent: e.target.value})}
                    className="w-full bg-[#141414] border border-[#222] text-xs text-white p-2 rounded-lg outline-none"
                  >
                    <option value="all">Todos los Agentes</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 uppercase font-bold mb-2 block">Estado</label>
                  <select 
                    value={historyFilter.status}
                    onChange={(e) => setHistoryFilter({...historyFilter, status: e.target.value})}
                    className="w-full bg-[#141414] border border-[#222] text-xs text-white p-2 rounded-lg outline-none"
                  >
                    <option value="all">Todos</option>
                    <option value="APROBADA">Aprobadas</option>
                    <option value="RECHAZADA">Rechazadas</option>
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {taskHistory.length === 0 && <p className="text-gray-500 text-center py-4">No hay historial de acciones aprobadas.</p>}
                {taskHistory
                  .filter(h => historyFilter.agent === 'all' || h.content.includes(historyFilter.agent))
                  .filter(h => historyFilter.status === 'all' || h.content.includes(historyFilter.status))
                  .map((h) => {
                  let sig = "";
                  try {
                    const meta = JSON.parse(h.metadata);
                    sig = meta.signature;
                  } catch(e) {}
                  
                  return (
                    <div key={h.id} className={`p-4 bg-[#0a0a0a] border rounded-2xl flex flex-col gap-2 ${auditStatus?.failures.includes(h.id) ? 'border-red-500/50 bg-red-500/5' : 'border-[#1a1a1a]'}`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${h.content.includes('APROBADA') ? 'text-emerald-500' : 'text-red-500'}`}>
                            {h.content.includes('APROBADA') ? 'APROBADA' : 'RECHAZADA'}
                          </span>
                          {auditStatus?.failures.includes(h.id) && <span className="text-[8px] bg-red-500 text-white px-1 rounded">HASH ERROR</span>}
                        </div>
                        <span className="text-[10px] text-gray-600 font-mono">{formatTime(h.timestamp)}</span>
                      </div>
                      <p className="text-xs text-gray-300">{h.content}</p>
                      {sig && (
                        <div className="flex items-center gap-2 mt-1">
                          <Lock size={10} className="text-emerald-500" />
                          <span className="text-[8px] text-emerald-500/70 font-mono truncate">ED25519 SIG: {sig}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#141414] border border-[#222] p-8 rounded-3xl space-y-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Terminal className="text-orange-500" /> Palabras Clave de Alto Riesgo (AEGIS)
              </h2>
              <div className="p-4 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                <p className="text-xs text-gray-400 mb-4">Estas palabras clave activan automáticamente el Modo Seguro y requieren aprobación humana.</p>
                <div className="flex flex-wrap gap-2">
                  {JSON.parse(getSettingValue('high_risk_keywords') || "[]").map((k: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold rounded-full uppercase tracking-widest">
                      {k}
                    </span>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-[#1a1a1a]">
                  <p className="text-[10px] text-gray-500 italic">* La modificación de esta lista requiere privilegios de administrador y doble factor (simulado).</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agents' && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <Bot className="text-emerald-500" size={20} />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">Sub-Agentes NEXUS</h2>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {agents.map((agent) => (
                  <div key={agent.id}>
                    <AgentCard agent={agent} onHistory={() => setSelectedAgent(agent.id)} />
                  </div>
                ))}
              </AnimatePresence>
            </div>

            {selectedAgent && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#141414] border border-[#222] p-8 rounded-3xl space-y-6 mt-8"
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Clock className="text-blue-500" /> Historial de Versiones: {selectedAgent}
                  </h2>
                  <button onClick={() => setSelectedAgent(null)} className="text-gray-500 hover:text-white">Cerrar</button>
                </div>
                <div className="space-y-4">
                  {agentVersions.length === 0 && <p className="text-gray-500 text-center py-8">No hay historial registrado para este agente.</p>}
                  {agentVersions.map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-white font-bold">v{v.version}</span>
                          <span className="text-[10px] text-gray-500 font-mono">{formatTime(v.timestamp)}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{v.changelog}</p>
                      </div>
                      <button 
                        onClick={() => rollbackAgent(v.agent_id, v.version)}
                        className="px-4 py-2 bg-[#222] hover:bg-[#333] text-white text-[10px] font-bold rounded-xl transition-all"
                      >
                        Rollback
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </section>
        )}

        {activeTab === 'game' && (
          <div className="space-y-8">
            <div className="bg-[#141414] border border-[#222] p-8 rounded-3xl space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Gamepad2 className="text-orange-500" /> Control de Automatización de Juegos
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
                    <span className="text-[10px] text-gray-500 uppercase font-bold">Desktop Control</span>
                    <button 
                      onClick={() => updateSetting('game_control_enabled', getSettingValue('game_control_enabled') === 'true' ? 'false' : 'true')}
                      className={`w-10 h-5 rounded-full transition-all relative ${getSettingValue('game_control_enabled') === 'true' ? 'bg-orange-500' : 'bg-gray-700'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${getSettingValue('game_control_enabled') === 'true' ? 'right-0.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                  <button 
                    onClick={() => gameBots.forEach(b => controlGameBot(b.id, 'stop'))}
                    className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/20 flex items-center gap-2"
                  >
                    <AlertCircle size={14} />
                    PAUSA DE EMERGENCIA (ALL BOTS)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gameBots.length === 0 && (
                  <div className="col-span-full py-12 text-center bg-[#0a0a0a] rounded-2xl border border-dashed border-[#222]">
                    <Ghost className="mx-auto text-gray-700 mb-4" size={48} />
                    <p className="text-gray-500">No hay bots de juego activos en este momento.</p>
                    <button 
                      onClick={() => dispatchTask('game-bot-1', 'Iniciar Exploración NMS')}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg"
                    >
                      Desplegar NMS-Bot (Alpha)
                    </button>
                  </div>
                )}
                {gameBots.map((bot) => (
                  <motion.div 
                    key={bot.id}
                    layout
                    className="bg-[#0a0a0a] border border-[#1a1a1a] p-5 rounded-2xl space-y-4"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                          <Bot className="text-orange-500" size={18} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">{bot.game_name}</h3>
                          <span className="text-[10px] text-gray-500 uppercase tracking-widest">{bot.bot_type}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${bot.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-800 text-gray-500'}`}>
                        {bot.status}
                      </span>
                    </div>

                    <div className="bg-[#141414] p-3 rounded-xl border border-[#222]">
                      <div className="flex items-center gap-2 mb-1">
                        <ActivityIcon size={12} className="text-gray-600" />
                        <span className="text-[10px] text-gray-500 uppercase">Actividad Actual</span>
                      </div>
                      <p className="text-xs text-gray-300 font-mono italic">"{bot.last_action}"</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => controlGameBot(bot.id, bot.status === 'active' ? 'stop' : 'start')}
                        className={`py-2 rounded-lg text-[10px] font-bold transition-all ${bot.status === 'active' ? 'bg-gray-800 text-gray-400' : 'bg-orange-600 text-white'}`}
                      >
                        {bot.status === 'active' ? 'Pausar Bot' : 'Reanudar Bot'}
                      </button>
                      <button className="py-2 bg-blue-600/10 text-blue-500 border border-blue-600/20 rounded-lg text-[10px] font-bold">
                        Ver Métricas
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-[#141414] border border-[#222] p-8 rounded-3xl space-y-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <User className="text-blue-500" /> Perfil de Estilo de Juego (NEXUS Memory)
                </h2>
                <div className="space-y-4">
                  <div className="p-4 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a] space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">Preferencia de Farmeo</span>
                      <span className="text-xs text-white font-bold">Recursos Raros (S-Class)</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">Agresividad de Combate</span>
                      <span className="text-xs text-white font-bold">Defensivo / Evasivo</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">Prioridad de Inventario</span>
                      <span className="text-xs text-white font-bold">Optimización de Espacio</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500 italic">
                    * Valeria utiliza estos datos para ajustar el comportamiento de los bots sin intervención manual.
                  </p>
                </div>
              </div>

              <div className="bg-[#141414] border border-[#222] p-8 rounded-3xl space-y-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <MousePointer2 className="text-purple-500" /> Desktop Automation Layer
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                    <div>
                      <p className="font-bold text-white text-sm">Computer Vision (OpenCV)</p>
                      <p className="text-[10px] text-gray-500">Detección de HUD y elementos en pantalla.</p>
                    </div>
                    <span className="text-[10px] text-emerald-500 font-bold">READY</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                    <div>
                      <p className="font-bold text-white text-sm">Input Emulation (PyAutoGUI)</p>
                      <p className="text-[10px] text-gray-500">Control de mouse y teclado virtual.</p>
                    </div>
                    <span className="text-[10px] text-emerald-500 font-bold">READY</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'system' && (
          <div className="space-y-8">
            {/* ECC Motor Proposals */}
            <div className="bg-[#141414] border border-[#222] p-8 rounded-3xl space-y-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Brain className="text-blue-500" /> ECC Motor: Auto-Mejora Continua
              </h2>
              <div className="space-y-4">
                {eccProposals.length === 0 && <p className="text-gray-500 text-center py-4">No hay propuestas de mejora pendientes.</p>}
                {eccProposals.map((prop) => {
                  const meta = JSON.parse(prop.metadata || '{}');
                  return (
                    <div key={prop.id} className="p-6 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a] flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Code className="text-blue-500" size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">Propuesta de Optimización</p>
                            <p className="text-[10px] text-gray-500 font-mono">ID: {meta.proposalId}</p>
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-600 font-mono">{formatTime(prop.timestamp)}</span>
                      </div>
                      <p className="text-xs text-gray-300 leading-relaxed">{prop.content}</p>
                      <div className="flex gap-3 pt-2">
                        <button 
                          onClick={() => applyEccProposal(meta.proposalId)}
                          className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20"
                        >
                          Aplicar Parche
                        </button>
                        <button className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] text-gray-400 hover:text-white text-[10px] font-bold rounded-xl transition-all">
                          Ignorar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Watchdog Status */}
            <div className="bg-[#141414] border border-[#222] p-8 rounded-3xl space-y-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <Eye className="text-orange-500" /> Watchdog (Guardian of the Guardian)
              </h2>
              <div className="space-y-4">
                {watchdogLogs.length === 0 && <p className="text-gray-500 text-center py-4">No hay eventos recientes del Watchdog.</p>}
                {watchdogLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${log.status === 'critical' ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                      <div>
                        <p className="text-xs font-bold text-white">{log.event.toUpperCase()}</p>
                        <p className="text-[10px] text-gray-500">{log.details}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono">{formatTime(log.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* System Health */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#141414] border border-[#222] p-6 rounded-2xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">CPU Load</p>
                  <Cpu className="text-blue-500" size={16} />
                </div>
                <p className="text-3xl font-bold text-white">{health.cpu.toFixed(1)}%</p>
                <div className="w-full bg-gray-800 h-1.5 rounded-full mt-4 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${health.cpu}%` }}
                    className={`h-full ${health.cpu > 80 ? 'bg-red-500' : 'bg-blue-500'}`} 
                  />
                </div>
              </div>
              <div className="bg-[#141414] border border-[#222] p-6 rounded-2xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">RAM Usage</p>
                  <Server className="text-emerald-500" size={16} />
                </div>
                <p className="text-3xl font-bold text-white">{health.ram.toFixed(1)}%</p>
                <div className="w-full bg-gray-800 h-1.5 rounded-full mt-4 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${health.ram}%` }}
                    className={`h-full ${health.ram > 80 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                  />
                </div>
              </div>
              <div className="bg-[#141414] border border-[#222] p-6 rounded-2xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">CPU Temp</p>
                  <Activity className="text-orange-500" size={16} />
                </div>
                <p className="text-3xl font-bold text-white">{health.cpu_temp}°C</p>
                <div className="w-full bg-gray-800 h-1.5 rounded-full mt-4 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(health.cpu_temp / 100) * 100}%` }}
                    className={`h-full ${health.cpu_temp > 70 ? 'bg-red-500' : 'bg-orange-500'}`} 
                  />
                </div>
              </div>
            </div>

            <div className="bg-[#141414] border border-[#222] p-8 rounded-3xl space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Database className="text-blue-500" /> Gestión de Backups
                </h2>
                <div className="flex gap-3">
                  <button 
                    onClick={triggerSystemRollback}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white text-xs font-bold rounded-xl transition-all border border-red-600/20"
                  >
                    <ActivityIcon size={14} />
                    Rollback Sistema
                  </button>
                  <button 
                    onClick={triggerBackup}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20"
                  >
                    <Play size={14} />
                    Trigger Manual Backup
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {backups.map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between p-4 bg-[#0a0a0a] rounded-2xl border border-[#1a1a1a]">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Database className="text-blue-500" size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{backup.type.toUpperCase()}</p>
                        <p className="text-[10px] text-gray-500 font-mono">{backup.file_path}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400">{formatTime(backup.timestamp)}</p>
                      <span className={`text-[8px] font-bold uppercase ${backup.status === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
                        {backup.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto p-8 text-center border-t border-[#1a1a1a] mt-12">
        <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.3em]">
          NEXUS AEGIS Autonomous Intelligence System • Adaptive Security Layer Active
        </p>
      </footer>
    </div>
  );
}
