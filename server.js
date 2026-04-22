require("dotenv").config();
const express = require("express");
const path = require("path");
const admin = require("firebase-admin");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Inicializar Firebase
let db = null;

try {
  // Verificar que exista el archivo de credenciales
  const serviceAccountPath = path.join(
    __dirname,
    process.env.FIREBASE_CREDENTIALS_FILE || "serviceAccountKey.json",
  );

  // Validar que el archivo exista
  const fs = require("fs");
  if (!fs.existsSync(serviceAccountPath)) {
    console.warn(
      "⚠️  ADVERTENCIA: Archivo de credenciales Firebase no encontrado",
    );
    console.warn(`📁 Se espera el archivo en: ${serviceAccountPath}`);
  } else {
    const serviceAccount = require(serviceAccountPath);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    db = admin.firestore();
    console.log("✅ Firebase inicializado correctamente");
  }
} catch (error) {
  console.error("❌ Error al inicializar Firebase:", error.message);
  console.error(
    "ℹ️  El servidor continuará pero no podrá guardar datos en Firebase",
  );
}

// Ruta para servir el HTML principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// API Route para procesar el registro
app.post("/api/registro", async (req, res) => {
  try {
    // Extraer datos del formulario
    const { firstName, lastName, email, promotional, acceptTerms } = req.body;

    // Validación de campos requeridos
    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ error: "El nombre es requerido" });
    }

    if (!lastName || !lastName.trim()) {
      return res.status(400).json({ error: "El apellido es requerido" });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ error: "El correo es requerido" });
    }

    // Validación de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: "El correo no es válido" });
    }

    if (!acceptTerms) {
      return res
        .status(400)
        .json({ error: "Debes aceptar los términos y condiciones" });
    }

    // Verificar que Firebase esté inicializado
    if (!db) {
      return res
        .status(503)
        .json({ error: "Servicio de base de datos no disponible" });
    }

    // Preparar datos para guardar en Firebase
    const registroData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      promotional: promotional || false,
      acceptTerms: acceptTerms || true,
      timestamp: admin.firestore.Timestamp.now(),
      ip: req.ip,
    };

    // Guardar en Firebase Firestore
    const docRef = await db.collection("registros").add(registroData);

    console.log("✅ Registro guardado en Firebase:", {
      docId: docRef.id,
      email: registroData.email,
      timestamp: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: "Registro guardado correctamente",
      registerId: docRef.id,
      data: {
        firstName: registroData.firstName,
        lastName: registroData.lastName,
        email: registroData.email,
        promotional: registroData.promotional,
      },
    });
  } catch (error) {
    console.error("Error en /api/registro:", error);

    // Errores específicos de Firebase
    if (error.code === "permission-denied") {
      return res
        .status(403)
        .json({ error: "Permiso denegado en la base de datos" });
    }

    if (error.code === "service-unavailable") {
      return res
        .status(503)
        .json({ error: "Servicio de base de datos no disponible" });
    }

    return res.status(500).json({
      error: "Error al guardar el registro",
      message:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Ruta para health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    firebaseConnected: !!db,
    environment: process.env.NODE_ENV || "development",
  });
});

// Ruta para test de Firebase (solo en desarrollo)
app.post("/api/test-firebase", async (req, res) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "No disponible en producción" });
  }

  try {
    if (!db) {
      return res.status(503).json({ error: "Firebase no inicializado" });
    }

    // Guardar un documento de prueba
    const testDoc = await db.collection("test").add({
      message: "Test de conexión",
      timestamp: admin.firestore.Timestamp.now(),
    });

    return res.status(200).json({
      success: true,
      message: "Conexión a Firebase exitosa",
      testDocId: testDoc.id,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Error de conexión a Firebase",
      message: error.message,
    });
  }
});

// Manejo de errores 404
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor Lux Viajes corriendo en http://localhost:${PORT}`);
  console.log(`📝 Portal de registro: http://localhost:${PORT}`);
  console.log(`🔗 API de registro: POST http://localhost:${PORT}/api/registro`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);

  if (!db) {
    console.log("\n⚠️  IMPORTANTE: Firebase no está conectado");
    console.log("   1. Descarga serviceAccountKey.json desde Firebase Console");
    console.log("   2. Guárdalo en la carpeta actual");
    console.log("   3. Configura FIREBASE_DATABASE_URL en .env\n");
  } else {
    console.log("\n✅ Firebase conectado y listo para guardar datos\n");
  }
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  process.exit(0);
});
