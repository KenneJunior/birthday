const isBrowser = typeof window !== "undefined";
const isNode = typeof process !== "undefined" && process.versions?.node;

const getDeviceType = () => {
  if (!isBrowser) return "server";
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
};

const getBrowserInfo = () => {
  if (!isBrowser) return { browser: "node", version: process.versions?.node };

  const ua = navigator.userAgent;
  let browser = "unknown";
  let version = "unknown";

  // Detect browser
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Chrome";
  else if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Edg")) browser = "Edge";

  // Extract version (simplified)
  const versionMatch = ua.match(/(Chrome|Firefox|Safari|Edg)\/([0-9.]+)/);
  if (versionMatch) version = versionMatch[2];

  return { browser, version };
};

const getPageContext = () => {
  if (!isBrowser) return { url: "server-environment", hostname: "server" };

  return {
    url: window.location.href,
    pathname: window.location.pathname,
    hostname: window.location.hostname,
    protocol: window.location.protocol,
    search: window.location.search,
    hash: window.location.hash,
    referrer: document.referrer || "none",
  };
};

const getPerformanceContext = () => {
  if (!isBrowser) return { timing: null, navigation: null };

  const perf = performance.timing;
  return {
    navigation: performance.getEntriesByType("navigation")[0] || {},
    timing: perf
      ? {
          domContentLoaded:
            perf.domContentLoadedEventEnd - perf.navigationStart,
          loadComplete: perf.loadEventEnd - perf.navigationStart,
          dnsLookup: perf.domainLookupEnd - perf.domainLookupStart,
          tcp: perf.connectEnd - perf.connectStart,
          ttfb: perf.responseStart - perf.requestStart,
        }
      : null,
  };
};

const getNetworkInfo = () => {
  if (!isBrowser) return null;

  return navigator.connection
    ? {
        type: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData,
        downlinkMax: navigator.connection.downlinkMax,
      }
    : null;
};

const getPWAInfo = () => {
  if (!isBrowser)
    return {
      isInstalled: false,
      hasServiceWorker: false,
      isOnline: true,
      storage: {
        localStorage: false,
        sessionStorage: false,
        indexedDB: false,
        cacheStorage: false,
      },
    };

  return {
    isInstalled: window.matchMedia("(display-mode: standalone)").matches,
    hasServiceWorker: "serviceWorker" in navigator,
    isOnline: navigator.onLine,
    storage: {
      localStorage: !!window.localStorage,
      sessionStorage: !!window.sessionStorage,
      indexedDB: !!window.indexedDB,
      cacheStorage: !!window.caches,
      estimate: "storage" in navigator ? "available" : "unavailable",
    },
  };
};

const getServiceWorkerInfo = () => {
  if (!isBrowser)
    return { status: "none", scope: "none", ready: "unavailable" };

  return {
    status: navigator.serviceWorker?.controller ? "active" : "none",
    scope: navigator.serviceWorker?.controller?.scriptURL || "none",
    ready: navigator.serviceWorker?.ready ? "available" : "unavailable",
  };
};

const getBrowserContext = () => {
  if (!isBrowser)
    return {
      browser: { browser: "node", version: process.versions?.node },
      userAgent: "node.js",
      language: "en",
      platform: process.platform,
      cookieEnabled: false,
      javaEnabled: false,
    };

  return {
    ...getBrowserInfo(),
    userAgent: navigator.userAgent,
    language: navigator.language,
    languages: navigator.languages,
    platform: navigator.platform,
    cookieEnabled: navigator.cookieEnabled,
    javaEnabled: navigator.javaEnabled?.() || false,
  };
};

const getDeviceContext = () => {
  if (!isBrowser)
    return {
      type: "server",
      touch: false,
      cores: "unknown",
      memory: "unknown",
      screen: { width: 0, height: 0, colorDepth: 0, pixelDepth: 0 },
      viewport: { width: 0, height: 0 },
    };

  return {
    type: getDeviceType(),
    touch: "ontouchstart" in window,
    cores: navigator.hardwareConcurrency || "unknown",
    memory: navigator.deviceMemory || "unknown",
    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };
};
export {
  getBrowserContext,
  getBrowserInfo,
  getDeviceContext,
  getDeviceType,
  getNetworkInfo,
  getPageContext,
  getPerformanceContext,
  getPWAInfo,
  getServiceWorkerInfo,
  isBrowser,
  isNode,
};
