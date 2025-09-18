/**
 * Secure Password Manager Module
 * @module PasswordManager
 * @description Handles password form functionality with local storage persistence
 */

// Constants and configuration
const PasswordConfig = {
    STORAGE_KEY: 'securePassword',
    MIN_PASSWORD_LENGTH: 8,
    NOTIFICATION_DURATION: 5000,
    THROTTLE_DELAY: 250,
    SECURE_INPUT_TIMEOUT: 1000,
};

/**
 * PasswordManager - Main application module
 */
const PasswordManager = (() => {
    // Private state
    let state = {
        isPasswordVisible: false,
        hasExistingPassword: false,
        notificationTimeout: null,
        secureInputTimeout: null,
    };

    // DOM references
    const dom = {};

    /**
     * Initialize the application
     * @public
     */
    const init = () => {
        try {
            _cacheDomElements();
            _bindEvents();
            _checkExistingPassword();
            _setupPerformanceMonitoring();
            _log('Application initialized successfully');
        } catch (error) {
            _handleError('Initialization failed', error);
        }
    };

    /**
     * Cache DOM elements for performance
     * @private
     */
    const _cacheDomElements = () => {
        dom.loginForm = document.getElementById('loginForm');
        dom.passwordInput = document.getElementById('password');
        dom.toggleButton = document.getElementById('togglePassword');
        dom.notification = document.getElementById('notification');
        dom.notificationText = document.getElementById('notificationText');
        
        if (!dom.loginForm || !dom.passwordInput || !dom.toggleButton) {
            throw new Error('Required DOM elements not found');
        }
    };

    /**
     * Bind event listeners
     * @private
     */
    const _bindEvents = () => {
        // Form events
        dom.loginForm.addEventListener('submit', _handleFormSubmit);
        
        // Input events
        dom.passwordInput.addEventListener('input', _debounce(_validatePassword, 300));
        dom.passwordInput.addEventListener('blur', _handleInputBlur);
        dom.passwordInput.addEventListener('focus', _handleInputFocus);
        dom.passwordInput.addEventListener('keydown', _handleInputKeydown);
        
        // Toggle button events
        dom.toggleButton.addEventListener('click', _togglePasswordVisibility);
        dom.toggleButton.addEventListener('keydown', _handleToggleKeydown);
        
        // Window events
        window.addEventListener('resize', _throttle(_handleResize, PasswordConfig.THROTTLE_DELAY));
        window.addEventListener('beforeunload', _cleanup);
    };

    /**
     * Handle form submission
     * @private
     * @param {Event} e - Submit event
     */
    const _handleFormSubmit = (e) => {
        e.preventDefault();
        
        const password = dom.passwordInput.value.trim();
        const isValid = _validatePassword();
        
        if (isValid) {
            _savePassword(password);
            _showNotification('Password saved securely', 'success');
            _resetForm();
            _dispatchPasswordSavedEvent(password);
        } else {
            _showNotification(`Password must be at least ${PasswordConfig.MIN_PASSWORD_LENGTH} characters`, 'error');
            _shakeElement(dom.loginForm);
        }
    };

    /**
     * Toggle password visibility
     * @private
     */
    const _togglePasswordVisibility = () => {
        state.isPasswordVisible = !state.isPasswordVisible;
        dom.passwordInput.type = state.isPasswordVisible ? 'text' : 'password';
        
        // Update accessibility attributes
        const action = state.isPasswordVisible ? 'Hide' : 'Show';
        dom.toggleButton.setAttribute('aria-label', `${action} password`);
        dom.toggleButton.setAttribute('aria-pressed', state.isPasswordVisible);
        
        // Visual feedback
        dom.toggleButton.classList.toggle('visible', state.isPasswordVisible);
        
        // Security feature: Auto-hide password after timeout
        _schedulePasswordHide();
    };

    /**
     * Schedule automatic password hiding for security
     * @private
     */
    const _schedulePasswordHide = () => {
        if (state.secureInputTimeout) {
            clearTimeout(state.secureInputTimeout);
        }
        
        if (state.isPasswordVisible) {
            state.secureInputTimeout = setTimeout(() => {
                if (state.isPasswordVisible) {
                    _togglePasswordVisibility();
                    _showNotification('Password hidden for security', 'info');
                }
            }, PasswordConfig.SECURE_INPUT_TIMEOUT);
        }
    };

    /**
     * Validate password input
     * @private
     * @returns {boolean} Validation result
     */
    const _validatePassword = () => {
        const password = dom.passwordInput.value.trim();
        const isValid = password.length >= PasswordConfig.MIN_PASSWORD_LENGTH;
        
        // Visual feedback
        if (password.length > 0) {
            dom.passwordInput.classList.toggle('valid', isValid);
            dom.passwordInput.classList.toggle('invalid', !isValid);
        } else {
            dom.passwordInput.classList.remove('valid', 'invalid');
        }
        
        return isValid;
    };

    /**
     * Save password to local storage
     * @private
     * @param {string} password - Password to save
     */
    const _savePassword = (password) => {
        try {
            // In a real application, you would hash the password before storing
            localStorage.setItem(PasswordConfig.STORAGE_KEY, password);
            state.hasExistingPassword = true;
            _log('Password saved to local storage');
        } catch (error) {
            _handleError('Failed to save password', error);
            _showNotification('Storage error: Could not save password', 'error');
        }
    };

    /**
     * Check if password already exists
     * @private
     */
    const _checkExistingPassword = () => {
        try {
            const existingPassword = localStorage.getItem(PasswordConfig.STORAGE_KEY);
            state.hasExistingPassword = !!existingPassword;
            
            if (state.hasExistingPassword) {
                _showNotification('A password is already stored', 'info');
            }
        } catch (error) {
            _handleError('Failed to check existing password', error);
        }
    };

    /**
     * Show notification message
     * @private
     * @param {string} message - Notification text
     * @param {string} type - Notification type (success, error, info)
     */
    const _showNotification = (message, type = 'info') => {
        if (!dom.notification || !dom.notificationText) return;
        
        // Clear any existing timeout
        if (state.notificationTimeout) {
            clearTimeout(state.notificationTimeout);
        }
        
        // Set notification content
        dom.notificationText.textContent = message;
        dom.notification.className = `notification show ${type}`;
        
        // Auto-hide after duration
        state.notificationTimeout = setTimeout(() => {
            dom.notification.classList.remove('show');
        }, PasswordConfig.NOTIFICATION_DURATION);
        
        _log(`Notification shown: ${message}`);
    };

    /**
     * Reset form to initial state
     * @private
     */
    const _resetForm = () => {
        dom.loginForm.reset();
        dom.passwordInput.classList.remove('valid', 'invalid');
        
        if (state.isPasswordVisible) {
            _togglePasswordVisibility();
        }
    };

    /**
     * Shake element for error feedback
     * @private
     * @param {HTMLElement} element - Element to animate
     */
    const _shakeElement = (element) => {
        element.classList.add('shake');
        setTimeout(() => {
            element.classList.remove('shake');
        }, 500);
    };

    /**
     * Handle input blur
     * @private
     */
    const _handleInputBlur = () => {
        dom.passwordInput.classList.remove('focused');
        _validatePassword();
    };

    /**
     * Handle input focus
     * @private
     */
    const _handleInputFocus = () => {
        dom.passwordInput.classList.add('focused');
    };

    /**
     * Handle keyboard events for password input
     * @private
     * @param {KeyboardEvent} e - Key event
     */
    const _handleInputKeydown = (e) => {
        // Submit form on Ctrl+Enter
        if (e.ctrlKey && e.key === 'Enter') {
            dom.loginForm.dispatchEvent(new Event('submit'));
        }
    };

    /**
     * Handle keyboard events for toggle button
     * @private
     * @param {KeyboardEvent} e - Key event
     */
    const _handleToggleKeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            _togglePasswordVisibility();
        }
    };

    /**
     * Handle window resize
     * @private
     */
    const _handleResize = () => {
        // Add any responsive adjustments if needed
        _log(`Window resized: ${window.innerWidth}x${window.innerHeight}`);
    };

    /**
     * Cleanup resources before unload
     * @private
     */
    const _cleanup = () => {
        if (state.notificationTimeout) {
            clearTimeout(state.notificationTimeout);
        }
        
        if (state.secureInputTimeout) {
            clearTimeout(state.secureInputTimeout);
        }
        
        _log('Application cleanup completed');
    };

    /**
     * Dispatch custom event for password saved
     * @private
     * @param {string} password - The saved password
     */
    const _dispatchPasswordSavedEvent = (password) => {
        const event = new CustomEvent('passwordSaved', {
            detail: { 
                timestamp: new Date().toISOString(),
                hasPassword: true,
                passwordLength: password.length
            }
        });
        document.dispatchEvent(event);
    };

    /**
     * Setup performance monitoring
     * @private
     */
    const _setupPerformanceMonitoring = () => {
        // Monitor input performance
        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'longtask') {
                    _log(`Long task detected: ${entry.duration}ms`);
                }
            }
        });
        
        observer.observe({ entryTypes: ['longtask'] });
    };

    /**
     * Error handling utility
     * @private
     * @param {string} message - Error message
     * @param {Error} error - Error object
     */
    const _handleError = (message, error) => {
        console.error(`${message}:`, error);
        // In a real app, you might send this to an error tracking service
    };

    /**
     * Logging utility
     * @private
     * @param {string} message - Log message
     */
    const _log = (message) => {
        console.log(`[PasswordManager] ${message}`);
    };

    /**
     * Debounce function for performance
     * @private
     * @param {Function} func - Function to debounce
     * @param {number} wait - Debounce wait time
     * @returns {Function} Debounced function
     */
    const _debounce = (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    };

    /**
     * Throttle function for performance
     * @private
     * @param {Function} func - Function to throttle
     * @param {number} limit - Throttle time limit
     * @returns {Function} Throttled function
     */
    const _throttle = (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    };

    // Public API
    return {
        init,
        // For testing purposes
        _test: {
            validatePassword: _validatePassword,
            togglePasswordVisibility: _togglePasswordVisibility
        }
    };
})();

// Application initialization with error handling
document.addEventListener('DOMContentLoaded', () => {
    try {
        PasswordManager.init();
        
        // Listen for custom events
        document.addEventListener('passwordSaved', (e) => {
            console.log('Password saved event:', e.detail);
        });
    } catch (error) {
        console.error('Failed to initialize PasswordManager:', error);
        // Fallback error message
        const fallbackMessage = document.createElement('div');
        fallbackMessage.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #ef476f;
            color: white;
            padding: 1rem;
            text-align: center;
            z-index: 10000;
        `;
        fallbackMessage.textContent = 'Application failed to load. Please refresh the page.';
        document.body.appendChild(fallbackMessage);
    }
});

// Fallback for older browsers
if (typeof window.addEventListener === 'undefined') {
    window.addEventListener = function() { 
        console.warn('addEventListener not supported in this browser');
    };
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PasswordManager;
}
