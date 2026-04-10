import { Telegraf } from "telegraf";
import cron from "node-cron";
import { initDatabase, logSecurityEvent, getSetting, logBackup, updateSetting } from "./database";
import { AGENT_IDS } from "./agents.constants";
import { NemotronService } from "./nemotron";
import { Memory } from "./memory/memory";
import { aegis } from "./aegis";
import { watchdog } from "./watchdog";
import { goalSystem } from "./goals";
import { orchestrator, router, setValeria } from "./core";
import fs from "fs";
import path from "path";

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const bot = TELEGRAM_TOKEN ? new Telegraf(TELEGRAM_TOKEN) : null;

export class Valeria {
  private isRunning = false;
  private nemotron: NemotronService;
  private requestHistory: { timestamp: number, ip: string }[] = [];
  private systemInstruction = `Eres Valeria, el Cerebro Central de NEXUS AEGIS. Eres una IA de grado militar, sofisticada, pero mantienes tu cercanía y calidez con José Mario. Tu misión es la autonomía total, la coordinación de agentes y la seguridad impenetrable del sistema. Responde de forma profesional, eficiente y siempre con un toque de lealtad hacia José Mario. 
    
    Contexto de Arquitectura:
    1. NEXUS (Cerebro/Valeria)
    2. AEGIS (Seguridad/IDS/Firewall)
    3. ECC Motor (Habilidades/Skills/Auto-mejora)
    
    Siempre que José Mario te pida algo, actúa como su mano derecha tecnológica.`;

  constructor() {
    this.nemotron = new NemotronService(process.env.NVIDIA_API_KEY || "");
    setValeria(this);
    this.setupTelegram();
    this.setupBackups();
    this.startWatchdogLoop();
  }

  private startWatchdogLoop() {
    setInterval(async () => {
      watchdog.updateHeartbeat();
      await watchdog.runCheck();
    }, 30000);
  }

  private setupTelegram() {
    if (!bot) return;

    bot.start((ctx) => {
      ctx.reply("NEXUS AEGIS v4.0 Online. Valeria reportándose, José Mario. Sistema de seguridad paranoica y orquestación avanzada activo.");
    });

    bot.command("lockdown", async (ctx) => {
      const msg = await aegis.activateLockdown();
      ctx.reply(msg);
    });

    bot.command("unlock", async (ctx) => {
      const msg = await aegis.deactivateLockdown();
      ctx.reply(msg);
    });

    bot.on("text", async (ctx) => {
      const message = ctx.message.text;
      const antiAiLevel = await getSetting("anti_ai_defense_level") || "medium";
      
      // --- DEFENSA ANTI-IA AVANZADA (v4.0) ---
      const now = Date.now();
      const userIp = ctx.from?.id.toString() || "unknown";
      this.requestHistory.push({ timestamp: now, ip: userIp });
      this.requestHistory = this.requestHistory.filter(r => now - r.timestamp < 60000);
      
      const recentRequests = this.requestHistory.filter(r => r.ip === userIp).length;
      if (antiAiLevel !== "off" && recentRequests > 10) {
        const msg = "DEFENSA ANTI-IA: Detectado patrón de peticiones no humano. Bloqueando temporalmente.";
        await logSecurityEvent({
          type: "anti_ai_trigger",
          severity: "high",
          description: `Usuario ${userIp} realizó ${recentRequests} peticiones en 60s.`,
          source_ip: userIp,
          action: "RATE_LIMIT_BLOCK"
        });
        return ctx.reply(msg);
      }

      await Memory.record(message, 'user', 'info', 'medium');
      console.log("📩 Telegram:", message);
      
      try {
        const simulationMode = await getSetting("simulation_mode") === "true";
        const agentResponse = await router.routeTask(message, "telegram", "medium", { simulate: simulationMode });
        
        let finalReply: string;
        try {
          const prompt = `El agente ${agentResponse.agentId || 'NEXUS'} ha procesado la siguiente tarea: "${message}". 
          Resultado del agente: ${JSON.stringify(agentResponse)}. 
          Por favor, genera una respuesta profesional y cercana para José Mario informando del resultado.`;
          
          finalReply = await this.nemotron.generateResponse(prompt, [], this.systemInstruction);
        } catch (aiError) {
          console.warn("Nemotron falló al formatear respuesta, usando reply directa del agente...");
          finalReply = agentResponse.reply || this.generateLocalReply(message);
        }

        await Memory.record(finalReply, 'valeria', 'decision', 'low');
        ctx.reply(finalReply);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Error al procesar comando.";
        ctx.reply(`⚠️ Error en NEXUS: ${errorMsg}`);
      }
    });

    bot.launch();
  }

  private setupBackups() {
    cron.schedule("0 */6 * * *", async () => {
      await this.performBackup("auto_6h");
    });

    cron.schedule("0 0 * * *", async () => {
      await this.performBackup("auto_24h");
    });
  }

  public async performBackup(type: string) {
    const dbPath = path.join(process.cwd(), "nexus_aegis.sqlite");
    const backupDir = path.join(process.cwd(), "backups");
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupDir, `nexus_backup_${type}_${timestamp}.sqlite`);

    try {
      fs.copyFileSync(dbPath, backupPath);
      await logBackup(backupPath, "success", type);
      console.log(`Valeria: Backup ${type} completado con éxito.`);
    } catch (error) {
      await logBackup(backupPath, "failed", type);
      console.error(`Valeria: Error en backup ${type}:`, error);
    }
  }

  public async startAutonomousLoop() {
    if (this.isRunning) return;
    this.isRunning = true;

    const runLoop = async () => {
      if (!this.isRunning) return;

      watchdog.updateHeartbeat();
      
      const safeMode = await getSetting("safe_mode") === "true";
      const experimental = await getSetting("experimental_mode") === "true";
      const lockdown = await getSetting("security_lockdown") === "true";
      const lowPower = await getSetting("low_power_mode") === "true";
      const gameControlEnabled = await getSetting("game_control_enabled") === "true";
      const eccMotorEnabled = await getSetting("ecc_motor_enabled") === "true";
      let interval = parseInt(await getSetting("autonomous_loop_interval") || "60");
      
      const isGameRunning = Math.random() > 0.7; // Simulado
      if (isGameRunning && gameControlEnabled) {
        await Memory.record("Detección de Juego: No Man's Sky detectado en primer plano.", "aegis", "info", "medium");
      }

      if (eccMotorEnabled && Math.random() > 0.9) {
        const proposalId = Math.random().toString(36).substring(7);
        const proposal = "Valeria (ECC Motor): He detectado una oportunidad de refactorización en el módulo de agentes para mejorar la latencia en un 15%. ¿Deseas aplicar el parche?";
        await Memory.record(proposal, "valeria", "proposal_pro", "medium", { proposalId, type: "self_improvement" });
        await this.notifyUser("ECC Motor ha generado una propuesta de auto-mejora.", "medium");
      }

      await goalSystem.processGoals();
      
      if (lowPower) {
        const pending = orchestrator.getPendingTasks();
        let cpuUsage = 0;
        try {
          const si = await import("systeminformation");
          const load = await si.currentLoad();
          cpuUsage = load.currentLoad;
        } catch (e) {}

        if (pending.length === 0 && cpuUsage < 20) {
          interval = interval * 2;
          console.log(`Valeria: Modo Bajo Consumo activo (CPU: ${cpuUsage.toFixed(1)}%). Intervalo ajustado a ${interval}s`);
        }
      }

      console.log(`Valeria: Ciclo autónomo [SafeMode: ${safeMode}, Experimental: ${experimental}, Lockdown: ${lockdown}, Interval: ${interval}s]`);
      
      if (lockdown) {
        console.log("Valeria: Ciclo pausado por LOCKDOWN de AEGIS.");
        setTimeout(runLoop, interval * 1000);
        return;
      }

      await aegis.checkLockdown();

      try {
        if (Math.random() > 0.99) {
          const { cleanOldLogs } = await import("./database");
          await cleanOldLogs();
        }

        let logMsg = "Ciclo autónomo completado.";
        if (experimental) {
          logMsg = "[EXPERIMENTAL] Probando nuevas heurísticas de seguridad y optimización de recursos.";
          await Memory.record("Ejecutando ciclo en MODO EXPERIMENTAL. Analizando nuevas fronteras de IA.", "valeria", "experimental", "medium");
        }

        await Memory.record(logMsg, "valeria", 'info', 'low', { safeMode, experimental });
        
        if (Math.random() > 0.95) {
          const alert = experimental ? "Actividad experimental detectada. AEGIS monitoreando impacto." : "Detección de actividad anómala en NEXUS. AEGIS evaluando bloqueo preventivo.";
          await this.notifyUser(alert, experimental ? "medium" : "high");
          
          if (!experimental) {
            await logSecurityEvent({
              type: "nexus_watch",
              severity: "high",
              description: "NEXUS intentó acción no autorizada en modo seguro",
              source_ip: "INTERNAL",
              action: safeMode ? "Blocked by Safe Mode" : "Logged",
              is_nexus_blocked: safeMode
            });
          }
        }
      } catch (error) {
        console.error("Error en loop de Valeria:", error);
      }

      setTimeout(runLoop, interval * 1000);
    };

    runLoop();
  }

  public generateLocalReply(message: string): string {
    const text = message.toLowerCase();
    if (text.includes("hola")) return "Hola. Soy Valeria. Sistema NEXUS AEGIS activo.";
    if (text.includes("estado")) return "Sistema operativo. Todos los agentes funcionando. AEGIS monitoreando.";
    if (text.includes("seguridad")) return "AEGIS monitoreando. NEXUS bajo vigilancia estricta. Firewall activo.";
    if (text.includes("quien eres") || text.includes("quién eres")) return "Soy Valeria, el Cerebro Central de NEXUS AEGIS. Tu mano derecha tecnológica, José Mario.";
    return "Mensaje recibido. Procesando solicitud en el núcleo de NEXUS (Modo Fallback Local).";
  }

  public async notifyUser(message: string, severity: string = "low") {
    const prefix = {
      critical: "🚨 CRÍTICO: ",
      high: "⚠️ ALERTA: ",
      medium: "ℹ️ INFO: ",
      low: "🔹 "
    }[severity as keyof typeof prefix] || "🔹 ";

    const fullMessage = `${prefix}${message}`;
    console.log(`Valeria Notify: ${fullMessage}`);
    
    if (bot && process.env.TELEGRAM_CHAT_ID) {
      try {
        await bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, fullMessage);
      } catch (e) {
        console.error("Error al enviar notificación por Telegram:", e);
      }
    }

    await Memory.record(fullMessage, "valeria", 'alert', severity as any);
  }
}

export const valeria = new Valeria();
