// Utility: Fetch manifest and get app name
import Notification from "../js/notification.js";
import logger from "../js/utility/logger.js";
import { getAppName } from "../js/utility/utils.js";
// PWA Prompt Manager - Advanced Implementation
class PWAPrompt extends HTMLElement {
  static get observedAttributes() {
    return ["hidden", "platform"];
  };
  constructor() {
    super();
    // Configuration 
  this.appLogger = logger.withContext({
  name: "PWA_Prompt.js",
  });
    this.config = {
      dismissDuration: 10 * 60 * 1000, // 10 mins
      remindDuration: 15 * 60 * 1000, // 15 mins
      showDelay: 10000,
      minSessionTime: 10000, // 10 seconds
      maxDisplayCount: 15,
    };

    // State
    this.state = {
      deferredPrompt: null,
      platform: null,
      isStandalone: false,
      sessionStart: Date.now(),
      displayCount: 0,
    };
        this.shouldShowReopenNotification = true;


    this.Notification = new Notification();

    // Bind methods
    this.bindMethods();
  }

  connectedCallback() {
    this.init();
  }

  bindMethods() {
    this.handleBackdropClick = this.handleBackdropClick.bind(this);
    this.handleActionClick = this.handleActionClick.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleBeforeInstallPrompt = this.handleBeforeInstallPrompt.bind(this);
    this.handleAppInstalled = this.handleAppInstalled.bind(this);
    this.animateOut = this.animateOut.bind(this);
  }
  /**
   * to be short and brief what im doing is creating some templetate
   * tags each pair for a platform (e.g andriod, ios and default)
   * that will be injected in a thier approprite tags in the the
   * <prompt-tag></prompt-tag>
   *
   */
  async init() {
    this.detectPlatform();
    this.detectStandalone();

    if (!this.shouldInitialize()) return;

    await this.injectPlatformContent();
    await this.setupEventListeners();
    this.monitorUserEngagement();
  }

    /**
     * detect the platform to see if it andriod or windows or ios
     */
  detectPlatform() {
    const ua = navigator.userAgent;

    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
      this.state.platform = "ios";
    } else if (/Android/.test(ua)) {
      this.state.platform = "android";
    } else if (/Windows/.test(ua)) {
      this.state.platform = "windows";
    } else if (/Chrome/.test(ua)) {
      this.state.platform = "windows";
    } else {
      this.state.platform = "other";
    }

    this.setAttribute("platform", this.state.platform);
    this.appLogger.info(
      "Detected platform:",
      " Type: " + this.state.platform + " name: " + ua
    );
  }

    /**
     * check if the app has already been installed
     */
  detectStandalone() {
    this.state.isStandalone =
      window.navigator.standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches;
  }

    shownNotification(){
     const numberOfNotificationShown = window.localStorage.getItem('Welcome_Notification');
      if (numberOfNotificationShown){
          try {
              let numberOfTime = parseInt(numberOfNotificationShown);
              if (numberOfTime === 3) {
                  return false;
              } else {
                  window.localStorage.setItem('Welcome_Notification', numberOfTime + 1);
                  return true
              }
          }catch (e) {
              window.localStorage.setItem('Welcome_Notification', 1);
              return true
          }
      }
        window.localStorage.setItem('Welcome_Notification', 1);
        return true
    }

  shouldInitialize() {
    // Don't initialize if already installed
    if (this.state.isStandalone && this.shownNotification()) {

      this.appLogger.debug("App is already installed");
      this.Notification.setNotificationType()
        .toggleViewDetails(false)
        .showNotification("info", {
          title: "Welcome Again",
          message: `
      <p style="line-height:1.6;"> You have already installed this app on your device.😅😅<br>
      Hope you are enjoying the experience!.one fun fact about installing<br>
      this app is that it can work offline 😎 and provide a more app-like experience 🤗<br>
      <p>
      <p style="margin-top: 10px; font-style: italic;">Enjoy exploring this page 🥰💕💘!</p>
      `,
          icon: "fa-solid fa-thumbs-up",
          useHTML: true,
          autoCloseTime: 7000,
        })
        .setupEventListeners();
      return false;
    }

    // Check if platform is supported
    if (!this.isPlatformSupported()) {
      this.appLogger.warn(
        `Platform ${this.state.platform} not supported for PWA installation`
      );
      return false;
    }

    // Check dismissal state
    const dismissal = this.getDismissalState();
    if (dismissal && this.isDismissalValid(dismissal)) {
      this.appLogger.debug("Prompt recently dismissed");
      return false;
    }

    // Check display count
    if (this.hasExceededDisplayCount()) {
      this.appLogger.debug("Maximum display count reached");
      return false;
    }

    return true;
  }

  async injectPlatformContent() {
    const platform = this.state.platform;
    const content = this.querySelector("#pwa-prompt-content");
    const actions = this.querySelector("#pwa-prompt-actions");
    if (content && actions) {
      this.appLogger.info("Injecting templates for platform:", platform);
      content.innerHTML = "";
      actions.innerHTML = "";
      const templateConfig = this.getTemplateConfig(platform);
      const contentTemplate = document.getElementById(templateConfig.content);
      const appName = await getAppName();
      if (contentTemplate) {
        const contentClone = contentTemplate.content.cloneNode(true);
        const appNameElements = contentClone.querySelectorAll(
          ".pwa-prompt__app-name"
        );
        appNameElements.forEach((element) => {
          element.textContent = appName;
        });
        content.appendChild(contentClone);
      } else {
        console.error("Content template not found:", templateConfig.content);
      }
      const actionsTemplate = document.getElementById(templateConfig.actions);
      if (actionsTemplate) {
        const actionsClone = actionsTemplate.content.cloneNode(true);
        actions.appendChild(actionsClone);
      } else {
        console.error("Actions template not found:", templateConfig.actions);
      }
    } else {
      console.error("Content or actions containers not found");
    }
  }

  getTemplateConfig(platform) {
    switch (platform) {
      case "windows":
      case "android":
        return {
          content: "pwa-prompt-android-template",
          actions: "pwa-prompt-android-actions",
        };
      case "ios":
        return {
          content: "pwa-prompt-ios-template",
          actions: "pwa-prompt-ios-actions",
        };
      default:
        return {
          content: "pwa-prompt-default-template",
          actions: "pwa-prompt-default-actions",
        };
    }
  }

  isPlatformSupported() {
    return ["ios", "android", "windows"].includes(this.state.platform);
  }

  /**
   * Helper method to check if dismissal is still valid
   * Uses timestamp for accurate time calculations
   */
  isDismissalValid(dismissal) {
    if (!dismissal || !dismissal.timestamp) return false;
    
    const timeSinceDismiss = Date.now() - dismissal.timestamp;
    const isValid = timeSinceDismiss < dismissal.duration;
    
    this.appLogger.debug("Dismissal validity check:", {
      timeSinceDismiss: this.formatDuration(timeSinceDismiss),
      duration: this.formatDuration(dismissal.duration),
      isValid: isValid
    });
    
    return isValid;
  }

   /**
   * Helper method to format duration for logging
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }


  hasExceededDisplayCount() {
    const displayHistory = this.getDisplayHistory();
    return displayHistory.count >= this.config.maxDisplayCount;
  }

  async setupEventListeners() {
    // PWA installation events
    window.addEventListener(
      "beforeinstallprompt",
      this.handleBeforeInstallPrompt
    );
    window.addEventListener("appinstalled", this.handleAppInstalled);

    // Component events
    this.addEventListener("click", this.handleBackdropClick);
    this.addEventListener("keydown", this.handleKeydown);

    // Action buttons
    this.delegate("[data-action]", "click", this.handleActionClick);
    this.delegate("[data-dismiss]", "click", () => this.hide('dismissed'));

    //query the data-action install button
    const installBtn = document.querySelector('[data-action="install"]');
    installBtn?.addEventListener("click", this.triggerInstallation.bind(this));

    // Visibility changes
    document.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange.bind(this)
    );
  }

  delegate(selector, event, handler) {
    this.addEventListener(event, (e) => {
      if (
        e.target.matches(selector) ||
        e.target.closest(selector) ||
        !e.target.dataset.action === "install"
      ) {
        handler(e);
      }
    });
  }

  handleBeforeInstallPrompt(event) {
    event.preventDefault();
    this.state.deferredPrompt = event;

    // For Android, we can trigger the prompt immediately or wait for user engagement
    this.appLogger.debug("BeforeInstallPrompt event captured");

    // Show prompt for Android after short delay
    if (this.state.platform === "android" || "windows") {
      this.scheduleDisplay();
    }
  }

  handleAppInstalled() {
    this.appLogger.info("App installed successfully");
    this.setAttribute("installed", "true");
    this.hide("installed");

    // Clean up
    this.cleanup();
  }

  handleVisibilityChange() {
    if (document.hidden) {
      this.pauseTimers();
    } else {
      this.resumeTimers();
    }
  }

  handleBackdropClick(event) {
    if (event.target.hasAttribute("data-dismiss")) {
      this.hide("backdrop");
    }
  }

  handleActionClick(event) {
    const action = event.target.dataset.action;

    switch (action) {
      case "install":
        break;
      case "understand":
        this.hide("understand");
        break;
      case "remind-later":
        this.hide("remind-later");
        break;
      default:
        this.hide(action);
    }
  }

  handleKeydown(event) {
    if (event.key === "Escape") {
      this.hide("escape");
    } else if (event.key === "Tab") {
      this.handleTabKey(event);
    }
  }

  handleTabKey(event) {
    const focusableElements = this.getFocusableElements();
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        event.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        event.preventDefault();
      }
    }
  }

  monitorUserEngagement() {
    // Track user interaction to show prompt at appropriate time
    let interactionCount = 0;

    const engagementHandler = () => {
      interactionCount++;

      // Show prompt after user has interacted with the page
      if (interactionCount >= 2 && this.state.platform === "ios") {
        this.scheduleDisplay();
        document.removeEventListener("click", engagementHandler);
      }
    };

    document.addEventListener("click", engagementHandler);

    // Fallback: show after session time
    setTimeout(() => {
      if (interactionCount === 0) {
        this.scheduleDisplay();
      }
    }, this.config.minSessionTime);
  }

  scheduleDisplay() {
    // Use requestIdleCallback for better performance
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => {
        setTimeout(() => this.show(), this.config.showDelay);
      });
    } else {
      setTimeout(() => this.show(), this.config.showDelay);
    }
  }

  async show() {
    if (this.hasAttribute("hidden")) {
      this.updateDisplayHistory();

      this.removeAttribute("hidden");
      this.setAttribute("aria-hidden", "false");

      // Trap focus
      this.previouslyFocused = document.activeElement;
      await this.animateIn();
      this.getFocusableElements()[0]?.focus();

      // Prevent body scroll
      this.disableBodyScroll();

      this.dispatchEvent(
        new CustomEvent("pwa-prompt:show", {
          bubbles: true,
          detail: { platform: this.state.platform },
        })
      );

      this.appLogger.debug("Prompt shown");
    }
  }

  async hide(reason = "unknown") {
    if (!this.hasAttribute("hidden")) {
      this.setAttribute("aria-hidden", "true");
      this.classList.add("pwa-prompt--exiting");

      await this.animateOut();

      this.setAttribute("hidden", "");
      this.classList.remove("pwa-prompt--exiting");

      // Restore body scroll and focus
      this.enableBodyScroll();
      this.previouslyFocused?.focus();

      this.handleDismissal(reason);

 this.dispatchEvent(
        new CustomEvent("pwa-prompt:hide", {
          bubbles: true,
          detail: { 
            reason, 
            platform: this.state.platform,
            canReopen: this.canReopenPrompt(reason)
          },
        })
      );

            if (this.shouldShowReopenNotification && this.shouldShowReopenNotificationForReason(reason)) {
        this.showReopenNotification(reason);
      }


      this.appLogger.debug(`Prompt hidden: ${reason}`);
    }
  }

  /**
   * Check if prompt can be reopened after this dismissal reason
   */
  canReopenPrompt(reason) {
    const nonReopenableReasons = ['accepted', 'installed', 'error'];
    return !nonReopenableReasons.includes(reason);
  }

  /**
   * Determine if we should show reopen notification for this dismissal reason
   */
  shouldShowReopenNotificationForReason(reason) {
    const showForReasons = ['backdrop', 'escape', 'understand', 'remind-later', 'dismissed'];
    return showForReasons.includes(reason) && this.canReopenPrompt(reason);
  }

   /**
   * Show notification with option to reopen the prompt
   */
  showReopenNotification(reason) {
    const platformInstructions = this.getPlatformInstructions();
    
    this.Notification
      .setNotificationType("info")
      .showNotification("info", {
        title: "Installation Prompt Hidden",
        message: `
          <div style="line-height: 1.6;">
            <p>The installation prompt was hidden. You can install this app anytime to:</p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>📱 <strong>Get app-like experience</strong></li>
              <li>⚡ <strong>Faster loading times</strong></li>
              <li>🔒 <strong>Work offline</strong></li>
              <li>🎯 <strong>Quick access from home screen</strong></li>
            </ul>
            ${platformInstructions}
          </div>`,
        icon: "fas fa-info-circle",
        useHTML: true,
        autoCloseTime: 15000, // Longer timeout for this important notification
      })
      .setupEventListeners();

    setTimeout(() => {
      const reopenBtn = document.getElementById('view-details');
      const dismissBtn = document.getElementById('dimiss');

      reopenBtn.innerText = 'Install Again'
      
      if (reopenBtn) {
        reopenBtn.addEventListener('click', () => {
          this.Notification.hideNotification();
          this.showPromptAgain();
        });
      }
      
      if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
          this.Notification.hideNotification();
          this.setExtendedDismissal();
        });
      }
    }, 100);
  }
 /**
   * Get platform-specific installation instructions
   */
  getPlatformInstructions() {
    switch (this.state.platform) {
      case 'ios':
        return `
          <p style="font-size: 12px; color: #666; margin-top: 10px;">
            <strong>iOS Tip:</strong> Tap the Share button <span style="font-family: Arial;">⎋</span> 
            and then "Add to Home Screen"
          </p>`;
      case 'android':
        return `
          <p style="font-size: 12px; color: #666; margin-top: 10px;">
            <strong>Android Tip:</strong> Tap the menu button ⋮ and select "Install app" 
            or "Add to Home Screen"
          </p>`;
      default:
        return `
          <p style="font-size: 12px; color: #666; margin-top: 10px;">
            <strong>Tip:</strong> Look for the install option in your browser's menu
          </p>`;
    }
  }

  /**
   * Show the prompt again when user requests it
   */
  showPromptAgain() {
    // Clear the current dismissal state to allow immediate showing
    this.clearDismissalState();
    
    // Reset display count for this session
    this.resetDisplayCount();
    
    // Show the prompt again
    this.show();
    
    this.appLogger.info("Prompt reopened by user request");
  }

  /**
   * Clear dismissal state to allow prompt to show again
   */
  clearDismissalState() {
    try {
      localStorage.removeItem("pwa-prompt-dismissal");
      this.appLogger.debug("Dismissal state cleared");
    } catch (error) {
      this.appLogger.error("Failed to clear dismissal state:", error);
    }
  }

  /**
   * Reset display count for current session
   */
  resetDisplayCount() {
    this.state.displayCount = 0;
  }

  /**
   * Set extended dismissal when user explicitly dismisses the notification
   */
  setExtendedDismissal() {
    const extendedDuration = 60 * 60 * 1000; // 1 hour
    this.setDismissalState(extendedDuration);
    this.appLogger.debug("Extended dismissal set for 1 hour");
  }

  /**
   * Method to manually trigger the reopen notification (for testing)
   */
  triggerReopenNotification() {
    this.showReopenNotification('manual');
  }

  async triggerInstallation() {
    if (this.state.deferredPrompt) {
      try {
        this.state.deferredPrompt.prompt();

        const { outcome } = await this.state.deferredPrompt.userChoice;

        this.dispatchEvent(
          new CustomEvent("pwa-prompt:install-result", {
            bubbles: true,
            detail: { outcome },
          })
        );

        this.appLogger.info(`Installation: ${outcome}`);

        if (outcome === "accepted") {
          this.hide("accepted");
          this.Notification.setupEventListeners.setNotificationType()
            .toggleViewDetails(false)
            .showNotification("success", {
              title: "Installation Successful",
              message: `
          <p style="line-height:1.6;"> Thank you for installing this app!😅😅<br>
          Hope you are enjoying the experience!.one fun fact about installing<br>
          this app is that it can work offline 😎 and provide a more app-like experience 🤗<br>
          `,
              icon: "fa-solid fa-thumbs-up",
              useHTML: true,
              autoCloseTime: 7000,
            });
        } else {
          this.hide("dismissed");
          this.Notification.setNotificationType()
            .toggleViewDetails(false)
            .showNotification("info", {
              title: "Installation Dismissed",
              message: `App installation was dismissed. You can install it later from your browser menu.`,
              icon: "fa-solid fa-thumbs-down",
              autoCloseTime: 3000,
            })
            .setupEventListeners();
        }
      } catch (error) {
        this.appLogger.error("Installation failed:", error);
        this.hide("error");
      }
    } else {
      // For iOS, we can't programmatically trigger installation
      this.hide("understand");
    }
  }

  animateIn() {
    return new Promise((resolve) => {
      // CSS animations handle the entrance
      setTimeout(resolve, 50);
    });
  }

  animateOut() {
    return new Promise((resolve) => {
      const duration = getComputedStyle(this).animationDuration;
      const timeout = parseFloat(duration) * 1000 || 300;
      setTimeout(resolve, timeout);
    });
  }

  disableBodyScroll() {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  enableBodyScroll() {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  pauseTimers() {
    // Implement if you have any running timers
  }

  resumeTimers() {
    // Implement if you have any paused timers
  }

  handleDismissal(reason) {
    let duration;

    switch (reason) {
      case "understand":
      case "accepted":
      case "installed":
      case "backdrop":
      case "escape":
        duration = this.config.dismissDuration;
        break;
      case "remind-later":
        duration = this.config.remindDuration;
        break;
      default:
        duration = this.config.remindDuration;
    }

    this.setDismissalState(duration);
  }

   /**
   * Method to get current dismissal status (for debugging/UI)
   */
  getDismissalStatus() {
    const dismissal = this.getDismissalState();
    if (!dismissal) {
      return { dismissed: false, message: "No dismissal recorded" };
    }

    const timeSinceDismiss = Date.now() - dismissal.timestamp;
    const timeRemaining = Math.max(0, dismissal.duration - timeSinceDismiss);
    
    return {
      dismissed: timeRemaining > 0,
      timeRemaining: timeRemaining,
      formattedTimeRemaining: this.formatDuration(timeRemaining),
      dismissedAt: dismissal.readableDate,
      dismissedTime: dismissal.readableTime,
      platform: dismissal.platform
    };
  }

   /**
   * Method to get display history summary (for debugging/UI)
   */
  getDisplayHistorySummary() {
    const history = this.getDisplayHistory();
    return {
      totalDisplays: history.count,
      lastDisplay: history.formattedDates[history.formattedDates.length - 1],
      displayDates: history.formattedDates,
      lastUpdated: history.lastUpdated
    };
  }

  /**
   * GETTER for dismissal state
   * Retrieves and parses dismissal state from localStorage
   * Converts formatted date string back to timestamp
   */
  getDismissalState() {
    try {
      const stored = localStorage.getItem("pwa-prompt-dismissal");
      if (!stored) return null;
      
      const dismissal = JSON.parse(stored);
      
      // Convert formatted date string back to timestamp
      if (dismissal.formattedDate) {
        dismissal.timestamp = new Date(dismissal.formattedDate).getTime();
      }
      
      return dismissal;
    } catch (error) {
      this.appLogger.error("Failed to get dismissal state:", error);
      return null;
    }
  }


  /**
   * SETTER for dismissal state
   * Saves dismissal state to localStorage with formatted date
   */
  setDismissalState(duration) {
    const now = new Date();
    const state = {
      timestamp: now.getTime(), 
      formattedDate: this.formatDateForStorage(now), 
      duration: duration,
      platform: this.state.platform,
      Date: this.formatDate(now), 
      Time: this.formatTime(now), 
    };

    try {
      localStorage.setItem("pwa-prompt-dismissal", JSON.stringify(state));
      this.appLogger.debug("Dismissal state saved:", state);
    } catch (error) {
      this.appLogger.error("Failed to save dismissal state:", error);
    }
  }


  /**
   * GETTER for display history
   * Retrieves and parses display history from localStorage
   * Converts formatted date strings back to timestamps
   */
  getDisplayHistory() {
    try {
      const stored = localStorage.getItem("pwa-prompt-display-history");
      if (!stored) {
        return { count: 0, dates: [], formattedDates: [] };
      }
      
      const history = JSON.parse(stored);
      
      // Convert formatted dates back to timestamps for calculations
      if (history.formattedDates && history.formattedDates.length > 0) {
        history.dates = history.formattedDates.map(dateStr => 
          new Date(dateStr).getTime()
        );
      }

            return history;
    } catch (error) {
      this.appLogger.error("Failed to get display history:", error);
      return { count: 0, dates: [], formattedDates: [] };
    }
  }

 /**
   * SETTER for display history
   * Updates display history in localStorage with formatted dates
   */
  updateDisplayHistory() {
    const history = this.getDisplayHistory();
    const now = new Date();
    const nowTimestamp = now.getTime();
    const formattedNow = this.formatDateForStorage(now);

    // Clean old entries (older than 7 days)
    const thirtyDaysAgo = nowTimestamp - 7 * 24 * 60 * 60 * 1000;
    
    // Filter using timestamps for accurate comparison
    const validIndices = history.dates
      .map((timestamp, index) => ({ timestamp, index }))
      .filter(item => item.timestamp > thirtyDaysAgo)
      .map(item => item.index);

    // Rebuild both arrays with valid entries
    history.dates = validIndices.map(index => history.dates[index]);
    history.formattedDates = validIndices.map(index => history.formattedDates[index]);

    // Add current display with both timestamp and formatted date
    history.dates.push(nowTimestamp);
    history.formattedDates.push(formattedNow);
    history.count = history.dates.length;
    
    // Add human readable info for debugging
    history.lastUpdated = {
      timestamp: nowTimestamp,
      formatted: this.formatDate(now),
      time: this.formatTime(now)
    };

    try {
      localStorage.setItem(
        "pwa-prompt-display-history",
        JSON.stringify(history)
      );
      this.appLogger.debug("Display history updated:", {
        count: history.count,
        lastUpdated: history.lastUpdated
      });
    } catch (error) {
      this.appLogger.error("Failed to update display history:", error);
    }
  }

 /**
   * Format date for storage (ISO string for easy parsing)
   */
  formatDateForStorage(dateObject) {
    return dateObject.toISOString();
  }

  /**
   * Format time for display
   */
  formatTime(dateObject) {
    const options = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    return new Intl.DateTimeFormat('en-US', options).format(dateObject);
  }

  /**
   * Format date for display
   */
  formatDate(dateObject) {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Intl.DateTimeFormat('en-US', options).format(dateObject);
  }


  getFocusableElements() {
    return Array.from(
      this.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => {
      return (
        !el.hasAttribute("disabled") &&
        el.offsetParent !== null &&
        el.getAttribute("aria-hidden") !== "true"
      );
    });
  }


  cleanup() {
    window.removeEventListener(
      "beforeinstallprompt",
      this.handleBeforeInstallPrompt
    );
    window.removeEventListener("appinstalled", this.handleAppInstalled);
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange
    );

    this.enableBodyScroll();
  }

  // Public API
  static getInstance() {
    return document.querySelector("pwa-prompt");
  }

  static show() {
    const prompt = this.getInstance;
    prompt?.show();
  }

  static hide(reason = "programmatic") {
    const prompt = this.getInstance;
    prompt?.hide(reason);
  }

  // Lifecycle
  disconnectedCallback() {
    this.cleanup();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "hidden" && newValue === "true") {
      this.enableBodyScroll();
    }
  }
}

// Enhanced Platform Detection
class PlatformDetector {
  static detect() {
    const ua = navigator.userAgent;
    const platform = {
      isIOS: /iPad|iPhone|iPod/.test(ua) && !window.MSStream,
      isAndroid: /Android/.test(ua),
      isWindows: /Windows/.test(ua),
      isChromium: /chrome/.test(ua),
      isMac: /Macintosh/.test(ua),
      isMobile: /Mobi/.test(ua),
      isStandalone:
        window.navigator.standalone === true ||
        window.matchMedia("(display-mode: standalone)").matches,
    };

    platform.type = platform.isIOS
      ? "ios"
      : platform.isAndroid
      ? "android"
      : platform.isWindows
      ? "windows"
      : platform.isMac
      ? "mac"
      : "other";

    return platform;
  }
}

// Installation Manager for different platforms
class InstallationManager {
  constructor() {
    this.deferredPrompt = null;
  }

  async install() {
    if (this.deferredPrompt) {
      try {
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        return { success: outcome === "accepted", outcome };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
    return { success: false, error: "No installation prompt available" };
  }

  canInstall() {
    return !!this.deferredPrompt;
  }
}

// Register the custom element
customElements.define("pwa-prompt", PWAPrompt);

// Export for module usage
export { InstallationManager, PlatformDetector, PWAPrompt };
export default PWAPrompt;
