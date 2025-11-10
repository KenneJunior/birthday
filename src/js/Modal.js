import Notification from "./notification";
import logger from "./utility/logger.js";

// Create contextual logger for UltimateModal
const modalLogger = logger.withContext({ module: "UltimateModal" });

export class UltimateModal {
  constructor() {
    modalLogger.time("UltimateModal constructor");

    this.elements = {
      modal: document.getElementById("imageModal"),
      modalContainer: document.querySelector(".modal-container"),
      openModalBtn: document.getElementById("modal_open"),
      modalImage: document.querySelector(".modal-image"),
      modalVideo: document.querySelector(".modal-video"),
      profileImage: document.querySelector("#profile_pic"),
      profileImageContainer: document.querySelector("#profile_image"),
      closeButton: document.querySelector(".modal-close"),
      maximizeModalBtn: document.querySelector(".modal-maximize"),
      prevButton: document.querySelector(".modal-prev"),
      nextButton: document.querySelector(".modal-next"),
      counter: document.querySelector(".modal-counter"),
      socialLinks: document.querySelectorAll(".modal-social a"),
      profile_pic: document.querySelector(".image-container"),
    };

    modalLogger.debug("DOM elements cached", {
      elementsFound: Object.keys(this.elements).filter(
        (key) => !!this.elements[key]
      ).length,
      totalElements: Object.keys(this.elements).length,
    });

    this.state = {
      currentIndex: 0,
      media: [],
      isZoomed: false,
      isZoomPanSetup: false,
      isMaximized: false,
      isFullscreen: false,
      transitionStyle: "", // Can be 'zoom-in', 'fade-in', or 'slide-up'
      panStart: { x: 0, y: 0 },
      panOffset: { x: 0, y: 0 },
    };

    modalLogger.debug("Initial state set", {
      transitionStyle: this.state.transitionStyle,
    });

    this.hammer = null;
    this.initHammerWhenReady();
    modalLogger.timeEnd("UltimateModal constructor");
  }

  init() {
    modalLogger.time("UltimateModal initialization");
    modalLogger.debug("Starting gallery generation");
    this.generateGallery();
    modalLogger.timeEnd("UltimateModal initialization");
  }

  initHammerWhenReady() {
    modalLogger.time("Hammer.js initialization check");

    if (typeof Hammer === "undefined") {
      modalLogger.warn(
        "Hammer.js not available. Touch gestures will be disabled."
      );
      modalLogger.timeEnd("Hammer.js initialization check");
      return;
    }

    modalLogger.debug("Hammer.js available, waiting for modal container");

    // Wait for modal container to be available
    const checkContainer = () => {
      if (this.elements.modalContainer) {
        modalLogger.debug("Modal container found, setting up Hammer.js");
        this.setupHammer();
        modalLogger.timeEnd("Hammer.js initialization check");
      } else {
        modalLogger.debug("Modal container not found, retrying...");
        setTimeout(checkContainer, 100);
      }
    };

    checkContainer();
  }

  setupHammer() {
    try {
      modalLogger.time("Hammer.js setup");
      this.hammer = new Hammer(this.elements.modalContainer);

      this.hammer.get("swipe").set({
        direction: Hammer.DIRECTION_ALL,
        threshold: 10,
        velocity: 0.3,
      });

      this.hammer.get("pinch").set({ enable: true });
      this.hammer.get("pan").set({ direction: Hammer.DIRECTION_ALL });

      modalLogger.debug("Hammer.js gestures configured", {
        swipe: true,
        pinch: true,
        pan: true,
      });

      // Set up event handlers
      this.hammer.on("swipeleft", (event) => {
        event.preventDefault();
        modalLogger.debug("Swipe left detected, navigating next");
        this.navigate(1);
      });

      this.hammer.on("swiperight", (event) => {
        event.preventDefault();
        modalLogger.debug("Swipe right detected, navigating previous");
        this.navigate(-1);
      });

      this.hammer.on("swipeup", (event) => {
        event.preventDefault();
        modalLogger.debug("Swipe up detected, closing modal");
        this.closeModal();
      });

      this.hammer.on("swipedown", (event) => {
        event.preventDefault();
        modalLogger.debug("Swipe down detected, closing modal");
        this.closeModal();
      });

      this.hammer.on("doubletap", (event) => {
        event.preventDefault();
        modalLogger.debug("Double tap detected, toggling fullscreen");
        this.toggleFullscreen();
      });

      this.setupHammerForZoomPan();
      modalLogger.info("Hammer.js touch gestures initialized successfully");
      modalLogger.timeEnd("Hammer.js setup");
    } catch (error) {
      modalLogger.error("Failed to initialize Hammer.js:", error);
    }
  }

  cacheImages(mediaData) {
    modalLogger.time("Image caching");
    this.elements.thumbnails = document.querySelectorAll(".photo-thumbnail");
    this.state.media = mediaData.media.map((thumb) => ({
      src: thumb.src,
      alt: thumb.alt,
      data_type: thumb["data-type"],
      vidSrc: thumb["video-src"],
    }));

    modalLogger.debug("Media data cached", {
      thumbnailCount: this.elements.thumbnails.length,
      mediaCount: this.state.media.length,
      mediaTypes: this.state.media.map((m) => m.data_type),
    });
    modalLogger.timeEnd("Image caching");
  }

  setupEventListeners() {
    modalLogger.time("Event listener setup");

    // Open modal
    this.elements.thumbnails.forEach((thumb, index) => {
      thumb.addEventListener("click", () => {
        modalLogger.debug("Thumbnail clicked", { index });
        this.openModal(index);
      });
    });

    const { length: profile_index } = this.elements.thumbnails;
    this.elements.profileImage.addEventListener("click", () => {
      modalLogger.debug("Profile image clicked", { index: profile_index });
      this.openModal(profile_index);
    });

    this.elements.maximizeModalBtn.addEventListener("click", () => {
      modalLogger.debug("Maximize button clicked");
      this.toggleMaximize();
    });

    this.elements.openModalBtn.addEventListener("click", () => {
      modalLogger.debug("Open modal button clicked");
      this.openModal(0);
    });

    // Modal controls
    this.elements.closeButton.addEventListener("click", () => {
      modalLogger.debug("Close button clicked");
      this.closeModal();
    });

    this.elements.prevButton.addEventListener("click", () => {
      modalLogger.debug("Previous button clicked");
      this.navigate(-1);
    });

    this.elements.nextButton.addEventListener("click", () => {
      modalLogger.debug("Next button clicked");
      this.navigate(1);
    });

    this.elements.profile_pic.addEventListener("click", () => {
      modalLogger.debug("Profile picture container clicked, showing HTU");
      this.HTU();
    });

    // Keyboard navigation
    document.addEventListener("keydown", (e) => {
      if (!this.elements.modal.classList.contains("active")) {
        modalLogger.debug("Key pressed but modal inactive", { key: e.key });
        return;
      }

      modalLogger.debug("Key pressed in active modal", { key: e.key });

      switch (e.key) {
        case "Escape":
          modalLogger.debug("Escape key - closing modal");
          this.closeModal();
          break;
        case "ArrowLeft":
          modalLogger.debug("ArrowLeft key - navigating previous");
          this.navigate(-1);
          break;
        case "ArrowRight":
          modalLogger.debug("ArrowRight key - navigating next");
          this.navigate(1);
          break;
        case "f":
        case "F":
          modalLogger.debug("F key - toggling fullscreen");
          this.toggleFullscreen();
          break;
        default:
          modalLogger.debug("Unhandled key in modal", { key: e.key });
      }
    });

    this.setupZoomPanFunctionality();

    // Handle fullscreen change events
    document.addEventListener("fullscreenchange", () => {
      modalLogger.debug("Fullscreen change event (standard)");
      this.handleFullscreenChange();
    });

    document.addEventListener("webkitfullscreenchange", () => {
      modalLogger.debug("Fullscreen change event (webkit)");
      this.handleFullscreenChange();
    });

    document.addEventListener("msfullscreenchange", () => {
      modalLogger.debug("Fullscreen change event (ms)");
      this.handleFullscreenChange();
    });

    modalLogger.info("Event listeners setup completed", {
      thumbnails: this.elements.thumbnails.length,
      keyboard: true,
      fullscreen: true,
    });
    modalLogger.timeEnd("Event listener setup");
  }

  setupSocialSharing() {
    modalLogger.time("Social sharing setup");
    this.elements.socialLinks.forEach((link, index) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const platform =
          Array.from(link.classList).find((cls) => cls.includes("share-")) ||
          "unknown";
        modalLogger.debug("Social share link clicked", { index, platform });
        this.handleSocialShare(link);
      });
    });
    modalLogger.debug("Social sharing links configured", {
      linkCount: this.elements.socialLinks.length,
    });
    modalLogger.timeEnd("Social sharing setup");
  }

  openModal(index) {
    modalLogger.time("Modal open");
    modalLogger.info("Opening modal", {
      index,
      totalMedia: this.state.media.length,
    });

    this.state.currentIndex = index;
    document.body.style.overflow = "hidden";
    this.elements.modal.classList.add("active");
    this.updateModalContent();

    // Re-initialize Hammer if needed when modal opens
    if (!this.hammer && typeof Hammer !== "undefined") {
      modalLogger.debug("Hammer.js not initialized, setting up now");
      this.setupHammer();
    }

    this.resetZoom();
    this.resetMaximizeButton();

    if (!this.state.isZoomPanSetup) {
      modalLogger.debug("Setting up zoom/pan functionality");
      this.setupZoomPanFunctionality();
    }

    modalLogger.timeEnd("Modal open");
  }

  closeModal() {
    modalLogger.time("Modal close");
    modalLogger.info("Closing modal");

    if (this.state.isFullscreen) {
      modalLogger.debug("Exiting fullscreen before closing modal");
      this.exitFullscreen();
    }

    document.body.style.overflow = "";

    if (!this.elements.modalVideo.classList.contains("d-none")) {
      modalLogger.debug("Pausing video in modal");
      this.elements.modalVideo.pause();
    }

    this.elements.modal.classList.remove("active");
    this.elements.thumbnails[this.state.currentIndex].classList.remove(
      "active"
    );

    modalLogger.timeEnd("Modal close");
  }

  toggleMaximize() {
    modalLogger.time("Toggle maximize");

    if (this.state.isMaximized) {
      modalLogger.debug("Minimizing modal");
      this.elements.modal.classList.remove("fullscreen");
      this.elements.maximizeModalBtn.innerHTML =
        '<i class="fas fa-expand"></i>';
      this.elements.maximizeModalBtn.setAttribute(
        "aria-label",
        "Maximize modal"
      );
      if (this.state.isFullscreen) {
        modalLogger.debug("Also exiting fullscreen");
        this.exitFullscreen();
      }
    } else {
      modalLogger.debug("Maximizing modal");
      this.elements.modal.classList.add("fullscreen");
      this.elements.maximizeModalBtn.innerHTML =
        '<i class="fas fa-compress"></i>';
      this.elements.maximizeModalBtn.setAttribute(
        "aria-label",
        "Minimize modal"
      );
    }

    this.state.isMaximized = !this.state.isMaximized;
    modalLogger.debug("Maximize state updated", {
      isMaximized: this.state.isMaximized,
    });
    modalLogger.timeEnd("Toggle maximize");
  }

  HTU() {
    modalLogger.time("How to Use notification");
    modalLogger.debug("Showing How to Use notification");

    new Notification()
      .setupEventListeners()
      .toggleViewDetails(false)
      .showNotification("info", {
        title: "📖 How to Use This Gallery",
        message: `
            <div style="line-height: 1.6;">
                <p>Welcome to the image gallery! Here's how to navigate:</p>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>🖱️ <strong>Click</strong> on any thumbnail to open the image viewer</li>
                    <li>⬅️ ➡️ Use <strong>arrow keys</strong> or navigation buttons to browse images</li>
                    <li>🔍 <strong>Click</strong> on an open image to zoom in/out</li>
                    <li>👆 <strong>Drag</strong> to pan around zoomed images</li>
                    <li>📱 Use <strong>social media icons</strong> to share images</li>
                    <li>🖼️ Press <strong>'F'</strong> or use the maximize button for fullscreen</li>
                    <li>❌ Press <strong>ESC</strong> or click the X to close the viewer</li>
                    <li>👆 <strong>click</strong> outside a box to create an emoji <strong>press and hold</strong> make the emoji bigger</li>
                    <li>📷 Click the profile image anytime to see these instructions again</li>
                </ul>
                <p style="margin-top: 10px; font-style: italic;">Enjoy exploring this page 🥰💕💘!</p>
            </div>
        `,
        icon: "fas fa-info-circle",
        useHTML: true,
        autoCloseTime: 15000, // Show for 15 seconds instead of 20
      });

    modalLogger.timeEnd("How to Use notification");
  }

  setupZoomPanFunctionality() {
    if (this.state.isZoomPanSetup) {
      modalLogger.debug("Zoom/pan functionality already setup");
      return;
    }

    modalLogger.time("Zoom/pan functionality setup");
    this.setupMouseZoomPan();
    this.setupTouchZoomPan();
    this.state.isZoomPanSetup = true;
    modalLogger.info("Zoom/pan functionality initialized");
    modalLogger.timeEnd("Zoom/pan functionality setup");
  }

  resetMaximizeButton() {
    modalLogger.debug("Resetting maximize button state");
    this.state.isMaximized = false;
    this.elements.maximizeModalBtn.innerHTML = '<i class="fas fa-expand"></i>';
    this.elements.maximizeModalBtn.setAttribute("aria-label", "Maximize modal");
  }

  navigate(direction) {
    modalLogger.time("Navigation");
    modalLogger.debug("Navigating media", {
      direction,
      currentIndex: this.state.currentIndex,
    });

    if (!this.elements.modalVideo.classList.contains("d-none")) {
      modalLogger.debug("Pausing current video during navigation");
      this.elements.modalVideo.pause();
    }

    this.state.currentIndex += direction;

    // Circular navigation
    if (this.state.currentIndex < 0) {
      this.state.currentIndex = this.state.media.length - 1;
      modalLogger.debug("Wrapped to end of gallery");
    } else if (this.state.currentIndex >= this.state.media.length) {
      this.state.currentIndex = 0;
      modalLogger.debug("Wrapped to start of gallery");
    }

    this.updateModalContent();
    this.animateTransition(direction);

    modalLogger.debug("Navigation completed", {
      newIndex: this.state.currentIndex,
    });
    modalLogger.timeEnd("Navigation");
  }
  updateModalContent() {
    modalLogger.time("Update modal content");
    const current = this.state.media[this.state.currentIndex];
    modalLogger.debug("Updating modal content", {
      index: this.state.currentIndex,
      mediaType: current.data_type,
      alt: current.alt,
    });

    // Clear previous media
    this.elements.modalImage.src = "";
    this.elements.modalVideo.src = "";

    this._setMediaContent(current);
    this.elements.counter.textContent = `${this.state.currentIndex + 1}/${
      this.state.media.length
    }`;

    modalLogger.debug("Counter updated", {
      display: `${this.state.currentIndex + 1}/${this.state.media.length}`,
    });

    this.activeThumbnail();
    this.updateSocialLinks(current);
    modalLogger.timeEnd("Update modal content");
  }

  /**
   * Sets the modal content to image or video mode based on data_type
   * @param {Object} mediaObj - The image or video object from state.images
   */
  _setMediaContent(mediaObj) {
    modalLogger.debug("Setting media content", {
      dataType: mediaObj.data_type,
      alt: mediaObj.alt,
    });

    const alt = mediaObj.alt;
    if (mediaObj.data_type === "image") {
      this._showImage(mediaObj.src, alt);
    } else if (mediaObj.data_type === "video") {
      this._showVideo(mediaObj.vidSrc, alt);
    } else {
      modalLogger.warn("Unknown media type", { dataType: mediaObj.data_type });
    }
  }

  _showImage(src, alt) {
    modalLogger.debug("Showing image in modal", { src, alt });
    this.elements.modalImage.src = src;
    this.elements.modalImage.alt = alt;
    this.elements.modalVideo.classList.add("d-none");
    this.elements.modalImage.classList.remove("d-none");
    modalLogger.debug("Image display configured");
  }

  _showVideo(src, alt) {
    modalLogger.debug("Showing video in modal", { src, alt });
    this.elements.modalVideo.src = src;
    this.elements.modalVideo.alt = alt;
    this.elements.modalVideo.classList.remove("d-none");
    this.elements.modalImage.classList.add("d-none");

    this.elements.modalVideo
      .play()
      .then(() => {
        modalLogger.debug("Video playback started successfully");
      })
      .catch((error) => {
        modalLogger.error("Video playback failed", error);
      });

    modalLogger.debug("Video display configured");
  }

  activeThumbnail() {
    modalLogger.time("Active thumbnail update");

    this.elements.thumbnails.forEach((thumb) => {
      thumb.classList.remove("active");
    });

    const thumbnail = this.elements.thumbnails[this.state.currentIndex];
    if (thumbnail) {
      thumbnail.classList.add("active");
      modalLogger.debug("Thumbnail activated", {
        index: this.state.currentIndex,
      });
    } else {
      modalLogger.warn("No thumbnail found for index", {
        index: this.state.currentIndex,
      });
    }

    modalLogger.timeEnd("Active thumbnail update");
  }

  toggleFullscreen() {
    modalLogger.time("Toggle fullscreen");

    if (!this.state.isFullscreen) {
      modalLogger.debug("Entering fullscreen");
      this.enterFullscreen();
    } else {
      modalLogger.debug("Exiting fullscreen");
      this.exitFullscreen();
    }

    modalLogger.timeEnd("Toggle fullscreen");
  }

  enterFullscreen() {
    modalLogger.time("Enter fullscreen");

    if (this.elements.modalContainer.requestFullscreen) {
      this.elements.modalContainer.requestFullscreen();
      modalLogger.debug("Fullscreen requested (standard)");
    } else if (this.elements.modalContainer.webkitRequestFullscreen) {
      this.elements.modalContainer.webkitRequestFullscreen();
      modalLogger.debug("Fullscreen requested (webkit)");
    } else if (this.elements.modalContainer.msRequestFullscreen) {
      this.elements.modalContainer.msRequestFullscreen();
      modalLogger.debug("Fullscreen requested (ms)");
    } else {
      modalLogger.warn("Fullscreen API not supported in this browser");
    }

    this.state.isFullscreen = true;
    this.elements.maximizeModalBtn.innerHTML =
      '<i class="fas fa-compress"></i>';
    this.elements.maximizeModalBtn.setAttribute(
      "aria-label",
      "Exit fullscreen"
    );

    // Add a class for custom fullscreen styling
    this.elements.modal.classList.add("fullscreen");
    modalLogger.info("Fullscreen entered successfully");
    modalLogger.timeEnd("Enter fullscreen");
  }

  exitFullscreen() {
    modalLogger.time("Exit fullscreen");

    if (document.exitFullscreen) {
      document.exitFullscreen();
      modalLogger.debug("Fullscreen exit (standard)");
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
      modalLogger.debug("Fullscreen exit (webkit)");
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
      modalLogger.debug("Fullscreen exit (ms)");
    } else {
      modalLogger.warn("Fullscreen exit API not supported");
    }

    this.state.isFullscreen = false;
    this.elements.maximizeModalBtn.innerHTML = '<i class="fas fa-expand"></i>';
    this.elements.maximizeModalBtn.setAttribute(
      "aria-label",
      "Enter fullscreen"
    );

    // Remove the custom fullscreen styling
    this.elements.modal.classList.remove("fullscreen");
    modalLogger.info("Fullscreen exited successfully");
    modalLogger.timeEnd("Exit fullscreen");
  }

  handleFullscreenChange() {
    modalLogger.debug("Handling fullscreen change event");

    const fullscreenElement =
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement;

    if (!fullscreenElement) {
      modalLogger.debug("Fullscreen exited via browser controls");
      // We exited fullscreen
      this.state.isFullscreen = false;
      this.elements.maximizeModalBtn.innerHTML =
        '<i class="fas fa-expand"></i>';
      this.elements.maximizeModalBtn.setAttribute(
        "aria-label",
        "Enter fullscreen"
      );
      this.elements.modal.classList.remove("fullscreen");
    } else {
      modalLogger.debug("Fullscreen active via browser controls");
    }
  }

  createGalleryFigure(mediaData, index) {
    modalLogger.debug("Creating gallery figure", { index, alt: mediaData.alt });

    const figure = document.createElement("figure");
    figure.className = "photo-thumbnail";
    figure.style.animationDelay = `${index * 5.1}s`;

    const img = document.createElement("img");
    img.src = mediaData.thumb;
    img.alt = mediaData.alt;
    img.loading = "lazy";
    img.width = 80;
    img.height = 80;
    figure.setAttribute("data-type", `${mediaData["data-type"] || "image"}`);
    figure.appendChild(img);

    return figure;
  }

  async generateGallery() {
    modalLogger.time("Gallery generation");

    const galleryContainer = document.getElementById("photo-gallery");
    if (!galleryContainer) {
      modalLogger.error("Gallery container not found");
      modalLogger.timeEnd("Gallery generation");
      return;
    }

    modalLogger.debug("Starting gallery generation");
    const mediaData = await this.loadMediaData();

    mediaData.media.forEach((mediaData, index) => {
      const figure = this.createGalleryFigure(mediaData, index);
      galleryContainer.appendChild(figure);
    });

    this.cacheImages(mediaData);
    this.setupEventListeners();
    this.setupSocialSharing();

    modalLogger.info("Gallery generation completed", {
      mediaCount: mediaData.media.length,
      thumbnailsCreated: galleryContainer.children.length,
    });
    modalLogger.timeEnd("Gallery generation");
  }

  updateSocialLinks(current) {
    modalLogger.time("Social links update");

    const encodedUrl = encodeURIComponent(window.location.href);
    const encodedDesc = encodeURIComponent(current.alt);
    const encodedImage = () => {
      const url = current.data_type === "image" ? current.src : current.vidSrc;
      return encodeURIComponent(url);
    };

    document.querySelector(
      ".share-facebook"
    ).href = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

    document.querySelector(
      ".share-twitter"
    ).href = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedDesc}`;

    document.querySelector(
      ".share-pinterest"
    ).href = `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedImage()}&description=${encodedDesc}`;

    document.querySelector(".share-link").addEventListener("click", (e) => {
      e.preventDefault();
      modalLogger.debug("Share link clicked, copying to clipboard");
      navigator.clipboard.writeText(window.location.href);
      this.showTooltip("Link copied!", e.target);
    });

    modalLogger.debug("Social links updated", {
      currentAlt: current.alt,
      platforms: ["facebook", "twitter", "pinterest", "link"],
    });
    modalLogger.timeEnd("Social links update");
  }

  animateTransition(direction) {
    modalLogger.time("Transition animation");

    // Remove all animation classes
    this.elements.modalImage.classList.remove(
      "zoom-in",
      "fade-in",
      "slide-up",
      "slide-left",
      "slide-right"
    );

    // Force reflow
    void this.elements.modalImage.offsetWidth;

    // Apply selected animation
    let animationClass;
    if (this.state.transitionStyle === "zoom-in") {
      animationClass = "zoom-in";
    } else if (this.state.transitionStyle === "fade-in") {
      animationClass = "fade-in";
    } else if (this.state.transitionStyle === "slide-up") {
      animationClass = "slide-up";
    } else {
      // Default direction-based slide
      animationClass = direction > 0 ? "slide-left" : "slide-right";
    }

    this.elements.modalImage.classList.add(animationClass);
    modalLogger.debug("Transition animation applied", {
      direction,
      animationClass,
      transitionStyle: this.state.transitionStyle,
    });
    modalLogger.timeEnd("Transition animation");
  }

  setupHammerForZoomPan() {
    if (!this.hammer) {
      modalLogger.warn("Hammer.js not available for zoom/pan setup");
      return;
    }

    modalLogger.time("Hammer zoom/pan setup");

    // Pinch to zoom
    this.hammer.get("pinch").set({ enable: true });
    this.hammer.on("pinchstart pinchmove", (e) => {
      if (!this.elements.modalImage.classList.contains("d-none")) {
        e.preventDefault();
        modalLogger.debug("Pinch gesture detected", {
          type: e.type,
          scale: e.scale,
        });
        this.handlePinch(e);
      }
    });

    this.hammer.on("pinchend", () => {
      modalLogger.debug("Pinch gesture ended");
      this.finalizeZoom();
    });

    modalLogger.debug("Hammer.js zoom/pan gestures configured");
    modalLogger.timeEnd("Hammer zoom/pan setup");
  }

  setupMouseZoomPan() {
    modalLogger.time("Mouse zoom/pan setup");

    // Mouse zoom
    this.elements.modalImage.addEventListener("dblclick", (e) => {
      modalLogger.debug("Double click for zoom", {
        isZoomed: this.state.isZoomed,
      });
      if (this.state.isZoomed) {
        this.resetZoom();
      } else {
        this.zoomImage(e);
      }
    });

    // Mouse pan
    this.elements.modalImage.addEventListener("mousedown", (e) => {
      if (this.state.isZoomed) {
        modalLogger.debug("Mouse down for panning");
        this.startPan(e);
        document.addEventListener("mousemove", this.boundPanImage);
        document.addEventListener("mouseup", this.boundEndPan);
      }
    });

    // Store bound functions for removal
    this.boundPanImage = (e) => this.panImage(e);
    this.boundEndPan = () => this.endPan();

    modalLogger.debug("Mouse zoom/pan events configured");
    modalLogger.timeEnd("Mouse zoom/pan setup");
  }

  setupTouchZoomPan() {
    modalLogger.time("Touch zoom/pan setup");

    // Touch pan (for single finger, Hammer handles multi-touch)
    this.elements.modalImage.addEventListener(
      "touchstart",
      (e) => {
        if (this.state.isZoomed && e.touches.length === 1) {
          e.preventDefault();
          modalLogger.debug("Touch start for panning", {
            touches: e.touches.length,
          });
          this.startPan(e.touches[0]);
        }
      },
      { passive: false }
    );

    modalLogger.debug("Touch zoom/pan events configured");
    modalLogger.timeEnd("Touch zoom/pan setup");
  }

  handlePinch(e) {
    if (e.type === "pinchstart") {
      modalLogger.debug("Pinch gesture started");
      this.state.pinchStart = {
        scale: this.state.currentScale || 1,
        centerX: e.center.x,
        centerY: e.center.y,
      };
      this.elements.modalImage.style.transition = "none";
    }

    const newScale = this.state.pinchStart.scale * e.scale;
    this.state.currentScale = Math.max(1, Math.min(newScale, 5)); // Limit scale 1x to 5x

    modalLogger.debug("Pinch scale updated", {
      newScale,
      constrainedScale: this.state.currentScale,
      originalScale: this.state.pinchStart.scale,
    });

    // Calculate pan offset to zoom toward pinch center
    const rect = this.elements.modalImage.getBoundingClientRect();
    const centerX = e.center.x - rect.left;
    const centerY = e.center.y - rect.top;

    this.state.panOffset.x =
      centerX -
      (centerX - this.state.panOffset.x) *
        (newScale / (this.state.currentScale || 1));
    this.state.panOffset.y =
      centerY -
      (centerY - this.state.panOffset.y) *
        (newScale / (this.state.currentScale || 1));

    this.updateImageTransform();
  }

  finalizeZoom() {
    modalLogger.debug("Finalizing zoom", {
      currentScale: this.state.currentScale,
    });

    if (this.state.currentScale <= 1.1) {
      modalLogger.debug("Scale below threshold, resetting zoom");
      this.resetZoom();
    } else {
      this.state.isZoomed = true;
      modalLogger.debug("Zoom finalized", { scale: this.state.currentScale });
      this.constrainPanning(); // Ensure we're within bounds
    }
    this.elements.modalImage.style.transition = "transform 0.2s ease";
  }

  zoomImage(e) {
    modalLogger.time("Image zoom");

    this.state.isZoomed = true;
    this.state.currentScale = 2; // Default zoom level

    const rect = this.elements.modalImage.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Center zoom on click position
    this.state.panOffset = {
      x: (rect.width / 2 - clickX) * (this.state.currentScale / 1),
      y: (rect.height / 2 - clickY) * (this.state.currentScale / 1),
    };

    this.elements.modalImage.classList.add("zoomed");
    this.updateImageTransform();
    this.constrainPanning(); // Immediately constrain after zoom

    modalLogger.debug("Image zoom applied", {
      scale: this.state.currentScale,
      clickPosition: { x: clickX, y: clickY },
      panOffset: this.state.panOffset,
    });
    modalLogger.timeEnd("Image zoom");
  }

  resetZoom() {
    modalLogger.time("Reset zoom");

    this.state.isZoomed = false;
    this.state.currentScale = 1;
    this.elements.modalImage.classList.remove("zoomed");
    this.state.panOffset = { x: 0, y: 0 };
    this.elements.modalImage.style.transition = "transform 0.3s ease";
    this.updateImageTransform();

    setTimeout(() => {
      this.elements.modalImage.style.transition = "";
    }, 300);

    modalLogger.debug("Zoom reset to original state");
    modalLogger.timeEnd("Reset zoom");
  }

  startPan(e) {
    modalLogger.debug("Starting pan gesture");

    this.state.panStart = {
      x: e.clientX - this.state.panOffset.x,
      y: e.clientY - this.state.panOffset.y,
    };
    this.elements.modalImage.style.cursor = "grabbing";
    this.elements.modalImage.style.transition = "none";
  }

  panImage(e) {
    this.elements.modalImage.style.cursor = "grabbing";

    this.state.panOffset = {
      x: e.clientX - this.state.panStart.x,
      y: e.clientY - this.state.panStart.y,
    };

    this.constrainPanning(); // Constrain during pan, not just at end
    this.updateImageTransform();
  }

  endPan() {
    modalLogger.debug("Ending pan gesture");

    this.elements.modalImage.style.cursor = "grab";
    this.elements.modalImage.style.transition = "transform 0.2s ease";
    this.constrainPanning(); // Final constraint

    document.removeEventListener("mousemove", this.boundPanImage);
    document.removeEventListener("mouseup", this.boundEndPan);
  }

  constrainPanning() {
    if (!this.state.isZoomed) return;

    const img = this.elements.modalImage;
    const scale = this.state.currentScale;
    const containerWidth = img.clientWidth;
    const containerHeight = img.clientHeight;

    // Calculate max pan based on current scale
    const maxX = Math.max(0, (containerWidth * scale - containerWidth) / 2);
    const maxY = Math.max(0, (containerHeight * scale - containerHeight) / 2);

    // Constrain panning with easing at edges
    this.state.panOffset.x = this.easeConstraint(
      this.state.panOffset.x,
      -maxX,
      maxX
    );
    this.state.panOffset.y = this.easeConstraint(
      this.state.panOffset.y,
      -maxY,
      maxY
    );

    this.updateImageTransform();

    modalLogger.debug("Panning constrained", {
      scale,
      panOffset: this.state.panOffset,
      maxBounds: { x: maxX, y: maxY },
    });
  }

  easeConstraint(value, min, max) {
    if (value < min) {
      // Ease when pulling beyond left/top edge
      return min - (1 - Math.exp(-0.1 * (min - value)));
    } else if (value > max) {
      // Ease when pulling beyond right/bottom edge
      return max + (1 - Math.exp(-0.1 * (value - max)));
    }
    return value;
  }

  updateImageTransform() {
    const scale = this.state.currentScale || 1;
    this.elements.modalImage.style.transform = `scale(${scale}) translate(${this.state.panOffset.x}px, ${this.state.panOffset.y}px)`;

    modalLogger.debug("Image transform updated", {
      scale,
      translateX: this.state.panOffset.x,
      translateY: this.state.panOffset.y,
    });
  }

  handleSocialShare(link) {
    modalLogger.time("Social share handling");

    const type = link.classList.contains("share-facebook")
      ? "facebook"
      : link.classList.contains("share-twitter")
      ? "twitter"
      : link.classList.contains("share-pinterest")
      ? "pinterest"
      : "link";

    modalLogger.debug("Social share initiated", { platform: type });

    // Add click animation
    link.classList.add("animate__animated", "animate__tada");
    setTimeout(() => {
      link.classList.remove("animate__animated", "animate__tada");
    }, 1000);

    // For direct links, we already handle in updateSocialLinks
    if (type === "link") {
      modalLogger.debug("Link share handled separately");
      modalLogger.timeEnd("Social share handling");
      return;
    }

    // Open share window
    const popup = window.open(
      link.href,
      "share-popup",
      "width=600,height=600,top=100,left=100"
    );

    if (popup) {
      popup.focus();
      modalLogger.info("Share popup opened successfully", { platform: type });
    } else {
      modalLogger.warn("Share popup blocked by browser", { platform: type });
    }

    modalLogger.timeEnd("Social share handling");
  }

  showTooltip(message, element) {
    modalLogger.time("Tooltip display");
    modalLogger.debug("Showing tooltip", { message });

    const tooltip = document.createElement("div");
    tooltip.className = "modal-tooltip";
    tooltip.textContent = message;

    const rect = element.getBoundingClientRect();
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    tooltip.style.top = `${rect.top - 40}px`;

    document.body.appendChild(tooltip);

    setTimeout(() => {
      tooltip.classList.add("visible");
    }, 10);

    setTimeout(() => {
      tooltip.classList.remove("visible");
      setTimeout(() => {
        tooltip.remove();
        modalLogger.debug("Tooltip removed");
      }, 300);
    }, 2000);

    modalLogger.timeEnd("Tooltip display");
  }

  async loadMediaData() {
    modalLogger.time("Media data loading");

    try {
      modalLogger.debug("Fetching gallery data from /gallery-data.json");
      const response = await fetch("/gallery-data.json");

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }

      const mediaData = await response.json();
      modalLogger.info("Media data loaded successfully", {
        mediaCount: mediaData.media?.length || 0,
      });

      modalLogger.timeEnd("Media data loading");
      return mediaData;
    } catch (error) {
      modalLogger.error("Error loading gallery data:", error);
      modalLogger.timeEnd("Media data loading");
      throw error;
    }
  }
}
