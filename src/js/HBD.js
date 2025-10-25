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

import { PlatformDetector } from "../PWA/pwa-prompt.js";
import { UltimateModal } from "./Modal.js";
import Notification from "./notification.js";

document.addEventListener("DOMContentLoaded", () => {
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
    detectlPatform();
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
      opacity: 1;E
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
    new Notification().toggleViewDetails(true).initialize();
    new UltimateModal().init();
    setupEventListeners();
    loadImages();
    triggerCelebration(1000); // Initial celebration after 1 second
    animateName();
    triggerConfetti();
    createFloatingElements();

    // Periodic confetti and floating elements refresh
    setInterval(() => {
      triggerConfetti();
      createFloatingElements();
    }, state.cooldown);
  }

  function detectlPatform() {
    const platform = PlatformDetector.detect();
    if (platform === "iOS" || platform === "Android") {
      state.confetti.numberOfFloatingElement = 8;
      state.confetti.number = 50;
      state.confetti.interval = 8000;
      state.heart.growthRate = 2;
      state.heart.maxSize = 80;
      state.growButton.maxScale = 2.5;
      state.cooldown = 15000;
    }
  }

  function setupGrowButtonEventListeners() {
    elements.growButton.addEventListener("mousedown", startGrowing);
    elements.growButton.addEventListener("touchstart", startGrowing);

    // When mouse/touch ends
    elements.growButton.addEventListener("mouseup", releaseButton);
    elements.growButton.addEventListener("touchend", releaseButton);

    // Reset transforms on mouse leave
    document.addEventListener("mouseleave", () => {
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
      }
    });
  }

  function startGrowing(e) {
    e.preventDefault();
    state.growButton.currentScale = 1;
    elements.growButton.classList.add("holding");
    clearInterval(elements.growInterval);

    state.growButton.growInterval = setInterval(() => {
      if (state.growButton.currentScale < state.growButton.maxScale) {
        state.growButton.currentScale += state.growButton.scaleIncrement;
        elements.growButton.style.transform = `scale(${state.growButton.currentScale})`;
      }
    }, state.growButton.growSpeed);
  }

  function releaseButton(e) {
    elements.growButton.classList.remove("holding");
    clearInterval(state.growButton.growInterval);

    const wasHeld = state.growButton.currentScale > 1.1;
    elements.growButton.style.transform = "scale(1)";
    state.growButton.currentScale = 1;
    const es = e;
    e.preventDefault();
    if (!wasHeld) {
      toggleAudio();
    } else {
      toggleAudio();
    }
  }

  function createFloatingElements() {
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
    const numElements = state.confetti.numberOfFloatingElement; // Number of floating elements to generate

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
      }, 30000);
      document.body.appendChild(element);
    }
  }

  function triggerConfetti() {
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
      }, state.confetti.interval);
    }
  }

  function getRandomColor() {
    const { colors } = state.confetti;
    return colors[Math.floor(Math.random() * colors.length)];
  }

  function animateName() {
    const nameElement = elements.nameElement;
    if (!nameElement) return;

    const name = nameElement.textContent.trim();
    nameElement.innerHTML = "";
    const randomAnimations = getUniqueRandomAnimations(name.length);

    name.split("").forEach((letter, index) => {
      state.animating = true;
      const span = document.createElement("span");
      if (letter !== " ") {
        span.className = "name-letter";
        span.textContent = letter;
        const anim = randomAnimations[index % randomAnimations.length];
        span.style.animation = `${anim} 2s ${index * 0.1 + 0.1}s forwards`;
        span.style.opacity = "1";
      }
      span.textContent = letter;
      span.addEventListener("animationend", () => {
        if (index === randomAnimations.length - 1) {
          state.animating = false;
        }
      });
      nameElement.appendChild(span);
    });
  }

  function getUniqueRandomAnimations(count) {
    const shuffled = [...LETTER_ANIMATIONS];
    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }
  // Event Listeners setup
  function setupEventListeners() {
    // Audio control
    document.body.addEventListener("click", enableAudio, { once: true });

    // Celebration button
    elements.celebrateButton.addEventListener("click", () =>
      triggerCelebration(0)
    );
    elements.celebrateButton.addEventListener(
      "keydown",
      handleCelebrateKeyDown
    );

    // setupGrowButtonEventListeners();

    // Mobile touch effects
    elements.celebrateButton.addEventListener("touchstart", () => {
      elements.celebrateButton.style.transform = "scale(0.95)";
    });
    elements.celebrateButton.addEventListener("touchend", () => {
      elements.celebrateButton.style.transform = "";
    });

    elements.nameElement.addEventListener("mouseenter", () => {
      if (!state.animating) {
        animateName();
      }
    });

    // Click effects
    document.addEventListener("mousedown", (e) => {
      if (!e.target.closest(" .modal-container, img,  a,  button")) {
        startGrowingHeart(e);
      }
    });

    document.addEventListener("touchstart", (e) => {
      if (!e.target.closest(" .modal-container, img,  a,  button")) {
        startGrowingHeart(e.touches[0]);
      }
    });

    setupGrowButtonEventListeners();

    document.addEventListener("mouseup", releaseGrowingHeart);
    document.addEventListener("touchend", releaseGrowingHeart);
    document.addEventListener("mouseleave", releaseGrowingHeart);

    // Social share buttons
    elements.socialShareLinks.forEach((link) => {
      link.addEventListener("click", handleSocialShareClick);
    });

    // Window resize - debounce to avoid excessive calls
    window.addEventListener(
      "resize",
      debounce(() => {
        // Handle any responsive adjustments if needed
      }, 200)
    );
  }
  // Audio functions
  function enableAudio() {
    state.audio.isAllowed = true;
    if (state.audio.isPlaying) {
      playAudio().catch(console.error);
    }
  }

  function toggleAudio() {
    if (state.audio.isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  }

  async function playAudio() {
    if (!state.audio.isAllowed) return;

    try {
      await elements.birthdayAudio.play();
      elements.playBtn.innerHTML =
        '<i class="fas fa-pause" aria-hidden="true"></i>';
      state.audio.isPlaying = true;
    } catch (error) {
      console.error("Audio playback failed:", error);
    }
  }

  function pauseAudio() {
    elements.birthdayAudio.pause();
    elements.playBtn.innerHTML =
      '<i class="fas fa-play" aria-hidden="true"></i>';
    state.audio.isPlaying = false;
  }

  // Celebration effects
  function triggerCelebration(delay = 0) {
    setTimeout(() => {
      createHeartBurst(100);
      animateImageBounce();
      triggerConfetti();
      animateName();
      if (!state.audio.isPlaying) {
        elements.birthdayAudio.currentTime = 0;
        playAudio();
      }
    }, delay);
  }

  function animateImageBounce() {
    elements.imageContainer.classList.add("animate__animated", "animate__tada");
    setTimeout(() => {
      elements.imageContainer.classList.remove(
        "animate__animated",
        "animate__bounce"
      );
    }, 2000);
  }

  function createHeartBurst(count) {
    for (let i = 0; i < count; i++) {
      const x = Math.random() * window.innerWidth;
      const y = Math.random() * window.innerHeight;
      createHeart(x, y);
    }
  }

  function createHeart(x, y, initialiseSize = 20, isGrowing = false) {
    const heart = document.createElement("div");
    heart.className = "hearts";
    heart.innerHTML = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

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
        }
      });
    } else {
      // For growing hearts, add expiration timeout as fallback
      setTimeout(() => {
        if (heart.parentNode && heart.dataset.growing === "false") {
          heart.parentNode.removeChild(heart);
        }
      }, 8000); // Long timeout as safety net
    }
    return heart;
  }

  function startGrowingHeart(e) {
    // Clear any existing growing heart
    if (state.heart.growing) {
      state.heart.growing.remove();
      clearInterval(state.heart.growInterval);
    }

    // Create initial heart
    state.heart.growing = createHeart(e.clientX, e.clientY, 30, true);
    state.heart.growing.style.animation = "none"; // Disable float animation while growing

    // Start growing interval
    state.heart.growInterval = setInterval(() => {
      const currentSize = parseInt(state.heart.growing.style.fontSize) || 30;
      const newSize = currentSize + state.heart.growthRate;

      if (newSize <= state.heart.maxSize) {
        state.heart.growing.style.fontSize = `${newSize}px`;
      } else {
        // Release if reached max size
        releaseGrowingHeart();
      }
    }, 50);
  }

  function releaseGrowingHeart() {
    clearInterval(state.heart.growInterval);

    if (state.heart.growing) {
      // Re-enable float animation
      state.heart.growing.dataset.growing = "false";

      state.heart.growing.style.animation = `float ${
        3 + Math.random() * 4
      }s ease-in-out forwards`;

      state.heart.growing = null;
    }
  }
  // Social share functions
  function handleSocialShareClick(e) {
    // Add click animation
    e.currentTarget.classList.add("animate__animated", "animate__tada");
    setTimeout(() => {
      e.currentTarget.classList.remove("animate__animated", "animate__tada");
    }, 5000);

    // Update share URLs if needed
    if (e.currentTarget.classList.contains("fa-whatsapp")) {
      const currentUrl = encodeURIComponent(window.location.href);
      const message = encodeURIComponent(
        "Check out this beautiful birthday wish I received!"
      );
      e.currentTarget.href = `https://api.whatsapp.com/send?text=${message}%20${currentUrl}`;
    }
  }

  // Helper functions
  function handleCelebrateKeyDown(e) {
    if (!e) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      triggerCelebration();
    }
  }

  function debounce(func, wait) {
    let timeout;
    return function () {
      const context = this,
        args = arguments;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        func.apply(context, args);
      }, wait);
    };
  }

  // Image loading
  function loadImages() {
    const images = document.querySelectorAll('img[loading="lazy"]');

    images.forEach((img) => {
      img.addEventListener("load", () => {
        img.style.opacity = "1";
        img.style.transition = "opacity 0.5s ease";
      });

      img.style.opacity = "0";

      img.addEventListener("error", () => {
        img.src = "https://via.placeholder.com/200?text=Photo+Not+Found";
        img.alt = "Image not available";
        img.style.opacity = "1";
      });
    });
  }
  init();
});
