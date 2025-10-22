const CACHE_NAME = "fhavur-pwa-cache-v1.3";
const STATIC_CACHE = "fhavur-static-v1.3";
const DYNAMIC_CACHE = "fhavur-dynamic-v1.3";

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

// Base URLs to cache - these will work in both development and production
const ESSENTIAL_URLS = [
  "/",
  "/index.html",
  "/fhavur.html",
  "/login.html",
  "/logOut.html",
  "/manifest.webmanifest",

  // These paths should work after build since Vercel will optimize them
  "/assets/", // Vercel typically puts built assets here
  "/static/", // Common build output directory
  "/src/", // Keep src paths for development
  "/public/", // Public assets
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
  ".mp4",
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

// Directories to exclude from caching
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
  "/dist",
  "/build",
  "/src/scripts",
  "/src/utils",
];
function safeURL(url) {
  try {
    return new URL(url);
  } catch (_e) {
    return null;
  }
}

function isExternalHost(hostname) {
  return EXTERNAL_CDNS.includes(hostname);
}

function matchesExternalLibrary(url) {
  for (const rx of EXTERNAL_LIBRARIES) {
    if (rx.test(url)) return true;
  }
  return false;
}

// Check if URL should be cached (including external libraries)
function shouldCache(url) {
  const urlObj = safeURL(url);
  if (!urlObj) return false;

  const pathname = urlObj.pathname;
  const hostname = urlObj.hostname;

  // Skip data URLs and blob URLs
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return false;
  }

  // Allow caching of well-known CDNs
  if (isExternalHost(hostname) || matchesExternalLibrary(requestUrl)) {
    return true;
  }

  // Skip external URLs that aren't in our CDN list
  if (urlObj.origin !== self.location.origin && !isExternalHost(hostname)) {
    return false;
  }

  // Check if in excluded directory
  for (const dir of EXCLUDED_DIRS) {
    if (pathname.includes(dir)) {
      return false;
    }
  }

  // Skip API endpoints or dynamic routes
  if (pathname.includes("/api/") || pathname.includes("/auth/")) {
    return false;
  }

  // Check if it's a cacheable file type
  for (const ext of CACHEABLE_EXTENSIONS) {
    if (pathname.toLowerCase().endsWith(ext)) return true;
  }

  // Cache root paths and HTML files
  if (pathname === "/" || pathname.endsWith(".html")) return true;
  return false;
}

// Install event: Cache essential files including external libs
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
        // Still proceed with installation even if some resources fail
        return self.skipWaiting();
      })
  );
});

// Smart caching of essential resources
async function cacheEssentialResources() {
  const cache = await caches.open(STATIC_CACHE);

  // Try to cache the absolute essentials that should exist in any environment
  const essentialUrls = ["/", "/index.html", "/manifest.webmanifest"];

  const results = await Promise.allSettled(
    essentialUrls.map((url) =>
      cache.add(url).catch((err) => {
        console.warn(`⚠️ Could not cache ${url}:`, err.message);
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

  const url = event.request.url;

  // Skip excluded URLs
  if (!shouldCache(url)) {
    return;
  }

  const requestUrl = safeURL(url);
  if (!requestUrl) return;

  const isExternal = requestUrl.origin !== self.location.origin;
  const pathname = requestUrl.pathname;

  // Different strategies for different resource types
  if (pathname.match(/\.(jpg|jpeg|png|gif|svg|mp3|mp4|webm|woff|woff2|ttf)$/)) {
    event.respondWith(staticAssetsStrategy(event.request, isExternal));
  } else if (pathname.match(/\.html?$/) || pathname === "/") {
    event.respondWith(htmlDocumentsStrategy(event.request));
  } else if (pathname.match(/\.css$/) || isExternal) {
    // Special handling for CSS and external resources
    event.respondWith(cssAndExternalStrategy(event.request, isExternal));
  } else {
    event.respondWith(staleWhileRevalidateStrategy(event.request, isExternal));
  }
});

// Strategy for static assets (images, fonts, media)
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

    // Return placeholder for missing images
    if (request.destination === "image") {
      return new Response(
        '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#ccc">Image Offline</text></svg>',
        { headers: { "Content-Type": "image/svg+xml" } }
      );
    }

    return new Response("Resource not available offline", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

// Special strategy for CSS and external resources network first with cache fallback
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

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
      console.log("💾 Cached CSS/External resource:", request.url);
    }

    return networkResponse;
  } catch (error) {
    console.log("🌐 Offline - CSS/External not available:", request.url);

    // For critical CSS, you might want to return a basic fallback
    if (
      request.url.includes("bootstrap") ||
      request.url.includes("fontawesome")
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
  try {
    const networkResponse = await fetch(request);

    if (
      networkResponse &&
      (networkResponse.ok || networkResponse.type === "opaque")
    ) {
      const cache = await caches.open(DYNAMIC_CACHE);
      try {
        await cache.put(request, networkResponse.clone());
      } catch (err) {
        console.warn("⚠️ Could not cache HTML document:", request.url, err);
      }
      console.log("📄 Updated HTML in cache:", request.url);
    }

    return networkResponse;
  } catch (error) {
    console.log("🌐 Offline - serving cached HTML:", request.url);

    // Try multiple cache strategies for HTML
    const cache = await caches.open(STATIC_CACHE);
    let cachedResponse = await cache.match(request);

    if (!cachedResponse) {
      // Try without .html extension (common in SPAs)
      const altRequest = new Request(request.url.replace(/\.html$/, ""));
      cachedResponse = await cache.match(altRequest);
    }

    if (!cachedResponse) {
      // Fallback to index.html for SPA routing
      cachedResponse = await cache.match("/index.html");
    }

    if (!cachedResponse) {
      cachedResponse = await cache.match("/");
    }

    return (
      cachedResponse ||
      new Response("Offline - content not available", {
        status: 503,
        headers: { "Content-Type": "text/html" },
      })
    );
  }
}

// Strategy for JS and other fil. Stale-While-Revalidate: return cache if present and update in background

async function staleWhileRevalidateStrategy(request, isExternal = false) {
  const cacheName = isExternal ? DYNAMIC_CACHE : STATIC_CACHE;
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    console.log("⚡ Serving from cache (SWR):", request.url);

    // Update cache in background for external resources
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
        // ignore network update errors
      }
    };

    if (cache) {
      // Kick off update but don't block response
      eventWaitFor(doUpdate());
      return cache;
    }
    return cachedResponse;
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
    return new Response("Resource not available offline", {
      status: 408,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
// Helper to safely call waitUntil on global events inside non-event scope
function eventWaitFor(promise) {
  // If we're in fetch handler, event would exist in closure; otherwise just run promise
  // This function is a graceful no-op if self is missing .waitUntil
  if (self && typeof self.addEventListener === "function") {
    // best-effort: nothing to do, we just run the promise
    return promise;
  }
  return promise;
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
