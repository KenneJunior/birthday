/**
 * Birthday Celebration Page - Main JavaScript
 *
 * Features:
 * - Image loading with transition
 * - Confetti animation system
 * - Share functionality
 * - Interactive elements
 * - Scroll animations
 * - Performance optimized
 */

// birthday-app( index ).js - Professional Birthday Page JavaScript
// Features: Image loading, confetti, share functionality, animations
import logger from "../js/utility/logger.js";
("use strict");

const appLogger = logger.withContext({
  module: "BirthdayApp",
  file: "birthday-app( index ).js",
  component: "ApplicationCore",
});

// Create contextual loggers for each module
const confettiLogger = appLogger.withContext({
  module: "ConfettiSystem",
  file: "birthday-app( index ).js",
  component: "CanvasAnimation",
});

const imageLogger = appLogger.withContext({
  module: "ImageLoader",
  file: "birthday-app( index ).js",
  component: "AssetLoading",
});

const scrollLogger = appLogger.withContext({
  module: "ScrollAnimator",
  file: "birthday-app( index ).js",
  component: "UIAnimation",
});

const shareLogger = appLogger.withContext({
  module: "ShareManager",
  file: "birthday-app( index ).js",
  component: "SocialIntegration",
});

const perfLogger = appLogger.withContext({
  module: "PerformanceMonitor",
  file: "birthday-app( index ).js",
  component: "MetricsCollection",
});

// Log application startup with comprehensive context
appLogger.info("Birthday application initializing", {
  startupTime: performance.now(),
  domReady: document.readyState,
  visibility: document.visibilityState,
});
let resizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    appLogger.pushContext({
      device: {
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      },
    });
  }, 250);
});

// Update context when going online/offline
window.addEventListener("online", () => {
  appLogger.pushContext({
    pwa: { isOnline: true },
    network: navigator.connection ? { ...appLogger.context.network } : null,
  });
  appLogger.info("Application came online");
});

window.addEventListener("offline", () => {
  appLogger.pushContext({
    pwa: { isOnline: false },
  });
  appLogger.warn("Application went offline");
});

// Update context when page becomes visible/hidden
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    logger.debug("Page became visible");
  } else {
    appLogger.debug("Page became hidden");
  }
});

/**
 * CONFETTI SYSTEM - Canvas-based particle effects
 * @class ConfettiSystem
 */
class ConfettiSystem {
  constructor(container) {
    confettiLogger.time("ConfettiSystem constructor");
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.particleCount = 0;
    this.animationId = null;
    this.colors = ["#8E2DE2", "#4A00E0", "#FF6B6B", "#FECA57", "#1DD1A1"];
    this.isActive = false;
    this.mainPage = "fhavur";

    confettiLogger.debug("ConfettiSystem instance created", {
      container: container?.className || "unknown",
    });
    this.init();
    confettiLogger.timeEnd("ConfettiSystem constructor");
  }

  /**
   * Initialize the confetti system
   */
  init() {
    try {
      confettiLogger.time("Confetti initialization");
      this.createCanvas();
      this.setupResizeListener();
      this.animate = this.animate.bind(this);
      this.isActive = true;

      // Set up event listeners
      this.setupEventListeners();
      confettiLogger.info("Confetti system initialized successfully");
      confettiLogger.timeEnd("Confetti initialization");
    } catch (error) {
      confettiLogger.error("Failed to initialize confetti system", error);
    }
  }

  /**
   * Create and configure canvas element
   */
  createCanvas() {
    try {
      confettiLogger.time("Canvas creation");
      this.canvas = document.createElement("canvas");
      this.ctx = this.canvas.getContext("2d");

      if (!this.ctx) {
        throw new Error("Canvas context not supported");
      }

      this.setupCanvas();

      if (!this.canvas.parentNode) {
        this.container.appendChild(this.canvas);
      }
      confettiLogger.debug("Canvas created and configured");
      confettiLogger.timeEnd("Canvas creation");
    } catch (error) {
      confettiLogger.error("Failed to create canvas", error);
      throw error;
    }
  }

  /**
   * Setup canvas dimensions and styles
   */
  setupCanvas() {
    const rect = this.container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    Object.assign(this.canvas.style, {
      position: "absolute",
      top: "0",
      left: "0",
      pointerEvents: "none",
      zIndex: "10",
    });

    confettiLogger.debug("Canvas setup completed", {
      width: rect.width,
      height: rect.height,
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    confettiLogger.time("Event listeners setup");

    // Image container click
    const imageContainer = document.querySelector(".image-container");
    if (imageContainer) {
      imageContainer.addEventListener("click", () => {
        confettiLogger.debug(
          "Image container clicked, navigating to fhavur.html"
        );
        window.location.href = this.mainPage;
      });
    }

    // Name highlight click
    const nameHighlight = document.querySelector(".name-highlight");
    if (nameHighlight) {
      nameHighlight.addEventListener("click", () => {
        confettiLogger.debug(
          "Name highlight clicked, navigating to fhavur.html"
        );
        window.location.href = this.mainPage;
      });
    }

    confettiLogger.timeEnd("Event listeners setup");
  }

  /**
   * Trigger confetti explosion
   * @param {number} count - Number of particles
   */
  triggerConfetti(count = 50) {
    if (!this.isActive) {
      confettiLogger.warn("Confetti system not active, cannot trigger");
      return;
    }

    confettiLogger.debug("Triggering confetti", { particleCount: count });
    const rect = this.container.getBoundingClientRect();

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * rect.width,
        y: -20 - Math.random() * 100,
        size: Math.random() * 12 + 5,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        speed: Math.random() * 4 + 2,
        angle: Math.random() * Math.PI * 2,
        rotation: Math.random() * 0.2 - 0.1,
        rotationSpeed: Math.random() * 0.02 - 0.01,
        shape: Math.random() > 0.5 ? "circle" : "rect",
        opacity: 1,
        gravity: 0.1,
      });
    }

    this.particleCount += count;
    confettiLogger.debug("Particles added to system", {
      totalParticles: this.particleCount,
    });

    if (!this.animationId) {
      this.animationId = requestAnimationFrame(this.animate);
      confettiLogger.debug("Animation frame requested");
    }
  }

  /**
   * Animation loop
   */
  animate() {
    if (!this.isActive || this.particleCount === 0) {
      confettiLogger.debug("Animation stopped - no particles or inactive");
      this.animationId = null;
      return;
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    let particlesRemoved = 0;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Update physics
      p.y += p.speed;
      p.speed += p.gravity;
      p.angle += p.rotationSpeed;
      p.opacity -= 0.005;

      // Remove dead particles efficiently
      if (p.y > this.canvas.height || p.opacity <= 0) {
        this.particles.splice(i, 1);
        this.particleCount--;
        particlesRemoved++;
        continue;
      }
      // Draw particle
      this.drawParticles(p);
    }

    /*if (particlesRemoved > 0) {
      confettiLogger.debug("Particles cleaned up", {
        removed: particlesRemoved,
      });
    }
*/
    if (this.particleCount > 0) {
      this.animationId = requestAnimationFrame(this.animate);
    } else {
      confettiLogger.debug("All particles expired, stopping animation");
      this.animationId = null;
    }
  }

  drawParticles(p) {
    this.ctx.save();
    this.ctx.translate(p.x, p.y);
    this.ctx.rotate(p.angle);
    this.ctx.globalAlpha = Math.max(0, p.opacity);
    this.ctx.fillStyle = p.color;

    if (p.shape === "circle") {
      this.ctx.beginPath();
      this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    }

    this.ctx.restore();
  }

  /**
   * Setup resize listener with debounce
   */
  setupResizeListener() {
    confettiLogger.debug("Setting up resize listener");
    const debouncedResize = this.debounce(() => {
      confettiLogger.debug("Window resized, updating canvas");
      this.setupCanvas();
    }, 200);

    window.addEventListener("resize", debouncedResize);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    confettiLogger.time("Confetti system cleanup");
    this.isActive = false;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
      confettiLogger.debug("Animation frames cancelled");
    }

    window.removeEventListener("resize", this.debounce);

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
      confettiLogger.debug("Canvas removed from DOM");
    }

    confettiLogger.info("Confetti system destroyed");
    confettiLogger.timeEnd("Confetti system cleanup");
  }

  /**
   * Debounce function for performance
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

/**
 * IMAGE LOADER - Handles image loading with transitions
 * @class ImageLoader
 */
class ImageLoader {
  constructor(imageElement, placeholderElement) {
    imageLogger.time("ImageLoader constructor");
    this.image = imageElement;
    this.placeholder = placeholderElement;
    this.isLoaded = false;

    imageLogger.debug("ImageLoader instance created", {
      imageElement: !!imageElement,
      placeholderElement: !!placeholderElement,
    });
    imageLogger.timeEnd("ImageLoader constructor");
  }

  /**
   * Load image with error handling
   * @param {string} src - Image source URL
   */
  async loadImage(src) {
    imageLogger.time("Image loading");
    if (!src) {
      const errorMsg = "No image source provided";
      imageLogger.error(errorMsg);
      this.handleImageError(errorMsg);
      imageLogger.timeEnd("Image loading");
      return;
    }

    const cacheBustedSrc = this.isDevelopment ? `${src}?t=${Date.now()}` : src;
    imageLogger.debug("Starting image load", { src: cacheBustedSrc });

    try {
      await this.loadImageWithTimeout(cacheBustedSrc, 10000);
      imageLogger.info("Image loaded successfully");
    } catch (error) {
      imageLogger.error("Image loading failed", error);
      this.handleImageError(error.message);
      this.loadFallbackImage();
    } finally {
      imageLogger.timeEnd("Image loading");
    }
  }

  loadFallbackImage() {
    imageLogger.warn("Loading fallback image");
    const fallbackSrc = "/public/pics/screenshot1.jpg";
    if (fallbackSrc !== this.image.src) {
      this.image.src = fallbackSrc;
      this.image.alt = "Birthday celebration image";
      imageLogger.debug("Fallback image set", { fallbackSrc });
    }
  }

  /**
   * Load image with timeout
   */
  loadImageWithTimeout(src, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const error = new Error("Image loading timeout");
        imageLogger.warn("Image loading timeout", { src, timeout });
        reject(error);
      }, timeout);

      const img = new Image();
      imageLogger.debug("Creating image element for loading");

      img.onload = () => {
        clearTimeout(timer);
        imageLogger.debug("Image loaded successfully", { src });
        this.handleImageLoad(src);
        resolve();
      };

      img.onerror = () => {
        clearTimeout(timer);
        const error = new Error("Failed to load image");
        imageLogger.error("Image load error", { src, error });
        reject(error);
      };

      img.src = src;
      imageLogger.debug("Image source set, starting load");
    });
  }

  /**
   * Handle successful image load
   */
  handleImageLoad(src) {
    imageLogger.time("Image transition");
    this.image.src = src;
    this.image.classList.remove("d-none");
    this.animateTransition();
    this.isLoaded = true;
    imageLogger.debug("Image transition completed");
    imageLogger.timeEnd("Image transition");
  }

  /**
   * Handle image loading error
   */
  handleImageError(message) {
    imageLogger.error("Image loading error handled", { message });
    if (this.placeholder) {
      const errorText =
        this.placeholder.querySelector("span") ||
        document.createElement("span");
      errorText.textContent = "Image not available";
      if (!errorText.parentNode) {
        this.placeholder.appendChild(errorText);
      }
      imageLogger.debug("Error message displayed in placeholder");
    }
  }

  /**
   * Animate transition from placeholder to image
   */
  animateTransition() {
    imageLogger.debug("Starting image transition animation");
    this.image.style.opacity = "0";
    this.placeholder.style.opacity = "1";

    const startTime = performance.now();
    const fadeDuration = 600;

    const animateFrame = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / fadeDuration, 1);

      this.image.style.opacity = progress;
      this.placeholder.style.opacity = 1 - progress;

      if (progress < 1) {
        requestAnimationFrame(animateFrame);
      } else {
        this.placeholder.style.display = "none";
        imageLogger.debug("Image transition animation completed");
      }
    };

    requestAnimationFrame(animateFrame);
  }
}

/**
 * SCROLL ANIMATOR - Handles scroll-triggered animations
 * @class ScrollAnimator
 */
class ScrollAnimator {
  constructor() {
    scrollLogger.time("ScrollAnimator constructor");
    this.animatedElements = [];
    this.threshold = 0.1;
    this.observer = null;
    this.isInitialized = false;

    scrollLogger.debug("ScrollAnimator instance created");
    scrollLogger.timeEnd("ScrollAnimator constructor");
  }

  /**
   * Initialize scroll animations
   */
  init() {
    if (this.isInitialized) {
      scrollLogger.debug("ScrollAnimator already initialized");
      return;
    }

    try {
      scrollLogger.time("ScrollAnimator initialization");
      this.cacheElements();
      this.setupObserver();
      this.isInitialized = true;
      scrollLogger.info("ScrollAnimator initialized successfully");
      scrollLogger.timeEnd("ScrollAnimator initialization");
    } catch (error) {
      scrollLogger.error("Failed to initialize scroll animator", error);
    }
  }

  /**
   * Cache DOM elements for animation
   */
  cacheElements() {
    scrollLogger.time("Element caching");
    this.animatedElements = [
      ...document.querySelectorAll("[data-animate]"),
      ...document.querySelectorAll(".message-item"),
      document.querySelector(".birthday-title"),
      document.querySelector(".birthday-wishes"),
    ].filter(Boolean);

    scrollLogger.debug("Elements cached for animation", {
      count: this.animatedElements.length,
      elements: this.animatedElements.map((el) => el.className || el.tagName),
    });
    scrollLogger.timeEnd("Element caching");
  }

  /**
   * Setup Intersection Observer
   */
  setupObserver() {
    scrollLogger.time("Observer setup");
    if (!("IntersectionObserver" in window)) {
      scrollLogger.warn("IntersectionObserver not supported, using fallback");
      this.animateAllElements();
      scrollLogger.timeEnd("Observer setup");
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        scrollLogger.debug("Intersection observed", {
          entriesCount: entries.length,
        });
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            scrollLogger.debug("Element entering viewport", {
              element: entry.target.className || entry.target.tagName,
              intersectionRatio: entry.intersectionRatio,
            });
            this.animateElement(entry.target);
            this.observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: this.threshold,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    this.animatedElements.forEach((el) => this.observer.observe(el));
    scrollLogger.debug("Observer setup completed", {
      observedElements: this.animatedElements.length,
      threshold: this.threshold,
    });
    scrollLogger.timeEnd("Observer setup");
  }

  /**
   * Animate element when it comes into view
   */
  animateElement(element) {
    const animationClass = element.dataset.animate || "fadeInUp";
    scrollLogger.debug("Animating element", {
      element: element.className || element.tagName,
      animationClass,
    });

    element.style.visibility = "visible";
    element.classList.add("animate__animated", `animate__${animationClass}`);

    // Clean up after animation
    element.addEventListener(
      "animationend",
      () => {
        scrollLogger.debug("Element animation completed", {
          element: element.className || element.tagName,
        });
        element.style.visibility = "";
      },
      { once: true }
    );
  }

  /**
   * Fallback: animate all elements if IntersectionObserver is not supported
   */
  animateAllElements() {
    scrollLogger.warn("Using fallback animation (no IntersectionObserver)");
    this.animatedElements.forEach((element, index) => {
      setTimeout(() => {
        scrollLogger.debug("Fallback animation triggered", {
          element: element.className || element.tagName,
          index,
        });
        this.animateElement(element);
      }, index * 150);
    });
  }

  /**
   * Cleanup resources
   */
  destroy() {
    scrollLogger.time("ScrollAnimator cleanup");
    if (this.observer) {
      this.observer.disconnect();
      scrollLogger.debug("IntersectionObserver disconnected");
    }
    this.isInitialized = false;
    scrollLogger.info("ScrollAnimator destroyed");
    scrollLogger.timeEnd("ScrollAnimator cleanup");
  }
}

/**
 * SHARE MANAGER - Handles social sharing functionality
 * @class ShareManager
 */
class ShareManager {
  constructor() {
    shareLogger.time("ShareManager constructor");
    this.buttons = [];
    this.isInitialized = false;

    shareLogger.debug("ShareManager instance created");
    shareLogger.timeEnd("ShareManager constructor");
  }

  /**
   * Initialize share functionality
   */
  init() {
    if (this.isInitialized) {
      shareLogger.debug("ShareManager already initialized");
      return;
    }

    try {
      shareLogger.time("ShareManager initialization");
      this.cacheButtons();
      this.setupListeners();
      this.isInitialized = true;
      shareLogger.info("ShareManager initialized successfully");
      shareLogger.timeEnd("ShareManager initialization");
    } catch (error) {
      shareLogger.error("Failed to initialize share manager", error);
    }
  }

  /**
   * Cache share buttons
   */
  cacheButtons() {
    shareLogger.time("Button caching");
    this.buttons = Array.from(document.querySelectorAll(".share-btn")).filter(
      Boolean
    );

    shareLogger.debug("Share buttons cached", {
      buttonCount: this.buttons.length,
      platforms: this.buttons.map(
        (btn) =>
          Array.from(btn.classList).find((cls) =>
            [
              "whatsapp",
              "instagram",
              "facebook",
              "twitter",
              "telegram",
            ].includes(cls)
          ) || "unknown"
      ),
    });
    shareLogger.timeEnd("Button caching");
  }

  /**
   * Setup event listeners
   */
  setupListeners() {
    shareLogger.time("Listener setup");
    this.buttons.forEach((btn, index) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        shareLogger.debug("Share button clicked", {
          index,
          button: btn.className,
        });
        this.handleShare(btn);
      });

      btn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          shareLogger.debug("Share button keyboard activated", {
            index,
            key: e.key,
            button: btn.className,
          });
          this.handleShare(btn);
        }
      });
    });
    shareLogger.debug("Event listeners attached to share buttons");
    shareLogger.timeEnd("Listener setup");
  }

  /**
   * Handle share action
   */
  handleShare(button) {
    shareLogger.time("Share action");
    this.animateButton(button);

    const platform = Array.from(button.classList).find((cls) =>
      ["whatsapp", "instagram", "facebook", "twitter", "telegram"].includes(cls)
    );

    shareLogger.debug("Share platform identified", { platform });

    if (platform) {
      this.shareToPlatform(platform);
    } else {
      shareLogger.warn("Unknown share platform", {
        buttonClasses: button.className,
      });
    }
    shareLogger.timeEnd("Share action");
  }

  /**
   * Share to specific platform
   */
  shareToPlatform(platform) {
    shareLogger.time(`Share to ${platform}`);
    const pageUrl = encodeURIComponent(window.location.href);
    const shareText = encodeURIComponent(
      "Beautiful birthday wishes! that was send to me you can also send to your loved ones using this website"
    );

    const shareConfig = {
      whatsapp: `https://wa.me/?text=${shareText}%20${pageUrl}`,
      instagram: "https://instagram.com/",
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`,
      twitter: `https://twitter.com/intent/tweet?text=${shareText}&url=${pageUrl}`,
      telegram: `https://t.me/share/url?url=${pageUrl}&text=${shareText}`,
    };

    shareLogger.debug("Share configuration prepared", {
      platform,
      pageUrl: window.location.href,
      shareConfig: shareConfig[platform] ? "available" : "missing",
    });

    if (shareConfig[platform]) {
      shareLogger.info("Opening share dialog", { platform });
      window.open(
        shareConfig[platform],
        "_blank",
        "width=600,height=400,noopener,noreferrer"
      );
    } else {
      shareLogger.error("No share configuration found for platform", {
        platform,
      });
    }
    shareLogger.timeEnd(`Share to ${platform}`);
  }

  /**
   * Animate button on click
   */
  animateButton(button) {
    shareLogger.debug("Animating share button");
    button.style.transform = "scale(0.9)";

    setTimeout(() => {
      button.style.transform = "scale(1.1)";

      setTimeout(() => {
        button.style.transform = "";
        shareLogger.debug("Share button animation completed");
      }, 150);
    }, 150);
  }

  /**
   * Cleanup resources
   */
  destroy() {
    shareLogger.time("ShareManager cleanup");
    this.buttons.forEach((btn, index) => {
      btn.removeEventListener("click", this.handleShare);
      btn.removeEventListener("keydown", this.handleShare);
      shareLogger.debug("Event listeners removed", { index });
    });

    this.isInitialized = false;
    shareLogger.info("ShareManager destroyed");
    shareLogger.timeEnd("ShareManager cleanup");
  }
}

/**
 * PERFORMANCE MONITOR - Monitors and logs performance metrics
 * @class PerformanceMonitor
 */
class PerformanceMonitor {
  constructor() {
    perfLogger.time("PerformanceMonitor constructor");
    this.metrics = {};
    this.observer = null;

    perfLogger.debug("PerformanceMonitor instance created");
    perfLogger.timeEnd("PerformanceMonitor constructor");
  }

  /**
   * Start performance monitoring
   */
  start() {
    perfLogger.time("Performance monitoring start");
    this.observeLongTasks();
    this.metrics.startTime = performance.now();
    perfLogger.info("Performance monitoring started", {
      startTime: this.metrics.startTime,
    });
    perfLogger.timeEnd("Performance monitoring start");
  }

  /**
   * Observe long tasks for performance monitoring
   */
  observeLongTasks() {
    if ("PerformanceObserver" in window) {
      perfLogger.debug("Setting up PerformanceObserver for long tasks");
      this.observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          perfLogger.warn("Long task detected", {
            duration: `${entry.duration.toFixed(2)}ms`,
            name: entry.name,
            startTime: entry.startTime,
          });
        });
      });

      try {
        this.observer.observe({ entryTypes: ["longtask"] });
        perfLogger.debug("Long task observation enabled");
      } catch (error) {
        perfLogger.warn("Long task observation not supported", error);
      }
    } else {
      perfLogger.warn("PerformanceObserver not available in this environment");
    }
  }

  /**
   * Stop performance monitoring
   */
  stop() {
    perfLogger.time("Performance monitoring stop");
    if (this.observer) {
      this.observer.disconnect();
      perfLogger.debug("PerformanceObserver disconnected");
    }

    this.metrics.totalTime = performance.now() - this.metrics.startTime;
    perfLogger.info("Performance monitoring stopped", {
      totalTime: `${this.metrics.totalTime.toFixed(2)}ms`,
      metricsCollected: Object.keys(this.metrics).length,
    });
    perfLogger.timeEnd("Performance monitoring stop");
  }
}

/**
 * MAIN BIRTHDAY APP - Coordinates all components
 * @class BirthdayApp
 */
class BirthdayApp {
  constructor() {
    appLogger.time("BirthdayApp constructor");
    this.modules = {};
    this.performanceMonitor = new PerformanceMonitor();
    this.isInitialized = false;
    this.eventHandlers = {};

    appLogger.debug("BirthdayApp instance created");
    appLogger.timeEnd("BirthdayApp constructor");
  }

  /**
   * Initialize the application
   */
  async init() {
    appLogger.time("BirthdayApp initialization");
    this.trackEvent("app_initialized");

    if (this.isInitialized) {
      appLogger.debug("BirthdayApp already initialized");
      appLogger.timeEnd("BirthdayApp initialization");
      return;
    }

    this.performanceMonitor.start();

    try {
      await this.initializeModules();
      this.setupEventListeners();
      this.startApp();
      this.isInitialized = true;
      appLogger.info("BirthdayApp initialized successfully");
    } catch (error) {
      appLogger.error("Failed to initialize BirthdayApp", error);
      this.handleInitializationError(error);
    } finally {
      this.performanceMonitor.stop();
      appLogger.timeEnd("BirthdayApp initialization");
    }
  }

  trackEvent(eventName, data = {}) {
    appLogger.debug("Tracking analytics event", { eventName, data });
    if (typeof gtag !== "undefined") {
      gtag("event", eventName, data);
    } else {
      appLogger.debug("Google Analytics not available, event not sent");
    }
  }

  /**
   * Initialize all modules
   */
  async initializeModules() {
    appLogger.time("Module initialization");
    try {
      this.cacheElements();

      // Initialize modules with fallbacks
      this.modules = {
        confetti: this.createModuleWithFallback(
          ConfettiSystem,
          this.elements.card
        ),
        imageLoader: this.createModuleWithFallback(
          ImageLoader,
          this.elements.birthdayImage,
          this.elements.imagePlaceholder
        ),
        scrollAnimator: this.createModuleWithFallback(ScrollAnimator),
        shareManager: this.createModuleWithFallback(ShareManager),
      };

      appLogger.info("All modules initialized successfully", {
        modules: Object.keys(this.modules),
      });
    } catch (error) {
      appLogger.error("Module initialization failed", error);
      this.initializeFallbackMode();
    } finally {
      appLogger.timeEnd("Module initialization");
    }
  }

  createModuleWithFallback(ModuleClass, ...args) {
    try {
      appLogger.debug(`Initializing ${ModuleClass.name}`);
      const module = new ModuleClass(...args);
      appLogger.debug(`${ModuleClass.name} initialized successfully`);
      return module;
    } catch (error) {
      appLogger.warn(`${ModuleClass.name} failed, using fallback`, error);
      return this.createFallbackModule(ModuleClass);
    }
  }

  createFallbackModule(ModuleClass) {
    appLogger.warn(`Creating fallback for ${ModuleClass.name}`);
    return {
      init: () => appLogger.debug(`Fallback ${ModuleClass.name}.init called`),
      destroy: () =>
        appLogger.debug(`Fallback ${ModuleClass.name}.destroy called`),
    };
  }

  /**
   * Cache DOM elements
   */
  cacheElements() {
    appLogger.time("Element caching");
    this.elements = {
      card: document.querySelector(".birthday-card"),
      imageContainer: document.querySelector(".image-container"),
      imagePlaceholder: document.querySelector(".image-placeholder"),
      birthdayImage: document.getElementById("birthdayImage"),
      messageItems: document.querySelectorAll(".message-item"),
    };

    appLogger.debug("DOM elements cached", {
      elementsFound: Object.keys(this.elements).filter(
        (key) => !!this.elements[key]
      ).length,
      totalElements: Object.keys(this.elements).length,
    });
    appLogger.timeEnd("Element caching");
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    appLogger.time("Event listener setup");

    // Store references for cleanup
    this.eventHandlers = {
      imageMouseEnter: () => {
        appLogger.debug("Image container mouse enter - triggering confetti");
        this.modules.confetti.triggerConfetti(20);
      },
      imageTouchStart: () => {
        appLogger.debug("Image container touch start - triggering confetti");
        this.modules.confetti.triggerConfetti(20);
      },
      resize: this.debounce(() => this.handleResize(), 200),
    };

    if (this.elements.imageContainer) {
      this.elements.imageContainer.addEventListener(
        "mouseenter",
        this.eventHandlers.imageMouseEnter
      );
      this.elements.imageContainer.addEventListener(
        "touchstart",
        this.eventHandlers.imageTouchStart,
        { passive: true }
      );
      appLogger.debug("Image container event listeners attached");
    } else {
      appLogger.warn("Image container not found for event listeners");
    }

    window.addEventListener("resize", this.eventHandlers.resize);
    appLogger.debug("Window resize listener attached");

    appLogger.timeEnd("Event listener setup");
  }

  /**
   * Start the application
   */
  startApp() {
    appLogger.time("Application startup");

    // Load image
    appLogger.debug("Starting image load");
    this.modules.imageLoader.loadImage("/pics/tata.jpg").catch((error) => {
      appLogger.warn("Image loading failed", error);
    });

    // Initial animations
    appLogger.debug("Starting message animations");
    this.animateMessagesSequentially();

    // Initial confetti burst
    setTimeout(() => {
      appLogger.debug("Triggering initial confetti burst");
      this.modules.confetti.triggerConfetti(30);
    }, 1000);

    appLogger.info("Application startup sequence completed");
    appLogger.timeEnd("Application startup");
  }

  /**
   * Handle window resize
   */
  handleResize() {
    appLogger.debug("Window resize handled");
    if (this.modules.confetti) {
      this.modules.confetti.setupCanvas();
    }
  }

  /**
   * Animate messages sequentially
   */
  animateMessagesSequentially() {
    if (!this.elements.messageItems) {
      appLogger.warn("No message items found for animation");
      return;
    }

    appLogger.debug("Starting sequential message animations", {
      messageCount: this.elements.messageItems.length,
    });

    this.elements.messageItems.forEach((item, index) => {
      setTimeout(() => {
        item.style.opacity = "1";
        item.style.visibility = "visible";
        appLogger.debug(`Message ${index + 1} animated`);
      }, index * 300);
    });
  }

  /**
   * Handle initialization errors
   */
  handleInitializationError(error) {
    appLogger.error("Handling initialization error", error);

    // Show user-friendly error message
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef476f;
      color: white;
      padding: 1rem;
      border-radius: 8px;
      z-index: 10000;
      max-width: 300px;
    `;
    errorDiv.textContent = "Failed to initialize page. Please refresh.";
    document.body.appendChild(errorDiv);

    appLogger.debug("Error message displayed to user");

    // Remove error message after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
        appLogger.debug("Error message removed");
      }
    }, 5000);
  }

  /**
   * Debounce function for performance
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func.apply(this, args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Initialize fallback mode when modules fail
   */
  initializeFallbackMode() {
    appLogger.warn("Initializing fallback mode due to module failures");
    // Basic functionality without advanced features
    if (this.elements.birthdayImage) {
      this.elements.birthdayImage.src = "/pics/tata.jpg";
    }
    this.animateMessagesSequentially();
  }

  /**
   * Cleanup resources
   */
  destroy() {
    appLogger.time("BirthdayApp cleanup");

    // Destroy all modules
    Object.entries(this.modules).forEach(([name, module]) => {
      if (module && typeof module.destroy === "function") {
        appLogger.debug(`Destroying module: ${name}`);
        module.destroy();
      }
    });

    // Remove event listeners
    if (this.elements.imageContainer) {
      this.elements.imageContainer.removeEventListener(
        "mouseenter",
        this.eventHandlers.imageMouseEnter
      );
      this.elements.imageContainer.removeEventListener(
        "touchstart",
        this.eventHandlers.imageTouchStart
      );
      appLogger.debug("Image container event listeners removed");
    }

    window.removeEventListener("resize", this.eventHandlers.resize);
    appLogger.debug("Window resize listener removed");

    this.isInitialized = false;
    appLogger.info("BirthdayApp destroyed successfully");
    appLogger.timeEnd("BirthdayApp cleanup");
  }
}

// Global error handling with logging
window.addEventListener("error", (event) => {
  logger.error("Global error caught", {
    message: event.error?.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  });
});

window.addEventListener("unhandledrejection", (event) => {
  logger.error("Unhandled promise rejection", {
    reason: event.reason?.message || event.reason,
  });
});

// Initialize the application when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  appLogger.time("DOMContentLoaded initialization");
  appLogger.debug("DOM content loaded, starting application initialization");

  // Check if we're on a protected page
  const isProtectedPage = document.getElementById("protectedContent");

  if (isProtectedPage) {
    appLogger.debug("Protected page detected, waiting for authentication");
    // Wait for authentication before initializing
    const initApp = async () => {
      try {
        appLogger.debug("Checking authentication status");
        const authResult = await window.setupAuthProtection?.();
        if (authResult?.authenticated) {
          appLogger.info("Authentication successful, initializing BirthdayApp");
          new BirthdayApp().init();
        } else {
          appLogger.warn("Authentication failed or not available");
        }
      } catch (error) {
        appLogger.error("Authentication check failed", error);
      }
    };

    initApp();
  } else {
    appLogger.debug("Non-protected page, initializing immediately");
    // Initialize immediately for non-protected pages
    new BirthdayApp().init();
  }

  appLogger.timeEnd("DOMContentLoaded initialization");
});

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ConfettiSystem,
    ImageLoader,
    ScrollAnimator,
    ShareManager,
    BirthdayApp,
    PerformanceMonitor,
  };
}

export default BirthdayApp;
