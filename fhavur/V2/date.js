document.addEventListener('DOMContentLoaded', () => {
    const interBubble = document.querySelector('.interactive');
    const card = document.getElementById('proposalCard');
    const heartBtn = document.getElementById('heartBtn');
    const proposalText = document.getElementById('proposalText');
    const yesBtn = document.getElementById('yesBtn');
    const maybeBtn = document.getElementById('maybeBtn');
    const confettiRoot = document.getElementById('confetti-root');

    let curX = 0, curY = 0, tgX = 0, tgY = 0;

    /* ===== Bubble follows cursor ===== */
    const move = () => {
        curX += (tgX - curX) / 20;
        curY += (tgY - curY) / 20;
        interBubble.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`;
        requestAnimationFrame(move);
    };

    window.addEventListener('mousemove', (event) => {
        tgX = event.clientX;
        tgY = event.clientY;

        // Bubble color shifts by mouse X position
        const hue = Math.round((tgX / window.innerWidth) * 360);
        interBubble.style.background =
            `radial-gradient(circle, hsla(${hue}, 80%, 65%, 0.8) 0%, hsla(${hue}, 80%, 65%, 0) 60%)`;

        // Magnetic card tilt
        const xTilt = (event.clientX / window.innerWidth - 0.5) * 20;
        const yTilt = (event.clientY / window.innerHeight - 0.5) * 20;
        card.style.transform = `translate(-50%, -50%) rotateX(${-yTilt}deg) rotateY(${xTilt}deg)`;
    });

    move();

    /* ===== Proposal reveal ===== */
    heartBtn.addEventListener('click', () => {
        proposalText.classList.remove('hidden');
        card.style.display = 'none';
    });

    /* ===== Confetti generator ===== */
    function launchConfetti() {
        for (let i = 0; i < 80; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = `${Math.random() * 100}vw`;
            confetti.style.background = `hsl(${Math.random()*360}, 70%, 60%)`;
            confetti.style.animationDuration = `${2 + Math.random() * 3}s`;
            confettiRoot.appendChild(confetti);
            setTimeout(() => confetti.remove(), 5000);
        }

    }

    yesBtn.addEventListener('click', launchConfetti);
    maybeBtn.addEventListener('click', launchConfetti);
});
