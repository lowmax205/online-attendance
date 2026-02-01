/**
 * Service Worker for Event Attendance PWA
 *
 * Features:
 * - Offline caching of static assets
 * - Network-first strategy for API calls
 * - Cache-first strategy for static assets
 * - Background sync for attendance submissions
 */

const STATIC_CACHE_NAME = "event-attendance-static-v1";
const DYNAMIC_CACHE_NAME = "event-attendance-dynamic-v1";

// Assets to cache immediately on install
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/images/logo.svg",
  "/images/USC-Logo.png",
];

// API routes that should use network-first strategy
const API_ROUTES = ["/api/"];

// Install event - cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log("[SW] Caching static assets");
      return cache.addAll(STATIC_ASSETS);
    }),
  );
  // Activate immediately without waiting for old service worker to finish
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            return (
              name !== STATIC_CACHE_NAME &&
              name !== DYNAMIC_CACHE_NAME &&
              name.startsWith("event-attendance-")
            );
          })
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          }),
      );
    }),
  );
  // Claim all clients immediately
  self.clients.claim();
});

// Listen for messages (e.g., to skip waiting)
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch event - handle requests with appropriate caching strategy
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip cross-origin requests (except for CDN assets)
  if (url.origin !== self.location.origin) {
    // Allow Cloudinary and other trusted CDNs
    const trustedOrigins = [
      "res.cloudinary.com",
      "api.mapbox.com",
      "tiles.mapbox.com",
    ];
    if (!trustedOrigins.some((origin) => url.hostname.includes(origin))) {
      return;
    }
  }

  // API routes - Network first, fall back to cache
  if (API_ROUTES.some((route) => url.pathname.startsWith(route))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets (images, fonts, etc.) - Cache first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // HTML pages - Network first with offline fallback
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // Default - Network first
  event.respondWith(networkFirst(request));
});

// Check if request is for a static asset
function isStaticAsset(pathname) {
  const staticExtensions = [
    ".js",
    ".css",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".ico",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
  ];
  return staticExtensions.some((ext) => pathname.endsWith(ext));
}

// Network first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    // Fall back to cache if network fails
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response for API errors
    return new Response(
      JSON.stringify({ error: "You are offline", offline: true }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

// Cache first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Refresh cache in background
    refreshCache(request);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    // Return a placeholder for missing images
    if (request.url.includes("/images/")) {
      return new Response("", { status: 404 });
    }
    throw new Error("Failed to fetch resource");
  }
}

// Refresh cache in background
async function refreshCache(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse);
    }
  } catch {
    // Silently fail - cache refresh is optional
  }
}

// Network first with offline page fallback
async function networkFirstWithOfflineFallback(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    // Try to return cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return cached home page as offline fallback
    const offlineResponse = await caches.match("/");
    if (offlineResponse) {
      return offlineResponse;
    }

    // Last resort - return offline message
    return new Response(
      "<html><body><h1>You are offline</h1><p>Please check your internet connection and try again.</p></body></html>",
      {
        status: 503,
        headers: { "Content-Type": "text/html" },
      },
    );
  }
}

// Handle push notifications (future feature)
self.addEventListener("push", (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body,
    icon: "/images/icons/icon-192x192.png",
    badge: "/images/icons/icon-72x72.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/",
    },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || "Event Attendance",
      options,
    ),
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url === url && "focus" in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    }),
  );
});

// Background sync for offline attendance submissions (future feature)
self.addEventListener("sync", (event) => {
  if (event.tag === "attendance-sync") {
    event.waitUntil(syncAttendance());
  }
});

async function syncAttendance() {
  // This would sync any pending attendance submissions
  // Implementation would depend on IndexedDB storage of pending submissions
  console.log("[SW] Syncing attendance submissions...");
}
