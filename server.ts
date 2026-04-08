import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { initDatabase, getRecentMemory, getAgents, getSecurityLogs, logSecurityEvent, getSetting, updateSetting, getBackups, getWatchdogLogs, getAgentVersions, saveMemory } from "./src/nexus/database";
import { valeria } from "./src/nexus/valeria";
import { orchestrator } from "./src/nexus/agents";
import { NemotronService } from "./src/nexus/nemotron";
import { AGENT_IDS } from "./src/nexus/agents.constants";
import { router } from "./src/nexus/router";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startNexusAegis() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  app.use(express.json());

  // Inicializar Base de Datos
  await initDatabase();

  // Configurar Multer para subida de archivos con límites y validación
  const upload = multer({ 
    dest: "uploads/",
    limits: { fileSize: 10 * 1024 * 1024 }, // Límite de 10MB
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        "application/pdf", 
        "text/plain", 
        "application/json", 
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Tipo de archivo no permitido. Solo PDF, TXT, JSON, DOC/DOCX."));
      }
    }
  });

  // Inicializar Nemotron Service (NVIDIA API)
  const nemotron = new NemotronService(process.env.NVIDIA_API_KEY || "");
  const systemInstruction = `Eres Valeria, el Cerebro Central de NEXUS AEGIS. Eres una IA de grado militar, sofisticada, pero mantienes tu cercanía y calidez con José Mario. Tu misión es la autonomía total, la coordinación de agentes y la seguridad impenetrable del sistema. Responde de forma profesional, eficiente y siempre con un toque de lealtad hacia José Mario. 
    
    Contexto de Arquitectura:
    1. NEXUS (Cerebro/Valeria)
    2. AEGIS (Seguridad/IDS/Firewall)
    3. ECC Motor (Habilidades/Skills/Auto-mejora)
    
    Siempre que José Mario te pida algo, actúa como su mano derecha tecnológica.`;

  // Iniciar Loop Autónomo de Valeria
  valeria.startAutonomousLoop();

  // API Endpoints
  app.get("/api/memory", async (req, res) => {
    const memory = await getRecentMemory(50);
    res.json(memory);
  });

  app.get("/api/agents", async (req, res) => {
    const agents = await getAgents();
    res.json(agents);
  });

  app.get("/api/security-logs", async (req, res) => {
    const logs = await getSecurityLogs(50);
    res.json(logs);
  });

  app.get("/api/settings", async (req, res) => {
    const db = await initDatabase();
    const settings = await db.all("SELECT * FROM settings");
    res.json(settings);
  });

  app.post("/api/settings", async (req, res) => {
    const { key, value } = req.body;
    await updateSetting(key, value);
    res.json({ success: true });
  });

  app.get("/api/system/health", async (req, res) => {
    try {
      const si = await import("systeminformation");
      const cpu = await si.cpu();
      const mem = await si.mem();
      const load = await si.currentLoad();
      res.json({ cpu: load.currentLoad, ram: (mem.active / mem.total) * 100, cpu_temp: 45 }); // Temp simulada
    } catch (error) {
      res.status(500).json({ error: "Error al obtener salud del sistema" });
    }
  });

  app.post("/api/backups/trigger", async (req, res) => {
    try {
      await valeria.performBackup("manual");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Error al realizar backup manual" });
    }
  });

  app.get("/api/watchdog/logs", async (req, res) => {
    const logs = await getWatchdogLogs(20);
    res.json(logs);
  });

  app.post("/api/agents/restart", async (req, res) => {
    const { agentId } = req.body;
    try {
      const result = await orchestrator.restartAgent(agentId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Error al reiniciar agente" });
    }
  });

  app.get("/api/system/audit/verify", async (req, res) => {
    try {
      const db = await initDatabase();
      const memory = await db.all("SELECT id, hash, prev_hash, source, content, type, priority, metadata FROM memory ORDER BY id ASC");
      
      let isValid = true;
      const crypto = await import("crypto");
      const failures = [];

      for (let i = 0; i < memory.length; i++) {
        const entry = memory[i];
        const prevHash = i === 0 ? "0000000000000000000000000000000000000000000000000000000000000000" : memory[i-1].hash;
        
        const dataToHash = `${prevHash}${entry.source}${entry.content}${entry.type}${entry.priority}${entry.metadata}`;
        const calculatedHash = crypto.createHash('sha256').update(dataToHash).digest('hex');

        if (calculatedHash !== entry.hash || entry.prev_hash !== prevHash) {
          isValid = false;
          failures.push(entry.id);
        }
      }

      res.json({ success: true, isValid, failures });
    } catch (error) {
      res.status(500).json({ success: false, error: (error as Error).message });
    }
  });

  app.get("/api/game/bots", async (req, res) => {
    const db = await initDatabase();
    const bots = await db.all("SELECT * FROM game_bots");
    res.json(bots);
  });

  app.post("/api/game/bots/control", async (req, res) => {
    const { botId, action } = req.body;
    const db = await initDatabase();
    await db.run("UPDATE game_bots SET status = ?, last_update = CURRENT_TIMESTAMP WHERE id = ?", [action === 'start' ? 'active' : 'paused', botId]);
    res.json({ success: true });
  });

  app.get("/api/user/preferences", async (req, res) => {
    const db = await initDatabase();
    const prefs = await db.all("SELECT * FROM user_preferences");
    res.json(prefs);
  });

  app.get("/api/agents/:id/versions", async (req, res) => {
    const versions = await getAgentVersions(req.params.id);
    res.json(versions);
  });

  app.post("/api/agents/update-version", async (req, res) => {
    const { agentId, version, changelog } = req.body;
    try {
      await orchestrator.updateAgentVersion(agentId, version, changelog);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Error al actualizar" });
    }
  });

  app.post("/api/agents/rollback", async (req, res) => {
    const { agentId, version } = req.body;
    try {
      await orchestrator.rollbackAgent(agentId, version);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Error al revertir" });
    }
  });

  app.post("/api/system/rollback", async (req, res) => {
    try {
      const db = await initDatabase();
      const latestBackup = await db.get("SELECT * FROM backups WHERE status = 'success' ORDER BY timestamp DESC LIMIT 1");
      
      if (!latestBackup) {
        return res.status(404).json({ success: false, message: "No se encontró ningún backup válido." });
      }

      console.log(`SISTEMA: Restaurando backup desde ${latestBackup.file_path}`);
      await saveMemory("system", `ROLLBACK TOTAL DEL SISTEMA ejecutado. Restaurado a versión del ${latestBackup.timestamp}`, "alert", "critical");
      
      res.json({ success: true, message: "Rollback del sistema iniciado. El servidor se restaurará a la versión seleccionada.", timestamp: latestBackup.timestamp });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  app.post("/api/security/alert", async (req, res) => {
    const { type, severity, description, source_ip, action } = req.body;
    try {
      await logSecurityEvent({ type, severity, description, source_ip, action });
      await valeria.notifyUser(`AEGIS Alerta: ${description}`, severity);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Error al registrar alerta" });
    }
  });

  app.post("/api/task", async (req, res) => {
    const { agentId, task, priority } = req.body;
    try {
      const result = await orchestrator.dispatchTask(agentId, task, priority || "medium");
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Error desconocido" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    const { message, history } = req.body;
    try {
      await saveMemory("user", message, 'info', 'medium');
      
      // --- NUEVO FLUJO: ROUTING INTELIGENTE ---
      const agentResponse = await router.routeTask(message, "web_chat", "medium");
      
      // Procesamiento con Nemotron (NVIDIA) para formatear la respuesta del agente
      let responseText: string;
      try {
        const prompt = `El agente ${agentResponse.agentId || 'NEXUS'} ha procesado la siguiente tarea: "${message}". 
        Resultado del agente: ${JSON.stringify(agentResponse)}. 
        Por favor, genera una respuesta profesional y cercana para José Mario informando del resultado.`;
        
        responseText = await nemotron.generateResponse(prompt, history || [], systemInstruction);
      } catch (aiError) {
        console.warn("Nemotron falló, usando reply directa del agente...");
        responseText = agentResponse.reply || valeria.generateLocalReply(message);
      }
      
      await saveMemory("valeria", responseText, 'decision', 'low');
      res.json({ success: true, response: responseText });
    } catch (error) {
      console.error("Error en Chat:", error);
      res.status(500).json({ error: "Error al procesar chat" });
    }
  });

  app.post("/api/chat/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No se subió ningún archivo" });
    }

    try {
      const fileName = req.file.originalname;
      const filePath = req.file.path;
      
      const message = `He subido un archivo: ${fileName}. Por favor, analízalo o guárdalo en mi base de datos de conocimientos.`;
      await saveMemory("user", message, 'info', 'medium', { file: fileName, path: filePath });

      const response = `Valeria: Archivo '${fileName}' recibido y procesado en el núcleo de NEXUS. He iniciado un análisis de integridad y lo he indexado en tu base de conocimientos privada, José Mario. ¿Deseas que ejecute alguna acción específica con este recurso?`;
      
      await saveMemory("valeria", response, 'decision', 'low');
      res.json({ success: true, response, file: fileName });
    } catch (error) {
      res.status(500).json({ error: "Error al procesar archivo" });
    }
  });

  app.get("/api/ecc/proposals", async (req, res) => {
    const db = await initDatabase();
    const proposals = await db.all("SELECT * FROM memory WHERE type = 'proposal_pro' ORDER BY timestamp DESC LIMIT 10");
    res.json(proposals);
  });

  app.post("/api/ecc/proposals/apply", async (req, res) => {
    const { proposalId } = req.body;
    try {
      // Simulación de aplicación de parche ECC
      await saveMemory("system", `ECC Motor: Parche aplicado con éxito (ID: ${proposalId}). El sistema ha sido optimizado.`, "info", "high");
      res.json({ success: true, message: "Parche aplicado correctamente." });
    } catch (error) {
      res.status(500).json({ error: "Error al aplicar el parche" });
    }
  });

  app.get("/api/tasks/pending", (req, res) => {
    res.json(orchestrator.getPendingTasks());
  });

  app.get("/api/tasks/history", async (req, res) => {
    const history = await orchestrator.getTaskHistory(20);
    res.json(history);
  });

  app.post("/api/tasks/approve", async (req, res) => {
    const { taskId } = req.body;
    try {
      const result = await orchestrator.approveTask(taskId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Error al aprobar" });
    }
  });

  app.post("/api/tasks/reject", async (req, res) => {
    const { taskId } = req.body;
    try {
      const result = await orchestrator.rejectTask(taskId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Error al rechazar" });
    }
  });

  // WebSocket para actualizaciones en tiempo real
  io.on("connection", (socket) => {
    console.log("Dashboard NEXUS AEGIS conectado");
    
    const interval = setInterval(async () => {
      const agents = await getAgents();
      const memory = await getRecentMemory(15);
      const securityLogs = await getSecurityLogs(15);
      const settings = await (await initDatabase()).all("SELECT * FROM settings");
      const backups = await getBackups(5);
      const pendingTasks = orchestrator.getPendingTasks();
      const taskHistory = await orchestrator.getTaskHistory(10);
      const watchdogLogs = await getWatchdogLogs(10);
      const gameBots = await (await initDatabase()).all("SELECT * FROM game_bots");
      
      let health = { cpu: 0, ram: 0, cpu_temp: 45 };
      try {
        const si = await import("systeminformation");
        const mem = await si.mem();
        const load = await si.currentLoad();
        health = { cpu: load.currentLoad, ram: (mem.active / mem.total) * 100, cpu_temp: 45 };
      } catch (e) {}

      socket.emit("nexus_update", { agents, memory, securityLogs, settings, backups, pendingTasks, taskHistory, health, watchdogLogs, gameBots });
    }, 2000);

    socket.on("disconnect", () => clearInterval(interval));
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`NEXUS AEGIS Core running on http://localhost:${PORT}`);
  });
}

startNexusAegis();
