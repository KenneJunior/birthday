export class Notification {
    constructor(options = {}) {
        // Default configuration
        const defaultConfig = {
            elementIds: {
                notification: 'notification',
                progress: 'progress',
                showBtn: 'celebrateBtn',
                closeBtn: 'closeNotification',
                messageElement: 'notification-message',
                titleElement: 'notification-title',
                dismiss: 'dismiss',
                viewDetails: 'view-details'
            },
            autoCloseTime: 20000,
            types: {
                success: {
                    title: 'Success',
                    message: 'Your action was completed successfully.',
                    icon: 'fas fa-check-circle',
                    useHTML: false
                },
                warning: {
                    title: 'Warning',
                    message: 'Please check your input and try again.',
                    icon: 'fas fa-exclamation-triangle',
                    useHTML: false
                },
                error: {
                    title: 'Error',
                    message: 'Something went wrong with your request.',
                    icon: 'fas fa-times-circle',
                    useHTML: false
                },
                info: {
                    title: 'Information',
                    message: 'Here is some important information.',
                    icon: 'fas fa-info-circle',
                    useHTML: false
                },
                custom: {
                    title: 'Hey There 👋',
                    message: `Hey Fhavur! 🎉<br><br>
                    I hope you're loving this little birthday site I crafted just for you—it's a temporary treat! 😊<br><br>
                    Click the picture below to explore more, and trust me, it’s even better on a laptop or bigger screen for the full experience.<br><br>
                    Oh, and don’t miss the "More Details" button there’s a special something from me to you.🙇‍♂️✨`,
                    icon: '',
                    useHTML: true
                }
            },
            onShow: null,
            onHide: null,
            onViewDetails: () => window.location.href = 'confession.html',
            viewMore:  true
        };

        // Merge provided options with defaults
        this.config = { ...defaultConfig, ...options };

        // Initialize elements
        this.element = {};
        for (const [key, id] of Object.entries(this.config.elementIds)) {
            this.element[key] = typeof id === 'string' ? document.getElementById(id) : id;

            // Handle showBtn which might be a querySelector result
            if (key === 'showBtn' && !this.element[key] && typeof this.config.elementIds.showBtn === 'string') {
                this.element[key] = document.querySelector(this.config.elementIds.showBtn);
            }
        }

        // Check if essential elements exist
        if (!this.element.notification || !this.element.showBtn) {
            console.error('Essential notification elements not found');
            return;
        }

        this.state = {
            currentType: 'custom',
            progressInterval: null,
            autoCloseTimer: null
        };
    }

    initialize() {
        this.setupEventListeners();
        this.setNotificationType('custom');
        return this; // Allow method chaining
    }

    showNotification(type = null, customData = {}) {
        if (type) {
            this.setNotificationType(type, customData);
        }

        // Clear any existing timers
        this.clearTimers();

        // Reset animation
        this.element.notification.classList.remove('visible');

        // Trigger reflow to restart animation
        void this.element.notification.offsetWidth;

        // Show notification
        this.element.notification.classList.add('visible');

        // Start progress bar animation
        this.animateProgressBar();

        // Set auto close timer
        this.state.autoCloseTimer = setTimeout(() => {
            this.hideNotification();
        }, this.config.autoCloseTime);

        // Call onShow callback if provided
        if (typeof this.config.onShow === 'function') {
            this.config.onShow(this.state.currentType);
        }

        return this;
    }

    hideNotification() {
        this.element.notification.classList.remove('visible');
        this.clearTimers();

        // Call onHide callback if provided
        if (typeof this.config.onHide === 'function') {
            this.config.onHide(this.state.currentType);
        }

        return this;
    }

    animateProgressBar() {
        let width = 100;
        const intervalDuration = 50;
        const decrement = (intervalDuration / this.config.autoCloseTime) * 100;

        this.state.progressInterval = setInterval(() => {
            if (width <= 0) {
                clearInterval(this.state.progressInterval);
            } else {
                width -= decrement;
                if (this.element.progress) {
                    this.element.progress.style.transform = `scaleX(${width / 100})`;
                }
            }
        }, intervalDuration);
    }

    clearTimers() {
        if (this.state.progressInterval) clearInterval(this.state.progressInterval);
        if (this.state.autoCloseTimer) clearTimeout(this.state.autoCloseTimer);
        this.state.progressInterval = null;
        this.state.autoCloseTimer = null;
    }

    setNotificationType(type, customData = {}) {
        // Clear existing classes (keep base class)
        this.element.notification.className = 'pop-notification';

        // Add type class
        this.element.notification.classList.add(type);

        // Update current type
        this.state.currentType = type;

        // Get type configuration (merge with custom data if provided)
        const typeConfig = {
            ...(this.config.types[type] || this.config.types.custom),
            ...customData
        };

        // Set title and message
        // Set title
        if (this.element.titleElement) {
            this.element.titleElement.textContent = typeConfig.title || '';
        }

        // Set message - use HTML if specified, otherwise use text
        if (this.element.messageElement) {
            if (typeConfig.useHTML) {
                this.element.messageElement.innerHTML = typeConfig.message || '';
            } else {
                this.element.messageElement.textContent = typeConfig.message || '';
            }
        }

        // Set icon if element exists
        const iconElement = this.element.notification.querySelector('.notification-icon i');
        if (iconElement && typeConfig.icon) {
            iconElement.className = typeConfig.icon;
        }

        return this;
    }

    toggleViewDetails(viewmore = true) {
        this.config.viewMore = viewmore;
        if (this.element.viewDetails) {
            if (this.config.viewMore) {
                this.element.viewDetails.style.display = 'inline-block';
            } else {
                this.element.viewDetails.style.display = 'none';
            }
        }
        return this;
}

    setupEventListeners() {
        // Show button
        if (this.element.showBtn) {
            this.element.showBtn.addEventListener('click', () => this.showNotification());
        }

        // Close button
        if (this.element.closeBtn) {
            this.element.closeBtn.addEventListener('click', () => this.hideNotification());
        }

        // Dismiss button
        if (this.element.dismiss) {
            this.element.dismiss.addEventListener('click', () => this.hideNotification());
        }

        // View details button
        if (this.element.viewDetails && this.config.viewMore) {
            this.element.viewDetails.addEventListener('click', () => {
                if (typeof this.config.onViewDetails === 'function') {
                    this.config.onViewDetails();
                }
            });
        }

        // Close when clicking outside
        document.addEventListener('click', (event) => {
            if (this.element.notification.classList.contains('visible') &&
                !this.element.notification.contains(event.target) &&
                event.target !== this.element.showBtn) {
                this.hideNotification();
            }
        });
        return this;
    }

    // Method to update configuration
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        return this;
    }

    // Method to add a new notification type
    addType(name, config) {
        this.config.types[name] = config;
        return this;
    }

    // Method to remove a notification type
    removeType(name) {
        if (this.config.types[name]) {
            delete this.config.types[name];
        }
        return this;
    }
}
