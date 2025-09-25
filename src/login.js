let auth0 = null;

// Auth0 Configuration
const Auth0Config = {
    domain: "{DOMAIN}",
    client_id: "{ID}",
    cacheLocation: "localstorage",
    redirect_uri: window.location.origin
};
const fetchAuthConfig = () => fetch("../auth_config.json");

// Password Manager Configuration
const PasswordConfig = {
    STORAGE_KEY: 'Birthday',
    CORRECT_PASSWORD: 'missusfhavur',
    REDIRECT_URL: window.location.origin,
    MIN_PASSWORD_LENGTH: 8,
    NOTIFICATION_DURATION: 3000,
    THROTTLE_DELAY: 250,
    SECURE_INPUT_TIMEOUT: 1000,
    REDIRECT_DELAY: 3000,
};

/**
 * Auth0 Manager - Handles Auth0 authentication
 */
const Auth0Manager = (() => {
    let isAuthenticated = false;
    let userProfile = null;

    /**
     * Initialize Auth0 client
     */
    const init = async () => {
            const response = await fetchAuthConfig();
            const config = await response.json();
            Auth0Config.domain = config.domain;
            Auth0Config.client_id = config.clientId;

        try {
            auth0 = await createAuth0Client({
                domain: Auth0Config.domain,
                client_id: Auth0Config.client_id,
                cacheLocation: Auth0Config.cacheLocation,
                useRefreshTokens: true,
            });
            
            // Check if user is authenticated
            isAuthenticated = await auth0.isAuthenticated();
            
            if (isAuthenticated) {
                userProfile = await auth0.getUser();
                _handleAuthenticated();
            }
            
            return true;
        } catch (error) {
            console.error('Auth0 initialization failed:', error);
            return false;
        }
    };

    /**
     * Handle login with Auth0
     */
    const login = async () => {
        try {
            await auth0.loginWithRedirect({
                redirect_uri: Auth0Config.redirect_uri
            });
        } catch (error) {
            console.error('Auth0 login failed:', error);
            _showNotification('Authentication failed. Please try again.', 'error');
        }
    };

    /**
     * Handle logout
     */
    const logout = () => {
        try {
            auth0.logout({
                returnTo: Auth0Config.redirect_uri
            });
        } catch (error) {
            console.error('Auth0 logout failed:', error);
        }
    };

    /**
     * Check authentication state
     */
    const checkAuth = async () => {
        try {
            const query = window.location.search;
            if (query.includes("code=") && query.includes("state=")) {
                await auth0.handleRedirectCallback();
                window.history.replaceState({}, document.title, "/");
            }

            isAuthenticated = await auth0.isAuthenticated();
            
            if (isAuthenticated) {
                userProfile = await auth0.getUser();
                _handleAuthenticated();
            }
            
            _updateUI();
            return isAuthenticated;
        } catch (error) {
            console.error('Auth0 check failed:', error);
            return false;
        }
    };

    /**
     * Handle authenticated state
     */
    const _handleAuthenticated = () => {
        _showNotification(`Welcome back! Redirecting to ${PasswordConfig.REDIRECT_URL}...`, 'success');
        _scheduleRedirect();
    };

    /**
     * Update UI based on authentication state
     */
    const _updateUI = () => {
        const auth0Container = document.getElementById('auth0');
        const passwordContainer = document.getElementById('passwordContainer');
        const userInfo = document.getElementById('userInfo');
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (!auth0Container || !passwordContainer) return;
        
        if (isAuthenticated) {
            // User is authenticated with Auth0
            auth0Container.classList.remove('d-none');
            passwordContainer.classList.add('d-none');
            
            if (userInfo && userProfile) {
                userInfo.textContent = `Logged in as: ${userProfile.name || userProfile.email}`;
            }
            
            if (loginBtn) loginBtn.classList.add('d-none');
            if (logoutBtn) logoutBtn.classList.remove('d-none') ;
        } else {
            // User is not authenticated with Auth0, show fallback option
            auth0Container.classList.remove('d-none')  ;
            passwordContainer.classList.remove('d-none');
            
            if (loginBtn) loginBtn.classList.remove('d-none');
            if (logoutBtn) logoutBtn.classList.add('d-none');
        }
    };

    /**
     * Schedule redirect
     */
    const _scheduleRedirect = () => {
        setTimeout(() => {
            window.location.href = PasswordConfig.REDIRECT_URL;
        }, PasswordConfig.REDIRECT_DELAY);
    };

    /**
     * Show notification
     */
    const _showNotification = (message, type = 'info') => {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        
        if (!notification || !notificationText) return;
        
        notificationText.textContent = message;
        notification.className = `notification show ${type}`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, PasswordConfig.NOTIFICATION_DURATION);
    };

    // Public API
    return {
        init,
        login,
        logout,
        checkAuth,
        isAuthenticated: () => isAuthenticated,
        getUser: () => userProfile
    };
})();

/**
 * Password Manager - Handles fallback password authentication
 */
const PasswordManager = (() => {
    let state = {
        isPasswordVisible: false,
        hasExistingPassword: false,
        notificationTimeout: null,
        secureInputTimeout: null,
        redirectTimeout: null,
    };

    const dom = {};

    /**
     * Initialize the password manager
     */
    const init = () => {
        try {
            _cacheDomElements();
            _checkExistingPassword();
           
            // If password exists and Auth0 is not authenticated, redirect
            if (state.hasExistingPassword && !Auth0Manager.isAuthenticated()) {
                _showNotification('Password verified. Redirecting...', 'success');
                _scheduleRedirect();
                return;
            } 
            _bindEvents();
            _log('Password manager initialized');
        } catch (error) {
            _handleError('Password manager initialization failed', error);
        }
    };

    /**
     * Cache DOM elements
     */
    const _cacheDomElements = () => {
        
        dom.helper = document.getElementById('password-requirements');
        dom.Auth0 = document.getElementById('auth0');
        dom.loginForm = document.getElementById('loginForm');
        dom.passwordInput = document.getElementById('password');
        dom.toggleButton = document.getElementById('togglePassword');
        
        if (!dom.loginForm || !dom.passwordInput || !dom.toggleButton) {
            throw new Error('Required DOM elements not found');
        }
        dom.Auth0.classList.add('d-none');
    };

    /**
     * Bind event listeners
     */
    const _bindEvents = () => {
        dom.loginForm.addEventListener('submit', _handleFormSubmit);
        dom.passwordInput.addEventListener('input', _debounce(_validatePassword, 300));
        dom.passwordInput.addEventListener('blur', _handleInputBlur);
        dom.passwordInput.addEventListener('focus', _handleInputFocus);
        dom.toggleButton.addEventListener('click', _togglePasswordVisibility);
        dom.toggleButton.addEventListener('keydown', _handleToggleKeydown);
    };

    /**
     * Check if password exists in local storage
     */
    const _checkExistingPassword = () => {
        try {
            const storedPassword = localStorage.getItem(PasswordConfig.STORAGE_KEY);
            state.hasExistingPassword = storedPassword === PasswordConfig.CORRECT_PASSWORD;
            
            if (state.hasExistingPassword) {
                _log('Existing password found in local storage');
            }
        } catch (error) {
            _handleError('Failed to check existing password', error);
        }
    };

    /**
     * Handle form submission
     */
    const _handleFormSubmit = (e) => {
        e.preventDefault();
        
        const password = dom.passwordInput.value.trim();
        const isValid = _validatePassword();

        
        if (isValid) {
           isValid =  _verifyAndSavePassword(password);
        } else {
            _showNotification(`Password must be at least ${PasswordConfig.MIN_PASSWORD_LENGTH} characters`, 'error');
            _shakeElement(dom.loginForm);
        } 
        _validateInput(dom.passwordInput,isValid)
        
    };


    const _validateInput = (input, isValid)=> {
    if (isValid) {
        input.classList.add('valid');
        input.classList.remove('invalid');
    } else {
        input.classList.add('invalid');
        input.classList.remove('valid');
    }
}
        const _validatetext = (input, isValid)=> {
    if (isValid) {
        input.classList.add('validtext');
        input.classList.remove('invalidtext');
    } else {
        input.classList.add('invalidtext');
        input.classList.remove('validtext');
    }
}
    /**
     * Validate password
     */
    const _validatePassword = () => {
        const password = dom.passwordInput.value.trim();
        const isValid = password.length >= PasswordConfig.MIN_PASSWORD_LENGTH;
        _validatetext(dom.helper,isValid)
        return isValid;
    };


    /**
     * Verify and save password
     */
    const _verifyAndSavePassword = (password) => {
        let valid;
        if (password === PasswordConfig.CORRECT_PASSWORD) {
            _savePassword(password);
            _showNotification('Password verified successfully! Redirecting...', 'success');
            _scheduleRedirect();
            valid = true;
        } else {
            valid = false;
            _showNotification('Incorrect password. Please try again.', 'error');
            _shakeElement(dom.loginForm);
        }
        return valid;
    };

    /**
     * take is the type of notification then retturn the icon
     * @param {type} type 
     * @returns 
     */
    const _getNotificationIcon = (type) => {
    switch (type) {
        case 'info':
            return '<i class="fas fa-info-circle"></i>';
        case 'error':
            return '<i class="fas fa-times-circle"></i>';
        case 'warning':
            return '<i class="fas fa-exclamation-triangle"></i>';
        case 'success':
            return '<i class="fas fa-check-circle"></i>';
        default:
            return '<i class="fas fa-bell"></i>';
    }
}

    /**
     * Save password to local storage
     */
    const _savePassword = (password) => {
        try {
            localStorage.setItem(PasswordConfig.STORAGE_KEY, password);
            state.hasExistingPassword = true;
            _log('Password saved to local storage');
        } catch (error) {
            _handleError('Failed to save password', error);
            _showNotification('Storage error: Could not save password', 'error');
        }
    };

    /**
     * Schedule redirect
     */
    const _scheduleRedirect = () => {
        if (state.redirectTimeout) {
            clearTimeout(state.redirectTimeout);
        }
        
        state.redirectTimeout = setTimeout(() => {
            window.location.href = PasswordConfig.REDIRECT_URL;
        }, PasswordConfig.REDIRECT_DELAY);
    };

    /**
     * Toggle password visibility
     */
    const _togglePasswordVisibility = () => {
        state.isPasswordVisible = !state.isPasswordVisible;
        dom.passwordInput.type = state.isPasswordVisible ? 'text' : 'password';
        
        const action = state.isPasswordVisible ? 'Hide' : 'Show';
        dom.toggleButton.setAttribute('aria-label', `${action} password`);
        dom.toggleButton.setAttribute('aria-pressed', state.isPasswordVisible);
        dom.toggleButton.classList.toggle('visible', state.isPasswordVisible);
        
        _schedulePasswordHide();
    };

    /**
     * Schedule automatic password hiding
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
     * Show notification
     */
    const _showNotification = (message , type = 'info') => {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');
        
        if (!notification || !notificationText) return;
        
        if (state.notificationTimeout) {
            clearTimeout(state.notificationTimeout);
        }
         const icon = _getNotificationIcon(type)

        notificationText.innerHTML =  `${icon} ${message}`;
        notification.className = `notification show ${type}`;
        
        state.notificationTimeout = setTimeout(() => {
            notification.classList.remove('show');
        }, PasswordConfig.NOTIFICATION_DURATION);
    };



    /**
     * Handle input blur
     */
    const _handleInputBlur = () => {
        dom.passwordInput.classList.remove('focused');
        _validatePassword();
    };

    /**
     * Handle input focus
     */
    const _handleInputFocus = () => {
        dom.passwordInput.classList.add('focused');
    };

    /**
     * Handle toggle button keydown
     */
    const _handleToggleKeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            _togglePasswordVisibility();
        }
    };

    /**
     * Shake element for error feedback
     */
    const _shakeElement = (element) => {
        element.classList.add('shake');
        setTimeout(() => {
            element.classList.remove('shake');
        }, 500);
    };

    /**
     * Error handling
     */
    const _handleError = (message, error) => {
        console.error(`${message}:`, error);
        _showNotification('An error occurred. Please try again.', 'error');
    };

    /**
     * Logging
     */
    const _log = (message) => {
        console.log(`[PasswordManager] ${message}`);
    };

    /**
     * Debounce function
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

    // Public API
    return {
        init
    };
})();

// Main application initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize Auth0
        const auth0Initialized = await Auth0Manager.init();
        
        if (auth0Initialized) {
            await Auth0Manager.checkAuth();
        }
        
        // Initialize Password Manager (fallback)
        PasswordManager.init();
        
    } catch (error) {
        console.error('Application initialization failed:', error);
        
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
            font-family: sans-serif;
        `;
        fallbackMessage.textContent = 'Application failed to load. Please refresh the page.';
        document.body.appendChild(fallbackMessage);
    }
});

// Global functions for HTML onclick attributes
window.loginWithAuth0 = () => {
    Auth0Manager.login();
};

window.logoutWithAuth0 = () => {
    Auth0Manager.logout();
};
