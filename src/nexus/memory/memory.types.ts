export type MemorySource = 'user' | 'valeria' | 'agent' | 'aegis' | 'router' | 'orchestrator' | 'system';
export type MemoryType = 'decision' | 'info' | 'alert' | 'experimental' | 'proposal_pro' | 'metric';
export type MemoryPriority = 'low' | 'medium' | 'high' | 'critical';

export interface MemoryEntry {
  id?: number;
  timestamp?: string;
  source: MemorySource;
  type: MemoryType;
  content: string;
  metadata?: any;
  priority: MemoryPriority;
  hash?: string;
  prev_hash?: string;
}

export interface AgentLogEntry {
  id?: number;
  agentId: string;
  task: any;
  result: any;
  duration: number;
  timestamp?: string;
}

export interface SystemEventEntry {
  id?: number;
  type: string;
  message: string;
  severity: MemoryPriority;
  timestamp?: string;
}
