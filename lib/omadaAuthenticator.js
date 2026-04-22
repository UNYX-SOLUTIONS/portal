/**
 * Módulo de autenticación Omada Hotspot
 * Integra la autenticación WiFi del controlador Omada con el servidor Express
 *
 * Basado en documentación oficial TP-Link FAQ 2907 (Omada 4.1.5-4.4.6)
 * y FAQ 3231 (Omada 5.0.15+)
 */

const https = require("https");
const querystring = require("querystring");

class OmadaAuthenticator {
  constructor(config = {}) {
    this.controllerIP = config.controllerIP || process.env.OMADA_CONTROLLER_IP;
    this.controllerPort =
      config.controllerPort || process.env.OMADA_CONTROLLER_PORT;
    this.controllerID = config.controllerID || process.env.OMADA_CONTROLLER_ID;
    this.username = config.username || process.env.OMADA_USERNAME;
    this.password = config.password || process.env.OMADA_PASSWORD;
    // Duración en MILISEGUNDOS (convertiremos a microsegundos para Omada)
    this.authDuration = config.authDuration || 3600000; // 1 hora
    this.csrfToken = null;
    this.cookies = [];
  }

  /**
   * Realiza una petición HTTPS al controlador Omada
   * @param {string} path - Path del endpoint
   * @param {object} options - Opciones adicionales (method, headers, body, etc.)
   * @returns {Promise<object>}
   */
  _makeRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const defaultOptions = {
        hostname: this.controllerIP,
        port: this.controllerPort,
        path: path,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        rejectUnauthorized: false,
      };

      // Agregar cookies si existen
      if (this.cookies.length > 0) {
        defaultOptions.headers["Cookie"] = this.cookies.join("; ");
      }

      // Mezclar opciones
      const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
          ...defaultOptions.headers,
          ...(options.headers || {}),
        },
      };

      const req = https.request(finalOptions, (res) => {
        let data = "";

        // Guardar nuevas cookies
        if (res.headers["set-cookie"]) {
          res.headers["set-cookie"].forEach((cookie) => {
            const cookieParts = cookie.split(";")[0];
            if (cookieParts && !this.cookies.includes(cookieParts)) {
              this.cookies.push(cookieParts);
            }
          });
        }

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(json);
            } else {
              reject(new Error(`HTTP ${res.statusCode}: ${data || "No data"}`));
            }
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${data}`));
          }
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      // Enviar body si existe
      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  /**
   * Realiza login en el controlador Omada
   * Basado en: https://www.tp-link.com/us/support/faq/2907/ (Paso 10-11)
   * @returns {Promise<string>} - Token CSRF
   */
  async _login() {
    try {
      // Endpoint de login
      const loginPath = `/api/v2/hotspot/login`;

      // Parámetros de login en URL encoded (NO JSON)
      const body = querystring.stringify({
        name: this.username,
        password: this.password,
      });

      const response = await this._makeRequest(loginPath, {
        method: "POST",
        body: body,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      if (
        response.errorCode !== 0 ||
        !response.result ||
        !response.result.token
      ) {
        throw new Error(
          `Login failed: ${response.msg || "No CSRF token in response"}`,
        );
      }

      this.csrfToken = response.result.token;
      console.log("✅ Login exitoso en Omada Controller");
      return this.csrfToken;
    } catch (error) {
      console.error("❌ Error en login Omada:", error.message);
      throw new Error(`Failed to login to Omada controller: ${error.message}`);
    }
  }

  /**
   * Autoriza un cliente en la red WiFi
   * Basado en: https://www.tp-link.com/us/support/faq/2907/ (Paso 12-13)
   * @param {string} clientMac - MAC del cliente
   * @param {string} apMac - MAC del AP
   * @param {string} ssidName - Nombre del SSID
   * @param {string} radioId - ID del radio (0=2.4G, 1=5G)
   * @returns {Promise<object>}
   */
  async _authorize(clientMac, apMac, ssidName, radioId) {
    try {
      // Obtener token si no lo tenemos
      if (!this.csrfToken) {
        await this._login();
      }

      // Convertir duración de milisegundos a microsegundos (Omada lo requiere así)
      const timeInMicroseconds = this.authDuration * 1000;

      // Datos de autorización (URL encoded)
      const authData = {
        clientMac: clientMac,
        apMac: apMac,
        ssidName: ssidName,
        radioId: radioId,
        authType: 4,
        time: timeInMicroseconds,
      };

      const body = querystring.stringify(authData);

      // Endpoint de autorización con token como query parameter
      const authPath = `/api/v2/hotspot/extPortal/auth?token=${this.csrfToken}`;

      const response = await this._makeRequest(authPath, {
        method: "POST",
        body: body,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      // Verificar respuesta
      if (response.errorCode !== 0) {
        throw new Error(
          `Authorization failed: errorCode ${response.errorCode} - ${response.msg || ""}`,
        );
      }

      console.log(`✅ Cliente ${clientMac} autorizado en red WiFi`);
      return {
        success: true,
        message: "Client authorized on network",
        clientMac: clientMac,
        durationMs: this.authDuration,
        durationMicroseconds: timeInMicroseconds,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("❌ Error autorizando cliente:", error.message);
      throw error;
    }
  }

  /**
   * Autentica un usuario completo (con manejo de errores mejorado)
   * @param {object} userData - Datos del usuario con info de WiFi
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
      const result = await this._authorize(clientMac, apMac, ssidName, radioId);
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

  /**
   * Reinicia el módulo (borra token y cookies para nueva sesión)
   */
  reset() {
    this.csrfToken = null;
    this.cookies = [];
    console.log("🔄 OmadaAuthenticator reseteado");
  }
}

module.exports = OmadaAuthenticator;
