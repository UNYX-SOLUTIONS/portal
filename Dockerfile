# ============ STAGE 1: Builder ============
FROM node:18-alpine AS builder

# Instalar doas para security
RUN apk add --no-cache doas

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar TODAS las dependencias (incluyendo dev para build)
RUN npm ci

# Copiar código fuente
COPY . .

# ============ STAGE 2: Runtime ============
FROM node:18-alpine

# Instalar doas para security
RUN apk add --no-cache doas

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copiar node_modules desde builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copiar código de la aplicación
COPY --from=builder --chown=nodejs:nodejs /app . .

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Comando para iniciar la aplicación
CMD ["npm", "start"]
