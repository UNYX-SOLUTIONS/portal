/**
 * Módulo de autenticación Omada Hotspot
 * Integra la autenticación WiFi del controlador Omada con el servidor Express
 */

const https = require("https");

class OmadaAuthenticator {
  constructor(config = {}) {
    this.controllerIP =
      config.controllerIP || process.env.OMADA_CONTROLLER_IP || "24.144.83.81";
    this.controllerPort =
      config.controllerPort || process.env.OMADA_CONTROLLER_PORT || "8043";
    this.controllerID =
      config.controllerID ||
      process.env.OMADA_CONTROLLER_ID ||
      "a4d3107367bfe1c7133895cd766b1333";
    this.username =
      config.username || process.env.OMADA_USERNAME || "operator1";
    this.password =
      config.password || process.env.OMADA_PASSWORD || "operator1";
    this.authDuration = config.authDuration || 3600000; // 1 hora en ms
  }

  /**
   * Realiza una petición HTTPS al controlador Omada
   * @param {string} path - Path del endpoint
   * @param {object} postData - Datos a enviar
   * @param {string} csrfToken - Token CSRF (opcional)
   * @returns {Promise<object>}
   */
  _makeRequest(path, postData, csrfToken = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.controllerIP,
        port: this.controllerPort,
        path: path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        rejectUnauthorized: false, // Para HTTPS con certificado auto-firmado
      };

      if (csrfToken) {
        options.headers["Csrf-Token"] = csrfToken;
      }

      const req = https.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(json);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            }
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${data}`));
          }
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.write(JSON.stringify(postData));
      req.end();
    });
  }

  /**
   * Obtiene el token CSRF del controlador Omada
   * @returns {Promise<string>} - Token CSRF
   */
  async _getCSRFToken() {
    try {
      const loginPath = `/${this.controllerID}/api/v2/hotspot/login`;
      const postData = {
        name: this.username,
        password: this.password,
      };

      const response = await this._makeRequest(loginPath, postData);

      if (!response.result || !response.result.token) {
        throw new Error("No CSRF token in response");
      }

      return response.result.token;
    } catch (error) {
      console.error("❌ Error obteniendo token CSRF:", error.message);
      throw new Error(
        `Failed to authenticate with Omada controller: ${error.message}`,
      );
    }
  }

  /**
   * Autentica un cliente en la red WiFi
   * @param {string} clientMac - MAC del cliente
   * @param {string} apMac - MAC del AP
   * @param {string} ssidName - Nombre del SSID
   * @param {string} radioId - ID del radio
   * @returns {Promise<object>} - Resultado de autenticación
   */
  async authorizeClient(clientMac, apMac, ssidName, radioId) {
    try {
      // Obtener token CSRF
      const csrfToken = await this._getCSRFToken();

      // Preparar datos de autorización
      const authPath = `/${this.controllerID}/api/v2/hotspot/extPortal/auth`;
      const postData = {
        clientMac: clientMac,
        apMac: apMac,
        ssidName: ssidName,
        radioId: radioId,
        authType: 4,
        time: this.authDuration,
      };

      // Hacer petición de autorización
      const response = await this._makeRequest(authPath, postData, csrfToken);

      // Verificar código de error
      if (response.errorCode !== "0") {
        throw new Error(
          `Authorization failed with error code: ${response.errorCode}`,
        );
      }

      console.log(`✅ Cliente ${clientMac} autorizado en red WiFi`);
      return {
        success: true,
        message: "Client authorized on network",
        clientMac: clientMac,
        duration: this.authDuration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Error autorizando cliente:", error.message);
      throw error;
    }
  }

  /**
   * Autentica un usuario completo (con manejo de errores mejorado)
   * @param {object} userData - Datos del usuario
   * @returns {Promise<object>}
   */
  async authenticateUser(userData) {
    const {
      clientMac = null,
      apMac = null,
      ssidName = null,
      radioId = null,
    } = userData;

    // Si no hay datos de WiFi, solo retornar éxito
    if (!clientMac || !apMac || !ssidName || !radioId) {
      console.warn(
        "⚠️  Datos de WiFi incompletos, saltando autenticación Omada",
      );
      return {
        success: true,
        message: "User registered (WiFi auth skipped - incomplete data)",
        wifiAuthenticated: false,
      };
    }

    try {
      const result = await this.authorizeClient(
        clientMac,
        apMac,
        ssidName,
        radioId,
      );
      return {
        ...result,
        wifiAuthenticated: true,
      };
    } catch (error) {
      // Log del error pero no fallar el registro
      console.error("⚠️  WiFi authentication failed:", error.message);
      return {
        success: true,
        message:
          "User registered (WiFi auth failed but user registered anyway)",
        wifiAuthenticated: false,
        wifiError: error.message,
      };
    }
  }
}

module.exports = OmadaAuthenticator;
