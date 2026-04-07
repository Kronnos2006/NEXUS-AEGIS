# NEXUS AEGIS: Sistema Autónomo de IA y Seguridad Adaptativa

NEXUS AEGIS es una arquitectura de grado militar diseñada para correr en Windows 11 con Docker, centrada en la autonomía total, la orquestación multi-agente y la seguridad impenetrable (AEGIS).

## Arquitectura del Sistema

```
[ USUARIO (Telegram) ] <--> [ VALERIA (Cerebro Central) ] <--> [ DASHBOARD (React) ]
                                |
                                v
                        [ MEMORIA (SQLite/PG) ]
                                |
        ---------------------------------------------------------
        |               |               |               |       |
[ NEXUS AGENTS ] <--> [ AEGIS SECURITY ] <--> [ IDS MONITOR ] <--> [ HONEYPOT ]
```

### Componentes Principales:

1.  **Cerebro Central (Valeria)**:
    *   **Loop Autónomo (60s)**: Evaluación continua de infraestructura y amenazas.
    *   **Orquestación**: Creación y eliminación dinámica de agentes.
    *   **Interfaz Telegram**: Control total vía `@luma_zvezda_bot`.

2.  **Sistema AEGIS (Seguridad)**:
    *   **IDS (Intrusion Detection System)**: Monitoreo de red en tiempo real.
    *   **Defensa Activa**: Bloqueo automático de IPs y cierre de puertos.
    *   **Honeypot**: Captura y análisis de técnicas de ataque.
    *   **Respuesta a Incidentes**: Aislamiento de procesos y backups automáticos.

3.  **Sub-Agentes NEXUS**:
    *   **WebDev**: Generación de código React y despliegue.
    *   **Marketing**: Automatización de contenido y métricas.
    *   **Monitor**: Vigilancia de hardware (CPU/RAM/GPU).
    *   **Code**: Auditoría de seguridad y refactorización.

## Instalación y Despliegue

### Requisitos:
*   Docker Desktop (WSL2 Backend)
*   Node.js v20+
*   NVIDIA API Key (Nemotron 120B)
*   Telegram Bot Token

### Pasos para correr:

1.  **Configurar Variables de Entorno**:
    Crea un archivo `.env` con:
    ```env
    TELEGRAM_BOT_TOKEN="tu_token_aqui"
    GEMINI_API_KEY="tu_nvidia_api_key_aqui"
    NODE_ENV=development
    ```

2.  **Instalar Dependencias**:
    ```bash
    npm install
    ```

3.  **Iniciar NEXUS AEGIS**:
    ```bash
    npm run dev
    ```

### Despliegue con Docker Compose:

```bash
docker-compose up --build
```

## Próximos Objetivos
*   Implementar el módulo IDS avanzado en Python con Scapy.
*   Integrar el sistema de aprendizaje con MITRE ATT&CK.
*   Automatización completa de respuesta a Ransomware.
