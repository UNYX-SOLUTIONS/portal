/**
 * EJEMPLO: Cómo modificar el formulario HTML/JavaScript
 * para enviar datos de WiFi junto con el registro
 *
 * Este es un fragmento que muestra cómo recolectar e enviar datos de WiFi
 */

// ============ PARTE 1: Obtener datos de WiFi del navegador ============
// Agregar este código en tu script del formulario

async function getWiFiInfo() {
  try {
    // Intentar obtener información de la red WiFi
    // Nota: Esto solo funciona en sitios HTTPS y con permisos del usuario

    const wifiInfo = {
      clientMac: null,
      apMac: null,
      ssidName: null,
      radioId: null,
    };

    // Si el navegador soporta la API (solo disponible en algunas redes)
    if (
      navigator.getNetworkInformation &&
      navigator.getNetworkInformation.type === "wifi"
    ) {
      wifiInfo.type = "wifi";
    }

    // En un hotspot Omada, estos valores usualmente vienen de:
    // - URL parameters: ?clientMac=...&apMac=...
    // - Variables de sesión del servidor
    // - Headers HTTP específicos

    // Alternativa: Si vienen en la URL (desde el portal Omada)
    const params = new URLSearchParams(window.location.search);
    wifiInfo.clientMac = params.get("clientMac");
    wifiInfo.apMac = params.get("apMac");
    wifiInfo.ssidName = params.get("ssidName");
    wifiInfo.radioId = params.get("radioId");

    return wifiInfo;
  } catch (error) {
    console.warn("No se pudo obtener información de WiFi:", error);
    return null;
  }
}

// ============ PARTE 2: Modificar el envío del formulario ============
// Reemplazar la función que envía el formulario con esta:

async function submitRegistroForm(event) {
  event.preventDefault();

  // Validar campos del formulario
  const firstName = document.getElementById("firstName")?.value || "";
  const lastName = document.getElementById("lastName")?.value || "";
  const email = document.getElementById("email")?.value || "";
  const promotional = document.getElementById("promotional")?.checked || false;
  const acceptTerms = document.getElementById("acceptTerms")?.checked || false;

  if (!firstName || !lastName || !email) {
    alert("Por favor completa todos los campos");
    return;
  }

  if (!acceptTerms) {
    alert("Debes aceptar los términos y condiciones");
    return;
  }

  // Obtener información de WiFi (si está disponible)
  const wifiInfo = await getWiFiInfo();

  // Preparar datos a enviar
  const formData = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email.trim(),
    promotional: promotional,
    acceptTerms: acceptTerms,
    // Agregar datos de WiFi si están disponibles
    ...(wifiInfo && {
      clientMac: wifiInfo.clientMac,
      apMac: wifiInfo.apMac,
      ssidName: wifiInfo.ssidName,
      radioId: wifiInfo.radioId,
    }),
  };

  console.log("📤 Enviando datos:", formData);

  try {
    const response = await fetch("/api/registro", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log("✅ Registro exitoso:", result);

      // Mostrar mensaje de éxito
      showSuccessMessage(result);

      // Si WiFi se autenticó, mostrar mensaje adicional
      if (result.wifi && result.wifi.wifiAuthenticated) {
        console.log("🔌 WiFi autenticado exitosamente");
        showWiFiSuccess();
      } else if (result.wifi && !result.wifi.wifiAuthenticated) {
        console.warn("⚠️  WiFi no autenticado pero registro guardado");
        showPartialSuccess(result.wifi.message);
      }

      // Limpiar formulario
      document.getElementById("registroForm")?.reset();

      // Redirigir después de 2 segundos (opcional)
      setTimeout(() => {
        window.location.href = "https://www.google.com";
      }, 2000);
    } else {
      console.error("❌ Error en el registro:", result);
      alert("Error: " + (result.error || "Error desconocido"));
    }
  } catch (error) {
    console.error("❌ Error enviando formulario:", error);
    alert("Error de conexión: " + error.message);
  }
}

// ============ PARTE 3: Funciones auxiliares de UI ============

function showSuccessMessage(result) {
  const message = document.createElement("div");
  message.className = "alert alert-success";
  message.innerHTML = `
    <strong>✅ Registro exitoso!</strong><br>
    Bienvenido ${result.data.firstName} ${result.data.lastName}
  `;
  document.body.appendChild(message);
}

function showWiFiSuccess() {
  const message = document.createElement("div");
  message.className = "alert alert-info";
  message.innerHTML =
    "🔌 <strong>WiFi autenticado:</strong> Ya tienes acceso a la red";
  document.body.appendChild(message);
}

function showPartialSuccess(wifiMessage) {
  const message = document.createElement("div");
  message.className = "alert alert-warning";
  message.innerHTML = `⚠️ <strong>Registro guardado</strong> pero WiFi no disponible: ${wifiMessage}`;
  document.body.appendChild(message);
}

// ============ PARTE 4: Agregar al HTML ============

/*
En tu index.html, agregar esto al formulario:

<form id="registroForm" onsubmit="submitRegistroForm(event)">
  
  <div class="form-group">
    <label for="firstName">Nombre:</label>
    <input type="text" id="firstName" name="firstName" required>
  </div>
  
  <div class="form-group">
    <label for="lastName">Apellido:</label>
    <input type="text" id="lastName" name="lastName" required>
  </div>
  
  <div class="form-group">
    <label for="email">Email:</label>
    <input type="email" id="email" name="email" required>
  </div>
  
  <div class="form-group">
    <label>
      <input type="checkbox" id="promotional" name="promotional">
      Recibir información promocional
    </label>
  </div>
  
  <div class="form-group">
    <label>
      <input type="checkbox" id="acceptTerms" name="acceptTerms" required>
      Acepto los términos y condiciones
    </label>
  </div>
  
  <button type="submit" class="btn btn-primary">Registrarse</button>
  
</form>

<script src="form-handler.js"></script>
*/

// ============ PARTE 5: Testing en desarrollo ============

/*
Para probar sin WiFi real, agrega parámetros a la URL:

http://localhost:3000?clientMac=00:11:22:33:44:55&apMac=AA:BB:CC:DD:EE:FF&ssidName=LuxWiFi&radioId=radio1

O llama esto en la consola del navegador:

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
*/
