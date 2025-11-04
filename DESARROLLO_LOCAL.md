# 🚀 Guía de Desarrollo Local (Modo Híbrido)

Esta guía explica cómo correr el proyecto en modo híbrido: **BD en Docker, Frontend/Backend localmente** para tener hot-reload y ver cambios en tiempo real.

---

## 📋 Prerequisitos

- Node.js 18+ instalado
- Docker Desktop instalado y corriendo
- npm o yarn instalado

---

## 🔧 Configuración Inicial

### 1. Detener Frontend y Backend en Docker

```powershell
docker-compose stop frontend backend
```

Estos servicios ahora correrán localmente.

### 2. Configurar Backend

1. Copiar el archivo de ejemplo:
   ```powershell
   copy backend\.env.example backend\.env
   ```

2. Verificar que `backend/.env` tenga:
   ```env
   DATABASE_URL="postgresql://sgst_user:sgst_password@localhost:5432/sgst_db"
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   REFRESH_SECRET="your-refresh-secret-change-this-in-production"
   PORT=3001
   NODE_ENV=development
   ```

### 3. Instalar Dependencias

**Backend:**
```powershell
cd backend
npm install
cd ..
```

**Frontend:**
```powershell
cd frontend
npm install
cd ..
```

---

## 🚀 Iniciar Servicios

### Opción 1: Usar los Scripts de Inicio (Recomendado)

```powershell
# Terminal 1: Iniciar servicios Docker (BD, Camunda, etc.)
docker-compose up -d postgres pgadmin camunda orchestrator

# Terminal 2: Iniciar Backend
cd backend
npm run dev

# Terminal 3: Iniciar Frontend
cd frontend
npm run dev
```

### Opción 2: Inicio Manual

**1. Iniciar servicios Docker:**
```powershell
docker-compose up -d postgres pgadmin camunda orchestrator
```

Espera a que todos estén "healthy" (usa `docker-compose ps` para verificar).

**2. Preparar la base de datos (solo primera vez o después de cambios):**
```powershell
cd backend
npx prisma generate
npx prisma db push
npm run seed
cd ..
```

**3. Iniciar Backend:**
```powershell
cd backend
npm run dev
```

El backend estará en: http://localhost:3001

**4. Iniciar Frontend:**
```powershell
cd frontend
npm run dev
```

El frontend estará en: http://localhost:5173 (Vite usa puerto 5173 por defecto)

---

## 📝 URLs de Acceso

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **Frontend (Local)** | http://localhost:5173 | Interfaz de usuario con hot-reload |
| **Backend (Local)** | http://localhost:3001 | REST API con hot-reload |
| **PostgreSQL (Docker)** | localhost:5432 | Base de datos |
| **Camunda (Docker)** | http://localhost:8081 | Motor BPM |
| **PgAdmin (Docker)** | http://localhost:8080 | Admin PostgreSQL |
| **Orchestrator (Docker)** | http://localhost:3002 | Worker externo |

---

## 🔄 Hot-Reload

- **Frontend**: Vite detecta cambios automáticamente y recarga el navegador
- **Backend**: `tsx watch` reinicia el servidor automáticamente al detectar cambios

---

## 🛑 Detener Servicios

```powershell
# Detener servicios Docker
docker-compose stop

# Detener servicios locales (Ctrl+C en cada terminal)

# O detener todo
docker-compose down
```

---

## 🔧 Comandos Útiles

### Backend

```powershell
cd backend

# Generar cliente Prisma
npx prisma generate

# Aplicar cambios al schema
npx prisma db push

# Ejecutar seed
npm run seed

# Resetear BD + seed
npm run db:reset

# Abrir Prisma Studio
npm run prisma:studio
```

### Frontend

```powershell
cd frontend

# Build para producción
npm run build

# Preview de producción
npm run preview

# Linter
npm run lint
```

### Docker

```powershell
# Ver logs de un servicio
docker-compose logs -f postgres

# Ver estado de servicios
docker-compose ps

# Reiniciar un servicio
docker-compose restart postgres
```

---

## ⚠️ Troubleshooting

### Error: "Can't reach database"
- Verifica que PostgreSQL esté corriendo: `docker-compose ps`
- Verifica que el `DATABASE_URL` en `backend/.env` sea correcto
- Verifica que el puerto 5432 esté libre

### Error: "Port already in use"
- Verifica que no haya otro proceso usando el puerto
- Backend: 3001
- Frontend: 5173 (Vite)
- PostgreSQL: 5432

### Error: "Module not found"
- Ejecuta `npm install` en el directorio correspondiente
- Verifica que `node_modules` exista

### Frontend no se conecta al Backend
- Verifica que el backend esté corriendo en http://localhost:3001
- Verifica que el backend responda: `curl http://localhost:3001/health`
- Verifica CORS en el backend (debe permitir http://localhost:5173)

---

## 📚 Próximos Pasos

1. Inicia los servicios Docker para BD
2. Inicia backend y frontend localmente
3. Haz cambios en el código
4. Ve los cambios reflejarse automáticamente ✨

---

**Nota**: Para volver a Docker completo, simplemente:
```powershell
docker-compose up -d
```


