/**
 * EJEMPLO DE INTEGRACIÓN OMADA EN server.js
 *
 * Este archivo muestra cómo integrar el módulo de autenticación Omada
 * en tu servidor Express existente.
 *
 * Pasos para implementar:
 * 1. Agrega las variables de entorno a .env (ver OMADA_INTEGRATION.md)
 * 2. Reemplaza la sección de importación y middleware en tu server.js
 * 3. Reemplaza el endpoint /api/registro con esta versión mejorada
 * 4. Reinicia el servidor
 */

const OmadaAuthenticator = require("./lib/omadaAuthenticator");

// ============ PARTE 1: Inicializar Omada al arrancar el servidor ============
// Agregar esto después de las inicializaciones de Express y Firebase

// Inicializar autenticador Omada
const omada = new OmadaAuthenticator();
console.log("🔌 Módulo Omada Authenticator inicializado");

// ============ PARTE 2: Endpoint /api/registro mejorado ============
// Reemplaza el endpoint POST /api/registro existente con este:

app.post("/api/registro", async (req, res) => {
  try {
    // Extraer datos del formulario
    const {
      firstName,
      lastName,
      email,
      promotional,
      acceptTerms,
      // Datos de WiFi (opcionales)
      clientMac,
      apMac,
      ssidName,
      radioId,
    } = req.body;

    // ===== Validación de campos de usuario =====
    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ error: "El nombre es requerido" });
    }

    if (!lastName || !lastName.trim()) {
      return res.status(400).json({ error: "El apellido es requerido" });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ error: "El correo es requerido" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: "El correo no es válido" });
    }

    if (!acceptTerms) {
      return res.status(400).json({
        error: "Debes aceptar los términos y condiciones",
      });
    }

    // Verificar que Firebase esté inicializado
    if (!db) {
      return res.status(503).json({
        error: "Servicio de base de datos no disponible",
      });
    }

    // ===== Guardar en Firebase =====
    const registroData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      promotional: promotional || false,
      acceptTerms: acceptTerms || true,
      timestamp: admin.firestore.Timestamp.now(),
      ip: req.ip,
    };

    const docRef = await db.collection("registros").add(registroData);

    console.log("✅ Registro guardado en Firebase:", {
      docId: docRef.id,
      email: registroData.email,
    });

    // ===== Intentar autenticar en Omada =====
    let omadaResult = {
      success: true,
      wifiAuthenticated: false,
      message: "WiFi auth not attempted",
    };

    if (clientMac && apMac && ssidName && radioId) {
      console.log(`🔌 Intentando autenticar en Omada para ${email}...`);

      try {
        omadaResult = await omada.authenticateUser({
          clientMac,
          apMac,
          ssidName,
          radioId,
        });

        console.log("🔌 Resultado Omada:", omadaResult);

        // Guardar resultado de WiFi en Firebase
        await db
          .collection("registros")
          .doc(docRef.id)
          .update({
            wifiAuth: {
              success: omadaResult.wifiAuthenticated,
              message: omadaResult.message,
              timestamp: admin.firestore.Timestamp.now(),
            },
          });
      } catch (error) {
        console.error("⚠️  Error en autenticación Omada:", error.message);
        // No lanzar error, solo registrar
      }
    }

    // ===== Respuesta al cliente =====
    return res.status(200).json({
      success: true,
      message: "Registro guardado correctamente",
      registerId: docRef.id,
      wifi: omadaResult,
      data: {
        firstName: registroData.firstName,
        lastName: registroData.lastName,
        email: registroData.email,
        promotional: registroData.promotional,
      },
    });
  } catch (error) {
    console.error("Error en /api/registro:", error);

    if (error.code === "permission-denied") {
      return res.status(403).json({
        error: "Permiso denegado en la base de datos",
      });
    }

    if (error.code === "service-unavailable") {
      return res.status(503).json({
        error: "Servicio de base de datos no disponible",
      });
    }

    return res.status(500).json({
      error: "Error al guardar el registro",
      message:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// ============ PARTE 3: Endpoint para test de Omada =====
// Agregar esta ruta para debugging

app.post("/api/test-omada", async (req, res) => {
  try {
    const { clientMac, apMac, ssidName, radioId } = req.body;

    if (!clientMac || !apMac || !ssidName || !radioId) {
      return res.status(400).json({
        error: "Missing required WiFi parameters",
        required: ["clientMac", "apMac", "ssidName", "radioId"],
      });
    }

    const result = await omada.authenticateUser({
      clientMac,
      apMac,
      ssidName,
      radioId,
    });

    return res.status(200).json({
      success: true,
      omadaResult: result,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Omada authentication failed",
      message: error.message,
    });
  }
});

/**
 * FORMATO DE PETICIÓN ESPERADO:
 *
 * POST /api/registro
 * Content-Type: application/json
 *
 * {
 *   "firstName": "Juan",
 *   "lastName": "Pérez",
 *   "email": "juan@example.com",
 *   "promotional": false,
 *   "acceptTerms": true,
 *   "clientMac": "00:11:22:33:44:55",
 *   "apMac": "AA:BB:CC:DD:EE:FF",
 *   "ssidName": "LuxWiFi",
 *   "radioId": "radio1"
 * }
 *
 * RESPUESTA EXITOSA:
 *
 * {
 *   "success": true,
 *   "message": "Registro guardado correctamente",
 *   "registerId": "doc-id",
 *   "wifi": {
 *     "success": true,
 *     "wifiAuthenticated": true,
 *     "message": "Client authorized on network",
 *     "clientMac": "00:11:22:33:44:55",
 *     "timestamp": "2024-04-22T10:30:00.000Z"
 *   },
 *   "data": {
 *     "firstName": "Juan",
 *     "lastName": "Pérez",
 *     "email": "juan@example.com"
 *   }
 * }
 */
