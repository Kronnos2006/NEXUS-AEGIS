export const AGENT_IDS = {
  WEB_DEV: "web-dev-1",
  MARKETING: "marketing-1",
  MONITOR: "monitor-1",
  AEGIS: "aegis-1",
  SALES: "sales-1",
  CODE: "code-1",
  RESEARCHER: "researcher-1",
  FINANCE: "finance-1",
  ASSISTANT: "assistant-1",
  GAME_BOT: "game-bot-1"
} as const;

export type AgentId = typeof AGENT_IDS[keyof typeof AGENT_IDS];
