# NEXUS AEGIS

## Sistema Autónomo de IA y Seguridad Adaptativa

NEXUS AEGIS es una plataforma de inteligencia artificial autónoma basada en arquitectura multi-agente, diseñada para operar como un cerebro central capaz de delegar tareas, analizar amenazas y automatizar procesos complejos.

El sistema está construido para ejecutarse en entornos Windows 11, Linux o contenedores Docker, con un enfoque en:

* Autonomía
* Seguridad
* Escalabilidad
* Orquestación Inteligente
* IA avanzada (Gemma 4 + Nemotron)

---

# Arquitectura General del Sistema

```
[ Usuario (Telegram / Web) ]
            │
            ▼
[ VALERIA - Cerebro Central ]
            │
            ▼
[ Router Inteligente ]
            │
            ▼
[ Orchestrator ]
            │
 ─────────────────────────────────
 │        │        │        │
 ▼        ▼        ▼        ▼
Code    Aegis   Finance  Assistant
Agent   Agent   Agent    Agent
            │
            ▼
[ Gemma 4 (Ollama) ]
            │
            ▼
[ Nemotron (Fallback) ]
            │
            ▼
[ Usuario ]
```

---

# Componentes Principales

## Valeria — Cerebro Central

Valeria es el núcleo del sistema.

Funciones:

* Orquestación multi-agente
* Gestión de memoria contextual
* Comunicación con Gemma 4 / Nemotron
* Delegación automática de tareas
* Control del sistema completo

Capacidades:

* Conversación inteligente
* Delegación automática
* Control del sistema
* Monitoreo de agentes

---

# Router Inteligente (v3.8 Alpha)

El Router Inteligente analiza los mensajes y selecciona automáticamente el agente más adecuado.

Ejemplo:

"Analiza este código"
→ CodeAgent

"Revisa la seguridad"
→ AegisAgent

"Precio BTC"
→ FinanceAgent

Fallback:

Si la intención no es clara:

→ assistant-1

---

# Orquestador

El Orquestador gestiona:

* Registro de agentes
* Dispatch de tareas
* Métricas de ejecución
* Supervisión del flujo

Funciones:

* dispatchTask()
* registerAgent()
* monitorAgent()

---

# Sistema AEGIS — Seguridad

AEGIS es el módulo de seguridad del sistema.

Funciones:

* Monitoreo de agentes
* Validación de tareas
* Protección contra fallos
* Auditoría del sistema

Capacidades:

* Seguridad en tiempo real
* Reinicio de agentes
* Prevención de fallos

---

# Agentes del Sistema

## Assistant Agent (LumaHelper)

Funciones:

* Conversación general
* Respuestas fallback
* Asistencia general

---

## Code Agent

Funciones:

* Auditoría de código
* Refactorización
* Generación de código

---

## Aegis Agent

Funciones:

* Auditoría de seguridad
* Análisis del sistema
* Prevención de amenazas

---

## Finance Agent

Funciones:

* Análisis financiero
* Datos crypto
* Métricas económicas

---

## Marketing Agent

Funciones:

* Generación de contenido
* Estrategias marketing
* Automatización campañas

---

## Monitor Agent

Funciones:

* Monitoreo CPU
* Monitoreo RAM
* Estado sistema

---

# Motor IA

El sistema utiliza una arquitectura de proveedor híbrida:

1. **Gemma 4 (Principal)**: Ejecutado localmente vía Ollama. Soporta "Thinking Mode" para razonamiento complejo.
2. **Nemotron (Fallback)**: Utilizado como respaldo estratégico vía NVIDIA API.

Funciones:

* Procesamiento lenguaje natural
* Explicación de respuestas
* Generación inteligente

Fallback:

Si Gemma 4 falla:

→ Nemotron (NVIDIA API)

Si ambos fallan:

→ generateLocalReply()

---

# Sistema de Memoria

Memoria:

* Contexto conversación
* Historial usuario
* Logs sistema

Opciones:

* SQLite
* PostgreSQL

---

# Watchdog

Sistema automático de monitoreo.

Funciones:

* Detectar fallos
* Reiniciar agentes
* Monitorear ejecución

---

# Flujo del Sistema

Usuario
↓
Telegram/Web
↓
Valeria
↓
Router
↓
Orchestrator
↓
Agente
↓
Nemotron
↓
Usuario

---

# Instalación

## Requisitos

* Node.js v20+
* Docker (Opcional)
* NVIDIA API Key
* Telegram Bot Token

---

# Configuración

Crear archivo `.env`

```
TELEGRAM_BOT_TOKEN=your_token
NVIDIA_API_KEY=your_key
NODE_ENV=development
```

---

# Instalación Dependencias

```
npm install
```

---

# Ejecutar Sistema

```
npm run dev
```

---

# Docker

```
docker-compose up --build
```

---

# Características Actuales

* Arquitectura multi-agente
* Router inteligente
* Orquestador
* IA Nemotron
* Watchdog
* Seguridad AEGIS
* Fallback automático
* Logging

---

# Funciones Futuras

* Multi-agente paralelo
* Memoria persistente avanzada
* Dashboard profesional
* Auto aprendizaje
* Sistema plugins
* Control remoto

---

# Objetivos Futuro

* IA autónoma completa
* Auto optimización
* Sistema defensivo avanzado
* Integración cloud

---

# Estado del Proyecto

Versión: v4.0 Alpha
Estado: Estable
Arquitectura: Multi-Agente
IA: Gemma 4 + Nemotron

---

# Licencia

Proyecto privado — NEXUS AEGIS
