# Docker - Guía de deployment

## Descripción

Tu aplicación ahora tiene un setup Docker mejorado con:

✅ **Multi-stage build** - Imagen más pequeña y segura
✅ **Usuario no-root** - Mayor seguridad (usuario `nodejs`)
✅ **Health checks** - Moniteo automático de salud
✅ **Resource limits** - Límites de CPU y memoria
✅ **Logging** - Logs JSON con rotación automática
✅ **Network aislada** - Contenedores en red privada
✅ **Variables Omada** - Soporte para Omada Cloud

## Compilar la imagen

```bash
# Compilar la imagen Docker
docker build -t lux-viajes-portal:latest .

# O con docker-compose
docker-compose build
```

## Correr con Docker Compose

### 1. Copiar archivo de entorno

```bash
cp .env.example .env
# Editar .env con tus valores
nano .env
```

### 2. Copiar serviceAccountKey.json

```bash
# Asegúrate que serviceAccountKey.json esté en la raíz
ls -la serviceAccountKey.json
```

### 3. Iniciar los contenedores

```bash
# Iniciar en background
docker-compose up -d

# Ver logs en tiempo real
docker-compose logs -f app

# Ver solo los últimos 100 líneas
docker-compose logs --tail=100 app
```

### 4. Verificar que funciona

```bash
# Health check
curl http://localhost:3000/api/health

# Probar endpoint
curl -X POST http://localhost:3000/api/test-omada \
  -H "Content-Type: application/json" \
  -d '{
    "clientMac": "00:11:22:33:44:55",
    "apMac": "AA:BB:CC:DD:EE:FF",
    "ssidName": "TestSSID",
    "radioId": "0"
  }'
```

## Comandos útiles

### Administración de contenedores

```bash
# Ver estado de contenedores
docker-compose ps

# Reiniciar la aplicación
docker-compose restart app

# Detener
docker-compose down

# Detener y remover volúmenes
docker-compose down -v

# Reconstruir imagen y reiniciar
docker-compose up -d --build

# Ver logs completos
docker-compose logs app

# Ver logs en tiempo real
docker-compose logs -f app

# Ver solo errores
docker-compose logs app | grep ERROR
```

### Debugging

```bash
# Entrar a la shell del contenedor
docker-compose exec app sh

# Ver variables de entorno del contenedor
docker-compose exec app env

# Ejecutar comando dentro del contenedor
docker-compose exec app npm list

# Ver procesos en el contenedor
docker-compose exec app ps aux
```

### Monitoreo

```bash
# Ver uso de recursos
docker stats

# Ver estadísticas de contenedor específico
docker stats lux-viajes-portal

# Ver eventos de Docker
docker events --filter type=container
```

## Mejoras en la imagen

### Dockerfile mejorado

1. **Multi-stage build**
   - Etapa 1: Instala y prepara dependencias
   - Etapa 2: Copia solo lo necesario (imagen ~50% más pequeña)

2. **Usuario no-root**
   - Corre con usuario `nodejs` (uid 1001) en lugar de root
   - Mayor seguridad

3. **Health checks**
   - Verifica `/api/health` cada 30 segundos
   - Reinicia automáticamente si no responde

### docker-compose.yml mejorado

1. **Variables Omada Cloud**
   - Configuración para Omada Cloud incluida
   - Fácil cambiar entre Cloud y local

2. **Resource limits**
   - CPU máximo: 1 core
   - CPU reservado: 0.5 cores
   - Memoria máximo: 512MB
   - Memoria reservado: 256MB

3. **Logging mejorado**
   - Formato JSON
   - Rotación automática (máx 10MB por archivo)
   - Máximo 3 archivos de log

4. **Volúmenes**
   - `serviceAccountKey.json` en read-only
   - Carpeta `logs` para persistir logs

## En producción en Hostinger VPS

### 1. Clonar repositorio

```bash
git clone https://github.com/UNYX-SOLUTIONS/portal.git
cd portal
```

### 2. Configurar variables

```bash
cp .env.example .env
nano .env  # Editar con valores reales
```

### 3. Copiar credenciales Firebase

```bash
# Via SCP desde tu máquina local
scp serviceAccountKey.json usuario@tu-vps:/home/usuario/portal/
```

### 4. Crear carpeta de logs

```bash
mkdir -p logs
chmod 755 logs
```

### 5. Iniciar

```bash
docker-compose up -d
```

### 6. Verificar

```bash
docker-compose ps
docker-compose logs app
```

## Nginx como proxy reverso (opcional)

Si quieres HTTPS y un dominio personalizado:

### 1. Crear `nginx.conf`

```nginx
upstream app {
    server app:3000;
}

server {
    listen 80;
    server_name tu-dominio.com;
    
    # Redirigir HTTP a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name tu-dominio.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    
    location / {
        proxy_pass http://app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. Descomentar nginx en docker-compose.yml

```yaml
  nginx:
    image: nginx:alpine
    container_name: lux-viajes-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - app
    networks:
      - app-network
    restart: unless-stopped
```

### 3. Generar certificado SSL

```bash
# Auto-firmado (testing)
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes

# Let's Encrypt (producción)
sudo certbot certonly --standalone -d tu-dominio.com
sudo cp /etc/letsencrypt/live/tu-dominio.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/tu-dominio.com/privkey.pem ssl/key.pem
sudo chown 1001:1001 ssl/*
```

### 4. Iniciar con nginx

```bash
docker-compose up -d
```

## Troubleshooting

### Contenedor falla al iniciar

```bash
# Ver logs detallados
docker-compose logs app

# Verificar sintaxis JSON en .env
grep -E "^[A-Z_]+=" .env

# Verificar que serviceAccountKey.json existe
ls -la serviceAccountKey.json
```

### Health check falla

```bash
# Ver si el servidor responde
docker-compose exec app curl http://localhost:3000/api/health

# Ver procesos
docker-compose exec app ps aux

# Ver variables de entorno
docker-compose exec app env | grep NODE
```

### Problemas de conectividad con Omada

```bash
# Verificar que puede conectar a internet
docker-compose exec app ping 8.8.8.8

# Verificar DNS
docker-compose exec app nslookup use1-omada-cloud.tplinkcloud.com

# Probar conexión a Omada directamente
docker-compose exec app curl -k https://use1-omada-cloud.tplinkcloud.com:443/api/v2/hotspot/login
```

## Información de la imagen

```bash
# Ver información de imagen
docker image inspect lux-viajes-portal:latest

# Ver tamaño de imagen
docker images lux-viajes-portal

# Ver layers de la imagen
docker history lux-viajes-portal:latest
```

## Actualizaciones

Para actualizar a la última versión:

```bash
# Descargar cambios
git pull

# Reconstruir imagen
docker-compose build

# Reiniciar
docker-compose up -d

# Verificar
docker-compose logs -f app
```

## Backups

### Respaldar base de datos Firebase

Tu base de datos está en Firebase (cloud), así que se respalda automáticamente.

### Respaldar logs

```bash
# Comprimir y descargar logs
tar -czf logs-backup.tar.gz logs/
```

### Respaldar credenciales

```bash
# NO los commits a git (ya están en .gitignore)
# Guardar en lugar seguro
cp serviceAccountKey.json ~/backups/serviceAccountKey.json.bak
```
