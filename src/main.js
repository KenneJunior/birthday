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
