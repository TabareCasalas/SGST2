# Configuración de Bases de Datos - SGST

## Arquitectura de Bases de Datos

El sistema SGST utiliza dos bases de datos separadas en PostgreSQL para mantener la separación de responsabilidades:

### 1. Base de Datos de la Aplicación: `sgst_db`

**Propósito**: Almacenar todos los datos de la aplicación SGST.

**Contenido**:
- Usuarios y autenticación
- Trámites y consultantes
- Estudiantes y docentes
- Grupos y asignaciones
- Notificaciones
- Auditoría
- Documentos y adjuntos

**Gestión**: Prisma ORM

### 2. Base de Datos de Camunda: `camunda_db`

**Propósito**: Almacenar todos los datos relacionados con procesos BPMN de Camunda.

**Contenido**:
- Definiciones de procesos (BPMN)
- Instancias de procesos
- Ejecuciones y tareas
- Variables de proceso
- Historial de procesos
- Tareas externas (External Tasks)

**Gestión**: Camunda BPM Platform

## Configuración de Conexiones

### PostgreSQL

```yaml
Host: localhost
Port: 5432
User: sgst_user
Password: sgst_password
Databases:
  - sgst_db (Aplicación)
  - camunda_db (Camunda)
```

### Backend API

**Conexión a `sgst_db`**:
```env
DATABASE_URL=postgresql://sgst_user:sgst_password@localhost:5432/sgst_db
```

**Archivo**: `backend/.env`

### Camunda

**Conexión a `camunda_db`**:
```env
DB_URL=jdbc:postgresql://postgres:5432/camunda_db
DB_USERNAME=sgst_user
DB_PASSWORD=sgst_password
```

**Configuración**: Docker Compose

## Inicialización

### Creación Automática

Las bases de datos se crean automáticamente al iniciar el contenedor PostgreSQL usando el archivo `backend/init.sql`.

### Creación Manual

Para crear la base de datos de Camunda manualmente:

```bash
docker exec -i sgst_postgres psql -U sgst_user -d sgst_db -c "CREATE DATABASE camunda_db;"
```

## Beneficios de la Separación

1. **Aislamiento**: Los procesos de Camunda no afectan la base de datos principal
2. **Rendimiento**: Optimizaciones independientes para cada base de datos
3. **Escalabilidad**: Posibilidad de escalar cada base de datos por separado
4. **Mantenimiento**: Backup y restauración independientes
5. **Seguridad**: Permisos y acceso diferenciados

## Migraciones

### Base de Datos Principal (sgst_db)

```bash
cd backend
npx prisma migrate dev    # Desarrollo
npx prisma migrate deploy # Producción
```

### Base de Datos de Camunda (camunda_db)

Camunda crea automáticamente sus tablas al iniciar el contenedor. No se requieren migraciones manuales.

## Backup y Restauración

### Backup Individual

```bash
# Backup de sgst_db
docker exec sgst_postgres pg_dump -U sgst_user sgst_db > sgst_backup.sql

# Backup de camunda_db
docker exec sgst_postgres pg_dump -U sgst_user camunda_db > camunda_backup.sql
```

### Restauración Individual

```bash
# Restaurar sgst_db
docker exec -i sgst_postgres psql -U sgst_user sgst_db < sgst_backup.sql

# Restaurar camunda_db
docker exec -i sgst_postgres psql -U sgst_user camunda_db < camunda_backup.sql
```

## PgAdmin

Acceso a PgAdmin: http://localhost:8080

Credenciales:
- Email: admin@sgst.com
- Password: admin123

Desde PgAdmin puedes gestionar ambas bases de datos.

## Verificación

Listar todas las bases de datos:

```bash
docker exec sgst_postgres psql -U sgst_user -l
```

Verificación de conexiones:

```bash
# Verificar conexión a sgst_db
docker exec sgst_postgres psql -U sgst_user -d sgst_db -c "SELECT version();"

# Verificar conexión a camunda_db
docker exec sgst_postgres psql -U sgst_user -d camunda_db -c "SELECT version();"
```

## Troubleshooting

### Error: "database does not exist"

Si la base de datos no existe, créala:

```bash
docker exec -i sgst_postgres psql -U sgst_user -d postgres -c "CREATE DATABASE camunda_db;"
```

### Error: "permission denied"

Verifica que el usuario tiene permisos:

```bash
docker exec -i sgst_postgres psql -U sgst_user -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE camunda_db TO sgst_user;"
```

## Monitoreo

### Tamaño de las Bases de Datos

```sql
SELECT 
    datname,
    pg_size_pretty(pg_database_size(datname)) AS size
FROM pg_database
WHERE datname IN ('sgst_db', 'camunda_db');
```

### Número de Tablas

```bash
# Tablas en sgst_db
docker exec sgst_postgres psql -U sgst_user -d sgst_db -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"

# Tablas en camunda_db
docker exec sgst_postgres psql -U sgst_user -d camunda_db -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

