/**
 * Authentication Configuration
 * Defines constants for authentication behavior and storage
 */
import { createLogger } from "./js/utility/logger";

// Configuration
const AuthConfig = {
  PASSWORD_KEY: "{KEY}",
  CORRECT_PASSWORD: "{PASSWORD}",
  LOGIN_URL: "/login",
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
};

// Global state
let authCheckInitialized = false;
let auth0Available = false;
const logger = createLogger({ enablePerformance: true });
// Create contextual logger for authentication module
const authLogger = logger.withContext({ module: "Authentication" });

/**
 * Initializes the authentication system
 * @returns {Promise<boolean>} True if initialization succeeded, false otherwise
 */
async function initAuthCheck() {
  if (authCheckInitialized) {
    authLogger.debug("Auth check already initialized");
    return true;
  }
  try {
    authLogger.time("Auth initialization");

    // Check if Auth0 is available
    auth0Available = typeof auth0 !== "undefined" && auth0 !== null;

    if (auth0Available) {
      authLogger.info("Auth0 authentication available");
    } else {
      authLogger.info("Using password-based authentication");
    }

    // Check session timeout
    _checkSessionTimeout();

    authCheckInitialized = true;
    authLogger.timeEnd("Auth initialization");
    return true;
  } catch (error) {
    authLogger.error("Failed to initialize auth check", error);
    return false;
  }
}

/**
 * Fetches Auth0 configuration from server
 * @returns {Promise<Object>} Configuration object
 */
const _fetchAuthConfig = async () => {
  try {
    authLogger.time("Fetch auth config");
    const response = await fetch("/auth_config.json");
    if (!response.ok) {
      throw new Error(`Failed to fetch auth config: ${response.status}`);
    }
    const config = await response.json();
    authLogger.timeEnd("Fetch auth config");
    return config;
  } catch (error) {
    authLogger.error("Failed to fetch auth configuration", error);
    throw error;
  }
};

/**
 * Checks if the user is authenticated using available methods
 * @returns {Promise<Object>} Authentication result object
 */
async function checkAuthentication() {
  try {
    authLogger.time("Authentication check");
    await setupPasswordManager();

    // Check Auth0 authentication first
    if (auth0Available) {
      try {
        const auth0Authenticated = await auth0.isAuthenticated();
        if (auth0Authenticated) {
          _updateLastActivity();
          authLogger.debug("Auth0 authentication successful");
          return { authenticated: true, method: "auth0" };
        }
        authLogger.debug("Auth0 authentication failed");
      } catch (auth0Error) {
        authLogger.warn(
          "Auth0 check failed, falling back to password",
          auth0Error
        );
      }
    }

    // Check local storage password (fallback)
    const storedPassword = localStorage.getItem(AuthConfig.PASSWORD_KEY);
    const isPasswordValid = storedPassword === AuthConfig.CORRECT_PASSWORD;

    if (isPasswordValid) {
      _updateLastActivity();
      authLogger.debug("Password authentication successful");
      return { authenticated: true, method: "password" };
    }

    authLogger.debug("No valid authentication method found");
    return { authenticated: false, method: "none" };
  } catch (error) {
    authLogger.error("Authentication check failed", error);
    return { authenticated: false, method: "error", error: error.message };
  } finally {
    authLogger.timeEnd("Authentication check");
  }
}

/**
 * Sets up password manager configuration
 */
async function setupPasswordManager() {
  try {
    authLogger.time("Password manager setup");
    const config = await _fetchAuthConfig();
    AuthConfig.CORRECT_PASSWORD = config.PasswordManager.PASSWORD;
    AuthConfig.PASSWORD_KEY = config.PasswordManager.STORAGE_KEY;
    authLogger.debug("Password manager configured");
    authLogger.timeEnd("Password manager setup");
  } catch (error) {
    authLogger.error("Failed to setup password manager", error);
    throw error;
  }
}

/**
 * Requires authentication, redirecting to login if necessary
 * @param {Object} [options={}] - Configuration options
 * @param {number} [options.retryCount=0] - Current retry attempt
 * @param {boolean} [options.silent=false] - Suppress console logs
 * @returns {Promise<Object>} Authentication result
 */
async function requireAuth(options = {}) {
  const { retryCount = 0, silent = false } = options;

  try {
    authLogger.time(`requireAuth attempt ${retryCount + 1}`);
    const authResult = await checkAuthentication();

    if (authResult.authenticated) {
      if (!silent) {
        authLogger.info(`User authenticated via ${authResult.method}`);
      }
      authLogger.timeEnd(`requireAuth attempt ${retryCount + 1}`);
      return authResult;
    }

    // Not authenticated - handle redirect
    if (retryCount < AuthConfig.RETRY_ATTEMPTS) {
      if (!silent) {
        authLogger.warn(
          `Authentication failed, retrying in ${AuthConfig.RETRY_DELAY}ms...`,
          { attempt: retryCount + 1, maxAttempts: AuthConfig.RETRY_ATTEMPTS }
        );
      }

      // Retry after delay
      await new Promise((resolve) =>
        setTimeout(resolve, AuthConfig.RETRY_DELAY)
      );
      const result = await requireAuth({ retryCount: retryCount + 1, silent });
      authLogger.timeEnd(`requireAuth attempt ${retryCount + 1}`);
      return result;
    }

    // Final failure - redirect to login
    if (!silent) {
      authLogger.warn("Authentication required, redirecting to login");
    }

    // Save current URL for post-login redirect
    const returnUrl = window.location.pathname + window.location.search;
    sessionStorage.setItem("returnUrl", returnUrl);
    authLogger.debug("Saved return URL", { returnUrl });

    // Redirect to login page
    window.location.href = AuthConfig.LOGIN_URL;

    authLogger.timeEnd(`requireAuth attempt ${retryCount + 1}`);
    return authResult;
  } catch (error) {
    authLogger.error("requireAuth failed", error);

    // Redirect to login on error
    window.location.href = AuthConfig.LOGIN_URL;

    return { authenticated: false, method: "error", error: error.message };
  }
}

/**
 * Show loading animation
 */
function showLoading() {
  authLogger.debug("Showing loading animation");
  saveCurrentLocation();
  const loader = document.getElementById("loading");
  if (loader) {
    loader.style.display = "flex";
    loader.classList.remove("fade-out");
  }
}

/**
 * Saves current location for post-login redirect
 */
function saveCurrentLocation() {
  const returnUrl = window.location.href;
  sessionStorage.setItem("returnUrl", returnUrl);
  authLogger.debug("Saved current location", { returnUrl });
}

/**
 * Updates the loading text while preserving animations
 * @param {string} text - New loading text
 */
function updateLoadingText(text) {
  authLogger.debug("Updating loading text", { text });
  const textEl = document.querySelector(".loading-text");
  if (textEl) {
    // Keep the dots animation
    const dotsHtml = textEl.querySelector(".loading-dots")?.outerHTML || "";
    textEl.innerHTML = text + dotsHtml;
  }
}

/**
 * Hide loading animation
 */
function hideLoading() {
  authLogger.debug("Hiding loading animation");
  const loader = document.getElementById("loading");
  if (loader) {
    loader.classList.add("fade-out");
    setTimeout(() => {
      loader.classList.add("d-none");
    }, 2500);
  }
}

/**
 * Logout user from all authentication methods
 */
async function logout() {
  try {
    authLogger.time("Logout process");
    authLogger.info("Initiating logout");

    // Auth0 logout
    if (auth0Available && (await auth0.isAuthenticated())) {
      try {
        authLogger.debug("Performing Auth0 logout");
        auth0.logout({
          returnTo: window.location.origin,
        });
      } catch (auth0Error) {
        authLogger.warn("Auth0 logout failed", auth0Error);
      }
    }

    // Clear password storage
    localStorage.removeItem(AuthConfig.PASSWORD_KEY);
    authLogger.debug("Cleared password storage");

    // Clear session tracking
    localStorage.removeItem("lastActivityTime");
    sessionStorage.removeItem("returnUrl");
    authLogger.debug("Cleared session tracking data");

    authLogger.info("User logged out successfully");
    authLogger.timeEnd("Logout process");
  } catch (error) {
    authLogger.error("Logout failed", error);
  }
}

/**
 * Gets current authentication status
 * @returns {Promise<Object>} Authentication status
 */
async function getAuthStatus() {
  authLogger.debug("Getting authentication status");
  return await checkAuthentication();
}

/**
 * Checks for session timeout and handles expiration
 * @private
 */
function _checkSessionTimeout() {
  const lastActivity = localStorage.getItem("lastActivityTime");
  if (!lastActivity) {
    authLogger.debug("No last activity time found");
    return;
  }

  const lastActivityTime = parseInt(lastActivity, 10);
  const currentTime = Date.now();
  const timeDiff = currentTime - lastActivityTime;

  authLogger.debug("Session timeout check", {
    lastActivity: new Date(lastActivityTime).toISOString(),
    timeDiff,
    timeout: AuthConfig.SESSION_TIMEOUT,
  });

  if (timeDiff > AuthConfig.SESSION_TIMEOUT) {
    authLogger.warn("Session timed out, initiating logout");
    logout();
    window.location.href = AuthConfig.LOGIN_URL;
  }
}

/**
 * Updates the last activity timestamp
 * @private
 */
function _updateLastActivity() {
  const timestamp = Date.now().toString();
  localStorage.setItem("lastActivityTime", timestamp);
  authLogger.debug("Updated last activity time", {
    timestamp: new Date(parseInt(timestamp)).toISOString(),
  });
}

/**
 * Retrieves stored return URL or default
 * @param {string} [defaultUrl='/'] - Fallback URL
 * @returns {string} Return URL
 */
function getReturnUrl(defaultUrl = "/") {
  const returnUrl = sessionStorage.getItem("returnUrl") || defaultUrl;
  authLogger.debug("Retrieved return URL", { returnUrl });
  return returnUrl;
}

/**
 * Clear stored return URL
 */
function clearReturnUrl() {
  authLogger.debug("Clearing return URL");
  sessionStorage.removeItem("returnUrl");
}

/**
 * Redirect to stored return URL or default
 */
function redirectToReturnUrl(defaultUrl = "/") {
  const returnUrl = getReturnUrl(defaultUrl);
  authLogger.info("Redirecting to return URL", { returnUrl });
  clearReturnUrl();
  window.location.href = returnUrl;
}

/**
 * Set up activity tracking for session timeout
 */
function setupActivityTracking() {
  authLogger.debug("Setting up activity tracking");

  // Track user activity
  const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"];

  activityEvents.forEach((event) => {
    document.addEventListener(event, _updateLastActivity, { passive: true });
  });

  authLogger.debug(`Registered ${activityEvents.length} activity events`);

  // Periodic session check
  setInterval(_checkSessionTimeout, 60000); // Check every minute
  authLogger.debug("Started periodic session timeout checks");
}

/**
 * Sets up complete authentication protection
 * @returns {Promise<Object>} Authentication result
 */
async function setupAuthProtection() {
  try {
    authLogger.time("Auth protection setup");

    // Initialize auth check
    await initAuthCheck();

    // Set up activity tracking
    setupActivityTracking();

    // Check authentication on page load
    const authResult = await requireAuth({ silent: true });

    authLogger.info("Authentication protection setup completed", {
      authenticated: authResult.authenticated,
      method: authResult.method,
    });

    authLogger.timeEnd("Auth protection setup");
    return authResult;
  } catch (error) {
    authLogger.error("Authentication protection setup failed", error);
    throw error;
  }
}

// Export functions for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    showLoading,
    hideLoading,
    updateLoadingText,
    initAuthCheck,
    checkAuthentication,
    requireAuth,
    logout,
    getAuthStatus,
    getReturnUrl,
    clearReturnUrl,
    redirectToReturnUrl,
    setupAuthProtection,
  };
}

// ES module exports for bundlers (Vite)
export {
  checkAuthentication,
  clearReturnUrl,
  getAuthStatus,
  getReturnUrl,
  hideLoading,
  initAuthCheck,
  logout,
  redirectToReturnUrl,
  requireAuth,
  setupAuthProtection,
  showLoading,
  updateLoadingText,
};
