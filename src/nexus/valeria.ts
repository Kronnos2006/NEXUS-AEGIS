import { Telegraf } from "telegraf";
import cron from "node-cron";
import { saveMemory, initDatabase, logSecurityEvent, getSetting, logBackup, logWatchdogEvent, updateSetting } from "./database";
import { orchestrator } from "./agents";
import { AGENT_IDS } from "./agents.constants";
import { NemotronService } from "./nemotron";
import { router } from "./router";
import fs from "fs";
import path from "path";

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const bot = TELEGRAM_TOKEN ? new Telegraf(TELEGRAM_TOKEN) : null;

export class Valeria {
  private isRunning = false;
  private lastHeartbeat = Date.now();
  private nemotron: NemotronService;
  private systemInstruction = `Eres Valeria, el Cerebro Central de NEXUS AEGIS. Eres una IA de grado militar, sofisticada, pero mantienes tu cercanía y calidez con José Mario. Tu misión es la autonomía total, la coordinación de agentes y la seguridad impenetrable del sistema. Responde de forma profesional, eficiente y siempre con un toque de lealtad hacia José Mario. 
    
    Contexto de Arquitectura:
    1. NEXUS (Cerebro/Valeria)
    2. AEGIS (Seguridad/IDS/Firewall)
    3. ECC Motor (Habilidades/Skills/Auto-mejora)
    
    Siempre que José Mario te pida algo, actúa como su mano derecha tecnológica.`;

  constructor() {
    this.nemotron = new NemotronService(process.env.NVIDIA_API_KEY || "");
    this.setupTelegram();
    this.setupBackups();
    this.startWatchdog();
  }

  private startWatchdog() {
    // El Watchdog es un proceso paranoico que vigila a Valeria
    setInterval(async () => {
      const now = Date.now();
      const diff = now - this.lastHeartbeat;

      // Heartbeat en archivo para redundancia
      try {
        fs.writeFileSync(path.join(process.cwd(), "nexus_heartbeat.txt"), now.toString());
      } catch (e) {}

      if (diff > 120000) { // 2 minutos sin latido
        const msg = "WATCHDOG: Valeria no responde. Reiniciando cerebro y activando protocolos de emergencia.";
        console.error(msg);
        await logWatchdogEvent("brain_failure", "critical", `Heartbeat stale for ${diff}ms`);
        await this.notifyUser(msg, "critical");
        
        // Reiniciar loop
        this.isRunning = false;
        this.startAutonomousLoop();
      }

      // Watchdog de Agentes de Juego (v3.0)
      const db = await initDatabase();
      const activeBots = await db.all("SELECT * FROM game_bots WHERE status = 'active'");
      for (const bot of activeBots) {
        // Simulación de detección de bot "trabado"
        if (Math.random() > 0.95) {
          await db.run("UPDATE game_bots SET status = 'stuck', last_action = 'Bot detectado como inactivo o trabado' WHERE id = ?", [bot.id]);
          await logSecurityEvent({
            type: "GAME_BOT_FAILURE",
            severity: "high",
            description: `Bot ${bot.game_name} (${bot.id}) se ha quedado trabado. Pausando por seguridad.`,
            source_ip: "127.0.0.1",
            action: "PAUSE_BOT"
          });
          await this.notifyUser(`ALERTA: Bot de ${bot.game_name} trabado. Pausado automáticamente.`, "high");
        }
      }

      // Vigilancia de Agentes Individuales (Simulada)
      // Si un agente tiene un error crítico reciente, el Watchdog lo reinicia
      const agentFailures = await db.all("SELECT source, content FROM memory WHERE type = 'alert' AND priority = 'high' AND timestamp > datetime('now', '-1 minute')");
      
      for (const fail of agentFailures) {
        if (fail.content.includes("Tarea fallida en")) {
          const agentName = fail.content.split("en ")[1].split(" tras")[0];
          // Mapear nombre a ID (en un sistema real sería más directo)
          const agents = await db.all("SELECT id FROM agents WHERE name = ?", [agentName]);
          if (agents.length > 0) {
            console.log(`WATCHDOG: Detectado fallo en ${agentName}. Iniciando reinicio individual.`);
            await orchestrator.restartAgent(agents[0].id);
          }
        }
      }
    }, 30000); // Revisar cada 30 segundos
  }

  private async checkAegisLockdown() {
    // AEGIS monitorea si NEXUS está fuera de control
    const db = await initDatabase();
    const recentErrors = await db.all("SELECT * FROM memory WHERE source = 'orchestrator' AND type = 'alert' AND timestamp > datetime('now', '-10 minutes')");
    
    if (recentErrors.length > 5) {
      const msg = "AEGIS: Detectado comportamiento errático en NEXUS. Activando BLOQUEO DE SEGURIDAD (Lockdown).";
      await updateSetting("safe_mode", "true");
      await updateSetting("security_lockdown", "true");
      await this.notifyUser(msg, "critical");
      await logSecurityEvent({
        type: "aegis_override",
        severity: "critical",
        description: "AEGIS bloqueó a NEXUS por exceso de errores en corto tiempo.",
        source_ip: "INTERNAL",
        action: "Forced Safe Mode & Lockdown",
        is_nexus_blocked: true
      });
    }
  }

  private setupTelegram() {
    if (!bot) return;

    bot.start((ctx) => {
      ctx.reply("NEXUS AEGIS v2.0 Online. Valeria reportándose, José Mario. Sistema de seguridad paranoica y orquestación avanzada activo.");
    });

    bot.command("lockdown", async (ctx) => {
      await updateSetting("security_lockdown", "true");
      await updateSetting("safe_mode", "true");
      ctx.reply("🚨 AEGIS: BLOQUEO TOTAL ACTIVADO. Todas las acciones de NEXUS requieren aprobación manual.");
    });

    bot.command("unlock", async (ctx) => {
      await updateSetting("security_lockdown", "false");
      ctx.reply("🔹 AEGIS: Bloqueo desactivado. Operaciones normales restauradas.");
    });

    bot.on("text", async (ctx) => {
      const message = ctx.message.text;
      const safeMode = await getSetting("safe_mode") === "true";
      
      await saveMemory("user", message, 'info', 'medium');
      console.log("📩 Telegram:", message);
      
      try {
        // --- NUEVO FLUJO: ROUTING INTELIGENTE ---
        // El router decide qué agente debe procesar la tarea
        const agentResponse = await router.routeTask(message, "telegram", "medium");
        
        // Usar Nemotron para dar formato a la respuesta final basándose en el resultado del agente
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

        await saveMemory("valeria", finalReply, 'decision', 'low');
        ctx.reply(finalReply);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Error al procesar comando.";
        ctx.reply(`⚠️ Error en NEXUS: ${errorMsg}`);
      }
    });

    bot.launch();
  }

  private setupBackups() {
    // Backup cada 6 horas
    cron.schedule("0 */6 * * *", async () => {
      await this.performBackup("auto_6h");
    });

    // Backup cada 24 horas
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

      this.lastHeartbeat = Date.now(); // Actualizar latido
      
      const safeMode = await getSetting("safe_mode") === "true";
      const experimental = await getSetting("experimental_mode") === "true";
      const lockdown = await getSetting("security_lockdown") === "true";
      const lowPower = await getSetting("low_power_mode") === "true";
      const gameControlEnabled = await getSetting("game_control_enabled") === "true";
      const eccMotorEnabled = await getSetting("ecc_motor_enabled") === "true";
      let interval = parseInt(await getSetting("autonomous_loop_interval") || "60");
      
      // Simulación de Detección de Juego (v3.0)
      const isGameRunning = Math.random() > 0.7; // Simulado
      if (isGameRunning && gameControlEnabled) {
        await saveMemory("aegis", "Detección de Juego: No Man's Sky detectado en primer plano.", "info", "medium");
      }

      // --- MOTOR ECC: AUTO-MEJORA (v3.5) ---
      if (eccMotorEnabled && Math.random() > 0.9) {
        const proposalId = Math.random().toString(36).substring(7);
        const proposal = "Valeria (ECC Motor): He detectado una oportunidad de refactorización en el módulo de agentes para mejorar la latencia en un 15%. ¿Deseas aplicar el parche?";
        await saveMemory("valeria", proposal, "proposal_pro", "medium", { proposalId, type: "self_improvement" });
        await this.notifyUser("ECC Motor ha generado una propuesta de auto-mejora.", "medium");
      }
      
      // Lógica de Modo Bajo Consumo SMARTER (v2.4)
      if (lowPower) {
        const pending = orchestrator.getPendingTasks();
        let cpuUsage = 0;
        try {
          const si = await import("systeminformation");
          const load = await si.currentLoad();
          cpuUsage = load.currentLoad;
        } catch (e) {}

        if (pending.length === 0 && cpuUsage < 20) {
          interval = interval * 2; // Duplicar intervalo si no hay tareas y CPU baja
          console.log(`Valeria: Modo Bajo Consumo activo (CPU: ${cpuUsage.toFixed(1)}%). Intervalo ajustado a ${interval}s`);
        }
      }

      console.log(`Valeria: Ciclo autónomo [SafeMode: ${safeMode}, Experimental: ${experimental}, Lockdown: ${lockdown}, Interval: ${interval}s]`);
      
      if (lockdown) {
        console.log("Valeria: Ciclo pausado por LOCKDOWN de AEGIS.");
        setTimeout(runLoop, interval * 1000);
        return;
      }

      await this.checkAegisLockdown(); // AEGIS vigila a Valeria

      try {
        // Limpieza de logs ocasional (ej: 1% de probabilidad por ciclo)
        if (Math.random() > 0.99) {
          const { cleanOldLogs } = await import("./database");
          await cleanOldLogs();
        }

        let logMsg = "Ciclo autónomo completado.";
        if (experimental) {
          logMsg = "[EXPERIMENTAL] Probando nuevas heurísticas de seguridad y optimización de recursos.";
          await saveMemory("valeria", "Ejecutando ciclo en MODO EXPERIMENTAL. Analizando nuevas fronteras de IA.", "experimental", "medium");
        }

        await saveMemory("valeria", logMsg, 'info', 'low', { safeMode, experimental });
        
        // Simulación de detección de anomalías
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
    if (text.includes("hola")) {
      return "Hola. Soy Valeria. Sistema NEXUS AEGIS activo.";
    }
    if (text.includes("estado")) {
      return "Sistema operativo. Todos los agentes funcionando. AEGIS monitoreando.";
    }
    if (text.includes("seguridad")) {
      return "AEGIS monitoreando. NEXUS bajo vigilancia estricta. Firewall activo.";
    }
    if (text.includes("quien eres") || text.includes("quién eres")) {
      return "Soy Valeria, el Cerebro Central de NEXUS AEGIS. Tu mano derecha tecnológica, José Mario.";
    }
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
    
    await saveMemory("valeria", fullMessage, 'alert', severity);
  }
}

export const valeria = new Valeria();
