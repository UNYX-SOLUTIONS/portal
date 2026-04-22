# Integración Omada - Guía Rápida

He creado un módulo completo para integrar la autenticación del controlador Omada con tu servidor Node.js/Firebase.

## 📋 Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `lib/omadaAuthenticator.js` | **Módulo principal** - Maneja toda la autenticación con Omada |
| `OMADA_INTEGRATION.md` | Documentación detallada de configuración |
| `SERVER_INTEGRATION_EXAMPLE.js` | Ejemplo de cómo modificar `server.js` |
| `FORM_INTEGRATION_EXAMPLE.js` | Ejemplo de cómo modificar el formulario HTML |

## 🔄 Flujo de funcionamiento

```
┌─────────────────────────────────────────────────────────────┐
│  Usuario llena formulario en navegador                      │
│  (Nombre, Apellido, Email + datos WiFi opcionales)         │
└────────────────────────┬────────────────────────────────────┘
                         │ POST /api/registro
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Servidor Node.js recibe datos                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                    ┌────┴────┐
                    ▼         ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ Guardar Firebase │  │ Autenticar Omada │
        │    (siempre)     │  │  (si datos hay)  │
        └────────┬─────────┘  └────────┬─────────┘
                 │                      │
                 │              ┌───────┴────────┐
                 │              ▼                ▼
                 │        ┌──────────────┐  ┌──────────────┐
                 │        │ Obtener CSRF │  │ Autorizar    │
                 │        │ Token        │  │ Cliente WiFi │
                 │        └──────┬───────┘  └──────┬───────┘
                 │               │                 │
                 └───────────────┼─────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │ Respuesta al cliente   │
                    │ {                      │
                    │   success: true,       │
                    │   registerId: "...",   │
                    │   wifi: {...}          │
                    │ }                      │
                    └────────────────────────┘
```

## 🚀 Pasos para implementar

### 1️⃣ Configurar variables de entorno

Edita tu `.env`:

```env
OMADA_CONTROLLER_IP=24.144.83.81
OMADA_CONTROLLER_PORT=8043
OMADA_CONTROLLER_ID=a4d3107367bfe1c7133895cd766b1333
OMADA_USERNAME=operator1
OMADA_PASSWORD=operator1
```

### 2️⃣ Modificar `server.js`

Agrega esto al inicio:

```javascript
const OmadaAuthenticator = require("./lib/omadaAuthenticator");
const omada = new OmadaAuthenticator();
```

### 3️⃣ Actualizar el endpoint `/api/registro`

Reemplaza el endpoint POST actual con la versión del archivo [SERVER_INTEGRATION_EXAMPLE.js](SERVER_INTEGRATION_EXAMPLE.js).

Los cambios principales son:

```javascript
// 1. Obtener datos de WiFi del request
const { clientMac, apMac, ssidName, radioId } = req.body;

// 2. Guardar en Firebase (como antes)
const docRef = await db.collection("registros").add(registroData);

// 3. Intentar autenticar en Omada (NUEVO)
const omadaResult = await omada.authenticateUser({
  clientMac,
  apMac,
  ssidName,
  radioId,
});

// 4. Retornar respuesta con resultado de WiFi
return res.status(200).json({
  success: true,
  registerId: docRef.id,
  wifi: omadaResult,  // NUEVO
  data: {...}
});
```

### 4️⃣ Actualizar formulario HTML/JS

En tu `index.html`, asegúrate que el formulario envíe datos de WiFi:

```javascript
const formData = {
  firstName: "Juan",
  lastName: "Pérez",
  email: "juan@example.com",
  acceptTerms: true,
  // Agregar si están disponibles:
  clientMac: "00:11:22:33:44:55",
  apMac: "AA:BB:CC:DD:EE:FF",
  ssidName: "LuxWiFi",
  radioId: "radio1"
};

const response = await fetch("/api/registro", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(formData)
});
```

## ✅ Características principales

✨ **Resiliente**: El usuario se registra incluso si Omada no está disponible
📝 **Bien documentado**: Incluye ejemplos y guías detalladas
🛡️ **Manejo de errores**: Detecta y maneja problemas de conexión
🔐 **Seguro**: Maneja certificados auto-firmados de Omada
📊 **Loguea todo**: Incluye logs detallados para debugging

## 🧪 Testing

### Test rápido en la consola del navegador

```javascript
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
    ssidName: 'LuxWiFi',
    radioId: 'radio1'
  })
}).then(r => r.json()).then(console.log)
```

### Endpoint de testing

Agregué un endpoint `/api/test-omada` para probar:

```bash
curl -X POST http://localhost:3000/api/test-omada \
  -H "Content-Type: application/json" \
  -d '{
    "clientMac": "00:11:22:33:44:55",
    "apMac": "AA:BB:CC:DD:EE:FF",
    "ssidName": "LuxWiFi",
    "radioId": "radio1"
  }'
```

## 📚 Documentación completa

- [OMADA_INTEGRATION.md](OMADA_INTEGRATION.md) - Guía completa de configuración
- [SERVER_INTEGRATION_EXAMPLE.js](SERVER_INTEGRATION_EXAMPLE.js) - Ejemplo para server.js
- [FORM_INTEGRATION_EXAMPLE.js](FORM_INTEGRATION_EXAMPLE.js) - Ejemplo para frontend
- [lib/omadaAuthenticator.js](lib/omadaAuthenticator.js) - Código del módulo

## ⚠️ Consideraciones

1. **Datos de WiFi opcionales**: Si no se envían, el usuario se registra normalmente
2. **Resiliente**: Si Omada falla, el registro se guarda en Firebase de todas formas
3. **Certificados**: El controlador Omada usa HTTPS con certificado auto-firmado
4. **URL parameters**: Los datos MAC pueden venir en parámetros URL desde el portal Omada

## 🔗 Integración con portal Omada existente

Si tienes un portal Omada existente, debes:

1. Configurar el portal Omada para redirigir aquí con parámetros:
   ```
   https://tu-servidor/registro?clientMac=XX&apMac=YY&ssidName=ZZ&radioId=WW
   ```

2. El formulario capturará esos parámetros automáticamente

3. Al enviar el formulario, se autenticará al usuario en la red

## 💡 Próximos pasos

- [ ] Configura las variables de entorno en `.env`
- [ ] Adapta el endpoint `/api/registro` en tu `server.js`
- [ ] Prueba con el endpoint `/api/test-omada`
- [ ] Integra el formulario HTML
- [ ] Deploya a tu VPS en Hostinger

¿Necesitas ayuda con algún paso?
