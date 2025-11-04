FROM node:18-alpine

WORKDIR /app

# Instalar dependencias del sistema necesarias para Prisma
RUN apk add --no-cache openssl libc6-compat

# Copiar archivos de configuración
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Instalar dependencias (incluyendo devDependencies para TypeScript)
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copiar código fuente
COPY . .

# Generar Prisma Client y compilar TypeScript
RUN npx prisma generate && npm run build

# Exponer puerto
EXPOSE 3001

# Iniciar aplicación
CMD ["npm", "start"]


