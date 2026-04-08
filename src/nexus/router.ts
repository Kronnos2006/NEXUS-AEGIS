import { AGENT_IDS, AgentId } from "./agents.constants";
import { orchestrator } from "./agents";
import { saveMemory } from "./database";

export class IntelligentRouter {
  /**
   * Detecta las intenciones del usuario basándose en palabras clave y prioridad.
   */
  public detectIntents(message: string): AgentId[] {
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return [AGENT_IDS.ASSISTANT];
    }

    const text = message.toLowerCase();
    const detected: { id: AgentId, priority: number }[] = [];

    // Definición de prioridades: Seguridad (1) > Código (2) > Finanzas (3) > Otros (4)
    if (text.includes("seguridad") || text.includes("aegis") || text.includes("vulnerabilidad") || text.includes("amenaza")) {
      detected.push({ id: AGENT_IDS.AEGIS, priority: 1 });
    }

    if (text.includes("código") || text.includes("codigo") || text.includes("refactor") || text.includes("audit")) {
      detected.push({ id: AGENT_IDS.CODE, priority: 2 });
    }

    if (text.includes("finanzas") || text.includes("crypto") || text.includes("btc") || text.includes("mercado")) {
      detected.push({ id: AGENT_IDS.FINANCE, priority: 3 });
    }

    if (text.includes("marketing") || text.includes("promo") || text.includes("social") || text.includes("contenido")) {
      detected.push({ id: AGENT_IDS.MARKETING, priority: 4 });
    }

    if (text.includes("web") || text.includes("página") || text.includes("pagina") || text.includes("despliegue")) {
      detected.push({ id: AGENT_IDS.WEB_DEV, priority: 4 });
    }

    if (text.includes("investiga") || text.includes("busca") || text.includes("research")) {
      detected.push({ id: AGENT_IDS.RESEARCHER, priority: 4 });
    }

    if (text.includes("juego") || text.includes("nms") || text.includes("bot") || text.includes("game")) {
      detected.push({ id: AGENT_IDS.GAME_BOT, priority: 4 });
    }

    if (detected.length === 0) {
      return [AGENT_IDS.ASSISTANT];
    }

    // Ordenar por prioridad y devolver IDs únicos
    return detected
      .sort((a, b) => a.priority - b.priority)
      .map(d => d.id)
      .filter((value, index, self) => self.indexOf(value) === index);
  }

  /**
   * Selecciona los agentes adecuados y enruta la tarea.
   */
  public async routeTask(message: string, source: string = "unknown", priority: string = "medium", options: { routed?: boolean } = {}) {
    // Prevención de bucles
    if (options.routed) {
      console.log("[ROUTER] Mensaje ya enrutado. Saltando detección.");
      return await orchestrator.dispatchTask(AGENT_IDS.ASSISTANT, { message, source }, priority);
    }

    const agentIds = this.detectIntents(message);
    const startTime = Date.now();
    
    console.log(`[ROUTER] Intenciones detectadas: ${agentIds.join(", ")} | Mensaje: "${message}"`);
    
    const results = [];
    for (const agentId of agentIds) {
      try {
        // Implementación de Timeout (5 segundos)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout en agente ${agentId}`)), 5000)
        );

        const taskPromise = orchestrator.dispatchTask(
          agentId,
          { message, source, routed: true },
          priority
        );

        const result = await Promise.race([taskPromise, timeoutPromise]);
        const duration = Date.now() - startTime;
        
        console.log(`[ROUTER] Agente: ${agentId} | Tiempo: ${duration}ms | Resultado: Success`);
        results.push({ agentId, ...result });

        // Si es una multi-delegación, guardamos memoria de cada paso
        await saveMemory("router", `Tarea procesada por ${agentId}`, 'info', 'low', { agentId, duration });

      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : "Error desconocido";
        console.error(`[ROUTER] Fallo en ${agentId} tras ${duration}ms: ${errorMsg}`);

        if (agentId !== AGENT_IDS.ASSISTANT) {
          console.log(`[ROUTER] Fallback de emergencia a ${AGENT_IDS.ASSISTANT}`);
          const fallbackResult = await orchestrator.dispatchTask(
            AGENT_IDS.ASSISTANT,
            { message, source, originalError: errorMsg, failedAgent: agentId },
            "high"
          );
          results.push({ agentId: AGENT_IDS.ASSISTANT, ...fallbackResult, isFallback: true });
        }
      }
    }

    // Si hay múltiples resultados, los consolidamos para Valeria
    if (results.length > 1) {
      return {
        success: true,
        agentId: "multi-agent",
        results,
        reply: results.map(r => r.reply).join("\n\n")
      };
    }

    return results[0] || { success: false, reply: "No se pudo procesar la tarea." };
  }
}

export const router = new IntelligentRouter();
