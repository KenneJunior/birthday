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
   */
  class ConfettiSystem {
    constructor(container) {
      this.container = container;
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d');
      this.particles = [];
      this.particleCount = 0;
      this.animationId = null;
      this.colors = ['#8E2DE2', '#4A00E0', '#FF6B6B', '#FECA57', '#1DD1A1'];

      this.setupCanvas();
      this.setupResizeListener();
      this.animate = this.animate.bind(this);
      this.animate();
 document.querySelector('.name-highlight').addEventListener('click',()=>{window.location.href = 'fhavur';
      });
 document.querySelector('.image-container').addEventListener('click', ()=>{
        window.location.href = 'fhavur';
      });
    }

    setupCanvas() {
      const rect = this.container.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
      this.canvas.style.position = 'absolute';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.zIndex = '10';

      if (!this.canvas.parentNode) {
        this.container.appendChild(this.canvas);
      }
    }

    triggerConfetti(count = 50) {
      const rect = this.container.getBoundingClientRect();

      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * rect.width,
          y: -20,
          size: Math.random() * 10 + 5,
          color: this.colors[Math.floor(Math.random() * this.colors.length)],
          speed: Math.random() * 3 + 2,
          angle: Math.random() * Math.PI * 2,
          rotation: Math.random() * 0.2 - 0.1,
          rotationSpeed: Math.random() * 0.01 - 0.005,
          shape: Math.random() > 0.5 ? 'circle' : 'rect'
        });
      }

      this.particleCount += count;

      if (!this.animationId) {
        this.animate();
      }
    }

    animate() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];

        p.y += p.speed;
        p.angle += p.rotationSpeed;

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.angle);
        this.ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          this.ctx.beginPath();
          this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          this.ctx.fill();
        } else {
          this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }

        this.ctx.restore();

        if (p.y > this.canvas.height) {
          this.particles.splice(i, 1);
          i--;
          this.particleCount--;
        }
      }

      if (this.particleCount > 0) {
        this.animationId = requestAnimationFrame(this.animate.bind(this));
      } else {
        this.animationId = null;
      }
    }

    setupResizeListener() {
      const debouncedResize = this.debounce(() => {
        this.setupCanvas();
      }, 200);

      window.addEventListener('resize', debouncedResize);
    }

    debounce(func, wait) {
      let timeout;
      return function() {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          func.apply(context, args);
        }, wait);
      };
    }
  }

  /**
   * IMAGE LOADER - Handles image loading with transitions
   */
  class ImageLoader {
    constructor(imageElement, placeholderElement) {
      this.image = imageElement;
      this.placeholder = placeholderElement;
    }

    loadImage(src) {
      if (!src) {
        console.warn('No image source provided');
        return;
      }

      const img = new Image();
      img.onload = () => this.handleImageLoad(src);
      img.onerror = () => this.handleImageError();
      img.src = src;
    }

    handleImageLoad(src) {
      this.image.src = src;
      this.image.classList.remove('d-none');
      this.animateTransition();
    }

    handleImageError() {
      console.error('Error loading birthday image');
      this.placeholder.querySelector('span').textContent = 'Image not available';
    }

    animateTransition() {
      this.image.style.opacity = '0';
      this.placeholder.style.opacity = '1';

      let lastFrameTime = performance.now();
      const fadeDuration = 500; // milliseconds

      const animateFrame = (currentTime) => {
        const elapsed = currentTime - lastFrameTime;
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
   */
  class ScrollAnimator {
    constructor() {
      this.animatedElements = [];
      this.threshold = 0.1;
      this.observer = null;
    }

    init() {
      this.cacheElements();
      this.setupObserver();
    }

    cacheElements() {
      this.animatedElements = [
        ...document.querySelectorAll('[data-animate]'),
        ...document.querySelectorAll('.message-item'),
        document.querySelector('.birthday-title'),
        document.querySelector('.birthday-wishes')
      ];
    }

    setupObserver() {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.animateElement(entry.target);
            this.observer.unobserve(entry.target);
          }
        });
      }, { threshold: this.threshold });

      this.animatedElements.forEach(el => this.observer.observe(el));
    }

    animateElement(element) {
      if (element.classList.contains('birthday-title')) {
        element.classList.add('animate__animated', 'animate__fadeInDown');
      }
      else if (element.classList.contains('birthday-wishes')) {
        element.classList.add('animate__animated', 'animate__pulse');
      }
      else if (element.dataset.animate) {
        element.classList.add('animate__animated', `animate__${element.dataset.animate}`);
      }
      else {
        element.classList.add('animate__animated', 'animate__fadeInLeft');
      }
    }
  }

  /**
   * SHARE MANAGER - Handles social sharing functionality
   */
  class ShareManager {
    constructor() {
      this.buttons = document.querySelectorAll('.share-btn');
      this.setupListeners();
    }

    setupListeners() {
      this.buttons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.handleShare(btn);
        });
      });
    }

    handleShare(button) {
      const platform = button.classList[1];
      this.animateButton(button);

      const pageUrl = encodeURIComponent(window.location.href);
      const shareText = encodeURIComponent("Beautiful birthday wishes!");

      const shareConfig = {
        whatsapp: `https://wa.me/?text=${shareText}%20${pageUrl}`,
        instagram: 'https://instagram.com/',
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`,
        twitter: `https://twitter.com/intent/tweet?text=${shareText}&url=${pageUrl}`,
        telegram: `https://t.me/share/url?url=${pageUrl}&text=${shareText}`
      };

      if (shareConfig[platform]) {
        window.open(shareConfig[platform], '_blank', 'width=600,height=400');
      }
    }

    animateButton(button) {
      button.style.transform = 'scale(0.9)';
      setTimeout(() => {
        button.style.transform = 'scale(1.1)';
        setTimeout(() => {
          button.style.transform = '';
        }, 200);
      }, 200);
    }
  }

  /**
   * MAIN BIRTHDAY APP - Coordinates all components
   */
  class BirthdayApp {
    constructor() {
      this.init();
    }

    init() {
      this.cacheElements();
      this.initModules();
      this.setupEventListeners();
      this.startApp();
    }

    cacheElements() {
      this.elements = {
        card: document.querySelector('.birthday-card'),
        imageContainer: document.querySelector('.image-container'),
        imagePlaceholder: document.querySelector('.image-placeholder'),
        birthdayImage: document.getElementById('birthdayImage'),
        messageItems: document.querySelectorAll('.message-item')
      };
    }

    initModules() {
      this.confetti = new ConfettiSystem(this.elements.card);
      this.imageLoader = new ImageLoader(this.elements.birthdayImage, this.elements.imagePlaceholder);
      this.scrollAnimator = new ScrollAnimator();
      this.shareManager = new ShareManager();
    }

    setupEventListeners() {
      this.elements.imageContainer.addEventListener('mouseenter', () => {
        this.confetti.triggerConfetti(20);
      });

      window.addEventListener('resize', this.debounce(() => {
        this.confetti.setupCanvas();
      }, 200));
    }

    startApp() {
      // Load your image here - replace with actual path
      this.imageLoader.loadImage('public/profile_pic.jpg');

      // Initial animations
      this.scrollAnimator.init();
      this.animateMessagesSequentially();

      // Initial confetti burst
      setTimeout(() => this.confetti.triggerConfetti(30), 1000);
    }

    animateMessagesSequentially() {
      this.elements.messageItems.forEach((item, index) => {
        setTimeout(() => {
          item.style.opacity = '1';
        }, index * 300);
      });
    }

    debounce(func, wait) {
      let timeout;
      return function() {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          func.apply(context, args);
        }, wait);
      };
    }
  }

  // Initialize the application when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    new BirthdayApp();
  });
