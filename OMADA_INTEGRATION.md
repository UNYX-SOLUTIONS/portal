# Integración con Controlador Omada Hotspot

Esta aplicación incluye un módulo para autenticar usuarios en un controlador TP-Link Omada WiFi Hotspot cuando se registran.

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

**Valores por defecto** (si no especificas en `.env`):
- IP: `24.144.83.81`
- Puerto: `8043`
- Username: `operator1`
- Password: `operator1`
- Duración: `3600000` ms (1 hora)

### Cómo obtener los datos del controlador

1. **OMADA_CONTROLLER_IP**: IP de tu controlador Omada
2. **OMADA_CONTROLLER_PORT**: Puerto HTTPS del controlador (por defecto 8043)
3. **OMADA_CONTROLLER_ID**: ID único del controlador (lo encontrará el módulo en la respuesta)
4. **Credenciales**: Usuario y contraseña del operador Hotspot

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
  clientMac: "00:11:22:33:44:55",
  apMac: "AA:BB:CC:DD:EE:FF",
  ssidName: "LuxWiFi",
  radioId: "radio1",
});

console.log(result);
// {
//   success: true,
//   message: "Client authorized on network",
//   clientMac: "00:11:22:33:44:55",
//   wifiAuthenticated: true,
//   timestamp: "2024-04-22T10:30:00.000Z"
// }
```

## Flujo de registro con WiFi

1. El usuario llena el formulario con:
   - Nombre
   - Apellido
   - Email
   - Datos de WiFi (MAC del cliente, MAC del AP, SSID, Radio ID)

2. El servidor:
   - Guarda los datos en Firebase
   - Intenta autenticar al usuario en el controlador Omada
   - Retorna respuesta exitosa incluso si la autenticación WiFi falla

3. Posibles respuestas:
   ```json
   {
     "success": true,
     "wifiAuthenticated": true,
     "message": "User registered and WiFi authenticated"
   }
   ```

   o

   ```json
   {
     "success": true,
     "wifiAuthenticated": false,
     "message": "User registered (WiFi auth unavailable)",
     "wifiError": "Network error description"
   }
   ```

## Manejo de errores

El módulo está diseñado para ser **resiliente**:

- Si Omada no está disponible, el usuario **se registra de todas formas**
- Se loguean todos los errores para debugging
- Los errores de conexión no bloquean el registro

## Debugging

Para ver logs detallados, agrega esto a tu código:

```javascript
// En desarrollo
console.log("Intentando autenticar en Omada...");
const result = await omada.authenticateUser(userData);
console.log("Resultado:", result);
```

Verás logs como:
```
✅ Cliente 00:11:22:33:44:55 autorizado en red WiFi
⚠️  WiFi authentication failed: Connection timeout
```

## Certificados SSL

El controlador Omada usa HTTPS con certificado auto-firmado. El módulo ya está configurado para aceptarlo (`rejectUnauthorized: false`).

## Troubleshooting

### "Failed to authenticate with Omada controller"
- Verifica que el IP y puerto sean correctos
- Confirma que las credenciales de operador existan
- Asegúrate que el controlador sea accesible desde tu VPS

### "Invalid JSON response"
- El controlador puede estar devolviendo HTML en lugar de JSON
- Revisa los logs del controlador Omada

### Cliente no autorizado después del registro
- Verifica que los datos MAC sean correctos
- Confirma que el SSID existe en el controlador
- Revisa que el radioId sea válido

## Referencias

- [TP-Link Omada SDN Controller API Documentation](https://www.tp-link.com/en/business/support/download/eap/)
- RFC para direcciones MAC: https://en.wikipedia.org/wiki/MAC_address
