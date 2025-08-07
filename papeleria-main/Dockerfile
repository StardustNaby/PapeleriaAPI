# Usar imagen base de Node.js oficial
FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache \
    mysql-client \
    curl \
    && rm -rf /var/cache/apk/*

# Copiar archivos de package.json primero para aprovechar cache de Docker
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production && npm cache clean --force

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Crear directorios necesarios
RUN mkdir -p logs uploads && \
    chown -R nextjs:nodejs /app

# Copiar código fuente
COPY --chown=nextjs:nodejs . .

# Construir la aplicación frontend
RUN npm run build

# Cambiar a usuario no-root
USER nextjs

# Exponer puerto
EXPOSE 3001

# Crear script de healthcheck
RUN echo '#!/bin/sh\ncurl -f http://localhost:3001/api/health || exit 1' > healthcheck.sh && \
    chmod +x healthcheck.sh

# Configurar healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ./healthcheck.sh

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3001

# Comando para iniciar la aplicación
CMD ["npm", "start"] 