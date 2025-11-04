# Script de inicio para desarrollo local
# Este script inicia los servicios Docker y luego los servicios locales

Write-Host "🚀 Iniciando servicios para desarrollo local..." -ForegroundColor Green

# Iniciar servicios Docker (BD, Camunda, etc.)
Write-Host "`n📦 Iniciando servicios Docker (PostgreSQL, Camunda, Orchestrator, PgAdmin)..." -ForegroundColor Cyan
docker-compose up -d postgres pgadmin camunda orchestrator

# Esperar a que los servicios estén listos
Write-Host "`n⏳ Esperando a que los servicios Docker estén listos..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Verificar estado
Write-Host "`n✅ Verificando estado de servicios Docker..." -ForegroundColor Cyan
docker-compose ps

Write-Host "`n📝 Próximos pasos:" -ForegroundColor Green
Write-Host "1. Abre una nueva terminal y ejecuta: cd backend && npm run dev" -ForegroundColor White
Write-Host "2. Abre otra terminal y ejecuta: cd frontend && npm run dev" -ForegroundColor White
Write-Host "`n📍 URLs:" -ForegroundColor Green
Write-Host "- Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "- Backend: http://localhost:3001" -ForegroundColor White
Write-Host "- PostgreSQL: localhost:5432" -ForegroundColor White
Write-Host "- Camunda: http://localhost:8081" -ForegroundColor White
Write-Host "- PgAdmin: http://localhost:8080" -ForegroundColor White


