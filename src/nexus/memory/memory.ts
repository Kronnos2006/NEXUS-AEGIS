import { memoryService } from "./memory.service";
import { MemoryEntry, MemorySource, MemoryType, MemoryPriority } from "./memory.types";

/**
 * NEXUS AEGIS - Módulo de Memoria Persistente Avanzada
 * Proporciona una interfaz simplificada para interactuar con el sistema de memoria.
 */
export const Memory = {
  /**
   * Registra una interacción o decisión.
   */
  async record(content: string, source: MemorySource, type: MemoryType = 'info', priority: MemoryPriority = 'low', metadata: any = {}) {
    return await memoryService.saveEntry({
      source,
      content,
      type,
      priority,
      metadata
    });
  },

  /**
   * Registra un log de agente con métricas.
   */
  async logAgent(agentId: string, task: any, result: any, duration: number) {
    return await memoryService.logAgentAction({
      agentId,
      task,
      result,
      duration
    });
  },

  /**
   * Registra un evento crítico del sistema.
   */
  async event(message: string, type: string, severity: MemoryPriority = 'medium') {
    return await memoryService.logSystemEvent({
      type,
      message,
      severity
    });
  },

  /**
   * Recupera el historial reciente.
   */
  async getHistory(limit: number = 20) {
    return await memoryService.getRecentEntries(limit);
  }
};
