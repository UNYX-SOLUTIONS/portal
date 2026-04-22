# 🔥 Configuración de Firebase

## 1️⃣ Crear/Obtener Proyecto Firebase

### Si ya tienes un proyecto:
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Salta al paso 2

### Si no tienes un proyecto:
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Crear proyecto"
3. Nombre: `lux-viajes-portal` (o el que prefieras)
4. Desactiva Google Analytics (opcional)
5. Crea el proyecto

## 2️⃣ Habilitar Firestore

1. En Firebase Console, ve a tu proyecto
2. En el menú izquierdo: **Firestore Database**
3. Haz clic en **Create Database**
4. **Ubicación**: Selecciona la región más cercana a tu oficina
5. **Modo de inicio**: Elige **Modo de prueba** (para desarrollo)
   - ⚠️ En producción cambia a **Modo seguro**
6. Crea la base de datos

## 3️⃣ Descargar Credenciales (serviceAccountKey.json)

1. En Firebase Console, ve a **Configuración del proyecto** (engranaje)
2. Ve a la pestaña **Cuentas de servicio**
3. Selecciona **Node.js** como lenguaje
4. Haz clic en **Generar nueva clave privada**
5. Se descargará `serviceAccountKey.json`

## 4️⃣ Copiar Credenciales

1. Mueve el archivo `serviceAccountKey.json` a tu carpeta del proyecto:
   ```
   c:\Users\yosto\Documents\Trabajos\Lux Viajes\web\portal\serviceAccountKey.json
   ```

2. ⚠️ **IMPORTANTE**: Nunca pushes este archivo a Git
   - Ya está en `.gitignore`
   - Es tu clave privada de Firebase

## 5️⃣ Obtener Database URL

1. En Firebase Console, ve a **Configuración del proyecto**
2. En la pestaña **General**, mira **Cloud Firestore**
3. Busca la línea que dice `Reference URL` o similar
4. Copia la URL (sin `/firestore`)

Formato típico: `https://tu-proyecto.firebaseio.com`

## 6️⃣ Actualizar .env

Edita tu archivo `.env`:

```env
PORT=3000
FIREBASE_DATABASE_URL=https://tu-proyecto.firebaseio.com
FIREBASE_CREDENTIALS_FILE=serviceAccountKey.json
NODE_ENV=development
```

Reemplaza `tu-proyecto` con el ID real de tu proyecto.

## 7️⃣ Instalar dependencias

```bash
npm install
```

## 8️⃣ Probar la conexión

```bash
npm run dev
```

Deberías ver:
```
✅ Firebase inicializado correctamente
```

Para verificar que funciona:
```bash
curl -X POST http://localhost:3000/api/test-firebase
```

Deberías obtener:
```json
{
  "success": true,
  "message": "Conexión a Firebase exitosa",
  "testDocId": "..."
}
```

## ✅ ¡Listo!

Ahora cuando alguien complete el formulario, los datos se guardarán automáticamente en tu Firestore.

## 📊 Ver los datos en Firebase

1. Ve a Firebase Console
2. **Firestore Database**
3. Selecciona la colección `registros`
4. Verás todos los registros guardados

## 🔒 Seguridad en Producción

Cuando deploys a producción, **cambia el modo de Firestore a "Seguro"**:

En Firebase Console:
1. Firestore Database
2. Pestaña **Reglas**
3. Cambia el modo a **Modo seguro**
4. Las reglas por defecto solo permiten escrituras autenticadas

Si necesitas que cualquiera pueda escribir registros, usa estas reglas:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir escribir en "registros" desde cualquier lugar
    match /registros/{document=**} {
      allow create: if true;
      allow read, write: if false;
    }
  }
}
```

## 📚 Documentación

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

---

¿Necesitas ayuda? Contacta al equipo de Lux Viajes.
