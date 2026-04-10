import { initDatabase, logSecurityEvent, updateSetting, getSetting } from "./database";
import { Memory } from "./memory/memory";
import { valeria } from "./core";

export class AegisSystem {
  public async checkLockdown() {
    const db = await initDatabase();
    const recentErrors = await db.all("SELECT * FROM memory WHERE source = 'orchestrator' AND type = 'alert' AND timestamp > datetime('now', '-10 minutes')");
    
    if (recentErrors.length > 5) {
      const msg = "AEGIS: Detectado comportamiento errático en NEXUS. Activando BLOQUEO DE SEGURIDAD (Lockdown).";
      await updateSetting("safe_mode", "true");
      await updateSetting("security_lockdown", "true");
      if (valeria) await valeria.notifyUser(msg, "critical");
      
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

  public async activateLockdown() {
    await updateSetting("security_lockdown", "true");
    await updateSetting("safe_mode", "true");
    return "🚨 AEGIS: BLOQUEO TOTAL ACTIVADO. Todas las acciones de NEXUS requieren aprobación manual.";
  }

  public async deactivateLockdown() {
    await updateSetting("security_lockdown", "false");
    return "🔹 AEGIS: Bloqueo desactivado. Operaciones normales restauradas.";
  }
}

export const aegis = new AegisSystem();
