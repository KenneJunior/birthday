import { logger } from "./utility/logger.js";

// Create contextual loggers for different modules
const pwaLogger = logger.withContext({ module: "PWA" });
const appLogger = logger.withContext({ module: "BirthdayApp" });
const confettiLogger = appLogger.withContext({ module: "Confetti" });
const audioLogger = appLogger.withContext({ module: "Audio" });
const heartLogger = appLogger.withContext({ module: "HeartEffects" });
const celebrationLogger = appLogger.withContext({ module: "Celebration" });
const socialLogger = appLogger.withContext({ module: "SocialSharing" });

// PWA Service Worker Registration
function initializePWA() {
  pwaLogger.time("PWA initialization");

  if (!("serviceWorker" in navigator)) {
    pwaLogger.warn("Service Workers are not supported in this browser");
    pwaLogger.timeEnd("PWA initialization");
    return;
  }

  window.addEventListener("load", async () => {
    try {
      pwaLogger.debug("Registering service worker");
      const registration = await navigator.serviceWorker.register(
        "/sw.js?debug=debug",
        {
          scope: "/",
        }
      );

      pwaLogger.info("Service Worker registered successfully", {
        scope: registration.scope,
        active: !!registration.active,
      });

      // Handle service worker updates
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        pwaLogger.info("New Service Worker found", {
          state: newWorker.state,
          scriptURL: newWorker.scriptURL,
        });

        newWorker.addEventListener("statechange", () => {
          pwaLogger.debug(`Service Worker state change`, {
            state: newWorker.state,
          });

          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            pwaLogger.info(
              "New version available, showing update notification"
            );
            showUpdateNotification(registration);
          }

          if (newWorker.state === "activated") {
            pwaLogger.info("New Service Worker activated");
          }
        });
      });

      // Track installation progress
      if (registration.installing) {
        pwaLogger.debug("Service Worker installing");
      } else if (registration.waiting) {
        pwaLogger.debug("Service Worker waiting");
      } else if (registration.active) {
        pwaLogger.info("Service Worker active and ready");
      }

      // Handle controller changes (when SW takes control)
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        pwaLogger.info("Service Worker controller changed, reloading page");
        window.location.reload();
      });

      pwaLogger.timeEnd("PWA initialization");
    } catch (error) {
      pwaLogger.error("Service Worker registration failed", error);

      // Provide helpful error messages
      if (error.name === "SecurityError") {
        pwaLogger.error(
          "Service Worker security error - serve over HTTPS or localhost"
        );
      } else if (error.name === "TypeError") {
        pwaLogger.error(
          "Service Worker file might not exist or have syntax errors"
        );
      } else if (error.message.includes("MIME type")) {
        pwaLogger.error("Service Worker file might have wrong MIME type");
      }

      pwaLogger.timeEnd("PWA initialization");
    }
  });
}

function showUpdateNotification(registration) {
  pwaLogger.debug("Showing update notification to user");

  // You can customize this to show a nicer UI notification later
  const shouldUpdate = confirm(
    "A new version of Fhavur is available! Reload to update?"
  );

  if (shouldUpdate) {
    pwaLogger.info("User accepted update, activating new Service Worker");
    // Tell the waiting service worker to activate
    if (registration.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    window.location.reload();
  } else {
    pwaLogger.debug("User declined update");
  }
}

// Initialize PWA
initializePWA();

import { PlatformDetector } from "../PWA/pwa-prompt.js";
import { UltimateModal } from "./Modal.js";
import Notification from "./notification.js";

document.addEventListener("DOMContentLoaded", () => {
  appLogger.time("Birthday app initialization");

  // DOM Elements
  const elements = {
    birthdayAudio: document.getElementById("birthdayAudio"),
    celebrateButton: document.querySelector(".btn-celebrate"),
    clickHeartsContainer: document.getElementById("clickHearts"),
    growButton: document.querySelector(".grow-button"),
    confettiElements: document.querySelectorAll(".confetti"),
    imageContainer: document.querySelector(".image-container"),
    nameElement: document.querySelector("#birthday-name"),
    playBtn: document.getElementById("playBtn"),
    signatureElement: document.querySelector(".signature"),
    socialShareLinks: document.querySelectorAll(
      ".social-share a, .social-share button"
    ),
  };

  appLogger.debug("DOM elements cached", {
    elementsFound: Object.keys(elements).filter((key) => !!elements[key])
      .length,
    totalElements: Object.keys(elements).length,
  });

  // State management
  const state = {
    audio: {
      isAllowed: false,
      isPlaying: false,
    },
    heart: {
      lastCreation: 0,
      growing: null,
      growInterval: null,
      maxSize: 100, // Maximum size in pixels
      growthRate: 3, // Growth rate in pixels per interval
    },
    growButton: {
      growInterval: 0,
      currentScale: 1,
      maxScale: 3, // Maximum scale when fully held
      scaleIncrement: 0.02, // How much to grow per interval
      growSpeed: 50, // Milliseconds between growth increments
    },
    confetti: {
      number: 100, // Number of confetti pieces
      colors: [
        "#ff6b6b",
        "#ff8e53",
        "#ffd700",
        "#4caf50",
        "#2196f3",
        "#9c27b0",
        "#ff4081",
        "#00bcd4",
        "#8bc34a",
        "#ff5722",
        "#3e0909",
      ],
      interval: 5000,
      numberOfFloatingElement: 16,
    },
    animating: false,
    cooldown: 10000,
  };

  appLogger.debug("Application state initialized", {
    confettiCount: state.confetti.number,
    floatingElements: state.confetti.numberOfFloatingElement,
    cooldown: state.cooldown,
  });

  // Constants
  const EMOJIS = [
    "❤️",
    "💖",
    "💗",
    "💓",
    "💞",
    "🌸",
    "✨",
    "🎀",
    "💘",
    "💕",
    "💝",
  ];
  const LETTER_ANIMATIONS = [
    "fadeInUp",
    "swing",
    "bounce",
    "flip",
    "zoomIn",
    "rotate",
    "floatIn",
    "pulse",
    "rubberBand",
    "tada",
    "jello",
  ];

  // Initialize the application
  function init() {
    appLogger.time("App component initialization");

    detectPlatform();

    // Add tooltip styles
    const style = document.createElement("style");
    style.textContent = `
    .modal-tooltip {
      position: fixed;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.9rem;
      transform: translate(-50%, 10px);
      opacity: 0;
      transition: all 0.3s ease;
      z-index: 10000;
      pointer-events: none;
      white-space: nowrap;
    }
    .modal-tooltip.visible {
      opacity: 1;
      transform: translate(-50%, 0);
    }
    .modal-tooltip::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      margin-left: -5px;
      border-width: 5px;
      border-style: solid;
      border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
    }
  `;
    document.head.appendChild(style);
    appLogger.debug("Tooltip styles added to document");

    new Notification().toggleViewDetails(true).initialize();
    appLogger.debug("Notification system initialized");

    new UltimateModal().init();
    appLogger.debug("UltimateModal initialized");

    setupEventListeners();
    loadImages();
    triggerCelebration(1000); // Initial celebration after 1 second
    animateName();
    triggerConfetti();
    createFloatingElements();

    // Periodic confetti and floating elements refresh
    setInterval(() => {
      appLogger.debug("Periodic celebration refresh triggered");
      triggerConfetti();
      createFloatingElements();
    }, state.cooldown);

    appLogger.info("Birthday application initialized successfully");
    appLogger.timeEnd("App component initialization");
  }

  function detectPlatform() {
    appLogger.time("Platform detection");
    const platform = PlatformDetector.detect();
    appLogger.debug("Platform detected", { platform });

    if (platform === "iOS" || platform === "Android") {
      state.confetti.numberOfFloatingElement = 8;
      state.confetti.number = 50;
      state.confetti.interval = 8000;
      state.heart.growthRate = 2;
      state.heart.maxSize = 80;
      state.growButton.maxScale = 2.5;
      state.cooldown = 15000;

      appLogger.info("Mobile platform detected, adjusting settings", {
        floatingElements: state.confetti.numberOfFloatingElement,
        confettiCount: state.confetti.number,
        heartGrowthRate: state.heart.growthRate,
        cooldown: state.cooldown,
      });
    } else {
      appLogger.debug("Desktop platform detected, using default settings");
    }
    appLogger.timeEnd("Platform detection");
  }

  function setupGrowButtonEventListeners() {
    appLogger.time("Grow button event setup");

    elements.growButton.addEventListener("mousedown", startGrowing);
    elements.growButton.addEventListener("touchstart", startGrowing);

    // When mouse/touch ends
    elements.growButton.addEventListener("mouseup", releaseButton);
    elements.growButton.addEventListener("touchend", releaseButton);

    // Reset transforms on mouse leave
    document.addEventListener("mouseleave", () => {
      appLogger.debug("Mouse left document, resetting transforms");
      elements.imageContainer.style.transform = "scale(1) rotate(0deg)";
      elements.signatureElement.style.transform = "translate(0, 0)";
    });

    let lastMove = 0;
    document.addEventListener("mousemove", (e) => {
      const now = Date.now();
      if (now - lastMove > 50) {
        lastMove = now;
        const { clientX, clientY } = e;
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const moveX = (clientX - centerX) / 60;
        const moveY = (clientY - centerY) / 60;

        elements.imageContainer.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.08) rotate(2deg)`;
        elements.signatureElement.style.transform = `translate(${
          moveX / 2
        }px, ${moveY / 2}px)`;

        appLogger.debug("Mouse move parallax effect applied", {
          moveX,
          moveY,
        });
      }
    });

    appLogger.debug("Grow button event listeners configured");
    appLogger.timeEnd("Grow button event setup");
  }

  function startGrowing(e) {
    appLogger.time("Start growing animation");
    e.preventDefault();
    state.growButton.currentScale = 1;
    elements.growButton.classList.add("holding");
    clearInterval(elements.growInterval);

    appLogger.debug("Starting grow interval", {
      currentScale: state.growButton.currentScale,
      maxScale: state.growButton.maxScale,
    });

    state.growButton.growInterval = setInterval(() => {
      if (state.growButton.currentScale < state.growButton.maxScale) {
        state.growButton.currentScale += state.growButton.scaleIncrement;
        elements.growButton.style.transform = `scale(${state.growButton.currentScale})`;
        appLogger.debug("Grow button scaling", {
          currentScale: state.growButton.currentScale,
        });
      }
    }, state.growButton.growSpeed);

    appLogger.timeEnd("Start growing animation");
  }

  function releaseButton(e) {
    appLogger.time("Release button");

    elements.growButton.classList.remove("holding");
    clearInterval(state.growButton.growInterval);

    const wasHeld = state.growButton.currentScale > 1.1;
    elements.growButton.style.transform = "scale(1)";

    appLogger.debug("Button released", {
      wasHeld,
      finalScale: state.growButton.currentScale,
    });

    state.growButton.currentScale = 1;
    const es = e;
    e.preventDefault();

    if (!wasHeld) {
      appLogger.debug("Short press detected, toggling audio");
      toggleAudio();
    } else {
      appLogger.debug("Long press detected, toggling audio");
      toggleAudio();
    }

    appLogger.timeEnd("Release button");
  }

  function createFloatingElements() {
    appLogger.time("Create floating elements");

    const symbols = [
      { class: "hearts", emoji: "❤️" },
      { class: "hearts", emoji: "💖" },
      { class: "hearts", emoji: "💗" },
      { class: "hearts", emoji: "💓" },
      { class: "hearts", emoji: "💞" },
      { class: "hearts", emoji: "💕" },
      { class: "hearts", emoji: "💝" },
      { class: "flowers", emoji: "🌷" },
      { class: "flowers", emoji: "🌹" },
      { class: "flowers", emoji: "🌺" },
      { class: "flowers", emoji: "🌻" },
      { class: "stars", emoji: "✨" },
      { class: "stars", emoji: "🌟" },
      { class: "stars", emoji: "🎇" },
      { class: "flowers", emoji: "🌸" },
    ];

    const numElements = state.confetti.numberOfFloatingElement;
    appLogger.debug("Creating floating elements", {
      count: numElements,
      symbolTypes: symbols.length,
    });

    for (let i = 0; i < numElements; i++) {
      const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
      const element = document.createElement("div");
      element.className = `floating ${randomSymbol.class}`;
      element.innerHTML = randomSymbol.emoji;
      element.setAttribute("aria-hidden", "true");

      // Random position within safe bounds (5% to 95% to avoid edges)
      const top = Math.floor(Math.random() * 90) + 5;
      const left = Math.floor(Math.random() * 90) + 5;
      element.style.top = `${top}%`;
      element.style.left = `${left}%`;

      // Random animation delay for staggered effect
      element.style.animationDelay = `${Math.random() * 3}s`;

      // Limit the number of floating elements to prevent memory leaks
      const maxFloatingElements = 40;
      const currentFloating = document.querySelectorAll(".floating");

      if (currentFloating.length >= maxFloatingElements) {
        appLogger.debug("Floating element limit reached, removing oldest");
        // Remove oldest floating elements
        for (
          let j = 0;
          j < currentFloating.length - maxFloatingElements + 1;
          j++
        ) {
          currentFloating[j].remove();
        }
      }

      setTimeout(() => {
        element.remove();
        appLogger.debug("Floating element removed after timeout");
      }, 30000);

      document.body.appendChild(element);
    }

    appLogger.debug("Floating elements created", { count: numElements });
    appLogger.timeEnd("Create floating elements");
  }

  function triggerConfetti() {
    confettiLogger.time("Trigger confetti");

    confettiLogger.debug("Animating confetti elements", {
      elementCount: elements.confettiElements.length,
    });

    elements.confettiElements.forEach((confetti, index) => {
      confetti.style.animation = "none";
      void confetti.offsetWidth; // Trigger reflow
      confetti.style.animation = `confettiFall ${
        3 + index * 0.5
      }s infinite ease-in-out`;
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.transform = `translateY(-120vh) rotate(0deg) scale(1)`;
    });

    // Create additional confetti for burst effect
    confettiLogger.debug("Creating extra confetti", {
      count: state.confetti.number,
    });

    for (let i = 0; i < state.confetti.number; i++) {
      const extraConfetti = document.createElement("div");
      extraConfetti.className = "confetti extra-confetti";
      extraConfetti.style.left = `${Math.random() * 100}%`;
      extraConfetti.style.background = getRandomColor();
      extraConfetti.style.width = `${8 + Math.random() * 8}px`;
      extraConfetti.style.height = extraConfetti.style.width;
      extraConfetti.style.animation = `confettiFall ${
        2 + Math.random() * 3
      }s linear`;
      document.querySelector(".container").appendChild(extraConfetti);

      // Remove extra confetti after animation
      setTimeout(() => {
        extraConfetti.remove();
        confettiLogger.debug("Extra confetti removed");
      }, state.confetti.interval);
    }

    confettiLogger.debug("Confetti animation triggered");
    confettiLogger.timeEnd("Trigger confetti");
  }

  function getRandomColor() {
    const { colors } = state.confetti;
    const color = colors[Math.floor(Math.random() * colors.length)];
    confettiLogger.debug("Random color selected", { color });
    return color;
  }

  function animateName() {
    appLogger.time("Animate name");

    const nameElement = elements.nameElement;
    if (!nameElement) {
      appLogger.warn("Name element not found for animation");
      appLogger.timeEnd("Animate name");
      return;
    }

    const name = nameElement.textContent.trim();
    nameElement.innerHTML = "";
    const randomAnimations = getUniqueRandomAnimations(name.length);

    appLogger.debug("Animating name letters", {
      nameLength: name.length,
      animationCount: randomAnimations.length,
    });

    name.split("").forEach((letter, index) => {
      state.animating = true;
      const span = document.createElement("span");
      if (letter !== " ") {
        span.className = "name-letter";
        span.textContent = letter;
        const anim = randomAnimations[index % randomAnimations.length];
        span.style.animation = `${anim} 2s ${index * 0.1 + 0.1}s forwards`;
        span.style.opacity = "1";
        appLogger.debug("Letter animation applied", {
          letter,
          animation: anim,
        });
      }
      span.textContent = letter;
      span.addEventListener("animationend", () => {
        if (index === randomAnimations.length - 1) {
          state.animating = false;
          appLogger.debug("Name animation completed");
        }
      });
      nameElement.appendChild(span);
    });

    appLogger.timeEnd("Animate name");
  }

  function getUniqueRandomAnimations(count) {
    const shuffled = [...LETTER_ANIMATIONS];
    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const result = shuffled.slice(0, count);
    appLogger.debug("Random animations generated", {
      count,
      animations: result,
    });
    return result;
  }

  // Event Listeners setup
  function setupEventListeners() {
    appLogger.time("Event listeners setup");

    // Audio control
    document.body.addEventListener("click", enableAudio, { once: true });
    appLogger.debug("One-time audio enable listener added");

    // Celebration button
    elements.celebrateButton.addEventListener("click", () => {
      celebrationLogger.debug("Celebrate button clicked");
      triggerCelebration(0);
    });

    elements.celebrateButton.addEventListener(
      "keydown",
      handleCelebrateKeyDown
    );
    appLogger.debug("Celebrate button event listeners added");

    // Mobile touch effects
    elements.celebrateButton.addEventListener("touchstart", () => {
      elements.celebrateButton.style.transform = "scale(0.95)";
      appLogger.debug("Celebrate button touch start - scaling down");
    });

    elements.celebrateButton.addEventListener("touchend", () => {
      elements.celebrateButton.style.transform = "";
      appLogger.debug("Celebrate button touch end - reset scale");
    });

    elements.nameElement.addEventListener("mouseenter", () => {
      if (!state.animating) {
        appLogger.debug("Name element mouse enter - triggering animation");
        animateName();
      } else {
        appLogger.debug(
          "Name element mouse enter - animation already in progress"
        );
      }
    });

    // Click effects
    document.addEventListener("mousedown", (e) => {
      if (!e.target.closest(" .modal-container, img,  a,  button")) {
        heartLogger.debug("Mouse down on empty space - starting heart growth");
        startGrowingHeart(e);
      }
    });

    document.addEventListener("touchstart", (e) => {
      if (!e.target.closest(" .modal-container, img,  a,  button")) {
        heartLogger.debug("Touch start on empty space - starting heart growth");
        startGrowingHeart(e.touches[0]);
      }
    });

    setupGrowButtonEventListeners();

    document.addEventListener("mouseup", releaseGrowingHeart);
    document.addEventListener("touchend", releaseGrowingHeart);
    document.addEventListener("mouseleave", releaseGrowingHeart);
    appLogger.debug("Heart growth control listeners added");

    // Social share buttons
    elements.socialShareLinks.forEach((link, index) => {
      link.addEventListener("click", handleSocialShareClick);
      appLogger.debug("Social share listener added", {
        index,
        platform: link.className,
      });
    });

    // Window resize - debounce to avoid excessive calls
    window.addEventListener(
      "resize",
      debounce(() => {
        appLogger.debug(
          "Window resize detected - handling responsive adjustments"
        );
        // Handle any responsive adjustments if needed
      }, 200)
    );

    appLogger.info("All event listeners configured successfully");
    appLogger.timeEnd("Event listeners setup");
  }

  // Audio functions
  function enableAudio() {
    audioLogger.time("Enable audio");
    state.audio.isAllowed = true;
    audioLogger.info("Audio interaction allowed by user");

    if (state.audio.isPlaying) {
      audioLogger.debug("Audio was playing, resuming playback");
      playAudio().catch((error) => {
        audioLogger.error("Failed to resume audio after enable", error);
      });
    }
    audioLogger.timeEnd("Enable audio");
  }

  function toggleAudio() {
    audioLogger.time("Toggle audio");

    if (state.audio.isPlaying) {
      audioLogger.debug("Pausing audio");
      pauseAudio();
    } else {
      audioLogger.debug("Playing audio");
      playAudio();
    }
    audioLogger.timeEnd("Toggle audio");
  }

  async function playAudio() {
    audioLogger.time("Play audio");

    if (!state.audio.isAllowed) {
      audioLogger.warn("Audio not allowed by user, skipping playback");
      audioLogger.timeEnd("Play audio");
      return;
    }

    try {
      audioLogger.debug("Attempting to play birthday audio");
      await elements.birthdayAudio.play();
      elements.playBtn.innerHTML =
        '<i class="fas fa-pause" aria-hidden="true"></i>';
      state.audio.isPlaying = true;
      audioLogger.info("Audio playback started successfully");
    } catch (error) {
      audioLogger.error("Audio playback failed", error);
    }
    audioLogger.timeEnd("Play audio");
  }

  function pauseAudio() {
    audioLogger.time("Pause audio");

    elements.birthdayAudio.pause();
    elements.playBtn.innerHTML =
      '<i class="fas fa-play" aria-hidden="true"></i>';
    state.audio.isPlaying = false;
    audioLogger.info("Audio playback paused");
    audioLogger.timeEnd("Pause audio");
  }

  // Celebration effects
  function triggerCelebration(delay = 0) {
    celebrationLogger.time("Trigger celebration");
    celebrationLogger.debug("Scheduling celebration effects", { delay });

    setTimeout(() => {
      celebrationLogger.info("Executing celebration sequence");
      createHeartBurst(100);
      animateImageBounce();
      triggerConfetti();
      animateName();

      if (!state.audio.isPlaying) {
        celebrationLogger.debug("Starting audio for celebration");
        elements.birthdayAudio.currentTime = 0;
        playAudio();
      } else {
        celebrationLogger.debug("Audio already playing, continuing");
      }

      celebrationLogger.timeEnd("Trigger celebration");
    }, delay);
  }

  function animateImageBounce() {
    celebrationLogger.time("Animate image bounce");

    elements.imageContainer.classList.add("animate__animated", "animate__tada");
    celebrationLogger.debug("Bounce animation added to image container");

    setTimeout(() => {
      elements.imageContainer.classList.remove(
        "animate__animated",
        "animate__bounce"
      );
      celebrationLogger.debug("Bounce animation removed from image container");
    }, 2000);

    celebrationLogger.timeEnd("Animate image bounce");
  }

  function createHeartBurst(count) {
    heartLogger.time("Create heart burst");
    heartLogger.debug("Creating heart burst", { heartCount: count });

    for (let i = 0; i < count; i++) {
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * window.innerHeight;
      createHeart(x, y);
    }

    heartLogger.info("Heart burst created successfully");
    heartLogger.timeEnd("Create heart burst");
  }

  function createHeart(x, y, initialiseSize = 20, isGrowing = false) {
    heartLogger.time("Create heart");

    const heart = document.createElement("div");
    heart.className = "hearts";
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    heart.innerHTML = emoji;

    heartLogger.debug("Heart element created", {
      x,
      y,
      initialSize: initialiseSize,
      isGrowing,
      emoji,
    });

    // Position and style
    Object.assign(heart.style, {
      left: `${x}px`,
      top: `${y}px`,
      position: "fixed",
      fontSize: `${initialiseSize}px`,
      animation: `float ${3 + Math.random() * 4}s ease-in-out forwards`,
      pointerEvents: "none",
      transform: `rotate(${Math.random() * 360}deg)`,
      filter: `hue-rotate(${Math.random() * 360}deg)`,
    });

    elements.clickHeartsContainer.appendChild(heart);

    if (!isGrowing) {
      // For regular hearts, use animationend event for removal
      heart.addEventListener("animationend", () => {
        if (heart.parentNode) {
          heart.parentNode.removeChild(heart);
          heartLogger.debug("Regular heart animation ended and removed");
        }
      });
    } else {
      // For growing hearts, add expiration timeout as fallback
      setTimeout(() => {
        if (heart.parentNode && heart.dataset.growing === "false") {
          heart.parentNode.removeChild(heart);
          heartLogger.debug("Growing heart removed by safety timeout");
        }
      }, 8000); // Long timeout as safety net
    }

    heartLogger.timeEnd("Create heart");
    return heart;
  }

  function startGrowingHeart(e) {
    heartLogger.time("Start growing heart");

    // Clear any existing growing heart
    if (state.heart.growing) {
      heartLogger.debug("Clearing existing growing heart");
      state.heart.growing.remove();
      clearInterval(state.heart.growInterval);
    }

    // Create initial heart
    state.heart.growing = createHeart(e.clientX, e.clientY, 30, true);
    state.heart.growing.style.animation = "none"; // Disable float animation while growing
    state.heart.growing.dataset.growing = "true";

    heartLogger.debug("Initial growing heart created", {
      clientX: e.clientX,
      clientY: e.clientY,
    });

    // Start growing interval
    state.heart.growInterval = setInterval(() => {
      const currentSize = parseInt(state.heart.growing.style.fontSize) || 30;
      const newSize = currentSize + state.heart.growthRate;

      if (newSize <= state.heart.maxSize) {
        state.heart.growing.style.fontSize = `${newSize}px`;
        heartLogger.debug("Heart growing", { currentSize: newSize });
      } else {
        // Release if reached max size
        heartLogger.debug("Heart reached max size, releasing");
        releaseGrowingHeart();
      }
    }, 50);

    heartLogger.info("Heart growth started");
    heartLogger.timeEnd("Start growing heart");
  }

  function releaseGrowingHeart() {
    heartLogger.time("Release growing heart");

    clearInterval(state.heart.growInterval);
    heartLogger.debug("Growth interval cleared");

    if (state.heart.growing) {
      // Re-enable float animation
      state.heart.growing.dataset.growing = "false";
      state.heart.growing.style.animation = `float ${
        3 + Math.random() * 4
      }s ease-in-out forwards`;

      heartLogger.debug("Growing heart released for float animation");
      state.heart.growing = null;
    } else {
      heartLogger.debug("No growing heart to release");
    }

    heartLogger.timeEnd("Release growing heart");
  }

  // Social share functions
  function handleSocialShareClick(e) {
    socialLogger.time("Social share click");

    const target = e.currentTarget;
    socialLogger.debug("Social share clicked", {
      className: target.className,
      platform: Array.from(target.classList).find((cls) => cls.includes("fa-")),
    });

    // Add click animation
    target.classList.add("animate__animated", "animate__tada");
    socialLogger.debug("Share button animation started");

    setTimeout(() => {
      target.classList.remove("animate__animated", "animate__tada");
      socialLogger.debug("Share button animation ended");
    }, 5000);

    // Update share URLs if needed
    if (target.classList.contains("fa-whatsapp")) {
      const currentUrl = encodeURIComponent(window.location.href);
      const message = encodeURIComponent(
        "Check out this beautiful birthday wish I received!"
      );
      target.href = `https://api.whatsapp.com/send?text=${message}%20${currentUrl}`;
      socialLogger.debug("WhatsApp share URL updated", { currentUrl });
    }

    socialLogger.timeEnd("Social share click");
  }

  // Helper functions
  function handleCelebrateKeyDown(e) {
    if (!e) {
      appLogger.warn("Celebrate keydown event missing");
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      celebrationLogger.debug("Celebrate triggered via keyboard", {
        key: e.key,
      });
      triggerCelebration();
    } else {
      celebrationLogger.debug("Unhandled key pressed on celebrate button", {
        key: e.key,
      });
    }
  }

  function debounce(func, wait) {
    let timeout;
    return function () {
      const context = this,
        args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        appLogger.debug("Debounced function executed", { wait });
        func.apply(context, args);
      }, wait);
    };
  }

  // Image loading
  function loadImages() {
    appLogger.time("Image loading");

    const images = document.querySelectorAll('img[loading="lazy"]');
    appLogger.debug("Found lazy images to load", { count: images.length });

    images.forEach((img, index) => {
      img.addEventListener("load", () => {
        img.style.opacity = "1";
        img.style.transition = "opacity 0.5s ease";
        appLogger.debug("Image loaded successfully", { index, src: img.src });
      });

      img.style.opacity = "0";
      appLogger.debug("Image opacity set to 0 for fade-in", { index });

      img.addEventListener("error", () => {
        appLogger.warn("Image failed to load, using fallback", {
          src: img.src,
        });
        img.src = "https://via.placeholder.com/200?text=Photo+Not+Found";
        img.alt = "Image not available";
        img.style.opacity = "1";
      });
    });

    appLogger.info("Image loading system initialized");
    appLogger.timeEnd("Image loading");
  }

  // Initialize the application
  appLogger.debug("Starting main application initialization");
  init();
  appLogger.timeEnd("Birthday app initialization");
});
