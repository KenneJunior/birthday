/**
 * Authentication Configuration
 * Defines constants for authentication behavior and storage
 */
import { createLogger } from "./js/utility/logger.js";

class AuthManager {
  // Configuration
  static AuthConfig = Object.freeze({
    PASSWORD_KEY: "{KEY}",
    CORRECT_PASSWORD: "{PASSWORD}",
    LOGIN_URL: "/login",
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    SESSION_TIMEOUT: 30 * 60 * 1000,
    ACTIVITY_EVENTS: ["mousedown", "keydown", "scroll", "touchstart"],
    SESSION_CHECK_INTERVAL: 60000,
  });

  constructor() {
    this.authCheckInitialized = false;
    this.auth0Available = false;
    this.activityListeners = [];
    this.sessionCheckInterval = null;

    this.config = { ...AuthManager.AuthConfig };

    this.logger = createLogger({ enablePerformance: true });
    this.authLogger = this.logger.withContext({ module: "Authentication" });
  }

  /**
   * Enhanced authentication system initialization
   * @returns {Promise<boolean>} True if initialization succeeded
   */
  async initAuthCheck() {
    if (this.authCheckInitialized) {
      this.authLogger.debug("Auth check already initialized");
      return true;
    }

    try {
      this.authLogger.time("Auth initialization");

      this.auth0Available = typeof auth0 !== "undefined" && auth0 !== null;

      if (this.auth0Available) {
        this.authLogger.info("Auth0 authentication available");
      } else {
        this.authLogger.info("Using password-based authentication");
      }

      await this._checkSessionTimeout();
      this.authCheckInitialized = true;

      this.authLogger.timeEnd("Auth initialization");
      return true;
    } catch (error) {
      this.authLogger.error("Failed to initialize auth check", error);
      return false;
    }
  }

  /**
   * Fetches Auth0 configuration from server with retry logic
   * @returns {Promise<Object>} Configuration object
   */
  async _fetchAuthConfig(retryCount = 0) {
    try {
      this.authLogger.time("Fetch auth config");

      const response = await fetch("/auth_config.json", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const config = await response.json();
      this.authLogger.timeEnd("Fetch auth config");
      return config;
    } catch (error) {
      if (retryCount < 2) {
        this.authLogger.warn(
          `Retrying auth config fetch (${retryCount + 1}/2)`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (retryCount + 1))
        );
        return this._fetchAuthConfig(retryCount + 1);
      }

      this.authLogger.error("Failed to fetch auth configuration", error);
      throw new Error(`Auth config unavailable: ${error.message}`);
    }
  }

  /**
   * Comprehensive authentication check with fallback strategies
   * @returns {Promise<Object>} Authentication result object
   */
  async checkAuthentication() {
    try {
      this.authLogger.time("Authentication check");
      await this.setupPasswordManager();

      const authResults = await Promise.allSettled([
        this._checkAuth0Authentication(),
        this._checkPasswordAuthentication(),
      ]);

      const [auth0Result, passwordResult] = authResults;

      if (
        auth0Result.status === "fulfilled" &&
        auth0Result.value.authenticated
      ) {
        this._updateLastActivity();
        this.authLogger.debug("Auth0 authentication successful");
        return auth0Result.value;
      }

      if (
        passwordResult.status === "fulfilled" &&
        passwordResult.value.authenticated
      ) {
        this._updateLastActivity();
        this.authLogger.debug("Password authentication successful");
        return passwordResult.value;
      }

      this.authLogger.debug("No valid authentication method found");
      return { authenticated: false, method: "none" };
    } catch (error) {
      this.authLogger.error("Authentication check failed", error);
      return {
        authenticated: false,
        method: "error",
        error: error.message,
      };
    } finally {
      this.authLogger.timeEnd("Authentication check");
    }
  }

  /**
   * Auth0-specific authentication check
   * @returns {Promise<Object>} Auth0 authentication result
   */
  async _checkAuth0Authentication() {
    if (!this.auth0Available) {
      return { authenticated: false, method: "auth0", reason: "unavailable" };
    }

    try {
      const isAuthenticated = await auth0.isAuthenticated();
      return {
        authenticated: isAuthenticated,
        method: "auth0",
        timestamp: Date.now(),
      };
    } catch (error) {
      this.authLogger.warn("Auth0 check failed", error);
      return {
        authenticated: false,
        method: "auth0",
        error: error.message,
      };
    }
  }

  /**
   * Password-based authentication check
   * @returns {Promise<Object>} Password authentication result
   */
  async _checkPasswordAuthentication() {
    try {
      const storedPassword = localStorage.getItem(this.config.PASSWORD_KEY);
      const isPasswordValid = storedPassword === this.config.CORRECT_PASSWORD;

      return {
        authenticated: isPasswordValid,
        method: "password",
        timestamp: Date.now(),
      };
    } catch (error) {
      this.authLogger.warn("Password check failed", error);
      return {
        authenticated: false,
        method: "password",
        error: error.message,
      };
    }
  }

  /**
   * Dynamic password manager configuration
   */
  async setupPasswordManager() {
    try {
      this.authLogger.time("Password manager setup");

      const config = await this._fetchAuthConfig();

      if (!config.PasswordManager) {
        throw new Error("Invalid auth configuration structure");
      }

      this.config.CORRECT_PASSWORD = config.PasswordManager.PASSWORD;
      this.config.PASSWORD_KEY = config.PasswordManager.STORAGE_KEY;
      Object.freeze(this.config);

      this.authLogger.debug("Password manager configured successfully");
      this.authLogger.timeEnd("Password manager setup");
    } catch (error) {
      this.authLogger.error("Failed to setup password manager", error);
      throw error;
    }
  }

  /**
   * Enhanced authentication requirement with exponential backoff
   * @param {Object} [options={}] - Configuration options
   * @returns {Promise<Object>} Authentication result
   */
  async requireAuth(options = {}) {
    const {
      retryCount = 0,
      silent = false,
      maxRetries = AuthManager.AuthConfig.RETRY_ATTEMPTS,
    } = options;

    try {
      this.authLogger.time(`requireAuth attempt ${retryCount + 1}`);
      const authResult = await this.checkAuthentication();

      if (authResult.authenticated) {
        if (!silent) {
          this.authLogger.info(`User authenticated via ${authResult.method}`);
        }
        this.authLogger.timeEnd(`requireAuth attempt ${retryCount + 1}`);
        return authResult;
      }

      if (retryCount < maxRetries) {
        const delay =
          AuthManager.AuthConfig.RETRY_DELAY * Math.pow(2, retryCount);

        if (!silent) {
          this.authLogger.warn(
            `Authentication failed, retrying in ${delay}ms`,
            {
              attempt: retryCount + 1,
              maxAttempts: maxRetries,
            }
          );
        }

        await new Promise((resolve) => setTimeout(resolve, delay));

        const result = await this.requireAuth({
          retryCount: retryCount + 1,
          silent,
          maxRetries,
        });

        this.authLogger.timeEnd(`requireAuth attempt ${retryCount + 1}`);
        return result;
      }

      if (!silent) {
        this.authLogger.warn("Authentication required, redirecting to login");
      }

      this._prepareLoginRedirect();
      this.authLogger.timeEnd(`requireAuth attempt ${retryCount + 1}`);

      return authResult;
    } catch (error) {
      this.authLogger.error("requireAuth failed", error);
      this._prepareLoginRedirect();

      return {
        authenticated: false,
        method: "error",
        error: error.message,
      };
    }
  }

  /**
   * Prepares and executes login redirect
   * @private
   */
  _prepareLoginRedirect() {
    const returnUrl = window.location.pathname + window.location.search;
    sessionStorage.setItem("returnUrl", returnUrl);
    this.authLogger.debug("Saved return URL for redirect", { returnUrl });

    window.location.href = AuthManager.AuthConfig.LOGIN_URL;
  }

  /**
   * Enhanced loading animation with progress tracking
   */
  showLoading() {
    try {
      this.InitialiseContent();
      this.authLogger.debug("Showing loading animation");

      this.saveCurrentLocation();

      const spinner = document.getElementById("loadingSpinner");
      if (!spinner) {
        throw new Error("Loading spinner element not found");
      }

      spinner.classList.add("is-visible");
      spinner.setAttribute("aria-hidden", "false");
      spinner.setAttribute("aria-live", "off");

      this._startProgressAnimation();
    } catch (error) {
      this.authLogger.error("Failed to show loading animation", error);
    }
  }

  /**
   * Starts the progress bar animation
   * @private
   */
  _startProgressAnimation() {
    const progressBar = document.querySelector(".loading-progress__bar");
    if (!progressBar) return;

    let progress = 0;
    const maxProgress = 85;

    const interval = setInterval(() => {
      const currentWidth = parseFloat(progressBar.style.width) || 0;

      if (currentWidth >= maxProgress) {
        clearInterval(interval);
        return;
      }

      progress += 2 + Math.random() * 3;
      progressBar.style.width = Math.min(progress, maxProgress) + "%";
    }, 300);
  }

  /**
   * Smooth loading animation hide with completion state
   */
  hideLoading(timeout = 800) {
    const loadingBar = document.querySelector(".loading-progress__bar");
    this.authLogger.debug("Hiding loading animation");

    if (loadingBar) {
      loadingBar.style.width = "100%";
    }

    const spinner = document.getElementById("loadingSpinner");
    if (!spinner) return;

    setTimeout(() => {
      if (loadingBar) {
        loadingBar.style.width = "0%";
      }

      spinner.classList.remove("is-visible");
      spinner.setAttribute("aria-hidden", "true");
      spinner.setAttribute("aria-live", "polite");

      this.InitialiseContent(false);
    }, timeout);
  }
  /**
   * Content visibility management during loading states
   */
  InitialiseContent(isLoading = true) {
    const contents = document.querySelectorAll(
      "button, input, #protectedContent, a, img"
    );
    contents.forEach((element) => {
      try {
        isLoading
          ? element.classList.add("d-none")
          : element.classList.remove("d-none");
      } catch (_) {
        // Silent fail for edge cases
      }
    });
  }

  /**
   * Saves current location for post-login redirect
   */
  saveCurrentLocation() {
    const returnUrl = window.location.href;
    sessionStorage.setItem("returnUrl", returnUrl);
    this.authLogger.debug("Saved current location", { returnUrl });
  }

  /**
   * Updates the loading text while preserving animations
   * @param {string} text - New loading text
   */
  updateLoadingText(text) {
    this.authLogger.debug("Updating loading text", { text });
    const textEl = document.querySelector(".loading-text");
    if (textEl) {
      const dotsHtml = textEl.querySelector(".loading-dots")?.outerHTML || "";
      textEl.innerHTML = text + dotsHtml;
    }
  }

  /**
   * Comprehensive logout from all authentication methods
   */
  async logout() {
    try {
      this.authLogger.time("Logout process");
      this.authLogger.info("Initiating logout");

      // Auth0 logout
      if (this.auth0Available && (await auth0.isAuthenticated())) {
        try {
          this.authLogger.debug("Performing Auth0 logout");
          auth0.logout({
            returnTo: window.location.origin,
          });
        } catch (auth0Error) {
          this.authLogger.warn("Auth0 logout failed", auth0Error);
        }
      }

      // Clear all authentication data
      this._clearAuthenticationData();
      this.authLogger.info("User logged out successfully");
      this.authLogger.timeEnd("Logout process");
    } catch (error) {
      this.authLogger.error("Logout failed", error);
    }
  }

  /**
   * Clears all authentication-related data
   * @private
   */
  _clearAuthenticationData() {
    localStorage.removeItem(AuthManager.AuthConfig.PASSWORD_KEY);
    localStorage.removeItem("lastActivityTime");
    sessionStorage.removeItem("returnUrl");
    this.authLogger.debug("Cleared all authentication data");
  }

  /**
   * Gets current authentication status
   * @returns {Promise<Object>} Authentication status
   */
  async getAuthStatus() {
    this.authLogger.debug("Getting authentication status");
    return await this.checkAuthentication();
  }

  /**
   * Checks for session timeout and handles expiration
   * @private
   */
  async _checkSessionTimeout() {
    const lastActivity = localStorage.getItem("lastActivityTime");
    if (!lastActivity) {
      this.authLogger.debug("No last activity time found");
      return;
    }

    const lastActivityTime = parseInt(lastActivity, 10);
    const currentTime = Date.now();
    const timeDiff = currentTime - lastActivityTime;

    this.authLogger.debug("Session timeout check", {
      lastActivity: new Date(lastActivityTime).toISOString(),
      timeDiff,
      timeout: AuthManager.AuthConfig.SESSION_TIMEOUT,
    });

    if (timeDiff > AuthManager.AuthConfig.SESSION_TIMEOUT) {
      this.authLogger.warn("Session timed out, initiating logout");
      await this.logout();
      window.location.href = AuthManager.AuthConfig.LOGIN_URL;
    }
  }

  /**
   * Updates the last activity timestamp
   * @private
   */
  _updateLastActivity() {
    const timestamp = Date.now().toString();
    localStorage.setItem("lastActivityTime", timestamp);
    this.authLogger.debug("Updated last activity time", {
      timestamp: new Date(parseInt(timestamp)).toISOString(),
    });
  }

  /**
   * Retrieves stored return URL or default
   * @param {string} [defaultUrl='/'] - Fallback URL
   * @returns {string} Return URL
   */
  getReturnUrl(defaultUrl = "/") {
    const returnUrl = sessionStorage.getItem("returnUrl") || defaultUrl;
    this.authLogger.debug("Retrieved return URL", { returnUrl });
    return returnUrl;
  }

  /**
   * Clear stored return URL
   */
  clearReturnUrl() {
    this.authLogger.debug("Clearing return URL");
    sessionStorage.removeItem("returnUrl");
  }

  /**
   * Redirect to stored return URL or default
   */
  redirectToReturnUrl(defaultUrl = "/") {
    const returnUrl = this.getReturnUrl(defaultUrl);
    this.authLogger.info("Redirecting to return URL", { returnUrl });
    this.clearReturnUrl();
    window.location.href = returnUrl;
  }

  /**
   * Set up activity tracking for session timeout
   */
  setupActivityTracking() {
    this.authLogger.debug("Setting up activity tracking");

    // Remove existing listeners to prevent duplicates
    this._cleanupActivityTracking();

    // Track user activity
    AuthManager.AuthConfig.ACTIVITY_EVENTS.forEach((event) => {
      const handler = () => this._updateLastActivity();
      document.addEventListener(event, handler, { passive: true });
      this.activityListeners.push({ event, handler });
    });

    this.authLogger.debug(
      `Registered ${this.activityListeners.length} activity events`
    );

    // Periodic session check
    this.sessionCheckInterval = setInterval(
      () => this._checkSessionTimeout(),
      AuthManager.AuthConfig.SESSION_CHECK_INTERVAL
    );
    this.authLogger.debug("Started periodic session timeout checks");
  }

  /**
   * Clean up activity tracking listeners
   * @private
   */
  _cleanupActivityTracking() {
    this.activityListeners.forEach(({ event, handler }) => {
      document.removeEventListener(event, handler);
    });
    this.activityListeners = [];

    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  /**
   * Sets up complete authentication protection
   * @returns {Promise<Object>} Authentication result
   */
  async setupAuthProtection() {
    try {
      this.authLogger.time("Auth protection setup");

      await this.initAuthCheck();
      this.setupActivityTracking();

      const authResult = await this.requireAuth({ silent: true });

      this.authLogger.info("Authentication protection setup completed", {
        authenticated: authResult.authenticated,
        method: authResult.method,
      });

      this.authLogger.timeEnd("Auth protection setup");
      return authResult;
    } catch (error) {
      this.authLogger.error("Authentication protection setup failed", error);
      throw error;
    }
  }

  /**
   * Clean up resources and listeners
   */
  destroy() {
    this._cleanupActivityTracking();
    this.authCheckInitialized = false;
    this.authLogger.debug("Auth manager destroyed");
  }

  /**
   * Static method to create and initialize AuthManager instance
   * @returns {Promise<AuthManager>} Initialized AuthManager instance
   */
  static async create() {
    const authManager = new AuthManager();
    await authManager.initAuthCheck();
    return authManager;
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = AuthManager;
}

// ES module exports for bundlers
export default AuthManager;

// Named exports for backward compatibility
export { AuthManager };

// Global instance for easy access (optional)
let globalAuthManager = null;

/**
 * Gets or creates global AuthManager instance
 * @returns {Promise<AuthManager>} Global AuthManager instance
 */
export async function getAuthManager() {
  if (!globalAuthManager) {
    globalAuthManager = await AuthManager.create();
  }
  return globalAuthManager;
}

/**
 * Destroys global AuthManager instance
 */
export function destroyAuthManager() {
  if (globalAuthManager) {
    globalAuthManager.destroy();
    globalAuthManager = null;
  }
}
