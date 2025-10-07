/**
 * Auth0 and Password Authentication System
 *
 * This script handles user authentication using Auth0 as the primary method,
 * with a fallback password-based system for local verification.
 *
 * Features:
 * - Auth0 integration for secure authentication
 * - Fallback password manager with local storage persistence
 * - UI updates based on authentication state
 * - Notifications and animations for user feedback
 * - Secure password handling with auto-hide
 * - Error handling and logging
 *
 * Dependencies: Auth0 SDK
 */
let auth0 = null;

// Auth0 Configuration
const Auth0Config = {
    domain: "{DOMAIN}",
    client_id: "{ID}",
    cacheLocation: "{CACHE}",
    redirect_uri: window.location.origin
};

// Password Manager Configuration
const PasswordConfig = {
    STORAGE_KEY: '{KEY}',
    CORRECT_PASSWORD: '{PASSWORD}',
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
   * Fetches Auth0 configuration from server
   * @returns {Promise<Object>} Configuration object
   */
    const _fetchAuthConfig = async () => {
        const response = await fetch('/public/auth_config.json');
        if (!response.ok) {
            throw new Error(`Failed to fetch auth config: ${response.status}`);
        }
        return response.json();
    };

    /**
     * Initialize Auth0 client
     * @returns {Promise<boolean>} Initialization success
     */
    const init = async () => {
        try {
            const config = await _fetchAuthConfig();
            Auth0Config.domain = config.Auth.domain;
            Auth0Config.client_id = config.Auth.clientId;
            Auth0Config.cacheLocation = config.Auth.cacheLocation;
            
            PasswordConfig.STORAGE_KEY = config.PasswordManager.STORAGE_KEY;
            const savedLocation = getSavedLocation();
            PasswordConfig.REDIRECT_URL = (savedLocation && savedLocation.startsWith(window.location.origin))
                ? savedLocation
                : window.location.origin;

   
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
            await PasswordManager.showNotification('Failed to initialize authentication system. Check your internet connection', 'warning');
            return false;
        }
    };

    const getSavedLocation = () => {
        return sessionStorage.getItem('returnUrl')|| window.location.origin;
    };

    /**
     * Handle login with Auth0
     */
    const login = async () => {
        try {
            await auth0.loginWithRedirect({
                redirect_uri: PasswordConfig.REDIRECT_URL,
            });
        } catch (error) {
            console.error('Auth0 login failed:', error);
            await PasswordManager.showNotification('Authentication failed. Please try again.', 'error');
        }
    };

    /**
     * Handle logout
     */
    const logout = async () => {
        try {
            auth0.logout({
                returnTo: window.location.origin+'/logOut.html'
            });
        } catch (error) {
            console.error('Auth0 logout failed:', error);
            await PasswordManager.showNotification('LogOut failed. Please try again.', 'error');
        }
    };

    /**
     * Check authentication state
     * @returns {Promise<boolean>} Authentication status
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
            _showNotification('Authentication check failed.', 'error');
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

    // Public API
    return {
        init,
        login,
        logout,
        checkAuth,
        isAuthenticated: () => isAuthenticated,
        getUser: () => userProfile,
        fetchAuth: _fetchAuthConfig
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
        ismouseOnNotification:false,
        isNotificationVisible:false,
        correctPassword: PasswordConfig.CORRECT_PASSWORD // default value
    };

    const dom = {};
    let hammer = null;

    /**
     * Initialize the password manager
     * @param {string} [password] - Optional password to use for verification
     */
    const init = (password) => {
        if (password) {
            state.correctPassword = password;
        }
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
        dom.customerSupport = document.getElementById('contactSupport');
        dom.notificationCancelBtn = document.querySelector('.fa-times');
        dom.notification = document.getElementById('notification');
        hammer = new Hammer(dom.notification);
        
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
        dom.customerSupport.addEventListener('click', _handleSupport);
        dom.passwordInput.addEventListener('focus', _handleInputFocus);
        dom.toggleButton.addEventListener('click', _togglePasswordVisibility);
        dom.toggleButton.addEventListener('keydown', _handleToggleKeydown);
        dom.notification.addEventListener('mouseenter',()=>{state.ismouseOnNotification= true;});
        dom.notification.addEventListener('mouseleave',()=>{state.ismouseOnNotification = false;})
        dom.notificationCancelBtn.addEventListener('click',_hideNotification);
        hammer.on('swipe',_hideNotification);
        window.addEventListener('beforeunload', _hideNotification);

    }

    /**
     * Hide notification immediately
     */
    const _hideNotification = () => {
                const {notification} = dom;
                if (notification) {
                    notification.classList.remove('show');
                }
            }
    /**
     * Check if password exists in local storage
     */
    const _checkExistingPassword = () => {
        try {
            const storedPassword = localStorage.getItem(PasswordConfig.STORAGE_KEY);
            state.hasExistingPassword = storedPassword === state.correctPassword;
            
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
        let isValid = _validatePassword();

        
        if (isValid) {
           isValid =  _verifyAndSavePassword(password);
        } else {
            _showNotification(`Password must be at least ${PasswordConfig.MIN_PASSWORD_LENGTH} characters`, 'error');
            _shakeElement(dom.loginForm);
        } 
        _validateInput(dom.passwordInput,isValid)

    };

    /**
     * Validate password
     */
    const _validatePassword = () => {
        const password = dom.passwordInput.value.trim();
        const isValid = password.length >= PasswordConfig.MIN_PASSWORD_LENGTH;
        _validatetext(dom.helper,isValid);
        return isValid;
    };

    /**
   * Verifies and saves password if correct
   * @param {string} password - Input password
   */
    const _verifyAndSavePassword = (password) => {
        let valid;
        if (password === state.correctPassword) {
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
   * Validates and styles input element
   * @param {HTMLElement} input - Input element
   * @param {boolean} isValid - Validation result
   */
const _validateInput = (input, isValid) => {
    input.classList.toggle('valid', isValid);
    input.classList.toggle('invalid', !isValid);
    dom.passwordInput.classList.remove('focus');
  };
/**
   * Validates and styles text element
   * @param {HTMLElement} input - Text element
   * @param {boolean} isValid - Validation result
   */
  const _validatetext = (input, isValid) => {
    const text = input.textContent || input.innerText;
    if (!text) return;
    input.innerHTML = _textIcon(isValid, text);
    input.classList.toggle('validtext', isValid);
    input.classList.toggle('invalidtext', !isValid);
  };

  /**
   * 
   * @param {boolean} isValid return the icon with text
   * @returns 
   */
  const _textIcon = (isValid, text) => {
    if (!isValid) {
        return `${_getNotificationIcon('error')} ${text}`;
    } else {
       return  `${_getNotificationIcon('success')} ${text}`;
    }
}

/**
   * Saves password to local storage
   * @param {string} password - Password to save
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
   * Displays a notification
   * @param {string} message - Notification message
   * @param {string} [type='info'] - Notification type
   */
     const _showNotification = async(message , type = 'info') => {
        if(state.isNotificationVisible){
             _hideNotification();
              await delay(200);
        }
         let {notification} = dom;
        if(!notification)
            notification = document.getElementById('notification');
       
        const notificationText = document.getElementById('notificationText');
        
        if (!notification || !notificationText) return;
        
        if (state.notificationTimeout) {
            clearTimeout(state.notificationTimeout);
        }
         const icon = _getNotificationIcon(type)

        notificationText.innerHTML =  `${icon} ${message}`;
        notification.className = `notification show ${type}`;
        state.isNotificationVisible = true;

        state.notificationTimeout = setInterval(() => {
            if(!state.ismouseOnNotification){
            notification.classList.remove('show');
            state.isNotificationVisible = false;
            }
        }, PasswordConfig.NOTIFICATION_DURATION);

    };

    /**
     * take is the type of notification then retturn the icon
     * @param {type} type 
     * @returns 
     */
    const _getNotificationIcon = (type) => {
    switch (type) {
        case 'info':return '<i class="fas fa-info-circle"></i>';
        case 'error':return '<i class="fas fa-times-circle"></i>';
        case 'warning':return '<i class="fas fa-exclamation-triangle"></i>';
        case 'success':return '<i class="fas fa-check-circle"></i>';
        default:return '<i class="fas fa-bell"></i>';
    }
}

    const delay = (ms)=>{
        return new Promise(resolve => setTimeout(resolve,ms));
    }
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
        dom.passwordInput.classList.remove('invalid');
        dom.passwordInput.classList.remove('valid');
    };

    /** 
    * create a new page and redirect the user using whatsapp Api
    * and send a message of help to my number
    */
    const _handleSupport = () =>{    
            const phoneNumber = 237670852835
            const message = encodeURIComponent('Hello! I have a question about how to use this app.');
            const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${message}`;
          const newWindow = window.open(whatsappUrl, 'whatsappWindow', 'width=500,height=600 ,noopener,noreferrer');
            if(!newWindow) {_showNotification('Popup was blocked!', 'error');}
    }
/**
   * Handles toggle button keydown
   * @param {KeyboardEvent} e - Keydown event
   */
    const _handleToggleKeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            _togglePasswordVisibility();
        }
    };

/**
   * Applies shake animation to element
   * @param {HTMLElement} element - Element to shake
   */
    const _shakeElement = (element) => {
        element.classList.add('shake');
        setTimeout(() => {
            element.classList.remove('shake');
        }, 500);
    };

/**
   * Handles errors
   * @param {string} message - Error message
   * @param {Error} error - Error object
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
   * Debounce utility function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in ms
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

    // Public API
    return {
        init,
        showNotification: _showNotification
    };
})();

// Main application initialization
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize Auth0
        const auth0Initialized = await Auth0Manager.init();
        
        let correctPassword = PasswordConfig.CORRECT_PASSWORD;
        if (auth0Initialized) {
            await Auth0Manager.checkAuth();

            // Get password from config if available
            const config = await Auth0Manager.fetchAuth();
            if (config && config.PasswordManager && config.PasswordManager.PASSWORD) {
                correctPassword = config.PasswordManager.PASSWORD;
            }
        }
        
        // Initialize Password Manager (fallback)
        PasswordManager.init(correctPassword);
        
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
window.loginWithAuth0 = () => { Auth0Manager.login();
};

window.logoutWithAuth0 = () => {Auth0Manager.logout();
};
window.loginWithAuth0 = Auth0Manager.login;
window.logoutWithAuth0 = Auth0Manager.logout;