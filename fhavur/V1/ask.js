document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const elements = {
        teaser: document.querySelector('.teaser'),
        heartBtn: document.getElementById('heartBtn'),
        interactiveAdventure: document.getElementById('interactive-adventure'),
        stages: document.querySelectorAll('.stage'),
        endings: document.querySelectorAll('.ending'),
        stageButtons: document.querySelectorAll('.stage-btn'),
        backButtons: document.querySelectorAll('.back-btn'),
        playBtn: document.getElementById('playBtn'),
        birthdayAudio: document.getElementById('birthdayAudio'),
        confettiRoot: document.getElementById('confetti-root')
    };

    // State Management
    const state = {
        currentStage: 0,
        isAudioAllowed: false,
        isPlaying: false,
        lastHeartCreation: 0
    };

    // Constants
    const HEART_COOLDOWN = 300; // ms between heart creations
    const EMOJIS = ['❤️', '💖', '💗', '💓', '💞', '🌸', '✨', '🎀'];

    // Initialize
    function init() {
        // Add SVG filter for gooey background effect
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('style', 'position: absolute; width: 0; height: 0;');
        svg.innerHTML = `
            <defs>
                <filter id="goo">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                    <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
                    <feBlend in="SourceGraphic" in2="goo" />
                </filter>
            </defs>
        `;
        document.body.appendChild(svg);

        // Add interactive bubble
        const interBubble = document.createElement('div');
        interBubble.className = 'interactive';
        document.body.appendChild(interBubble);

        setupEventListeners();
        setupCursorEffect(interBubble);
    }

    // Event Listeners
    function setupEventListeners() {
        // Teaser button
        elements.heartBtn.addEventListener('click', () => {
            elements.teaser.style.display = 'none';
            elements.interactiveAdventure.style.display = 'block';
            showStage(1);
            triggerCelebration(0);
        });

        // Stage buttons
        elements.stageButtons.forEach(button => {
            button.addEventListener('click', () => handleChoice(button.dataset.choice));
        });

        // Back buttons
        elements.backButtons.forEach(button => {
            button.addEventListener('click', () => {
                window.location.href = 'fhavur.html';
            });
        });

        // Audio control
        elements.playBtn.addEventListener('click', toggleAudio);
        document.body.addEventListener('click', enableAudio, { once: true });

        // Touch effects for heart button
        elements.heartBtn.addEventListener('touchstart', () => {
            elements.heartBtn.style.transform = 'scale(0.95)';
        });
        elements.heartBtn.addEventListener('touchend', () => {
            elements.heartBtn.style.transform = '';
        });
    }

    // Stage Navigation
    function showStage(stageNum) {
        state.currentStage = stageNum;
        elements.stages.forEach(stage => stage.classList.remove('active'));
        elements.endings.forEach(ending => ending.classList.remove('active'));

        const stageElement = document.getElementById(`stage${stageNum}`);
        if (stageElement) {
            stageElement.classList.add('active');
            triggerCelebration(0);
        }
    }

    function showEnding(endingId) {
        elements.stages.forEach(stage => stage.classList.remove('active'));
        elements.endings.forEach(ending => ending.classList.remove('active'));

        const endingElement = document.getElementById(endingId);
        if (endingElement) {
            endingElement.classList.add('active');
            if (endingId === 'end-yes' || endingId === 'end-maybe') {
                launchConfetti();
                triggerCelebration(0);
            }
        }
    }

    function handleChoice(choice) {
        switch (state.currentStage) {
            case 1: // Icebreaker
                showStage(2);
                break;
            case 2: // Reflection
                if (choice === 'awesome' || choice === 'more') {
                    showStage(3);
                } else {
                    showStage(3); // Neutral path for "friend"
                }
                break;
            case 3: // Interest
                if (choice === 'single' || choice === 'open') {
                    showStage(4);
                } else {
                    showEnding('end-no');
                }
                break;
            case 4: // Big Ask
                showEnding(`end-${choice}`);
                break;
        }
    }

    // Audio Functions
    function enableAudio() {
        state.isAudioAllowed = true;
        if (state.isPlaying) {
            playAudio().catch(console.error);
        }
    }

    function toggleAudio() {
        if (state.isPlaying) {
            pauseAudio();
        } else {
            playAudio();
        }
    }

    async function playAudio() {
        if (!state.isAudioAllowed) return;
        try {
            await elements.birthdayAudio.play();
            elements.playBtn.innerHTML = '<i class="fas fa-pause" aria-hidden="true"></i>';
            state.isPlaying = true;
        } catch (error) {
            console.error('Audio playback failed:', error);
        }
    }

    function pauseAudio() {
        elements.birthdayAudio.pause();
        elements.playBtn.innerHTML = '<i class="fas fa-play" aria-hidden="true"></i>';
        state.isPlaying = false;
    }

    // Animation Functions
    function triggerCelebration(delay = 0) {
        setTimeout(() => {
            createHeartBurst(20);
            if (!state.isPlaying) {
                elements.birthdayAudio.currentTime = 0;
                playAudio();
            }
        }, delay);
    }

    function createHeartBurst(count) {
        for (let i = 0; i < count; i++) {
            const x = Math.random() * window.innerWidth;
            const y = Math.random() * window.innerHeight;
            createHeart(x, y);
        }
    }

    function createHeart(x, y) {
        const now = Date.now();
        if (now - state.lastHeartCreation < HEART_COOLDOWN) return;
        state.lastHeartCreation = now;

        const heart = document.createElement('div');
        heart.className = 'hearts';
        heart.innerHTML = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
        Object.assign(heart.style, {
            left: `${x}px`,
            top: `${y}px`,
            position: 'fixed',
            fontSize: `${20 + Math.random() * 30}px`,
            animation: `float ${3 + Math.random() * 4}s ease-in-out forwards`,
            opacity: '0.8',
            zIndex: '5',
            pointerEvents: 'none',
            transform: `rotate(${Math.random() * 360}deg)`,
            filter: `hue-rotate(${Math.random() * 360}deg)`
        });
        document.body.appendChild(heart);
        setTimeout(() => heart.remove(), 3000);
    }

    function launchConfetti() {
        for (let i = 0; i < 80; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = `${Math.random() * 100}vw`;
            confetti.style.background = `hsl(${Math.random() * 360}, 70%, 60%)`;
            confetti.style.animationDuration = `${2 + Math.random() * 3}s`;
            elements.confettiRoot.appendChild(confetti);
            setTimeout(() => confetti.remove(), 5000);
        }
    }

    // Cursor Effect
    function setupCursorEffect(interBubble) {
        let curX = 0, curY = 0, tgX = 0, tgY = 0;
        function move() {
            curX += (tgX - curX) / 20;
            curY += (tgY - curY) / 20;
            interBubble.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
            requestAnimationFrame(move);
        }
        window.addEventListener('mousemove', (event) => {
            tgX = event.clientX;
            tgY = event.clientY;
            const hue = Math.round((tgX / window.innerWidth) * 360);
            interBubble.style.background = `radial-gradient(circle, hsla(${hue}, 80%, 65%, 0.8) 0%, hsla(${hue}, 80%, 65%, 0) 60%)`;
        });
        move();
    }

    // Initialize
    init();
});