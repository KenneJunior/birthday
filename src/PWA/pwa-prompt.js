// Utility: Fetch manifest and get app name
import { getAppName } from "../js/utility/utils";
import { Notification } from "../js/notification";
// PWA Prompt Manager - Advanced Implementation
class PWAPrompt extends  HTMLElement {
  static get observedAttributes() {
    return ['hidden', 'platform'];
  }

  constructor() {
  super();
    // Configuration
    this.config = {
      dismissDuration: 7 * 24 * 60 * 60 * 1000, // 7 days
      remindDuration: 24 * 60 * 60 * 1000, // 1 day
      showDelay: 3000,
      minSessionTime: 10000, // 10 seconds
      maxDisplayCount: 5
    };

    // State
    this.state = {
      deferredPrompt: null,
      platform: null,
      isStandalone: false,
      sessionStart: Date.now(),
      displayCount: 0
    };

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
 * tags each pair for a platform (e.i andriod, ios and default)
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

  detectPlatform() {
    const ua = navigator.userAgent;
    
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
      this.state.platform = 'ios';
    } else if (/Android/.test(ua)) {
      this.state.platform = 'android';
    } else if (/Windows/.test(ua)) {
      this.state.platform = 'windows';
    } else {
      this.state.platform = 'other';
    }

    this.setAttribute('platform', this.state.platform);
    this.log('Detected platform:', this.state.platform);
  }

  detectStandalone() {
    this.state.isStandalone = (
      window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches
    );
  }

  shouldInitialize() {
    // Don't initialize if already installed
    if (this.state.isStandalone) {
      this.log('App is already installed');
      this.Notification.setNotificationType().toggleViewDetails(false).showNotification('info',{
      title:'Welcome Again',
      message:`
      <p style="line-height:1.6;"> You have already installed this app on your device.😅😅<br>
      Hope you are enjoying the experience!.one fun fact about installing<br>
      this app is that it can work offline 😎 and provide a more app-like experience 🤗<br>
      <p>
      <p style="margin-top: 10px; font-style: italic;">Enjoy exploring this page 🥰💕💘!</p>
      `,
      icon:'fa-solid fa-thumbs-up',
      useHTML:true,
      autoCloseTime:10000
      })
      return false;
    }

    // Check if platform is supported
    if (!this.isPlatformSupported()) {
      this.log(`Platform ${this.state.platform} not supported for PWA installation`);
      return false;
    }

    // Check dismissal state
    const dismissal = this.getDismissalState();
    if (dismissal && this.isDismissalValid(dismissal)) {
      this.log('Prompt recently dismissed');
      return false;
    }

    // Check display count
    if (this.hasExceededDisplayCount()) {
      this.log('Maximum display count reached');
      return false;
    }

    return true;
  }

  async injectPlatformContent() {
            const platform = this.state.platform;
            const content = this.querySelector('#pwa-prompt-content');
            const actions = this.querySelector('#pwa-prompt-actions');
            if (content && actions) {
                console.log('Injecting templates for platform:', platform);
                content.innerHTML = '';
                actions.innerHTML = '';
                const templateConfig = this.getTemplateConfig(platform);
                const contentTemplate = document.getElementById(templateConfig.content);
                const appName = await getAppName();
                if (contentTemplate) {
                    const contentClone = contentTemplate.content.cloneNode(true);
                    const appNameElements = contentClone.querySelectorAll('.pwa-prompt__app-name');
                    appNameElements.forEach( element => {
                        element.textContent = appName
                    });
                    content.appendChild(contentClone);
                } else {
                    console.error('Content template not found:', templateConfig.content);
                }
                const actionsTemplate = document.getElementById(templateConfig.actions);
                if (actionsTemplate) {
                    const actionsClone = actionsTemplate.content.cloneNode(true);
                    actions.appendChild(actionsClone);
                } else {
                    console.error('Actions template not found:', templateConfig.actions);
                }
            } else {
                console.error('Content or actions containers not found');
            }
  }

  getTemplateConfig(platform) {
    switch (platform) {
      case 'windows':
      case 'android':
        return {
          content: 'pwa-prompt-android-template',
          actions: 'pwa-prompt-android-actions'
        };
      case 'ios':
        return {
          content: 'pwa-prompt-ios-template',
          actions: 'pwa-prompt-ios-actions'
        };
      default:
        return {
          content: 'pwa-prompt-default-template',
          actions: 'pwa-prompt-default-actions'
        };
    }
  }
        
  isPlatformSupported() {
    return ['ios', 'android', 'windows'].includes(this.state.platform);
  }

  isDismissalValid(dismissal) {
    const timeSinceDismiss = Date.now() - dismissal.timestamp;
    return timeSinceDismiss < dismissal.duration;
  }

  hasExceededDisplayCount() {
    const displayHistory = this.getDisplayHistory();
    return displayHistory.count >= this.config.maxDisplayCount;
  }

  async setupEventListeners() {
    // PWA installation events
    window.addEventListener('beforeinstallprompt', this.handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', this.handleAppInstalled);

    // Component events
    this.addEventListener('click', this.handleBackdropClick);
    this.addEventListener('keydown', this.handleKeydown);
    
    // Action buttons
    this.delegate('[data-action]', 'click', this.handleActionClick);
    this.delegate('[data-dismiss]', 'click', () => this.hide());

    //query the data-action install button
    const installBtn = document.querySelector('[data-action="install"]');
    installBtn?.addEventListener('click',this.triggerInstallation.bind(this));

    // Visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }

  delegate(selector, event, handler) {
    this.addEventListener(event, (e) => {
      if (e.target.matches(selector) || e.target.closest(selector) || !e.target.dataset.action === 'install') {
        handler(e);
      }
    });
    
  }

  handleBeforeInstallPrompt(event) {
    event.preventDefault();
    this.state.deferredPrompt = event;
    
    // For Android, we can trigger the prompt immediately or wait for user engagement
    this.log('BeforeInstallPrompt event captured');
    
    // Show prompt for Android after short delay
    if (this.state.platform === 'android'||'windows') {
      this.scheduleDisplay();
    }
  }

  handleAppInstalled() {
    this.log('App installed successfully');
    this.setAttribute('installed', 'true');
    this.hide('installed');
    
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
    if (event.target.hasAttribute('data-dismiss')) {
      this.hide('backdrop');
    }
  }

  handleActionClick(event) {
    const action = event.target.dataset.action;
    
    switch (action) {
      case 'install':
        break;
      case 'understand':
        this.hide('understand');
        break;
      case 'remind-later':
        this.hide('remind-later');
        break;
      default:
        this.hide(action);
    }
  }

  handleKeydown(event) {
    if (event.key === 'Escape') {
      this.hide('escape');
    } else if (event.key === 'Tab') {
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
      if (interactionCount >= 2 && this.state.platform === 'ios') {
        this.scheduleDisplay();
        document.removeEventListener('click', engagementHandler);
      }
    };

    document.addEventListener('click', engagementHandler);
    
    // Fallback: show after session time
    setTimeout(() => {
      if (interactionCount === 0) {
        this.scheduleDisplay();
      }
    }, this.config.minSessionTime);
  }

  scheduleDisplay() {
    // Use requestIdleCallback for better performance
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        setTimeout(() => this.show(), this.config.showDelay);
      });
    } else {
      setTimeout(() => this.show(), this.config.showDelay);
    }
  }

  async show() {
    if (this.hasAttribute('hidden')) {
      this.updateDisplayHistory();
      
      this.removeAttribute('hidden');
      this.setAttribute('aria-hidden', 'false');
      
      // Trap focus
      this.previouslyFocused = document.activeElement;
      await this.animateIn();
      this.getFocusableElements()[0]?.focus();
      
      // Prevent body scroll
      this.disableBodyScroll();
      
      this.dispatchEvent(new CustomEvent('pwa-prompt:show', { 
        bubbles: true,
        detail: { platform: this.state.platform }
      }));
      
      this.log('Prompt shown');
    }
  }

  async hide(reason = 'unknown') {
    if (!this.hasAttribute('hidden')) {
      this.setAttribute('aria-hidden', 'true');
      this.classList.add('pwa-prompt--exiting');
      
      await this.animateOut();
      
      this.setAttribute('hidden', '');
      this.classList.remove('pwa-prompt--exiting');
      
      // Restore body scroll and focus
      this.enableBodyScroll();
      this.previouslyFocused?.focus();
      
      this.handleDismissal(reason);
      
      this.dispatchEvent(new CustomEvent('pwa-prompt:hide', { 
        bubbles: true,
        detail: { reason, platform: this.state.platform }
      }));
      
      this.log(`Prompt hidden: ${reason}`);
    }
  }

  async triggerInstallation() {
    if (this.state.deferredPrompt) {
      try {
        this.state.deferredPrompt.prompt();
        
        const { outcome } = await this.state.deferredPrompt.userChoice;
        
        this.dispatchEvent(new CustomEvent('pwa-prompt:install-result', { 
          bubbles: true,
          detail: { outcome }
        }));
        
        this.log(`Installation: ${outcome}`);
        
        if (outcome === 'accepted') {
          this.hide('accepted');
          this.Notification.setNotificationType().toggleViewDetails(false).showNotification('success',{
          title:'Installation Successful',
          message:`
          <p style="line-height:1.6;"> Thank you for installing this app!😅😅<br>
          Hope you are enjoying the experience!.one fun fact about installing<br>
          this app is that it can work offline 😎 and provide a more app-like experience 🤗<br>
          `,
          icon:'fa-solid fa-thumbs-up',
          useHTML:true,
          autoCloseTime:10000
          });
        } else {
          this.hide('dismissed');
          this.Notification.setNotificationType().toggleViewDetails(false).showNotification('info',{
          title:'Installation Dismissed',
          message:`App installation was dismissed. You can install it later from your browser menu.`,
          icon:'fa-solid fa-thumbs-down',
          autoCloseTime:10000
          }) 
        }
        
      } catch (error) {
        this.log('Installation failed:', error);
        this.hide('error');
      }
    } else {
      // For iOS, we can't programmatically trigger installation
      this.hide('understand');
    }
  }

  animateIn() {
    return new Promise(resolve => {
      // CSS animations handle the entrance
      setTimeout(resolve, 50);
    });
  }

  animateOut() {
    return new Promise(resolve => {
      const duration = getComputedStyle(this).animationDuration;
      const timeout = parseFloat(duration) * 1000 || 300;
      setTimeout(resolve, timeout);
    });
  }

  disableBodyScroll() {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }

  enableBodyScroll() {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
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
      case 'understand':
      case 'accepted':
      case 'installed':
      case 'backdrop':
      case 'escape':
        duration = this.config.dismissDuration;
        break;
      case 'remind-later':
        duration = this.config.remindDuration;
        break;
      default:
        duration = this.config.remindDuration;
    }

    this.setDismissalState(duration);
  }

  getDismissalState() {
    try {
      return JSON.parse(localStorage.getItem('pwa-prompt-dismissal'));
    } catch {
      return null;
    }
  }

  setDismissalState(duration) {
    const state = {
      timestamp: Date.now(),
      duration: duration,
      platform: this.state.platform
    };
    
    try {
      localStorage.setItem('pwa-prompt-dismissal', JSON.stringify(state));
    } catch (error) {
      this.log('Failed to save dismissal state:', error);
    }
  }

  getDisplayHistory() {
    try {
      return JSON.parse(localStorage.getItem('pwa-prompt-display-history')) || { count: 0, dates: [] };
    } catch {
      return { count: 0, dates: [] };
    }
  }

  updateDisplayHistory() {
    const history = this.getDisplayHistory();
    const now = Date.now();
    
    // Clean old entries (older than 30 days)
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    history.dates = history.dates.filter(date => date > thirtyDaysAgo);
    
    // Add current display
    history.dates.push(now);
    history.count = history.dates.length;
    
    try {
      localStorage.setItem('pwa-prompt-display-history', JSON.stringify(history));
    } catch (error) {
      this.log('Failed to update display history:', error);
    }
  }

  getFocusableElements() {
    return Array.from(this.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(el => {
      return !el.hasAttribute('disabled') && 
             el.offsetParent !== null &&
             el.getAttribute('aria-hidden') !== 'true';
    });
  }

  log(...args) {
    if (window.location.hostname === 'localhost') {
      console.log('[PWA Prompt]', ...args);
    }
  }

  cleanup() {
    window.removeEventListener('beforeinstallprompt', this.handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', this.handleAppInstalled);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    
    this.enableBodyScroll();
  }

  // Public API
  static show() {
    const prompt = document.querySelector('pwa-prompt');
    prompt?.show();
  }

  static hide() {
    const prompt = document.querySelector('pwa-prompt');
    prompt?.hide('programmatic');
  }

  static getInstance() {
    return document.querySelector('pwa-prompt');
  }

  // Lifecycle
  disconnectedCallback() {
    this.cleanup();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'hidden' && newValue === 'true') {
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
      isMac: /Macintosh/.test(ua),
      isMobile: /Mobi/.test(ua),
      isStandalone: window.navigator.standalone === true || 
                   window.matchMedia('(display-mode: standalone)').matches
    };

    platform.type = platform.isIOS ? 'ios' : 
                   platform.isAndroid ? 'android' : 
                   platform.isWindows ? 'windows' : 
                   platform.isMac ? 'mac' : 'other';

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
        return { success: outcome === 'accepted', outcome };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
    return { success: false, error: 'No installation prompt available' };
  }

  canInstall() {
    return !!this.deferredPrompt;
  }
}

// Register the custom element
customElements.define('pwa-prompt', PWAPrompt);

// Export for module usage
export { PWAPrompt, PlatformDetector, InstallationManager };
export default PWAPrompt;