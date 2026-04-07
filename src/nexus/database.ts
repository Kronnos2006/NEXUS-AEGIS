import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";

let db: Database | null = null;

export async function initDatabase() {
  if (db) return db;

  db = await open({
    filename: path.join(process.cwd(), "nexus_aegis.sqlite"),
    driver: sqlite3.Database,
  });

  await db.exec(`
    -- Configuración Global (Safe Mode, Experimental, Whitelists)
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Memoria de Conversaciones y Decisiones (Centralizada)
    CREATE TABLE IF NOT EXISTS memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      source TEXT, -- 'user', 'valeria', 'agent', 'aegis'
      type TEXT, -- 'decision', 'info', 'alert', 'experimental'
      content TEXT,
      metadata TEXT,
      priority TEXT DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
      hash TEXT,
      prev_hash TEXT
    );

    -- Estado de Agentes con Roles y Versiones
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT,
      type TEXT,
      role TEXT DEFAULT 'agent', -- 'brain', 'security', 'agent'
      status TEXT,
      version TEXT DEFAULT '1.0.0',
      last_action TEXT,
      last_report DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Registro de Seguridad AEGIS (Paranoico)
    CREATE TABLE IF NOT EXISTS security_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      event_type TEXT, 
      severity TEXT, 
      description TEXT,
      source_ip TEXT,
      action_taken TEXT,
      is_nexus_blocked BOOLEAN DEFAULT 0
    );

    -- Tareas con Prioridades y Aprobación Humana
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT,
      description TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT, -- 'pending_approval', 'queued', 'working', 'completed', 'failed'
      requires_approval BOOLEAN DEFAULT 0,
      signature TEXT,
      result TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Registro de Backups
    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      file_path TEXT,
      status TEXT,
      type TEXT -- 'auto_6h', 'auto_24h', 'manual'
    );
  `);

  // Inicializar configuraciones por defecto
  const defaultSettings = [
    ['safe_mode', 'true'],
    ['experimental_mode', 'false'],
    ['whitelist_ips', '["127.0.0.1"]'],
    ['whitelist_processes', '["node", "npm", "python", "tsx"]'],
    ['max_actions_per_hour', '50'],
    ['security_lockdown', 'false'],
    ['autonomous_loop_interval', '60'], // Segundos
    ['log_retention_days', '30'],
    ['low_power_mode', 'false'],
    ['high_risk_keywords', '["borrar", "delete", "format", "kill", "stop", "shutdown", "firewall", "port", "rm -rf", "dd", "iptables", "mkfs"]'],
    ['public_key', ''],
    ['private_key', ''],
    ['game_control_enabled', 'false'],
    ['nms_auto_farming', 'false']
  ];

  for (const [key, value] of defaultSettings) {
    await db.run("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", [key, value]);
  }

  console.log("NEXUS AEGIS Memory System Initialized");
  // Tabla de Historial de Versiones de Agentes
  await db.exec(`
    CREATE TABLE IF NOT EXISTS agent_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      version TEXT NOT NULL,
      changelog TEXT,
      config_snapshot TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabla de Logs del Watchdog
  await db.exec(`
    CREATE TABLE IF NOT EXISTS watchdog_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event TEXT NOT NULL,
      status TEXT NOT NULL,
      details TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Registro de Bots de Juego (NMS, etc.)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS game_bots (
      id TEXT PRIMARY KEY,
      game_name TEXT,
      bot_type TEXT, -- 'farming', 'inventory', 'exploration'
      status TEXT, -- 'active', 'paused', 'stuck', 'error'
      last_action TEXT,
      metrics TEXT, -- JSON con stats del bot
      last_update DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Preferencias del Usuario (Memoria de Estilo de Juego)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      key TEXT PRIMARY KEY,
      value TEXT,
      category TEXT, -- 'game_style', 'farming_priorities', 'voice_profile'
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  return db;
}

export async function saveAgentVersion(agentId: string, version: string, changelog: string, config: any) {
  const db = await initDatabase();
  await db.run(
    "INSERT INTO agent_versions (agent_id, version, changelog, config_snapshot) VALUES (?, ?, ?, ?)",
    [agentId, version, changelog, JSON.stringify(config)]
  );
}

export async function getAgentVersions(agentId: string) {
  const db = await initDatabase();
  return await db.all("SELECT * FROM agent_versions WHERE agent_id = ? ORDER BY timestamp DESC", [agentId]);
}

export async function logWatchdogEvent(event: string, status: string, details: string) {
  const db = await initDatabase();
  await db.run(
    "INSERT INTO watchdog_logs (event, status, details) VALUES (?, ?, ?)",
    [event, status, details]
  );
}

export async function getWatchdogLogs(limit: number = 50) {
  const db = await initDatabase();
  return await db.all("SELECT * FROM watchdog_logs ORDER BY timestamp DESC LIMIT ?", [limit]);
}

export async function cleanOldLogs() {
  const db = await initDatabase();
  const retentionDays = parseInt(await getSetting("log_retention_days") || "30");
  
  await db.run("DELETE FROM memory WHERE timestamp < datetime('now', '-' || ? || ' days')", [retentionDays]);
  await db.run("DELETE FROM security_logs WHERE timestamp < datetime('now', '-' || ? || ' days')", [retentionDays]);
  await db.run("DELETE FROM watchdog_logs WHERE timestamp < datetime('now', '-' || ? || ' days')", [retentionDays]);
  
  console.log(`NEXUS: Limpieza de logs completada (Retención: ${retentionDays} días).`);
}

export async function saveMemory(source: string, content: string, type: string = 'info', priority: string = 'low', metadata: any = {}) {
  const database = await initDatabase();
  
  // Hash Chaining Logic
  const lastEntry = await database.get("SELECT hash FROM memory ORDER BY id DESC LIMIT 1");
  const prevHash = lastEntry ? lastEntry.hash : "0000000000000000000000000000000000000000000000000000000000000000";
  
  const crypto = await import("crypto");
  const dataToHash = `${prevHash}${source}${content}${type}${priority}${JSON.stringify(metadata)}`;
  const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');

  await database.run(
    "INSERT INTO memory (source, content, type, priority, metadata, hash, prev_hash) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [source, content, type, priority, JSON.stringify(metadata), hash, prevHash]
  );
}

export async function logSecurityEvent(event: { type: string, severity: string, description: string, source_ip?: string, action?: string, is_nexus_blocked?: boolean }) {
  const database = await initDatabase();
  await database.run(
    "INSERT INTO security_logs (event_type, severity, description, source_ip, action_taken, is_nexus_blocked) VALUES (?, ?, ?, ?, ?, ?)",
    [event.type, event.severity, event.description, event.source_ip || 'N/A', event.action || 'Logged', event.is_nexus_blocked ? 1 : 0]
  );
}

export async function getSetting(key: string): Promise<string | null> {
  const database = await initDatabase();
  const row = await database.get("SELECT value FROM settings WHERE key = ?", [key]);
  return row ? row.value : null;
}

export async function updateSetting(key: string, value: string) {
  const database = await initDatabase();
  await database.run(
    "INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
    [key, value]
  );
}

export async function logBackup(file_path: string, status: string, type: string) {
  const database = await initDatabase();
  await database.run(
    "INSERT INTO backups (file_path, status, type) VALUES (?, ?, ?)",
    [file_path, status, type]
  );
}

export async function updateAgentStatus(id: string, name: string, type: string, status: string, last_action: string, role: string = 'agent', version: string = '1.0.0') {
  const database = await initDatabase();
  await database.run(
    `INSERT INTO agents (id, name, type, status, last_action, role, version, last_report)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(id) DO UPDATE SET
     status = excluded.status,
     last_action = excluded.last_action,
     role = excluded.role,
     version = excluded.version,
     last_report = CURRENT_TIMESTAMP`,
    [id, name, type, status, last_action, role, version]
  );
}

export async function getRecentMemory(limit: number = 10) {
  const database = await initDatabase();
  return database.all("SELECT * FROM memory ORDER BY timestamp DESC LIMIT ?", [limit]);
}

export async function getAgents() {
  const database = await initDatabase();
  return database.all("SELECT * FROM agents");
}

export async function getSecurityLogs(limit: number = 50) {
  const database = await initDatabase();
  return database.all("SELECT * FROM security_logs ORDER BY timestamp DESC LIMIT ?", [limit]);
}

export async function getBackups(limit: number = 10) {
  const database = await initDatabase();
  return database.all("SELECT * FROM backups ORDER BY timestamp DESC LIMIT ?", [limit]);
}
