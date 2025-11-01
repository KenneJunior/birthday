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
  level: LOG_LEVELS.DEBUG,
  prefix: "[FHAVUR]",
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
    if (this.isWorker) {
      this._setupWorkerEnvironment();
      return;
    }

    // Fallback for unknown environments
    this.shouldLog = false;
  }

  _setupBrowserEnvironment() {
    const { hostname, origin } = window.location;
    const isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]" ||
      origin.includes("local.");

    // Check multiple debug sources with priority
    const debugSources = [
      window.localStorage?.getItem("FHAVUR_DEBUG"),
      window.sessionStorage?.getItem("FHAVUR_DEBUG"),
      new URLSearchParams(window.location.search).get("debug"),
      window._FHAVUR_DEBUG, // Global variable
    ];

    const debugFlag = debugSources.find(
      (source) => source === "true" || source === "1" || source === "enable"
    );

    this.shouldLog = isLocal || !!debugFlag;

    // Set log level from debug flag or URL parameter
    const levelParam = debugSources.find(
      (source) =>
        source && ["debug", "info", "warn", "error", "silent"].includes(source)
    );

    if (levelParam) {
      this.config = { ...this.config, level: this._parseLogLevel(levelParam) };
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
    return levelMap[level?.toLowerCase()] ?? LOG_LEVELS.DEBUG;
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
      const levelLabel = this._getLevelLabel(level);
      const style = this.config.colors ? this._getLevelStyle(level) : "";

      const formattedArgs = this._formatArguments(args);
      const mergedContext = this._mergeContext(context);

      const logArgs = this._buildLogArguments(
        prefix,
        timestamp,
        levelLabel,
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
      args.push(
        `${style}${prefix}${timestamp ? ` ${timestamp}` : ""} ${levelLabel}`
      );
    } else {
      args.push(`${prefix}${timestamp ? ` ${timestamp}` : ""} ${levelLabel}`);
    }

    args.push(...formattedArgs);

    // Add context if present
    if (Object.keys(context).length > 0) {
      args.push("\n↳ Context:", context);
    }

    return args;
  }

  _writeToConsole(level, args) {
    switch (level) {
      case LOG_LEVELS.DEBUG:
        console.debug(...args);
        break;
      case LOG_LEVELS.INFO:
        console.info(...args);
        break;
      case LOG_LEVELS.WARN:
        console.warn(...args);
        break;
      case LOG_LEVELS.ERROR:
        console.error(...args);
        break;
      default:
        console.log(...args);
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
    };
    return labels[level] || "LOG";
  }

  _getLevelStyle(level) {
    const styles = {
      [LOG_LEVELS.DEBUG]: "color: #6b7280; font-weight: bold;",
      [LOG_LEVELS.INFO]: "color: #2563eb; font-weight: bold;",
      [LOG_LEVELS.WARN]: "color: #d97706; font-weight: bold;",
      [LOG_LEVELS.ERROR]: "color: #dc2626; font-weight: bold;",
    };
    return styles[level] || "color: #6b7280;";
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
    if (!this.config.enableAnalytics) return;

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
    // this._sendToBackend(event);
  }

  /* _sendToBackend(event) {
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
  }*/

  /**
   * Public API methods
   */
  debug(...args) {
    this._log(LOG_LEVELS.DEBUG, args);
  }

  info(...args) {
    this._log(LOG_LEVELS.INFO, args);
  }

  warn(...args) {
    this._log(LOG_LEVELS.WARN, args);
  }

  error(...args) {
    this._log(LOG_LEVELS.ERROR, args);
  }

  /**
   * Performance monitoring methods
   */
  time(label) {
    if (!this.config.enablePerformance || !this.shouldLog) return;

    const mark = `log_${label}_${Date.now()}`;
    // Store performance mark in session storage
    const markData = { mark, startTime: Date.now() };
    sessionStorage.setItem(`perfMark_${label}`, JSON.stringify(markData));
    this.performanceMarks.set(label, markData);

    if (this.isBrowser && performance?.mark) {
      performance.mark(mark);
    }

    this.debug(`⏱️  Started: ${label}`);
  }

  timeEnd(label) {
    if (!this.config.enablePerformance || !this.shouldLog) return;

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
      return;
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
    this.pushContext(context);
    return {
      debug: (...args) => {
        this._log(LOG_LEVELS.DEBUG, args, context);
        this.popContext();
      },
      info: (...args) => {
        this._log(LOG_LEVELS.INFO, args, context);
        this.popContext();
      },
      warn: (...args) => {
        this._log(LOG_LEVELS.WARN, args, context);
        this.popContext();
      },
      error: (...args) => {
        this._log(LOG_LEVELS.ERROR, args, context);
        this.popContext();
      },
      time: (label) => {
        this.time(label);
        this.popContext();
      },
      timeEnd: (label) => {
        this.timeEnd(label);
        this.popContext();
      },
    };
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
