import fs from "fs";
import path from "path";
import { initDatabase, logWatchdogEvent, logSecurityEvent } from "./database";
import { orchestrator, valeria } from "./core";

export class WatchdogSystem {
  private lastHeartbeat = Date.now();

  public updateHeartbeat() {
    this.lastHeartbeat = Date.now();
    try {
      fs.writeFileSync(path.join(process.cwd(), "nexus_heartbeat.txt"), this.lastHeartbeat.toString());
    } catch (e) {}
  }

  public async runCheck() {
    const now = Date.now();
    const diff = now - this.lastHeartbeat;

    if (diff > 120000) { // 2 minutos sin latido
      const msg = "WATCHDOG: Valeria no responde. Reiniciando cerebro y activando protocolos de emergencia.";
      console.error(msg);
      await logWatchdogEvent("brain_failure", "critical", `Heartbeat stale for ${diff}ms`);
      if (valeria) {
        await valeria.notifyUser(msg, "critical");
        // Reiniciar loop de Valeria si es posible
        valeria.startAutonomousLoop();
      }
    }

    // Watchdog de Agentes de Juego (v3.0)
    const db = await initDatabase();
    const activeBots = await db.all("SELECT * FROM game_bots WHERE status = 'active'");
    for (const bot of activeBots) {
      if (Math.random() > 0.95) {
        await db.run("UPDATE game_bots SET status = 'stuck', last_action = 'Bot detectado como inactivo o trabado' WHERE id = ?", [bot.id]);
        await logSecurityEvent({
          type: "GAME_BOT_FAILURE",
          severity: "high",
          description: `Bot ${bot.game_name} (${bot.id}) se ha quedado trabado. Pausando por seguridad.`,
          source_ip: "127.0.0.1",
          action: "PAUSE_BOT"
        });
        if (valeria) await valeria.notifyUser(`ALERTA: Bot de ${bot.game_name} trabado. Pausado automáticamente.`, "high");
      }
    }

    // Vigilancia de Agentes Individuales
    // CORRECCIÓN: Usar 'type' en lugar de 'source' para detectar alertas
    const agentFailures = await db.all("SELECT content FROM memory WHERE type = 'alert' AND priority = 'high' AND timestamp > datetime('now', '-1 minute')");
    
    for (const fail of agentFailures) {
      if (fail.content.includes("Tarea fallida en")) {
        const parts = fail.content.split("en ");
        if (parts.length > 1) {
          const agentName = parts[1].split(" tras")[0];
          const agents = await db.all("SELECT id FROM agents WHERE name = ?", [agentName]);
          if (agents.length > 0 && orchestrator) {
            console.log(`WATCHDOG: Detectado fallo en ${agentName}. Iniciando reinicio individual.`);
            await orchestrator.restartAgent(agents[0].id);
          }
        }
      }
    }
  }
}

export const watchdog = new WatchdogSystem();
