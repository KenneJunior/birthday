const CACHE_NAME = "fhavur-pwa-cache-v1.2";
const STATIC_CACHE = "fhavur-static-v1.2";
const DYNAMIC_CACHE = "fhavur-dynamic-v1.2";

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

function safeURL(urlStr) {
  try {
    return new URL(urlStr, self.location.origin); // Use self.location.origin for relative URLs
  } catch (e) {
    console.warn("Invalid URL:", urlStr, e);
    return null;
  }
}

function isExternalHost(hostname) {
  return EXTERNAL_CDNS.includes(hostname);
}

function matchesExternalLibrary(urlStr) {
  for (const rx of EXTERNAL_LIBRARIES) {
    if (rx.test(urlStr)) return true;
  }
  return false;
}

// Check if URL should be cached (including external libraries)
async function shouldCache(urlStr) {
  const urlObj = safeURL(urlStr);
  if (!urlObj) return false;

  const pathname = urlObj.pathname;
  const hostname = urlObj.hostname;

  // Skip data/blob URLs
  if (urlStr.startsWith("data:") || urlStr.startsWith("blob:")) {
    return false;
  }

  // Allow caching of well-known CDNs and libraries -
  if (isExternalHost(hostname) || matchesExternalLibrary(urlStr)) {
    console.log("Caching external:", urlStr); // Debug log
    return true;
  }

  // Skip non-origin URLs not in CDN list
  if (urlObj.origin !== self.location.origin && !isExternalHost(hostname)) {
    return false;
  }

  // Check excluded directories
  for (const dir of EXCLUDED_DIRS) {
    if (pathname.includes(dir)) {
      return false;
    }
  }

  // Skip API/auth
  if (pathname.includes("/api/") || pathname.includes("/auth/")) {
    return false;
  }

  // Cache root/HTML
  if (pathname === "/" || pathname.endsWith(".html")) {
    console.log("Caching HTML/root:", pathname); // Debug log
    return true;
  }

  // Cache by extension
  for (const ext of CACHEABLE_EXTENSIONS) {
    if (pathname.toLowerCase().endsWith(ext)) {
      console.log("Caching by extension:", pathname); // Debug log
      return true;
    }
  }

  console.log("Not caching:", pathname); // Debug log
  return false;
}

// Install event: Cache essential files
self.addEventListener("install", (event) => {
  console.log("🛠 Service Worker installing...");

  event.waitUntil(
    cacheEssentialResources()
      .then(() => {
        console.log("✅ Service Worker installed successfully");
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error("❌ Service Worker installation failed:", err);
        return self.skipWaiting();
      })
  );
});

// Smart caching of essential resources
async function cacheEssentialResources() {
  const cache = await caches.open(STATIC_CACHE);

  const essentialUrls = ESSENTIAL_URLS.map(
    (u) => new Request(u, { credentials: "same-origin" })
  ); // Ensure same-origin

  const results = await Promise.allSettled(
    essentialUrls.map((req) =>
      cache.add(req).catch((err) => {
        console.warn(`⚠️ Could not cache ${req.url}:`, err.message);
        return null;
      })
    )
  );

  console.log(
    `📦 Cached ${
      results.filter((r) => r.status === "fulfilled").length
    } essential resources`
  );
}

// Fetch event: Handle both development and production paths
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  const urlStr = event.request.url; // Define urlStr

  // Skip if not cacheable
  if (!shouldCache(urlStr)) {
    return;
  }

  const urlObj = safeURL(urlStr);
  if (!urlObj) return;

  const isExternal = urlObj.origin !== self.location.origin;
  const pathname = urlObj.pathname;

  // Different strategies
  if (/\.(jpg|jpeg|png|gif|svg|mp3|webm|woff|woff2|ttf)$/i.test(pathname)) {
    event.respondWith(staticAssetsStrategy(event.request, isExternal));
    return;
  }

  if (/\.css$/.test(pathname) || isExternal) {
    event.respondWith(cssAndExternalStrategy(event.request, isExternal));
    return;
  }

  if (pathname === "/" || /\.html$/.test(pathname)) {
    event.respondWith(htmlDocumentsStrategy(event.request));
    return;
  }

  event.respondWith(staleWhileRevalidateStrategy(event.request, isExternal));
});

// Strategy for static assets (images, fonts, media) it first check if the image is in the cache then uses the network as a fallback
async function staticAssetsStrategy(request, isExternal = false) {
  const cacheName = isExternal ? DYNAMIC_CACHE : STATIC_CACHE;

  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log("🖼 Serving static asset from cache:", request.url);
      return cachedResponse;
    }

    const networkResponse = await fetch(request);

    if (
      networkResponse &&
      (networkResponse.ok || networkResponse.type === "opaque")
    ) {
      try {
        const cache = await caches.open(cacheName);
        await cache.put(request, networkResponse.clone());
        console.log("💾 Cached static asset:", request.url);
      } catch (err) {
        console.warn("⚠️ Could not cache static asset:", request.url, err);
      }
    }

    return networkResponse;
  } catch (error) {
    console.log("🌐 Offline - static asset not available:", request.url);

    // Placeholder for images
    if (request.destination === "image") {
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

    return new Response("Resource not available offline", {
      status: 408,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

// Special strategy for CSS and external resources
async function cssAndExternalStrategy(request, isExternal = false) {
  const cacheName = isExternal ? DYNAMIC_CACHE : STATIC_CACHE;

  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log("🎨 Serving CSS/External from cache:", request.url);
      return cachedResponse;
    }

    const networkResponse = await fetch(request);

    if (networkResponse.ok || networkResponse.type === "opaque") {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
      console.log("💾 Cached CSS/External resource:", request.url);
    }

    return networkResponse;
  } catch (error) {
    console.log("🌐 Offline - CSS/External not available:", request.url);

    if (
      request.url.includes("bootstrap") ||
      request.url.includes("fontawesome") ||
      ESSENTIAL_URLS.includes(request.url)
    ) {
      console.warn("⚠️ Critical CSS library offline:", request.url);
    }

    return new Response("/* Library offline */", {
      headers: { "Content-Type": "text/css" },
    });
  }
}

// Strategy for HTML documents
async function htmlDocumentsStrategy(request) {
  const cache = await caches.open(DYNAMIC_CACHE);

  try {
    const networkResponse = await fetch(request);

    // Handle redirects
    if (
      networkResponse.redirected ||
      (networkResponse.status >= 300 && networkResponse.status < 400)
    ) {
      console.warn("[SW] Network response was a redirect for", request.url);

      // If same-origin redirect, try to fetch the final URL
      const locationHeader = networkResponse.headers.get("location");
      if (locationHeader) {
        try {
          const locationUrl = new URL(locationHeader, request.url);
          if (locationUrl.origin === self.location.origin) {
            const finalResponse = await fetch(locationUrl.href);
            if (finalResponse && finalResponse.ok) {
              try {
                await cache.put(request, finalResponse.clone());
                console.log("📄 Cached redirected HTML:", request.url);
              } catch (err) {
                console.warn(
                  "⚠️ Could not cache redirected HTML:",
                  request.url,
                  err
                );
              }
              return finalResponse;
            }
          }
        } catch (error) {
          console.warn("⚠️ Redirect handling failed:", error);
        }
      }
    }

    // Normal successful response: cache & return
    if (networkResponse && networkResponse.ok) {
      try {
        await cache.put(request, networkResponse.clone());
        console.log("📄 Cached HTML:", request.url);
      } catch (err) {
        console.warn("⚠️ Could not cache HTML:", request.url, err);
      }
    }

    return networkResponse;
  } catch (error) {
    // Network failed - try cache fallback
    console.log("🌐 Offline - serving cached HTML:", request.url);

    // Try multiple cache strategies
    let cachedResponse = await caches.match(request + ".html");

    if (!cachedResponse) {
      // Try without .html extension (SPA routing)
      const altUrl = request.url.replace(/\.html$/, "");
      cachedResponse = await caches.match(altUrl);
    }

    if (!cachedResponse) {
      cachedResponse = await caches.match("/");
    }

    if (!cachedResponse) {
      // Fallback to index.html for SPA routing
      cachedResponse = await caches.match("/index.html");
    }

    if (cachedResponse) {
      return cachedResponse;
    }

    // Serve the enhanced offline page with the requested URL
    return createOfflinePage(request.url);
  }
}

// Strategy for JS and other files: Stale-While-Revalidate -
async function staleWhileRevalidateStrategy(request, isExternal = false) {
  const cacheName = isExternal ? DYNAMIC_CACHE : STATIC_CACHE;
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    console.log("⚡ Serving from cache (SWR):", request.url);

    // Update cache in background
    const doUpdate = async () => {
      try {
        const networkResponse = await fetch(request);
        if (
          networkResponse &&
          (networkResponse.ok || networkResponse.type === "opaque")
        ) {
          try {
            await cache.put(request, networkResponse.clone());
          } catch (err) {
            console.warn("[SW] cache.put failed (SWR):", err);
          }
        }
      } catch (err) {
        // Ignore network update errors
      }
    };

    // Kick off update without blocking
    doUpdate();

    return cachedResponse; //
  }

  try {
    const networkResponse = await fetch(request);

    if (
      networkResponse &&
      (networkResponse.ok || networkResponse.type === "opaque")
    ) {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log("🌐 Offline - resource not available:", request.url);
    return createOfflinePage(request.url);
  }
}

// Helper to safely call waitUntil (not needed now, but kept for future)
function eventWaitFor(promise, event = null) {
  if (event && event.waitUntil) {
    event.waitUntil(promise);
  } else {
    promise.catch((err) => console.error("Background update failed:", err));
  }
}

// Activate event: Clean up and take control
self.addEventListener("activate", (event) => {
  console.log("🚀 Service Worker activating...");

  event.waitUntil(
    Promise.all([cleanupOldCaches(), self.clients.claim()]).then(() => {
      console.log("✅ Service Worker activated and ready!");
    })
  );
});

// Cache cleanup function
async function cleanupOldCaches() {
  try {
    const cacheNames = await caches.keys();
    const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE];

    const cleanupPromises = cacheNames.map(async (cacheName) => {
      if (!currentCaches.includes(cacheName)) {
        await caches.delete(cacheName);
        console.log("🧹 Cleaned up old cache:", cacheName);
      }
    });

    await Promise.all(cleanupPromises);
  } catch (error) {
    console.error("Cache cleanup error:", error);
  }
}

// Handle skip waiting message
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("🔄 Skipping waiting phase...");
    self.skipWaiting();
  }
});

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    console.log("🔄 Background sync triggered");
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement your background sync logic here
  console.log("✅ Background sync completed");
  return Promise.resolve();
}

function createOfflinePage(requestedUrl = "") {
  // Your WhatsApp number (change this later)
  const supportWhatsAppNumber = "670852835"; //

  // Support message template
  const supportMessage = `Hello! I need support with Fhavur app. I'm offline and trying to access: ${
    requestedUrl || "Unknown page"
  }`;

  // URL encode the message for WhatsApp
  const encodedMessage = encodeURIComponent(supportMessage);
  const whatsappUrl = `https://wa.me/${supportWhatsAppNumber}?text=${encodedMessage}`;

  return new Response(
    `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fhavur - Offline</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #ff9595 0%, #ef4d00 100%);
                color: #333;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                line-height: 1.6;
            }
            
            .offline-container {
                background: rgba(255, 255, 255, 0.95);
                border-radius: 20px;
                padding: 3rem 2rem;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                text-align: center;
                max-width: 500px;
                width: 100%;
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            .emoji {
                font-size: 4rem;
                margin-bottom: 1.5rem;
                display: block;
            }
            
            h1 {
                color: #2d3748;
                margin-bottom: 1rem;
                font-size: 2rem;
                font-weight: 700;
            }
            
            .subtitle {
                color: #718096;
                margin-bottom: 2rem;
                font-size: 1.1rem;
            }
            
            .url-info {
                background: #f7fafc;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 1rem;
                margin: 1.5rem 0;
                font-family: 'Courier New', monospace;
                font-size: 0.9rem;
                word-break: break-all;
                color: #4a5568;
            }
            
            .button-group {
                display: flex;
                flex-direction: column;
                gap: 1rem;
                margin-top: 2rem;
            }
            
            .btn {
                padding: 1rem 2rem;
                border: none;
                border-radius: 12px;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                text-decoration: none;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
            }
            
            .btn-primary {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            
            .btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
            }
            
            .btn-success {
                background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
                color: white;
            }
            
            .btn-success:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 20px rgba(72, 187, 120, 0.3);
            }
            
            .btn:active {
                transform: translateY(0);
            }
            
            .icon {
                font-size: 1.2rem;
            }
            
            .tips {
                margin-top: 2rem;
                padding-top: 1.5rem;
                border-top: 1px solid #e2e8f0;
            }
            
            .tips h3 {
                color: #4a5568;
                margin-bottom: 1rem;
                font-size: 1rem;
            }
            
            .tips ul {
                list-style: none;
                text-align: left;
            }
            
            .tips li {
                padding: 0.5rem 0;
                color: #718096;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .tips li:before {
                content: "💡";
                font-size: 0.9rem;
            }
            
            @media (min-width: 480px) {
                .button-group {
                    flex-direction: row;
                }
                
                .btn {
                    flex: 1;
                }
            }
            
            /* Animation for the emoji */
            @keyframes bounce {
                0%, 20%, 50%, 80%, 100% {transform: translateY(0);}
                40% {transform: translateY(-10px);}
                60% {transform: translateY(-5px);}
            }
            
            .emoji {
                animation: bounce 2s infinite;
            }
        </style>
    </head>
    <body>
        <div class="offline-container">
            <span class="emoji">🔌</span>
            
            <h1>You're Offline</h1>
            
            <p class="subtitle">
                Don't worry! This page isn't available offline, but you can still get back to the app.
            </p>
            
            ${
              requestedUrl
                ? `
                <div class="url-info">
                    Trying to access:<br>
                    <strong>${requestedUrl}</strong>
                </div>
            `
                : ""
            }
            
            <div class="button-group">
                <a href="/" class="btn btn-primary" id="goHomeBtn">
                    <span class="icon">🏠</span>
                    Go to Home Page
                </a>
                
                <a href="${whatsappUrl}" class="btn btn-success" id="supportBtn" target="_blank">
                    <span class="icon">💬</span>
                    Contact Support
                </a>
            </div>
            
            <div class="tips">
                <h3>Quick Tips:</h3>
                <ul>
                    <li>Check your internet connection</li>
                    <li>Try refreshing the page</li>
                    <li>Some features work offline</li>
                    <li>Your data is safe and secure</li>
                </ul>
            </div>
        </div>

        <script>
            // Enhanced button functionality
            document.addEventListener('DOMContentLoaded', function() {
                const goHomeBtn = document.getElementById('goHomeBtn');
                const supportBtn = document.getElementById('supportBtn');
                
                // Home button - try to use history if possible
                goHomeBtn.addEventListener('click', function(e) {
                    // Try to go back to home without full page reload if possible
                    if (window.history.length > 1) {
                        e.preventDefault();
                        window.location.href = '/';
                    }
                });
                
                // Support button analytics (optional)
                supportBtn.addEventListener('click', function() {
                    console.log('User requested support while offline');
                    // You can add analytics here later
                });
                
                // Try to auto-recover when connection returns
                function checkConnection() {
                    if (navigator.onLine) {
                        console.log('Connection restored, reloading...');
                        window.location.reload();
                    }
                }
                
                // Listen for connection recovery
                window.addEventListener('online', checkConnection);
                
                // Auto-check every 10 seconds
                setInterval(checkConnection, 10000);
            });
        </script>
    </body>
    </html>
  `,
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

function _log(message) {
  console.log(message);
}
