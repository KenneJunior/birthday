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

  // birthday-app.js - Professional Birthday Page JavaScript
// Features: Image loading, confetti, share functionality, animations

'use strict';

/**
 * CONFETTI SYSTEM - Canvas-based particle effects
 * @class ConfettiSystem
 */
class ConfettiSystem {
    constructor(container) {
        this.container = container;
        this.canvas = null;
        this.ctx = null;
        this.particles = [];
        this.particleCount = 0;
        this.animationId = null;
        this.colors = ['#8E2DE2', '#4A00E0', '#FF6B6B', '#FECA57', '#1DD1A1'];
        this.isActive = false;

        this.init();
    }

    /**
     * Initialize the confetti system
     */
    init() {
        try {
            this.createCanvas();
            this.setupResizeListener();
            this.animate = this.animate.bind(this);
            this.isActive = true;
            
            // Set up event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Failed to initialize confetti system:', error);
        }
    }

    /**
     * Create and configure canvas element
     */
    createCanvas() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        if (!this.ctx) {
            throw new Error('Canvas context not supported');
        }

        this.setupCanvas();
        
        if (!this.canvas.parentNode) {
            this.container.appendChild(this.canvas);
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
            position: 'absolute',
            top: '0',
            left: '0',
            pointerEvents: 'none',
            zIndex: '10'
        });
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Image container click
        const imageContainer = document.querySelector('.image-container');
        if (imageContainer) {
            imageContainer.addEventListener('click', () => {
                window.location.href = 'fhavur';
            });
        }

        // Name highlight click
        const nameHighlight = document.querySelector('.name-highlight');
        if (nameHighlight) {
            nameHighlight.addEventListener('click', () => {
                window.location.href = 'fhavur';
            });
        }
    }

    /**
     * Trigger confetti explosion
     * @param {number} count - Number of particles
     */
    triggerConfetti(count = 50) {
        if (!this.isActive) return;

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
                shape: Math.random() > 0.5 ? 'circle' : 'rect',
                opacity: 1,
                gravity: 0.1
            });
        }

        this.particleCount += count;

        if (!this.animationId) {
            this.animationId = requestAnimationFrame(this.animate);
        }
    }

    /**
     * Animation loop
     */
    animate() {
        if (!this.isActive || this.particleCount === 0) {
            this.animationId = null;
            return;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];

            // Update physics
            p.y += p.speed;
            p.speed += p.gravity;
            p.angle += p.rotationSpeed;
            p.opacity -= 0.005;

            // Draw particle
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.angle);
            this.ctx.globalAlpha = Math.max(0, p.opacity);
            this.ctx.fillStyle = p.color;

            if (p.shape === 'circle') {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            }

            this.ctx.restore();

            // Remove particles that are out of view or faded out
            if (p.y > this.canvas.height || p.opacity <= 0) {
                this.particles.splice(i, 1);
                i--;
                this.particleCount--;
            }
        }

        if (this.particleCount > 0) {
            this.animationId = requestAnimationFrame(this.animate);
        } else {
            this.animationId = null;
        }
    }

    /**
     * Setup resize listener with debounce
     */
    setupResizeListener() {
        const debouncedResize = this.debounce(() => {
            this.setupCanvas();
        }, 200);

        window.addEventListener('resize', debouncedResize);
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.isActive = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        window.removeEventListener('resize', this.debounce);
        
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
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
        this.image = imageElement;
        this.placeholder = placeholderElement;
        this.isLoaded = false;
    }

    /**
     * Load image with error handling
     * @param {string} src - Image source URL
     */
    async loadImage(src) {
        if (!src) {
            this.handleImageError('No image source provided');
            return;
        }

        try {
            await this.loadImageWithTimeout(src, 10000); // 10 second timeout
        } catch (error) {
            this.handleImageError(error.message);
        }
    }

    /**
     * Load image with timeout
     */
    loadImageWithTimeout(src, timeout) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Image loading timeout'));
            }, timeout);

            const img = new Image();
            
            img.onload = () => {
                clearTimeout(timer);
                this.handleImageLoad(src);
                resolve();
            };
            
            img.onerror = () => {
                clearTimeout(timer);
                this.handleImageError('Failed to load image');
                reject(new Error('Failed to load image'));
            };
            
            img.src = src;
        });
    }

    /**
     * Handle successful image load
     */
    handleImageLoad(src) {
        this.image.src = src;
        this.image.classList.remove('d-none');
        this.animateTransition();
        this.isLoaded = true;
    }

    /**
     * Handle image loading error
     */
    handleImageError(message) {
        console.error('Error loading birthday image:', message);
        if (this.placeholder) {
            const errorText = this.placeholder.querySelector('span') || document.createElement('span');
            errorText.textContent = 'Image not available';
            if (!errorText.parentNode) {
                this.placeholder.appendChild(errorText);
            }
        }
    }

    /**
     * Animate transition from placeholder to image
     */
    animateTransition() {
        this.image.style.opacity = '0';
        this.placeholder.style.opacity = '1';

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
                this.placeholder.style.display = 'none';
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
        this.animatedElements = [];
        this.threshold = 0.1;
        this.observer = null;
        this.isInitialized = false;
    }

    /**
     * Initialize scroll animations
     */
    init() {
        if (this.isInitialized) return;

        try {
            this.cacheElements();
            this.setupObserver();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize scroll animator:', error);
        }
    }

    /**
     * Cache DOM elements for animation
     */
    cacheElements() {
        this.animatedElements = [
            ...document.querySelectorAll('[data-animate]'),
            ...document.querySelectorAll('.message-item'),
            document.querySelector('.birthday-title'),
            document.querySelector('.birthday-wishes')
        ].filter(Boolean);
    }

    /**
     * Setup Intersection Observer
     */
    setupObserver() {
        if (!('IntersectionObserver' in window)) {
            this.animateAllElements();
            return;
        }

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateElement(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }, { 
            threshold: this.threshold,
            rootMargin: '0px 0px -50px 0px'
        });

        this.animatedElements.forEach(el => this.observer.observe(el));
    }

    /**
     * Animate element when it comes into view
     */
    animateElement(element) {
        const animationClass = element.dataset.animate || 'fadeInUp';
        
        element.style.visibility = 'visible';
        element.classList.add('animate__animated', `animate__${animationClass}`);
        
        // Clean up after animation
        element.addEventListener('animationend', () => {
            element.style.visibility = '';
        }, { once: true });
    }

    /**
     * Fallback: animate all elements if IntersectionObserver is not supported
     */
    animateAllElements() {
        this.animatedElements.forEach((element, index) => {
            setTimeout(() => {
                this.animateElement(element);
            }, index * 150);
        });
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
        this.isInitialized = false;
    }
}

/**
 * SHARE MANAGER - Handles social sharing functionality
 * @class ShareManager
 */
class ShareManager {
    constructor() {
        this.buttons = [];
        this.isInitialized = false;
    }

    /**
     * Initialize share functionality
     */
    init() {
        if (this.isInitialized) return;

        try {
            this.cacheButtons();
            this.setupListeners();
            this.isInitialized = true;
        } catch (error) {
            console.error('Failed to initialize share manager:', error);
        }
    }

    /**
     * Cache share buttons
     */
    cacheButtons() {
        this.buttons = Array.from(document.querySelectorAll('.share-btn')).filter(Boolean);
    }

    /**
     * Setup event listeners
     */
    setupListeners() {
        this.buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleShare(btn);
            });
            
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.handleShare(btn);
                }
            });
        });
    }

    /**
     * Handle share action
     */
    handleShare(button) {
        this.animateButton(button);
        
        const platform = Array.from(button.classList).find(cls => 
            ['whatsapp', 'instagram', 'facebook', 'twitter', 'telegram'].includes(cls)
        );

        if (platform) {
            this.shareToPlatform(platform);
        }
    }

    /**
     * Share to specific platform
     */
    shareToPlatform(platform) {
        const pageUrl = encodeURIComponent(window.location.href);
        const shareText = encodeURIComponent("Beautiful birthday wishes! that was send to me you can also send to your loved ones using this website");

        const shareConfig = {
            whatsapp: `https://wa.me/?text=${shareText}%20${pageUrl}`,
            instagram: 'https://instagram.com/',
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`,
            twitter: `https://twitter.com/intent/tweet?text=${shareText}&url=${pageUrl}`,
            telegram: `https://t.me/share/url?url=${pageUrl}&text=${shareText}`
        };

        if (shareConfig[platform]) {
            window.open(shareConfig[platform], '_blank', 'width=600,height=400,noopener,noreferrer');
        }
    }

    /**
     * Animate button on click
     */
    animateButton(button) {
        button.style.transform = 'scale(0.9)';
        
        setTimeout(() => {
            button.style.transform = 'scale(1.1)';
            
            setTimeout(() => {
                button.style.transform = '';
            }, 150);
        }, 150);
    }

    /**
     * Cleanup resources
     */
    destroy() {
        this.buttons.forEach(btn => {
            btn.removeEventListener('click', this.handleShare);
            btn.removeEventListener('keydown', this.handleShare);
        });
        this.isInitialized = false;
    }
}

/**
 * PERFORMANCE MONITOR - Monitors and logs performance metrics
 * @class PerformanceMonitor
 */
class PerformanceMonitor {
    constructor() {
        this.metrics = {};
        this.observer = null;
    }

    /**
     * Start performance monitoring
     */
    start() {
        this.observeLongTasks();
        this.metrics.startTime = performance.now();
    }

    /**
     * Observe long tasks for performance monitoring
     */
    observeLongTasks() {
        if ('PerformanceObserver' in window) {
            this.observer = new PerformanceObserver((list) => {
                list.getEntries().forEach(entry => {
                    console.log(`Long task detected: ${entry.duration.toFixed(2)}ms`);
                });
            });
            
            try {
                this.observer.observe({ entryTypes: ['longtask'] });
            } catch (error) {
                console.warn('Long task observation not supported:', error);
            }
        }
    }

    /**
     * Stop performance monitoring
     */
    stop() {
        if (this.observer) {
            this.observer.disconnect();
        }
        
        this.metrics.totalTime = performance.now() - this.metrics.startTime;
        console.log(`Total initialization time: ${this.metrics.totalTime.toFixed(2)}ms`);
    }
}

/**
 * MAIN BIRTHDAY APP - Coordinates all components
 * @class BirthdayApp
 */
class BirthdayApp {
    constructor() {
        this.modules = {};
        this.performanceMonitor = new PerformanceMonitor();
        this.isInitialized = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        if (this.isInitialized) return;

        this.performanceMonitor.start();
        
        try {
            await this.initializeModules();
            this.setupEventListeners();
            this.startApp();
            this.isInitialized = true;
            
        } catch (error) {
            console.error('Failed to initialize BirthdayApp:', error);
            this.handleInitializationError(error);
        } finally {
            this.performanceMonitor.stop();
        }
    }

    /**
     * Initialize all modules
     */
    async initializeModules() {
        this.cacheElements();
        
        this.modules = {
            confetti: new ConfettiSystem(this.elements.card),
            imageLoader: new ImageLoader(this.elements.birthdayImage, this.elements.imagePlaceholder),
            scrollAnimator: new ScrollAnimator(),
            shareManager: new ShareManager()
        };

        // Initialize modules
        this.modules.scrollAnimator.init();
        this.modules.shareManager.init();
    }

    /**
     * Cache DOM elements
     */
    cacheElements() {
        this.elements = {
            card: document.querySelector('.birthday-card'),
            imageContainer: document.querySelector('.image-container'),
            imagePlaceholder: document.querySelector('.image-placeholder'),
            birthdayImage: document.getElementById('birthdayImage'),
            messageItems: document.querySelectorAll('.message-item')
        };
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Image container interaction
        if (this.elements.imageContainer) {
            this.elements.imageContainer.addEventListener('mouseenter', () => {
                this.modules.confetti.triggerConfetti(20);
            });

            this.elements.imageContainer.addEventListener('touchstart', () => {
                this.modules.confetti.triggerConfetti(20);
            }, { passive: true });
        }

        // Window resize with debounce
        const debouncedResize = this.debounce(() => {
            this.handleResize();
        }, 200);

        window.addEventListener('resize', debouncedResize);
    }

    /**
     * Start the application
     */
    startApp() {
        // Load image
        this.modules.imageLoader.loadImage('public/pics/tata.jpg')
            .catch(error => {
                console.warn('Image loading failed:', error);
            });

        // Initial animations
        this.animateMessagesSequentially();

        // Initial confetti burst
        setTimeout(() => {
            this.modules.confetti.triggerConfetti(30);
        }, 1000);
    }

    /**
     * Handle window resize
     */
    handleResize() {
        if (this.modules.confetti) {
            this.modules.confetti.setupCanvas();
        }
    }

    /**
     * Animate messages sequentially
     */
    animateMessagesSequentially() {
        if (!this.elements.messageItems) return;

        this.elements.messageItems.forEach((item, index) => {
            setTimeout(() => {
                item.style.opacity = '1';
                item.style.visibility = 'visible';
            }, index * 300);
        });
    }

    /**
     * Handle initialization errors
     */
    handleInitializationError(error) {
        // Show user-friendly error message
        const errorDiv = document.createElement('div');
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
        errorDiv.textContent = 'Failed to initialize page. Please refresh.';
        document.body.appendChild(errorDiv);

        // Remove error message after 5 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
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
     * Cleanup resources
     */
    destroy() {
        // Destroy all modules
        Object.values(this.modules).forEach(module => {
            if (module && typeof module.destroy === 'function') {
                module.destroy();
            }
        });

        // Remove event listeners
        window.removeEventListener('resize', this.debounce);
        
        this.isInitialized = false;
    }
}

// Global error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on a protected page
    const isProtectedPage = document.getElementById('protectedContent');
    
    if (isProtectedPage) {
        // Wait for authentication before initializing
        const initApp = async () => {
            try {
                const authResult = await window.setupAuthProtection?.();
                if (authResult?.authenticated) {
                    new BirthdayApp().init();
                }
            } catch (error) {
                console.error('Authentication failed, not initializing app:', error);
            }
        };
        
        initApp();
    } else {
        // Initialize immediately for non-protected pages
        new BirthdayApp().init();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ConfettiSystem,
        ImageLoader,
        ScrollAnimator,
        ShareManager,
        BirthdayApp,
        PerformanceMonitor
    };
}
