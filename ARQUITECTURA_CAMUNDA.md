# Arquitectura de Integración Camunda - SGST

## Visión General

Este documento describe la arquitectura de integración de Camunda con SGST usando un patrón de orquestación con tareas externas.

## Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         Usuario (Web)                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                     │
│                         localhost:80                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Backend API (Node.js + Express)              │
│                        localhost:3001                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  - TramiteController                                    │  │
│  │  - UserController                                       │  │
│  │  - Business Logic                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│             Orchestrator Service (Node.js + TypeScript)         │
│                        localhost:3002                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • External Task Client (camunda-external-task-client) │  │
│  │  • Handlers:                                           │  │
│  │    - crear-tramite                                    │  │
│  │    - actualizar-estado                                │  │
│  │    - enviar-notificacion                             │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────────┬──────────────────────────────────────────┬───────────┘
           │                                          │
           │ External Task Pattern                    │ HTTP Requests
           │                                          │
           ▼                                          ▼
┌──────────────────────────┐            ┌──────────────────────────┐
│   Camunda BPM Platform  │            │   Backend API            │
│    localhost:8081        │            │   localhost:3001         │
│  ┌────────────────────┐  │            │  ┌──────────────────┐    │
│  │ • Process Engine  │  │────────────▶│  │ /api/tramites    │    │
│  │ • Cockpit         │  │            │  │ /api/users       │    │
│  │ • Tasklist        │  │            │  │ /api/notific...  │    │
│  │ • Admin           │  │            │  └──────────────────┘    │
│  └────────────────────┘  │            └──────────────────────────┘
│                           │
│  ┌────────────────────┐  │
│  │  BPMN Diagrams     │  │
│  │  • prueba.bpmn     │  │
│  │  • flujo-tramite   │  │
│  └────────────────────┘  │
└──────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                         │
│                         localhost:5432                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  • sgst_db (Aplicación)                                 │  │
│  │  • Tablas: tramites, usuarios, notificaciones, etc.    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Flujo de Comunicación

### 1. Usuario Solicita Trámite
```
Usuario → Frontend → Backend API → PostgreSQL
              │
              ▼
         (Opcional: Inicia proceso Camunda)
```

### 2. Proceso en Camunda
```
Backend/Usuario → Camunda → Orchestrator → Backend → PostgreSQL
                          ↓
                   External Task
```

### 3. Manejo de Tareas Externas

**Camunda** crea una external task para una actividad del proceso.

**Orchestrator**:
1. Se suscribe al topic de la tarea
2. Recibe la tarea desde Camunda
3. Llama al backend API
4. Obtiene respuesta del backend
5. Completa la tarea en Camunda
6. Camunda continúa con el siguiente paso

## Patrón External Task

Las external tasks permiten:
- ✅ Separar la lógica de negocio del motor de procesos
- ✅ Comunicarse con sistemas externos
- ✅ Mantener el backend desacoplado de Camunda
- ✅ Escalar independientemente el orquestador

## Componentes

### 1. Camunda Engine
- **Función**: Motor de procesos BPMN
- **Puerto**: 8081
- **Acceso**: http://localhost:8081

### 2. Orchestrator
- **Función**: Bridge entre Camunda y Backend
- **Puerto**: 3002
- **Tecnología**: Node.js + TypeScript
- **Librería**: camunda-external-task-client-js

### 3. Backend API
- **Función**: Lógica de negocio y persistencia
- **Puerto**: 3001
- **Tecnología**: Node.js + Express + Prisma

### 4. PostgreSQL
- **Función**: Base de datos principal
- **Puerto**: 5432
- **Schema**: Prisma ORM

## Topics de External Tasks

| Topic | Handler | Descripción |
|-------|---------|-------------|
| `crear-tramite` | createTramite | Crea un trámite en el backend |
| `actualizar-estado` | updateEstado | Actualiza el estado de un trámite |
| `enviar-notificacion` | sendNotification | Envía notificaciones al usuario |

## Beneficios de esta Arquitectura

1. **Separación de Responsabilidades**
   - Backend: Lógica de negocio
   - Orchestrator: Integración con Camunda
   - Camunda: Orquestación de procesos

2. **Escalabilidad**
   - Orchestrator puede escalarse independientemente
   - Múltiples instancias de orchestrator pueden consumir tareas

3. **Mantenibilidad**
   - Código de Camunda separado del backend
   - Fácil agregar nuevos handlers

4. **Testing**
   - Cada componente se puede testear independientemente
   - Orchestrator mockeable para tests

## Cómo Usar

### Iniciar todos los servicios
```bash
docker-compose up -d
```

### Ver logs del orchestrator
```bash
docker logs sgst_orchestrator -f
```

### Ver procesos en Camunda
1. Acceder a http://localhost:8081
2. Login: admin/admin
3. Ver procesos en Cockpit

### Agregar nuevo handler
1. Editar `orchestrator/src/index.ts`
2. Agregar nuevo `client.subscribe()`
3. Reconstruir imagen: `docker-compose build orchestrator`
4. Reiniciar: `docker-compose restart orchestrator`

## Troubleshooting

### Orchestrator no recibe tareas
- Verificar que Camunda esté corriendo: http://localhost:8081
- Revisar logs: `docker logs sgst_orchestrator`
- Verificar que el processId sea correcto en Camunda

### Backend no responde
- Verificar que el backend esté corriendo
- Revisar `BACKEND_URL` en orchestrator
- Verificar conectividad entre contenedores

### BPMN no se carga
- Copiar archivo BPMN a `camunda/diagrams/`
- Reiniciar Camunda: `docker-compose restart camunda`
- Cargar proceso manualmente en Cockpit

