# Integración con TP-Link Omada Cloud

Tu Omada está en la nube: `https://use1-omada-cloud.tplinkcloud.com`

Este documento explica cómo configurar la integración con Omada Cloud.

## Tu configuración actual

Basado en tu URL:
```
https://use1-omada-cloud.tplinkcloud.com/omada/5.14.32.56/index.html?token=...
```

**Endpoint**: `use1-omada-cloud.tplinkcloud.com`
**Versión**: 5.14.32 (usa FAQ 3231 de TP-Link)

## Paso 1: Obtener credenciales del operador

### En Omada Cloud:

1. Accede a tu controlador: https://use1-omada-cloud.tplinkcloud.com
2. Ve a **Hotspot Manager** → **Settings** → **Operators**
3. Crea un operador (o usa uno existente):
   - Nombre: `operator1` (o el que prefieras)
   - Contraseña: `operator1` (segura)
4. Copia estas credenciales

## Paso 2: Configurar archivo `.env`

```env
# ===== Omada Cloud Configuration =====
OMADA_CONTROLLER_IP=use1-omada-cloud.tplinkcloud.com
OMADA_CONTROLLER_PORT=443
OMADA_CONTROLLER_ID=1293139a0361b704fd9c4b3e7f346f4e
OMADA_USERNAME=operator1
OMADA_PASSWORD=tu-contraseña-segura
OMADA_AUTH_DURATION=3600000

# ===== Otros =====
NODE_ENV=production
PORT=3000
FIREBASE_DATABASE_URL=https://...
```

**Notas importantes:**
- **OMADA_CONTROLLER_PORT**: Usa `443` (no 8043) para Omada Cloud
- **OMADA_CONTROLLER_ID**: Obtenlo de tu URL o contacta a TP-Link Support
- Las credenciales son del **Operador Hotspot**, no de admin

## Paso 3: Configurar el portal en Omada

En tu controlador Omada Cloud:

### 1. Ve a **Hotspot Manager** → **Portals**

### 2. Crea o edita el portal:
- **Portal Name**: `Lux Viajes Portal`
- **Portal Type**: `External Portal`
- **Portal URL**: `https://tu-dominio.com` (tu servidor)
- **HTTPS Certificate**: Auto-generado o personalizado

### 3. Configurar parámetros de redirección:

**Before Authentication URL:**
```
https://tu-dominio.com/registro?clientMac={clientMac}&apMac={apMac}&ssidName={ssidName}&radioId={radioId}&t={t}&site={site}
```

**After Authentication (Landing Page):**
```
https://www.google.com
```

### 4. Guardar

## Paso 4: Configurar SSID con el portal

### En Omada Cloud:

1. Ve a **Topology** → **Wireless Networks**
2. Selecciona o crea un SSID
3. Ve a **Security** → **Portal**
4. Selecciona: **Portal Manager** → Tu portal creado
5. Activa **Require Portal Authentication**
6. Guarda

## Paso 5: Probar la integración

### Test 1: Verificar conectividad

```bash
# Desde tu servidor, verifica que puedes conectar a Omada Cloud
curl -k https://use1-omada-cloud.tplinkcloud.com:443/api/v2/hotspot/login \
  -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "name=operator1&password=tu-contraseña"
```

**Respuesta esperada:**
```json
{
  "errorCode": 0,
  "msg": "Hotspot log in successfully.",
  "result": {
    "token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
  }
}
```

### Test 2: Probar desde el navegador

1. Conéctate a tu WiFi Omada
2. Abre un navegador
3. Intenta acceder a `http://google.com`
4. Deberías ser redirigido a tu portal
5. Completa el formulario
6. Deberías obtener acceso a internet

### Test 3: Verificar en la consola del servidor

```bash
# En tu VPS, mira los logs
docker-compose logs -f app
```

Deberías ver:
```
✅ Login exitoso en Omada Controller
✅ Cliente 00:11:22:33:44:55 autorizado en red WiFi
```

## Configuración del formulario HTML

Tu formulario debe capturar los parámetros de Omada:

```html
<form id="registroForm" onsubmit="submitRegistroForm(event)">
  
  <!-- Campos visibles -->
  <input type="text" name="firstName" placeholder="Nombre" required />
  <input type="text" name="lastName" placeholder="Apellido" required />
  <input type="email" name="email" placeholder="Email" required />
  <label>
    <input type="checkbox" name="acceptTerms" required />
    Acepto términos y condiciones
  </label>
  
  <!-- Campos ocultos (capturados de URL) -->
  <input type="hidden" name="clientMac" />
  <input type="hidden" name="apMac" />
  <input type="hidden" name="ssidName" />
  <input type="hidden" name="radioId" />
  
  <button type="submit">Registrarse</button>
</form>

<script>
// Capturar parámetros de Omada desde URL
const params = new URLSearchParams(window.location.search);
document.querySelector('input[name="clientMac"]').value = params.get('clientMac') || '';
document.querySelector('input[name="apMac"]').value = params.get('apMac') || '';
document.querySelector('input[name="ssidName"]').value = params.get('ssidName') || '';
document.querySelector('input[name="radioId"]').value = params.get('radioId') || '';

async function submitRegistroForm(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const data = Object.fromEntries(formData);
  
  const response = await fetch('/api/registro', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('✅ Registro exitoso');
    if (result.wifi?.wifiAuthenticated) {
      console.log('🔌 WiFi autenticado');
      // Redirigir a landing page
      window.location.href = 'https://www.google.com';
    }
  }
}
</script>
```

## Troubleshooting

### "Connection refused" a Omada Cloud

**Problema**: No puedes conectar a `use1-omada-cloud.tplinkcloud.com:443`

**Soluciones**:
1. Verifica que tu VPS tenga acceso a internet
2. Confirma que el firewall no bloquee puerto 443
3. Prueba desde terminal: `curl -k https://use1-omada-cloud.tplinkcloud.com`

### "Login failed" o credenciales incorrectas

**Problema**: El operador no existe o contraseña es incorrecta

**Soluciones**:
1. Verifica credenciales en Omada Cloud
2. Asegúrate que sea un **Operador Hotspot**, no admin
3. Prueba credenciales manualmente:
```bash
curl -k https://use1-omada-cloud.tplinkcloud.com:443/api/v2/hotspot/login \
  -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "name=operator1&password=password"
```

### Usuario registra pero WiFi no se autentica

**Problema**: El usuario se registra pero no obtiene acceso a WiFi

**Soluciones**:
1. Verifica que los MAC addresses sean correctos
2. Confirma que el SSID esté configurado correctamente
3. Revisa que el portal esté activado en el SSID
4. Mira los logs del servidor:
```bash
docker-compose logs app | grep WiFi
```

### Portal URL incorrecta

**Problema**: No eres redirigido al portal después de conectar

**Soluciones**:
1. Verifica que la URL del portal sea accesible desde tu WiFi
2. Usa HTTPS (no HTTP) si lo requiere
3. Asegúrate que el dominio se resuelva correctamente

## Monitoreo en producción

### Ver autenticaciones exitosas

En los logs de Firebase:
```
// Colección: registros
// Cada documento tiene un objeto: wifiAuth { success: true/false }
```

### Ver errores de WiFi

```bash
# En el servidor
docker-compose logs app | grep "WiFi\|Omada\|ERROR"
```

## URLs útiles

- **Tu Omada Cloud**: https://use1-omada-cloud.tplinkcloud.com
- **TP-Link FAQ 3231**: https://www.tp-link.com/us/support/faq/3231/
- **Documentación Omada Cloud**: https://www.tp-link.com/us/business/support/download/omada-cloud/

## Contacto para soporte

Si necesitas ayuda:
1. Contacta a TP-Link Support con tu Controller ID
2. Revisa los logs de Omada Cloud
3. Verifica que tu VPS sea accesible desde la nube
