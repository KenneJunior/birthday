// Password Manager Module
const PasswordManager = (() => {
    // Constants
    const STORAGE_KEY = 'userPassword';
    const MIN_PASSWORD_LENGTH = 8;
    
    // DOM Elements
    let loginForm, passwordInput, toggleButton, notification;
    
    // Initialize the module
    const init = () => {
        cacheDomElements();
        bindEvents();
        checkExistingPassword();
    };
    
    // Cache DOM elements for performance
    const cacheDomElements = () => {
        loginForm = document.getElementById('loginForm');
        passwordInput = document.getElementById('password');
        toggleButton = document.getElementById('togglePassword');
        notification = document.getElementById('notification');
    };
    
    // Bind event listeners
    const bindEvents = () => {
        if (loginForm) {
            loginForm.addEventListener('submit', handleFormSubmit);
        }
        
        if (toggleButton) {
            toggleButton.addEventListener('click', togglePasswordVisibility);
            toggleButton.addEventListener('keydown', handleToggleKeydown);
        }
        
        if (passwordInput) {
            passwordInput.addEventListener('input', validatePassword);
            passwordInput.addEventListener('blur', handleInputBlur);
            passwordInput.addEventListener('focus', handleInputFocus);
        }
        
        // Add resize listener for responsive adjustments
        window.addEventListener('resize', throttle(handleResize, 250));
    };
    
    // Handle form submission
    const handleFormSubmit = (e) => {
        e.preventDefault();
        
        const password = passwordInput.value.trim();
        const isValid = validatePassword();
        
        if (isValid) {
            savePassword(password);
            showNotification('Password saved successfully!', 'success');
            resetForm();
        } else {
            showNotification('Please enter a valid password (min 8 characters)', 'error');
            shakeElement(loginForm);
        }
    };
    
    // Toggle password visibility
    const togglePasswordVisibility = () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        
        // Update aria-label for accessibility
        const action = isPassword ? 'Hide' : 'Show';
        toggleButton.setAttribute('aria-label', `${action} password`);
        
        // Visual feedback
        toggleButton.classList.toggle('visible', isPassword);
    };
    
    // Handle keyboard events for toggle button
    const handleToggleKeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            togglePasswordVisibility();
        }
    };
    
    // Validate password
    const validatePassword = () => {
        const password = passwordInput.value.trim();
        const isValid = password.length >= MIN_PASSWORD_LENGTH;
        
        // Visual feedback
        if (password.length > 0) {
            passwordInput.classList.toggle('valid', isValid);
            passwordInput.classList.toggle('invalid', !isValid && password.length > 0);
        } else {
            passwordInput.classList.remove('valid', 'invalid');
        }
        
        return isValid;
    };
    
    // Handle input blur
    const handleInputBlur = () => {
        passwordInput.classList.remove('focused');
        validatePassword();
    };
    
    // Handle input focus
    const handleInputFocus = () => {
        passwordInput.classList.add('focused');
    };
    
    // Save password to local storage
    const savePassword = (password) => {
        try {
            localStorage.setItem(STORAGE_KEY, password);
            return true;
        } catch (error) {
            console.error('Error saving password:', error);
            showNotification('Failed to save password. Local storage may be full.', 'error');
            return false;
        }
    };
    
    // Check if password already exists
    const checkExistingPassword = () => {
        const existingPassword = localStorage.getItem(STORAGE_KEY);
        if (existingPassword) {
            showNotification('A password is already stored. Submit a new one to replace it.', 'info');
        }
    };
    
    // Show notification
    const showNotification = (message, type = 'info') => {
        if (!notification) return;
        
        const notificationText = document.getElementById('notificationText');
        if (notificationText) {
            notificationText.textContent = message;
        }
        
        notification.className = `notification show ${type}`;
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    };
    
    // Reset form
    const resetForm = () => {
        if (loginForm) {
            loginForm.reset();
            passwordInput.classList.remove('valid', 'invalid');
            passwordInput.type = 'password';
            toggleButton.classList.remove('visible');
        }
    };
    
    // Shake element for error feedback
    const shakeElement = (element) => {
        element.classList.add('shake');
        setTimeout(() => {
            element.classList.remove('shake');
        }, 500);
    };
    
    // Handle window resize
    const handleResize = () => {
        // Add any responsive JS adjustments if needed
    };
    
    // Throttle function for performance
    const throttle = (func, limit) => {
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
    
    // Public methods
    return {
        init
    };
})();

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    PasswordManager.init();
});

// Add a fallback for older browsers
if (typeof window.addEventListener === 'undefined') {
    window.addEventListener = function() { /* Fallback */ };
}
