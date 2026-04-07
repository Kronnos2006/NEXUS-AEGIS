import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
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
import {
  Cpu,
  Database,
  Activity,
  LogOut,
  RefreshCw,
  Server,
  Network,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Stats {
  timestamp: string;
  cpu: number;
  ram: number;
  network: number;
}

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<Stats[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Fetch initial history
    fetch("/api/history")
      .then((res) => res.json())
      .then((data) => setHistory(data));

    // Connect to WebSocket
    socketRef.current = io();

    socketRef.current.on("connect", () => setConnected(true));
    socketRef.current.on("disconnect", () => setConnected(false));

    socketRef.current.on("stats", (newStats: Stats) => {
      setStats(newStats);
      setHistory((prev) => {
        const newHistory = [...prev, newStats];
        if (newHistory.length > 60) return newHistory.slice(1);
        return newHistory;
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const StatCard = ({
    title,
    value,
    unit,
    icon: Icon,
    color,
    trend,
  }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#141414] border border-[#222] p-6 rounded-2xl shadow-lg hover:border-white/10 transition-colors group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl bg-${color}-500/10 border border-${color}-500/20 group-hover:scale-110 transition-transform`}>
          <Icon className={`text-${color}-500`} size={20} />
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {title}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white">
              {value?.toFixed(1) || "0.0"}
            </span>
            <span className="text-sm text-gray-500">{unit}</span>
          </div>
        </div>
      </div>
      <div className="w-full bg-[#1a1a1a] h-1.5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value || 0}%` }}
          className={`h-full bg-${color}-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]`}
        />
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#1a1a1a] px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Server className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">
                SysMonitor Pro
              </h1>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    connected ? "bg-green-500 animate-pulse" : "bg-red-500"
                  }`}
                />
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
                  {connected ? "Live Connection" : "Disconnected"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#141414] border border-[#222] rounded-lg text-xs text-gray-400">
              <Clock size={14} />
              <span>{stats ? formatTime(stats.timestamp) : "--:--:--"}</span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg text-sm font-medium transition-all active:scale-95"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="CPU Load"
            value={stats?.cpu}
            unit="%"
            icon={Cpu}
            color="blue"
          />
          <StatCard
            title="RAM Usage"
            value={stats?.ram}
            unit="%"
            icon={Database}
            color="purple"
          />
          <StatCard
            title="Network Traffic"
            value={stats?.network / 1024}
            unit="KB/s"
            icon={Network}
            color="emerald"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* CPU Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#141414] border border-[#222] p-6 rounded-2xl shadow-lg"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Activity className="text-blue-500" size={18} />
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  CPU Performance
                </h3>
              </div>
              <span className="text-[10px] text-gray-500 font-mono">
                REAL-TIME DATA
              </span>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatTime}
                    stroke="#444"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#444"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #333",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "#3b82f6" }}
                    labelFormatter={formatTime}
                  />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCpu)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* RAM Chart */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#141414] border border-[#222] p-6 rounded-2xl shadow-lg"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Database className="text-purple-500" size={18} />
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Memory Utilization
                </h3>
              </div>
              <span className="text-[10px] text-gray-500 font-mono">
                REAL-TIME DATA
              </span>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatTime}
                    stroke="#444"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#444"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #333",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "#a855f7" }}
                    labelFormatter={formatTime}
                  />
                  <Area
                    type="monotone"
                    dataKey="ram"
                    stroke="#a855f7"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRam)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Network Chart (Full Width) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#141414] border border-[#222] p-6 rounded-2xl shadow-lg"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Network className="text-emerald-500" size={18} />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">
                Network Bandwidth
              </h3>
            </div>
            <span className="text-[10px] text-gray-500 font-mono">
              RX BYTES PER SECOND
            </span>
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatTime}
                  stroke="#444"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#444"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  itemStyle={{ color: "#10b981" }}
                  labelFormatter={formatTime}
                />
                <Line
                  type="stepAfter"
                  dataKey="network"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto p-6 text-center">
        <p className="text-xs text-gray-600 font-medium uppercase tracking-widest">
          SysMonitor Pro v1.0.0 • Powered by Node.js & React
        </p>
      </footer>
    </div>
  );
}
