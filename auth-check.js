
/**
 * Authentication Configuration
 * Defines constants for authentication behavior and storage
 */

// Configuration
const AuthConfig = {
    PASSWORD_KEY: 'Birthday',
    CORRECT_PASSWORD: 'missusfhavur',
    LOGIN_URL: '/login.html',
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000,
    SESSION_TIMEOUT: 30 * 60 * 1000 // 30 minutes
};

// Global state
let authCheckInitialized = false;
let auth0Available = false;

/**
 * Initializes the authentication system
 * @returns {Promise<boolean>} True if initialization succeeded, false otherwise
 */
async function initAuthCheck() {
    if (authCheckInitialized) return true;
    
    try {
        // Check if Auth0 is available
        auth0Available = typeof auth0 !== 'undefined' && auth0 !== null;
        
        if (auth0Available) {
            console.log('Auth0 authentication available');
        } else {
            console.log('Using password-based authentication');
        }
        
        // Check session timeout
        _checkSessionTimeout();
        
        authCheckInitialized = true;
        return true;
        
    } catch (error) {
        console.error('Failed to initialize auth check:', error);
        return false;
    }
}

/**
 * Checks if the user is authenticated using available methods
 * @returns {Promise<Object>} Authentication result object
 */
async function checkAuthentication() {
    try {
        // Check Auth0 authentication first
        if (auth0Available) {
            try {
                const auth0Authenticated = await auth0.isAuthenticated();
                if (auth0Authenticated) {
                    _updateLastActivity();
                    return { authenticated: true, method: 'auth0' };
                }
            } catch (auth0Error) {
                console.warn('Auth0 check failed, falling back to password:', auth0Error);
            }
        }
        
        // Check local storage password (fallback)
        const storedPassword = localStorage.getItem(AuthConfig.PASSWORD_KEY);
        if (storedPassword === AuthConfig.CORRECT_PASSWORD) {
            _updateLastActivity();
            return { authenticated: true, method: 'password' };
        }
        
        return { authenticated: false, method: 'none' };
        
    } catch (error) {
        console.error('Authentication check failed:', error);
        return { authenticated: false, method: 'error', error: error.message };
    }
}

/**
 * Requires authentication, redirecting to login if necessary
 * @param {Object} [options={}] - Configuration options
 * @param {number} [options.retryCount=0] - Current retry attempt
 * @param {boolean} [options.silent=false] - Suppress console logs
 * @returns {Promise<Object>} Authentication result
 */
async function requireAuth(options = {}) {
    const {
        retryCount = 0,
        silent = false
    } = options;
    
    try {
        const authResult = await checkAuthentication();
        
        if (authResult.authenticated) {
            if (!silent) {
                console.log(`User authenticated via ${authResult.method}`);
            }
            return authResult;
        }
        
        // Not authenticated - handle redirect
        if (retryCount < AuthConfig.RETRY_ATTEMPTS) {
            if (!silent) {
                console.log(`Authentication failed, retrying in ${AuthConfig.RETRY_DELAY}ms...`);
            }
            
            // Retry after delay
            await new Promise(resolve => setTimeout(resolve, AuthConfig.RETRY_DELAY));
            return requireAuth({ retryCount: retryCount + 1, silent });
        }
        
        // Final failure - redirect to login
        if (!silent) {
            console.log('Authentication required, redirecting to login');
        }
        
        // Save current URL for post-login redirect
        const returnUrl = window.location.pathname + window.location.search;
        sessionStorage.setItem('returnUrl', returnUrl);
        
        // Redirect to login page
        window.location.href = AuthConfig.LOGIN_URL;
        
        return authResult;
        
    } catch (error) {
        console.error('requireAuth failed:', error);
        
        // Redirect to login on error
        window.location.href = AuthConfig.LOGIN_URL;
        
        return { authenticated: false, method: 'error', error: error.message };
    }
}

/**
 * Show loading animation
 */
    function showLoading() {
            const loader = document.getElementById('loading');
            if (loader) {
                loader.style.display = 'flex';
                loader.classList.remove('fade-out');
            }
        }

 /**
 * Updates the loading text while preserving animations
 * @param {string} text - New loading text
 */
function updateLoadingText(text) {
    const textEl = document.querySelector('.loading-text');
    if (textEl) {
        // Keep the dots animation
        const dotsHtml = textEl.querySelector('.loading-dots')?.outerHTML || '';
        textEl.innerHTML = text + dotsHtml;
    }
}

/**
 * Hide loading animation
 */
        function hideLoading() {
            const loader = document.getElementById('loading');
            if (loader) {
                loader.classList.add('fade-out');
                setTimeout(() => {
                    loader.classList.add ('d-none');
                }, 3000);
            }
        }

/**
 * Logout user from all authentication methods
 */
async function logout() {
    try {
        // Auth0 logout
        if (auth0Available && await auth0.isAuthenticated()) {
            try {
                auth0.logout({
                    returnTo: window.location.origin
                });
            } catch (auth0Error) {
                console.warn('Auth0 logout failed:', auth0Error);
            }
        }
        
        // Clear password storage
        localStorage.removeItem(AuthConfig.PASSWORD_KEY);
        
        // Clear session tracking
        localStorage.removeItem('lastActivityTime');
        sessionStorage.removeItem('returnUrl');
        
        console.log('User logged out successfully');
        
    } catch (error) {
        console.error('Logout failed:', error);
    }
}

/**
 * Checks for session timeout and handles expiration
 * @private
 */
async function getAuthStatus() {
    return await checkAuthentication();
}

/**
 * Check if session has timed out
 */
function _checkSessionTimeout() {
    const lastActivity = localStorage.getItem('lastActivityTime');
    if (!lastActivity) return;
    
    const lastActivityTime = parseInt(lastActivity, 10);
    const currentTime = Date.now();
    const timeDiff = currentTime - lastActivityTime;
    
    if (timeDiff > AuthConfig.SESSION_TIMEOUT) {
        console.log('Session timed out');
        logout();
        window.location.href = AuthConfig.LOGIN_URL;
    }
}

/**
 * Updates the last activity timestamp
 * @private
 */
function _updateLastActivity() {
    localStorage.setItem('lastActivityTime', Date.now().toString());
}

/**
 * Retrieves stored return URL or default
 * @param {string} [defaultUrl='/'] - Fallback URL
 * @returns {string} Return URL
 */
function getReturnUrl(defaultUrl = '/') {
    return sessionStorage.getItem('returnUrl') || defaultUrl;
}

/**
 * Clear stored return URL
 */
function clearReturnUrl() {
    sessionStorage.removeItem('returnUrl');
}

/**
 * Redirect to stored return URL or default
 */
function redirectToReturnUrl(defaultUrl = '/') {
    const returnUrl = getReturnUrl(defaultUrl);
    clearReturnUrl();
    window.location.href = returnUrl;
}

/**
 * Set up activity tracking for session timeout
 */
function setupActivityTracking() {
    // Track user activity
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    activityEvents.forEach(event => {
        document.addEventListener(event, _updateLastActivity, { passive: true });
    });
    
    // Periodic session check
    setInterval(_checkSessionTimeout, 60000); // Check every minute
}

/**
 * Sets up complete authentication protection
 * @returns {Promise<Object>} Authentication result
 */
async function setupAuthProtection() {
    // Initialize auth check
    await initAuthCheck();
    
    // Set up activity tracking
    setupActivityTracking();
    
    // Check authentication on page load
    const authResult = await requireAuth({ silent: true });
    
    return authResult;
}

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showLoading,
        hideLoading,
        updateLoadingText,
        initAuthCheck,
        checkAuthentication,
        requireAuth,
        logout,
        getAuthStatus,
        getReturnUrl,
        clearReturnUrl,
        redirectToReturnUrl,
        setupAuthProtection
    };
}
