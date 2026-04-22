# Integración con Controlador Omada Hotspot

Esta aplicación incluye un módulo para autenticar usuarios en un controlador TP-Link Omada WiFi Hotspot cuando se registran.

**Basado en documentación oficial de TP-Link:**
- FAQ 2907: Omada Controller 4.1.5 - 4.4.6
- FAQ 3231: Omada Controller 5.0.15+

## Cómo funciona el flujo

```
1. Cliente se conecta a WiFi Omada
2. Intenta acceder a internet
3. EAP/Gateway intercepta y redirige a tu Portal
4. Portal muestra formulario de registro
5. Usuario completa datos
6. Portal obtiene token del controlador Omada
7. Portal autoriza al cliente en la red
8. Cliente obtiene acceso a internet
```

## Configuración

### Variables de entorno

Agrega estas variables a tu archivo `.env`:

```env
# Controlador Omada
OMADA_CONTROLLER_IP=24.144.83.81
OMADA_CONTROLLER_PORT=8043
OMADA_CONTROLLER_ID=a4d3107367bfe1c7133895cd766b1333
OMADA_USERNAME=operator1
OMADA_PASSWORD=operator1
OMADA_AUTH_DURATION=3600000
```

### Obtener datos del controlador

1. **OMADA_CONTROLLER_IP**: IP o hostname de tu controlador
2. **OMADA_CONTROLLER_PORT**: Puerto HTTPS (8043 por defecto en software, 443 en OC)
3. **OMADA_CONTROLLER_ID**: ID único del controlador (obtenido automáticamente)
4. **Credenciales**: Usuario y contraseña del operador Hotspot (creado en Hotspot Manager)

## Uso en el servidor

### Inicializar el módulo

```javascript
const OmadaAuthenticator = require("./lib/omadaAuthenticator");
const omada = new OmadaAuthenticator();
```

### Con configuración personalizada

```javascript
const omada = new OmadaAuthenticator({
  controllerIP: "192.168.1.100",
  controllerPort: "8043",
  controllerID: "tu-controller-id",
  username: "tu-usuario",
  password: "tu-password",
  authDuration: 7200000 // 2 horas
});
```

### Autenticar un usuario

```javascript
const result = await omada.authenticateUser({
  clientMac: "00:11:22:33:44:55",    // MAC del cliente WiFi
  apMac: "AA:BB:CC:DD:EE:FF",        // MAC del AP/EAP
  ssidName: "LuxWiFi",               // Nombre del SSID
  radioId: "0",                      // 0=2.4GHz, 1=5GHz
});

console.log(result);
// {
//   success: true,
//   wifiAuthenticated: true,
//   message: "Client authorized on network",
//   clientMac: "00:11:22:33:44:55",
//   durationMs: 3600000,
//   timestamp: "2024-04-22T10:30:00.000Z"
// }
```

## Flujo de registro con WiFi

### 1. Parámetros que recibe tu Portal

Cuando el cliente es redirigido desde Omada, recibe estos parámetros:

```
GET /registro?clientMac=XX:XX:XX:XX:XX:XX
              &apMac=YY:YY:YY:YY:YY:YY
              &ssidName=LuxWiFi
              &radioId=0
              &t=1682097600000000
              &site=default
              &redirectUrl=https://www.google.com
```

### 2. Tu Portal captura estos datos

El formulario debe incluir campos ocultos con estos valores:

```html
<input type="hidden" name="clientMac" id="clientMac" />
<input type="hidden" name="apMac" id="apMac" />
<input type="hidden" name="ssidName" id="ssidName" />
<input type="hidden" name="radioId" id="radioId" />
```

JavaScript para capturar parámetros:

```javascript
const params = new URLSearchParams(window.location.search);
document.getElementById("clientMac").value = params.get("clientMac") || "";
document.getElementById("apMac").value = params.get("apMac") || "";
document.getElementById("ssidName").value = params.get("ssidName") || "";
document.getElementById("radioId").value = params.get("radioId") || "";
```

### 3. Servidor procesa el registro

```javascript
app.post("/api/registro", async (req, res) => {
  const {
    firstName,
    lastName,
    email,
    clientMac,
    apMac,
    ssidName,
    radioId
  } = req.body;

  // Guardar en Firebase
  const docRef = await db.collection("registros").add({
    firstName,
    lastName,
    email,
    timestamp: admin.firestore.Timestamp.now()
  });

  // Autenticar en WiFi (si datos disponibles)
  const wifiResult = await omada.authenticateUser({
    clientMac,
    apMac,
    ssidName,
    radioId
  });

  return res.json({
    success: true,
    registerId: docRef.id,
    wifi: wifiResult
  });
});
```

### 4. Posibles respuestas

**Caso 1: Todo exitoso**
```json
{
  "success": true,
  "wifiAuthenticated": true,
  "message": "Client authorized on network",
  "clientMac": "00:11:22:33:44:55"
}
```

**Caso 2: Datos de WiFi incompletos**
```json
{
  "success": true,
  "wifiAuthenticated": false,
  "message": "User registered (WiFi auth skipped - incomplete data)"
}
```

**Caso 3: WiFi no disponible pero registro guardado**
```json
{
  "success": true,
  "wifiAuthenticated": false,
  "message": "User registered (WiFi auth failed but user registered anyway)",
  "wifiError": "Connection timeout"
}
```

## Detalles técnicos importantes

### Formato de datos

Según FAQ 2907 de TP-Link:

- **Login**: Debe ser `application/x-www-form-urlencoded`, NO JSON
- **Autorización**: URL encoded, token en query string (`?token=...`)
- **Tiempo**: En **microsegundos** (ms × 1000)
- **Cookies**: El módulo maneja `TPEAP_SESSIONID` automáticamente

### Certificados SSL

El controlador Omada usa certificados auto-firmados. El módulo ya acepta esto:

```javascript
rejectUnauthorized: false
```

Para producción, puedes:
1. Instalar certificado en el controlador Omada
2. O agregar el certificado a tu CA local

## Manejo de errores

El módulo es **resiliente**:

✅ Usuario se registra incluso si WiFi falla
✅ Logs detallados para debugging
✅ Errores de conexión no bloquean el registro

```javascript
// Los errores se capturan y loguean
console.log("⚠️  WiFi authentication failed: [error]");
// Pero el registro continúa
```

## Testing

### Test rápido en consola del navegador

```javascript
// Simular parámetros de Omada
window.location.search = "?clientMac=00:11:22:33:44:55&apMac=AA:BB:CC:DD:EE:FF&ssidName=TestSSID&radioId=0";

// Luego enviar formulario
fetch('/api/registro', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    acceptTerms: true,
    clientMac: '00:11:22:33:44:55',
    apMac: 'AA:BB:CC:DD:EE:FF',
    ssidName: 'TestSSID',
    radioId: '0'
  })
}).then(r => r.json()).then(console.log)
```

### Endpoint de testing

```bash
curl -X POST http://localhost:3000/api/test-omada \
  -H "Content-Type: application/json" \
  -d '{
    "clientMac": "00:11:22:33:44:55",
    "apMac": "AA:BB:CC:DD:EE:FF",
    "ssidName": "TestSSID",
    "radioId": "0"
  }'
```

## Troubleshooting

### "Login failed"
- Verifica usuario/contraseña del operador en Hotspot Manager
- Confirma que el usuario sea de tipo "Operador", no administrador

### "Authorization failed"
- MAC addresses incorrectos
- SSID no existe en ese controlador
- radioId inválido (debe ser 0 o 1)

### "Connection refused"
- Controlador no accesible desde tu servidor
- Puerto HTTPS incorrecto
- Firewall bloqueando conexión

### "Invalid JSON response"
- Asegúrate que Content-Type sea `application/x-www-form-urlencoded`
- No envies JSON al endpoint de autorización

## Referencias

- [TP-Link FAQ 2907](https://www.tp-link.com/us/support/faq/2907/) - Omada 4.1.5-4.4.6
- [TP-Link FAQ 3231](https://www.tp-link.com/us/support/faq/3231/) - Omada 5.0.15+
- [Documentación Omada Cloud](https://www.tp-link.com/us/business/support/download/omada-cloud/)

