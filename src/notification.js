export class Notification {
    constructor() {
        this.element = {
            notification: document.getElementById('notification'),
            progress: document.getElementById('progress'),
            showBtn: document.querySelector('#celebrateBtn'),
            closeBtn: document.getElementById('closeNotification'),
            messageElement: document.getElementById('notification-message'),
            titleElement: document.getElementById('notification-title'),
            dismiss: document.getElementById('dismiss'),
            viewDetails: document.getElementById('view-details'),
        };

        // Check if essential elements exist
        if (!this.element.notification || !this.element.showBtn) {
            console.error('Essential notification elements not found');
            return;
        }

        this.state = {
            currentType: 'custom',
            autoCloseTime: 20000,
            progressInterval: null,
            autoCloseTimer: null
        };
    }

    initialize() {
        this.setupEventListeners();
        this.setNotificationType('custom');
    }

    showNotification(type = null) {
        if (type) {
            this.setNotificationType(type);
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
        }, this.state.autoCloseTime);
    }

    hideNotification() {
        this.element.notification.classList.remove('visible');
        this.clearTimers();
    }

    animateProgressBar() {
        let width = 100;
        const intervalDuration = 50;
        const decrement = (intervalDuration / this.state.autoCloseTime) * 100;

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

    setNotificationType(type) {
        this.element.notification.className = 'pop-notification';
        this.element.notification.classList.add(type);
        const iconElement = this.element.notification.querySelector('.notification-icon i');
        this.state.currentType = type;

        // Clear icon classes if icon element exists
        if (iconElement) {
            iconElement.className = '';
        }

        // Set message and title based on type
        switch(type) {
            case 'success':
                this.element.titleElement.textContent = 'Success';
                this.element.messageElement.textContent = 'Your action was completed successfully. Everything is working as expected.';
                if (iconElement) iconElement.classList.add('fas', 'fa-check-circle');
                break;
            case 'warning':
                this.element.titleElement.textContent = 'Warning';
                this.element.messageElement.textContent = 'Please check your input and try again. This operation might cause unexpected results.';
                if (iconElement) iconElement.classList.add('fas', 'fa-exclamation-triangle');
                break;
            case 'error':
                this.element.titleElement.textContent = 'Error';
                this.element.messageElement.textContent = 'Something went wrong with your request. Please try again later or contact support.';
                if (iconElement) iconElement.classList.add('fas', 'fa-times-circle');
                break;
            case 'info':
                this.element.titleElement.textContent = 'Information';
                this.element.messageElement.textContent = 'Here is some important information you should know about. This might help you with your tasks.';
                if (iconElement) iconElement.classList.add('fas', 'fa-info-circle');
                break;
            case 'custom':
                this.element.titleElement.textContent = 'Hey There 👋';
                this.element.messageElement.textContent = `Hey Fhavur! 🎉 
                I hope you're loving this little birthday site I crafted just for you—it's a temporary treat! 😊
                Click the picture below to explore more, and trust me, it’s even better on a laptop or bigger screen for the full experience.
                Oh, and don’t miss the "More Details" button there’s a special something from me to you. Hope i don't get turn down! 🙇‍♂️✨`;
                break;
        }
    }

    setupEventListeners() {
        // Use arrow functions to maintain proper 'this' context
        this.element.showBtn.addEventListener('click', () => this.showNotification());
        this.element.closeBtn.addEventListener('click', () => this.hideNotification());
        this.element.dismiss.addEventListener('click', () => this.hideNotification());
        this.element.viewDetails.addEventListener('click', () => {
            window.location.href = '/fhavur/confession.html'
        })

        document.addEventListener('click', (event) => {
            if (this.element.notification.classList.contains('visible') &&
                !this.element.notification.contains(event.target) &&
                event.target !== this.element.showBtn) {
                this.hideNotification();
            }
        });
    }
}