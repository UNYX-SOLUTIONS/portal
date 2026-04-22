# 🚀 Guía Rápida de Inicio

## 1️⃣ Instalación (primera vez)

```bash
npm install
```

## 2️⃣ Configuración Firebase

### Crear `.env` desde template
En Windows PowerShell:
```powershell
Copy-Item .env.example .env
```

### Descargar credenciales Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Engranaje (⚙️) → Configuración del proyecto
4. Pestaña "Cuentas de servicio"
5. Haz clic en "Generar nueva clave privada"
6. Guarda el archivo como `serviceAccountKey.json` en tu carpeta

### Editar `.env`

Abre `.env` y completa:

```env
PORT=3000
FIREBASE_DATABASE_URL=https://tu-proyecto.firebaseio.com
FIREBASE_CREDENTIALS_FILE=serviceAccountKey.json
NODE_ENV=development
```

Para obtener `FIREBASE_DATABASE_URL`:
- Ve a Firebase Console
- Firestore Database
- Copia la "Reference URL"

## 3️⃣ Ejecutar

### Desarrollo (auto-reload con nodemon)
```bash
npm run dev
```

### Producción
```bash
npm start
```

## 4️⃣ Probar

Abre en tu navegador:
```
http://localhost:3000
```

## ✅ Verificaciones

### ¿Funciona el servidor?
```
curl http://localhost:3000/api/health
```

Deberías ver:
```json
{"status":"OK","timestamp":"...","firebaseConnected":true}
```

### ¿Se conecta a Firebase?
```
curl -X POST http://localhost:3000/api/test-firebase
```

Deberías ver:
```json
{"success":true,"message":"Conexión a Firebase exitosa","testDocId":"..."}
```

### ¿Envía correctamente?
Abre el formulario en `http://localhost:3000` y prueba rellenarlo.

Deberías ver en la consola del servidor:
```
✅ Registro guardado en Firebase: { docId: '...', email: '...', timestamp: '...' }
```

## 🔧 Estructura de archivos

```
portal/
├── index.html           (Formulario - Frontend)
├── logo.png            (Logo de Lux Viajes)
├── server.js           (Backend Express)
├── package.json        (Dependencias)
├── .env                (Variables privadas - NO COMMITEAR)
├── .env.example        (Plantilla de .env)
├── .gitignore          (Archivos a ignorar en Git)
├── serviceAccountKey.json (Credenciales Firebase - NO COMMITEAR)
├── README.md           (Documentación completa)
└── FIREBASE_SETUP.md   (Setup detallado de Firebase)
```

## 🆘 Problemas comunes

### Error: "Cannot find module 'firebase-admin'"
```bash
npm install
```

### Error: "Archivo de credenciales Firebase no encontrado"
- Verifica que `serviceAccountKey.json` esté en la carpeta
- Descargarlo nuevamente desde Firebase Console

### Error: "Firebase no inicializado"
- Verifica que `.env` tenga `FIREBASE_DATABASE_URL`
- Verifica que sea la URL completa sin barra final
- Reinicia el servidor

### Error: "permission-denied"
- Firestore está en modo "Seguro"
- En desarrollo cambia a "Modo de prueba" en Firebase Console

## 📡 Flujo de datos

```
Cliente (navegador)
  ↓ POST /api/registro
Backend (server.js)
  ↓ Valida datos
  ↓ Agrega timestamp, IP, etc
  ↓ Guarda en Firestore
Firebase Firestore (almacenamiento)
  ↓ Los datos están disponibles en Firebase Console
```

## 🌐 Deploy

### Heroku
```bash
heroku create tu-app-name
heroku config:set FIREBASE_DATABASE_URL=https://...
git push heroku main
```

### Railway
1. Conecta tu repo
2. Agrega variable `FIREBASE_DATABASE_URL` en Settings
3. Deploy automático

## 📚 Más información

Ver `README.md` y `FIREBASE_SETUP.md` para documentación completa.

---

¡Listo! Ahora tienes un portal seguro conectado a Firebase 🔥

