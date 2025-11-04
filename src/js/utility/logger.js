// Central logger used across the project with enhanced capabilities
// Features:
// - Multi-level logging (debug, info, warn, error)
// - Browser: logs only when running on localhost/127.0.0.1 or when debug flag is enabled
// - Node: logs when DEBUG environment variable is set
// - Service Worker: respects same origin rules
// - Performance monitoring and analytics integration
// - Structured logging with context and metadata

/**
 * Log levels for consistent logging across environments
 */
const LOG_LEVELS = Object.freeze({
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4,
});

/**
 * Default configuration for the logger
 */
const DEFAULT_CONFIG = Object.freeze({
  level: LOG_LEVELS.INFO,
  prefix: "%c[FHAVUR]",
  enablePerformance: true,
  enableAnalytics: false,
  maxStringLength: 1000,
  timestamp: true,
  colors: true,
});

class Logger {
  constructor(config = {}) {
    this.config = Object.freeze({ ...DEFAULT_CONFIG, ...config });
    this.isBrowser = typeof window !== "undefined";
    this.isNode = typeof process !== "undefined" && process.env;
    this.isWorker = typeof self !== "undefined" && self.location;
    this.performanceMarks = new Map();
    this.contextStack = [];

    this._detectEnvironment();
    this._setupGlobalErrorHandling();
  }

  /**
   * Detect and set up the current environment
   */
  _detectEnvironment() {
    // Browser environment
    if (this.isBrowser) {
      this._setupBrowserEnvironment();
      return;
    }

    // Node.js environment
    if (this.isNode) {
      this._setupNodeEnvironment();
      return;
    }

    // Worker environment (Service Worker, Web Worker)
    /* if (this.isWorker) {
      this._setupWorkerEnvironment();
      return;
    }
      */

    // Fallback for unknown environments
    this.shouldLog = false;
  }

  _setupBrowserEnvironment() {
    const { hostname, origin, search } = window.location;
    const isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      origin.includes("local.");

    const urlParams = new URLSearchParams(search);

    // Check all possible parameter names
    const paramValues = {
      debug: urlParams.get("debug"),
      log: urlParams.get("log"),
      logLevel: urlParams.get("logLevel"),
      fhavur: urlParams.get("fhavur"),
      logger: urlParams.get("logger"),
    };

    // Combine with storage and global variables
    const allSources = [
      ...Object.values(paramValues).filter(Boolean),
      window.localStorage?.getItem("FHAVUR_DEBUG"),
      window.sessionStorage?.getItem("FHAVUR_DEBUG"),
      window._FHAVUR_DEBUG,
      window._FHAVUR_LOG_LEVEL,
    ].filter((source) => source !== null && source !== undefined);

    // Default: only log on localhost
    this.shouldLog = isLocal;
    let levelSet = false;

    // Process each source
    for (const source of allSources) {
      const value = String(source).toLowerCase().trim();

      // Enable/disable flags
      if (
        value === "true" ||
        value === "1" ||
        value === "enable" ||
        value === "on" ||
        value === "yes"
      ) {
        this.shouldLog = true;
        continue;
      }

      if (
        value === "false" ||
        value === "0" ||
        value === "disable" ||
        value === "off" ||
        value === "no"
      ) {
        this.shouldLog = false;
        continue;
      }

      // If it's a log level, enable logging AND set level
      if (["debug", "info", "warn", "error", "silent"].includes(value)) {
        this.shouldLog = true;
        this.config = { ...this.config, level: this._parseLogLevel(value) };
        levelSet = true;
        break; // First level parameter wins
      }
    }

    // Log the configuration
    this._logConfiguration(levelSet);
  }

  _logConfiguration(levelWasSet = false) {
    if (this.shouldLog) {
      const levelName = this._getLevelLabel(this.config.level);
      const source = levelWasSet ? "URL/Config" : "Default";

      console.log(
        `%c[FHAVUR] Logger Active`,
        "background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 6px 12px; border-radius: 8px; font-weight: bold; font-size: 14px;"
      );
      console.log(
        `%c📊 Level: ${levelName} | 🔧 Source: ${source}`,
        "color: #6b7280; font-weight: bold; margin-left: 10px;"
      );
    }
  }

  _setupNodeEnvironment() {
    this.shouldLog = !!process.env.DEBUG || !!process.env.FHAVUR_DEBUG;

    const level = process.env.LOG_LEVEL || process.env.FHAVUR_LOG_LEVEL;
    if (level) {
      this.config = { ...this.config, level: this._parseLogLevel(level) };
    }
  }

  _setupWorkerEnvironment() {
    try {
      const origin = self.location?.origin || "";
      const hostname = self.location?.hostname || "";

      const isLocal =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        origin.includes("local.");

      this.shouldLog = isLocal;
    } catch (error) {
      // Some worker environments don't have location access
      this.shouldLog = false;
    }
  }

  _parseLogLevel(level) {
    const levelMap = {
      debug: LOG_LEVELS.DEBUG,
      info: LOG_LEVELS.INFO,
      warn: LOG_LEVELS.WARN,
      error: LOG_LEVELS.ERROR,
      silent: LOG_LEVELS.SILENT,
    };
    return levelMap[String(level).toLowerCase()] ?? LOG_LEVELS.DEBUG;
  }

  /**
   * Setup global error handling for uncaught exceptions
   */
  _setupGlobalErrorHandling() {
    if (!this.shouldLog || this.config.level > LOG_LEVELS.ERROR) return;

    if (this.isBrowser) {
      window.addEventListener("error", (event) => {
        this.error("Uncaught error", event.error, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        });
      });

      window.addEventListener("unhandledrejection", (event) => {
        this.error("Unhandled promise rejection", event.reason);
      });
    }

    if (this.isNode) {
      process.on("uncaughtException", (error) => {
        this.error("Uncaught exception", error);
      });

      process.on("unhandledRejection", (reason, promise) => {
        this.error("Unhandled promise rejection", reason);
      });
    }
  }

  /**
   * Core logging method with level checking
   */
  _log(level, args, context = {}) {
    // Early return if we shouldn't log
    if (!this.shouldLog || level < this.config.level) {
      return;
    }

    try {
      const timestamp = this.config.timestamp ? this._getTimestamp() : "";
      const prefix = this.config.prefix;
      const emoji = this._getLevelEmoji(level); // Add this line

      const levelLabel = this._getLevelLabel(level);

      const mergedContext = this._mergeContext(context);
      const formattedArgs = this._formatArguments(args);
      const style = this.config.colors ? this._getLevelStyle(level) : "";

      const logArgs = this._buildLogArguments(
        prefix,
        timestamp,
        `${emoji} ${levelLabel}`,
        style,
        formattedArgs,
        mergedContext
      );

      this._writeToConsole(level, logArgs);

      // Send to analytics if enabled and appropriate level
      if (this.config.enableAnalytics && level >= LOG_LEVELS.WARN) {
        this._sendToAnalytics(level, formattedArgs, mergedContext);
      }
    } catch (error) {
      // Ultimate fallback - minimal logging
      this._fallbackLog(...args);
    }
  }

  _formatArguments(args) {
    return args.map((arg) => {
      // Handle strings with length limits
      if (typeof arg === "string") {
        return arg.length > this.config.maxStringLength
          ? arg.substring(0, this.config.maxStringLength) + "..."
          : arg;
      }

      // Handle Error objects
      if (arg instanceof Error) {
        const errorObj = {
          name: arg.name,
          message: arg.message,
          ...(this.config.level === LOG_LEVELS.DEBUG && { stack: arg.stack }),
        };
        // Include cause if available (Error chaining)
        if (arg.cause) {
          errorObj.cause = this._formatArguments([arg.cause])[0];
        }
        return errorObj;
      }

      // Handle objects with safe serialization
      if (typeof arg === "object" && arg !== null) {
        return this._safeStringify(arg);
      }

      // Primitive values pass through
      return arg;
    });
  }

  _safeStringify(obj) {
    const seen = new WeakSet();

    return JSON.stringify(
      obj,
      (key, value) => {
        // Handle circular references
        if (typeof value === "object" && value !== null) {
          if (seen.has(value)) {
            return "[Circular]";
          }
          seen.add(value);
        }

        // Handle special types
        if (value instanceof Error) {
          return {
            __type: "Error",
            name: value.name,
            message: value.message,
            stack: value.stack,
          };
        }

        if (value instanceof Date) {
          return value.toISOString();
        }

        if (value instanceof Map) {
          return {
            __type: "Map",
            value: Array.from(value.entries()),
          };
        }

        if (value instanceof Set) {
          return {
            __type: "Set",
            value: Array.from(value),
          };
        }

        return value;
      },
      2
    );
  }

  _buildLogArguments(
    prefix,
    timestamp,
    levelLabel,
    style,
    formattedArgs,
    context
  ) {
    const args = [];

    if (this.config.colors) {
      args.push(style);
    }
    args.push(`${prefix}${timestamp ? ` ${timestamp}` : ""} ${levelLabel}`);
    args.push(...formattedArgs);

    // Add context if present
    if (Object.keys(context).length > 0) {
      args.push("\n↳ Context:", { context });
    }

    return args;
  }

  _writeToConsole(level, args = []) {
    const color = this.config.colors ? args.shift() : "";
    // const prefix = args.shift();
    switch (level) {
      case LOG_LEVELS.DEBUG:
        console.debug(`${args.shift()}`, color, args);
        break;
      case LOG_LEVELS.INFO:
        console.info(`${args.shift()}`, color, args);
        break;
      case LOG_LEVELS.WARN:
        console.warn(`${args.shift()}`, color, args);
        break;
      case LOG_LEVELS.ERROR:
        console.error(`${args.shift()}`, color, args);
        break;
      default:
        console.log(`${args.shift()}`, color, args);
    }
  }

  _getTimestamp() {
    return new Date().toISOString().replace("T", " ").replace(/\..+/, "");
  }

  _getLevelLabel(level) {
    const labels = {
      [LOG_LEVELS.DEBUG]: "DEBUG",
      [LOG_LEVELS.INFO]: "INFO",
      [LOG_LEVELS.WARN]: "WARN",
      [LOG_LEVELS.ERROR]: "ERROR",
      [LOG_LEVELS.SILENT]: "SILENT",
    };
    return labels[level] || "UNKNOWN";
  }

  _getLevelEmoji(level) {
    const emojis = {
      [LOG_LEVELS.DEBUG]: "🐛",
      [LOG_LEVELS.INFO]: "ℹ️",
      [LOG_LEVELS.WARN]: "⚠️",
      [LOG_LEVELS.ERROR]: "💀",
    };
    return emojis[level] || "📝";
  }

  // Create a closure to maintain style cache and configuration
  _createLevelStyleGenerator = () => {
    // Pre-computed style configurations
    const STYLE_CONFIGS = {
      [LOG_LEVELS.DEBUG]: {
        bg: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
        color: "#93c5fd",
        border: "1px solid #3b82f6",
        glow: "0 0 8px rgba(59, 130, 246, 0.3)",
      },
      [LOG_LEVELS.INFO]: {
        bg: "linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)",
        color: "#f9fafb",
        border: "1px solid #60a5fa",
        glow: "0 0 8px rgba(59, 130, 246, 0.4)",
      },
      [LOG_LEVELS.WARN]: {
        bg: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
        color: "#1f2937",
        border: "1px solid #b45309",
        glow: "0 0 8px rgba(245, 158, 11, 0.4)",
      },
      [LOG_LEVELS.ERROR]: {
        bg: "linear-gradient(135deg, #b91c1c 0%, #ef4444 100%)",
        color: "#fef2f2",
        border: "1px solid #7f1d1d",
        glow: "0 0 8px rgba(239, 68, 68, 0.4)",
      },
    };

    // Cache for generated styles
    const styleCache = new Map();

    // Base style template
    const baseStyle = `
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-family: 'SF Mono', 'Monaco', 'Consolas', 'Roboto Mono', monospace;
    font-weight: 600;
    font-size: 0.75rem;
    padding: 6px 10px;
    border-radius: 8px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    line-height: 1;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    position: relative;
    overflow: hidden;
    transition: all 0.2s ease-in-out;
  `;

    /**
     * Generates CSS style for a given log level
     * @param {string} level - The log level (DEBUG, INFO, WARN, ERROR)
     * @returns {string} The CSS style string
     */
    return (level) => {
      // Return cached style if available
      if (styleCache.has(level)) {
        return styleCache.get(level);
      }

      // Get config for the level or fallback to DEBUG
      const config = STYLE_CONFIGS[level] || STYLE_CONFIGS[LOG_LEVELS.DEBUG];

      // Generate the complete style
      const style = `
      ${baseStyle}
      border: ${config.border};
      background: ${config.bg};
      color: ${config.color};
      box-shadow: ${config.glow}, 0 2px 4px rgba(0, 0, 0, 0.1);
      
      /* Hover effect shimmer */
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        transition: left 0.5s ease-in-out;
      }
      
      &:hover::before {
        left: 100%;
      }
    `
        .replace(/\s+/g, " ")
        .trim();

      // Cache the generated style
      styleCache.set(level, style);

      return style;
    };
  };

  // Create the style generator instance
  getLevelStyle = this._createLevelStyleGenerator();

  // Your main method becomes a simple wrapper
  _getLevelStyle(level) {
    return this.getLevelStyle(level);
  }

  _mergeContext(context) {
    return this.contextStack.reduce(
      (acc, ctx) => ({ ...acc, ...ctx }),
      context
    );
  }

  _fallbackLog(...args) {
    try {
      console.log("[FHAVUR] Fallback:", ...args);
    } catch (e) {
      // Absolute last resort - do nothing
    }
  }

  _sendToAnalytics(level, args, context) {
    if (!this.config.enableAnalytics) return this;

    const event = {
      level: this._getLevelLabel(level),
      message: args
        .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
        .join(" "),
      context,
      timestamp: new Date().toISOString(),
      userAgent: this.isBrowser ? navigator.userAgent : "node",
      url: this.isBrowser ? window.location.href : "server",
    };

    // Google Analytics 4
    if (this.isBrowser && window.gtag) {
      window.gtag("event", "exception", {
        description: event.message,
        fatal: level === LOG_LEVELS.ERROR,
      });
    }

    // Send to backend logging service
    this._sendToBackend(event);
    return this;
  }

  _sendToBackend(event) {
    if (typeof fetch === "undefined") return;

    // Use sendBeacon for better performance in browsers
    if (this.isBrowser && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(event)], {
        type: "application/json",
      });
      navigator.sendBeacon("/api/logs", blob);
    } else {
      // Fallback to fetch with low priority
      fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
        keepalive: true, // Browser support for background requests
      }).catch(() => {
        //Silent fail
      });
    }
  }

  /**
   * Public API methods
   */
  debug(...args) {
    this._log(LOG_LEVELS.DEBUG, args);
    return this;
  }

  info(...args) {
    this._log(LOG_LEVELS.INFO, args);
    return this;
  }

  warn(...args) {
    this._log(LOG_LEVELS.WARN, args);
    return this;
  }

  error(...args) {
    this._log(LOG_LEVELS.ERROR, args);
    return this;
  }

  /**
   * Performance monitoring methods
   */
  time(label) {
    if (!this.config.enablePerformance || !this.shouldLog) return this;

    const mark = `log_${label}_${Date.now()}`;
    // Store performance mark in session storage
    const markData = { mark, startTime: Date.now() };
    sessionStorage.setItem(`perfMark_${label}`, JSON.stringify(markData));
    this.performanceMarks.set(label, markData);

    if (this.isBrowser && performance?.mark) {
      performance.mark(mark);
    }
    this.debug(`⏱️  Started: ${label}`);
    return this;
  }

  timeEnd(label) {
    if (!this.config.enablePerformance || !this.shouldLog) return this;

    let markData = this.performanceMarks.get(label);

    if (!markData) {
      try {
        const raw = sessionStorage.getItem(`perfMark_${label}`);
        if (raw) {
          markData = JSON.parse(raw);
        }
      } catch (e) {
        markData = undefined;
      }
    }
    if (!markData || !markData.startTime) {
      this.warn(`No timer found for label: ${label}`);
      return this;
    }

    const duration = Date.now() - markData.startTime;

    if (this.isBrowser && performance?.measure) {
      performance.measure(`duration_${label}`, markData.mark);
      const entries = performance.getEntriesByName(`duration_${label}`);
      if (entries.length > 0) {
        this.debug(
          `⏱️  Completed: ${label}`,
          `${entries[0].duration.toFixed(2)}ms`
        );
      }
    } else {
      this.debug(`⏱️  Completed: ${label}`, `${duration}ms`);
    }

    // Clean up
    sessionStorage.removeItem(`perfMark_${label}`);
    this.performanceMarks.delete(label);
  }

  /**
   * Context management
   */
  pushContext(context) {
    this.contextStack.push(context);
    return this;
  }

  popContext() {
    this.contextStack.pop();
    return this;
  }

  withContext(context) {
    // Create a proxy-like object that maintains the original logger state
    // but adds context to every log call
    const loggerWithContext = {
      // Store reference to the original logger
      _logger: this,
      _context: context,

      // Log methods with context
      debug: (...args) => {
        this._log(LOG_LEVELS.DEBUG, args, context);
        return loggerWithContext;
      },
      info: (...args) => {
        this._log(LOG_LEVELS.INFO, args, context);
        return loggerWithContext;
      },
      warn: (...args) => {
        this._log(LOG_LEVELS.WARN, args, context);
        return loggerWithContext;
      },
      error: (...args) => {
        this._log(LOG_LEVELS.ERROR, args, context);
        return loggerWithContext;
      },

      // Performance methods
      time: (label) => {
        this.time(label);
        return loggerWithContext;
      },
      timeEnd: (label) => {
        this.timeEnd(label);
        return loggerWithContext;
      },

      // Grouping methods
      group: (label) => {
        this.group(label);
        return loggerWithContext;
      },
      groupEnd: () => {
        this.groupEnd();
        return loggerWithContext;
      },

      // Nested context
      withContext: (additionalContext) => {
        return this.withContext({ ...context, ...additionalContext });
      },

      // Utility methods that return the original logger
      enable: () => {
        this.enable();
        return this; // Return original logger for chaining
      },
      disable: () => {
        this.disable();
        return this;
      },
      setLevel: (level) => {
        this.setLevel(level);
        return this;
      },
      pushContext: (ctx) => {
        this.pushContext(ctx);
        return loggerWithContext;
      },
      popContext: () => {
        this.popContext();
        return loggerWithContext;
      },
    };

    return loggerWithContext;
  }

  /**
   * Grouping methods for better log organization
   */
  group(label) {
    if (this.shouldLog) {
      console.group(
        `%c${this.config.prefix} ${label}`,
        "color: #7c3aed; font-weight: bold;"
      );
    }
    return this;
  }

  groupEnd() {
    if (this.shouldLog) {
      console.groupEnd();
    }
    return this;
  }

  /**
   * Utility methods
   */
  enable() {
    this.shouldLog = true;
    return this;
  }

  disable() {
    this.shouldLog = false;
    return this;
  }

  setLevel(level) {
    this.config = { ...this.config, level: this._parseLogLevel(level) };
    return this;
  }
}

// Create default instance with common configuration
const defaultLogger = new Logger();

// Legacy export for backward compatibility - maintains exact original API
export function _log(...args) {
  defaultLogger.info(...args);
}

// Enhanced default export with full API
export default defaultLogger;

// Named exports for specific use cases
export { LOG_LEVELS, Logger };

// Utility export for quick setup
export const createLogger = (config) => new Logger(config);

// Quick setup for common environments
export const logger = defaultLogger;
