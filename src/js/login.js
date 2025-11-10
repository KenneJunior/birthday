/**
 * Auth0 and Password Authentication System
 *
 * This script handles user authentication using Auth0 as the primary method,
 * with a fallback password-based system for local verification.
 *
 * Features:
 * - Auth0 integration for secure authentication
 * - Fallback password manager with local storage persistence
 * - UI updates based on authentication state
 * - Notifications and animations for user feedback
 * - Secure password handling with auto-hide
 * - Error handling and logging
 *
 * Dependencies: Auth0 SDK
 */
import { createAuth0Client } from "@auth0/auth0-spa-js";
import Hammer from "hammerjs";
import logger from "./utility/logger.js";

// Create contextual loggers for different modules
const loginLogger = logger.withContext({
  module: "LoginModule",
  File: "login.js",
  location: window.location.href,
  environment: process.env.NODE_ENV || "development",
  userAgent: navigator.userAgent,
});
const pwaLogger = loginLogger.withContext({
  module: "PWA",
  pwa: {
    // PWA capabilities
    isInstalled: window.matchMedia("(display-mode: standalone)").matches,
    hasServiceWorker: "serviceWorker" in navigator,
    isOnline: navigator.onLine,

    // Storage capabilities
    storage: {
      localStorage: !!window.localStorage,
      sessionStorage: !!window.sessionStorage,
      indexedDB: !!window.indexedDB,
      cacheStorage: !!window.caches,
    },

    // Device capabilities
    device: {
      type: getDeviceType(),
      touch: "ontouchstart" in window,
      cores: navigator.hardwareConcurrency || "unknown",
      memory: navigator.deviceMemory || "unknown",
    },

    // Network information
    network: navigator.connection
      ? {
          type: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt,
          saveData: navigator.connection.saveData,
        }
      : null,
  },

  // Service worker context
  serviceWorker: {
    status: navigator.serviceWorker?.controller ? "active" : "none",
    scope: navigator.serviceWorker?.controller?.scriptURL || "none",
  },
});
const auth0Logger = loginLogger.withContext({ module: "Auth0" });
function getDeviceType() {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "tablet";
  }
  if (
    /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
      ua
    )
  ) {
    return "mobile";
  }
  return "desktop";
}
// PWA Service Worker Registration
function initializePWA() {
  pwaLogger.time("PWA initialization");

  if (!("serviceWorker" in navigator)) {
    pwaLogger.warn("Service Workers are not supported in this browser");
    pwaLogger.timeEnd("PWA initialization");
    return;
  }

  window.addEventListener("load", async () => {
    try {
      pwaLogger.debug("Registering service worker");
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      pwaLogger.info("Service Worker registered successfully", {
        scope: registration.scope,
        active: !!registration.active,
      });

      // Handle service worker updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        pwaLogger.info("New Service Worker found", {
          state: newWorker.state,
          scriptURL: newWorker.scriptURL,
        });

        newWorker.addEventListener("statechange", () => {
          pwaLogger.debug(`Service Worker state change`, {
            state: newWorker.state,
          });

          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            pwaLogger.info(
              "New version available, showing update notification"
            );
            showUpdateNotification(registration);
          }

          if (newWorker.state === "activated") {
            pwaLogger.info("New Service Worker activated");
          }
        });
      });

      // Track installation progress
      if (registration.installing) {
        pwaLogger.debug("Service Worker installing");
      } else if (registration.waiting) {
        pwaLogger.debug("Service Worker waiting");
      } else if (registration.active) {
        pwaLogger.info("Service Worker active and ready");
      }

      // Handle controller changes (when SW takes control)
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        pwaLogger.info("Service Worker controller changed, reloading page");
        window.location.reload();
      });

      pwaLogger.timeEnd("PWA initialization");
    } catch (error) {
      pwaLogger.error("Service Worker registration failed", error);

      // Provide helpful error messages
      if (error.name === "SecurityError") {
        pwaLogger.error(
          "Service Worker security error - serve over HTTPS or localhost"
        );
      } else if (error.name === "TypeError") {
        pwaLogger.error(
          "Service Worker file might not exist or have syntax errors"
        );
      } else if (error.message.includes("MIME type")) {
        pwaLogger.error("Service Worker file might have wrong MIME type");
      }

      pwaLogger.timeEnd("PWA initialization");
    }
  });
}

function showUpdateNotification(registration) {
  pwaLogger.debug("Showing update notification to user");

  // You can customize this to show a nicer UI notification later
  const shouldUpdate = confirm(
    "A new version of Fhavur is available! Reload to update?"
  );

  if (shouldUpdate) {
    pwaLogger.info("User accepted update, activating new Service Worker");
    // Tell the waiting service worker to activate
    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    window.location.reload();
  } else {
    pwaLogger.debug("User declined update");
  }
}

// Initialize PWA
initializePWA();

let auth0 = null;

// Auth0 Configuration
const Auth0Config = {
  domain: "{DOMAIN}",
  client_id: "{ID}",
  cacheLocation: "{CACHE}",
  redirect_uri: window.location.origin,
};

// Password Manager Configuration
const PasswordConfig = {
  STORAGE_KEY: "{KEY}",
  CORRECT_PASSWORD: "",
  REDIRECT_URL: window.location.origin,
  MIN_PASSWORD_LENGTH: 8,
  NOTIFICATION_DURATION: 3000,
  THROTTLE_DELAY: 250,
  SECURE_INPUT_TIMEOUT: 3000,
  REDIRECT_DELAY: 3000,
};

/**
 * Auth0 Manager - Handles Auth0 authentication
 */
const Auth0Manager = (() => {
  let isAuthenticated = false;
  let userProfile = null;

  /**
   * Fetches Auth0 configuration from server
   * @returns {Promise<Object>} Configuration object
   */
  const _fetchAuthConfig = async () => {
    auth0Logger.time("Fetch auth config");
    try {
      auth0Logger.debug("Fetching auth configuration from /auth_config.json");
      const response = await fetch("/auth_config.json");
      if (!response.ok) {
        throw new Error(`Failed to fetch auth config: ${response.status}`);
      }
      const config = await response.json();
      auth0Logger.info("Auth configuration fetched successfully");
      auth0Logger.timeEnd("Fetch auth config");
      return config;
    } catch (error) {
      auth0Logger.error("Failed to fetch auth configuration", error);
      auth0Logger.timeEnd("Fetch auth config");
      throw error;
    }
  };

  /**
   * Initialize Auth0 client
   * @returns {Promise<boolean>} Initialization success
   */
  const init = async () => {
    auth0Logger.time("Auth0 initialization");

    try {
      const config = await _fetchAuthConfig();

      // Update configuration with fetched values
      Auth0Config.domain = config.Auth.domain;
      Auth0Config.client_id = config.Auth.clientId;
      Auth0Config.cacheLocation = config.Auth.cacheLocation;
      PasswordConfig.CORRECT_PASSWORD = config.PasswordManager.PASSWORD;
      PasswordConfig.STORAGE_KEY = config.PasswordManager.STORAGE_KEY;

      auth0Logger.debug("Configuration updated from server", {
        domain: Auth0Config.domain ? "set" : "missing",
        clientId: Auth0Config.client_id ? "set" : "missing",
        password: PasswordConfig.CORRECT_PASSWORD ? "set" : "missing",
      });

      const savedLocation = getSavedLocation();
      PasswordConfig.REDIRECT_URL =
        savedLocation && savedLocation.startsWith(window.location.origin)
          ? savedLocation
          : window.location.origin;

      auth0Logger.debug("Redirect URL configured", {
        url: PasswordConfig.REDIRECT_URL,
      });

      try {
        auth0Logger.debug("Creating Auth0 client");
        auth0 = await createAuth0Client({
          domain: Auth0Config.domain,
          client_id: Auth0Config.client_id,
          cacheLocation: Auth0Config.cacheLocation,
          useRefreshTokens: true,
        });

        // Check if user is authenticated
        isAuthenticated = await auth0.isAuthenticated();
        auth0Logger.debug("Auth0 authentication check", {
          isAuthenticated,
          hasUser: !!userProfile,
        });

        if (isAuthenticated) {
          auth0Logger.debug("User is authenticated, fetching profile");
          userProfile = await auth0.getUser();
          _handleAuthenticated();
        } else {
          auth0Logger.debug("User is not authenticated with Auth0");
        }
      } catch (err) {
        auth0Logger.error("Auth0 client initialization failed", err);
        await PasswordManager.showNotification(
          "Check your internet connection",
          "warning"
        );
        auth0Logger.timeEnd("Auth0 initialization");
        return false;
      }

      auth0Logger.info("Auth0 initialized successfully");
      auth0Logger.timeEnd("Auth0 initialization");
      return true;
    } catch (error) {
      auth0Logger.error("Auth0 initialization failed", error);
      await PasswordManager.showNotification(
        "Failed to initialize authentication system. Check your internet connection",
        "error"
      );
      auth0Logger.timeEnd("Auth0 initialization");
      return false;
    }
  };

  const getSavedLocation = () => {
    const savedUrl =
      sessionStorage.getItem("returnUrl") || window.location.origin;
    auth0Logger.debug("Retrieved saved location", { savedUrl });
    return savedUrl;
  };

  /**
   * Handle login with Auth0
   */
  const login = async () => {
    auth0Logger.time("Auth0 login");

    try {
      auth0Logger.info("Initiating Auth0 login");
      await auth0.loginWithRedirect({
        redirect_uri: PasswordConfig.REDIRECT_URL,
      });
      auth0Logger.timeEnd("Auth0 login");
    } catch (error) {
      auth0Logger.error("Auth0 login failed", error);
      await PasswordManager.showNotification(
        "Authentication failed. Please try again.",
        "error"
      );
      auth0Logger.timeEnd("Auth0 login");
    }
  };

  /**
   * Handle logout
   */
  const logout = async () => {
    auth0Logger.time("Auth0 logout");

    try {
      auth0Logger.info("Initiating Auth0 logout");
      auth0.logout({
        returnTo: window.location.origin + "/logOut.html",
      });
      auth0Logger.timeEnd("Auth0 logout");
    } catch (error) {
      auth0Logger.error("Auth0 logout failed", error);
      await PasswordManager.showNotification(
        "LogOut failed. Please try again.",
        "error"
      );
      auth0Logger.timeEnd("Auth0 logout");
    }
  };

  /**
   * Check authentication state
   * @returns {Promise<boolean>} Authentication status
   */
  const checkAuth = async () => {
    auth0Logger.time("Auth check");

    try {
      const query = window.location.search;
      auth0Logger.debug("Checking URL for auth callback", {
        hasCode: query.includes("code="),
        hasState: query.includes("state="),
      });

      if (query.includes("code=") && query.includes("state=")) {
        auth0Logger.debug("Handling Auth0 redirect callback");
        await auth0.handleRedirectCallback();
        window.history.replaceState({}, document.title, "/");
        auth0Logger.debug("URL cleaned after redirect callback");
      }

      isAuthenticated = await auth0.isAuthenticated();
      auth0Logger.debug("Auth0 authentication status", { isAuthenticated });

      if (isAuthenticated) {
        auth0Logger.debug("User authenticated, fetching profile");
        userProfile = await auth0.getUser();
        _handleAuthenticated();
      }

      _updateUI();
      auth0Logger.timeEnd("Auth check");
      return isAuthenticated;
    } catch (error) {
      auth0Logger.error("Auth0 check failed", error);
      _showNotification("Authentication check failed.", "error");
      auth0Logger.timeEnd("Auth check");
      return false;
    }
  };

  /**
   * Handle authenticated state
   */
  const _handleAuthenticated = () => {
    auth0Logger.info("User authenticated successfully", {
      userName: userProfile?.name || userProfile?.email,
      redirectUrl: PasswordConfig.REDIRECT_URL,
    });

    _showNotification(
      `Welcome back! Redirecting to ${PasswordConfig.REDIRECT_URL}...`,
      "success"
    );
    _scheduleRedirect();
  };

  /**
   * Update UI based on authentication state
   */
  const _updateUI = () => {
    auth0Logger.time("UI update");

    const auth0Container = document.getElementById("auth0");
    const passwordContainer = document.getElementById("passwordContainer");
    const userInfo = document.getElementById("userInfo");
    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (!auth0Container || !passwordContainer) {
      auth0Logger.warn("Required UI elements not found for update");
      auth0Logger.timeEnd("UI update");
      return;
    }

    if (isAuthenticated) {
      // User is authenticated with Auth0
      auth0Container.classList.remove("d-none");
      passwordContainer.classList.add("d-none");

      if (userInfo && userProfile) {
        userInfo.textContent = `Logged in as: ${
          userProfile.name || userProfile.email
        }`;
        auth0Logger.debug("User info updated in UI", {
          userName: userProfile.name || userProfile.email,
        });
      }

      if (loginBtn) loginBtn.classList.add("d-none");
      if (logoutBtn) logoutBtn.classList.remove("d-none");

      auth0Logger.debug("UI updated for authenticated state");
    } else {
      // User is not authenticated with Auth0, show fallback option
      auth0Container.classList.remove("d-none");
      passwordContainer.classList.remove("d-none");

      if (loginBtn) loginBtn.classList.remove("d-none");
      if (logoutBtn) logoutBtn.classList.add("d-none");

      auth0Logger.debug("UI updated for unauthenticated state");
    }

    auth0Logger.timeEnd("UI update");
  };

  /**
   * Schedule redirect
   */
  const _scheduleRedirect = () => {
    auth0Logger.debug("Scheduling redirect", {
      delay: PasswordConfig.REDIRECT_DELAY,
      url: PasswordConfig.REDIRECT_URL,
    });

    setTimeout(() => {
      auth0Logger.info("Executing scheduled redirect");
      window.location.href = PasswordConfig.REDIRECT_URL;
    }, PasswordConfig.REDIRECT_DELAY);
  };

  const _showNotification = (message, type) => {
    auth0Logger.debug("Auth0 notification", { message, type });
    // This will be handled by PasswordManager's showNotification
  };

  // Public API
  return {
    init,
    login,
    logout,
    checkAuth,
    isAuthenticated: () => isAuthenticated,
    getUser: () => userProfile,
    fetchAuth: _fetchAuthConfig,
  };
})();
/**
 * Password Manager - Handles fallback password authentication
 */
const PasswordManager = (() => {
  // Create contextual logger for PasswordManager
  const passwordLogger = logger.withContext({ module: "PasswordManager" });

  let state = {
    isPasswordVisible: false,
    hasExistingPassword: false,
    notificationTimeout: null,
    secureInputTimeout: null,
    redirectTimeout: null,
    ismouseOnNotification: false,
    isNotificationVisible: false,
    correctPassword: PasswordConfig.CORRECT_PASSWORD, // default value
  };

  const dom = {};
  let hammer = null;

  /**
   * Initialize the password manager
   * @param {string} [password] - Optional password to use for verification
   */
  const init = (password) => {
    passwordLogger.time("PasswordManager initialization");

    if (password) {
      state.correctPassword = password;
      passwordLogger.debug("Password set from parameter");
    }

    try {
      _cacheDomElements();
      _checkExistingPassword();

      // If password exists and Auth0 is not authenticated, redirect
      if (state.hasExistingPassword && !Auth0Manager.isAuthenticated()) {
        passwordLogger.info("Existing password found, redirecting user");
        _showNotification("Password verified. Redirecting...", "success");
        _scheduleRedirect();
        passwordLogger.timeEnd("PasswordManager initialization");
        return;
      }

      _bindEvents();
      passwordLogger.info("Password manager initialized successfully");
      passwordLogger.timeEnd("PasswordManager initialization");
    } catch (error) {
      passwordLogger.error("Password manager initialization failed", error);
      passwordLogger.timeEnd("PasswordManager initialization");
    }
  };

  /**
   * Cache DOM elements
   */
  const _cacheDomElements = () => {
    passwordLogger.time("DOM element caching");

    //for testing purpose only
    if (window.location.origin.includes("localhost")) {
      passwordLogger.debug("Localhost detected, setting test password");
      //_savePassword("Missusfhavur");
    }

    dom.helper = document.getElementById("password-requirements");
    dom.Auth0 = document.getElementById("auth0");
    dom.loginForm = document.getElementById("loginForm");
    dom.passwordInput = document.getElementById("password");
    dom.toggleButton = document.getElementById("togglePassword");
    dom.customerSupport = document.getElementById("contactSupport");
    dom.notificationCancelBtn = document.querySelector(".fa-times");
    dom.notification = document.getElementById("notification");

    if (dom.notification) {
      hammer = new Hammer(dom.notification);
      passwordLogger.debug("Hammer.js initialized for notification gestures");
    }

    if (!dom.loginForm || !dom.passwordInput || !dom.toggleButton) {
      const error = new Error("Required DOM elements not found");
      passwordLogger.error("DOM elements missing", {
        loginForm: !!dom.loginForm,
        passwordInput: !!dom.passwordInput,
        toggleButton: !!dom.toggleButton,
      });
      throw error;
    }

    dom.Auth0.classList.add("d-none");
    passwordLogger.debug("DOM elements cached successfully", {
      elementsFound: Object.keys(dom).filter((key) => !!dom[key]).length,
    });
    passwordLogger.timeEnd("DOM element caching");
  };

  /**
   * Bind event listeners
   */
  const _bindEvents = () => {
    passwordLogger.time("Event binding");

    dom.loginForm.addEventListener("submit", _handleFormSubmit);
    dom.passwordInput.addEventListener(
      "input",
      _debounce(_validatePassword, 300)
    );
    dom.passwordInput.addEventListener("blur", _handleInputBlur);
    dom.customerSupport.addEventListener("click", _handleSupport);
    dom.passwordInput.addEventListener("focus", _handleInputFocus);
    dom.toggleButton.addEventListener("click", _togglePasswordVisibility);
    dom.toggleButton.addEventListener("keydown", _handleToggleKeydown);

    if (dom.notification) {
      dom.notification.addEventListener("mouseenter", () => {
        state.ismouseOnNotification = true;
        passwordLogger.debug("Mouse entered notification");
      });
      dom.notification.addEventListener("mouseleave", () => {
        state.ismouseOnNotification = false;
        passwordLogger.debug("Mouse left notification");
      });
    }

    if (dom.notificationCancelBtn) {
      dom.notificationCancelBtn.addEventListener("click", _hideNotification);
    }

    if (hammer) {
      hammer.on("swipe", _hideNotification);
    }

    window.addEventListener("beforeunload", _hideNotification);

    passwordLogger.debug("Event listeners bound successfully");
    passwordLogger.timeEnd("Event binding");
  };

  /**
   * Hide notification immediately
   */
  const _hideNotification = () => {
    passwordLogger.debug("Hiding notification");
    const { notification } = dom;
    if (notification) {
      notification.classList.remove("show");
      state.isNotificationVisible = false;
    }
  };

  /**
   * Check if password exists in local storage
   */
  const _checkExistingPassword = () => {
    passwordLogger.time("Existing password check");

    try {
      const storedPassword = localStorage.getItem(PasswordConfig.STORAGE_KEY);
      state.hasExistingPassword = storedPassword === state.correctPassword;

      passwordLogger.debug("Password storage check", {
        hasStoredPassword: !!storedPassword,
        matchesCorrect: state.hasExistingPassword,
      });

      if (state.hasExistingPassword) {
        passwordLogger.info("Existing password found in local storage");
      } else {
        passwordLogger.debug("No valid password found in local storage");
      }

      passwordLogger.timeEnd("Existing password check");
    } catch (error) {
      passwordLogger.error("Failed to check existing password", error);
      passwordLogger.timeEnd("Existing password check");
    }
  };

  /**
   * Handle form submission
   */
  const _handleFormSubmit = (e) => {
    passwordLogger.time("Form submission");
    e.preventDefault();

    const password = dom.passwordInput.value.trim();
    passwordLogger.debug("Form submitted", {
      passwordLength: password.length,
      hasValue: !!password,
    });

    let isValid = _validatePassword();

    if (isValid) {
      passwordLogger.debug("Password format valid, verifying");
      isValid = _verifyAndSavePassword(password);
    } else {
      passwordLogger.warn("Password format invalid", {
        minLength: PasswordConfig.MIN_PASSWORD_LENGTH,
        actualLength: password.length,
      });
      _showNotification(
        `Password must be at least ${PasswordConfig.MIN_PASSWORD_LENGTH} characters`,
        "error"
      );
      _shakeElement(dom.loginForm);
    }

    _validateInput(dom.passwordInput, isValid);
    passwordLogger.timeEnd("Form submission");
  };

  /**
   * Validate password
   */
  const _validatePassword = () => {
    const password = dom.passwordInput.value.trim();
    const isValid = password.length >= PasswordConfig.MIN_PASSWORD_LENGTH;

    passwordLogger.debug("Password validation", {
      length: password.length,
      isValid,
      minRequired: PasswordConfig.MIN_PASSWORD_LENGTH,
    });

    _validatetext(dom.helper, isValid);
    return isValid;
  };

  /**
   * Verifies and saves password if correct
   * @param {string} password - Input password
   */
  const _verifyAndSavePassword = (password) => {
    passwordLogger.time("Password verification");

    let valid;
    if (password === state.correctPassword) {
      passwordLogger.info("Password verification successful");
      _savePassword(password);
      _showNotification(
        "Password verified successfully! Redirecting...",
        "success"
      );
      _scheduleRedirect();
      valid = true;
    } else {
      passwordLogger.warn("Password verification failed", {
        inputLength: password.length,
        expectedLength: state.correctPassword?.length,
      });
      valid = false;
      _showNotification("Incorrect password. Please try again.", "error");
      _shakeElement(dom.loginForm);
    }

    passwordLogger.timeEnd("Password verification");
    return valid;
  };

  /**
   * Validates and styles input element
   * @param {HTMLElement} input - Input element
   * @param {boolean} isValid - Validation result
   */
  const _validateInput = (input, isValid) => {
    input.classList.toggle("valid", isValid);
    input.classList.toggle("invalid", !isValid);
    dom.passwordInput.classList.remove("focus");

    passwordLogger.debug("Input validation styling applied", { isValid });
  };

  /**
   * Validates and styles text element
   * @param {HTMLElement} input - Text element
   * @param {boolean} isValid - Validation result
   */
  const _validatetext = (input, isValid) => {
    const text = input.textContent || input.innerText;
    if (!text) {
      passwordLogger.debug("No text content for validation styling");
      return;
    }

    input.innerHTML = _textIcon(isValid, text);
    input.classList.toggle("validtext", isValid);
    input.classList.toggle("invalidtext", !isValid);

    passwordLogger.debug("Text validation styling applied", { isValid });
  };

  /**
   * @param {boolean} isValid return the icon with text
   * @returns
   */
  const _textIcon = (isValid, text) => {
    if (!isValid) {
      return `${_getNotificationIcon("error")} ${text}`;
    } else {
      return `${_getNotificationIcon("success")} ${text}`;
    }
  };

  /**
   * Saves password to local storage
   * @param {string} password - Password to save
   */
  const _savePassword = (password) => {
    passwordLogger.time("Password save");

    try {
      localStorage.setItem(PasswordConfig.STORAGE_KEY, password);
      state.hasExistingPassword = true;
      passwordLogger.info("Password saved to local storage successfully");
      passwordLogger.timeEnd("Password save");
    } catch (error) {
      passwordLogger.error("Failed to save password to local storage", error);
      _showNotification("Storage error: Could not save password", "error");
      passwordLogger.timeEnd("Password save");
    }
  };

  /**
   * Schedule redirect
   */
  const _scheduleRedirect = () => {
    passwordLogger.time("Redirect scheduling");

    if (state.redirectTimeout) {
      clearTimeout(state.redirectTimeout);
      passwordLogger.debug("Cleared existing redirect timeout");
    }

    passwordLogger.info("Scheduling redirect", {
      delay: PasswordConfig.REDIRECT_DELAY,
      url: PasswordConfig.REDIRECT_URL,
    });

    state.redirectTimeout = setTimeout(() => {
      passwordLogger.info("Executing scheduled redirect");
      window.location.href = PasswordConfig.REDIRECT_URL;
    }, PasswordConfig.REDIRECT_DELAY);

    passwordLogger.timeEnd("Redirect scheduling");
  };

  /**
   * Toggle password visibility
   */
  const _togglePasswordVisibility = () => {
    passwordLogger.time("Password visibility toggle");

    state.isPasswordVisible = !state.isPasswordVisible;
    dom.passwordInput.type = state.isPasswordVisible ? "text" : "password";

    const action = state.isPasswordVisible ? "Hide" : "Show";
    dom.toggleButton.setAttribute("aria-label", `${action} password`);
    dom.toggleButton.setAttribute("aria-pressed", state.isPasswordVisible);
    dom.toggleButton.classList.toggle("visible", state.isPasswordVisible);

    passwordLogger.debug("Password visibility changed", {
      isVisible: state.isPasswordVisible,
      inputType: dom.passwordInput.type,
    });

    _schedulePasswordHide();
    passwordLogger.timeEnd("Password visibility toggle");
  };

  /**
   * Schedule automatic password hiding
   */
  const _schedulePasswordHide = () => {
    passwordLogger.time("Auto-hide scheduling");

    if (state.secureInputTimeout) {
      clearTimeout(state.secureInputTimeout);
      passwordLogger.debug("Cleared existing secure input timeout");
    }

    if (state.isPasswordVisible) {
      passwordLogger.debug("Scheduling automatic password hide", {
        timeout: PasswordConfig.SECURE_INPUT_TIMEOUT,
      });

      state.secureInputTimeout = setTimeout(() => {
        if (state.isPasswordVisible) {
          passwordLogger.debug("Auto-hiding password for security");
          _togglePasswordVisibility();
          _showNotification("Password hidden for security", "info");
        }
      }, PasswordConfig.SECURE_INPUT_TIMEOUT);
    }

    passwordLogger.timeEnd("Auto-hide scheduling");
  };

  /**
   * Displays a notification
   * @param {string} message - Notification message
   * @param {string} [type='info'] - Notification type
   */
  const _showNotification = async (message, type = "info") => {
    passwordLogger.time("Notification display");

    if (state.isNotificationVisible) {
      passwordLogger.debug("Notification already visible, hiding first");
      _hideNotification();
      await delay(200);
    }

    let { notification } = dom;
    if (!notification) {
      notification = document.getElementById("notification");
      passwordLogger.debug("Retrieved notification element from DOM");
    }

    const notificationText = document.getElementById("notificationText");

    if (!notification || !notificationText) {
      passwordLogger.warn("Notification elements not found");
      passwordLogger.timeEnd("Notification display");
      return;
    }

    if (state.notificationTimeout) {
      clearTimeout(state.notificationTimeout);
      passwordLogger.debug("Cleared existing notification timeout");
    }

    const icon = _getNotificationIcon(type);

    notificationText.innerHTML = `${icon} ${message}`;
    notification.className = `notification show ${type}`;
    state.isNotificationVisible = true;

    passwordLogger.debug("Notification displayed", { type, message });

    state.notificationTimeout = setInterval(() => {
      if (!state.ismouseOnNotification) {
        passwordLogger.debug("Auto-hiding notification after timeout");
        notification.classList.remove("show");
        state.isNotificationVisible = false;
      }
    }, PasswordConfig.NOTIFICATION_DURATION);

    passwordLogger.timeEnd("Notification display");
  };

  /**
   * take is the type of notification then return the icon
   * @param {type} type
   * @returns
   */
  const _getNotificationIcon = (type) => {
    const icons = {
      info: '<i class="fas fa-info-circle"></i>',
      error: '<i class="fas fa-times-circle"></i>',
      warning: '<i class="fas fa-exclamation-triangle"></i>',
      success: '<i class="fas fa-check-circle"></i>',
    };

    const icon = icons[type] || '<i class="fas fa-bell"></i>';
    passwordLogger.debug("Notification icon selected", { type, icon });
    return icon;
  };

  const delay = (ms) => {
    passwordLogger.debug("Creating delay promise", { milliseconds: ms });
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  /**
   * Handle input blur
   */
  const _handleInputBlur = () => {
    passwordLogger.debug("Password input blur");
    dom.passwordInput.classList.remove("focused");
    _validatePassword();
  };

  /**
   * Handle input focus
   */
  const _handleInputFocus = () => {
    passwordLogger.debug("Password input focus");
    dom.passwordInput.classList.add("focused");
    dom.passwordInput.classList.remove("invalid");
    dom.passwordInput.classList.remove("valid");
  };

  /**
   * create a new page and redirect the user using whatsapp Api
   * and send a message of help to my number
   */
  const _handleSupport = () => {
    passwordLogger.time("Support request");

    const phoneNumber = 237670852835;
    const message = encodeURIComponent(
      "Hello! I have a question about how to use this app."
    );
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${message}`;

    passwordLogger.info("Opening WhatsApp support", { phoneNumber });

    const newWindow = window.open(
      whatsappUrl,
      "whatsappWindow",
      "width=500,height=600 ,noopener,noreferrer"
    );

    if (!newWindow) {
      passwordLogger.warn("WhatsApp popup was blocked by browser");
      _showNotification("Popup was blocked!", "error");
    } else {
      passwordLogger.debug("WhatsApp support window opened successfully");
    }

    passwordLogger.timeEnd("Support request");
  };

  /**
   * Handles toggle button keydown
   * @param {KeyboardEvent} e - Keydown event
   */
  const _handleToggleKeydown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      passwordLogger.debug("Toggle button activated via keyboard", {
        key: e.key,
      });
      e.preventDefault();
      _togglePasswordVisibility();
    }
  };

  /**
   * Applies shake animation to element
   * @param {HTMLElement} element - Element to shake
   */
  const _shakeElement = (element) => {
    passwordLogger.debug("Applying shake animation to element");
    element.classList.add("shake");
    setTimeout(() => {
      element.classList.remove("shake");
      passwordLogger.debug("Shake animation completed");
    }, 500);
  };

  /**
   * Debounce utility function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in ms
   * @returns {Function} Debounced function
   */
  const _debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Public API
  return {
    init,
    showNotification: _showNotification,
  };
})();

// Create contextual logger for main application
const appLogger = logger.withContext({ module: "MainApp" });

// Main application initialization
document.addEventListener("DOMContentLoaded", async () => {
  appLogger.time("Application initialization");

  try {
    appLogger.info("Starting application initialization");

    // Initialize Auth0
    appLogger.debug("Initializing Auth0 manager");
    const auth0Initialized = await Auth0Manager.init();

    let correctPassword = PasswordConfig.CORRECT_PASSWORD;

    if (auth0Initialized) {
      appLogger.debug("Auth0 initialized, checking authentication");
      await Auth0Manager.checkAuth();

      // Get password from config if available
      if (!correctPassword) {
        appLogger.debug("No password in config, fetching from server");
        const config = await Auth0Manager.fetchAuth();
        if (
          config &&
          config.PasswordManager &&
          config.PasswordManager.PASSWORD
        ) {
          correctPassword = config.PasswordManager.PASSWORD;
          appLogger.debug("Password retrieved from server config");
        } else {
          const error = new Error(
            "App was unable to load the password please try again later or contact support"
          );
          appLogger.error("Password configuration missing", error);
          throw error;
        }
      }
    } else {
      appLogger.warn(
        "Auth0 initialization failed, using password fallback only"
      );
    }

    // Initialize Password Manager (fallback)
    appLogger.debug("Initializing Password Manager");
    PasswordManager.init(correctPassword);

    appLogger.info("Application initialization completed successfully");
    appLogger.timeEnd("Application initialization");
  } catch (error) {
    appLogger.error("Application initialization failed", error);

    // Fallback error message
    appLogger.debug("Showing fallback error message to user");
    const fallbackMessage = document.createElement("div");
    fallbackMessage.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ef476f;
      color: white;
      padding: 1rem;
      text-align: center;
      z-index: 10000;
      font-family: sans-serif;
    `;
    fallbackMessage.textContent =
      "Application failed to load. Please refresh the page.";
    document.body.appendChild(fallbackMessage);

    appLogger.timeEnd("Application initialization");
  }
});

// Global functions for HTML onclick attributes
window.loginWithAuth0 = () => {
  appLogger.info("Global login function called");
  Auth0Manager.login();
};

window.logoutWithAuth0 = () => {
  appLogger.info("Global logout function called");
  Auth0Manager.logout();
};

// Ensure global functions are properly assigned
window.loginWithAuth0 = Auth0Manager.login;
window.logoutWithAuth0 = Auth0Manager.logout;

appLogger.debug("Global authentication functions assigned");
