const CACHE_NAME = "fhavur-pwa-cache-v1";
const STATIC_CACHE = "fhavur-static-v1";
const DYNAMIC_CACHE = "fhavur-dynamic-v1";

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

// Check if URL should be cached
function shouldCache(url) {
  const urlObj = new URL(url);
  const pathname = urlObj.pathname;

  // Skip external URLs and data URLs
  if (urlObj.origin !== self.location.origin || pathname.startsWith("data:")) {
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
    if (pathname.endsWith(ext)) {
      return true;
    }
  }

  // Cache root paths and HTML files
  return pathname === "/" || pathname.endsWith(".html");
}

// Install event: Cache essential files with error handling
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

  const requestUrl = new URL(url);

  // Different strategies for different resource types
  if (
    requestUrl.pathname.match(
      /\.(jpg|jpeg|png|gif|svg|mp3|mp4|webm|woff|woff2|ttf)$/
    )
  ) {
    event.respondWith(staticAssetsStrategy(event.request));
  } else if (
    requestUrl.pathname.match(/\.html?$/) ||
    requestUrl.pathname === "/"
  ) {
    event.respondWith(htmlDocumentsStrategy(event.request));
  } else {
    event.respondWith(staleWhileRevalidateStrategy(event.request));
  }
});

// Strategy 1: Cache First for static assets
async function staticAssetsStrategy(request) {
  try {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log("🖼 Serving static asset from cache:", request.url);
      return cachedResponse;
    }

    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const dynamicCache = await caches.open(DYNAMIC_CACHE);
      await dynamicCache.put(request, networkResponse.clone());
      console.log("💾 Cached new static asset:", request.url);
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
      status: 408,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

// Strategy 2: Network First for HTML documents
async function htmlDocumentsStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, networkResponse.clone());
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

// Strategy 3: Stale-While-Revalidate for CSS/JS/JSON
async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    console.log("⚡ Serving from cache (SWR):", request.url);

    // Update cache in background
    fetch(request)
      .then(async (networkResponse) => {
        if (networkResponse.ok) {
          const dynamicCache = await caches.open(DYNAMIC_CACHE);
          await dynamicCache.put(request, networkResponse.clone());
          console.log("🔄 Background cache update:", request.url);
        }
      })
      .catch(() => {
        // Silent fail - we have the cached version
      });

    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const dynamicCache = await caches.open(DYNAMIC_CACHE);
      await dynamicCache.put(request, networkResponse.clone());
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

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    console.log("🔄 Background sync triggered");
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement background sync logic here
}
