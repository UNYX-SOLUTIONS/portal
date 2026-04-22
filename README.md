# 🛫 Lux Viajes - Portal de Registro

Portal de registro seguro para clientes de Lux Viajes. Formulario de escaneo QR que guarda datos directamente en Firebase Firestore.

## 🏗️ Arquitectura

```
Frontend (index.html)
    ↓ POST /api/registro
Backend (Express - server.js)
    ↓ Valida datos
    ↓ POST seguro
n8n Webhook (privado)
    ↓
Firebase (almacena datos)
```

## 📋 Requisitos previos

- Node.js 14 o superior
- npm o yarn
- Una instancia de n8n configurada
- URL del webhook de n8n

## 🚀 Instalación

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia `.env.example` a `.env`:

```bash
cp .env.example .env
```

Edita `.env` y agrega tu URL de webhook de n8n:

```env
PORT=3000
N8N_WEBHOOK_URL=https://tu-instancia-n8n.com/webhook/formulario-lux-viajes
NODE_ENV=development
```

⚠️ **IMPORTANTE**: Nunca commitees el archivo `.env` - está en `.gitignore`

### 3. Ejecutar el servidor

**Desarrollo** (con auto-reload):
```bash
npm run dev
```

**Producción**:
```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

## 📝 Endpoints

### GET `/`
Sirve el formulario HTML

### POST `/api/registro`
Procesa el registro del formulario

**Body esperado:**
```json
{
  "firstName": "Juan",
  "lastName": "Pérez",
  "email": "juan@example.com",
  "promotional": true,
  "acceptTerms": true
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Registro enviado correctamente",
  "data": {
    "firstName": "Juan",
    "lastName": "Pérez",
    "email": "juan@example.com",
    "promotional": true,
    "acceptTerms": true,
    "timestamp": "2026-04-22T10:30:00.000Z",
    "source": "QR Formulario - Oficina Lux Viajes",
    "ip": "192.168.1.1"
  }
}
```

### GET `/api/health`
Verificar estado del servidor

```json
{
  "status": "OK",
  "timestamp": "2026-04-22T10:30:00.000Z",
  "n8nConfigured": true
}
```

## 🔒 Seguridad

✅ **Lo que está protegido:**
- URL del webhook de n8n guardada en `.env` (no expuesta en el cliente)
- Validación de datos en el servidor
- Validación de email con regex
- Campos requeridos validados
- Timeout para peticiones a n8n
- IP del cliente registrada

## 🛠️ Configuración de n8n

1. En tu instancia de n8n, crea un webhook
2. Copia la URL completa del webhook
3. Agrégala a tu `.env` como `N8N_WEBHOOK_URL`
4. El webhook recibirá los datos en el body del POST

**Ejemplo de workflow en n8n:**
```
Webhook (recibe POST)
  ↓
Validar datos
  ↓
Firebase (guardar registro)
  ↓
Responder al cliente
```

## 📦 Deployment

### Opción 1: Heroku
```bash
git push heroku main
```

### Opción 2: Railway
Conecta tu repositorio a Railway

### Opción 3: Tu VPS
```bash
npm install
npm start
```

### Variables de entorno en producción
Configura `N8N_WEBHOOK_URL` en las variables de entorno de tu plataforma de hosting.

## 📊 Logs

El servidor loguea:
- Registros procesados exitosamente
- Errores de validación
- Errores de conexión con n8n

## 🐛 Troubleshooting

### Error: "N8N_WEBHOOK_URL not configured"
- Asegúrate de crear el archivo `.env`
- Verifica que esté en el mismo directorio que `server.js`
- Contiene la URL completa del webhook

### Error 504 - Timeout
- El webhook de n8n tardó más de 10 segundos
- Verifica que n8n esté disponible
- Aumenta el timeout en `server.js` si es necesario

### Error 500
- Revisa los logs del servidor
- Verifica que n8n esté corriendo
- Verifica que la URL del webhook sea correcta

## 📞 Contacto

Para más información sobre la integración, contacta al equipo de Lux Viajes.

---

**Última actualización:** Abril 22, 2026
