document.addEventListener('DOMContentLoaded', () => {
    // Configuration
    const config = {
        smoothing: 0.05,
        movementThreshold: 0.5,
        resizeDebounce: 250
    };

    // State management
    const state = {
        curX: 0,
        curY: 0,
        tgX: 0,
        tgY: 0,
        isMoving: false,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        resizeTimeout: null
    };

    // Cache DOM elements
    const elements = {
        interBubble: document.querySelector('.interactive'),
        gradientContainer: document.querySelector('.gradients-container'),
        card: document.querySelector('.card')
    };

    // Check if required elements exist
    if (!elements.interBubble) {
        console.error('Interactive element not found');
        return;
    }

    // Initialize animation
    const initAnimation = () => {
        // Set initial position to center
        state.tgX = state.windowWidth / 2;
        state.tgY = state.windowHeight / 2;
        state.curX = state.tgX;
        state.curY = state.tgY;

        updateBubblePosition();
        requestAnimationFrame(animate);
    };

    // Main animation loop
    const animate = () => {
        const dx = state.tgX - state.curX;
        const dy = state.tgY - state.curY;

        // Check if movement is significant
        const distance = Math.sqrt(dx * dx + dy * dy);
        state.isMoving = distance > config.movementThreshold;

        // Apply smooth movement
        state.curX += dx * config.smoothing;
        state.curY += dy * config.smoothing;

        updateBubblePosition();

        // Apply movement class based on state
        document.body.classList.toggle('is-moving', state.isMoving);

        requestAnimationFrame(animate);
    };

    // Update bubble position
    const updateBubblePosition = () => {
        elements.interBubble.style.transform = `translate(${Math.round(state.curX)}px, ${Math.round(state.curY)}px)`;
    };

    // Handle mouse movement
    const handleMouseMove = (event) => {
        state.tgX = event.clientX;
        state.tgY = event.clientY;
    };

    // Handle touch movement
    const handleTouchMove = (event) => {
        event.preventDefault();
        if (event.touches.length > 0) {
            state.tgX = event.touches[0].clientX;
            state.tgY = event.touches[0].clientY;
        }
    };

    // Handle window resize
    const handleResize = () => {
        clearTimeout(state.resizeTimeout);
        state.resizeTimeout = setTimeout(() => {
            state.windowWidth = window.innerWidth;
            state.windowHeight = window.innerHeight;

            // Adjust position if needed after resize
            if (state.tgX > state.windowWidth) state.tgX = state.windowWidth;
            if (state.tgY > state.windowHeight) state.tgY = state.windowHeight;
        }, config.resizeDebounce);
    };

    // Handle visibility change
    const handleVisibilityChange = () => {
        if (document.hidden) {
            // Pause animation when tab is not visible
            cancelAnimationFrame(animate);
        } else {
            // Resume animation when tab is visible
            requestAnimationFrame(animate);
        }
    };

    // Add event listeners with options
    const addEventListeners = () => {
        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('resize', handleResize, { passive: true });
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Detect initial mouse movement
        const initialMoveHandler = () => {
            document.body.classList.add('has-mouse-movement');
            window.removeEventListener('mousemove', initialMoveHandler);
        };
        window.addEventListener('mousemove', initialMoveHandler);
    };

    // Remove event listeners (for cleanup)
    const removeEventListeners = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('resize', handleResize);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };

    // Initialize everything
    const init = () => {
        addEventListeners();
        initAnimation();
        // Add loaded class to body for CSS transitions
        setTimeout(() => {
            document.body.classList.add('loaded');
        }, 1000);
    };

    // Clean up function
    const destroy = () => {
        removeEventListeners();
        cancelAnimationFrame(animate);
    };

    // Expose public methods (useful if you need to control this from other scripts)
    window.interactiveBackground = {
        init,
        destroy,
        updateConfig: (newConfig) => {
            Object.assign(config, newConfig);
        }
    };

    // Initialize
    init();

    // Clean up if needed when page is unloading
    window.addEventListener('beforeunload', destroy);
});
