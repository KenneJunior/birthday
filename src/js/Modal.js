import logger from "./utility/logger.js";

// Create contextual logger for UltimateModal
const modalLogger = logger.withContext({ module: "UltimateModal" });

class UltimateModal {
  constructor() {
    modalLogger.time("UltimateModal constructor");
    const MediaModal = document.getElementById("mediaModal");
    const cardContent = document.querySelector(".card-content");
    this.elements = {
      modalContainer: MediaModal.querySelector(".modal-container"),
      openModalBtn: cardContent.querySelector("#modal_open"),
      modalImage: MediaModal.querySelector(".modal-image"),
      modalVideo: MediaModal.querySelector(".modal-video"),
      Modal_loading__container: MediaModal.querySelector(".loading-container"),
      galleryContainer: cardContent.querySelector("#photo-gallery"),
      profileImage: cardContent.querySelector("#profile_pic"),
      profileImageContainer: cardContent.querySelector(".image-container"),
      closeButton: MediaModal.querySelector(".modal-close"),
      maximizeModalBtn: MediaModal.querySelector(".modal-maximize"),
      prevButton: MediaModal.querySelector(".modal-prev"),
      nextButton: MediaModal.querySelector(".modal-next"),
      counter: MediaModal.querySelector(".modal-counter"),
      socialLinks: MediaModal.querySelectorAll(".modal-social a"),
      profile_pic: cardContent.querySelector(".image-container"),
      seeMoreBtn: cardContent.querySelector(".see-more-arrow"),
      modalTooltip: MediaModal.querySelector(".modal-tooltip"),
        loadingProgressBar: MediaModal.querySelector('.loading-progress__bar'),
      modal: MediaModal,
      cardContent: cardContent,
    };

    modalLogger.debug("DOM elements cached", {
      elementsFound: Object.keys(this.elements).filter(
        (key) => !!this.elements[key]
      ).length,
      totalElements: Object.keys(this.elements).length,
    });

    this.state = {
      animations: [],
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
    this.mediaData = {};

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
    this.setupSeeMoreButton();
    this.setupImageTooltip();
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

  showMediaLoading(mediaElement) {
    modalLogger.time("Show media loading animation");

    // Show loading container with proper classes
    const loadingContainer = this.elements.Modal_loading__container;
    if (loadingContainer) {
      loadingContainer.classList.add("is-visible", "is-loading");
      loadingContainer.setAttribute("aria-hidden", "false");
      loadingContainer.setAttribute("aria-live", "off");

      this._startProgressAnimation();

      modalLogger.debug("Loading container activated", {
        hasVisible: loadingContainer.classList.contains("is-visible"),
        hasLoading: loadingContainer.classList.contains("is-loading"),
        ariaHidden: loadingContainer.getAttribute("aria-hidden"),
        ariaLive: loadingContainer.getAttribute("aria-live"),
      });
    }

    // Hide navigation elements and counter
    this._toggleNavigationElements(true);

    // Optional: Add loading class to media element if provided
    if (mediaElement) {
      mediaElement.classList.add("is-loading");
      modalLogger.debug("Loading class added to media element", {
      element: mediaElement.tagName,
      });
    }

    modalLogger.info("Media loading animation displayed successfully");
    modalLogger.timeEnd("Show media loading animation");
  }

  hideMediaLoading(mediaElement) {
    modalLogger.time("Hide media loading animation");
    const progressBar = this.elements.loadingProgressBar;
    if (progressBar) {
      progressBar.style.width = "100%";
    }

    // Hide loading container and reset attributes
    setTimeout(() => {
      const loadingContainer = this.elements.Modal_loading__container;
      if (loadingContainer) {
        loadingContainer.classList.remove("is-visible", "is-loading");
        loadingContainer.setAttribute("aria-hidden", "true");
        loadingContainer.setAttribute("aria-live", "polite");

        modalLogger.debug("Loading container deactivated", {
          ariaHidden: loadingContainer.getAttribute("aria-hidden"),
          ariaLive: loadingContainer.getAttribute("aria-live"),
        });
      }

      // Show navigation elements and counter
      this._toggleNavigationElements(false);

      // Remove loading class from media element if provided
      if (mediaElement) {
        mediaElement.classList.remove("is-loading");
        modalLogger.debug("Loading class removed from media element", {
          element: mediaElement.tagName,
        });
      }
    }, 500);

    modalLogger.info("Media loading animation hidden successfully");
    modalLogger.timeEnd("Hide media loading animation");
  }

    _toggleNavigationElements(hide) {
    const elementsToToggle = [
      this.elements.prevButton,
      this.elements.nextButton,
      this.elements.counter,
      this.elements.modalTooltip,
    ];
    elementsToToggle.forEach((element) => {
      if (element) {
        if (hide) {
          element.style.visibility = "hidden";
          element.style.opacity = "0";
          modalLogger.debug("Element hidden", { element: element.className });
        } else {
          element.style.visibility = "visible";
          element.style.opacity = "1";
          modalLogger.debug("Element shown", { element: element.className });
        }
      }
    });
  }

  /**
   * Starts the progress bar animation
   * @private
   */
  _startProgressAnimation() {
    const progressBar = this.elements.loadingProgressBar;
    if (!progressBar) return;

    let progress = 0;
    const maxProgress = 85;

    const interval = setInterval(() => {
      const currentWidth = parseFloat(progressBar.style.width) || 0;

      if (currentWidth >= maxProgress) {
        clearInterval(interval);
        return;
      }

      progress += 2 + Math.random() * 3;
      progressBar.style.width = Math.min(progress, maxProgress) + "%";
    }, 300);
  }

  cacheImages() {
    modalLogger.time("Image caching");

    // Get only visible thumbnails (not hidden with d-none)
    this.elements.thumbnails =
      this.elements.cardContent.querySelectorAll(".photo-thumbnail");
    this.elements.allVisibleThumbnails =
      this.elements.cardContent.querySelectorAll(
        ".photo-thumbnail:not(.d-none)"
      );

    modalLogger.debug("Found visible thumbnails", {
      visibleCount: this.elements.allVisibleThumbnails.length,
      totalMedia: this.mediaData.media.length,
    });

    // Create a map of media data by index for quick lookup
    const mediaByIndex = {};
    this.mediaData.media.forEach((media, index) => {
      mediaByIndex[index] = media;
    });

    // Cache only the media that corresponds to visible thumbnails
    this.state.media = [];

    this.elements.allVisibleThumbnails.forEach((thumbnail) => {
      // Get the media-index attribute
      const mediaIndex = parseInt(thumbnail.getAttribute("media-index"));

      if (!isNaN(mediaIndex) && mediaByIndex[mediaIndex]) {
        const mediaItem = mediaByIndex[mediaIndex];
        this.state.media.push({
          src: mediaItem.src,
          alt: mediaItem.alt,
          data_type: mediaItem["data-type"],
          vidSrc: mediaItem["video-src"],
          originalIndex: mediaIndex, // Keep track of original index
        });

        modalLogger.debug("Cached thumbnail media", {
          index: mediaIndex,
          alt: mediaItem.alt,
          dataType: mediaItem["data-type"],
        });
      } else {
        modalLogger.warn("Invalid media index or missing media data", {
          mediaIndex: mediaIndex,
          thumbnail: thumbnail.querySelector("img")?.alt || "unknown",
        });
      }
    });

    modalLogger.info("Media data cached successfully", {
      thumbnailCount: this.elements.allVisibleThumbnails.length,
      mediaCount: this.state.media.length,
      mediaTypes: this.state.media.map((m) => m.data_type),
      originalIndices: this.state.media.map((m) => m.originalIndex),
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

    this._setCurrentIndex(index);
    document.body.style.overflow = "hidden";
    this.elements.modal.classList.remove("d-none");
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
    this.hideImageTooltip();

    this.elements.modal.classList.remove("active");
    this.elements.modal.classList.add("d-none");
    this.elements.allVisibleThumbnails[
      this.state.currentIndex
    ].classList.remove("active");

    modalLogger.timeEnd("Modal close");
  }

  _getCurrentMedia() {
    return this.state.media[this.state.currentIndex];
  }
  _setCurrentIndex(index) {
    this.state.currentIndex = Math.max(
      0,
      Math.min(index, this.state.media.length - 1)
    );
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
    const current = this._getCurrentMedia();
    const mediaElement =
      current.data_type === "image"
        ? this.elements.modalImage
        : this.elements.modalVideo;
    this.showMediaLoading(mediaElement);

    if (!this.elements.modalVideo.classList.contains("d-none")) {
      modalLogger.debug("Pausing current video during navigation");
      this.elements.modalVideo.pause();
    }
    this.hideImageTooltip();

    this.state.currentIndex += direction;
    // Circular navigation
    this.state.currentIndex =
      ((this.state.currentIndex % this.state.media.length) +
        this.state.media.length) %
      this.state.media.length;

    this.updateModalContent();
    this.animateTransition(direction);

    modalLogger.debug("Navigation completed", {
      newIndex: this.state.currentIndex,
    });
    modalLogger.timeEnd("Navigation");
  }

  updateModalContent() {
    modalLogger.time("Update modal content");
    const current = this._getCurrentMedia();
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
  setupImageTooltip() {
    modalLogger.time("ImageTooltipSetup");

    // Use the existing tooltip from your HTML
    this.tooltip = this.elements.modalTooltip;

    if (!this.tooltip) {
      modalLogger.warn("Modal tooltip element not found in DOM");
      modalLogger.timeEnd("ImageTooltipSetup");
      return;
    }

    modalLogger.debug("Found existing modal tooltip element");

    // Set up click event for tooltip display on image
    this.elements.modalImage.addEventListener("click", (e) => {
      this.showImageTooltip(e);
    });

    // Set up click event for video (if you want tooltips on videos too)
    if (this.elements.modalVideo) {
      this.elements.modalVideo.addEventListener("click", (e) => {
        this.showImageTooltip(e);
      });
    }
    this.elements.maximizeModalBtn?.addEventListener("click", () => {
      this.hideImageTooltip();
    });

    if (this.hammer) {
      this.hammer.on("tap", (e) => {
        event.preventDefault();
        modalLogger.debug(" tap detected, toggling tooltip");
        this.showImageTooltip(e);
      });
    }

    // Hide tooltip on escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.hideImageTooltip();
      }
    });

    modalLogger.debug("Image tooltip setup completed");
    modalLogger.timeEnd("ImageTooltipSetup");
  }

  showImageTooltip(event) {
    // Don't show tooltip if we're in zoomed mode or if tooltip doesn't exist
    if (this.state.isZoomed || !this.tooltip) {
      return;
    }

    modalLogger.debug("Showing image tooltip", {
      clientX: event.clientX,
      clientY: event.clientY,
    });

    // Set tooltip message based on device type and current state
    const current = this._getCurrentMedia();
    const message = current.alt;
    // Update tooltip text
    this.tooltip.textContent = message;

    // OFFSCREEN MEASUREMENT TECHNIQUE: Temporarily position offscreen to measure accurately
    // without affecting the visible UI or relying on hidden visibility
    const originalDisplay = this.tooltip.style.display;
    const originalLeft = this.tooltip.style.left;
    const originalTop = this.tooltip.style.top;
    const originalVisibility = this.tooltip.style.visibility;

    // Set up for measurement: display block, visible, positioned way offscreen
    this.tooltip.style.display = "block";
    this.tooltip.style.visibility = "visible";
    this.tooltip.style.left = "-9999px"; // Offscreen left
    this.tooltip.style.top = "auto"; // Reset top for natural height
    this.tooltip.classList.add("visible"); // Ensure full styles (e.g., animations/transitions) are applied

    // Force reflow to apply styles and compute dimensions
    this.tooltip.offsetHeight; // Trigger reflow

    // Now measure
    const tooltipRect = this.tooltip.getBoundingClientRect();
    const tooltipWidth = tooltipRect.width;
    const tooltipHeight = tooltipRect.height;

    // Reset to original state for positioning (will re-apply position later)
    this.tooltip.classList.remove("visible");
    this.tooltip.style.display = originalDisplay;
    this.tooltip.style.left = originalLeft;
    this.tooltip.style.top = originalTop;
    this.tooltip.style.visibility = originalVisibility;

    // Get modal and viewport dimensions
    const modalRect = this.elements.modalContainer.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate ideal position (centered near click with offset)
    const clickX = event.clientX;
    const clickY = event.clientY;

    // Adjusted for "directly under the mouse": position below click, centered horizontally
    const offsetY = 10; // Small offset below the click
    let tooltipX = clickX - tooltipWidth / 2; // Center horizontally relative to click
    let tooltipY = clickY + offsetY;

    // Smart boundary detection and adjustment with priorities:
    // 1. Prefer below, then above, then clamp
    // 2. Horizontal: prefer centered at click, then shift left/right, then clamp
    const safeMargin = 12; // Slightly larger margin for better UX

    // HORIZONTAL POSITIONING
    // Check right boundary first (viewport)
    if (tooltipX + tooltipWidth > viewportWidth - safeMargin) {
      // Shift left from click position (without extra offset to avoid being too far)
      tooltipX = clickX - tooltipWidth;
    }

    // Check left boundary (viewport)
    if (tooltipX < safeMargin) {
      // Clamp to left edge or center if too narrow
      if (tooltipWidth > viewportWidth - 2 * safeMargin) {
        // Tooltip too wide for screen: center it
        tooltipX = (viewportWidth - tooltipWidth) / 2;
      } else {
        tooltipX = safeMargin;
      }
    }

    // VERTICAL POSITIONING
    // Prefer below click
    if (tooltipY + tooltipHeight > viewportHeight - safeMargin) {
      // Not enough space below: try above
      tooltipY = clickY - tooltipHeight - 10; // Above with small offset
      // If still hits top, clamp to top
      if (tooltipY < safeMargin) {
        tooltipY = safeMargin;
      }
    }

    // MODAL BOUNDS ADJUSTMENT: Ensure tooltip stays INSIDE modal
    // This is crucial if modal has overflow: hidden or padding
    const modalPadding = 20; // Account for modal's internal padding/borders

    // Horizontal modal bounds
    const modalSafeLeft = modalRect.left + modalPadding;
    const modalSafeRight = modalRect.right - modalPadding;
    if (tooltipX < modalSafeLeft) {
      tooltipX = modalSafeLeft;
    }
    if (tooltipX + tooltipWidth > modalSafeRight) {
      tooltipX = modalSafeRight - tooltipWidth;
      // If still overflows left, center in modal
      if (tooltipX < modalSafeLeft) {
        tooltipX = (modalRect.width - tooltipWidth) / 2 + modalRect.left;
      }
    }

    // Vertical modal bounds
    const modalSafeTop = modalRect.top + modalPadding;
    const modalSafeBottom = modalRect.bottom - modalPadding;
    if (tooltipY < modalSafeTop) {
      tooltipY = modalSafeTop;
    }
    if (tooltipY + tooltipHeight > modalSafeBottom) {
      tooltipY = modalSafeBottom - tooltipHeight;
      // If still overflows top, center vertically in modal
      if (tooltipY < modalSafeTop) {
        tooltipY = (modalRect.height - tooltipHeight) / 2 + modalRect.top;
      }
    }

    // Apply final position (absolute to document)
    this.tooltip.style.left = `${Math.round(tooltipX)}px`;
    this.tooltip.style.top = `${Math.round(tooltipY)}px`;

    // Show tooltip with smooth animation
    requestAnimationFrame(() => {
      this.tooltip.classList.add("visible");
    });

    // Auto-hide after 3.5 seconds (slight increase for readability)
    clearTimeout(this.tooltipTimeout);
    this.tooltipTimeout = setTimeout(() => {
      this.hideImageTooltip();
    }, 3500);

    modalLogger.debug("Image tooltip displayed", {
      message,
      clickPosition: { x: clickX, y: clickY },
      finalPosition: { x: tooltipX, y: tooltipY },
      tooltipDimensions: { width: tooltipWidth, height: tooltipHeight },
      viewport: { width: viewportWidth, height: viewportHeight },
      modalBounds: {
        left: modalRect.left,
        right: modalRect.right,
        top: modalRect.top,
        bottom: modalRect.bottom,
      },
    });
  }

  hideImageTooltip() {
    if (this.tooltip) {
      this.tooltip.classList.remove("visible");
      clearTimeout(this.tooltipTimeout);
      modalLogger.debug("Image tooltip hidden");
    }
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

    this.showMediaLoading(this.elements.modalImage);

    this.elements.modalVideo.classList.add("d-none");
    this.elements.modalImage.src = src;
    this.elements.modalImage.alt = alt;
    this.elements.modalImage.classList.remove("d-none");

    this.elements.modalImage.addEventListener("load", () => {
      this.hideMediaLoading(this.elements.modalImage);
      modalLogger.debug("Image loaded successfully");
    });
    modalLogger.debug("Image display configured");
  }

  _showVideo(src, alt) {
    modalLogger.debug("Showing video in modal", { src, alt });
    this.showMediaLoading(this.elements.modalVideo);

    this.elements.modalImage.classList.add("d-none");
    this.elements.modalVideo.src = src;
    this.elements.modalVideo.alt = alt;
    this.elements.modalVideo.classList.remove("d-none");

    this.elements.modalVideo.addEventListener("loadeddata", () => {
      modalLogger.debug("Video data loaded");
      this.hideMediaLoading(this.elements.modalVideo);
    });

    this.elements.modalVideo.addEventListener("error", () => {
      modalLogger.error("Video failed to load");
      this.hideMediaLoading(this.elements.modalVideo);
    });

    this.elements.modalVideo.addEventListener("waiting", () => {
      modalLogger.debug("Video buffering, show loading");
      this.showMediaLoading(this.elements.modalVideo);
    });

    this.elements.modalVideo.addEventListener("canplay", () => {
      modalLogger.debug("Video can play, hide loading");
      this.hideMediaLoading(this.elements.modalVideo);
    });

    this.elements.modalVideo
      .play()
      .then(() => {
        modalLogger.debug("Video playback started successfully");
      })
      .catch((error) => {
        this.elements.modalVideo.classList.add("d-none");
        modalLogger.error("Video playback failed", error);
      });

    modalLogger.debug("Video display configured");
  }

  activeThumbnail() {
    modalLogger.time("Active thumbnail update");

    this.elements.allVisibleThumbnails.forEach((thumb) => {
      thumb.classList.remove("active");
    });

    const thumbnail =
      this.elements.allVisibleThumbnails[this.state.currentIndex];
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
      this.hideImageTooltip();
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
    figure.setAttribute("media-index", index);
    figure.appendChild(img);
    return figure;
  }

  async generateGallery() {
    modalLogger.time("Gallery generation");
    const { galleryContainer } = this.elements;
    if (!galleryContainer) {
      modalLogger.error("Gallery container not found");
      modalLogger.timeEnd("Gallery generation");
      return;
    }

    modalLogger.debug("Starting gallery generation");
    this.mediaData = await this.loadMediaData();

    this.mediaData.media.forEach((mediaData, index) => {
      const figure = this.createGalleryFigure(mediaData, index);

      // Hide images beyond the first 9 (index > 8) but  last 1 visible
      if (index > 8 && index !== this.mediaData.media.length - 1) {
        figure.classList.add("d-none");
      }
      galleryContainer.appendChild(figure);
    });

    this.cacheImages();
    this.setupEventListeners();
    this.setupSocialSharing();

    // Check if we need to show the See More button
    this.checkSeeMoreButton();

    modalLogger.info("Gallery generation completed", {
      mediaCount: this.mediaData.media.length,
      thumbnailsCreated: galleryContainer.children.length,
      hiddenThumbnails: this.elements.cardContent.querySelectorAll(
        ".photo-thumbnail.d-none"
      ).length,
    });
    modalLogger.timeEnd("Gallery generation");
  }
  /**
   * Check if See More button should be visible
   */
  checkSeeMoreButton() {
    const hiddenThumbnails = this.elements.cardContent.querySelectorAll(
      ".photo-thumbnail.d-none"
    );

    if (hiddenThumbnails.length === 0 && this.elements.seeMoreBtn) {
      modalLogger.debug("No hidden thumbnails, hiding See More button");
      this.elements.seeMoreBtn.style.display = "none";
    } else {
      modalLogger.debug(
        "Hidden thumbnails found, See More button should be visible",
        {
          hiddenCount: hiddenThumbnails.length,
        }
      );
    }
  }

  /**
   * Setup the See More button functionality
   */
  setupSeeMoreButton() {
    modalLogger.time("See More button setup");

    if (!this.elements.seeMoreBtn) {
      modalLogger.warn("See More button not found in DOM");
      modalLogger.timeEnd("See More button setup");
      return;
    }

    this.elements.seeMoreBtn.addEventListener("click", () => {
      this.showMoreMemories();
    });

    modalLogger.debug("See More button event listener added");
    modalLogger.timeEnd("See More button setup");
  }

  /**
   * Show hidden memories when See More is clicked
   */
  showMoreMemories() {
    modalLogger.time("Show more memories");

    // Show loading state
    const arrow = this.elements.seeMoreBtn.querySelector(".arrow");
    const text = this.elements.seeMoreBtn.querySelector(".text");

    if (arrow && text) {
      arrow.style.animation = "none";
      text.textContent = "Loading...";
      arrow.style.opacity = "0.7";
    }

    // Get all hidden thumbnails
    const hiddenThumbnails = this.elements.cardContent.querySelectorAll(
      ".photo-thumbnail.d-none"
    );
    modalLogger.debug("Found hidden thumbnails", {
      count: hiddenThumbnails.length,
    });

    if (hiddenThumbnails.length === 0) {
      modalLogger.debug("No more hidden thumbnails to show");
      this.hideSeeMoreButton();
      modalLogger.timeEnd("Show more memories");
      return;
    }

    // Show hidden thumbnails with staggered animation
    hiddenThumbnails.forEach((thumbnail, index) => {
      if (index >= 6) return; // Show only 6 at a time
      setTimeout(() => {
        thumbnail.classList.remove("d-none");
        thumbnail.classList.add("revealed");
        thumbnail.style.animationDelay = `${index * 0.1}s`;

        modalLogger.debug("Revealed thumbnail", {
          index,
          alt: thumbnail.querySelector("img")?.alt || "unknown",
        });
      }, index * 100);
    });

    // Check if there are still hidden thumbnails after revealing some
    setTimeout(() => {
      const remainingHidden = this.elements.cardContent.querySelectorAll(
        ".photo-thumbnail.d-none"
      );

      if (remainingHidden.length === 0) {
        modalLogger.debug("All thumbnails revealed, hiding See More button");
        this.hideSeeMoreButton();
      } else {
        // Reset button state if there are still more to show
        if (arrow && text) {
          arrow.style.animation =
            "float 2s ease-in-out infinite, pulse-glow 3s ease-in-out infinite";
          text.textContent = "See More Memories";
          arrow.style.opacity = "1";
        }
        modalLogger.debug("Some thumbnails remain hidden", {
          remaining: remainingHidden.length,
        });
      }

      // Update the media array to include the newly revealed thumbnails
      this.updateMediaArray();

      modalLogger.info("More memories revealed successfully", {
        revealedCount: Math.min(hiddenThumbnails.length, 6), // Show 6 at a time
        totalRevealed: this.state.media.length,
      });
    }, hiddenThumbnails.length * 100 + 500);

    modalLogger.timeEnd("Show more memories");
  }

  /**
   * Hide the See More button with animation
   */
  hideSeeMoreButton() {
    modalLogger.time("Hide See More button");

    if (this.elements.seeMoreBtn) {
      this.elements.seeMoreBtn.style.opacity = "0";
      this.elements.seeMoreBtn.style.transform = "translateY(20px)";

      setTimeout(() => {
        this.elements.seeMoreBtn.style.display = "none";
        modalLogger.debug("See More button hidden");
      }, 500);
    }

    modalLogger.timeEnd("Hide See More button");
  }

  /**
   * Update the media array to include newly revealed thumbnails
   */
  updateMediaArray() {
    modalLogger.time("Update media array");

    const allVisibleThumbnails = this.elements.cardContent.querySelectorAll(
      ".photo-thumbnail:not(.d-none)"
    );
    const updatedMedia = [];
    const mediaByIndex = {};

    // Create a map of all media data
    this.mediaData.media.forEach((media, index) => {
      mediaByIndex[index] = media;
    });

    // Build media array based on visible thumbnails and their media-index
    allVisibleThumbnails.forEach((thumb) => {
      const mediaIndex = parseInt(thumb.getAttribute("media-index"));

      if (!isNaN(mediaIndex) && mediaByIndex[mediaIndex]) {
        const mediaItem = mediaByIndex[mediaIndex];
        updatedMedia.push({
          src: mediaItem.src,
          alt: mediaItem.alt,
          data_type: mediaItem["data-type"],
          vidSrc: mediaItem["video-src"],
          originalIndex: mediaIndex,
        });
      }
    });
    this.elements.allVisibleThumbnails = allVisibleThumbnails;
    this.state.media = updatedMedia;

    modalLogger.debug("Media array updated with media-index approach", {
      visibleThumbnails: allVisibleThumbnails.length,
      mediaCount: this.state.media.length,
      indices: this.state.media.map((m) => m.originalIndex),
    });

    modalLogger.timeEnd("Update media array");
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

export default UltimateModal
