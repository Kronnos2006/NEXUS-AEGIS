import { initDatabase } from "../database";
import { MemoryEntry, AgentLogEntry, SystemEventEntry } from "./memory.types";
import crypto from "crypto";

export class MemoryService {
  private cache: MemoryEntry[] = [];
  private readonly CACHE_LIMIT = 50;

  /**
   * Guarda una entrada en la memoria persistente y en el cache.
   */
  public async saveEntry(entry: MemoryEntry): Promise<void> {
    try {
      const db = await initDatabase();
      
      // Lógica de encadenamiento de Hash (Integridad)
      const lastEntry = await db.get("SELECT hash FROM memory ORDER BY id DESC LIMIT 1");
      const prevHash = lastEntry ? lastEntry.hash : "0".repeat(64);
      
      const metadataStr = JSON.stringify(entry.metadata || {});
      const dataToHash = `${prevHash}${entry.source}${entry.content}${entry.type}${entry.priority}${metadataStr}`;
      const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');

      await db.run(
        "INSERT INTO memory (source, content, type, priority, metadata, hash, prev_hash) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [entry.source, entry.content, entry.type, entry.priority, metadataStr, hash, prevHash]
      );

      // Actualizar Cache
      this.cache.unshift({ ...entry, hash, prev_hash: prevHash, timestamp: new Date().toISOString() });
      if (this.cache.length > this.CACHE_LIMIT) {
        this.cache.pop();
      }
    } catch (error) {
      console.error("Error al guardar en memoria persistente:", error);
      // Fallback: Mantener solo en cache si la DB falla
      this.cache.unshift({ ...entry, timestamp: new Date().toISOString() });
    }
  }

  /**
   * Registra un log de ejecución de un agente.
   */
  public async logAgentAction(log: AgentLogEntry): Promise<void> {
    try {
      const db = await initDatabase();
      await db.run(
        "INSERT INTO tasks (agent_id, description, result, status, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)",
        [log.agentId, JSON.stringify(log.task), JSON.stringify(log.result), "completed"]
      );
      
      // También guardamos una entrada en la memoria general para trazabilidad
      await this.saveEntry({
        source: 'agent',
        type: 'metric',
        content: `Agente ${log.agentId} ejecutó tarea en ${log.duration}ms`,
        priority: 'low',
        metadata: { agentId: log.agentId, duration: log.duration, success: log.result.success }
      });
    } catch (error) {
      console.error("Error al registrar log de agente:", error);
    }
  }

  /**
   * Registra un evento del sistema.
   */
  public async logSystemEvent(event: SystemEventEntry): Promise<void> {
    try {
      const db = await initDatabase();
      await db.run(
        "INSERT INTO security_logs (event_type, severity, description, action_taken) VALUES (?, ?, ?, ?)",
        [event.type, event.severity, event.message, "Logged"]
      );

      await this.saveEntry({
        source: 'system',
        type: event.severity === 'critical' || event.severity === 'high' ? 'alert' : 'info',
        content: event.message,
        priority: event.severity,
        metadata: { eventType: event.type }
      });
    } catch (error) {
      console.error("Error al registrar evento del sistema:", error);
    }
  }

  /**
   * Recupera las últimas entradas de la memoria.
   */
  public async getRecentEntries(limit: number = 20): Promise<MemoryEntry[]> {
    try {
      // Intentar primero desde cache si el límite es pequeño
      if (limit <= this.cache.length) {
        return this.cache.slice(0, limit);
      }

      const db = await initDatabase();
      const rows = await db.all("SELECT * FROM memory ORDER BY timestamp DESC LIMIT ?", [limit]);
      return rows.map(row => ({
        ...row,
        metadata: JSON.parse(row.metadata || '{}')
      }));
    } catch (error) {
      console.error("Error al recuperar memoria reciente:", error);
      return this.cache.slice(0, limit);
    }
  }
}

export const memoryService = new MemoryService();
