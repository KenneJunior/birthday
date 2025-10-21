// PWA Service Worker Registration
function initializePWA() {
  if (!("serviceWorker" in navigator)) {
    console.log("❌ Service Workers are not supported in this browser");
    return;
  }

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });

      console.log("✅ Service Worker registered successfully:", registration);

      // Handle service worker updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        console.log("🔄 New Service Worker found:", newWorker);

        newWorker.addEventListener("statechange", () => {
          console.log(`🔄 Service Worker state: ${newWorker.state}`);

          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            console.log("🔄 New version available!");
            showUpdateNotification(registration);
          }

          if (newWorker.state === "activated") {
            console.log("✅ New Service Worker activated!");
          }
        });
      });

      // Track installation progress
      if (registration.installing) {
        console.log("📥 Service Worker installing...");
      } else if (registration.waiting) {
        console.log("⏳ Service Worker waiting...");
      } else if (registration.active) {
        console.log("✅ Service Worker active and ready!");
      }

      // Handle controller changes (when SW takes control)
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        console.log("🔄 Service Worker controller changed, reloading page...");
        window.location.reload();
      });
    } catch (error) {
      console.error("❌ Service Worker registration failed:", error);

      // Provide helpful error messages
      if (error.name === "SecurityError") {
        console.error("Make sure you are serving over HTTPS or localhost");
      } else if (error.name === "TypeError") {
        console.error(
          "Service Worker file might not exist or have syntax errors"
        );
      } else if (error.message.includes("MIME type")) {
        console.error("Service Worker file might have wrong MIME type");
      }
    }
  });
}

function showUpdateNotification(registration) {
  // You can customize this to show a nicer UI notification later
  const shouldUpdate = confirm(
    "A new version of Fhavur is available! Reload to update?"
  );
  if (shouldUpdate) {
    // Tell the waiting service worker to activate
    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    window.location.reload();
  }
}

// Initialize PWA
initializePWA();

import {
  hideLoading,
  setupAuthProtection,
  showLoading,
  updateLoadingText,
} from "./auth-check.js";
import BirthdayApp from "./js/index.js";

// If BirthdayApp is a default export in src/js/index.js this import works; otherwise adjust.

async function init() {
  // Show loading and verify auth for protected pages
  if (document.getElementById("protectedContent")) {
    updateLoadingText("Verifying access please wait ⚒👷‍♀️👩‍🏭");
    showLoading();

    try {
      const authResult = await setupAuthProtection();
      if (authResult.authenticated) {
        setTimeout(hideLoading, 500);
        // initialize app
        if (typeof BirthdayApp === "function") {
          new BirthdayApp().init();
        }
      }
    } catch (err) {
      console.error("Auth initialization failed", err);
      hideLoading();
    }
  } else {
    // Not a protected page, initialize app normally
    if (typeof BirthdayApp === "function") {
      new BirthdayApp().init();
    }
  }
}

// Auto-run when loaded as module
init();

export default init;
