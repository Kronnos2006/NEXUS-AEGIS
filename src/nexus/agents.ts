import { updateAgentStatus, saveMemory, logSecurityEvent, getSetting, saveAgentVersion, getAgentVersions, updateSetting } from "./database";
import { valeria } from "./valeria";

import crypto from "crypto";

export interface AgentConfig {
  id: string;
  name: string;
  type: string;
  role: string;
  version: string;
  changelog?: string;
}

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected status: string = "idle";
  protected lastAction: string = "Esperando tareas...";

  constructor(config: AgentConfig) {
    this.config = config;
    this.reportStatus();
  }

  protected async reportStatus() {
    await updateAgentStatus(this.config.id, this.config.name, this.config.type, this.status, this.lastAction, this.config.role, this.config.version);
    console.log(`Agent ${this.config.name} [${this.config.role} v${this.config.version}]: ${this.status} - ${this.lastAction}`);
  }

  public async setStatus(status: string, action: string) {
    this.status = status;
    this.lastAction = action;
    await this.reportStatus();
  }

  abstract processTask(task: any): Promise<any>;
}

// Agente Web Developer
export class WebDevAgent extends BaseAgent {
  async processTask(task: any) {
    await this.setStatus("working", `Creando página: ${task.name}`);
    await new Promise(r => setTimeout(r, 3000));
    await this.setStatus("idle", `Página ${task.name} desplegada.`);
    return { success: true, url: `http://localhost:3000/${task.name}` };
  }
}

// Agente Marketing
export class MarketingAgent extends BaseAgent {
  async processTask(task: any) {
    await this.setStatus("working", `Generando contenido para: ${task.platform}`);
    await new Promise(r => setTimeout(r, 2000));
    await this.setStatus("idle", `Post en ${task.platform} programado.`);
    return { success: true, content: "Post generado con éxito." };
  }
}

// Agente Monitor
export class MonitorAgent extends BaseAgent {
  async processTask(task: any) {
    await this.setStatus("working", "Escaneando hardware...");
    const stats = { cpu: Math.random() * 100, ram: Math.random() * 100 };
    if (stats.cpu > 90) {
      await valeria.notifyUser("¡Alerta! CPU por encima del 90%.", "high");
    }
    await this.setStatus("idle", "Monitoreo completado.");
    return stats;
  }
}

// Agente de Seguridad AEGIS (Puente con el IDS de Python)
export class AegisAgent extends BaseAgent {
  async processTask(task: any) {
    await this.setStatus("working", `Analizando amenaza: ${task.threat_id}`);
    
    if (task.type === "brute_force") {
      await logSecurityEvent({
        type: "firewall_block",
        severity: "high",
        description: `Bloqueo automático de IP: ${task.source_ip}`,
        source_ip: task.source_ip,
        action: "IP blocked via Windows Firewall"
      });
      await valeria.notifyUser(`AEGIS ha bloqueado la IP ${task.source_ip} tras detectar un ataque de fuerza bruta.`, "high");
    }
    
    await this.setStatus("idle", "Amenaza neutralizada.");
    return { success: true, action: "Blocked" };
  }
}

// Agente de Ventas / CRM
export class SalesAgent extends BaseAgent {
  async processTask(task: any) {
    await this.setStatus("working", `Gestionando lead: ${task.lead_name}`);
    await new Promise(r => setTimeout(r, 2500));
    await this.setStatus("idle", `Lead ${task.lead_name} actualizado en el CRM.`);
    return { success: true, status: "Contacted" };
  }
}

// Agente de Código / Auditoría PRO (ECC Powered)
export class CodeAgentPRO extends BaseAgent {
  async processTask(task: any) {
    await this.setStatus("working", `Auditando y mejorando código: ${task.repo}`);
    
    const { skillRegistry } = await import("./skills");
    
    // Ejecutar flujo ECC
    const refactor = await skillRegistry.refactor.execute({ code: task.code || "// Sample code", context: task.repo });
    const tests = await skillRegistry.test_generator.execute({ code: refactor.output.improvedCode });
    
    const proposal = `PROPUESTA PRO (ECC): Código refactorizado y suite de tests generada para ${task.repo}.\n\nCambios: ${refactor.output.changes.join(", ")}`;
    
    await this.setStatus("idle", "Mejora de código completada. Propuesta PRO generada.");
    
    return { 
      success: true, 
      type: "proposal_pro", 
      content: proposal, 
      code: refactor.output.improvedCode,
      tests: tests.output.tests,
      status: "pending_review" 
    };
  }
}

// Agente de Seguridad AEGIS PRO (ECC Powered)
export class AegisAgentPRO extends BaseAgent {
  async processTask(task: any) {
    await this.setStatus("working", `Análisis de seguridad avanzado: ${task.target || 'Sistema'}`);
    
    const { skillRegistry } = await import("./skills");
    const scan = await skillRegistry.vulnerability_scan.execute({ target: task.target || 'NEXUS Core' });
    
    if (scan.output.vulnerabilities.length > 0) {
      await logSecurityEvent({
        type: "vulnerability_found",
        severity: "medium",
        description: `ECC Scan detectó: ${scan.output.vulnerabilities[0].description}`,
        source_ip: "127.0.0.1",
        action: "LOG_ONLY"
      });
    }
    
    await this.setStatus("idle", "Análisis PRO completado.");
    return { success: true, scan_result: scan.output };
  }
}

// Agente de Investigación PRO
export class ResearcherAgentPRO extends BaseAgent {
  async processTask(task: any) {
    await this.setStatus("working", `Investigación profunda (ECC Search): ${task.topic}`);
    await new Promise(r => setTimeout(r, 4000));
    
    const result = {
      success: true,
      summary: `Análisis exhaustivo de ${task.topic} utilizando motores de búsqueda avanzados y síntesis de datos.`,
      sources: ["Docs Oficiales", "GitHub", "Arxiv"],
      relevance_score: 0.98
    };
    
    await this.setStatus("idle", `Investigación PRO sobre ${task.topic} finalizada.`);
    return result;
  }
}

// Agente de Finanzas (Finance)
export class FinanceAgent extends BaseAgent {
  async processTask(task: any) {
    await this.setStatus("working", "Analizando mercados y cripto...");
    await new Promise(r => setTimeout(r, 3000));
    const btcPrice = 60000 + Math.random() * 5000;
    await this.setStatus("idle", `Análisis completado. BTC: $${btcPrice.toFixed(2)}`);
    return { success: true, btc: btcPrice, trend: "bullish" };
  }
}

// Agente Asistente Personal (PersonalAssistant)
export class PersonalAssistantAgent extends BaseAgent {
  async processTask(task: any) {
    await this.setStatus("working", "Gestionando calendario e IoT...");
    await new Promise(r => setTimeout(r, 2000));
    await this.setStatus("idle", "Tareas de asistencia completadas.");
    return { success: true, schedule: "Hoy: 3 reuniones, 1 tarea crítica.", iot_status: "Luces ajustadas." };
  }
}

// Agente de Automatización de Juegos PRO (v3.0)
export class GameAgentPRO extends BaseAgent {
  async processTask(task: any) {
    await this.setStatus("working", `Ejecutando GameAgent PRO en ${task.game}: ${task.action}`);
    
    const { skillRegistry } = await import("./skills");
    
    // Flujo PRO: Visión -> Decisión -> Estilo
    const vision = await skillRegistry.screen_vision.execute({ game: task.game });
    const style = await skillRegistry.style_learning.execute({ user_actions: [] });
    
    await new Promise(r => setTimeout(r, 2000));
    
    const result = {
      success: true,
      game: task.game,
      action: task.action,
      vision_data: vision.output,
      style_applied: style.output,
      metrics: {
        efficiency: "95%",
        risk_level: "low"
      }
    };

    await this.setStatus("idle", `GameAgent PRO completó ciclo en ${task.game}.`);
    return result;
  }
}

// Orquestador de Agentes con RBAC y Safe Mode
export class AgentOrchestrator {
  private agents: Map<string, BaseAgent> = new Map();
  private pendingTasks: Map<string, { agentId: string, task: any, priority: string }> = new Map();
  private actionCounter: number = 0;
  private lastCounterReset: number = Date.now();

  constructor() {
    this.initializeAgents();
    this.startCounterResetLoop();
  }

  private startCounterResetLoop() {
    setInterval(() => {
      this.actionCounter = 0;
      this.lastCounterReset = Date.now();
      console.log("Contador de acciones NEXUS reseteado.");
    }, 3600000); // Reset cada hora
  }

  private async checkActionLimit() {
    const limit = parseInt(await getSetting("max_actions_per_hour") || "50");
    if (this.actionCounter >= limit) {
      const msg = `Límite de acciones por hora alcanzado (${limit}). NEXUS AEGIS pausado.`;
      await saveMemory("orchestrator", msg, 'alert', 'critical');
      await valeria.notifyUser(msg, "critical");
      throw new Error(msg);
    }
    this.actionCounter++;
  }

  private initializeAgents() {
    this.agents.set("web-dev-1", new WebDevAgent({ id: "web-dev-1", name: "DevMaster", type: "Web Developer", role: "agent", version: "1.2.0" }));
    this.agents.set("marketing-1", new MarketingAgent({ id: "marketing-1", name: "PromoBot", type: "Marketing", role: "agent", version: "1.0.5" }));
    this.agents.set("monitor-1", new MonitorAgent({ id: "monitor-1", name: "WatchDog", type: "Monitor", role: "security", version: "2.1.0" }));
    this.agents.set("aegis-1", new AegisAgentPRO({ id: "aegis-1", name: "AegisShield PRO", type: "Security PRO", role: "security", version: "3.5.0" }));
    this.agents.set("sales-1", new SalesAgent({ id: "sales-1", name: "DealMaker", type: "Sales", role: "agent", version: "1.0.0" }));
    this.agents.set("code-1", new CodeAgentPRO({ id: "code-1", name: "CodeGuard PRO", type: "Code Engineer", role: "brain", version: "2.0.0" }));
    
    // Nuevos Agentes PRO
    this.agents.set("researcher-1", new ResearcherAgentPRO({ id: "researcher-1", name: "DeepSearch PRO", type: "Researcher PRO", role: "agent", version: "2.0.0" }));
    this.agents.set("finance-1", new FinanceAgent({ id: "finance-1", name: "CryptoWhale", type: "Finance", role: "agent", version: "1.0.0" }));
    this.agents.set("assistant-1", new PersonalAssistantAgent({ id: "assistant-1", name: "LumaHelper", type: "Assistant", role: "agent", version: "1.0.0" }));
    this.agents.set("game-bot-1", new GameAgentPRO({ id: "game-bot-1", name: "NMS-Bot PRO", type: "Game Agent PRO", role: "agent", version: "1.0.0" }));
  }

  public async restartAgent(agentId: string) {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error("Agente no encontrado");

    const config = (agent as any).config;
    console.log(`WATCHDOG: Reiniciando agente individual: ${config.name} (${agentId})`);
    
    // Simular reinicio recreando la instancia
    let newAgent: BaseAgent;
    switch (config.type) {
      case "Web Developer": newAgent = new WebDevAgent(config); break;
      case "Marketing": newAgent = new MarketingAgent(config); break;
      case "Monitor": newAgent = new MonitorAgent(config); break;
      case "Security PRO": newAgent = new AegisAgentPRO(config); break;
      case "Sales": newAgent = new SalesAgent(config); break;
      case "Code Engineer": newAgent = new CodeAgentPRO(config); break;
      case "Researcher PRO": newAgent = new ResearcherAgentPRO(config); break;
      case "Finance": newAgent = new FinanceAgent(config); break;
      case "Assistant": newAgent = new PersonalAssistantAgent(config); break;
      case "Game Agent PRO": newAgent = new GameAgentPRO(config); break;
      default: throw new Error(`Tipo de agente desconocido: ${config.type}`);
    }

    this.agents.set(agentId, newAgent);
    await saveMemory("orchestrator", `Agente ${config.name} reiniciado individualmente por el Watchdog.`, 'alert', 'medium');
    return { success: true };
  }

  private calculateRiskScore(task: any, priority: string): number {
    let score = 0;
    const taskStr = JSON.stringify(task).toLowerCase();
    
    if (priority === "critical") score += 50;
    if (priority === "high") score += 30;
    
    const extremeRisk = ["rm -rf", "mkfs", "dd", "iptables", "shutdown", "format"];
    const highRisk = ["delete", "borrar", "kill", "stop", "firewall", "port"];
    
    extremeRisk.forEach(k => { if (taskStr.includes(k)) score += 40; });
    highRisk.forEach(k => { if (taskStr.includes(k)) score += 20; });
    
    return Math.min(score, 100);
  }

  public async dispatchTask(agentId: string, task: any, priority: string = "medium") {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error("Agente no encontrado");

    const lockdown = await getSetting("security_lockdown") === "true";
    if (lockdown) {
      const msg = `Acción bloqueada por LOCKDOWN de AEGIS: ${agentId} intentó ejecutar tarea.`;
      await saveMemory("orchestrator", msg, 'alert', 'critical');
      throw new Error("SISTEMA EN BLOQUEO DE SEGURIDAD (LOCKDOWN).");
    }

    await this.checkActionLimit();

    const safeMode = await getSetting("safe_mode") === "true";
    const gameControlEnabled = await getSetting("game_control_enabled") === "true";
    const riskScore = this.calculateRiskScore(task, priority);
    
    // Bloqueo de Control de Juego si no está habilitado
    if (agentId.includes("game") && !gameControlEnabled) {
      const msg = `Acción de Juego BLOQUEADA: El control de escritorio no está habilitado en AEGIS.`;
      await saveMemory("orchestrator", msg, 'alert', 'high');
      throw new Error(msg);
    }
    
    // RBAC: Solo agentes con rol 'security' o 'brain' pueden realizar acciones críticas
    const isCriticalAction = priority === "critical" || priority === "high";
    const hasPermission = (agent as any).config.role === "security" || (agent as any).config.role === "brain";

    if (isCriticalAction && !hasPermission) {
      const errorMsg = `Acceso denegado: El agente ${agentId} no tiene permisos para acciones de prioridad ${priority}.`;
      await saveMemory("orchestrator", errorMsg, 'alert', 'high');
      throw new Error(errorMsg);
    }

    // Safe Mode: Requiere aprobación para acciones críticas o de alto riesgo
    const highRiskKeywordsStr = await getSetting("high_risk_keywords") || "[]";
    const highRiskKeywords = JSON.parse(highRiskKeywordsStr);
    const isHighRisk = highRiskKeywords.some((k: string) => JSON.stringify(task).toLowerCase().includes(k.toLowerCase()));

    if (safeMode && (isCriticalAction || isHighRisk || riskScore > 60)) {
      const taskId = Math.random().toString(36).substring(7);
      this.pendingTasks.set(taskId, { agentId, task, priority });
      
      const msg = `Acción ${isHighRisk ? 'de ALTO RIESGO' : 'crítica'} pendiente de aprobación (ID: ${taskId}, Risk Score: ${riskScore}): ${agentId} intentó ${JSON.stringify(task)}.`;
      await saveMemory("orchestrator", msg, 'alert', 'critical', { riskScore });
      await valeria.notifyUser(msg, "critical");
      
      return { status: "pending_approval", taskId, message: "Acción requiere aprobación humana en Modo Seguro.", riskScore };
    }

    return this.executeAgentTask(agent, task, priority);
  }

  public async approveTask(taskId: string, userSignature?: string) {
    const pending = this.pendingTasks.get(taskId);
    if (!pending) throw new Error("Tarea no encontrada o ya procesada");

    const agent = this.agents.get(pending.agentId);
    if (!agent) throw new Error("Agente ya no disponible");

    // Firma Asimétrica (Simulada con Ed25519 en Node.js)
    let signature = "";
    const pubKey = await getSetting("public_key");
    const privKey = await getSetting("private_key");

    if (!pubKey || !privKey) {
      // Generar par de claves si no existe para v2.4
      const { generateKeyPairSync } = await import("crypto");
      const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      await updateSetting("public_key", publicKey);
      await updateSetting("private_key", privateKey);
      console.log("NEXUS: Generado nuevo par de claves Ed25519 para auditoría.");
    }

    // En un flujo real, el usuario firmaría con su clave privada en el cliente
    // Aquí simulamos la firma del lado del servidor para demostrar el concepto
    const dataToSign = `${taskId}-${pending.agentId}-${JSON.stringify(pending.task)}`;
    const { sign } = await import("crypto");
    const currentPrivKey = await getSetting("private_key");
    signature = sign(null, Buffer.from(dataToSign), currentPrivKey!).toString('hex');

    this.pendingTasks.delete(taskId);
    await saveMemory("orchestrator", `Acción APROBADA y FIRMADA ASIMÉTRICAMENTE [Ed25519: ${signature.substring(0, 16)}...]: ${pending.agentId} ejecutando ${JSON.stringify(pending.task)}`, 'info', pending.priority, { signature, algorithm: "Ed25519" });
    return this.executeAgentTask(agent, pending.task, pending.priority);
  }

  public async rejectTask(taskId: string) {
    if (!this.pendingTasks.has(taskId)) throw new Error("Tarea no encontrada");
    const pending = this.pendingTasks.get(taskId);
    this.pendingTasks.delete(taskId);
    await saveMemory("orchestrator", `Acción RECHAZADA por el usuario: ${pending?.agentId} intentó ${JSON.stringify(pending?.task)}`, 'alert', 'medium');
    return { status: "rejected" };
  }

  public async getTaskHistory(limit: number = 20) {
    const { initDatabase } = await import("./database");
    const db = await initDatabase();
    return await db.all("SELECT * FROM memory WHERE source = 'orchestrator' AND (content LIKE '%APROBADA%' OR content LIKE '%RECHAZADA%') ORDER BY timestamp DESC LIMIT ?", [limit]);
  }

  public getPendingTasks() {
    return Array.from(this.pendingTasks.entries()).map(([id, data]) => ({ id, ...data }));
  }

  public async updateAgentVersion(agentId: string, newVersion: string, changelog: string) {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error("Agente no encontrado");

    const oldVersion = (agent as any).config.version;
    (agent as any).config.version = newVersion;
    (agent as any).config.changelog = changelog;

    await saveAgentVersion(agentId, newVersion, changelog, (agent as any).config);
    await this.reportAgentStatus(agent);
    await saveMemory("orchestrator", `Agente ${agentId} actualizado de v${oldVersion} a v${newVersion}.`, 'info', 'medium');
  }

  public async rollbackAgent(agentId: string, version: string) {
    const versions = await getAgentVersions(agentId);
    const target = versions.find(v => v.version === version);
    if (!target) throw new Error("Versión no encontrada para rollback");

    const config = JSON.parse(target.config_snapshot);
    const agent = this.agents.get(agentId);
    if (agent) {
      (agent as any).config = config;
      await this.reportAgentStatus(agent);
      await saveMemory("orchestrator", `Rollback exitoso del agente ${agentId} a la versión v${version}.`, 'alert', 'high');
    }
  }

  private async reportAgentStatus(agent: BaseAgent) {
    const config = (agent as any).config;
    await updateAgentStatus(config.id, config.name, config.type, (agent as any).status, (agent as any).lastAction, config.role, config.version);
  }

  private async executeAgentTask(agent: BaseAgent, task: any, priority: string) {
    const startTime = Date.now();
    await saveMemory("agent", `Tarea asignada a ${agent.constructor.name}: ${JSON.stringify(task)}`, 'info', priority);
    
    try {
      const result = await agent.processTask(task);
      const duration = Date.now() - startTime;
      
      await saveMemory("agent", `Tarea completada por ${agent.constructor.name} en ${duration}ms: ${JSON.stringify(result)}`, 'info', priority);
      
      // Registrar métricas (simulado en memoria por ahora)
      console.log(`[METRICS] Agent: ${agent.constructor.name}, Duration: ${duration}ms, Status: Success`);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : "Error desconocido";
      await saveMemory("agent", `Tarea fallida en ${agent.constructor.name} tras ${duration}ms: ${errorMsg}`, 'alert', 'high');
      console.log(`[METRICS] Agent: ${agent.constructor.name}, Duration: ${duration}ms, Status: Failed, Error: ${errorMsg}`);
      throw error;
    }
  }
}

export const orchestrator = new AgentOrchestrator();
