// ThemeManager.js - Exportable class for theme switching with localStorage persistence
import logger from "./logger.js";
const modeLogger = logger.withContext({
  module: "Mode",
});
export class ThemeManager {
  constructor(config = {}) {
    // Default config
    this.config = Object.freeze({
      defaultTheme: "light",
      storageKey: "theme",
      selector: "body",
      buttonSelector: "#mode-toggle",
      iconSelector: ".mode-icon",
      textSelector: ".mode-text",
      systemPreference: true,
      ...config,
    });

    this.element = null;
    this.button = null;
    this.icon = null;
    this.text = null;
    this.currentTheme = null;
  }

  // Initialize: Setup DOM elements and load theme
  init() {
    this.element = document.querySelector(this.config.selector);
    this.button = document.querySelector(this.config.buttonSelector);
    this.icon = this.button?.querySelector(this.config.iconSelector);
    this.text = this.button?.querySelector(this.config.textSelector);

    if (!this.element) {
      console.warn(
        "ThemeManager: No element found for selector",
        this.config.selector
      );
      return;
    }

    if (!this.button) {
      modeLogger.warn(
        "ThemeManager: No button found for selector",
        this.config.buttonSelector
      );
      return;
    }

    // Load and apply saved theme
    this.loadTheme();

    // Setup toggle listener
    this.button.addEventListener("click", () => this.toggle());

    // Optional: Listen for system changes
    if (this.config.systemPreference) {
      this.setupSystemListener();
    }

    modeLogger.debug("ThemeManager initialized with theme:", this.currentTheme);
  }

  // Load theme from localStorage or default/system
  loadTheme() {
    let theme = localStorage.getItem(this.config.storageKey);

    // If no saved, check system preference
    if (!theme && this.config.systemPreference) {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      theme = prefersDark ? "dark" : this.config.defaultTheme;
    }

    // Fallback to default
    if (!theme) {
      theme = this.config.defaultTheme;
    }

    this.applyTheme(theme);
  }

  // Apply theme to DOM and update button
  applyTheme(theme) {
    if (!["light", "dark"].includes(theme)) {
      console.warn("ThemeManager: Invalid theme", theme);
      return;
    }

    this.element.setAttribute("data-theme", theme);
    localStorage.setItem(this.config.storageKey, theme);
    this.currentTheme = theme;

    // Update button visuals
    this.updateButton(theme);
  }

  // Toggle between light/dark
  toggle() {
    const newTheme = this.currentTheme === "dark" ? "light" : "dark";
    this.applyTheme(newTheme);
  }

  // Update button icon and text
  updateButton(theme) {
    if (!this.icon || !this.text) return;

    if (theme === "dark") {
      this.icon.textContent = "☀️";
      this.text.textContent = "Light Mode";
    } else {
      this.icon.textContent = "🌙";
      this.text.textContent = "Dark Mode";
    }
  }

  // Setup listener for system theme changes (only if no saved theme)
  setupSystemListener() {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", (e) => {
      if (!localStorage.getItem(this.config.storageKey)) {
        const theme = e.matches ? "dark" : "light";
        this.applyTheme(theme);
      }
    });
  }

  // Get current theme
  getCurrentTheme() {
    return this.currentTheme;
  }

  // Set theme directly (bypasses toggle)
  setTheme(theme) {
    this.applyTheme(theme);
  }

  // Destroy: Remove listeners (for cleanup if needed)
  destroy() {
    if (this.button) {
      this.button.removeEventListener("click", () => this.toggle());
    }
    // System listener cleanup (manual removal needed for older browsers)
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.removeEventListener("change", () => {}); // Note: Callback ref needed for precise removal
  }
}
