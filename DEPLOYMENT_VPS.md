# Desplegar en VPS de Hostinger con Docker Compose

## Requisitos previos

Asegúrate de que tu VPS tenga instalado:
- Docker
- Docker Compose

### Instalar Docker en el VPS (si no está instalado)

```bash
# Actualizar paquetes
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalación
docker --version
docker-compose --version
```

## Pasos para desplegar

### 1. Subir archivos al VPS

Clona el repositorio en tu VPS:

```bash
cd /home/tu-usuario
git clone https://github.com/UNYX-SOLUTIONS/portal.git
cd portal
```

### 2. Configurar credenciales de Firebase

Copia el archivo `serviceAccountKey.json` a tu VPS de forma segura:

```bash
# Desde tu máquina local
scp serviceAccountKey.json tu-usuario@tu-vps-ip:/home/tu-usuario/portal/
```

### 3. Crear archivo .env

Crea un archivo `.env` en la raíz del proyecto con las variables necesarias:

```bash
nano .env
```

Contenido:
```
NODE_ENV=production
PORT=3000
FIREBASE_DATABASE_URL=https://tu-proyecto.firebaseio.com
```

### 4. Iniciar la aplicación con Docker Compose

```bash
# Desde el directorio del proyecto
docker-compose up -d

# Verificar que el contenedor esté corriendo
docker-compose ps

# Ver logs en tiempo real
docker-compose logs -f app
```

## Acceder a la aplicación

La aplicación estará disponible en:
- **HTTP**: `http://tu-vps-ip:3000`
- **HTTPS**: Configurar Nginx como proxy reverso (ver sección siguiente)

## (Opcional) Configurar Nginx como proxy reverso

Para servir HTTPS y usar un dominio, instala Nginx:

```bash
sudo apt install nginx -y

# Crear archivo de configuración
sudo nano /etc/nginx/sites-available/portal
```

Contenido:
```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Habilitar el sitio:
```bash
sudo ln -s /etc/nginx/sites-available/portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Instalar SSL con Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d tu-dominio.com
```

## Comandos útiles

```bash
# Ver logs
docker-compose logs -f app

# Reiniciar la aplicación
docker-compose restart app

# Detener la aplicación
docker-compose down

# Reconstruir la imagen
docker-compose up -d --build

# Ver uso de recursos
docker stats
```

## Actualizar la aplicación

Cuando hagas cambios en el código:

```bash
git pull
docker-compose up -d --build
```

## Troubleshooting

### Puerto 3000 en uso
```bash
sudo lsof -i :3000
```

### Contenedor no inicia
```bash
docker-compose logs app
```

### Permisos de archivo
```bash
sudo chown -R tu-usuario:tu-usuario /home/tu-usuario/portal
chmod 600 serviceAccountKey.json
```
