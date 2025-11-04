// Log levels
const LOG_LEVELS = Object.freeze({
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4,
});

// Default configuration
const DEFAULT_CONFIG = Object.freeze({
  level: LOG_LEVELS.INFO,
  prefix: "%c[FHAVUR_SW]",
  enablePerformance: true,
  enableAnalytics: false,
  maxStringLength: 1000,
  timestamp: true,
  colors: true,
});

// Logger class
class Logger {
  constructor(config = {}) {
    this.config = Object.freeze({ ...DEFAULT_CONFIG, ...config });
    this.isBrowser = typeof window !== "undefined";
    this.isNode = typeof process !== "undefined" && process.env;
    this.isWorker = typeof self !== "undefined" && self.location;
    this.performanceMarks = new Map();
    this.contextStack = [];

    this._detectEnvironment();
    this._setDynamicSourcesPriority?.();
    this._enableRemoteControl?.();
    this._setupGlobalErrorHandling();
  }

  _detectEnvironment() {
    if (this.isBrowser) {
      this._setupBrowserEnvironment();
    } else if (this.isNode) {
      this._setupNodeEnvironment();
    } else if (this.isWorker) {
      this._setupWorkerEnvironment();
    } else {
      this.shouldLog = false;
    }
  }

  // Add these helpers (put near other private helpers)
  _setDynamicSourcesPriority() {
    // Precedence: URL param -> localStorage -> existing debug flag -> env detection
    const urlLevel = this._readLevelFromUrl();
    const lsLevel = this._readLevelFromLocalStorage();
    if (urlLevel != null) {
      this._appliedDynamicLevel = urlLevel;
    } else if (lsLevel != null) {
      this._appliedDynamicLevel = lsLevel;
    } else {
      this._appliedDynamicLevel = null; // no dynamic override
    }
    // Immediately apply if present
    if (this._appliedDynamicLevel != null) {
      this.setLevel(this._appliedDynamicLevel, {
        persist: false,
        from: "dynamic-init",
      });
    }
  }

  _readLevelFromUrl() {
    try {
      if (!this.isBrowser) return null;
      const params = new URLSearchParams(window.location.search);
      // accept multiple param names (fh_log, fhavur_log, debug)
      const candidate =
        params.get("fh_log") ?? params.get("fhavur_log") ?? params.get("debug");
      if (!candidate) return null;
      return this._parseLogLevel(candidate);
    } catch {
      return null;
    }
  }

  _readLevelFromLocalStorage() {
    try {
      if (!this.isBrowser) return null;
      const raw = window.localStorage?.getItem("FHAVUR_LOG_LEVEL");
      if (!raw) return null;
      return this._parseLogLevel(raw);
    } catch {
      return null;
    }
  }

  /**
   * Public API: setLevel
   * level = string | number (e.g., 'debug' | LOG_LEVELS.DEBUG | 0)
   * options.persist = true -> save to localStorage
   * options.from = metadata for logging/debugging
   */
  setLevel(level, { persist = false, from = "manual" } = {}) {
    const parsed = this._parseLogLevel(level);
    if (typeof parsed !== "number") return this;

    this.config = Object.freeze({ ...this.config, level: parsed });

    if (persist && this.isBrowser) {
      try {
        window.localStorage.setItem("FHAVUR_LOG_LEVEL", String(level));
      } catch {
        // ignore quota errors
      }
    }

    // Small console notice about the change (non-verbose)
    if (this.shouldLog) {
      const label = this._getLevelLabel(parsed);
      const msg = `[FHAVUR] log level set -> ${label} (${parsed})${
        from ? ` via ${from}` : ""
      }`;
      if (this.config.colors && this.isBrowser) {
        console.info(`%c${msg}`, "color:#10b981; font-weight:600;");
      } else {
        console.info(msg);
      }
    }

    return this;
  }

  getLevel() {
    return this.config.level;
  }

  /**
   * Enable runtime remote control:
   * - window.addEventListener('message') for same-origin control messages
   * - window.addEventListener('storage') to react to localStorage changes from other tabs
   * Messages should be { type: 'FHAVUR_LOG_LEVEL', level: 'warn' }
   */
  _enableRemoteControl() {
    if (!this.isBrowser) return;

    // Listen for postMessage from same origin
    window.addEventListener("message", (ev) => {
      try {
        // Optional: check origin (ev.origin) if you only trust certain origins
        const data = ev.data;
        if (!data || data.type !== "FHAVUR_LOG_LEVEL") return;
        const parsed = this._parseLogLevel(data.level);
        if (parsed == null) return;
        this.setLevel(parsed, { persist: !!data.persist, from: "postMessage" });
      } catch {
        // ignore
      }
    });

    // Listen for localStorage changes in other tabs/windows
    window.addEventListener("storage", (ev) => {
      try {
        if (ev.key !== "FHAVUR_LOG_LEVEL") return;
        const newLevel = ev.newValue;
        const parsed = this._parseLogLevel(newLevel);
        if (parsed == null) return;
        this.setLevel(parsed, { persist: false, from: "storage-event" });
      } catch {
        // ignore
      }
    });
  }

  _setupBrowserEnvironment() {
    const { hostname, origin } = window.location;
    const isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      origin.includes("local.");
    const debugSources = [
      window.localStorage?.getItem("FHAVUR_DEBUG"),
      new URLSearchParams(window.location.search).get("debug"),
    ];
    const debugFlag = debugSources.find(
      (source) => source === "true" || source === "1"
    );
    this.shouldLog = isLocal || !!debugFlag;
  }

  _setupNodeEnvironment() {
    this.shouldLog = !!process.env.DEBUG || !!process.env.FHAVUR_DEBUG;
  }

  _setupWorkerEnvironment() {
    try {
      const origin = self.location?.origin || "";
      const hostname = self.location?.hostname || "";
      const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
      this.shouldLog = isLocal;
    } catch (error) {
      this.shouldLog = false;
    }
  }

  _setupGlobalErrorHandling() {
    if (!this.shouldLog || this.config.level > LOG_LEVELS.ERROR) return;

    if (this.isBrowser) {
      window.addEventListener("error", (event) => {
        this.error("Uncaught error", event.error);
      });
      window.addEventListener("unhandledrejection", (event) => {
        this.error("Unhandled promise rejection", event.reason);
      });
    }
  }

  _log(level, args, context = {}) {
    if (!this.shouldLog || level < this.config.level) return;

    try {
      const timestamp = this.config.timestamp ? this._getTimestamp() : "";
      const prefix = this.config.prefix;
      const levelLabel = this._getLevelLabel(level);
      const style = this.config.colors ? this._getLevelStyle(level) : "";

      // Merge context from stack and current context
      const mergedContext = this._mergeContext(context);
      const formattedArgs = this._formatArguments(args, mergedContext);

      if (this.config.colors) {
        console.log(
          `${prefix} ${timestamp} ${levelLabel}`,
          style,
          ...formattedArgs
        );
      } else {
        console.log(`${prefix} ${timestamp} ${levelLabel}`, ...formattedArgs);
      }
    } catch (error) {
      this._fallbackLog(...args);
    }
  }

  _formatArguments(args, context = {}) {
    const formatted = args.map((arg) => {
      if (typeof arg === "string" && arg.length > this.config.maxStringLength) {
        return arg.substring(0, this.config.maxStringLength) + "...";
      }
      if (arg instanceof Error) {
        return {
          name: arg.name,
          message: arg.message,
          stack: this.config.level === LOG_LEVELS.DEBUG ? arg.stack : undefined,
        };
      }
      if (typeof arg === "object" && arg !== null) {
        try {
          return JSON.parse(JSON.stringify(arg));
        } catch (e) {
          return `[Object: ${e.message}]`;
        }
      }
      return arg;
    });

    // Add context if present
    if (Object.keys(context).length > 0) {
      formatted.push({ context });
    }

    return formatted;
  }

  _mergeContext(context) {
    return this.contextStack.reduce(
      (acc, ctx) => ({ ...acc, ...ctx }),
      context
    );
  }

  _getTimestamp() {
    return new Date().toISOString().replace("T", " ").split(".")[0];
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

  _getLevelStyle(level) {
    const baseStyle = `
    display: inline-block;
    font-family: monospace;
    font-weight: 600;
    padding: 4px 8px;
    border-radius: 6px;
    letter-spacing: 0.5px;
    box-shadow: 0 0 4px rgba(0,0,0,0.25);
  `;
    const styles = {
      [LOG_LEVELS.DEBUG]: `
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          color: #93c5fd;
          border: 1px solid #3b82f6;
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: bold;
        `,
      [LOG_LEVELS.INFO]: `
          background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
          color: #f9fafb;
          border: 1px solid #60a5fa;
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: bold;
        `,
      [LOG_LEVELS.WARN]: `
          background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
          color: #1f2937;
          border: 1px solid #b45309;
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: bold;
        `,
      [LOG_LEVELS.ERROR]: `
          background: linear-gradient(135deg, #b91c1c 0%, #ef4444 100%);
          color: #fef2f2;
          border: 1px solid #7f1d1d;
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: bold;
        `,
    };
    const emojis = {
      [LOG_LEVELS.DEBUG]: "🪲",
      [LOG_LEVELS.INFO]: "ℹ️",
      [LOG_LEVELS.WARN]: "⚠️",
      [LOG_LEVELS.ERROR]: "💀",
    };
    return `${baseStyle} ${
      styles[level] || styles[LOG_LEVELS.DEBUG]
    } content: "${emojis[level] || ""} ";`
      .replace(/\s+/g, " ")
      .trim();
  }

  _fallbackLog(...args) {
    try {
      console.log("[FHAVUR] Fallback:", ...args);
    } catch (e) {
      // Silent fail
    }
  }

  // Public API
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

  // Context management
  pushContext(context) {
    this.contextStack.push(context);
    return this;
  }

  popContext() {
    this.contextStack.pop();
    return this;
  }

  // FIXED: withContext now returns a new Logger instance with the context
  withContext(context) {
    // Create a new logger instance with the same config
    const loggerWithContext = new Logger(this.config);

    // Copy over the environment detection
    loggerWithContext.shouldLog = this.shouldLog;
    loggerWithContext.isBrowser = this.isBrowser;
    loggerWithContext.isNode = this.isNode;
    loggerWithContext.isWorker = this.isWorker;

    // Copy the existing context stack and add the new context
    loggerWithContext.contextStack = [...this.contextStack, context];

    return loggerWithContext;
  }

  // Performance monitoring methods
  time(label) {
    if (!this.config.enablePerformance || !this.shouldLog) return this;

    const mark = `log_${label}_${Date.now()}`;
    this.performanceMarks.set(label, { mark, startTime: Date.now() });

    if (this.isBrowser && performance?.mark) {
      performance.mark(mark);
    }

    this.debug(`⏱️  Started: ${label}`);
    return this;
  }

  timeEnd(label) {
    if (!this.config.enablePerformance || !this.shouldLog) return this;

    const markData = this.performanceMarks.get(label);
    if (!markData) {
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

    this.performanceMarks.delete(label);
    return this;
  }

  // Grouping methods
  group(label) {
    if (this.shouldLog) {
      if (this.config.colors && this.isBrowser) {
        console.group(
          `%c${this.config.prefix.replace("%c", "")} ${label}`,
          "color: #7c3aed; font-weight: bold;"
        );
      } else {
        console.group(`${this.config.prefix.replace("%c", "")} ${label}`);
      }
    }
    return this;
  }

  groupEnd() {
    if (this.shouldLog) {
      console.groupEnd();
    }
    return this;
  }
}

// Global exports
(self || window).Logger = Logger;
(self || window).LOG_LEVELS = LOG_LEVELS;
(self || window).logger = new Logger();
(self || window).createLogger = (config) => new Logger(config);

// Legacy _log function for backward compatibility
(self || window)._log = function (...args) {
  (self || window).logger.info(...args);
};
