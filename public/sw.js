importScripts("/src/js/utility/logger-global.js");

const logger = self.logger;
const CACHE_VERSION = "v1.3.26";
const STATIC_CACHE = `fhavur-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `fhavur-dynamic-${CACHE_VERSION}`;

// Create a specialized logger for Service Worker with custom context
const swLogger = logger.withContext({
  module: "ServiceWorker",
  cacheVersion: CACHE_VERSION,
  scope: self.registration?.scope || "unknown",
});

// External CDN domains to cache
const EXTERNAL_CDNS = [
  "cdnjs.cloudflare.com",
  "cdn.jsdelivr.net",
  "unpkg.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "use.fontawesome.com",
  "cdn.jsdelivr.net",
  "code.jquery.com",
  "maxcdn.bootstrapcdn.com",
];

// Common external library patterns
const EXTERNAL_LIBRARIES = [
  // Bootstrap 5
  /bootstrap.*\.min\.(css|js)/i,

  // Font Awesome 6.4.0
  // awesome-free
  /fontawesome|font-awesome|all\.min\.(css|js)/i,

  // Animate.css
  /animate(\.min)?\.css/i,

  // Hammer.js
  /hammer(\.min)?\.js/i,
  // Google Fonts
  /fonts\.googleapis\.com/i,
  /fonts\.gstatic\.com/i,
];

// Base URLs to cache - adjusted for Vercel (no /public/)
const ESSENTIAL_URLS = [
  "/offline.html",
  "/",
  "/index.html",
  "/fhavur.html",
  "/fhavur/confession.html",
  "/fhavur/missus/fhav.html",
  "/manifest.webmanifest",
  "/gallery-data.json",
  // Audio
  "/pics/img1.jpg",
  "/pics/img2.jpg",
  "/pics/img3.jpg",
  "/pics/img4.jpg",
  "/pics/img5.jpg",
  "/pics/profile_pic.jpg",
  "/pics/tat.jpg",
  "/auth_config.json",
  "/gallery-data.json",
  "/screenshot.svg",
];

// File extensions to cache dynamically
const CACHEABLE_EXTENSIONS = [
  ".html",
  ".css",
  ".js",
  ".json",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".svg",
  ".webp",
  ".ico",
  ".mp3",
  ".webm",
  ".ogg",
  ".wav",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".txt",
  ".xml",
  ".webmanifest",
];

// Directories to exclude from caching when in dev mode
const EXCLUDED_DIRS = [
  "/node_modules",
  "/.vscode",
  "/.github",
  "/.idea",
  "/.git",
  "/test",
  "/tests",
  "/spec",
  "/coverage",
  "/build",
  "/src/scripts",
  "/src/utils",
];

const STATIC_CACHE_LIMIT = 250; // Max number of items in dynamic cache
function safeURL(urlStr) {
  try {
    return new URL(urlStr, self.location.origin); // Use self.location.origin for relative URLs
  } catch (e) {
    swLogger.warn("Invalid URL encountered", { url: urlStr, error: e.message });
    return null;
  }
}

function isExternalHost(hostname) {
  const isExternal = EXTERNAL_CDNS.includes(hostname);
  if (isExternal) {
    swLogger.debug("Detected external CDN host", { hostname });
  }
  return isExternal;
}

function matchesExternalLibrary(urlStr) {
  for (const rx of EXTERNAL_LIBRARIES) {
    if (rx.test(urlStr)) {
      swLogger.debug("Matched external library pattern", {
        url: urlStr,
        pattern: rx.toString(),
      });
      return true;
    }
  }
  return false;
}

// Check if URL should be cached (including external libraries)
function shouldCache(urlStr) {
  const urlObj = safeURL(urlStr);
  if (!urlObj) {
    swLogger.debug("URL validation failed - skipping cache", { url: urlStr });
    return false;
  }

  const pathname = urlObj.pathname;
  const hostname = urlObj.hostname;

  // Skip data/blob URLs
  if (urlStr.startsWith("data:") || urlStr.startsWith("blob:")) {
    swLogger.debug("Skipping data/blob URL", { url: urlStr });
    return false;
  }

  // Allow caching of well-known CDNs and libraries
  if (isExternalHost(hostname) || matchesExternalLibrary(urlStr)) {
    swLogger.debug("Approved for caching: external resource", {
      url: urlStr,
      hostname,
      type: "external",
    });
    return true;
  }

  // Skip non-origin URLs not in CDN list
  if (urlObj.origin !== self.location.origin && !isExternalHost(hostname)) {
    swLogger.debug("Skipping cross-origin URL not in CDN list", {
      url: urlStr,
      origin: urlObj.origin,
    });
    return false;
  }

  // Check excluded directories
  for (const dir of EXCLUDED_DIRS) {
    if (pathname.includes(dir)) {
      swLogger.debug("Skipping excluded directory", {
        url: urlStr,
        directory: dir,
      });
      return false;
    }
  }

  // Skip API/auth
  if (pathname.includes("/api/") || pathname.includes("/auth/")) {
    swLogger.debug("Skipping API/auth endpoint", { url: urlStr });
    return false;
  }

  // Cache root/HTML
  if (pathname === "/" || pathname.endsWith(".html")) {
    swLogger.debug("Approved for caching: HTML document", {
      url: urlStr,
      type: "html",
    });
    return true;
  }

  // Cache by extension
  for (const ext of CACHEABLE_EXTENSIONS) {
    if (pathname.toLowerCase().endsWith(ext)) {
      swLogger.debug("Approved for caching: file extension", {
        url: urlStr,
        extension: ext,
        type: "static",
      });
      return true;
    }
  }

  swLogger.debug("Resource not approved for caching", {
    url: urlStr,
    reason: "no_matching_criteria",
  });
  return false;
}

// Install event: Cache essential files
self.addEventListener("install", (event) => {
  swLogger.info("🛠 Service Worker installation started", {
    cacheVersion: CACHE_VERSION,
    essentialUrlsCount: ESSENTIAL_URLS.length,
  });

  event.waitUntil(
    cacheEssentialResources()
      .then(() => {
        swLogger.info("✅ Service Worker installed successfully", {
          staticCache: STATIC_CACHE,
          dynamicCache: DYNAMIC_CACHE,
        });
        return self.skipWaiting();
      })
      .catch((err) => {
        swLogger.error("❌ Service Worker installation failed", {
          error: err.message,
          stack: err.stack,
        });
        return self.skipWaiting();
      })
  );
});

// Smart caching of essential resources
async function cacheEssentialResources() {
  swLogger.time("EssentialResourcesCaching");

  try {
    const cache = await caches.open(STATIC_CACHE);
    swLogger.debug("Opened static cache for essential resources", {
      cache: STATIC_CACHE,
    });

    const essentialUrls = ESSENTIAL_URLS.map(
      (u) => new Request(u, { credentials: "same-origin" })
    );

    swLogger.debug("Starting cache population", {
      totalUrls: essentialUrls.length,
      urls: ESSENTIAL_URLS,
    });

    const results = await Promise.allSettled(
      essentialUrls.map((req) =>
        cache.add(req).catch((err) => {
          swLogger.warn("Failed to cache essential resource", {
            url: req.url,
            error: err.message,
          });
          return null;
        })
      )
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    swLogger.info("Essential resources caching completed", {
      successful,
      failed,
      total: essentialUrls.length,
      successRate: `${((successful / essentialUrls.length) * 100).toFixed(1)}%`,
    });

    // Log individual failures for debugging
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        swLogger.debug("Individual cache failure details", {
          url: essentialUrls[index].url,
          error: result.reason.message,
        });
      }
    });
  } catch (error) {
    swLogger.error("Critical failure in essential resources caching", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  } finally {
    swLogger.timeEnd("EssentialResourcesCaching");
  }
}

// Fetch event: Handle both development and production paths
// Fetch event: Handle both development and production paths
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    swLogger.debug("Skipping non-GET request", {
      method: event.request.method,
      url: event.request.url,
    });
    return;
  }

  const fetchLogger = swLogger.withContext({
    requestId: generateRequestId(),
    url: event.request.url,
    mode: event.request.mode,
  });

  fetchLogger.debug("Fetch event intercepted");
  event.respondWith(handleFetchStrategies(event.request, fetchLogger));
});

// Generate unique request ID for tracking
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

//handles the different fetch strategies depending on the file
function handleFetchStrategies(request, logger = swLogger) {
  const strategyLogger = logger.withContext({ phase: "strategy_selection" });
  strategyLogger.debug("Determining fetch strategy for request", {
    url: request.url,
    mode: request.mode,
  });
  // We check both request.mode === "navigate" and the Accept header for "text/html"
  // because some browsers (especially Safari) may not set mode to "navigate" for navigation requests,
  // but will include "text/html" in the Accept header for HTML page loads.
  const isNavigation =
    request.mode === "navigate" ||
    request.headers.get("accept")?.includes("text/html");

  if (isNavigation) {
    strategyLogger.debug("Selected HTML documents strategy", {
      strategy: "htmlDocuments",
      reason: "navigation_request",
    });
    return htmlDocumentsStrategy(request, strategyLogger);
  }

  const urlStr = request.url;

  // If not cacheable, fall back to network fetch
  if (!shouldCache(urlStr)) {
    strategyLogger.debug("Selected network-only strategy", {
      strategy: "networkOnly",
      reason: "not_cacheable",
    });
    return fetch(request);
  }

  const urlObj = safeURL(urlStr);
  if (!urlObj) {
    strategyLogger.debug("Selected network-only strategy", {
      strategy: "networkOnly",
      reason: "invalid_url",
    });
    return fetch(request);
  }

  const isExternal = urlObj.origin !== self.location.origin;
  const pathname = urlObj.pathname;

  // Route to appropriate strategy based on file type
  if (/\.(jpg|jpeg|png|gif|svg|mp3|webm|woff|woff2|ttf)$/i.test(pathname)) {
    strategyLogger.debug("Selected static assets strategy", {
      strategy: "staticAssets",
      type: "media/font",
      isExternal,
    });
    return staticAssetsStrategy(request, isExternal, strategyLogger);
  }

  if (/\.css$/.test(pathname) || isExternal) {
    strategyLogger.debug("Selected CSS/external strategy", {
      strategy: "cssAndExternal",
      type: isExternal ? "external" : "css",
      isExternal,
    });
    return cssAndExternalStrategy(request, isExternal, strategyLogger);
  }

  if (pathname === "/" || /\.html$/.test(pathname)) {
    strategyLogger.debug("Selected HTML documents strategy", {
      strategy: "htmlDocuments",
      type: "html",
      isExternal: false,
    });
    return htmlDocumentsStrategy(request, strategyLogger);
  }

  strategyLogger.debug("Selected stale-while-revalidate strategy", {
    strategy: "staleWhileRevalidate",
    type: "other",
    isExternal,
  });
  return staleWhileRevalidateStrategy(request, isExternal, strategyLogger);
}

// Strategy for static assets (images, fonts, media) it first check if the image is in the cache then uses the network as a fallback
async function staticAssetsStrategy(
  request,
  isExternal = false,
  logger = swLogger
) {
  const strategyLogger = logger.withContext({
    strategy: "staticAssets",
    isExternal,
    destination: request.destination,
  });

  const cacheName = isExternal ? DYNAMIC_CACHE : STATIC_CACHE;

  strategyLogger.time("StaticAssetFetch");
  strategyLogger.debug("Starting static asset strategy", {
    cache: cacheName,
    url: request.url,
  });

  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      strategyLogger.debug("🖼 Serving static asset from cache", {
        url: request.url,
        cache: cacheName,
        status: "cache_hit",
      });
      return cachedResponse;
    }

    strategyLogger.debug("Cache miss - fetching from network", {
      url: request.url,
    });
    const networkResponse = await fetch(request);

    if (
      networkResponse &&
      (networkResponse.ok || networkResponse.type === "opaque")
    ) {
      try {
        const cache = await caches.open(cacheName);
        await cache.put(request, networkResponse.clone());

        strategyLogger.debug("💾 Cached static asset", {
          url: request.url,
          cache: cacheName,
          status: networkResponse.status,
          size: networkResponse.headers.get("content-length") || "unknown",
        });

        // Trim cache if needed (only for static cache)
        if (cacheName === STATIC_CACHE) {
          eventWaitFor(trimStaticCache());
        }
      } catch (err) {
        strategyLogger.warn("Failed to cache static asset", {
          url: request.url,
          error: err.message,
        });
      }
    } else {
      strategyLogger.debug("Network response not suitable for caching", {
        url: request.url,
        status: networkResponse?.status,
        ok: networkResponse?.ok,
      });
    }

    strategyLogger.debug("Returning network response", {
      url: request.url,
      status: networkResponse.status,
    });
    return networkResponse;
  } catch (error) {
    strategyLogger.info("🌐 Offline - static asset not available", {
      url: request.url,
      error: error.message,
      status: "offline_fallback",
    });

    // Placeholder for images
    if (
      request.destination === "image" ||
      request.url.match(/\.(jpg|jpeg|png|gif|svg|webp|mp4)$/i)
    ) {
      strategyLogger.debug("Returning SVG placeholder for image", {
        url: request.url,
      });
      return createImagePlaceholder(request.url, strategyLogger);
    }

    strategyLogger.debug("Returning generic offline response");
    return new Response("Resource not available offline", {
      status: 408,
      headers: { "Content-Type": "text/plain" },
    });
  } finally {
    strategyLogger.timeEnd("StaticAssetFetch");
  }
}
function createImagePlaceholder(requestedUrl, logger = swLogger) {
  logger.debug("Generating SVG placeholder", { requestedUrl });
  return new Response(
    '<?xml version="1.0" encoding="utf-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="7.839 6.257 484.323 487.486" width="484.323px" height="487.486px" xmlns:bx="https://boxy-svg.com">  <defs>    <radialGradient gradientUnits="userSpaceOnUse" cx="249.57" cy="249.141" r="242.161" id="gradient-0" gradientTransform="matrix(1, 0, 0, 0.997685, 0.424977, 1.43839)">      <stop offset="0" style="stop-color: rgb(94.118% 95.686% 97.255%)"/>      <stop offset="1" style="stop-color: rgb(53.026% 54.447% 55.859%)"/>    </radialGradient>    <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">      <stop offset="0" stop-color="#a0aec0"/>      <stop offset="1" stop-color="#718096"/>    </linearGradient>    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%" bx:pinned="true">      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#2d3748" flood-opacity="0.1"/>    </filter>    <radialGradient gradientUnits="userSpaceOnUse" cx="413.078" cy="112.881" r="36.857" id="gradient-5">      <stop offset="0" style="stop-color: rgb(15.686% 18.824% 13.725%)"/>      <stop offset="1" style="stop-color: rgb(9.6406% 12.62% 7.7855%)"/>    </radialGradient>    <linearGradient gradientUnits="userSpaceOnUse" x1="413.078" y1="76.168" x2="413.078" y2="149.594" id="gradient-1">      <stop offset="0" style="stop-color: rgb(100% 100% 100%)"/>      <stop offset="1" style="stop-color: rgb(56.687% 56.687% 56.687%)"/>    </linearGradient>    <radialGradient gradientUnits="userSpaceOnUse" cx="449.146" cy="190.199" r="32.641" id="gradient-6">      <stop offset="0" style="stop-color: rgb(15.686% 18.824% 13.725%)"/>      <stop offset="1" style="stop-color: rgb(9.6406% 12.62% 7.7855%)"/>    </radialGradient>    <linearGradient gradientUnits="userSpaceOnUse" x1="449.146" y1="157.557" x2="449.146" y2="222.841" id="gradient-2">      <stop offset="0" style="stop-color: rgb(100% 100% 100%)"/>      <stop offset="1" style="stop-color: rgb(56.687% 56.687% 56.687%)"/>    </linearGradient>    <radialGradient gradientUnits="userSpaceOnUse" cx="451.764" cy="191.322" r="6.363" id="gradient-8">      <stop offset="0" style="stop-color: rgb(15.686% 18.824% 13.725%)"/>      <stop offset="1" style="stop-color: rgb(9.6406% 12.62% 7.7855%)"/>    </radialGradient>    <radialGradient gradientUnits="userSpaceOnUse" cx="451.772" cy="191.521" r="6.352" id="gradient-7">      <stop offset="0" style="stop-color: rgb(15.686% 18.824% 13.725%)"/>      <stop offset="1" style="stop-color: rgb(9.6406% 12.62% 7.7855%)"/>    </radialGradient>  </defs>  <rect width="484.323" height="487.486" rx="12" x="7.839" y="6.257" style="stroke-width: 1; fill: url(&quot;#gradient-0&quot;); stroke: rgb(255, 255, 255);" transform="matrix(1, 0, 0, 1, 0, -2.842170943040401e-14)"/>  <g style="" transform="matrix(1.3644310235977173, 0, 0, 1.3247020244598389, -117.39156341552734, -64.29676818847656)">    <rect x="156.343" y="148.866" width="225.456" height="186.008" rx="8" stroke="url(#iconGradient)" stroke-width="2" filter="url(#shadow)" style="stroke-width: 4.58;" fill="white"/>    <circle cx="261.147" cy="292.749" r="20" filter="url(#shadow)" style="stroke-width: 1;" fill="url(#iconGradient)" transform="matrix(2.254561, 0, 0, 2.325094, -319.700867, -438.798676)"/>    <circle cx="261.147" cy="292.749" r="12" style="stroke-width: 1;" fill="white" transform="matrix(2.254561, 0, 0, 2.325094, -319.700867, -438.798676)"/>    <circle cx="261.147" cy="292.749" r="6" style="stroke-width: 1;" fill="url(#iconGradient)" transform="matrix(2.254561, 0, 0, 2.325094, -319.700867, -438.798676)"/>    <circle cx="263.147" cy="290.749" r="2" style="stroke-width: 1;" fill="white" transform="matrix(2.254561, 0, 0, 2.325094, -319.700867, -438.798676)"/>    <rect x="336.708" y="160.492" width="27.055" height="18.601" rx="2" stroke="url(#iconGradient)" stroke-width="1" style="stroke-width: 2.29;" fill="white"/>    <rect x="161.567" y="122.921" width="42.445" height="21.762" rx="3.8" style="stroke-width: 2.29;" fill="url(#iconGradient)" ry="3.8"/>    <circle cx="201.147" cy="242.749" r="3" opacity="0.6" style="stroke-width: 1;" fill="#cbd5e0" transform="matrix(2.254561, 0, 0, 2.325094, -319.700867, -438.798676)"/>    <circle cx="331.147" cy="362.749" r="4" opacity="0.4" style="stroke-width: 1;" fill="#cbd5e0" transform="matrix(2.254561, 0, 0, 2.325094, -319.700867, -438.798676)"/>    <circle cx="191.147" cy="362.749" r="2" opacity="0.8" style="stroke-width: 1;" fill="#cbd5e0" transform="matrix(2.254561, 0, 0, 2.325094, -319.700867, -438.798676)"/>    <g class="search-lens" transform="matrix(1, 0, 0, 1, -40.349533, 117.454277)">      <g>        <ellipse style="stroke-width: 2px; paint-order: fill; fill-opacity: 0.54; fill: url(&quot;#gradient-5&quot;); stroke: url(&quot;#gradient-1&quot;);" cx="413.078" cy="112.881" rx="36.857" ry="36.713"/>        <g transform="matrix(1, 0, 0, 1, -36.112709, -77.01033)">          <ellipse style="stroke-width: 3px; paint-order: fill; fill-opacity: 0.54; fill: url(&quot;#gradient-6&quot;); stroke: url(&quot;#gradient-2&quot;);" cx="449.146" cy="190.199" rx="32.641" ry="32.642"/>          <line x1="445.401" y1="197.045" x2="458.128" y2="185.598" stroke-linecap="round" style="stroke-width: 3.304; paint-order: fill; fill-opacity: 0.54; fill: url(&quot;#gradient-8&quot;); stroke: rgb(255, 0, 0);" stroke-width="3"/>          <line x1="445.421" y1="185.465" x2="458.124" y2="197.577" style="stroke-width: 3.304; paint-order: fill; fill-opacity: 0.54; fill: url(&quot;#gradient-7&quot;); stroke: rgb(255, 0, 0);" stroke-linecap="round" stroke-width="3"/>        </g>      </g>      <g>        <g transform="matrix(1, 0, 0, 1, -14.519196, -9.011914)">          <path style="fill: rgb(216, 216, 216); stroke: rgb(255, 255, 255);" d="M 446.312 166.037 L 465.154 209.037 C 473.652 220.722 480.997 208.899 475.944 201.951 C 476.08 202.155 454.419 165.557 452.271 162.334 C 452.995 161.755 449.542 163.453 446.312 166.037 Z"/>          <path style="fill: rgb(255, 255, 255); stroke: rgb(255, 255, 255);" d="M 464.403 185.427 C 464.403 185.427 458.7182842939155 174.29064888872125 457.383 174.088 C 456.9741300273071 174.02594801153938 456.5273047611273 174.3778413755773 456.439 174.908 C 455.98774470872866 177.6172184093988 470.09997854961273 202.0670453871027 472.819 203.156 C 473.3794567094103 203.3804601339775 473.99681946687895 203.1388112399605 474.151 202.768 C 474.49849042670036 201.93226961698215 472.09269942364574 198.93752014651804 470.777 196.581 C 469.0005793171643 193.39929219306495 464.403 185.427 464.403 185.427 C 464.4030000000001 185.427 464.403 185.427 464.403 185.427" bx:d="M 464.403 185.427 R 457.383 174.088 R 456.439 174.908 R 472.819 203.156 R 474.151 202.768 R 470.777 196.581 R 464.403 185.427 Z 1@248e2666"/>        </g>        <path style="fill: rgb(216, 216, 216); stroke: rgb(255, 255, 255);" d="M 436.052 162.982 L 428.11 147.654 L 432.499 145.633 L 439.327 160.474 L 436.052 162.982 Z"/>      </g>      <animateMotion path="M 0 0 C -41.586 77.942 -124.327 7.975 -109.571 -28.637 C -107.042 -34.912 -104.47 -47.993 -93.718 -60.37 C -86.123 -69.114 -72.716 -76.492 -63.327 -78.425 C -56.013 -79.931 -37.855 -80.994 -24.956 -76.079 C -12.033 -71.156 1.545 -57.704 3.575 -45.421 C 7.037 -24.479 -1.311 0.819 0.636 -0.415" calcMode="linear" dur="10s" fill="freeze" repeatCount="indefinite"/>    </g>    <text style="fill: rgb(51, 51, 51); font-family: Z003; font-size: 28px; white-space: pre;" transform="matrix(0.70499, 0, 0, 0.799358, 80.195114, -136.254395)"><tspan x="120.51" y="380.546">OOPS... </tspan><tspan x="120.51" dy="1em">​</tspan><tspan>image not found</tspan></text>  </g>  <text x="100" y="160" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#718096" font-weight="bold" style="white-space: pre; stroke-width: 1; font-size: 12px;" transform="matrix(1, 0, 0, 0.8396480083465576, 211.92367553710938, 139.29336547851562)"/>  <path d="M 441.628 29.489 C 445.977 29.488 456.184 30.965 459.763 34.754 C 463.174 38.365 464.306 46.786 463.273 51.134 C 462.381 54.888 458.874 58.249 455.668 59.909 C 452.446 61.577 447.775 62.131 443.968 61.079 C 439.76 59.915 433.881 56.074 431.683 52.304 C 429.618 48.76 429.723 42.998 430.513 39.434 C 431.195 36.359 433.198 33.486 435.193 31.829 C 436.987 30.339 438.73 29.489 441.628 29.489 Z" style="stroke: rgb(183, 183, 183); fill: rgb(184, 184, 184); stroke-width: 1;" transform="matrix(1, 0, 0, 1, 0, -2.842170943040401e-14)"/></svg>',
    {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "no-cache",
      },
    }
  );
}

// Special strategy for CSS and external resources it first of all check if the css or external file is in the cache then uses the network as a fallback
async function cssAndExternalStrategy(
  request,
  isExternal = false,
  logger = swLogger
) {
  const strategyLogger = logger.withContext({
    strategy: "cssAndExternal",
    isExternal,
    type: request.url.endsWith(".css") ? "css" : "external",
  });

  const cacheName = isExternal ? DYNAMIC_CACHE : STATIC_CACHE;

  strategyLogger.time("CSSExternalFetch");
  strategyLogger.debug("Starting CSS/external strategy", {
    cache: cacheName,
    url: request.url,
  });

  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      strategyLogger.debug("🎨 Serving CSS/External from cache", {
        url: request.url,
        cache: cacheName,
        status: "cache_hit",
      });
      return cachedResponse;
    }

    strategyLogger.debug("Cache miss - fetching from network", {
      url: request.url,
    });
    const networkResponse = await fetch(request);

    if (networkResponse.ok || networkResponse.type === "opaque") {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
      strategyLogger.debug("💾 Cached CSS/External resource", {
        url: request.url,
        cache: cacheName,
        status: networkResponse.status,
      });
    } else {
      strategyLogger.debug("Network response not suitable for caching", {
        url: request.url,
        status: networkResponse.status,
      });
    }

    strategyLogger.debug("Returning network response", {
      url: request.url,
      status: networkResponse.status,
    });
    return networkResponse;
  } catch (error) {
    strategyLogger.debug("🌐 Offline - CSS/External not available", {
      url: request.url,
      error: error.message,
      status: "offline_fallback",
    });

    if (
      request.url.includes("bootstrap") ||
      request.url.includes("fontawesome") ||
      ESSENTIAL_URLS.includes(request.url)
    ) {
      strategyLogger.warn("⚠️ Critical CSS library offline", {
        url: request.url,
      });
    }

    strategyLogger.debug("Returning empty CSS fallback");
    return new Response("/* Library offline */", {
      headers: { "Content-Type": "text/css" },
    });
  } finally {
    strategyLogger.timeEnd("CSSExternalFetch");
  }
}

// Strategy for HTML documents : Network First with robust redirect handling
async function htmlDocumentsStrategy(request, logger = swLogger) {
  const strategyLogger = logger.withContext({
    strategy: "htmlDocuments",
    type: "navigation",
  });

  strategyLogger.time("HTMLDocumentFetch");
  strategyLogger.debug("Starting HTML documents strategy", {
    url: request.url,
    mode: request.mode,
  });

  const cache = await caches.open(DYNAMIC_CACHE);

  try {
    strategyLogger.debug("Attempting network fetch for HTML", {
      url: request.url,
    });
    const networkResponse = await fetch(request);

    // Handle redirects
    if (
      networkResponse.redirected ||
      (networkResponse.status >= 300 && networkResponse.status < 400)
    ) {
      strategyLogger.warn("Network response was a redirect", {
        url: request.url,
        redirected: networkResponse.redirected,
        status: networkResponse.status,
        location: networkResponse.headers.get("location"),
      });

      // If same-origin redirect, try to fetch the final URL
      const locationHeader = networkResponse.headers.get("location");
      if (locationHeader) {
        try {
          const locationUrl = new URL(locationHeader, request.url);
          if (locationUrl.origin === self.location.origin) {
            strategyLogger.debug("Processing same-origin redirect", {
              original: request.url,
              redirect: locationUrl.href,
            });

            const finalResponse = await fetch(locationUrl.href);
            if (finalResponse && finalResponse.ok) {
              try {
                await cache.put(request, finalResponse.clone());
                strategyLogger.debug("Cached redirected HTML", {
                  originalUrl: request.url,
                  finalUrl: locationUrl.href,
                });
              } catch (err) {
                strategyLogger.warn("Failed to cache redirected HTML", {
                  url: request.url,
                  error: err.message,
                });
              }
              return finalResponse;
            }
          } else {
            strategyLogger.debug("Skipping cross-origin redirect caching", {
              redirect: locationUrl.href,
            });
          }
        } catch (error) {
          strategyLogger.warn("Redirect handling failed", {
            error: error.message,
            location: locationHeader,
          });
        }
      }
    }

    // Normal successful response: cache & return
    if (networkResponse && networkResponse.ok) {
      try {
        await cache.put(request, networkResponse.clone());
        strategyLogger.debug("Cached HTML document", {
          url: request.url,
          status: networkResponse.status,
        });
      } catch (err) {
        strategyLogger.warn("Failed to cache HTML", {
          url: request.url,
          error: err.message,
        });
      }
    } else {
      strategyLogger.debug("Network response not suitable for caching", {
        url: request.url,
        status: networkResponse.status,
        ok: networkResponse.ok,
      });
    }

    strategyLogger.debug("Returning network HTML response", {
      url: request.url,
      status: networkResponse.status,
    });
    return networkResponse;
  } catch (error) {
    strategyLogger.debug("Network failed - attempting cache fallback", {
      url: request.url,
      error: error.message,
    });

    // Network failed - attempt multiple cache strategies
    let cachedResponse = await caches.match(request);
    let cacheSource = "direct_match";

    if (!cachedResponse && !request.url.endsWith(".html")) {
      cachedResponse = await caches.match(request.url + ".html");
      cacheSource = "added_html_extension";
      strategyLogger.debug("Trying with .html extension", {
        attemptedUrl: request.url + ".html",
      });
    }

    if (!cachedResponse) {
      // Try without .html extension (SPA routing)
      const altUrl = request.url.replace(/\.html$/, "");
      cachedResponse = await caches.match(altUrl);
      cacheSource = "removed_html_extension";
      strategyLogger.debug("Trying without .html extension", {
        attemptedUrl: altUrl,
      });
    }
    /*if (!cachedResponse) {
      cachedResponse = await caches.match("/");
    }

    if (!cachedResponse) {
      // Fallback to index.html for SPA routing
      cachedResponse = await caches.match("/index.html");
    }
*/
    if (cachedResponse) {
      strategyLogger.info("Serving cached HTML fallback", {
        url: request.url,
        cacheSource,
        status: "cache_hit",
      });
      return cachedResponse;
    }

    strategyLogger.warn("No cached HTML found - generating offline page", {
      url: request.url,
      status: "offline_page_generated",
    });
    return createOfflinePage(request.url, strategyLogger);
  } finally {
    strategyLogger.timeEnd("HTMLDocumentFetch");
  }
}

// Strategy for JS and other files: Stale-While-Revalidate -
async function staleWhileRevalidateStrategy(
  request,
  isExternal = false,
  logger = swLogger
) {
  const strategyLogger = logger.withContext({
    strategy: "staleWhileRevalidate",
    isExternal,
  });

  strategyLogger.time("SWRFetch");
  strategyLogger.debug("Starting stale-while-revalidate strategy", {
    url: request.url,
    cache: isExternal ? DYNAMIC_CACHE : STATIC_CACHE,
  });

  const cacheName = isExternal ? DYNAMIC_CACHE : STATIC_CACHE;
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    strategyLogger.debug("⚡ Serving from cache (SWR)", {
      url: request.url,
      cache: cacheName,
      status: "cache_hit",
    });

    // Update cache in background
    const doUpdate = async () => {
      const updateLogger = strategyLogger.withContext({
        backgroundUpdate: true,
      });
      try {
        updateLogger.debug("Background cache update started", {
          url: request.url,
        });
        const networkResponse = await fetch(request);

        if (
          networkResponse &&
          (networkResponse.ok || networkResponse.type === "opaque")
        ) {
          try {
            await cache.put(request, networkResponse.clone());
            updateLogger.debug("Background cache update successful", {
              url: request.url,
              status: networkResponse.status,
            });
          } catch (err) {
            updateLogger.warn("Background cache update failed", {
              url: request.url,
              error: err.message,
            });
          }
        } else {
          updateLogger.debug(
            "Background update skipped - response not cacheable",
            {
              url: request.url,
              status: networkResponse?.status,
            }
          );
        }
      } catch (err) {
        updateLogger.debug("Background update network failed", {
          url: request.url,
          error: err.message,
        });
      }
    };

    // Kick off update without blocking
    doUpdate();

    return cachedResponse;
  }

  strategyLogger.debug("Cache miss - fetching from network", {
    url: request.url,
  });

  try {
    const networkResponse = await fetch(request);

    if (
      networkResponse &&
      (networkResponse.ok || networkResponse.type === "opaque")
    ) {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());

      strategyLogger.debug("💾 Cached (SWR)", {
        url: request.url,
        cache: cacheName,
        status: networkResponse.status,
      });

      // Trim dynamic cache if needed
      if (cacheName === STATIC_CACHE) {
        eventWaitFor(trimStaticCache());
      }
    } else {
      strategyLogger.debug("Network response not suitable for caching", {
        url: request.url,
        status: networkResponse?.status,
      });
    }

    strategyLogger.debug("Returning network response", {
      url: request.url,
      status: networkResponse.status,
    });
    return networkResponse;
  } catch (error) {
    strategyLogger.debug("🌐 Offline - resource not available", {
      url: request.url,
      error: error.message,
      status: "offline_fallback",
    });
    return createOfflinePage(request.url, strategyLogger);
  } finally {
    strategyLogger.timeEnd("SWRFetch");
  }
}

// Trim dynamic cache to prevent unlimited growth
async function trimStaticCache() {
  const trimLogger = swLogger.withContext({ operation: "cache_trimming" });

  trimLogger.time("CacheTrim");
  trimLogger.debug("Starting cache trimming operation");

  try {
    const cache = await caches.open(STATIC_CACHE);
    const keys = await cache.keys();

    trimLogger.debug("Current cache state", {
      cache: STATIC_CACHE,
      currentSize: keys.length,
      limit: STATIC_CACHE_LIMIT,
    });

    if (keys.length > STATIC_CACHE_LIMIT) {
      // Remove oldest items (based on insertion order)
      const itemsToDelete = keys.slice(0, keys.length - STATIC_CACHE_LIMIT);

      trimLogger.info("Trimming cache items", {
        itemsToRemove: itemsToDelete.length,
        remaining: STATIC_CACHE_LIMIT,
        urls: itemsToDelete.map((req) => req.url),
      });

      await Promise.all(itemsToDelete.map((key) => cache.delete(key)));

      trimLogger.debug("Cache trimming completed", {
        removed: itemsToDelete.length,
        newSize: STATIC_CACHE_LIMIT,
      });
    } else {
      trimLogger.debug("Cache trimming not needed", {
        currentSize: keys.length,
        limit: STATIC_CACHE_LIMIT,
      });
    }
  } catch (error) {
    trimLogger.error("Cache trimming operation failed", {
      error: error.message,
      stack: error.stack,
    });
  } finally {
    trimLogger.timeEnd("CacheTrim");
  }
}

// Helper to safely call waitUntil (not needed now, but kept for future)
function eventWaitFor(promise, event = null) {
  if (event && event.waitUntil) {
    event.waitUntil(promise);
  } else {
    promise.catch((err) =>
      swLogger.error.error("Background update failed:", err)
    );
  }
}
function eventWaitFor(promise, event = null) {
  if (event && event.waitUntil) {
    event.waitUntil(promise);
  } else {
    promise.catch((err) =>
      swLogger.error("Background update failed", { error: err.message })
    );
  }
}
// Activate event: Clean up and take control
self.addEventListener("activate", (event) => {
  swLogger.info("🚀 Service Worker activation started", {
    scope: self.registration?.scope,
    controller: self.controller?.state,
  });

  event.waitUntil(
    Promise.all([cleanupOldCaches(), self.clients.claim()])
      .then((results) => {
        const [cleanupResult] = results;
        swLogger.info("✅ Service Worker activated and ready", {
          clientsClaimed: true,
          oldCachesCleaned: cleanupResult || false,
        });
      })
      .catch((error) => {
        swLogger.error("❌ Service Worker activation failed", {
          error: error.message,
          stack: error.stack,
        });
      })
  );
});

// Cache cleanup function
async function cleanupOldCaches() {
  const cleanupLogger = swLogger.withContext({ operation: "cache_cleanup" });

  cleanupLogger.time("CacheCleanup");
  cleanupLogger.debug("Starting old cache cleanup");

  try {
    const cacheNames = await caches.keys();
    const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE];

    cleanupLogger.debug("Found caches", {
      allCaches: cacheNames,
      currentCaches,
      total: cacheNames.length,
    });

    const cleanupPromises = cacheNames.map(async (cacheName) => {
      if (!currentCaches.includes(cacheName)) {
        cleanupLogger.debug("Deleting old cache", { cache: cacheName });
        await caches.delete(cacheName);
        return cacheName;
      }
      return null;
    });

    const results = await Promise.all(cleanupPromises);
    const deletedCaches = results.filter((name) => name !== null);

    cleanupLogger.info("Cache cleanup completed", {
      deleted: deletedCaches.length,
      deletedCaches,
      remaining: cacheNames.length - deletedCaches.length,
    });

    return deletedCaches.length > 0;
  } catch (error) {
    cleanupLogger.error("Cache cleanup operation failed", {
      error: error.message,
      stack: error.stack,
    });
    return false;
  } finally {
    cleanupLogger.timeEnd("CacheCleanup");
  }
}
// Handle skip waiting message
self.addEventListener("message", (event) => {
  const messageLogger = swLogger.withContext({
    event: "message",
    source: event.source?.type || "unknown",
  });

  messageLogger.debug("Message received", {
    data: event.data,
    origin: event.origin,
  });

  const data = event.data;
  if (data?.type === "SET_FHAVUR_LOG_LEVEL") {
    // Send to all clients
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: "FHAVUR_LOG_LEVEL",
          level: data.level,
          persist: !!data.persist,
        });
      });
    });
  }

  if (event.data && event.data.type === "SKIP_WAITING") {
    messageLogger.info("🔄 Skipping waiting phase by request");
    self.skipWaiting();
  }
});

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  const syncLogger = swLogger.withContext({
    event: "sync",
    tag: event.tag,
  });

  syncLogger.debug("Background sync event received", {
    tag: event.tag,
    lastChance: event.lastChance,
  });

  if (event.tag === "background-sync") {
    syncLogger.info("🔄 Background sync triggered");
    event.waitUntil(doBackgroundSync(syncLogger));
  }
});

async function doBackgroundSync(logger = swLogger) {
  const syncLogger = logger.withContext({ operation: "background_sync" });

  syncLogger.time("BackgroundSync");
  syncLogger.debug("Starting background sync operation");

  try {
    // Implement your background sync logic here
    // Example: Sync pending API calls, update cached data, etc.

    syncLogger.debug("Background sync logic executed");

    // Simulate some work
    await new Promise((resolve) => setTimeout(resolve, 100));

    syncLogger.info("✅ Background sync completed successfully");
    return true;
  } catch (error) {
    syncLogger.error("❌ Background sync failed", {
      error: error.message,
      stack: error.stack,
    });
    return false;
  } finally {
    syncLogger.timeEnd("BackgroundSync");
  }
}

async function createOfflinePage(requestedUrl = "", logger = swLogger) {
  const offlineLogger = logger.withContext({
    operation: "offline_page_generation",
  });

  offlineLogger.debug("Generating offline page", { requestedUrl });

  // Your WhatsApp number (change this later)
  const supportWhatsAppNumber = "670852835";

  // Support message template
  const supportMessage = `Hello! I need support with Fhavur app. I'm offline and trying to access: ${
    requestedUrl || "Unknown page"
  }`;

  // URL encode the message for WhatsApp
  const encodedMessage = encodeURIComponent(supportMessage);
  const whatsappUrl = `https://wa.me/${supportWhatsAppNumber}?text=${encodedMessage}`;

  // If we precached a static offline page, prefer returning it.
  try {
    const cachedOffline = await caches.match("/offline.html");
    if (cachedOffline) {
      offlineLogger.debug("Serving pre-cached offline.html", {
        source: "pre_cached",
        url: "/offline.html",
      });
      return cachedOffline;
    }
  } catch (e) {
    offlineLogger.warn("Failed to access cached offline page", {
      error: e.message,
      fallback: "generated_page",
    });
  }

  offlineLogger.debug("Generating dynamic offline page", {
    source: "generated",
    hasWhatsApp: !!whatsappUrl,
  });

  return new Response(
    ` <!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Fhavur - Offline</title><style>:root{--primary-gradient:linear-gradient(135deg,#667eea 0%,#764ba2 100%);--success-gradient:linear-gradient(135deg,#48bb78 0%,#38a169 100%);--error-gradient:linear-gradient(135deg,#ff9595 0%,#ef4d00 100%);--surface-color:rgba(255,255,255,0.95);--text-primary:#2d3748;--text-secondary:#718096;--border-radius:20px;--transition:all 0.3s cubic-bezier(0.4,0,0.2,1)}*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif;background:var(--error-gradient);color:var(--text-primary);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;line-height:1.6}.offline-container{background:var(--surface-color);border-radius:var(--border-radius);padding:3rem 2rem;box-shadow:0 20px 40px rgba(0,0,0,0.1),0 0 0 1px rgba(255,255,255,0.1);text-align:center;max-width:500px;width:100%;backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.2)}.status-indicator{display:flex;align-items:center;justify-content:center;gap:0.5rem;margin-bottom:1.5rem;font-size:0.9rem;color:var(--text-secondary)}.connection-dot{width:8px;height:8px;border-radius:50%;background:#e53e3e;animation:pulse 2s infinite}.emoji{font-size:4rem;margin-bottom:1.5rem;display:block;filter:grayscale(0.3);animation:bounce 2s infinite}h1{color:var(--text-primary);margin-bottom:1rem;font-size:2rem;font-weight:700}.subtitle{color:var(--text-secondary);margin-bottom:2rem;font-size:1.1rem}.url-info{background:#f7fafc;border:1px solid #e2e8f0;border-radius:10px;padding:1rem;margin:1.5rem 0;font-family:'SF Mono','Courier New',monospace;font-size:0.9rem;word-break:break-all;color:#4a5568}.button-group{display:flex;flex-direction:column;gap:1rem;margin-top:2rem}.btn{padding:1rem 2rem;border:none;
      border-radius:12px;font-size:1rem;font-weight:600;cursor:pointer;transition:var(--transition);text-decoration:none;display:flex;align-items:center;justify-content:center;gap:0.5rem;position:relative;overflow:hidden}.btn::after{content:'';position:absolute;top:0;left:-100%;width:100%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent);transition:left 0.5s}.btn:hover::after{left:100%}.btn-primary{background:var(--primary-gradient);color:white}.btn-primary:hover{transform:translateY(-2px);box-shadow:0 10px 20px rgba(102,126,234,0.3)}.btn-success{background:var(--success-gradient);color:white}.btn-success:hover{transform:translateY(-2px);box-shadow:0 10px 20px rgba(72,187,120,0.3)}.btn:active{transform:translateY(0)}.icon{font-size:1.2rem}.tips{margin-top:2rem;padding-top:1.5rem;border-top:1px solid #e2e8f0}.tips h3{color:#4a5568;margin-bottom:1rem;font-size:1rem}.tips ul{list-style:none;text-align:left}.tips li{padding:0.5rem 0;color:#718096;display:flex;align-items:center;gap:0.5rem}.tips li:before{content:"💡";font-size:0.9rem}.retry-indicator{margin-top:1rem;font-size:0.9rem;color:var(--text-secondary)}@media(min-width:480px){.button-group{flex-direction:row}.btn{flex:1}}@keyframes bounce{0%,20%,50%,80%,100%{transform:translateY(0)}40%{transform:translateY(-10px)}60%{transform:translateY(-5px)}}@keyframes pulse{0%{opacity:1}50%{opacity:0.5}100%{opacity:1}}.fade-in{animation:fadeIn 0.5s ease-in}@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}</style></head><body><div class="offline-container fade-in"><div class="status-indicator"><div class="connection-dot"></div><span>Offline</span></div><span class="emoji">🔌</span><h1>Connection Lost</h1><p class="subtitle">This page requires an internet connection. You can try the following:</p>${
        requestedUrl
          ? `<div class="url-info"><strong>Requested URL:</strong><br>${requestedUrl}</div>`
          : ""
      }<div class="button-group"><button class="btn btn-primary" id="retryBtn"><span class="icon">🔄</span>Retry Connection</button><a href="/" class="btn btn-primary" id="goHomeBtn"><span class="icon">🏠</span>Go to Home</a>${
      whatsappUrl
        ? `<a href="${whatsappUrl}" class="btn btn-success" id="supportBtn" target="_blank" rel="noopener"><span class="icon">💬</span>Contact Support</a>`
        : ""
    }</div><div class="retry-indicator" id="retryIndicator">Auto-retry in <span id="countdown">10</span> seconds</div><div class="tips"><h3>Troubleshooting Tips:</h3><ul><li>Check your Wi-Fi or mobile data connection</li><li>Restart your router or modem</li><li>Verify airplane mode is turned off</li><li>Try accessing other websites to test your connection</li></ul></div></div><script>class OfflinePage{constructor(){this.retryCount=0;this.maxRetries=5;this.retryInterval=10000;this.countdownElement=document.getElementById('countdown');this.retryIndicator=document.getElementById('retryIndicator');this.retryBtn=document.getElementById('retryBtn');this.autoRetryTimer=null;this.countdownTimer=null;this.init()}init(){this.setupEventListeners();this.startAutoRetry();this.logOfflineEvent()}setupEventListeners(){if(this.retryBtn){this.retryBtn.addEventListener('click',()=>this.manualRetry())}const goHomeBtn=document.getElementById('goHomeBtn');if(goHomeBtn){goHomeBtn.addEventListener('click',(e)=>{if(window.history.length>1){e.preventDefault();window.location.href='/'}})}const supportBtn=document.getElementById('supportBtn');if(supportBtn){supportBtn.addEventListener('click',()=>{this.logEvent('support_clicked')})}window.addEventListener('online',()=>this.handleConnectionRestored());document.addEventListener('visibilitychange',()=>{if(!document.hidden){this.checkConnection()}})}startAutoRetry(){this.updateCountdown(10);this.autoRetryTimer=setTimeout(()=>{this.checkConnection()},this.retryInterval)}updateCountdown(seconds){if(!this.countdownElement)return;let count=seconds;this.countdownTimer=setInterval(()=>{this.countdownElement.textContent=count;count--;if(count<0){clearInterval(this.countdownTimer)}},1000)}manualRetry(){this.logEvent('manual_retry');this.checkConnection(true)}checkConnection(isManual=false){if(this.retryCount>=this.maxRetries){this.disableAutoRetry();return}this.retryCount++;if(isManual){this.showRetryStatus('Checking connection...')}fetch('/',{method:'HEAD',cache:'no-cache',mode:'no-cors'}).then(()=>{this.handleConnectionRestored()}).catch(()=>{if(isManual){this.showRetryStatus(Still offline (attempt ${
      this.retryCount
    }/${
      this.maxRetries
    }));setTimeout(()=>{this.showRetryStatus('Auto-retry disabled. Please check your connection.');this.disableAutoRetry()},2000)}else{this.retryConnection()}})}retryConnection(){if(this.retryCount<this.maxRetries){this.clearTimers();this.startAutoRetry()}else{this.disableAutoRetry()}}handleConnectionRestored(){this.logEvent('connection_restored',{retryCount:this.retryCount});this.showRetryStatus('Connection restored! Redirecting...');setTimeout(()=>{window.location.reload()},1000)}showRetryStatus(message){if(this.retryIndicator){this.retryIndicator.textContent=message;setTimeout(()=>{if(this.retryCount<this.maxRetries){this.startAutoRetry()}},3000)}}disableAutoRetry(){this.clearTimers();if(this.retryIndicator){this.retryIndicator.textContent='Auto-retry disabled. Please check your connection.'}}clearTimers(){if(this.autoRetryTimer)clearTimeout(this.autoRetryTimer);if(this.countdownTimer)clearInterval(this.countdownTimer)}logOfflineEvent(){this.logEvent('offline_page_loaded',{url:window.location.href,userAgent:navigator.userAgent,timestamp:new Date().toISOString()})}logEvent(eventName,data={}){if(window.location.hostname.includes('localhost')){console.log([OFFLINE_PAGE]: ,data)}if('serviceWorker' in navigator&&navigator.serviceWorker.controller){navigator.serviceWorker.controller.postMessage({type:'OFFLINE_PAGE_EVENT',event:eventName,data:data})}}}document.addEventListener('DOMContentLoaded',()=>{new OfflinePage()});if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',()=>{new OfflinePage()})}else{new OfflinePage()}}</script></body></html>`,
    {
      status: 200,
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Offline-Page": "true",
      },
    }
  );
}
self.addEventListener("error", (event) => {
  swLogger.error("Service Worker runtime error", {
    error: event.error?.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    stack: event.error?.stack,
  });
});

self.addEventListener("unhandledrejection", (event) => {
  swLogger.error("Service Worker unhandled promise rejection", {
    reason: event.reason?.message || event.reason,
    stack: event.reason?.stack,
  });
});

// Periodic health check (optional)
async function performHealthCheck() {
  const healthLogger = swLogger.withContext({ operation: "health_check" });

  try {
    const cache = await caches.open(STATIC_CACHE);
    const keys = await cache.keys();

    healthLogger.debug("Service Worker health check", {
      cacheSize: keys.length,
      cacheStatus: "healthy",
      timestamp: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    healthLogger.error("Service Worker health check failed", {
      error: error.message,
      cacheStatus: "unhealthy",
    });
    return false;
  }
}

// Perform health check every 5 minutes
setInterval(() => {
  if (self.shouldLog) {
    performHealthCheck();
  }
}, 5 * 60 * 1000);

swLogger.info("🎯 Service Worker fully initialized", {
  version: CACHE_VERSION,
  staticCache: STATIC_CACHE,
  dynamicCache: DYNAMIC_CACHE,
  cacheLimit: STATIC_CACHE_LIMIT,
  essentialUrls: ESSENTIAL_URLS.length,
  timestamp: new Date().toISOString(),
});
