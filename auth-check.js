// auth-check.js
async function checkAuthentication() {
    try {
        // Check Auth0 authentication
        if (typeof auth0 !== 'undefined') {
            const auth0Authenticated = await auth0.isAuthenticated();
            if (auth0Authenticated) return true;
        }
        
        // Check local storage password
        const storedPassword = localStorage.getItem('Birthday');
        if (storedPassword === 'missusfhavur') return true;
        
        return false;
        
    } catch (error) {
        console.error('Authentication check failed:', error);
        return false;
    }
}

// Redirect if not authenticated
async function requireAuth() {
    const isAuthenticated = await checkAuthentication();
    
    if (!isAuthenticated) {
        // Save the current URL to redirect back after login
        sessionStorage.setItem('returnUrl', window.location.href);
        window.location.href = '/login.html';
        return false;
    }
    
    return true;
}

// Usage on protected pages
document.addEventListener('DOMContentLoaded', async () => {
    const canProceed = await requireAuth();
    
    if (canProceed) {
        // Load your protected content
        console.log('Loading protected content');
    }
});
